import React, { createContext, useContext, useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getCurrentLanguage, setCurrentLanguage } from './translations';

const LanguageContext = createContext();

export const useLanguageContext = () => {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useLanguageContext must be used within a LanguageProvider');
  }
  return context;
};

export const LanguageProvider = ({ children }) => {
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

  const value = {
    currentLanguage,
    isLoading,
    changeLanguage,
  };

  return (
    <LanguageContext.Provider value={value}>
      {children}
    </LanguageContext.Provider>
  );
}; 