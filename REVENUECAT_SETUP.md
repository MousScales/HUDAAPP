# RevenueCat Setup Guide

This guide will help you set up RevenueCat in your app.

## Overview

RevenueCat has been integrated into your app to manage subscriptions. The implementation includes:

- **RevenueCat Service** (`services/revenueCatService.js`) - Handles all RevenueCat operations
- **Updated SubscriptionModal** - Now uses RevenueCat offerings with IAP fallback
- **Updated Subscription Guard** - Checks RevenueCat first, then falls back to IAP
- **App Initialization** - RevenueCat is initialized on app startup

## Prerequisites

1. Create a RevenueCat account at [https://www.revenuecat.com](https://www.revenuecat.com)
2. Create a new project in RevenueCat dashboard
3. Add your iOS and Android apps to the project
4. Configure your products and offerings in RevenueCat dashboard

## Installation

1. **Install the package** (if not already installed):
   ```bash
   npm install react-native-purchases
   ```

2. **For iOS**, you may need to run:
   ```bash
   cd ios && pod install && cd ..
   ```

## Configuration

### Step 1: Get Your API Keys

1. Go to your RevenueCat dashboard
2. Navigate to your project
3. Go to **API Keys** section
4. Copy your **Public API Key** for iOS and Android

### Step 2: Set Environment Variables

Add your RevenueCat API keys to your environment variables or `app.json`:

**Option 1: Environment Variables (Recommended)**

Create a `.env` file in your project root:
```
EXPO_PUBLIC_REVENUECAT_IOS_API_KEY=apprc_xxxxxxxxxxxxx
EXPO_PUBLIC_REVENUECAT_ANDROID_API_KEY=goog_xxxxxxxxxxxxx
```

**Option 2: app.json**

Add to your `app.json`:
```json
{
  "expo": {
    "extra": {
      "revenueCat": {
        "iosApiKey": "apprc_xxxxxxxxxxxxx",
        "androidApiKey": "goog_xxxxxxxxxxxxx"
      }
    }
  }
}
```

Then update `App.js` to read from `expo-constants`:
```javascript
import Constants from 'expo-constants';

const revenueCatApiKey = Platform.select({
  ios: Constants.expoConfig?.extra?.revenueCat?.iosApiKey,
  android: Constants.expoConfig?.extra?.revenueCat?.androidApiKey,
  default: null
});
```

### Step 3: Configure Products in RevenueCat

1. In RevenueCat dashboard, go to **Products**
2. Add your subscription products:
   - `premium_monthly_999` (Monthly subscription)
   - `premium_yearly_80` (Yearly subscription)
   - `premium_monthly_promo` (Promotional monthly - optional)
   - `premium_yearly_offer` (Promotional yearly - optional)

3. Make sure product IDs match what's in your App Store Connect / Play Console

### Step 4: Create Offerings

1. In RevenueCat dashboard, go to **Offerings**
2. Create a new Offering (e.g., "default")
3. Add packages to the offering:
   - Monthly package (type: MONTHLY)
   - Yearly package (type: ANNUAL)
4. Set one offering as the **Default Offering**

### Step 5: Configure Entitlements

1. In RevenueCat dashboard, go to **Entitlements**
2. Create an entitlement called `premium`
3. Attach your subscription products to this entitlement

## How It Works

### Initialization

RevenueCat is initialized in `App.js` when the app starts:
- Checks for API keys in environment variables
- Initializes RevenueCat SDK
- Identifies user with Firebase UID when logged in
- Falls back to IAP if RevenueCat is not configured

### Subscription Flow

1. **SubscriptionModal** tries to fetch offerings from RevenueCat first
2. If RevenueCat is available, it displays packages from the current offering
3. If RevenueCat is not available, it falls back to direct IAP
4. Purchase is handled through RevenueCat if available, otherwise through IAP

### Subscription Checking

The `subscriptionGuard` service:
1. First checks RevenueCat for active subscription
2. Falls back to IAP check if RevenueCat is not available
3. Caches results to avoid excessive API calls

## Usage Examples

### Get Offerings

```javascript
import revenueCatService from './services/revenueCatService';

// Get current offering
const offerings = await revenueCatService.getOfferings();
if (offerings?.current) {
  const packages = offerings.current.availablePackages;
  // Display packages to user
}

// Get offering by placement
const offering = await revenueCatService.getOfferingForPlacement('paywall');
```

### Purchase Package

```javascript
// Purchase a package
try {
  const customerInfo = await revenueCatService.purchasePackage(selectedPackage);
  console.log('Purchase successful!');
} catch (error) {
  if (error.userCancelled) {
    console.log('User cancelled');
  } else {
    console.error('Purchase failed:', error);
  }
}
```

### Check Subscription Status

```javascript
// Check if user has active subscription
const isSubscribed = await revenueCatService.hasActiveSubscription();

// Get customer info
const customerInfo = await revenueCatService.getCustomerInfo();
const hasPremium = customerInfo?.entitlements?.active['premium'] !== undefined;
```

### Restore Purchases

```javascript
try {
  const customerInfo = await revenueCatService.restorePurchases();
  if (customerInfo?.entitlements?.active['premium']) {
    console.log('Subscription restored!');
  }
} catch (error) {
  console.error('Restore failed:', error);
}
```

## Testing

### Sandbox Testing

1. Use sandbox test accounts in App Store Connect / Play Console
2. RevenueCat will automatically use sandbox environment for testing
3. Test purchases won't be charged

### Debug Mode

Enable debug logging in RevenueCat dashboard to see detailed logs.

## Troubleshooting

### RevenueCat Not Initializing

- Check that API keys are correctly set in environment variables
- Verify API keys are correct in RevenueCat dashboard
- Check console logs for initialization errors

### No Offerings Available

- Ensure offerings are created in RevenueCat dashboard
- Verify at least one offering is set as "Default"
- Check that packages are added to the offering
- Ensure products are configured in App Store Connect / Play Console

### Purchases Not Working

- Verify products are approved in App Store Connect / Play Console
- Check that products are correctly linked in RevenueCat
- Ensure entitlements are configured correctly
- Test with sandbox accounts

### Subscription Status Not Updating

- RevenueCat syncs with App Store / Play Store automatically
- Check customer info: `await revenueCatService.getCustomerInfo()`
- Verify entitlements are active: `customerInfo.entitlements.active['premium']`

## Migration from IAP

The implementation includes backward compatibility:
- If RevenueCat is not configured, the app falls back to direct IAP
- Existing IAP subscriptions continue to work
- New purchases use RevenueCat if available, otherwise IAP

## Additional Resources

- [RevenueCat Documentation](https://docs.revenuecat.com/)
- [React Native SDK Guide](https://docs.revenuecat.com/docs/react-native)
- [RevenueCat Dashboard](https://app.revenuecat.com)

## Support

If you encounter issues:
1. Check RevenueCat dashboard for errors
2. Review console logs for detailed error messages
3. Verify all configuration steps are completed
4. Test with sandbox accounts first


