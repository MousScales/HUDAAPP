# 🔧 Fix Duplicate User Accounts in Firebase

## Problem

Your Firebase Authentication has **multiple user IDs connected to the same email address**. This happens when:

1. A user signs up with **Email/Password** (creates User ID #1)
2. Later, they sign in with **Apple Sign-In** using the same email (creates User ID #2)

Firebase treats these as **separate accounts** even though the email is identical, because they use different authentication providers.

---

## Solution Overview

We'll fix this in 3 steps:

1. **Identify duplicate accounts** in Firebase Console
2. **Run a script** to merge/delete duplicates  
3. **Implement account linking** to prevent future duplicates

---

## Step 1: Identify Duplicate Users

### 1.1 Check Firebase Console

1. Go to: [Firebase Authentication Users](https://console.firebase.google.com/project/locked-dd553/authentication/users)

2. Look for **users with the same email** but different UIDs

3. Check the **"Sign-in provider"** column:
   - One will say `Email/Password`
   - Another will say `apple.com`

### 1.2 Export User List (Optional)

To see all duplicates at once:

1. Go to [Firebase Console](https://console.firebase.google.com/project/locked-dd553/authentication/users)
2. Click "Export users" (top right)
3. Download the CSV file
4. Sort by email to find duplicates

---

## Step 2: Run the Fix Script

### 2.1 Install Firebase Admin SDK

```bash
cd /Users/mo/Desktop/thehuda-fix-prayer-time-notifications
npm install firebase-admin --save-dev
```

### 2.2 Download Service Account Key

1. Go to [Firebase Console > Project Settings > Service Accounts](https://console.firebase.google.com/project/locked-dd553/settings/serviceaccounts/adminsdk)

2. Click "**Generate new private key**"

3. Save the file as `serviceAccountKey.json` in the `scripts/` folder:
   ```
   /Users/mo/Desktop/thehuda-fix-prayer-time-notifications/scripts/serviceAccountKey.json
   ```

4. **IMPORTANT**: Add this to your `.gitignore`:
   ```bash
   echo "scripts/serviceAccountKey.json" >> .gitignore
   ```

### 2.3 Run the Script

```bash
node scripts/fixDuplicateUsers.js
```

### 2.4 Follow the Prompts

The script will:

1. ✅ Find all duplicate accounts
2. ✅ Show you details about each duplicate
3. ✅ Ask which account to keep
4. ✅ Migrate all data from deleted accounts to the kept account
5. ✅ Delete the duplicate accounts

**Example output:**

```
🔍 Fetching all users from Firebase Auth...
📊 Total users found: 150

⚠️  Found 3 email(s) with duplicate accounts:

================================================================================
📧 Email: user@example.com (1/3)
================================================================================

Account 1:
  UID: abc123def456
  Provider: password
  Created: 2024-01-15
  Last Sign In: 2024-01-20
  Has Firestore Data: Yes
  Profile Complete: Yes
  Name: John Doe
  Madhab: hanafi
  Language: english

Account 2:
  UID: xyz789ghi012
  Provider: apple.com
  Created: 2024-02-10
  Last Sign In: 2024-12-30
  Has Firestore Data: No
  Profile Complete: No

🤔 Which account would you like to KEEP?
   (The other account(s) will be deleted after migrating data)

   1) Account 1 (password)
   2) Account 2 (apple.com)
   3) Skip this duplicate (don't merge)

Enter your choice (1-3): 1

✅ Keeping account: abc123def456
❌ Will delete: xyz789ghi012

Are you sure you want to proceed? (y/n): y

🔄 Processing deletion of xyz789ghi012...
  📦 Migrating data from xyz789ghi012 to abc123def456...
  ✅ Deleted user from Firebase Auth: xyz789ghi012
  ✅ Deleted user document from Firestore: xyz789ghi012

✅ Finished processing user@example.com
```

---

## Step 3: Prevent Future Duplicates

To prevent this from happening again, we need to implement **account linking** in your app. This will automatically link Apple Sign-In accounts with existing email/password accounts.

### 3.1 Update `OnboardingScreen.js`

Add account linking logic when a user signs in with Apple:

```javascript
// In handleAppleSignIn function, add this check before creating/signing in:

const handleAppleSignIn = async () => {
  setLoading(true);
  try {
    console.log('🍎 Starting Apple Sign-In process...');
    
    const isAvailable = await AppleAuthentication.isAvailableAsync();
    if (!isAvailable) {
      throw new Error('Apple Sign In is not available on this device');
    }
    
    const credential = await AppleAuthentication.signInAsync({
      requestedScopes: [
        AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
        AppleAuthentication.AppleAuthenticationScope.EMAIL,
      ],
    });
    
    const { identityToken, email } = credential;
    
    // NEW: Check if user already exists with this email
    console.log('🔍 Checking for existing account with email:', email);
    
    try {
      // Try to fetch sign-in methods for this email
      const signInMethods = await fetchSignInMethodsForEmail(auth, email);
      
      if (signInMethods.length > 0 && !signInMethods.includes('apple.com')) {
        // User has an existing account with email/password
        console.log('⚠️ User already has an account with email/password');
        console.log('🔗 This requires manual sign-in first, then linking accounts');
        
        Alert.alert(
          'Account Already Exists',
          'You already have an account with this email. Please sign in with your email and password first. You can link your Apple ID from Settings after signing in.',
          [{ text: 'OK' }]
        );
        
        setLoading(false);
        return;
      }
    } catch (error) {
      console.log('ℹ️ No existing account found, proceeding with Apple Sign-In');
    }
    
    // Continue with normal Apple Sign-In flow...
    const provider = new OAuthProvider('apple.com');
    const firebaseCredential = provider.credential({ idToken: identityToken });
    const userCredential = await signInWithCredential(auth, firebaseCredential);
    const user = userCredential.user;
    
    // ... rest of your existing code
    
  } catch (error) {
    setLoading(false);
    console.error('🍎 Apple Sign-In error:', error);
    // ... existing error handling
  }
};
```

### 3.2 Add Account Linking in Settings

Update `SettingsScreen.js` to allow users to link their Apple ID to their existing account:

```javascript
import { linkWithCredential, OAuthProvider } from 'firebase/auth';
import * as AppleAuthentication from 'expo-apple-authentication';

// Add this function in SettingsScreen.js
const linkAppleAccount = async () => {
  try {
    console.log('🔗 Starting Apple account linking...');
    
    const credential = await AppleAuthentication.signInAsync({
      requestedScopes: [
        AppleAuthentication.AppleAuthenticationScope.EMAIL,
      ],
    });
    
    const { identityToken } = credential;
    const provider = new OAuthProvider('apple.com');
    const appleCredential = provider.credential({ idToken: identityToken });
    
    // Link the credential to the current user
    await linkWithCredential(auth.currentUser, appleCredential);
    
    Alert.alert(
      'Success',
      'Your Apple ID has been linked to your account. You can now sign in with Apple!',
      [{ text: 'OK' }]
    );
    
    console.log('✅ Apple account linked successfully');
  } catch (error) {
    console.error('❌ Error linking Apple account:', error);
    
    if (error.code === 'auth/credential-already-in-use') {
      Alert.alert(
        'Already in Use',
        'This Apple ID is already linked to another account.',
        [{ text: 'OK' }]
      );
    } else if (error.code === 'auth/provider-already-linked') {
      Alert.alert(
        'Already Linked',
        'Your account is already linked with Apple Sign-In.',
        [{ text: 'OK' }]
      );
    } else {
      Alert.alert(
        'Error',
        'Failed to link Apple account. Please try again.',
        [{ text: 'OK' }]
      );
    }
  }
};

// Add a button in your Settings UI:
<TouchableOpacity
  style={styles.settingButton}
  onPress={linkAppleAccount}
>
  <Ionicons name="logo-apple" size={24} color="#fff" />
  <Text style={styles.settingButtonText}>Link Apple Sign-In</Text>
</TouchableOpacity>
```

### 3.3 Enable Account Linking in Firebase Console

1. Go to: [Firebase Authentication Settings](https://console.firebase.google.com/project/locked-dd553/authentication/settings)

2. Scroll to "**Advanced**" section

3. Enable "**One account per email address**"

This will:
- ✅ Prevent creating new accounts with duplicate emails
- ✅ Force account linking when email already exists
- ✅ Show a proper error message when duplicate email is detected

---

## Manual Fix (Alternative)

If you prefer to manually fix duplicates without the script:

### Option 1: Keep the Apple Sign-In account

1. Go to [Firebase Console > Authentication](https://console.firebase.google.com/project/locked-dd553/authentication/users)
2. Find the email with duplicates
3. Delete the **Email/Password** account (older one)
4. Keep the **Apple** account (more secure)

### Option 2: Keep the Email/Password account

1. Find the duplicate email
2. Delete the **Apple** account
3. Keep the **Email/Password** account
4. User can link Apple later from Settings

### Option 3: Manually merge data

1. Go to [Firestore Database](https://console.firebase.google.com/project/locked-dd553/firestore)
2. Find the user document for the account you want to **keep**
3. Copy any important data from the account you want to **delete**
4. Paste it into the kept account's document
5. Delete the duplicate account from Authentication

---

## Verification

After fixing duplicates:

1. **Check Authentication**: [Firebase Console > Authentication](https://console.firebase.google.com/project/locked-dd553/authentication/users)
   - ✅ Each email should only appear **once**

2. **Check Firestore**: [Firebase Console > Firestore](https://console.firebase.google.com/project/locked-dd553/firestore/data/~2Fusers)
   - ✅ Each user should have **one document** with complete data

3. **Test Sign-In**:
   - ✅ Try signing in with email/password
   - ✅ Try signing in with Apple
   - ✅ Should work for users who completed the merge

---

## Troubleshooting

### "Cannot find module 'firebase-admin'"

```bash
npm install firebase-admin --save-dev
```

### "Service account key not found"

Make sure you downloaded the service account key and saved it as:
```
/Users/mo/Desktop/thehuda-fix-prayer-time-notifications/scripts/serviceAccountKey.json
```

### "Permission denied"

Make sure your service account has the correct permissions:
1. Go to [IAM & Admin](https://console.cloud.google.com/iam-admin/iam?project=locked-dd553)
2. Find your service account
3. Ensure it has "Firebase Admin" role

### Script shows no duplicates but I see them in console

The script only finds duplicates in **Firebase Authentication**. If you see duplicates in Firestore but not in Authentication, they were already deleted from Authentication. You can manually clean up Firestore documents.

---

## Best Practices Moving Forward

1. ✅ **Enable "One account per email"** in Firebase Console
2. ✅ **Implement account linking** in your app
3. ✅ **Show clear messages** when duplicate email is detected
4. ✅ **Test regularly** to ensure no new duplicates are created

---

## Support

If you encounter any issues:

1. Check the [Firebase Console logs](https://console.firebase.google.com/project/locked-dd553/logs)
2. Review the script output for errors
3. Contact Firebase Support if the issue persists

---

**🔗 Important Links:**

- [Firebase Authentication Users](https://console.firebase.google.com/project/locked-dd553/authentication/users)
- [Firebase Firestore](https://console.firebase.google.com/project/locked-dd553/firestore)
- [Service Accounts](https://console.firebase.google.com/project/locked-dd553/settings/serviceaccounts/adminsdk)
- [Firebase Documentation on Account Linking](https://firebase.google.com/docs/auth/web/account-linking)


