# Android EAS Development Build Checklist

## ✅ Pre-Build Checklist

### 1. Configuration Files
- [x] `eas.json` - Development profile configured
- [x] `app.json` - Android package name set: `com.huda.app`
- [x] `app.json` - Android version code: `9`
- [x] `app.json` - Android permissions cleaned up (duplicates removed)
- [x] `package.json` - All dependencies installed

### 2. Prebuild Android Only (To Create android/ Folder)
- [ ] **Run prebuild for Android only** (this won't touch iOS):
  ```bash
  npx expo prebuild --platform android
  ```
  - This creates the `android/` folder with the native Android project
  - **iOS folder will remain untouched** - this command only generates Android files
  - After this completes, you'll see the `android/` folder in your project

### 3. Firebase Setup (Required for Authentication, Firestore, and Notifications)
- [ ] **Download `google-services.json` from Firebase Console**
  - Go to Firebase Console → Project Settings → Your Android App
  - **Package name**: `com.digaifounder.huda` (from your `app.json`)
  - Click **Download google-services.json**
  - **Place it at**: `android/app/google-services.json` (now that the folder exists)
  - **Why it's needed**:
    - ✅ Firebase Authentication (email/password sign-in)
    - ✅ Firebase Firestore (user data storage)
    - ✅ **Firebase Cloud Messaging (FCM) - Required for Android push notifications**
  
  **Note**: Even though you're using `expo-notifications`, Expo uses FCM under the hood on Android, so this file is essential for notifications to work.

### 4. RevenueCat Setup (Optional for Development)
- [ ] **Android RevenueCat API Key** (currently set to `null` in `App.js`)
  - Get your Android API key from RevenueCat dashboard (starts with `goog_`)
  - Replace `null` in `App.js` line 409 with your API key
  - **Note:** This is optional for development - app will work without it, just won't have subscription features

### 5. Google Sign-In (If Using)
- [ ] If you plan to use Google Sign-In on Android:
  - Enable Google Sign-In in Firebase Console → Authentication → Sign-in method
  - Add SHA-1 fingerprint to Firebase Console (for debug builds)
  - Get SHA-1: `cd android && ./gradlew signingReport` (after prebuild)

## 🚀 Build Command

Run this command to create an Android development build:

```bash
eas build --profile development --platform android
```

## 📝 Notes

1. **First Build**: The first build will take longer as EAS sets up the Android project
2. **google-services.json**: If you haven't added it yet, you can add it after the first build
3. **RevenueCat**: Subscription features won't work on Android until you add the API key, but the app will run fine
4. **Testing**: After build completes, you can install via QR code or download from EAS dashboard

## 🔍 Post-Build Verification

After installing the build, verify:
- [ ] App launches successfully
- [ ] Firebase authentication works
- [ ] Location permissions work
- [ ] Notifications work
- [ ] RevenueCat (if API key added) initializes without errors

## ⚠️ Common Issues

1. **Build fails with "google-services.json not found"**
   - Add the file to `android/app/` after running `npx expo prebuild`
   - Or configure it in `app.json` plugins

2. **RevenueCat errors on Android**
   - Make sure Android API key is added in `App.js`
   - Verify products are configured in RevenueCat dashboard for Android

3. **Permissions not working**
   - Check that permissions are correctly listed in `app.json`
   - Verify AndroidManifest.xml after prebuild

