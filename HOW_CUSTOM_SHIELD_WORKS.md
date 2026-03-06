# How Custom Shield Screen Works

Based on the article and iOS documentation, here's how the custom shield screen appears:

## How It Works

1. **Automatic Detection**: When you set `store.shield.applications` or `store.shield.applicationCategories` using `ManagedSettingsStore`, iOS automatically:
   - Detects that apps are being blocked
   - Looks for a Shield Configuration Extension in your app bundle
   - Calls the extension's `configuration(shielding:)` method
   - Displays the custom UI instead of the default "Restricted" screen

2. **No Explicit Registration Needed**: Unlike other extensions, you don't need to explicitly register or call the Shield Configuration Extension. iOS finds it automatically based on:
   - The extension point identifier: `com.apple.ManagedSettingsUI.ShieldConfiguration`
   - The extension being embedded in your app bundle

3. **When It's Called**: The extension is called when:
   - A user tries to open a blocked app
   - The app is in the `store.shield.applications` set, OR
   - The app belongs to a category in `store.shield.applicationCategories`

## Current Setup

✅ **Shield Configuration Extension** (`PrayerShieldConfig`):
- Extension point: `com.apple.ManagedSettingsUI.ShieldConfiguration` ✓
- Class name: `ShieldConfigurationExtension` ✓
- Conforms to: `ShieldConfigurationDataSource` ✓
- Returns: Custom `ShieldConfiguration` with logo, text, Quran verses ✓

✅ **Device Activity Monitor Extension** (`PrayerBlocker`):
- Sets `store.shield.applicationCategories = .all()` ✓
- This triggers the shield for all apps ✓

✅ **Shield Action Extension** (`PrayerShieldAction`):
- Handles button presses on the shield screen ✓
- Opens Huda app when button is pressed ✓

## Why It Might Not Be Showing

1. **Extension Not Embedded**: The `PrayerShieldConfig.appex` must be in the app bundle
   - Check: `Hud` target → General → Frameworks, Libraries, and Embedded Content
   - Should see `PrayerShieldConfig.appex` listed

2. **Extension Not Built**: The extension target must be built successfully
   - Build the `PrayerShieldConfig` target separately
   - Then build the main `Hud` target

3. **iOS Not Recognizing Extension**: After adding/modifying extensions:
   - **Delete the app completely** from device
   - **Restart the device** (important!)
   - **Reinstall the app** from Xcode
   - iOS needs to re-register the extension

4. **iOS Version**: Must be iOS 16.0 or later
   - ShieldConfiguration requires iOS 16.0+

5. **Blocking Not Active**: Make sure blocking is actually active
   - Check that `store.shield.applicationCategories = .all()` is set
   - Verify prayer blocker is enabled in Settings
   - Try opening a blocked app

## Testing Steps

1. **Build Extension First**:
   ```
   - Select `PrayerShieldConfig` target
   - Product → Build (Cmd+B)
   - Ensure no errors
   ```

2. **Build Main App**:
   ```
   - Select `Hud` target
   - Product → Clean Build Folder (Shift+Cmd+K)
   - Product → Build (Cmd+B)
   ```

3. **Verify Embedding**:
   ```
   - Select `Hud` target → General tab
   - Check "Frameworks, Libraries, and Embedded Content"
   - `PrayerShieldConfig.appex` should be listed
   ```

4. **Delete and Reinstall**:
   ```
   - Delete app from device
   - Restart device
   - Reinstall from Xcode
   ```

5. **Test**:
   ```
   - Enable prayer blocker in Settings
   - Try to open a blocked app (e.g., Instagram, Safari)
   - Should see custom shield with Huda logo and prayer message
   ```

## Key Insight from Article

The article shows that the Shield Configuration Extension is **automatically invoked by iOS** when:
- Apps are blocked via `ManagedSettingsStore`
- A user tries to open a blocked app
- The extension is properly configured and embedded

**You don't need to manually call or register the extension** - iOS handles it automatically!

## Troubleshooting

If the custom shield still doesn't appear:

1. Check Xcode build logs for extension build errors
2. Verify the extension is in the app bundle:
   ```bash
   # After building, check:
   ls -la ~/Library/Developer/Xcode/DerivedData/Hud-*/Build/Products/Debug-iphoneos/Hud.app/PlugIns/
   # Should see PrayerShieldConfig.appex
   ```

3. Check device console logs when opening a blocked app
4. Verify iOS version is 16.0+
5. Try a different blocked app to test

The setup is correct - it's likely an embedding/recognition issue that a clean reinstall should fix!


