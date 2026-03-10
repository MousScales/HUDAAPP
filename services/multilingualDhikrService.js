import { getCurrentLanguage } from '../utils/useLanguage';

// Import all language versions of dhikr files
import morningDhikrEn from '../data/dhikr/morning.json';
import eveningDhikrEn from '../data/dhikr/evening.json';
import generalDhikrEn from '../data/dhikr/general.json';
import afterPrayerDhikrEn from '../data/dhikr/afterPrayer.json';
import istighfarDhikrEn from '../data/dhikr/istighfar.json';
import sleepDhikrEn from '../data/dhikr/sleep.json';
import travelDhikrEn from '../data/dhikr/travel.json';
import protectionDhikrEn from '../data/dhikr/protection.json';

// Import Spanish versions
import morningDhikrEs from '../data/dhikr/es/morning.json';
import eveningDhikrEs from '../data/dhikr/es/evening.json';
import generalDhikrEs from '../data/dhikr/es/general.json';
import afterPrayerDhikrEs from '../data/dhikr/es/afterPrayer.json';
import istighfarDhikrEs from '../data/dhikr/es/istighfar.json';
import sleepDhikrEs from '../data/dhikr/es/sleep.json';
import travelDhikrEs from '../data/dhikr/es/travel.json';
import protectionDhikrEs from '../data/dhikr/es/protection.json';

// Import French versions
import morningDhikrFr from '../data/dhikr/fr/morning.json';
import eveningDhikrFr from '../data/dhikr/fr/evening.json';
import generalDhikrFr from '../data/dhikr/fr/general.json';
import afterPrayerDhikrFr from '../data/dhikr/fr/afterPrayer.json';
import istighfarDhikrFr from '../data/dhikr/fr/istighfar.json';
import sleepDhikrFr from '../data/dhikr/fr/sleep.json';
import travelDhikrFr from '../data/dhikr/fr/travel.json';
import protectionDhikrFr from '../data/dhikr/fr/protection.json';

// Import Italian versions
import morningDhikrIt from '../data/dhikr/it/morning.json';
import eveningDhikrIt from '../data/dhikr/it/evening.json';
import generalDhikrIt from '../data/dhikr/it/general.json';
import afterPrayerDhikrIt from '../data/dhikr/it/afterPrayer.json';
import istighfarDhikrIt from '../data/dhikr/it/istighfar.json';
import sleepDhikrIt from '../data/dhikr/it/sleep.json';
import travelDhikrIt from '../data/dhikr/it/travel.json';
import protectionDhikrIt from '../data/dhikr/it/protection.json';

// Map of dhikr files by language (for now, all languages use English files)
const dhikrFiles = {
  english: {
    morning: morningDhikrEn,
    evening: eveningDhikrEn,
    general: generalDhikrEn,
    afterPrayer: afterPrayerDhikrEn,
    istighfar: istighfarDhikrEn,
    sleep: sleepDhikrEn,
    travel: travelDhikrEn,
    protection: protectionDhikrEn,
  },
  // For now, all other languages fall back to English
  // As multilingual files are created, they can be added here
  spanish: {
    morning: morningDhikrEs, // Spanish morning dhikr now available
    evening: eveningDhikrEs, // Spanish evening dhikr now available
    general: generalDhikrEs, // Spanish general dhikr now available
    afterPrayer: afterPrayerDhikrEs, // Spanish afterPrayer dhikr now available
    istighfar: istighfarDhikrEs, // Spanish istighfar dhikr now available
    sleep: sleepDhikrEs, // Spanish sleep dhikr now available
    travel: travelDhikrEs, // Spanish travel dhikr now available
    protection: protectionDhikrEs, // Spanish protection dhikr now available
  },
  french: {
    morning: morningDhikrFr, // French morning dhikr now available
    evening: eveningDhikrFr, // French evening dhikr now available
    general: generalDhikrFr, // French general dhikr now available
    afterPrayer: afterPrayerDhikrFr, // French afterPrayer dhikr now available
    istighfar: istighfarDhikrFr, // French istighfar dhikr now available
    sleep: sleepDhikrFr, // French sleep dhikr now available
    travel: travelDhikrFr, // French travel dhikr now available
    protection: protectionDhikrFr, // French protection dhikr now available
  },
  italian: {
    morning: morningDhikrIt, // Italian morning dhikr now available
    evening: eveningDhikrIt, // Italian evening dhikr now available
    general: generalDhikrIt, // Italian general dhikr now available
    afterPrayer: afterPrayerDhikrIt, // Italian afterPrayer dhikr now available
    istighfar: istighfarDhikrIt, // Italian istighfar dhikr now available
    sleep: sleepDhikrIt, // Italian sleep dhikr now available
    travel: travelDhikrIt, // Italian travel dhikr now available
    protection: protectionDhikrIt, // Italian protection dhikr now available
  },
};

// Function to get dhikr content for a specific language
export const getDhikrContent = async (category = 'all', language = null) => {
  try {
    const currentLanguage = language || await getCurrentLanguage();
    
    // Get the appropriate language files
    const languageFiles = dhikrFiles[currentLanguage] || dhikrFiles.english;
    
    if (category === 'all') {
      // Return all dhikr from all categories
      const allDhikr = [];
      console.log('🔍 multilingualDhikrService: Processing categories:', Object.keys(languageFiles));
      
      Object.keys(languageFiles).forEach(cat => {
        const categoryData = languageFiles[cat];
        console.log(`🔍 multilingualDhikrService: Category ${cat}:`, {
          hasData: !!categoryData,
          hasDhikr: !!(categoryData && categoryData.dhikr),
          hasDhikrs: !!(categoryData && categoryData.dhikrs),
          dataKeys: categoryData ? Object.keys(categoryData) : []
        });
        
        if (categoryData && (categoryData.dhikr || categoryData.dhikrs)) {
          const dhikrArray = categoryData.dhikr || categoryData.dhikrs;
          console.log(`✅ multilingualDhikrService: Found ${dhikrArray.length} dhikr in category ${cat}`);
          allDhikr.push(...dhikrArray.map(dhikr => ({
            ...dhikr,
            // Create unique ID by combining category and original ID
            id: `${cat}-${dhikr.id}`,
            originalId: dhikr.id, // Keep original ID for reference
            // Standardize field names - use 'translation' for the English/local language text
            translation: dhikr.translation || dhikr.english,
            category: cat
          })));
        }
      });
      
      console.log(`🎯 multilingualDhikrService: Total dhikr found: ${allDhikr.length}`);
      return allDhikr;
    } else {
      // Return dhikr from specific category
      const categoryData = languageFiles[category];
      if (categoryData && (categoryData.dhikr || categoryData.dhikrs)) {
        const dhikrArray = categoryData.dhikr || categoryData.dhikrs;
        return dhikrArray.map(dhikr => ({
          ...dhikr,
          // Create unique ID by combining category and original ID
          id: `${category}-${dhikr.id}`,
          originalId: dhikr.id, // Keep original ID for reference
          // Standardize field names - use 'translation' for the English/local language text
          translation: dhikr.translation || dhikr.english,
          category: category
        }));
      }
      return [];
    }
  } catch (error) {
    console.error('Error loading dhikr content:', error);
    // Fallback to English
    return getDhikrContent(category, 'english');
  }
};

// Function to get a specific dhikr by ID
export const getDhikrById = async (id, language = null) => {
  try {
    const currentLanguage = language || await getCurrentLanguage();
    const languageFiles = dhikrFiles[currentLanguage] || dhikrFiles.english;
    
    for (const category in languageFiles) {
      const categoryData = languageFiles[category];
      if (categoryData && (categoryData.dhikr || categoryData.dhikrs)) {
        const dhikrArray = categoryData.dhikr || categoryData.dhikrs;
        // Check both original ID and the new composite ID format
        const dhikr = dhikrArray.find(d => d.id === id || `${category}-${d.id}` === id);
        if (dhikr) {
          return { 
            ...dhikr, 
            id: `${category}-${dhikr.id}`,
            originalId: dhikr.id,
            translation: dhikr.translation || dhikr.english,
            category 
          };
        }
      }
    }
    return null;
  } catch (error) {
    console.error('Error loading specific dhikr:', error);
    return null;
  }
};

// Function to search dhikr
export const searchDhikr = async (query, language = null) => {
  try {
    const currentLanguage = language || await getCurrentLanguage();
    const allDhikr = await getDhikrContent('all', currentLanguage);
    
    const searchTerm = query.toLowerCase();
    return allDhikr.filter(dhikr => 
      dhikr.title?.toLowerCase().includes(searchTerm) ||
      dhikr.arabic?.toLowerCase().includes(searchTerm) ||
      dhikr.transliteration?.toLowerCase().includes(searchTerm) ||
      dhikr.translation?.toLowerCase().includes(searchTerm) ||
      dhikr.english?.toLowerCase().includes(searchTerm) ||
      dhikr.benefits?.toLowerCase().includes(searchTerm) ||
      dhikr.occasion?.toLowerCase().includes(searchTerm) ||
      dhikr.source?.toLowerCase().includes(searchTerm)
    );
  } catch (error) {
    console.error('Error searching dhikr:', error);
    return [];
  }
};

// Function to get categories
export const getDhikrCategories = async (language = null) => {
  try {
    const currentLanguage = language || await getCurrentLanguage();
    const languageFiles = dhikrFiles[currentLanguage] || dhikrFiles.english;
    
    return Object.keys(languageFiles).map(category => ({
      id: category,
      name: languageFiles[category]?.name || category,
      description: languageFiles[category]?.description || '',
      count: languageFiles[category]?.dhikr?.length || 0
    }));
  } catch (error) {
    console.error('Error loading dhikr categories:', error);
    return [];
  }
}; 