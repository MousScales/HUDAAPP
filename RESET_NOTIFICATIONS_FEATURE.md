# Reset Notifications Feature

## 🎯 Problem Solved

Users were receiving **duplicate prayer notifications** because:
- Multiple push tokens were registered for the same user
- Old tokens weren't being cleaned up when switching devices
- Some users had duplicate Firestore documents

## ✅ Solution

Added a **"Reset Notifications" button** in Settings that:
1. Removes ALL old push tokens from the database
2. Clears local notification cache
3. Requests fresh notification permissions
4. Registers ONLY the current device
5. Ensures user gets exactly ONE notification per prayer

---

## 🚀 How to Use (For Users)

### If you're getting duplicate notifications:

1. **Open the app**
2. **Go to Profile tab** (bottom right)
3. **Tap Settings**
4. **Scroll to the bottom** of Settings
5. **Tap "Reset Notifications"** (green button)
6. **Tap "Reset"** in the confirmation dialog
7. **Grant notification permissions** if asked
8. **Done!** You should now receive only one notification per prayer

---

## 🛠️ How It Works (Technical)

### New Service: `notificationCleanupService.js`

Located at: `services/notificationCleanupService.js`

#### Main Function: `cleanupAndResetNotifications()`

**Step 1: Clear Database**
```javascript
// Removes ALL push token fields from Firestore
await updateDoc(userRef, {
  expoPushToken: deleteField(),
  pushToken: deleteField(),
  fcmToken: deleteField(),
  deviceTokens: deleteField(),
  apnsToken: deleteField(),
  notificationResetAt: serverTimestamp(),
});
```

**Step 2: Clear Local Cache**
```javascript
// Removes cached tokens from device storage
await AsyncStorage.multiRemove([
  'expoPushToken',
  'pushToken',
  'lastNotificationCheck',
  'notificationPermissionAsked',
]);
```

**Step 3: Get Fresh Token**
```javascript
// Request new push token for current device
const tokenResponse = await Notifications.getExpoPushTokenAsync({
  projectId: '4a4df4cc-afbb-4a8d-9d97-30c57e6ff6fb'
});
const newToken = tokenResponse.data;
```

**Step 4: Save ONLY New Token**
```javascript
// Save only the new token (no duplicates!)
await updateDoc(userRef, {
  expoPushToken: newToken,
  lastTokenUpdate: serverTimestamp(),
  tokenUpdatedBy: 'cleanup_service',
});
```

**Step 5: Clear Pending Notifications**
```javascript
// Remove any scheduled notifications
await Notifications.cancelAllScheduledNotificationsAsync();
```

**Step 6: Re-initialize Services**
```javascript
// Restart notification services with clean state
await newNotificationService.initialize();
await expoPushService.initialize();
```

---

## 📱 UI Implementation

### SettingsScreen.js

**Added:**
1. Import for `notificationCleanupService`
2. `handleResetNotifications()` function
3. "Reset Notifications" button in UI
4. Styling for the new button

**Button Location:**
- In the "Account Section" at the bottom
- Right above the "Logout" button
- Green color scheme (#4CAF50) to differentiate from logout (red)

**Button Design:**
```jsx
<TouchableOpacity 
  style={styles.resetNotificationButton}
  onPress={handleResetNotifications}
>
  <View style={styles.logoutContent}>
    <View style={[styles.logoutIconWrapper, { backgroundColor: '#3A4A3A' }]}>
      <Ionicons name="notifications-off-outline" size={20} color="#4CAF50" />
    </View>
    <View style={styles.logoutTextContainer}>
      <Text style={[styles.logoutText, { color: '#4CAF50' }]}>Reset Notifications</Text>
      <Text style={styles.logoutDescription}>Fix duplicate notifications</Text>
    </View>
    <Ionicons name="chevron-forward" size={16} color="#4CAF50" />
  </View>
</TouchableOpacity>
```

---

## 🧪 Testing

### Test Scenarios:

1. **Normal Case (No Duplicates)**
   - Click "Reset Notifications"
   - Verify single token is registered
   - Verify notifications still work

2. **Duplicate Token Case**
   - User has multiple tokens in Firestore
   - Click "Reset Notifications"
   - Verify only ONE token remains
   - Verify no duplicate notifications

3. **Permission Denied Case**
   - User denies notification permission
   - Verify error is shown gracefully
   - User can try again

4. **Network Error Case**
   - Airplane mode ON
   - Click "Reset Notifications"
   - Verify error message is shown

---

## 📊 Monitoring

### Track Reset Usage

The service tracks:
- **`notificationResetAt`**: Timestamp of last reset
- **`notificationResetCount`**: Number of times user has reset
- **`tokenUpdatedBy`**: Source of last token update ('cleanup_service')

### Check in Firestore:

```javascript
// Find users who have reset notifications
const usersRef = collection(firestore, 'users');
const q = query(usersRef, where('notificationResetCount', '>', 0));
const snapshot = await getDocs(q);

console.log(`${snapshot.size} users have used the reset feature`);
```

---

## 🔍 Diagnostic Features

### Check for Duplicate Tokens

```javascript
const result = await notificationCleanupService.checkForDuplicateTokens();

if (result.hasDuplicates) {
  console.log(`User has ${result.tokenCount} different tokens`);
}
```

### Refresh Token (Lighter Version)

```javascript
// Refresh token without full cleanup
await notificationCleanupService.refreshPushToken();
```

---

## 🐛 Troubleshooting

### Issue: Button doesn't appear

**Solution:** Make sure you're running the latest version of the app

### Issue: "Permission not granted" error

**Solution:** 
1. Go to device Settings > Hudā
2. Enable Notifications
3. Try "Reset Notifications" again

### Issue: Still getting duplicate notifications

**Possible Causes:**
1. Multiple devices logged into same account
   - Each device should have its own token (this is normal)
2. Cloud Functions sending multiple times
   - Check Firebase Functions logs
3. Multiple Firestore documents for same email
   - Run the diagnostic script: `node scripts/checkDuplicates.js`

---

## 🚀 Future Improvements

1. **Auto-Cleanup**
   - Automatically clean up old tokens on login
   - Remove tokens older than 30 days

2. **Multi-Device Management**
   - Show list of registered devices
   - Allow removing specific devices

3. **Better Diagnostics**
   - Show token count in Settings
   - Warn users if duplicates detected

4. **Analytics**
   - Track how many users use this feature
   - Measure reduction in duplicate notifications

---

## 📝 Related Files

- `services/notificationCleanupService.js` - Main cleanup logic
- `screens/SettingsScreen.js` - UI button implementation
- `services/newNotificationService.js` - Notification service
- `services/expoPushService.js` - Expo push service
- `functions/newNotificationFunctions.js` - Cloud Functions

---

## ✅ Benefits

1. **User Self-Service**: Users can fix their own notification issues
2. **No Admin Needed**: No need to manually edit Firebase database
3. **Safe**: Only affects the current user
4. **Fast**: Takes 2-3 seconds to complete
5. **Traceable**: Logs all actions for debugging

---

## 🎉 Result

Users now have a simple, one-tap solution to fix duplicate notifications!

No more:
- ❌ Multiple notifications for same prayer
- ❌ Duplicate push tokens
- ❌ Need to contact support
- ❌ Manual database fixes

Instead:
- ✅ One tap to fix
- ✅ Clean notification state
- ✅ Exactly one notification per prayer
- ✅ Better user experience!


