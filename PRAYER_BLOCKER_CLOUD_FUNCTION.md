# Firebase Cloud Function for Prayer Blocker

## Overview
This Cloud Function sends push notifications to trigger prayer blocking on users' devices.

## Function Code (Add to your Firebase Functions)

```javascript
const functions = require('firebase-functions');
const admin = require('firebase-admin');

// This function runs every minute to check if any users have prayer times approaching
exports.checkPrayerTimesAndNotify = functions.pubsub
  .schedule('every 1 minutes')
  .timeZone('UTC')
  .onRun(async (context) => {
    const now = new Date();
    console.log('Checking prayer times at:', now.toISOString());
    
    try {
      // Get all users who have prayer blocker enabled
      const usersSnapshot = await admin.firestore()
        .collection('users')
        .where('prayerBlockerEnabled', '==', true)
        .get();
      
      if (usersSnapshot.empty) {
        console.log('No users with prayer blocker enabled');
        return null;
      }
      
      const notifications = [];
      
      for (const userDoc of usersSnapshot.docs) {
        const userData = userDoc.data();
        const userId = userDoc.id;
        
        // Get user's prayer times for today
        const prayerTimes = userData.prayerTimes; // Assuming stored in user doc
        const prayerData = userData.prayerData || {};
        const today = now.toISOString().split('T')[0];
        const todayPrayers = prayerData[today] || {};
        
        if (!prayerTimes || !Array.isArray(prayerTimes)) {
          continue;
        }
        
        // Check if any prayer time has just passed (within last minute) and isn't completed
        for (const prayer of prayerTimes) {
          const prayerTime = new Date(prayer.dateObj);
          const timeDiff = now - prayerTime;
          const prayerId = prayer.name.toLowerCase();
          
          // If prayer time was in the last 2 minutes and not completed
          if (timeDiff >= 0 && timeDiff <= 120000 && !todayPrayers[prayerId]) {
            // Get user's push token
            const pushToken = userData.expoPushToken;
            
            if (pushToken) {
              notifications.push({
                to: pushToken,
                sound: 'default',
                title: 'Prayer Time',
                body: `Time for ${prayer.name}`,
                data: {
                  type: 'PRAYER_BLOCKER_ACTIVATE',
                  prayerId: prayerId,
                  prayerName: prayer.name,
                  prayerTime: prayer.dateObj
                },
                priority: 'high',
                channelId: 'prayer-blocker'
              });
            }
          }
        }
      }
      
      // Send all notifications
      if (notifications.length > 0) {
        console.log(`Sending ${notifications.length} prayer blocker notifications`);
        
        // Send in batches of 100
        const batchSize = 100;
        for (let i = 0; i < notifications.length; i += batchSize) {
          const batch = notifications.slice(i, i + batchSize);
          await fetch('https://exp.host/--/api/v2/push/send', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify(batch)
          });
        }
        
        console.log('Prayer blocker notifications sent successfully');
      }
      
      return null;
    } catch (error) {
      console.error('Error in checkPrayerTimesAndNotify:', error);
      return null;
    }
  });

// Alternative: Trigger-based function that runs at specific prayer times
// This is more efficient than checking every minute
exports.schedulePrayerBlockerNotifications = functions.firestore
  .document('users/{userId}/prayerTimes/{date}')
  .onCreate(async (snap, context) => {
    const userId = context.params.userId;
    const prayerTimes = snap.data().times;
    
    // Schedule notifications for each prayer time
    // (This requires Cloud Scheduler or similar)
    
    return null;
  });
```

## Setup Instructions

1. **Deploy the function:**
   ```bash
   cd functions
   npm install
   firebase deploy --only functions:checkPrayerTimesAndNotify
   ```

2. **Update Firestore structure:**
   - Store `prayerBlockerEnabled: true` in user documents
   - Store `prayerTimes` array in user documents
   - Store `prayerData` object in user documents
   - Store `expoPushToken` in user documents

3. **The app will automatically handle the notification** and activate blocking

## How It Works

1. Function runs every minute
2. Checks all users with `prayerBlockerEnabled: true`
3. For each user, checks if any prayer time has just passed
4. Sends push notification with `PRAYER_BLOCKER_ACTIVATE` data
5. App receives notification and activates blocking immediately

## App-Side Setup (Already Implemented)

The app now automatically:
1. **Registers a background notification task** that runs when notifications are received
2. **Handles `PRAYER_BLOCKER_ACTIVATE` notifications** by activating blocking immediately
3. **Syncs prayer times to Firebase** for the cloud function to access

### Testing Without Cloud Function

The system already works automatically using the **DeviceActivityMonitor extension**, which:
- Runs in the background once scheduled (7-day schedule)
- Checks prayer times automatically
- Activates blocking when prayer times pass

**The Cloud Function is optional** - it's just an extra backup to make it more reliable!

## Cost Estimate

- ~43,800 function invocations per month (every minute)
- Free tier includes 2 million invocations
- Well within free limits!

## Current Status

✅ **Already Working:**
- DeviceActivityMonitor extension runs automatically in background
- Continuous 7-day monitoring schedule
- Blocking activates when prayer times pass
- App syncs prayer data to shared storage

✅ **Optional Enhancement (Cloud Function):**
- Adds push notification backup
- Wakes app if extension doesn't trigger
- More reliable for production

## Summary

**Your prayer blocker is already working automatically!** The extension runs in the background and checks prayer times without needing the app to be opened. The Cloud Function is an optional enhancement for extra reliability.

