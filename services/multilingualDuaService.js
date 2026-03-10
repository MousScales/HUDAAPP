import { getCurrentLanguage } from '../utils/useLanguage';

// Import all language versions of dua files
import dailyDuasEn from '../data/duas/daily.json';
import foodDuasEn from '../data/duas/food.json';
import emotionalDuasEn from '../data/duas/emotional.json';
import travelDuasEn from '../data/duas/travel.json';
import spiritualDuasEn from '../data/duas/spiritual.json';
import sleepDuasEn from '../data/duas/sleep.json';
import protectionDuasEn from '../data/duas/protection.json';

// Import Spanish versions (to be created gradually)
import dailyDuasEs from '../data/duas/es/daily.json';
import foodDuasEs from '../data/duas/es/food.json';
import emotionalDuasEs from '../data/duas/es/emotional.json';
import travelDuasEs from '../data/duas/es/travel.json';
import spiritualDuasEs from '../data/duas/es/spiritual.json';
import sleepDuasEs from '../data/duas/es/sleep.json';
import protectionDuasEs from '../data/duas/es/protection.json';

// Import French versions (to be created gradually)
import dailyDuasFr from '../data/duas/fr/daily.json';
import foodDuasFr from '../data/duas/fr/food.json';
import emotionalDuasFr from '../data/duas/fr/emotional.json';
import travelDuasFr from '../data/duas/fr/travel.json';
import spiritualDuasFr from '../data/duas/fr/spiritual.json';
import sleepDuasFr from '../data/duas/fr/sleep.json';
import protectionDuasFr from '../data/duas/fr/protection.json';

// Import Italian versions (to be created gradually)
import dailyDuasIt from '../data/duas/it/daily.json';
import foodDuasIt from '../data/duas/it/food.json';
import emotionalDuasIt from '../data/duas/it/emotional.json';
import travelDuasIt from '../data/duas/it/travel.json';
import spiritualDuasIt from '../data/duas/it/spiritual.json';
import sleepDuasIt from '../data/duas/it/sleep.json';
import protectionDuasIt from '../data/duas/it/protection.json';

// Map of dua files by language
const duaFiles = {
  english: {
    daily: dailyDuasEn,
    food: foodDuasEn,
    emotional: emotionalDuasEn,
    travel: travelDuasEn,
    spiritual: spiritualDuasEn,
    sleep: sleepDuasEn,
    protection: protectionDuasEn,
  },
  // For now, all other languages fall back to English
  // As multilingual files are created, they can be uncommented and added here
  spanish: {
    daily: dailyDuasEs, // Spanish daily duas now available
    food: foodDuasEs, // Spanish food duas now available
    emotional: emotionalDuasEs, // Spanish emotional duas now available
    travel: travelDuasEs, // Spanish travel duas now available
    spiritual: spiritualDuasEs, // Spanish spiritual duas now available
    sleep: sleepDuasEs, // Spanish sleep duas now available
    protection: protectionDuasEs, // Spanish protection duas now available
  },
  french: {
    daily: dailyDuasFr, // French daily duas now available
    food: foodDuasFr, // French food duas now available
    emotional: emotionalDuasFr, // French emotional duas now available
    travel: travelDuasFr, // French travel duas now available
    spiritual: spiritualDuasFr, // French spiritual duas now available
    sleep: sleepDuasFr, // French sleep duas now available
    protection: protectionDuasFr, // French protection duas now available
  },
  italian: {
    daily: dailyDuasIt, // Italian daily duas now available
    food: foodDuasIt, // Italian food duas now available
    emotional: emotionalDuasIt, // Italian emotional duas now available
    travel: travelDuasIt, // Italian travel duas now available
    spiritual: spiritualDuasIt, // Italian spiritual duas now available
    sleep: sleepDuasIt, // Italian sleep duas now available
    protection: protectionDuasIt, // Italian protection duas now available
  },
};

// Function to get dua content for a specific language
export const getDuaContent = async (category = 'all', language = null) => {
  try {
    const currentLanguage = language || await getCurrentLanguage();
    
    console.log('🌍 multilingualDuaService: Requested language:', currentLanguage);
    
    // Get the appropriate language files
    const languageFiles = duaFiles[currentLanguage] || duaFiles.english;
    
    if (category === 'all') {
      // Return all duas from all categories
      const allDuas = [];
      Object.keys(languageFiles).forEach(cat => {
        const categoryData = languageFiles[cat];
        if (categoryData && categoryData.duas) {
          allDuas.push(...categoryData.duas.map(dua => ({
            ...dua,
            // Map the translation field correctly based on language
            english: dua.english, // The translation is always in the english field for all languages
            translation: dua.english, // Add translation field as well for compatibility
            category: cat
          })));
        }
      });
      return allDuas;
    } else {
      // Return duas from specific category
      const categoryData = languageFiles[category];
      if (categoryData && categoryData.duas) {
        return categoryData.duas.map(dua => ({
          ...dua,
          // Map the translation field correctly based on language
          english: dua.english, // The translation is always in the english field for all languages
          translation: dua.english, // Add translation field as well for compatibility
          category: category
        }));
      }
      return [];
    }
  } catch (error) {
    console.error('Error loading dua content:', error);
    // Fallback to English
    return getDuaContent(category, 'english');
  }
};

// Function to get a specific dua by ID
export const getDuaById = async (id, language = null) => {
  try {
    const currentLanguage = language || await getCurrentLanguage();
    const languageFiles = duaFiles[currentLanguage] || duaFiles.english;
    
    for (const category in languageFiles) {
      const categoryData = languageFiles[category];
      if (categoryData && categoryData.duas) {
        const dua = categoryData.duas.find(d => d.id === id);
        if (dua) {
          return { ...dua, category };
        }
      }
    }
    return null;
  } catch (error) {
    console.error('Error loading specific dua:', error);
    return null;
  }
};

// Function to search duas
export const searchDuas = async (query, language = null) => {
  try {
    const currentLanguage = language || await getCurrentLanguage();
    const allDuas = await getDuaContent('all', currentLanguage);
    
    const searchTerm = query.toLowerCase();
    return allDuas.filter(dua => 
      dua.title?.toLowerCase().includes(searchTerm) ||
      dua.arabic?.toLowerCase().includes(searchTerm) ||
      dua.english?.toLowerCase().includes(searchTerm) ||
      dua.transliteration?.toLowerCase().includes(searchTerm) ||
      dua.benefits?.toLowerCase().includes(searchTerm) ||
      dua.occasion?.toLowerCase().includes(searchTerm) ||
      dua.source?.toLowerCase().includes(searchTerm)
    );
  } catch (error) {
    console.error('Error searching duas:', error);
    return [];
  }
};

// Function to get categories
export const getDuaCategories = async (language = null) => {
  try {
    const currentLanguage = language || await getCurrentLanguage();
    const languageFiles = duaFiles[currentLanguage] || duaFiles.english;
    
    return Object.keys(languageFiles).map(category => ({
      id: category,
      name: languageFiles[category]?.name || category,
      description: languageFiles[category]?.description || '',
      count: languageFiles[category]?.duas?.length || 0
    }));
  } catch (error) {
    console.error('Error loading dua categories:', error);
    return [];
  }
}; 