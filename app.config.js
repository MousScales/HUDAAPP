/**
 * Dynamic app config.
 * - Excludes expo-dev-client for production/preview builds to avoid expo-dev-menu
 *   build errors (RCTBridge.devMenu, RCTEventDispatcher incompatible with RN 0.79).
 * - Excludes prayer-blocker/device-activity-monitor target for production/preview
 *   to simplify builds (only widget target included).
 */
const base = require('./app.json');

// Production/preview EAS builds: exclude dev client and prayer blocker
const isProductionLike = process.env.INCLUDE_DEV_CLIENT === 'false';

const plugins = (base.expo.plugins || []).map((p) => {
  if (p === 'expo-dev-client') return isProductionLike ? null : p;
  // Exclude prayer-blocker target: only include widget when production-like
  if (p === '@bacons/apple-targets') {
    return isProductionLike ? ['@bacons/apple-targets', { match: 'widget' }] : p;
  }
  return p;
}).filter(Boolean);

// Explicit app extension for EAS credentials (target name must match Xcode project)
const extra = {
  ...base.expo.extra,
  eas: {
    ...base.expo.extra?.eas,
    build: {
      ...base.expo.extra?.eas?.build,
      experimental: {
        ...base.expo.extra?.eas?.build?.experimental,
        ios: {
          ...base.expo.extra?.eas?.build?.experimental?.ios,
          appExtensions: [
            {
              targetName: "PrayerTimesWidget",
              bundleIdentifier: "com.digaifounder.huda.widget",
              entitlements: {
                "com.apple.security.application-groups": ["group.com.digaifounder.huda"],
              },
            },
          ],
        },
      },
    },
  },
};

module.exports = {
  ...base,
  expo: {
    ...base.expo,
    plugins,
    extra,
  },
};
