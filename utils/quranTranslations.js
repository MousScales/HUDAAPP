// Quran translation mappings for different languages
export const quranTranslationMappings = {
  english: {
    edition: 'en.sahih',
    name: 'Sahih International',
    language: 'English'
  },
  spanish: {
    edition: 'es.garcia',
    name: 'García',
    language: 'Spanish'
  },
  french: {
    edition: 'fr.hamidullah',
    name: 'Hamidullah',
    language: 'French'
  },
  italian: {
    edition: 'it.piccardo',
    name: 'Piccardo',
    language: 'Italian'
  }
};

// Function to get translation edition for a language
export const getTranslationEdition = (language = 'english') => {
  return quranTranslationMappings[language]?.edition || quranTranslationMappings.english.edition;
};

// Function to get translation name for a language
export const getTranslationName = (language = 'english') => {
  return quranTranslationMappings[language]?.name || quranTranslationMappings.english.name;
};

// Function to get translation language name
export const getTranslationLanguage = (language = 'english') => {
  return quranTranslationMappings[language]?.language || quranTranslationMappings.english.language;
}; 