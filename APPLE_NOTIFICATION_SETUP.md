# Apple App Store Connect Setup for Time-Sensitive Notifications

## Overview
This guide explains how to configure your Hudā app for time-sensitive notifications that work when the app is closed, specifically for prayer time alerts.

## What We've Implemented

### 1. Time-Sensitive Notification System
- **Background Task**: Uses `expo-background-fetch` to check prayer times every minute
- **Time-Sensitive Notifications**: High-priority notifications that appear even when the app is closed
- **Critical Alerts**: Requests `allowCriticalAlerts` permission for time-sensitive content
- **Background Processing**: Continues working when app is terminated

### 2. Technical Implementation
- **Background Fetch**: Checks prayer times every 60 seconds
- **Local Storage**: Stores prayer times for background access
- **Notification Priority**: Uses `priority: 'high'` for time-sensitive alerts
- **Sound Handling**: System handles notification sounds automatically

## Apple App Store Connect Portal Requirements

### 1. Background Modes Configuration
In your app's `Info.plist`, ensure these background modes are enabled:

```xml
<key>UIBackgroundModes</key>
<array>
    <string>background-fetch</string>
    <string>remote-notification</string>
    <string>audio</string>
</array>
```

### 2. Critical Alerts Permission
For time-sensitive notifications, you need to request critical alerts permission:

1. **App Store Connect Portal**:
   - Go to your app in App Store Connect
   - Navigate to "App Information" → "App Privacy"
   - Add "Critical Alerts" under "Data Used to Track You"
   - Provide justification: "Critical alerts are used to notify users of prayer times, which are time-sensitive religious obligations"

2. **Privacy Policy Update**:
   - Update your privacy policy to mention critical alerts
   - Explain that they're used for prayer time notifications
   - Include how users can disable them

### 3. App Store Review Guidelines

#### Required Information for Review:
1. **Justification for Critical Alerts**:
   ```
   "Critical alerts are essential for prayer time notifications. 
   Prayer times are time-sensitive religious obligations that 
   require immediate notification to ensure users don't miss 
   their prayers. These notifications are only sent at the 
   exact prayer times and are critical for religious practice."
   ```

2. **User Control**:
   - Users can disable notifications in app settings
   - Users can disable critical alerts in iOS Settings
   - Clear explanation of what critical alerts are used for

3. **Testing Instructions**:
   ```
   "To test time-sensitive notifications:
   1. Enable notifications in the app
   2. Set device time to 1 minute before any prayer time
   3. Close the app completely
   4. Wait for the notification to appear at prayer time
   5. Verify notification appears even when app is closed"
   ```

### 4. App Store Connect Configuration

#### App Information Section:
1. **App Privacy**:
   - Add "Critical Alerts" to data collection
   - Justification: "Used for prayer time notifications"

2. **App Review Information**:
   - **Contact Information**: Your contact details
   - **Demo Account**: If required for testing
   - **Notes**: Include testing instructions for notifications

#### App Review Notes:
```
"Time-Sensitive Notifications Testing:
- The app uses critical alerts for prayer time notifications
- To test: Enable notifications, set device time to 1 minute before prayer time, close app, wait for notification
- Notifications are sent at exact prayer times from AlAdhan API
- Users can disable notifications in app settings
- Background processing ensures notifications work when app is closed"
```

### 5. Privacy Policy Requirements

Add this section to your privacy policy:

```
"Critical Alerts and Notifications:
Our app uses critical alerts to notify users of prayer times. 
These notifications are time-sensitive and essential for 
religious practice. Critical alerts may appear even when 
the app is closed and may override Do Not Disturb settings.

You can disable critical alerts in iOS Settings:
Settings > Notifications > [App Name] > Critical Alerts

You can also disable all notifications in the app settings."
```

### 6. App Store Review Checklist

#### Before Submitting:
- [ ] Critical alerts permission requested in code
- [ ] Background modes configured in Info.plist
- [ ] Privacy policy updated with critical alerts explanation
- [ ] App Store Connect privacy settings configured
- [ ] Testing instructions provided in review notes
- [ ] User controls for disabling notifications implemented

#### Testing Requirements:
- [ ] Notifications work when app is closed
- [ ] Notifications appear at exact prayer times
- [ ] Users can disable notifications in app
- [ ] Users can disable critical alerts in iOS Settings
- [ ] Background processing works correctly

### 7. Common Rejection Reasons and Solutions

#### 1. "Critical alerts not justified"
**Solution**: Provide clear religious justification and explain time-sensitivity of prayer times.

#### 2. "Background processing excessive"
**Solution**: Explain that 60-second intervals are necessary for accurate prayer time notifications.

#### 3. "User control insufficient"
**Solution**: Ensure users can disable both regular notifications and critical alerts.

#### 4. "Privacy policy incomplete"
**Solution**: Include specific section about critical alerts and how to disable them.

### 8. Additional Recommendations

#### For Better Approval Chances:
1. **Clear Documentation**: Provide detailed testing instructions
2. **Religious Context**: Emphasize the religious importance of prayer times
3. **User Control**: Multiple ways to disable notifications
4. **Transparency**: Clear explanation of what critical alerts are used for
5. **Testing**: Thorough testing before submission

#### App Store Connect Tips:
1. **Be Specific**: Don't just say "notifications" - specify "prayer time notifications"
2. **Provide Context**: Explain why prayer times are time-sensitive
3. **Include Testing**: Give clear steps to test the feature
4. **User Control**: Emphasize user control over notifications

## Implementation Status

✅ **Completed**:
- Time-sensitive notification system
- Background task implementation
- Critical alerts permission request
- User notification controls
- Background modes configuration

🔄 **In Progress**:
- App Store Connect portal configuration
- Privacy policy updates
- Testing and validation

📋 **Next Steps**:
1. Configure App Store Connect portal settings
2. Update privacy policy
3. Test notifications thoroughly
4. Submit for review with detailed notes

## Contact Information

For questions about this implementation or App Store Connect setup, refer to the technical documentation in the codebase and the Apple Developer documentation for critical alerts. 