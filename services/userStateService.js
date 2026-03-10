import AsyncStorage from '@react-native-async-storage/async-storage';

/**
 * User State Management Service
 * Handles user authentication state persistence and management
 */
class UserStateService {
  constructor() {
    this.userStateKeys = [
      'userProfile',
      'userLoggedIn',
      'hasCompletedOnboarding',
      'userLanguage'
    ];
  }

  /**
   * Save complete user state to AsyncStorage
   * @param {Object} userProfile - Complete user profile data
   * @param {boolean} hasCompletedOnboarding - Whether user completed onboarding
   * @param {string} language - User's preferred language
   */
  async saveUserState(userProfile, hasCompletedOnboarding = true, language = 'en') {
    try {
      console.log('💾 UserStateService: Saving user state...');
      
      // Save user profile
      if (userProfile) {
        await AsyncStorage.setItem('userProfile', JSON.stringify(userProfile));
        console.log('✅ User profile saved');
      }
      
      // Save authentication state
      await AsyncStorage.setItem('userLoggedIn', 'true');
      await AsyncStorage.setItem('hasCompletedOnboarding', hasCompletedOnboarding.toString());
      await AsyncStorage.setItem('userLanguage', language);
      
      console.log('✅ User state saved successfully');
      return true;
    } catch (error) {
      console.error('❌ UserStateService: Error saving user state:', error);
      return false;
    }
  }

  /**
   * Clear only user-specific data, preserving app settings
   */
  async clearUserState() {
    try {
      console.log('🗑️ UserStateService: Clearing user state...');
      
      await AsyncStorage.multiRemove(this.userStateKeys);
      console.log('✅ User state cleared (app settings preserved)');
      return true;
    } catch (error) {
      console.error('❌ UserStateService: Error clearing user state:', error);
      return false;
    }
  }

  /**
   * Get current user state from AsyncStorage
   * @returns {Object} User state object
   */
  async getUserState() {
    try {
      console.log('🔍 UserStateService: Getting user state...');
      
      const [userProfile, hasCompletedOnboarding, userLoggedIn, userLanguage] = await Promise.all([
        AsyncStorage.getItem('userProfile'),
        AsyncStorage.getItem('hasCompletedOnboarding'),
        AsyncStorage.getItem('userLoggedIn'),
        AsyncStorage.getItem('userLanguage')
      ]);

      const state = {
        userProfile: userProfile ? JSON.parse(userProfile) : null,
        hasCompletedOnboarding: hasCompletedOnboarding === 'true',
        userLoggedIn: userLoggedIn === 'true',
        userLanguage: userLanguage || 'en'
      };

      console.log('📋 User state retrieved:', {
        hasUserProfile: !!state.userProfile,
        hasCompletedOnboarding: state.hasCompletedOnboarding,
        userLoggedIn: state.userLoggedIn,
        userLanguage: state.userLanguage
      });

      return state;
    } catch (error) {
      console.error('❌ UserStateService: Error getting user state:', error);
      return {
        userProfile: null,
        hasCompletedOnboarding: false,
        userLoggedIn: false,
        userLanguage: 'en'
      };
    }
  }

  /**
   * Check if user has completed onboarding
   * @returns {boolean} True if user completed onboarding
   */
  async hasCompletedOnboarding() {
    try {
      const hasCompleted = await AsyncStorage.getItem('hasCompletedOnboarding');
      return hasCompleted === 'true';
    } catch (error) {
      console.error('❌ UserStateService: Error checking onboarding status:', error);
      return false;
    }
  }

  /**
   * Check if user is logged in
   * @returns {boolean} True if user is logged in
   */
  async isUserLoggedIn() {
    try {
      const userLoggedIn = await AsyncStorage.getItem('userLoggedIn');
      return userLoggedIn === 'true';
    } catch (error) {
      console.error('❌ UserStateService: Error checking login status:', error);
      return false;
    }
  }

  /**
   * Update user profile data
   * @param {Object} profileData - Profile data to update
   */
  async updateUserProfile(profileData) {
    try {
      console.log('🔄 UserStateService: Updating user profile...');
      
      const currentProfile = await AsyncStorage.getItem('userProfile');
      const existingProfile = currentProfile ? JSON.parse(currentProfile) : {};
      
      const updatedProfile = {
        ...existingProfile,
        ...profileData,
        lastUpdated: new Date().toISOString()
      };
      
      await AsyncStorage.setItem('userProfile', JSON.stringify(updatedProfile));
      console.log('✅ User profile updated');
      return true;
    } catch (error) {
      console.error('❌ UserStateService: Error updating user profile:', error);
      return false;
    }
  }

  /**
   * Get user profile data
   * @returns {Object|null} User profile or null if not found
   */
  async getUserProfile() {
    try {
      const userProfile = await AsyncStorage.getItem('userProfile');
      return userProfile ? JSON.parse(userProfile) : null;
    } catch (error) {
      console.error('❌ UserStateService: Error getting user profile:', error);
      return null;
    }
  }

  /**
   * Clear all app data (use with caution)
   * This should only be used for complete app reset
   */
  async clearAllData() {
    try {
      console.log('🗑️ UserStateService: Clearing ALL app data...');
      await AsyncStorage.clear();
      console.log('✅ All app data cleared');
      return true;
    } catch (error) {
      console.error('❌ UserStateService: Error clearing all data:', error);
      return false;
    }
  }
}

export default new UserStateService();
