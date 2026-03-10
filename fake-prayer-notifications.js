/**
 * Fake Prayer Notifications Generator
 * This script generates realistic prayer notifications for testing and screen recording purposes.
 * User: Moustapha
 */

import * as Notifications from 'expo-notifications';

// Configure notification behavior
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

class FakePrayerNotifications {
  constructor() {
    this.userName = 'Moustapha';
    this.currentTime = new Date();
  }

  // Generate realistic prayer times for today
  generatePrayerTimes() {
    const now = new Date();
    const times = {
      fajr: '5:24 AM',
      sunrise: '6:52 AM', 
      dhuhr: '12:45 PM',
      asr: '4:18 PM',
      maghrib: '7:32 PM',
      isha: '8:58 PM'
    };
    return times;
  }

  // Send 5-minute reminder notification
  async send5MinuteReminder(prayerName) {
    const times = this.generatePrayerTimes();
    const prayerTime = times[prayerName.toLowerCase()];
    
    const title = `${prayerName} in 5 minutes`;
    const body = `Get ready for ${prayerName} prayer at ${prayerTime}`;
    
    await this.scheduleNotification(title, body, {
      type: 'prayer_reminder',
      prayer: prayerName,
      timestamp: Date.now(),
    }, 1); // 1 second delay for testing
    
    console.log(`📱 Scheduled 5-minute reminder for ${prayerName}`);
  }

  // Send prayer time notification (when prayer starts)
  async sendPrayerTimeNotification(prayerName) {
    const times = this.generatePrayerTimes();
    const prayerTime = times[prayerName.toLowerCase()];
    
    const title = `${prayerName} at ${prayerTime}`;
    const body = "It's time to pray!";
    
    await this.scheduleNotification(title, body, {
      type: 'prayer_time',
      prayer: prayerName,
      shouldPlayAdhan: true,
      notificationType: 'adhan',
      timestamp: Date.now(),
    }, 1);
    
    console.log(`📱 Scheduled prayer time notification for ${prayerName}`);
  }

  // Send 30-minute delay reminder
  async send30MinuteDelayReminder(prayerName) {
    const title = "Don't Delay Your Salah!";
    const body = `Salaam ${this.userName}, it's been 30 minutes since ${prayerName}`;
    
    await this.scheduleNotification(title, body, {
      type: 'prayer_delay_reminder',
      prayer: prayerName,
      userName: this.userName,
      timestamp: Date.now(),
    }, 1);
    
    console.log(`📱 Scheduled 30-minute delay reminder for ${prayerName}`);
  }

  // Send daily night reminder (11:45 PM)
  async sendDailyNightReminder() {
    const title = "End Your Day with Remembrance";
    const body = `Salaam ${this.userName}, take a moment for evening dhikr before sleep`;
    
    await this.scheduleNotification(title, body, {
      type: 'daily_night',
      userName: this.userName,
      timestamp: Date.now(),
    }, 1);
    
    console.log(`📱 Scheduled daily night reminder`);
  }

  // Send streak warning notification
  async sendStreakWarningNotification() {
    const title = "Your Prayer Streak is at Risk!";
    const body = `Salaam ${this.userName}, you haven't completed all prayers today. Don't break your 7-day streak!`;
    
    await this.scheduleNotification(title, body, {
      type: 'streak_warning',
      userName: this.userName,
      currentStreak: 7,
      timestamp: Date.now(),
    }, 1);
    
    console.log(`📱 Scheduled streak warning notification`);
  }

  // Send encouragement notification
  async sendEncouragementNotification() {
    const title = "Keep Going, You Can Do This!";
    const body = `Salaam ${this.userName}, every prayer brings you closer to Allah. Start fresh today! 🤲`;
    
    await this.scheduleNotification(title, body, {
      type: 'encouragement',
      userName: this.userName,
      timestamp: Date.now(),
    }, 1);
    
    console.log(`📱 Scheduled encouragement notification`);
  }

  // Helper method to schedule notification
  async scheduleNotification(title, body, data, delaySeconds = 1) {
    try {
      await Notifications.scheduleNotificationAsync({
        content: {
          title,
          body,
          data,
          sound: 'default',
        },
        trigger: {
          seconds: delaySeconds,
        },
      });
    } catch (error) {
      console.error('Error scheduling notification:', error);
    }
  }

  // Send all notification types for a specific prayer (for comprehensive testing)
  async sendAllNotificationTypesForPrayer(prayerName, delayBetween = 8) {
    console.log(`\n🕌 Testing all notification types for ${prayerName}:`);
    
    // 1. 5-minute reminder
    await this.send5MinuteReminder(prayerName);
    await this.delay(delayBetween * 1000);
    
    // 2. Prayer time notification
    await this.sendPrayerTimeNotification(prayerName);
    await this.delay(delayBetween * 1000);
    
    // 3. 30-minute delay reminder (only for Fardh prayers, not Sunrise)
    if (prayerName.toLowerCase() !== 'sunrise') {
      await this.send30MinuteDelayReminder(prayerName);
      await this.delay(delayBetween * 1000);
    }
    
    console.log(`✅ All notifications for ${prayerName} scheduled`);
  }

  // Send notifications for all prayers
  async sendAllPrayerNotifications(delayBetween = 8) {
    const prayers = ['Fajr', 'Sunrise', 'Dhuhr', 'Asr', 'Maghrib', 'Isha'];
    
    console.log(`\n🌟 Starting comprehensive prayer notification test for ${this.userName}`);
    console.log(`📅 Date: ${new Date().toLocaleDateString()}`);
    console.log(`⏰ Time: ${new Date().toLocaleTimeString()}`);
    console.log(`⏱️ Using ${delayBetween} second delays between notifications for proper screen recording`);
    
    for (const prayer of prayers) {
      await this.sendAllNotificationTypesForPrayer(prayer, delayBetween);
      
      // Longer delay between different prayers
      if (prayer !== prayers[prayers.length - 1]) {
        console.log(`⏳ Waiting ${delayBetween} seconds before next prayer...`);
        await this.delay(delayBetween * 1000);
      }
    }
    
    // Send additional notifications
    console.log(`\n📋 Sending additional notification types:`);
    await this.delay(delayBetween * 1000);
    await this.sendStreakWarningNotification();
    await this.delay(delayBetween * 1000);
    await this.sendEncouragementNotification();
    await this.delay(delayBetween * 1000);
    await this.sendDailyNightReminder();
    
    console.log(`\n✅ All fake notifications scheduled successfully!`);
    console.log(`📱 Check your device for notifications over the next few minutes.`);
    console.log(`🎥 Perfect for screen recording prayer notification flows!`);
  }

  // Utility method for delays
  delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  // Send individual notification types for specific testing
  async sendSpecificNotification(type, prayer = 'Fajr') {
    console.log(`\n🎯 Sending specific notification: ${type} for ${prayer}`);
    
    switch (type) {
      case 'reminder':
        await this.send5MinuteReminder(prayer);
        break;
      case 'prayer_time':
        await this.sendPrayerTimeNotification(prayer);
        break;
      case 'delay':
        await this.send30MinuteDelayReminder(prayer);
        break;
      case 'streak':
        await this.sendStreakWarningNotification();
        break;
      case 'encouragement':
        await this.sendEncouragementNotification();
        break;
      case 'daily':
        await this.sendDailyNightReminder();
        break;
      default:
        console.log(`❌ Unknown notification type: ${type}`);
        return;
    }
    
    console.log(`✅ ${type} notification scheduled`);
  }
}

// Export for use in the app
export default FakePrayerNotifications;

// Example usage:
/*
const fakeNotifications = new FakePrayerNotifications();

// Send all notifications (comprehensive test)
await fakeNotifications.sendAllPrayerNotifications();

// Or send specific notifications:
await fakeNotifications.sendSpecificNotification('prayer_time', 'Maghrib');
await fakeNotifications.sendSpecificNotification('streak');
await fakeNotifications.sendSpecificNotification('encouragement');
*/
