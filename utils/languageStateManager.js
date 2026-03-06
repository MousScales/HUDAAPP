import React from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Alert } from 'react-native';

// Language state manager to ensure consistent language across the app
class LanguageStateManager {
  constructor() {
    this.currentLanguage = 'english';
    this.listeners = [];
    this.isInitialized = false;
  }

  // Initialize the language manager
  async initialize() {
    try {
      const savedLanguage = await AsyncStorage.getItem('userLanguage');
      this.currentLanguage = savedLanguage || 'english';
      this.isInitialized = true;
      console.log('🌍 LanguageStateManager: Initialized with language:', this.currentLanguage);
    } catch (error) {
      console.error('❌ LanguageStateManager: Error initializing:', error);
      this.currentLanguage = 'english';
      this.isInitialized = true;
    }
  }

  // Get current language
  getCurrentLanguage() {
    return this.currentLanguage;
  }

  // Set language and notify all listeners
  async setLanguage(newLanguage) {
    try {
      await AsyncStorage.setItem('userLanguage', newLanguage);
      this.currentLanguage = newLanguage;
      
      // Notify all listeners
      this.listeners.forEach(listener => {
        if (typeof listener === 'function') {
          listener(newLanguage);
        }
      });
      
      console.log('🌍 LanguageStateManager: Language changed to:', newLanguage);
      return true;
    } catch (error) {
      console.error('❌ LanguageStateManager: Error setting language:', error);
      return false;
    }
  }

  // Add a listener for language changes
  addListener(listener) {
    this.listeners.push(listener);
    return () => {
      const index = this.listeners.indexOf(listener);
      if (index > -1) {
        this.listeners.splice(index, 1);
      }
    };
  }

  // Force refresh all components that depend on language
  async forceRefresh() {
    console.log('🔄 LanguageStateManager: Forcing refresh of all language-dependent components');
    
    // Clear any cached content that might be language-dependent
    try {
      // Clear daily content cache
      await AsyncStorage.removeItem('dailyContentCache');
      await AsyncStorage.removeItem('prayerTimesCache');
      await AsyncStorage.removeItem('dhikrCache');
      await AsyncStorage.removeItem('duaCache');
      
      console.log('✅ LanguageStateManager: Cleared language-dependent caches');
    } catch (error) {
      console.error('❌ LanguageStateManager: Error clearing caches:', error);
    }
    
    // Notify all listeners to refresh
    this.listeners.forEach(listener => {
      if (typeof listener === 'function') {
        listener(this.currentLanguage);
      }
    });
  }

  // Check if language is properly initialized
  isReady() {
    return this.isInitialized;
  }

  // Get language with fallback
  getLanguageWithFallback(preferredLanguage) {
    if (!preferredLanguage || !this.isInitialized) {
      return this.currentLanguage;
    }
    return preferredLanguage;
  }
}

// Create singleton instance
const languageStateManager = new LanguageStateManager();

// Initialize on import
languageStateManager.initialize();

export default languageStateManager;

// Hook for components to use
export const useLanguageState = () => {
  const [currentLanguage, setCurrentLanguageState] = React.useState(languageStateManager.getCurrentLanguage());
  const [isLoading, setIsLoading] = React.useState(!languageStateManager.isReady());

  React.useEffect(() => {
    // Set initial state
    setCurrentLanguageState(languageStateManager.getCurrentLanguage());
    setIsLoading(!languageStateManager.isReady());

    // Add listener for language changes
    const unsubscribe = languageStateManager.addListener((newLanguage) => {
      setCurrentLanguageState(newLanguage);
      setIsLoading(false);
    });

    return unsubscribe;
  }, []);

  const changeLanguage = async (newLanguage) => {
    setIsLoading(true);
    const success = await languageStateManager.setLanguage(newLanguage);
    
    if (success) {
      // Show notification in the new language
      Alert.alert(
        'Language Updated',
        'Your language preference has been updated. Some changes may require an app restart to take effect.',
        [{ text: 'OK' }]
      );
    }
    
    setIsLoading(false);
    return success;
  };

  return {
    currentLanguage,
    isLoading,
    changeLanguage,
    forceRefresh: languageStateManager.forceRefresh.bind(languageStateManager)
  };
}; 