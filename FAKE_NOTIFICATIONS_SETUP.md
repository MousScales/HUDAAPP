# Fake Prayer Notifications Setup Guide

This guide will help you integrate fake prayer notifications into your Hudā app for screen recording purposes.

## Files Created

1. **`fake-prayer-notifications.js`** - Core notification generator class
2. **`screens/TestNotificationsScreen.js`** - Black screen interface for testing notifications
3. **`FAKE_NOTIFICATIONS_SETUP.md`** - This setup guide

## Quick Setup

### ✅ **Already Integrated!**

The test notifications are now fully integrated into your app:

1. **Go to Settings** → Scroll to "Help & Support" section
2. **Tap "🧪 Test Prayer Notifications"** 
3. **You'll be taken to a dedicated black screen** perfect for screen recording
4. **Tap any notification button** and minimize the app to see notifications

### 🎬 **Perfect for Screen Recording**

The black screen provides:
- ✅ **Pure black background** - no distractions
- ✅ **Clean interface** - easy to navigate
- ✅ **All notification types** - comprehensive testing
- ✅ **User name "Moustapha"** - personalized notifications
- ✅ **Clear instructions** - built-in guidance

### Alternative: Use Directly in Console/Script

```javascript
import FakePrayerNotifications from './fake-prayer-notifications';

const fakeNotifications = new FakePrayerNotifications();

// Send all notifications (comprehensive test)
await fakeNotifications.sendAllPrayerNotifications();

// Or send specific notifications:
await fakeNotifications.sendSpecificNotification('prayer_time', 'Maghrib');
await fakeNotifications.sendSpecificNotification('streak');
```

## Notification Types Available

### 🕌 Prayer Time Notifications
- **Fajr at 5:24 AM** - "It's time to pray!"
- **Dhuhr at 12:45 PM** - "It's time to pray!"  
- **Asr at 4:18 PM** - "It's time to pray!"
- **Maghrib at 7:32 PM** - "It's time to pray!"
- **Isha at 8:58 PM** - "It's time to pray!"

### ⏰ 5-Minute Reminders
- **"Fajr in 5 minutes"** - "Get ready for Fajr prayer at 5:24 AM"
- **"Maghrib in 5 minutes"** - "Get ready for Maghrib prayer at 7:32 PM"
- (Available for all prayers)

### ⚠️ 30-Minute Delay Reminders
- **"Don't Delay Your Salah!"** - "Salaam Moustapha, it's been 30 minutes since Fajr"
- (Available for all prayers except Sunrise)

### 🎯 Special Notifications
- **Streak Warning** - "Your Prayer Streak is at Risk! Salaam Moustapha, you haven't completed all prayers today. Don't break your 7-day streak!"
- **Encouragement** - "Keep Going, You Can Do This! Salaam Moustapha, every prayer brings you closer to Allah. Start fresh today! 🤲"
- **Daily Night Reminder** - "End Your Day with Remembrance - Salaam Moustapha, take a moment for evening dhikr before sleep"

## Screen Recording Tips

### For Individual Notifications:
1. Open the Test Notifications screen
2. Tap the specific notification you want to record
3. Minimize the app or go to home screen
4. Wait 1-2 seconds for the notification to appear
5. Record the notification interaction

### For Complete Flow:
1. Tap "🌟 All Prayer Notifications (Full Test)"
2. This will send all types over several minutes
3. Perfect for recording a complete notification demo

### Best Practices:
- **Turn off Do Not Disturb** to ensure notifications show
- **Test on a physical device** (notifications work better than simulator)
- **Close or minimize the app** before notifications trigger
- **Wait 1-3 seconds** between taps for proper scheduling
- **Check notification permissions** are enabled for the app

## Customization

### Change User Name:
```javascript
// In fake-prayer-notifications.js, line 15:
this.userName = 'YourName'; // Change from 'Moustapha'
```

### Change Prayer Times:
```javascript
// In generatePrayerTimes() method:
const times = {
  fajr: '5:24 AM',     // Change these times
  dhuhr: '12:45 PM',   // to match your location
  // ... etc
};
```

### Add New Notification Types:
```javascript
async sendCustomNotification() {
  const title = "Custom Title";
  const body = `Custom message for ${this.userName}`;
  
  await this.scheduleNotification(title, body, {
    type: 'custom',
    userName: this.userName,
    timestamp: Date.now(),
  }, 1);
}
```

## Troubleshooting

### Notifications Not Showing:
1. Check notification permissions: Settings > Notifications > Hudā
2. Ensure Do Not Disturb is off
3. Make sure app is minimized (not in foreground)
4. Try on a physical device instead of simulator

### Audio Not Playing:
- Adhan audio is configured for prayer time notifications
- Ensure device volume is up and not in silent mode
- Check that the app has audio permissions

### Multiple Notifications:
- Use delays between different notification types
- The script includes automatic delays for comprehensive testing

## Usage for Screen Recording

Perfect for demonstrating:
- ✅ Prayer time notifications with Adhan
- ✅ Advance reminders (5 minutes before)
- ✅ Delay reminders (30 minutes after)
- ✅ Streak management notifications
- ✅ Encouragement and daily reminders
- ✅ Personalized messages with user name "Moustapha"

All notifications are designed to look and feel exactly like the real prayer notifications your app would send, making them perfect for demos and screen recordings!
