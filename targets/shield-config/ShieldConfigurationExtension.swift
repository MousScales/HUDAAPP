import ManagedSettings
import ManagedSettingsUI
import UIKit

@available(iOS 16.0, *)
class PrayerShieldConfigurationDataSource: ShieldConfigurationDataSource {
    override func configuration(shielding application: Application) -> ShieldConfiguration {
        // Get prayer name from shared storage
        let sharedDefaults = UserDefaults(suiteName: "group.com.digaifounder.huda")
        var prayerId: String?
        
        if let blockingInfoString = sharedDefaults?.string(forKey: "currentPrayerBlocking"),
           let blockingData = blockingInfoString.data(using: .utf8),
           let blockingInfo = try? JSONSerialization.jsonObject(with: blockingData) as? [String: Any] {
            prayerId = blockingInfo["prayerId"] as? String
        }
        
        let prayerNames: [String: String] = [
            "fajr": "Fajr",
            "dhuhr": "Dhuhr",
            "asr": "Asr",
            "maghrib": "Maghrib",
            "isha": "Isha"
        ]
        
        let prayerName = prayerNames[prayerId?.lowercased() ?? ""] ?? "Fajr"
        
        // Try to load the Huda logo from the extension bundle or main bundle
        var logoImage: UIImage?
        var isSystemIcon = false
        
        // First try extension bundle
        if let extensionBundle = Bundle(identifier: "com.digaifounder.huda.PrayerShieldConfig"),
           let logoPath = extensionBundle.path(forResource: "logo-rounded", ofType: "png"),
           let image = UIImage(contentsOfFile: logoPath) {
            logoImage = image
        } else if let extensionBundle = Bundle(identifier: "com.digaifounder.huda.PrayerShieldConfig"),
                  let logoPath = extensionBundle.path(forResource: "logo", ofType: "png"),
                  let image = UIImage(contentsOfFile: logoPath) {
            logoImage = image
        }
        // Try main app bundle
        else if let logoPath = Bundle.main.path(forResource: "logo-rounded", ofType: "png"),
                let image = UIImage(contentsOfFile: logoPath) {
            logoImage = image
        } else if let logoPath = Bundle.main.path(forResource: "logo", ofType: "png"),
                  let image = UIImage(contentsOfFile: logoPath) {
            logoImage = image
        } else if let appIcon = UIImage(named: "AppIcon") {
            // Fallback to app icon
            logoImage = appIcon
        } else {
            // Final fallback to system icon
            let config = UIImage.SymbolConfiguration(pointSize: 80, weight: .medium)
            logoImage = UIImage(systemName: "moon.stars.fill", withConfiguration: config)
            isSystemIcon = true
        }
        
        // Apply rounded corners to the logo if it's not a system icon
        if let logo = logoImage, !isSystemIcon {
            let size = CGSize(width: 100, height: 100)
            UIGraphicsBeginImageContextWithOptions(size, false, 0)
            let rect = CGRect(origin: .zero, size: size)
            let path = UIBezierPath(roundedRect: rect, cornerRadius: 20)
            path.addClip()
            logo.draw(in: rect)
            logoImage = UIGraphicsGetImageFromCurrentImageContext()
            UIGraphicsEndImageContext()
        }
        
        // Create subtitle with message and Quran verses
        // Note: ShieldConfiguration subtitle has limited length (~500 chars), so we'll be concise but include key content
        let subtitle = """
        Don't delay prayer. Stop what you're doing and go pray.
        
        "Indeed, prayer has been decreed upon the believers at fixed times." (Quran 4:103)
        
        "But there came after them successors who neglected prayer and followed desires, so they will meet evil." (Quran 19:59)
        
        Open Huda app → Prayer screen → Check off \(prayerName) to unlock.
        """
        
        // Create custom shield configuration
        return ShieldConfiguration(
            backgroundColor: UIColor.systemBackground, // White in light mode, black in dark mode
            icon: logoImage,
            title: "It's time to pray \(prayerName)",
            subtitle: subtitle,
            primaryButtonLabel: "Finished Praying > Go check off the prayer in app to unlock",
            primaryButtonAction: .openURL(URL(string: "huda://prayer")!)
        )
    }
}
