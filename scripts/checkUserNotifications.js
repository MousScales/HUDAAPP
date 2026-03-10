/**
 * Check notification logs for a specific user
 * This helps identify if a user is receiving duplicate notifications
 */

const admin = require('firebase-admin');

// Initialize Firebase Admin
try {
  const serviceAccount = require('./serviceAccountKey.json');
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
  });
  console.log('✅ Firebase Admin initialized\n');
} catch (error) {
  console.error('❌ Error initializing Firebase Admin:', error.message);
  console.error('\n⚠️  Make sure you have downloaded the service account key from:');
  console.error('   https://console.firebase.google.com/project/locked-dd553/settings/serviceaccounts/adminsdk');
  console.error('   And saved it as: scripts/serviceAccountKey.json\n');
  process.exit(1);
}

const db = admin.firestore();

// User ID to check
const USER_ID = 'xP5Wza4BXeOoEE4g0vYyi7ftwzu1';

async function checkUserNotifications() {
  try {
    console.log('🔍 Checking notifications for user:', USER_ID);
    console.log('='.repeat(80) + '\n');

    // Get user data
    const userDoc = await db.collection('users').doc(USER_ID).get();
    
    if (!userDoc.exists) {
      console.log('❌ User not found in database!');
      return;
    }

    const userData = userDoc.data();
    
    console.log('👤 USER INFORMATION:');
    console.log('   Email:', userData.email || 'Not set');
    console.log('   Name:', userData.firstName || userData.name || 'Not set');
    console.log('   Prayer Blocker Enabled:', userData.prayerBlockerEnabled ? 'Yes' : 'No');
    console.log('   Language:', userData.language || 'Not set');
    console.log('\n' + '='.repeat(80) + '\n');

    // Check push tokens
    console.log('📱 PUSH TOKENS:');
    const tokens = [];
    if (userData.expoPushToken) {
      tokens.push({ type: 'expoPushToken', value: userData.expoPushToken });
      console.log('   expoPushToken:', userData.expoPushToken.substring(0, 40) + '...');
    }
    if (userData.pushToken) {
      tokens.push({ type: 'pushToken', value: userData.pushToken });
      console.log('   pushToken:', userData.pushToken.substring(0, 40) + '...');
    }
    if (userData.fcmToken) {
      tokens.push({ type: 'fcmToken', value: userData.fcmToken });
      console.log('   fcmToken:', userData.fcmToken.substring(0, 40) + '...');
    }
    if (userData.deviceTokens && Array.isArray(userData.deviceTokens)) {
      userData.deviceTokens.forEach((token, i) => {
        tokens.push({ type: 'deviceTokens', value: token });
        console.log(`   deviceToken[${i}]:`, token.substring(0, 40) + '...');
      });
    }

    const uniqueTokens = new Set(tokens.map(t => t.value));
    console.log('\n   Total tokens:', tokens.length);
    console.log('   Unique tokens:', uniqueTokens.size);
    
    if (uniqueTokens.size > 1) {
      console.log('   ⚠️  PROBLEM: Multiple different tokens! This causes duplicate notifications!');
    } else if (tokens.length > 1 && uniqueTokens.size === 1) {
      console.log('   ℹ️  Same token stored in multiple fields (OK, but should be cleaned up)');
    } else {
      console.log('   ✅ Only one token (good!)');
    }

    console.log('\n' + '='.repeat(80) + '\n');

    // Check notification settings
    console.log('🔔 NOTIFICATION SETTINGS:');
    const prayerNotificationSettings = userData.prayerNotificationSettings || {};
    console.log('   Fajr:', prayerNotificationSettings.fajr || 'off');
    console.log('   Dhuhr:', prayerNotificationSettings.dhuhr || 'off');
    console.log('   Asr:', prayerNotificationSettings.asr || 'off');
    console.log('   Maghrib:', prayerNotificationSettings.maghrib || 'off');
    console.log('   Isha:', prayerNotificationSettings.isha || 'off');
    
    console.log('\n' + '='.repeat(80) + '\n');

    // Check recent notification flags
    console.log('📊 RECENT NOTIFICATION TRACKING:');
    const today = new Date().toISOString().split('T')[0];
    const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];
    
    let notificationFlags = 0;
    Object.keys(userData).forEach(key => {
      if (key.includes('lastNotification') || key.includes('lastFajr') || key.includes('lastEarlyMorning')) {
        notificationFlags++;
        const value = userData[key];
        let timestamp = 'Unknown';
        if (value && value.toDate) {
          timestamp = value.toDate().toLocaleString();
        } else if (value && typeof value === 'object' && value.seconds) {
          timestamp = new Date(value.seconds * 1000).toLocaleString();
        }
        console.log(`   ${key}: ${timestamp}`);
      }
    });
    
    if (notificationFlags === 0) {
      console.log('   No recent notification tracking found');
    }

    console.log('\n' + '='.repeat(80) + '\n');

    // Check prayer times
    console.log('⏰ PRAYER TIMES:');
    if (userData.prayerTimes && Array.isArray(userData.prayerTimes)) {
      console.log(`   ${userData.prayerTimes.length} prayer times configured:`);
      userData.prayerTimes.forEach(prayer => {
        console.log(`   - ${prayer.name}: ${prayer.timeString || 'No time'} (Enabled: ${prayer.enabled})`);
      });
    } else {
      console.log('   No prayer times configured');
    }

    console.log('\n' + '='.repeat(80) + '\n');

    // Summary and recommendations
    console.log('📋 ANALYSIS:');
    
    const issues = [];
    const recommendations = [];

    if (uniqueTokens.size > 1) {
      issues.push('❌ Multiple different push tokens detected');
      recommendations.push('Run "Reset Notifications" in app Settings');
      recommendations.push('Or use: await notificationCleanupService.cleanupAndResetNotifications()');
    }

    if (userData.prayerBlockerEnabled) {
      issues.push('⚠️  User has prayer blocker enabled');
      recommendations.push('Ensure checkPrayerTimesAndNotify sends SILENT notifications only');
      recommendations.push('Check if latest Cloud Functions are deployed');
    }

    if (!userData.expoPushToken) {
      issues.push('❌ No expoPushToken found');
      recommendations.push('User needs to grant notification permissions');
      recommendations.push('Or use "Reset Notifications" in app');
    }

    if (issues.length > 0) {
      console.log('\n   Issues Found:');
      issues.forEach(issue => console.log('   ' + issue));
    } else {
      console.log('   ✅ No obvious issues detected');
    }

    if (recommendations.length > 0) {
      console.log('\n   Recommendations:');
      recommendations.forEach(rec => console.log('   - ' + rec));
    }

    console.log('\n' + '='.repeat(80) + '\n');

    // Guide to check Cloud Functions logs
    console.log('🔍 TO CHECK NOTIFICATION LOGS:');
    console.log('\n1. Firebase Console Method:');
    console.log('   https://console.firebase.google.com/project/locked-dd553/logs');
    console.log('   Then search for: ' + USER_ID);
    console.log('\n2. Firebase CLI Method:');
    console.log('   firebase functions:log --project locked-dd553 | grep ' + USER_ID);
    console.log('\n3. Look for these patterns:');
    console.log('   - "✅ Sent notification to user"');
    console.log('   - "Prayer notification sent"');
    console.log('   - Count how many times notifications were sent in the same minute');
    console.log('\n4. Expected behavior:');
    console.log('   - ONE notification from sendPrayerNotifications per prayer');
    console.log('   - If prayer blocker enabled: ONE silent notification from checkPrayerTimesAndNotify');
    console.log('   - Total: Should see max 2 log entries per prayer (1 visible + 1 silent)');
    console.log('   - But user should only SEE 1 notification');

    console.log('\n' + '='.repeat(80) + '\n');
    console.log('✅ Analysis complete!\n');

  } catch (error) {
    console.error('❌ Error:', error);
  }

  process.exit(0);
}

checkUserNotifications();


