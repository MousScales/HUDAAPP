/**
 * Helper to determine which paywall screen to show based on RevenueCat.
 * - First-time (never subscribed) → NewBasedPaywallScreen (7-day free trial)
 * - Returning (had subscription, now expired) → NewBasedPaywallScreen2 (reactivate, no free trial)
 */

import { Alert } from 'react-native';
import { auth } from '../firebase';
import revenueCatService, { PREMIUM_ENTITLEMENT_ID } from './revenueCatService';
import subscriptionGuard from './subscriptionGuard';
import { t } from '../utils/translations';

// Product IDs that indicate user has ever subscribed (matches RevenueCat & store)
const PREMIUM_PRODUCT_IDS = [
  'premium_monthly_999',
  'premium_yearly_80',
  'premium_monthly_promo',
  'premium_yearly_offer',
  'huda-monthly-offer',
  'huda-monthly',
  'hud-yealry-offer',
  'huda-yearly',
];

/**
 * Check if user is a returning subscriber (had premium before, now expired/cancelled).
 * @returns {Promise<boolean>}
 */
export async function isReturningSubscriber() {
  try {
    subscriptionGuard.resetCache();
    const customerInfo = await revenueCatService.getCustomerInfo();
    if (!customerInfo) return false;

    // Currently active - they're subscribed, don't show paywall (caller handles this)
    const isActive = customerInfo.entitlements?.active?.[PREMIUM_ENTITLEMENT_ID];
    if (isActive) return false;

    // Check if they ever had the premium entitlement (in all, including expired)
    const hadEntitlement = customerInfo.entitlements?.all?.[PREMIUM_ENTITLEMENT_ID];
    if (hadEntitlement) return true;

    // Check if they ever purchased any premium product
    const purchased = customerInfo.allPurchasedProductIdentifiers || [];
    const hasPurchasedPremium = purchased.some(
      (id) => PREMIUM_PRODUCT_IDS.includes(id) || id?.toLowerCase?.().includes('premium') || id?.toLowerCase?.().includes('huda')
    );
    return hasPurchasedPremium;
  } catch (error) {
    console.error('paywallHelper.isReturningSubscriber error:', error);
    return false; // Default to first-time (free trial) on error
  }
}

/**
 * Get the paywall screen name to navigate to.
 * Caller should check subscription status first - if subscribed, don't show any paywall.
 * @returns {Promise<'NewBasedPaywall' | 'NewBasedPaywall2'>}
 */
export async function getPaywallScreenName() {
  const returning = await isReturningSubscriber();
  return returning ? 'NewBasedPaywall2' : 'NewBasedPaywall';
}

/**
 * Navigate directly to the correct paywall screen (slides in from the right).
 * @param {import('@react-navigation/native').NavigationProp<any>} navigation
 */
export async function navigateToPaywall(navigation) {
  const screen = await getPaywallScreenName();
  navigation.navigate(screen);
}

export function isUserSignedIn() {
  return !!auth.currentUser;
}

/**
 * Gate features that save or sync data to Firebase. Guests see the sign-in prompt.
 * @returns {boolean} true when the user is signed in
 */
export function requireSignedIn(navigation, currentLanguage = 'english') {
  if (auth.currentUser) {
    return true;
  }
  promptSignInForPremium(navigation, currentLanguage);
  return false;
}

/**
 * Alert guests to sign in via Settings before accessing premium features.
 */
export function promptSignInForPremium(navigation, currentLanguage = 'english') {
  Alert.alert(
    t('signInRequiredTitle', currentLanguage),
    t('signInViaSettingsMessage', currentLanguage),
    [
      { text: t('cancel', currentLanguage), style: 'cancel' },
      {
        text: t('goToSettings', currentLanguage),
        onPress: () => navigation.getParent()?.navigate('Profile', { screen: 'SettingsScreen' }),
      },
    ]
  );
}

/**
 * Gate premium features: guests → sign-in prompt; signed-in non-subscribers → paywall.
 * @returns {Promise<boolean>} true when the user may access the feature now
 */
export async function requirePremiumAccess(navigation, currentLanguage = 'english') {
  if (!auth.currentUser) {
    promptSignInForPremium(navigation, currentLanguage);
    return false;
  }

  try {
    subscriptionGuard.resetCache();
    const isSubscribed = await subscriptionGuard.forceCheckSubscriptionStatus();
    if (isSubscribed) {
      return true;
    }
    await navigateToPaywall(navigation);
    return false;
  } catch (error) {
    console.error('requirePremiumAccess error:', error);
    await navigateToPaywall(navigation);
    return false;
  }
}
