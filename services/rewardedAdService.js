/**
 * Rewarded ad service - loads and shows rewarded ads for temporary premium access.
 * Creates a fresh ad instance for each show to avoid reload issues when watching multiple ads.
 */

import { RewardedAd, RewardedAdEventType, AdEventType } from 'react-native-google-mobile-ads';
import { AD_UNIT_IDS } from '../config/adMobConfig';
import subscriptionGuard from './subscriptionGuard';

const LOAD_TIMEOUT_MS = 30000; // 30 seconds - ad networks can be slow

let preloadedAd = null;
let preloadedReady = false;

/**
 * Create, load, and return a ready rewarded ad. Used for preloading.
 */
async function createAndLoadAd() {
  const ad = RewardedAd.createForAdRequest(AD_UNIT_IDS.REWARDED);
  await new Promise((resolve, reject) => {
    const timeout = setTimeout(() => reject(new Error('Ad load timeout. Please check your connection and try again.')), LOAD_TIMEOUT_MS);
    const unsubLoaded = ad.addAdEventListener(RewardedAdEventType.LOADED, () => {
      clearTimeout(timeout);
      unsubLoaded();
      unsubFailed();
      resolve();
    });
    const unsubFailed = ad.addAdEventListener(AdEventType.ERROR, (err) => {
      clearTimeout(timeout);
      unsubLoaded();
      unsubFailed();
      reject(err?.message || new Error('Ad failed to load'));
    });
    ad.load();
  });
  return ad;
}

/**
 * Preload a rewarded ad for faster first show. Call on app start.
 */
export async function loadRewardedAd() {
  try {
    if (preloadedReady && preloadedAd) return;
    preloadedAd = await createAndLoadAd();
    preloadedReady = true;
  } catch (error) {
    console.warn('RewardedAd: Preload failed:', error?.message);
    throw error;
  }
}

/**
 * Show rewarded ad. Resolves when user earns reward, rejects if ad fails or user closes without completing.
 * Creates a fresh instance for each show to reliably support watching multiple ads in a row.
 * @returns {Promise<void>}
 */
export async function showRewardedAd() {
  subscriptionGuard.resetCache();
  const isSubscribed = await subscriptionGuard.forceCheckSubscriptionStatus();
  if (isSubscribed) {
    throw new Error('Premium users do not see ads.');
  }

  let ad;

  // Use preloaded ad if ready, otherwise load a new one
  if (preloadedReady && preloadedAd) {
    ad = preloadedAd;
    preloadedAd = null;
    preloadedReady = false;
    // Start preloading next ad in background (don't await)
    createAndLoadAd()
      .then((nextAd) => {
        preloadedAd = nextAd;
        preloadedReady = true;
      })
      .catch(() => {});
  } else {
    ad = await createAndLoadAd();
    // Preload next for future use
    createAndLoadAd()
      .then((nextAd) => {
        preloadedAd = nextAd;
        preloadedReady = true;
      })
      .catch(() => {});
  }

  return new Promise((resolve, reject) => {
    let earned = false;

    const unsubEarned = ad.addAdEventListener(RewardedAdEventType.EARNED_REWARD, () => {
      earned = true;
      unsubEarned();
      unsubClosed();
      resolve();
    });

    const unsubClosed = ad.addAdEventListener(AdEventType.CLOSED, () => {
      unsubEarned();
      unsubClosed();
      if (!earned) {
        reject(new Error('Ad closed without completing'));
      }
    });

    try {
      ad.show();
    } catch (err) {
      unsubEarned();
      unsubClosed();
      reject(err?.message || new Error('Ad could not be shown'));
    }
  });
}

export default {
  loadRewardedAd,
  showRewardedAd,
};
