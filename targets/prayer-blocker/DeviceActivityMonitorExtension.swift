import DeviceActivity
import FamilyControls
import ManagedSettings
import Foundation

private let PRAYER_BLOCKER_SELECTION_KEY = "prayerBlockerSelectedApps"
private let PRAYER_BLOCKER_HAS_SELECTED_APPS_KEY = "hasSelectedApps"

// Activity name for prayer time blocking
extension DeviceActivityName {
    static let prayerTime = Self("prayerTime")
}

// Device Activity Monitor Extension
class DeviceActivityMonitorExtension: DeviceActivityMonitor {
    let store = ManagedSettingsStore()
    let sharedDefaults = UserDefaults(suiteName: "group.com.digaifounder.huda")
    
    // Check if blocking should be active when extension loads
    override init() {
        super.init()
        print("🔄 DeviceActivityMonitorExtension: Extension initialized at \(Date())")
        print("   Automatically checking prayer times and blocking status...")
        checkAndActivateBlockingIfNeeded()
    }
    
    // Ensure blocking info is stored before activating (critical for custom shield)
    private func ensureBlockingInfoIsStored() {
        // Synchronize UserDefaults first
        CFPreferencesAppSynchronize(kCFPreferencesCurrentApplication)
        
        // Check if blocking info already exists
        if let blockingInfoString = sharedDefaults?.string(forKey: "currentPrayerBlocking") {
            // Already stored, synchronize to ensure extension can read it
            sharedDefaults?.synchronize()
            CFPreferencesAppSynchronize(kCFPreferencesCurrentApplication)
            return
        }
        
        // No blocking info - find the current prayer that needs blocking
        let now = Date()
        let today = Calendar.current.startOfDay(for: now)
        let formatter = DateFormatter()
        formatter.dateFormat = "yyyy-MM-dd"
        let dateKey = formatter.string(from: today)
        
        // Get prayer data
        var prayerData: [String: [String: Bool]]?
        if let prayerDataDict = sharedDefaults?.dictionary(forKey: "prayerData") as? [String: [String: Bool]] {
            prayerData = prayerDataDict
        } else if let prayerDataString = sharedDefaults?.string(forKey: "prayerData"),
                  let prayerDataJson = prayerDataString.data(using: .utf8),
                  let prayerDataParsed = try? JSONSerialization.jsonObject(with: prayerDataJson) as? [String: [String: Bool]] {
            prayerData = prayerDataParsed
        }
        
        let todayPrayerData = prayerData?[dateKey] ?? [:]
        
        // Get prayer times from widget storage
        var prayerTimes: [[String: Any]] = []
        if let prayerTimesJson = sharedDefaults?.string(forKey: "prayer_times_widget"),
           let prayerTimesData = prayerTimesJson.data(using: .utf8),
           let widgetData = try? JSONSerialization.jsonObject(with: prayerTimesData) as? [String: Any],
           let times = widgetData["prayerTimes"] as? [[String: Any]] {
            prayerTimes = times
        }
        
        // Find the most recent prayer that has passed and isn't completed
        for prayerTimeData in prayerTimes {
            guard let prayerName = prayerTimeData["name"] as? String else {
                continue
            }
            
            let prayerId = prayerName.lowercased()
            
            // Skip Sunrise - it's not a mandatory prayer
            if prayerId == "sunrise" {
                continue
            }
            
            // Parse the date
            var prayerTime: Date?
            if let dateObjString = prayerTimeData["dateObj"] as? String {
                let isoFormatter = ISO8601DateFormatter()
                isoFormatter.formatOptions = [.withInternetDateTime, .withFractionalSeconds]
                prayerTime = isoFormatter.date(from: dateObjString)
                
                if prayerTime == nil {
                    isoFormatter.formatOptions = [.withInternetDateTime]
                    prayerTime = isoFormatter.date(from: dateObjString)
                }
            } else if let timestamp = prayerTimeData["dateObj"] as? TimeInterval {
                prayerTime = Date(timeIntervalSince1970: timestamp)
            } else if let timestampMs = prayerTimeData["dateObj"] as? Double {
                prayerTime = Date(timeIntervalSince1970: timestampMs / 1000)
            }
            
            guard let prayerTime = prayerTime, now >= prayerTime else {
                continue
            }
            
            // Check if prayer is NOT completed
            let isCompleted = todayPrayerData[prayerId] == true
            if !isCompleted {
                // Store blocking info for this prayer
                let blockingInfo: [String: Any] = [
                    "prayerId": prayerId,
                    "startTime": prayerTime.timeIntervalSince1970 * 1000,
                    "isActive": true,
                    "unlockOnCompletion": true
                ]
                if let blockingData = try? JSONSerialization.data(withJSONObject: blockingInfo),
                   let blockingString = String(data: blockingData, encoding: .utf8) {
                    sharedDefaults?.set(blockingString, forKey: "currentPrayerBlocking")
                    sharedDefaults?.synchronize()
                    CFPreferencesAppSynchronize(kCFPreferencesCurrentApplication)
                    print("🔒 DeviceActivityMonitorExtension: Stored blocking info for prayer \(prayerId)")
                }
                break
            }
        }
    }
    
    // Check if we need to activate blocking immediately (for past prayer times)
    private func checkAndActivateBlockingIfNeeded() {
        print("🔍 DeviceActivityMonitorExtension: checkAndActivateBlockingIfNeeded called")
        CFPreferencesAppSynchronize(kCFPreferencesCurrentApplication)
        
        // Check if any prayer time has passed and isn't completed
        let now = Date()
        let today = Calendar.current.startOfDay(for: now)
        let formatter = DateFormatter()
        formatter.dateFormat = "yyyy-MM-dd"
        let dateKey = formatter.string(from: today)
        print("   - Today's date key: \(dateKey)")
        print("   - Current time: \(now)")
        
        // Get prayer data
        var prayerData: [String: [String: Bool]]?
        if let prayerDataDict = sharedDefaults?.dictionary(forKey: "prayerData") as? [String: [String: Bool]] {
            prayerData = prayerDataDict
        } else if let prayerDataString = sharedDefaults?.string(forKey: "prayerData"),
                  let prayerDataJson = prayerDataString.data(using: .utf8),
                  let prayerDataParsed = try? JSONSerialization.jsonObject(with: prayerDataJson) as? [String: [String: Bool]] {
            prayerData = prayerDataParsed
        }
        
        let todayPrayerData = prayerData?[dateKey] ?? [:]
        
        // Get prayer times from widget storage
        var prayerTimes: [[String: Any]] = []
        if let prayerTimesJson = sharedDefaults?.string(forKey: "prayer_times_widget"),
           let prayerTimesData = prayerTimesJson.data(using: .utf8),
           let widgetData = try? JSONSerialization.jsonObject(with: prayerTimesData) as? [String: Any],
           let times = widgetData["prayerTimes"] as? [[String: Any]] {
            prayerTimes = times
        }
        
        // Check if there's an active prayer blocking
        if let blockingInfoString = sharedDefaults?.string(forKey: "currentPrayerBlocking"),
           let blockingData = blockingInfoString.data(using: .utf8),
           let blockingInfo = try? JSONSerialization.jsonObject(with: blockingData) as? [String: Any],
           let prayerId = blockingInfo["prayerId"] as? String,
           let isActive = blockingInfo["isActive"] as? Bool,
           isActive {
            // Check if this specific prayer is not completed
            let isCompleted = todayPrayerData[prayerId] == true
            if !isCompleted {
                // Activate blocking immediately
                if #available(iOS 15.0, *) {
                    applyBlockingPolicy()
                } else {
                    blockAllApps()
                }
                print("🔒 DeviceActivityMonitorExtension: Blocking activated for prayer \(prayerId)")
            } else {
                // Prayer is completed, clear blocking
                store.clearAllSettings()
            }
        } else {
            // No active blocking info - check all prayer times to see if any have passed and aren't completed
            var shouldBlock = false
            var blockingPrayerId: String?
            
            for prayerTimeData in prayerTimes {
                guard let prayerName = prayerTimeData["name"] as? String else {
                    continue
                }
                
                let prayerId = prayerName.lowercased()
                
                // Skip Sunrise - it's not a mandatory prayer
                if prayerId == "sunrise" {
                    continue
                }
                
                // Parse the date - handle both ISO string and timestamp
                var prayerTime: Date?
                if let dateObjString = prayerTimeData["dateObj"] as? String {
                    // Try ISO8601 format first
                    let isoFormatter = ISO8601DateFormatter()
                    isoFormatter.formatOptions = [.withInternetDateTime, .withFractionalSeconds]
                    prayerTime = isoFormatter.date(from: dateObjString)
                    
                    // Try without fractional seconds
                    if prayerTime == nil {
                        isoFormatter.formatOptions = [.withInternetDateTime]
                        prayerTime = isoFormatter.date(from: dateObjString)
                    }
                } else if let timestamp = prayerTimeData["dateObj"] as? TimeInterval {
                    // Handle as timestamp (seconds since 1970)
                    prayerTime = Date(timeIntervalSince1970: timestamp)
                } else if let timestampMs = prayerTimeData["dateObj"] as? Double {
                    // Handle as milliseconds timestamp
                    prayerTime = Date(timeIntervalSince1970: timestampMs / 1000)
                }
                
                guard let prayerTime = prayerTime else {
                    continue
                }
                
                // Check if prayer time has passed
                if now >= prayerTime {
                    // Check if prayer is NOT completed
                    let isCompleted = todayPrayerData[prayerId] == true
                    if !isCompleted {
                        shouldBlock = true
                        blockingPrayerId = prayerId
                        
                        // Store blocking info
                        let blockingInfo: [String: Any] = [
                            "prayerId": prayerId,
                            "startTime": prayerTime.timeIntervalSince1970 * 1000,
                            "isActive": true,
                            "unlockOnCompletion": true
                        ]
                        if let blockingData = try? JSONSerialization.data(withJSONObject: blockingInfo),
                           let blockingString = String(data: blockingData, encoding: .utf8) {
                            sharedDefaults?.set(blockingString, forKey: "currentPrayerBlocking")
                            sharedDefaults?.synchronize()
                        }
                        break
                    }
                }
            }
            
            if shouldBlock, let prayerId = blockingPrayerId {
                if #available(iOS 15.0, *) {
                    applyBlockingPolicy()
                } else {
                    blockAllApps()
                }
                print("🔒 DeviceActivityMonitorExtension: Blocking activated - past prayer \(prayerId) not completed")
            }
        }
    }
    
    override func intervalDidStart(for activity: DeviceActivityName) {
        super.intervalDidStart(for: activity)
        
        print("⏰ DeviceActivityMonitorExtension: intervalDidStart called for activity: \(activity)")
        print("   Time: \(Date())")
        
        // When prayer time starts, activate blocking the same way as the test button
        if activity == .prayerTime {
            print("✅ This is a prayer time interval - checking for blocking...")
            // Synchronize UserDefaults to ensure we have the latest data
            CFPreferencesAppSynchronize(kCFPreferencesCurrentApplication)
            
            // Re-check all past prayers to ensure blocking is active
            checkAndActivateBlockingIfNeeded()
            
            // Also check if the current prayer is already completed before blocking
            if !isPrayerCompleted() {
                // Ensure blocking info is stored before activating (critical for custom shield)
                ensureBlockingInfoIsStored()
                
                // Activate blocking - this will trigger the Shield Configuration Extension
                if #available(iOS 15.0, *) {
                    applyBlockingPolicy()
                } else {
                    blockAllApps()
                }
                print("🔒 DeviceActivityMonitorExtension: Blocking activated at prayer time - custom shield should appear")
            } else {
                // Prayer is already completed, but still check for other past prayers
                // Don't clear all settings yet - other prayers might need blocking
                let now = Date()
                let today = Calendar.current.startOfDay(for: now)
                let formatter = DateFormatter()
                formatter.dateFormat = "yyyy-MM-dd"
                let dateKey = formatter.string(from: today)
                
                // Get prayer data
                var prayerData: [String: [String: Bool]]?
                if let prayerDataDict = sharedDefaults?.dictionary(forKey: "prayerData") as? [String: [String: Bool]] {
                    prayerData = prayerDataDict
                } else if let prayerDataString = sharedDefaults?.string(forKey: "prayerData"),
                          let prayerDataJson = prayerDataString.data(using: .utf8),
                          let prayerDataParsed = try? JSONSerialization.jsonObject(with: prayerDataJson) as? [String: [String: Bool]] {
                    prayerData = prayerDataParsed
                }
                
                let todayPrayerData = prayerData?[dateKey] ?? [:]
                
                // Check if any other prayer is not completed
                let prayerIds = ["fajr", "dhuhr", "asr", "maghrib", "isha"]
                var hasUncompletedPrayer = false
                for prayerId in prayerIds {
                    if todayPrayerData[prayerId] != true {
                        hasUncompletedPrayer = true
                        break
                    }
                }
                
                if !hasUncompletedPrayer {
                    // All prayers are completed, clear blocking
                    store.clearAllSettings()
                }
            }
        }
    }
    
    override func intervalDidEnd(for activity: DeviceActivityName) {
        super.intervalDidEnd(for: activity)
        
        // Only unblock if prayer is completed
        // Otherwise, keep blocking active until prayer is checked off
        if activity == .prayerTime {
            if isPrayerCompleted() {
                store.clearAllSettings()
            }
            // If prayer not completed, keep blocking active
        }
    }
    
    // Get prayer display name from ID
    private func getPrayerDisplayName(_ prayerId: String) -> String {
        let prayerNames: [String: String] = [
            "fajr": "Fajr",
            "dhuhr": "Dhuhr",
            "asr": "Asr",
            "maghrib": "Maghrib",
            "isha": "Isha"
        ]
        return prayerNames[prayerId.lowercased()] ?? "Fajr"
    }
    
    // Get current prayer name
    private func getCurrentPrayerName() -> String {
        // Get blocking info to find current prayer
        var prayerId: String?
        if let blockingInfoString = sharedDefaults?.string(forKey: "currentPrayerBlocking"),
           let blockingData = blockingInfoString.data(using: .utf8),
           let blockingInfo = try? JSONSerialization.jsonObject(with: blockingData) as? [String: Any] {
            prayerId = blockingInfo["prayerId"] as? String
        }
        
        if let prayerId = prayerId {
            return getPrayerDisplayName(prayerId)
        }
        
        return "Fajr" // Default
    }
    
    // Check if the current prayer is completed
    private func isPrayerCompleted() -> Bool {
        // Get blocking info - it might be stored as JSON string
        var prayerId: String?
        if let blockingInfoDict = sharedDefaults?.dictionary(forKey: "currentPrayerBlocking") {
            prayerId = blockingInfoDict["prayerId"] as? String
        } else if let blockingInfoString = sharedDefaults?.string(forKey: "currentPrayerBlocking"),
                  let blockingData = blockingInfoString.data(using: .utf8),
                  let blockingInfo = try? JSONSerialization.jsonObject(with: blockingData) as? [String: Any] {
            prayerId = blockingInfo["prayerId"] as? String
        }
        
        guard let prayerId = prayerId else {
            return false
        }
        
        let today = Calendar.current.startOfDay(for: Date())
        let formatter = DateFormatter()
        formatter.dateFormat = "yyyy-MM-dd"
        let dateKey = formatter.string(from: today)
        
        // Get prayer data - it might be stored as JSON string
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
           let isCompleted = todayData[prayerId] {
            return isCompleted
        }
        
        return false
    }
    
    override func eventDidReachThreshold(_ event: DeviceActivityEvent.Name, activity: DeviceActivityName) {
        super.eventDidReachThreshold(event, activity: activity)
        
        // Periodically check if prayer is completed and unlock if so
        // Also check if any past prayers need blocking
        if activity == .prayerTime {
            if isPrayerCompleted() {
                store.clearAllSettings()
            } else {
                // Prayer not completed - ensure blocking is active
                // Also check for other past prayers that might need blocking
                checkAndActivateBlockingIfNeeded()
            }
        }
    }
    
    override func intervalWillStartWarning(for activity: DeviceActivityName) {
        super.intervalWillStartWarning(for: activity)
        
        // Optional: Show warning before blocking starts
    }
    
    override func intervalWillEndWarning(for activity: DeviceActivityName) {
        super.intervalWillEndWarning(for: activity)
        
        // Optional: Show warning before blocking ends
    }
}

// The native module serializes the FamilyActivitySelection and saves it alongside the hasSelectedApps flag.
// The extension now reads that serialized selection, blocks only the chosen apps, and falls back to blocking
// every app when no specific selection exists.

private extension DeviceActivityMonitorExtension {
    func hasSelectedApps() -> Bool {
        CFPreferencesAppSynchronize(kCFPreferencesCurrentApplication)
        let value = sharedDefaults?.object(forKey: PRAYER_BLOCKER_HAS_SELECTED_APPS_KEY)
        print("🔍 DeviceActivityMonitorExtension: hasSelectedApps check")
        print("   - Raw value: \(String(describing: value))")
        print("   - Type: \(type(of: value))")
        let boolValue = sharedDefaults?.bool(forKey: PRAYER_BLOCKER_HAS_SELECTED_APPS_KEY) ?? false
        print("   - Bool value: \(boolValue)")
        return boolValue
    }

    @available(iOS 15.0, *)
    func loadFamilyActivitySelection() -> FamilyActivitySelection? {
        CFPreferencesAppSynchronize(kCFPreferencesCurrentApplication)
        
        guard let selectionString = sharedDefaults?.string(forKey: PRAYER_BLOCKER_SELECTION_KEY) else {
            print("⚠️ DeviceActivityMonitorExtension: No selection string found for key '\(PRAYER_BLOCKER_SELECTION_KEY)'")
            return nil
        }
        
        print("📱 DeviceActivityMonitorExtension: Found selection string, length: \(selectionString.count)")
        
        guard let selectionData = Data(base64Encoded: selectionString) else {
            print("❌ DeviceActivityMonitorExtension: Failed to decode base64 string")
            return nil
        }

        let decoder = JSONDecoder()
        guard let selection = try? decoder.decode(FamilyActivitySelection.self, from: selectionData) else {
            print("❌ DeviceActivityMonitorExtension: Failed to decode FamilyActivitySelection")
            return nil
        }
        
        print("✅ DeviceActivityMonitorExtension: Decoded selection: \(selection.applicationTokens.count) apps")
        return selection
    }

    @available(iOS 15.0, *)
    func selectionHasContent(_ selection: FamilyActivitySelection) -> Bool {
        !selection.applicationTokens.isEmpty
            || !selection.categoryTokens.isEmpty
            || !selection.webDomainTokens.isEmpty
    }

    @available(iOS 15.0, *)
    func applyBlockingPolicy() {
        CFPreferencesAppSynchronize(kCFPreferencesCurrentApplication)
        
        print("🔒 DeviceActivityMonitorExtension: Applying blocking policy...")
        
        let hasApps = hasSelectedApps()
        print("   - hasSelectedApps: \(hasApps)")
        
        guard hasApps else {
            print("   - No apps flag set, blocking all apps")
            blockAllApps()
            return
        }
        
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
}

private extension DeviceActivityMonitorExtension {
    func blockAllApps() {
        print("🚫 DeviceActivityMonitorExtension: Blocking ALL apps (no selection found)")
        store.shield.applications = nil
        store.shield.webDomains = nil
        store.shield.applicationCategories = .all()
        store.shield.webDomainCategories = .all()
    }
}

