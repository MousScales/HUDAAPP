import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
  ScrollView,
  Image,
  Platform,
  Dimensions,
  Modal,
  TextInput,
  Alert,
  Animated,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useLanguage } from '../utils/useLanguage';
import { t } from '../utils/translations';
import { auth, firestore } from '../firebase';
import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  OAuthProvider,
  signInWithCredential,
  sendPasswordResetEmail,
} from 'firebase/auth';
import { doc, getDoc, setDoc, updateDoc, serverTimestamp } from 'firebase/firestore';
import * as AppleAuthentication from 'expo-apple-authentication';
import AsyncStorage from '@react-native-async-storage/async-storage';
import userStateService from '../services/userStateService';

const { width, height } = Dimensions.get('window');

const FEATURES = [
  { emoji: '🕑', key: 'accuratePrayerTimesWithNotifications' },
  { emoji: '🧭', key: 'qiblaDirectionFinder' },
  { emoji: '📖', key: 'quranReadingWithAudio' },
  { emoji: '📚', key: 'islamicLessonsAndHadith' },
  { emoji: '🕌', key: 'guidedPrayerInstructions' },
  { emoji: '📍', key: 'nearbyMosqueFinder' },
  { emoji: '📿', key: 'digitalTasbihCounter' },
  { emoji: '📒', key: 'trackYourDeenPrayerFastingAndMore' },
  { emoji: '🎧', key: 'saveAndTrackQuranProgressWithAudio' },
  { emoji: '📱', key: 'islamicWidgets' },
];

const LANGUAGES = [
  { code: 'english', name: 'English', flag: '🇺🇸' },
  { code: 'spanish', name: 'Español', flag: '🇪🇸' },
  { code: 'french', name: 'Français', flag: '🇫🇷' },
  { code: 'italian', name: 'Italiano', flag: '🇮🇹' },
];

const HERO_HEIGHT = height * 0.42;

export default function LoginPreviewScreen({ navigation, onComplete }) {
  const { currentLanguage, changeLanguage } = useLanguage();
  const [showLangDropdown, setShowLangDropdown] = useState(false);
  const [showSignInModal, setShowSignInModal] = useState(false);
  const [loading, setLoading] = useState(false);

  // Pulse animation
  const pulseAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1.04, duration: 700, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 1, duration: 700, useNativeDriver: true }),
      ])
    ).start();
  }, []);

  // Email sign-in state (Android)
  const [signInEmail, setSignInEmail] = useState('');
  const [signInPassword, setSignInPassword] = useState('');
  const [signInConfirmPassword, setSignInConfirmPassword] = useState('');
  const [signInStep, setSignInStep] = useState('email');
  const [signInError, setSignInError] = useState('');
  const [signInLoading, setSignInLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const resetSignInForm = () => {
    setSignInEmail('');
    setSignInPassword('');
    setSignInConfirmPassword('');
    setSignInStep('email');
    setSignInError('');
    setShowPassword(false);
    setShowConfirmPassword(false);
  };

  const finishSignIn = () => {
    if (onComplete) {
      onComplete();
      return;
    }
    if (navigation.canGoBack()) {
      navigation.goBack();
      return;
    }
    navigation.navigate('SettingsScreen');
  };

  const handleLanguageChange = async (code) => {
    try {
      await changeLanguage(code);
      setShowLangDropdown(false);
    } catch (e) {
      console.error('Language change error:', e);
    }
  };

  // Apple Sign-In
  const handleAppleSignIn = async () => {
    setLoading(true);
    try {
      const isAvailable = await AppleAuthentication.isAvailableAsync();
      if (!isAvailable) throw new Error('Apple Sign In not available on this device');

      const credential = await AppleAuthentication.signInAsync({
        requestedScopes: [
          AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
          AppleAuthentication.AppleAuthenticationScope.EMAIL,
        ],
      });

      const { identityToken, fullName } = credential;
      const provider = new OAuthProvider('apple.com');
      const firebaseCredential = provider.credential({ idToken: identityToken });
      const userCredential = await signInWithCredential(auth, firebaseCredential);
      const user = userCredential.user;

      const userDoc = await getDoc(doc(firestore, 'users', user.uid));
      const userProfile = userDoc.exists() ? userDoc.data() : {};

      const extractedName =
        fullName?.givenName?.trim() ||
        fullName?.familyName?.trim() ||
        userProfile.firstName ||
        userProfile.name ||
        '';

      if (userDoc.exists()) {
        if (userProfile.onboardingCompleted !== true) {
          await updateDoc(doc(firestore, 'users', user.uid), {
            onboardingCompleted: true,
            lastLogin: serverTimestamp(),
          });
        } else {
          await updateDoc(doc(firestore, 'users', user.uid), { lastLogin: serverTimestamp() });
        }
        await userStateService.saveUserState(
          { uid: user.uid, email: user.email, firstName: extractedName, name: extractedName, ...userProfile, onboardingCompleted: true },
          true,
          currentLanguage
        );
        setLoading(false);
        setShowSignInModal(false);
        setTimeout(() => finishSignIn(), 100);
      } else {
        setLoading(false);
        setShowSignInModal(false);
        setTimeout(() => {
          navigation.replace('FullOnboardingScreen', {
            email: user.email,
            password: '',
            appleUser: true,
            appleName: extractedName,
            selectedLanguage: currentLanguage,
          });
        }, 100);
      }
    } catch (error) {
      setLoading(false);
      if (error.code !== 'ERR_CANCELED') {
        Alert.alert('Sign In Error', 'There was an issue signing in with Apple. Please try again.');
      }
    }
  };

  // Email/Password Sign-In (Android)
  const handleEmailSignIn = async () => {
    if (signInStep === 'email') {
      if (!signInEmail || !signInEmail.includes('@')) {
        setSignInError('Please enter a valid email address');
        return;
      }
      setSignInError('');
      setSignInStep('password');
      return;
    }

    if (signInStep === 'password') {
      if (!signInPassword || signInPassword.length < 6) {
        setSignInError('Password must be at least 6 characters');
        return;
      }
      setSignInLoading(true);
      setSignInError('');
      try {
        const userCredential = await signInWithEmailAndPassword(auth, signInEmail, signInPassword);
        const user = userCredential.user;
        const userDoc = await getDoc(doc(firestore, 'users', user.uid));
        const userProfile = userDoc.exists() ? userDoc.data() : {};

        if (userDoc.exists() && userProfile.onboardingCompleted) {
          await AsyncStorage.setItem('userProfile', JSON.stringify({ uid: user.uid, email: user.email, ...userProfile }));
          await updateDoc(doc(firestore, 'users', user.uid), { lastLogin: serverTimestamp() });
          await userStateService.saveUserState({ uid: user.uid, email: user.email, ...userProfile }, true, userProfile.language || 'english');
          await AsyncStorage.setItem('userLoggedIn', 'true');
          await AsyncStorage.setItem('hasCompletedOnboarding', 'true');
          setSignInLoading(false);
          setShowSignInModal(false);
          resetSignInForm();
          setTimeout(() => finishSignIn(), 100);
        } else {
          const autoFirstName = userProfile.firstName || userProfile.name || user.email?.split('@')[0] || 'User';
          const updatedProfile = {
            firstName: autoFirstName, name: autoFirstName, displayName: autoFirstName,
            madhab: userProfile.madhab || 'hanafi', language: userProfile.language || 'english',
            email: user.email, lastLogin: serverTimestamp(), onboardingCompleted: true,
            ...(userProfile.createdAt ? {} : { createdAt: serverTimestamp() }),
          };
          await setDoc(doc(firestore, 'users', user.uid), updatedProfile, { merge: true });
          await AsyncStorage.setItem('userProfile', JSON.stringify({ uid: user.uid, email: user.email, ...updatedProfile }));
          await userStateService.saveUserState({ uid: user.uid, email: user.email, ...updatedProfile }, true, updatedProfile.language);
          await AsyncStorage.setItem('userLoggedIn', 'true');
          await AsyncStorage.setItem('hasCompletedOnboarding', 'true');
          setSignInLoading(false);
          setShowSignInModal(false);
          resetSignInForm();
          setTimeout(() => finishSignIn(), 100);
        }
      } catch (signInError) {
        if (
          signInError.code === 'auth/user-not-found' ||
          signInError.code === 'auth/invalid-credential' ||
          signInError.code === 'auth/wrong-password'
        ) {
          setSignInLoading(false);
          setSignInStep('confirmPassword');
        } else {
          setSignInLoading(false);
          setSignInError(signInError.message || 'There was an issue. Please try again.');
        }
      }
      return;
    }

    if (signInStep === 'confirmPassword') {
      if (!signInConfirmPassword) { setSignInError('Please confirm your password'); return; }
      if (signInPassword !== signInConfirmPassword) { setSignInError('Passwords do not match.'); return; }
      setSignInLoading(true);
      setSignInError('');
      try {
        const userCredential = await createUserWithEmailAndPassword(auth, signInEmail, signInPassword);
        const user = userCredential.user;
        setSignInLoading(false);
        setShowSignInModal(false);
        resetSignInForm();
        navigation.navigate('FullOnboardingScreen', { email: user.email, password: signInPassword, appleUser: false });
      } catch (error) {
        setSignInLoading(false);
        if (error.code === 'auth/email-already-in-use') {
          setSignInError('An account with this email already exists. Please sign in instead.');
          setSignInStep('password');
        } else {
          setSignInError(error.message || 'There was an issue. Please try again.');
        }
      }
    }
  };

  const handleForgotPassword = async () => {
    if (!signInEmail || !signInEmail.includes('@')) {
      Alert.alert('Email Required', 'Please go back and enter your email address first.');
      setSignInStep('email');
      return;
    }
    try {
      setSignInLoading(true);
      await sendPasswordResetEmail(auth, signInEmail);
      setSignInLoading(false);
      Alert.alert('Email Sent', `A password reset link has been sent to ${signInEmail}. Check your inbox and spam folder.`);
    } catch (error) {
      setSignInLoading(false);
      setSignInError('Could not send reset email. Please try again.');
    }
  };

  const handleBackStep = () => {
    if (signInStep === 'confirmPassword') { setSignInStep('password'); setSignInConfirmPassword(''); setSignInError(''); }
    else if (signInStep === 'password') { setSignInStep('email'); setSignInPassword(''); setSignInError(''); }
  };

  const currentLang = LANGUAGES.find((l) => l.code === currentLanguage) || LANGUAGES[0];

  return (
    <View style={styles.screen}>
      {/* Hero Image */}
      <View style={styles.heroContainer} pointerEvents="none">
        <Image source={require('../assets/sub.png')} style={styles.heroImage} resizeMode="cover" />
        <LinearGradient
          colors={['rgba(0,0,0,0.15)', 'rgba(0,0,0,0.55)', '#000']}
          locations={[0, 0.65, 1]}
          style={StyleSheet.absoluteFill}
        />
      </View>

      <SafeAreaView style={styles.safeArea}>
        {/* Top row: back arrow + language picker + app icon */}
        <View style={styles.topRow}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
            <Ionicons name="arrow-back" size={22} color="#fff" />
          </TouchableOpacity>

          {/* Language picker */}
          <View style={styles.langPickerWrapper}>
            <TouchableOpacity
              style={styles.langButton}
              onPress={() => setShowLangDropdown(!showLangDropdown)}
              activeOpacity={0.8}
            >
              <Text style={styles.langFlag}>{currentLang.flag}</Text>
              <Text style={styles.langName}>{currentLang.name}</Text>
              <Ionicons name="chevron-down" size={14} color="#fff" style={{ marginLeft: 4 }} />
            </TouchableOpacity>
            {showLangDropdown && (
              <View style={styles.langDropdown}>
                {LANGUAGES.map((lang) => (
                  <TouchableOpacity
                    key={lang.code}
                    style={[styles.langOption, currentLanguage === lang.code && styles.langOptionActive]}
                    onPress={() => handleLanguageChange(lang.code)}
                  >
                    <Text style={styles.langFlag}>{lang.flag}</Text>
                    <Text style={[styles.langOptionText, currentLanguage === lang.code && styles.langOptionTextActive]}>
                      {lang.name}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}
          </View>

          {/* App icon top right */}
          <Image source={require('../assets/invert.png')} style={styles.appIcon} />
        </View>

        {/* Title overlaid on hero */}
        <View style={styles.heroTitle} pointerEvents="none">
          <Text style={styles.hudaText}>Hudā</Text>
          <Text style={styles.tagline}>{t('theAppForMuslims', currentLanguage)}</Text>
        </View>

        {/* Scrollable feature list */}
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          <Text style={styles.sectionLabel}>{t('everythingYouNeedToStayOnDeen', currentLanguage)}</Text>

          <View style={styles.featureGrid}>
            {FEATURES.map((f) => (
              <View key={f.key} style={styles.featureCard}>
                <Text style={styles.featureEmoji}>{f.emoji}</Text>
                <Text style={styles.featureCardText}>{t(f.key, currentLanguage)}</Text>
              </View>
            ))}
          </View>

        </ScrollView>

        {/* Bottom CTA */}
        <View style={styles.footer}>
          <TouchableOpacity
            style={styles.ctaButton}
            onPress={() => setShowSignInModal(true)}
            disabled={loading}
            activeOpacity={0.7}
          >
            <Animated.Text
              style={[
                styles.ctaText,
                {
                  transform: [{ scale: pulseAnim }],
                  textShadowColor: '#fff',
                  textShadowOffset: { width: 0, height: 0 },
                  textShadowRadius: 10,
                },
              ]}
            >
              {t('joinTheUmmah', currentLanguage)}
            </Animated.Text>
          </TouchableOpacity>
          <Text style={styles.trustedText}>
            {t('trustedByThousandsOfMuslimsWorldwide', currentLanguage)}
          </Text>
        </View>
      </SafeAreaView>

      {/* Sign-In Modal */}
      <Modal
        visible={showSignInModal}
        animationType="slide"
        transparent
        onRequestClose={() => { setShowSignInModal(false); resetSignInForm(); }}
      >
        <View style={styles.modalOverlay}>
          <LinearGradient colors={['#1a1a1a', '#2a2a2a', '#1a1a1a']} style={styles.modalSheet}>
            <View style={styles.sheetHandle} />


            <Text style={styles.modalTitle}>{t('joinTheUmmah', currentLanguage)}</Text>
            <Text style={styles.modalSubtitle}>
              {Platform.OS === 'ios'
                ? t('signInWithAppleToContinueYourJourney', currentLanguage)
                : 'Sign in to continue your journey'}
            </Text>

            <ScrollView
              style={styles.modalScroll}
              contentContainerStyle={styles.modalScrollContent}
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
            >
              {/* Apple Sign-In (iOS) */}
              {Platform.OS === 'ios' && (
                <View style={styles.appleContainer}>
                  <AppleAuthentication.AppleAuthenticationButton
                    buttonType={AppleAuthentication.AppleAuthenticationButtonType.SIGN_IN}
                    buttonStyle={AppleAuthentication.AppleAuthenticationButtonStyle.BLACK}
                    cornerRadius={16}
                    style={{ width: 280, height: 52 }}
                    onPress={handleAppleSignIn}
                  />
                </View>
              )}

              {/* Email/Password (Android) */}
              {Platform.OS === 'android' && (
                <View style={styles.emailContainer}>
                  {signInStep === 'email' ? (
                    <>
                      <TextInput
                        style={styles.input}
                        placeholder="Email"
                        placeholderTextColor="#888"
                        value={signInEmail}
                        onChangeText={(v) => { setSignInEmail(v); setSignInError(''); }}
                        keyboardType="email-address"
                        autoCapitalize="none"
                        autoCorrect={false}
                        editable={!signInLoading}
                      />
                      {!!signInError && <Text style={styles.errorText}>{signInError}</Text>}
                      <TouchableOpacity
                        style={[styles.continueBtn, (!signInEmail || signInLoading) && styles.btnDisabled]}
                        onPress={handleEmailSignIn}
                        disabled={!signInEmail || signInLoading}
                      >
                        <Text style={styles.continueBtnText}>Continue</Text>
                      </TouchableOpacity>
                    </>
                  ) : signInStep === 'password' ? (
                    <>
                      <TouchableOpacity style={styles.stepBack} onPress={handleBackStep} disabled={signInLoading}>
                        <Ionicons name="arrow-back" size={18} color="#fff" />
                        <Text style={styles.stepBackText} numberOfLines={1}>{signInEmail}</Text>
                      </TouchableOpacity>
                      <View style={styles.pwdRow}>
                        <TextInput
                          style={styles.input}
                          placeholder="Password"
                          placeholderTextColor="#888"
                          value={signInPassword}
                          onChangeText={(v) => { setSignInPassword(v); setSignInError(''); }}
                          secureTextEntry={!showPassword}
                          autoCapitalize="none"
                          autoCorrect={false}
                          editable={!signInLoading}
                          onSubmitEditing={handleEmailSignIn}
                        />
                        <TouchableOpacity style={styles.eyeBtn} onPress={() => setShowPassword(!showPassword)}>
                          <Ionicons name={showPassword ? 'eye-off' : 'eye'} size={20} color="#888" />
                        </TouchableOpacity>
                      </View>
                      {!!signInError && <Text style={styles.errorText}>{signInError}</Text>}
                      <TouchableOpacity style={styles.forgotBtn} onPress={handleForgotPassword} disabled={signInLoading}>
                        <Text style={styles.forgotText}>Forgot Password?</Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={[styles.continueBtn, (!signInPassword || signInLoading) && styles.btnDisabled]}
                        onPress={handleEmailSignIn}
                        disabled={!signInPassword || signInLoading}
                      >
                        <Text style={styles.continueBtnText}>{signInLoading ? 'Signing in...' : 'Continue'}</Text>
                      </TouchableOpacity>
                    </>
                  ) : (
                    <>
                      <TouchableOpacity style={styles.stepBack} onPress={handleBackStep} disabled={signInLoading}>
                        <Ionicons name="arrow-back" size={18} color="#fff" />
                        <Text style={styles.stepBackText} numberOfLines={1}>{signInEmail}</Text>
                      </TouchableOpacity>
                      <View style={styles.pwdRow}>
                        <TextInput
                          style={styles.input}
                          placeholder="Confirm Password"
                          placeholderTextColor="#888"
                          value={signInConfirmPassword}
                          onChangeText={(v) => { setSignInConfirmPassword(v); setSignInError(''); }}
                          secureTextEntry={!showConfirmPassword}
                          autoCapitalize="none"
                          autoCorrect={false}
                          editable={!signInLoading}
                          onSubmitEditing={handleEmailSignIn}
                        />
                        <TouchableOpacity style={styles.eyeBtn} onPress={() => setShowConfirmPassword(!showConfirmPassword)}>
                          <Ionicons name={showConfirmPassword ? 'eye-off' : 'eye'} size={20} color="#888" />
                        </TouchableOpacity>
                      </View>
                      {!!signInError && <Text style={styles.errorText}>{signInError}</Text>}
                      <TouchableOpacity
                        style={[styles.continueBtn, (!signInConfirmPassword || signInLoading) && styles.btnDisabled]}
                        onPress={handleEmailSignIn}
                        disabled={!signInConfirmPassword || signInLoading}
                      >
                        <Text style={styles.continueBtnText}>{signInLoading ? 'Creating account...' : 'Sign in'}</Text>
                      </TouchableOpacity>
                    </>
                  )}
                </View>
              )}

              {/* View Quran option */}
              {((Platform.OS === 'ios') || (Platform.OS === 'android' && signInStep === 'email')) && (
                <>
                  <View style={styles.dividerRow}>
                    <View style={styles.dividerLine} />
                    <Text style={styles.dividerText}>{t('orJustHereToReadSomeQuran', currentLanguage)}</Text>
                    <View style={styles.dividerLine} />
                  </View>
                  <TouchableOpacity
                    style={styles.quranBtn}
                    onPress={() => {
                      setShowSignInModal(false);
                      resetSignInForm();
                      navigation.navigate('SimpleQuranViewer', { selectedLanguage: currentLanguage });
                    }}
                  >
                    <Text style={styles.quranBtnText}>{t('viewQuran', currentLanguage)}</Text>
                  </TouchableOpacity>
                </>
              )}

              <TouchableOpacity style={styles.cancelBtn} onPress={() => { setShowSignInModal(false); resetSignInForm(); }}>
                <Text style={styles.cancelBtnText}>{t('cancel', currentLanguage)}</Text>
              </TouchableOpacity>
            </ScrollView>
          </LinearGradient>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: '#000',
  },
  heroContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: HERO_HEIGHT,
    overflow: 'hidden',
  },
  heroImage: {
    width: '100%',
    height: '100%',
  },
  safeArea: {
    flex: 1,
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 18,
    paddingTop: 6,
    paddingBottom: 8,
  },
  backBtn: {
    padding: 8,
    borderRadius: 20,
    backgroundColor: 'rgba(0,0,0,0.35)',
  },
  langPickerWrapper: {
    position: 'relative',
    zIndex: 100,
  },
  langButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.12)',
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
  },
  langFlag: {
    fontSize: 16,
    marginRight: 5,
  },
  langName: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '500',
  },
  langDropdown: {
    position: 'absolute',
    top: 42,
    left: 0,
    backgroundColor: '#1E1E1E',
    borderRadius: 12,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.15)',
    minWidth: 130,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 10,
  },
  langOption: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 11,
  },
  langOptionActive: {
    backgroundColor: 'rgba(255,255,255,0.1)',
  },
  langOptionText: {
    color: '#ccc',
    fontSize: 14,
    marginLeft: 8,
  },
  langOptionTextActive: {
    color: '#fff',
    fontWeight: '600',
  },
  appIcon: {
    width: 42,
    height: 42,
    resizeMode: 'contain',
  },
  heroTitle: {
    paddingHorizontal: 24,
    marginTop: HERO_HEIGHT - 130,
    marginBottom: 0,
  },
  hudaText: {
    color: '#fff',
    fontSize: 52,
    fontWeight: '800',
    letterSpacing: 1,
  },
  tagline: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 16,
    fontWeight: '500',
    fontStyle: 'italic',
    marginTop: 2,
    marginBottom: 18,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 20,
  },
  sectionLabel: {
    color: '#fff',
    fontSize: 17,
    fontWeight: '700',
    marginBottom: 14,
    letterSpacing: 0.2,
  },
  featureGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: 20,
  },
  featureCard: {
    width: (width - 50) / 2,
    backgroundColor: 'rgba(255,255,255,0.07)',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    paddingVertical: 14,
    paddingHorizontal: 12,
    flexDirection: 'row',
    alignItems: 'center',
  },
  featureEmoji: {
    fontSize: 20,
    marginRight: 10,
  },
  featureCardText: {
    color: '#ddd',
    fontSize: 12,
    fontWeight: '500',
    flex: 1,
    lineHeight: 17,
  },
  trustedText: {
    color: '#666',
    fontSize: 12,
    textAlign: 'center',
    fontStyle: 'italic',
    marginTop: 10,
    lineHeight: 17,
  },
  footer: {
    paddingHorizontal: 24,
    paddingTop: 12,
    paddingBottom: Platform.OS === 'android' ? 20 : 8,
    backgroundColor: 'rgba(0,0,0,0.6)',
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.06)',
  },
  ctaButton: {
    backgroundColor: 'transparent',
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ctaText: {
    color: '#fff',
    fontSize: 24,
    fontWeight: '600',
    letterSpacing: 0.3,
    fontStyle: 'italic',
    textAlign: 'center',
  },
  // Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
  },
  modalSheet: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: Platform.OS === 'android' ? '58%' : '50%',
    borderTopLeftRadius: 26,
    borderTopRightRadius: 26,
    paddingHorizontal: 24,
    paddingTop: 18,
    paddingBottom: Platform.OS === 'android' ? 40 : 32,
    shadowColor: '#000',
    shadowOpacity: 0.35,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: -8 },
    elevation: 14,
  },
  sheetHandle: {
    width: 44,
    height: 5,
    backgroundColor: '#444',
    borderRadius: 3,
    alignSelf: 'center',
    marginBottom: 22,
  },
  modalTitle: {
    color: '#fff',
    fontSize: Platform.OS === 'android' ? 24 : 26,
    fontWeight: '800',
    textAlign: 'center',
    marginBottom: 4,
    paddingHorizontal: 16,
    lineHeight: Platform.OS === 'android' ? 30 : 32,
  },
  modalSubtitle: {
    color: '#A3B1CC',
    fontSize: Platform.OS === 'android' ? 14 : 15,
    textAlign: 'center',
    marginBottom: Platform.OS === 'android' ? 20 : 24,
    paddingHorizontal: 16,
    lineHeight: 20,
  },
  modalScroll: {
    flex: 1,
  },
  modalScrollContent: {
    alignItems: 'center',
    paddingBottom: 24,
    flexGrow: 1,
  },
  appleContainer: {
    marginBottom: 20,
  },
  emailContainer: {
    width: 280,
    alignSelf: 'center',
    marginBottom: 16,
  },
  input: {
    flex: 1,
    height: 52,
    backgroundColor: '#181818',
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingRight: 50,
    color: '#fff',
    fontSize: 16,
    borderWidth: 1,
    borderColor: '#333',
    marginBottom: 10,
  },
  pwdRow: {
    flexDirection: 'row',
    alignItems: 'center',
    position: 'relative',
  },
  eyeBtn: {
    position: 'absolute',
    right: 14,
    padding: 8,
    zIndex: 1,
  },
  continueBtn: {
    width: '100%',
    height: 52,
    backgroundColor: '#fff',
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 4,
  },
  continueBtnText: {
    color: '#000',
    fontSize: 16,
    fontWeight: '700',
  },
  btnDisabled: {
    opacity: 0.45,
  },
  stepBack: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    paddingVertical: 6,
  },
  stepBackText: {
    color: '#fff',
    fontSize: 14,
    marginLeft: 8,
    flex: 1,
  },
  forgotBtn: {
    alignSelf: 'flex-end',
    paddingVertical: 6,
    marginBottom: 8,
  },
  forgotText: {
    color: '#A3B1CC',
    fontSize: 13,
    textDecorationLine: 'underline',
  },
  errorText: {
    color: '#ff7675',
    fontSize: 13,
    textAlign: 'center',
    marginBottom: 8,
  },
  dividerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '100%',
    marginVertical: 18,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: 'rgba(255,255,255,0.15)',
  },
  dividerText: {
    color: '#888',
    fontSize: 13,
    marginHorizontal: 12,
    textAlign: 'center',
  },
  quranBtn: {
    backgroundColor: '#222',
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 28,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#333',
  },
  quranBtnText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '600',
    textAlign: 'center',
  },
  cancelBtn: {
    paddingVertical: 12,
  },
  cancelBtnText: {
    color: '#666',
    fontSize: 15,
    textAlign: 'center',
  },
});
