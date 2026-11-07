import React, { useState, useEffect } from 'react';
import { View, StyleSheet, Platform } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { BannerAd, BannerAdSize } from 'react-native-google-mobile-ads';
import { AD_UNIT_IDS } from '../config/adMobConfig';
import subscriptionGuard from '../services/subscriptionGuard';

/**
 * Banner ad that only renders for non-premium users.
 * Place at bottom of screens (e.g. HomeScreen).
 * @param {Object} props
 * @param {'bottom'|'right'} props.position - 'right' = right side above tab bar, 'bottom' = full width at bottom
 */
export default function AdBanner({ position = 'center' }) {
  // Ads disabled — re-enable by removing this early return.
  return null;

  const cachedSubscription = subscriptionGuard.getCachedResult();
  const [showAd, setShowAd] = useState(
    cachedSubscription === undefined ? false : !cachedSubscription
  );

  const refreshSubscription = React.useCallback(async (mountedRef) => {
    try {
      // Fast path: use cached/normal check first to avoid UI flash.
      const isSubscribed = await subscriptionGuard.checkSubscriptionStatus();
      if (mountedRef.current) {
        setShowAd(!isSubscribed);
      }

      // Background hard refresh to catch latest store changes.
      const freshIsSubscribed = await subscriptionGuard.forceCheckSubscriptionStatus();
      if (mountedRef.current) {
        setShowAd(!freshIsSubscribed);
      }
    } catch (error) {
      console.warn('AdBanner: Could not check subscription:', error);
      if (mountedRef.current) setShowAd(true); // Show ads if check fails (fail open for revenue)
    }
  }, []);

  useEffect(() => {
    const mountedRef = { current: true };
    refreshSubscription(mountedRef);
    return () => {
      mountedRef.current = false;
    };
  }, [refreshSubscription]);

  useFocusEffect(
    React.useCallback(() => {
      const mountedRef = { current: true };
      refreshSubscription(mountedRef);
      return () => {
        mountedRef.current = false;
      };
    }, [refreshSubscription])
  );

  if (!showAd) return null;

  const isRightSide = position === 'right';

  return (
    <View style={[styles.container, isRightSide && styles.containerRight]}>
      <BannerAd
        unitId={AD_UNIT_IDS.BANNER}
        size={position === 'right' ? BannerAdSize.BANNER : BannerAdSize.ANCHORED_ADAPTIVE_BANNER}
        onAdLoaded={() => {}}
        onAdFailedToLoad={(error) => {
          console.warn('AdMob banner failed to load:', error?.message);
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Platform.OS === 'android' ? '#000000' : 'transparent',
    paddingVertical: 4,
  },
  containerRight: {
    alignSelf: 'flex-end',
  },
});
