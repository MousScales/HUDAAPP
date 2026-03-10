//
//  ShieldConfigurationExtension.swift
//  PrayerShieldConfig
//
//  Created by Moustapha Gueye on 12/29/25.
//

import Foundation
import ManagedSettings
import ManagedSettingsUI
import UIKit

private let prayerNameMapping: [String: String] = [
    "fajr": "Fajr",
    "dhuhr": "Dhuhr",
    "asr": "Asr",
    "maghrib": "Maghrib",
    "isha": "Isha"
]
private let prayerDateFormatter: DateFormatter = {
    let formatter = DateFormatter()
    formatter.dateFormat = "yyyy-MM-dd"
    formatter.timeZone = TimeZone.current
    return formatter
}()

@available(iOS 16.0, *)
class ShieldConfigurationExtension: ShieldConfigurationDataSource {
    override func configuration(shielding application: Application) -> ShieldConfiguration {
        // Synchronize UserDefaults before reading (critical for extension to see main app data)
        CFPreferencesAppSynchronize(kCFPreferencesCurrentApplication)
        
        let sharedDefaults = UserDefaults(suiteName: "group.com.digaifounder.huda")
        let (titleText, instructionText) = shieldTextComponents(using: sharedDefaults)

        // Try to load custom image (lantern or logo) and resize it to be bigger
        var iconImage: UIImage?
        var loadedImage: UIImage?
        
        // Try App Group directory first (best option)
        if let appGroupURL = FileManager.default.containerURL(forSecurityApplicationGroupIdentifier: "group.com.digaifounder.huda") {
            let imagePath = appGroupURL.appendingPathComponent("logo-rounded.png").path
            if FileManager.default.fileExists(atPath: imagePath),
               let image = UIImage(contentsOfFile: imagePath) {
                loadedImage = image
            }
        }
        
        // Try extension bundle
        if loadedImage == nil {
            if let extensionBundle = Bundle(identifier: "com.digaifounder.huda.PrayerShieldConfig"),
               let logoPath = extensionBundle.path(forResource: "logo-rounded", ofType: "png"),
               let image = UIImage(contentsOfFile: logoPath) {
                loadedImage = image
            }
        }
        
        // Try main app bundle
        if loadedImage == nil {
            if let logoPath = Bundle.main.path(forResource: "logo-rounded", ofType: "png"),
               let image = UIImage(contentsOfFile: logoPath) {
                loadedImage = image
            }
        }
        
        // Try lantern image if logo not found
        if loadedImage == nil {
            if let extensionBundle = Bundle(identifier: "com.digaifounder.huda.PrayerShieldConfig"),
               let lanternPath = extensionBundle.path(forResource: "lantern", ofType: "png"),
               let image = UIImage(contentsOfFile: lanternPath) {
                loadedImage = image
            }
        }
        
        // Resize the image to make it bigger (200x200 or larger)
        if let originalImage = loadedImage {
            let targetSize = CGSize(width: 200, height: 200)
            UIGraphicsBeginImageContextWithOptions(targetSize, false, 0.0)
            originalImage.draw(in: CGRect(origin: .zero, size: targetSize))
            iconImage = UIGraphicsGetImageFromCurrentImageContext()
            UIGraphicsEndImageContext()
        }
        
        // Off-white color for button (slightly grayish white)
        let offWhiteColor = UIColor(white: 0.95, alpha: 1.0)

        // Create custom shield configuration with explicit colors
        // Using .light blur style with white background for better visibility
        return ShieldConfiguration(
            backgroundBlurStyle: .light,
            backgroundColor: UIColor.white,
            icon: iconImage, // Custom image or nil
            title: .init(text: titleText, color: UIColor.black),
            subtitle: .init(text: instructionText, color: UIColor.black),
            primaryButtonLabel: .init(text: "Finished Praying", color: UIColor.black),
            primaryButtonBackgroundColor: offWhiteColor // Off-white background
        )
    }
    
    override func configuration(shielding application: Application, in category: ActivityCategory) -> ShieldConfiguration {
        // Synchronize UserDefaults before reading
        CFPreferencesAppSynchronize(kCFPreferencesCurrentApplication)
        // Use the same configuration for category-based blocking
        return configuration(shielding: application)
    }
    
    override func configuration(shielding webDomain: WebDomain) -> ShieldConfiguration {
        // Synchronize UserDefaults before reading
        CFPreferencesAppSynchronize(kCFPreferencesCurrentApplication)
        
        // Use the same configuration for web domains
        let sharedDefaults = UserDefaults(suiteName: "group.com.digaifounder.huda")
        let (titleText, instructionText) = shieldTextComponents(using: sharedDefaults)
        
        // Try to load custom image (same logic as main configuration) and resize it
        var iconImage: UIImage?
        var loadedImage: UIImage?
        
        // Try App Group directory first
        if let appGroupURL = FileManager.default.containerURL(forSecurityApplicationGroupIdentifier: "group.com.digaifounder.huda") {
            let imagePath = appGroupURL.appendingPathComponent("logo-rounded.png").path
            if FileManager.default.fileExists(atPath: imagePath),
               let image = UIImage(contentsOfFile: imagePath) {
                loadedImage = image
            }
        }
        
        // Try extension bundle
        if loadedImage == nil {
            if let extensionBundle = Bundle(identifier: "com.digaifounder.huda.PrayerShieldConfig"),
               let logoPath = extensionBundle.path(forResource: "logo-rounded", ofType: "png"),
               let image = UIImage(contentsOfFile: logoPath) {
                loadedImage = image
            }
        }
        
        // Try main app bundle
        if loadedImage == nil {
            if let logoPath = Bundle.main.path(forResource: "logo-rounded", ofType: "png"),
               let image = UIImage(contentsOfFile: logoPath) {
                loadedImage = image
            }
        }
        
        // Try lantern image if logo not found
        if loadedImage == nil {
            if let extensionBundle = Bundle(identifier: "com.digaifounder.huda.PrayerShieldConfig"),
               let lanternPath = extensionBundle.path(forResource: "lantern", ofType: "png"),
               let image = UIImage(contentsOfFile: lanternPath) {
                loadedImage = image
            }
        }
        
        // Resize the image to make it bigger (200x200 or larger)
        if let originalImage = loadedImage {
            let targetSize = CGSize(width: 200, height: 200)
            UIGraphicsBeginImageContextWithOptions(targetSize, false, 0.0)
            originalImage.draw(in: CGRect(origin: .zero, size: targetSize))
            iconImage = UIGraphicsGetImageFromCurrentImageContext()
            UIGraphicsEndImageContext()
        }
        
        // Off-white color for button
        let offWhiteColor = UIColor(white: 0.95, alpha: 1.0)
        
        return ShieldConfiguration(
            backgroundBlurStyle: .light,
            backgroundColor: UIColor.white,
            icon: iconImage, // Custom image or nil
            title: .init(text: titleText, color: UIColor.black),
            subtitle: .init(text: instructionText, color: UIColor.black),
            primaryButtonLabel: .init(text: "Finished Praying", color: UIColor.black),
            primaryButtonBackgroundColor: offWhiteColor // Off-white background
        )
    }
    
    override func configuration(shielding webDomain: WebDomain, in category: ActivityCategory) -> ShieldConfiguration {
        // Synchronize UserDefaults before reading
        CFPreferencesAppSynchronize(kCFPreferencesCurrentApplication)
        // Use the same configuration for category-based web domain blocking
        return configuration(shielding: webDomain)
    }
}

private extension ShieldConfigurationExtension {
    func shieldTextComponents(using sharedDefaults: UserDefaults?) -> (title: String, instruction: String) {
        print("🔍 ShieldConfig: shieldTextComponents called")
        let now = Date()
        let prayerId = currentBlockingPrayerId(using: sharedDefaults)
        let prayerName = prayerDisplayName(for: prayerId)
        print("🔍 ShieldConfig: Final prayerName = '\(prayerName)'")
        let instructionText = String(repeating: "\n", count: 4) + "Open Hudā to mark your prayer as complete to unlock"

        let prayerData = loadPrayerData(using: sharedDefaults)
        let prayerTimes = loadPrayerTimes(using: sharedDefaults)
        let parsedEntries = prayerTimes.compactMap { entry -> (id: String, date: Date, key: String)? in
            guard let name = (entry["name"] as? String)?.lowercased(),
                  let date = parsePrayerDate(from: entry["dateObj"]) else {
                return nil
            }
            return (id: name, date: date, key: dateKey(for: date))
        }.sorted { $0.date < $1.date }

        var missedCount = 0
        var firstMissedId: String?
        var lastMissedId: String?

        print("🔍 ShieldConfig: Checking for missed prayers...")
        for entry in parsedEntries {
            guard now >= entry.date else { continue }
            let completed = prayerData[entry.key]?[entry.id] == true
            print("  - \(entry.id): completed = \(completed)")
            if !completed {
                missedCount += 1
                if firstMissedId == nil {
                    firstMissedId = entry.id
                }
                lastMissedId = entry.id
                print("    ⚠️ MISSED! missedCount = \(missedCount)")
            }
        }
        
        print("🔍 ShieldConfig: Total missed count = \(missedCount)")
        print("🔍 ShieldConfig: First missed = \(firstMissedId ?? "none")")
        print("🔍 ShieldConfig: Current prayer = \(prayerId)")

        let titleText: String
        if missedCount > 1, let missedId = firstMissedId {
            let missedDisplayName = prayerDisplayName(for: missedId)
            titleText = """
            You missed \(missedDisplayName)
            Salaam its time to Pray
            """
            print("📝 ShieldConfig: Using 'missed' message")
        } else {
            titleText = "Salaam its time to Pray"
            print("📝 ShieldConfig: Using 'time to pray' message")
        }
        
        print("✅ ShieldConfig: Final title = '\(titleText)'")

        return (titleText, instructionText)
    }

    func currentBlockingPrayerId(using sharedDefaults: UserDefaults?) -> String {
        print("🔍 ShieldConfig: Reading current blocking prayer ID...")
        
        // CRITICAL: Force synchronization before reading
        CFPreferencesAppSynchronize(kCFPreferencesCurrentApplication)
        
        guard let sharedDefaults = sharedDefaults else {
            print("⚠️ ShieldConfig: No shared defaults")
            return detectCurrentPrayer(using: nil)
        }
        
        // Force reload from disk
        sharedDefaults.synchronize()
        
        // Debug: Print all keys to see what's available
        if let allKeys = sharedDefaults.dictionaryRepresentation().keys as? [String] {
            print("📋 ShieldConfig: Available keys: \(allKeys.filter { $0.contains("Prayer") || $0.contains("prayer") })")
        }
        
        // First try to read from currentPrayerBlocking
        let blockingInfoString = sharedDefaults.string(forKey: "currentPrayerBlocking")
        print("📱 ShieldConfig: Raw currentPrayerBlocking value = \(blockingInfoString ?? "nil")")
        
        if let blockingInfoString = blockingInfoString,
           let blockingData = blockingInfoString.data(using: .utf8),
           let blockingInfo = try? JSONSerialization.jsonObject(with: blockingData) as? [String: Any],
           let prayerId = blockingInfo["prayerId"] as? String {
            print("✅ ShieldConfig: Found prayerId from blocking info = \(prayerId)")
            return prayerId.lowercased()
        }
        
        print("⚠️ ShieldConfig: No currentPrayerBlocking found, detecting from prayer times...")
        return detectCurrentPrayer(using: sharedDefaults)
    }
    
    // Detect which prayer should be showing based on current time and uncompleted prayers
    func detectCurrentPrayer(using sharedDefaults: UserDefaults?) -> String {
        guard let sharedDefaults = sharedDefaults else {
            print("⚠️ Using fallback: fajr")
            return "fajr"
        }
        
        let now = Date()
        let prayerData = loadPrayerData(using: sharedDefaults)
        let prayerTimes = loadPrayerTimes(using: sharedDefaults)
        
        let today = dateKey(for: now)
        let todayPrayerData = prayerData[today] ?? [:]
        
        print("🔍 ShieldConfig: Detecting current prayer from times...")
        print("   Today: \(today)")
        print("   Prayer data: \(todayPrayerData)")
        
        // Find the first past prayer that isn't completed
        for prayerTimeData in prayerTimes {
            guard let name = (prayerTimeData["name"] as? String)?.lowercased(),
                  name != "sunrise", // Skip sunrise
                  let date = parsePrayerDate(from: prayerTimeData["dateObj"]),
                  now >= date else {
                continue
            }
            
            let isCompleted = todayPrayerData[name] == true
            if !isCompleted {
                print("✅ ShieldConfig: Detected uncompleted past prayer: \(name)")
                return name
            }
        }
        
        print("⚠️ ShieldConfig: No uncompleted prayers found, using fallback: fajr")
        return "fajr"
    }

    func loadPrayerData(using sharedDefaults: UserDefaults?) -> [String: [String: Bool]] {
        guard let sharedDefaults = sharedDefaults else { return [:] }
        if let dict = sharedDefaults.dictionary(forKey: "prayerData") as? [String: [String: Bool]] {
            return dict
        }
        if let jsonString = sharedDefaults.string(forKey: "prayerData"),
           let jsonData = jsonString.data(using: .utf8),
           let parsed = try? JSONSerialization.jsonObject(with: jsonData) as? [String: [String: Bool]] {
            return parsed
        }
        return [:]
    }

    func loadPrayerTimes(using sharedDefaults: UserDefaults?) -> [[String: Any]] {
        guard let sharedDefaults = sharedDefaults,
              let jsonString = sharedDefaults.string(forKey: "prayer_times_widget"),
              let jsonData = jsonString.data(using: .utf8),
              let widgetData = try? JSONSerialization.jsonObject(with: jsonData) as? [String: Any],
              let times = widgetData["prayerTimes"] as? [[String: Any]] else {
            return []
        }
        return times
    }

    func parsePrayerDate(from object: Any?) -> Date? {
        if let string = object as? String {
            let isoFormatter = ISO8601DateFormatter()
            isoFormatter.formatOptions = [.withInternetDateTime, .withFractionalSeconds]
            if let date = isoFormatter.date(from: string) {
                return date
            }
            isoFormatter.formatOptions = [.withInternetDateTime]
            if let date = isoFormatter.date(from: string) {
                return date
            }
        } else if let timestamp = object as? TimeInterval {
            return Date(timeIntervalSince1970: timestamp)
        } else if let timestampMs = object as? Double {
            return Date(timeIntervalSince1970: timestampMs / 1000)
        }
        return nil
    }

    func dateKey(for date: Date) -> String {
        return prayerDateFormatter.string(from: date)
    }

    func prayerDisplayName(for prayerId: String) -> String {
        let lowercased = prayerId.lowercased()
        let displayName = prayerNameMapping[lowercased] ?? prayerId.capitalized
        print("🔍 ShieldConfig: prayerId '\(prayerId)' → displayName '\(displayName)'")
        return displayName
    }
}
