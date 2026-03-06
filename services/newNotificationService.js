import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { firestore, auth } from '../firebase';
import { doc, getDoc, setDoc, updateDoc, serverTimestamp, deleteField, Timestamp } from 'firebase/firestore';
import { getNotificationTitle, getCurrentLanguage } from '../utils/translations';

// Configure notification behavior
Notifications.setNotificationHandler({
  handleNotification: async (notification) => {
    console.log('🔔 NewNotificationService: Notification received', notification.request.content.data);
    
    const data = notification.request.content.data;
    const shouldPlayAdhan = data?.shouldPlayAdhan;
    const notificationType = data?.type;
    
    return {
      shouldShowAlert: true,
      shouldPlaySound: shouldPlayAdhan ? false : true, // Don't play default sound if we'll play adhan
      shouldSetBadge: false,
    };
  },
});

class NewNotificationService {
  constructor() {
    this.isInitialized = false;
    this.expoPushToken = null;
    this.notificationPermissionStatus = null;
    this.userId = null;
    
    // Initialize the service
    this.initialize();
  }

  // Initialize notification service
  async initialize() {
    try {
      if (this.isInitialized) {
        return;
      }

      console.log('🚀 NewNotificationService: Initializing...');
      console.log('📱 Platform:', Platform.OS);

      // On Android, add extra delay to ensure Firebase is fully initialized
      if (Platform.OS === 'android') {
        console.log('⏳ Android: Waiting for Firebase initialization...');
        await new Promise(resolve => setTimeout(resolve, 5000)); // 5 second initial delay for Firebase
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
        console.log('❌ NewNotificationService: Notification permission not granted');
        this.notificationPermissionStatus = 'denied';
        return;
      }

      // Get Expo push token
      this.expoPushToken = await this.getExpoPushToken();
      
      if (!this.expoPushToken) {
        console.log('❌ NewNotificationService: Failed to get Expo push token');
        return;
      }

      this.notificationPermissionStatus = 'granted';
      this.isInitialized = true;
      console.log('✅ NewNotificationService: Initialized successfully');
      
      // Setup notification listeners
      this.setupNotificationListeners();
      
      // Save push token to Firebase
      await this.savePushTokenToFirebase();
      
    } catch (error) {
      console.error('❌ NewNotificationService: Initialization error:', error);
      console.error('   Platform:', Platform.OS);
      console.error('   Error message:', error.message);
    }
  }

  // Get Expo push token
  async getExpoPushToken() {
    try {
      if (!Device.isDevice) {
        console.log('⚠️ NewNotificationService: Not running on a device, using simulator token');
        return 'ExponentPushToken[simulator]';
      }

      // On Android, ensure Firebase is initialized before getting token
      if (Platform.OS === 'android') {
        // Wait for Firebase to be fully initialized
        // Firebase initialization happens in MainApplication.kt, but we need to wait
        // Add longer initial delay to give Firebase time to initialize
        await new Promise(resolve => setTimeout(resolve, 3000));
        
        let retries = 0;
        const maxRetries = 15;
        
        while (retries < maxRetries) {
          try {
            // Try to get the token
            const token = await Notifications.getExpoPushTokenAsync({
              projectId: '06fc807b-d01f-45d3-92e3-965e851cbb48',
            });
            
            console.log('✅ NewNotificationService: Expo push token obtained on Android:', token.data);
            console.log('📱 Platform:', Platform.OS);
            return token.data;
          } catch (error) {
            // If Firebase not initialized error, wait and retry
            if (error.message?.includes('FirebaseApp') || 
                error.message?.includes('not initialized') ||
                error.message?.includes('Firebase')) {
              retries++;
              const delay = Math.min(retries * 1500, 5000); // Max 5 seconds delay, longer waits
              if (retries < maxRetries) {
                console.log(`🔄 Android: Firebase not ready (attempt ${retries}/${maxRetries}), retrying in ${delay}ms...`);
                console.log(`   Error: ${error.message}`);
                await new Promise(resolve => setTimeout(resolve, delay));
                continue;
              } else {
                console.error('❌ NewNotificationService: Firebase not initialized after all retries');
                console.error('   This usually means google-services.json is missing or Firebase is not properly configured');
                console.error('   Make sure to rebuild the app after adding google-services.json');
                // Don't throw, just return null so app can continue
                return null;
              }
            } else {
              // Other errors, throw immediately
              console.error('❌ NewNotificationService: Unexpected error getting push token:', error);
              throw error;
            }
          }
        }
      } else {
        // iOS - no special handling needed
        const token = await Notifications.getExpoPushTokenAsync({
          projectId: '06fc807b-d01f-45d3-92e3-965e851cbb48',
        });
        
        console.log('📱 NewNotificationService: Expo push token obtained:', token.data);
        return token.data;
      }
    } catch (error) {
      console.error('❌ NewNotificationService: Error getting Expo push token:', error);
      console.error('❌ Error details:', {
        code: error.code,
        message: error.message,
        platform: Platform.OS
      });
      return null;
    }
  }

  // Save push token to Firebase
  // First clears the old token, then saves the new one to prevent duplicate notifications
  async savePushTokenToFirebase() {
    try {
      const user = auth.currentUser;
      if (!user) {
        console.log('⚠️ NewNotificationService: No authenticated user, skipping Firebase save');
        return;
      }

      this.userId = user.uid;
      
      const userDocRef = doc(firestore, 'users', user.uid);
      
      // First, clear the old push token to prevent duplicate notifications
      // This ensures that when users switch accounts or reopen the app, old tokens are removed
      await updateDoc(userDocRef, {
        expoPushToken: deleteField(),
      });
      
      console.log('🔄 NewNotificationService: Old push token cleared');
      
      // Small delay to ensure the delete operation completes
      await new Promise(resolve => setTimeout(resolve, 100));
      
      // Now save the new push token
      await updateDoc(userDocRef, {
        expoPushToken: this.expoPushToken,
        lastTokenUpdate: new Date().toISOString(),
      });
      
      console.log('✅ NewNotificationService: New push token saved to Firebase');
    } catch (error) {
      console.error('❌ NewNotificationService: Error saving push token to Firebase:', error);
    }
  }

  // Setup notification listeners
  setupNotificationListeners() {
    // Handle notification received while app is running
    Notifications.addNotificationReceivedListener((notification) => {
      console.log('📬 NewNotificationService: Notification received while app running:', notification);
      this.handleNotificationReceived(notification);
    });

    // Handle notification response (when user taps notification)
    Notifications.addNotificationResponseReceivedListener((response) => {
      console.log('👆 NewNotificationService: Notification response received:', response);
      this.handleNotificationResponse(response);
    });
  }

  // Handle notification received
  async handleNotificationReceived(notification) {
    try {
      const { data } = notification.request.content;
      console.log('📬 NewNotificationService: Processing notification with data:', data);
      
      switch (data?.type) {
        case 'PRAYER_BLOCKER_ACTIVATE':
          console.log('🔒 NewNotificationService: Prayer blocker activation notification');
          // Activate prayer blocking immediately
          await this.activatePrayerBlocker(data);
          break;
          
        case 'prayer_time':
          console.log('🕌 NewNotificationService: Prayer time notification');
          // Handle prayer time notification
          break;
          
        case 'prayer_reminder':
          console.log('⏰ NewNotificationService: Prayer reminder notification');
          // Handle prayer reminder
          break;
          
        case 'prayer_delay_reminder':
          console.log('⚠️ NewNotificationService: Prayer delay reminder');
          // Handle delay reminder
          break;
          
        case 'streak_warning':
          console.log('🔥 NewNotificationService: Streak warning notification');
          // Handle streak warning
          break;
          
        case 'encouragement':
          console.log('💪 NewNotificationService: Encouragement notification');
          // Handle encouragement
          break;
          
        default:
          console.log('📬 NewNotificationService: Unknown notification type:', data?.type);
      }
    } catch (error) {
      console.error('❌ NewNotificationService: Error handling notification:', error);
    }
  }
  
  // Activate prayer blocker when notification is received
  async activatePrayerBlocker(data) {
    try {
      console.log('🔒 Activating prayer blocker for:', data.prayerName);
      
      // Dynamically import to avoid circular dependencies
      const prayerBlockerService = (await import('./prayerBlockerService')).default;
      
      // Check if prayer blocker is enabled
      const AsyncStorage = (await import('@react-native-async-storage/async-storage')).default;
      const isEnabled = await AsyncStorage.getItem('prayerBlockerEnabled');
      
      if (isEnabled !== 'true') {
        console.log('⚠️ Prayer blocker is disabled, skipping activation');
        return;
      }
      
      // Check authorization
      const isAuthorized = await prayerBlockerService.checkAuthorization();
      if (!isAuthorized) {
        console.log('⚠️ Prayer blocker not authorized, skipping activation');
        return;
      }
      
      // Store blocking info
      const { ExtensionStorage } = await import('@bacons/apple-targets');
      const storage = new ExtensionStorage('group.com.digaifounder.huda');
      const blockingInfo = {
        prayerId: data.prayerId,
        startTime: new Date(data.prayerTime).getTime(),
        isActive: true,
        unlockOnCompletion: true
      };
      storage.set('currentPrayerBlocking', JSON.stringify(blockingInfo));
      
      // Activate blocking immediately
      const { NativeModules } = await import('react-native');
      const { PrayerBlockerModule } = NativeModules;
      await PrayerBlockerModule.activateBlockingNow();
      
      console.log('✅ Prayer blocker activated successfully for', data.prayerName);
    } catch (error) {
      console.error('❌ Error activating prayer blocker:', error);
    }
  }

  // Handle notification response (user tapped notification)
  async handleNotificationResponse(response) {
    try {
      const { data } = response.notification.request.content;
      console.log('👆 NewNotificationService: User tapped notification with data:', data);
      
      // Handle different notification types when tapped
      switch (data?.type) {
        case 'prayer_time':
          // Navigate to prayer screen or show prayer interface
          console.log('🕌 NewNotificationService: User tapped prayer time notification');
          break;
          
        case 'prayer_reminder':
          // Navigate to prayer screen
          console.log('⏰ NewNotificationService: User tapped prayer reminder');
          break;
          
        case 'streak_warning':
          // Navigate to home screen to show streak
          console.log('🔥 NewNotificationService: User tapped streak warning');
          break;
          
        default:
          console.log('👆 NewNotificationService: User tapped unknown notification type');
      }
    } catch (error) {
      console.error('❌ NewNotificationService: Error handling notification response:', error);
    }
  }

  // Check if notifications are enabled
  async areNotificationsEnabled() {
    const { status } = await Notifications.getPermissionsAsync();
    return status === 'granted';
  }

  // Get notification settings from AsyncStorage
  async getNotificationSettings() {
    try {
      const settings = await AsyncStorage.getItem('prayerNotifications');
      return settings ? JSON.parse(settings) : this.getDefaultNotificationSettings();
    } catch (error) {
      console.error('❌ NewNotificationService: Error getting notification settings:', error);
      return this.getDefaultNotificationSettings();
    }
  }

  // Get default notification settings
  getDefaultNotificationSettings() {
    return {
      fajr: 'notification',
      dhuhr: 'notification',
      asr: 'notification',
      maghrib: 'notification',
      isha: 'notification',
      sunrise: 'notification',
    };
  }

  // Save notification settings
  async saveNotificationSettings(settings) {
    try {
      await AsyncStorage.setItem('prayerNotifications', JSON.stringify(settings));
      console.log('✅ NewNotificationService: Notification settings saved');
      
      // Sync to Firebase
      await this.syncNotificationSettingsToFirebase(settings);
    } catch (error) {
      console.error('❌ NewNotificationService: Error saving notification settings:', error);
    }
  }

  // Sync notification settings to Firebase
  async syncNotificationSettingsToFirebase(settings) {
    try {
      const user = auth.currentUser;
      if (!user) {
        console.log('⚠️ NewNotificationService: No authenticated user, skipping Firebase sync');
        return;
      }

      const userDocRef = doc(firestore, 'users', user.uid);
      await updateDoc(userDocRef, {
        prayerNotificationSettings: settings,
        lastSettingsUpdate: new Date().toISOString(),
      });
      
      console.log('✅ NewNotificationService: Notification settings synced to Firebase');
    } catch (error) {
      console.error('❌ NewNotificationService: Error syncing notification settings to Firebase:', error);
    }
  }

  // Test notification
  async testNotification() {
    try {
      if (!this.isInitialized) {
        console.log('⚠️ NewNotificationService: Service not initialized');
        return false;
      }

      console.log('🧪 NewNotificationService: Testing notification...');
      
      // Test local notification first
      const currentLanguage = await getCurrentLanguage();
      await Notifications.scheduleNotificationAsync({
        content: {
          title: getNotificationTitle('testNotification', currentLanguage),
          body: getNotificationTitle('testNotificationBody', currentLanguage),
          data: { type: 'test' },
        },
        trigger: { seconds: 2 },
      });
      
      console.log('✅ NewNotificationService: Local test notification scheduled');
      
      // Test push notification if we have a token
      if (this.expoPushToken) {
        console.log('🧪 NewNotificationService: Testing push notification...');
        
        // Import Firebase Functions
        const { getFunctions, httpsCallable } = await import('firebase/functions');
        const functions = getFunctions();
        const triggerNotification = httpsCallable(functions, 'triggerNotification');
        
        await triggerNotification({
          expoPushToken: this.expoPushToken,
          title: getNotificationTitle('pushTestNotification', currentLanguage),
          body: getNotificationTitle('pushTestNotificationBody', currentLanguage),
          data: { type: 'test_push' },
        });
        
        console.log('✅ NewNotificationService: Push test notification sent');
      } else {
        console.log('⚠️ NewNotificationService: No push token available for push test');
      }
      
      return true;
    } catch (error) {
      console.error('❌ NewNotificationService: Error sending test notification:', error);
      return false;
    }
  }

  // Schedule prayer notifications (now handled by Firebase Functions)
  async schedulePrayerNotifications(prayerTimes) {
    try {
      console.log('📅 NewNotificationService: Prayer notifications now handled by Firebase Functions');
      console.log('📅 Local scheduling disabled - notifications will be sent from server');
      
      // Store prayer times in Firebase for server-side processing
      const user = auth.currentUser;
      if (user) {
        // Get user's timezone
        const userTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
        
        // Get notification settings
        const settings = await this.getNotificationSettings();
        
        await setDoc(doc(firestore, 'users', user.uid), {
          prayerTimes: prayerTimes.map(prayer => ({
            name: prayer.name,
            time: prayer.dateObj ? Timestamp.fromDate(prayer.dateObj) : null, // Store as Firestore timestamp
            timeString: prayer.time, // Store the formatted time string (e.g., "4:54 PM") for display
            enabled: true
          })),
          prayerNotificationSettings: settings, // Save notification settings
          timezone: userTimezone,
          expoPushToken: this.expoPushToken, // Also save push token
          lastPrayerTimesUpdate: serverTimestamp(),
          lastTokenUpdate: new Date().toISOString(),
        }, { merge: true });
        
        console.log('✅ Prayer times, notification settings, and push token saved to Firebase for server-side processing');
      }
      
      return true;
    } catch (error) {
      console.error('❌ NewNotificationService: Error saving prayer times to Firebase:', error);
      return false;
    }
  }

  // Schedule time-sensitive notifications
  async scheduleTimeSensitiveNotifications(prayers) {
    try {
      console.log('📅 NewNotificationService: Scheduling time-sensitive notifications for', prayers.length, 'prayers');
      
      // This is similar to schedulePrayerNotifications but with different timing logic
      await this.schedulePrayerNotifications(prayers);
      
      console.log('✅ NewNotificationService: Time-sensitive notifications scheduled');
    } catch (error) {
      console.error('❌ NewNotificationService: Error scheduling time-sensitive notifications:', error);
    }
  }

  // Force refresh notifications
  async forceRefreshNotifications(prayerTimes) {
    try {
      console.log('🔄 NewNotificationService: Force refreshing notifications');
      await this.schedulePrayerNotifications(prayerTimes);
      console.log('✅ NewNotificationService: Notifications refreshed');
    } catch (error) {
      console.error('❌ NewNotificationService: Error refreshing notifications:', error);
    }
  }

  // Check and refresh stale tokens
  async checkAndRefreshStaleTokens() {
    try {
      console.log('🔄 NewNotificationService: Checking for stale tokens');
      
      // Check if we have a valid push token
      if (!this.expoPushToken || this.expoPushToken === 'ExponentPushToken[simulator]') {
        console.log('🔄 NewNotificationService: Refreshing push token');
        this.expoPushToken = await this.getExpoPushToken();
        await this.savePushTokenToFirebase();
      }
      
      console.log('✅ NewNotificationService: Token check completed');
    } catch (error) {
      console.error('❌ NewNotificationService: Error checking tokens:', error);
    }
  }

  // Force refresh push token - always resets and re-establishes token
  async forceRefreshPushToken() {
    try {
      console.log('🔄 NewNotificationService: Force refreshing push token (will reset old token first)');
      this.expoPushToken = await this.getExpoPushToken();
      // savePushTokenToFirebase() already clears old token before saving new one
      await this.savePushTokenToFirebase();
      console.log('✅ NewNotificationService: Push token refreshed and reset');
    } catch (error) {
      console.error('❌ NewNotificationService: Error refreshing push token:', error);
    }
  }
  
  // Reset and re-establish push token (explicit function for app open)
  async resetAndReestablishPushToken() {
    try {
      console.log('🔄 NewNotificationService: Resetting and re-establishing push token on app open');
      // Get new token
      this.expoPushToken = await this.getExpoPushToken();
      if (!this.expoPushToken) {
        console.log('⚠️ NewNotificationService: No push token available to reset');
        return;
      }
      // Save (which will clear old token first, then save new one)
      await this.savePushTokenToFirebase();
      console.log('✅ NewNotificationService: Push token reset and re-established successfully');
    } catch (error) {
      console.error('❌ NewNotificationService: Error resetting push token:', error);
    }
  }

  // Force save push token to Firebase (for debugging)
  async forceSavePushTokenToFirebase() {
    try {
      console.log('🔄 NewNotificationService: Force saving push token to Firebase');
      await this.savePushTokenToFirebase();
      console.log('✅ NewNotificationService: Push token force saved');
    } catch (error) {
      console.error('❌ NewNotificationService: Error force saving push token:', error);
    }
  }

  // Sync prayer notification settings (alias for syncNotificationSettingsToFirebase)
  async syncPrayerNotificationSettings() {
    try {
      const settings = await this.getNotificationSettings();
      await this.syncNotificationSettingsToFirebase(settings);
      console.log('✅ NewNotificationService: Prayer notification settings synced');
    } catch (error) {
      console.error('❌ NewNotificationService: Error syncing prayer notification settings:', error);
    }
  }

  // Check if notifications are enabled
  async areNotificationsEnabled() {
    try {
      const { status } = await Notifications.getPermissionsAsync();
      return status === 'granted';
    } catch (error) {
      console.error('❌ NewNotificationService: Error checking notification permissions:', error);
      return false;
    }
  }

  // Send streak warning notification
  // DISABLED: Causing duplicate/random notifications
  async sendStreakWarningNotification(streak) {
    try {
      console.log('🔕 NewNotificationService: Streak warning notifications DISABLED to prevent duplicates');
      console.log('   These caused "random false notifications" reported by users');
      return true;
      
      // COMMENTED OUT: Local streak warnings disabled
      // const currentLanguage = await getCurrentLanguage();
      // await Notifications.scheduleNotificationAsync({
      //   content: {
      //     title: getNotificationTitle('prayerStreakAlert', currentLanguage),
      //     body: getNotificationTitle('prayerStreakAlertBody', currentLanguage, { streak }),
      //     data: { type: 'streak_warning', streak },
      //   },
      //   trigger: { seconds: 1 },
      // });
      
      // console.log('✅ NewNotificationService: Streak warning notification sent');
    } catch (error) {
      console.error('❌ NewNotificationService: Error sending streak warning notification:', error);
    }
  }

  // Send encouragement notification
  // DISABLED: Causing duplicate/random notifications
  async sendEncouragementNotification(daysWithoutStreak) {
    try {
      console.log('🔕 NewNotificationService: Encouragement notifications DISABLED to prevent duplicates');
      console.log('   These caused "random false notifications" reported by users');
      return true;
      
      // COMMENTED OUT: Local encouragement notifications disabled
      // const currentLanguage = await getCurrentLanguage();
      // await Notifications.scheduleNotificationAsync({
      //   content: {
      //     title: getNotificationTitle('timeToPray', currentLanguage),
      //     body: getNotificationTitle('timeToPrayBody', currentLanguage),
      //     data: { type: 'encouragement', daysWithoutStreak },
      //   },
      //   trigger: { seconds: 1 },
      // });
      
      // console.log('✅ NewNotificationService: Encouragement notification sent');
    } catch (error) {
      console.error('❌ NewNotificationService: Error sending encouragement notification:', error);
    }
  }

  // Schedule test notifications at 5, 6, and 7 minutes using push notifications
  async scheduleTestNotifications() {
    try {
      if (!this.isInitialized) {
        console.log('⚠️ NewNotificationService: Service not initialized');
        return false;
      }

      if (!this.expoPushToken) {
        console.log('❌ NewNotificationService: No push token available for push notifications');
        return false;
      }

      console.log('🧪 NewNotificationService: Scheduling Dhuhr push notifications at 5, 6, and 7 minutes...');
      
      const currentLanguage = await getCurrentLanguage();
      const now = new Date();
      
      // Schedule push notification for 5 minutes from now
      setTimeout(async () => {
        try {
          const message5min = {
            to: this.expoPushToken,
            sound: 'default',
            title: 'Dhuhr in 5 Minutes',
            body: 'Dhuhr prayer time is approaching in 5 minutes. Prepare for prayer.',
            data: { 
              type: 'prayer_reminder',
              prayer: 'dhuhr',
              scheduledTime: '5min',
              timestamp: Date.now()
            },
            priority: 'high',
          };

          const response5min = await fetch('https://exp.host/--/api/v2/push/send', {
            method: 'POST',
            headers: {
              'Accept': 'application/json',
              'Accept-encoding': 'gzip, deflate',
              'Content-Type': 'application/json',
            },
            body: JSON.stringify(message5min),
          });

          const result5min = await response5min.json();
          console.log('📤 NewNotificationService: 5min push notification sent:', result5min);
        } catch (error) {
          console.error('❌ NewNotificationService: Error sending 5min push notification:', error);
        }
      }, 5 * 60 * 1000); // 5 minutes

      // Schedule push notification for 6 minutes from now
      setTimeout(async () => {
        try {
          const message6min = {
            to: this.expoPushToken,
            sound: 'default',
            title: 'Dhuhr Prayer Time',
            body: 'It\'s time for Dhuhr prayer. May Allah accept your prayers.',
            data: { 
              type: 'prayer_time',
              prayer: 'dhuhr',
              scheduledTime: '6min',
              timestamp: Date.now()
            },
            priority: 'high',
          };

          const response6min = await fetch('https://exp.host/--/api/v2/push/send', {
            method: 'POST',
            headers: {
              'Accept': 'application/json',
              'Accept-encoding': 'gzip, deflate',
              'Content-Type': 'application/json',
            },
            body: JSON.stringify(message6min),
          });

          const result6min = await response6min.json();
          console.log('📤 NewNotificationService: 6min push notification sent:', result6min);
        } catch (error) {
          console.error('❌ NewNotificationService: Error sending 6min push notification:', error);
        }
      }, 6 * 60 * 1000); // 6 minutes

      // Schedule push notification for 7 minutes from now
      setTimeout(async () => {
        try {
          const message7min = {
            to: this.expoPushToken,
            sound: 'default',
            title: 'Dhuhr Delay Reminder',
            body: 'Salaam! Don\'t delay your Dhuhr prayer. The Prophet ﷺ said: "The first thing for which a person will be held accountable on the Day of Resurrection is prayer."',
            data: { 
              type: 'prayer_delay_reminder',
              prayer: 'dhuhr',
              scheduledTime: '7min',
              timestamp: Date.now()
            },
            priority: 'high',
          };

          const response7min = await fetch('https://exp.host/--/api/v2/push/send', {
            method: 'POST',
            headers: {
              'Accept': 'application/json',
              'Accept-encoding': 'gzip, deflate',
              'Content-Type': 'application/json',
            },
            body: JSON.stringify(message7min),
          });

          const result7min = await response7min.json();
          console.log('📤 NewNotificationService: 7min push notification sent:', result7min);
        } catch (error) {
          console.error('❌ NewNotificationService: Error sending 7min push notification:', error);
        }
      }, 7 * 60 * 1000); // 7 minutes

      console.log('✅ NewNotificationService: Dhuhr push notifications scheduled for 5, 6, and 7 minutes from now');
      console.log('📱 Push notifications will be sent to:', this.expoPushToken);

      return true;
    } catch (error) {
      console.error('❌ NewNotificationService: Error scheduling push notifications:', error);
      return false;
    }
  }

  // Cleanup
  async cleanup() {
    try {
      // Cancel all scheduled notifications
      await Notifications.cancelAllScheduledNotificationsAsync();
      console.log('✅ NewNotificationService: All notifications cancelled');
    } catch (error) {
      console.error('❌ NewNotificationService: Error during cleanup:', error);
    }
  }

  // Get current status
  getStatus() {
    return {
      isInitialized: this.isInitialized,
      notificationPermissionStatus: this.notificationPermissionStatus,
      expoPushToken: this.expoPushToken,
      userId: this.userId,
    };
  }
}

// Create and export a singleton instance
const newNotificationService = new NewNotificationService();
export default newNotificationService; 
