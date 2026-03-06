# Apple Sign-In Setup Guide

## Overview
This guide will help you configure Apple Sign-In with Firebase for the Hudā app.

## Prerequisites
- Apple Developer Account
- Firebase Project
- iOS App configured in Firebase Console

## Step 1: Configure Apple Developer Account

### 1.1 Create App ID
1. Go to [Apple Developer Console](https://developer.apple.com/account/)
2. Navigate to "Certificates, Identifiers & Profiles"
3. Click "Identifiers" → "+" → "App IDs"
4. Select "App" and click "Continue"
5. Fill in the details:
   - **Description**: Hudā App
   - **Bundle ID**: `com.digaifounder.huda` (must match your app.json)
   - **Capabilities**: Enable "Sign In with Apple"
6. Click "Continue" and "Register"

### 1.2 Create Service ID (for Firebase)
1. In Apple Developer Console, go to "Identifiers"
2. Click "+" → "Services IDs"
3. Fill in the details:
   - **Description**: Hudā Firebase Service
   - **Identifier**: `com.digaifounder.huda.firebase` (or similar)
4. Click "Continue" and "Register"
5. Enable "Sign In with Apple" for this Service ID
6. Click "Configure" next to "Sign In with Apple"
7. Set **Primary App ID** to your app's Bundle ID
8. Add **Domains and Subdomains**: `locked-dd553.firebaseapp.com`
9. Add **Return URLs**: `https://locked-dd553.firebaseapp.com/__/auth/handler`
10. Click "Save"

## Step 2: Configure Firebase Console

### 2.1 Enable Apple Sign-In Provider
1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Select your project
3. Go to "Authentication" → "Sign-in method"
4. Click on "Apple" provider
5. Enable it and configure:
   - **Service ID**: `com.digaifounder.huda.firebase` (from Step 1.2)
   - **Apple Team ID**: Your Apple Developer Team ID
   - **Key ID**: Create a new key in Apple Developer Console
   - **Private Key**: Download and paste the private key

### 2.2 Create Apple Signing Key
1. In Apple Developer Console, go to "Keys"
2. Click "+" → "Apple Signing Key"
3. Fill in the details:
   - **Key Name**: Hudā Firebase Key
   - **Key ID**: Will be generated (note this for Firebase)
4. Enable "Sign In with Apple"
5. Click "Configure" and select your App ID
6. Click "Save"
7. Download the key file (.p8)
8. Note the **Key ID** for Firebase configuration

### 2.3 Add Key to Firebase
1. In Firebase Console, paste the **Key ID** from Step 2.2
2. Upload the **Private Key** file (.p8) from Step 2.2
3. Click "Save"

## Step 3: Update iOS App Configuration

### 3.1 Add Capability to Xcode Project
1. Open your project in Xcode
2. Select your target
3. Go to "Signing & Capabilities"
4. Click "+" → "Sign In with Apple"
5. This will add the capability to your app

### 3.2 Update Info.plist (if needed)
The Expo plugin should handle this automatically, but verify:
```xml
<key>CFBundleURLTypes</key>
<array>
  <dict>
    <key>CFBundleURLName</key>
    <string>com.digaifounder.huda</string>
    <key>CFBundleURLSchemes</key>
    <array>
      <string>com.digaifounder.huda</string>
    </array>
  </dict>
</array>
```

## Step 4: Test the Implementation

### 4.1 Build and Test
1. Run `npx expo run:ios` to build the app
2. Test Apple Sign-In on a physical iOS device
3. Verify the sign-in flow works correctly

### 4.2 Debugging
- Check Firebase Console logs for authentication errors
- Verify Apple Developer Console for any configuration issues
- Test on both simulator and physical device

## Troubleshooting

### Common Issues

1. **"Apple Sign-In Not Available"**
   - Ensure you're testing on iOS device (not simulator)
   - Verify Apple Sign-In capability is added to Xcode project

2. **Firebase Authentication Errors**
   - Check Service ID configuration in Firebase Console
   - Verify Apple Team ID and Key ID are correct
   - Ensure private key is properly uploaded

3. **Bundle ID Mismatch**
   - Verify bundle ID in app.json matches Apple Developer App ID
   - Check Firebase Console app configuration

### Debug Steps
1. Check Firebase Console → Authentication → Users
2. Verify Apple Developer Console → Certificates, Identifiers & Profiles
3. Test with different Apple IDs
4. Check Xcode console for detailed error messages

## Security Notes
- Keep your Apple private key secure
- Never commit private keys to version control
- Use environment variables for sensitive configuration
- Regularly rotate your Apple signing keys

## Next Steps
After successful configuration:
1. Test the complete user flow
2. Implement proper error handling
3. Add user profile management
4. Consider implementing sign-out functionality
5. Add proper loading states and user feedback

## Support
If you encounter issues:
1. Check Apple Developer documentation
2. Review Firebase Authentication documentation
3. Verify all configuration steps were completed
4. Test on physical iOS device 