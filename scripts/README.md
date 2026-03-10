# Scripts

This folder contains utility scripts for managing your Hudā app.

## Available Scripts

### `fixDuplicateUsers.js`

**Purpose:** Find and merge duplicate user accounts in Firebase (same email, different UIDs)

**Usage:**
```bash
# 1. Install Firebase Admin SDK
npm install firebase-admin --save-dev

# 2. Download service account key from Firebase Console and save as:
#    scripts/serviceAccountKey.json

# 3. Run the script
node scripts/fixDuplicateUsers.js
```

**What it does:**
- Scans all Firebase Authentication users
- Identifies emails with multiple user IDs
- Shows you details about each duplicate account
- Lets you choose which account to keep
- Migrates all data (bookmarks, progress, streaks, lessons)
- Deletes duplicate accounts

**See:** `../FIX_DUPLICATE_USERS_GUIDE.md` for detailed instructions

---

### Other Scripts

- `uploadDhikr.js` - Upload Dhikr content to Firebase
- `uploadLessons.js` - Upload lesson content to Firebase
- `translateLessons.js` - Translate lessons to multiple languages
- `fixLessonJSON.js` - Fix lesson JSON formatting

---

## Service Account Key

**⚠️ IMPORTANT:** Never commit `serviceAccountKey.json` to Git!

This file contains sensitive credentials that give full admin access to your Firebase project.

It is already added to `.gitignore` to prevent accidental commits.

### How to get it:

1. Go to [Firebase Console > Project Settings > Service Accounts](https://console.firebase.google.com/project/locked-dd553/settings/serviceaccounts/adminsdk)
2. Click "Generate new private key"
3. Save as `scripts/serviceAccountKey.json`

---

## Support

For issues with these scripts:
1. Check the console output for error messages
2. Ensure Firebase Admin SDK is installed
3. Verify service account key is in the correct location
4. Check Firebase Console logs


