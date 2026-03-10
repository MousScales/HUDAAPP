/** @type {import('@bacons/apple-targets/app.plugin').ConfigFunction} */
module.exports = (config) => ({
  type: "device-activity-monitor",
  name: "PrayerBlocker",
  displayName: "Prayer Time Blocker",
  entitlements: {
    "com.apple.security.application-groups": [
      config.ios.entitlements["com.apple.security.application-groups"][0]
    ],
    "com.apple.developer.family-controls": true,
  },
  frameworks: [
    "DeviceActivity",
    "FamilyControls",
    "ManagedSettings",
  ],
});


