const admin = require('firebase-admin');
const fetch = require('node-fetch');

// Initialize Firebase Admin if not already initialized
if (!admin.apps.length) {
  admin.initializeApp();
}

// Function to send push notification (same as in functions/index.js)
async function sendPushNotification(expoPushToken, title, body, data = {}) {
  try {
    // Determine sound based on notification type
    let sound = 'default';
    let iosSound = undefined;
    
    // Adhan sound files removed - using default sound
    // if (data?.type === 'prayer_time' && data?.shouldPlayAdhan) {
    //   sound = 'adhan.m4a';
    //   iosSound = 'adhan.m4a';
    // }
    
    const message = {
      to: expoPushToken,
      sound: sound,
      title: title,
      body: body,
      data: data,
      priority: 'high',
    };

    // Add iOS-specific sound only for adhan
    if (iosSound) {
      message.ios = {
        sound: iosSound,
      };
    }

    console.log('📤 Sending notification:', { title, body, data });

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
    console.log('📱 Push notification response:', result);
    return { success: true, result };
  } catch (error) {
    console.error('❌ Error in sendPushNotification:', error);
    return { success: false, error: error.message };
  }
}

// Function to get user by ID and send test notifications
async function sendTestNotificationsToUser(userId) {
  try {
    console.log(`🔍 Looking up user: ${userId}`);
    
    // Get user data
    const userDoc = await admin.firestore().collection('users').doc(userId).get();
    
    if (!userDoc.exists) {
      console.error('❌ User not found:', userId);
      return;
    }

    const userData = userDoc.data();
    const expoPushToken = userData.expoPushToken;

    if (!expoPushToken) {
      console.error('❌ No push token found for user:', userId);
      return;
    }

    console.log(`✅ Found user with push token: ${expoPushToken}`);
    console.log(`🌍 User language: ${userData.language || 'english'}`);

    // Array of all prayer notification types to test
    const testNotifications = [
      // 1. Fajr notifications
      {
        title: "Fajr at 5:30 AM",
        body: "It's time to Pray!",
        data: {
          type: 'prayer_time',
          prayer: 'Fajr',
          shouldPlayAdhan: true,
          notificationType: 'adhan',
          timestamp: Date.now()
        },
        delay: 0
      },
      {
        title: "Prayer Time Almost Here",
        body: "Fajr prayer is in 5 minutes",
        data: {
          type: 'prayer_reminder',
          prayer: 'Fajr',
          timestamp: Date.now()
        },
        delay: 3000
      },
      {
        title: "Prayer Reminder",
        body: "Don't forget to pray Fajr",
        data: {
          type: 'prayer_delay_reminder',
          prayer: 'Fajr',
          timestamp: Date.now()
        },
        delay: 6000
      },

      // 2. Sunrise notification (no reminder/delay for sunrise)
      {
        title: "Sunrise at 7:15 AM",
        body: "It's time to Pray!",
        data: {
          type: 'prayer_time',
          prayer: 'Sunrise',
          shouldPlayAdhan: false,
          notificationType: 'notification',
          timestamp: Date.now()
        },
        delay: 9000
      },

      // 3. Dhuhr notifications
      {
        title: "Dhuhr at 12:30 PM",
        body: "It's time to Pray!",
        data: {
          type: 'prayer_time',
          prayer: 'Dhuhr',
          shouldPlayAdhan: true,
          notificationType: 'adhan',
          timestamp: Date.now()
        },
        delay: 12000
      },
      {
        title: "Prayer Time Almost Here",
        body: "Dhuhr prayer is in 5 minutes",
        data: {
          type: 'prayer_reminder',
          prayer: 'Dhuhr',
          timestamp: Date.now()
        },
        delay: 15000
      },
      {
        title: "Prayer Reminder",
        body: "Don't forget to pray Dhuhr",
        data: {
          type: 'prayer_delay_reminder',
          prayer: 'Dhuhr',
          timestamp: Date.now()
        },
        delay: 18000
      },

      // 4. Asr notifications
      {
        title: "Asr at 4:00 PM",
        body: "It's time to Pray!",
        data: {
          type: 'prayer_time',
          prayer: 'Asr',
          shouldPlayAdhan: true,
          notificationType: 'adhan',
          timestamp: Date.now()
        },
        delay: 21000
      },
      {
        title: "Prayer Time Almost Here",
        body: "Asr prayer is in 5 minutes",
        data: {
          type: 'prayer_reminder',
          prayer: 'Asr',
          timestamp: Date.now()
        },
        delay: 24000
      },
      {
        title: "Prayer Reminder",
        body: "Don't forget to pray Asr",
        data: {
          type: 'prayer_delay_reminder',
          prayer: 'Asr',
          timestamp: Date.now()
        },
        delay: 27000
      },

      // 5. Maghrib notifications
      {
        title: "Maghrib at 6:45 PM",
        body: "It's time to Pray!",
        data: {
          type: 'prayer_time',
          prayer: 'Maghrib',
          shouldPlayAdhan: true,
          notificationType: 'adhan',
          timestamp: Date.now()
        },
        delay: 30000
      },
      {
        title: "Prayer Time Almost Here",
        body: "Maghrib prayer is in 5 minutes",
        data: {
          type: 'prayer_reminder',
          prayer: 'Maghrib',
          timestamp: Date.now()
        },
        delay: 33000
      },
      {
        title: "Prayer Reminder",
        body: "Don't forget to pray Maghrib",
        data: {
          type: 'prayer_delay_reminder',
          prayer: 'Maghrib',
          timestamp: Date.now()
        },
        delay: 36000
      },

      // 6. Isha notifications
      {
        title: "Isha at 8:30 PM",
        body: "It's time to Pray!",
        data: {
          type: 'prayer_time',
          prayer: 'Isha',
          shouldPlayAdhan: true,
          notificationType: 'adhan',
          timestamp: Date.now()
        },
        delay: 39000
      },
      {
        title: "Prayer Time Almost Here",
        body: "Isha prayer is in 5 minutes",
        data: {
          type: 'prayer_reminder',
          prayer: 'Isha',
          timestamp: Date.now()
        },
        delay: 42000
      },
      {
        title: "Prayer Reminder",
        body: "Don't forget to pray Isha",
        data: {
          type: 'prayer_delay_reminder',
          prayer: 'Isha',
          timestamp: Date.now()
        },
        delay: 45000
      },

      // 7. Additional notification types
      {
        title: "Streak Warning",
        body: "Don't lose your prayer streak! You have 2 hours left.",
        data: {
          type: 'streak_warning',
          timestamp: Date.now()
        },
        delay: 48000
      },
      {
        title: "Keep Going!",
        body: "You're doing great with your prayers. Keep it up!",
        data: {
          type: 'encouragement',
          timestamp: Date.now()
        },
        delay: 51000
      },
      {
        title: "Evening Dhikr",
        body: "Don't forget your evening remembrance of Allah",
        data: {
          type: 'daily_night',
          timestamp: Date.now()
        },
        delay: 54000
      }
    ];

    console.log(`📱 Sending ${testNotifications.length} test notifications...`);

    // Send each notification with delay
    for (let i = 0; i < testNotifications.length; i++) {
      const notification = testNotifications[i];
      
      setTimeout(async () => {
        console.log(`📤 Sending notification ${i + 1}/${testNotifications.length}: ${notification.title}`);
        const result = await sendPushNotification(
          expoPushToken,
          notification.title,
          notification.body,
          notification.data
        );
        
        if (result.success) {
          console.log(`✅ Notification ${i + 1} sent successfully`);
        } else {
          console.log(`❌ Failed to send notification ${i + 1}:`, result.error);
        }
      }, notification.delay);
    }

    console.log(`⏰ All notifications scheduled! They will be sent over the next ${Math.ceil(testNotifications[testNotifications.length - 1].delay / 1000)} seconds.`);

  } catch (error) {
    console.error('❌ Error sending test notifications:', error);
  }
}

// Main execution
async function main() {
  const userId = process.argv[2];
  
  if (!userId) {
    console.error('❌ Please provide a user ID as an argument');
    console.log('Usage: node testNotifications.js <userId>');
    process.exit(1);
  }

  console.log('🚀 Starting prayer notification test...');
  await sendTestNotificationsToUser(userId);
}

// Run if called directly
if (require.main === module) {
  main().catch(console.error);
}

module.exports = { sendTestNotificationsToUser };
