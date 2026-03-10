# Push Notifications Setup Guide

## Overview
Converting from local notifications to push notifications requires:
1. **Expo Push Tokens** - Get device tokens
2. **Firebase Cloud Functions** - Server-side notification sending
3. **Database Storage** - Store user tokens and preferences
4. **Server Logic** - Schedule and send notifications

## Step 1: Install Dependencies

```bash
# Install Expo push notification dependencies
expo install expo-notifications expo-device

# Install Firebase Functions (if not already installed)
npm install firebase-functions firebase-admin
```

## Step 2: Update Notification Service

### Create `services/pushNotificationService.js`:

```javascript
import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { Platform } from 'react-native';
import { auth, firestore } from '../firebase';
import { doc, setDoc, getDoc, serverTimestamp } from 'firebase/firestore';

class PushNotificationService {
  constructor() {
    this.expoPushToken = null;
    this.isInitialized = false;
  }

  async initialize() {
    try {
      // Request permissions
      const { status: existingStatus } = await Notifications.getPermissionsAsync();
      let finalStatus = existingStatus;

      if (existingStatus !== 'granted') {
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
      }

      if (finalStatus !== 'granted') {
        console.log('❌ Push notification permission not granted');
        return false;
      }

      // Get Expo push token
      if (Device.isDevice) {
        this.expoPushToken = (await Notifications.getExpoPushTokenAsync({
          projectId: 'your-expo-project-id', // Replace with your Expo project ID
        })).data;
        
        console.log('✅ Expo push token:', this.expoPushToken);
        
        // Save token to Firebase
        await this.savePushToken();
      }

      this.isInitialized = true;
      return true;
    } catch (error) {
      console.error('❌ Error initializing push notifications:', error);
      return false;
    }
  }

  async savePushToken() {
    try {
      const user = auth.currentUser;
      if (!user || !this.expoPushToken) return;

      await setDoc(doc(firestore, 'users', user.uid), {
        expoPushToken: this.expoPushToken,
        platform: Platform.OS,
        updatedAt: serverTimestamp(),
      }, { merge: true });

      console.log('✅ Push token saved to Firebase');
    } catch (error) {
      console.error('❌ Error saving push token:', error);
    }
  }

  async getPushToken() {
    return this.expoPushToken;
  }
}

export default new PushNotificationService();
```

## Step 3: Create Firebase Cloud Functions

### Create `functions/index.js`:

```javascript
const functions = require('firebase-functions');
const admin = require('firebase-admin');
const axios = require('axios');

admin.initializeApp();

// Send push notification
async function sendPushNotification(expoPushToken, title, body, data = {}) {
  try {
    const message = {
      to: expoPushToken,
      sound: 'default',
      title: title,
      body: body,
      data: data,
    };

    const response = await axios.post(
      'https://exp.host/--/api/v2/push/send',
      message,
      {
        headers: {
          'Accept': 'application/json',
          'Accept-encoding': 'gzip, deflate',
          'Content-Type': 'application/json',
        },
      }
    );

    console.log('✅ Push notification sent:', response.data);
    return response.data;
  } catch (error) {
    console.error('❌ Error sending push notification:', error);
    throw error;
  }
}

// Cloud Function: Send prayer notification
exports.sendPrayerNotification = functions.https.onCall(async (data, context) => {
  try {
    const { prayerName, userId } = data;
    
    // Get user's push token
    const userDoc = await admin.firestore().collection('users').doc(userId).get();
    const userData = userDoc.data();
    
    if (!userData?.expoPushToken) {
      throw new Error('No push token found for user');
    }

    const title = `${prayerName} Prayer Time`;
    const body = `It's time for ${prayerName} prayer.`;
    
    await sendPushNotification(userData.expoPushToken, title, body, {
      type: 'prayer_time',
      prayer: prayerName,
    });

    return { success: true };
  } catch (error) {
    console.error('Error in sendPrayerNotification:', error);
    throw new functions.https.HttpsError('internal', error.message);
  }
});

// Cloud Function: Send daily reminder
exports.sendDailyReminder = functions.pubsub.schedule('0 23 * * *').timeZone('America/New_York').onRun(async (context) => {
  try {
    // Get all users with push tokens
    const usersSnapshot = await admin.firestore()
      .collection('users')
      .where('expoPushToken', '!=', null)
      .get();

    const notifications = usersSnapshot.docs.map(doc => {
      const userData = doc.data();
      return sendPushNotification(
        userData.expoPushToken,
        'Daily Reminder',
        'Don\'t forget to pray and read Quran today.',
        { type: 'daily_reminder' }
      );
    });

    await Promise.all(notifications);
    console.log(`✅ Sent daily reminders to ${notifications.length} users`);
  } catch (error) {
    console.error('Error in sendDailyReminder:', error);
  }
});

// Cloud Function: Send streak warning
exports.sendStreakWarning = functions.https.onCall(async (data, context) => {
  try {
    const { userId, streak } = data;
    
    const userDoc = await admin.firestore().collection('users').doc(userId).get();
    const userData = userDoc.data();
    
    if (!userData?.expoPushToken) {
      throw new Error('No push token found for user');
    }

    const title = 'Prayer Streak Alert';
    const body = `Your ${streak}-day prayer streak is at risk! Don't break the chain.`;
    
    await sendPushNotification(userData.expoPushToken, title, body, {
      type: 'streak_warning',
      streak: streak,
    });

    return { success: true };
  } catch (error) {
    console.error('Error in sendStreakWarning:', error);
    throw new functions.https.HttpsError('internal', error.message);
  }
});
```

## Step 4: Update App.js to Initialize Push Notifications

```javascript
// In App.js, add:
import pushNotificationService from './services/pushNotificationService';

// In useEffect:
useEffect(() => {
  // ... existing code ...
  
  // Initialize push notifications
  pushNotificationService.initialize();
  
  // ... rest of existing code ...
}, []);
```

## Step 5: Update Prayer Service to Use Push Notifications

### Modify `services/prayerService.js`:

```javascript
import { auth } from '../firebase';
import { httpsCallable } from 'firebase/functions';
import { getFunctions } from 'firebase/functions';

const functions = getFunctions();

// Replace local notification with push notification
async function sendPrayerNotification(prayerName) {
  try {
    const user = auth.currentUser;
    if (!user) return;

    const sendPrayerNotificationFunction = httpsCallable(functions, 'sendPrayerNotification');
    
    await sendPrayerNotificationFunction({
      prayerName: prayerName,
      userId: user.uid,
    });

    console.log('✅ Push notification sent for', prayerName);
  } catch (error) {
    console.error('❌ Error sending push notification:', error);
  }
}
```

## Step 6: Deploy Firebase Functions

```bash
# Install Firebase CLI if not already installed
npm install -g firebase-tools

# Login to Firebase
firebase login

# Initialize Firebase Functions (if not already done)
firebase init functions

# Deploy functions
firebase deploy --only functions
```

## Step 7: Environment Setup

### Add to `app.json`:
```json
{
  "expo": {
    "plugins": [
      [
        "expo-notifications",
        {
          "icon": "./assets/notification-icon.png",
          "color": "#ffffff",
          "sounds": ["./assets/notification-sound.wav"]
        }
      ]
    ]
  }
}
```

## Benefits of Push Notifications:

1. **Reliability**: Notifications work even when app is closed
2. **Server Control**: Schedule notifications from server
3. **Cross-Platform**: Works on iOS and Android
4. **Analytics**: Track notification delivery and engagement
5. **Personalization**: Send targeted notifications based on user data

## Testing:

1. **Development**: Use Expo push tokens for testing
2. **Production**: Deploy Firebase functions
3. **Monitoring**: Check Firebase console for function logs

## Migration Strategy:

1. **Phase 1**: Implement push notifications alongside local notifications
2. **Phase 2**: Gradually replace local notifications
3. **Phase 3**: Remove local notification code
4. **Phase 4**: Add advanced features (scheduling, targeting, etc.)

This setup gives you a robust push notification system that can handle all your prayer time notifications and more! 