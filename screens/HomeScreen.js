import React, { useState, useEffect, useRef } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  ScrollView, 
  TouchableOpacity, 
  SafeAreaView,
  StatusBar,
  Alert,
  Animated,
  Image,
  ImageBackground,
  Modal,
  Easing,
  Dimensions,
  Platform
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { LinearGradient } from 'expo-linear-gradient';
const HijriConverter = require('hijri-converter');
import * as Location from 'expo-location';
import { auth, firestore } from '../firebase';
import { onAuthStateChanged } from 'firebase/auth';
import { doc, getDoc, collection, query, orderBy, onSnapshot, Timestamp } from 'firebase/firestore';
// Remove adhan imports
// import { PrayerTimes, Coordinates, CalculationMethod, Madhab } from 'adhan';
import lessonService from '../services/lessonService';
import prayerService from '../services/prayerService';
import newNotificationService from '../services/newNotificationService';
import widgetService from '../services/widgetService';
import prayerBlockerService from '../services/prayerBlockerService';

import subscriptionGuard from '../services/subscriptionGuard';
import revenueCatService from '../services/revenueCatService';
import { getPaywallScreenName, promptSignInForPremium, requireSignedIn } from '../services/paywallHelper';
import AdBanner from '../components/AdBanner';
import { isCreatorAuthor } from '../config/donateConfig';
import { toggleDuaRequestSupport } from '../services/duaBoardService';
import { useFocusEffect } from '@react-navigation/native';
import { getResponsiveIconSize, getResponsiveSpacing, isTablet, getTabletSpacing, getResponsiveGridColumns } from '../utils/responsiveSizing';
import { updateCurrentAndNextPrayer, calculateTimeUntilNext } from '../utils/prayerCycling';
import { useLanguage } from '../utils/useLanguage';
import { t } from '../utils/translations';
import streakService from '../services/streakService';
import { 
  getResponsiveFontSize, 
  getResponsiveLineHeight, 
  getResponsivePadding, 
  getResponsiveContainerWidth,
  getResponsiveTextStyle,
  getResponsiveCardStyle,
  getResponsiveBadgeStyle,
  getAndroidTopPadding
} from '../utils/languageResponsiveSizing';

const QiblaWidget = ({ onPress }) => {
  const [heading, setHeading] = useState(0);
  const [qiblaDirection, setQiblaDirection] = useState(0);
  const rotation = useRef(new Animated.Value(0)).current;
  const [isFacingQibla, setIsFacingQibla] = useState(false);

  useEffect(() => {
    (async () => {
      let { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') return;

      let location = await Location.getCurrentPositionAsync({});
      const { latitude, longitude } = location.coords;

      // Qibla formula
      const kaabaLat = 21.4225;
      const kaabaLng = 39.8262;
      const y = Math.sin(Math.PI / 180 * (kaabaLng - longitude));
      const x = Math.cos(Math.PI / 180 * latitude) * Math.tan(Math.PI / 180 * kaabaLat) - Math.sin(Math.PI / 180 * latitude) * Math.cos(Math.PI / 180 * (kaabaLng - longitude));
      let angle = Math.atan2(y, x);
      angle = angle * (180 / Math.PI);
      angle = (angle + 360) % 360;
      setQiblaDirection(angle);
    })();
    
    Location.watchHeadingAsync(h => {
      setHeading(h.trueHeading);
    });
  }, []);

  useEffect(() => {
    Animated.timing(rotation, {
      toValue: (360 - heading) + qiblaDirection,
      duration: 300,
      useNativeDriver: true,
    }).start();
    
    let diff = qiblaDirection - heading;
    if (diff > 180) {
      diff -= 360;
    } else if (diff < -180) {
      diff += 360;
    }
    setIsFacingQibla(Math.abs(diff) < 5);
  }, [heading, qiblaDirection]);

  const rotationStyle = {
    transform: [{
      rotate: rotation.interpolate({
        inputRange: [0, 360],
        outputRange: ['0deg', '360deg']
      })
    }]
  };

  return (
    <TouchableOpacity 
      style={[styles.quickActionButton, { padding: 0, overflow: 'hidden' }]}
      onPress={onPress}
      activeOpacity={0.8}
    >
      <Image
        source={require('../assets/kaabahome1.png')}
        style={styles.qiblaKaabaImageSimple}
      />
    </TouchableOpacity>
  );
};

// This function is now replaced by lessonService.getRandomLessons()
// Keeping for reference but will be removed after migration

// Helper function to get prayer background image
const getPrayerBackgroundImage = (prayerId) => {
  const prayerImages = {
    fajr: require('../assets/fajr1.png'),
    sunrise: require('../assets/sunrise1.jpeg'),
    dhuhr: require('../assets/dhur1.png'),
    asr: require('../assets/asr1.png'),
    maghrib: require('../assets/maghrib1.jpeg'),
    isha: require('../assets/isha1.jpeg'),
  };
  return prayerImages[prayerId] || prayerImages.fajr;
};

// Helper function to get prayer image style with positioning
const getPrayerImageStyle = (prayerId) => {
  // Move all images up to cut off more of the top and show more of the bottom
  return {
    borderRadius: 16,
    opacity: 0.9,
    top: -50, // Move image up 50px to cut off more of the top
  };
};

export default function HomeScreen({ navigation, onSubscriptionExpired }) {
  // Language support
  const { currentLanguage } = useLanguage();
  
  // Test translations on component mount
  useEffect(() => {
    console.log('🌍 HomeScreen: Testing translations for language:', currentLanguage);
    console.log('🌍 Translation test - dawn:', t('dawn', currentLanguage));
    console.log('🌍 Translation test - sunrise:', t('sunrise', currentLanguage));
    console.log('🌍 Translation test - noon:', t('noon', currentLanguage));
    console.log('🌍 Translation test - afternoon:', t('afternoon', currentLanguage));
    console.log('🌍 Translation test - sunset:', t('sunset', currentLanguage));
    console.log('🌍 Translation test - night:', t('night', currentLanguage));
  }, [currentLanguage]);
  
  const [currentTime, setCurrentTime] = useState(new Date());
  const [currentPrayer, setCurrentPrayer] = useState(null);
  const [nextPrayer, setNextPrayer] = useState(null);
  
  // Debug current and next prayer changes
  useEffect(() => {
    console.log('🔄 Current prayer changed:', currentPrayer?.scene?.name);
    console.log('🔄 Next prayer changed:', nextPrayer?.scene?.name);
    console.log('🔄 Language when prayers changed:', currentLanguage);
  }, [currentPrayer, nextPrayer, currentLanguage]);
  const [prayerData, setPrayerData] = useState({});
  const [timeUntilNext, setTimeUntilNext] = useState({ hours: 0, minutes: 0, seconds: 0 });
  const [prayerNotifications, setPrayerNotifications] = useState({});
  const [location, setLocation] = useState(null);
  const [prayerTimes, setPrayerTimes] = useState([]);
  
  // Debug prayer times state changes
  useEffect(() => {
    console.log('🔄 Prayer times state changed:', prayerTimes);
    if (prayerTimes.length > 0) {
      console.log('🔄 First prayer scene name:', prayerTimes[0]?.scene?.name);
      console.log('🔄 Current language when prayer times set:', currentLanguage);
    }
  }, [prayerTimes, currentLanguage]);
  const [isPrayerTimeActive, setIsPrayerTimeActive] = useState(false);
  const [prayerStreak, setPrayerStreak] = useState(0);
  const [isSignedIn, setIsSignedIn] = useState(!!auth.currentUser);
  const [userName, setUserName] = useState('');
  const [profileLoaded, setProfileLoaded] = useState(false);

  // Watch for userName changes
  useEffect(() => {
    console.log('🏠 userName changed:', userName);
    console.log('🏠 Current greeting would be:', getGreeting());
  }, [userName]);

  // Force load user data after a short delay to ensure everything is initialized
  useEffect(() => {
    const timer = setTimeout(() => {
      console.log('🏠 Delayed user data load...');
      loadUserData();
    }, 1000);
    
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setIsSignedIn(!!user);
      setCurrentUserId(user?.uid || null);
    });
    return unsubscribe;
  }, []);

  const openDuaRequestDetail = (requestId) => {
    setNewDuaRequestsCount(0);
    navigation.navigate('DuaBoardScreen', { openRequestId: requestId });
  };

  const handleCarouselLike = async (request) => {
    if (likingCarouselRequestId) return;

    if (!currentUserId) {
      promptSignInForPremium(navigation, currentLanguage);
      return;
    }

    const isLiked = request.supporters?.includes(currentUserId);
    setLikingCarouselRequestId(request.id);

    try {
      if (!isLiked) {
        const result = await toggleDuaRequestSupport(request.id, currentUserId);
        setRecentDuaRequests((prev) => prev.map((item) => {
          if (item.id !== request.id) return item;
          const supporters = [...(item.supporters || [])];
          if (result.liked && !supporters.includes(currentUserId)) {
            supporters.push(currentUserId);
          }
          if (!result.liked) {
            return { ...item, supporters: supporters.filter((id) => id !== currentUserId) };
          }
          return { ...item, supporters };
        }));
      }
      openDuaRequestDetail(request.id);
    } catch (error) {
      console.error('Error liking dua from home carousel:', error);
      Alert.alert(t('error', currentLanguage), t('couldNotUpdateLike', currentLanguage) || 'Could not update like.');
    } finally {
      setLikingCarouselRequestId(null);
    }
  };

  // Test fallback - set a default name if none is found after 3 seconds
  useEffect(() => {
    const timer = setTimeout(() => {
      if (!userName && !profileLoaded) {
        console.log('🏠 No username found after 3 seconds, setting test name...');
        setUserName('Test User');
        setProfileLoaded(true);
      }
    }, 3000);
    
    return () => clearTimeout(timer);
  }, [userName, profileLoaded]);
  const [userMadhab, setUserMadhab] = useState('hanafi'); // Add user madhab state
  const [excuseMode, setExcuseMode] = useState(false); // Add excuse mode state
  const [prayerStatus, setPrayerStatus] = useState({}); // Track prayer completion status
  
  // Notification modal state


  const [globalNotificationSettings, setGlobalNotificationSettings] = useState({
    notificationsEnabled: true,
    adhanAudioEnabled: true
  });

  const [highlightedOption, setHighlightedOption] = useState(null);

  // Animation values for staggered entrance
  const [headerAnim] = useState(new Animated.Value(0));
  const [prayerCardAnim] = useState(new Animated.Value(0));
  const [upcomingAnim] = useState(new Animated.Value(0));
  const [quickActionsAnim] = useState(new Animated.Value(0));
  const [madhabAnim] = useState(new Animated.Value(0));
  const [bellButtonScale] = useState(new Animated.Value(1));
  
  // Button press animations
  const [currentPrayerButtonScale] = useState(new Animated.Value(1));
  const [upcomingPrayerButtonScale] = useState(new Animated.Value(1));
  const [qiblaButtonScale] = useState(new Animated.Value(1));
  const [tasbihButtonScale] = useState(new Animated.Value(1));
  const [mosqueFinderButtonScale] = useState(new Animated.Value(1));
  const [halalFoodFinderButtonScale] = useState(new Animated.Value(1));

  
  // Individual lesson button animations

  // Confetti animation state
  const [showConfetti, setShowConfetti] = useState(false);
  const [confettiPieces, setConfettiPieces] = useState([]);
  const confettiAnimations = useRef({}).current;

  const [selectedLessonForSubscription, setSelectedLessonForSubscription] = useState(null);
  const [hasShownWelcomeModal, setHasShownWelcomeModal] = useState(false);
  const cachedSubscription = subscriptionGuard.getCachedResult();
  const [isSubscribed, setIsSubscribed] = useState(cachedSubscription ?? false);
  const hasPresentedDonateScreenRef = useRef(false);

  // Location permission state
  const [locationPermission, setLocationPermission] = useState(null);

  // Dua Board state
  const [newDuaRequestsCount, setNewDuaRequestsCount] = useState(0);
  const [recentDuaRequests, setRecentDuaRequests] = useState([]);
  const [likingCarouselRequestId, setLikingCarouselRequestId] = useState(null);
  const [currentUserId, setCurrentUserId] = useState(auth.currentUser?.uid || null);
  
  // Subscription modal no longer auto-shows on HomeScreen (removed per user request)

  // Ensure entrance animations play every time HomeScreen is focused
  useFocusEffect(
    React.useCallback(() => {
      startEntranceAnimations();
      loadUserMadhab();

      if (!hasPresentedDonateScreenRef.current) {
        hasPresentedDonateScreenRef.current = true;
        setTimeout(() => navigation.navigate('Donate'), 400);
      }
      
      // Refresh push token to ensure notifications work even when app hasn't been opened recently
      const refreshPushToken = async () => {
        try {
          console.log('🔄 HomeScreen: Refreshing push token on focus...');
          
          // First check for stale tokens
          await newNotificationService.checkAndRefreshStaleTokens();
          
          // Then force refresh the token with retry logic
          let retryCount = 0;
          const maxRetries = 2;
          
          while (retryCount < maxRetries) {
            try {
              await newNotificationService.forceRefreshPushToken();
              console.log('✅ HomeScreen: Push token refreshed successfully');
              break;
            } catch (error) {
              retryCount++;
              console.error(`❌ HomeScreen: Error refreshing push token (attempt ${retryCount}):`, error);
              
              if (retryCount < maxRetries) {
                console.log('⏳ Retrying token refresh...');
                await new Promise(resolve => setTimeout(resolve, 1000));
              }
            }
          }
        } catch (error) {
          console.error('❌ HomeScreen: Error in token refresh process:', error);
        }
      };
      
      refreshPushToken();
    }, [navigation])
  );

  const showPaywall = async () => {
    try {
      const screen = await getPaywallScreenName();
      navigation.navigate(screen);
    } catch (error) {
      console.error('❌ Error showing paywall:', error);
    }
  };

  // Listen for user profile changes (including madhab changes)
  useEffect(() => {
    const checkForProfileChanges = async () => {
      try {
        const userProfile = await AsyncStorage.getItem('userProfile');
        if (userProfile) {
          const profile = JSON.parse(userProfile);
          const newMadhab = profile.madhab || 'hanafi';
          
          console.log('🔍 Checking madhab:', { current: userMadhab, new: newMadhab });
          
          // If madhab changed, recalculate prayer times
          if (newMadhab !== userMadhab) {
            console.log('🔄 Madhab changed from', userMadhab, 'to', newMadhab);
            setUserMadhab(newMadhab);
            if (location?.coords) {
              console.log('📍 Recalculating prayer times with new madhab...');
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

  // Update prayer status when prayer data changes
  useEffect(() => {
    updatePrayerStatus();
  }, [prayerData]);

  // Animation functions
  const startEntranceAnimations = () => {
    // Reset all animations
    headerAnim.setValue(0);
    prayerCardAnim.setValue(0);
    upcomingAnim.setValue(0);
    quickActionsAnim.setValue(0);
    madhabAnim.setValue(0);

    // Staggered entrance animations
    Animated.stagger(100, [
      Animated.timing(headerAnim, {
        toValue: 1,
        duration: 500,
        useNativeDriver: true,
        easing: Easing.out(Easing.cubic),
      }),
      Animated.timing(madhabAnim, {
        toValue: 1,
        duration: 400,
        useNativeDriver: true,
        easing: Easing.out(Easing.cubic),
      }),
      Animated.timing(prayerCardAnim, {
        toValue: 1,
        duration: 450,
        useNativeDriver: true,
        easing: Easing.out(Easing.cubic),
      }),
      Animated.timing(upcomingAnim, {
        toValue: 1,
        duration: 400,
        useNativeDriver: true,
        easing: Easing.out(Easing.cubic),
      }),
      Animated.timing(quickActionsAnim, {
        toValue: 1,
        duration: 400,
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

  const featuredLessons = [
    {
      id: 1,
      title: 'The Pillars of Islam',
      description: 'Learn about the five foundational acts of worship every Muslim must uphold.',
      icon: 'library-outline',
      color: '#3498db',
      gradient: ['#3498db', '#2980b9']
    },
    {
      id: 2,
      title: 'How to Perform Wudu (Ablution)',
      description: 'Step-by-step guidance on purification before prayer.',
      icon: 'water-outline',
      color: '#9b59b6',
      gradient: ['#9b59b6', '#8e44ad']
    }
  ];

  // Handle subscription success (when returning from paywall)
  const handleSubscriptionSuccess = async () => {
    await AsyncStorage.removeItem('subscriptionModalCloseCount');
    await AsyncStorage.removeItem('showPromotionalNext');
    if (selectedLessonForSubscription) {
      navigation.navigate('Lessons', { screen: 'LessonDetail', params: { lesson: selectedLessonForSubscription } });
      setSelectedLessonForSubscription(null);
    } else {
      navigation.navigate('Lessons');
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

  useEffect(() => {
    console.log('🏠 HomeScreen useEffect - loading user data...');
    loadUserData();
    loadPrayerData();
    loadNotificationSettings();
    loadGlobalNotificationSettings();
    checkLocationPermission();
    
    (async () => {
      let { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission Denied', 'Location access is needed to provide accurate prayer times for your area.');
        return;
      }

      let location = await Location.getCurrentPositionAsync({});
      setLocation(location);
      const calculatedPrayerTimes = await calculatePrayerTimes(location.coords);
      
      // Force refresh notifications after prayer times are loaded
      if (calculatedPrayerTimes && calculatedPrayerTimes.length > 0) {
        await newNotificationService.forceRefreshNotifications(calculatedPrayerTimes);
        await AsyncStorage.setItem('lastPrayerTimesFetchDate', new Date().toISOString().split('T')[0]);
        
        // Check if prayer blocker is enabled and check for past prayers that need blocking
        try {
          console.log('🔍 HomeScreen: Checking prayer blocker status...');
          const blockerEnabled = await AsyncStorage.getItem('prayerBlockerEnabled');
          console.log('🔍 HomeScreen: Prayer blocker enabled =', blockerEnabled);
          
          if (blockerEnabled === 'true') {
            // Check subscription first with RevenueCat
            console.log('🔍 HomeScreen: Checking subscription status with RevenueCat...');
            subscriptionGuard.resetCache();
            const isSubscribed = await subscriptionGuard.forceCheckSubscriptionStatus();
            
            if (!isSubscribed) {
              console.log('❌ HomeScreen: User not subscribed - disabling prayer blocker');
              await AsyncStorage.setItem('prayerBlockerEnabled', 'false');
              await prayerBlockerService.stopPrayerBlocking();
              return;
            }
            
            console.log('✅ HomeScreen: User is subscribed, checking authorization...');
            const isAuthorized = await prayerBlockerService.checkAuthorization();
            console.log('🔍 HomeScreen: Prayer blocker authorized =', isAuthorized);
            
            if (isAuthorized) {
              console.log('✅ HomeScreen: Scheduling prayer blocking...');
              console.log('🔍 HomeScreen: Prayer times count =', calculatedPrayerTimes.length);
              // Check if any past prayers need blocking activated
              await prayerBlockerService.checkAndActivateBlockingForPastPrayers(calculatedPrayerTimes);
              // Also schedule all prayer times (including future ones)
              await prayerBlockerService.scheduleAllPrayerTimes(calculatedPrayerTimes);
              console.log('✅ HomeScreen: Prayer blocking scheduled successfully');
            } else {
              console.log('⚠️ HomeScreen: Prayer blocker not authorized - skipping scheduling');
            }
          } else {
            console.log('⚠️ HomeScreen: Prayer blocker is disabled - skipping scheduling');
          }
        } catch (error) {
          console.error('❌ HomeScreen: Error checking prayer blocker:', error);
        }
      } else {
        console.log('⚠️ HomeScreen: No prayer times calculated - skipping prayer blocker');
      }
      
      // Check for streak warning
      await prayerService.checkStreakWarning();
    })();

    // Start entrance animations after a short delay
    const timer = setTimeout(() => {
      startEntranceAnimations();
    }, 300);

    return () => clearTimeout(timer);
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
                console.log('📍 HomeScreen: Location changed significantly, updating prayer times...');
                setLocation(newLocation);
                
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
  }, [location, prayerTimes]);

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

  // Check subscription status when screen is focused
  useFocusEffect(
    React.useCallback(() => {
      let isActive = true;

      // Fast path first (cached/normal check), then force refresh in background.
      subscriptionGuard.checkSubscriptionStatus().then((subscribed) => {
        if (isActive) setIsSubscribed(subscribed);
      });

      subscriptionGuard.forceCheckSubscriptionStatus().then((subscribed) => {
        if (isActive) setIsSubscribed(subscribed);
      });

      return () => {
        isActive = false;
      };
    }, [])
  );

  // Update prayer data and streak when screen comes into focus
  useFocusEffect(
    React.useCallback(() => {
      // Clear cache and reload prayer data to ensure sync with PrayerScreen
      const refreshPrayerData = async () => {
        try {
          await prayerService.clearPrayerCache();
          await loadPrayerData();
        } catch (error) {
          console.error('Error refreshing prayer data:', error);
        }
      };
      refreshPrayerData();
      loadNotificationSettings();
      loadGlobalNotificationSettings();
      calculatePrayerStreak();
      loadUserMadhab(); // Reload madhab when screen comes into focus
      loadUserData(); // Reload user data when screen comes into focus
      loadExcuseMode(); // Load excuse mode when screen comes into focus

      // Refresh prayer times if date changed (new day or DST transition) - ensures accurate times after midnight or DST
      const refreshPrayerTimesIfDateChanged = async () => {
        try {
          const today = new Date().toISOString().split('T')[0];
          const lastFetchDate = await AsyncStorage.getItem('lastPrayerTimesFetchDate');
          if (location?.coords && lastFetchDate !== today) {
            console.log('📅 Date changed since last fetch (or first open) - refreshing prayer times for DST/new day');
            const prayers = await calculatePrayerTimes(location.coords);
            if (prayers?.length > 0) {
              await newNotificationService.forceRefreshNotifications(prayers);
              await AsyncStorage.setItem('lastPrayerTimesFetchDate', today);
            }
          }
        } catch (error) {
          console.error('Error refreshing prayer times on date change:', error);
        }
      };
      refreshPrayerTimesIfDateChanged();
      
      // Check for streak warning when screen comes into focus
      // prayerService.checkStreakWarning(); // Temporarily disabled for new notification system
    }, [location?.coords])
  );

  // Check for new dua requests (badge count)
  useEffect(() => {
    let unsubscribe = null;

    const checkNewDuaRequests = async () => {
      try {
        const lastViewedStr = await AsyncStorage.getItem('duaBoardLastViewed');
        let lastViewedTimestamp = null;

        if (lastViewedStr) {
          lastViewedTimestamp = Timestamp.fromMillis(parseInt(lastViewedStr));
        }

        const q = query(collection(firestore, 'duaBoard'), orderBy('timestamp', 'desc'));
        unsubscribe = onSnapshot(q, (snapshot) => {
          const requests = snapshot.docs
            .slice(0, 10)
            .map((docSnap) => ({ id: docSnap.id, ...docSnap.data() }));
          setRecentDuaRequests(requests);

          if (!lastViewedTimestamp) {
            setNewDuaRequestsCount(0);
            return;
          }

          let count = 0;
          snapshot.docs.forEach((docSnap) => {
            const requestData = docSnap.data();
            const requestTimestamp = requestData.timestamp;

            if (requestTimestamp?.toMillis?.() > lastViewedTimestamp.toMillis()) {
              count++;
            }
          });

          setNewDuaRequestsCount(count);
        }, (error) => {
          if (error.code === 'permission-denied') {
            setRecentDuaRequests([]);
            setNewDuaRequestsCount(0);
            return;
          }
          console.error('Error checking new dua requests:', error);
        });
      } catch (error) {
        console.error('Error setting up dua request listener:', error);
      }
    };

    checkNewDuaRequests();

    return () => {
      if (unsubscribe) {
        unsubscribe();
      }
    };
  }, []);

  // Add listener for notification settings changes
  useEffect(() => {
    const checkNotificationSettings = async () => {
      try {
        const storedSettings = await AsyncStorage.getItem('prayerNotifications');
        if (storedSettings) {
          const newSettings = JSON.parse(storedSettings);
          // Only update if settings actually changed
          if (JSON.stringify(newSettings) !== JSON.stringify(prayerNotifications)) {
            console.log('🔄 HomeScreen: Notification settings updated, reloading...');
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



  const loadUserData = async () => {
    try {
      console.log('🏠 HomeScreen: Loading user data...');
      
      const user = auth.currentUser;
      if (!user) {
        console.log('🏠 HomeScreen: No authenticated user');
        setProfileLoaded(true);
        return;
      }
      
      // First try AsyncStorage
      const userProfile = await AsyncStorage.getItem('userProfile');
      if (userProfile) {
        const profile = JSON.parse(userProfile);
        console.log('🏠 HomeScreen loading user data from AsyncStorage:', profile);
        console.log('🏠 Profile keys available:', Object.keys(profile));
        
        // Try multiple name fields with more comprehensive checking
        const userName = profile.firstName || 
                        profile.name || 
                        profile.displayName || 
                        profile.userName ||
                        profile.fullName ||
                        profile.givenName ||
                        profile.familyName ||
                        '';
        
        console.log('🏠 Name field check:', {
          firstName: profile.firstName,
          name: profile.name,
          displayName: profile.displayName,
          selectedUserName: userName
        });
        
        // If we have a name, use it. Otherwise, refresh from Firebase
        if (userName && userName.trim() !== '') {
          setUserName(userName);
          setUserMadhab(profile.madhab || 'hanafi');
          console.log('🏠 HomeScreen set userName from AsyncStorage:', userName);
          setProfileLoaded(true);
          
          // Still refresh from Firebase in background to ensure we have latest data
          refreshProfileFromFirebase();
          return;
        } else {
          console.log('🏠 HomeScreen: No name found in AsyncStorage, refreshing from Firebase...');
        }
      }
      
      // Load from Firebase (either no AsyncStorage data or no name found)
      await refreshProfileFromFirebase();
    } catch (error) {
      console.error('❌ Error loading user data:', error);
      setProfileLoaded(true);
    }
  };

  const refreshProfileFromFirebase = async () => {
    try {
      const user = auth.currentUser;
      if (!user) {
        console.log('🏠 refreshProfileFromFirebase: No authenticated user');
        return;
      }

      console.log('🏠 HomeScreen: Loading from Firebase...');
      const userDoc = await getDoc(doc(firestore, 'users', user.uid));
      
      if (userDoc.exists()) {
        const profile = userDoc.data();
        console.log('🏠 HomeScreen loading user data from Firebase:', profile);
        console.log('🏠 Firebase profile keys available:', Object.keys(profile));
        
        // Try multiple name fields with more comprehensive checking
        const userName = profile.firstName || 
                        profile.name || 
                        profile.displayName || 
                        profile.userName ||
                        profile.fullName ||
                        profile.givenName ||
                        profile.familyName ||
                        '';
        
        console.log('🏠 Firebase name field check:', {
          firstName: profile.firstName,
          name: profile.name,
          displayName: profile.displayName,
          selectedUserName: userName
        });
        
        setUserName(userName);
        setUserMadhab(profile.madhab || 'hanafi');
        
        // Ensure profile has all name fields for compatibility
        const completeProfile = {
          ...profile,
          firstName: profile.firstName || profile.name || profile.displayName || '',
          name: profile.name || profile.firstName || profile.displayName || '',
          displayName: profile.displayName || profile.firstName || profile.name || '',
        };
        
        // Save to AsyncStorage for future use
        await AsyncStorage.setItem('userProfile', JSON.stringify(completeProfile));
        
        console.log('🏠 HomeScreen set userName from Firebase:', userName);
        console.log('🏠 HomeScreen set userMadhab from Firebase:', profile.madhab || 'hanafi');
        setProfileLoaded(true);
      } else {
        console.log('🏠 HomeScreen: No Firebase document found');
        setProfileLoaded(true);
      }
    } catch (firebaseError) {
      console.error('❌ Error loading from Firebase:', firebaseError);
      setProfileLoaded(true);
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

  const forceRefreshProfile = async () => {
    try {
      console.log('🔄 Force refreshing profile data...');
      setProfileLoaded(false);
      
      // Clear AsyncStorage and reload from Firebase
      await AsyncStorage.removeItem('userProfile');
      await loadUserData();
      
      Alert.alert('Success', 'Profile data refreshed!');
    } catch (error) {
      console.error('❌ Error force refreshing profile:', error);
      Alert.alert('Error', 'Failed to refresh profile: ' + error.message);
    }
  };

  const setManualUserName = () => {
    Alert.prompt(
      'Set Username',
      'Enter your name:',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Save', 
          onPress: async (name) => {
            if (name && name.trim()) {
              setUserName(name.trim());
              // Also save to profile
              try {
                const userProfile = await AsyncStorage.getItem('userProfile');
                if (userProfile) {
                  const profile = JSON.parse(userProfile);
                  profile.firstName = name.trim();
                  profile.name = name.trim();
                  await AsyncStorage.setItem('userProfile', JSON.stringify(profile));
                  console.log('✅ Username saved to profile:', name.trim());
                }
              } catch (error) {
                console.error('❌ Error saving username:', error);
              }
            }
          }
        }
      ],
      'plain-text',
      userName || ''
    );
  };

  const debugFirebaseProfile = async () => {
    try {
      const user = auth.currentUser;
      if (!user) {
        Alert.alert('Error', 'No user logged in');
        return;
      }

      console.log('🔍 Debugging Firebase profile for user:', user.uid);
      const userDoc = await getDoc(doc(firestore, 'users', user.uid));
      
      if (userDoc.exists()) {
        const profile = userDoc.data();
        console.log('🔍 Firebase profile data:', profile);
        console.log('🔍 Firebase profile keys:', Object.keys(profile));
        
        Alert.alert(
          'Firebase Profile Debug',
          `UID: ${user.uid}\nEmail: ${user.email}\n\nProfile Keys:\n${Object.keys(profile).join(', ')}\n\nProfile Data:\n${JSON.stringify(profile, null, 2)}`,
          [{ text: 'OK' }]
        );
      } else {
        Alert.alert('Debug', 'No Firebase document found for this user');
      }
    } catch (error) {
      console.error('❌ Error debugging Firebase profile:', error);
      Alert.alert('Error', 'Failed to debug profile: ' + error.message);
    }
  };

  // Modified calculatePrayerTimes to use ONLY AlAdhan API
  const calculatePrayerTimes = async (coords) => {
    console.log('🕌 calculatePrayerTimes called with language:', currentLanguage);
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
          time: formatTime(adjustedTimings.Fajr),
          dateObj: parseTime(adjustedTimings.Fajr),
          color: '#FF6B6B',
          scene: { colors: ['#4c669f', '#3b5998', '#192f6a'], name: t('dawn', currentLanguage) }
        },
        {
          id: 'sunrise',
          name: t('sunrise', currentLanguage),
          time: formatTime(adjustedTimings.Sunrise),
          dateObj: parseTime(adjustedTimings.Sunrise),
          color: '#FFD700',
          scene: { colors: ['#FFA500', '#FF8C00', '#FF7F50'], name: t('sunrise', currentLanguage) }
        },
        {
          id: 'dhuhr',
          name: t('dhuhr', currentLanguage),
          time: formatTime(adjustedTimings.Dhuhr),
          dateObj: parseTime(adjustedTimings.Dhuhr),
          color: '#4ECDC4',
          scene: { colors: ['#00BFFF', '#87CEEB', '#E0F6FF'], name: t('noon', currentLanguage) }
        },
        {
          id: 'asr',
          name: t('asr', currentLanguage),
          time: formatTime(adjustedTimings.Asr),
          dateObj: parseTime(adjustedTimings.Asr),
          color: '#45B7D1',
          scene: { colors: ['#F4A460', '#DEB887', '#FFF8DC'], name: t('afternoon', currentLanguage) }
        },
        {
          id: 'maghrib',
          name: t('maghrib', currentLanguage),
          time: formatTime(adjustedTimings.Maghrib),
          dateObj: parseTime(adjustedTimings.Maghrib),
          color: '#F7DC6F',
          scene: { colors: ['#FF6347', '#FF7F50', '#FFA07A'], name: t('sunset', currentLanguage) }
        },
        {
          id: 'isha',
          name: t('isha', currentLanguage),
          time: formatTime(adjustedTimings.Isha),
          dateObj: parseTime(adjustedTimings.Isha),
          color: '#BB8FCE',
          scene: { colors: ['#191970', '#1e1e3f', '#2a2a5a'], name: t('night', currentLanguage) }
        }
      ];
      console.log('🕌 Setting prayer times with translations:', {
        dawn: t('dawn', currentLanguage),
        sunrise: t('sunrise', currentLanguage),
        noon: t('noon', currentLanguage),
        afternoon: t('afternoon', currentLanguage),
        sunset: t('sunset', currentLanguage),
        night: t('night', currentLanguage)
      });
      
      setPrayerTimes(prayers);
      updateCurrentAndNextPrayerLocal(prayers);
      
      // Schedule notifications ONLY at these times
      if (prayers.length > 0) {
        await scheduleNotificationsOncePerDay(prayers);
      }
      
      return prayers; // Return the calculated prayers
    } else {
      setPrayerTimes([]);
      // Optionally, show a user-facing error here
      return []; // Return empty array on error
    }
  };

  // Prayer cycling logic moved to shared utility
  const updateCurrentAndNextPrayerLocal = async (prayers) => {
    try {
      const result = await updateCurrentAndNextPrayer(prayers, location, currentLanguage);
      
      console.log('🕌 updateCurrentAndNextPrayerLocal - Current prayer scene name:', result.current?.scene?.name);
      console.log('🕌 updateCurrentAndNextPrayerLocal - Next prayer scene name:', result.next?.scene?.name);
      
      setIsPrayerTimeActive(result.active);
      setCurrentPrayer(result.current);
      setNextPrayer(result.next);

      if (result.next?.dateObj) {
        const timeUntilNext = calculateTimeUntilNext(result.next);
        setTimeUntilNext(timeUntilNext);
      }

      // Save prayer times to widget storage
      if (prayers.length > 0) {
        const { islamicDate } = getFormattedDates();
        const cityName = location?.cityName || location?.address || 'Current Location';
        const countdown = result.next?.dateObj ? calculateTimeUntilNext(result.next) : '';
        
        widgetService.savePrayerTimes({
          prayerTimes: prayers,
          nextPrayer: result.next,
          currentPrayer: result.current,
          countdown: countdown,
          hijriDate: islamicDate,
          cityName: cityName
        });
      }
    } catch (error) {
      console.error('Error updating prayer cycling:', error);
    }
  };

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
      if (prayerTimes.length > 0) {
        updateCurrentAndNextPrayerLocal(prayerTimes);
      }
    }, 1000);

    return () => clearInterval(timer);
  }, [prayerTimes, location]);

  // Reload prayer times when language changes
  useEffect(() => {
    if (location?.coords) {
      console.log('🌍 Language changed, recalculating prayer times...');
      console.log('🌍 Current language:', currentLanguage);
      console.log('🌍 Current prayer times state:', prayerTimes);
      console.log('🌍 Current prayer state:', currentPrayer);
      console.log('🌍 Next prayer state:', nextPrayer);
      
      // Force recalculation of prayer times with new language
      const forceRecalculatePrayerTimes = async () => {
        try {
          // Clear current prayer times first
          setPrayerTimes([]);
          setCurrentPrayer(null);
          setNextPrayer(null);
          
          console.log('🔄 Cleared prayer times state');
          
          // Wait a moment then recalculate
          setTimeout(async () => {
            await calculatePrayerTimes(location.coords);
            console.log('✅ Prayer times recalculated with new language');
            console.log('✅ New prayer times state:', prayerTimes);
            console.log('✅ New current prayer:', currentPrayer);
            console.log('✅ New next prayer:', nextPrayer);
          }, 100);
        } catch (error) {
          console.error('❌ Error recalculating prayer times:', error);
        }
      };
      
      forceRecalculatePrayerTimes();
    }
  }, [currentLanguage, location?.coords]);

  // Load prayer data using Firebase prayer service
  const loadPrayerData = async () => {
    try {
      const data = await prayerService.loadPrayerData();
      setPrayerData(data);
      
      // Update prayer status based on loaded data
      await updatePrayerStatus();
      
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

  // Update prayer status based on current data
  const updatePrayerStatus = async () => {
    try {
      const today = new Date();
      const dateKey = await getDateKey(today);
      const todayData = prayerData[dateKey] || {};
      
      const status = {};
      ['fajr', 'sunrise', 'dhuhr', 'asr', 'maghrib', 'isha'].forEach(prayerId => {
        status[prayerId] = {
          completed: todayData[prayerId] === true,
          excused: todayData[prayerId] === 'excused'
        };
      });
      
      setPrayerStatus(status);
    } catch (error) {
      console.error('Error updating prayer status:', error);
    }
  };

  // Save prayer data using Firebase prayer service (deprecated - service handles saving)
  const savePrayerData = async (newData) => {
      setPrayerData(newData);
    // Note: Individual prayer saving is now handled by prayerService.savePrayerCompletion
  };

  const loadNotificationSettings = async () => {
    try {
      const stored = await AsyncStorage.getItem('prayerNotifications');
      if (stored) {
        const parsedSettings = JSON.parse(stored);
        
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
        // Initialize with default settings - all prayers enabled for notifications
        const defaultSettings = {
          fajr: 'notification',
          sunrise: 'notification',
          dhuhr: 'notification', 
          asr: 'notification',
          maghrib: 'notification',
          isha: 'notification'
        };
        setPrayerNotifications(defaultSettings);
        await AsyncStorage.setItem('prayerNotifications', JSON.stringify(defaultSettings));
        console.log('✅ NotificationService: Initialized default notification settings');
      }
    } catch (error) {
      console.error('Error loading notification settings:', error);
    }
  };

  const saveNotificationSettings = async (newSettings) => {
    try {
      await AsyncStorage.setItem('prayerNotifications', JSON.stringify(newSettings));
      setPrayerNotifications(newSettings);
    } catch (error) {
      console.error('Error saving notification settings:', error);
    }
  };

  const getDateKey = (date) => {
    // Use local date format to avoid timezone issues
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  // Check if prayer is completed using Firebase prayer service
  const isPrayerCompleted = async (prayerId) => {
    const today = new Date();
    const dateKey = getDateKey(today);
    return prayerData[dateKey]?.[prayerId] === true;
  };

  // Check if prayer is excused
  const isPrayerExcused = async (prayerId) => {
    const today = new Date();
    const dateKey = getDateKey(today);
    return prayerData[dateKey]?.[prayerId] === 'excused';
  };

  // Toggle prayer completion using Firebase prayer service
  const togglePrayer = async (prayerId) => {
    if (!auth.currentUser) {
      promptSignInForPremium(navigation, currentLanguage);
      return;
    }

    try {
      console.log(`🔄 HomeScreen: Toggle prayer called for ${prayerId}`);
      let newStatus;
      
      if (excuseMode) {
        // In excuse mode, mark prayer as excused
        console.log(`   - Excuse mode active, saving as excused`);
        await prayerService.saveExcusedPrayer(prayerId);
        newStatus = 'excused';
      } else {
        // Normal mode, toggle completion
        console.log(`   - Normal mode, toggling completion via prayerService...`);
        newStatus = await prayerService.togglePrayerCompletion(prayerId);
        console.log(`   - prayerService returned newStatus: ${newStatus}`);
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
      
      // Update prayer status state for immediate UI update
      setPrayerStatus(prev => ({
        ...prev,
        [prayerId]: {
          completed: newStatus === true,
          excused: newStatus === 'excused'
        }
      }));
      
      // Trigger confetti animation if prayer was marked as completed (not excused)
      if (newStatus === true && !excuseMode) {
        triggerConfetti();
      }
      
      // Recalculate streak after toggling prayer (handles both check and uncheck)
      if (!excuseMode) {
        await calculatePrayerStreak();
      }
      
      console.log(`✅ HomeScreen: Prayer ${prayerId} marked as ${newStatus === 'excused' ? 'excused' : newStatus ? 'completed' : 'incomplete'}`);
    } catch (error) {
      console.error('❌ HomeScreen: Error toggling prayer:', error);
      Alert.alert('Error', 'Failed to update prayer status. Please try again.');
    }
  };

  const handleBellPress = async (prayerId) => {
    if (!requireSignedIn(navigation, currentLanguage)) {
      return;
    }

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



  // Load global notification settings
  const loadGlobalNotificationSettings = async () => {
    try {
      const settings = await AsyncStorage.getItem('adhanSettings');
      if (settings) {
        setGlobalNotificationSettings(JSON.parse(settings));
      }
    } catch (error) {
      console.error('Error loading global notification settings:', error);
    }
  };

  // Save global notification settings
  const saveGlobalNotificationSettings = async (newSettings) => {
    try {
      setGlobalNotificationSettings(newSettings);
      await AsyncStorage.setItem('adhanSettings', JSON.stringify(newSettings));
      // Also save to notification service
      await newNotificationService.saveNotificationSettings(newSettings);
    } catch (error) {
      console.error('Error saving global notification settings:', error);
    }
  };

  const getPrayerDisplayName = (prayerId) => {
    const prayer = prayerTimes.find(p => p.id === prayerId);
    return prayer ? prayer.name : '';
  };

  const getGreeting = () => {
    const today = new Date();
    const hour = today.getHours();
    const day = today.getDay(); // 5 = Friday
    if (day === 5) {
      return `Jummua Mubarak${userName ? ', ' + userName + '!' : '!'}`;
    }
    // Only Islamic greetings for other days
    const greetings = [
      `Assalamu Alaikum${userName ? ', ' + userName + '!' : '!'}`,
      `JazakAllah Khair${userName ? ', ' + userName + '!' : '!'}`
    ];
    // Use a deterministic random based on the date so it doesn't change on every render
    const seed = today.getFullYear() * 10000 + (today.getMonth() + 1) * 100 + today.getDate();
    const index = seed % greetings.length;
    return greetings[index];
  };

  const getDynamicFontSize = (text) => {
    return getResponsiveFontSize(text, 28, currentLanguage, Dimensions.get('window').width - 80);
  };

  const getTimeBasedScene = () => {
    const hour = new Date().getHours();
    
    if (hour >= 5 && hour < 6) { // Fajr
      return {
        type: 'dawn',
        colors: ['#1A1A1A', '#2D2D2D'],
        sceneName: t('dawn', currentLanguage)
      };
    } else if (hour >= 6 && hour < 12) { // Morning
      return {
        type: 'morning',
        colors: ['#2D2D2D', '#3D3D3D'],
        sceneName: t('morning', currentLanguage)
      };
    } else if (hour >= 12 && hour < 15) { // Dhuhr
      return {
        type: 'noon',
        colors: ['#2A2A2A', '#1A1A1A'],
        sceneName: t('noon', currentLanguage)
      };
    } else if (hour >= 15 && hour < 18) { // Asr
      return {
        type: 'afternoon',
        colors: ['#1A1A1A', '#2D2D2D'],
        sceneName: t('afternoon', currentLanguage)
      };
    } else if (hour >= 18 && hour < 20) { // Maghrib
      return {
        type: 'sunset',
        colors: ['#2D2D2D', '#1A1A1A'],
        sceneName: t('sunset', currentLanguage)
      };
    } else { // Isha and night
      return {
        type: 'night',
        colors: ['#1A1A1A', '#2D2D2D'],
        sceneName: t('night', currentLanguage)
      };
    }
  };

  const getPrayerTimeScene = (prayerId) => {
    switch (prayerId) {
      case 'fajr':
        return {
          colors: ['#1A1A1A', '#2D2D2D'],
          sceneName: t('dawn', currentLanguage)
        };
      case 'dhuhr':
        return {
          colors: ['#2A2A2A', '#1A1A1A'],
          sceneName: t('noon', currentLanguage)
        };
      case 'asr':
        return {
          colors: ['#1A1A1A', '#2D2D2D'],
          sceneName: t('afternoon', currentLanguage)
        };
      case 'maghrib':
        return {
          colors: ['#2D2D2D', '#1A1A1A'],
          sceneName: t('sunset', currentLanguage)
        };
      case 'isha':
        return {
          colors: ['#1A1A1A', '#2D2D2D'],
          sceneName: t('night', currentLanguage)
        };
      default:
        return getTimeBasedScene();
    }
  };

  const getFormattedDates = () => {
    const today = new Date();
    
    // Map language to locale for date formatting
    const localeMap = {
      'english': 'en-US',
      'spanish': 'es-ES',
      'french': 'fr-FR',
      'italian': 'it-IT'
    };
    
    const locale = localeMap[currentLanguage] || 'en-US';
    
    const gregorianDate = today.toLocaleDateString(locale, {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });

    // Convert to Hijri
    const todayParts = {
      year: today.getFullYear(),
      month: today.getMonth() + 1, // JavaScript months are 0-based
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

  useEffect(() => {
    calculatePrayerStreak();
  }, []);

  const calculatePrayerStreak = async () => {
    try {
      const streak = await streakService.getCurrentPrayerStreak();
      console.log('🕌 HomeScreen: Loaded prayer streak:', streak);
      setPrayerStreak(streak);
    } catch (error) {
      console.error('🕌 HomeScreen: Error calculating prayer streak:', error);
      setPrayerStreak(0);
    }
  };

  // Update streak when screen comes into focus
  useFocusEffect(
    React.useCallback(() => {
      calculatePrayerStreak();
    }, [])
  );

  // Load user's madhab preference
  const loadUserMadhab = async () => {
    try {
      const userProfile = await AsyncStorage.getItem('userProfile');
      if (userProfile) {
        const profile = JSON.parse(userProfile);
        const newMadhab = profile.madhab || 'hanafi';
        console.log('📖 Loading user madhab:', { current: userMadhab, new: newMadhab });
        setUserMadhab(newMadhab);
        // Recalculate prayer times with new madhab if location is available
        if (location?.coords) {
          console.log('📍 Recalculating prayer times after madhab load...');
          await calculatePrayerTimes(location.coords);
          
          // Force immediate update to Firebase to ensure notifications use new times
          console.log('📡 Updating Firebase with new prayer times after madhab load...');
          try {
            await newNotificationService.schedulePrayerNotifications(prayerTimes);
            console.log('✅ Firebase updated with new prayer times after madhab load');
          } catch (error) {
            console.error('❌ Error updating Firebase with new prayer times after madhab load:', error);
          }
        }
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
      
      console.log('🕌 Fetching prayer times with:', {
        madhab: userMadhab,
        method: userMethod,
        school: userSchool,
        date: `${year}-${month}-${day}`,
        timezone,
        coords: coords
      });
      
      // Aladhan API requires DD-MM-YYYY format (not YYYY-MM-DD) - wrong format returns wrong year and incorrect DST times
      const url = `https://api.aladhan.com/v1/timings/${day}-${month}-${year}?latitude=${coords.latitude}&longitude=${coords.longitude}&method=${userMethod}&school=${userSchool}&timezonestring=${encodeURIComponent(timezone)}`;
      const response = await fetch(url);
      const json = await response.json();
      if (json.code === 200 && json.data && json.data.timings) {
        console.log('✅ Prayer times received:', {
          Fajr: json.data.timings.Fajr,
          Dhuhr: json.data.timings.Dhuhr,
          Asr: json.data.timings.Asr,
          Maghrib: json.data.timings.Maghrib,
          Isha: json.data.timings.Isha
        });
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
      console.log('📅 HomeScreen: Scheduling time-sensitive notifications for prayers:', prayers.length);
      // Use the new time-sensitive notification system
      await newNotificationService.scheduleTimeSensitiveNotifications(prayers);
      console.log('✅ HomeScreen: Time-sensitive notifications scheduled successfully');
    } catch (e) {
      console.error('❌ Error scheduling time-sensitive notifications:', e);
    }
  };



  // Load excuse mode on component mount
  useEffect(() => {
    loadExcuseMode();
  }, []);

  // Auto-mark prayers as excused when excuse mode is enabled
  useEffect(() => {
    const autoMarkExcusedPrayers = async () => {
      console.log('🔄 HomeScreen Auto-mark useEffect triggered:', { excuseMode, prayerTimesLength: prayerTimes.length });
      
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


  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.bannerWrapper}>
          <AdBanner />
        </View>
        {/* Location Permission Banner */}
        {locationPermission === 'denied' && (
          <View style={styles.locationBanner}>
            <View style={styles.locationBannerContent}>
              <Ionicons name="location-outline" size={getResponsiveIconSize(20)} color="#FFFFFF" />
                              <Text style={styles.locationBannerText}>
                  To provide accurate prayer times for your area, location access is needed. You can manage this in your device settings.
                </Text>
              <TouchableOpacity 
                style={styles.locationBannerButton}
                onPress={requestLocationPermission}
              >
                <Text style={styles.locationBannerButtonText}>Continue</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
        
        {/* Debug Section - Commented out for production */}
        {/* {__DEV__ && (
          <View style={styles.debugSection}>
            <Text style={styles.debugTitle}>🔍 HomeScreen Debug</Text>
            <Text style={styles.debugText}>Profile Loaded: {profileLoaded ? 'Yes' : 'No'}</Text>
            <Text style={styles.debugText}>User Name: {userName || 'Not loaded'}</Text>
            <Text style={styles.debugText}>User Madhab: {userMadhab || 'Not loaded'}</Text>
            <TouchableOpacity 
              style={styles.debugButton}
              onPress={forceRefreshProfile}
            >
              <Text style={styles.debugButtonText}>🔄 Force Refresh Profile</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={[styles.debugButton, { backgroundColor: '#6A4C93' }]}
              onPress={setManualUserName}
            >
              <Text style={styles.debugButtonText}>✏️ Set Username Manually</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={[styles.debugButton, { backgroundColor: '#E91E63' }]}
              onPress={debugFirebaseProfile}
            >
              <Text style={styles.debugButtonText}>🔍 Debug Firebase Profile</Text>
            </TouchableOpacity>
          </View>
        )} */}
        
        <ScrollView 
          showsVerticalScrollIndicator={false} 
          style={styles.scrollView} 
          contentContainerStyle={{ 
            flexGrow: 1,
            paddingBottom: 20
          }}
        >
          {/* Welcome Header */}
          <Animated.View 
            style={[
              styles.header,
              {
                opacity: headerAnim,
                transform: [
                  {
                    translateY: headerAnim.interpolate({
                      inputRange: [0, 1],
                      outputRange: [30, 0],
                    }),
                  },
                ],
              },
            ]}
          >
            {/* Debug info for greeting - commented out for production */}
            {/* {__DEV__ && (
              <Text style={[styles.debugText, { textAlign: 'center', marginBottom: 8 }]}>
                Debug: userName = "{userName}" | greeting = "{getGreeting()}"
              </Text>
            )} */}
            <Text style={[styles.greeting, { fontSize: getDynamicFontSize(getGreeting()) }]}>{getGreeting()}</Text>
            <View style={styles.dateContainer}>
              <View style={styles.dateTextContainer}>
                <Text style={styles.islamicDate}>{getFormattedDates().islamicDate}</Text>
                <Text style={styles.gregorianDate}>{getFormattedDates().gregorianDate}</Text>
              </View>
              <TouchableOpacity
                onPress={
                  isSubscribed
                    ? undefined
                    : !isSignedIn
                      ? () => navigation.getParent()?.navigate('Profile', { screen: 'LoginPreview' })
                      : showPaywall
                }
                disabled={isSubscribed}
                activeOpacity={isSubscribed ? 1 : 0.85}
                style={!isSubscribed && styles.joinPremiumTagWrapper}
              >
                {isSubscribed ? (
                  <View style={[styles.joinPremiumTag, styles.premiumActiveTag]}>
                    <Text style={[styles.joinPremiumTagText, styles.premiumActiveTagText]}>
                      Premium
                    </Text>
                  </View>
                ) : !isSignedIn ? (
                  <View style={[styles.prayerStreakBadge, styles.prayerStreakBadgeGuest, styles.guestSignInTag]}>
                    <Ionicons name="person-outline" size={12} color="#D4AF37" />
                    <Text style={[styles.prayerStreakText, styles.prayerStreakTextGuest]}>
                      {t('signInToTrackPrayers', currentLanguage)}
                    </Text>
                  </View>
                ) : (
                  <LinearGradient
                    colors={['#FFE566', '#F5D76E', '#D4AF37']}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                    style={styles.joinPremiumTag}
                  >
                    <Text style={styles.joinPremiumTagText}>Join Hudā Premium</Text>
                    <Ionicons name="chevron-forward" size={12} color="#1A1A1A" />
                  </LinearGradient>
                )}
              </TouchableOpacity>
            </View>
          </Animated.View>

          {/* User Madhab Display with Prayer Streak */}
          {(isSignedIn || (userMadhab && userMadhab !== 'none')) && (
          <Animated.View 
            style={[
              styles.madhabDisplay,
              {
                opacity: madhabAnim,
                transform: [
                  {
                    translateY: madhabAnim.interpolate({
                      inputRange: [0, 1],
                      outputRange: [20, 0],
                    }),
                  },
                ],
              },
            ]}
          >
            <View style={styles.madhabStreakContainer}>
              {/* Madhab Badge */}
              {userMadhab && userMadhab !== 'none' && (
                <View style={styles.madhabBadge}>
                  <Ionicons name="school-outline" size={16} color="#FFFFFF" />
                  <Text style={styles.madhabText}>
                    {userMadhab.charAt(0).toUpperCase() + userMadhab.slice(1)} Madhab
                  </Text>
                </View>
              )}
              
              {/* Prayer Streak Badge — signed-in users only */}
              {isSignedIn && (
                <View
                  style={[
                    styles.prayerStreakBadge,
                    prayerStreak === 0 && styles.prayerStreakBadgeEmpty,
                  ]}
                >
                  <Ionicons
                    name="flame"
                    size={16}
                    color={prayerStreak > 0 ? '#4CAF50' : '#666666'}
                  />
                  <Text
                    style={[
                      styles.prayerStreakText,
                      prayerStreak === 0 && styles.prayerStreakTextEmpty,
                    ]}
                  >
                    {`${prayerStreak} ${t('prayerStreak', currentLanguage)}`}
                  </Text>
                </View>
              )}
            </View>
          </Animated.View>
          )}

          {/* Current Prayer Card */}
          <Animated.View 
            style={[
              styles.currentPrayerSection,
              {
                opacity: prayerCardAnim,
                transform: [
                  {
                    translateY: prayerCardAnim.interpolate({
                      inputRange: [0, 1],
                      outputRange: [40, 0],
                    }),
                  },
                ],
              },
            ]}
          >
            <Text style={styles.sectionTitle}>
              {isPrayerTimeActive ? t('currentPrayer', currentLanguage) : t('lastPrayer', currentLanguage)}
            </Text>
            {currentPrayer && (
              <Animated.View style={{ transform: [{ scale: currentPrayerButtonScale }] }}>
                <TouchableOpacity 
                  onPress={() => animateButtonPress(currentPrayerButtonScale, () => navigation.navigate('Prayer'))}
                  activeOpacity={0.9}
                >
                  <ImageBackground
                    source={getPrayerBackgroundImage(currentPrayer.id)}
                    style={styles.prayerCard}
                    imageStyle={getPrayerImageStyle(currentPrayer.id)}
                    resizeMode="cover"
                  >
                    <View style={styles.prayerCardOverlay}>
                      <View style={styles.prayerCardContent}>
                        <View style={styles.prayerInfo}>
                          <Text style={[
                            styles.prayerName,
                            getResponsiveTextStyle(currentPrayer.name, 24, currentLanguage, Dimensions.get('window').width - 120)
                          ]}>
                            {currentPrayer.name}
                          </Text>
                          <Text style={styles.prayerTime}>{currentPrayer.time}</Text>
                          <View style={styles.sceneBadge}>
                            <Text style={[
                              styles.sceneText,
                              getResponsiveTextStyle(currentPrayer.scene.name, 12, currentLanguage, 80)
                            ]}>
                              {currentPrayer.scene.name}
                            </Text>
                          </View>

                        </View>
                        <TouchableOpacity 
                          style={[
                            styles.checkmarkButton,
                            prayerStatus[currentPrayer.id]?.completed ? styles.checkmarkButtonChecked : 
                            prayerStatus[currentPrayer.id]?.excused ? styles.checkmarkButtonExcused :
                            styles.checkmarkButtonUnchecked
                          ]}
                          onPress={e => {
                            e.stopPropagation();
                            togglePrayer(currentPrayer.id);
                          }}
                          activeOpacity={0.7}
                        >
                          {prayerStatus[currentPrayer.id]?.excused ? (
                            <Text style={styles.excusedIcon}>🌡️</Text>
                          ) : prayerStatus[currentPrayer.id]?.completed ? (
                            <Ionicons name="checkmark" size={22} color="#fff" style={{ fontWeight: 'bold' }} />
                          ) : (
                            <View style={styles.emptyCircle} />
                          )}
                        </TouchableOpacity>
                      </View>
                    </View>
                  </ImageBackground>
                </TouchableOpacity>
              </Animated.View>
            )}
          </Animated.View>

          {/* Upcoming Prayer */}
          {nextPrayer && (
            <Animated.View 
              style={[
                styles.upcomingSection,
                {
                  opacity: upcomingAnim,
                  transform: [
                    {
                      translateY: upcomingAnim.interpolate({
                        inputRange: [0, 1],
                        outputRange: [30, 0],
                      }),
                    },
                  ],
                },
              ]}
            >
                              <Text style={[
                                styles.sectionTitle,
                                getResponsiveTextStyle(t('upcomingPrayer', currentLanguage), 20, currentLanguage, Dimensions.get('window').width - 40)
                              ]}>
                                {t('upcomingPrayer', currentLanguage)}
                              </Text>
              <Animated.View style={{ transform: [{ scale: upcomingPrayerButtonScale }] }}>
                <TouchableOpacity 
                  onPress={() => animateButtonPress(upcomingPrayerButtonScale, () => navigation.navigate('Prayer'))}
                  activeOpacity={0.9}
                >
                  <ImageBackground
                    source={getPrayerBackgroundImage(nextPrayer.id)}
                    style={styles.prayerCard}
                    imageStyle={getPrayerImageStyle(nextPrayer.id)}
                    resizeMode="cover"
                  >
                    <View style={styles.prayerCardOverlay}>
                      <View style={styles.prayerCardContent}>
                        <View style={styles.prayerInfo}>
                          <View style={styles.prayerNameContainer}>
                            <Text style={[
                              styles.prayerName,
                              getResponsiveTextStyle(nextPrayer.name, 24, currentLanguage, Dimensions.get('window').width - 120)
                            ]}>
                              {nextPrayer.name}
                            </Text>
                            <Text style={styles.prayerTimeSubtext}>
                              {nextPrayer.time}
                            </Text>
                          </View>
                          <View style={styles.timeContainer}>
                            <Ionicons name="time-outline" size={16} color="#fff" style={styles.timeIcon} />
                            <Text style={styles.nextPrayerTime}>
                              {timeUntilNext.hours}h {timeUntilNext.minutes}m {timeUntilNext.seconds}s
                            </Text>
                          </View>
                          <View style={styles.sceneBadge}>
                            <Text style={[
                              styles.sceneText,
                              getResponsiveTextStyle(nextPrayer.scene.name, 12, currentLanguage, 80)
                            ]}>
                              {nextPrayer.scene.name}
                            </Text>
                          </View>

                        </View>
                        <View style={styles.actionButtons}>
                          <TouchableOpacity
                            style={styles.notificationButton}
                            onPress={(e) => {
                              e.stopPropagation();
                              animateButtonPress(bellButtonScale, () => handleBellPress(nextPrayer.id));
                            }}
                            onLongPress={(e) => {
                              e.stopPropagation();
                              handleBellLongPress(nextPrayer.id);
                            }}
                          >
                            <Ionicons
                              name={prayerNotifications[nextPrayer.id] === 'notification' ? "notifications" : "notifications-off-outline"}
                              size={24}
                              color={prayerNotifications[nextPrayer.id] === 'notification' ? "#fff" : "rgba(255, 255, 255, 0.8)"}
                            />
                          </TouchableOpacity>
                        </View>
                      </View>
                    </View>
                  </ImageBackground>
                </TouchableOpacity>
              </Animated.View>
            </Animated.View>
          )}

          {/* Quick Actions */}
          <Animated.View 
            style={[
              styles.quickActionsSection,
              {
                opacity: quickActionsAnim,
                transform: [
                  {
                    translateY: quickActionsAnim.interpolate({
                      inputRange: [0, 1],
                      outputRange: [30, 0],
                    }),
                  },
                ],
              },
            ]}
          >
            <Text style={styles.sectionTitle}>{t('quickActions', currentLanguage)}</Text>
            <View style={styles.quickActionsGrid}>
              <Animated.View style={[styles.quickActionGridItem, { transform: [{ scale: qiblaButtonScale }] }]}>
                <View style={styles.quickActionContainer}>
                  <QiblaWidget onPress={() => animateButtonPress(qiblaButtonScale, () => navigation.navigate('QiblaScreen'))} />
                  <Text style={styles.quickActionLabel} numberOfLines={2}>{t('qibla', currentLanguage) || 'Qibla'}</Text>
                </View>
              </Animated.View>

              <Animated.View style={[styles.quickActionGridItem, { transform: [{ scale: mosqueFinderButtonScale }] }]}>
                <View style={styles.quickActionContainer}>
                  <TouchableOpacity
                    style={[styles.quickActionButton, { padding: 0, overflow: 'hidden' }]}
                    onPress={() => animateButtonPress(mosqueFinderButtonScale, () => {
                      navigation.navigate('MosqueFinderScreen');
                    })}
                    activeOpacity={0.8}
                  >
                    <Image
                      source={require('../assets/Mosque.png')}
                      style={styles.mosqueImage}
                    />
                  </TouchableOpacity>
                  <Text style={styles.quickActionLabel} numberOfLines={2}>{t('mosqueFinder', currentLanguage) || 'Mosque Finder'}</Text>
                </View>
              </Animated.View>

              <Animated.View style={[styles.quickActionGridItem, { transform: [{ scale: tasbihButtonScale }] }]}>
                <View style={styles.quickActionContainer}>
                  <TouchableOpacity
                    style={[styles.quickActionButton, { padding: 0, overflow: 'hidden' }]}
                    onPress={() => animateButtonPress(tasbihButtonScale, () => {
                      if (requireSignedIn(navigation, currentLanguage)) {
                        navigation.navigate('TasbihScreen');
                      }
                    })}
                    activeOpacity={0.8}
                  >
                    <Image
                      source={require('../assets/Tasbih.png')}
                      style={styles.tasbihImage}
                    />
                  </TouchableOpacity>
                  <Text style={styles.quickActionLabel} numberOfLines={2}>{t('tasbih', currentLanguage) || 'Tasbih'}</Text>
                </View>
              </Animated.View>

              <Animated.View style={[styles.quickActionGridItem, { transform: [{ scale: halalFoodFinderButtonScale }] }]}>
                <View style={styles.quickActionContainer}>
                  <TouchableOpacity
                    style={[styles.quickActionButton, { padding: 0, overflow: 'hidden' }]}
                    onPress={() => animateButtonPress(halalFoodFinderButtonScale, () => {
                      navigation.navigate('HalalFoodFinderScreen');
                    })}
                    activeOpacity={0.8}
                  >
                    <Image
                      source={require('../assets/hallal.png')}
                      style={styles.halalFoodFinderImage}
                    />
                  </TouchableOpacity>
                  <Text style={styles.quickActionLabel} numberOfLines={2}>{t('halalFoodFinder', currentLanguage) || 'Halal Food'}</Text>
                </View>
              </Animated.View>
            </View>
          </Animated.View>

          {/* Recent Dua Requests Carousel */}
          <Animated.View
            style={[
              styles.duaCarouselSection,
              {
                opacity: upcomingAnim,
                transform: [
                  {
                    translateY: upcomingAnim.interpolate({
                      inputRange: [0, 1],
                      outputRange: [30, 0],
                    }),
                  },
                ],
              },
            ]}
          >
            <View style={styles.duaCarouselHeader}>
              <View style={styles.duaCarouselTitleRow}>
                <View style={styles.duaCarouselTitleLeft}>
                  <Text style={styles.duaCarouselTitle}>{t('communityPrayerRequests', currentLanguage)}</Text>
                  {newDuaRequestsCount > 0 && (
                    <View style={styles.duaCarouselBadge}>
                      <Text style={styles.duaCarouselBadgeText}>
                        {newDuaRequestsCount > 99 ? '99+' : newDuaRequestsCount}
                      </Text>
                    </View>
                  )}
                </View>
                <TouchableOpacity
                  style={styles.duaViewMoreButton}
                  activeOpacity={0.7}
                  onPress={() => {
                    setNewDuaRequestsCount(0);
                    navigation.navigate('DuaBoardScreen');
                  }}
                >
                  <Text style={styles.duaViewMoreText}>{t('viewMore', currentLanguage) || 'View more'}</Text>
                  <Ionicons name="chevron-forward" size={16} color="#888888" />
                </TouchableOpacity>
              </View>
            </View>

            {recentDuaRequests.length > 0 ? (
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.duaCarouselScroll}
              >
                {recentDuaRequests.map((request) => {
                  const isLiked = request.supporters?.includes(currentUserId);
                  const supportCount = request.supporters?.length || 0;

                  return (
                    <View key={request.id} style={styles.duaCarouselCard}>
                      <TouchableOpacity
                        activeOpacity={0.85}
                        onPress={() => openDuaRequestDetail(request.id)}
                      >
                        <Text style={styles.duaCarouselCardTitle} numberOfLines={2}>
                          {request.title}
                        </Text>
                        <Text style={styles.duaCarouselCardDesc} numberOfLines={3}>
                          {request.description}
                        </Text>
                      </TouchableOpacity>
                      <View style={styles.duaCarouselCardFooter}>
                        <TouchableOpacity
                          style={styles.duaCarouselAuthor}
                          activeOpacity={0.85}
                          onPress={() => openDuaRequestDetail(request.id)}
                        >
                          <Ionicons name="person-outline" size={12} color="#888" />
                          <Text style={styles.duaCarouselAuthorText} numberOfLines={1}>
                            {request.author || t('anonymous', currentLanguage)}
                          </Text>
                          {isCreatorAuthor(request) && (
                            <View style={styles.duaCarouselCreatorBadge}>
                              <Text style={styles.duaCarouselCreatorBadgeText}>{t('creator', currentLanguage)}</Text>
                            </View>
                          )}
                        </TouchableOpacity>
                        <TouchableOpacity
                          style={styles.duaCarouselSupport}
                          activeOpacity={0.7}
                          onPress={() => handleCarouselLike(request)}
                          disabled={likingCarouselRequestId === request.id}
                        >
                          <Ionicons
                            name={isLiked ? 'heart' : 'heart-outline'}
                            size={14}
                            color={isLiked ? '#FF6B6B' : '#888'}
                          />
                          <Text style={[styles.duaCarouselSupportText, isLiked && styles.duaCarouselSupportTextActive]}>
                            {supportCount}
                          </Text>
                        </TouchableOpacity>
                      </View>
                    </View>
                  );
                })}
              </ScrollView>
            ) : (
              <View style={styles.duaCarouselEmpty}>
                <Text style={styles.duaCarouselEmptyText}>{t('beFirstToShare', currentLanguage)}</Text>
              </View>
            )}
          </Animated.View>

        </ScrollView>
      </SafeAreaView>



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

    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#121212',
  },
  safeArea: {
    flex: 1,
  },
  bannerWrapper: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 12,
    paddingTop: 8,
    paddingBottom: 8,
  },
  scrollView: {
    flex: 1,
    paddingHorizontal: 20,
  },
  header: {
    padding: 16,
    paddingTop: getAndroidTopPadding(32),
  },
  greeting: {
    fontWeight: '800',
    color: '#ffffff',
    marginBottom: 12,
    marginLeft: -20,
    textShadowColor: 'rgba(0, 0, 0, 0.6)',
    textShadowOffset: { width: 0, height: 3 },
    textShadowRadius: 6,
    letterSpacing: 0.8,
    opacity: 0.95,
  },
  madhabDisplay: {
    paddingHorizontal: 20,
    marginBottom: 10,
  },
  madhabStreakContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
    gap: 10,
  },
  madhabBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    alignSelf: 'flex-start',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 4,
  },
  madhabText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '500',
    marginLeft: 6,
  },
  dateContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
  },
  joinPremiumTagWrapper: {
    shadowColor: '#D4AF37',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.4,
    shadowRadius: 6,
    elevation: 5,
    borderRadius: 14,
  },
  joinPremiumTag: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#D4AF37',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.35)',
    gap: 4,
  },
  premiumActiveTag: {
    backgroundColor: '#D4AF37',
    borderColor: '#F5D76E',
    shadowColor: '#D4AF37',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 8,
    elevation: 6,
  },
  joinPremiumTagText: {
    color: '#1A1A1A',
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.1,
  },
  premiumActiveTagText: {
    color: '#000000',
    fontWeight: '800',
    letterSpacing: 0.3,
  },
  dateTextContainer: {
    flex: 1,
  },
  islamicDate: {
    fontSize: 16,
    color: '#ffffff',
    marginBottom: 4,
    fontWeight: '500',
  },
  gregorianDate: {
    fontSize: 14,
    color: '#B0B0B0',
    fontWeight: '400',
  },
  sectionTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: '#ffffff',
    marginBottom: 12,
    marginTop: 8,
    textShadowColor: 'rgba(0, 0, 0, 0.5)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4,
    letterSpacing: 0.5,
  },
  currentPrayerSection: {
    marginBottom: 20,
  },
  upcomingSection: {
    marginBottom: 20,
  },
  duaCarouselSection: {
    marginBottom: 24,
  },
  duaCarouselHeader: {
    marginBottom: 12,
  },
  duaCarouselTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  duaCarouselTitleLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
    marginRight: 12,
  },
  duaCarouselTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#FFFFFF',
    letterSpacing: 0.3,
    flexShrink: 1,
  },
  duaCarouselBadge: {
    backgroundColor: '#FF6B6B',
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    paddingHorizontal: 6,
    justifyContent: 'center',
    alignItems: 'center',
  },
  duaCarouselBadgeText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '700',
  },
  duaCarouselScroll: {
    paddingRight: 20,
    gap: 12,
  },
  duaCarouselCard: {
    width: 260,
    backgroundColor: '#1A1A1A',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(212, 175, 55, 0.15)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 4,
  },
  duaCarouselCardTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 8,
    lineHeight: 22,
  },
  duaCarouselCardDesc: {
    fontSize: 13,
    color: '#AAA',
    lineHeight: 19,
    marginBottom: 14,
    minHeight: 57,
  },
  duaCarouselCardFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.06)',
  },
  duaCarouselAuthor: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    flex: 1,
    marginRight: 8,
  },
  duaCarouselAuthorText: {
    fontSize: 12,
    color: '#888',
    fontWeight: '500',
  },
  duaCarouselCreatorBadge: {
    backgroundColor: 'rgba(212, 175, 55, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(212, 175, 55, 0.45)',
    paddingHorizontal: 5,
    paddingVertical: 1,
    borderRadius: 5,
  },
  duaCarouselCreatorBadgeText: {
    color: '#D4AF37',
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 0.2,
    textTransform: 'uppercase',
  },
  duaCarouselSupport: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(255, 107, 107, 0.1)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  duaCarouselSupportText: {
    fontSize: 12,
    color: '#888',
    fontWeight: '700',
  },
  duaCarouselSupportTextActive: {
    color: '#FF6B6B',
  },
  duaCarouselEmpty: {
    backgroundColor: '#1A1A1A',
    borderRadius: 14,
    padding: 20,
    borderWidth: 1,
    borderColor: 'rgba(212, 175, 55, 0.12)',
    alignItems: 'center',
  },
  duaCarouselEmptyText: {
    fontSize: 14,
    color: '#888',
    textAlign: 'center',
  },
  duaViewMoreButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    flexShrink: 0,
  },
  duaViewMoreText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#888888',
  },
  prayerCard: {
    borderRadius: 16,
    minHeight: 140,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.4,
    shadowRadius: 10,
    elevation: 8,
  },
  prayerCardOverlay: {
    backgroundColor: 'rgba(0, 0, 0, 0.2)',
    padding: 16,
    borderRadius: 16,
    minHeight: 140,
  },
  prayerCardContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  prayerInfo: {
    flex: 1,
  },
  prayerNameContainer: {
    flexDirection: 'row',
    alignItems: 'baseline',
    marginBottom: 6,
  },
  prayerName: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#FFFFFF',
    textShadowColor: 'rgba(0, 0, 0, 0.5)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4,
  },
  prayerTimeSubtext: {
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.6)',
    marginLeft: 8,
    fontWeight: '400',
    opacity: 0.8,
  },
  prayerTime: {
    fontSize: 16,
    color: '#ffffff',
    opacity: 0.8,
    fontWeight: '600',
  },
  timeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.25)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    alignSelf: 'flex-start',
    marginTop: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  timeIcon: {
    marginRight: 4,
  },
  nextPrayerTime: {
    fontSize: 14,
    color: '#fff',
    fontWeight: '600',
  },
  actionButtons: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  notificationButton: {
    padding: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  completeButton: {
    padding: 6,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    width: 28,
    height: 28,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  completedButton: {
    backgroundColor: '#4CAF50',
    shadowColor: '#4CAF50',
    shadowOpacity: 0.4,
  },
  iconContainer: {
    width: 45,
    height: 45,
    borderRadius: 22.5,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 15,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  introTitle: {
    fontSize: 16,
    color: '#FFFFFF',
    marginBottom: 12,
    opacity: 0.8,
  },
  sceneBadge: {
    backgroundColor: 'rgba(255, 255, 255, 0.25)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 15,
    marginTop: 8,
    alignSelf: 'flex-start',
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
  emptyCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: 2,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderColor: 'rgba(255, 255, 255, 0.9)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  quickActionsSection: {
    marginBottom: 20,
  },
  quickActionsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
    paddingHorizontal: 10,
  },
  quickActionsGrid: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 8,
    paddingHorizontal: 0,
  },
  quickActionGridItem: {
    flex: 1,
    minWidth: 0,
  },
  quickActionContainer: {
    alignItems: 'center',
    gap: 6,
    width: '100%',
  },
  quickActionLabel: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '600',
    textAlign: 'center',
    opacity: 0.9,
    lineHeight: 14,
    textShadowColor: 'rgba(0, 0, 0, 0.5)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  quickActionButton: {
    width: '100%',
    aspectRatio: 1,
    borderRadius: 16,
    padding: 10,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 15,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 10,
    },
    shadowOpacity: 0.5,
    shadowRadius: 15,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  quickActionIcon: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 6,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  quickActionText: {
    fontSize: 20,
    fontWeight: '800',
    color: '#fff',
    textAlign: 'center',
    marginBottom: 8,
    textShadowColor: 'rgba(0, 0, 0, 0.7)',
    textShadowOffset: { width: 0, height: 3 },
    textShadowRadius: 6,
    letterSpacing: 0.5,
  },
  quickActionSubtext: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.9)',
    textAlign: 'center',
    fontWeight: '500',
    textShadowColor: 'rgba(0, 0, 0, 0.5)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  qiblaContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    width: '100%',
    height: '100%',
  },
  qiblaKaabaImageSimple: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
    borderRadius: 26,
  },
  tasbihImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
    borderRadius: 26,
  },
  duaBoardImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
    borderRadius: 26,
  },
  duaBoardNotificationBadge: {
    position: 'absolute',
    top: 8,
    right: 8,
    minWidth: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#FF3B30',
    borderWidth: 2,
    borderColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 3,
    elevation: 5,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 4,
  },
  duaBoardNotificationBadgeText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '700',
    textAlign: 'center',
    lineHeight: 12,
  },
  mosqueImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
    borderRadius: 26,
  },
  halalFoodFinderImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
    borderRadius: 26,
  },
  hifdhHelperImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
    borderRadius: 26,
  },
  modalOverlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
  },
  notificationModalBox: {
    backgroundColor: '#1E1E1E',
    borderRadius: 25,
    padding: 25,
    width: '80%',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#2A2A2A',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.5,
    shadowRadius: 15,
    elevation: 10,
  },
  modalCloseButton: {
    position: 'absolute',
    top: 15,
    right: 15,
    zIndex: 1,
  },
  notificationModalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 20,
    textAlign: 'center',
  },
  optionsWrapper: {
    width: '100%',
    marginBottom: 20,
  },
  notificationOption: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '100%',
    paddingVertical: 15,
    paddingHorizontal: 15,
    borderRadius: 15,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderWidth: 1,
    borderColor: 'transparent',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  optionDivider: {
    height: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    marginVertical: 15,
  },
  notificationOptionActive: {
    borderColor: '#FF9800',
    borderWidth: 2,
    backgroundColor: 'rgba(255, 152, 0, 0.1)',
    shadowColor: '#FF9800',
    shadowOpacity: 0.3,
  },
  notificationOptionText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  notificationOptionDesc: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.7)',
  },
  notificationCancel: {
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 15,
    borderWidth: 1,
    borderColor: '#2A2A2A',
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  notificationCancelText: {
    fontSize: 16,
    color: '#FF9800',
    fontWeight: '600',
    textAlign: 'center',
  },
  checkmarkButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.25,
    shadowRadius: 5,
    elevation: 4,
    marginLeft: 10,
    transform: [{ scale: 1 }],
    transitionProperty: 'transform',
    transitionDuration: '150ms',
  },
  checkmarkButtonChecked: {
    backgroundColor: '#22c55e', // green
    shadowColor: '#22c55e',
    shadowOpacity: 0.4,
  },
  checkmarkButtonUnchecked: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
  },
  checkmarkButtonExcused: {
    backgroundColor: '#000000', // black
    shadowColor: '#FF9800',
    shadowOpacity: 0.3,
  },
  excusedIcon: {
    fontSize: 22,
    color: '#FF9800',
  },

  locationBanner: {
    backgroundColor: '#FF6B35',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.1)',
  },
  locationBannerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  locationBannerText: {
    flex: 1,
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '500',
    marginLeft: 8,
    marginRight: 12,
  },
  locationBannerButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },
  locationBannerButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  prayerStreakBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(76, 175, 80, 0.15)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(76, 175, 80, 0.3)',
    shadowColor: '#4CAF50',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  prayerStreakText: {
    color: '#4CAF50',
    fontSize: 12,
    fontWeight: '500',
    marginLeft: 6,
  },
  prayerStreakBadgeEmpty: {
    backgroundColor: 'rgba(102, 102, 102, 0.15)',
    borderColor: 'rgba(102, 102, 102, 0.3)',
    shadowColor: '#666666',
    opacity: 0.8,
  },
  prayerStreakTextEmpty: {
    color: '#666666',
  },
  guestSignInTag: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 14,
    gap: 4,
  },
  prayerStreakBadgeGuest: {
    backgroundColor: 'rgba(212, 175, 55, 0.12)',
    borderColor: 'rgba(212, 175, 55, 0.35)',
    shadowColor: '#D4AF37',
  },
  prayerStreakTextGuest: {
    color: '#D4AF37',
    fontSize: 11,
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
  debugSection: {
    backgroundColor: '#1A1A1A',
    borderRadius: 12,
    padding: 16,
    margin: 16,
    borderWidth: 1,
    borderColor: '#333333',
  },
  debugTitle: {
    fontSize: 16,
    color: '#FFD700',
    fontWeight: 'bold',
    marginBottom: 8,
  },
  debugText: {
    fontSize: 12,
    color: '#CCCCCC',
    marginBottom: 4,
  },
  debugButton: {
    backgroundColor: '#4A4A4A',
    borderRadius: 8,
    padding: 8,
    marginTop: 8,
    alignItems: 'center',
  },
  debugButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: 'bold',
  },

}); 