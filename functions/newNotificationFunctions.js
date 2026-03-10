const functions = require('firebase-functions');
const admin = require('firebase-admin');
const { getTranslation, getPrayerNotificationKeys } = require('./translations');

// Use the logger from the main index.js file
const logger = functions.logger;

// Helper function to send push notification with retry logic for stale tokens
async function sendPushNotification(expoPushToken, title, body, data = {}, userId = null) {
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
    
    // Check if the token is stale/invalid
    if (result.errors && result.errors.length > 0) {
      const error = result.errors[0];
      if (error.code === 'DeviceNotRegistered' || error.code === 'InvalidCredentials') {
        logger.warn(`Stale push token detected for user ${userId}, marking for refresh`);
        
        // Mark the token as stale in Firebase so the app can refresh it
        if (userId) {
          try {
            await admin.firestore().collection('users').doc(userId).update({
              pushTokenStale: true,
              lastTokenError: error.code,
              lastTokenErrorTime: admin.firestore.FieldValue.serverTimestamp(),
            });
            logger.info(`Marked push token as stale for user ${userId}`);
          } catch (updateError) {
            logger.error(`Error marking token as stale for user ${userId}:`, updateError);
          }
        }
        
        return { success: false, error: 'Stale token', shouldRetry: false };
      }
    }
    
    logger.info('Push notification sent successfully:', result);
    return { success: true, result };
  } catch (error) {
    logger.error('Error sending push notification:', error);
    return { success: false, error: error.message, shouldRetry: true };
  }
}

// Helper function to get random hadith
function getRandomHadith() {
  const hadiths = [
    "The Prophet ﷺ said: 'The most beloved places to Allah are the mosques, and the most disliked places to Allah are the markets.'",
    "The Prophet ﷺ said: 'When one of you prays, he is conversing with his Lord.'",
    "The Prophet ﷺ said: 'The first thing for which a person will be held accountable on the Day of Resurrection is prayer.'",
    "The Prophet ﷺ said: 'Prayer is the pillar of religion.'",
    "The Prophet ﷺ said: 'The key to Paradise is prayer.'"
  ];
  return hadiths[Math.floor(Math.random() * hadiths.length)];
}

// Helper function to check if user has active subscription
async function checkUserSubscription(userId) {
  try {
    const userDoc = await admin.firestore().collection('users').doc(userId).get();
    if (!userDoc.exists) {
      return { isActive: false, reason: 'User not found' };
    }

    const userData = userDoc.data();
    const subscription = userData.subscription;

    if (!subscription) {
      return { isActive: false, reason: 'No subscription data' };
    }

    // Check if subscription is active
    if (subscription.isActive) {
      return { 
        isActive: true, 
        expiresDate: subscription.endDate?.toDate(),
        startDate: subscription.startDate?.toDate(),
        remainingDays: subscription.remainingDays
      };
    }

    return { isActive: false, reason: 'Subscription not active' };
  } catch (error) {
    logger.error(`Error checking subscription for user ${userId}:`, error);
    return { isActive: false, reason: 'Error checking subscription' };
  }
}

// Main prayer notification function - runs every minute
exports.sendPrayerNotifications = functions.scheduler.onSchedule('* * * * *', async (event) => {
  try {
    logger.info('🕌 Starting prayer notification check...');
    
    const now = new Date();
    // Use local date format to match prayer service (YYYY-MM-DD)
    const today = now.getFullYear() + '-' + 
                  String(now.getMonth() + 1).padStart(2, '0') + '-' + 
                  String(now.getDate()).padStart(2, '0');
    logger.info(`⏰ Current time: ${now.toISOString()}, Local date: ${today}`);
    
    // Get all users
    const usersSnapshot = await admin.firestore().collection('users').get();
    logger.info(`📊 Processing ${usersSnapshot.docs.length} users for prayer notifications`);
    
    let notificationsSent = 0;
    let errors = 0;
    
    for (const userDoc of usersSnapshot.docs) {
      try {
        const userData = userDoc.data();
        const userId = userDoc.id;
        
        // Skip if no push token or prayer times
        if (!userData.expoPushToken || !userData.prayerTimes) {
          logger.info(`⚠️ Skipping user ${userId}: No push token or prayer times`);
          continue;
        }


        
        // Get user's notification settings
        const notificationSettings = userData.prayerNotificationSettings || {};
        
        // Process each prayer
        for (const prayer of userData.prayerTimes) {
          if (!prayer.enabled || !prayer.time) {
            continue;
          }
          
          const prayerId = prayer.name.toLowerCase();
          const prayerSetting = notificationSettings[prayerId];
          
          // Skip if notifications are disabled for this prayer
          // Settings can be: 'notification' (enabled), 'adhan' (enabled), false (disabled), 'off' (disabled)
          if (!prayerSetting || prayerSetting === 'off' || prayerSetting === false) {
            logger.info(`⏭️ Skipping ${prayer.name} for user ${userId}: notifications disabled (setting: ${prayerSetting})`);
            continue;
          }
          
          // Parse prayer time - prioritize Firestore timestamp for accurate timezone handling
          const userTimezone = userData.timezone || 'UTC';
          
          let prayerHours, prayerMinutes;
          
          // First check for Firestore timestamp (preferred method)
          if (prayer.time && prayer.time.toDate) {
            // Firestore timestamp - convert to user's timezone
            const prayerTimeUTC = prayer.time.toDate();
            const prayerTimeUserStr = prayerTimeUTC.toLocaleString("en-US", {
              timeZone: userTimezone,
              hour: '2-digit',
              minute: '2-digit',
              hour12: false
            });
            const [hours, minutes] = prayerTimeUserStr.split(':').map(Number);
            prayerHours = hours;
            prayerMinutes = minutes;
            
            logger.info(`🕐 ${prayer.name}: Parsed Firestore timestamp as ${hours}:${minutes} in ${userTimezone} (UTC: ${prayerTimeUTC.toISOString()})`);
            
          } else if (prayer.time && typeof prayer.time === 'string') {
            // Fallback: Parse time string like "4:54 PM" or "16:54"
            // This is less accurate as it doesn't have date information
            const timeStr = prayer.time;
            const [timePart, period] = timeStr.split(' ');
            let [hours, minutes] = timePart.split(':').map(Number);
            
            // Handle AM/PM format
            if (period) {
              if (period.toLowerCase() === 'pm' && hours !== 12) {
                hours += 12;
              } else if (period.toLowerCase() === 'am' && hours === 12) {
                hours = 0;
              }
            }
            
            prayerHours = hours;
            prayerMinutes = minutes;
            
            logger.info(`🕐 ${prayer.name}: Parsed time string "${prayer.time}" as ${hours}:${minutes} in ${userTimezone} (fallback method)`);
            
          } else if (prayer.time) {
            // Regular Date object or ISO string - get time in user's timezone
            const prayerTimeUTC = new Date(prayer.time);
            const prayerTimeUserStr = prayerTimeUTC.toLocaleString("en-US", {
              timeZone: userTimezone,
              hour: '2-digit',
              minute: '2-digit',
              hour12: false
            });
            const [hours, minutes] = prayerTimeUserStr.split(':').map(Number);
            prayerHours = hours;
            prayerMinutes = minutes;
            
            logger.info(`🕐 ${prayer.name}: Parsed Date object as ${hours}:${minutes} in ${userTimezone}`);
          } else {
            logger.warn(`⚠️ Invalid prayer time for ${prayer.name}:`, prayer.time);
            continue;
          }
          
          // Get current time in user's timezone
          const userNowStr = now.toLocaleString("en-US", {
            timeZone: userTimezone,
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit',
            hour12: false
          });
          const [currentHour, currentMinute, currentSecond] = userNowStr.split(':').map(Number);
          
          // Calculate time difference in minutes
          const currentTimeMinutes = currentHour * 60 + currentMinute + (currentSecond / 60);
          const prayerTimeMinutes = prayerHours * 60 + prayerMinutes;
          let minutesDiff = currentTimeMinutes - prayerTimeMinutes;
          
          // Handle day rollover (if prayer time is tomorrow)
          if (minutesDiff < -720) { // More than 12 hours negative, likely next day
            minutesDiff += 1440; // Add 24 hours
          }
          
          logger.info(`👤 User ${userId}: ${prayer.name} at ${prayerHours}:${String(prayerMinutes).padStart(2, '0')}, current: ${currentHour}:${String(currentMinute).padStart(2, '0')}, diff: ${minutesDiff.toFixed(1)}min`);
          
          // Send 5-minute advance reminder (only for fardh prayers) - wider window
          if (minutesDiff >= -5.5 && minutesDiff <= -4.5) {
            const fardhPrayers = ['fajr', 'dhuhr', 'asr', 'maghrib', 'isha'];
            const isFardhPrayer = fardhPrayers.includes(prayerId);
            
            if (isFardhPrayer) {
              // Check if we already sent a 5-minute reminder today
              const lastReminderKey = `lastPrayerReminder_${prayer.name}_${today}`;
              const lastReminder = userData[lastReminderKey];
              
              if (!lastReminder) {
                logger.info(`📢 Sending 5-minute reminder for ${prayer.name} to user ${userId}`);
                
                const notificationResult = await sendPushNotification(
                  userData.expoPushToken,
                  'Prayer time is almost here!',
                  `${prayer.name} in 5 minutes`,
                  {
                    type: 'prayer_reminder',
                    prayer: prayer.name,
                    shouldPlayAdhan: false,
                    notificationType: prayerSetting,
                    timestamp: Date.now(),
                  },
                  userId
                );
                
                if (notificationResult.success) {
                  // Mark reminder as sent today
                  await admin.firestore().collection('users').doc(userId).update({
                    [lastReminderKey]: admin.firestore.FieldValue.serverTimestamp()
                  });
                  
                  notificationsSent++;
                  logger.info(`✅ 5-minute reminder sent to user ${userId} for ${prayer.name}`);
                } else {
                  logger.warn(`❌ Failed to send 5-minute reminder to user ${userId} for ${prayer.name}:`, notificationResult.error);
                }
              } else {
                logger.info(`⏭️ 5-minute reminder already sent today for ${prayer.name} to user ${userId}`);
              }
            }
          }
          
          // Send notification exactly at prayer time (within 1 minute)
          if (minutesDiff >= 0 && minutesDiff <= 1) {
            // Check if prayer has been completed today
            let prayerCompleted = false;
            let prayerExcused = false;
            
            try {
              const prayerTrackingDoc = await admin.firestore().collection('prayerTracking').doc(userId).get();
              if (prayerTrackingDoc.exists) {
                const prayerTrackingData = prayerTrackingDoc.data();
                const todayPrayerData = prayerTrackingData[today] || {};
                prayerCompleted = todayPrayerData[prayerId] === true;
                prayerExcused = todayPrayerData[prayerId] === 'excused';
              }
            } catch (error) {
              logger.warn(`Could not check prayer completion for user ${userId}:`, error.message);
            }
            
            // Check if we already sent a prayer notification today
            const lastNotificationKey = `lastPrayerNotification_${prayer.name}_${today}`;
            const lastNotification = userData[lastNotificationKey];
            
            if (!lastNotification && !prayerCompleted && !prayerExcused) {
              const shouldPlayAdhan = prayerSetting === 'adhan';
              const prayerTimeString = prayer.timeString || `${String(prayerHours % 12 || 12).padStart(2, '0')}:${String(prayerMinutes).padStart(2, '0')} ${prayerHours >= 12 ? 'PM' : 'AM'}`;
              
              const notificationResult = await sendPushNotification(
                userData.expoPushToken,
                `${prayer.name} at ${prayerTimeString}`,
                'Its time to Pray!',
                {
                  type: 'prayer_time',
                  prayer: prayer.name,
                  shouldPlayAdhan: shouldPlayAdhan,
                  notificationType: prayerSetting,
                  timestamp: Date.now(),
                },
                userId
              );
              
              if (notificationResult.success) {
                // Mark as sent today
                await admin.firestore().collection('users').doc(userId).update({
                  [lastNotificationKey]: admin.firestore.FieldValue.serverTimestamp()
                });
                
                notificationsSent++;
                logger.info(`✅ Prayer notification sent to user ${userId} for ${prayer.name}`);
              } else {
                logger.warn(`❌ Failed to send prayer notification to user ${userId} for ${prayer.name}:`, notificationResult.error);
              }
            }
          }
          
          // Send 30-minute delay reminder (only for fardh prayers)
          if (minutesDiff >= 30 && minutesDiff <= 31) {
            const fardhPrayers = ['fajr', 'dhuhr', 'asr', 'maghrib', 'isha'];
            const isFardhPrayer = fardhPrayers.includes(prayerId);
            
            if (isFardhPrayer) {
              // Check if prayer has been completed today
              let prayerCompleted = false;
              let prayerExcused = false;
              
              try {
                const prayerTrackingDoc = await admin.firestore().collection('prayerTracking').doc(userId).get();
                if (prayerTrackingDoc.exists) {
                  const prayerTrackingData = prayerTrackingDoc.data();
                  const todayPrayerData = prayerTrackingData[today] || {};
                  prayerCompleted = todayPrayerData[prayerId] === true;
                  prayerExcused = todayPrayerData[prayerId] === 'excused';
                }
              } catch (error) {
                logger.warn(`Could not check prayer completion for user ${userId}:`, error.message);
              }
              
              // Check if we already sent a 30-minute reminder today
              const last30MinReminderKey = `last30MinReminder_${prayer.name}_${today}`;
              const last30MinReminder = userData[last30MinReminderKey];
              
              if (!last30MinReminder && !prayerCompleted && !prayerExcused) {
                const hadith = getRandomHadith();
                const userName = userData.firstName || 'there';
                
                const notificationResult = await sendPushNotification(
                  userData.expoPushToken,
                  `Dont Delay Your Salah!`,
                  `Salaam ${userName} its been 30 minutes since ${prayer.name}`,
                  {
                    type: 'prayer_delay_reminder',
                    prayer: prayer.name,
                    shouldPlayAdhan: false,
                    notificationType: prayerSetting,
                    timestamp: Date.now(),
                  },
                  userId
                );
                
                if (notificationResult.success) {
                  // Mark 30-minute reminder as sent today
                  await admin.firestore().collection('users').doc(userId).update({
                    [last30MinReminderKey]: admin.firestore.FieldValue.serverTimestamp()
                  });
                  
                  notificationsSent++;
                  logger.info(`✅ 30-minute delay reminder sent to user ${userId} for ${prayer.name}`);
                } else {
                  logger.warn(`❌ Failed to send 30-minute reminder to user ${userId} for ${prayer.name}:`, notificationResult.error);
                }
              }
            }
          }
        }
      } catch (error) {
        errors++;
        logger.error(`❌ Error processing user ${userDoc.id}:`, error);
      }
    }
    
    logger.info(`✅ Prayer notification check completed: ${notificationsSent} notifications sent, ${errors} errors`);
    return { notificationsSent, errors };
    
  } catch (error) {
    logger.error('❌ Error in prayer notification scheduler:', error);
    throw error;
  }
});

// Test function to send a notification to a specific user
exports.testNotification = functions.https.onRequest(async (req, res) => {
  try {
    const { userId, title, body, type = 'test' } = req.body;
    
    if (!userId) {
      return res.status(400).json({ error: 'userId is required' });
    }
    
    const userDoc = await admin.firestore().collection('users').doc(userId).get();
    if (!userDoc.exists) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    const userData = userDoc.data();
    if (!userData.expoPushToken) {
      return res.status(400).json({ error: 'User has no push token' });
    }
    
    const notificationResult = await sendPushNotification(
      userData.expoPushToken,
      title || 'Test Notification',
      body || 'This is a test notification from the new notification system!',
      {
        type: type,
        timestamp: Date.now(),
      },
      userId
    );
    
    if (!notificationResult.success) {
      return res.status(500).json({ error: `Failed to send notification: ${notificationResult.error}` });
    }
    
    res.json({ 
      success: true, 
      message: 'Test notification sent',
      userId: userId,
      title: title,
      body: body,
      type: type
    });
    
  } catch (error) {
    logger.error('Error sending test notification:', error);
    res.status(500).json({ error: error.message });
  }
});

// Function to get notification status for a user
exports.getNotificationStatus = functions.https.onRequest(async (req, res) => {
  try {
    const { userId } = req.query;
    
    if (!userId) {
      return res.status(400).json({ error: 'userId is required' });
    }
    
    const userDoc = await admin.firestore().collection('users').doc(userId).get();
    if (!userDoc.exists) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    const userData = userDoc.data();
    
    res.json({
      success: true,
      userId: userId,
      hasPushToken: !!userData.expoPushToken,
      notificationSettings: userData.prayerNotificationSettings || {},
      prayerTimes: userData.prayerTimes || [],
      lastTokenUpdate: userData.lastTokenUpdate,
      lastSettingsUpdate: userData.lastSettingsUpdate,
    });
    
  } catch (error) {
    logger.error('Error getting notification status:', error);
    res.status(500).json({ error: error.message });
  }
});

// Nightly notification function - runs at 3:45 AM daily
exports.sendNightlyNotification = functions.scheduler.onSchedule('45 3 * * *', async (event) => {
  try {
    logger.info('🌙 Starting nightly notification function');
    
    // Get all users who have enabled nightly notifications
    const usersSnapshot = await admin.firestore().collection('users')
      .where('dailyNightNotification', '==', true)
      .get();
    
    let notificationsSent = 0;
    
    for (const userDoc of usersSnapshot.docs) {
      try {
        const userData = userDoc.data();
        const userId = userDoc.id;
        
        // Skip if no push token
        if (!userData.expoPushToken) {
          logger.info(`⚠️ Skipping user ${userId}: No push token`);
          continue;
        }
        
        // Check if we already sent a nightly notification today
        const today = new Date().toISOString().split('T')[0];
        const lastNightlyKey = `lastNightlyNotification_${today}`;
        const lastNightly = userData[lastNightlyKey];
        
        if (!lastNightly) {
          // Get random hadith for the nightly message
          const hadith = getRandomHadith();
          
          await sendPushNotification(
            userData.expoPushToken,
            'Night Prayer Reminder',
            `As the day ends, remember to pray Isha and reflect on your day. ${hadith}`,
            {
              type: 'daily_night',
              timestamp: Date.now(),
            }
          );
          
          // Mark as sent today
          await admin.firestore().collection('users').doc(userId).update({
            [lastNightlyKey]: admin.firestore.FieldValue.serverTimestamp()
          });
          
          notificationsSent++;
          logger.info(`✅ Nightly notification sent to user ${userId}`);
        }
      } catch (error) {
        logger.error(`Error sending nightly notification to user ${userDoc.id}:`, error);
      }
    }
    
    logger.info(`🌙 Nightly notification function completed. Sent ${notificationsSent} notifications`);
    return { success: true, notificationsSent };
    
  } catch (error) {
    logger.error('❌ Error in nightly notification function:', error);
    throw error;
  }
});







// Fajr and Sunrise notification function - runs every minute during early morning hours
// COMMENTED OUT - Now handled by the main sendPrayerNotifications function
/*
exports.sendFajrSunriseNotifications = functions.scheduler.onSchedule('* 4-7 * * *', async (event) => {
  try {
    logger.info('🌅 Starting Fajr and Sunrise notification check...');
    
    const now = new Date();
    const currentHour = now.getHours();
    
    // Only run during early morning hours (4 AM to 7 AM)
    if (currentHour < 4 || currentHour > 7) {
      logger.info('🌅 Outside early morning hours, skipping...');
      return { success: true, skipped: true };
    }
    
    logger.info(`⏰ Current time: ${now.toISOString()}, Hour: ${currentHour}`);
    
    // Get all users
    const usersSnapshot = await admin.firestore().collection('users').get();
    logger.info(`📊 Processing ${usersSnapshot.docs.length} users for Fajr/Sunrise notifications`);
    
    let notificationsSent = 0;
    let errors = 0;
    
    for (const userDoc of usersSnapshot.docs) {
      try {
        const userData = userDoc.data();
        const userId = userDoc.id;
        
        // Skip if no push token or prayer times
        if (!userData.expoPushToken || !userData.prayerTimes) {
          continue;
        }
        
        // Get user's notification settings
        const notificationSettings = userData.prayerNotificationSettings || {};
        
        // Process each prayer (focus on Fajr and Sunrise)
        for (const prayer of userData.prayerTimes) {
          if (!prayer.enabled || !prayer.time) {
            continue;
          }
          
          const prayerId = prayer.name.toLowerCase();
          
          // Only process Fajr and Sunrise for early morning
          if (prayerId !== 'fajr' && prayerId !== 'sunrise') {
            continue;
          }
          
          const prayerSetting = notificationSettings[prayerId];
          
          // Skip if notifications are disabled for this prayer
          if (!prayerSetting || prayerSetting === 'off' || prayerSetting === false) {
            continue;
          }
          
          // Prayer times are stored in UTC, need to convert to user's timezone
          const prayerTimeUTC = prayer.time.toDate ? prayer.time.toDate() : new Date(prayer.time);
          const userTimezone = userData.timezone || 'UTC';
          
          // Convert prayer time to user's timezone
          const prayerTime = new Date(prayerTimeUTC.toLocaleString("en-US", {timeZone: userTimezone}));
          
          // Get current time in user's timezone
          const userCurrentTime = new Date(now.toLocaleString("en-US", {timeZone: userTimezone}));
          
          const timeDiff = userCurrentTime.getTime() - prayerTime.getTime();
          const minutesDiff = timeDiff / (1000 * 60);
          
          // Send 5-minute warning for Fajr only
          if (prayerId === 'fajr' && minutesDiff >= -5 && minutesDiff <= -4) {
            const today = new Date().toISOString().split('T')[0];
            const lastWarningKey = `lastFajrWarning_${today}`;
            const lastWarning = userData[lastWarningKey];
            
            if (!lastWarning) {
              const prayerTimeString = prayer.timeString || prayerTime.toLocaleTimeString([], { 
                hour: '2-digit', 
                minute: '2-digit' 
              });
              
              await sendPushNotification(
                userData.expoPushToken,
                `Fajr at ${prayerTimeString}`,
                `5 minutes to Fajr`,
                {
                  type: 'prayer_reminder',
                  prayer: 'fajr',
                  shouldPlayAdhan: false,
                  notificationType: prayerSetting,
                  timestamp: Date.now(),
                }
              );
              
              // Mark warning as sent today
              await admin.firestore().collection('users').doc(userId).update({
                [lastWarningKey]: admin.firestore.FieldValue.serverTimestamp()
              });
              
              notificationsSent++;
              logger.info(`✅ Fajr 5-minute warning sent to user ${userId}`);
            }
          }
          
          // Send notification exactly at prayer time (within 1 minute)
          if (minutesDiff >= 0 && minutesDiff <= 0.5) {
            // Check if prayer has been completed today
            let prayerCompleted = false;
            let prayerExcused = false;
            
            try {
              const prayerTrackingDoc = await admin.firestore().collection('prayerTracking').doc(userId).get();
              if (prayerTrackingDoc.exists) {
                const prayerTrackingData = prayerTrackingDoc.data();
                const today = new Date().toISOString().split('T')[0];
                const todayPrayerData = prayerTrackingData[today] || {};
                prayerCompleted = todayPrayerData[prayerId] === true;
                prayerExcused = todayPrayerData[prayerId] === 'excused';
              }
            } catch (error) {
              logger.warn(`Could not check prayer completion for user ${userId}:`, error.message);
            }
            
            // Check if we already sent a prayer notification today
            const today = new Date().toISOString().split('T')[0];
            const lastNotificationKey = `lastEarlyMorningNotification_${prayer.name}_${today}`;
            const lastNotification = userData[lastNotificationKey];
            
            if (!lastNotification && !prayerCompleted && !prayerExcused) {
              const shouldPlayAdhan = prayerSetting === 'adhan';
              const prayerTimeString = prayer.timeString || prayerTime.toLocaleTimeString([], { 
                hour: '2-digit', 
                minute: '2-digit' 
              });
              
              // Get user's language preference
              const userLanguage = userData.language || 'english';
              logger.info(`🌍 Using language: ${userLanguage} for user ${userId}`);
              
              // Different messages for Fajr vs Sunrise
              let title, body;
              if (prayerId === 'fajr') {
                const prayerKeys = getPrayerNotificationKeys('fajr');
                title = getTranslation(prayerKeys.atTime, userLanguage, { time: prayerTimeString });
                body = getTranslation('itsTimeToPray', userLanguage);
              } else {
                title = getTranslation('sunriseAtTime', userLanguage, { time: prayerTimeString });
                body = getTranslation('sunriseMessage', userLanguage, { time: prayerTimeString });
              }
              
              await sendPushNotification(
                userData.expoPushToken,
                title,
                body,
                {
                  type: 'prayer_time',
                  prayer: prayer.name,
                  shouldPlayAdhan: shouldPlayAdhan,
                  notificationType: prayerSetting,
                  timestamp: Date.now(),
                }
              );
              
              // Mark as sent today
              await admin.firestore().collection('users').doc(userId).update({
                [lastNotificationKey]: admin.firestore.FieldValue.serverTimestamp()
              });
              
              notificationsSent++;
              logger.info(`✅ Fajr/Sunrise notification sent to user ${userId} for ${prayer.name}`);
            }
          }
          
          // Send 30-minute reminder for Fajr only
          if (prayerId === 'fajr' && minutesDiff >= 30 && minutesDiff <= 31) {
            const today = new Date().toISOString().split('T')[0];
            const lastReminderKey = `lastFajrReminder_${today}`;
            const lastReminder = userData[lastReminderKey];
            
            if (!lastReminder) {
              const hadith = getRandomHadith();
              const userName = userData.firstName || 'there';
              const userLanguage = userData.language || 'english';
              const prayerTimeString = prayer.timeString || prayerTime.toLocaleTimeString([], { 
                hour: '2-digit', 
                minute: '2-digit' 
              });
              
              const prayerKeys = getPrayerNotificationKeys('fajr');
              const title = getTranslation(prayerKeys.dontDelay, userLanguage);
              const body = `${getTranslation(prayerKeys.salaamReminder, userLanguage, { name: userName })}. ${hadith}`;
              
              await sendPushNotification(
                userData.expoPushToken,
                title,
                body,
                {
                  type: 'prayer_delay_reminder',
                  prayer: 'fajr',
                  shouldPlayAdhan: false,
                  notificationType: prayerSetting,
                  timestamp: Date.now(),
                }
              );
              
              // Mark reminder as sent today
              await admin.firestore().collection('users').doc(userId).update({
                [lastReminderKey]: admin.firestore.FieldValue.serverTimestamp()
              });
              
              notificationsSent++;
              logger.info(`✅ Fajr 30-minute reminder sent to user ${userId}`);
            }
          }
        }
      } catch (error) {
        errors++;
        logger.error(`❌ Error processing user ${userDoc.id}:`, error);
      }
    }
    
    logger.info(`🌅 Fajr/Sunrise notification check completed: ${notificationsSent} notifications sent, ${errors} errors`);
    return { success: true, notificationsSent, errors };
    
  } catch (error) {
    logger.error('❌ Error in Fajr/Sunrise notification function:', error);
    throw error;
  }
});
*/

 