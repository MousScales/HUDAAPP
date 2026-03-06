# Shield Action Extension Manual Setup

The Shield Action Extension handles button actions when users press buttons on the custom shield screen.

## Steps to Add Shield Action Extension in Xcode:

1. **Open Xcode** and open `ios/Hud.xcworkspace` (NOT .xcodeproj)

2. **Add New Target:**
   - Click on the project name "Hud" in the left sidebar
   - Click the "+" button at the bottom of the TARGETS list
   - Select "App Extension" → "Shield Action Extension"
   - Click "Next"
   - Product Name: `PrayerShieldAction`
   - Bundle Identifier: `com.digaifounder.huda.PrayerShieldAction`
   - Language: Swift
   - Click "Finish"
   - When asked "Activate 'PrayerShieldAction' scheme?", click "Cancel" (we'll use the main app scheme)

3. **Replace the Generated File:**
   - In Xcode, find the auto-generated `ShieldActionExtension.swift` in the new `PrayerShieldAction` target
   - Right-click → Delete → Move to Trash
   - Right-click on the `PrayerShieldAction` folder in Xcode
   - Select "Add Files to 'Hud'..."
   - Navigate to `ios/PrayerShieldAction/ShieldActionExtension.swift`
   - Make sure "Copy items if needed" is UNCHECKED
   - Make sure "Add to targets: PrayerShieldAction" is CHECKED
   - Click "Add"

4. **Update Info.plist:**
   - Select the `PrayerShieldAction` target
   - Go to the "Info" tab
   - Find "NSExtension" → "NSExtensionPointIdentifier"
   - Ensure it's set to: `com.apple.ManagedSettingsUI.ShieldAction`
   - Find "NSExtensionPrincipalClass"
   - Ensure it's set to: `$(PRODUCT_MODULE_NAME).ShieldActionExtension`

5. **Add Entitlements:**
   - Select the `PrayerShieldAction` target
   - Go to "Signing & Capabilities" tab
   - Click "+ Capability"
   - Add "App Groups"
   - Add group: `group.com.digaifounder.huda`
   - Click "+ Capability" again
   - Add "Family Controls" (if not already there)
   - Make sure the entitlements file is set to `PrayerShieldAction/PrayerShieldAction.entitlements`

6. **Link Frameworks:**
   - Select the `PrayerShieldAction` target
   - Go to "Build Phases" tab
   - Expand "Link Binary With Libraries"
   - Click "+" and add:
     - `ManagedSettings.framework`
     - `ManagedSettingsUI.framework`

7. **Set Deployment Target:**
   - Select the `PrayerShieldAction` target
   - Go to "Build Settings" tab
   - Search for "iOS Deployment Target"
   - Set it to `16.0` (ShieldAction requires iOS 16.0+)

8. **Embed the Extension:**
   - Select the `Hud` target (main app)
   - Go to "General" tab
   - Under "Frameworks, Libraries, and Embedded Content"
   - Click "+" and add `PrayerShieldAction.appex`
   - Set it to "Embed Without Signing" (or "Embed & Sign" if available)

9. **Build and Test:**
   - Clean build folder: Product → Clean Build Folder (Shift+Cmd+K)
   - Build the project: Product → Build (Cmd+B)
   - **IMPORTANT:** Delete the app from your device completely
   - Reinstall the app
   - Enable prayer blocker in Settings
   - Try to open a blocked app
   - Press the button on the shield screen - it should open the Huda app!

## How It Works:

- When a user presses the primary button on the shield screen, `handle(action: .primaryButtonPressed, ...)` is called
- The extension opens the Huda app using the deep link `huda://prayer`
- The main app's `App.js` handles this deep link and navigates to the Prayer screen


