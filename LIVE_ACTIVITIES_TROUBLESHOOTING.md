# Live Activities Troubleshooting Checklist

## ✅ Already Configured

1. **Main App Info.plist** - `NSSupportsLiveActivities` is set to `true` ✅
2. **Widget Extension Info.plist** - `NSSupportsLiveActivities` is set to `true` ✅
3. **Push Notifications** - `aps-environment` is configured in entitlements ✅
4. **App Groups** - Configured for sharing data between app and widget ✅

## ⚠️ Important: Regenerate Xcode Project

Since we just added `NSSupportsLiveActivities` to the widget extension's `Info.plist`, you **must** regenerate the Xcode project for the changes to take effect:

```bash
npx expo prebuild -p ios --clean
```

This will regenerate the Xcode project with the updated configuration.

**Note**: With Expo's `@bacons/apple-targets` plugin, Live Activities are configured through `Info.plist` files, not through Xcode UI checkboxes. You won't see a "Live Activities" checkbox in Xcode - it's automatically handled by the plugin based on the `Info.plist` settings.

### 3. Signing & Capabilities

For the **main app target** (Hud):
1. Go to **Signing & Capabilities** tab
2. Verify **Push Notifications** capability is added
3. If you see any warnings about missing entitlements, click "Fix Issue"

For the **widget target**:
1. Go to **Signing & Capabilities** tab
2. Verify it uses the same team and bundle identifier prefix
3. Verify **App Groups** capability is added with `group.com.digaifounder.huda`

### 4. Regenerate and Rebuild

**IMPORTANT**: After adding `NSSupportsLiveActivities` to `Info.plist`, you must regenerate the Xcode project:

1. Run: `npx expo prebuild -p ios --clean`
2. This regenerates the Xcode project with updated configuration
3. Then rebuild: `npx expo run:ios` or build from Xcode

**Why?** The `@bacons/apple-targets` plugin reads from your `Info.plist` files when generating the Xcode project. Without regenerating, the Xcode project won't know about the new `NSSupportsLiveActivities` setting.

### 5. Check Device Settings

On your iOS device:
1. **Settings → Face ID & Passcode** (or Touch ID & Passcode)
2. Scroll down and ensure Live Activities are enabled
3. **Settings → [Your App Name] → Live Activities**
4. Ensure Live Activities are enabled for your app specifically

### 6. Check Console Logs

After rebuilding, check the Xcode console for:
- Detailed error messages starting with 🚀
- Any ActivityKit error codes
- Authorization status messages

The native module now returns detailed error information to JavaScript, which will appear in your React Native console.

## Common Error Codes

If you see error codes in the logs:
- **Error 1**: Activity not found (widget extension issue)
- **Error 2**: Activity limit exceeded (too many activities)
- **Error 3**: Activity not supported (iOS version or configuration issue)

## Next Steps

1. **Rebuild the app** after checking Xcode settings
2. **Check the console** for detailed error messages (we've added extensive logging)
3. **Verify device settings** for Live Activities
4. If still failing, share the **detailed error messages** from the console

