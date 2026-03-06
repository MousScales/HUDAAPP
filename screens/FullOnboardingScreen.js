import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  SafeAreaView,
  StatusBar,
  KeyboardAvoidingView,
  Platform,
  Image,
  ScrollView,
  Animated,
  Dimensions,
  Alert,
  Modal
} from 'react-native';
import { Ionicons, MaterialCommunityIcons, FontAwesome5 } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { auth, firestore } from '../firebase';
import { createUserWithEmailAndPassword } from 'firebase/auth';
import { doc, setDoc, serverTimestamp } from 'firebase/firestore';
import * as Location from 'expo-location';
import * as Notifications from 'expo-notifications';
import { getResponsiveIconSize, isTablet, getTabletPadding, getTabletSpacing } from '../utils/responsiveSizing';
import { useLanguage } from '../utils/useLanguage';
import { t } from '../utils/translations';

const { width, height } = Dimensions.get('window');

export default function FullOnboardingScreen({ route, navigation, onComplete }) {
  console.log('🎯 FullOnboardingScreen mounted with params:', route.params);
  const { email, password, appleUser, appleName, selectedLanguage } = route.params || {};
  const isAndroidEmailUser = Platform.OS === 'android' && !appleUser;
  const { currentLanguage, changeLanguage } = useLanguage();
  const [currentStep, setCurrentStep] = useState(0);
  
  // Use selectedLanguage from params, fallback to currentLanguage
  const userLanguage = selectedLanguage || currentLanguage;
  
  // State to force re-render when language changes
  const [languageKey, setLanguageKey] = useState(0);

  // Helper function to get language-specific styles
  const getLanguageSpecificStyles = () => {
    const baseStyles = {
      stepTitleSize: 28,
      stepSubtitleSize: 16,
      optionTitleSize: 18,
      optionDescriptionSize: 14,
    };

    // Adjust font sizes for languages that typically have longer text
    if (currentLanguage === 'spanish' || currentLanguage === 'french') {
      return {
        ...baseStyles,
        stepTitleSize: 26,
        stepSubtitleSize: 15,
        optionTitleSize: 17,
        optionDescriptionSize: 13,
      };
    } else if (currentLanguage === 'italian') {
      return {
        ...baseStyles,
        stepTitleSize: 27,
        stepSubtitleSize: 15,
        optionTitleSize: 17,
        optionDescriptionSize: 13,
      };
    }

    return baseStyles;
  };

  const languageStyles = getLanguageSpecificStyles();
  const [userData, setUserData] = useState({
    firstName: appleName && appleName.trim() !== '' ? appleName : '',
    language: selectedLanguage || currentLanguage, // Use selectedLanguage from params, fallback to currentLanguage
    madhab: '',
    email: email || '',
    password: password || ''
  });
  
  // Debug the userData initialization
  console.log('🎯 Initial userData firstName:', userData.firstName);
  console.log('🎯 Apple name received in params:', appleName);
  const [loading, setLoading] = useState(false);
  const [madhabModalVisible, setMadhabModalVisible] = useState(false);
  const [accountCreated, setAccountCreated] = useState(false);
  const [locationPermission, setLocationPermission] = useState(null);
  const [notificationPermission, setNotificationPermission] = useState(null);
  const slideAnim = useRef(new Animated.Value(0)).current;
  const fadeAnim = useRef(new Animated.Value(1)).current;
  const scaleAnim = useRef(new Animated.Value(1)).current;

  // Debug useEffect to track component mounting
  useEffect(() => {
    console.log('🎯 FullOnboardingScreen useEffect - Component mounted');
    console.log('🎯 Route params:', route.params);
    console.log('🎯 Apple user:', appleUser);
    console.log('🎯 Email:', email);
    console.log('🎯 Apple name received:', appleName);
    console.log('🎯 User data firstName:', userData.firstName);
    
    // Update userData if we have an appleName and it's not already set
    if (appleName && appleName.trim() !== '' && (!userData.firstName || userData.firstName.trim() === '')) {
      console.log('🎯 Setting firstName from appleName:', appleName);
      setUserData(prev => ({
        ...prev,
        firstName: appleName
      }));
    }
  }, [appleName, userData.firstName]);

  // Regenerate steps when language changes
  useEffect(() => {
    // This will trigger a re-render of the component with new steps
    console.log('🔄 Language changed, regenerating steps for:', currentLanguage);
    console.log('🔄 User language:', userLanguage);
    console.log('🔄 Language key:', languageKey);
  }, [currentLanguage, userLanguage, languageKey]);

  // Debug currentLanguage changes
  useEffect(() => {
    console.log('🌐 Current language updated to:', currentLanguage);
  }, [currentLanguage]);

  // Handle language change in the language step
  const handleLanguageChange = async (newLanguage) => {
    try {
      console.log('🔄 Changing language to:', newLanguage);
      await changeLanguage(newLanguage);
      setUserData(prev => ({
        ...prev,
        language: newLanguage
      }));
      // Force re-render by updating language key
      setLanguageKey(prev => prev + 1);
      console.log('✅ Language changed successfully');
    } catch (error) {
      console.error('❌ Error changing language:', error);
    }
  };

  const getSteps = (language) => [
    {
      id: 'firstName',
      title: t('whatShouldWeCallYou', language),
      subtitle: appleUser && appleName && appleName.trim() !== '' 
        ? t('weHavePreFilledYourNameFromAppleSignIn', language) 
        : isAndroidEmailUser 
          ? t('pleaseEnterYourNameToPersonalizeYourExperience', language) || 'Please enter your name so we can personalize your experience'
          : t('yourFirstNameHelpsUsPersonalizeYourExperience', language),
      type: 'input',
      field: 'firstName',
      placeholder: t('enterYourFirstName', language),
      icon: 'person',
      required: true
    },
    {
      id: 'madhab',
      title: t('whichMadhabDoYouFollow', language),
      subtitle: t('thisHelpsUsProvideAccuratePrayerGuidance', language),
      type: 'selection',
      field: 'madhab',
      options: [
        { id: 'hanafi', name: t('hanafi', language), icon: '🕌', description: t('mostCommonInSouthAsiaAndTurkey', language) },
        { id: 'shafi', name: t('shafi', language), icon: '🕌', description: t('commonInSoutheastAsiaAndEastAfrica', language) },
        { id: 'maliki', name: t('maliki', language), icon: '🕌', description: t('commonInNorthAndWestAfrica', language) },
        { id: 'hanbali', name: t('hanbali', language), icon: '🕌', description: t('commonInSaudiArabiaAndQatar', language) },
        { id: 'none', name: t('noMadhab', language), icon: '👥', description: t('iDoNotFollowASpecificMadhab', language) },
        { id: 'learn', name: t('learnAboutMadhabs', language), icon: '📚', description: t('notSureLearnAboutTheDifferences', language) }
      ]
    },
    {
      id: 'completion',
      title: t('youreAllSet', language),
      subtitle: t('welcomeToTheHudaFamily', language),
      type: 'completion'
    }
  ];

  // Get current steps based on user language (with key for re-rendering)
  const steps = getSteps(currentLanguage);

  // Check current permissions
  useEffect(() => {
    checkPermissions();
    setupNotifications();
  }, []);
  
  const setupNotifications = async () => {
    try {
      // Set notification handler
      Notifications.setNotificationHandler({
        handleNotification: async () => ({
          shouldShowAlert: true,
          shouldPlaySound: true,
          shouldSetBadge: false,
        }),
      });
    } catch (error) {
      console.log('Error setting up notifications:', error);
    }
  };

  const checkPermissions = async () => {
    try {
      const locationStatus = await Location.getForegroundPermissionsAsync();
      setLocationPermission(locationStatus.status);
      
      const notificationStatus = await Notifications.getPermissionsAsync();
      setNotificationPermission(notificationStatus.status);
    } catch (error) {
      console.log('Error checking permissions:', error);
    }
  };
  
  const requestLocationPermission = async () => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      setLocationPermission(status);
      if (status === 'granted') {
        setTimeout(() => nextStep(), 1000);
      }
    } catch (error) {
      console.log('Error requesting location permission:', error);
    }
  };
  
  const requestNotificationPermission = async () => {
    try {
      const { status } = await Notifications.requestPermissionsAsync({
        ios: {
          allowAlert: true,
          allowBadge: true,
          allowSound: true,
          allowAnnouncements: true,
        },
      });
      setNotificationPermission(status);
      if (status === 'granted') {
        setTimeout(() => nextStep(), 1000);
      }
    } catch (error) {
      console.log('Error requesting notification permission:', error);
    }
  };

  useEffect(() => {
    animateStep();
  }, [currentStep]);

  const animateStep = () => {
    // Fade out current content
    Animated.sequence([
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 0,
          duration: 200,
          useNativeDriver: true,
        }),
        Animated.timing(scaleAnim, {
          toValue: 0.95,
          duration: 200,
          useNativeDriver: true,
        })
      ]),
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
        Animated.timing(scaleAnim, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        })
      ])
    ]).start();
  };

  const nextStep = async () => {
    if (currentStep < steps.length - 1) {
      // If we're moving from completion step to permissions step, create the account
      if (steps[currentStep].type === 'completion') {
        await handleComplete();
      } else {
        setCurrentStep(currentStep + 1);
      }
    }
  };

  const prevStep = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleOptionSelect = (field, value) => {
    if (field === 'language') {
      // Handle language change specially to update the app language immediately
      handleLanguageChange(value);
    } else {
      setUserData(prev => ({ ...prev, [field]: value }));
    }
  };

  const handleInputChange = (field, value) => {
    setUserData(prev => ({ ...prev, [field]: value }));
  };

  const handleComplete = async () => {
    console.log('🎯 handleComplete called with userData:', userData);
    console.log('🎯 userData.firstName:', userData.firstName);
    console.log('🎯 userData.madhab:', userData.madhab);
    
    // Validate required fields with specific messages
    if (!userData.firstName || userData.firstName.trim() === '') {
      console.log('🎯 Missing firstName, showing alert');
      Alert.alert(
        t('nameRequired', currentLanguage) || 'Name Required',
        t('pleaseEnterYourName', currentLanguage) || 'Please enter your name to continue.'
      );
      // Navigate back to firstName step
      const firstNameStepIndex = steps.findIndex(s => s.id === 'firstName');
      if (firstNameStepIndex !== -1) {
        setCurrentStep(firstNameStepIndex);
      }
      return;
    }
    
    if (!userData.madhab) {
      console.log('🎯 Missing madhab, showing alert');
      Alert.alert(
        t('madhabRequired', currentLanguage) || 'Madhab Required',
        t('pleaseSelectYourMadhab', currentLanguage) || 'Please select your madhab to continue.'
      );
      // Navigate back to madhab step
      const madhabStepIndex = steps.findIndex(s => s.id === 'madhab');
      if (madhabStepIndex !== -1) {
        setCurrentStep(madhabStepIndex);
      }
      return;
    }

    setLoading(true);
    try {
      let email = userData.email;
      let password = userData.password;
      let user = null;
      
      // Check if user is already authenticated (existing user)
      if (auth.currentUser) {
        // User is already logged in (existing user completing/updating onboarding)
        console.log('✅ User already authenticated, updating profile');
        user = auth.currentUser;
      } else if (route.params?.appleUser) {
        // If already signed in with Apple, just update profile, don't create account
        user = auth.currentUser;
        if (!user) {
          throw new Error('No authenticated user found. Please try signing in again.');
        }
      } else {
        // New user - create account
        console.log('📝 Creating new user account');
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        user = userCredential.user;
      }

      // Save user profile to Firestore
      // Only save firstName and madhab, plus essential fields
      // Check if user already exists to preserve createdAt
      const { getDoc } = await import('firebase/firestore');
      const existingUserDoc = await getDoc(doc(firestore, 'users', user.uid));
      const isExistingUser = existingUserDoc.exists();
      
      const profileData = {
        firstName: userData.firstName || userData.name || '',
        name: userData.firstName || userData.name || '',
        displayName: userData.firstName || userData.name || '',
        madhab: userData.madhab || '',
        language: userData.language || currentLanguage,
        email: user.email || userData.email || '',
        lastLogin: serverTimestamp(),
        onboardingCompleted: true,
        // Only set createdAt for new users
        ...(isExistingUser ? {} : { createdAt: serverTimestamp() })
      };
      
      console.log('🎯 Saving profile to Firebase:', profileData);
      console.log('🎯 Profile firstName:', profileData.firstName);
      console.log('🎯 Profile name field:', profileData.name);
      console.log('🎯 Profile displayName:', profileData.displayName);
      console.log('🎯 All profile keys:', Object.keys(profileData));
      console.log('🎯 Original userData:', userData);
      console.log('🎯 User UID:', user.uid);
      
      // Save to Firestore with error handling
      try {
        await setDoc(doc(firestore, 'users', user.uid), profileData, { merge: true });
        console.log('✅ Profile successfully saved to Firebase Firestore');
        
        // Verify the save by reading it back
        const { getDoc: getDocVerify } = await import('firebase/firestore');
        const savedDoc = await getDocVerify(doc(firestore, 'users', user.uid));
        if (savedDoc.exists()) {
          console.log('✅ Verified: Profile exists in Firebase:', savedDoc.data());
        } else {
          console.error('❌ Warning: Profile was not found in Firebase after save');
        }
      } catch (firestoreError) {
        console.error('❌ Error saving to Firestore:', firestoreError);
        console.error('❌ Firestore error code:', firestoreError.code);
        console.error('❌ Firestore error message:', firestoreError.message);
        // Re-throw to be caught by outer catch block
        throw new Error(`Failed to save profile to Firebase: ${firestoreError.message}`);
      }
      
      // Save to AsyncStorage
      const asyncStorageProfile = {
        uid: user.uid,
        email: user.email,
        ...userData,
        // Ensure name is saved in multiple fields for compatibility
        firstName: userData.firstName || userData.name || '',
        name: userData.firstName || userData.name || '',
        displayName: userData.firstName || userData.name || ''
      };
      
      console.log('🎯 Saving to AsyncStorage:', asyncStorageProfile);
      await AsyncStorage.setItem('userProfile', JSON.stringify(asyncStorageProfile));

      // Save language preference separately for easy access
      await AsyncStorage.setItem('userLanguage', userData.language);

      setLoading(false);
      setAccountCreated(true);
      // Small delay to ensure Firebase auth state is properly updated
      setTimeout(() => {
        // Continue to permissions step
        setCurrentStep(currentStep + 1);
      }, 500);
    } catch (error) {
      setLoading(false);
      console.error('❌ Error in handleComplete:', error);
      console.error('❌ Error code:', error.code);
      console.error('❌ Error message:', error.message);
      console.error('❌ Full error:', JSON.stringify(error, null, 2));
      
      let errorMessage = 'An error occurred while creating your account.';
      if (error.code === 'auth/email-already-in-use') {
        errorMessage = 'An account with this email already exists. Please try logging in instead.';
      } else if (error.code === 'auth/invalid-email') {
        errorMessage = 'Please enter a valid email address.';
      } else if (error.code === 'auth/weak-password') {
        errorMessage = 'Password should be at least 6 characters long.';
      } else if (error.code === 'auth/network-request-failed') {
        errorMessage = 'Network error. Please check your internet connection and try again.';
      } else if (error.code === 'permission-denied' || error.message?.includes('Firebase') || error.message?.includes('Firestore')) {
        errorMessage = 'Failed to save your profile. Please check your internet connection and try again.';
        console.error('❌ Firestore permission or save error detected');
      } else if (error.message) {
        errorMessage = error.message;
      }
              Alert.alert(t('accountCreationError', currentLanguage), errorMessage);
    }
  };

  const handleFinalComplete = () => {
    // Verify user is still logged in before completing
    const currentUser = auth.currentUser;
    if (currentUser) {
      console.log('✅ User is logged in when clicking Get Started:', currentUser.uid);
      console.log('✅ User email:', currentUser.email);
    } else {
      console.log('❌ User is not logged in when clicking Get Started');
              Alert.alert(t('authenticationError', currentLanguage), t('tryAgainOrRestart', currentLanguage));
      return;
    }
    // Complete onboarding and call onComplete callback
    onComplete();
  };

  const renderWelcomeStep = () => (
    <View style={styles.stepContainer}>
      <View style={styles.iconContainer}>
        <Image source={require('../assets/invert.png')} style={styles.welcomeLogo} />
      </View>
      <Text style={[styles.stepTitle, { fontSize: languageStyles.stepTitleSize }]}>{steps[currentStep].title}</Text>
      <Text style={[styles.stepSubtitle, { fontSize: languageStyles.stepSubtitleSize }]}>{steps[currentStep].subtitle}</Text>
      <View style={styles.welcomeFeatures}>
        <View style={styles.featureItem}>
          <Ionicons name="time" size={24} color="#FFFFFF" />
          <Text style={styles.featureText}>Prayer Times</Text>
        </View>
        <View style={styles.featureItem}>
          <Ionicons name="book" size={24} color="#FFFFFF" />
          <Text style={styles.featureText}>Islamic Lessons</Text>
        </View>
        <View style={styles.featureItem}>
          <Ionicons name="heart" size={24} color="#FFFFFF" />
          <Text style={styles.featureText}>Dhikr & Duas</Text>
        </View>
        <View style={styles.featureItem}>
          <Ionicons name="compass" size={24} color="#FFFFFF" />
          <Text style={styles.featureText}>Qibla Direction</Text>
        </View>
      </View>
    </View>
  );

  const renderInputStep = () => {
    const step = steps[currentStep];
    console.log('🎯 Rendering input step for field:', step.field);
    console.log('🎯 Current userData:', userData);
    console.log('🎯 Value for field:', userData[step.field]);
    
    return (
      <View style={styles.stepContainer}>
        <View style={styles.iconContainer}>
                          <Ionicons name={step.icon} size={getResponsiveIconSize(48)} color="#fff" />
        </View>
        <Text style={[styles.stepTitle, { fontSize: languageStyles.stepTitleSize }]}>{step.title}</Text>
        <Text style={[styles.stepSubtitle, { fontSize: languageStyles.stepSubtitleSize }]}>{step.subtitle}</Text>
        <View style={styles.inputContainer}>
          <TextInput
            style={styles.textInput}
            placeholder={step.placeholder}
            placeholderTextColor="#b0b0b0"
            value={userData[step.field]}
            onChangeText={(text) => handleInputChange(step.field, text)}
            autoFocus
            autoCapitalize="words"
          />
        </View>
      </View>
    );
  };

  const renderSelectionStep = () => {
    const step = steps[currentStep];
    return (
      <View style={styles.stepContainer}>
        <View style={styles.iconContainer}>
                          <Ionicons name="checkmark-circle" size={getResponsiveIconSize(48)} color="#fff" />
        </View>
        <Text style={[styles.stepTitle, { fontSize: languageStyles.stepTitleSize }]}>{step.title}</Text>
        <Text style={[styles.stepSubtitle, { fontSize: languageStyles.stepSubtitleSize }]}>{step.subtitle}</Text>
        <ScrollView style={styles.optionsContainer} showsVerticalScrollIndicator={false}>
          {step.options.map((option) => (
            option.id === 'learn' ? (
              <TouchableOpacity
                key={option.id}
                style={styles.learnButton}
                onPress={() => setMadhabModalVisible(true)}
              >
                <View style={styles.optionHeader}>
                  <Text style={styles.optionIcon}>{option.icon}</Text>
                  <View style={styles.optionTextContainer}>
                    <Text style={styles.optionTitle}>
                      {option.name}
                    </Text>
                    <Text style={styles.optionDescription}>
                      {option.description}
                    </Text>
                  </View>
                </View>
                <Ionicons name="chevron-forward" size={24} color="#b0b0b0" />
              </TouchableOpacity>
            ) : (
              <TouchableOpacity
                key={option.id}
                style={[
                  styles.optionCard,
                  userData[step.field] === option.id && styles.selectedOption
                ]}
                onPress={() => handleOptionSelect(step.field, option.id)}
              >
                <View style={styles.optionHeader}>
                  <Text style={styles.optionIcon}>{option.icon}</Text>
                  <View style={styles.optionTextContainer}>
                    <Text style={[
                      styles.optionTitle,
                      userData[step.field] === option.id && styles.selectedOptionText
                    ]}>
                      {option.name}
                    </Text>
                    <Text style={[
                      styles.optionDescription,
                      userData[step.field] === option.id && styles.selectedOptionDescription
                    ]}>
                      {option.description}
                    </Text>
                  </View>
                </View>
                {userData[step.field] === option.id && (
                  <Ionicons name="checkmark-circle" size={24} color="#FFFFFF" />
                )}
              </TouchableOpacity>
            )
          ))}
        </ScrollView>
        {/* Madhab Modal */}
        <Modal
          visible={madhabModalVisible}
          transparent={true}
          animationType="slide"
          onRequestClose={() => setMadhabModalVisible(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <ScrollView showsVerticalScrollIndicator={false}>
                <Text style={styles.modalTitle}>Understanding Madhabs</Text>
                <Text style={styles.modalSubtitle}>Islamic Schools of Thought</Text>
                
                <View style={styles.madhabSection}>
                  <Text style={styles.madhabName}>Hanafi Madhab</Text>
                  <Text style={styles.madhabDesc}>Founded by Imam Abu Hanifa (699-767 CE)</Text>
                  <Text style={styles.madhabText}>
                    • Most common in South Asia, Turkey, and Central Asia{'\n'}
                    • Prayer times: Asr prayer is delayed until the shadow of an object is twice its height{'\n'}
                    • Fajr: When the first light appears on the horizon{'\n'}
                    • Maghrib: When the sun completely disappears below the horizon
                  </Text>
                </View>
                
                <View style={styles.madhabDivider} />
                
                <View style={styles.madhabSection}>
                  <Text style={styles.madhabName}>Shafi'i Madhab</Text>
                  <Text style={styles.madhabDesc}>Founded by Imam Al-Shafi'i (767-820 CE)</Text>
                  <Text style={styles.madhabText}>
                    • Common in Southeast Asia, East Africa, and parts of the Middle East{'\n'}
                    • Prayer times: Asr prayer is prayed when the shadow of an object equals its height{'\n'}
                    • Fajr: When the first light appears on the horizon{'\n'}
                    • Maghrib: When the sun completely disappears below the horizon
                  </Text>
                </View>
                
                <View style={styles.madhabDivider} />
                
                <View style={styles.madhabSection}>
                  <Text style={styles.madhabName}>Maliki Madhab</Text>
                  <Text style={styles.madhabDesc}>Founded by Imam Malik (711-795 CE)</Text>
                  <Text style={styles.madhabText}>
                    • Common in North and West Africa{'\n'}
                    • Prayer times: Asr prayer is prayed when the shadow of an object equals its height{'\n'}
                    • Fajr: When the first light appears on the horizon{'\n'}
                    • Maghrib: When the sun completely disappears below the horizon
                  </Text>
                </View>
                
                <View style={styles.madhabDivider} />
                
                <View style={styles.madhabSection}>
                  <Text style={styles.madhabName}>Hanbali Madhab</Text>
                  <Text style={styles.madhabDesc}>Founded by Imam Ahmad ibn Hanbal (780-855 CE)</Text>
                  <Text style={styles.madhabText}>
                    • Common in Saudi Arabia, Qatar, and parts of the Middle East{'\n'}
                    • Prayer times: Asr prayer is prayed when the shadow of an object equals its height{'\n'}
                    • Fajr: When the first light appears on the horizon{'\n'}
                    • Maghrib: When the sun completely disappears below the horizon
                  </Text>
                </View>
                
                <View style={styles.madhabDivider} />
                
                <Text style={styles.madhabNote}>
                  The main differences between madhabs are their rulings and how they interpret the Quran and Hadith, we ask for your madhab preference to help properly calculate prayer times.
                </Text>
              </ScrollView>
              <TouchableOpacity
                style={styles.modalClose}
                onPress={() => setMadhabModalVisible(false)}
              >
                <Text style={styles.modalCloseText}>Got it!</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>
      </View>
    );
  };

  const renderCompletionStep = () => (
    <View style={styles.stepContainer}>
      <View style={styles.iconContainer}>
                        <Ionicons name="checkmark-circle" size={getResponsiveIconSize(48)} color="#FFFFFF" />
      </View>
      <Text style={styles.completionTitle}>{steps[currentStep].title}</Text>
      <Text style={styles.completionSubtitle}>{steps[currentStep].subtitle}</Text>
      <ScrollView style={styles.completionSummary} showsVerticalScrollIndicator={false}>
        <Text style={styles.completionSummaryTitle}>Your Profile:</Text>
        <View style={styles.summaryItem}>
          <Text style={styles.summaryLabel}>Name:</Text>
          <Text style={styles.summaryValue}>{userData.firstName}</Text>
        </View>
        <View style={styles.summaryItem}>
          <Text style={styles.summaryLabel}>Language:</Text>
          <Text style={styles.summaryValue}>
            {userData.language === 'english' ? 'English' :
             userData.language === 'french' ? 'French' :
             userData.language === 'italian' ? 'Italian' :
             userData.language === 'spanish' ? 'Spanish' : userData.language}
          </Text>
        </View>
        <View style={styles.summaryItem}>
          <Text style={styles.summaryLabel}>Madhab:</Text>
          <Text style={styles.summaryValue}>
            {userData.madhab === 'none' ? 'General' : userData.madhab.charAt(0).toUpperCase() + userData.madhab.slice(1)}
          </Text>
        </View>
      </ScrollView>
      {/* Quran verse and explanation */}
      <View style={styles.quranVerseBox}>
        <Text style={styles.quranVerseArabic}>
          إِلَّا مَن تَابَ وَآمَنَ وَعَمِلَ عَمَلًا صَالِحًا فَأُولَٰئِكَ يُبَدِّلُ اللَّهُ سَيِّئَاتِهِمْ حَسَنَاتٍ
        </Text>
        <Text style={styles.quranVerseTrans}>
          "Except for those who repent, believe and do righteous work. For them Allah will replace their evil deeds with good."
        </Text>
        <Text style={styles.quranVerseRef}>Quran 25:70</Text>
        <Text style={styles.quranVerseExplanation}>
          This verse is a beautiful reminder that no matter your past, Allah's mercy is vast. Every new step you take—whether you're a new Muslim or returning—can be a fresh start. Welcome to a journey of hope, forgiveness, and growth!
        </Text>
      </View>
    </View>
  );

  const renderPermissionsStep = () => {
    return (
      <View style={styles.stepContainer}>
        <View style={styles.iconContainer}>
          <Ionicons name="settings-outline" size={getResponsiveIconSize(48)} color="#FFFFFF" />
        </View>
        <Text style={styles.stepTitle}>{steps[currentStep].title}</Text>
        <Text style={styles.stepSubtitle}>{steps[currentStep].subtitle}</Text>
        
        <View style={styles.permissionsContainer}>
          {/* Location Permission */}
          <View style={styles.permissionCard}>
            <View style={styles.permissionHeader}>
              <Ionicons name="location" size={24} color="#FFFFFF" />
              <Text style={styles.permissionTitle}>Location Services</Text>
            </View>
            <Text style={styles.permissionText}>
              To provide accurate prayer times for your area, we need access to your location. Prayer times vary by location and are essential for the app to function properly.
            </Text>
            
            {locationPermission === 'granted' ? (
              <View style={styles.permissionGranted}>
                <Ionicons name="checkmark-circle" size={20} color="#4CAF50" />
                <Text style={styles.permissionGrantedText}>Granted</Text>
              </View>
            ) : (
              <TouchableOpacity
                style={styles.permissionButton}
                onPress={requestLocationPermission}
              >
                <Ionicons name="location" size={20} color="#181818" />
                <Text style={styles.permissionButtonText}>Continue</Text>
              </TouchableOpacity>
            )}
          </View>

          {/* Notification Permission */}
          <View style={styles.permissionCard}>
            <View style={styles.permissionHeader}>
              <Ionicons name="notifications" size={24} color="#FFFFFF" />
              <Text style={styles.permissionTitle}>Notifications</Text>
            </View>
            <Text style={styles.permissionText}>
              Get timely prayer reminders, Islamic content, and important notifications to help you stay connected to your faith.
            </Text>
            
            {notificationPermission === 'granted' ? (
              <View style={styles.permissionGranted}>
                <Ionicons name="checkmark-circle" size={20} color="#4CAF50" />
                <Text style={styles.permissionGrantedText}>Granted</Text>
              </View>
            ) : (
              <TouchableOpacity
                style={styles.permissionButton}
                onPress={requestNotificationPermission}
              >
                <Ionicons name="notifications" size={20} color="#181818" />
                <Text style={styles.permissionButtonText}>Continue</Text>
              </TouchableOpacity>
            )}
          </View>
          
          {/* Permission Status Message */}
          {(!locationPermission || locationPermission !== 'granted' || !notificationPermission || notificationPermission !== 'granted') && (
            <View style={styles.permissionStatusContainer}>
              <Ionicons name="information-circle" size={20} color="#FFA500" />
              <Text style={styles.permissionStatusText}>
                Location access is needed to provide accurate prayer times for your area. Please continue with the permission request above.
              </Text>
            </View>
          )}
        </View>
      </View>
    );
  };
  
  const renderFinalStep = () => (
    <View style={styles.stepContainer}>
      <View style={styles.iconContainer}>
        <Ionicons name="checkmark-circle" size={64} color="#4CAF50" />
      </View>
      <Text style={styles.stepTitle}>{steps[currentStep].title}</Text>
      <Text style={styles.stepSubtitle}>{steps[currentStep].subtitle}</Text>
      
      <View style={styles.finalCard}>
        <Text style={styles.finalText}>
          Your account has been created successfully! You can always change your permissions later in settings.
        </Text>
        
        <View style={styles.permissionSummary}>
          <View style={styles.permissionItem}>
            <Ionicons name="location" size={20} color={locationPermission === 'granted' ? "#4CAF50" : "#b0b0b0"} />
            <Text style={styles.permissionItemText}>Location Services</Text>
          </View>
          <View style={styles.permissionItem}>
            <Ionicons name="notifications" size={20} color={notificationPermission === 'granted' ? "#4CAF50" : "#b0b0b0"} />
            <Text style={styles.permissionItemText}>Notifications</Text>
          </View>
        </View>
      </View>
    </View>
  );

  const renderStepContent = () => {
    const step = steps[currentStep];
    
    switch (step.type) {
      case 'welcome':
        return renderWelcomeStep();
      case 'input':
        return renderInputStep();
      case 'selection':
        return renderSelectionStep();
      case 'completion':
        return renderCompletionStep();
      case 'permissions':
        return renderPermissionsStep();
      case 'final':
        return renderFinalStep();
      default:
        return null;
    }
  };

  const canProceed = () => {
    const step = steps[currentStep];
    if (step.type === 'input') {
      // For firstName field, require at least 2 characters
      if (step.field === 'firstName') {
        return userData[step.field] && userData[step.field].trim().length >= 2;
      }
      return userData[step.field] && userData[step.field].trim().length > 0;
    }
    if (step.type === 'selection') {
      return userData[step.field];
    }
    if (step.type === 'permissions') {
      // Require both location and notification permissions to be granted
      return locationPermission === 'granted' && notificationPermission === 'granted';
    }
    return true;
  };



  const openPrivacy = () => {
            Alert.alert(t('privacyPolicy', currentLanguage), t('featureNotImplemented', currentLanguage));
  };

  const handleRestore = () => {
            Alert.alert(t('restorePurchases', currentLanguage), t('featureNotImplemented', currentLanguage));
  };

  const openTerms = () => {
            Alert.alert(t('termsOfService', currentLanguage), t('featureNotImplemented', currentLanguage));
  };

  return (
    <LinearGradient colors={["#181818", "#232323"]} style={styles.gradient}>
      <SafeAreaView style={styles.container}>
        <StatusBar barStyle="light-content" backgroundColor="#121212" />
        <KeyboardAvoidingView
          style={{ flex: 1 }}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          <ScrollView 
            contentContainerStyle={{ flexGrow: 1 }}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
            contentInsetAdjustmentBehavior="automatic"
          >
            {/* Progress Bar */}
            <View style={styles.progressContainer}>
              <View style={styles.progressBar}>
                <View 
                  style={[
                    styles.progressFill, 
                    { width: `${((currentStep + 1) / steps.length) * 100}%` }
                  ]} 
                />
              </View>
              <Text style={styles.progressText}>
                {currentStep + 1} of {steps.length}
              </Text>
            </View>

            {/* Step Content */}
            <Animated.View 
              style={[
                styles.contentContainer,
                {
                  opacity: fadeAnim,
                  transform: [{ scale: scaleAnim }]
                }
              ]}
            >
              {renderStepContent()}
            </Animated.View>

            {/* Navigation Buttons */}
            {/* {step.type !== 'subscription' && ( */}
              <View style={styles.navigationContainer}>
                {currentStep >= 0 && (
                  <TouchableOpacity
                    style={styles.navButton}
                    onPress={currentStep === 0 ? () => {
                      // Try to go back, if it fails, reset to login
                      try {
                        if (navigation.canGoBack()) {
                          navigation.goBack();
                        } else {
                          // If no screen to go back to, reset the navigation stack
                          navigation.reset({
                            index: 0,
                            routes: [{ name: 'Login' }],
                          });
                        }
                      } catch (error) {
                        console.log('Navigation error:', error);
                        // Fallback: reset to login
                        navigation.reset({
                          index: 0,
                          routes: [{ name: 'Login' }],
                        });
                      }
                    } : prevStep}
                    disabled={loading}
                  >
                    <Ionicons name="chevron-back" size={24} color="#b0b0b0" />
                    <Text style={styles.navButtonText}>{currentStep === 0 ? 'Back to Login' : 'Back'}</Text>
                  </TouchableOpacity>
                )}

                {currentStep < steps.length - 1 && steps[currentStep].type !== 'permissions' ? (
                  <TouchableOpacity
                    style={[
                      styles.navButton,
                      styles.nextButton,
                      !canProceed() && styles.disabledButton
                    ]}
                    onPress={nextStep}
                    disabled={!canProceed() || loading}
                  >
                    <Text style={styles.navButtonText}>Next</Text>
                    <Ionicons name="chevron-forward" size={24} color="#fff" />
                  </TouchableOpacity>
                ) : currentStep === steps.length - 1 ? (
                  <TouchableOpacity
                    style={[
                      styles.navButton,
                      styles.completeButton
                    ]}
                    onPress={handleFinalComplete}
                  >
                    <Text style={styles.navButtonText}>Get Started</Text>
                    <Ionicons name="checkmark" size={24} color="#fff" />
                  </TouchableOpacity>
                ) : (
                  <TouchableOpacity
                    style={[
                      styles.navButton,
                      styles.nextButton,
                      !canProceed() && styles.disabledButton
                    ]}
                    onPress={nextStep}
                    disabled={!canProceed() || loading}
                  >
                    <Text style={styles.navButtonText}>Continue</Text>
                    <Ionicons name="chevron-forward" size={24} color="#fff" />
                  </TouchableOpacity>
                )}
              </View>
            {/* )} */}
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  gradient: {
    flex: 1,
  },
  container: {
    flex: 1,
    backgroundColor: '#121212',
  },
  progressContainer: {
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 10,
  },
  progressBar: {
    height: 4,
    backgroundColor: '#333',
    borderRadius: 2,
    marginBottom: 8,
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#FFFFFF',
    borderRadius: 2,
  },
  progressText: {
    color: '#b0b0b0',
    fontSize: 14,
    textAlign: 'center',
  },
  contentContainer: {
    flex: 1,
    paddingHorizontal: 20,
    paddingVertical: 20,
    justifyContent: 'flex-start',
  },
  stepContainer: {
    alignItems: 'center',
    paddingVertical: 20,
    minHeight: 400,
    justifyContent: 'flex-start',
  },
  iconContainer: {
    width: Math.min(80, width * 0.2),
    height: Math.min(80, width * 0.2),
    borderRadius: Math.min(40, width * 0.1),
    backgroundColor: 'rgba(255,255,255,0.1)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  welcomeLogo: {
    width: 60,
    height: 60,
  },
  stepTitle: {
    fontSize: Math.min(28, width * 0.07),
    fontWeight: 'bold',
    color: '#fff',
    textAlign: 'center',
    marginBottom: 12,
  },
  stepSubtitle: {
    fontSize: Math.min(16, width * 0.04),
    color: '#b0b0b0',
    textAlign: 'center',
    marginBottom: 32,
    lineHeight: 24,
  },
  welcomeFeatures: {
    width: '100%',
    maxWidth: 300,
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.05)',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
  },
  featureText: {
    color: '#fff',
    fontSize: 16,
    marginLeft: 12,
    fontWeight: '500',
  },
  inputContainer: {
    width: '100%',
    maxWidth: 300,
  },
  textInput: {
    backgroundColor: '#232323',
    borderRadius: 12,
    padding: 16,
    fontSize: 18,
    color: '#fff',
    textAlign: 'center',
    borderWidth: 1,
    borderColor: '#333',
  },
  optionsContainer: {
    width: '100%',
    maxWidth: 350,
    maxHeight: 300,
    flex: 1,
  },
  optionCard: {
    backgroundColor: '#232323',
    borderRadius: 16,
    padding: 20,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#333',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  selectedOption: {
    backgroundColor: '#FFFFFF',
    borderColor: '#FFFFFF',
  },
  optionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  optionIcon: {
    fontSize: 32,
    marginRight: 16,
  },
  optionTextContainer: {
    flex: 1,
  },
  optionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 4,
  },
  optionDescription: {
    fontSize: 14,
    color: '#b0b0b0',
    lineHeight: 20,
  },
  selectedOptionText: {
    color: '#181818',
  },
  selectedOptionDescription: {
    color: 'rgba(24,24,24,0.8)',
  },
  completionSummary: {
    width: '100%',
    maxWidth: 300,
    backgroundColor: '#232323',
    borderRadius: 16,
    padding: 16,
    marginTop: 12,
    marginBottom: 16,
    maxHeight: 250,
  },
  completionSummaryTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#fff',
    textAlign: 'center',
    marginBottom: 10,
  },
  summaryItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 4,
    borderBottomWidth: 1,
    borderBottomColor: '#333',
  },
  summaryLabel: {
    fontSize: 14,
    color: '#b0b0b0',
  },
  summaryValue: {
    fontSize: 14,
    color: '#fff',
    fontWeight: '500',
  },
  navigationContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 20,
    marginTop: 'auto',
  },
  navButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.1)',
  },
  nextButton: {
    backgroundColor: '#FFFFFF',
  },
  completeButton: {
    backgroundColor: '#FFFFFF',
  },
  disabledButton: {
    backgroundColor: '#333',
    opacity: 0.5,
  },
  navButtonText: {
    color: '#181818',
    fontSize: 16,
    fontWeight: 'bold',
    marginHorizontal: 8,
  },
  quranVerseBox: {
    backgroundColor: '#232323',
    borderRadius: 14,
    padding: 14,
    marginTop: 16,
    marginBottom: 8,
    alignItems: 'center',
  },
  quranVerseArabic: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 6,
    fontFamily: Platform.OS === 'ios' ? 'Geeza Pro' : 'sans-serif',
  },
  quranVerseTrans: {
    color: '#b0b0b0',
    fontSize: 14,
    fontStyle: 'italic',
    textAlign: 'center',
    marginBottom: 3,
  },
  quranVerseRef: {
    color: '#b0b0b0',
    fontSize: 12,
    textAlign: 'center',
    marginBottom: 6,
  },
  quranVerseExplanation: {
    color: '#fff',
    fontSize: 13,
    textAlign: 'center',
    marginTop: 6,
  },
  completionTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
    textAlign: 'center',
    marginBottom: 8,
  },
  completionSubtitle: {
    fontSize: 14,
    color: '#b0b0b0',
    textAlign: 'center',
    marginBottom: 20,
    lineHeight: 20,
  },
  learnButton: {
    backgroundColor: '#232323',
    borderRadius: 16,
    padding: 20,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#333',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  modalOverlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.7)',
  },
  modalContent: {
    backgroundColor: '#181818',
    borderRadius: 20,
    padding: 24,
    width: '90%',
    maxWidth: 400,
    maxHeight: '80%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 5,
  },
  modalTitle: {
    color: '#fff',
    fontSize: 24,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 8,
  },
  modalSubtitle: {
    color: '#b0b0b0',
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 24,
  },
  madhabSection: {
    marginBottom: 20,
  },
  madhabName: {
    color: '#fff',
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  madhabDesc: {
    color: '#b0b0b0',
    fontSize: 14,
    fontStyle: 'italic',
    marginBottom: 12,
  },
  madhabText: {
    color: '#fff',
    fontSize: 15,
    lineHeight: 22,
  },
  madhabDivider: {
    height: 1,
    backgroundColor: '#333',
    marginVertical: 20,
  },
  madhabNote: {
    color: '#fff',
    fontSize: 16,
    textAlign: 'center',
    marginTop: 20,
    fontStyle: 'italic',
    lineHeight: 24,
  },
  modalClose: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 20,
  },
  modalCloseText: {
    color: '#181818',
    fontSize: 16,
    fontWeight: 'bold',
  },
  permissionsContainer: {
    width: '100%',
    maxWidth: 350,
  },
  permissionCard: {
    backgroundColor: '#232323',
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    width: '100%',
    borderWidth: 1,
    borderColor: '#333',
  },
  permissionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  permissionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
    marginLeft: 12,
  },
  permissionText: {
    color: '#fff',
    fontSize: 14,
    textAlign: 'left',
    marginBottom: 16,
    lineHeight: 20,
  },
  permissionGranted: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  permissionGrantedText: {
    color: '#4CAF50',
    fontSize: 14,
    fontWeight: 'bold',
    marginLeft: 8,
  },
  permissionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 16,
    alignSelf: 'flex-start',
  },
  permissionButtonText: {
    color: '#181818',
    fontSize: 14,
    fontWeight: 'bold',
    marginLeft: 8,
  },

  finalCard: {
    backgroundColor: '#232323',
    borderRadius: 16,
    padding: 20,
    marginTop: 20,
    width: '100%',
    maxWidth: 350,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#333',
  },
  finalText: {
    color: '#fff',
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 20,
    lineHeight: 22,
  },
  permissionSummary: {
    width: '100%',
    maxWidth: 300,
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginTop: 15,
  },
  permissionItem: {
    alignItems: 'center',
  },
  permissionItemText: {
    color: '#b0b0b0',
    fontSize: 12,
    marginTop: 5,
  },
  legalLink: {
    color: '#b0b0b0',
    fontSize: 13,
    textDecorationLine: 'underline',
    marginHorizontal: 8,
  },
  hadithText: {
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 10,
  },
  bodyText: {
    fontSize: 16,
    color: '#fff',
    textAlign: 'left',
    marginBottom: 24,
  },
  permissionStatusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 165, 0, 0.1)',
    borderRadius: 12,
    padding: 16,
    marginTop: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 165, 0, 0.3)',
  },
  permissionStatusText: {
    color: '#FFA500',
    fontSize: 14,
    marginLeft: 8,
    flex: 1,
    lineHeight: 20,
  },
}); 