import Foundation
import FamilyControls
import DeviceActivity
import ManagedSettings
import UIKit
import SwiftUI
import React

private let PRAYER_BLOCKER_SELECTION_KEY = "prayerBlockerSelectedApps"

@objc(PrayerBlockerModule)
class PrayerBlockerModule: NSObject, UIAdaptivePresentationControllerDelegate {
    
    private let authorizationCenter = AuthorizationCenter.shared
    private let store = ManagedSettingsStore()
    private let sharedDefaults = UserDefaults(suiteName: "group.com.digaifounder.huda")
    
    private var pendingResolve: RCTPromiseResolveBlock?
    private var pendingReject: RCTPromiseRejectBlock?
    
    private var currentPickerNavigationController: UINavigationController?
    private var currentSelectionWrapper: SelectionWrapper?
    
    @objc
    func requestAuthorization(_ resolve: @escaping RCTPromiseResolveBlock, rejecter reject: @escaping RCTPromiseRejectBlock) {
        Task { @MainActor in
            do {
                if #available(iOS 16.0, *) {
                    try await authorizationCenter.requestAuthorization(for: .individual)
                } else {
                    try await withCheckedThrowingContinuation { (continuation: CheckedContinuation<Void, Error>) in
                        authorizationCenter.requestAuthorization { (result: Result<Void, Error>) in
                            switch result {
                            case .success:
                                continuation.resume()
                            case .failure(let error):
                                continuation.resume(throwing: error)
                            }
                        }
                    }
                }
                resolve(true)
            } catch {
                reject("AUTHORIZATION_ERROR", "Failed to request authorization: \(error.localizedDescription)", error)
            }
        }
    }
    
    @objc
    func forceSyncUserDefaults(_ resolve: @escaping RCTPromiseResolveBlock, rejecter reject: @escaping RCTPromiseRejectBlock) {
        DispatchQueue.main.async {
            // Force synchronize UserDefaults
            self.sharedDefaults?.synchronize()
            CFPreferencesAppSynchronize(kCFPreferencesCurrentApplication)
            print("✅ PrayerBlockerModule: Forced UserDefaults synchronization")
            resolve(true)
        }
    }
    
    @objc
    func isAuthorized(_ resolve: @escaping RCTPromiseResolveBlock, rejecter reject: @escaping RCTPromiseRejectBlock) {
        let status = authorizationCenter.authorizationStatus
        resolve(status == .approved)
    }
    
    @objc
    func selectAppsToBlock(_ resolve: @escaping RCTPromiseResolveBlock, rejecter reject: @escaping RCTPromiseRejectBlock) {
        DispatchQueue.main.async {
            self.pendingResolve = resolve
            self.pendingReject = reject
            
            if let windowScene = UIApplication.shared.connectedScenes.first as? UIWindowScene,
               let rootViewController = windowScene.windows.first?.rootViewController {
                
                // Load existing selection if available
                let selectionWrapper = SelectionWrapper()
                if #available(iOS 15.0, *) {
                    if let existingSelection = self.loadFamilyActivitySelection() {
                        selectionWrapper.selection = existingSelection
                        print("📱 PrayerBlockerModule: Loaded existing selection with \(existingSelection.applicationTokens.count) apps")
                    } else {
                        print("📱 PrayerBlockerModule: No existing selection found, starting fresh")
                    }
                }
                
                let picker = FamilyActivityPicker(selection: Binding(
                    get: { 
                        print("📱 Getting selection: \(selectionWrapper.selection.applicationTokens.count) apps")
                        return selectionWrapper.selection 
                    },
                    set: { newValue in
                        print("📱 Setting selection: \(newValue.applicationTokens.count) apps")
                        selectionWrapper.selection = newValue
                    }
                ))
                
                let hostingController = UIHostingController(rootView: picker)
                
                let navController = UINavigationController(rootViewController: hostingController)
                navController.navigationBar.prefersLargeTitles = false
                
                // Add Done button
                hostingController.navigationItem.rightBarButtonItem = UIBarButtonItem(
                    barButtonSystemItem: .done,
                    target: self,
                    action: #selector(self.doneSelectingApps)
                )
                
                // Add Cancel button
                hostingController.navigationItem.leftBarButtonItem = UIBarButtonItem(
                    barButtonSystemItem: .cancel,
                    target: self,
                    action: #selector(self.cancelSelectingApps)
                )
                
                // Set presentation controller delegate to handle swipe-to-dismiss
                navController.presentationController?.delegate = self
                
                self.currentPickerNavigationController = navController
                self.currentSelectionWrapper = selectionWrapper
                
                rootViewController.present(navController, animated: true, completion: nil)
            } else {
                reject("PRESENTATION_ERROR", "Could not present Family Activity Picker", nil)
            }
        }
    }
    
    @objc
    private func doneSelectingApps() {
        DispatchQueue.main.async {
            self.saveCurrentSelection()
            
            self.currentPickerNavigationController?.dismiss(animated: true, completion: {
                if let resolve = self.pendingResolve {
                    resolve(true)
                }
                
                self.pendingResolve = nil
                self.pendingReject = nil
                self.currentPickerNavigationController = nil
                self.currentSelectionWrapper = nil
            })
        }
    }
    
    @objc
    private func cancelSelectingApps() {
        DispatchQueue.main.async {
            // Still save the selection in case user made changes
            self.saveCurrentSelection()
            
            self.currentPickerNavigationController?.dismiss(animated: true, completion: {
                if let reject = self.pendingReject {
                    reject("USER_CANCELLED", "User cancelled app selection", nil)
                }
                
                self.pendingResolve = nil
                self.pendingReject = nil
                self.currentPickerNavigationController = nil
                self.currentSelectionWrapper = nil
            })
        }
    }
    
    // UIAdaptivePresentationControllerDelegate - handle swipe-to-dismiss
    func presentationControllerDidDismiss(_ presentationController: UIPresentationController) {
        DispatchQueue.main.async {
            // Save selection even when dismissed by swipe
            self.saveCurrentSelection()
            
            if let reject = self.pendingReject {
                reject("USER_CANCELLED", "User dismissed app selection", nil)
            }
            
            self.pendingResolve = nil
            self.pendingReject = nil
            self.currentPickerNavigationController = nil
            self.currentSelectionWrapper = nil
        }
    }
    
    private func saveCurrentSelection() {
        if let selectionWrapper = self.currentSelectionWrapper {
            let finalSelection = selectionWrapper.selection
            
            print("💾 PrayerBlockerModule: Saving selection...")
            print("   - Apps: \(finalSelection.applicationTokens.count)")
            print("   - Categories: \(finalSelection.categoryTokens.count)")
            print("   - Web Domains: \(finalSelection.webDomainTokens.count)")
            
            self.sharedDefaults?.set(true, forKey: "appsSelected")
            
            let hasContent = !finalSelection.applicationTokens.isEmpty 
                || !finalSelection.categoryTokens.isEmpty 
                || !finalSelection.webDomainTokens.isEmpty
            
            if hasContent {
                self.sharedDefaults?.set(true, forKey: "hasSelectedApps")
                if #available(iOS 15.0, *) {
                    self.saveFamilyActivitySelection(finalSelection)
                }
                print("✅ PrayerBlockerModule: Saved selection successfully")
            } else {
                self.sharedDefaults?.set(false, forKey: "hasSelectedApps")
                if #available(iOS 15.0, *) {
                    self.clearFamilyActivitySelection()
                }
                print("ℹ️ PrayerBlockerModule: No apps/categories selected, cleared selection")
            }
            
            self.sharedDefaults?.synchronize()
            CFPreferencesAppSynchronize(kCFPreferencesCurrentApplication)
        } else {
            print("⚠️ PrayerBlockerModule: No selection wrapper available to save")
        }
    }
    
    @objc
    func schedulePrayerBlocking(_ startTime: NSNumber, duration: NSNumber, resolve: @escaping RCTPromiseResolveBlock, rejecter reject: @escaping RCTPromiseRejectBlock) {
        let startDate = Date(timeIntervalSince1970: startTime.doubleValue / 1000)
        let now = Date()
        
        let calendar = Calendar.current
        let startComponents = calendar.dateComponents([.hour, .minute], from: startDate)
        
        // If prayer time has already passed, activate blocking immediately
        if startDate <= now {
            // Activate blocking immediately - no time limit
            if #available(iOS 15.0, *) {
                applyBlockingPolicy()
            } else {
                blockAllApps()
            }
            
            // Schedule to keep the extension active (but blocking stays on until manually cleared)
            // Use end of year so it effectively never ends
            var endComponents = DateComponents()
            endComponents.month = 12
            endComponents.day = 31
            endComponents.hour = 23
            endComponents.minute = 59
            
            let schedule = DeviceActivitySchedule(
                intervalStart: DateComponents(hour: startComponents.hour, minute: startComponents.minute),
                intervalEnd: endComponents, // End of year
                repeats: false // Don't repeat - blocking stays active until manually cleared
            )
            
            do {
                try DeviceActivityCenter().startMonitoring(.prayerTime, during: schedule)
                resolve(true)
            } catch {
                resolve(true) // Even if scheduling fails, blocking is already active
            }
        } else {
            // Prayer time is in the future, schedule to activate at that time
            // Blocking will stay active indefinitely once it starts
            var endComponents = DateComponents()
            endComponents.month = 12
            endComponents.day = 31
            endComponents.hour = 23
            endComponents.minute = 59
            
            let schedule = DeviceActivitySchedule(
                intervalStart: DateComponents(hour: startComponents.hour, minute: startComponents.minute),
                intervalEnd: endComponents, // End of year - effectively no limit
                repeats: false // Don't repeat - blocking stays active until manually cleared
            )
            
            do {
                try DeviceActivityCenter().startMonitoring(.prayerTime, during: schedule)
                resolve(true)
            } catch {
                reject("SCHEDULE_ERROR", "Failed to schedule blocking: \(error.localizedDescription)", error)
            }
        }
    }
    
    @objc
    func activateBlockingNow(_ resolve: @escaping RCTPromiseResolveBlock, rejecter reject: @escaping RCTPromiseRejectBlock) {
        // Activate blocking immediately - no time limit, stays active until manually unblocked
        if #available(iOS 15.0, *) {
            applyBlockingPolicy()
        } else {
            blockAllApps()
        }
        
        // Schedule a continuous blocking interval that stays active indefinitely
        // We use a very long end time (end of year) so it effectively never ends
        // The blocking will only be cleared when the user checks off the prayer
        let calendar = Calendar.current
        let now = Date()
        let startComponents = calendar.dateComponents([.hour, .minute], from: now)
        
        // Set end time to end of year to keep blocking active indefinitely
        // DateComponents arguments must be in order: era, year, month, day, hour, minute, second
        var endComponents = DateComponents()
        endComponents.month = 12
        endComponents.day = 31
        endComponents.hour = 23
        endComponents.minute = 59
        
        let schedule = DeviceActivitySchedule(
            intervalStart: DateComponents(hour: startComponents.hour, minute: startComponents.minute),
            intervalEnd: endComponents, // End of year
            repeats: false // Don't repeat - blocking stays active until manually cleared
        )
        
        do {
            try DeviceActivityCenter().startMonitoring(.prayerTime, during: schedule)
            print("🔒 PrayerBlockerModule: Blocking activated - will stay active until prayer is checked off")
            resolve(true)
        } catch {
            print("❌ PrayerBlockerModule: Failed to activate blocking: \(error.localizedDescription)")
            // Even if scheduling fails, blocking is already active
            resolve(true)
        }
    }
    
    @objc
    func stopPrayerBlocking(_ resolve: @escaping RCTPromiseResolveBlock, rejecter reject: @escaping RCTPromiseRejectBlock) {
        DeviceActivityCenter().stopMonitoring([.prayerTime])
        if #available(iOS 16.0, *) {
            store.clearAllSettings()
        } else {
            store.shield.applicationCategories = nil
        }
        resolve(true)
    }
    
    @objc
    func checkPrayerAndUnlock(_ prayerId: String, resolve: @escaping RCTPromiseResolveBlock, rejecter reject: @escaping RCTPromiseRejectBlock) {
        let today = Calendar.current.startOfDay(for: Date())
        let formatter = DateFormatter()
        formatter.dateFormat = "yyyy-MM-dd"
        let dateKey = formatter.string(from: today)
        
        var prayerData: [String: [String: Bool]]?
        if let prayerDataDict = sharedDefaults?.dictionary(forKey: "prayerData") as? [String: [String: Bool]] {
            prayerData = prayerDataDict
        } else if let prayerDataString = sharedDefaults?.string(forKey: "prayerData"),
                  let prayerDataJson = prayerDataString.data(using: .utf8),
                  let prayerDataParsed = try? JSONSerialization.jsonObject(with: prayerDataJson) as? [String: [String: Bool]] {
            prayerData = prayerDataParsed
        }
        
        if let prayerData = prayerData,
           let todayData = prayerData[dateKey],
           let isCompleted = todayData[prayerId],
           isCompleted {
            DeviceActivityCenter().stopMonitoring([.prayerTime])
            if #available(iOS 16.0, *) {
                store.clearAllSettings()
            } else {
                store.shield.applicationCategories = nil
            }
            resolve(true)
        } else {
            resolve(false)
        }
    }
}

class SelectionWrapper: ObservableObject {
    @Published var selection = FamilyActivitySelection()
}

extension DeviceActivityName {
    static let prayerTime = Self("prayerTime")
}

@available(iOS 15.0, *)
private extension PrayerBlockerModule {
    func saveFamilyActivitySelection(_ selection: FamilyActivitySelection) {
        let encoder = JSONEncoder()
        guard let data = try? encoder.encode(selection) else {
            print("❌ PrayerBlockerModule: Failed to encode selection")
            return
        }

        let base64String = data.base64EncodedString()
        sharedDefaults?.set(base64String, forKey: PRAYER_BLOCKER_SELECTION_KEY)
        sharedDefaults?.synchronize()
        CFPreferencesAppSynchronize(kCFPreferencesCurrentApplication)
        
        print("💾 PrayerBlockerModule: Encoded and saved selection to key '\(PRAYER_BLOCKER_SELECTION_KEY)'")
        print("   Base64 length: \(base64String.count) characters")
    }

    func clearFamilyActivitySelection() {
        sharedDefaults?.removeObject(forKey: PRAYER_BLOCKER_SELECTION_KEY)
        sharedDefaults?.synchronize()
        CFPreferencesAppSynchronize(kCFPreferencesCurrentApplication)
        print("🗑️ PrayerBlockerModule: Cleared selection from key '\(PRAYER_BLOCKER_SELECTION_KEY)'")
    }

    func loadFamilyActivitySelection() -> FamilyActivitySelection? {
        guard
            let selectionString = sharedDefaults?.string(forKey: PRAYER_BLOCKER_SELECTION_KEY),
            let selectionData = Data(base64Encoded: selectionString)
        else {
            return nil
        }

        let decoder = JSONDecoder()
        return try? decoder.decode(FamilyActivitySelection.self, from: selectionData)
    }

    func applyBlockingPolicy() {
        CFPreferencesAppSynchronize(kCFPreferencesCurrentApplication)
        
        print("🔒 PrayerBlockerModule: Applying blocking policy...")
        
        guard let selection = loadFamilyActivitySelection() else {
            print("   - Failed to load selection, blocking all apps")
            blockAllApps()
            return
        }
        
        print("   - Loaded selection: \(selection.applicationTokens.count) apps, \(selection.categoryTokens.count) categories, \(selection.webDomainTokens.count) domains")
        
        guard selectionHasContent(selection) else {
            print("   - Selection has no content, blocking all apps")
            blockAllApps()
            return
        }

        print("✅ Applying selective blocking to \(selection.applicationTokens.count) apps")
        store.shield.applications = selection.applicationTokens
        store.shield.webDomains = selection.webDomainTokens

        if selection.categoryTokens.isEmpty {
            store.shield.applicationCategories = nil
            store.shield.webDomainCategories = nil
        } else {
            store.shield.applicationCategories = .specific(selection.categoryTokens, except: Set())
            store.shield.webDomainCategories = .specific(selection.categoryTokens, except: Set())
        }
    }

    func selectionHasContent(_ selection: FamilyActivitySelection) -> Bool {
        !selection.applicationTokens.isEmpty
            || !selection.categoryTokens.isEmpty
            || !selection.webDomainTokens.isEmpty
    }
}

private extension PrayerBlockerModule {
    func blockAllApps() {
        print("🚫 PrayerBlockerModule: Blocking ALL apps (no selection found)")
        store.shield.applications = nil
        store.shield.webDomains = nil
        store.shield.applicationCategories = .all()
        store.shield.webDomainCategories = .all()
    }
}
