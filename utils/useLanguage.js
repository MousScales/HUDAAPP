import { useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getCurrentLanguage, setCurrentLanguage } from './translations';

export const useLanguage = () => {
  const [currentLanguage, setCurrentLanguageState] = useState('english');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadLanguage();
  }, []);

  const loadLanguage = async () => {
    try {
      const language = await getCurrentLanguage();
      setCurrentLanguageState(language);
    } catch (error) {
      console.error('Error loading language:', error);
      setCurrentLanguageState('english');
    } finally {
      setIsLoading(false);
    }
  };

  const changeLanguage = async (newLanguage) => {
    try {
      await setCurrentLanguage(newLanguage);
      setCurrentLanguageState(newLanguage);
      return true;
    } catch (error) {
      console.error('Error changing language:', error);
      return false;
    }
  };

  return {
    currentLanguage,
    isLoading,
    changeLanguage,
  };
}; 