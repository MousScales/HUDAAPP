import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert, Dimensions, SafeAreaView, StatusBar, Animated, Easing, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { LinearGradient } from 'expo-linear-gradient';
import * as Location from 'expo-location';
// Removed adhan import - using external prayer time API instead
import { useFocusEffect } from '@react-navigation/native';
import { getResponsiveIconSize } from '../utils/responsiveSizing';
import { updateCurrentAndNextPrayer, calculateTimeUntilNext } from '../utils/prayerCycling';
import * as Notifications from 'expo-notifications';
import widgetService from '../services/widgetService';
import newNotificationService from '../services/newNotificationService';
import prayerService from '../services/prayerService';
import subscriptionGuard from '../services/subscriptionGuard';
import SubscriptionModal from '../components/SubscriptionModal';
import { useLanguage } from '../utils/useLanguage';
import { t } from '../utils/translations';
import streakService from '../services/streakService';
const HijriConverter = require('hijri-converter');

export default function PrayerScreen({ navigation }) {
  // Language support
  const { currentLanguage } = useLanguage();
  
  const [currentTime, setCurrentTime] = useState(new Date());
  const [nextPrayer, setNextPrayer] = useState(null);
  const [currentPrayer, setCurrentPrayer] = useState(null);
  const [activeSection, setActiveSection] = useState('prayer'); // 'prayer' or 'preparation'
  const [prayerData, setPrayerData] = useState({});
  const [completedSteps, setCompletedSteps] = useState([]);
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [prayerNotifications, setPrayerNotifications] = useState({});
  const [location, setLocation] = useState(null);
  const [cityName, setCityName] = useState(t('loading', currentLanguage));
  const [prayerTimes, setPrayerTimes] = useState([]);
  const [countdown, setCountdown] = useState({ hours: 0, minutes: 0, seconds: 0 });
  const [currentHijriDate, setCurrentHijriDate] = useState(null);
  const [isPrayerTimeActive, setIsPrayerTimeActive] = useState(false);
  const [excuseMode, setExcuseMode] = useState(false);
  const [showSubscriptionModal, setShowSubscriptionModal] = useState(false);
  const [selectedPrayerForGuided, setSelectedPrayerForGuided] = useState(null);

  // Location permission state
  const [locationPermission, setLocationPermission] = useState(null);

  const [userMadhab, setUserMadhab] = useState('hanafi'); // Default madhab
  const [lastNavigatedStep, setLastNavigatedStep] = useState(null); // Track which step was last navigated to

  // Confetti animation state
  const [showConfetti, setShowConfetti] = useState(false);
  const [confettiPieces, setConfettiPieces] = useState([]);
  const confettiAnimations = useRef({}).current;

  // Animation values for enhanced UI
  const [headerAnim] = useState(new Animated.Value(0));
  const [toggleAnim] = useState(new Animated.Value(0));
  const [contentAnim] = useState(new Animated.Value(0));
  const [prayerCardAnim] = useState(new Animated.Value(0));
  const [preparationAnim] = useState(new Animated.Value(0));
  
  // Button press animations
  const [toggleButtonScale] = useState(new Animated.Value(1));
  const [prayerButtonScale] = useState(new Animated.Value(1));
  const [bellButtonScale] = useState(new Animated.Value(1));
  const [stepButtonScale] = useState(new Animated.Value(1));

  // Prayer card scale animations
  const prayerScales = useRef({
    fajr: new Animated.Value(1),
    sunrise: new Animated.Value(1),
    dhuhr: new Animated.Value(1),
    asr: new Animated.Value(1),
    maghrib: new Animated.Value(1),
    isha: new Animated.Value(1),
  }).current;

  const animatePrayerCard = (prayerId, onDone) => {
    Animated.sequence([
      Animated.timing(prayerScales[prayerId], {
        toValue: 0.92,
        duration: 90,
        useNativeDriver: true,
      }),
      Animated.timing(prayerScales[prayerId], {
        toValue: 1,
        duration: 120,
        useNativeDriver: true,
      }),
    ]).start(() => onDone && onDone());
  };

  // Confetti animation functions
  const createConfettiPiece = () => {
    const colors = ['#4CAF50', '#8BC34A', '#CDDC39', '#4CAF50', '#66BB6A', '#81C784', '#A5D6A7', '#C8E6C9', '#E8F5E8', '#2E7D32', '#388E3C', '#43A047'];
    const shapes = ['●', '◆', '■', '★', '♦', '♠', '✦', '✧', '✩', '✪', '✫', '✬', '✭', '✮', '✯', '✰'];
    
    return {
      id: Math.random().toString(36).substr(2, 9),
      translateX: new Animated.Value(Math.random() * Dimensions.get('window').width),
      translateY: new Animated.Value(-20),
      rotation: new Animated.Value(Math.random() * 360),
      scale: new Animated.Value(0.5 + Math.random() * 0.5),
      color: colors[Math.floor(Math.random() * colors.length)],
      shape: shapes[Math.floor(Math.random() * shapes.length)],
      sway: (Math.random() - 0.5) * 2,
    };
  };

  const triggerConfetti = () => {
    const pieces = Array.from({ length: 150 }, createConfettiPiece);
    setConfettiPieces(pieces);
    setShowConfetti(true);
    
    // Animate each confetti piece
    pieces.forEach((piece, index) => {
      const delay = index * 10; // Faster spawning
      
      setTimeout(() => {
        // Animate falling with varied duration
        Animated.timing(piece.translateY, {
          toValue: Dimensions.get('window').height + 50,
          duration: 1500 + Math.random() * 1500, // More variation in duration
          useNativeDriver: true,
          easing: Easing.out(Easing.cubic),
        }).start();
        
        // Animate rotation with varied speed
        Animated.timing(piece.rotation, {
          toValue: piece.rotation._value + 360 + Math.random() * 360,
          duration: 1500 + Math.random() * 1500,
          useNativeDriver: true,
        }).start();
        
        // Animate swaying with varied amplitude
        const swayAnimation = Animated.loop(
          Animated.sequence([
            Animated.timing(piece.translateX, {
              toValue: piece.translateX._value + piece.sway * (30 + Math.random() * 40),
              duration: 800 + Math.random() * 400,
              useNativeDriver: true,
            }),
            Animated.timing(piece.translateX, {
              toValue: piece.translateX._value - piece.sway * (30 + Math.random() * 40),
              duration: 800 + Math.random() * 400,
              useNativeDriver: true,
            }),
          ])
        );
        swayAnimation.start();
      }, delay);
    });
    
    // Hide confetti after animation completes
    setTimeout(() => {
      setShowConfetti(false);
      setConfettiPieces([]);
    }, 3000);
  };

  // Load prayer data from storage
  useEffect(() => {
    loadPrayerData();
    loadNotificationSettings();
    loadExcuseMode();
    loadUserMadhab(); // Load user's madhab preference
    checkLocationPermission();
  }, []);

  // Reload excuse mode and prayer data when screen comes into focus
  useFocusEffect(
    React.useCallback(() => {
      // Only trigger the animation, don't reset the value directly
      startEntranceAnimations();
      // Reload prayer data to sync with changes from HomeScreen or other screens
      loadPrayerData();
      loadNotificationSettings(); // Reload notification settings when screen comes into focus
    }, [])
  );

  // Listen for user profile changes (including madhab changes)
  useEffect(() => {
    const checkForProfileChanges = async () => {
      try {
        const userProfile = await AsyncStorage.getItem('userProfile');
        if (userProfile) {
          const profile = JSON.parse(userProfile);
          const newMadhab = profile.madhab || 'hanafi';
          
          // If madhab changed, recalculate prayer times
          if (newMadhab !== userMadhab) {
            console.log('Madhab changed from', userMadhab, 'to', newMadhab);
            setUserMadhab(newMadhab);
            if (location?.coords) {
              await calculatePrayerTimes(location.coords);
              
              // Force immediate update to Firebase to ensure notifications use new times
              console.log('📡 Updating Firebase with new prayer times...');
              try {
                await newNotificationService.schedulePrayerNotifications(prayerTimes);
                console.log('✅ Firebase updated with new prayer times');
              } catch (error) {
                console.error('❌ Error updating Firebase with new prayer times:', error);
              }
            }
          }
        }
      } catch (error) {
        console.error('Error checking for profile changes:', error);
      }
    };

    // Check for changes every 5 seconds
    const interval = setInterval(checkForProfileChanges, 5000);
    
    return () => clearInterval(interval);
  }, [userMadhab, location]);

  useEffect(() => {
    (async () => {
      let { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert(t('permissionDenied', currentLanguage), t('locationAccessNeededForPrayerTimes', currentLanguage));
        return;
      }

      let location = await Location.getCurrentPositionAsync({});
      setLocation(location);
      calculatePrayerTimes(location.coords);
      
      // Get city name from coordinates
      try {
        const [place] = await Location.reverseGeocodeAsync({
          latitude: location.coords.latitude,
          longitude: location.coords.longitude
        });
        if (place) {
          setCityName(place.city || place.subregion || place.region || 'Unknown Location');
        }
      } catch (error) {
        console.error('Error getting location name:', error);
        setCityName('Unknown Location');
      }
    })();
  }, []);

  // Add location watching for automatic updates when user moves
  useEffect(() => {
    let locationSubscription = null;
    
    const startLocationWatching = async () => {
      try {
        let { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== 'granted') {
          return;
        }

        // Watch for location changes with significant distance threshold
        locationSubscription = await Location.watchPositionAsync(
          {
            accuracy: Location.Accuracy.Balanced,
            timeInterval: 30000, // Check every 30 seconds
            distanceInterval: 1000, // Update when moved 1km or more
          },
          async (newLocation) => {
            // Check if location has changed significantly
            if (location?.coords) {
              const distance = calculateDistance(
                location.coords.latitude,
                location.coords.longitude,
                newLocation.coords.latitude,
                newLocation.coords.longitude
              );
              
              // If moved more than 5km, update location and prayer times
              if (distance > 5) {
                console.log('📍 Location changed significantly, updating prayer times...');
                setLocation(newLocation);
                
                // Update city name
                try {
                  const [place] = await Location.reverseGeocodeAsync({
                    latitude: newLocation.coords.latitude,
                    longitude: newLocation.coords.longitude
                  });
                  if (place) {
                    const newCityName = place.city || place.subregion || place.region || 'Unknown Location';
                    if (newCityName !== cityName) {
                      setCityName(newCityName);
                      console.log('📍 New location:', newCityName);
                    }
                  }
                } catch (error) {
                  console.error('Error getting new location name:', error);
                }
                
                // Recalculate prayer times for new location
                await calculatePrayerTimes(newLocation.coords);
                
                // Force refresh notifications for new location
                if (prayerTimes.length > 0) {
                  await newNotificationService.forceRefreshNotifications(prayerTimes);
                }
              }
            } else {
              // First time getting location
              setLocation(newLocation);
              await calculatePrayerTimes(newLocation.coords);
            }
          }
        );
      } catch (error) {
        console.error('Error setting up location watching:', error);
      }
    };

    startLocationWatching();

    return () => {
      if (locationSubscription) {
        locationSubscription.remove();
      }
    };
  }, [location, cityName, prayerTimes]);

  // Helper function to calculate distance between two coordinates
  const calculateDistance = (lat1, lon1, lat2, lon2) => {
    const R = 6371; // Earth's radius in kilometers
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = 
      Math.sin(dLat/2) * Math.sin(dLat/2) +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
      Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
  };

  useEffect(() => {
    const timer = setInterval(() => {
      if (nextPrayer?.dateObj) {
        const now = new Date();
        const diff = nextPrayer.dateObj - now;
        
        if (diff > 0) {
          const hours = Math.floor(diff / (1000 * 60 * 60));
          const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
          const seconds = Math.floor((diff % (1000 * 60)) / 1000);
          setCountdown({ hours, minutes, seconds });
        } else if (diff <= 0 && diff > -60) {
          // Prayer time just started (within 1 minute of prayer time)
          // Send notification immediately
          sendPrayerNotification(nextPrayer);
        }
      }
      
      setCurrentTime(new Date());
      
      // Update current and next prayer every second to detect prayer time changes instantly
      if (prayerTimes.length > 0) {
        updateCurrentAndNextPrayerLocal(prayerTimes);
      }
    }, 1000); // Update every second for smooth countdown and instant prayer detection

    return () => clearInterval(timer);
  }, [nextPrayer, prayerTimes, location]);

  // Load prayer data using Firebase prayer service
  const loadPrayerData = async () => {
    try {
      const data = await prayerService.loadPrayerData();
      setPrayerData(data);
      
      // Handle daily reset and streak management
      const resetInfo = await prayerService.handleDailyReset();
      if (resetInfo.isNewDay) {
        console.log('🔄 New day detected - prayers reset to unchecked');
        // Prayers are automatically unchecked for new days
        // Historical data is preserved in the calendar
      }
      
      if (resetInfo.yesterdayIncomplete) {
        console.log('⚠️ Yesterday was not completed - streak may be affected');
        // The streak calculation will handle this automatically
      }
    } catch (error) {
      console.error('Error loading prayer data:', error);
      setPrayerData({});
    }
  };

  const loadNotificationSettings = async () => {
    try {
      const storedSettings = await AsyncStorage.getItem('prayerNotifications');
      if (storedSettings) {
        const parsedSettings = JSON.parse(storedSettings);
        
        // Check if we need to migrate old settings (where values might be 'adhan' or false)
        let needsMigration = false;
        const migratedSettings = { ...parsedSettings };
        
        const prayerIds = ['fajr', 'sunrise', 'dhuhr', 'asr', 'maghrib', 'isha'];
        prayerIds.forEach(prayerId => {
          if (migratedSettings[prayerId] === 'adhan' || migratedSettings[prayerId] === false) {
            migratedSettings[prayerId] = 'notification';
            needsMigration = true;
          }
        });
        
        if (needsMigration) {
          await AsyncStorage.setItem('prayerNotifications', JSON.stringify(migratedSettings));
          console.log('✅ Migrated old notification settings to new format');
        }
        
        setPrayerNotifications(migratedSettings);
      } else {
        // Default all to enabled
        const defaultSettings = prayerTimes.reduce((acc, prayer) => {
          acc[prayer.id] = 'notification';
          return acc;
        }, {});
        setPrayerNotifications(defaultSettings);
        await AsyncStorage.setItem('prayerNotifications', JSON.stringify(defaultSettings));
      }
    } catch (error) {
      console.error('Error loading notification settings:', error);
    }
  };

  const loadExcuseMode = async () => {
    try {
      const data = await AsyncStorage.getItem('@excuse_mode');
      if (data) {
        setExcuseMode(JSON.parse(data));
      }
    } catch (error) {
      console.error('Error loading excuse mode:', error);
    }
  };

  const savePrayerData = async (newData) => {
    setPrayerData(newData);
    // Note: Individual prayer saving is now handled by prayerService.savePrayerCompletion
  };

  const saveNotificationSettings = async (newSettings) => {
    try {
      await AsyncStorage.setItem('prayerNotifications', JSON.stringify(newSettings));
      setPrayerNotifications(newSettings);
    } catch (error) {
      console.error('Error saving notification settings:', error);
    }
  };

  // Format date key for storage using local date to avoid timezone issues
  const getDateKey = (date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  // Check if all prayers are completed for the day and update streak
  const checkAllPrayersCompleted = async (dateKey, updatedPrayerData) => {
    try {
      const dailyPrayers = updatedPrayerData[dateKey] || {};
      
      // Check both lowercase and capitalized prayer names for compatibility
      const requiredPrayers = ['Fajr', 'Dhuhr', 'Asr', 'Maghrib', 'Isha'];
      const requiredPrayersLower = ['fajr', 'dhuhr', 'asr', 'maghrib', 'isha'];
      
      // Check if all required prayers are completed (not excused)
      const allCompleted = requiredPrayers.every(prayer => 
        dailyPrayers[prayer] === true || dailyPrayers[prayer.toLowerCase()] === true
      );
      
      const completedCount = requiredPrayers.filter(prayer => 
        dailyPrayers[prayer] === true || dailyPrayers[prayer.toLowerCase()] === true
      ).length;
      
      console.log('🕌 PrayerScreen: Checking prayer completion', {
        dateKey,
        dailyPrayers,
        allCompleted,
        completedCount
      });
      
      if (allCompleted) {
        // All prayers completed - record streak
        const result = await streakService.recordPrayerCompletion();
        console.log('🕌 PrayerScreen: All prayers completed! Streak result:', result);
        
        // Show celebration message if streak increased
        if (result.updated && result.isNewDay && result.isConsecutive) {
          // Trigger confetti for streak achievement
          triggerConfetti();
          
          // Optional: Show alert for streak milestone
          setTimeout(() => {
            Alert.alert(
              '🕌 Prayer Streak!',
              `Masha'Allah! You've completed all prayers for ${result.streak} consecutive days!`,
              [{ text: 'Alhamdulillah!', style: 'default' }]
            );
          }, 1000); // Delay to let confetti show first
        }
      } else {
        // Not all prayers completed - still recalculate streak
        // This handles the case when someone unchecks a prayer
        const result = await streakService.getCurrentPrayerStreak();
        console.log('🕌 PrayerScreen: Prayers incomplete, recalculated streak:', result);
      }
    } catch (error) {
      console.error('🕌 PrayerScreen: Error checking prayer completion:', error);
    }
  };

  // Toggle prayer completion using Firebase prayer service
  const togglePrayer = async (prayerId) => {
    try {
      let newStatus;
      
      if (excuseMode) {
        // In excuse mode, mark prayer as excused
        await prayerService.saveExcusedPrayer(prayerId);
        newStatus = 'excused';
      } else {
        // Normal mode, toggle completion
        newStatus = await prayerService.togglePrayerCompletion(prayerId);
      }
      
      // Update local state for immediate UI feedback
      const today = new Date();
      const dateKey = getDateKey(today);
      const newData = { ...prayerData };
      
      if (!newData[dateKey]) {
        newData[dateKey] = {};
      }
      
      newData[dateKey][prayerId] = newStatus;
      setPrayerData(newData);
      
      // Trigger confetti animation if prayer was marked as completed (not excused)
      if (newStatus === true && !excuseMode) {
        triggerConfetti();
      }
      
      // Always check prayer completion status to recalculate streak
      // This ensures streak is updated when prayers are checked OR unchecked
      if (!excuseMode) {
        await checkAllPrayersCompleted(dateKey, newData);
      }
      
      console.log(`✅ Prayer ${prayerId} marked as ${newStatus === 'excused' ? 'excused' : newStatus ? 'completed' : 'incomplete'}`);
    } catch (error) {
      console.error('Error toggling prayer:', error);
      Alert.alert('Error', 'Failed to update prayer status. Please try again.');
    }
  };

  const handleBellPress = async (prayerId) => {
    // Toggle default notification directly without showing modal
    const currentSetting = prayerNotifications[prayerId];
    let newSettings = { ...prayerNotifications };

    // Toggle between 'notification' (default sound) and false (disabled)
    if (currentSetting === 'notification') {
      newSettings[prayerId] = false;
      Alert.alert('Notification Disabled', `Banner notification disabled for ${getPrayerDisplayName(prayerId)}.`);
    } else {
      newSettings[prayerId] = 'notification';
      Alert.alert('Notification Enabled', `Banner notification enabled for ${getPrayerDisplayName(prayerId)}.`);
    }

    setPrayerNotifications(newSettings);
    await AsyncStorage.setItem('prayerNotifications', JSON.stringify(newSettings));

    // Sync to Firebase for server-side processing
    try {
      await newNotificationService.syncPrayerNotificationSettings();
    } catch (error) {
      console.error('Error syncing prayer settings to Firebase:', error);
    }
  };

  const handleBellLongPress = (prayerId) => {
    // Long press now does the same as single press
    handleBellPress(prayerId);
  };

  const handleGuidedPrayerPress = async (prayer) => {
    console.log('🎯 handleGuidedPrayerPress called for prayer:', prayer.name);
    console.log('📋 Prayer details:', { name: prayer.name, color: prayer.color, time: prayer.time });
    
    try {
      // Reset cache to ensure fresh check
      subscriptionGuard.resetCache();
      // Force a fresh subscription check by bypassing cache
      const isSubscribed = await subscriptionGuard.forceCheckSubscriptionStatus();
      
      if (isSubscribed) {
        navigation.navigate('GuidedPrayer', {
          prayer: {
            name: prayer.name.toLowerCase(),
            color: prayer.color,
            time: prayer.time
          }
        });
      } else {
        setSelectedPrayerForGuided(prayer);
        setShowSubscriptionModal(true);
      }
    } catch (error) {
      console.error('❌ Error checking subscription:', error);
      console.log('🔄 Fallback: showing subscription modal due to error');
      setSelectedPrayerForGuided(prayer);
      setShowSubscriptionModal(true);
    }
  };

  const handleSubscriptionSuccess = () => {
    console.log('🎉 handleSubscriptionSuccess called');
    console.log('📱 Closing subscription modal');
    setShowSubscriptionModal(false);
    
    if (selectedPrayerForGuided) {
      console.log('🧭 Navigating to guided prayer after successful subscription');
      console.log('📋 Selected prayer details:', {
        name: selectedPrayerForGuided.name,
        color: selectedPrayerForGuided.color,
        time: selectedPrayerForGuided.time
      });
      
      navigation.navigate('GuidedPrayer', {
        prayer: {
          name: selectedPrayerForGuided.name.toLowerCase(),
          color: selectedPrayerForGuided.color,
          time: selectedPrayerForGuided.time
        }
      });
      
      console.log('🧹 Clearing selectedPrayerForGuided');
      setSelectedPrayerForGuided(null);
    } else {
      console.log('⚠️ No selectedPrayerForGuided found');
    }
  };

  // Check location permission
  const checkLocationPermission = async () => {
    try {
      const { status } = await Location.getForegroundPermissionsAsync();
      setLocationPermission(status);
      console.log('📍 Location permission status:', status);
    } catch (error) {
      console.error('❌ Error checking location permission:', error);
      setLocationPermission('denied');
    }
  };

  // Request location permission
  const requestLocationPermission = async () => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      setLocationPermission(status);
      console.log('📍 Location permission requested, status:', status);
      
      if (status === 'granted') {
        // Reload prayer times with new location
        if (location?.coords) {
          await calculatePrayerTimes(location.coords);
        }
      } else if (status === 'denied') {
        // Show alert if permission is denied
        Alert.alert(
          'Location Permission Required',
          'To provide accurate prayer times for your area, location access is needed. You can manage this in your device settings.',
          [
            { text: 'OK', style: 'default' }
          ]
        );
      }
    } catch (error) {
      console.error('❌ Error requesting location permission:', error);
      setLocationPermission('denied');
    }
  };

  // Check if prayer is completed using Firebase prayer service
  const isPrayerCompleted = (prayerId) => {
    const today = new Date();
    const dateKey = getDateKey(today);
    return prayerData[dateKey]?.[prayerId] === true;
  };

  // Check if prayer is excused
  const isPrayerExcused = (prayerId) => {
    const today = new Date();
    const dateKey = getDateKey(today);
    return prayerData[dateKey]?.[prayerId] === 'excused';
  };

  // Step completion functions
  const completeStep = (stepIndex) => {
    if (!completedSteps.includes(stepIndex)) {
      const newCompletedSteps = [...completedSteps, stepIndex];
      setCompletedSteps(newCompletedSteps);
      
      // No popup when all steps are done - just show the "I'm Ready for Prayer" button
    }
  };

  const navigateToStep = (stepIndex) => {
    const step = preparationSteps[stepIndex];
    console.log('🧭 navigateToStep called for stepIndex:', stepIndex, 'step:', step?.title);
    setLastNavigatedStep(stepIndex); // Track which step we're navigating to
    
    // Navigate based on step index instead of title comparison
    switch (stepIndex) {
      case 0: // Wudu (Ablution)
        console.log('🚰 Navigating to WuduScreen');
        navigation.navigate('WuduScreen');
        break;
      case 1: // Dressing for Prayer
        console.log('👕 Navigating to DressingScreen');
        navigation.navigate('DressingScreen');
        break;
      case 2: // Clean Spot
        console.log('🧹 Navigating to CleanSpotScreen');
        navigation.navigate('CleanSpotScreen');
        break;
      case 3: // Direction for Prayer
        console.log('🧭 Navigating to QiblaScreen');
        navigation.navigate('QiblaScreen');
        break;
      default:
        console.warn('Unknown step index:', stepIndex);
    }
  };

  const resetPreparationFlow = () => {
    setCompletedSteps([]);
    setCurrentStepIndex(0);
  };

  // Listen for navigation focus to handle returning from step screens
  useEffect(() => {
    const unsubscribe = navigation.addListener('focus', () => {
      // Auto-complete the current step when returning to preparation screen
      // Only auto-complete if we're in preparation section and returning from a preparation step
      if (activeSection === 'preparation' && lastNavigatedStep !== null) {
        setTimeout(() => {
          // Only auto-complete if we're returning from the step we navigated to
          // and it's not already completed
          if (lastNavigatedStep < preparationSteps.length && 
              !completedSteps.includes(lastNavigatedStep) &&
              lastNavigatedStep >= 0) {
            completeStep(lastNavigatedStep);
            setLastNavigatedStep(null); // Reset after completing
          }
        }, 500); // Small delay to ensure smooth transition
      }
    });

    return unsubscribe;
  }, [navigation, activeSection, lastNavigatedStep, completedSteps]);

  const preparationSteps = [
    {
      title: t('wuduAblution', currentLanguage),
      arabic: 'الوضوء',
      icon: 'water-outline',
      color: '#3498db',
      description: t('wuduDescription', currentLanguage),
      details: [
        t('washHandsThreeTimes', currentLanguage),
        t('rinseMouthThreeTimes', currentLanguage),
        t('cleanNostrilsThreeTimes', currentLanguage),
        t('washFaceThreeTimes', currentLanguage),
        t('washArmsUpToElbows', currentLanguage),
        t('wipeHeadOnce', currentLanguage),
        t('washFeetUpToAnkles', currentLanguage)
      ]
    },
    {
      title: t('dressingForPrayer', currentLanguage),
      arabic: 'لباس الصلاة',
      icon: 'shirt-outline',
      color: '#9b59b6',
      description: t('dressingDescription', currentLanguage),
      details: [
        t('wearCleanClothes', currentLanguage),
        t('coverAwrah', currentLanguage),
        t('menCoverNavelToKnees', currentLanguage),
        t('womenCoverEntireBody', currentLanguage)
      ]
    },
    {
      title: t('cleanSpot', currentLanguage),
      arabic: 'المكان الطاهر',
      icon: 'checkmark-circle-outline',
      color: '#27ae60',
      description: t('cleanSpotDescription', currentLanguage),
      details: [
        t('chooseCleanDryArea', currentLanguage),
        t('usePrayerMatIfNeeded', currentLanguage),
        t('removeShoes', currentLanguage),
        t('ensureNoImpurities', currentLanguage)
      ]
    },
    {
      title: t('directionForPrayer', currentLanguage),
      arabic: 'القبلة',
      icon: 'compass-outline',
      color: '#e67e22',
      description: t('directionDescription', currentLanguage),
      details: [
        t('useCompassOrQiblaApp', currentLanguage),
        t('faceTowardsMecca', currentLanguage),
        t('ensureBodyAlignment', currentLanguage),
        t('standOnCleanSurface', currentLanguage)
      ]
    }
  ];

  const getTimeUntilPrayer = (prayerHour, prayerMinute) => {
    const now = new Date();
    const prayer = new Date();
    prayer.setHours(prayerHour, prayerMinute, 0, 0);
    
    if (prayer <= now) {
      prayer.setDate(prayer.getDate() + 1);
    }
    
    const diff = prayer - now;
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    
    return { hours, minutes, totalMinutes: Math.floor(diff / (1000 * 60)) };
  };

  // Next prayer is handled in updateCurrentAndNextPrayer

  const getCurrentPrayer = () => {
    if (!prayerTimes.length) return { prayer: null, index: -1 };
    
    const now = new Date();
    for (let i = 0; i < prayerTimes.length; i++) {
      if (now < prayerTimes[i].dateObj) {
        return { 
          prayer: i > 0 ? prayerTimes[i - 1] : prayerTimes[prayerTimes.length - 1], 
          index: i > 0 ? i - 1 : prayerTimes.length - 1 
        };
      }
    }
    return { prayer: prayerTimes[prayerTimes.length - 1], index: prayerTimes.length - 1 };
  };

  const getPrayerTimeScene = (prayerId) => {
    switch (prayerId) {
      case 'fajr':
        return { colors: ['#4c669f', '#3b5998', '#192f6a'] };
      case 'dhuhr':
        return { colors: ['#00BFFF', '#87CEEB', '#E0F6FF'] };
      case 'asr':
        return { colors: ['#F4A460', '#DEB887', '#FFF8DC'] };
      case 'maghrib':
        return { colors: ['#FF6347', '#FF7F50', '#FFA07A'] };
      case 'isha':
        return { colors: ['#191970', '#1e1e3f', '#2a2a5a'] };
      default:
        return { colors: ['#1E1E1E', '#1E1E1E'] };
    }
  };

  // Get appropriate text color based on prayer background
  const getPrayerTextColor = (prayerId) => {
    switch (prayerId) {
      case 'fajr':
      case 'isha':
        return '#FFFFFF'; // White text for dark backgrounds
      case 'dhuhr':
      case 'asr':
        return '#1A1A1A'; // Dark text for light backgrounds
      case 'maghrib':
        return '#FFFFFF'; // White text for orange/red background
      case 'sunrise':
        return '#1A1A1A'; // Dark text for light orange background
      default:
        return '#FFFFFF';
    }
  };

  // Get appropriate time text color (for text below cards)
  const getPrayerTimeTextColor = (prayerId) => {
    return '#FFFFFF'; // Always white for all prayer times
  };

  const getTimeBasedScene = () => {
    const hour = new Date().getHours();
    
    if (hour >= 5 && hour < 6) { // Fajr time
      return {
        type: 'dawn',
        colors: ['#4c669f', '#3b5998', '#192f6a'], // Dawn blues
        sceneName: 'Dawn'
      };
    } else if (hour >= 6 && hour < 12) { // Morning
      return {
        type: 'morning',
        colors: ['#87CEEB', '#E0F6FF', '#B0E0E6'], // Light blue sky
        sceneName: 'Morning'
      };
    } else if (hour >= 12 && hour < 15) { // Dhuhr time
      return {
        type: 'noon',
        colors: ['#00BFFF', '#87CEEB', '#E0F6FF'], // Bright day sky
        sceneName: 'Noon'
      };
    } else if (hour >= 15 && hour < 18) { // Asr time
      return {
        type: 'afternoon',
        colors: ['#F4A460', '#DEB887', '#FFF8DC'], // Golden afternoon
        sceneName: 'Afternoon'
      };
    } else if (hour >= 18 && hour < 20) { // Maghrib time
      return {
        type: 'sunset',
        colors: ['#FF6347', '#FF7F50', '#FFA07A'], // Sunset colors
        sceneName: 'Sunset'
      };
    } else { // Isha and night
      return {
        type: 'night',
        colors: ['#191970', '#1e1e3f', '#2a2a5a'], // Night sky
        sceneName: 'Night'
      };
    }
  };

  const formatTime = (date) => {
    return date.toLocaleTimeString([], { 
      hour: 'numeric', 
      minute: '2-digit',
      hour12: true 
    });
  };

  const handleStepPress = (step, stepIndex) => {
    console.log('🎯 handleStepPress called for step:', step.title, 'index:', stepIndex);
    setCurrentStepIndex(stepIndex);
    navigateToStep(stepIndex);
  };

  const isStepAccessible = (stepIndex) => {
    return true; // All steps are now accessible
  };

  const isStepCompleted = (stepIndex) => {
    return completedSteps.includes(stepIndex);
  };

  const isStepCurrent = (stepIndex) => {
    return stepIndex === currentStepIndex;
  };

  const WaveHeader = () => {
    const { width } = Dimensions.get('window');
    const scene = getTimeBasedScene();
    
    return (
      <View style={styles.headerContainer}>
        <LinearGradient
          colors={scene.colors}
          style={styles.headerBackground}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
        >
          {/* Celestial Elements */}
          {scene.type === 'morning' || scene.type === 'noon' || scene.type === 'afternoon' ? (
            <>
              {/* Sun */}
              <View style={[styles.celestialBody, { right: width * 0.15, top: 40 }]}>
                <View style={styles.celestialGlow} />
                <View style={[styles.sun, { backgroundColor: scene.type === 'noon' ? '#FFD700' : '#FFA500' }]}>
                  <Ionicons name="sunny" size={24} color="#FFF" />
                </View>
              </View>
              
              {/* Clouds */}
              <View style={styles.clouds}>
                <View style={[styles.cloud, { left: width * 0.1, top: 20 }]} />
                <View style={[styles.cloud, { left: width * 0.6, top: 35, opacity: 0.7 }]} />
                <View style={[styles.cloud, { left: width * 0.8, top: 25, opacity: 0.5 }]} />
              </View>
            </>
          ) : scene.type === 'sunset' ? (
            <>
              {/* Setting Sun */}
              <View style={[styles.celestialBody, { right: width * 0.1, top: 60 }]}>
                <View style={[styles.celestialGlow, { backgroundColor: 'rgba(255, 165, 0, 0.4)' }]} />
                <View style={[styles.sun, { backgroundColor: '#FF4500' }]}>
                  <Ionicons name="sunny" size={24} color="#FFF" />
                </View>
              </View>
              
              {/* Sunset Clouds */}
              <View style={styles.clouds}>
                <View style={[styles.cloud, { left: width * 0.2, top: 30, backgroundColor: 'rgba(255, 182, 193, 0.8)' }]} />
                <View style={[styles.cloud, { left: width * 0.7, top: 45, backgroundColor: 'rgba(255, 160, 122, 0.7)' }]} />
              </View>
            </>
          ) : scene.type === 'dawn' ? (
            <>
              {/* Rising Sun */}
              <View style={[styles.celestialBody, { left: width * 0.1, top: 70 }]}>
                <View style={[styles.celestialGlow, { backgroundColor: 'rgba(255, 215, 0, 0.3)' }]} />
                <View style={[styles.sun, { backgroundColor: '#FFB347' }]}>
                  <Ionicons name="sunny-outline" size={24} color="#FFF" />
                </View>
              </View>
              
              {/* Dawn Clouds */}
              <View style={styles.clouds}>
                <View style={[styles.cloud, { left: width * 0.4, top: 25, backgroundColor: 'rgba(176, 196, 222, 0.6)' }]} />
                <View style={[styles.cloud, { left: width * 0.75, top: 40, backgroundColor: 'rgba(176, 196, 222, 0.4)' }]} />
              </View>
            </>
          ) : (
            <>
              {/* Moon and Stars for Night */}
              <View style={[styles.celestialBody, { right: width * 0.2, top: 30 }]}>
                <View style={[styles.celestialGlow, { backgroundColor: 'rgba(255, 255, 255, 0.2)' }]} />
                <View style={styles.moon}>
                  <Ionicons name="moon" size={24} color="#F5F5DC" />
                </View>
              </View>
              
              {/* Stars */}
              <View style={styles.stars}>
                {[...Array(15)].map((_, i) => (
                  <View 
                    key={i}
                    style={[
                      styles.star,
                      { 
                        left: Math.random() * width,
                        top: Math.random() * 120 + 20,
                        width: Math.random() * 3 + 1,
                        height: Math.random() * 3 + 1,
                        opacity: Math.random() * 0.8 + 0.3
                      }
                    ]}
                  />
                ))}
              </View>
            </>
          )}

          <View style={styles.headerContent}>
            <View style={styles.nextPrayerInfo}>
              <Text style={styles.nextPrayerLabel}>
                {isPrayerTimeActive ? t('currentPrayer', currentLanguage) : t('nextPrayer', currentLanguage)}
              </Text>
              <Text style={[
                styles.nextPrayerName,
                ((isPrayerTimeActive ? currentPrayer?.id : nextPrayer?.id) === 'fajr' || (isPrayerTimeActive ? currentPrayer?.id : nextPrayer?.id) === 'isha') && { color: '#fff' }
              ]}>
                {isPrayerTimeActive ? currentPrayer?.name : nextPrayer?.name}
              </Text>
              <Text style={styles.locationTextCentered}>
                📍 {cityName}
              </Text>
              {!isPrayerTimeActive && nextPrayer && (
                <View style={styles.countdownContainer}>
                  <Text style={[
                    styles.countdownText,
                    (nextPrayer?.id === 'fajr' || nextPrayer?.id === 'isha') && { color: '#fff' }
                  ]}>
                    {countdown.hours.toString().padStart(2, '0')}:
                    {countdown.minutes.toString().padStart(2, '0')}:
                    {countdown.seconds.toString().padStart(2, '0')}
                  </Text>
                </View>
              )}
            </View>
          </View>
        </LinearGradient>
        
        
      </View>
    );
  };

  const renderPrayerContent = () => {
    const now = new Date();
    
    return (
      <>
        {/* Prayer Times Grid - 3x2 Layout */}
        <View style={styles.prayerGrid}>
          {/* Row 1: Fajr and Sunrise */}
          <View style={styles.gridRow}>
                        {prayerTimes.slice(0, 2).map((prayer, index) => {
              const isCompleted = isPrayerCompleted(prayer.id);
              const isExcused = isPrayerExcused(prayer.id);
              const isNotificationOn = prayerNotifications[prayer.id];
              const isNextPrayer = nextPrayer?.id === prayer.id;
              const isPastPrayer = now > prayer.dateObj;

              return (
                <View key={index}>
                  <Animated.View style={{ transform: [{ scale: prayerScales[prayer.id] || new Animated.Value(1) }] }}>
                    <TouchableOpacity
                      onPress={() => animatePrayerCard(prayer.id, () => togglePrayer(prayer.id))}
                      onLongPress={() => handleGuidedPrayerPress(prayer)}
                      activeOpacity={0.9}
                    >
                      <LinearGradient 
                        colors={prayer.scene.colors} 
                        style={[
                          styles.prayerTabGrid,
                          isPastPrayer && styles.pastPrayerTab
                        ]}
                      >
                        <View style={[
                          styles.prayerTabOverlay,
                          excuseMode ? { backgroundColor: 'transparent' } : {}
                        ]}>
                          {/* Bell in top-left */}
                          <TouchableOpacity
                            style={[styles.notificationBell, { left: 8, right: 'auto', top: 8 }]}
                            onPress={(e) => {
                              e.stopPropagation();
                              animateButtonPress(bellButtonScale, () => handleBellPress(prayer.id));
                            }}
                            onLongPress={(e) => {
                              e.stopPropagation();
                              handleBellLongPress(prayer.id);
                            }}
                          >
                            <Ionicons
                              name={prayerNotifications[prayer.id] === 'notification' ? "notifications" : "notifications-off-outline"}
                              size={24}
                              color={prayerNotifications[prayer.id] === 'notification' ? "#fff" : "rgba(255, 255, 255, 0.8)"}
                            />
                          </TouchableOpacity>
                          {/* Checkmark in top-right */}
                          {(isCompleted || isExcused || true) && (
                            <View style={[styles.checkboxContainer, { right: 8, left: 'auto', top: 8 }]}> 
                              <View style={
                                isExcused
                                  ? [styles.checkbox, styles.excusedBox]
                                  : isCompleted
                                  ? [styles.checkbox, styles.checkedBox]
                                  : styles.emptyCircle
                              }>
                                {excuseMode && isExcused ? (
                                  <Text style={styles.excusedIcon}>🌡️</Text>
                                ) : isCompleted ? (
                                  <Ionicons name="checkmark" size={12} color="#fff" />
                                ) : null}
                              </View>
                            </View>
                          )}
                          {/* Centered prayer name/status */}
                          <View style={styles.prayerTextContainer}>
                            <Text style={[
                              styles.timelinePrayerName,
                              isPastPrayer && styles.activeTimelineText,
                              { color: ['sunrise', 'dhuhr', 'asr'].includes(prayer.id) ? '#FFFFFF' : getPrayerTextColor(prayer.id) }
                            ]}>
                              {prayer.name}
                            </Text>
                            {nextPrayer?.id === prayer.id ? (
                              <View style={styles.countdownContainer}>
                                <Text style={[styles.countdownText, { color: ['sunrise', 'dhuhr', 'asr'].includes(prayer.id) ? '#FFFFFF' : getPrayerTextColor(prayer.id) }]}>
                                  {countdown.hours.toString().padStart(2, '0')}:
                                  {countdown.minutes.toString().padStart(2, '0')}:
                                  {countdown.seconds.toString().padStart(2, '0')}
                                </Text>
                              </View>
                            ) : currentPrayer?.id === prayer.id ? (
                              <Text style={[styles.prayerStatus, { color: ['sunrise', 'dhuhr', 'asr'].includes(prayer.id) ? '#FFFFFF' : getPrayerTextColor(prayer.id) }]}>{t('now', currentLanguage)}</Text>
                            ) : isPastPrayer ? (
                              <Text style={[styles.prayerStatus, { color: ['sunrise', 'dhuhr', 'asr'].includes(prayer.id) ? '#FFFFFF' : getPrayerTextColor(prayer.id) }]}>{t('past', currentLanguage)}</Text>
                            ) : (
                              <Text style={[styles.prayerStatus, { color: ['sunrise', 'dhuhr', 'asr'].includes(prayer.id) ? '#FFFFFF' : getPrayerTextColor(prayer.id) }]}>{t('upcoming', currentLanguage)}</Text>
                            )}
                          </View>
                          {/* Guided prayer hint */}
                          <Text style={[
                            styles.guidedPrayerHint,
                            { color: ['sunrise', 'dhuhr', 'asr'].includes(prayer.id) ? '#FFFFFF' : getPrayerTextColor(prayer.id), position: 'absolute', bottom: 16, fontSize: 10 }
                          ]}>
                            {prayer.id === 'sunrise' ? t('optional', currentLanguage) : t('holdForGuidedPrayer', currentLanguage)}
                          </Text>
                        </View>
                      </LinearGradient>
                    </TouchableOpacity>
                    </Animated.View>
                    <Text style={[
                      styles.prayerTimeBelow,
                      isPastPrayer && styles.pastPrayerTime,
                      { color: '#FFFFFF' }
                    ]}>
                      {prayer.time}
                    </Text>
                  </View>
                );
              })}
          </View>
          
          {/* Row 2: Dhuhr and Asr */}
          <View style={styles.gridRow}>
            {prayerTimes.slice(2, 4).map((prayer, index) => {
              const isCompleted = isPrayerCompleted(prayer.id);
              const isExcused = isPrayerExcused(prayer.id);
              const isNotificationOn = prayerNotifications[prayer.id];
              const isNextPrayer = nextPrayer?.id === prayer.id;
              const isPastPrayer = now > prayer.dateObj;

              return (
                <View key={index + 2}>
                  <Animated.View style={{ transform: [{ scale: prayerScales[prayer.id] || new Animated.Value(1) }] }}>
                    <TouchableOpacity
                      onPress={() => animatePrayerCard(prayer.id, () => togglePrayer(prayer.id))}
                      onLongPress={() => handleGuidedPrayerPress(prayer)}
                      activeOpacity={0.9}
                    >
                      <LinearGradient 
                        colors={prayer.scene.colors} 
                        style={[
                          styles.prayerTabGrid,
                          isPastPrayer && styles.pastPrayerTab
                        ]}
                      >
                        <View style={[
                          styles.prayerTabOverlay,
                          excuseMode ? { backgroundColor: 'transparent' } : {}
                        ]}>
                          {/* Bell in top-left */}
                          <TouchableOpacity
                            style={[styles.notificationBell, { left: 8, right: 'auto', top: 8 }]}
                            onPress={(e) => {
                              e.stopPropagation();
                              handleBellPress(prayer.id);
                            }}
                            onLongPress={(e) => {
                              e.stopPropagation();
                              handleBellLongPress(prayer.id);
                            }}
                          >
                             <Ionicons
                              name={prayerNotifications[prayer.id] === 'notification' ? "notifications" : "notifications-off-outline"}
                              size={24}
                              color={prayerNotifications[prayer.id] === 'notification' ? "#fff" : "rgba(255, 255, 255, 0.8)"}
                            />
                          </TouchableOpacity>
                          {/* Checkmark in top-right */}
                          {(isCompleted || isExcused || true) && (
                            <View style={[styles.checkboxContainer, { right: 8, left: 'auto', top: 8 }]}> 
                              <View style={
                                isExcused
                                  ? [styles.checkbox, styles.excusedBox]
                                  : isCompleted
                                  ? [styles.checkbox, styles.checkedBox]
                                  : styles.emptyCircle
                              }>
                                {excuseMode && isExcused ? (
                                  <Text style={styles.excusedIcon}>🌡️</Text>
                                ) : isCompleted ? (
                                  <Ionicons name="checkmark" size={12} color="#fff" />
                                ) : null}
                              </View>
                            </View>
                          )}
                          {/* Centered prayer name/status */}
                          <View style={styles.prayerTextContainer}>
                            <Text style={[
                              styles.timelinePrayerName,
                              isPastPrayer && styles.activeTimelineText,
                              { color: ['sunrise', 'dhuhr', 'asr'].includes(prayer.id) ? '#FFFFFF' : getPrayerTextColor(prayer.id) }
                            ]}>
                              {prayer.name}
                            </Text>
                            {nextPrayer?.id === prayer.id ? (
                              <View style={styles.countdownContainer}>
                                <Text style={[styles.countdownText, { color: ['sunrise', 'dhuhr', 'asr'].includes(prayer.id) ? '#FFFFFF' : getPrayerTextColor(prayer.id) }]}>
                                  {countdown.hours.toString().padStart(2, '0')}:
                                  {countdown.minutes.toString().padStart(2, '0')}:
                                  {countdown.seconds.toString().padStart(2, '0')}
                                </Text>
                              </View>
                            ) : currentPrayer?.id === prayer.id ? (
                              <Text style={[styles.prayerStatus, { color: ['sunrise', 'dhuhr', 'asr'].includes(prayer.id) ? '#FFFFFF' : getPrayerTextColor(prayer.id) }]}>{t('now', currentLanguage)}</Text>
                            ) : isPastPrayer ? (
                              <Text style={[styles.prayerStatus, { color: ['sunrise', 'dhuhr', 'asr'].includes(prayer.id) ? '#FFFFFF' : getPrayerTextColor(prayer.id) }]}>{t('past', currentLanguage)}</Text>
                            ) : (
                              <Text style={[styles.prayerStatus, { color: ['sunrise', 'dhuhr', 'asr'].includes(prayer.id) ? '#FFFFFF' : getPrayerTextColor(prayer.id) }]}>{t('upcoming', currentLanguage)}</Text>
                            )}
                          </View>
                          {/* Guided prayer hint */}
                          <Text style={[
                            styles.guidedPrayerHint,
                            { color: ['sunrise', 'dhuhr', 'asr'].includes(prayer.id) ? '#FFFFFF' : getPrayerTextColor(prayer.id), position: 'absolute', bottom: 16, fontSize: 10 }
                          ]}>
                            {prayer.id === 'sunrise' ? t('optional', currentLanguage) : t('holdForGuidedPrayer', currentLanguage)}
                          </Text>
                        </View>
                      </LinearGradient>
                    </TouchableOpacity>
                    </Animated.View>
                    <Text style={[
                      styles.prayerTimeBelow,
                      isPastPrayer && styles.pastPrayerTime,
                      { color: '#FFFFFF' }
                    ]}>
                      {prayer.time}
                    </Text>
                  </View>
                );
              })}
          </View>
          
          {/* Row 3: Maghrib and Isha */}
          <View style={styles.gridRow}>
            {prayerTimes.slice(4, 6).map((prayer, index) => {
              const isCompleted = isPrayerCompleted(prayer.id);
              const isExcused = isPrayerExcused(prayer.id);
              const isNotificationOn = prayerNotifications[prayer.id];
              const isNextPrayer = nextPrayer?.id === prayer.id;
              const isPastPrayer = now > prayer.dateObj;

              return (
                <View key={index + 4}>
                  <Animated.View style={{ transform: [{ scale: prayerScales[prayer.id] || new Animated.Value(1) }] }}>
                    <TouchableOpacity
                      onPress={() => animatePrayerCard(prayer.id, () => togglePrayer(prayer.id))}
                      onLongPress={() => handleGuidedPrayerPress(prayer)}
                      activeOpacity={0.9}
                    >
                      <LinearGradient 
                        colors={prayer.scene.colors} 
                        style={[
                          styles.prayerTabGrid,
                          isPastPrayer && styles.pastPrayerTab
                        ]}
                      >
                        <View style={[
                          styles.prayerTabOverlay,
                          excuseMode ? { backgroundColor: 'transparent' } : {}
                        ]}>
                          {/* Bell in top-left */}
                          <TouchableOpacity
                            style={[styles.notificationBell, { left: 8, right: 'auto', top: 8 }]}
                            onPress={(e) => {
                              e.stopPropagation();
                              handleBellPress(prayer.id);
                            }}
                            onLongPress={(e) => {
                              e.stopPropagation();
                              handleBellLongPress(prayer.id);
                            }}
                          >
                            <Ionicons
                              name={prayerNotifications[prayer.id] === 'notification' ? "notifications" : "notifications-off-outline"}
                              size={24}
                              color={prayerNotifications[prayer.id] === 'notification' ? "#fff" : "rgba(255, 255, 255, 0.8)"}
                            />
                          </TouchableOpacity>
                          {/* Checkmark in top-right */}
                          {(isCompleted || isExcused || true) && (
                            <View style={[styles.checkboxContainer, { right: 8, left: 'auto', top: 8 }]}> 
                              <View style={
                                isExcused
                                  ? [styles.checkbox, styles.excusedBox]
                                  : isCompleted
                                  ? [styles.checkbox, styles.checkedBox]
                                  : styles.emptyCircle
                              }>
                                {excuseMode && isExcused ? (
                                  <Text style={styles.excusedIcon}>🌡️</Text>
                                ) : isCompleted ? (
                                  <Ionicons name="checkmark" size={12} color="#fff" />
                                ) : null}
                              </View>
                            </View>
                          )}
                          {/* Centered prayer name/status */}
                          <View style={styles.prayerTextContainer}>
                            <Text style={[
                              styles.timelinePrayerName,
                              isPastPrayer && styles.activeTimelineText,
                              { color: ['sunrise', 'dhuhr', 'asr'].includes(prayer.id) ? '#FFFFFF' : getPrayerTextColor(prayer.id) }
                            ]}>
                              {prayer.name}
                            </Text>
                            {nextPrayer?.id === prayer.id ? (
                              <View style={styles.countdownContainer}>
                                <Text style={[styles.countdownText, { color: ['sunrise', 'dhuhr', 'asr'].includes(prayer.id) ? '#FFFFFF' : getPrayerTextColor(prayer.id) }]}>
                                  {countdown.hours.toString().padStart(2, '0')}:
                                  {countdown.minutes.toString().padStart(2, '0')}:
                                  {countdown.seconds.toString().padStart(2, '0')}
                                </Text>
                              </View>
                            ) : currentPrayer?.id === prayer.id ? (
                              <Text style={[styles.prayerStatus, { color: ['sunrise', 'dhuhr', 'asr'].includes(prayer.id) ? '#FFFFFF' : getPrayerTextColor(prayer.id) }]}>{t('now', currentLanguage)}</Text>
                                                          ) : isPastPrayer ? (
                                <Text style={[styles.prayerStatus, { color: ['sunrise', 'dhuhr', 'asr'].includes(prayer.id) ? '#FFFFFF' : getPrayerTextColor(prayer.id) }]}>{t('past', currentLanguage)}</Text>
                              ) : (
                                <Text style={[styles.prayerStatus, { color: ['sunrise', 'dhuhr', 'asr'].includes(prayer.id) ? '#FFFFFF' : getPrayerTextColor(prayer.id) }]}>{t('upcoming', currentLanguage)}</Text>
                              )}
                          </View>
                          {/* Guided prayer hint */}
                          <Text style={[
                            styles.guidedPrayerHint,
                            { color: ['sunrise', 'dhuhr', 'asr'].includes(prayer.id) ? '#FFFFFF' : getPrayerTextColor(prayer.id), position: 'absolute', bottom: 16, fontSize: 10 }
                          ]}>
                            {prayer.id === 'sunrise' ? t('optional', currentLanguage) : t('holdForGuidedPrayer', currentLanguage)}
                          </Text>
                        </View>
                      </LinearGradient>
                    </TouchableOpacity>
                    </Animated.View>
                    <Text style={[
                      styles.prayerTimeBelow,
                      isPastPrayer && styles.pastPrayerTime,
                      { color: '#FFFFFF' }
                    ]}>
                      {prayer.time}
                    </Text>
                </View>
              );
            })}
          </View>
        </View>
      </>
    );
  };

  const renderPreparationSection = () => (
    <>
      {/* Introduction */}
      <View style={styles.introSection}>
        <View style={styles.progressContainer}>
          <Text style={styles.progressText}>
            {t('progress', currentLanguage)}: {completedSteps.length} / {preparationSteps.length} {t('completed', currentLanguage)}
          </Text>
          <View style={styles.progressBar}>
            <View style={[
              styles.progressFill,
              { width: `${(completedSteps.length / preparationSteps.length) * 100}%` }
            ]} />
          </View>
        </View>
        <Text style={styles.introText}>
          {t('completeTheseStepsToPrepare', currentLanguage)}
        </Text>
        <Text style={styles.introQuote}>
          {t('allahLovesThoseWhoTurn', currentLanguage)}
        </Text>
        <Text style={styles.introReference}>- {t('quran', currentLanguage)} 2:222</Text>
        
        {/* Reset Button */}
        <TouchableOpacity 
          style={styles.resetButton}
          onPress={resetPreparationFlow}
        >
          <Ionicons name="refresh" size={16} color="#FFFFFF" />
          <Text style={styles.resetButtonText}>{t('startOver', currentLanguage)}</Text>
        </TouchableOpacity>
      </View>

      {/* Preparation Steps */}
      <View style={styles.stepsContainer}>
        {/* First row of preparation steps */}
        <View style={styles.gridRow}>
          {preparationSteps.slice(0, 2).map((step, index) => {
            const stepIndex = index;
            const isCompleted = isStepCompleted(stepIndex);
            const isCurrent = isStepCurrent(stepIndex);
            
            return (
              <TouchableOpacity
                key={index}
                style={[
                  styles.stepCardGrid,
                  isCompleted && styles.completedStepCard,
                  isCurrent && styles.currentStepCard,
                  styles.activeStepCard,
                ]}
                onPress={() => {
                  console.log('👆 TouchableOpacity pressed for step:', step.title, 'stepIndex:', stepIndex);
                  handleStepPress(step, stepIndex);
                }}
              >
                <View style={styles.stepIconContainer}>
                  <Ionicons 
                    name={step.icon}
                    size={20} 
                    color={step.color} 
                  />
                </View>
                <Text style={styles.stepTitleGrid}>
                  {step.title}
                </Text>
                <Text style={styles.stepArabicGrid}>
                  {step.arabic}
                </Text>
                <View style={[
                  styles.stepNumberGrid,
                  isCompleted && styles.completedStepNumber
                ]}>
                  {isCompleted ? (
                    <Ionicons name="checkmark" size={12} color="#fff" />
                  ) : (
                    <Text style={styles.stepNumberText}>
                      {index + 1}
                    </Text>
                  )}
                </View>
              </TouchableOpacity>
            );
          })}
        </View>
        
        {/* Second row of preparation steps */}
        <View style={styles.gridRow}>
          {preparationSteps.slice(2, 4).map((step, index) => {
            const stepIndex = index + 2;
            const isCompleted = isStepCompleted(stepIndex);
            const isCurrent = isStepCurrent(stepIndex);
            
            return (
              <TouchableOpacity
                key={index + 2}
                style={[
                  styles.stepCardGrid,
                  isCompleted && styles.completedStepCard,
                  isCurrent && styles.currentStepCard,
                  styles.activeStepCard,
                ]}
                onPress={() => {
                  console.log('👆 TouchableOpacity pressed for step:', step.title, 'stepIndex:', stepIndex);
                  handleStepPress(step, stepIndex);
                }}
              >
                <View style={styles.stepIconContainer}>
                  <Ionicons 
                    name={step.icon}
                    size={20} 
                    color={step.color} 
                  />
                </View>
                <Text style={styles.stepTitleGrid}>
                  {step.title}
                </Text>
                <Text style={styles.stepArabicGrid}>
                  {step.arabic}
                </Text>
                <View style={[
                  styles.stepNumberGrid,
                  isCompleted && styles.completedStepNumber
                ]}>
                  {isCompleted ? (
                    <Ionicons name="checkmark" size={12} color="#fff" />
                  ) : (
                    <Text style={styles.stepNumberText}>
                      {index + 3}
                    </Text>
                  )}
                </View>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>

      {/* Ready Button - Only show when all steps completed */}
      {completedSteps.length === preparationSteps.length && (
        <TouchableOpacity 
          style={styles.readyButton}
          onPress={() => {
            Alert.alert(
              'Ready for Prayer',
              'Alhamdulillah! May Allah accept your prayers. Go in peace.',
              [
                { 
                  text: 'Start Prayer', 
                  onPress: () => setActiveSection('prayer')
                }
              ]
            );
          }}
        >
          <Text style={styles.readyButtonText}>I'm Ready for Prayer</Text>
          <Ionicons name="checkmark-circle" size={20} color="#fff" />
        </TouchableOpacity>
      )}

      {/* Extra: Things to Know Section */}
      <View style={styles.extraSection}>
        <Text style={styles.extraSectionTitle}>{t('extraThingsToKnow', currentLanguage)}</Text>
        
        {/* Ghusl Card */}
        <TouchableOpacity
          style={styles.extraCard}
          onPress={() => navigation.navigate('GhuslScreen')}
        >
          <View>
            <Text style={styles.extraCardTitle}>{t('ghuslFullRitualBath', currentLanguage)}</Text>
            <Text style={styles.extraCardSubtitle}>الغسل</Text>
          </View>
        </TouchableOpacity>

        {/* Hajj Card */}
        <TouchableOpacity
          style={styles.extraCard}
          onPress={() => navigation.navigate('HajjScreen')}
        >
          <View>
            <Text style={styles.extraCardTitle}>{t('hajjPilgrimage', currentLanguage)}</Text>
            <Text style={styles.extraCardSubtitle}>الحج</Text>
          </View>
        </TouchableOpacity>

        {/* Umrah Card */}
        <TouchableOpacity
          style={styles.extraCard}
          onPress={() => navigation.navigate('UmrahScreen')}
        >
          <View>
            <Text style={styles.extraCardTitle}>{t('umrahMinorPilgrimage', currentLanguage)}</Text>
            <Text style={styles.extraCardSubtitle}>العمرة</Text>
          </View>
        </TouchableOpacity>

        {/* 99 Names of Allah Card */}
        <TouchableOpacity
          style={styles.extraCard}
          onPress={() => navigation.navigate('NamesOfAllahScreen')}
        >
          <View>
            <Text style={styles.extraCardTitle}>{t('namesOfAllah', currentLanguage)}</Text>
            <Text style={styles.extraCardSubtitle}>أسماء الله الحسنى</Text>
          </View>
        </TouchableOpacity>
      </View>
    </>
  );

  const getFormattedDates = () => {
    const today = new Date();
    const gregorianDate = today.toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });

    // Convert to Hijri
    const todayParts = {
      year: today.getFullYear(),
      month: today.getMonth() + 1,
      date: today.getDate()
    };
    
    const hijriDate = HijriConverter.toHijri(todayParts.year, todayParts.month, todayParts.date);
    const hijriMonths = [
      'Muharram', 'Safar', 'Rabi al-Awwal', 'Rabi al-Thani',
      'Jumada al-Awwal', 'Jumada al-Thani', 'Rajab', 'Shaban',
      'Ramadan', 'Shawwal', 'Dhu al-Qadah', 'Dhu al-Hijjah'
    ];
    
    const islamicDate = `${hijriDate.hd} ${hijriMonths[hijriDate.hm - 1]} ${hijriDate.hy} H`;
    
    return { gregorianDate, islamicDate };
  };

  // Helper: fetch prayer times from AlAdhan API
  const fetchAlAdhanPrayerTimes = async (coords, date = new Date(), method = null, madhab = null) => {
    try {
      const year = date.getFullYear();
      const month = (date.getMonth() + 1).toString().padStart(2, '0');
      const day = date.getDate().toString().padStart(2, '0');
      
      // Use user's madhab preference if not provided
      const userMethod = method || getMadhabMethod(userMadhab);
      const userSchool = madhab || getMadhabNumber(userMadhab);
      
      // Use IANA timezone for accurate DST handling (e.g. America/New_York)
      const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
      
      // Aladhan API requires DD-MM-YYYY format (not YYYY-MM-DD) - wrong format returns wrong year and incorrect DST times
      const url = `https://api.aladhan.com/v1/timings/${day}-${month}-${year}?latitude=${coords.latitude}&longitude=${coords.longitude}&method=${userMethod}&school=${userSchool}&timezonestring=${encodeURIComponent(timezone)}`;
      const response = await fetch(url);
      const json = await response.json();
      if (json.code === 200 && json.data && json.data.timings) {
        return json.data.timings;
      }
      return null;
    } catch (e) {
      console.error('AlAdhan API error:', e);
      return null;
    }
  };

  const scheduleNotificationsOncePerDay = async (prayers) => {
    try {
      console.log('📅 PrayerScreen: Scheduling time-sensitive notifications for prayers:', prayers.length);
      // Use the new time-sensitive notification system
      await newNotificationService.scheduleTimeSensitiveNotifications(prayers);
      console.log('✅ PrayerScreen: Time-sensitive notifications scheduled successfully');
    } catch (e) {
      console.error('❌ Error scheduling time-sensitive notifications:', e);
    }
  };

  // Send prayer notification when countdown reaches zero
  const sendPrayerNotification = async (prayer) => {
    try {
      console.log(`📬 PrayerScreen: Prayer notifications now handled by Firebase Functions`);
      console.log(`📬 PrayerScreen: ${prayer.name} notification will be sent by server`);
    } catch (error) {
      console.error('❌ PrayerScreen: Error with prayer notification:', error);
    }
  };

  // Modified calculatePrayerTimes to use ONLY AlAdhan API
  const calculatePrayerTimes = async (coords) => {
    const date = new Date();
    // Only use AlAdhan API
    const timings = await fetchAlAdhanPrayerTimes(coords, date);
    if (timings) {
      // Apply custom adjustments to match Pillars App
      const applyCustomAdjustments = (timings) => {
        const adjustments = {
          'Fajr': 0,      // No adjustment
          'Sunrise': 0,   // No adjustment
          'Dhuhr': 1,     // +1 minute
          'Asr': -1,      // -1 minute
          'Maghrib': 1,   // +1 minute (like Pillars App)
          'Isha': 0       // No adjustment
        };
        
        const adjustedTimings = { ...timings };
        
        Object.keys(adjustments).forEach(prayer => {
          if (adjustedTimings[prayer] && adjustments[prayer] !== 0) {
            const [hours, minutes] = adjustedTimings[prayer].split(':').map(Number);
            const totalMinutes = hours * 60 + minutes + adjustments[prayer];
            const newHours = Math.floor(totalMinutes / 60) % 24;
            const newMinutes = totalMinutes % 60;
            adjustedTimings[prayer] = `${newHours.toString().padStart(2, '0')}:${newMinutes.toString().padStart(2, '0')}`;
          }
        });
        
        return adjustedTimings;
      };

      // Apply adjustments
      const adjustedTimings = applyCustomAdjustments(timings);

      // Map AlAdhan timings to the structure used in the app
      const parseTime = (timeStr) => {
        let [h, m] = timeStr.split(":");
        h = parseInt(h, 10);
        m = parseInt(m, 10);
        if (/am|pm/i.test(timeStr)) {
          const isPM = /pm/i.test(timeStr);
          if (isPM && h < 12) h += 12;
          if (!isPM && h === 12) h = 0;
        }
        const d = new Date(date);
        d.setHours(h, m, 0, 0);
        return d;
      };

      const formatTime = (timeStr) => {
        let [h, m] = timeStr.split(":");
        h = parseInt(h, 10);
        m = parseInt(m, 10);
        
        const period = h >= 12 ? 'PM' : 'AM';
        const displayHour = h === 0 ? 12 : h > 12 ? h - 12 : h;
        const displayMinute = m.toString().padStart(2, '0');
        
        return `${displayHour}:${displayMinute} ${period}`;
      };
      const prayers = [
        {
          id: 'fajr',
          name: t('fajr', currentLanguage),
          arabicName: 'الفجر',
          description: t('dawnPrayer', currentLanguage),
          time: formatTime(adjustedTimings.Fajr),
          dateObj: parseTime(adjustedTimings.Fajr),
          color: '#FF6B6B',
          scene: { colors: ['#4c669f', '#3b5998', '#192f6a'], name: t('dawn', currentLanguage) }
        },
        {
          id: 'sunrise',
          name: t('sunrise', currentLanguage),
          arabicName: 'الشروق',
          description: t('sunrise', currentLanguage),
          time: formatTime(adjustedTimings.Sunrise),
          dateObj: parseTime(adjustedTimings.Sunrise),
          color: '#FFD700',
          scene: { colors: ['#FFA500', '#FF8C00', '#FF7F50'], name: t('sunrise', currentLanguage) }
        },
        {
          id: 'dhuhr',
          name: t('dhuhr', currentLanguage),
          arabicName: 'الظهر',
          description: t('noonPrayer', currentLanguage),
          time: formatTime(adjustedTimings.Dhuhr),
          dateObj: parseTime(adjustedTimings.Dhuhr),
          color: '#4ECDC4',
          scene: { colors: ['#00BFFF', '#87CEEB', '#E0F6FF'], name: t('noon', currentLanguage) }
        },
        {
          id: 'asr',
          name: t('asr', currentLanguage),
          arabicName: 'العصر',
          description: t('afternoonPrayer', currentLanguage),
          time: formatTime(adjustedTimings.Asr),
          dateObj: parseTime(adjustedTimings.Asr),
          color: '#45B7D1',
          scene: { colors: ['#F4A460', '#DEB887', '#FFF8DC'], name: t('afternoon', currentLanguage) }
        },
        {
          id: 'maghrib',
          name: t('maghrib', currentLanguage),
          arabicName: 'المغرب',
          description: t('sunsetPrayer', currentLanguage),
          time: formatTime(adjustedTimings.Maghrib),
          dateObj: parseTime(adjustedTimings.Maghrib),
          color: '#F7DC6F',
          scene: { colors: ['#FF6347', '#FF7F50', '#FFA07A'], name: t('sunset', currentLanguage) }
        },
        {
          id: 'isha',
          name: t('isha', currentLanguage),
          arabicName: 'العشاء',
          description: t('nightPrayer', currentLanguage),
          time: formatTime(adjustedTimings.Isha),
          dateObj: parseTime(adjustedTimings.Isha),
          color: '#BB8FCE',
          scene: { colors: ['#191970', '#1e1e3f', '#2a2a5a'], name: t('night', currentLanguage) }
        }
      ];
      setPrayerTimes(prayers);
      updateCurrentAndNextPrayerLocal(prayers);
      // Share with widget
      const hijriDate = calculateHijriDate();
      await widgetService.updateAllWidgets(
        prayers,
        nextPrayer,
        currentPrayer,
        `${countdown.hours.toString().padStart(2, '0')}:${countdown.minutes.toString().padStart(2, '0')}:${countdown.seconds.toString().padStart(2, '0')}`,
        hijriDate,
        cityName
      );
      // Schedule notifications ONLY at these times
      await scheduleNotificationsOncePerDay(prayers);
    } else {
      // If API fails, show error or fallback message (do not calculate locally)
      setPrayerTimes([]);
      // Optionally, show a user-facing error here
    }
  };

  // Prayer duration function moved to shared utility

  // Prayer cycling logic moved to shared utility
  const updateCurrentAndNextPrayerLocal = async (prayers) => {
    try {
      const result = await updateCurrentAndNextPrayer(prayers, location, currentLanguage);
      
      setIsPrayerTimeActive(result.active);
      setCurrentPrayer(result.current);
      setNextPrayer(result.next);
    } catch (error) {
      console.error('Error updating prayer cycling:', error);
    }
  };

  // Add this function to calculate Hijri date
  const calculateHijriDate = () => {
    const today = new Date();
    const todayParts = {
      year: today.getFullYear(),
      month: today.getMonth() + 1,
      date: today.getDate()
    };
    
    const hijriDate = HijriConverter.toHijri(todayParts.year, todayParts.month, todayParts.date);
    setCurrentHijriDate(hijriDate);
  };

  // Add this function to get Hijri month name
  const getHijriMonthName = (monthNumber) => {
    const hijriMonths = [
      'Muharram', 'Safar', 'Rabi al-Awwal', 'Rabi al-Thani',
      'Jumada al-Awwal', 'Jumada al-Thani', 'Rajab', 'Shaban',
      'Ramadan', 'Shawwal', 'Dhu al-Qadah', 'Dhu al-Hijjah'
    ];
    return hijriMonths[monthNumber - 1];
  };

  // Add this useEffect to calculate Hijri date on component mount
  useEffect(() => {
    calculateHijriDate();
  }, []);

  // Helper to get prayer display name
  const getPrayerDisplayName = (prayerId) => {
    const prayer = prayerTimes.find(p => p.id === prayerId);
    return prayer ? prayer.name : '';
  };



  // Load user's madhab preference
  const loadUserMadhab = async () => {
    try {
      const userProfile = await AsyncStorage.getItem('userProfile');
      if (userProfile) {
        const profile = JSON.parse(userProfile);
        setUserMadhab(profile.madhab || 'hanafi');
      }
    } catch (error) {
      console.error('Error loading user madhab:', error);
    }
  };

  // Map madhab names to AlAdhan API method numbers
  const getMadhabMethod = (madhab) => {
    const madhabMap = {
      'hanafi': 2,      // Hanafi method - ISNA (North America)
      'shafi': 2,       // Shafi'i method - ISNA (North America)
      'maliki': 2,      // Maliki - ISNA (North America)
      'hanbali': 2,     // Hanbali - ISNA (North America)
      'shafi\'i': 2,    // Alternative spelling - ISNA (North America)
      'none': 2         // Default to ISNA for general users
    };
    return madhabMap[madhab.toLowerCase()] || 2; // Default to ISNA
  };

  // Map madhab names to AlAdhan API school numbers (for Asr calculation)
  const getMadhabNumber = (madhab) => {
    const madhabMap = {
      'hanafi': 0,      // Hanafi: Asr at 16:54 (earlier - school=0)
      'shafi': 1,       // Shafi'i: Asr at 18:04 (later - school=1)
      'maliki': 1,      // Maliki: Same as Shafi'i
      'hanbali': 1,     // Hanbali: Same as Shafi'i
      'shafi\'i': 1,    // Alternative spelling
      'none': 0         // Default to Hanafi for general users
    };
    return madhabMap[madhab.toLowerCase()] || 0; // Default to Hanafi
  };

  // Animation functions
  const startEntranceAnimations = () => {
    // Do not reset or animate headerAnim
    toggleAnim.setValue(0);
    contentAnim.setValue(0);
    prayerCardAnim.setValue(0);
    preparationAnim.setValue(0);

    // Staggered entrance animations (skip headerAnim)
    Animated.stagger(100, [
      Animated.timing(toggleAnim, {
        toValue: 1,
        duration: 400,
        useNativeDriver: true,
        easing: Easing.out(Easing.cubic),
      }),
      Animated.timing(contentAnim, {
        toValue: 1,
        duration: 450,
        useNativeDriver: true,
        easing: Easing.out(Easing.cubic),
      }),
    ]).start();
  };

  const animateButtonPress = (buttonScale, onPress) => {
    Animated.sequence([
      Animated.timing(buttonScale, {
        toValue: 0.95,
        duration: 100,
        useNativeDriver: true,
      }),
      Animated.timing(buttonScale, {
        toValue: 1,
        duration: 100,
        useNativeDriver: true,
      }),
    ]).start(() => {
      if (onPress) onPress();
    });
  };

  const animateSectionChange = (newSection) => {
    // Animate out current content
    Animated.timing(contentAnim, {
      toValue: 0,
      duration: 200,
      useNativeDriver: true,
    }).start(() => {
      setActiveSection(newSection);
      // Animate in new content
      Animated.timing(contentAnim, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }).start();
    });
  };



  // Auto-mark prayers as excused when excuse mode is enabled
  useEffect(() => {
    const autoMarkExcusedPrayers = async () => {
      console.log('🔄 Auto-mark useEffect triggered:', { excuseMode, prayerTimesLength: prayerTimes.length });
      
      if (excuseMode && prayerTimes.length > 0) {
        try {
          console.log('🔄 Auto-marking prayers as excused due to excuse mode');
          
          // Mark all prayers as excused
          for (const prayer of prayerTimes) {
            console.log(`📝 Marking ${prayer.id} as excused`);
            await prayerService.saveExcusedPrayer(prayer.id);
          }
          
          // Update local state to reflect excused status
          const today = new Date();
          const dateKey = getDateKey(today);
          const newData = { ...prayerData };
          
          if (!newData[dateKey]) {
            newData[dateKey] = {};
          }
          
          // Mark all prayers as excused
          prayerTimes.forEach(prayer => {
            newData[dateKey][prayer.id] = 'excused';
            console.log(`✅ Local state: ${prayer.id} marked as excused`);
          });
          
          setPrayerData(newData);
          console.log('✅ All prayers auto-marked as excused');
        } catch (error) {
          console.error('Error auto-marking prayers as excused:', error);
        }
      } else if (!excuseMode && prayerTimes.length > 0) {
        // Clear excused status when excuse mode is turned off
        try {
          console.log('🔄 Clearing excused status due to excuse mode being disabled');
          
          const today = new Date();
          const dateKey = getDateKey(today);
          const newData = { ...prayerData };
          
          if (newData[dateKey]) {
            // Remove excused status from all prayers
            for (const prayer of prayerTimes) {
              if (newData[dateKey][prayer.id] === 'excused') {
                delete newData[dateKey][prayer.id];
                // Also clear from Firebase
                await prayerService.togglePrayerCompletion(prayer.id);
                console.log(`🗑️ Cleared excused status for ${prayer.id}`);
              }
            }
            
            setPrayerData(newData);
            console.log('✅ All excused prayers cleared');
          }
        } catch (error) {
          console.error('Error clearing excused prayers:', error);
        }
      }
    };
    
    autoMarkExcusedPrayers();
  }, [excuseMode, prayerTimes]);

  // Load excuse mode on component mount
  useEffect(() => {
    loadExcuseMode();
  }, []);

  // Reload excuse mode when returning from ProfileScreen
  useEffect(() => {
    const unsubscribe = navigation.addListener('focus', () => {
      loadExcuseMode();
    });

    return unsubscribe;
  }, [navigation]);

  // Add listener for notification settings changes
  useEffect(() => {
    const checkNotificationSettings = async () => {
      try {
        const storedSettings = await AsyncStorage.getItem('prayerNotifications');
        if (storedSettings) {
          const newSettings = JSON.parse(storedSettings);
          // Only update if settings actually changed
          if (JSON.stringify(newSettings) !== JSON.stringify(prayerNotifications)) {
            console.log('🔄 PrayerScreen: Notification settings updated, reloading...');
            setPrayerNotifications(newSettings);
          }
        }
      } catch (error) {
        console.error('Error checking notification settings:', error);
      }
    };

    // Check for notification settings changes every 2 seconds
    const interval = setInterval(checkNotificationSettings, 2000);
    
    return () => clearInterval(interval);
  }, [prayerNotifications]);



  return (
    <View style={styles.mainContainer}>
      <StatusBar
        barStyle="light-content"
        backgroundColor="transparent"
        translucent={true}
      />
      
      {/* Location Permission Overlay - Full Screen */}
      {locationPermission === 'denied' && (
        <View style={styles.locationOverlay}>
          <View style={styles.locationOverlayContent}>
            <Ionicons name="location-outline" size={getResponsiveIconSize(64)} color="#FFFFFF" />
            <Text style={styles.locationOverlayTitle}>Location Required</Text>
            <Text style={styles.locationOverlayText}>
              To provide accurate prayer times for your area, we need access to your location. Prayer times vary by location and are essential for the app to function properly.
            </Text>
            <TouchableOpacity 
              style={styles.locationOverlayButton}
              onPress={requestLocationPermission}
            >
              <Text style={styles.locationOverlayButtonText}>Continue</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}
      
      <LinearGradient
        colors={getTimeBasedScene().colors}
        style={[styles.headerBackground, { paddingTop: StatusBar.currentHeight }]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      >
        <SafeAreaView style={styles.safeArea}>
          <ScrollView 
            style={styles.container}
            contentContainerStyle={{
              paddingBottom: Platform.OS === 'android' ? 60 : 24
            }}
          >
            <WaveHeader />
            <View style={styles.contentContainer}>
              

              {/* Toggle Buttons */}
              <Animated.View 
                style={[
                  styles.toggleContainer,
                  {
                    opacity: toggleAnim,
                    transform: [
                      {
                        translateY: toggleAnim.interpolate({
                          inputRange: [0, 1],
                          outputRange: [20, 0],
                        }),
                      },
                    ],
                  },
                ]}
              >
                <Animated.View style={{ transform: [{ scale: toggleButtonScale }] }}>
                  <TouchableOpacity
                    style={[
                      styles.toggleButton,
                      activeSection === 'prayer' && styles.activeToggle
                    ]}
                    onPress={() => animateButtonPress(toggleButtonScale, () => animateSectionChange('prayer'))}
                  >
                    <Ionicons 
                      name="time-outline" 
                      size={20} 
                      color={activeSection === 'prayer' ? '#FFFFFF' : '#A9A9A9'} 
                    />
                    <Text style={[
                      styles.toggleText,
                      activeSection === 'prayer' && styles.activeToggleText
                    ]}>
                      {t('prayerTimes', currentLanguage)}
                    </Text>
                  </TouchableOpacity>
                </Animated.View>

                <Animated.View style={{ transform: [{ scale: toggleButtonScale }] }}>
                  <TouchableOpacity
                    style={[
                      styles.toggleButton,
                      activeSection === 'preparation' && styles.activeToggle
                    ]}
                    onPress={() => animateButtonPress(toggleButtonScale, () => animateSectionChange('preparation'))}
                  >
                    <Ionicons 
                      name="list-outline" 
                      size={20} 
                      color={activeSection === 'preparation' ? '#FFFFFF' : '#A9A9A9'} 
                    />
                    <Text style={[
                      styles.toggleText,
                      activeSection === 'preparation' && styles.activeToggleText
                    ]}>
                      {t('preparation', currentLanguage)}
                    </Text>
                  </TouchableOpacity>
                </Animated.View>
              </Animated.View>

              {/* Content Based on Active Section */}
              <Animated.View
                style={{
                  opacity: contentAnim,
                  transform: [
                    {
                      translateY: contentAnim.interpolate({
                        inputRange: [0, 1],
                        outputRange: [30, 0],
                      }),
                    },
                  ],
                }}
              >
                {activeSection === 'prayer' ? renderPrayerContent() : renderPreparationSection()}
              </Animated.View>
            </View>
          </ScrollView>
        </SafeAreaView>
      </LinearGradient>


      {/* Confetti Animation Overlay */}
      {showConfetti && (
        <View style={styles.confettiOverlay} pointerEvents="none">
          {confettiPieces.map((piece) => (
            <Animated.Text
              key={piece.id}
              style={[
                styles.confettiPiece,
                {
                  color: piece.color,
                  transform: [
                    { translateX: piece.translateX },
                    { translateY: piece.translateY },
                    { rotate: piece.rotation.interpolate({
                      inputRange: [0, 360],
                      outputRange: ['0deg', '360deg'],
                    }) },
                    { scale: piece.scale },
                  ],
                },
              ]}
            >
              {piece.shape}
            </Animated.Text>
          ))}
        </View>
      )}

      {/* Subscription Modal */}
      <SubscriptionModal
        visible={showSubscriptionModal}
        onClose={() => setShowSubscriptionModal(false)}
        onSubscriptionSuccess={handleSubscriptionSuccess}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  mainContainer: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  locationText: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.9)',
    marginBottom: 10,
    textAlign: 'center',
    fontWeight: '600',
    textShadowColor: 'rgba(0, 0, 0, 0.5)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  prayerHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 8,
  },
  timeIndicatorsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  headerBackground: {
    flex: 1,
  },
  safeArea: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  container: {
    flex: 1,
  },
  contentContainer: {
    flex: 1,
    backgroundColor: '#000',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    marginTop: -24,
    overflow: 'hidden',
    paddingTop: 16,
    paddingBottom: 24,
  },
  waveContainer: {
    height: 240,
    backgroundColor: 'transparent',
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
    overflow: 'hidden',
  },
  waveBackground: {
    flex: 1,
    borderBottomLeftRadius: 30,
    borderBottomRightRadius: 30,
    overflow: 'hidden',
    position: 'relative',
  },
  toggleContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#222',
    paddingBottom: 8,
    marginHorizontal: 16,
  },
  toggleButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 3,
    borderBottomColor: 'transparent',
  },
  activeToggle: {
    borderBottomColor: '#FFFFFF',
  },
  toggleText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#A9A9A9',
    marginLeft: 6,
  },
  activeToggleText: {
    color: '#FFFFFF',
  },
  sectionHeader: {
    backgroundColor: '#fff',
    padding: 12,
    marginHorizontal: 12,
    marginBottom: 12,
    borderRadius: 10,
    alignItems: 'center',
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#2c3e50',
  },
  prayerGrid: {
    paddingHorizontal: 10,
    marginBottom: 10,
  },
  gridRow: {
    flexDirection: 'row',
    justifyContent: 'space-evenly',
    marginBottom: 12,
    paddingHorizontal: 2,
  },
  centerRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginBottom: 12,
    paddingHorizontal: 10,
  },
  prayerTab: {
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 15,
    marginBottom: 10,
    borderTopWidth: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 8,
    position: 'relative',
  },
  prayerTabGrid: {
    width: Dimensions.get('window').width / 2 - 30,
    height: 120,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    margin: 2,
    position: 'relative',
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.4,
    shadowRadius: 10,
    elevation: 8,
  },
  prayerTabCenter: {
    width: Dimensions.get('window').width / 2 - 30,
    height: 120,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.4,
    shadowRadius: 10,
    elevation: 8,
  },
  activePrayerTab: {
    backgroundColor: '#f8f9ff',
    borderWidth: 2,
    borderColor: '#2196F3',
    shadowColor: '#2196F3',
    shadowOpacity: 0.3,
  },
  prayerTextContainer: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  prayerTabHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  prayerTabName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#FFFFFF',
    textAlign: 'right',
    marginBottom: 2,
    lineHeight: 20,
    textShadowColor: 'rgba(0, 0, 0, 0.5)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  prayerTabArabic: {
    fontSize: 14,
    color: '#6c757d',
    fontWeight: '500',
    textAlign: 'left',
    lineHeight: 18,
  },
  prayerTabTime: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#2196F3',
    marginBottom: 5,
  },
  prayerTimeBelow: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
    textAlign: 'center',
    marginTop: 8,
    marginBottom: 6,
    textShadowColor: 'rgba(0, 0, 0, 0.5)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  prayerTimeBelowCenter: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
    textAlign: 'center',
    marginTop: 8,
    marginBottom: 6,
    textShadowColor: 'rgba(0, 0, 0, 0.5)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  guidedPrayerHint: {
    fontSize: 10,
    color: '#ffff',
    textAlign: 'center',
    marginTop: 2,
    fontStyle: 'italic',
  },
  activePrayerTimeBelow: {
    color: '#e74c3c',
  },
  prayerTabDescription: {
    fontSize: 14,
    color: '#6c757d',
  },
  activePrayerText: {
    color: '#2196F3',
  },
  activePrayerTime: {
    color: '#e74c3c',
  },
  activePrayerDescription: {
    color: '#2196F3',
  },
  nextIndicator: {
    position: 'absolute',
    top: 12,
    right: 12,
    backgroundColor: '#e74c3c',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 16,
    shadowColor: '#e74c3c',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 6,
    elevation: 6,
  },
  nextIndicatorText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: 'bold',
  },
  introSection: {
    backgroundColor: '#1E1E1E',
    margin: 15,
    padding: 20,
    borderRadius: 20,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 8,
  },
  introText: {
    fontSize: 16,
    color: '#FFFFFF',
    textAlign: 'center',
    marginBottom: 15,
    fontWeight: '600',
  },
  introQuote: {
    fontSize: 14,
    fontStyle: 'italic',
    color: '#B0B0B0',
    textAlign: 'center',
    marginBottom: 8,
    lineHeight: 20,
  },
  introReference: {
    fontSize: 12,
    color: '#B0B0B0',
    fontWeight: '600',
  },
  stepsContainer: {
    paddingHorizontal: 15,
  },
  stepCardGrid: {
    backgroundColor: '#1E1E1E',
    borderRadius: 20,
    padding: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 8,
    width: '48%',
    alignItems: 'center',
    minHeight: 100,
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: '#2A2A2A',
  },
  stepIconContainer: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#2A2A2A',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  stepTitleGrid: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
    textAlign: 'center',
    marginBottom: 2,
  },
  stepArabicGrid: {
    fontSize: 12,
    color: '#B0B0B0',
    textAlign: 'center',
    marginBottom: 6,
  },
  stepNumberGrid: {
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: '#2A2A2A',
    justifyContent: 'center',
    alignItems: 'center',
    position: 'absolute',
    top: 6,
    right: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  stepNumberText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
  },
  tapHint: {
    fontSize: 12,
    color: '#95a5a6',
    fontStyle: 'italic',
  },
  readyButton: {
    backgroundColor: '#27ae60',
    margin: 10,
    padding: 12,
    borderRadius: 15,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#27ae60',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 8,
  },
  readyButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
    marginRight: 8,
  },
  footer: {
    backgroundColor: '#fff',
    padding: 10,
    margin: 8,
    borderRadius: 12,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
    elevation: 4,
  },
  footerText: {
    fontSize: 13,
    fontStyle: 'italic',
    textAlign: 'center',
    color: '#2c3e50',
    marginBottom: 4,
    lineHeight: 18,
  },
  footerReference: {
    fontSize: 11,
    color: '#6c757d',
    fontWeight: '600',
  },
  notificationBell: {
    position: 'absolute',
    top: 2.5,
    left: 5,
    zIndex: 1,
    padding: 5,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  checkboxContainer: {
    position: 'absolute',
    top: 8,
    right: 8,
    zIndex: 1,
  },
  checkbox: {
    width: 18,
    height: 18,
    borderRadius: 9,
    borderWidth: 2,
    borderColor: '#666',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#1E1E1E',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  checkedBox: {
    backgroundColor: '#4CAF50',
    borderColor: '#4CAF50',
    shadowColor: '#4CAF50',
    shadowOpacity: 0.4,
  },
  excusedBox: {
    backgroundColor: '#2E1A1A',
    borderWidth: 0,
  },
  excusedIcon: {
    fontSize: 10,
    color: '#3498db',
    textAlign: 'center',
    lineHeight: 14,
  },
  progressContainer: {
    marginBottom: 20,
  },
  progressText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
    marginBottom: 8,
    textAlign: 'center',
  },
  progressBar: {
    width: '100%',
    height: 8,
    backgroundColor: '#f1f2f6',
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#4CAF50',
    borderRadius: 4,
  },
  resetButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 15,
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 12,
    backgroundColor: '#1E1E1E',
    borderWidth: 1,
    borderColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
    elevation: 4,
  },
  resetButtonText: {
    fontSize: 14,
    color: '#FFFFFF',
    fontWeight: '600',
    marginLeft: 6,
  },
  completedStepCard: {
    borderColor: '#4CAF50',
    shadowColor: '#4CAF50',
    shadowOpacity: 0.3,
  },
  currentStepCard: {
    backgroundColor: '#1E1E1E',
    borderColor: '#2A2A2A',
  },
  activeStepCard: {
    backgroundColor: '#1E1E1E',
    borderWidth: 1,
    borderColor: '#2A2A2A',
  },
  completedStepNumber: {
    backgroundColor: '#4CAF50',
    shadowColor: '#4CAF50',
    shadowOpacity: 0.4,
  },
  lockedStepNumber: {
    backgroundColor: '#bdc3c7',
  },
  lockedNumberText: {
    color: '#fff',
  },
  currentStepIndicator: {
    position: 'absolute',
    bottom: 8,
    right: 8,
    backgroundColor: '#2196F3',
    borderRadius: 10,
    width: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#2196F3',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.4,
    shadowRadius: 4,
    elevation: 4,
  },
  headerContainer: {
    height: 280,
    borderBottomLeftRadius: 30,
    borderBottomRightRadius: 30,
    overflow: 'hidden',
  },
  headerContent: {
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 30,
  },
  locationDateContainer: {
    alignItems: 'center',
    marginBottom: 10,
  },
  nextPrayerInfo: {
    alignItems: 'center',
  },
  nextPrayerLabel: {
    fontSize: 16,
    color: '#334B77',
    opacity: 1,
    marginBottom: 5,
    marginTop: 20,
    fontWeight: '600',
  },
  nextPrayerName: {
    fontSize: 48,
    fontWeight: 'bold',
    color: '#334B77',
    marginBottom: 10,
    textShadowColor: 'rgba(0, 0, 0, 0.3)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4,
  },
  timelineContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    paddingHorizontal: 20,
    height: 60,
    position: 'relative',
  },
  timelineItem: {
    alignItems: 'center',
    width: 60,
  },
  timelineDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: 'rgba(255, 255, 255, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  timelineTextContainer: {
    alignItems: 'center',
  },
  timelinePrayerName: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.7)',
    fontWeight: '600',
    marginBottom: 2,
  },
  timelinePrayerTime: {
    fontSize: 10,
    color: 'rgba(255, 255, 255, 0.6)',
  },
  activeTimelineText: {
    color: '#fff',
    fontWeight: 'bold',
  },
  timelineLine: {
    position: 'absolute',
    top: 13,
    left: 40,
    right: 40,
    height: 2,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
  },
  sceneBadge: {
    backgroundColor: 'rgba(255, 255, 255, 0.25)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 15,
    marginLeft: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  sceneText: {
    fontSize: 12,
    color: '#fff',
    fontWeight: '600',
  },
  prayerTabOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  dateContainer: {
    position: 'absolute',
    top: 20,
    left: 20,
    right: 20,
    alignItems: 'center',
    zIndex: 10,
  },
  islamicDate: {
    fontSize: 16,
    color: '#FFFFFF',
    fontWeight: '600',
    textAlign: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  countdownContainer: {
    backgroundColor: 'rgba(255, 255, 255, 0.25)',
    borderRadius: 12,
    padding: 6,
    marginTop: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  countdownText: {
    color: '#334B77',
    fontSize: 14,
    fontWeight: '600',
    textAlign: 'center',
  },
  countdownItem: {
    alignItems: 'center',
  },
  countdownNumber: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
    textShadowColor: 'rgba(0, 0, 0, 0.5)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  countdownLabel: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.7)',
    marginTop: 2,
  },
  countdownSeparator: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
    marginHorizontal: 10,
    textShadowColor: 'rgba(0, 0, 0, 0.5)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  pastPrayerTab: {
    opacity: 0.7,
  },
  pastPrayerText: {
    color: 'rgba(255, 255, 255, 0.7)',
    fontSize: 14,
    fontStyle: 'italic',
  },
  pastPrayerTime: {
    opacity: 0.7,
  },
  prayerStatus: {
    fontSize: 14,
    color: '#FFFFFF',
    fontWeight: 'bold',
  },
  timelineProgress: {
    position: 'absolute',
    height: 2,
    backgroundColor: 'white',
    top: 13,
    left: 40,
    zIndex: 1,
  },
  currentTimelineDot: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#3498db',
    transform: [{ scale: 1.1 }],
    shadowColor: '#3498db',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.6,
    shadowRadius: 8,
    elevation: 6,
  },
  celestialBody: {
    position: 'absolute',
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1,
  },
  celestialGlow: {
    position: 'absolute',
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: 'rgba(255, 215, 0, 0.3)',
  },
  sun: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#FFD700',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 10,
    elevation: 8,
  },
  moon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#F5F5DC',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#F5F5DC',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.6,
    shadowRadius: 8,
    elevation: 6,
  },
  clouds: {
    position: 'absolute',
    width: '100%',
    height: 100,
    zIndex: 0,
  },
  cloud: {
    position: 'absolute',
    width: 60,
    height: 30,
    backgroundColor: 'rgba(255, 255, 255, 0.8)',
    borderRadius: 15,
    transform: [{ scaleX: 1.5 }],
  },
  stars: {
    position: 'absolute',
    width: '100%',
    height: '100%',
    zIndex: 0,
  },
  star: {
    position: 'absolute',
    backgroundColor: '#FFF',
    borderRadius: 2,
    shadowColor: '#FFF',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 2,
    elevation: 2,
  },
  locationTextCentered: {
    fontSize: 16,
    color: '#334B77',
    marginBottom: 12,
    textAlign: 'center',
    fontWeight: '600',
  },

  extraSection: {
    marginTop: 28,
    marginHorizontal: 15,
    marginBottom: 18,
  },
  extraSectionTitle: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 12,
    letterSpacing: 0.1,
  },
  extraCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#181818',
    borderRadius: 15,
    padding: 16,
    marginBottom: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  extraIconContainer: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#232323',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  extraCardTitle: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '600',
  },
  extraCardSubtitle: {
    color: '#B0B0B0',
    fontSize: 13,
    marginTop: 2,
  },
  emptyCircle: {
    width: 18,
    height: 18,
    borderRadius: 9,
    borderWidth: 2,
    borderColor: '#666',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
  },
  locationOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.95)',
    zIndex: 9999,
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: StatusBar.currentHeight || 0,
  },
  locationOverlayContent: {
    padding: 40,
    alignItems: 'center',
    maxWidth: 300,
  },
  locationOverlayTitle: {
    color: '#FFFFFF',
    fontSize: 24,
    fontWeight: '700',
    marginTop: 20,
    marginBottom: 16,
    textAlign: 'center',
  },
  locationOverlayText: {
    color: '#FFFFFF',
    fontSize: 16,
    lineHeight: 24,
    textAlign: 'center',
    marginBottom: 32,
    opacity: 0.9,
  },
  locationOverlayButton: {
    backgroundColor: '#FF6B35',
    paddingHorizontal: 32,
    paddingVertical: 16,
    borderRadius: 25,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  locationOverlayButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  confettiOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 1000,
    pointerEvents: 'none',
  },
  confettiPiece: {
    position: 'absolute',
    fontSize: 12,
    fontWeight: 'bold',
    textShadowColor: 'rgba(0, 0, 0, 0.3)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
    left: 0,
    top: 0,
  },
}); 