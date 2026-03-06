import revenueCatService from './revenueCatService';

class SubscriptionGuard {
  constructor() {
    this.isChecking = false;
    this.lastCheck = null;
    this.checkInterval = 60 * 1000; // 1 minute
    this.cachedResult = undefined; // Cache the subscription result
  }

  // Check subscription status with caching (RevenueCat only)
  async checkSubscriptionStatus() {
    try {
      // Don't check too frequently - but return cached result instead of assuming true
      const now = Date.now();
      if (this.lastCheck && (now - this.lastCheck) < this.checkInterval && this.cachedResult !== undefined) {
        return this.cachedResult;
      }

      // Prevent concurrent checks - return cached result if available
      if (this.isChecking) {
        if (this.cachedResult !== undefined) {
          return this.cachedResult;
        } else {
          return false;
        }
      }

      this.isChecking = true;
      
      // Check RevenueCat only
      const isSubscribed = await revenueCatService.hasActiveSubscription();
      
      this.lastCheck = now;
      this.cachedResult = isSubscribed; // Cache the result
      this.isChecking = false;
      
      return isSubscribed;
    } catch (error) {
      console.error('❌ SubscriptionGuard: Error checking status:', error);
      this.isChecking = false;
      return false;
    }
  }

  // Force check subscription status (ignores cache, refreshes from RevenueCat)
  async forceCheckSubscriptionStatus() {
    try {
      this.isChecking = true;
      
      // Force refresh customer info from RevenueCat (bypass cache)
      console.log('🔄 SubscriptionGuard: Force refreshing from RevenueCat (no cache)...');
      await revenueCatService.refreshCustomerInfo();
      
      // Check RevenueCat directly with forceRefresh flag (fresh data, no cache)
      const isSubscribed = await revenueCatService.hasActiveSubscription(true);
      
      console.log('✅ SubscriptionGuard: RevenueCat check result:', isSubscribed);
      
      this.lastCheck = Date.now();
      this.cachedResult = isSubscribed; // Cache the result
      this.isChecking = false;
      
      return isSubscribed;
    } catch (error) {
      console.error('❌ SubscriptionGuard: Error force checking status:', error);
      this.isChecking = false;
      return false;
    }
  }

  // Check if user should be redirected to subscription screen
  async shouldRedirectToSubscription() {
    const isSubscribed = await this.checkSubscriptionStatus();
    return !isSubscribed;
  }

  // Get current checking status
  isCurrentlyChecking() {
    return this.isChecking;
  }

  // Get last check time
  getLastCheckTime() {
    return this.lastCheck;
  }

  // Debug: Reset cache state
  resetCache() {
    this.lastCheck = null;
    this.isChecking = false;
    this.cachedResult = undefined;
  }
}

export default new SubscriptionGuard(); 