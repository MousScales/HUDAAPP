import { getCurrentLanguage } from '../utils/useLanguage';

// Hadith API configuration
const HADITH_API_BASE = 'https://cdn.jsdelivr.net/gh/fawazahmed0/hadith-api@1';

// Language to edition mapping
const languageToEditions = {
  english: {
    bukhari: 'eng-bukhari',
    muslim: 'eng-muslim',
    abudawud: 'eng-abudawud',
    tirmidhi: 'eng-tirmidhi',
    ibnmajah: 'eng-ibnmajah',
    nasai: 'eng-nasai',
    malik: 'eng-malik',
    qudsi: 'eng-qudsi',
    nawawi: 'eng-nawawi',
    dehlawi: 'eng-dehlawi'
  },
  french: {
    bukhari: 'fra-bukhari',
    muslim: 'fra-muslim',
    abudawud: 'fra-abudawud',
    ibnmajah: 'fra-ibnmajah',
    nasai: 'fra-nasai',
    malik: 'fra-malik',
    qudsi: 'fra-qudsi',
    nawawi: 'fra-nawawi',
    dehlawi: 'fra-dehlawi'
  },
  // For Spanish and Italian, fallback to English since API doesn't support these languages
  spanish: {
    bukhari: 'eng-bukhari',
    muslim: 'eng-muslim',
    abudawud: 'eng-abudawud',
    tirmidhi: 'eng-tirmidhi',
    ibnmajah: 'eng-ibnmajah',
    nasai: 'eng-nasai',
    malik: 'eng-malik',
    qudsi: 'eng-qudsi',
    nawawi: 'eng-nawawi',
    dehlawi: 'eng-dehlawi'
  },
  italian: {
    bukhari: 'eng-bukhari',
    muslim: 'eng-muslim',
    abudawud: 'eng-abudawud',
    tirmidhi: 'eng-tirmidhi',
    ibnmajah: 'eng-ibnmajah',
    nasai: 'eng-nasai',
    malik: 'eng-malik',
    qudsi: 'eng-qudsi',
    nawawi: 'eng-nawawi',
    dehlawi: 'eng-dehlawi'
  }
};

// Major hadith collections with multilingual names
const getMajorCollections = (language = 'english') => {
  const collections = {
    english: [
      { id: 'bukhari', name: 'Sahih al-Bukhari', nameAr: 'صحيح البخاري' },
      { id: 'abudawud', name: 'Sunan Abu Dawood', nameAr: 'سنن أبي داود' },
      { id: 'tirmidhi', name: 'Jami At-Tirmidhi', nameAr: 'جامع الترمذي' },
      { id: 'ibnmajah', name: 'Sunan Ibn Majah', nameAr: 'سنن ابن ماجه' },
      { id: 'nasai', name: 'Sunan An-Nasai', nameAr: 'سنن النسائي' },
    ],
    french: [
      { id: 'bukhari', name: 'Sahih al-Bukhari', nameAr: 'صحيح البخاري' },
      { id: 'abudawud', name: 'Sunan Abu Dawood', nameAr: 'سنن أبي داود' },
      { id: 'ibnmajah', name: 'Sunan Ibn Majah', nameAr: 'سنن ابن ماجه' },
      { id: 'nasai', name: 'Sunan An-Nasai', nameAr: 'سنن النسائي' },
    ],
    spanish: [
      { id: 'bukhari', name: 'Sahih al-Bukhari', nameAr: 'صحيح البخاري' },
      { id: 'abudawud', name: 'Sunan Abu Dawood', nameAr: 'سنن أبي داود' },
      { id: 'tirmidhi', name: 'Jami At-Tirmidhi', nameAr: 'جامع الترمذي' },
      { id: 'ibnmajah', name: 'Sunan Ibn Majah', nameAr: 'سنن ابن ماجه' },
      { id: 'nasai', name: 'Sunan An-Nasai', nameAr: 'سنن النسائي' },
    ],
    italian: [
      { id: 'bukhari', name: 'Sahih al-Bukhari', nameAr: 'صحيح البخاري' },
      { id: 'abudawud', name: 'Sunan Abu Dawood', nameAr: 'سنن أبي داود' },
      { id: 'tirmidhi', name: 'Jami At-Tirmidhi', nameAr: 'جامع الترمذي' },
      { id: 'ibnmajah', name: 'Sunan Ibn Majah', nameAr: 'سنن ابن ماجه' },
      { id: 'nasai', name: 'Sunan An-Nasai', nameAr: 'سنن النسائي' },
    ]
  };
  
  return collections[language] || collections.english;
};

// Function to get the appropriate edition ID for a collection and language
export const getEditionId = (collectionId, language = null) => {
  const currentLanguage = language || getCurrentLanguage();
  
  // Check if the language is supported by the API
  const isSupported = isLanguageSupported(currentLanguage);
  const targetLanguage = isSupported ? currentLanguage : 'english';
  
  const editions = languageToEditions[targetLanguage] || languageToEditions.english;
  return editions[collectionId] || editions.bukhari; // fallback to bukhari
};

// Function to fetch available editions from the API
export const fetchAvailableEditions = async () => {
  try {
    console.log('📚 Fetching available hadith editions...');
    const response = await fetch(`${HADITH_API_BASE}/editions.json`);
    
    if (!response.ok) {
      throw new Error(`Failed to fetch editions: ${response.status}`);
    }
    
    const editions = await response.json();
    console.log('✅ Available editions:', Object.keys(editions).length);
    
    return editions;
  } catch (error) {
    console.error('❌ Error fetching editions:', error);
    return {};
  }
};

// Function to fetch a specific hadith collection
export const fetchHadithCollection = async (collectionId, language = null) => {
  try {
    const currentLanguage = language || getCurrentLanguage();
    const isSupported = isLanguageSupported(currentLanguage);
    const editionId = getEditionId(collectionId, language);
    
    if (!isSupported && currentLanguage !== 'english') {
      console.log(`📖 Fetching ${collectionId} - ${currentLanguage} not supported by API, using English edition (${editionId})`);
    } else {
      console.log(`📖 Fetching ${collectionId} in ${currentLanguage} language (edition: ${editionId})`);
    }
    
    const collectionUrl = `${HADITH_API_BASE}/editions/${editionId}.json`;
    const response = await fetch(collectionUrl);
    
    if (!response.ok) {
      throw new Error(`Failed to fetch ${editionId}: ${response.status}`);
    }
    
    const collectionData = await response.json();
    console.log(`✅ ${editionId}: ${collectionData.hadiths?.length || 0} hadiths`);
    
    return collectionData;
  } catch (error) {
    console.error(`❌ Error fetching ${collectionId}:`, error);
    return null;
  }
};

// Function to get major collections for current language
export const getMajorCollectionsForLanguage = (language = null) => {
  const currentLanguage = language || getCurrentLanguage();
  return getMajorCollections(currentLanguage);
};

// Function to check if a language is supported for hadith
export const isLanguageSupported = (language) => {
  // Only French and English are fully supported by the API
  return language === 'english' || language === 'french';
};

import { t } from '../utils/translations';

// Function to get supported languages with their support level
export const getLanguageSupportInfo = (currentLanguage = 'english') => {
  return {
    english: { supported: true, level: 'full', message: null },
    french: { supported: true, level: 'full', message: null },
    spanish: { supported: false, level: 'partial', message: t('spanishHadithNotAvailable', currentLanguage) },
    italian: { supported: false, level: 'partial', message: t('italianHadithNotAvailable', currentLanguage) }
  };
};

// Function to get supported languages
export const getSupportedLanguages = () => {
  return Object.keys(languageToEditions);
};

// Function to get available collections for a language
export const getAvailableCollectionsForLanguage = (language) => {
  const editions = languageToEditions[language] || languageToEditions.english;
  return Object.keys(editions);
}; 