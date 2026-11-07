import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
  ScrollView,
  Image,
  ActivityIndicator,
  Alert,
  Platform,
  Dimensions,
  Linking,
  Modal,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import revenueCatService, { PREMIUM_ENTITLEMENT_ID } from '../services/revenueCatService';
import subscriptionGuard from '../services/subscriptionGuard';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useLanguage } from '../utils/useLanguage';
import { t } from '../utils/translations';

const { width } = Dimensions.get('window');
const HERO_HEIGHT = 320;
const CAROUSEL_TOP = HERO_HEIGHT + 40;
const FEATURE_KEYS = [
  'guidedPrayers',
  'unlimitedLessons',
  'completeQuranTafsir',
  'personalRecordings',
  'progressTracking',
  'expertGuidance',
  'dailyQuranWidgets',
  'noAds',
];

const ANDROID_PRODUCT_IDS = {
  monthly: 'huda_monthly',
  yearly: 'huda_yearly',
};

const FONT = { fontFamily: Platform.OS === 'ios' ? 'System' : 'Roboto' };

const COLORS = {
  backgroundStart: '#000000',
  backgroundEnd: '#121212',
  cardBg: '#1A1A1A',
  cardSelectedBorder: '#D4AF37',
  accent: '#D4AF37',
  accentLight: '#F5D76E',
  text: '#FFFFFF',
  textMuted: '#888888',
  ctaBg: '#D4AF37',
  ctaText: '#000000',
};

export default function NewBasedPaywallScreen2({ navigation }) {
  const { currentLanguage } = useLanguage();
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [packages, setPackages] = useState([]);
  const [selectedPlan, setSelectedPlan] = useState('yearly');
  const [yearlyPackage, setYearlyPackage] = useState(null);
  const [monthlyPackage, setMonthlyPackage] = useState(null);
  const [featureIndex, setFeatureIndex] = useState(0);
  const [showLearnMoreModal, setShowLearnMoreModal] = useState(false);

  const getPackageProductId = (pkg) =>
    (
      pkg?.storeProduct?.identifier ||
      pkg?.storeProduct?.productIdentifier ||
      pkg?.product?.identifier ||
      pkg?.product?.productIdentifier ||
      ''
    ).toLowerCase();

  const normalizePlanId = (value) =>
    (value || '').toLowerCase().replace(/[-_\s]/g, '');

  useEffect(() => {
    loadPackages();
  }, []);

  useEffect(() => {
    const interval = setInterval(() => {
      setFeatureIndex((i) => (i + 1) % FEATURE_KEYS.length);
    }, 3500);
    return () => clearInterval(interval);
  }, []);

  const loadPackages = async () => {
    try {
      setLoading(true);
      const offerings = await revenueCatService.getOfferings();
      const pkgs = offerings?.current?.availablePackages || [];

      const idLower = (id) => (id || '').toLowerCase();
      const hasOffer = (id) => idLower(id).includes('offer');
      const isMonthlyPackageType = (pkg) => (pkg?.packageType || '').toUpperCase() === 'MONTHLY';
      const isYearlyPackageType = (pkg) => ['ANNUAL', 'YEARLY'].includes((pkg?.packageType || '').toUpperCase());

      const basePackages = pkgs.filter((p) => !hasOffer(p.identifier));
      const packagePool = basePackages.length > 0 ? basePackages : pkgs;

      const monthlyByAndroidId = packagePool.find(
        (p) => normalizePlanId(getPackageProductId(p)) === normalizePlanId(ANDROID_PRODUCT_IDS.monthly)
      );
      const yearlyByAndroidId = packagePool.find(
        (p) => normalizePlanId(getPackageProductId(p)) === normalizePlanId(ANDROID_PRODUCT_IDS.yearly)
      );

      const yearly = yearlyByAndroidId || packagePool.find(
        (p) =>
          idLower(p.identifier).includes('yearly') ||
          idLower(p.identifier).includes('annual')
      ) || packagePool.find(isYearlyPackageType);
      const monthly = monthlyByAndroidId || packagePool.find((p) => idLower(p.identifier).includes('monthly')) || packagePool.find(isMonthlyPackageType);

      setYearlyPackage(yearly || packagePool[0] || pkgs[0]);
      setMonthlyPackage(monthly || packagePool[1] || packagePool[0] || pkgs[1] || pkgs[0]);
    } catch (error) {
      console.error('Failed to load packages:', error);
      setYearlyPackage(null);
      setMonthlyPackage(null);
    } finally {
      setLoading(false);
    }
  };

  const getPriceString = (pkg, planType = 'yearly') => {
    const yearlyFallback = { price: '$4.17/mo', period: '12 mo • $49.99' };
    const monthlyFallback = { price: '$9.99/mo', period: '1 mo' };

    if (!pkg) return planType === 'yearly' ? yearlyFallback : monthlyFallback;
    const product = pkg.storeProduct || pkg.product;
    const idLower = (pkg.identifier || '').toLowerCase();
    const isYearly = idLower.includes('yearly') || idLower.includes('annual');

    if (!product) return isYearly ? yearlyFallback : monthlyFallback;

    const rawPrice = product.priceString ?? product.price;
    const price = rawPrice && typeof rawPrice === 'string' ? rawPrice : null;

    if (!price) return isYearly ? yearlyFallback : monthlyFallback;

    const num = parseFloat(price.replace(/[^0-9.]/g, '')) || (isYearly ? 49.99 : 9.99);
    if (isYearly) {
      const perMo = (num / 12).toFixed(2);
      return { price: `$${perMo}/mo`, period: `12 mo • ${price}` };
    }
    return { price: price.endsWith('/mo') ? price : `${price}/mo`, period: '1 mo' };
  };

  const handleSubscribe = async () => {
    if (processing) return;

    const pkg = selectedPlan === 'yearly' ? yearlyPackage : monthlyPackage;
    if (!pkg) {
      Alert.alert('Error', 'No subscription package available. Please try again.');
      return;
    }

    if (!revenueCatService.initialized) {
      Alert.alert('Error', 'Subscription service is not ready. Please try again.');
      return;
    }

    setProcessing(true);
    try {
      const androidDebugId =
        pkg?.product?.defaultOption?.id ||
        pkg?.product?.defaultOption?.storeProductId ||
        pkg?.product?.identifier ||
        pkg?.storeProduct?.identifier ||
        pkg?.identifier ||
        'unknown';
      const normalizedAndroidProductId = androidDebugId.includes(':')
        ? androidDebugId.split(':')[1]
        : androidDebugId;
      console.log('🧾 Paywall purchase debug (NewBasedPaywallScreen2):', {
        selectedPlan,
        packageIdentifier: pkg?.identifier,
        packageType: pkg?.packageType,
        storeProductIdentifier: pkg?.storeProduct?.identifier,
        androidDefaultOptionId: pkg?.product?.defaultOption?.id,
        androidDefaultOptionStoreProductId: pkg?.product?.defaultOption?.storeProductId,
        androidProductIdentifier: pkg?.product?.identifier,
        resolvedProductId: normalizedAndroidProductId,
      });

      await AsyncStorage.setItem('pendingPurchase', 'true');
      await revenueCatService.purchasePackage(pkg);
      await AsyncStorage.removeItem('pendingPurchase');

      subscriptionGuard.resetCache();
      if (window.handlePurchaseSuccess) {
        window.handlePurchaseSuccess();
      }

      navigation.goBack();
    } catch (error) {
      await AsyncStorage.removeItem('pendingPurchase');
      setProcessing(false);
      if (!error.userCancelled) {
        Alert.alert('Purchase Error', error.message || 'Could not complete purchase.');
      }
    }
  };

  const openTermsOfService = () => {
    Linking.openURL('https://www.apple.com/legal/internet-services/itunes/dev/stdeula/');
  };

  const openPrivacyPolicy = () => {
    Linking.openURL('https://www.mouslifejournal.com/privacy.html');
  };

  const handleRestore = async () => {
    try {
      setProcessing(true);
      const customerInfo = await revenueCatService.restorePurchases();
      subscriptionGuard.resetCache();

      if (customerInfo && customerInfo.entitlements?.active?.[PREMIUM_ENTITLEMENT_ID]) {
        Alert.alert(
          t('subscriptionRestored', currentLanguage),
          t('subscriptionRestoredMessage', currentLanguage)
        );
        setTimeout(() => navigation.goBack(), 1500);
      } else {
        Alert.alert(
          t('noValidSubscription', currentLanguage),
          t('noValidSubscriptionMessage', currentLanguage)
        );
      }
    } catch (error) {
      console.error('Error restoring purchases:', error);
      Alert.alert(
        t('restoreError', currentLanguage),
        t('restoreErrorMessage', currentLanguage)
      );
    } finally {
      setProcessing(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.screen}>
        <SafeAreaView style={styles.container}>
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={COLORS.accent} />
            <Text style={styles.loadingText}>Loading subscription options...</Text>
          </View>
        </SafeAreaView>
      </View>
    );
  }

  const yearlyPrice = getPriceString(yearlyPackage, 'yearly');
  const monthlyPrice = getPriceString(monthlyPackage, 'monthly');

  return (
    <View style={styles.screen}>
      <View style={styles.heroImageContainer} pointerEvents="none">
        <Image
          source={require('../assets/sub.png')}
          style={styles.heroImage}
          resizeMode="cover"
        />
        <LinearGradient
          colors={['transparent', 'rgba(0,0,0,0.15)', 'rgba(0,0,0,0.7)']}
          locations={[0, 0.7, 1]}
          style={styles.heroFadeOverlay}
        />
      </View>

      <View style={styles.carouselOverlay} pointerEvents="none">
        <Text style={styles.featureText}>{t(FEATURE_KEYS[featureIndex], currentLanguage)}</Text>
      </View>

      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color={COLORS.text} />
          </TouchableOpacity>
          <View style={styles.proBadge}>
            <LinearGradient
              colors={['#D4AF37', '#F5D76E']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.proBadgeGradient}
            >
              <Text style={styles.proBadgeText}>PREMIUM</Text>
            </LinearGradient>
          </View>
        </View>

        <View
          style={[styles.scrollView, styles.scrollContent, { paddingTop: HERO_HEIGHT }]}
        >
          {/* Reactivate headline - no free trial */}
          <View style={styles.headlineRow}>
            <Text style={styles.headline}>Reactivate your </Text>
            <Text style={[styles.headlineHighlight, styles.headlineNoWrap]}>Huda Premium</Text>
            <Text style={styles.headline}> subscription</Text>
          </View>

          <Text style={styles.subheadline}>
            Pick up where you left off. The free trial is for new subscribers only.
          </Text>

          {/* Plan Cards */}
          <View style={styles.planCards}>
            <TouchableOpacity
              style={[styles.planCard, selectedPlan === 'monthly' && styles.planCardSelected]}
              onPress={() => setSelectedPlan('monthly')}
              activeOpacity={0.8}
            >
              <View style={styles.planCardContent}>
                <Text style={styles.planTitle}>Monthly</Text>
              </View>
              <Text style={styles.planPrice}>{monthlyPrice.price}</Text>
              {selectedPlan === 'monthly' && (
                <View style={styles.checkmark}>
                  <Ionicons name="checkmark-circle" size={24} color={COLORS.accent} />
                </View>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.planCard, selectedPlan === 'yearly' && styles.planCardSelected]}
              onPress={() => setSelectedPlan('yearly')}
              activeOpacity={0.8}
            >
              <View style={styles.mostPopularBadge}>
                <Text style={styles.mostPopularText}>MOST POPULAR</Text>
              </View>
              <View style={styles.planCardContent}>
                <Text style={styles.planTitle}>Yearly</Text>
              </View>
              <Text style={styles.planPrice}>{yearlyPrice.price}</Text>
              {selectedPlan === 'yearly' && (
                <View style={styles.checkmark}>
                  <Ionicons name="checkmark-circle" size={24} color={COLORS.accent} />
                </View>
              )}
            </TouchableOpacity>
          </View>

          <TouchableOpacity
            style={styles.ctaButton}
            onPress={handleSubscribe}
            disabled={processing}
            activeOpacity={0.85}
          >
            <LinearGradient
              colors={['#F5D76E', '#D4AF37', '#C9A227']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.ctaButtonGradient}
            >
              {processing ? (
                <ActivityIndicator color={COLORS.ctaText} size="small" />
              ) : (
                <Text style={styles.ctaButtonText}>REACTIVATE SUBSCRIPTION</Text>
              )}
            </LinearGradient>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.learnMoreButton}
            onPress={() => setShowLearnMoreModal(true)}
            activeOpacity={0.7}
          >
            <Text style={styles.learnMoreText}>Learn more</Text>
          </TouchableOpacity>

          <Text style={styles.finePrint}>
            Your subscription automatically renews unless you turn off auto-renew at least 24 hours before the current period ends. You can manage and cancel your subscription anytime in your account settings.
          </Text>
        </View>

        {/* Fixed footer - always visible, no scroll needed */}
        <View style={styles.legalLinksFooter}>
          <TouchableOpacity onPress={openTermsOfService}>
            <Text style={styles.legalLink}>{t('termsOfService', currentLanguage)}</Text>
          </TouchableOpacity>
          <Text style={styles.legalDot}> • </Text>
          <TouchableOpacity onPress={handleRestore} disabled={processing}>
            <Text style={styles.legalLink}>{t('restorePurchases', currentLanguage)}</Text>
          </TouchableOpacity>
          <Text style={styles.legalDot}> • </Text>
          <TouchableOpacity onPress={openPrivacyPolicy}>
            <Text style={styles.legalLink}>{t('privacyPolicy', currentLanguage)}</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>

      <Modal
        visible={showLearnMoreModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowLearnMoreModal(false)}
      >
        <View style={styles.modalOverlay}>
          <TouchableOpacity
            style={StyleSheet.absoluteFill}
            activeOpacity={1}
            onPress={() => setShowLearnMoreModal(false)}
          />
          <View style={styles.learnMoreModalContent}>
            <View style={styles.learnMoreModalHeader}>
              <Text style={styles.learnMoreModalTitle}>What's included</Text>
              <TouchableOpacity
                onPress={() => setShowLearnMoreModal(false)}
                style={styles.learnMoreCloseButton}
                hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
              >
                <Ionicons name="close" size={24} color={COLORS.text} />
              </TouchableOpacity>
            </View>
            <ScrollView
              style={styles.learnMoreScroll}
              showsVerticalScrollIndicator={false}
              contentContainerStyle={styles.learnMoreScrollContent}
            >
              <View style={styles.learnMoreGrid}>
                {FEATURE_KEYS.map((key) => (
                  <View key={key} style={styles.learnMoreItem}>
                    <View style={styles.learnMoreItemIcon}>
                      <Ionicons name="checkmark-circle" size={20} color={COLORS.accent} />
                    </View>
                    <Text style={styles.learnMoreItemText}>{t(key, currentLanguage)}</Text>
                  </View>
                ))}
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: '#000000',
  },
  container: {
    flex: 1,
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  header: {
    backgroundColor: 'transparent',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 6,
    paddingBottom: 10,
  },
  backButton: {
    padding: 8,
  },
  proBadge: {
    borderRadius: 12,
    overflow: 'hidden',
  },
  proBadgeGradient: {
    paddingHorizontal: 14,
    paddingVertical: 6,
  },
  proBadgeText: {
    color: '#000000',
    fontWeight: '700',
    fontSize: 13,
    fontStyle: 'italic',
    ...FONT,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 16,
  },
  loadingText: {
    color: COLORS.textMuted,
    fontSize: 16,
    ...FONT,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 24,
    paddingBottom: 20,
  },
  legalLinksFooter: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 20,
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  heroImageContainer: {
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
  heroFadeOverlay: {
    ...StyleSheet.absoluteFillObject,
  },
  carouselOverlay: {
    position: 'absolute',
    top: CAROUSEL_TOP,
    left: 24,
    right: 24,
    alignItems: 'center',
  },
  featureText: {
    color: 'rgba(255,255,255,0.75)',
    fontSize: 14,
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    textAlign: 'center',
    ...FONT,
  },
  headlineRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  headline: {
    color: COLORS.text,
    fontSize: 20,
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 1,
    ...FONT,
  },
  headlineNoWrap: {
    flexShrink: 0,
  },
  headlineHighlight: {
    color: '#F5D76E',
    fontSize: 20,
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 1,
    textShadowColor: 'rgba(245, 215, 110, 0.9)',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 14,
    ...FONT,
  },
  subheadline: {
    color: COLORS.textMuted,
    fontSize: 13,
    textAlign: 'center',
    marginBottom: 18,
    paddingHorizontal: 8,
    ...FONT,
  },
  planCards: {
    gap: 10,
    marginBottom: 20,
    overflow: 'visible',
  },
  planCard: {
    backgroundColor: COLORS.cardBg,
    borderRadius: 16,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'transparent',
    position: 'relative',
    overflow: 'visible',
  },
  planCardSelected: {
    borderColor: COLORS.cardSelectedBorder,
    borderWidth: 2,
  },
  mostPopularBadge: {
    position: 'absolute',
    top: -10,
    left: 16,
    backgroundColor: '#2A2A2A',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
    zIndex: 1,
  },
  mostPopularText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '700',
    ...FONT,
  },
  checkmark: {
    marginLeft: 12,
  },
  planCardContent: {
    flex: 1,
  },
  planTitle: {
    color: COLORS.text,
    fontSize: 17,
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    ...FONT,
  },
  planPrice: {
    color: COLORS.text,
    fontSize: 17,
    fontWeight: '700',
    ...FONT,
  },
  ctaButton: {
    borderRadius: 16,
    overflow: 'hidden',
    marginBottom: 8,
    shadowColor: '#D4AF37',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 8,
  },
  ctaButtonGradient: {
    paddingVertical: 18,
    paddingHorizontal: 24,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 16,
  },
  learnMoreButton: {
    alignSelf: 'center',
    marginBottom: 16,
    paddingVertical: 8,
    paddingHorizontal: 16,
  },
  learnMoreText: {
    color: COLORS.accent,
    fontSize: 15,
    fontWeight: '600',
    ...FONT,
  },
  ctaButtonText: {
    color: '#000000',
    fontSize: 18,
    fontWeight: '800',
    letterSpacing: 1.5,
    textTransform: 'uppercase',
    ...FONT,
  },
  finePrint: {
    color: COLORS.textMuted,
    fontSize: 9,
    textAlign: 'center',
    lineHeight: 13,
    marginBottom: 24,
    ...FONT,
  },
  legalLinksRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 8,
  },
  legalLink: {
    color: COLORS.accent,
    fontSize: 11,
    fontWeight: '600',
    ...FONT,
  },
  legalDot: {
    color: COLORS.textMuted,
    fontSize: 11,
    marginHorizontal: 4,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'flex-end',
    alignItems: 'center',
  },
  learnMoreModalContent: {
    backgroundColor: COLORS.cardBg,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    width: '100%',
    maxHeight: '80%',
    paddingBottom: 34,
  },
  learnMoreModalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.1)',
  },
  learnMoreModalTitle: {
    color: COLORS.text,
    fontSize: 20,
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    ...FONT,
  },
  learnMoreCloseButton: {
    padding: 4,
  },
  learnMoreScroll: {
    maxHeight: 320,
  },
  learnMoreScrollContent: {
    padding: 20,
    paddingBottom: 24,
  },
  learnMoreGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  learnMoreItem: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '48%',
    marginBottom: 16,
  },
  learnMoreItemIcon: {
    marginRight: 8,
  },
  learnMoreItemText: {
    flex: 1,
    color: COLORS.text,
    fontSize: 13,
    lineHeight: 18,
    ...FONT,
  },
});
