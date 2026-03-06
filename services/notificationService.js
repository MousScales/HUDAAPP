import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { firestore, auth } from '../firebase';
import { doc, getDoc, setDoc, Timestamp } from 'firebase/firestore';
import expoPushService from './expoPushService';
import { serverTimestamp } from 'firebase/firestore';
import { getNotificationTitle, getCurrentLanguage } from '../utils/translations';

// Configure notification behavior
Notifications.setNotificationHandler({
  handleNotification: async (notification) => {
    console.log('🔔 NotificationService: Notification handler called', notification.request.content.data);
    
    // Check if this is a prayer notification that should play adhan
    const shouldPlayAdhan = notification.request.content.data?.shouldPlayAdhan;
    const notificationType = notification.request.content.data?.type;
    
    return {
      shouldShowAlert: true,
      shouldPlaySound: shouldPlayAdhan ? false : true, // Don't play default sound if we'll play adhan
      shouldSetBadge: false,
    };
  },
});

class NotificationService {
  constructor() {
    this.isInitialized = false;
    this.lastNotificationTime = 0;
    this.notificationPermissionStatus = null;
    
    // Initialize the service
    this.initialize();
  }

  // Initialize notification service
  async initialize() {
    try {
      if (this.isInitialized) {
        return;
      }

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
        console.log('❌ NotificationService: Notification permission not granted');
        this.notificationPermissionStatus = 'denied';
        return;
      }

      // Initialize Expo push service
      await expoPushService.initialize();

      this.notificationPermissionStatus = 'granted';
      this.isInitialized = true;
      console.log('✅ NotificationService: Initialized successfully with push notifications');
      
      // Schedule the daily 11:45 PM notification
      await this.scheduleDailyNightNotification();
      
      // Sync prayer notification settings to Firebase
      await this.syncPrayerNotificationSettings();
    } catch (error) {
      console.error('❌ NotificationService: Initialization error:', error);
    }
  }

  // Handle notification received
  async handleNotificationReceived(notification) {
    try {
      const { data } = notification.request.content;
      console.log('📬 NotificationService: Notification received with data:', data);
      
      if (data?.type === 'prayer_time') {
        console.log('📬 NotificationService: Prayer time notification received');
        // Adhan now plays through notification sound, not in-app audio
        // Handle prayer notification
      } else if (data?.type === 'prayer_reminder') {
        console.log('📬 NotificationService: Prayer reminder notification received');
        
        // Don't play adhan for reminders, just show notification
        // Handle prayer reminder
      } else if (data?.type === 'streak_warning') {
        console.log('📬 NotificationService: Streak warning received');
        // Handle streak warning
      } else if (data?.type === 'encouragement') {
        console.log('📬 NotificationService: Encouragement received');
        // Handle encouragement

      } else if (data?.type === 'daily_night') {
        console.log('📬 NotificationService: Daily night reminder received');
        // Handle daily night reminder
      }
    } catch (error) {
      console.error('❌ NotificationService: Error handling notification:', error);
    }
  }

  // Check if notifications are enabled in settings
  async areNotificationsEnabled() {
    try {
      const settings = await AsyncStorage.getItem('adhanSettings');
      if (settings) {
        const parsedSettings = JSON.parse(settings);
        return parsedSettings.notificationsEnabled !== false; // Default to true
      }
      return true; // Default to enabled
    } catch (error) {
      console.error('❌ NotificationService: Error checking notification settings:', error);
      return true;
    }
  }

  // Check if adhan audio is enabled
  async isAdhanAudioEnabled() {
    try {
      const settings = await AsyncStorage.getItem('adhanSettings');
      if (settings) {
        const parsedSettings = JSON.parse(settings);
        return parsedSettings.adhanAudioEnabled !== false; // Default to true
      }
      return true; // Default to enabled
    } catch (error) {
      console.error('❌ NotificationService: Error checking adhan audio settings:', error);
      return true;
    }
  }

  // Schedule prayer notifications (now handled by Firebase Functions)
  async schedulePrayerNotifications(prayerTimes) {
    try {
      console.log('📅 NotificationService: Prayer notifications now handled by Firebase Functions');
      console.log('📅 Local scheduling disabled - notifications will be sent from server');
      
      // Store prayer times in Firebase for server-side processing
      const user = auth.currentUser;
      if (user) {
        // Get user's timezone
        const userTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
        
        await setDoc(doc(firestore, 'users', user.uid), {
          prayerTimes: prayerTimes.map(prayer => ({
            name: prayer.name,
            time: prayer.dateObj ? Timestamp.fromDate(prayer.dateObj) : null, // Store as Firestore timestamp
            timeString: prayer.time, // Store the formatted time string (e.g., "4:54 PM") for display
            enabled: true
          })),
          timezone: userTimezone,
          lastPrayerTimesUpdate: serverTimestamp(),
        }, { merge: true });
        
        console.log('✅ Prayer times saved to Firebase for server-side processing');
      }
      
      return true;
    } catch (error) {
      console.error('❌ NotificationService: Error saving prayer times to Firebase:', error);
      return false;
    }
  }

  // Schedule daily 11:45 PM notification (now handled by Firebase Functions)
  async scheduleDailyNightNotification() {
    try {
      console.log('📅 NotificationService: Daily night notification now handled by Firebase Functions');
      console.log('📅 Local scheduling disabled - notification will be sent from server at 11:45 PM');
      
      // Store user preference in Firebase for server-side processing
      const user = auth.currentUser;
      if (user) {
        await setDoc(doc(firestore, 'users', user.uid), {
          dailyNightNotification: true,
          lastNotificationSettingsUpdate: serverTimestamp(),
        }, { merge: true });
        
        console.log('✅ Daily night notification preference saved to Firebase');
      }
      
      return true;
    } catch (error) {
      console.error('❌ NotificationService: Error scheduling daily night notification:', error);
      return false;
    }
  }

  // Schedule time-sensitive notifications (now handled by Firebase Functions)
  async scheduleTimeSensitiveNotifications(prayerTimes) {
    try {
      console.log('📅 NotificationService: Time-sensitive notifications now handled by Firebase Functions');
      console.log('📅 Local scheduling disabled - notifications managed by server');
      
      // Store prayer times in Firebase for server-side processing
      await this.schedulePrayerNotifications(prayerTimes);
      
      console.log('✅ NotificationService: Prayer times saved to Firebase for server-side processing');
    } catch (error) {
      console.error('❌ NotificationService: Error with time-sensitive notifications:', error);
    }
  }

  // Schedule prayer notifications for week (now handled by Firebase Functions)
  async schedulePrayerNotificationsForWeek(prayerTimes) {
    return await this.schedulePrayerNotifications(prayerTimes);
  }

  // Force refresh notifications (now handled by Firebase Functions)
  async forceRefreshNotifications(prayerTimes) {
    try {
      console.log('📅 NotificationService: Force refreshing prayer notifications');
      await this.schedulePrayerNotifications(prayerTimes);
      console.log('✅ NotificationService: Force refresh completed');
    } catch (error) {
      console.error('❌ NotificationService: Error force refreshing notifications:', error);
    }
  }

  // Cancel all prayer notifications (now handled by Firebase Functions)
  cancelPrayerNotifications() {
    try {
      console.log('🗑️ NotificationService: Prayer notifications now handled by Firebase Functions');
      console.log('🗑️ Local cancellation disabled - notifications managed by server');
    } catch (error) {
      console.error('❌ NotificationService: Error cancelling notifications:', error);
    }
  }

  // Send prayer notification using push notifications
  async sendPrayerNotification(prayer) {
    try {
      console.log(`🕌 NotificationService: Sending ${prayer} prayer notification`);
      
      if (!(await this.areNotificationsEnabled())) {
        console.log('🔕 NotificationService: Notifications disabled in settings');
        return false;
      }

      // Use push notification service
      await expoPushService.sendPrayerNotification(prayer);
      console.log('✅ Prayer notification sent via push');
      return true;
    } catch (error) {
      console.error('❌ NotificationService: Error sending prayer notification:', error);
      return false;
    }
  }

  // Send prayer reminder notification (5 minutes before prayer time)
  async sendPrayerReminderNotification(prayer) {
    try {
      const adhanEnabled = await this.isAdhanAudioEnabled();
      
      // Use push notification instead of local notification
      await expoPushService.sendPushNotification(
        await this.getUserPushToken(),
        `${prayer.name} Prayer Coming Up`,
        `5 minutes to ${prayer.name}`,
        {
            prayerId: prayer.id,
            prayerName: prayer.name,
          type: 'prayer_reminder',
            timestamp: Date.now(),
            adhanEnabled: adhanEnabled,
        }
      );
      
      console.log(`✅ NotificationService: ${prayer.name} reminder push notification sent`);
    } catch (error) {
      console.error('❌ NotificationService: Error sending prayer reminder notification:', error);
    }
  }

  // Send streak warning notification (now handled by Firebase Functions)
  async sendStreakWarningNotification(streak) {
    try {
      console.log('📅 NotificationService: Streak warnings now handled by Firebase Functions');
      console.log('📅 Local streak warnings disabled - notifications managed by server');
      return true;
    } catch (error) {
      console.error('❌ NotificationService: Streak warning notification error:', error);
      return false;
    }
  }

  // Send encouragement notification (now handled by Firebase Functions)
  async sendEncouragementNotification(daysWithoutStreak) {
    try {
      console.log('📅 NotificationService: Encouragement notifications now handled by Firebase Functions');
      console.log('📅 Local encouragement disabled - notifications managed by server');
      return true;
    } catch (error) {
      console.error('❌ NotificationService: Encouragement notification error:', error);
      return false;
    }
  }



  // Save user settings (including notification preferences) to Firestore
  async saveUserSettings(settings) {
    try {
      const user = auth.currentUser;
      if (!user) {
        await AsyncStorage.setItem('userSettings', JSON.stringify(settings));
        return true;
      }
      const userDocRef = doc(firestore, 'users', user.uid, 'settings', 'preferences');
      await setDoc(userDocRef, settings, { merge: true });
      await AsyncStorage.setItem('userSettings', JSON.stringify(settings));
      return true;
    } catch (error) {
      console.error('❌ NotificationService: Error saving user settings:', error);
      await AsyncStorage.setItem('userSettings', JSON.stringify(settings));
      return false;
    }
  }

  // Load user settings (including notification preferences) from Firestore
  async getUserSettings() {
    try {
      const user = auth.currentUser;
      if (!user) {
        const local = await AsyncStorage.getItem('userSettings');
        return local ? JSON.parse(local) : {};
      }
      const userDocRef = doc(firestore, 'users', user.uid, 'settings', 'preferences');
      const docSnap = await getDoc(userDocRef);
      if (docSnap.exists()) {
        const data = docSnap.data();
        await AsyncStorage.setItem('userSettings', JSON.stringify(data));
        return data;
      } else {
        const local = await AsyncStorage.getItem('userSettings');
        return local ? JSON.parse(local) : {};
      }
    } catch (error) {
      console.error('❌ NotificationService: Error loading user settings:', error);
      const local = await AsyncStorage.getItem('userSettings');
      return local ? JSON.parse(local) : {};
    }
  }

  // Update notification settings logic to use Firestore as primary source
  async getNotificationSettings() {
    try {
      const settings = await this.getUserSettings();
      if (settings && settings.adhanSettings) {
        return settings.adhanSettings;
      }
      // Default settings
      return {
        notificationsEnabled: true,
        adhanAudioEnabled: true,
      };
    } catch (error) {
      console.error('❌ NotificationService: Error getting notification settings:', error);
      return {
        notificationsEnabled: true,
        adhanAudioEnabled: true,
      };
    }
  }

  async saveNotificationSettings(adhanSettings) {
    try {
      const settings = await this.getUserSettings();
      const newSettings = { ...settings, adhanSettings };
      await this.saveUserSettings(newSettings);
      console.log('✅ NotificationService: Settings saved', newSettings);
    } catch (error) {
      console.error('❌ NotificationService: Error saving notification settings:', error);
    }
  }

  // Setup notification listeners
  setupNotificationListeners() {
    // Handle notification received in foreground
    Notifications.addNotificationReceivedListener(async (notification) => {
      console.log('📬 NotificationService: Notification received in foreground');
      this.handleNotificationReceived(notification);
    });

    // Handle notification tap/dismiss and background notifications
    Notifications.addNotificationResponseReceivedListener(async (response) => {
      console.log('👆 NotificationService: Notification response received (tap/dismiss/background)');
      const { data } = response.notification.request.content;
      
      // Handle the notification normally (adhan now plays through notification sound)
      this.handleNotificationReceived(response.notification);
    });

    console.log('✅ NotificationService: Notification listeners set up');
  }

  // Test notification (legacy - kept for compatibility)
  async testNotification() {
    try {
      console.log('🧪 NotificationService: Test notifications now handled by Firebase Functions');
      console.log('🧪 Use testServerNotification() or testDelayedServerNotification() instead');
      return await this.testServerNotification();
    } catch (error) {
      console.error('❌ NotificationService: Test notification error:', error);
      return false;
    }
  }

  // Debug push notification setup
  async debugPushNotificationSetup() {
    try {
      console.log('🔍 NotificationService: Debugging push notification setup...');
      
      // Check if initialized
      console.log('📋 Is initialized:', this.isInitialized);
      
      // Check permissions
      const { status } = await Notifications.getPermissionsAsync();
      console.log('📋 Permission status:', status);
      
      // Check if device
      console.log('📋 Is device:', Device.isDevice);
      
      // Check push token
      const pushToken = await expoPushService.getPushToken();
      console.log('📋 Push token available:', !!pushToken);
      if (pushToken) {
        console.log('📋 Push token:', pushToken.substring(0, 20) + '...');
      }
      
      // Check notification settings
      const notificationsEnabled = await this.areNotificationsEnabled();
      console.log('📋 Notifications enabled:', notificationsEnabled);
      
      // Check adhan settings
      const adhanEnabled = await this.isAdhanAudioEnabled();
      console.log('📋 Adhan enabled:', adhanEnabled);
      
      // Check if app is in foreground/background
      const appState = await Notifications.getLastNotificationResponseAsync();
      console.log('📋 Last notification response:', appState);
      
      return {
        isInitialized: this.isInitialized,
        permissionStatus: status,
        isDevice: Device.isDevice,
        hasPushToken: !!pushToken,
        notificationsEnabled,
        adhanEnabled
      };
    } catch (error) {
      console.error('❌ NotificationService: Error debugging setup:', error);
      return null;
    }
  }

  // Sync prayer notification settings to Firebase
  async syncPrayerNotificationSettings() {
    try {
      const user = auth.currentUser;
      if (!user) return;
      
      // Get prayer notification settings from AsyncStorage
      const storedSettings = await AsyncStorage.getItem('prayerNotifications');
      if (!storedSettings) return;
      
      const prayerSettings = JSON.parse(storedSettings);
      
      // Save to Firebase for server-side processing
      await setDoc(doc(firestore, 'users', user.uid), {
        prayerNotificationSettings: prayerSettings,
        lastPrayerSettingsUpdate: serverTimestamp(),
      }, { merge: true });
      
      console.log('✅ Prayer notification settings synced to Firebase:', prayerSettings);
    } catch (error) {
      console.error('❌ Error syncing prayer notification settings:', error);
    }
  }

  // Force refresh push token to ensure notifications work even when app hasn't been opened
  async forceRefreshPushToken() {
    try {
      console.log('🔄 NotificationService: Force refreshing push token...');
      
      // Force refresh the push token
      const success = await expoPushService.forceRefreshPushToken();
      
      if (success) {
        console.log('✅ NotificationService: Push token refreshed successfully');
        return true;
      } else {
        console.log('❌ NotificationService: Failed to refresh push token');
        return false;
      }
    } catch (error) {
      console.error('❌ NotificationService: Error refreshing push token:', error);
      return false;
    }
  }

  // Check for stale tokens and refresh them
  async checkAndRefreshStaleTokens() {
    try {
      console.log('🔍 NotificationService: Checking for stale tokens...');
      
      const user = auth.currentUser;
      if (!user) {
        console.log('⚠️ No authenticated user, skipping stale token check');
        return false;
      }
      
      // Check if token is marked as stale in Firebase
      const userDocRef = doc(firestore, 'users', user.uid);
      const userDoc = await getDoc(userDocRef);
      
      if (userDoc.exists()) {
        const userData = userDoc.data();
        
        if (userData.pushTokenStale) {
          console.log('🔄 Token marked as stale, refreshing...');
          
          // Refresh the token
          const refreshSuccess = await this.forceRefreshPushToken();
          
          if (refreshSuccess) {
            // Clear the stale flag
            await setDoc(userDocRef, {
              pushTokenStale: false,
              lastTokenError: null,
              lastTokenErrorTime: null,
              tokenRefreshedAt: serverTimestamp(),
            }, { merge: true });
            
            console.log('✅ Stale token refreshed and flag cleared');
            return true;
          } else {
            console.log('❌ Failed to refresh stale token');
            return false;
          }
        } else {
          console.log('✅ Token is not marked as stale');
          return true;
        }
      }
      
      return false;
    } catch (error) {
      console.error('❌ NotificationService: Error checking stale tokens:', error);
      return false;
    }
  }

  // Test delayed server notification (Firebase Functions)
  async testDelayedServerNotification(delaySeconds = 30) {
    try {
      console.log(`🧪 NotificationService: Testing delayed server notification (${delaySeconds}s)...`);
      
      const user = auth.currentUser;
      if (!user) {
        console.log('❌ No authenticated user');
        return false;
      }
      
      // Call Firebase Function to send delayed test notification
      const response = await fetch('https://us-central1-locked-dd553.cloudfunctions.net/triggerDelayedNotification', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId: user.uid,
          delaySeconds: delaySeconds,
        }),
      });
      
      const result = await response.json();
      console.log('📤 Delayed server notification result:', result);
      
      if (result.success) {
        console.log(`✅ Delayed server notification scheduled for ${delaySeconds} seconds`);
        return true;
      } else {
        console.log('❌ Delayed server notification failed:', result.error);
        return false;
      }
    } catch (error) {
      console.error('❌ NotificationService: Error testing delayed server notification:', error);
      return false;
    }
  }

  // Test server-side notification (Firebase Functions)
  async testServerNotification() {
    try {
      console.log('🧪 NotificationService: Testing server-side notification...');
      
      const user = auth.currentUser;
      if (!user) {
        console.log('❌ No authenticated user');
        return false;
      }
      
      // Call Firebase Function to send test notification
      const currentLanguage = await getCurrentLanguage();
      const response = await fetch('https://triggernotification-isxr3q2yhq-uc.a.run.app', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId: user.uid,
          type: 'test',
          title: getNotificationTitle('testServerNotification', currentLanguage),
          body: getNotificationTitle('testServerNotificationBody', currentLanguage),
          data: {
            type: 'test_server',
            timestamp: Date.now(),
          }
        }),
      });
      
      const result = await response.json();
      console.log('📤 Server notification result:', result);
      
      if (result.success) {
        console.log('✅ Server-side notification sent successfully');
        return true;
      } else {
        console.log('❌ Server-side notification failed:', result.error);
        return false;
      }
    } catch (error) {
      console.error('❌ NotificationService: Error testing server notification:', error);
      return false;
    }
  }



  // Test push notification
  async testPushNotification() {
    try {
      console.log('🧪 NotificationService: Sending test push notification...');
      
      // Debug setup first
      const debugInfo = await this.debugPushNotificationSetup();
      console.log('🔍 Debug info:', debugInfo);
      
      if (!debugInfo?.hasPushToken) {
        console.log('❌ No push token available for test');
        return false;
      }
      
      if (debugInfo?.permissionStatus !== 'granted') {
        console.log('❌ Notification permissions not granted');
        return false;
      }
      
      if (!debugInfo?.isDevice) {
        console.log('❌ Not running on a physical device');
        return false;
      }
      
      const currentLanguage = await getCurrentLanguage();
      const title = getNotificationTitle('testNotification', currentLanguage);
      const body = getNotificationTitle('testNotificationBody', currentLanguage);
      
      console.log('📤 Sending push notification to Expo servers...');
      const result = await expoPushService.sendPushNotification(
        await expoPushService.getPushToken(),
        title,
        body,
        {
          type: 'test',
          timestamp: Date.now(),
        }
      );
      
      console.log('📤 Push notification result:', result);
      
      if (result?.data?.status === 'ok') {
        console.log('✅ NotificationService: Test push notification sent successfully to Expo servers');
        console.log('📱 Check your device for the notification. If not received, check:');
        console.log('   1. Device notification settings (Settings > Notifications > Hudā)');
        console.log('   2. Do Not Disturb mode is off');
        console.log('   3. App is not in foreground (minimize it)');
        console.log('   4. Wait 1-2 minutes for delivery');
        return true;
      } else {
        console.log('❌ Push notification failed:', result);
        return false;
      }
    } catch (error) {
      console.error('❌ NotificationService: Error sending test push notification:', error);
      return false;
    }
  }



  // Clean up resources (now handled by Firebase Functions)
  async cleanup() {
    try {
      console.log('🧹 NotificationService: Cleanup completed - notifications now handled by Firebase Functions');
    } catch (error) {
      console.error('❌ NotificationService: Cleanup error:', error);
    }
  }

  // Get user's push token from Firebase
  async getUserPushToken() {
    try {
      const user = auth.currentUser;
      if (!user) return null;

      const userDoc = await getDoc(doc(firestore, 'users', user.uid));
      const userData = userDoc.data();
      
      return userData?.expoPushToken || null;
    } catch (error) {
      console.error('❌ Error getting user push token:', error);
      return null;
    }
  }


}

// Create singleton instance
const notificationService = new NotificationService();

export default notificationService;
