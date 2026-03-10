// Test script to schedule push notifications at 5, 6, and 7 minutes from now
import newNotificationService from './services/newNotificationService';

async function scheduleTestNotifications() {
  try {
    console.log('🧪 Starting scheduled Dhuhr push notification test...');
    
    // Initialize the notification service
    await newNotificationService.initialize();
    
    // Check if we have a push token
    const status = newNotificationService.getStatus();
    if (!status.expoPushToken) {
      console.log('❌ No push token available. Make sure the app is running on a device.');
      return;
    }
    
    console.log('📱 Push token found:', status.expoPushToken);
    
    // Schedule the push notifications
    const success = await newNotificationService.scheduleTestNotifications();
    
    if (success) {
      console.log('✅ Dhuhr push notifications scheduled successfully!');
      console.log('📱 You should receive push notifications at:');
      console.log('   - 5 minutes from now: "Dhuhr in 5 Minutes"');
      console.log('   - 6 minutes from now: "Dhuhr Prayer Time"');
      console.log('   - 7 minutes from now: "Dhuhr Delay Reminder"');
      console.log('⚠️  Keep the app running or minimize it to receive notifications');
    } else {
      console.log('❌ Failed to schedule push notifications');
    }
  } catch (error) {
    console.error('❌ Error scheduling push notifications:', error);
  }
}

// Run the test
scheduleTestNotifications();
