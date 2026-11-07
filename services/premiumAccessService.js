/**
 * Tracks temporary premium access granted via rewarded ads.
 */

import AsyncStorage from '@react-native-async-storage/async-storage';

const KEY = 'premiumAccessExpiry';
const DURATION_MS = 30 * 60 * 1000; // 30 minutes

/**
 * Grant temporary premium access (e.g. after watching a rewarded ad).
 */
export async function grantTemporaryAccess() {
  const expiry = Date.now() + DURATION_MS;
  await AsyncStorage.setItem(KEY, String(expiry));
}

/**
 * Check if user has temporary premium access from a rewarded ad.
 * @returns {Promise<boolean>}
 */
export async function hasTemporaryAccess() {
  try {
    const stored = await AsyncStorage.getItem(KEY);
    if (!stored) return false;
    const expiry = parseInt(stored, 10);
    if (isNaN(expiry) || Date.now() >= expiry) {
      await AsyncStorage.removeItem(KEY);
      return false;
    }
    return true;
  } catch {
    return false;
  }
}

/**
 * Check if user can access premium (subscribed OR has temporary access).
 * Use subscriptionGuard for subscription check.
 */
export async function canAccessPremium(isSubscribed) {
  if (isSubscribed) return true;
  return hasTemporaryAccess();
}
