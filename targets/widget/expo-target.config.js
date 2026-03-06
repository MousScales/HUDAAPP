/** @type {import('@bacons/apple-targets/app.plugin').ConfigFunction} */
module.exports = (config) => ({
  type: "widget",
  name: "Prayer Times Widget",
  displayName: "Prayer Times",
  icon: "../assets/logo.png",
  images: {
    logo: "../../assets/logo-rounded.png",
    blacklogo: "../../assets/blacklogo-rounded.png",
    logoOriginal: "../../assets/logo.png",
    blacklogoOriginal: "../../assets/blacklogo.png",
  },
  entitlements: {
    "com.apple.security.application-groups": [
      config.ios.entitlements["com.apple.security.application-groups"][0]
    ],
  },
  colors: {
    $accent: "#FF6B6B",
    $widgetBackground: "#FFFFFF",
  },
});

