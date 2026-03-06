# Firebase Functions Setup for Push Notifications

This guide will help you deploy Firebase Cloud Functions to handle server-side push notifications.

## Prerequisites

1. **Firebase CLI installed:**
   ```bash
   npm install -g firebase-tools
   ```

2. **Firebase project initialized:**
   ```bash
   firebase login
   firebase init functions
   ```

## Setup Steps

### 1. Install Dependencies

Navigate to the functions directory and install dependencies:

```bash
cd functions
npm install firebase-admin firebase-functions
```

### 2. Update Project ID

Replace `YOUR_PROJECT_ID` in the following files with your actual Firebase project ID:

- `services/notificationService.js` (line with triggerNotification URL)
- `functions/index.js` (if needed)

### 3. Deploy Functions

Deploy the Firebase Functions:

```bash
firebase deploy --only functions
```

### 4. Enable Billing

Firebase Functions require a billing account. Enable billing in the Firebase Console:
- Go to Firebase Console > Project Settings > Usage and billing
- Set up a billing account

### 5. Configure Timezone

Update the timezone in `functions/index.js` to match your location:
- Change `'America/New_York'` to your timezone (e.g., `'Europe/London'`, `'Asia/Dubai'`)

## Functions Deployed

1. **`sendPrayerNotifications`** - Runs every hour, sends prayer notifications
2. **`sendDailyNightReminder`** - Runs daily at 11:45 PM
3. **`sendStreakNotifications`** - Runs daily at 8:00 PM
4. **`onPrayerTimesUpdated`** - Triggers when prayer times are updated
5. **`triggerNotification`** - HTTP endpoint for testing

## Testing

1. **Test server notification** using the button in Settings
2. **Check Firebase Functions logs** in the Firebase Console
3. **Monitor notification delivery** in the EAS dashboard

## Troubleshooting

### Common Issues:

1. **"Function not found"** - Make sure functions are deployed
2. **"Billing not enabled"** - Enable billing in Firebase Console
3. **"Permission denied"** - Check Firebase security rules
4. **"Timezone issues"** - Update timezone in function configuration

### Logs:

Check Firebase Functions logs:
```bash
firebase functions:log
```

## Cost Considerations

- **Free tier**: 125K invocations/month
- **Prayer notifications**: ~5 invocations/day per user
- **Daily reminders**: 1 invocation/day per user
- **Streak notifications**: 1 invocation/day per user

## Security

- Functions use Firebase Admin SDK
- User data is protected by Firestore security rules
- Push tokens are stored securely in user documents

## Monitoring

Monitor function performance in Firebase Console:
- Function invocations
- Execution time
- Error rates
- Memory usage 