// Lazy import to avoid NativeEventEmitter error on module load
let Purchases = null;
let importError = null;

// Global error interceptor to suppress customLogHandler errors
// This is a known harmless issue with react-native-purchases
if (typeof global !== 'undefined' && !global.__revenueCatErrorInterceptorSet) {
  const originalError = console.error;
  console.error = (...args) => {
    const errorMsg = args.join(' ');
    // Filter out the customLogHandler error as it's harmless and doesn't affect functionality
    if (errorMsg.includes('customLogHandler') && (errorMsg.includes('not a function') || errorMsg.includes('is not a function'))) {
      // Silently ignore this specific error - it's a known issue with RevenueCat SDK
      return;
    }
    originalError(...args);
  };
  global.__revenueCatErrorInterceptorSet = true;
}

const getPurchases = async () => {
  if (!Purchases && !importError) {
    try {
      const module = await import('react-native-purchases');
      Purchases = module.default || module;
      
      // Check if native module is actually available
      // The JS module might load but native bridge might not be ready
      if (!Purchases) {
        importError = new Error('Module import returned null or undefined');
        console.error('❌ react-native-purchases module is empty');
        return null;
      }
      
      // Verify configure function exists (indicates native module is linked)
      if (typeof Purchases.configure !== 'function') {
        importError = new Error('Native module bridge not available - configure function missing');
        console.error('❌ RevenueCat native module not linked');
        console.error('💡 The JavaScript module loaded but native bridge is missing.');
        console.error('💡 This means the app needs to be rebuilt: npx expo run:ios');
        return null;
      }
      
      return Purchases;
    } catch (error) {
      importError = error;
      console.error('❌ Failed to import react-native-purchases:', error);
      console.error('💡 Error details:', error.message);
      return null;
    }
  }
  
  if (importError) {
    return null;
  }
  
  return Purchases;
};

import { Platform } from 'react-native';
import { auth } from '../firebase';

// Entitlement identifier from RevenueCat dashboard
// IMPORTANT: This must match EXACTLY the entitlement identifier in your RevenueCat dashboard
// Go to RevenueCat Dashboard > Entitlements to verify the exact name
// The entitlement should be attached to all subscription products
export const PREMIUM_ENTITLEMENT_ID = 'Huda: The App For Muslims Pro';

class RevenueCatService {
  constructor() {
    this.isInitialized = false;
    this.offerings = null;
    this.customerInfo = null;
    this.listeners = [];
  }

  /**
   * Initialize RevenueCat SDK
   * @param {string} apiKey - RevenueCat API key (iOS or Android)
   */
  async initialize(apiKey) {
    try {
      if (this.isInitialized) {
        return true;
      }

      if (!apiKey) {
        console.error('❌ RevenueCat API key is required');
        return false;
      }

      // Wait for native modules to be ready (especially important in Expo)
      // Try multiple times with increasing delays
      let PurchasesModule = null;
      const maxRetries = 3;
      for (let attempt = 0; attempt < maxRetries; attempt++) {
        await new Promise(resolve => setTimeout(resolve, 1000 + (attempt * 500)));
        
        // Lazy load Purchases module
        PurchasesModule = await getPurchases();
        if (PurchasesModule && typeof PurchasesModule.configure === 'function') {
          break;
        }
        
        if (attempt < maxRetries - 1) {
          console.warn(`⚠️ RevenueCat module not ready, retrying... (${attempt + 1}/${maxRetries})`);
        }
      }
      
      if (!PurchasesModule) {
        console.error('❌ RevenueCat native module not available after retries');
        console.error('💡 The JavaScript module loaded but the native bridge is not connected.');
        console.error('💡 This usually means the app needs to be rebuilt.');
        console.error('💡 Steps to fix:');
        console.error('   1. Make sure react-native-purchases is installed: npm install react-native-purchases');
        console.error('   2. Run: cd ios && pod install && cd ..');
        console.error('   3. Rebuild the app: npx expo run:ios');
        return false;
      }
      
      if (typeof PurchasesModule.configure !== 'function') {
        console.error('❌ RevenueCat configure function not available');
        console.error('💡 The native module may not be properly linked. Rebuild your app.');
        console.error('💡 Run: cd ios && pod install && cd .. && npx expo run:ios');
        return false;
      }
      
      // Configure RevenueCat with error handling
      try {
        // Configure RevenueCat
        // IMPORTANT: The app package name (com.digaifounder.huda) must match what's configured in:
        // 1. Google Play Console (app package name)
        // 2. RevenueCat dashboard (Android app configuration)
        // 3. google-services.json (package_name field)
        // Simplified configuration matching the demo approach
        // RevenueCat will automatically handle product ID mapping
        const configOptions = { 
          apiKey,
          // Allow sharing Play Store account - prevents aliasing when restorePurchases is called
          allowSharingPlayStoreAccount: true,
        };
        
        console.log('🔧 Configuring RevenueCat with options:', {
          apiKey: `${apiKey.substring(0, 10)}...`,
          allowSharingPlayStoreAccount: configOptions.allowSharingPlayStoreAccount,
          package: 'com.digaifounder.huda'
        });
        
        await PurchasesModule.configure(configOptions);
        
        console.log('✅ RevenueCat configured successfully');
        console.log(`📦 App package: com.digaifounder.huda`);
        console.log(`🔑 Using API key: ${apiKey.substring(0, 10)}...`);
        console.log(`✅ allowSharingPlayStoreAccount: ${configOptions.allowSharingPlayStoreAccount}`);
      } catch (configureError) {
        // Handle NativeEventEmitter errors gracefully
        if (configureError.message && configureError.message.includes('NativeEventEmitter')) {
          console.error('❌ RevenueCat native module not ready');
          console.error('💡 This usually means the app needs to be rebuilt after installing react-native-purchases');
          console.error('💡 Run: npm install react-native-purchases && npx expo prebuild && npx expo run:ios');
          return false;
        }
        // Ignore customLogHandler errors - this is a known issue with some RevenueCat versions
        // The error doesn't affect functionality, it's just a logging issue
        if (configureError.message && configureError.message.includes('customLogHandler')) {
          console.warn('⚠️ RevenueCat customLogHandler warning (this is harmless and can be ignored)');
          // Continue anyway - RevenueCat should still work
        } else {
          throw configureError;
        }
      }
      
      this.isInitialized = true;

      // Set user ID if user is logged in
      const user = auth.currentUser;
      if (user) {
        await this.identifyUser(user.uid);
      }

      // Listen for auth state changes to update user ID
      auth.onAuthStateChanged(async (user) => {
        if (user) {
          await this.identifyUser(user.uid);
        } else {
          await this.resetUser();
        }
      });

      return true;
    } catch (error) {
      console.error('❌ Error initializing RevenueCat:', error);
      return false;
    }
  }

  /**
   * Check if RevenueCat is initialized
   * @returns {boolean} True if initialized
   */
  get initialized() {
    return this.isInitialized;
  }

  /**
   * Identify user with RevenueCat
   * @param {string} userId - Firebase user ID
   */
  async identifyUser(userId) {
    try {
      if (!this.isInitialized) {
        return;
      }

      const PurchasesModule = await getPurchases();
      if (!PurchasesModule) throw new Error('Purchases module not available');
      await PurchasesModule.logIn(userId);

      // Refresh customer info after identifying
      await this.refreshCustomerInfo();
    } catch (error) {
      console.error('❌ Error identifying user with RevenueCat:', error);
    }
  }

  /**
   * Reset RevenueCat user (on logout)
   */
  async resetUser() {
    try {
      if (!this.isInitialized) {
        return;
      }

      const PurchasesModule = await getPurchases();
      if (!PurchasesModule) return;
      await PurchasesModule.logOut();
      this.customerInfo = null;
      this.offerings = null;
    } catch (error) {
      console.error('❌ Error resetting RevenueCat user:', error);
    }
  }

  /**
   * Get current offerings from RevenueCat
   * Uses the "default" offering identifier explicitly
   * @returns {Promise<Object|null>} Offerings object or null
   */
  async getOfferings() {
    try {
      if (!this.isInitialized) {
        return null;
      }

      const PurchasesModule = await getPurchases();
      if (!PurchasesModule) return null;
      const offerings = await PurchasesModule.getOfferings();
      
      // Explicitly use "default" offering identifier to match RevenueCat dashboard
      // Fallback to offerings.current if "default" is not available
      let targetOffering = null;
      
      if (offerings.all && offerings.all['default']) {
        targetOffering = offerings.all['default'];
        console.log('✅ Using "default" offering from RevenueCat');
      } else if (offerings.current !== null) {
        targetOffering = offerings.current;
        console.log('⚠️ Using current offering (fallback - "default" not found)');
      }
      
      if (targetOffering && targetOffering.availablePackages.length > 0) {
        this.offerings = offerings;
        // Return offerings with current set to the target offering
        return {
          ...offerings,
          current: targetOffering
        };
      } else {
        this.offerings = offerings;
        return offerings;
      }
    } catch (error) {
      console.error('❌ Error fetching offerings:', error);
      return null;
    }
  }

  /**
   * Get offering by placement identifier
   * @param {string} placementIdentifier - Placement identifier
   * @returns {Promise<Object|null>} Offering or null
   */
  async getOfferingForPlacement(placementIdentifier) {
    try {
      if (!this.isInitialized) {
        return null;
      }

      const PurchasesModule = await getPurchases();
      if (!PurchasesModule) return null;
      const offerings = await PurchasesModule.getOfferings();
      
      if (offerings.current !== null) {
        const offering = offerings.current.offeringForPlacement(placementIdentifier);
        if (offering && offering.availablePackages.length !== 0) {
          return offering;
        }
      }
      
      return null;
    } catch (error) {
      console.error('❌ Error fetching offering for placement:', error);
      return null;
    }
  }

  /**
   * Get offering by identifier
   * @param {string} offeringIdentifier - Offering identifier
   * @returns {Promise<Object|null>} Offering or null
   */
  async getOfferingByIdentifier(offeringIdentifier) {
    try {
      if (!this.isInitialized) {
        return null;
      }

      const offerings = await this.getOfferings();
      if (offerings && offerings.all[offeringIdentifier]) {
        const offering = offerings.all[offeringIdentifier];
        if (offering.availablePackages.length !== 0) {
          return offering;
        }
      }
      
      return null;
    } catch (error) {
      console.error('❌ Error fetching offering by identifier:', error);
      return null;
    }
  }

  /**
   * Purchase a package
   * @param {Object} packageToPurchase - RevenueCat Package object
   * @returns {Promise<Object>} Customer info after purchase
   */
  async purchasePackage(packageToPurchase) {
    try {
      if (!this.isInitialized) {
        throw new Error('RevenueCat not initialized');
      }

      if (!packageToPurchase) {
        throw new Error('Package is required');
      }

      const PurchasesModule = await getPurchases();
      if (!PurchasesModule) throw new Error('Purchases module not available');
      
      // Log package info for debugging (simplified like the demo)
      console.log(`🛒 Purchasing package:`, {
        identifier: packageToPurchase.identifier,
        packageType: packageToPurchase.packageType,
        hasStoreProduct: !!packageToPurchase.storeProduct,
        hasProduct: !!packageToPurchase.product,
      });
      
      // On Android, log the product structure to help debug
      if (Platform.OS === 'android' && packageToPurchase.product) {
        console.log(`🔍 Android package product structure:`, {
          identifier: packageToPurchase.product.identifier,
          defaultOptionId: packageToPurchase.product.defaultOption?.id,
          defaultOptionStoreProductId: packageToPurchase.product.defaultOption?.storeProductId,
        });
      }
      
      // Purchase through RevenueCat - let RevenueCat handle product ID mapping automatically
      // The package object contains all necessary information for RevenueCat to make the purchase
      // We don't need to extract product IDs manually - RevenueCat handles this internally
      console.log(`🛒 Calling RevenueCat purchasePackage with package identifier: ${packageToPurchase.identifier}`);
      const { customerInfo } = await PurchasesModule.purchasePackage(packageToPurchase);
      
      this.customerInfo = customerInfo;
      this.notifyListeners(customerInfo);
      
      return customerInfo;
    } catch (error) {
      console.error('❌ Error purchasing package:', error);
      
      // Log detailed error information
      if (error.code) {
        console.error(`   Error code: ${error.code}`);
      }
      if (error.message) {
        console.error(`   Error message: ${error.message}`);
      }
      if (error.underlyingErrorMessage) {
        console.error(`   Underlying error: ${error.underlyingErrorMessage}`);
      }
      
      // Check if user cancelled
      if (error.userCancelled) {
        throw new Error('Purchase cancelled by user');
      }
      
      // Handle product not available error
      if (error.code === 'ProductNotAvailableForPurchaseError' || 
          error.message?.includes('ITEM_UNAVAILABLE') ||
          error.message?.includes('not available for purchase')) {
        console.error(`❌ Product not available for purchase`);
        console.error(`💡 Package identifier: ${packageToPurchase.identifier}`);
        console.error(`💡 Package type: ${packageToPurchase.packageType}`);
        
        // Log Android-specific product info if available
        if (Platform.OS === 'android' && packageToPurchase.product) {
          const productId = packageToPurchase.product.defaultOption?.id || 
                          packageToPurchase.product.identifier || 
                          'unknown';
          console.error(`💡 Android product ID: ${productId}`);
        }
        
        console.error('💡 This usually means:');
        console.error('   1. The product ID in RevenueCat Products doesn\'t match Google Play Console');
        console.error('   2. The product isn\'t active/published in Google Play Console');
        console.error('   3. The base plan ID in RevenueCat doesn\'t match the base plan ID in Google Play Console');
        console.error('   4. The offering/package configuration in RevenueCat is incorrect');
        console.error('💡 Check RevenueCat Dashboard → Products → Your Product → Android configuration');
        console.error('💡 Verify the product ID matches exactly what\'s in Google Play Console');
        
        throw new Error('The subscription product is not available for purchase. Please verify your RevenueCat and Google Play Console configuration match exactly.');
      }
      
      throw error;
    }
  }

  /**
   * Restore purchases
   * @returns {Promise<Object>} Customer info
   */
  async restorePurchases() {
    try {
      if (!this.isInitialized) {
        throw new Error('RevenueCat not initialized');
      }

      const PurchasesModule = await getPurchases();
      if (!PurchasesModule) throw new Error('Purchases module not available');
      
      // Temporarily suppress console.error to catch the customLogHandler error
      // This is a known issue with react-native-purchases where it tries to call
      // customLogHandler internally but it's not always available
      const originalError = console.error;
      console.error = (...args) => {
        const errorMsg = args.join(' ');
        // Filter out the customLogHandler error as it's harmless
        if (errorMsg.includes('customLogHandler') && errorMsg.includes('not a function')) {
          // Silently ignore this specific error - it doesn't affect functionality
          return;
        }
        originalError(...args);
      };
      
      try {
        const customerInfo = await PurchasesModule.restorePurchases();
        // Restore original console.error
        console.error = originalError;
        
        this.customerInfo = customerInfo;
        this.notifyListeners(customerInfo);
        
        return customerInfo;
      } catch (restoreError) {
        // Restore original console.error before handling the error
        console.error = originalError;
        throw restoreError;
      }
    } catch (error) {
      // Only log if it's not the customLogHandler error
      if (!error.message || !error.message.includes('customLogHandler')) {
        console.error('❌ Error restoring purchases:', error);
      }
      throw error;
    }
  }

  /**
   * Get current customer info (may use cache)
   * @returns {Promise<Object>} Customer info
   */
  async getCustomerInfo() {
    try {
      if (!this.isInitialized) {
        return null;
      }

      const PurchasesModule = await getPurchases();
      if (!PurchasesModule) return null;
      const customerInfo = await PurchasesModule.getCustomerInfo();
      this.customerInfo = customerInfo;
      
      return customerInfo;
    } catch (error) {
      console.error('❌ Error fetching customer info:', error);
      return null;
    }
  }

  /**
   * Refresh customer info from RevenueCat (bypasses cache)
   * @returns {Promise<Object>} Customer info
   */
  async refreshCustomerInfo() {
    try {
      if (!this.isInitialized) {
        console.log('⚠️ RevenueCat not initialized, cannot refresh');
        return null;
      }

      console.log('🔄 RevenueCat: Refreshing customer info from server (no cache)...');
      const PurchasesModule = await getPurchases();
      if (!PurchasesModule) {
        console.log('⚠️ RevenueCat module not available');
        return null;
      }
      
      // First, try restorePurchases which forces a full refresh from RevenueCat servers
      try {
        console.log('🔄 RevenueCat: Restoring purchases to force server refresh...');
        const restoredCustomerInfo = await PurchasesModule.restorePurchases();
        if (restoredCustomerInfo) {
          console.log('✅ RevenueCat: Purchases restored, got fresh customer info');
          this.customerInfo = restoredCustomerInfo;
          this.notifyListeners(restoredCustomerInfo);
          
          // Log entitlement details for debugging
          const premiumEntitlement = restoredCustomerInfo.entitlements?.active?.[PREMIUM_ENTITLEMENT_ID];
          console.log('🔍 RevenueCat: Premium entitlement after restore:', premiumEntitlement ? 'FOUND' : 'NOT FOUND');
          if (premiumEntitlement) {
            console.log('🔍 RevenueCat: Premium entitlement details:', {
              identifier: premiumEntitlement.identifier,
              productIdentifier: premiumEntitlement.productIdentifier,
              willRenew: premiumEntitlement.willRenew,
              periodType: premiumEntitlement.periodType
            });
          }
          
          return restoredCustomerInfo;
        }
      } catch (restoreError) {
        console.log('⚠️ RevenueCat: Restore purchases failed, trying sync:', restoreError.message);
      }
      
      // Fallback: Use syncPurchases to force refresh from RevenueCat servers
      try {
        await PurchasesModule.syncPurchases();
        console.log('✅ RevenueCat: Synced purchases with server');
        
        // Wait a bit for the sync to complete and cache to update
        await new Promise(resolve => setTimeout(resolve, 500));
      } catch (syncError) {
        console.log('⚠️ RevenueCat: Sync purchases failed (may not be critical):', syncError.message);
      }
      
      // Get fresh customer info from RevenueCat
      const customerInfo = await PurchasesModule.getCustomerInfo();
      this.customerInfo = customerInfo;
      
      if (customerInfo) {
        // Log entitlement details for debugging
        const premiumEntitlement = customerInfo.entitlements?.active?.[PREMIUM_ENTITLEMENT_ID];
        console.log('🔍 RevenueCat: Premium entitlement after sync:', premiumEntitlement ? 'FOUND' : 'NOT FOUND');
        if (premiumEntitlement) {
          const expirationDate = premiumEntitlement.expirationDate ? new Date(premiumEntitlement.expirationDate) : null;
          const isExpired = expirationDate && expirationDate < new Date();
          const isCancelled = premiumEntitlement.willRenew === false;
          
          console.log('🔍 RevenueCat: Premium entitlement details:', {
            identifier: premiumEntitlement.identifier,
            productIdentifier: premiumEntitlement.productIdentifier,
            willRenew: premiumEntitlement.willRenew,
            periodType: premiumEntitlement.periodType,
            expirationDate: expirationDate ? expirationDate.toISOString() : 'N/A',
            isExpired: isExpired,
            isCancelled: isCancelled,
            status: isExpired ? 'EXPIRED' : (isCancelled ? 'CANCELLED (active until expiration)' : 'ACTIVE')
          });
        } else {
          // Log all entitlements for debugging
          console.log('🔍 RevenueCat: All entitlements:', {
            active: Object.keys(customerInfo.entitlements?.active || {}),
            all: Object.keys(customerInfo.entitlements?.all || {})
          });
        }
        
        this.notifyListeners(customerInfo);
        console.log('✅ RevenueCat: Customer info refreshed from server');
      }
      
      return customerInfo;
    } catch (error) {
      console.error('❌ Error refreshing customer info:', error);
      return null;
    }
  }

  /**
   * Check if user has active subscription
   * @param {boolean} forceRefresh - If true, refresh from RevenueCat before checking
   * @returns {Promise<boolean>} True if user has active subscription
   */
  async hasActiveSubscription(forceRefresh = false) {
    try {
      let customerInfo;
      if (forceRefresh) {
        // Force refresh from RevenueCat servers
        customerInfo = await this.refreshCustomerInfo();
        
        // If refresh didn't work, try one more time with restorePurchases
        const hasPremium = customerInfo && customerInfo.entitlements && customerInfo.entitlements.active && customerInfo.entitlements.active[PREMIUM_ENTITLEMENT_ID];
        if (!customerInfo || !hasPremium) {
          console.log('🔄 RevenueCat: First refresh didn\'t find subscription, trying restorePurchases...');
          try {
            const PurchasesModule = await getPurchases();
            if (PurchasesModule) {
              const restoredInfo = await PurchasesModule.restorePurchases();
              if (restoredInfo) {
                customerInfo = restoredInfo;
                this.customerInfo = restoredInfo;
                console.log('✅ RevenueCat: Got customer info from restorePurchases');
              }
            }
          } catch (restoreError) {
            console.log('⚠️ RevenueCat: restorePurchases also failed:', restoreError.message);
          }
        }
      } else {
        customerInfo = await this.getCustomerInfo();
      }
      
      if (!customerInfo) {
        console.log('⚠️ RevenueCat: No customer info available');
        return false;
      }

      // Check for premium entitlement in active entitlements
      const premiumEntitlement = customerInfo.entitlements?.active?.[PREMIUM_ENTITLEMENT_ID];
      let isSubscribed = false;
      
      console.log('🔍 RevenueCat: Premium entitlement exists:', !!premiumEntitlement);
      
      if (premiumEntitlement) {
        // Check if subscription is expired
        const now = new Date();
        let expirationDate = null;
        
        if (premiumEntitlement.expirationDate) {
          expirationDate = new Date(premiumEntitlement.expirationDate);
        }
        
        // Check if subscription has expired
        const isExpired = expirationDate && expirationDate < now;
        
        // Check if subscription is cancelled (won't renew)
        const isCancelled = premiumEntitlement.willRenew === false;
        
        console.log('🔍 RevenueCat: Premium entitlement details:', {
          identifier: premiumEntitlement.identifier,
          productIdentifier: premiumEntitlement.productIdentifier,
          willRenew: premiumEntitlement.willRenew,
          expirationDate: expirationDate ? expirationDate.toISOString() : 'N/A',
          isExpired: isExpired,
          isCancelled: isCancelled
        });
        
        // Subscription is active if:
        // 1. It's in active entitlements (RevenueCat only puts non-expired entitlements here)
        // 2. It hasn't expired yet (double-check expiration date)
        // 3. Even if cancelled, it's still active until expiration date
        if (isExpired) {
          console.log('❌ RevenueCat: Subscription has EXPIRED');
          isSubscribed = false;
        } else {
          // Subscription is still valid (even if cancelled, it's active until expiration)
          console.log('✅ RevenueCat: Subscription is ACTIVE', isCancelled ? '(but CANCELLED - will not renew)' : '(will renew)');
          isSubscribed = true;
        }
      } else {
        // Log all available entitlements for debugging
        const activeEntitlements = customerInfo.entitlements?.active || {};
        const allEntitlements = customerInfo.entitlements?.all || {};
        const activeProducts = customerInfo.activeSubscriptions || [];
        const allPurchasedProductIds = customerInfo.allPurchasedProductIdentifiers || [];
        
        console.log('🔍 RevenueCat: Available entitlements:', {
          active: Object.keys(activeEntitlements),
          all: Object.keys(allEntitlements)
        });
        console.log('🔍 RevenueCat: Active subscriptions:', activeProducts);
        console.log('🔍 RevenueCat: All purchased product IDs:', allPurchasedProductIds);
        console.log('🔍 RevenueCat: Full customer info structure:', {
          hasEntitlements: !!customerInfo.entitlements,
          entitlementsKeys: customerInfo.entitlements ? Object.keys(customerInfo.entitlements) : [],
          activeKeys: activeEntitlements ? Object.keys(activeEntitlements) : []
        });
        
        // Fallback: Check if premium products are active (even if entitlement is missing)
        // On Android, include actual Android product IDs from RevenueCat (Google Play product IDs)
        // These must match EXACTLY what's configured in Google Play Console
        const premiumProductIds = Platform.OS === 'android' 
          ? [
              // Android product IDs from RevenueCat dashboard (Google Play product IDs)
              'huda-monthly-offer',      // From huda_monthly_offer:huda-monthly-offer
              'huda-monthly',            // From huda_monthly:huda-monthly
              'hud-yealry-offer',        // From huda_yearly:hud-yealry-offer (note: typo in RevenueCat)
              'huda-yearly',             // From huda_yealry_offer:huda-yearly
              // Keep iOS IDs for backwards compatibility
              'premium_monthly_999', 
              'premium_yearly_80', 
              'premium_monthly_promo', 
              'premium_yearly_offer'
            ]
          : ['premium_monthly_999', 'premium_yearly_80', 'premium_monthly_promo', 'premium_yearly_offer'];
        const hasActivePremiumProduct = activeProducts.some(productId => premiumProductIds.includes(productId));
        const hasPurchasedProduct = allPurchasedProductIds.some(productId => premiumProductIds.includes(productId));
        
        if (hasActivePremiumProduct) {
          // Product is in active subscriptions - check if it's expired
          // Note: activeSubscriptions should only contain non-expired subscriptions
          // But we'll use it as a fallback if entitlement is missing
          console.warn(`⚠️ RevenueCat: Premium product is active but entitlement "${PREMIUM_ENTITLEMENT_ID}" is missing!`);
          console.warn(`⚠️ This suggests the entitlement "${PREMIUM_ENTITLEMENT_ID}" is not properly configured in RevenueCat dashboard.`);
          console.warn('⚠️ Using product check as fallback - user has active premium subscription.');
          // Use product check as fallback if entitlement is missing
          // activeSubscriptions should only contain non-expired subscriptions
          isSubscribed = true;
        } else if (hasPurchasedProduct) {
          // Product was purchased but not in active subscriptions - likely expired or cancelled
          console.warn('⚠️ RevenueCat: Premium product was purchased but is not currently active (likely expired or cancelled).');
          isSubscribed = false;
        } else {
          // No premium product found at all
          isSubscribed = false;
        }
      }
      
      console.log('🔍 RevenueCat: Final subscription check result:', isSubscribed);
      return isSubscribed;
    } catch (error) {
      console.error('❌ Error checking subscription status:', error);
      return false;
    }
  }

  /**
   * Get active subscription product identifier
   * @returns {Promise<string|null>} Product identifier or null
   */
  async getActiveSubscriptionProductId() {
    try {
      const customerInfo = await this.getCustomerInfo();
      if (!customerInfo) {
        return null;
      }

      const premiumEntitlement = customerInfo.entitlements.active[PREMIUM_ENTITLEMENT_ID];
      if (premiumEntitlement) {
        return premiumEntitlement.productIdentifier;
      }

      return null;
    } catch (error) {
      console.error('❌ Error getting active subscription product ID:', error);
      return null;
    }
  }

  /**
   * Add listener for customer info updates
   * @param {Function} callback - Callback function
   */
  addListener(callback) {
    this.listeners.push(callback);
  }

  /**
   * Remove listener
   * @param {Function} callback - Callback function to remove
   */
  removeListener(callback) {
    this.listeners = this.listeners.filter(listener => listener !== callback);
  }

  /**
   * Notify all listeners
   * @param {Object} customerInfo - Customer info
   */
  notifyListeners(customerInfo) {
    const premiumEntitlement = customerInfo?.entitlements?.active?.[PREMIUM_ENTITLEMENT_ID];
    let isSubscribed = false;
    
    if (premiumEntitlement) {
      // Check if subscription is expired
      const now = new Date();
      const expirationDate = premiumEntitlement.expirationDate ? new Date(premiumEntitlement.expirationDate) : null;
      const isExpired = expirationDate && expirationDate < now;
      
      // Subscription is active if it exists in active entitlements and hasn't expired
      isSubscribed = !isExpired;
      
      if (isExpired) {
        console.log('❌ RevenueCat: Subscription EXPIRED - notifying listeners as not subscribed');
      } else if (premiumEntitlement.willRenew === false) {
        console.log('⚠️ RevenueCat: Subscription CANCELLED but still active until expiration');
      }
    }
    
    this.listeners.forEach(listener => {
      try {
        listener(isSubscribed, customerInfo);
      } catch (error) {
        console.error('❌ Error in RevenueCat listener:', error);
      }
    });
  }

  /**
   * Cleanup
   */
  async cleanup() {
    try {
      this.isInitialized = false;
      this.offerings = null;
      this.customerInfo = null;
      this.listeners = [];
    } catch (error) {
      console.error('❌ Error cleaning up RevenueCat service:', error);
    }
  }
}

export default new RevenueCatService();

