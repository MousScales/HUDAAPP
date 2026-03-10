import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
  StatusBar,
  Alert,
  ScrollView,
  ActivityIndicator,
  Dimensions
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import FakePrayerNotifications from '../fake-prayer-notifications';
import newNotificationService from '../services/newNotificationService';

const { width, height } = Dimensions.get('window');

export default function TestNotificationsScreen({ navigation }) {
  const [isLoading, setIsLoading] = useState(false);
  const [fakeNotifications] = useState(new FakePrayerNotifications());

  const showAlert = (title, message) => {
    Alert.alert(title, message);
  };

  const testNotification = async (type, prayer = null) => {
    setIsLoading(true);
    try {
      switch (type) {
        case 'all':
          await fakeNotifications.sendAllPrayerNotifications(8);
          showAlert('Success', 'All prayer notifications scheduled! Check your device over the next few minutes. Each notification has 8-second delays for proper screen recording.');
          break;
        case 'fajr_all':
          await fakeNotifications.sendAllNotificationTypesForPrayer('Fajr', 8);
          showAlert('Success', 'All Fajr notifications scheduled! 8-second delays between each notification.');
          break;
        case 'maghrib_all':
          await fakeNotifications.sendAllNotificationTypesForPrayer('Maghrib', 8);
          showAlert('Success', 'All Maghrib notifications scheduled! 8-second delays between each notification.');
          break;
        case 'reminder':
          await fakeNotifications.sendSpecificNotification('reminder', prayer || 'Fajr');
          showAlert('Success', `5-minute reminder for ${prayer || 'Fajr'} scheduled!`);
          break;
        case 'prayer_time':
          await fakeNotifications.sendSpecificNotification('prayer_time', prayer || 'Maghrib');
          showAlert('Success', `Prayer time notification for ${prayer || 'Maghrib'} scheduled!`);
          break;
        case 'delay':
          await fakeNotifications.sendSpecificNotification('delay', prayer || 'Dhuhr');
          showAlert('Success', `30-minute delay reminder for ${prayer || 'Dhuhr'} scheduled!`);
          break;
        case 'streak':
          await fakeNotifications.sendSpecificNotification('streak');
          showAlert('Success', 'Streak warning notification scheduled!');
          break;
        case 'encouragement':
          await fakeNotifications.sendSpecificNotification('encouragement');
          showAlert('Success', 'Encouragement notification scheduled!');
          break;
        case 'daily':
          await fakeNotifications.sendSpecificNotification('daily');
          showAlert('Success', 'Daily night reminder scheduled!');
          break;
        case 'scheduled_test':
          await newNotificationService.scheduleTestNotifications();
          showAlert('Success', 'Dhuhr notifications scheduled for 5, 6, and 7 minutes from now!');
          break;
      }
    } catch (error) {
      showAlert('Error', `Failed to schedule notification: ${error.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#000000" />
      
      {/* Invisible back area - tap top left to go back */}
      <TouchableOpacity 
        style={styles.invisibleBackArea}
        onPress={() => navigation.goBack()}
        activeOpacity={1}
      />

      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {/* Large black space at top for screen recording */}
        <View style={styles.topBlackSpace} />
        
        <View style={styles.content}>
          <Text style={styles.title}>Prayer Notification Tester</Text>
          <Text style={styles.subtitle}>User: Moustapha</Text>
          <Text style={styles.instruction}>
            📱 Tap any button below, then minimize the app to see notifications{'\n'}
            ⏱️ "All Notifications" buttons use 8-second delays for proper screen recording
          </Text>
          
          {/* Comprehensive Tests */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>📱 Comprehensive Tests</Text>
            <TouchableOpacity 
              style={[styles.button, styles.primaryButton]} 
              onPress={() => testNotification('all')}
              disabled={isLoading}
            >
              <Text style={styles.buttonText}>🌟 All Prayer Notifications (Full Test)</Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={[styles.button, styles.secondaryButton]} 
              onPress={() => testNotification('fajr_all')}
              disabled={isLoading}
            >
              <Text style={styles.buttonText}>🌅 All Fajr Notifications</Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={[styles.button, styles.secondaryButton]} 
              onPress={() => testNotification('maghrib_all')}
              disabled={isLoading}
            >
              <Text style={styles.buttonText}>🌆 All Maghrib Notifications</Text>
            </TouchableOpacity>
          </View>

          {/* Individual Prayer Time Notifications */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>🕌 Prayer Time Notifications</Text>
            <TouchableOpacity 
              style={styles.button} 
              onPress={() => testNotification('prayer_time', 'Fajr')}
              disabled={isLoading}
            >
              <Text style={styles.buttonText}>🌅 Fajr at 5:24 AM</Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={styles.button} 
              onPress={() => testNotification('prayer_time', 'Dhuhr')}
              disabled={isLoading}
            >
              <Text style={styles.buttonText}>☀️ Dhuhr at 12:45 PM</Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={styles.button} 
              onPress={() => testNotification('prayer_time', 'Asr')}
              disabled={isLoading}
            >
              <Text style={styles.buttonText}>🌤️ Asr at 4:18 PM</Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={styles.button} 
              onPress={() => testNotification('prayer_time', 'Maghrib')}
              disabled={isLoading}
            >
              <Text style={styles.buttonText}>🌆 Maghrib at 7:32 PM</Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={styles.button} 
              onPress={() => testNotification('prayer_time', 'Isha')}
              disabled={isLoading}
            >
              <Text style={styles.buttonText}>🌙 Isha at 8:58 PM</Text>
            </TouchableOpacity>
          </View>

          {/* 5-Minute Reminders */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>⏰ 5-Minute Reminders</Text>
            <TouchableOpacity 
              style={styles.button} 
              onPress={() => testNotification('reminder', 'Fajr')}
              disabled={isLoading}
            >
              <Text style={styles.buttonText}>🌅 Fajr in 5 minutes</Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={styles.button} 
              onPress={() => testNotification('reminder', 'Maghrib')}
              disabled={isLoading}
            >
              <Text style={styles.buttonText}>🌆 Maghrib in 5 minutes</Text>
            </TouchableOpacity>
          </View>

          {/* Delay Reminders */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>⚠️ 30-Minute Delay Reminders</Text>
            <TouchableOpacity 
              style={styles.button} 
              onPress={() => testNotification('delay', 'Fajr')}
              disabled={isLoading}
            >
              <Text style={styles.buttonText}>🌅 Fajr Delay (Salaam Moustapha...)</Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={styles.button} 
              onPress={() => testNotification('delay', 'Dhuhr')}
              disabled={isLoading}
            >
              <Text style={styles.buttonText}>☀️ Dhuhr Delay (Salaam Moustapha...)</Text>
            </TouchableOpacity>
          </View>

          {/* Special Notifications */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>🎯 Special Notifications</Text>
            <TouchableOpacity 
              style={[styles.button, styles.warningButton]} 
              onPress={() => testNotification('streak')}
              disabled={isLoading}
            >
              <Text style={styles.buttonText}>🔥 Streak Warning (7-day streak at risk)</Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={[styles.button, styles.encouragementButton]} 
              onPress={() => testNotification('encouragement')}
              disabled={isLoading}
            >
              <Text style={styles.buttonText}>💪 Encouragement (Keep going Moustapha!)</Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={[styles.button, styles.nightButton]} 
              onPress={() => testNotification('daily')}
              disabled={isLoading}
            >
              <Text style={styles.buttonText}>🌙 Daily Night Reminder (Evening dhikr)</Text>
            </TouchableOpacity>
          </View>

          {/* Scheduled Test Notifications */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>⏰ Scheduled Dhuhr Notifications</Text>
            <TouchableOpacity 
              style={[styles.button, styles.primaryButton]} 
              onPress={() => testNotification('scheduled_test')}
              disabled={isLoading}
            >
              <Text style={styles.buttonText}>☀️ Schedule Dhuhr Notifications (5, 6, 7 min)</Text>
            </TouchableOpacity>
          </View>

          {/* Loading Indicator */}
          {isLoading && (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color="#FFD700" />
              <Text style={styles.loadingText}>Scheduling notifications...</Text>
            </View>
          )}

          <View style={styles.footer}>
            <Text style={styles.footerText}>
              📝 Tap any button to schedule a fake notification for screen recording.
            </Text>
            <Text style={styles.footerText}>
              🎥 Perfect for demonstrating prayer notification flows!
            </Text>
            <Text style={styles.footerText}>
              ⚠️ Minimize the app after tapping to see notifications
            </Text>
            <Text style={styles.footerText}>
              🔙 Tap top-left corner to go back (invisible)
            </Text>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000000', // Pure black background
  },
  // Header removed for pure black screen recording
  invisibleBackArea: {
    position: 'absolute',
    top: 0,
    left: 0,
    width: 100,
    height: 100,
    zIndex: 1000,
    backgroundColor: 'transparent',
  },
  topBlackSpace: {
    height: height * 0.4, // 40% of screen height - lots of black space
    backgroundColor: '#000000',
  },
  scrollView: {
    flex: 1,
  },
  content: {
    padding: 20,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 5,
    color: '#FFFFFF',
  },
  subtitle: {
    fontSize: 18,
    textAlign: 'center',
    marginBottom: 20,
    color: '#FFD700',
    fontStyle: 'italic',
  },
  instruction: {
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 30,
    color: '#CCCCCC',
    backgroundColor: '#1A1A1A',
    padding: 15,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#333333',
  },
  section: {
    marginBottom: 25,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 15,
    color: '#FFFFFF',
  },
  button: {
    backgroundColor: '#1A1A1A',
    padding: 15,
    borderRadius: 10,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#333333',
  },
  primaryButton: {
    backgroundColor: '#8B0000', // Dark red
    borderColor: '#FF0000',
  },
  secondaryButton: {
    backgroundColor: '#4B0082', // Dark purple
    borderColor: '#8A2BE2',
  },
  warningButton: {
    backgroundColor: '#B8860B', // Dark goldenrod
    borderColor: '#FFD700',
  },
  encouragementButton: {
    backgroundColor: '#006400', // Dark green
    borderColor: '#00FF00',
  },
  nightButton: {
    backgroundColor: '#191970', // Midnight blue
    borderColor: '#4169E1',
  },
  buttonText: {
    color: '#FFFFFF',
    textAlign: 'center',
    fontSize: 16,
    fontWeight: '600',
  },
  loadingContainer: {
    alignItems: 'center',
    marginVertical: 20,
    padding: 20,
    backgroundColor: '#1A1A1A',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#333333',
  },
  loadingText: {
    color: '#FFD700',
    fontSize: 16,
    marginTop: 10,
    fontWeight: '600',
  },
  footer: {
    marginTop: 30,
    padding: 20,
    backgroundColor: '#1A1A1A',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#333333',
  },
  footerText: {
    textAlign: 'center',
    color: '#CCCCCC',
    fontSize: 14,
    marginBottom: 8,
    lineHeight: 20,
  },
});
