/**
 * Notification Cleanup Service
 * 
 * Fixes duplicate notification issues by:
 * - Removing all old push tokens
 * - Registering only the current device token
 * - Cleaning up notification flags in Firestore
 * - Ensuring only ONE token per user
 */

import { auth, firestore } from '../firebase';
import { doc, getDoc, updateDoc, deleteField, serverTimestamp } from 'firebase/firestore';
import * as Notifications from 'expo-notifications';
import AsyncStorage from '@react-native-async-storage/async-storage';
import expoPushService from './expoPushService';
import newNotificationService from './newNotificationService';

class NotificationCleanupService {
  
  /**
   * Clean up all push tokens and re-register current device
   * This fixes duplicate notification issues
   */
  async cleanupAndResetNotifications() {
    try {
      const user = auth.currentUser;
      if (!user) {
        throw new Error('User not authenticated');
      }

      console.log('🧹 Starting notification cleanup for user:', user.uid);

      // Step 1: Clear all push tokens from Firestore
      console.log('🗑️  Step 1: Removing all old push tokens from database...');
      const userRef = doc(firestore, 'users', user.uid);
      
      await updateDoc(userRef, {
        expoPushToken: deleteField(),
        pushToken: deleteField(),
        fcmToken: deleteField(),
        deviceTokens: deleteField(),
        apnsToken: deleteField(),
        // Also clear any notification tracking flags that might cause issues
        lastNotificationSent: deleteField(),
        notificationResetAt: serverTimestamp(),
      });
      
      console.log('✅ Removed all old tokens from database');

      // Step 2: Clear local cache
      console.log('🗑️  Step 2: Clearing local notification cache...');
      await AsyncStorage.multiRemove([
        'expoPushToken',
        'pushToken',
        'lastNotificationCheck',
        'notificationPermissionAsked',
      ]);
      
      console.log('✅ Cleared local cache');

      // Step 3: Get fresh push token for current device
      console.log('🔄 Step 3: Requesting fresh push token...');
      
      // Request notification permissions
      const { status: existingStatus } = await Notifications.getPermissionsAsync();
      let finalStatus = existingStatus;
      
      if (existingStatus !== 'granted') {
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
      }
      
      if (finalStatus !== 'granted') {
        throw new Error('Notification permission not granted');
      }
      
      // Get new token
      const tokenResponse = await Notifications.getExpoPushTokenAsync({
        projectId: '06fc807b-d01f-45d3-92e3-965e851cbb48'
      });
      const newToken = tokenResponse.data;
      
      console.log('✅ Got fresh push token:', newToken.substring(0, 20) + '...');

      // Step 4: Save ONLY the new token to Firestore
      console.log('💾 Step 4: Saving new token to database...');
      await updateDoc(userRef, {
        expoPushToken: newToken,
        lastTokenUpdate: serverTimestamp(),
        tokenUpdatedBy: 'cleanup_service',
        notificationResetCount: (await this.getResetCount(user.uid)) + 1,
      });
      
      console.log('✅ Saved new token to database');

      // Step 5: Clear all pending notifications
      console.log('🗑️  Step 5: Clearing pending notifications...');
      await Notifications.cancelAllScheduledNotificationsAsync();
      
      console.log('✅ Cleared pending notifications');

      // Step 6: Re-initialize notification services
      console.log('🔄 Step 6: Re-initializing notification services...');
      try {
        await newNotificationService.initialize();
        await expoPushService.initialize();
        console.log('✅ Notification services re-initialized');
      } catch (error) {
        console.warn('⚠️  Warning: Could not re-initialize services:', error);
      }

      console.log('✅ Notification cleanup complete!');
      
      return {
        success: true,
        message: 'Notifications reset successfully! You should now receive only one notification per prayer.',
        newToken: newToken.substring(0, 20) + '...'
      };

    } catch (error) {
      console.error('❌ Error during notification cleanup:', error);
      throw error;
    }
  }

  /**
   * Get the number of times user has reset notifications
   */
  async getResetCount(userId) {
    try {
      const userRef = doc(firestore, 'users', userId);
      const userDoc = await getDoc(userRef);
      const data = userDoc.data();
      return data?.notificationResetCount || 0;
    } catch (error) {
      console.error('Error getting reset count:', error);
      return 0;
    }
  }

  /**
   * Check if user has duplicate tokens (diagnostic)
   */
  async checkForDuplicateTokens() {
    try {
      const user = auth.currentUser;
      if (!user) {
        return { hasDuplicates: false, message: 'Not authenticated' };
      }

      const userRef = doc(firestore, 'users', user.uid);
      const userDoc = await getDoc(userRef);
      
      if (!userDoc.exists()) {
        return { hasDuplicates: false, message: 'User document not found' };
      }

      const data = userDoc.data();
      const tokens = [];

      if (data.expoPushToken) tokens.push(data.expoPushToken);
      if (data.pushToken) tokens.push(data.pushToken);
      if (data.fcmToken) tokens.push(data.fcmToken);
      if (data.apnsToken) tokens.push(data.apnsToken);
      if (data.deviceTokens && Array.isArray(data.deviceTokens)) {
        tokens.push(...data.deviceTokens);
      }

      const uniqueTokens = [...new Set(tokens)];

      return {
        hasDuplicates: uniqueTokens.length > 1,
        tokenCount: uniqueTokens.length,
        message: uniqueTokens.length > 1 
          ? `Found ${uniqueTokens.length} different push tokens`
          : 'No duplicate tokens found'
      };

    } catch (error) {
      console.error('Error checking for duplicates:', error);
      return { hasDuplicates: false, message: 'Error checking tokens', error: error.message };
    }
  }

  /**
   * Cancel ALL scheduled local notifications
   * Use this to clear old/stuck notifications
   */
  async cancelAllScheduledNotifications() {
    try {
      console.log('🗑️ Cancelling ALL scheduled local notifications...');
      
      // Get all scheduled notifications first to log them
      const allScheduled = await Notifications.getAllScheduledNotificationsAsync();
      console.log(`📊 Found ${allScheduled.length} scheduled notifications to cancel`);
      
      // Cancel all
      await Notifications.cancelAllScheduledNotificationsAsync();
      
      console.log('✅ All scheduled notifications cancelled');
      
      return {
        success: true,
        message: `Cancelled ${allScheduled.length} scheduled notifications`,
        count: allScheduled.length
      };
    } catch (error) {
      console.error('❌ Error cancelling scheduled notifications:', error);
      throw error;
    }
  }

  /**
   * Force refresh push token without full cleanup
   * (lighter version for regular token refresh)
   */
  async refreshPushToken() {
    try {
      const user = auth.currentUser;
      if (!user) {
        throw new Error('User not authenticated');
      }

      console.log('🔄 Refreshing push token...');

      // Get current token
      const { status } = await Notifications.getPermissionsAsync();
      if (status !== 'granted') {
        throw new Error('Notification permission not granted');
      }

      const tokenResponse = await Notifications.getExpoPushTokenAsync({
        projectId: '06fc807b-d01f-45d3-92e3-965e851cbb48'
      });
      const newToken = tokenResponse.data;

      // Update in Firestore (overwrite, not add)
      const userRef = doc(firestore, 'users', user.uid);
      await updateDoc(userRef, {
        expoPushToken: newToken,
        lastTokenUpdate: serverTimestamp(),
        tokenUpdatedBy: 'refresh_service',
      });

      console.log('✅ Push token refreshed');

      return {
        success: true,
        message: 'Push token refreshed successfully',
        token: newToken.substring(0, 20) + '...'
      };

    } catch (error) {
      console.error('❌ Error refreshing push token:', error);
      throw error;
    }
  }
}

const notificationCleanupService = new NotificationCleanupService();
export default notificationCleanupService;

