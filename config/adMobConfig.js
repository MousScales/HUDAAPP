/**
 * AdMob configuration.
 */
import { Platform } from 'react-native';
import { TestIds } from 'react-native-google-mobile-ads';

const PROD_AD_UNITS = {
  ios: {
    banner: 'ca-app-pub-5223494624052252/8387789072',
    rewarded: 'ca-app-pub-5223494624052252/4853433745',
  },
  android: {
    // Replace with your Android banner ad unit when available.
    banner: 'ca-app-pub-5223494624052252/XXXXXXXXXX',
    rewarded: 'ca-app-pub-5223494624052252/8387789074',
  },
};

const isValidAdUnitId = (id) => /^ca-app-pub-\d{16}\/\d{10}$/.test(id);
const isPlaceholder = (id) => id.includes('X');

function getAdUnitId(adType, testId) {
  if (__DEV__) return testId;

  const platform = Platform.OS === 'ios' ? 'ios' : 'android';
  const configuredId = PROD_AD_UNITS[platform][adType];

  // Fallback to Google's test IDs if production IDs are missing/placeholder.
  if (!configuredId || !isValidAdUnitId(configuredId) || isPlaceholder(configuredId)) {
    console.warn(
      `[AdMob] Invalid ${platform} ${adType} unit id. Falling back to test ads.`
    );
    return testId;
  }

  return configuredId;
}

export const AD_UNIT_IDS = {
  BANNER: getAdUnitId('banner', TestIds.ADAPTIVE_BANNER),
  REWARDED: getAdUnitId('rewarded', TestIds.REWARDED),
};
