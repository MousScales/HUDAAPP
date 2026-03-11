import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  ScrollView,
  Dimensions,
  Alert,
  ActivityIndicator,
  Animated,
  Easing,
  SafeAreaView,
  Image,
  Linking,
  FlatList,
  Platform
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { auth, firestore } from '../firebase';
import { doc, setDoc, getDoc, serverTimestamp } from 'firebase/firestore';
import { getFunctions, httpsCallable } from 'firebase/functions';
import revenueCatService from '../services/revenueCatService';
import subscriptionGuard from '../services/subscriptionGuard';
import { useLanguage } from '../utils/useLanguage';
import { t } from '../utils/translations';
import InvertLantern from '../assets/invert.png';
import { getDynamicFontSize, getDynamicPadding, getResponsiveTextStyle } from '../utils/responsiveText';
import { getResponsiveFontSize, getResponsiveSpacing, getResponsiveContainerSize, getResponsiveBorderRadius, getTabletPadding, isTablet } from '../utils/responsiveSizing';

const { width } = Dimensions.get('window');
// Product IDs are now managed through RevenueCat offerings

export default function SubscriptionModal({ visible, onClose, onSubscribeSuccess, feature, isPromotional = false }) {
  const { currentLanguage } = useLanguage();
  const [loading, setLoading] = useState(true);
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [purchaseSuccessful, setPurchaseSuccessful] = useState(false);
  const [products, setProducts] = useState([]);
  const [hasExistingSubscription, setHasExistingSubscription] = useState(false);
  const [purchaseCancelled, setPurchaseCancelled] = useState(false);
  const [currentFeatureIndex, setCurrentFeatureIndex] = useState(0);
  const [selectedSubscriptionType, setSelectedSubscriptionType] = useState('yearly'); // 'monthly' or 'yearly'
  const [revenueCatPackages, setRevenueCatPackages] = useState([]);
  const [useRevenueCat, setUseRevenueCat] = useState(false);
  const [shouldRender, setShouldRender] = useState(true);
  const [safeToShow, setSafeToShow] = useState(false); // Only true after verifying user is NOT subscribed
  const carouselRef = useRef(null);
  const autoScrollTimer = useRef(null);
  const isUserScrolling = useRef(false);
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scrollViewRef = useRef(null);
  
  // Night sky animation refs
  const starAnimations = useRef([]);
  
  // Reviews data
  const reviews = [
    { name: 'Amina', rating: 5, text: 'The Quran tafsir and commentary feature helped me understand verses I\'ve been reading for years. Alhamdulillah!' },
    { name: 'Omar', rating: 5, text: 'Recording my recitation and tracking progress helped me memorize more surahs than ever before.' },
    { name: 'Fatima', rating: 4.5, text: 'As a new Muslim, the unlimited Islamic lessons made learning so much easier. Highly recommend!' },
    { name: 'Yusuf', rating: 5, text: 'The guided prayers feature improved my salah significantly. Barakallahu feekum!' },
    { name: 'Mariam', rating: 4, text: 'Love recording my Quran recitation - it helps me hear my improvement over time.' },
    { name: 'Khalid', rating: 5, text: 'The complete Quran tafsir deepened my understanding in ways I never imagined.' },
    { name: 'Layla', rating: 4.5, text: 'Hudā became essential to my daily routine. The expert guidance is invaluable!' },
    { name: 'Hassan', rating: 5, text: 'The unlimited lessons and detailed commentary are exactly what I needed. Jazakallahu khairan!' },
    { name: 'Zainab', rating: 4, text: 'Guided prayers helped me establish a consistent prayer routine. Mashallah!' },
    { name: 'Ibrahim', rating: 5, text: 'This app transformed my relationship with the Quran. May Allah reward the creators.' },
    { name: 'Aisha', rating: 4.5, text: 'Tracking my recitation progress motivates me to read more daily. Alhamdulillah!' },
    { name: 'Muhammad', rating: 5, text: 'Best Islamic app I\'ve used. The tafsir explanations are incredibly detailed and clear.' },
    { name: 'Safiya', rating: 4, text: 'The personal recording feature helps me perfect my tajweed. Invaluable tool!' },
    { name: 'Abdul', rating: 5, text: 'Hudā helped me connect with my deen in ways I never imagined possible.' },
    { name: 'Noor', rating: 4.5, text: 'The combination of lessons, recordings, and progress tracking is perfect for my learning.' },
  ];
  
  const reviewsScrollAnim = useRef(new Animated.Value(0)).current;
  
  // Debug logging removed for cleaner console
  
  // Bounce animation for three dots
  const bounceAnim = useRef(new Animated.Value(0)).current;
  // Pulse animation for subscribe button
  const pulseAnim = useRef(new Animated.Value(1)).current;
  
  // Add ref to track current purchase promise
  const currentPurchasePromise = useRef(null);
  const isPurchaseCancelled = useRef(false);

  // Get feature-specific content
  const getFeatureContent = () => {
    // Validate feature prop
    if (!feature) {
      feature = 'general';
    }
    
    const content = {
      tafsir: {
        title: t('unlockTafsir', currentLanguage),
        subtitle: t('tafsirSubtitle', currentLanguage),
        description: t('tafsirDescription', currentLanguage),
        features: [
          { emoji: '📖', text: t('completeQuranTafsir', currentLanguage) },
          { emoji: '🔍', text: t('detailedCommentary', currentLanguage) },
          { emoji: '📚', text: t('unlimitedLessons', currentLanguage) },
          { emoji: '🕌', text: t('guidedPrayers', currentLanguage) },
          { emoji: '🎤', text: t('personalRecordings', currentLanguage) },
          { emoji: '📊', text: t('progressTracking', currentLanguage) },
          { emoji: '📱', text: t('dailyQuranWidgets', currentLanguage) }
        ]
      },
      lessons: {
        title: t('unlockLessons', currentLanguage),
        subtitle: t('lessonsSubtitle', currentLanguage),
        description: t('lessonsDescription', currentLanguage),
        features: [
          { emoji: '📚', text: t('unlimitedLessons', currentLanguage) },
          { emoji: '🎓', text: t('expertGuidance', currentLanguage) },
          { emoji: '📖', text: t('comprehensiveTopics', currentLanguage) },
          { emoji: '🔄', text: t('interactiveLearning', currentLanguage) },
          { emoji: '🕌', text: t('guidedPrayers', currentLanguage) },
          { emoji: '🎤', text: t('personalRecordings', currentLanguage) },
          { emoji: '📱', text: t('dailyQuranWidgets', currentLanguage) }
        ]
      },
      guidedPrayer: {
        title: t('unlockGuidedPrayer', currentLanguage),
        subtitle: t('guidedPrayerSubtitle', currentLanguage),
        description: t('guidedPrayerDescription', currentLanguage),
        features: [
          { emoji: '🕌', text: t('guidedPrayers', currentLanguage) },
          { emoji: '🎧', text: t('audioGuidance', currentLanguage) },
          { emoji: '📚', text: t('unlimitedLessons', currentLanguage) },
          { emoji: '📖', text: t('completeQuranTafsir', currentLanguage) },
          { emoji: '🎤', text: t('personalRecordings', currentLanguage) },
          { emoji: '📊', text: t('progressTracking', currentLanguage) },
          { emoji: '📱', text: t('dailyQuranWidgets', currentLanguage) }
        ]
      },
      recording: {
        title: t('unlockRecording', currentLanguage),
        subtitle: t('recordingSubtitle', currentLanguage),
        description: t('recordingDescription', currentLanguage),
        features: [
          { emoji: '🎤', text: t('personalRecordings', currentLanguage) },
          { emoji: '📊', text: t('progressTracking', currentLanguage) },
          { emoji: '📖', text: t('tajweedPractice', currentLanguage) },
          { emoji: '📚', text: t('unlimitedLessons', currentLanguage) },
          { emoji: '🕌', text: t('guidedPrayers', currentLanguage) },
          { emoji: '🎓', text: t('expertGuidance', currentLanguage) },
          { emoji: '📱', text: t('dailyQuranWidgets', currentLanguage) }
        ]
      },
      general: {
        title: t('subscribeForMoreFeatures', currentLanguage),
        subtitle: t('premiumSubscriptionUnlocks', currentLanguage),
        description: t('generalDescription', currentLanguage),
        features: [
          { emoji: '🕌', text: t('guidedPrayers', currentLanguage) },
          { emoji: '📚', text: t('unlimitedLessons', currentLanguage) },
          { emoji: '📖', text: t('completeQuranTafsir', currentLanguage) },
          { emoji: '🎤', text: t('personalRecordings', currentLanguage) },
          { emoji: '📊', text: t('progressTracking', currentLanguage) },
          { emoji: '🎓', text: t('expertGuidance', currentLanguage) },
          { emoji: '📱', text: t('dailyQuranWidgets', currentLanguage) }
        ]
      }
    };
    
    const selectedContent = content[feature] || content.general;
    return selectedContent;
  };

  // Only generate content when modal is visible to avoid unnecessary re-renders
  const featureContent = visible ? getFeatureContent() : { title: '', subtitle: '', description: '', features: [] };

  // Animate fade overlay when processing
  useEffect(() => {
    if (processing) {
      Animated.timing(fadeAnim, {
        toValue: 0.7,
        duration: 300,
        useNativeDriver: true,
      }).start();
    } else {
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }).start();
    }
  }, [processing]);

  // Night sky animation - twinkling stars
  useEffect(() => {
    if (!visible) return;
    
    // Create multiple stars with random positions
    const numStars = 40;
    const screenHeight = Dimensions.get('window').height;
    starAnimations.current = Array.from({ length: numStars }, () => ({
      opacity: new Animated.Value(Math.random() * 0.3 + 0.4),
      scale: new Animated.Value(1),
      rotate: new Animated.Value(0),
      translateX: new Animated.Value(0),
      translateY: new Animated.Value(0),
      x: Math.random() * width,
      y: Math.random() * screenHeight,
    }));

    // Animate each star to twinkle, pulse, rotate, and move subtly
    const twinkleAnimations = starAnimations.current.map((star, index) => {
      // Twinkle animation
      const twinkle = Animated.loop(
        Animated.sequence([
          Animated.timing(star.opacity, {
            toValue: Math.random() * 0.2 + 0.7,
            duration: Math.random() * 2000 + 1000,
            useNativeDriver: true,
          }),
          Animated.timing(star.opacity, {
            toValue: Math.random() * 0.15 + 0.3,
            duration: Math.random() * 2000 + 1000,
            useNativeDriver: true,
          }),
        ])
      );
      
      // Pulse/scale animation
      const pulse = Animated.loop(
        Animated.sequence([
          Animated.timing(star.scale, {
            toValue: Math.random() * 0.3 + 1.2,
            duration: Math.random() * 3000 + 2000,
            useNativeDriver: true,
          }),
          Animated.timing(star.scale, {
            toValue: 1,
            duration: Math.random() * 3000 + 2000,
            useNativeDriver: true,
          }),
        ])
      );
      
      // Rotation animation (swirl)
      const rotateDirection = index % 2 === 0 ? 1 : -1;
      const rotate = Animated.loop(
        Animated.timing(star.rotate, {
          toValue: rotateDirection,
          duration: Math.random() * 10000 + 5000,
          useNativeDriver: true,
        })
      );
      
      // Subtle movement animation
      const moveX = Animated.loop(
        Animated.sequence([
          Animated.timing(star.translateX, {
            toValue: Math.random() * 10 + 5,
            duration: Math.random() * 4000 + 2000,
            useNativeDriver: true,
          }),
          Animated.timing(star.translateX, {
            toValue: 0,
            duration: Math.random() * 4000 + 2000,
            useNativeDriver: true,
          }),
        ])
      );
      
      const moveY = Animated.loop(
        Animated.sequence([
          Animated.timing(star.translateY, {
            toValue: Math.random() * 10 + 5,
            duration: Math.random() * 4000 + 2000,
            useNativeDriver: true,
          }),
          Animated.timing(star.translateY, {
            toValue: 0,
            duration: Math.random() * 4000 + 2000,
            useNativeDriver: true,
          }),
        ])
      );
      
      twinkle.start();
      pulse.start();
      rotate.start();
      moveX.start();
      moveY.start();
      
      return { twinkle, pulse, rotate, moveX, moveY };
    });

    return () => {
      twinkleAnimations.forEach(anims => {
        anims.twinkle.stop();
        anims.pulse.stop();
        anims.rotate.stop();
        anims.moveX.stop();
        anims.moveY.stop();
      });
    };
  }, [visible]);

  // Auto-scroll feature list
  useEffect(() => {
    if (!visible) return;
    
    const scrollTimeout = setTimeout(() => {
      if (scrollViewRef.current) {
        scrollViewRef.current.scrollTo({
          y: 150,
          animated: true,
        });
      }
    }, 2000); // Start scrolling after 2 seconds

    return () => {
      clearTimeout(scrollTimeout);
    };
  }, [visible]);

  // Auto-scroll reviews
  useEffect(() => {
    if (!visible) return;
    
    reviewsScrollAnim.setValue(0);
    const scrollAnimation = Animated.loop(
      Animated.timing(reviewsScrollAnim, {
        toValue: -1,
        duration: 30000, // 30 seconds for full scroll
        easing: Easing.linear,
        useNativeDriver: true,
      })
    );
    
    scrollAnimation.start();
    
    return () => {
      scrollAnimation.stop();
    };
  }, [visible]);

  // Handle opening Terms of Service
  const openTermsOfService = () => {
    Linking.openURL('https://www.apple.com/legal/internet-services/itunes/dev/stdeula/');
  };

  // Handle opening Privacy Policy
  const openPrivacyPolicy = () => {
    Linking.openURL('https://www.mouslifejournal.com/privacy.html');
  };

  // Handle redeem code
  const handleRedeemCode = () => {
    if (Platform.OS === 'ios') {
      // Open the App Store redeem page using the iOS URL scheme
      // This opens the native redeem code interface
      Linking.openURL('https://apps.apple.com/redeem')
        .catch(err => {
          console.error('Error opening redeem code page:', err);
          // Fallback: try alternative URL
          Linking.openURL('https://buy.itunes.apple.com/WebObjects/MZFinance.woa/wa/freeProductCodeWizard')
            .catch(err2 => {
              console.error('Fallback URL also failed:', err2);
              Alert.alert(
                t('error', currentLanguage) || 'Error',
                'Could not open redeem code page. Please open the App Store and tap on your profile icon, then tap "Redeem Gift Card or Code".'
              );
            });
        });
    } else {
      Alert.alert(
        'Not Available',
        'Redeem codes are only available on iOS devices.'
      );
    }
  };

  // Handle modal close with purchase cancellation
  const handleClose = async () => {
    // If there's a purchase in progress, cancel it
    if (processing && currentPurchasePromise.current) {
      setProcessing(false);
      setPurchaseCancelled(true);
      isPurchaseCancelled.current = true;
      currentPurchasePromise.current = null;
      
      // Clear pending purchase flag
      AsyncStorage.removeItem('pendingPurchase');
    }
    
    onClose();
  };

  // Handle restore purchases via RevenueCat
  const handleRestorePurchases = async () => {
    try {
      const customerInfo = await revenueCatService.restorePurchases();
      
      if (customerInfo && customerInfo.entitlements.active['Huda: The App For Muslims Pro']) {
        setHasExistingSubscription(true);
        setIsSubscribed(true);
        
        Alert.alert(
          t('subscriptionRestored', currentLanguage), 
          t('subscriptionRestoredMessage', currentLanguage)
        );
        
        setTimeout(() => {
          onClose();
        }, 1500);
      } else {
        Alert.alert(
          t('noValidSubscription', currentLanguage), 
          t('noValidSubscriptionMessage', currentLanguage)
        );
      }
    } catch (error) {
      console.error('❌ Error restoring purchases:', error);
      Alert.alert(
        t('restoreError', currentLanguage), 
        t('restoreErrorMessage', currentLanguage)
      );
    }
  };

  // Check subscription BEFORE showing - subscribed users should never see the modal
  useEffect(() => {
    if (!visible) {
      setShouldRender(true);
      setSafeToShow(false);
      return;
    }
    
    setSafeToShow(false); // Don't show until we've verified user is NOT subscribed
    
    const initSubscriptionCheck = async () => {
      try {
        // Check FIRST - only show modal if user is NOT subscribed
        const subscriptionGuard = require('../services/subscriptionGuard').default;
        subscriptionGuard.resetCache();
        const isSubscribed = await subscriptionGuard.forceCheckSubscriptionStatus();
        
        if (isSubscribed) {
          console.log('✅ SubscriptionModal: User is subscribed - never showing modal');
          setIsSubscribed(true);
          setHasExistingSubscription(true);
          setShouldRender(false);
          setLoading(false);
          onClose();
          return;
        }
        
        // Double-check via RevenueCat
        const revenueCatSubscribed = await revenueCatService.hasActiveSubscription(true);
        if (revenueCatSubscribed) {
          console.log('✅ SubscriptionModal: User is subscribed (RevenueCat) - never showing modal');
          setIsSubscribed(true);
          setShouldRender(false);
          setLoading(false);
          onClose();
          return;
        }
        
        // User is NOT subscribed - safe to show modal
        setIsSubscribed(false);
        setSafeToShow(true);
        setLoading(false);
      } catch (error) {
        console.error('❌ Error checking subscription status:', error);
        setLoading(false);
        // On error, show modal (fail open - let user try to subscribe)
        setSafeToShow(true);
      }
    };
    
    initSubscriptionCheck();
  }, [visible, onClose]);

  // Step 2: Get product details from RevenueCat with retry logic
  useEffect(() => {
    if (!visible || loading) return;
    
    let retryCount = 0;
    const maxRetries = 5;
    const retryDelay = 1500; // 1.5 seconds
    
    const getProducts = async () => {
      try {
        // Check if RevenueCat is initialized first
        if (!revenueCatService.initialized) {
          // Retry if not initialized yet
          if (retryCount < maxRetries) {
            retryCount++;
            setTimeout(getProducts, retryDelay);
            return;
          } else {
            console.error('❌ RevenueCat not initialized after retries');
            setProducts([]);
            return;
          }
        }
        
        // Get offerings from RevenueCat
        const offerings = await revenueCatService.getOfferings();
        if (offerings && offerings.current && offerings.current.availablePackages.length > 0) {
          setRevenueCatPackages(offerings.current.availablePackages);
          setUseRevenueCat(true);
          
          // Extract products from packages for display
          // On Android, RevenueCat uses `product` instead of `storeProduct`
          const packageProducts = offerings.current.availablePackages
            .filter(pkg => pkg && (pkg.storeProduct || pkg.product)) // Filter out packages without product info
            .map(pkg => {
              // Handle both iOS (storeProduct) and Android (product) structures
              const product = pkg.storeProduct || pkg.product;
              let productId = '';
              
              if (pkg.storeProduct) {
                // iOS
                productId = pkg.storeProduct.identifier || pkg.identifier || '';
              } else if (pkg.product) {
                // Android - extract Google Play ID from "RevenueCat_ID:Google_Play_ID" format
                const androidId = pkg.product.defaultOption?.storeProductId ||
                                 pkg.product.defaultOption?.id ||
                                 pkg.product.identifier ||
                                 pkg.identifier || '';
                productId = androidId.includes(':') ? androidId.split(':')[1] : androidId;
              }
              
              return {
                productId: productId,
                title: product?.title || '',
                description: product?.description || '',
                price: product?.priceString || product?.priceString || '',
                priceAmountMicros: product?.price || product?.pricePerMonth || 0,
                currencyCode: product?.currencyCode || '',
                packageType: pkg.packageType || '',
                package: pkg // Store the full package for purchase
              };
            });
          setProducts(packageProducts);
        } else {
          // Retry if no offerings available yet
          if (retryCount < maxRetries) {
            retryCount++;
            setTimeout(getProducts, retryDelay);
          } else {
            setProducts([]);
          }
        }
      } catch (error) {
        console.error('❌ Error loading RevenueCat offerings:', error);
        // Retry on error
        if (retryCount < maxRetries) {
          retryCount++;
          setTimeout(getProducts, retryDelay);
        } else {
          setProducts([]);
        }
      }
    };
    
    getProducts();
  }, [visible, loading, isPromotional]);

  // Set up purchase success handling
  useEffect(() => {
    // Simple success handler that just closes the modal
    const handlePurchaseSuccess = () => {
      setProcessing(false);
      setPurchaseSuccessful(true);
      
      // Clear pending purchase flag
      AsyncStorage.removeItem('pendingPurchase');
      
      // Close modal after successful purchase
      setTimeout(() => {
        onClose();
      }, 1000);
    };

    // Make it available globally for the purchase listener
    window.handlePurchaseSuccess = handlePurchaseSuccess;

    return () => {
      // Clean up global callback
      delete window.handlePurchaseSuccess;
    };
  }, [onClose]);

  // Cleanup effect to handle component unmounting
  useEffect(() => {
    return () => {
      // If component unmounts while purchase is in progress, clean up
      if (processing && currentPurchasePromise.current) {
        setProcessing(false);
        isPurchaseCancelled.current = true;
        currentPurchasePromise.current = null;
        
        // Clear pending purchase flag
        AsyncStorage.removeItem('pendingPurchase');
      }
    };
  }, [processing]);

  // Bounce animation for processing state
  useEffect(() => {
    if (processing) {
      const startBounce = () => {
        Animated.sequence([
          Animated.timing(bounceAnim, {
            toValue: 1,
            duration: 600,
            useNativeDriver: true,
          }),
          Animated.timing(bounceAnim, {
            toValue: 0,
            duration: 600,
            useNativeDriver: true,
          })
        ]).start(() => {
          if (processing) {
            startBounce();
          }
        });
      };
      startBounce();
    } else {
      bounceAnim.setValue(0);
    }
  }, [processing]);

  // Pulse animation for subscribe button
  useEffect(() => {
    const startPulse = () => {
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.1,
          duration: 1000,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 1000,
          useNativeDriver: true,
        })
      ]).start(() => {
        startPulse();
      });
    };
    startPulse();
  }, []);

  // Step 3: On subscription button click – request purchase via RevenueCat
  const handleSubscribe = async (subscriptionType) => {
    if (processing) {
      return;
    }
    
    // Set the selected subscription type
    setSelectedSubscriptionType(subscriptionType);
    
    setProcessing(true);
    setPurchaseCancelled(false);
    isPurchaseCancelled.current = false;
    
    try {
      // Check if RevenueCat is initialized and has packages
      if (!revenueCatService.initialized) {
        throw new Error('RevenueCat is not initialized. Please wait a moment and try again.');
      }
      
      // Always fetch fresh packages from RevenueCat API - no shortcuts
      // This ensures we have the latest packages from RevenueCat
      let packagesToUse = [];
      try {
        console.log('🔄 Fetching packages from RevenueCat API...');
        const offerings = await revenueCatService.getOfferings();
        if (offerings && offerings.current && offerings.current.availablePackages.length > 0) {
          packagesToUse = offerings.current.availablePackages;
          // Update state for display
          setRevenueCatPackages(packagesToUse);
          setUseRevenueCat(true);
          console.log(`✅ Loaded ${packagesToUse.length} packages from RevenueCat API`);
          console.log(`📦 Package identifiers:`, packagesToUse.map(p => ({ identifier: p.identifier, type: p.packageType })));
        } else {
          // Fallback to cached packages if available
          if (revenueCatPackages.length > 0) {
            packagesToUse = revenueCatPackages;
            console.log(`⚠️ No fresh packages, using cached packages (${packagesToUse.length} packages)`);
          } else {
            throw new Error('No packages available from RevenueCat');
          }
        }
      } catch (error) {
        console.error('❌ Error loading packages from RevenueCat API:', error);
        // Fallback to cached packages
        if (revenueCatPackages.length > 0) {
          packagesToUse = revenueCatPackages;
          console.log(`⚠️ Using cached packages as fallback (${packagesToUse.length} packages)`);
        } else {
          throw new Error('No subscription packages available. Please check your RevenueCat configuration and internet connection.');
        }
      }
      
      // Find the package based on subscription type and promotional status
      // Use RevenueCat package identifiers directly - no shortcuts or filtering
      let selectedPackage = null;
      
      console.log(`🔍 Looking for ${subscriptionType} package (isPromotional: ${isPromotional}). Available packages:`, packagesToUse.map(p => ({ identifier: p.identifier, type: p.packageType })));
      
      // Match by identifier directly - this is what RevenueCat provides
      // Monthly packages: identifier contains "monthly"
      // Yearly packages: identifier contains "yearly" or "annual"
      // Promotional packages: identifier contains "offer"
      // Base plan packages: identifier does NOT contain "offer"
      
      const identifierLower = (id) => (id || '').toLowerCase();
      const hasOffer = (id) => identifierLower(id).includes('offer');
      const hasMonthly = (id) => identifierLower(id).includes('monthly');
      const hasYearly = (id) => identifierLower(id).includes('yearly') || identifierLower(id).includes('annual');
      
      // Find packages matching subscription type
      const matchingType = packagesToUse.filter(pkg => {
        const id = pkg.identifier || '';
        if (subscriptionType === 'monthly') {
          return hasMonthly(id);
        } else if (subscriptionType === 'yearly') {
          return hasYearly(id);
        }
        return false;
      });
      
      console.log(`🔍 Packages matching ${subscriptionType} type:`, matchingType.map(p => ({ identifier: p.identifier, type: p.packageType })));
      
      // Then filter by promotional status
      if (matchingType.length > 0) {
        if (isPromotional) {
          // Promotional screen: find package with "offer" in identifier
          selectedPackage = matchingType.find(pkg => hasOffer(pkg.identifier));
        } else {
          // Normal screen: find package WITHOUT "offer" in identifier (base plan)
          selectedPackage = matchingType.find(pkg => !hasOffer(pkg.identifier));
        }
      }
      
      // If still not found, try matching by package type as fallback
      if (!selectedPackage) {
        const packageTypeMap = {
          'yearly': ['ANNUAL', 'YEARLY'],
          'monthly': ['MONTHLY']
        };
        
        const typesToMatch = packageTypeMap[subscriptionType] || [];
        const packagesByType = packagesToUse.filter(pkg => 
          typesToMatch.includes(pkg.packageType)
        );
        
        if (packagesByType.length > 0) {
          if (isPromotional) {
            selectedPackage = packagesByType.find(pkg => hasOffer(pkg.identifier));
          } else {
            selectedPackage = packagesByType.find(pkg => !hasOffer(pkg.identifier));
          }
        }
      }
      
      // Fallback to first available package
      if (!selectedPackage && packagesToUse.length > 0) {
        selectedPackage = packagesToUse[0];
        console.log(`⚠️ Using fallback package: ${selectedPackage.identifier}`);
      }
      
      if (!selectedPackage) {
        console.error('❌ No package found. Available packages:', packagesToUse.map(p => ({ identifier: p.identifier, type: p.packageType })));
        throw new Error('No package available for purchase. Please check your RevenueCat configuration.');
      }
      
      console.log(`✅ Selected package: ${selectedPackage.identifier} (type: ${selectedPackage.packageType})`);
      console.log(`   Full package structure:`, JSON.stringify(selectedPackage, null, 2));
      
      // On Android, RevenueCat uses `product` instead of `storeProduct`
      // Try multiple ways to get the product ID for both iOS and Android
      let productId = 'unknown';
      
      if (selectedPackage.storeProduct) {
        // iOS structure
        productId = selectedPackage.storeProduct.identifier || 
                   selectedPackage.storeProduct.productId ||
                   'unknown';
      } else if (selectedPackage.product) {
        // Android structure
        // Priority order:
        // 1. defaultOption.id (this is usually the Google Play base plan ID, e.g., "huda-monthly")
        // 2. defaultOption.storeProductId (format: "RevenueCat_ID:Google_Play_ID")
        // 3. product.identifier (format: "RevenueCat_ID:Google_Play_ID")
        const androidProductId = selectedPackage.product.defaultOption?.id ||
                                 selectedPackage.product.defaultOption?.storeProductId ||
                                 selectedPackage.product.identifier;
        
        // If the ID contains a colon (RevenueCat_ID:Google_Play_ID), extract the Google Play ID
        if (androidProductId && androidProductId.includes(':')) {
          productId = androidProductId.split(':')[1]; // Get the part after the colon
        } else if (androidProductId) {
          productId = androidProductId;
        } else {
          productId = 'unknown';
        }
        
        console.log(`🔍 Android product ID extraction in modal:`, {
          defaultOptionId: selectedPackage.product.defaultOption?.id,
          defaultOptionStoreProductId: selectedPackage.product.defaultOption?.storeProductId,
          productIdentifier: selectedPackage.product.identifier,
          extractedProductId: productId
        });
      } else {
        // Fallback
        productId = selectedPackage.productIdentifier || 
                   selectedPackage.productId ||
                   'unknown';
      }
      
      console.log(`   Product ID: ${productId}`);
      
      // Validate that the package has product information before attempting purchase
      // On Android, RevenueCat uses `product` instead of `storeProduct`
      const hasProductInfo = selectedPackage.storeProduct || selectedPackage.product;
      if (!hasProductInfo) {
        console.error('❌ Package missing product information. Package structure:', selectedPackage);
        throw new Error('Subscription package is not properly configured. The product information is missing. Please try again later or contact support.');
      }
      
      await AsyncStorage.setItem('pendingPurchase', 'true');
      
      // Purchase through RevenueCat
      const customerInfo = await revenueCatService.purchasePackage(selectedPackage);
      
      setProcessing(false);
      setPurchaseSuccessful(true);
      
      await AsyncStorage.setItem('purchaseJustSucceeded', 'true');
      await AsyncStorage.removeItem('pendingPurchase');
      
      // Handle successful purchase
      if (window.handlePurchaseSuccess) {
        window.handlePurchaseSuccess();
      }
      
      setTimeout(() => {
        onClose();
        AsyncStorage.removeItem('purchaseJustSucceeded');
      }, 1000);
    } catch (purchaseError) {
      console.error('❌ Purchase error:', purchaseError);
      setProcessing(false);
      currentPurchasePromise.current = null;
      
      await AsyncStorage.removeItem('pendingPurchase');
      
      const purchaseJustSucceeded = await AsyncStorage.getItem('purchaseJustSucceeded');
      if (purchaseJustSucceeded === 'true') {
        return;
      }
      
      if (!purchaseCancelled && !isPurchaseCancelled.current) {
        const errorMessage = purchaseError.userCancelled 
          ? t('purchaseCancelled', currentLanguage) || 'Purchase cancelled'
          : (purchaseError.message || t('couldNotCompletePurchase', currentLanguage));
        Alert.alert(t('purchaseError', currentLanguage), errorMessage);
      }
    }
  };

  // NEVER render if user is subscribed - return null immediately
  if (!shouldRender || isSubscribed) {
    return null;
  }

  // Don't render anything until we've verified user is NOT subscribed (prevents flash for subscribed users)
  if (visible && !safeToShow) {
    return null;
  }

  // Show loading state if still initializing, but with a timeout fallback
  if (loading) {
    // Add a fallback to show the modal content even if loading takes too long
    setTimeout(() => {
      if (loading) {
        console.log('⚠️ Loading timeout, forcing modal to show content');
        setLoading(false);
      }
    }, 5000); // 5 second fallback
    
    return (
      <Modal visible={visible && safeToShow} animationType="slide" presentationStyle="pageSheet" onRequestClose={handleClose}>
        <LinearGradient colors={["#000", "#181818"]} style={styles.gradient}>
          <SafeAreaView style={styles.container}>
            <View style={styles.header}>
              <TouchableOpacity 
                style={styles.closeButton} 
                onPress={handleClose}
              >
                <Ionicons name="close" size={24} color="#FFFFFF" />
              </TouchableOpacity>
              <View style={styles.placeholder} />
            </View>
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color="#fff" />
              <Text style={[
                styles.loadingText,
                getResponsiveTextStyle(t('loadingSubscriptionOptions', currentLanguage), 18, currentLanguage, width - 40)
              ]}>
                {t('loadingSubscriptionOptions', currentLanguage)}
              </Text>
            </View>
          </SafeAreaView>
        </LinearGradient>
      </Modal>
    );
  }

  return (
    <Modal visible={visible && safeToShow} animationType="slide" presentationStyle="pageSheet" onRequestClose={handleClose}>
      <LinearGradient colors={["#000", "#181818"]} style={styles.gradient}>
        <SafeAreaView style={styles.container}>
          {/* Night Sky Animation */}
          <View style={styles.nightSkyContainer} pointerEvents="none">
            {/* Twinkling Stars */}
            {starAnimations.current.map((star, index) => (
              <Animated.View
                key={`star-${index}`}
                style={[
                  styles.star,
                  {
                    left: star.x,
                    top: star.y,
                    opacity: star.opacity,
                    transform: [
                      { scale: star.scale },
                      {
                        rotate: star.rotate.interpolate({
                          inputRange: [-1, 0, 1],
                          outputRange: ['-360deg', '0deg', '360deg'],
                        }),
                      },
                      { translateX: star.translateX },
                      { translateY: star.translateY },
                    ],
                  },
                ]}
              />
            ))}
            
          </View>

          {/* Fade Overlay when processing */}
          {processing && (
            <Animated.View 
              style={[
                styles.fadeOverlay,
                {
                  opacity: fadeAnim,
                }
              ]}
            />
          )}
          {/* Header with Close Button */}
          <View style={styles.header}>
            <TouchableOpacity 
              style={styles.closeButton} 
              onPress={handleClose}
            >
              <Ionicons name="close" size={24} color="#FFFFFF" />
            </TouchableOpacity>
            <Text style={styles.headerTitle}></Text>
            <View style={styles.placeholder} />
          </View>

          {/* Fixed Header */}
          <View style={styles.subscriptionHeader}>
            {/* Promotional Banner */}
            {isPromotional && (
              <View style={styles.promotionalBanner}>
                <View style={styles.ribbonBodyLong}>
                  <Text style={styles.promotionalBannerText}>PROMOTION!</Text>
                </View>
              </View>
            )}
            <View style={styles.logoContainer}>
              <Image source={InvertLantern} style={styles.lanternIcon} />
              <Text style={styles.appName}>Hudā Premium</Text>
              {featureContent.subtitle && (
                <Text style={styles.subtitleText}>{featureContent.subtitle}</Text>
              )}
            </View>
          </View>

          {/* Scrollable Content */}
          <ScrollView 
            ref={scrollViewRef}
            style={styles.scrollContent}
            contentContainerStyle={styles.scrollContentContainer}
            showsVerticalScrollIndicator={false}
          >
            {/* Feature List */}
            <View style={styles.featureListContainer}>
              {featureContent.features.map((feature, index) => (
                <View key={index} style={styles.featureRow}>
                  <Text style={styles.bullet}>•</Text>
                  <Text style={styles.featureText}>
                    {feature.text}
                  </Text>
                </View>
              ))}
            </View>
          </ScrollView>

          {/* Reviews Section */}
          <View style={styles.reviewsSection}>
            <Animated.View
              style={[
                styles.reviewsContainer,
                {
                  transform: [{
                    translateX: reviewsScrollAnim.interpolate({
                      inputRange: [-1, 0],
                      outputRange: [-1200, 0],
                    }),
                  }],
                },
              ]}
            >
              {[...reviews, ...reviews].map((review, index) => (
                <View key={index} style={styles.reviewCard}>
                  <View style={styles.reviewHeader}>
                    <Text style={styles.reviewName}>{review.name}</Text>
                    <View style={styles.starsContainer}>
                      {[1, 2, 3, 4, 5].map((star) => (
                        <Ionicons
                          key={star}
                          name={star <= Math.floor(review.rating) ? 'star' : star <= review.rating ? 'star-half' : 'star-outline'}
                          size={12}
                          color="#D4A574"
                        />
                      ))}
                    </View>
                  </View>
                  <Text style={styles.reviewText}>{review.text}</Text>
                </View>
              ))}
            </Animated.View>
          </View>

          {/* Fixed Footer */}
          <View style={styles.footer}>
            {/* Subscribe Button */}
            {processing ? (
              <View style={styles.processingContainer}>
                <View style={styles.processingRow}>
                  <Text style={[
                    styles.processingText,
                    getResponsiveTextStyle(t('processing', currentLanguage), 20, currentLanguage, 250)
                  ]}>
                    {t('processing', currentLanguage)}
                  </Text>
                  <View style={styles.dotsContainer}>
                    <Animated.Text 
                      style={[
                        styles.dot,
                        {
                          opacity: bounceAnim.interpolate({
                            inputRange: [0, 0.5, 1],
                            outputRange: [0.3, 1, 0.3]
                          })
                        }
                      ]}
                    >
                      .
                    </Animated.Text>
                    <Animated.Text 
                      style={[
                        styles.dot,
                        {
                          opacity: bounceAnim.interpolate({
                            inputRange: [0, 0.5, 1],
                            outputRange: [0.3, 1, 0.3]
                          })
                        }
                      ]}
                    >
                      .
                    </Animated.Text>
                    <Animated.Text 
                      style={[
                        styles.dot,
                        {
                          opacity: bounceAnim.interpolate({
                            inputRange: [0, 0.5, 1],
                            outputRange: [0.3, 1, 0.3]
                          })
                        }
                      ]}
                    >
                      .
                    </Animated.Text>
                  </View>
                </View>
              </View>
            ) : (
              <View style={styles.subscriptionButtonsContainer}>
                {/* Yearly Subscription Button */}
              <TouchableOpacity 
                style={[
                    styles.subscriptionButton,
                    styles.yearlyButton,
                    selectedSubscriptionType === 'yearly' && styles.selectedButton,
                    (loading || processing) && styles.disabledButton
                ]}
                  onPress={() => handleSubscribe('yearly')}
                  disabled={loading || processing}
                activeOpacity={0.7}
              >
                  {/* Savings Sling */}
                  <View style={styles.savingsSling}>
                    <View style={styles.ribbonFoldLeftSmall} />
                    <View style={styles.ribbonBodySmall}>
                      <Text style={styles.savingsSlingText}>
                        {isPromotional ? '58% OFF' : '58% OFF'}
                      </Text>
                    </View>
                    <View style={styles.ribbonFoldRightSmall} />
                  </View>
                  <View style={styles.buttonContent}>
                    <View style={styles.buttonTextContainer}>
                      <Text style={styles.subscriptionButtonTitle}>YEARLY ACCESS</Text>
                      {isPromotional ? (
                        <View>
                          <Text style={styles.subscriptionButtonPrice}>$4.17/month</Text>
                          <Text style={styles.promotionalNote}>First year only</Text>
                        </View>
                      ) : (
                        <Text style={styles.subscriptionButtonPrice}>$4.17/month</Text>
                      )}
                    </View>
                    <Text style={styles.yearlyPriceText}>
                      $49.99/year
                    </Text>
                  </View>
                </TouchableOpacity>

                {/* Monthly Subscription Button */}
                <TouchableOpacity 
                  style={[
                    styles.subscriptionButton,
                    styles.monthlyButton,
                    (loading || processing) && styles.disabledButton
                  ]}
                  onPress={() => handleSubscribe('monthly')}
                  disabled={loading || processing}
                  activeOpacity={0.7}
                >
                  {/* Savings Sling */}
                  {isPromotional && (
                    <View style={styles.savingsSling}>
                      <View style={styles.ribbonFoldLeftSmall} />
                      <View style={styles.ribbonBodySmall}>
                        <Text style={styles.savingsSlingText}>40% OFF</Text>
                      </View>
                      <View style={styles.ribbonFoldRightSmall} />
                    </View>
                  )}
                  <View style={styles.buttonContent}>
                    <View style={styles.buttonTextContainer}>
                      <Text style={styles.subscriptionButtonTitle}>MONTHLY ACCESS</Text>
                      {isPromotional ? (
                        <Text style={styles.promotionalNote}>First 6 months only</Text>
                      ) : null}
                    </View>
                    <Text style={styles.yearlyPriceText}>
                      {isPromotional ? '$5.99/month' : '$9.99/month'}
                  </Text>
                  </View>
              </TouchableOpacity>
              </View>
            )}
            
            {/* Redeem Code Button */}
            <TouchableOpacity 
              style={styles.redeemCodeButton}
              onPress={handleRedeemCode}
              activeOpacity={0.7}
            >
              <Text style={styles.redeemCodeButtonText}>
                Redeem Code
              </Text>
            </TouchableOpacity>
            
            {/* Platform-specific payment method text */}
            <Text style={styles.paymentMethodText}>
              {Platform.OS === 'android' 
                ? 'Pay with Google Play' 
                : 'Pay with App Store'}
            </Text>
            
            <Text style={[
              styles.trustedText,
              getResponsiveTextStyle(t('bySubscribingYouAgree', currentLanguage), 15, currentLanguage, width - 40)
            ]}>
              {t('bySubscribingYouAgree', currentLanguage)}
            </Text>
            <View style={styles.legalLinksContainer}>
              <View style={styles.legalLinksRow}>
                <TouchableOpacity onPress={openTermsOfService} style={styles.legalLinkContainer}>
                  <Text style={[
                    styles.legalLink,
                    getResponsiveTextStyle(t('termsOfService', currentLanguage), 12, currentLanguage, Math.max((width - 80) / 3, 80))
                  ]}>
                    {t('termsOfService', currentLanguage)}
                  </Text>
                </TouchableOpacity>
                <Text style={styles.legalText}> • </Text>
                <TouchableOpacity onPress={handleRestorePurchases} style={styles.legalLinkContainer}>
                  <Text style={[
                    styles.legalLink,
                    getResponsiveTextStyle(t('restorePurchases', currentLanguage), 12, currentLanguage, Math.max((width - 80) / 3, 80))
                  ]}>
                    {t('restorePurchases', currentLanguage)}
                  </Text>
                </TouchableOpacity>
                <Text style={styles.legalText}> • </Text>
                <TouchableOpacity onPress={openPrivacyPolicy} style={styles.legalLinkContainer}>
                  <Text style={[
                    styles.legalLink,
                    getResponsiveTextStyle(t('privacyPolicy', currentLanguage), 12, currentLanguage, Math.max((width - 80) / 3, 80))
                  ]}>
                    {t('privacyPolicy', currentLanguage)}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </SafeAreaView>
      </LinearGradient>
    </Modal>
  );
}

const styles = StyleSheet.create({
  gradient: {
    flex: 1,
  },
  container: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: getTabletPadding(16),
    paddingTop: getResponsiveSpacing(8),
    paddingBottom: getTabletPadding(16),
  },
  closeButton: {
    padding: getResponsiveSpacing(6),
  },
  headerTitle: {
    color: '#FFFFFF',
    fontSize: getResponsiveFontSize(16),
    fontWeight: '600',
  },
  placeholder: {
    width: getResponsiveContainerSize(32),
  },
  subscriptionHeader: {
    paddingTop: getResponsiveSpacing(8),
    paddingBottom: getResponsiveSpacing(8),
    alignItems: 'center',
    position: 'relative',
  },
  promotionalBanner: {
    position: 'absolute',
    top: -20,
    right: -120,
    flexDirection: 'row',
    alignItems: 'center',
    zIndex: 10,
    transform: [{ rotate: '25deg' }],
  },
  ribbonFoldLeft: {
    width: 0,
    height: 0,
    borderTopWidth: 0,
    borderBottomWidth: 24,
    borderLeftWidth: 15,
    borderRightWidth: 0,
    borderTopColor: 'transparent',
    borderBottomColor: '#C49A63',
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
    borderStyle: 'solid',
  },
  ribbonBody: {
    backgroundColor: '#D4A574',
    paddingHorizontal: 32,
    paddingVertical: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.35,
    shadowRadius: 5,
    elevation: 6,
  },
  ribbonBodyLong: {
    backgroundColor: '#D4A574',
    paddingHorizontal: 150,
    paddingVertical: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.35,
    shadowRadius: 5,
    elevation: 6,
    justifyContent: 'center',
    alignItems: 'center',
  },
  ribbonFoldRight: {
    width: 0,
    height: 0,
    borderTopWidth: 0,
    borderBottomWidth: 24,
    borderLeftWidth: 0,
    borderRightWidth: 15,
    borderTopColor: 'transparent',
    borderBottomColor: '#C49A63',
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
    borderStyle: 'solid',
  },
  promotionalBannerText: {
    color: '#000',
    fontSize: getResponsiveFontSize(16),
    fontWeight: '900',
    letterSpacing: 1.5,
    textTransform: 'uppercase',
    textAlign: 'center',
  },
  savingsSling: {
    position: 'absolute',
    top: 0,
    right: -25,
    flexDirection: 'row',
    alignItems: 'center',
    zIndex: 10,
    transform: [{ rotate: '30deg' }],
  },
  ribbonFoldLeftSmall: {
    width: 0,
    height: 0,
    borderTopWidth: 0,
    borderBottomWidth: 18,
    borderLeftWidth: 10,
    borderRightWidth: 0,
    borderTopColor: 'transparent',
    borderBottomColor: '#C49A63',
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
    borderStyle: 'solid',
  },
  ribbonBodySmall: {
    backgroundColor: '#D4A574',
    paddingHorizontal: 12,
    paddingVertical: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.35,
    shadowRadius: 4,
    elevation: 5,
  },
  ribbonFoldRightSmall: {
    width: 0,
    height: 0,
    borderTopWidth: 0,
    borderBottomWidth: 18,
    borderLeftWidth: 0,
    borderRightWidth: 10,
    borderTopColor: 'transparent',
    borderBottomColor: '#C49A63',
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
    borderStyle: 'solid',
  },
  savingsSlingText: {
    color: '#000',
    fontSize: getResponsiveFontSize(10),
    fontWeight: '900',
    letterSpacing: 0.8,
  },
  welcomeText: {
    color: '#A3B1CC',
    fontSize: getResponsiveFontSize(18),
    textAlign: 'center',
    marginBottom: getResponsiveSpacing(6),
    fontWeight: '400',
    letterSpacing: 0.1,
  },
  logoContainer: {
    alignItems: 'center',
    marginTop: getResponsiveSpacing(8),
  },
  appName: {
    fontSize: getResponsiveFontSize(32),
    fontWeight: 'bold',
    color: '#fff',
    textAlign: 'center',
    marginBottom: getResponsiveSpacing(4),
    letterSpacing: 0.5,
  },
  subtitleText: {
    color: '#A3B1CC',
    fontSize: getResponsiveFontSize(16),
    textAlign: 'center',
    marginTop: getResponsiveSpacing(4),
    fontWeight: '400',
    fontStyle: 'italic',
    paddingHorizontal: getTabletPadding(20),
  },
  subtitle: {
    color: '#A3B1CC',
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 12,
    fontWeight: '600',
    letterSpacing: 0.1,
    fontStyle: 'italic',
  },
  scrollContent: {
    flex: 1,
  },
  scrollContentContainer: {
    paddingHorizontal: getTabletPadding(20),
    paddingBottom: getTabletPadding(20),
  },
  sectionTitle: {
    color: '#A3B1CC',
    fontSize: getResponsiveFontSize(18),
    fontWeight: '400',
    textAlign: 'center',
    marginTop: getResponsiveSpacing(8),
    marginBottom: getResponsiveSpacing(24),
    letterSpacing: 0.1,
  },
  featureRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: getResponsiveSpacing(12),
    paddingVertical: getResponsiveSpacing(4),
  },
  bullet: {
    color: '#D4A574',
    fontSize: getResponsiveFontSize(16),
    marginRight: getResponsiveSpacing(10),
    marginTop: getResponsiveSpacing(2),
    fontWeight: 'bold',
  },
  featureText: {
    color: '#fff',
    fontSize: getResponsiveFontSize(14),
    fontWeight: '300',
    flex: 1,
    lineHeight: getResponsiveFontSize(20),
    letterSpacing: 0.2,
    fontFamily: Platform.OS === 'ios' ? 'System' : 'sans-serif-light',
  },
  footer: {
    paddingHorizontal: getTabletPadding(20),
    paddingBottom: getTabletPadding(20),
  },
  subscriptionButtonsContainer: {
    width: '100%',
    alignItems: 'center',
    marginTop: 12,
    marginBottom: 8,
  },
  subscriptionButton: {
    width: '90%',
    maxWidth: 320,
    height: 90,
    backgroundColor: '#2A2A2A',
    borderRadius: 14,
    borderWidth: 2,
    borderColor: '#3A3A3A',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
    paddingHorizontal: 20,
    overflow: 'visible',
    position: 'relative',
  },
  selectedButton: {
    borderColor: '#A3B1CC',
    backgroundColor: '#2A2A3A',
  },
  yearlyButton: {
    position: 'relative',
  },
  monthlyButton: {
    height: getResponsiveContainerSize(70),
  },
  buttonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
  },
  buttonTextContainer: {
    flex: 1,
    alignItems: 'flex-start',
  },
  subscriptionButtonTitle: {
    color: '#fff',
    fontSize: Platform.OS === 'ios' ? getResponsiveFontSize(14) : getResponsiveFontSize(18),
    fontWeight: '600',
    marginBottom: getResponsiveSpacing(4),
  },
  subscriptionButtonPrice: {
    color: '#FFFFFF',
    fontSize: getResponsiveFontSize(16),
    fontWeight: '400',
  },
  yearlyPriceText: {
    color: '#FFFFFF',
    fontSize: getResponsiveFontSize(14),
    fontWeight: '400',
    marginLeft: getResponsiveSpacing(12),
  },
  promotionalNote: {
    color: '#D4A574',
    fontSize: getResponsiveFontSize(12),
    fontWeight: '500',
    marginTop: getResponsiveSpacing(2),
  },
  savingsBadge: {
    backgroundColor: '#D4A574',
    paddingHorizontal: getResponsiveSpacing(12),
    paddingVertical: getResponsiveSpacing(6),
    borderRadius: getResponsiveBorderRadius(12),
    marginLeft: getResponsiveSpacing(12),
  },
  savingsBadgeText: {
    color: '#000',
    fontSize: getResponsiveFontSize(12),
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  savingsBadge: {
    backgroundColor: '#D4A574',
    paddingHorizontal: getResponsiveSpacing(12),
    paddingVertical: getResponsiveSpacing(6),
    borderRadius: getResponsiveBorderRadius(12),
    marginLeft: getResponsiveSpacing(12),
  },
  savingsBadgeText: {
    color: '#000',
    fontSize: getResponsiveFontSize(12),
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  subscribeButton: {
    width: '90%',
    maxWidth: getResponsiveContainerSize(320),
    height: getResponsiveContainerSize(60),
    backgroundColor: 'transparent',
    borderRadius: getResponsiveBorderRadius(14),
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: getResponsiveSpacing(8),
    marginBottom: getResponsiveSpacing(8),
    alignSelf: 'center',
  },
  disabledButton: {
    backgroundColor: '#666',
    opacity: 0.6,
  },
  subscribeButtonText: {
    color: '#fff',
    fontSize: getResponsiveFontSize(24),
    fontWeight: '600',
    letterSpacing: 0.3,
    textAlign: 'center',
    fontStyle: 'italic',
    fontFamily: 'System',
    textShadowColor: '#fff',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 8,
  },
  restoreButton: {
    alignSelf: 'center',
    marginTop: getResponsiveSpacing(8),
    marginBottom: getResponsiveSpacing(8),
    paddingVertical: getResponsiveSpacing(8),
    paddingHorizontal: getTabletPadding(16),
  },
  restoreButtonText: {
    color: '#A3B1CC',
    fontSize: getResponsiveFontSize(14),
    fontWeight: '500',
    textAlign: 'center',
    textDecorationLine: 'underline',
  },
  processingContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    height: getResponsiveContainerSize(60),
  },
  processingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  processingText: {
    color: '#fff',
    fontSize: getResponsiveFontSize(20),
    fontWeight: '600',
    letterSpacing: 0.3,
    textAlign: 'center',
    fontStyle: 'italic',
    fontFamily: 'System',
    textShadowColor: '#fff',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 8,
  },
  dotsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: 3,
    marginTop: -9,
  },
  dot: {
    color: '#fff',
    fontSize: 28,
    fontWeight: 'bold',
    marginHorizontal: 2,
    textShadowColor: '#fff',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 4,
  },
  trustedText: {
    color: '#b0b0b0',
    fontSize: 15,
    textAlign: 'center',
    marginTop: 8,
    fontWeight: '500',
  },
  lanternIcon: {
    width: getResponsiveContainerSize(90),
    height: getResponsiveContainerSize(90),
    resizeMode: 'contain',
    marginBottom: getResponsiveSpacing(10),
  },
  featureListContainer: {
    width: '100%',
    paddingHorizontal: getTabletPadding(20),
    paddingVertical: getResponsiveSpacing(8),
    marginTop: getResponsiveSpacing(4),
    marginBottom: getResponsiveSpacing(8),
  },
  reviewsSection: {
    width: '100%',
    height: getResponsiveContainerSize(100),
    marginTop: getResponsiveSpacing(8),
    marginBottom: getResponsiveSpacing(4),
    overflow: 'hidden',
  },
  reviewsContainer: {
    flexDirection: 'row',
    paddingHorizontal: getTabletPadding(20),
  },
  reviewCard: {
    width: width - getTabletPadding(40),
    backgroundColor: 'rgba(42, 42, 42, 0.6)',
    borderRadius: getResponsiveBorderRadius(12),
    padding: getTabletPadding(12),
    marginRight: getResponsiveSpacing(16),
    borderWidth: 1,
    borderColor: 'rgba(212, 165, 116, 0.2)',
  },
  reviewHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: getResponsiveSpacing(6),
  },
  reviewName: {
    color: '#D4A574',
    fontSize: getResponsiveFontSize(13),
    fontWeight: '600',
  },
  starsContainer: {
    flexDirection: 'row',
  },
  reviewText: {
    color: '#fff',
    fontSize: getResponsiveFontSize(12),
    lineHeight: getResponsiveFontSize(16),
    fontWeight: '300',
  },
  carouselContainer: {
    width: '100%',
    marginTop: 8,
    marginBottom: 20,
  },
  carouselContent: {
    paddingLeft: 0,
  },
  carouselSlide: {
    width: width - 40,
    paddingHorizontal: 20,
    justifyContent: 'center',
  },
  paginationContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 16,
    gap: 8,
  },
  paginationDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#3A3A3A',
  },
  paginationDotActive: {
    backgroundColor: '#A3B1CC',
    width: 24,
  },
  legalLinksContainer: {
    marginTop: 16,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 20,
    width: '100%',
  },
  legalLinksRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    flexWrap: 'wrap',
    maxWidth: '100%',
    width: '100%',
  },
  legalLinkContainer: {
    flex: 1,
    minWidth: 0,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 2,
  },
  legalText: {
    color: '#888',
    fontSize: getResponsiveFontSize(12),
    textAlign: 'center',
    lineHeight: getResponsiveFontSize(16),
    paddingHorizontal: getResponsiveSpacing(4),
    flexShrink: 0,
    paddingVertical: getResponsiveSpacing(2),
  },
  legalLink: {
    color: '#A3B1CC',
    textDecorationLine: 'underline',
    fontWeight: '500',
    textAlign: 'center',
    flexShrink: 1,
    lineHeight: getResponsiveFontSize(16),
    paddingVertical: getResponsiveSpacing(2),
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: getTabletPadding(20),
  },
  loadingText: {
    color: '#fff',
    fontSize: 18,
    textAlign: 'center',
    marginTop: 20,
    fontWeight: '500',
  },
  buttonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  description: {
    color: '#A3B1CC',
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 24,
    fontWeight: '400',
    lineHeight: 22,
  },
  fadeOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: '#000',
    zIndex: 1000,
    pointerEvents: 'none',
  },
  nightSkyContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 0,
  },
  star: {
    position: 'absolute',
    width: 3,
    height: 3,
    borderRadius: 1.5,
    backgroundColor: '#fff',
    shadowColor: '#fff',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 1,
    shadowRadius: 6,
  },
  redeemCodeButton: {
    alignSelf: 'center',
    paddingVertical: 8,
    paddingHorizontal: 8,
    marginTop: 12,
    marginBottom: 4,
  },
  redeemCodeButtonText: {
    color: '#D4A574',
    fontSize: 12,
    fontWeight: '500',
    textAlign: 'center',
  },
  paymentMethodText: {
    color: '#A3B1CC',
    fontSize: getResponsiveFontSize(12),
    fontWeight: '500',
    textAlign: 'center',
    marginTop: getResponsiveSpacing(8),
    marginBottom: getResponsiveSpacing(4),
    opacity: 0.8,
  },
}); 