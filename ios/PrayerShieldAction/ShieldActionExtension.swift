//
//  ShieldActionExtension.swift
//  PrayerShieldAction
//
//  Created by Moustapha Gueye on 12/29/25.
//

import Foundation
import ManagedSettings
import ManagedSettingsUI

// Override the functions below to customize the shield actions used in various situations.
// The system provides a default response for any functions that your subclass doesn't override.
// Make sure that your class name matches the NSExtensionPrincipalClass in your Info.plist.
class ShieldActionExtension: ShieldActionDelegate {
    override func handle(action: ShieldAction, for application: ApplicationToken, completionHandler: @escaping (ShieldActionResponse) -> Void) {
        // Synchronize UserDefaults before reading (critical for extension to see main app data)
        CFPreferencesAppSynchronize(kCFPreferencesCurrentApplication)
        
        // Handle the action when user presses the button on the shield screen
        switch action {
        case .primaryButtonPressed:
            // Store a flag in shared UserDefaults that the button was pressed
            // The main app will check this flag and navigate to the prayer screen
            let sharedDefaults = UserDefaults(suiteName: "group.com.digaifounder.huda")
            sharedDefaults?.set(true, forKey: "shieldButtonPressed")
            sharedDefaults?.set(Date().timeIntervalSince1970, forKey: "shieldButtonPressedTime")
            sharedDefaults?.synchronize()
            
            // Synchronize after writing
            CFPreferencesAppSynchronize(kCFPreferencesCurrentApplication)
            
            // Close the shield - the user will need to manually open the Huda app
            // The app will detect the flag and navigate to the prayer screen
            completionHandler(.close)
            
        case .secondaryButtonPressed:
            // If you add a secondary button, handle it here
            completionHandler(.defer)
            
        @unknown default:
            completionHandler(.close)
        }
    }
    
    override func handle(action: ShieldAction, for webDomain: WebDomainToken, completionHandler: @escaping (ShieldActionResponse) -> Void) {
        // Synchronize UserDefaults before reading
        CFPreferencesAppSynchronize(kCFPreferencesCurrentApplication)
        // Handle web domain blocking
        completionHandler(.close)
    }
    
    override func handle(action: ShieldAction, for category: ActivityCategoryToken, completionHandler: @escaping (ShieldActionResponse) -> Void) {
        // Synchronize UserDefaults before reading
        CFPreferencesAppSynchronize(kCFPreferencesCurrentApplication)
        // Handle category-based blocking
        completionHandler(.close)
    }
}
