# Firebase Setup for Hudā App

This guide will help you set up Firebase for the Hudā Islamic companion app.

## Prerequisites

1. Create a Firebase project at [console.firebase.google.com](https://console.firebase.google.com)
2. Enable Authentication and Firestore Database in your Firebase project

## Step 1: Firebase Project Setup

1. Go to [Firebase Console](https://console.firebase.google.com)
2. Click "Create a project" or "Add project"
3. Name your project (e.g., "huda-app")
4. Choose whether to enable Google Analytics (optional)
5. Create the project

## Step 2: Enable Authentication

1. In your Firebase project, go to **Authentication** → **Sign-in method**
2. Enable **Email/Password** sign-in method
3. Optionally enable other sign-in methods you want to support

## Step 3: Set up Firestore Database

1. Go to **Firestore Database** in Firebase Console
2. Click **Create database**
3. Start in **test mode** (we'll add security rules later)
4. Choose a location for your database
5. Click **Done**

## Step 4: Add iOS App

1. In Firebase Console, click **Add app** → **iOS**
2. Register your app:
   - **iOS bundle ID**: Use your app's bundle identifier (e.g., `com.yourcompany.hudaapp`)
   - **App nickname**: "Hudā iOS App" (optional)
   - **App Store ID**: Leave blank for now
3. Download the **GoogleService-Info.plist** file
4. Replace the placeholder file at `ios/GoogleService-Info.plist` with your downloaded file

## Step 5: Add Android App

1. In Firebase Console, click **Add app** → **Android**
2. Register your app:
   - **Android package name**: Use your app's package name (e.g., `com.yourcompany.hudaapp`)
   - **App nickname**: "Hudā Android App" (optional)
   - **Debug signing certificate SHA-1**: Optional for now
3. Download the **google-services.json** file
4. Replace the placeholder file at `android/app/google-services.json` with your downloaded file

## Step 6: Update Firebase Configuration

1. Open `firebase.js` in the project root
2. Replace the placeholder configuration with your actual Firebase config:

```javascript
const firebaseConfig = {
  apiKey: "your-actual-api-key",
  authDomain: "your-project-id.firebaseapp.com",
  projectId: "your-actual-project-id",
  storageBucket: "your-project-id.appspot.com",
  messagingSenderId: "your-actual-sender-id",
  appId: "your-actual-app-id"
};
```

You can find these values in:
- Firebase Console → Project Settings → General → Your apps

## Step 7: Set up Firestore Security Rules

1. In Firebase Console, go to **Firestore Database** → **Rules**
2. Replace the default rules with the content from `firestore.rules` in this project
3. Click **Publish**

## Step 8: Test the Setup

1. Run your app: `expo start`
2. Try creating a new account through the onboarding flow
3. Check Firebase Console:
   - **Authentication** → **Users** should show your new user
   - **Firestore Database** → **Data** should show user data in the `users` collection

## Firestore Data Structure

The app stores user data in the following structure:

```
users/{userId}/
  ├── name: string
  ├── email: string
  ├── userType: "Muslim" | "New Muslim"
  ├── madhab: "Hanafi" | "Maliki" | "Shafi'i" | "Hanbali"
  ├── gender: "Male" | "Female"
  ├── createdAt: timestamp
  └── updatedAt: timestamp
```

## Security Features

- **Authentication**: Users must be logged in to access the app
- **Data Privacy**: Users can only access their own data
- **Secure Storage**: Passwords are handled by Firebase Auth (never stored in Firestore)
- **Data Validation**: Client-side and server-side validation for all user inputs

## Troubleshooting

### Common Issues:

1. **"Default Firebase app has not been initialized"**
   - Make sure `firebase.js` is imported in `App.js`
   - Check that your configuration values are correct

2. **"Auth module is not initialized"**
   - Verify that Firebase packages are installed correctly
   - Run `npm install` again if needed

3. **"Permission denied" in Firestore**
   - Check that your Firestore security rules are properly set up
   - Ensure the user is authenticated

4. **iOS build issues**
   - Make sure `GoogleService-Info.plist` is added to your Xcode project
   - Verify the bundle ID matches your Firebase configuration

5. **Android build issues**
   - Ensure `google-services.json` is in the correct location
   - Check that the package name matches your Firebase configuration

## Next Steps

Once Firebase is set up, you can:

1. **Add more user data fields** as needed
2. **Implement prayer time tracking** in Firestore
3. **Store lesson progress** for each user
4. **Add dhikr/tasbih counters** with cloud sync
5. **Implement offline support** with Firestore's offline capabilities

## Support

If you encounter issues:
1. Check the [React Native Firebase documentation](https://rnfirebase.io/)
2. Review Firebase Console logs for any errors
3. Ensure all configuration files are properly set up

---

**Note**: Remember to keep your Firebase configuration files (`GoogleService-Info.plist`, `google-services.json`) secure and never commit them to public repositories with real credentials. 