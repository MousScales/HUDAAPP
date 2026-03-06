# Expo Push Notifications Setup (TestFlight Compatible)

## Why Expo Push Notifications?
- ✅ **TestFlight Compatible**: No Firebase Functions conflicts
- ✅ **Expo Managed**: Works with Expo Go and EAS Build
- ✅ **Simple Setup**: No server deployment needed
- ✅ **Reliable**: Handled by Expo's infrastructure

## Step 1: Install Dependencies

```bash
expo install expo-notifications expo-device
```

## Step 2: Create Push Notification Service

### Create `services/expoPushService.js`:

```javascript
import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { Platform } from 'react-native';
import { auth, firestore } from '../firebase';
import { doc, setDoc, serverTimestamp } from 'firebase/firestore';

class ExpoPushService {
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
        const { status } = await Notifications.requestPermissionsAsync({
          ios: {
            allowAlert: true,
            allowBadge: true,
            allowSound: true,
            allowAnnouncements: false,
          },
        });
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

  // Send push notification using Expo's API
  async sendPushNotification(expoPushToken, title, body, data = {}) {
    try {
      const message = {
        to: expoPushToken,
        sound: 'default',
        title: title,
        body: body,
        data: data,
      };

      const response = await fetch('https://exp.host/--/api/v2/push/send', {
        method: 'POST',
        headers: {
          'Accept': 'application/json',
          'Accept-encoding': 'gzip, deflate',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(message),
      });

      const result = await response.json();
      console.log('✅ Push notification sent:', result);
      return result;
    } catch (error) {
      console.error('❌ Error sending push notification:', error);
      throw error;
    }
  }

  // Send prayer notification
  async sendPrayerNotification(prayerName) {
    try {
      const user = auth.currentUser;
      if (!user) return;

      // Get user's push token from Firebase
      const userDoc = await getDoc(doc(firestore, 'users', user.uid));
      const userData = userDoc.data();
      
      if (!userData?.expoPushToken) {
        console.log('❌ No push token found for user');
        return;
      }

      const title = `${prayerName} Prayer Time`;
      const body = `It's time for ${prayerName} prayer.`;
      
      await this.sendPushNotification(userData.expoPushToken, title, body, {
        type: 'prayer_time',
        prayer: prayerName,
      });

      console.log('✅ Prayer notification sent via push');
    } catch (error) {
      console.error('❌ Error sending prayer notification:', error);
    }
  }

  // Send daily reminder
  async sendDailyReminder() {
    try {
      const user = auth.currentUser;
      if (!user) return;

      const userDoc = await getDoc(doc(firestore, 'users', user.uid));
      const userData = userDoc.data();
      
      if (!userData?.expoPushToken) return;

      const title = 'Daily Reminder';
      const body = 'Don\'t forget to pray and read Quran today.';
      
      await this.sendPushNotification(userData.expoPushToken, title, body, {
        type: 'daily_reminder',
      });

      console.log('✅ Daily reminder sent via push');
    } catch (error) {
      console.error('❌ Error sending daily reminder:', error);
    }
  }

  // Send streak warning
  async sendStreakWarning(streak) {
    try {
      const user = auth.currentUser;
      if (!user) return;

      const userDoc = await getDoc(doc(firestore, 'users', user.uid));
      const userData = userDoc.data();
      
      if (!userData?.expoPushToken) return;

      const title = 'Prayer Streak Alert';
      const body = `Your ${streak}-day prayer streak is at risk! Don't break the chain.`;
      
      await this.sendPushNotification(userData.expoPushToken, title, body, {
        type: 'streak_warning',
        streak: streak,
      });

      console.log('✅ Streak warning sent via push');
    } catch (error) {
      console.error('❌ Error sending streak warning:', error);
    }
  }
}

export default new ExpoPushService();
```

## Step 3: Update App.js

```javascript
// In App.js, add:
import expoPushService from './services/expoPushService';

// In useEffect:
useEffect(() => {
  // ... existing code ...
  
  // Initialize push notifications
  expoPushService.initialize();
  
  // ... rest of existing code ...
}, []);
```

## Step 4: Update Prayer Service

### Modify `services/prayerService.js`:

```javascript
import expoPushService from './expoPushService';

// Replace local notification with push notification
async function sendPrayerNotification(prayerName) {
  try {
    // Send push notification instead of local
    await expoPushService.sendPrayerNotification(prayerName);
    
    console.log('✅ Push notification sent for', prayerName);
  } catch (error) {
    console.error('❌ Error sending push notification:', error);
  }
}
```

## Step 5: Update app.json

```json
{
  "expo": {
    "plugins": [
      [
        "expo-notifications",
        {
          "icon": "./assets/notification-icon.png",
          "color": "#ffffff"
        }
      ]
    ],
    "notification": {
      "icon": "./assets/notification-icon.png",
      "color": "#ffffff"
    }
  }
}
```

## Step 6: Create Notification Icon

Create a notification icon (96x96px) at `assets/notification-icon.png`

## Step 7: Test with Expo

```bash
# Test with Expo Go
expo start

# Build for TestFlight
eas build --platform ios
```

## Benefits of This Approach:

1. **✅ TestFlight Compatible**: No Firebase Functions conflicts
2. **✅ Simple Setup**: No server deployment needed
3. **✅ Expo Managed**: Works with Expo Go and EAS Build
4. **✅ Reliable**: Handled by Expo's infrastructure
5. **✅ Free**: No additional server costs

## Migration Strategy:

1. **Phase 1**: Add push notifications alongside local notifications
2. **Phase 2**: Test with Expo Go
3. **Phase 3**: Build and test with TestFlight
4. **Phase 4**: Gradually replace local notifications
5. **Phase 5**: Remove local notification code

## Testing:

1. **Development**: Use Expo Go to test push notifications
2. **TestFlight**: Build with EAS and test on device
3. **Production**: Deploy to App Store

This approach avoids the Firebase Functions issues that can cause TestFlight deployment problems! 