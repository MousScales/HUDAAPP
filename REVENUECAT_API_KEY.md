# RevenueCat API Key Configuration

## Quick Setup

Add your RevenueCat API keys to your environment variables:

### Option 1: Create a `.env` file (Recommended)

Create a `.env` file in your project root with:

```
EXPO_PUBLIC_REVENUECAT_IOS_API_KEY=your_ios_api_key_here
EXPO_PUBLIC_REVENUECAT_ANDROID_API_KEY=your_android_api_key_here
```

### Option 2: Add to `app.json`

Add to your `app.json` under `expo.extra`:

```json
{
  "expo": {
    "extra": {
      "revenueCat": {
        "iosApiKey": "your_ios_api_key_here",
        "androidApiKey": "your_android_api_key_here"
      }
    }
  }
}
```

Then update `App.js` line 397-401 to read from Constants:
```javascript
import Constants from 'expo-constants';

const revenueCatApiKey = Platform.select({
  ios: Constants.expoConfig?.extra?.revenueCat?.iosApiKey,
  android: Constants.expoConfig?.extra?.revenueCat?.androidApiKey,
  default: null
});
```

## Getting Your API Keys

1. Go to [RevenueCat Dashboard](https://app.revenuecat.com)
2. Select your project
3. Go to **API Keys** section
4. Copy your **Public API Key** for iOS (starts with `apprc_`) and Android (starts with `goog_`)

## Important Notes

- **Never commit API keys to version control**
- Add `.env` to your `.gitignore` file
- API keys are public keys and safe to use in client apps
- Make sure to use the correct key for each platform


