import { getCurrentLanguage } from '../utils/translations';

// Import all lesson files for different languages
const lessonFiles = {
  english: {
    1: require('../lessons/lesson-001.json'),
    2: require('../lessons/lesson-002.json'),
    3: require('../lessons/lesson-023.json'),
    4: require('../lessons/lesson-037.json'),
    5: require('../lessons/lesson-039.json'),
    6: require('../lessons/lesson-040.json'),
    7: require('../lessons/lesson-043.json'),
    8: require('../lessons/lesson-053.json'),
    9: require('../lessons/lesson-055.json'),
    10: require('../lessons/lesson-062.json'),
    11: require('../lessons/lesson-063.json'),
    12: require('../lessons/lesson-065.json'),
    13: require('../lessons/lesson-066.json'),
    14: require('../lessons/lesson-069.json'),
    15: require('../lessons/lesson-072.json'),
    16: require('../lessons/lesson-074.json'),
    17: require('../lessons/lesson-075.json'),
    18: require('../lessons/lesson-076.json'),
    19: require('../lessons/lesson-079.json'),
    20: require('../lessons/lesson-082.json'),
    21: require('../lessons/lesson-083.json'),
    22: require('../lessons/lesson-084.json'),
    23: require('../lessons/lesson-085.json'),
    24: require('../lessons/lesson-086.json'),
    25: require('../lessons/lesson-090.json'),
    26: require('../lessons/lesson-093.json'),
    27: require('../lessons/lesson-094.json'),
    28: require('../lessons/lesson-095.json'),
    29: require('../lessons/lesson-096.json'),
    30: require('../lessons/lesson-097.json'),
    31: require('../lessons/lesson-098.json'),
    32: require('../lessons/lesson-099.json'),
    33: require('../lessons/lesson-100.json'),
    34: require('../lessons/lesson-101.json'),
    35: require('../lessons/lesson-102.json'),
    36: require('../lessons/lesson-103.json'),
    37: require('../lessons/lesson-104.json'),
    38: require('../lessons/lesson-105.json'),
    39: require('../lessons/lesson-106.json'),
    40: require('../lessons/lesson-107.json'),
    41: require('../lessons/lesson-108.json'),
    42: require('../lessons/lesson-110.json'),
    43: require('../lessons/lesson-111.json'),
    44: require('../lessons/lesson-113.json'),
    45: require('../lessons/lesson-114.json'),
    46: require('../lessons/lesson-115.json'),
    47: require('../lessons/lesson-116.json'),
    48: require('../lessons/lesson-117.json'),
    49: require('../lessons/lesson-119.json'),
    50: require('../lessons/lesson-120.json'),
    51: require('../lessons/lesson-122.json'),
    52: require('../lessons/lesson-123.json'),
    53: require('../lessons/lesson-124.json'),
    54: require('../lessons/lesson-125.json'),
    55: require('../lessons/lesson-126.json'),
    56: require('../lessons/lesson-127.json'),
    57: require('../lessons/lesson-128.json'),
    58: require('../lessons/lesson-129.json'),
    59: require('../lessons/lesson-130.json'),
    60: require('../lessons/lesson-131.json'),
    61: require('../lessons/lesson-133.json'),
    62: require('../lessons/lesson-134.json'),
    63: require('../lessons/lesson-135.json'),
    64: require('../lessons/lesson-136.json'),
    65: require('../lessons/lesson-137.json'),
    66: require('../lessons/lesson-138.json'),
    67: require('../lessons/lesson-139.json'),
    68: require('../lessons/lesson-140.json'),
    69: require('../lessons/lesson-142.json'),
    70: require('../lessons/lesson-143.json'),
    71: require('../lessons/lesson-144.json'),
    72: require('../lessons/lesson-145.json'),
    73: require('../lessons/lesson-146.json'),
    74: require('../lessons/lesson-147.json'),
    75: require('../lessons/lesson-148.json'),
    76: require('../lessons/lesson-149.json'),
    77: require('../lessons/lesson-150.json'),
    78: require('../lessons/lesson-151.json'),
    79: require('../lessons/lesson-152.json'),
    80: require('../lessons/lesson-153.json'),
    81: require('../lessons/lesson-154.json'),
    82: require('../lessons/lesson-155.json'),
    83: require('../lessons/lesson-156.json'),
    84: require('../lessons/lesson-158.json'),
    85: require('../lessons/lesson-159.json'),
    86: require('../lessons/lesson-160.json'),
    87: require('../lessons/lesson-161.json'),
    88: require('../lessons/lesson-162.json'),
    89: require('../lessons/lesson-163.json'),
    90: require('../lessons/lesson-164.json'),
    91: require('../lessons/lesson-165.json'),
    92: require('../lessons/lesson-166.json'),
    93: require('../lessons/lesson-167.json'),
    94: require('../lessons/lesson-169.json'),
    95: require('../lessons/lesson-170.json'),
  },
  spanish: {
    1: require('../lessons/spanish/lesson-001-es.json'),
    2: require('../lessons/spanish/lesson-002-es.json'),
    3: require('../lessons/spanish/lesson-003-es.json'),
    4: require('../lessons/spanish/lesson-004-es.json'),
    5: require('../lessons/spanish/lesson-005-es.json'),
    6: require('../lessons/spanish/lesson-006-es.json'),
    7: require('../lessons/spanish/lesson-007-es.json'),
    8: require('../lessons/spanish/lesson-008-es.json'),
    9: require('../lessons/spanish/lesson-009-es.json'),
    10: require('../lessons/spanish/lesson-010-es.json'),
    11: require('../lessons/spanish/lesson-011-es.json'),
    12: require('../lessons/spanish/lesson-012-es.json'),
    13: require('../lessons/spanish/lesson-013-es.json'),
    14: require('../lessons/spanish/lesson-014-es.json'),
    15: require('../lessons/spanish/lesson-015-es.json'),
    16: require('../lessons/spanish/lesson-016-es.json'),
    17: require('../lessons/spanish/lesson-017-es.json'),
    18: require('../lessons/spanish/lesson-018-es.json'),
    19: require('../lessons/spanish/lesson-019-es.json'),
    20: require('../lessons/spanish/lesson-020-es.json'),
    21: require('../lessons/spanish/lesson-021-es.json'),
    22: require('../lessons/spanish/lesson-022-es.json'),
    23: require('../lessons/spanish/lesson-023-es.json'),
    24: require('../lessons/spanish/lesson-024-es.json'),
    25: require('../lessons/spanish/lesson-025-es.json'),
    26: require('../lessons/spanish/lesson-026-es.json'),
    27: require('../lessons/spanish/lesson-027-es.json'),
    28: require('../lessons/spanish/lesson-028-es.json'),
    29: require('../lessons/spanish/lesson-029-es.json'),
    30: require('../lessons/spanish/lesson-030-es.json'),
    31: require('../lessons/spanish/lesson-031-es.json'),
    32: require('../lessons/spanish/lesson-032-es.json'),
    33: require('../lessons/spanish/lesson-033-es.json'),
    34: require('../lessons/spanish/lesson-034-es.json'),
    35: require('../lessons/spanish/lesson-035-es.json'),
    36: require('../lessons/spanish/lesson-036-es.json'),
    37: require('../lessons/spanish/lesson-037-es.json'),
    38: require('../lessons/spanish/lesson-038-es.json'),
    39: require('../lessons/spanish/lesson-039-es.json'),
    40: require('../lessons/spanish/lesson-040-es.json'),
    41: require('../lessons/spanish/lesson-041-es.json'),
    42: require('../lessons/spanish/lesson-042-es.json'),
    43: require('../lessons/spanish/lesson-043-es.json'),
    44: require('../lessons/spanish/lesson-044-es.json'),
    45: require('../lessons/spanish/lesson-045-es.json'),
    46: require('../lessons/spanish/lesson-046-es.json'),
    47: require('../lessons/spanish/lesson-047-es.json'),
    48: require('../lessons/spanish/lesson-048-es.json'),
    49: require('../lessons/spanish/lesson-049-es.json'),
    50: require('../lessons/spanish/lesson-050-es.json'),
    51: require('../lessons/spanish/lesson-051-es.json'),
    52: require('../lessons/spanish/lesson-052-es.json'),
    53: require('../lessons/spanish/lesson-053-es.json'),
    54: require('../lessons/spanish/lesson-054-es.json'),
    55: require('../lessons/spanish/lesson-055-es.json'),
  },
  italian: {
    1: require('../lessons/italian/lesson-001-it.json'),
    2: require('../lessons/italian/lesson-002-it.json'),
    3: require('../lessons/italian/lesson-003-it.json'),
    4: require('../lessons/italian/lesson-004-it.json'),
    5: require('../lessons/italian/lesson-005-it.json'),
    6: require('../lessons/italian/lesson-006-it.json'),
    7: require('../lessons/italian/lesson-007-it.json'),
    8: require('../lessons/italian/lesson-008-it.json'),
    9: require('../lessons/italian/lesson-009-it.json'),
    10: require('../lessons/italian/lesson-010-it.json'),
    11: require('../lessons/italian/lesson-011-it.json'),
    12: require('../lessons/italian/lesson-012-it.json'),
    13: require('../lessons/italian/lesson-013-it.json'),
    14: require('../lessons/italian/lesson-014-it.json'),
    15: require('../lessons/italian/lesson-015-it.json'),
    16: require('../lessons/italian/lesson-016-it.json'),
    17: require('../lessons/italian/lesson-017-it.json'),
    18: require('../lessons/italian/lesson-018-it.json'),
    19: require('../lessons/italian/lesson-019-it.json'),
    20: require('../lessons/italian/lesson-020-it.json'),
    21: require('../lessons/italian/lesson-021-it.json'),
    22: require('../lessons/italian/lesson-022-it.json'),
    23: require('../lessons/italian/lesson-023-it.json'),
    24: require('../lessons/italian/lesson-024-it.json'),
    25: require('../lessons/italian/lesson-025-it.json'),
    26: require('../lessons/italian/lesson-026-it.json'),
    27: require('../lessons/italian/lesson-027-it.json'),
    28: require('../lessons/italian/lesson-028-it.json'),
    29: require('../lessons/italian/lesson-029-it.json'),
    30: require('../lessons/italian/lesson-030-it.json'),
    31: require('../lessons/italian/lesson-031-it.json'),
  },
  french: {
    1: require('../lessons/french lessons/lesson-001-fr.json'),
    2: require('../lessons/french lessons/lesson-002-fr.json'),
    3: require('../lessons/french lessons/lesson-003-fr.json'),
    4: require('../lessons/french lessons/lesson-004-fr.json'),
    5: require('../lessons/french lessons/lesson-005-fr.json'),
    6: require('../lessons/french lessons/lesson-006-fr.json'),
    7: require('../lessons/french lessons/lesson-007-fr.json'),
    8: require('../lessons/french lessons/lesson-008-fr.json'),
    9: require('../lessons/french lessons/lesson-009-fr.json'),
    10: require('../lessons/french lessons/lesson-010-fr.json'),
    11: require('../lessons/french lessons/lesson-011-fr.json'),
    12: require('../lessons/french lessons/lesson-012-fr.json'),
    13: require('../lessons/french lessons/lesson-013-fr.json'),
    14: require('../lessons/french lessons/lesson-014-fr.json'),
    15: require('../lessons/french lessons/lesson-015-fr.json'),
    16: require('../lessons/french lessons/lesson-016-fr.json'),
    17: require('../lessons/french lessons/lesson-017-fr.json'),
    18: require('../lessons/french lessons/lesson-018-fr.json'),
    19: require('../lessons/french lessons/lesson-019-fr.json'),
    20: require('../lessons/french lessons/lesson-020-fr.json'),
    21: require('../lessons/french lessons/lesson-021-fr.json'),
    22: require('../lessons/french lessons/lesson-022-fr.json'),
    23: require('../lessons/french lessons/lesson-023-fr.json'),
    24: require('../lessons/french lessons/lesson-024-fr.json'),
    25: require('../lessons/french lessons/lesson-025-fr.json'),
    26: require('../lessons/french lessons/lesson-026-fr.json'),
    27: require('../lessons/french lessons/lesson-027-fr.json'),
    28: require('../lessons/french lessons/lesson-028-fr.json'),
    29: require('../lessons/french lessons/lesson-029-fr.json'),
    30: require('../lessons/french lessons/lesson-030-fr.json'),
    31: require('../lessons/french lessons/lesson-031-fr.json'),
    32: require('../lessons/french lessons/lesson-032-fr.json'),
    33: require('../lessons/french lessons/lesson-033-fr.json'),
    34: require('../lessons/french lessons/lesson-034-fr.json'),
    35: require('../lessons/french lessons/lesson-035-fr.json'),
    36: require('../lessons/french lessons/lesson-036-fr.json'),
    37: require('../lessons/french lessons/lesson-037-fr.json'),
    38: require('../lessons/french lessons/lesson-038-fr.json'),
    39: require('../lessons/french lessons/lesson-039-fr.json'),
    40: require('../lessons/french lessons/lesson-040-fr.json'),
    41: require('../lessons/french lessons/lesson-041-fr.json'),
    42: require('../lessons/french lessons/lesson-042-fr.json'),
    43: require('../lessons/french lessons/lesson-043-fr.json'),
    44: require('../lessons/french lessons/lesson-044-fr.json'),
    45: require('../lessons/french lessons/lesson-045-fr.json'),
    46: require('../lessons/french lessons/lesson-046-fr.json'),
    47: require('../lessons/french lessons/lesson-047-fr.json'),
    48: require('../lessons/french lessons/lesson-048-fr.json'),
    49: require('../lessons/french lessons/lesson-049-fr.json'),
    50: require('../lessons/french lessons/lesson-050-fr.json'),
    51: require('../lessons/french lessons/lesson-051-fr.json'),
    52: require('../lessons/french lessons/lesson-052-fr.json'),
    53: require('../lessons/french lessons/lesson-053-fr.json'),
    54: require('../lessons/french lessons/lesson-054-fr.json'),
    55: require('../lessons/french lessons/lesson-055-fr.json'),
    56: require('../lessons/french lessons/lesson-056-fr.json'),
    57: require('../lessons/french lessons/lesson-057-fr.json'),
    58: require('../lessons/french lessons/lesson-058-fr.json'),
    59: require('../lessons/french lessons/lesson-059-fr.json'),
    60: require('../lessons/french lessons/lesson-060-fr.json'),
    61: require('../lessons/french lessons/lesson-061-fr.json'),
  }
};

// Fallback to English if lesson not available in selected language
const getFallbackLesson = (lessonId) => {
  return lessonFiles.english[lessonId] || null;
};

class MultilingualLessonService {
  constructor() {
    this.currentLanguage = 'english';
    this.cachedLessons = {};
  }

  // Set the current language
  async setLanguage(language) {
    this.currentLanguage = language;
    // Clear cache when language changes
    this.cachedLessons = {};
  }

  // Get lesson by ID in the current language
  async getLesson(lessonId) {
    try {
      // Check if we have the lesson in the current language
      if (lessonFiles[this.currentLanguage] && lessonFiles[this.currentLanguage][lessonId]) {
        return lessonFiles[this.currentLanguage][lessonId];
      }
      
      // Fallback to English if not available in current language
      console.log(`⚠️ Lesson ${lessonId} not available in ${this.currentLanguage}, falling back to English`);
      return getFallbackLesson(lessonId);
    } catch (error) {
      console.error('Error getting lesson:', error);
      return getFallbackLesson(lessonId);
    }
  }

  // Get multiple lessons
  async getLessons(lessonIds) {
    const lessons = [];
    for (const id of lessonIds) {
      const lesson = await this.getLesson(id);
      if (lesson) {
        lessons.push(lesson);
      }
    }
    return lessons;
  }

  // Get all available lessons for current language
  async getAllLessons() {
    const lessons = [];
    const availableLessons = lessonFiles[this.currentLanguage] || lessonFiles.english;
    
    for (const lessonId in availableLessons) {
      const lesson = await this.getLesson(parseInt(lessonId));
      if (lesson) {
        lessons.push(lesson);
      }
    }
    
    return lessons.sort((a, b) => a.id - b.id);
  }

  // Get random lessons
  async getRandomLessons(count = 3) {
    const allLessons = await this.getAllLessons();
    const shuffled = allLessons.sort(() => 0.5 - Math.random());
    return shuffled.slice(0, count);
  }

  // Check if lesson is available in current language
  isLessonAvailableInLanguage(lessonId, language = null) {
    const lang = language || this.currentLanguage;
    return !!(lessonFiles[lang] && lessonFiles[lang][lessonId]);
  }

  // Get available languages for a specific lesson
  getAvailableLanguagesForLesson(lessonId) {
    const availableLanguages = [];
    for (const language in lessonFiles) {
      if (lessonFiles[language][lessonId]) {
        availableLanguages.push(language);
      }
    }
    return availableLanguages;
  }

  // Get lesson statistics
  async getLessonStats() {
    const stats = {
      totalLessons: 0,
      availableInCurrentLanguage: 0,
      availableInEnglish: 0,
      availableInSpanish: 0,
      availableInFrench: 0,
      availableInItalian: 0,
    };

    // Count lessons in each language
    for (const language in lessonFiles) {
      const lessonCount = Object.keys(lessonFiles[language]).length;
      stats[`availableIn${language.charAt(0).toUpperCase() + language.slice(1)}`] = lessonCount;
      stats.totalLessons = Math.max(stats.totalLessons, lessonCount);
    }

    return stats;
  }
}

export default new MultilingualLessonService(); 