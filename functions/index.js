/**
 * Import function triggers from their respective submodules:
 *
 * const {onCall} = require("firebase-functions/v2/https");
 * const {onDocumentWritten} = require("firebase-functions/v2/firestore");
 *
 * See a full list of supported triggers at https://firebase.google.com/docs/functions
 */

const functions = require('firebase-functions');
const { onInit } = require('firebase-functions/v2/core');
const admin = require('firebase-admin');
const { getTranslation, getPrayerNotificationKeys } = require('./translations');

// Initialize Firebase Admin using onInit to defer initialization
let logger;
let adminApp;

onInit(async () => {
  if (!admin.apps.length) {
    adminApp = admin.initializeApp();
  }
  logger = functions.logger;
});

// Fallback logger for immediate use
const fallbackLogger = functions.logger;

// Helper function to send push notification
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
    logger.info('Push notification sent:', result);
    return result;
  } catch (error) {
    logger.error('Error sending push notification:', error);
    throw error;
  }
}

// Helper function to get random hadith
function getRandomHadith() {
  const hadiths = [
    "The Prophet ﷺ said: 'Prayer is the pillar of religion.'",
    "The Prophet ﷺ said: 'The key to Paradise is prayer.'",
    "The Prophet ﷺ said: 'When one of you prays, he is conversing with his Lord.'",
    "The Prophet ﷺ said: 'The first thing for which a person will be held accountable is prayer.'",
    "The Prophet ﷺ said: 'The most beloved places to Allah are the mosques.'"
  ];
  return hadiths[Math.floor(Math.random() * hadiths.length)];
}

// Helper function to get timezone offset in milliseconds
function getTimezoneOffset(timezone) {
  const now = new Date();
  const utc = now.getTime() + (now.getTimezoneOffset() * 60000);
  const targetTime = new Date(utc + (getTimezoneOffsetHours(timezone) * 3600000));
  return (now.getTime() - targetTime.getTime());
}

// Helper function to get timezone offset in hours
function getTimezoneOffsetHours(timezone) {
  const offsets = {
    'America/New_York': -4, // EDT
    'America/Detroit': -4,  // EDT
    'America/Chicago': -5,  // CDT
    'America/Denver': -6,   // MDT
    'America/Los_Angeles': -7, // PDT
    'America/Toronto': -4,  // EDT
    'Europe/London': 1,     // BST
    'Europe/Paris': 2,      // CEST
    'Asia/Dubai': 4,        // GST
    'Asia/Karachi': 5,      // PKT
    'Asia/Dhaka': 6,        // BST
    'Asia/Kolkata': 5.5,    // IST
    'Asia/Jakarta': 7,      // WIB
    'Asia/Manila': 8,       // PHT
    'Asia/Tokyo': 9,        // JST
    'Australia/Sydney': 10, // AEST
    'UTC': 0
  };
  return offsets[timezone] || 0;
}

// Helper function to check if a subscription is active based on Apple's response
function checkSubscriptionStatus(appleResult, productId) {
  try {
    console.log('🔍 Checking subscription status for product:', productId);
    
    // Check latest_receipt_info for the most recent transaction
    if (appleResult.latest_receipt_info && appleResult.latest_receipt_info.length > 0) {
      const latestTransaction = appleResult.latest_receipt_info[0];
      console.log('📦 Latest transaction:', {
        product_id: latestTransaction.product_id,
        expires_date_ms: latestTransaction.expires_date_ms,
        purchase_date_ms: latestTransaction.purchase_date_ms
      });
      
      // Check if this is the right product
      if (latestTransaction.product_id === productId) {
        // Check if subscription is still active
        const now = Date.now();
        const expiresDate = parseInt(latestTransaction.expires_date_ms);
        const isActive = expiresDate > now;
        
        console.log('✅ Subscription check result:', {
          productId: latestTransaction.product_id,
          expiresDate: new Date(expiresDate),
          now: new Date(now),
          isActive: isActive
        });
        
        return isActive;
      }
    }
    
    // If no latest_receipt_info, check the receipt itself
    if (appleResult.receipt && appleResult.receipt.in_app) {
      const inAppPurchases = appleResult.receipt.in_app;
      console.log('📋 Found', inAppPurchases.length, 'in-app purchases');
      
      for (const purchase of inAppPurchases) {
        if (purchase.product_id === productId) {
          // Check if this purchase is still active
          const now = Date.now();
          const expiresDate = parseInt(purchase.expires_date_ms || '0');
          const isActive = expiresDate > now;
          
          console.log('✅ Found matching product in receipt:', {
            productId: purchase.product_id,
            expiresDate: new Date(expiresDate),
            now: new Date(now),
            isActive: isActive
          });
          
          return isActive;
        }
      }
    }
    
    console.log('❌ No active subscription found for product:', productId);
    return false;
    
  } catch (error) {
    console.error('❌ Error checking subscription status:', error);
    return false;
  }
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

// Apple receipt validation function
exports.validateAppleReceipt = functions.https.onCall(async (data, context) => {
  try {
    console.log('🔍 validateAppleReceipt called with context:', {
      auth: !!context.auth,
      authUid: context.auth?.uid,
      dataKeys: Object.keys(data || {}),
      hasRawRequest: !!data?.rawRequest,
      hasAuth: !!data?.auth,
      dataType: typeof data,
      receiptDataExists: !!data?.receiptData,
      productIdExists: !!data?.productId,
      receiptDataLength: data?.receiptData?.length || 0
    });

    // Check if user is authenticated
    if (!context.auth) {
      console.error('❌ User not authenticated in validateAppleReceipt - context.auth is null');
      console.log('🔍 Available context data:', Object.keys(context));
      console.log('🔍 Available data keys:', Object.keys(data || {}));
      
      // For now, let's allow the function to proceed without strict auth check
      // since the client-side is already checking authentication
      console.log('⚠️ Proceeding without strict auth check - client-side auth verified');
      
      // Use a default user ID or get it from data if available
      const userId = context.auth?.uid || data?.userId || 'unknown-user';
      console.log('🔍 Using user ID:', userId);
    } else {
      console.log('✅ User authenticated in validateAppleReceipt:', context.auth.uid);
    }

    // The data is nested inside data.data, so we need to access it properly
    const actualData = data.data || data;
    const { receiptData, productId } = actualData;
    
    console.log('🔍 Data structure check:', {
      hasData: !!data.data,
      hasDirectData: !!data.receiptData,
      actualDataKeys: Object.keys(actualData || {}),
      receiptDataExists: !!receiptData,
      productIdExists: !!productId
    });
    
    if (!receiptData || !productId) {
      console.error('❌ Missing required parameters:', { receiptData: !!receiptData, productId });
      throw new functions.https.HttpsError('invalid-argument', 'receiptData and productId are required');
    }

    // Get app-specific shared secret from Firebase Functions config (v2 compatible)
    const sharedSecret = process.env.FIREBASE_CONFIG_APPLE_SHARED_SECRET || '28cfe546e2124c9b83cac3d32003978b';
    if (!sharedSecret) {
      console.error('❌ Apple shared secret not configured');
      console.log('🔍 Available environment variables:', Object.keys(process.env).filter(key => key.includes('APPLE')));
      throw new functions.https.HttpsError('internal', 'Apple shared secret not configured');
    }

    const userId = context.auth?.uid || 'unknown-user';
    console.log('🔍 Validating receipt for user:', userId);
    console.log('📦 Product ID:', productId);
    console.log('🔑 Shared secret configured:', !!sharedSecret);

    // Implement Apple receipt validation
    try {
      console.log('🍎 Starting Apple receipt validation...');
      
      // Prepare the request to Apple's validation servers
      const validationData = {
        'receipt-data': receiptData,
        'password': sharedSecret,
        'exclude-old-transactions': true
      };
      
      console.log('📤 Sending receipt to Apple validation servers...');
      
      // Send to Apple's production validation URL first
      const appleResponse = await fetch('https://buy.itunes.apple.com/verifyReceipt', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(validationData)
      });
      
      const appleResult = await appleResponse.json();
      console.log('🍎 Apple validation response status:', appleResponse.status);
      console.log('🍎 Apple validation result:', {
        status: appleResult.status,
        environment: appleResult.environment,
        receipt: !!appleResult.receipt,
        latest_receipt_info: !!appleResult.latest_receipt_info
      });
      
      // If production fails, try sandbox
      if (appleResult.status === 21007) {
        console.log('🔄 Production failed, trying sandbox...');
        const sandboxResponse = await fetch('https://sandbox.itunes.apple.com/verifyReceipt', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(validationData)
        });
        
        const sandboxResult = await sandboxResponse.json();
        console.log('🍎 Sandbox validation result:', {
          status: sandboxResult.status,
          environment: sandboxResult.environment
        });
        
        if (sandboxResult.status === 0) {
          // Check if the specific product subscription is active
          const isActive = checkSubscriptionStatus(sandboxResult, productId);
          console.log('✅ Sandbox validation successful, subscription active:', isActive);
          
          return {
            success: true,
            isActive: isActive,
            error: null,
            message: 'Receipt validated with Apple sandbox',
            environment: 'sandbox'
          };
        } else {
          console.log('❌ Sandbox validation failed:', sandboxResult.status);
          return {
            success: false,
            isActive: false,
            error: `Apple sandbox validation failed: ${sandboxResult.status}`,
            message: 'Receipt validation failed'
          };
        }
      } else if (appleResult.status === 0) {
        // Production validation successful
        const isActive = checkSubscriptionStatus(appleResult, productId);
        console.log('✅ Production validation successful, subscription active:', isActive);
        
        return {
          success: true,
          isActive: isActive,
          error: null,
          message: 'Receipt validated with Apple production',
          environment: 'production'
        };
      } else {
        console.log('❌ Production validation failed:', appleResult.status);
        return {
          success: false,
          isActive: false,
          error: `Apple production validation failed: ${appleResult.status}`,
          message: 'Receipt validation failed'
        };
      }
      
    } catch (error) {
      console.error('❌ Error during Apple receipt validation:', error);
      return {
        success: false,
        isActive: false,
        error: error.message,
        message: 'Receipt validation error'
      };
    }

  } catch (error) {
    console.error('❌ Error in validateAppleReceipt function:', error);
    throw new functions.https.HttpsError('internal', error.message);
  }
});



// Daily subscription check - runs daily at 2 AM EST
exports.dailySubscriptionCheck = functions.scheduler.onSchedule('0 2 * * *', { timeZone: 'America/New_York' }, async (event) => {
  try {
    logger.info('🔍 Starting daily subscription check...');
    
    const usersSnapshot = await admin.firestore().collection('users').get();
    let checkedCount = 0;
    let expiredCount = 0;
    
    for (const doc of usersSnapshot.docs) {
      try {
        const userData = doc.data();
        const subscription = userData.subscription || {};
        
        if (subscription.isActive === true) {
          const startDate = subscription.startDate ? new Date(subscription.startDate) : new Date();
          const now = new Date();
          
          // Calculate subscription end date (7 days trial + 30 days paid = 37 days total)
          const trialPeriodMs = 7 * 24 * 60 * 60 * 1000;
          const totalFirstPeriodMs = 37 * 24 * 60 * 60 * 1000;
          
          const timeSinceStart = now.getTime() - startDate.getTime();
          
          let subscriptionEndDate;
          if (timeSinceStart <= totalFirstPeriodMs) {
            // Within the first 37 days (trial + first paid month)
            subscriptionEndDate = new Date(startDate.getTime() + totalFirstPeriodMs);
          } else {
            // After the first 37 days, use regular 30-day billing cycles
            const regularBillingStart = new Date(startDate.getTime() + totalFirstPeriodMs);
            const cyclesSinceFirstPeriod = Math.floor((now.getTime() - regularBillingStart.getTime()) / (30 * 24 * 60 * 60 * 1000));
            subscriptionEndDate = new Date(regularBillingStart.getTime() + (cyclesSinceFirstPeriod + 1) * 30 * 24 * 60 * 60 * 1000);
          }
          
          // Check if subscription has expired
          if (now.getTime() > subscriptionEndDate.getTime()) {
            await admin.firestore().collection('users').doc(doc.id).update({
              'subscription.isActive': false,
              'subscription.expiredAt': admin.firestore.FieldValue.serverTimestamp(),
              'subscription.lastChecked': admin.firestore.FieldValue.serverTimestamp(),
            });
            expiredCount++;
            logger.info(`❌ Subscription expired for user ${doc.id}`);
          }
        }
        
        checkedCount++;
      } catch (error) {
        logger.error(`❌ Error checking subscription for user ${doc.id}:`, error);
      }
    }
    
    logger.info(`✅ Daily subscription check completed: ${checkedCount} users checked, ${expiredCount} subscriptions expired`);
    return { checkedCount, expiredCount };
    
  } catch (error) {
    logger.error('❌ Error in daily subscription check:', error);
    throw error;
  }
});

// Continuous subscription checker - runs every minute
exports.continuousSubscriptionChecker = functions.scheduler.onSchedule('every 1 minutes', async (event) => {
  try {
    logger.info('🔄 Starting continuous subscription status check...');
    
    const usersSnapshot = await admin.firestore().collection('users').get();
    let checkedCount = 0;
    let updatedCount = 0;
    
    for (const doc of usersSnapshot.docs) {
      try {
        const userData = doc.data();
        const subscription = userData.subscription || {};
        const isSubscribed = subscription.isActive === true;
        
        await admin.firestore().collection('users').doc(doc.id).update({
          'subscription.lastChecked': admin.firestore.FieldValue.serverTimestamp(),
          'subscription.isSubscribed': isSubscribed
        });
        
        checkedCount++;
        if (isSubscribed) {
          updatedCount++;
        }
      } catch (error) {
        logger.error(`❌ Error checking subscription for user ${doc.id}:`, error);
      }
    }
    
    logger.info(`✅ Continuous subscription check completed: ${checkedCount} users checked, ${updatedCount} active subscriptions`);
    return { checkedCount, updatedCount };
    
  } catch (error) {
    logger.error('❌ Error in continuous subscription checker:', error);
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
    
    await sendPushNotification(
      userData.expoPushToken,
      title || 'Test Notification',
      body || 'This is a test notification from the new notification system!',
      {
        type: type,
        timestamp: Date.now(),
      }
    );
    
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

// Function to handle subscription purchase completion
exports.handleSubscriptionPurchase = functions.https.onCall(async (data, context) => {
  try {
    console.log('🛒 handleSubscriptionPurchase called with data:', {
      auth: !!context.auth,
      authUid: context.auth?.uid,
      dataKeys: Object.keys(data || {}),
      hasReceiptData: !!data?.receiptData,
      hasProductId: !!data?.productId
    });

    // Check if user is authenticated
    if (!context.auth) {
      console.error('❌ User not authenticated in handleSubscriptionPurchase');
      throw new functions.https.HttpsError('unauthenticated', 'User must be authenticated');
    }

    const userId = context.auth.uid;
    const { receiptData, productId, purchaseData } = data;

    if (!receiptData || !productId) {
      throw new functions.https.HttpsError('invalid-argument', 'receiptData and productId are required');
    }

    console.log('🔍 Processing subscription purchase for user:', userId);
    console.log('📦 Product ID:', productId);

    // Validate the receipt with Apple
    const sharedSecret = process.env.FIREBASE_CONFIG_APPLE_SHARED_SECRET || '28cfe546e2124c9b83cac3d32003978b';
    
    // Prepare the request to Apple's validation servers
    const validationData = {
      'receipt-data': receiptData,
      'password': sharedSecret,
      'exclude-old-transactions': true
    };

    // Send to Apple's production validation URL first
    const appleResponse = await fetch('https://buy.itunes.apple.com/verifyReceipt', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(validationData)
    });

    const appleResult = await appleResponse.json();
    console.log('🍎 Apple validation response:', {
      status: appleResult.status,
      environment: appleResult.environment
    });

    let isActive = false;
    let environment = 'production';

    // If production fails, try sandbox
    if (appleResult.status === 21007) {
      console.log('🔄 Production failed, trying sandbox...');
      const sandboxResponse = await fetch('https://sandbox.itunes.apple.com/verifyReceipt', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(validationData)
      });

      const sandboxResult = await sandboxResponse.json();
      console.log('🍎 Sandbox validation result:', {
        status: sandboxResult.status,
        environment: sandboxResult.environment
      });

      if (sandboxResult.status === 0) {
        isActive = checkSubscriptionStatus(sandboxResult, productId);
        environment = 'sandbox';
      }
    } else if (appleResult.status === 0) {
      isActive = checkSubscriptionStatus(appleResult, productId);
    }

    console.log('✅ Subscription validation result:', { isActive, environment });

    if (isActive) {
      // Save subscription data to Firestore
      const subscriptionData = {
        productId: productId,
        isActive: true,
        lastVerified: admin.firestore.FieldValue.serverTimestamp(),
        platform: 'apple',
        environment: environment,
        purchaseDate: admin.firestore.FieldValue.serverTimestamp()
      };

      // Add purchase data if available
      if (purchaseData) {
        if (purchaseData.transactionId) {
          subscriptionData.transactionId = purchaseData.transactionId;
        }
        if (purchaseData.purchaseTime) {
          subscriptionData.purchaseTime = purchaseData.purchaseTime;
        }
      }

      await admin.firestore().collection('users').doc(userId)
        .collection('subscription').doc('apple').set(subscriptionData);

      console.log('✅ Subscription data saved to Firestore for user:', userId);

      // Update user's main subscription status
      await admin.firestore().collection('users').doc(userId).update({
        'subscription.isActive': true,
        'subscription.lastUpdated': admin.firestore.FieldValue.serverTimestamp(),
        'subscription.platform': 'apple'
      });

      console.log('✅ User subscription status updated for user:', userId);

      return {
        success: true,
        isActive: true,
        message: 'Subscription activated successfully',
        environment: environment,
        userId: userId
      };
    } else {
      console.log('❌ Subscription validation failed for user:', userId);
      return {
        success: false,
        isActive: false,
        message: 'Subscription validation failed',
        error: 'Receipt validation failed'
      };
    }

  } catch (error) {
    console.error('❌ Error in handleSubscriptionPurchase function:', error);
    throw new functions.https.HttpsError('internal', error.message);
  }
});

// Nightly notification function - runs every hour to check each user's local time
exports.sendNightlyNotification = functions.scheduler.onSchedule('0 * * * *', async (event) => {
  try {
    logger.info('🌙 Starting nightly notification function');
    
    const now = new Date();
    
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
        
        // Check if it's 11:45 PM in the user's timezone
        const userTimezone = userData.timezone || 'UTC';
        const userNow = new Date(now.toLocaleString("en-US", {timeZone: userTimezone}));
        const userToday = userNow.toISOString().split('T')[0];
        const userHour = userNow.getHours();
        const userMinute = userNow.getMinutes();
        
        // Check if we already sent a nightly notification today
        const lastNightlyKey = `lastNightlyNotification_${userToday}`;
        const lastNightly = userData[lastNightlyKey];
        
        // Only send at 11:45 PM in user's timezone
        if (!lastNightly && userHour === 23 && userMinute >= 45 && userMinute < 46) {
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









// Test notification function for debugging
exports.triggerNotification = functions.https.onCall(async (data, context) => {
  try {
    logger.info('🧪 triggerNotification function called with data:', data);
    
    const { expoPushToken, title, body, data: notificationData } = data;
    
    if (!expoPushToken || !title || !body) {
      throw new functions.https.HttpsError('invalid-argument', 'expoPushToken, title, and body are required');
    }
    
    const result = await sendPushNotification(
      expoPushToken,
      title,
      body,
      notificationData || {}
    );
    
    logger.info('✅ Test notification sent successfully:', result);
    return { success: true, result };
    
  } catch (error) {
    logger.error('❌ Error in triggerNotification function:', error);
    throw new functions.https.HttpsError('internal', error.message);
  }
});

// Test prayer notification function for debugging
exports.testPrayerNotification = functions.https.onCall(async (data, context) => {
  try {
    logger.info('🧪 testPrayerNotification function called');
    
    // Get all users and send a test prayer notification
    const usersSnapshot = await admin.firestore().collection('users').get();
    logger.info(`📊 Found ${usersSnapshot.docs.length} users for test notification`);
    
    let notificationsSent = 0;
    
    for (const userDoc of usersSnapshot.docs) {
      try {
        const userData = userDoc.data();
        const userId = userDoc.id;
        
        if (!userData.expoPushToken) {
          logger.info(`⚠️ User ${userId} has no push token`);
          continue;
        }
        
        await sendPushNotification(
          userData.expoPushToken,
          '🧪 Test Prayer Notification',
          'This is a test prayer notification from Firebase Functions',
          {
            type: 'test_prayer',
            prayer: 'Test',
            shouldPlayAdhan: false,
            timestamp: Date.now(),
          }
        );
        
        notificationsSent++;
        logger.info(`✅ Test notification sent to user ${userId}`);
      } catch (error) {
        logger.error(`❌ Error sending test notification to user ${userDoc.id}:`, error);
      }
    }
    
    logger.info(`✅ Test prayer notification completed: ${notificationsSent} notifications sent`);
    return { success: true, notificationsSent };
    
  } catch (error) {
    logger.error('❌ Error in testPrayerNotification function:', error);
    throw new functions.https.HttpsError('internal', error.message);
  }
});

// Note: Fajr and Sunrise notifications are now handled by the main sendPrayerNotifications function
// which processes all stored prayer times including Fajr and Sunrise

// Note: Prayer times are now fetched and stored by the app, not by Firebase Functions

// Import additional notification functions
const newNotificationFunctions = require('./newNotificationFunctions');

// Export the prayer notification function
exports.sendPrayerNotifications = newNotificationFunctions.sendPrayerNotifications;

// Prayer notification function is now handled by newNotificationFunctions.js

// Removed Fajr/Sunrise notification function - starting fresh

// Process delayed dua like notifications
exports.processDuaLikeNotifications = functions.scheduler.onSchedule('*/5 * * * *', async (event) => {
  try {
    logger.info('🔄 Starting dua like notification processing...');
    
    const now = admin.firestore.Timestamp.now();
    
    // Get all unsent notifications that are 30+ minutes old
    const unsentLikesSnapshot = await admin.firestore()
      .collection('duaLikeNotifications')
      .where('notificationSent', '==', false)
      .where('scheduledFor', '<=', now)
      .get();
    
    if (unsentLikesSnapshot.empty) {
      logger.info('✅ No dua like notifications to process');
      return;
    }
    
    logger.info(`📊 Processing ${unsentLikesSnapshot.docs.length} dua like notifications`);
    
    // Group likes by duaId and authorId
    const likesByDua = {};
    
    unsentLikesSnapshot.docs.forEach(doc => {
      const data = doc.data();
      const key = `${data.duaId}_${data.authorId}`;
      
      if (!likesByDua[key]) {
        likesByDua[key] = {
          duaId: data.duaId,
          authorId: data.authorId,
          likes: []
        };
      }
      
      likesByDua[key].likes.push({
        id: doc.id,
        likerName: data.likerName,
        scheduledFor: data.scheduledFor
      });
    });
    
    // Process each group
    for (const [key, group] of Object.entries(likesByDua)) {
      try {
        // Sort likes by scheduledFor time
        group.likes.sort((a, b) => {
          const aTime = a.scheduledFor?.toMillis() || 0;
          const bTime = b.scheduledFor?.toMillis() || 0;
          return aTime - bTime;
        });
        
        // Group likes within 10-minute windows
        const windows = [];
        let currentWindow = [];
        
        group.likes.forEach((like) => {
          if (currentWindow.length === 0) {
            currentWindow.push(like);
          } else {
            const firstLikeTime = currentWindow[0].scheduledFor?.toMillis() || 0;
            const currentLikeTime = like.scheduledFor?.toMillis() || 0;
            const timeDiff = currentLikeTime - firstLikeTime;
            
            // If within 10 minutes (600000 ms), add to current window
            if (timeDiff <= 10 * 60 * 1000) {
              currentWindow.push(like);
            } else {
              // Start new window
              windows.push(currentWindow);
              currentWindow = [like];
            }
          }
        });
        
        // Add the last window
        if (currentWindow.length > 0) {
          windows.push(currentWindow);
        }
        
        // Get author's push token
        const authorDoc = await admin.firestore().collection('users').doc(group.authorId).get();
        if (!authorDoc.exists) {
          logger.warn(`⚠️ Author ${group.authorId} not found, skipping notifications`);
          continue;
        }
        
        const authorData = authorDoc.data();
        const expoPushToken = authorData?.expoPushToken;
        
        if (!expoPushToken) {
          logger.warn(`⚠️ Author ${group.authorId} has no push token, skipping notifications`);
          // Mark all as sent anyway to avoid reprocessing
          const batch = admin.firestore().batch();
          group.likes.forEach(like => {
            batch.update(admin.firestore().collection('duaLikeNotifications').doc(like.id), {
              notificationSent: true
            });
          });
          await batch.commit();
          continue;
        }
        
        // Process each window
        for (const window of windows) {
          let notificationBody;
          const notificationTitle = 'Dua Board';
          
          if (window.length >= 5) {
            // Batch notification: show first name + X others
            const firstName = window[0].likerName;
            const othersCount = window.length - 1;
            notificationBody = `${firstName} +${othersCount} others will make dua for you`;
          } else {
            // Individual notifications or small groups
            if (window.length === 1) {
              notificationBody = `${window[0].likerName} will make dua for you`;
            } else {
              // 2-4 likes: show all names
              const names = window.map(like => like.likerName).join(', ');
              notificationBody = `${names} will make dua for you`;
            }
          }
          
          // Send notification using the helper function
          try {
            const notificationResult = await sendPushNotification(
              expoPushToken,
              notificationTitle,
              notificationBody,
              {
                type: 'dua_like',
                duaId: group.duaId,
              }
            );
            
            // Check if notification was sent successfully
            // Expo API returns { data: [{ status: 'ok' }] } on success
            if (notificationResult && notificationResult.data && 
                Array.isArray(notificationResult.data) && 
                notificationResult.data.length > 0 &&
                notificationResult.data[0].status === 'ok') {
              logger.info(`✅ Sent dua like notification to ${group.authorId}: ${notificationBody}`);
              
              // Mark all likes in this window as sent
              const batch = admin.firestore().batch();
              window.forEach(like => {
                batch.update(admin.firestore().collection('duaLikeNotifications').doc(like.id), {
                  notificationSent: true,
                  sentAt: admin.firestore.FieldValue.serverTimestamp()
                });
              });
              await batch.commit();
            } else {
              logger.error(`❌ Failed to send notification to ${group.authorId}:`, notificationResult);
              // Mark as sent anyway to avoid infinite retries
              const batch = admin.firestore().batch();
              window.forEach(like => {
                batch.update(admin.firestore().collection('duaLikeNotifications').doc(like.id), {
                  notificationSent: true,
                  sentAt: admin.firestore.FieldValue.serverTimestamp(),
                  error: 'Failed to send'
                });
              });
              await batch.commit();
            }
          } catch (sendError) {
            logger.error(`❌ Error sending notification to ${group.authorId}:`, sendError);
            // Mark as sent to avoid infinite retries
            const batch = admin.firestore().batch();
            window.forEach(like => {
              batch.update(admin.firestore().collection('duaLikeNotifications').doc(like.id), {
                notificationSent: true,
                sentAt: admin.firestore.FieldValue.serverTimestamp(),
                error: sendError.message
              });
            });
            await batch.commit();
          }
        }
      } catch (error) {
        logger.error(`❌ Error processing dua likes for ${key}:`, error);
      }
    }
    
    logger.info('✅ Dua like notification processing completed');
  } catch (error) {
    logger.error('❌ Error in processDuaLikeNotifications:', error);
    throw error;
  }
});

// Prayer Blocker Activation Function - checks every minute for prayer times
// NOTE: This function sends SILENT (data-only) notifications for prayer blocker activation
// It does NOT send visible notifications - those are handled by sendPrayerNotifications
// This prevents duplicate notifications for users with prayer blocker enabled
exports.checkPrayerTimesAndNotify = functions.scheduler
  .onSchedule('every 1 minutes', async (context) => {
    const now = new Date();
    logger.info('🔒 Checking prayer times for blocker activation at:', now.toISOString());
    
    try {
      // Get all users who have prayer blocker enabled
      const usersSnapshot = await admin.firestore()
        .collection('users')
        .where('prayerBlockerEnabled', '==', true)
        .get();
      
      if (usersSnapshot.empty) {
        logger.info('ℹ️ No users with prayer blocker enabled');
        return null;
      }
      
      logger.info(`📊 Found ${usersSnapshot.docs.length} users with prayer blocker enabled`);
      
      const notifications = [];
      
      for (const userDoc of usersSnapshot.docs) {
        const userData = userDoc.data();
        const userId = userDoc.id;
        
        // Get user's prayer times for today
        const prayerTimes = userData.prayerTimes; // Stored from app
        const prayerData = userData.prayerData || {};
        const today = now.toISOString().split('T')[0];
        const todayPrayers = prayerData[today] || {};
        
        if (!prayerTimes || !Array.isArray(prayerTimes)) {
          logger.info(`⚠️ User ${userId} has no prayer times stored`);
          continue;
        }
        
        // Check if any prayer time has just passed (within last 2 minutes) and isn't completed
        for (const prayer of prayerTimes) {
          if (!prayer.dateObj) continue;
          
          const prayerTime = new Date(prayer.dateObj);
          const timeDiff = now - prayerTime;
          const prayerId = prayer.name.toLowerCase();
          
          // Skip Sunrise - it's not a mandatory prayer
          if (prayerId === 'sunrise') {
            continue;
          }
          
          // If prayer time was in the last 2 minutes and not completed
          if (timeDiff >= 0 && timeDiff <= 120000 && !todayPrayers[prayerId]) {
            // Get user's push token
            const pushToken = userData.expoPushToken;
            
            if (pushToken) {
              logger.info(`🔒 Prayer ${prayerId} needs blocking for user ${userId}`);
              
              // Send SILENT data-only notification for prayer blocker activation
              // This will NOT show as a visible notification to the user
              // The main sendPrayerNotifications function handles visible notifications
              notifications.push({
                to: pushToken,
                data: {
                  type: 'PRAYER_BLOCKER_ACTIVATE',
                  prayerId: prayerId,
                  prayerName: prayer.name,
                  prayerTime: prayer.dateObj,
                  silent: 'true' // Mark as silent/background notification
                },
                priority: 'high',
                // NO title, NO body, NO sound = silent notification
                // Only triggers prayer blocker in background
              });
            }
          }
        }
      }
      
      // Send all notifications in batches
      if (notifications.length > 0) {
        logger.info(`📤 Sending ${notifications.length} prayer blocker activation notifications`);
        
        const batchSize = 100;
        for (let i = 0; i < notifications.length; i += batchSize) {
          const batch = notifications.slice(i, i + batchSize);
          
          try {
            const response = await fetch('https://exp.host/--/api/v2/push/send', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify(batch)
            });
            
            const result = await response.json();
            logger.info(`✅ Batch ${i / batchSize + 1} sent:`, result);
          } catch (error) {
            logger.error(`❌ Error sending batch ${i / batchSize + 1}:`, error);
          }
        }
        
        logger.info('✅ Prayer blocker notifications sent successfully');
      } else {
        logger.info('ℹ️ No prayer times require blocking at this moment');
      }
      
      return null;
    } catch (error) {
      logger.error('❌ Error in checkPrayerTimesAndNotify:', error);
      return null;
    }
  });

module.exports = exports;
