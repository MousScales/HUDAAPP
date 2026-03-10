import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { Platform } from 'react-native';
import { auth, firestore } from '../firebase';
import { doc, setDoc, getDoc, updateDoc, serverTimestamp, deleteField } from 'firebase/firestore';
import { getNotificationTitle, getCurrentLanguage } from '../utils/translations';

class ExpoPushService {
  constructor() {
    this.expoPushToken = null;
    this.isInitialized = false;
  }

  async initialize() {
    try {
      console.log('🔔 Initializing Expo push notifications...');
      
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
        console.log('❌ Push notification permission not granted');
        return false;
      }

      // Get Expo push token
      if (Device.isDevice) {
        try {
          console.log('📱 Getting Expo push token...');
          const tokenResult = await Notifications.getExpoPushTokenAsync({
            projectId: '06fc807b-d01f-45d3-92e3-965e851cbb48', // Your actual Expo project ID
          });
          
          this.expoPushToken = tokenResult.data;
          console.log('✅ Expo push token generated:', this.expoPushToken);
          
          // Save token to Firebase
          await this.savePushToken();
          
          // Set up periodic token refresh to ensure notifications work even when app is not opened
          this.setupTokenRefresh();
          
        } catch (tokenError) {
          console.error('❌ Error getting push token:', tokenError);
          return false;
        }
      } else {
        console.log('⚠️ Not running on a physical device, skipping push token generation');
        return false;
      }

      this.isInitialized = true;
      console.log('✅ Expo push service initialized successfully');
      return true;
    } catch (error) {
      console.error('❌ Error initializing push notifications:', error);
      return false;
    }
  }

  async savePushToken() {
    try {
      const user = auth.currentUser;
      if (!user || !this.expoPushToken) return;

      const userDocRef = doc(firestore, 'users', user.uid);
      
      // First, clear the old push token to prevent duplicate notifications
      await updateDoc(userDocRef, {
        expoPushToken: deleteField(),
      });
      
      console.log('🔄 ExpoPushService: Old push token cleared');
      
      // Small delay to ensure the delete operation completes
      await new Promise(resolve => setTimeout(resolve, 100));
      
      // Now save the new push token
      await updateDoc(userDocRef, {
        expoPushToken: this.expoPushToken,
        platform: Platform.OS,
        updatedAt: serverTimestamp(),
      });

      console.log('✅ ExpoPushService: Push token saved to Firebase');
    } catch (error) {
      console.error('❌ Error saving push token:', error);
    }
  }

  async getPushToken() {
    return this.expoPushToken;
  }

  // Set up periodic token refresh to ensure notifications work even when app is not opened
  setupTokenRefresh() {
    try {
      console.log('🔄 Setting up periodic token refresh...');
      
      // Refresh token every 24 hours to ensure it stays valid
      this.tokenRefreshInterval = setInterval(async () => {
        await this.refreshPushToken();
      }, 24 * 60 * 60 * 1000); // 24 hours
      
      // Also refresh token when app becomes active (in case it was stale)
      this.setupAppStateListener();
      
      console.log('✅ Token refresh setup completed');
    } catch (error) {
      console.error('❌ Error setting up token refresh:', error);
    }
  }

  // Setup app state listener to refresh token when app becomes active
  setupAppStateListener() {
    try {
      const { AppState } = require('react-native');
      
      this.appStateSubscription = AppState.addEventListener('change', async (nextAppState) => {
        if (nextAppState === 'active') {
          console.log('📱 App became active, refreshing push token...');
          await this.refreshPushToken();
        }
      });
      
      console.log('✅ App state listener setup completed');
    } catch (error) {
      console.error('❌ Error setting up app state listener:', error);
    }
  }

  // Refresh push token to ensure it's still valid
  async refreshPushToken() {
    try {
      console.log('🔄 Refreshing push token...');
      
      if (!Device.isDevice) {
        console.log('⚠️ Not on device, skipping token refresh');
        return false;
      }
      
      const tokenResult = await Notifications.getExpoPushTokenAsync({
        projectId: '06fc807b-d01f-45d3-92e3-965e851cbb48',
      });
      
      const newToken = tokenResult.data;
      
      // Only update if token actually changed
      if (newToken !== this.expoPushToken) {
        console.log('🔄 Push token changed, updating...');
        this.expoPushToken = newToken;
        await this.savePushToken();
        console.log('✅ Push token refreshed and saved');
      } else {
        console.log('✅ Push token is still valid');
      }
      
      return true;
    } catch (error) {
      console.error('❌ Error refreshing push token:', error);
      return false;
    }
  }

  // Force refresh push token (for manual refresh)
  async forceRefreshPushToken() {
    try {
      console.log('🔄 Force refreshing push token...');
      
      if (!Device.isDevice) {
        console.log('❌ Cannot refresh token on simulator');
        return false;
      }
      
      const tokenResult = await Notifications.getExpoPushTokenAsync({
        projectId: '06fc807b-d01f-45d3-92e3-965e851cbb48',
      });
      
      this.expoPushToken = tokenResult.data;
      await this.savePushToken();
      
      console.log('✅ Push token force refreshed:', this.expoPushToken);
      return true;
    } catch (error) {
      console.error('❌ Error force refreshing push token:', error);
      return false;
    }
  }

  // Manually generate and save push token (for testing)
  async generatePushToken() {
    try {
      console.log('🔧 Manually generating push token...');
      
      if (!Device.isDevice) {
        console.log('❌ Cannot generate push token on simulator');
        return false;
      }
      
      const tokenResult = await Notifications.getExpoPushTokenAsync({
        projectId: '06fc807b-d01f-45d3-92e3-965e851cbb48',
      });
      
      this.expoPushToken = tokenResult.data;
      console.log('✅ Push token generated:', this.expoPushToken);
      
      // Save to Firebase
      await this.savePushToken();
      
      return true;
    } catch (error) {
      console.error('❌ Error generating push token:', error);
      return false;
    }
  }

  // Send push notification using Expo's API
  async sendPushNotification(expoPushToken, title, body, data = {}) {
    try {
      const message = {
        to: expoPushToken,
        sound: 'default',
        title: title,
        body: body,
        data: data,
        priority: 'high', // Add high priority for better delivery
      };

      console.log('📤 Sending push notification to Expo servers...');
      console.log('📤 Token:', expoPushToken.substring(0, 20) + '...');
      console.log('📤 Message:', { title, body, data });

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
      console.log('📤 Push notification response:', result);
      
      if (result.data && result.data.status === 'ok') {
        console.log('✅ Push notification sent successfully to Expo servers');
        return result;
      } else {
        console.log('❌ Push notification failed:', result);
        return result;
      }
    } catch (error) {
      console.error('❌ Error sending push notification:', error);
      throw error;
    }
  }

  // Send prayer notification
  async sendPrayerNotification(prayerName) {
    try {
      const user = auth.currentUser;
      if (!user) return;

      // Get user's push token from Firebase
      const userDoc = await getDoc(doc(firestore, 'users', user.uid));
      const userData = userDoc.data();
      
      if (!userData?.expoPushToken) {
        console.log('❌ No push token found for user');
        return;
      }

      const currentLanguage = await getCurrentLanguage();
      const title = getNotificationTitle('fajrAtTime', currentLanguage, { time: prayerName });
      const body = getNotificationTitle('itsTimeToPray', currentLanguage);
      
      await this.sendPushNotification(userData.expoPushToken, title, body, {
        type: 'prayer_time',
        prayer: prayerName,
        shouldPlayAdhan: true, // Flag to play adhan when notification is received
      });

      console.log('✅ Prayer notification sent via push with adhan flag');
    } catch (error) {
      console.error('❌ Error sending prayer notification:', error);
    }
  }

  // Send daily reminder
  async sendDailyReminder() {
    try {
      const user = auth.currentUser;
      if (!user) return;

      const userDoc = await getDoc(doc(firestore, 'users', user.uid));
      const userData = userDoc.data();
      
      if (!userData?.expoPushToken) return;

      const title = 'Daily Reminder';
      const body = 'Don\'t forget to pray and read Quran today.';
      
      await this.sendPushNotification(userData.expoPushToken, title, body, {
        type: 'daily_reminder',
      });

      console.log('✅ Daily reminder sent via push');
    } catch (error) {
      console.error('❌ Error sending daily reminder:', error);
    }
  }

  // Send streak warning
  async sendStreakWarning(streak) {
    try {
      const user = auth.currentUser;
      if (!user) return;

      const userDoc = await getDoc(doc(firestore, 'users', user.uid));
      const userData = userDoc.data();
      
      if (!userData?.expoPushToken) return;

      const title = 'Prayer Streak Alert';
      const body = `Your ${streak}-day prayer streak is at risk! Don't break the chain.`;
      
      await this.sendPushNotification(userData.expoPushToken, title, body, {
        type: 'streak_warning',
        streak: streak,
      });

      console.log('✅ Streak warning sent via push');
    } catch (error) {
      console.error('❌ Error sending streak warning:', error);
    }
  }

  // Test push notification
  async testPushNotification() {
    try {
      const user = auth.currentUser;
      if (!user) return;

      const userDoc = await getDoc(doc(firestore, 'users', user.uid));
      const userData = userDoc.data();
      
      if (!userData?.expoPushToken) {
        console.log('❌ No push token found for user');
        return;
      }

      const title = 'Test Notification';
      const body = 'This is a test push notification from Hudā!';
      
      await this.sendPushNotification(userData.expoPushToken, title, body, {
        type: 'test',
      });

      console.log('✅ Test push notification sent');
    } catch (error) {
      console.error('❌ Error sending test push notification:', error);
    }
  }

  // Cleanup method
  async cleanup() {
    console.log('🧹 Cleaning up Expo push service...');
    
    // Clear token refresh interval
    if (this.tokenRefreshInterval) {
      clearInterval(this.tokenRefreshInterval);
      this.tokenRefreshInterval = null;
    }
    
    // Remove app state listener
    if (this.appStateSubscription) {
      this.appStateSubscription.remove();
      this.appStateSubscription = null;
    }
    
    console.log('✅ Expo push service cleanup completed');
  }
}

export default new ExpoPushService(); 