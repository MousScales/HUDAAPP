import React, { useState, useEffect } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  SafeAreaView,
  StatusBar,
  Alert,
  Switch,
  ActivityIndicator,
  Image,
  Linking,
  Platform,
  Modal,
  TextInput
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { auth, firestore } from '../firebase';
// Subscription service removed - will be implemented by user
import newNotificationService from '../services/newNotificationService';
import directNotificationService from '../services/directNotificationService';
import notificationCleanupService from '../services/notificationCleanupService';
import userStateService from '../services/userStateService';
import prayerBlockerService from '../services/prayerBlockerService';
import { useLanguage } from '../utils/useLanguage';
import { t } from '../utils/translations';
import SubscriptionModal from '../components/SubscriptionModal';
// import * as InAppPurchases from 'expo-in-app-purchases'; // Removed - incompatible with current Expo SDK, using RevenueCat instead
import subscriptionGuard from '../services/subscriptionGuard';
import { ExtensionStorage } from '@bacons/apple-targets';

// Subscription product IDs
const MONTHLY_SUBSCRIPTION_ID = 'premium_monthly_999';
const YEARLY_SUBSCRIPTION_ID = 'premium_yearly_80';
const PROMOTIONAL_MONTHLY_ID = 'premium_monthly_promo';
const PROMOTIONAL_YEARLY_ID = 'premium_yearly_offer';

// Helper function to get subscription info from productId
const getSubscriptionInfoFromProductId = (productId) => {
  if (!productId) {
    return { type: 'monthly', price: '$9.99/month', displayName: 'Monthly Premium' };
  }

  switch (productId) {
    case MONTHLY_SUBSCRIPTION_ID:
      return { type: 'monthly', price: '$9.99/month', displayName: 'Monthly Premium' };
    case YEARLY_SUBSCRIPTION_ID:
      return { type: 'yearly', price: '$79.99/year', displayName: 'Yearly Premium' };
    case PROMOTIONAL_MONTHLY_ID:
      return { type: 'monthly', price: '$5.99/month', displayName: 'Monthly Premium' };
    case PROMOTIONAL_YEARLY_ID:
      return { type: 'yearly', price: '$49.99/year', displayName: 'Yearly Premium' };
    default:
      // Fallback: try to determine from productId string
      if (productId.includes('yearly') || productId.includes('year')) {
        return { type: 'yearly', price: '$79.99/year', displayName: 'Yearly Premium' };
      } else if (productId.includes('monthly') || productId.includes('month')) {
        return { type: 'monthly', price: '$9.99/month', displayName: 'Monthly Premium' };
      }
      return { type: 'monthly', price: '$9.99/month', displayName: 'Monthly Premium' };
  }
};


import { 
  doc, 
  getDoc, 
  setDoc, 
  updateDoc, 
  collection, 
  getDocs, 
  query, 
  where, 
  orderBy,
  onSnapshot,
  serverTimestamp,
  deleteDoc 
} from 'firebase/firestore';


export default function SettingsScreen({ navigation, onLogout }) {
  // Language support
  const { currentLanguage } = useLanguage();
  
  const [userProfile, setUserProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedMadhab, setSelectedMadhab] = useState('shafi');
  const [selectedLanguage, setSelectedLanguage] = useState('english');
  const [aboutMeExpanded, setAboutMeExpanded] = useState(false);
  const [profileExpanded, setProfileExpanded] = useState(false);
  const [madhabExpanded, setMadhabExpanded] = useState(false);
  const [prayerNotificationSettings, setPrayerNotificationSettings] = useState({});
  const [adhanSettings, setAdhanSettings] = useState({});
  const [subscriptionInfo, setSubscriptionInfo] = useState(null);
  const [debugInfo, setDebugInfo] = useState(null);
  const [showSubscriptionModal, setShowSubscriptionModal] = useState(false);
  const [isPromotionalModal, setIsPromotionalModal] = useState(false);
  const [prayerBlockerEnabled, setPrayerBlockerEnabled] = useState(false);
  const [prayerBlockerAuthorized, setPrayerBlockerAuthorized] = useState(false);
  const [prayerBlockerLoading, setPrayerBlockerLoading] = useState(false);
  const [hasSelectedApps, setHasSelectedApps] = useState(false);
  const [showNameEditModal, setShowNameEditModal] = useState(false);
  const [editingName, setEditingName] = useState('');

  const getMadhabs = () => [
    { 
      id: 'hanafi', 
      name: t('hanafi', currentLanguage), 
      description: t('hanafiDescription', currentLanguage),
      prayerDifferences: t('hanafiDifferences', currentLanguage)
    },
    { 
      id: 'shafi', 
      name: t('shafi', currentLanguage), 
      description: t('shafiDescription', currentLanguage),
      prayerDifferences: t('shafiDifferences', currentLanguage)
    },
    { 
      id: 'maliki', 
      name: t('maliki', currentLanguage), 
      description: t('malikiDescription', currentLanguage),
      prayerDifferences: t('malikiDifferences', currentLanguage)
    },
    { 
      id: 'hanbali', 
      name: t('hanbali', currentLanguage), 
      description: t('hanbaliDescription', currentLanguage),
      prayerDifferences: t('hanbaliDifferences', currentLanguage)
    },
    { 
      id: 'none', 
      name: t('noMadhab', currentLanguage), 
      description: t('noMadhabDescription', currentLanguage),
      prayerDifferences: t('noMadhabDifferences', currentLanguage)
    }
  ];

  const languages = [
    { 
      id: 'english', 
      name: 'English', 
      nativeName: 'English',
      flag: '🇺🇸',
    },
    { 
      id: 'french', 
      name: 'Français', 
      nativeName: 'French',
      flag: '🇫🇷',
    },
    { 
      id: 'italian', 
      name: 'Italiano', 
      nativeName: 'Italian',
      flag: '🇮🇹',
    },
    { 
      id: 'spanish', 
      name: 'Español', 
      nativeName: 'Spanish',
      flag: '🇪🇸',
    }
  ];

  useEffect(() => {
    loadUserProfile();
    loadNotificationSettings();
    loadSubscriptionInfo();
    loadDebugInfo();
  }, []);

  // Refresh subscription info from RevenueCat and check promotional flag when screen is focused
  useFocusEffect(
    React.useCallback(() => {
      const refreshSubscriptionAndCheckPromo = async () => {
        try {
          // Always refresh subscription info from RevenueCat when screen is focused (no cache)
          console.log('🔄 SettingsScreen: Refreshing subscription info from RevenueCat on focus (no cache)...');
          await loadSubscriptionInfo();
          
          // Check promotional flag
          const showPromotional = await AsyncStorage.getItem('showPromotionalNext');
          if (showPromotional === 'true') {
            console.log('🎁 Promotional flag found in Settings, showing promotional modal');
            
            // Check if user is already subscribed (fresh check from RevenueCat, no cache)
            subscriptionGuard.resetCache();
            const isSubscribed = await subscriptionGuard.forceCheckSubscriptionStatus();
            
            if (!isSubscribed) {
              // Small delay to let screen render
              setTimeout(() => {
                setIsPromotionalModal(true);
                setShowSubscriptionModal(true);
                // Clear the flag after showing
                AsyncStorage.removeItem('showPromotionalNext');
              }, 500);
            } else {
              console.log('✅ User is subscribed - clearing promotional flag');
              AsyncStorage.removeItem('showPromotionalNext');
            }
          }
        } catch (error) {
          console.error('❌ Error refreshing subscription or checking promotional flag:', error);
        }
      };
      
      refreshSubscriptionAndCheckPromo();
    }, [])
  );

  const loadDebugInfo = async () => {
    try {
      const user = auth.currentUser;
      if (!user) return;

      const userState = await userStateService.getUserState();
      const cachedProfile = await AsyncStorage.getItem('userProfile');
      
      setDebugInfo({
        uid: user.uid,
        email: user.email,
        userState: userState,
        cachedProfile: cachedProfile ? JSON.parse(cachedProfile) : null,
        hasUserProfile: !!userProfile,
        userProfileKeys: userProfile ? Object.keys(userProfile) : []
      });
    } catch (error) {
      console.error('Error loading debug info:', error);
    }
  };

  const forceRefreshProfile = async () => {
    try {
      console.log('🔄 Force refreshing profile from Firebase...');
      setLoading(true);
      
      const user = auth.currentUser;
      if (!user) {
        console.log('❌ No user logged in for force refresh');
        return;
      }

      // Clear all cached data
      await AsyncStorage.removeItem('userProfile');
      await userStateService.clearUserState();
      
      // Force reload from Firebase
      const userDoc = await getDoc(doc(firestore, 'users', user.uid));
      
      if (userDoc.exists()) {
        const userData = userDoc.data();
        console.log('✅ Force refresh - Firebase data:', userData);
        
        const completeProfile = {
          uid: user.uid,
          email: user.email,
          firstName: userData.firstName || userData.name || '',
          name: userData.name || userData.firstName || '',
          madhab: userData.madhab || 'hanafi',
          language: userData.language || 'english',
          experienceLevel: userData.experienceLevel || 'beginner',
          onboardingCompleted: userData.onboardingCompleted || false,
          createdAt: userData.createdAt,
          updatedAt: userData.updatedAt,
          lastLogin: userData.lastLogin,
          ...userData
        };
        
        setUserProfile(completeProfile);
        setSelectedMadhab(completeProfile.madhab);
        setSelectedLanguage(completeProfile.language);
        setLastUpdated(completeProfile.updatedAt);
        
        // Save to UserStateService and cache
        await userStateService.saveUserState(completeProfile, completeProfile.onboardingCompleted, completeProfile.language);
        await AsyncStorage.setItem('userProfile', JSON.stringify(completeProfile));
        
        console.log('✅ Force refresh completed successfully');
        Alert.alert('Success', 'Profile refreshed from Firebase!');
      } else {
        console.log('❌ No profile found in Firebase during force refresh');
        Alert.alert('Error', 'No profile found in Firebase. Creating default profile...');
        await createDefaultUserProfile(user);
      }
    } catch (error) {
      console.error('❌ Error in force refresh:', error);
      Alert.alert('Error', 'Failed to refresh profile: ' + error.message);
    } finally {
      setLoading(false);
      loadDebugInfo();
    }
  };

  const loadUserProfile = async () => {
    try {
      const user = auth.currentUser;
      if (!user) {
        console.log('❌ No user logged in');
        setLoading(false);
        return;
      }

      console.log('🔍 Loading user profile for:', user.uid);
      console.log('🔍 User email:', user.email);
      
      // First try to get user state from UserStateService
      const userState = await userStateService.getUserState();
      console.log('🔍 UserStateService data:', userState);
      
        if (userState.userProfile && userState.userProfile.uid === user.uid) {
          console.log('✅ User profile loaded from UserStateService:', userState.userProfile);
          
          // Ensure createdAt exists
          const profileWithCreatedAt = {
            ...userState.userProfile,
            createdAt: userState.userProfile.createdAt || new Date().toISOString()
          };
          
          setUserProfile(profileWithCreatedAt);
          setSelectedMadhab(profileWithCreatedAt.madhab || 'hanafi');
          setSelectedLanguage(profileWithCreatedAt.language || 'english');
          setLoading(false);
          return;
        }
      
      // Fallback to Firebase if UserStateService doesn't have the data
      try {
        const userDoc = await getDoc(doc(firestore, 'users', user.uid));
        
        if (userDoc.exists()) {
          const userData = userDoc.data();
          console.log('✅ User profile loaded from Firebase:', userData);
          console.log('🔍 Firebase profile keys:', Object.keys(userData));
          console.log('🔍 Account created date:', userData.createdAt);
          console.log('🔍 Account created type:', typeof userData.createdAt);
          
          // Ensure the profile has required fields
          const completeProfile = {
            uid: user.uid,
            email: user.email,
            firstName: userData.firstName || userData.name || '',
            name: userData.name || userData.firstName || '',
            madhab: userData.madhab || 'hanafi',
            language: userData.language || 'english',
            experienceLevel: userData.experienceLevel || 'beginner',
            onboardingCompleted: userData.onboardingCompleted || false,
            createdAt: userData.createdAt || new Date().toISOString(), // Fallback to current date if no createdAt
            updatedAt: userData.updatedAt,
            lastLogin: userData.lastLogin,
            ...userData // Include any other fields
          };
          
          setUserProfile(completeProfile);
          setSelectedMadhab(completeProfile.madhab);
          setSelectedLanguage(completeProfile.language);
          
          // Save to UserStateService and cache locally
          await userStateService.saveUserState(completeProfile, completeProfile.onboardingCompleted, completeProfile.language);
          await AsyncStorage.setItem('userProfile', JSON.stringify(completeProfile));
          
          console.log('✅ Profile saved to UserStateService and cache');
        } else {
          console.log('❌ No user profile found in Firebase, creating default profile');
          await createDefaultUserProfile(user);
        }
      } catch (firebaseError) {
        console.warn('⚠️ Firebase load failed, trying local cache:', firebaseError.message);
        
        // Fallback to local cache
        const cachedProfile = await AsyncStorage.getItem('userProfile');
        if (cachedProfile) {
          const userData = JSON.parse(cachedProfile);
          console.log('✅ User profile loaded from cache:', userData);
            setUserProfile(userData);
            setSelectedMadhab(userData.madhab || 'hanafi');
            setSelectedLanguage(userData.language || 'english');
        } else {
          console.log('❌ No cached profile found, creating default');
          await createDefaultUserProfile(user);
        }
      }
    } catch (error) {
      console.error('❌ Error loading user profile:', error);
      Alert.alert(t('error', currentLanguage), t('failedToLoadUserProfile', currentLanguage));
    } finally {
      setLoading(false);
    }
  };

  const loadNotificationSettings = async () => {
    try {
      // Load prayer notification settings
      const storedPrayerSettings = await AsyncStorage.getItem('prayerNotifications');
      if (storedPrayerSettings) {
        setPrayerNotificationSettings(JSON.parse(storedPrayerSettings));
      } else {
        // Default settings - all prayers enabled
        const defaultSettings = {
          fajr: 'adhan',
          sunrise: 'adhan',
          dhuhr: 'adhan',
          asr: 'adhan',
          maghrib: 'adhan',
          isha: 'adhan'
        };
        setPrayerNotificationSettings(defaultSettings);
      }

      // Load adhan settings
      const storedAdhanSettings = await AsyncStorage.getItem('adhanSettings');
      if (storedAdhanSettings) {
        setAdhanSettings(JSON.parse(storedAdhanSettings));
      } else {
        // Default adhan settings
        const defaultAdhanSettings = {
          notificationsEnabled: true,
          adhanAudioEnabled: true
        };
        setAdhanSettings(defaultAdhanSettings);
      }
    } catch (error) {
      console.error('Error loading notification settings:', error);
    }
  };

  // Prayer Blocker Functions
  useEffect(() => {
    const initPrayerBlocker = async () => {
      try {
        await prayerBlockerService.initialize();
        const isAuthorized = await prayerBlockerService.checkAuthorization();
        setPrayerBlockerAuthorized(isAuthorized);
        
        const enabled = await AsyncStorage.getItem('prayerBlockerEnabled');
        
        // Check subscription status
        subscriptionGuard.resetCache();
        const isSubscribed = await subscriptionGuard.forceCheckSubscriptionStatus();
        
        // If not subscribed, automatically disable prayer blocker
        if (!isSubscribed && enabled === 'true') {
          console.log('⚠️ User not subscribed - disabling prayer blocker');
          setPrayerBlockerEnabled(false);
          await AsyncStorage.setItem('prayerBlockerEnabled', 'false');
          await prayerBlockerService.stopPrayerBlocking();
        } else {
          setPrayerBlockerEnabled(enabled === 'true');
        }
        
        // Check if apps have been selected
        const storage = new ExtensionStorage('group.com.digaifounder.huda');
        const hasApps = storage.get('hasSelectedApps');
        console.log('📱 initPrayerBlocker: hasSelectedApps =', hasApps, 'type:', typeof hasApps);
        const hasAppsSelected = hasApps === true || hasApps === 'true' || hasApps === 1 || hasApps === '1';
        setHasSelectedApps(hasAppsSelected);
      } catch (error) {
        console.error('Error initializing prayer blocker:', error);
      }
    };
    
    initPrayerBlocker();
  }, []);

  const handleRequestAuthorization = async () => {
    try {
      // Check subscription first
      subscriptionGuard.resetCache();
      const isSubscribed = await subscriptionGuard.forceCheckSubscriptionStatus();
      
      if (!isSubscribed) {
        setShowSubscriptionModal(true);
        Alert.alert(
          'Premium Feature',
          'Prayer Time App Blocker is a premium feature. Please subscribe to use this feature.',
          [{ text: 'OK' }]
        );
        return;
      }
      
      setPrayerBlockerLoading(true);
      const authorized = await prayerBlockerService.requestAuthorization();
      setPrayerBlockerAuthorized(authorized);
      
      if (authorized) {
        // After authorization is granted, automatically open the app picker
        // Give a brief moment for the UI to update
        setTimeout(async () => {
          try {
            await handleSelectApps();
          } catch (error) {
            // User might cancel, that's okay
            if (error.message !== 'User cancelled app selection') {
              console.error('Error selecting apps after authorization:', error);
            }
          }
        }, 500);
      } else {
        Alert.alert(
          'Authorization Required',
          'Please grant Screen Time permissions in Settings to use the prayer blocker feature.',
          [{ text: 'OK' }]
        );
      }
    } catch (error) {
      console.error('Error requesting authorization:', error);
      Alert.alert('Error', 'Failed to request authorization: ' + error.message);
    } finally {
      setPrayerBlockerLoading(false);
    }
  };

  const handleSelectApps = async () => {
    try {
      // Check subscription first
      subscriptionGuard.resetCache();
      const isSubscribed = await subscriptionGuard.forceCheckSubscriptionStatus();
      
      if (!isSubscribed) {
        setShowSubscriptionModal(true);
        Alert.alert(
          'Premium Feature',
          'Prayer Time App Blocker is a premium feature. Please subscribe to use this feature.',
          [{ text: 'OK' }]
        );
        return;
      }
      
      setPrayerBlockerLoading(true);
      await prayerBlockerService.selectAppsToBlock();
      
      // Small delay to ensure UserDefaults are synchronized
      await new Promise(resolve => setTimeout(resolve, 200));
      
      // Check if apps were selected after the picker is dismissed
      const storage = new ExtensionStorage('group.com.digaifounder.huda');
      const hasApps = storage.get('hasSelectedApps');
      console.log('📱 handleSelectApps: hasSelectedApps =', hasApps, 'type:', typeof hasApps);
      // Handle boolean, string, or number types
      const hasAppsSelected = hasApps === true || hasApps === 'true' || hasApps === 1 || hasApps === '1';
      setHasSelectedApps(hasAppsSelected);
      
      if (hasAppsSelected) {
        Alert.alert('Success', 'Apps selected for blocking during prayer time.');
      } else {
        Alert.alert('Info', 'No apps selected. All apps will be blocked during prayer time.');
      }
    } catch (error) {
      console.log('📱 handleSelectApps error:', error.message);
      // Don't show error for user cancellation or dismissal
      if (error.message && !error.message.includes('cancelled') && !error.message.includes('dismissed')) {
        console.error('Error selecting apps:', error);
        Alert.alert('Error', 'Failed to select apps: ' + error.message);
      } else {
        // User cancelled or dismissed - still check if they made a selection
        await new Promise(resolve => setTimeout(resolve, 200));
        const storage = new ExtensionStorage('group.com.digaifounder.huda');
        const hasApps = storage.get('hasSelectedApps');
        console.log('📱 handleSelectApps (cancelled): hasSelectedApps =', hasApps, 'type:', typeof hasApps);
        const hasAppsSelected = hasApps === true || hasApps === 'true' || hasApps === 1 || hasApps === '1';
        setHasSelectedApps(hasAppsSelected);
      }
    } finally {
      setPrayerBlockerLoading(false);
    }
  };

  const handlePrayerBlockerToggle = async (enabled) => {
    try {
      // Check subscription status first
      subscriptionGuard.resetCache();
      const isSubscribed = await subscriptionGuard.forceCheckSubscriptionStatus();
      
      if (!isSubscribed) {
        // If not subscribed, show subscription modal and reset switch
        setPrayerBlockerEnabled(false);
        await AsyncStorage.setItem('prayerBlockerEnabled', 'false');
        setShowSubscriptionModal(true);
        Alert.alert(
          'Premium Feature',
          'Prayer Time App Blocker is a premium feature. Please subscribe to use this feature.',
          [{ text: 'OK' }]
        );
        return;
      }
      
      setPrayerBlockerEnabled(enabled);
      await AsyncStorage.setItem('prayerBlockerEnabled', enabled.toString());
      
      if (enabled) {
        // Schedule continuous monitoring so blocking happens automatically
        console.log('📱 Prayer blocker enabled - scheduling continuous monitoring...');
        await prayerBlockerService.scheduleContinuousMonitoring();
        
        Alert.alert(
          'Prayer Blocker Enabled',
          'Continuous monitoring is now active. Apps will be blocked automatically at prayer times without needing to open the app. Blocking will unlock when you mark prayers as complete.',
          [{ text: 'OK' }]
        );
      } else {
        await prayerBlockerService.stopPrayerBlocking();
        Alert.alert('Success', 'Prayer blocker disabled.');
      }
    } catch (error) {
      console.error('Error toggling prayer blocker:', error);
      setPrayerBlockerEnabled(!enabled);
      Alert.alert('Error', 'Failed to toggle prayer blocker: ' + error.message);
    }
  };

  const loadSubscriptionInfo = async () => {
    try {
      console.log('🔍 Loading subscription info from RevenueCat...');
      
      // First, verify actual subscription status with RevenueCat
      // This is the source of truth - we only show subscription info if RevenueCat confirms they're subscribed
      let isActuallySubscribed = false;
      let revenueCatCustomerInfo = null;
      let premiumEntitlement = null;
      
      try {
        console.log('🔍 Verifying subscription status with RevenueCat...');
        subscriptionGuard.resetCache(); // Force fresh check
        isActuallySubscribed = await subscriptionGuard.forceCheckSubscriptionStatus();
        console.log('✅ RevenueCat subscription check result:', isActuallySubscribed);
        
        // Get customer info from RevenueCat to extract renewal/cancellation dates
        if (isActuallySubscribed) {
          const revenueCatService = require('../services/revenueCatService').default;
          const { PREMIUM_ENTITLEMENT_ID } = require('../services/revenueCatService');
          
          revenueCatCustomerInfo = await revenueCatService.getCustomerInfo();
          if (revenueCatCustomerInfo) {
            premiumEntitlement = revenueCatCustomerInfo.entitlements?.active?.[PREMIUM_ENTITLEMENT_ID];
            console.log('🔍 RevenueCat entitlement details:', {
              willRenew: premiumEntitlement?.willRenew,
              expirationDate: premiumEntitlement?.expirationDate,
              productIdentifier: premiumEntitlement?.productIdentifier
            });
          }
        }
      } catch (error) {
        console.error('❌ Error checking subscription with RevenueCat:', error);
        // If RevenueCat check fails, default to not subscribed (show "Join the Ummah")
        console.log('❌ Cannot verify subscription with RevenueCat - showing "Join the Ummah"');
        setSubscriptionInfo(null);
        return;
      }
      
      // If user is not actually subscribed according to RevenueCat, don't show subscription info
      if (!isActuallySubscribed) {
        console.log('❌ User is not subscribed according to RevenueCat - showing "Join the Ummah"');
        setSubscriptionInfo(null);
        return;
      }
      
      // User IS subscribed according to RevenueCat - now get subscription details
      const user = auth.currentUser;
      let subscriptionData = null;
      
      // Get product ID from RevenueCat entitlement
      const productId = premiumEntitlement?.productIdentifier;
      
      // Get subscription info from productId mapping
      const subscriptionInfoFromProduct = getSubscriptionInfoFromProductId(productId);
      const subscriptionType = subscriptionInfoFromProduct.type;
      let price = subscriptionInfoFromProduct.price;
      const displayName = subscriptionInfoFromProduct.displayName;
      
      // Get dates from RevenueCat entitlement
      let renewalDate = null;
      let cancellationDate = null;
      let expirationDate = null;
      
      if (premiumEntitlement) {
        // Get expiration date from RevenueCat
        if (premiumEntitlement.expirationDate) {
          expirationDate = new Date(premiumEntitlement.expirationDate);
        }
        
        // Determine if subscription will renew or is cancelled
        const willRenew = premiumEntitlement.willRenew === true;
        
        // Check if subscription has expired
        const now = new Date();
        const isExpired = expirationDate && expirationDate < now;
        
        if (willRenew && expirationDate && !isExpired) {
          // Subscription will renew - expiration date is the renewal date
          renewalDate = expirationDate;
        } else if (!willRenew && expirationDate) {
          // Subscription is cancelled - expiration date is when it will be cancelled/expire
          cancellationDate = expirationDate;
        }
        
        console.log('📅 RevenueCat subscription dates:', {
          willRenew,
          expirationDate: expirationDate?.toISOString(),
          renewalDate: renewalDate?.toISOString(),
          cancellationDate: cancellationDate?.toISOString(),
          isExpired: isExpired
        });
      }
      
      // Check if subscription is actually active (not expired)
      const now = new Date();
      const isExpired = expirationDate && expirationDate < now;
      const isActuallyActive = isActuallySubscribed && !isExpired;
      
      // Build subscription data object
      subscriptionData = {
        isActive: isActuallyActive,
        subscriptionType: subscriptionType,
        price: price,
        productId: productId,
        displayName: displayName,
        renewalDate: renewalDate,
        cancellationDate: cancellationDate,
        expirationDate: expirationDate,
        willRenew: premiumEntitlement?.willRenew || false,
        isExpired: isExpired
      };
      
      // Only set subscription info if user is actually subscribed according to RevenueCat
      if (isActuallySubscribed) {
        setSubscriptionInfo(subscriptionData);
        console.log('✅ Subscription info from RevenueCat:', subscriptionData);
      } else {
        // User is not subscribed - don't show subscription info
        setSubscriptionInfo(null);
      }
    } catch (error) {
      console.error('❌ Error loading subscription info:', error);
      // Double-check with RevenueCat if there was an error
      try {
        const revenueCatCheck = await subscriptionGuard.checkSubscriptionStatus();
        if (revenueCatCheck) {
          // User is subscribed, show basic info
          setSubscriptionInfo({
            isActive: true,
            subscriptionType: 'monthly',
            price: '$9.99/month',
            displayName: 'Premium'
          });
        } else {
          // User is not subscribed
          setSubscriptionInfo(null);
        }
      } catch (revenueCatError) {
        console.error('❌ Error in final RevenueCat check:', revenueCatError);
        setSubscriptionInfo(null);
      }
    }
  };

  const createDefaultUserProfile = async (user) => {
    try {
      const defaultProfile = {
        uid: user.uid,
        email: user.email,
        firstName: user.displayName || '',
        name: user.displayName || '',
        madhab: 'hanafi',
        language: 'english',
        experienceLevel: 'beginner',
        onboardingCompleted: false,
        prayerNotifications: true,
        adhanNotifications: true,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      };

      await setDoc(doc(firestore, 'users', user.uid), defaultProfile);
      console.log('✅ Default user profile created:', defaultProfile);
      
      // Save to UserStateService and local cache
      await userStateService.saveUserState(defaultProfile, false, 'english');
      await AsyncStorage.setItem('userProfile', JSON.stringify(defaultProfile));
      
      setUserProfile(defaultProfile);
      setSelectedMadhab('hanafi');
      setSelectedLanguage('english');
    } catch (error) {
      console.error('❌ Error creating default profile:', error);
    }
  };

  const saveMadhab = async (madhab) => {
    try {
      const user = auth.currentUser;
      if (!user) {
        Alert.alert(t('error', currentLanguage), t('mustBeLoggedIn', currentLanguage));
        return;
      }

      console.log('Saving madhab to Firebase:', madhab);
      
      // Update Firebase
      await updateDoc(doc(firestore, 'users', user.uid), {
        madhab: madhab,
        updatedAt: serverTimestamp()
      });
      
      // Update local state
      setSelectedMadhab(madhab);
      
      // Update local cache
      const updatedProfile = { ...userProfile, madhab: madhab };
      setUserProfile(updatedProfile);
      await AsyncStorage.setItem('userProfile', JSON.stringify(updatedProfile));
      
      // Trigger prayer time recalculation by updating AsyncStorage
      await AsyncStorage.setItem('userProfile', JSON.stringify(updatedProfile));
      
      console.log('✅ Madhab saved successfully');
      
      // Madhab updated silently - no popup needed
      
    } catch (error) {
      console.error('Error saving madhab:', error);
      
      // Try local fallback
      await AsyncStorage.setItem('@selected_madhab', madhab);
      setSelectedMadhab(madhab);
      
      // Madhab saved locally silently - no popup needed
    }
  };

  const saveLanguage = async (language) => {
    try {
      const user = auth.currentUser;
      if (!user) {
        Alert.alert(t('error', currentLanguage), t('mustBeLoggedIn', currentLanguage));
        return;
      }

      console.log('Saving language to Firebase:', language);
      
      // Update Firebase
      await updateDoc(doc(firestore, 'users', user.uid), {
        language: language,
        updatedAt: serverTimestamp()
      });
      
      // Update local state
      setSelectedLanguage(language);
      
      // Update local cache
      const updatedProfile = { ...userProfile, language: language };
      setUserProfile(updatedProfile);
      await AsyncStorage.setItem('userProfile', JSON.stringify(updatedProfile));
      
      // Save language preference separately for easy access
      await AsyncStorage.setItem('userLanguage', language);
      
      // Force refresh all language-dependent components
      await import('../utils/languageStateManager').then(async (module) => {
        const languageStateManager = module.default;
        await languageStateManager.setLanguage(language);
        await languageStateManager.forceRefresh();
      });
      
      console.log('✅ Language saved successfully');
      
      Alert.alert(
        t('languageUpdated', language),
        t('languageUpdatedMessage', language),
        [{ text: t('ok', language) }]
      );
      
    } catch (error) {
      console.error('Error saving language:', error);
      
      // Try local fallback
      await AsyncStorage.setItem('userLanguage', language);
      setSelectedLanguage(language);
      
      Alert.alert(
        t('languageUpdated', language),
        t('languageUpdatedLocalMessage', language),
        [{ text: t('ok', language) }]
      );
    }
  };

  const handleDonation = () => {
    Alert.alert(
      t('supportUs', currentLanguage),
      t('supportUsMessage', currentLanguage),
      [{ text: t('ok', currentLanguage) }]
    );
  };

  const handleSubscription = () => {
    Alert.alert(
      t('manageSubscription', currentLanguage),
      t('manageSubscriptionMessage', currentLanguage),
      [{ text: t('ok', currentLanguage) }]
    );
  };



  const handleClearScheduledNotifications = async () => {
    Alert.alert(
      'Clear Scheduled Notifications?',
      'This will cancel ALL scheduled local notifications on your device. Use this if you\'re getting old/random notifications.\n\nCloud Functions will continue to work normally.',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Clear All', 
          style: 'destructive',
          onPress: async () => {
            try {
              setLoading(true);
              console.log('🗑️ Clearing all scheduled notifications...');
              
              const result = await notificationCleanupService.cancelAllScheduledNotifications();
              
              setLoading(false);
              
              Alert.alert(
                'Success!',
                `Cleared ${result.count} scheduled notifications.\n\nYou'll only receive notifications from Cloud Functions now.`,
                [{ text: 'OK' }]
              );
              
              console.log('✅ Scheduled notifications cleared');
            } catch (error) {
              setLoading(false);
              console.error('❌ Error clearing notifications:', error);
              
              Alert.alert(
                'Error',
                'Failed to clear notifications. Try again or reinstall the app.',
                [{ text: 'OK' }]
              );
            }
          }
        }
      ]
    );
  };

  const handleResetNotifications = async () => {
    Alert.alert(
      'Reset Notifications?',
      'This will clean up all your push tokens and re-register your device. This fixes duplicate notification issues.\n\nYou may need to grant notification permissions again.',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Reset', 
          style: 'destructive',
          onPress: async () => {
            try {
              setLoading(true);
              console.log('🧹 Starting notification reset...');
              
              const result = await notificationCleanupService.cleanupAndResetNotifications();
              
              setLoading(false);
              
              Alert.alert(
                'Success!',
                result.message,
                [{ text: 'OK' }]
              );
              
              console.log('✅ Notification reset complete');
            } catch (error) {
              setLoading(false);
              console.error('❌ Error resetting notifications:', error);
              
              Alert.alert(
                'Error',
                'Failed to reset notifications. Please try again or contact support.',
                [{ text: 'OK' }]
              );
            }
          }
        }
      ]
    );
  };

  const handleLogout = () => {
    console.log('🔄 Logout button pressed');
    console.log('🔄 onLogout prop:', onLogout);
    
    Alert.alert(
      t('logout', currentLanguage),
      t('logoutMessage', currentLanguage),
      [
        { text: t('cancel', currentLanguage), style: 'cancel' },
        { 
          text: t('logout', currentLanguage), 
          style: 'destructive',
          onPress: async () => {
            try {
              console.log('🔄 Starting logout process...');
              
              // Sign out from Firebase
              await auth.signOut();
              console.log('✅ User signed out successfully');
              
              // Clear only user-specific data, not app settings
              await userStateService.clearUserState();
              console.log('✅ User-specific data cleared (preserving app settings)');
              
              // Call the onLogout callback
              if (onLogout) {
                console.log('🔄 Calling onLogout callback...');
                await onLogout();
              } else {
                console.log('⚠️ onLogout callback is not available');
              }
              
              // Navigation will be handled automatically by the Firebase auth state change listener
              // The auth state listener will detect user is null and set isLoggedIn to false
              // which will show the onboarding screen
              console.log('🔄 Auth state listener should now redirect to onboarding screen');
            } catch (error) {
              console.error('❌ Error during logout:', error);
              
              // Even if there's an error, try to complete the logout process
              try {
                console.log('🔄 Attempting fallback logout...');
                await userStateService.clearUserState();
                await auth.signOut();
                console.log('✅ Fallback logout completed');
              } catch (fallbackError) {
                console.error('❌ Fallback logout also failed:', fallbackError);
              }
              
              // Show error but don't prevent logout
              Alert.alert(
                t('error', currentLanguage), 
                'Logout completed with some issues, but you should be redirected to the login screen.',
                [{ text: 'OK' }]
              );
            }
          }
        }
      ]
    );
  };

  const editUserName = () => {
    const currentName = userProfile?.firstName || userProfile?.name || userProfile?.displayName || '';
    
    if (Platform.OS === 'ios') {
      // iOS: Use Alert.prompt
      Alert.prompt(
        t('editName', currentLanguage) || 'Edit Name',
        t('enterYourName', currentLanguage) || 'Enter your name:',
        [
          { text: t('cancel', currentLanguage) || 'Cancel', style: 'cancel' },
          { 
            text: t('save', currentLanguage) || 'Save', 
            onPress: async (name) => {
              if (name && name.trim()) {
                await saveUserName(name.trim());
              }
            }
          }
        ],
        'plain-text',
        currentName
      );
    } else {
      // Android: Use Modal with TextInput
      setEditingName(currentName);
      setShowNameEditModal(true);
    }
  };

  const saveUserName = async (name) => {
    if (!name || !name.trim()) {
      return;
    }

    try {
      console.log('✏️ Updating user name to:', name.trim());
      
      // Update local state
      setUserProfile(prev => ({
        ...prev,
        firstName: name.trim(),
        name: name.trim(),
        displayName: name.trim()
      }));
      
      // Update Firebase
      const user = auth.currentUser;
      if (user) {
        await updateDoc(doc(firestore, 'users', user.uid), {
          firstName: name.trim(),
          name: name.trim(),
          displayName: name.trim(),
          updatedAt: serverTimestamp()
        });
        console.log('✅ Name updated in Firebase');
      }
      
      // Update AsyncStorage
      const updatedProfile = {
        ...userProfile,
        firstName: name.trim(),
        name: name.trim(),
        displayName: name.trim(),
        updatedAt: new Date().toISOString()
      };
      await AsyncStorage.setItem('userProfile', JSON.stringify(updatedProfile));
      console.log('✅ Name updated in AsyncStorage');
      
      // Update UserStateService
      await userStateService.saveUserState(updatedProfile, true, currentLanguage);
      console.log('✅ Name updated in UserStateService');
      
      Alert.alert(
        t('success', currentLanguage) || 'Success',
        t('nameUpdatedSuccessfully', currentLanguage) || 'Name updated successfully!'
      );
      
    } catch (error) {
      console.error('❌ Error updating name:', error);
      Alert.alert(
        t('error', currentLanguage) || 'Error',
        t('failedToUpdateName', currentLanguage) || 'Failed to update name. Please try again.'
      );
    }
  };

  const handleSaveName = async () => {
    if (!editingName || !editingName.trim()) {
      Alert.alert(
        t('error', currentLanguage) || 'Error',
        t('nameCannotBeEmpty', currentLanguage) || 'Name cannot be empty.'
      );
      return;
    }

    setShowNameEditModal(false);
    await saveUserName(editingName.trim());
  };

  const handleHelp = () => {
    // Huda Deletion Form URL
    const deletionFormUrl = 'https://forms.gle/YuhpKmDhXx33dfKaA';
    
    Alert.alert(
      t('getHelp', currentLanguage),
      t('getHelpMessage', currentLanguage),
      [
        { text: t('cancel', currentLanguage), style: 'cancel' },
        { 
          text: t('openForm', currentLanguage),
          onPress: () => {
            Linking.openURL(deletionFormUrl).catch(err => {
              console.error('Error opening form:', err);
              Alert.alert(t('error', currentLanguage), t('couldNotOpenSupportForm', currentLanguage));
            });
          }
        }
      ]
    );
  };

  const handleReview = () => {
    // App Store review URL for Hudā app
    const appStoreUrl = 'https://apps.apple.com/app/id6748400060?action=write-review';
    
    Alert.alert(
      t('leaveReview', currentLanguage),
      t('leaveReviewMessage', currentLanguage),
      [
        { text: t('cancel', currentLanguage), style: 'cancel' },
        { 
          text: t('writeReview', currentLanguage),
          onPress: () => {
            Linking.openURL(appStoreUrl).catch(err => {
              console.error('Error opening App Store:', err);
              Alert.alert(t('error', currentLanguage), t('couldNotOpenAppStore', currentLanguage));
            });
          }
        }
      ]
    );
  };

  // const handleTestNotifications = () => {
  //   navigation.navigate('TestNotifications');
  // };



  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar barStyle="light-content" />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#FFD700" />
          <Text style={styles.loadingText}>Loading your profile...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" />
      
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity 
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{t('settings', currentLanguage)}</Text>
      </View>

      <ScrollView 
        style={styles.scrollView} 
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{
          paddingBottom: Platform.OS === 'android' ? 180 : 20
        }}
      >
        {/* User Profile Info */}
        {userProfile && (
          <View style={styles.section}>
            <TouchableOpacity 
              style={[styles.sectionHeader, styles.profileSectionHeader]}
              onPress={async () => {
                if (!profileExpanded) {
                  await loadNotificationSettings();
                }
                setProfileExpanded(!profileExpanded);
              }}
              activeOpacity={0.7}
            >
              <View style={styles.sectionHeaderText}>
                <Text style={[styles.sectionTitle, styles.profileSectionTitle]}>User Details</Text>
              </View>
              <Ionicons 
                name={profileExpanded ? "chevron-up" : "chevron-down"} 
                size={20} 
                color="#888888" 
              />
            </TouchableOpacity>
            
            {profileExpanded && (
              <View style={styles.profileContent}>
                <View style={styles.profileInfoRow}>
                  <Text style={styles.profileInfoLabel}>{t('name', currentLanguage)}:</Text>
                  <TouchableOpacity onPress={editUserName} activeOpacity={0.7}>
                    <Text style={[styles.profileInfoValue, styles.tappableName]}>
                      {userProfile.firstName || userProfile.name || userProfile.displayName || t('notProvided', currentLanguage)}
                      {userProfile.firstName || userProfile.name || userProfile.displayName ? ' ✏️' : ''}
                    </Text>
                  </TouchableOpacity>
                </View>
                
                <View style={styles.profileInfoRow}>
                  <Text style={styles.profileInfoLabel}>{t('email', currentLanguage)}:</Text>
                  <Text style={styles.profileInfoValue}>
                    {userProfile.email || t('notProvided', currentLanguage)}
                  </Text>
                </View>
                
                <View style={styles.profileInfoRow}>
                  <Text style={styles.profileInfoLabel}>{t('madhab', currentLanguage)}:</Text>
                  <Text style={styles.profileInfoValue}>
                    {getMadhabs().find(m => m.id === userProfile.madhab)?.name || t('hanafi', currentLanguage)}
                  </Text>
                </View>
                
                <View style={[styles.profileInfoRow, styles.profileInfoRowLast]}>
                  <Text style={styles.profileInfoLabel}>{t('accountCreated', currentLanguage)}:</Text>
                  <Text style={styles.profileInfoValue}>
                    {(() => {
                      try {
                        console.log('🔍 Checking createdAt:', userProfile.createdAt);
                        
                        if (!userProfile.createdAt) {
                          console.log('❌ No createdAt field found');
                          return t('unknown', currentLanguage);
                        }
                        
                        // Handle Firebase timestamp
                        if (userProfile.createdAt.seconds) {
                          const date = new Date(userProfile.createdAt.seconds * 1000);
                          console.log('✅ Firebase timestamp converted to:', date);
                          return date.toLocaleDateString();
                        }
                        
                        // Handle regular Date object
                        if (userProfile.createdAt instanceof Date) {
                          console.log('✅ Date object:', userProfile.createdAt);
                          return userProfile.createdAt.toLocaleDateString();
                        }
                        
                        // Handle ISO string
                        if (typeof userProfile.createdAt === 'string') {
                          const date = new Date(userProfile.createdAt);
                          if (!isNaN(date.getTime())) {
                            console.log('✅ ISO string converted to:', date);
                            return date.toLocaleDateString();
                          }
                        }
                        
                        // Handle object with toDate method (Firebase Timestamp)
                        if (userProfile.createdAt.toDate && typeof userProfile.createdAt.toDate === 'function') {
                          const date = userProfile.createdAt.toDate();
                          console.log('✅ Firebase Timestamp toDate():', date);
                          return date.toLocaleDateString();
                        }
                        
                        console.log('❌ Unrecognized createdAt format:', typeof userProfile.createdAt, userProfile.createdAt);
                        return 'Recently'; // Fallback for unrecognized format
                      } catch (error) {
                        console.error('❌ Error formatting account created date:', error);
                        return t('unknown', currentLanguage);
                      }
                    })()}
                  </Text>
                </View>
              </View>
            )}
          </View>
        )}

        {/* About Me Section */}
        <View style={styles.section}>
          <TouchableOpacity 
            style={[styles.sectionHeader, styles.profileSectionHeader]}
            onPress={() => setAboutMeExpanded(!aboutMeExpanded)}
            activeOpacity={0.7}
          >
            <View style={styles.sectionHeaderText}>
              <Text style={[styles.sectionTitle, styles.profileSectionTitle]}>
                {t('aboutTheDeveloper', currentLanguage)}
              </Text>
            </View>
            <Ionicons 
              name={aboutMeExpanded ? "chevron-up" : "chevron-down"} 
              size={20} 
              color="#888888" 
            />
          </TouchableOpacity>
          
          {aboutMeExpanded && (
            <View style={styles.profileContent}>
              {/* Profile Image */}
              <View style={styles.profileImageContainer}>
                <Image 
                  source={require('../assets/hudapfp.png')} 
                  style={styles.profileImage}
                  resizeMode="center"
                />
              </View>
              
              <Text style={styles.aboutMeText}>
                {t('aboutMeGreeting', currentLanguage)}{'\n\n'}
                {t('aboutMeIntroduction', currentLanguage)}{'\n\n'}
                {t('aboutMeDevelopment', currentLanguage)}{'\n\n'}
                {t('aboutMeHeart', currentLanguage)}{'\n\n'}
                {t('aboutMePrayer', currentLanguage)}{'\n'}
                {t('aboutMeThankYou', currentLanguage)}{'\n\n'}
                {t('aboutMeClosing', currentLanguage)}{'\n'}
                {t('aboutMeSignature', currentLanguage)}
              </Text>
              
              {/* Social Buttons */}
              <View style={styles.socialButtonsContainer}>
                <TouchableOpacity 
                  style={styles.socialButton}
                  onPress={() => Linking.openURL('https://instagram.com/tafa.__')}
                >
                  <Text style={styles.socialButtonText}>{t('followMe', currentLanguage)}</Text>
                </TouchableOpacity>
                
                <TouchableOpacity 
                  style={styles.socialButton}
                  onPress={() => Linking.openURL('https://paypal.me/MoustaphaGueye51')}
                >
                  <Text style={styles.socialButtonText}>{t('supportMe', currentLanguage)}</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}
        </View>

        {/* Subscription Info Card */}
        <View style={styles.socialMediaWrapper}>
          {subscriptionInfo && subscriptionInfo.isActive ? (
            <TouchableOpacity
              style={styles.subscriptionInfoCard}
              activeOpacity={0.9}
            >
              <View style={styles.subscriptionInfoContent}>
                <View style={styles.subscriptionInfoLeft}>
                  <Text style={styles.subscriptionInfoTitle}>
                    {subscriptionInfo.subscriptionType === 'yearly' ? 'Yearly' : 'Monthly'}
                  </Text>
                  <Text style={[
                    styles.subscriptionInfoStatus,
                    subscriptionInfo.isExpired && styles.expiredStatus
                  ]}>
                    {subscriptionInfo.isExpired ? 'Expired' : (subscriptionInfo.isActive ? 'Active' : 'Inactive')}
                  </Text>
                </View>
                <View style={styles.subscriptionInfoRight}>
                  <Text style={styles.subscriptionInfoPrice}>
                    {subscriptionInfo.price 
                      ? subscriptionInfo.price.split('/')[0] // Extract price part before "/month" or "/year"
                      : subscriptionInfo.subscriptionType === 'yearly' ? '$79.99' : '$9.99'}
                  </Text>
                  {subscriptionInfo.renewalDate && subscriptionInfo.willRenew && (
                    <Text style={styles.subscriptionInfoDate}>
                      Renews {subscriptionInfo.renewalDate.toLocaleDateString()}
                    </Text>
                  )}
                  {subscriptionInfo.cancellationDate && !subscriptionInfo.willRenew && (
                    <Text style={[styles.subscriptionInfoDate, styles.cancellationDate]}>
                      Cancels {subscriptionInfo.cancellationDate.toLocaleDateString()}
                    </Text>
                  )}
                  {subscriptionInfo.expirationDate && !subscriptionInfo.renewalDate && !subscriptionInfo.cancellationDate && (
                    <Text style={[
                      styles.subscriptionInfoDate,
                      subscriptionInfo.isExpired && styles.expiredDate
                    ]}>
                      {subscriptionInfo.isExpired ? 'Expired ' : 'Expires '}
                      {subscriptionInfo.expirationDate.toLocaleDateString()}
                    </Text>
                  )}
                </View>
              </View>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity
              style={styles.subscriptionInfoCard}
              onPress={() => setShowSubscriptionModal(true)}
              activeOpacity={0.9}
            >
              <View style={styles.joinUmmahContent}>
                <Text style={styles.joinUmmahTitle}>Join the Ummah</Text>
                <Text style={styles.joinUmmahSubtitle}>
                  Unlock premium features to help strengthen your deen
                </Text>
              </View>
            </TouchableOpacity>
          )}
        </View>

        {/* Social Media Links */}
        <View style={styles.socialMediaWrapper}>
          <View style={styles.socialMediaContainer}>
            <TouchableOpacity
              style={styles.socialMediaRectangle}
              onPress={() => Linking.openURL('https://www.instagram.com/thehuda.app')}
              activeOpacity={0.7}
            >
              <Text style={styles.socialMediaRectangleText}>Instagram</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.socialMediaRectangle}
              onPress={() => Linking.openURL('https://www.tiktok.com/@thehuda.app')}
              activeOpacity={0.7}
            >
              <Text style={styles.socialMediaRectangleText}>TikTok</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Madhab Selection */}
        <View style={styles.section}>
          <TouchableOpacity 
            style={[styles.sectionHeader, styles.profileSectionHeader]}
            onPress={() => setMadhabExpanded(!madhabExpanded)}
            activeOpacity={0.7}
          >
            <View style={styles.sectionHeaderText}>
              <Text style={[styles.sectionTitle, styles.profileSectionTitle]}>
                {t('madhab', currentLanguage)} {t('selection', currentLanguage)}
              </Text>
            </View>
            <Ionicons 
              name={madhabExpanded ? "chevron-up" : "chevron-down"} 
              size={20} 
              color="#888888" 
            />
          </TouchableOpacity>
          
          {madhabExpanded && (
            <View style={styles.profileContent}>
              {getMadhabs().map((madhab) => (
            <TouchableOpacity
              key={madhab.id}
              style={[
                styles.madhabOption,
                selectedMadhab === madhab.id && styles.selectedMadhab
              ]}
              onPress={() => saveMadhab(madhab.id)}
            >
              <View style={styles.madhabContent}>
                <View style={styles.madhabHeader}>
                  <View style={styles.madhabTitleContainer}>
                    <View style={styles.madhabIcon}>
                      <Ionicons 
                        name="library" 
                        size={16} 
                        color={selectedMadhab === madhab.id ? "#FFFFFF" : "#888888"} 
                      />
                    </View>
                    <Text style={styles.madhabName}>{madhab.name}</Text>
                  </View>
                  {selectedMadhab === madhab.id && (
                    <View style={styles.checkmarkContainer}>
                      <Ionicons name="checkmark-circle" size={22} color="#FFFFFF" />
                    </View>
                  )}
                </View>
                <Text style={styles.madhabDescription}>{madhab.description}</Text>
                <View style={styles.prayerDifferencesContainer}>
                  <Text style={styles.prayerDifferencesTitle}>{t('prayerTimeDifferences', currentLanguage)}:</Text>
                  <Text style={styles.prayerDifferencesText}>{madhab.prayerDifferences}</Text>
                </View>
              </View>
            </TouchableOpacity>
              ))}
            </View>
          )}
        </View>

        {/* Language Selection */}
        <View style={styles.section}>
          <View style={[styles.sectionHeader, styles.sectionHeaderCentered]}>
            <Text style={[styles.sectionTitle, styles.centeredSectionTitle]}>
              {t('language', currentLanguage)} {t('selection', currentLanguage)}
            </Text>
          </View>
          
          {languages.map((language) => (
            <TouchableOpacity
              key={language.id}
              style={[
                styles.languageOption,
                selectedLanguage === language.id && styles.selectedMadhab
              ]}
              onPress={() => saveLanguage(language.id)}
            >
              <View style={styles.madhabContent}>
                <View style={styles.madhabHeader}>
                  <View style={styles.madhabTitleContainer}>
                    <View style={styles.madhabIcon}>
                      <Text style={styles.languageFlag}>{language.flag}</Text>
                    </View>
                    <Text style={styles.madhabName}>{language.name}</Text>
                  </View>
                  {selectedLanguage === language.id && (
                    <View style={styles.checkmarkContainer}>
                      <Ionicons name="checkmark-circle" size={22} color="#FFFFFF" />
                    </View>
                  )}
                </View>
              </View>
            </TouchableOpacity>
          ))}
        </View>

        {/* Prayer Blocker Section - iOS Only */}
        {Platform.OS === 'ios' && (
          <View style={styles.section}>
            <View style={[styles.sectionHeader, styles.profileSectionHeader, styles.prayerSectionHeader]}>
              <Text style={[styles.sectionTitle, styles.profileSectionTitle, styles.prayerSectionTitle]}>
                Prayer Time App Blocker
              </Text>
              <Switch
                value={prayerBlockerEnabled}
                onValueChange={handlePrayerBlockerToggle}
                disabled={!prayerBlockerAuthorized || prayerBlockerLoading || !subscriptionInfo || !subscriptionInfo.isActive}
                trackColor={{ false: '#767577', true: subscriptionInfo && subscriptionInfo.isActive ? '#81b0ff' : '#cccccc' }}
                thumbColor={prayerBlockerEnabled ? '#f4f3f4' : '#f4f3f4'}
                ios_backgroundColor={subscriptionInfo && subscriptionInfo.isActive ? '#3e3e3e' : '#cccccc'}
              />
            </View>
            
            {!prayerBlockerAuthorized && (
              <TouchableOpacity
                style={[
                  styles.authorizeButton,
                  (!subscriptionInfo || !subscriptionInfo.isActive) && styles.disabledButton
                ]}
                onPress={handleRequestAuthorization}
                disabled={prayerBlockerLoading || !subscriptionInfo || !subscriptionInfo.isActive}
              >
                <View style={styles.authorizeContent}>
                  <Ionicons 
                    name="lock-closed" 
                    size={20} 
                    color={(!subscriptionInfo || !subscriptionInfo.isActive) ? '#666666' : '#FFFFFF'} 
                  />
                  <Text style={[
                    styles.authorizeText,
                    (!subscriptionInfo || !subscriptionInfo.isActive) && styles.disabledText
                  ]}>
                    {prayerBlockerLoading ? 'Requesting...' : 'Authorize Screen Time'}
                  </Text>
                </View>
              </TouchableOpacity>
            )}
            
            {prayerBlockerAuthorized && (
              <View>
                <TouchableOpacity
                  style={[
                    styles.selectAppsButton,
                    (!subscriptionInfo || !subscriptionInfo.isActive) && styles.disabledButton
                  ]}
                  onPress={handleSelectApps}
                  disabled={prayerBlockerLoading || !subscriptionInfo || !subscriptionInfo.isActive}
                >
                  <View style={styles.selectAppsContent}>
                    <Ionicons 
                      name="apps" 
                      size={20} 
                      color={(!subscriptionInfo || !subscriptionInfo.isActive) ? '#444444' : '#888888'} 
                    />
                    <Text style={[
                      styles.selectAppsText,
                      (!subscriptionInfo || !subscriptionInfo.isActive) && styles.disabledText
                    ]}>
                      Select Apps to Block
                    </Text>
                    <Ionicons 
                      name="chevron-forward" 
                      size={16} 
                      color={(!subscriptionInfo || !subscriptionInfo.isActive) ? '#444444' : '#888888'} 
                    />
                  </View>
                </TouchableOpacity>
                
              </View>
            )}
            
            {/* Premium Feature Overlay */}
            {(!subscriptionInfo || !subscriptionInfo.isActive) && (
              <TouchableOpacity 
                style={styles.premiumOverlay}
                activeOpacity={0.9}
                onPress={() => setShowSubscriptionModal(true)}
              >
                <View style={styles.premiumOverlayContent}>
                  <Text style={styles.premiumOverlayTitle}>Hudā Premium Feature</Text>
                  <Text style={styles.premiumOverlaySubtitle}>
                    Please subscribe to use Prayer Blocker
                  </Text>
                </View>
              </TouchableOpacity>
            )}
          </View>
        )}

        {/* Help & Support Section */}
        <View style={styles.section}>
          <View style={[styles.sectionHeader, styles.profileSectionHeader, styles.helpSectionHeader]}>
            <View style={styles.sectionHeaderText}>
              <Text style={[styles.sectionTitle, styles.profileSectionTitle, styles.helpSectionTitle]}>
                {t('helpAndSupport', currentLanguage)}
              </Text>
            </View>
          </View>
          
          <TouchableOpacity 
            style={styles.helpButton}
            onPress={handleHelp}
          >
            <View style={styles.helpContent}>
              <View style={styles.helpIconWrapper}>
                <Ionicons name="chatbubble-ellipses" size={20} color="#888888" />
              </View>
              <View style={styles.helpTextContainer}>
                <Text style={styles.helpText}>{t('contactSupport', currentLanguage)}</Text>
                <Text style={styles.helpDescription}>{t('getHelpOrLeaveFeedback', currentLanguage)}</Text>
              </View>
              <Ionicons name="chevron-forward" size={16} color="#888888" />
            </View>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={styles.reviewButton}
            onPress={handleReview}
          >
            <View style={styles.reviewContent}>
              <View style={styles.reviewIconWrapper}>
                <Ionicons name="star" size={20} color="#888888" />
              </View>
              <View style={styles.reviewTextContainer}>
                <Text style={styles.reviewText}>{t('leaveAReview', currentLanguage)}</Text>
                <Text style={styles.reviewDescription}>{t('rateHudaOnAppStore', currentLanguage)}</Text>
              </View>
              <Ionicons name="chevron-forward" size={16} color="#888888" />
            </View>
          </TouchableOpacity>
          
          {/* <TouchableOpacity 
            style={styles.testButton}
            onPress={handleTestNotifications}
          >
            <View style={styles.testContent}>
              <View style={styles.testIconWrapper}>
                <Ionicons 
                  name="notifications" 
                  size={20} 
                  color="#FFD700" 
                />
              </View>
              <View style={styles.testTextContainer}>
                <Text style={styles.testText}>
                  🧪 Test Prayer Notifications
                </Text>
                <Text style={styles.testDescription}>
                  Generate fake notifications for screen recording (User: Moustapha)
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={16} color="#FFD700" />
            </View>
          </TouchableOpacity> */}


        </View>

        {/* Account Section */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
        
            
            
          </View>
          
          {/* Logout Button */}
          <TouchableOpacity 
            style={styles.logoutButton}
            onPress={handleLogout}
            onLongPress={() => {
              // Long press opens deletion form
              const deletionFormUrl = 'https://forms.gle/YuhpKmDhXx33dfKaA';
              Alert.alert(
                'Delete Account',
                'To delete your account, please fill out the deletion form. This will help us process your request.',
                [
                  { text: 'Cancel', style: 'cancel' },
                  { 
                    text: 'Open Form',
                    onPress: () => {
                      Linking.openURL(deletionFormUrl).catch(err => {
                        console.error('Error opening deletion form:', err);
                        Alert.alert('Error', 'Could not open the deletion form. Please try again.');
                      });
                    }
                  }
                ]
              );
            }}
            delayLongPress={500}
          >
            <View style={styles.logoutContent}>
              <View style={styles.logoutIconWrapper}>
                <Ionicons name="log-out-outline" size={20} color="#FF6B6B" />
              </View>
              <View style={styles.logoutTextContainer}>
                <Text style={styles.logoutText}>{t('logout', currentLanguage)}</Text>
                <Text style={styles.logoutDescription}>{t('signOutOfAccount', currentLanguage)}</Text>
              </View>
              <Ionicons name="chevron-forward" size={16} color="#FF6B6B" />
            </View>
          </TouchableOpacity>
          
        </View>


        

        
        {/* Debug Section - Commented out for production */}
        {/* {__DEV__ && debugInfo && (
          <View style={styles.debugSection}>
            <Text style={styles.debugTitle}>🔍 Debug Info</Text>
            <Text style={styles.debugText}>UID: {debugInfo.uid}</Text>
            <Text style={styles.debugText}>Email: {debugInfo.email}</Text>
            <Text style={styles.debugText}>Has UserProfile: {debugInfo.hasUserProfile ? 'Yes' : 'No'}</Text>
            <Text style={styles.debugText}>Profile Keys: {debugInfo.userProfileKeys.join(', ')}</Text>
            <Text style={styles.debugText}>UserState Profile: {debugInfo.userState.userProfile ? 'Yes' : 'No'}</Text>
            <Text style={styles.debugText}>Cached Profile: {debugInfo.cachedProfile ? 'Yes' : 'No'}</Text>
            <TouchableOpacity 
              style={styles.refreshButton}
              onPress={() => {
                loadUserProfile();
                loadDebugInfo();
              }}
            >
              <Text style={styles.refreshButtonText}>🔄 Refresh Profile</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={[styles.refreshButton, { backgroundColor: '#6A4C93' }]}
              onPress={forceRefreshProfile}
            >
              <Text style={styles.refreshButtonText}>⚡ Force Refresh from Firebase</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={[styles.refreshButton, { backgroundColor: '#FF6B6B' }]}
              onPress={async () => {
                try {
                  console.log('🔄 Force logout and navigation to onboarding...');
                  await userStateService.clearUserState();
                  await auth.signOut();
                  console.log('✅ Force logout completed');
                } catch (error) {
                  console.error('❌ Force logout error:', error);
                }
              }}
            >
              <Text style={styles.refreshButtonText}>🚪 Force Logout & Navigate</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={[styles.refreshButton, { backgroundColor: '#8B5CF6' }]}
              onPress={() => {
                const createdAt = userProfile?.createdAt;
                let formatted = 'Unable to format';
                
                try {
                  if (createdAt?.seconds) {
                    formatted = new Date(createdAt.seconds * 1000).toLocaleDateString();
                  } else if (createdAt instanceof Date) {
                    formatted = createdAt.toLocaleDateString();
                  } else if (typeof createdAt === 'string') {
                    formatted = new Date(createdAt).toLocaleDateString();
                  } else if (createdAt?.toDate) {
                    formatted = createdAt.toDate().toLocaleDateString();
                  }
                } catch (e) {
                  formatted = 'Error: ' + e.message;
                }
                
                Alert.alert(
                  'Account Created Debug',
                  `Raw createdAt: ${JSON.stringify(createdAt)}\n\nType: ${typeof createdAt}\n\nFormatted: ${formatted}\n\nProfile keys: ${Object.keys(userProfile || {}).join(', ')}`
                );
              }}
            >
              <Text style={styles.refreshButtonText}>📅 Debug Account Created</Text>
            </TouchableOpacity>
          </View>
        )} */}

        <Text style={styles.trustedText}>
          {t('salaamAlaikum', currentLanguage)} {userProfile?.firstName || userProfile?.name || userProfile?.displayName || ''}
        </Text>

        <View style={styles.footer} />
      </ScrollView>

      {/* Subscription Modal */}
      <SubscriptionModal
        visible={showSubscriptionModal}
        onClose={async () => {
          setShowSubscriptionModal(false);
          setIsPromotionalModal(false);
          // Clear promotional flag when modal is closed
          await AsyncStorage.removeItem('showPromotionalNext');
        }}
        onSubscribeSuccess={() => {
          setShowSubscriptionModal(false);
          setIsPromotionalModal(false);
          loadSubscriptionInfo(); // Reload subscription info after successful subscription
        }}
        feature="general"
        isPromotional={isPromotionalModal}
      />

      {/* Name Edit Modal for Android */}
      <Modal
        visible={showNameEditModal}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowNameEditModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>
              {t('editName', currentLanguage) || 'Edit Name'}
            </Text>
            <TextInput
              style={styles.modalInput}
              value={editingName}
              onChangeText={setEditingName}
              placeholder={t('enterYourName', currentLanguage) || 'Enter your name'}
              placeholderTextColor="#999"
              autoFocus={true}
            />
            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalButton, styles.modalButtonCancel]}
                onPress={() => setShowNameEditModal(false)}
              >
                <Text style={styles.modalButtonText}>
                  {t('cancel', currentLanguage) || 'Cancel'}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, styles.modalButtonSave]}
                onPress={handleSaveName}
              >
                <Text style={[styles.modalButtonText, styles.modalButtonSaveText]}>
                  {t('save', currentLanguage) || 'Save'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#121212',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    color: '#FFFFFF',
    fontSize: 16,
    marginTop: 10,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#1E1E1E',
    borderBottomWidth: 1,
    borderBottomColor: '#2A2A2A',
    position: 'relative',
  },
  backButton: {
    padding: 5,
    position: 'absolute',
    left: 20,
    zIndex: 1,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  refreshButton: {
    padding: 5,
  },
  scrollView: {
    flex: 1,
  },
  section: {
    backgroundColor: '#1E1E1E',
    marginHorizontal: 15,
    marginTop: 15,
    borderRadius: 12,
    padding: 20,
    borderWidth: 1,
    borderColor: '#2A2A2A',
    position: 'relative',
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  sectionHeaderCentered: {
    justifyContent: 'center',
  },
  profileSectionHeader: {
    marginBottom: 0,
  },
  prayerSectionHeader: {
    justifyContent: 'space-between',
  },
  sectionIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#2A2A2A',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 15,
  },
  sectionHeaderText: {
    flex: 1,
  },
  sectionTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: '#fff',
    marginBottom: 18,
    textShadowColor: 'rgba(0,0,0,0.6)',
    textShadowOffset: { width: 0, height: 3 },
    textShadowRadius: 6,
    letterSpacing: 0.5,
  },
  centeredSectionTitle: {
    textAlign: 'center',
  },
  profileSectionTitle: {
    marginBottom: 0,
  },
  prayerSectionTitle: {
    marginBottom: 0,
  },
  helpSectionHeader: {
    marginBottom: 20,
    justifyContent: 'center',
  },
  helpSectionTitle: {
    textAlign: 'center',
  },
  sectionDescription: {
    fontSize: 14,
    color: '#BBBBBB',
    lineHeight: 20,
  },
  madhabOption: {
    backgroundColor: '#2A2A2A',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#3A3A3A',
  },
  languageOption: {
    backgroundColor: '#2A2A2A',
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#3A3A3A',
  },
  selectedMadhab: {
    borderColor: '#FFFFFF',
    backgroundColor: '#2A2A2A',
  },
  madhabTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  madhabIcon: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#3A3A3A',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  languageFlag: {
    fontSize: 16,
    textAlign: 'center',
  },
  checkmarkContainer: {
    padding: 4,
  },
  madhabContent: {
    flex: 1,
  },
  madhabHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 5,
  },
  madhabName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  madhabDescription: {
    fontSize: 13,
    color: '#BBBBBB',
    lineHeight: 18,
  },
  prayerDifferencesContainer: {
    marginTop: 5,
  },
  prayerDifferencesTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
    marginBottom: 3,
  },
  prayerDifferencesText: {
    fontSize: 12,
    color: '#BBBBBB',
  },
  statCard: {
    backgroundColor: '#2A2A2A',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    width: '48%',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#3A3A3A',
  },
  statIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#3A3A3A',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  statNumber: {
    fontSize: 28,
    fontWeight: '800',
    color: '#FFFFFF',
    marginBottom: 6,
  },
  statLabel: {
    fontSize: 12,
    color: '#BBBBBB',
    textAlign: 'center',
    fontWeight: '500',
  },

  subscriptionCard: {
    backgroundColor: '#2A2A2A',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#3A3A3A',
  },
  subscriptionContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  subscriptionIconWrapper: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#3A3A3A',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 15,
  },
  subscriptionTextContainer: {
    flex: 1,
  },
  subscriptionTitle: {
    fontSize: 16,
    color: '#FFFFFF',
    fontWeight: '500',
    marginBottom: 3,
  },
  subscriptionDescription: {
    fontSize: 13,
    color: '#BBBBBB',
  },
  donationCard: {
    backgroundColor: '#2A2A2A',
    borderRadius: 12,
    padding: 20,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#3A3A3A',
  },
  donationIconWrapper: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#3A3A3A',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  donationTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#FFFFFF',
    marginBottom: 12,
    textAlign: 'center',
  },
  donationDescription: {
    fontSize: 14,
    color: '#BBBBBB',
    lineHeight: 20,
    textAlign: 'center',
    marginBottom: 20,
  },
  donationButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#4F46E5',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
  },
  donationButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
    marginLeft: 8,
  },
  resetNotificationButton: {
    backgroundColor: '#2A2A2A',
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: '#4CAF5044',
    shadowColor: '#4CAF50',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 5,
  },
  logoutButton: {
    backgroundColor: '#2A2A2A',
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: '#FF6B6B44',
    shadowColor: '#FF6B6B',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 5,
  },
  logoutContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  logoutIconWrapper: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#3A3A3A',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  logoutTextContainer: {
    flex: 1,
  },
  logoutText: {
    fontSize: 16,
    color: '#FF6B6B',
    fontWeight: '700',
    marginBottom: 3,
    textShadowColor: 'rgba(0,0,0,0.4)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4,
  },
  logoutDescription: {
    fontSize: 13,
    color: '#BBBBBB',
  },
  tappableName: {
    // Keep the same styling as regular text but make it tappable
  },
  helpButton: {
    backgroundColor: '#2A2A2A',
    borderRadius: 18,
    padding: 18,
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.12)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.25,
    shadowRadius: 10,
    elevation: 7,
  },
  helpContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  helpIconWrapper: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#3A3A3A',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 15,
  },
  helpTextContainer: {
    flex: 1,
  },
  helpText: {
    fontSize: 16,
    color: '#FFFFFF',
    fontWeight: '700',
    marginBottom: 3,
    textShadowColor: 'rgba(0,0,0,0.4)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4,
  },
  helpDescription: {
    fontSize: 13,
    color: '#BBBBBB',
  },
  reviewButton: {
    backgroundColor: '#2A2A2A',
    borderRadius: 18,
    padding: 18,
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.12)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.25,
    shadowRadius: 10,
    elevation: 7,
    marginTop: 16,
  },
  reviewContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  reviewIconWrapper: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#3A3A3A',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 15,
  },
  reviewTextContainer: {
    flex: 1,
  },
  reviewText: {
    fontSize: 16,
    color: '#FFFFFF',
    fontWeight: '700',
    marginBottom: 3,
    textShadowColor: 'rgba(0,0,0,0.4)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4,
  },
  reviewDescription: {
    fontSize: 13,
    color: '#BBBBBB',
  },

  profileContent: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.1)',
  },
  profileInfoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.08)',
  },
  profileInfoRowLast: {
    borderBottomWidth: 0,
  },
  profileInfoLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#BBBBBB',
    flex: 1,
  },
  profileInfoValue: {
    fontSize: 14,
    color: '#FFFFFF',
    fontWeight: '500',
    flex: 2,
    textAlign: 'right',
  },
  aboutMeText: {
    fontSize: 14,
    color: '#BBBBBB',
    lineHeight: 22,
    textAlign: 'left',
    marginBottom: 20,
  },
  profileImageContainer: {
    alignItems: 'center',
    marginBottom: 20,
  },
  profileImage: {
    width: 120,
    height: 120,
    borderRadius: 60,
  },
  subscriptionInfoCard: {
    backgroundColor: '#2A2A2A',
    borderRadius: 12,
    padding: 18,
    borderWidth: 1,
    borderColor: '#3A3A3A',
    marginBottom: 15,
  },
  subscriptionInfoContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  subscriptionInfoLeft: {
    flex: 1,
  },
  subscriptionInfoRight: {
    alignItems: 'flex-end',
    justifyContent: 'flex-start',
  },
  joinUmmahContent: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  joinUmmahTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 8,
    textAlign: 'center',
  },
  joinUmmahSubtitle: {
    fontSize: 14,
    color: '#BBBBBB',
    lineHeight: 20,
    textAlign: 'center',
  },
  subscriptionInfoTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 6,
  },
  subscriptionInfoStatus: {
    fontSize: 13,
    fontWeight: '500',
    color: '#4CAF50',
  },
  subscriptionInfoSubtitle: {
    fontSize: 14,
    color: '#BBBBBB',
    lineHeight: 20,
  },
  subscriptionInfoPrice: {
    fontSize: 18,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 6,
    textAlign: 'right',
  },
  subscriptionInfoDate: {
    fontSize: 13,
    color: '#BBBBBB',
    textAlign: 'right',
  },
  cancellationDate: {
    color: '#FF6B6B',
  },
  expiredStatus: {
    color: '#FF6B6B',
  },
  expiredDate: {
    color: '#FF6B6B',
  },
  socialMediaWrapper: {
    marginHorizontal: 15,
    marginTop: 15,
    marginBottom: 0,
  },
  socialMediaContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
  },
  socialMediaRectangle: {
    flex: 1,
    minHeight: 50,
    backgroundColor: '#2A2A2A',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#3A3A3A',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 16,
  },
  socialMediaRectangleText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#FFFFFF',
    textAlign: 'center',
  },
  socialButtonsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 25,
    paddingTop: 20,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.1)',
  },
  socialButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#2A2A2A',
    paddingHorizontal: 24,
    paddingVertical: 16,
    borderRadius: 30,
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.12)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.18,
    shadowRadius: 6,
    elevation: 4,
    flex: 1,
    marginHorizontal: 7,
  },
  socialButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
    marginLeft: 8,
  },
  testButton: {
    backgroundColor: '#2A2A2A',
    borderRadius: 18,
    padding: 18,
    borderWidth: 1.5,
    borderColor: 'rgba(255,215,0,0.3)',
    shadowColor: '#FFD700',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.25,
    shadowRadius: 10,
    elevation: 7,
    marginTop: 16,
  },
  testContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  testIconWrapper: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#3A3A3A',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 15,
  },
  testTextContainer: {
    flex: 1,
  },
  testText: {
    fontSize: 16,
    color: '#FFD700',
    fontWeight: '700',
    marginBottom: 3,
    textShadowColor: 'rgba(0,0,0,0.4)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4,
  },
  testDescription: {
    fontSize: 13,
    color: '#BBBBBB',
  },
  trustedText: {
    fontSize: 12,
    color: '#BBBBBB',
    textAlign: 'center',
    marginTop: 20,
    marginBottom: 10,
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
  refreshButton: {
    backgroundColor: '#4A4A4A',
    borderRadius: 8,
    padding: 8,
    marginTop: 8,
    alignItems: 'center',
  },
  refreshButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: 'bold',
  },
  authorizeButton: {
    backgroundColor: '#4A90E2',
    borderRadius: 12,
    padding: 16,
    marginTop: 15,
    alignItems: 'center',
  },
  authorizeContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  authorizeText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 10,
  },
  selectAppsButton: {
    backgroundColor: '#2A2A2A',
    borderRadius: 12,
    padding: 16,
    marginTop: 15,
    borderWidth: 1,
    borderColor: '#3A3A3A',
  },
  selectAppsContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  selectAppsText: {
    flex: 1,
    fontSize: 16,
    color: '#888888',
    marginLeft: 12,
  },
  selectedAppsIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
    marginLeft: 16,
    marginRight: 16,
    padding: 12,
    backgroundColor: 'rgba(76, 175, 80, 0.1)',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(76, 175, 80, 0.3)',
  },
  testBlockButton: {
    backgroundColor: '#2A2A2A',
    borderRadius: 12,
    padding: 16,
    marginTop: 15,
    borderWidth: 1.5,
    borderColor: 'rgba(255, 152, 0, 0.5)',
    shadowColor: '#FF9800',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },
  testBlockContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  testBlockText: {
    color: '#FF9800',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 10,
  },
  selectedAppsText: {
    fontSize: 13,
    color: '#4CAF50',
    marginLeft: 8,
    flex: 1,
  },
  testBlockButton: {
    backgroundColor: '#2A2A2A',
    borderRadius: 12,
    padding: 16,
    marginTop: 15,
    borderWidth: 1.5,
    borderColor: 'rgba(255, 152, 0, 0.5)',
    shadowColor: '#FF9800',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },
  testBlockContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  testBlockText: {
    color: '#FF9800',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 10,
  },
  disabledButton: {
    opacity: 0.4,
    backgroundColor: '#1A1A1A',
  },
  disabledText: {
    color: '#666666',
  },
  premiumOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.85)',
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10,
  },
  premiumOverlayContent: {
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  premiumOverlayTitle: {
    color: '#D4A574',
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 8,
    textAlign: 'center',
  },
  premiumOverlaySubtitle: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '400',
    textAlign: 'center',
    opacity: 0.9,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: '#1A1A1A',
    borderRadius: 20,
    padding: 24,
    width: '85%',
    maxWidth: 400,
    borderWidth: 1,
    borderColor: '#2A2A2A',
  },
  modalTitle: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 20,
    textAlign: 'center',
  },
  modalInput: {
    backgroundColor: '#2A2A2A',
    borderRadius: 12,
    padding: 16,
    color: '#FFFFFF',
    fontSize: 16,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#3A3A3A',
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
  },
  modalButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  modalButtonCancel: {
    backgroundColor: '#2A2A2A',
    borderWidth: 1,
    borderColor: '#3A3A3A',
  },
  modalButtonSave: {
    backgroundColor: '#4CAF50',
  },
  modalButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  modalButtonSaveText: {
    color: '#FFFFFF',
  },
});