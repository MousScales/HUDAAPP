# Manual Shield Configuration Extension Setup

The `shield-config` extension type is NOT supported by `@bacons/apple-targets` yet, so it must be manually added in Xcode.

## IMPORTANT: The file is already created at:
`ios/PrayerShieldConfig/PrayerShieldConfigurationDataSource.swift`

## Steps to Add Shield Configuration Extension in Xcode:

1. **Open Xcode** and open `ios/Hud.xcworkspace` (NOT .xcodeproj)

2. **Add New Target:**
   - Click on the project name "Hud" in the left sidebar
   - Click the "+" button at the bottom of the TARGETS list
   - Select "App Extension" → "Shield Configuration Extension"
   - Click "Next"
   - Product Name: `PrayerShieldConfig`
   - Bundle Identifier: `com.digaifounder.huda.PrayerShieldConfig`
   - Language: Swift
   - Click "Finish"
   - When asked "Activate 'PrayerShieldConfig' scheme?", click "Cancel" (we'll use the main app scheme)

3. **Replace the Generated File:**
   - In Xcode, find the auto-generated `ShieldConfigurationDataSource.swift` in the new `PrayerShieldConfig` target
   - Right-click → Delete → Move to Trash
   - Right-click on the `PrayerShieldConfig` folder in Xcode
   - Select "Add Files to 'Hud'..."
   - Navigate to `ios/PrayerShieldConfig/PrayerShieldConfigurationDataSource.swift`
   - Make sure "Copy items if needed" is UNCHECKED
   - Make sure "Add to targets: PrayerShieldConfig" is CHECKED
   - Click "Add"

4. **Update Info.plist:**
   - Select the `PrayerShieldConfig` target
   - Go to the "Info" tab
   - Find "NSExtension" → "NSExtensionPointIdentifier"
   - Ensure it's set to: `com.apple.ManagedSettingsUI.ShieldConfiguration`
   - Find "NSExtensionPrincipalClass"
   - Ensure it's set to: `$(PRODUCT_MODULE_NAME).PrayerShieldConfigurationDataSource`

5. **Add Entitlements:**
   - Select the `PrayerShieldConfig` target
   - Go to "Signing & Capabilities" tab
   - Click "+ Capability"
   - Add "App Groups"
   - Add group: `group.com.digaifounder.huda`
   - Click "+ Capability" again
   - Add "Family Controls" (if not already there)

6. **Link Frameworks:**
   - Select the `PrayerShieldConfig` target
   - Go to "Build Phases" tab
   - Expand "Link Binary With Libraries"
   - Click "+" and add:
     - `ManagedSettings.framework`
     - `ManagedSettingsUI.framework`

7. **Set Deployment Target:**
   - Select the `PrayerShieldConfig` target
   - Go to "Build Settings" tab
   - Search for "iOS Deployment Target"
   - Set it to `16.0` (ShieldConfiguration requires iOS 16.0+)

8. **Build and Test:**
   - Clean build folder: Product → Clean Build Folder (Shift+Cmd+K)
   - Build the project: Product → Build (Cmd+B)
   - **IMPORTANT:** Delete the app from your device completely
   - Reinstall the app
   - Enable prayer blocker in Settings
   - Try to open a blocked app - you should see the custom screen!

## Troubleshooting:

- If you still see the default "Restricted" screen:
  1. Make sure the extension is built (check for `PrayerShieldConfig.appex` in build products)
  2. Delete app completely and reinstall
  3. Restart your device
  4. Check that iOS version is 16.0 or higher
