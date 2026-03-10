import { collection, getDocs, doc, getDoc, setDoc, updateDoc, query, where, orderBy, limit } from 'firebase/firestore';
import { firestore } from '../firebase';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { auth } from '../firebase';
import { getCurrentLanguage } from '../utils/translations';
import multilingualLessonService from './multilingualLessonService';

const LESSONS_COLLECTION = 'lessons';
const CACHE_KEY = 'cached_lessons';
const CACHE_EXPIRY_KEY = 'lessons_cache_expiry';
const CACHE_DURATION = 24 * 60 * 60 * 1000; // 24 hours

// Import all lesson files
const lessonFiles = {
  1: require('../lessons/lesson-001.json'),
  2: require('../lessons/lesson-002.json'),
  3: require('../lessons/lesson-003.json'),
  4: require('../lessons/lesson-004.json'),
  5: require('../lessons/lesson-005.json'),
  6: require('../lessons/lesson-006.json'),
  7: require('../lessons/lesson-007.json'),
  8: require('../lessons/lesson-008.json'),
  9: require('../lessons/lesson-009.json'),
  10: require('../lessons/lesson-010.json'),
  11: require('../lessons/lesson-011.json'),
  12: require('../lessons/lesson-012.json'),
  13: require('../lessons/lesson-013.json'),
  14: require('../lessons/lesson-014.json'),
  15: require('../lessons/lesson-015.json'),
  16: require('../lessons/lesson-016.json'),
  17: require('../lessons/lesson-017.json'),
  18: require('../lessons/lesson-018.json'),
  19: require('../lessons/lesson-019.json'),
  20: require('../lessons/lesson-020.json'),
  21: require('../lessons/lesson-021.json'),
  22: require('../lessons/lesson-022.json'),
  23: require('../lessons/lesson-023.json'),
  24: require('../lessons/lesson-024.json'),
  25: require('../lessons/lesson-025.json'),
  26: require('../lessons/lesson-026.json'),
  27: require('../lessons/lesson-027.json'),
  28: require('../lessons/lesson-028.json'),
  29: require('../lessons/lesson-029.json'),
  30: require('../lessons/lesson-030.json'),
  31: require('../lessons/lesson-031.json'),
  32: require('../lessons/lesson-032.json'),
  33: require('../lessons/lesson-033.json'),
  34: require('../lessons/lesson-034.json'),
  35: require('../lessons/lesson-035.json'),
  36: require('../lessons/lesson-036.json'),
  37: require('../lessons/lesson-037.json'),
  38: require('../lessons/lesson-038.json'),
  39: require('../lessons/lesson-039.json'),
  40: require('../lessons/lesson-040.json'),
  41: require('../lessons/lesson-041.json'),
  42: require('../lessons/lesson-042.json'),
  43: require('../lessons/lesson-043.json'),
  44: require('../lessons/lesson-044.json'),
  45: require('../lessons/lesson-045.json'),
  46: require('../lessons/lesson-046.json'),
  47: require('../lessons/lesson-047.json'),
  48: require('../lessons/lesson-048.json'),
  49: require('../lessons/lesson-049.json'),
  50: require('../lessons/lesson-050.json'),
  51: require('../lessons/lesson-051.json'),
  52: require('../lessons/lesson-052.json'),
  53: require('../lessons/lesson-053.json'),
  54: require('../lessons/lesson-054.json'),
  55: require('../lessons/lesson-055.json'),
  56: require('../lessons/lesson-056.json'),
  57: require('../lessons/lesson-057.json'),
  58: require('../lessons/lesson-058.json'),
  59: require('../lessons/lesson-059.json'),
  60: require('../lessons/lesson-060.json'),
  61: require('../lessons/lesson-061.json'),
  62: require('../lessons/lesson-062.json'),
  63: require('../lessons/lesson-063.json'),
  64: require('../lessons/lesson-064.json'),
  65: require('../lessons/lesson-065.json'),
  66: require('../lessons/lesson-066.json'),
  67: require('../lessons/lesson-067.json'),
  68: require('../lessons/lesson-068.json'),
  69: require('../lessons/lesson-069.json'),
  70: require('../lessons/lesson-070.json'),
  71: require('../lessons/lesson-071.json'),
  72: require('../lessons/lesson-072.json'),
  73: require('../lessons/lesson-073.json'),
  74: require('../lessons/lesson-074.json'),
  75: require('../lessons/lesson-075.json'),
  76: require('../lessons/lesson-076.json'),
  77: require('../lessons/lesson-077.json'),
  78: require('../lessons/lesson-078.json'),
  79: require('../lessons/lesson-079.json'),
  80: require('../lessons/lesson-080.json'),
  81: require('../lessons/lesson-081.json'),
  82: require('../lessons/lesson-082.json'),
  83: require('../lessons/lesson-083.json'),
  84: require('../lessons/lesson-084.json'),
  85: require('../lessons/lesson-085.json'),
  86: require('../lessons/lesson-086.json'),
  87: require('../lessons/lesson-087.json'),
  88: require('../lessons/lesson-088.json'),
  89: require('../lessons/lesson-089.json'),
  90: require('../lessons/lesson-090.json'),
  91: require('../lessons/lesson-091.json'),
  92: require('../lessons/lesson-092.json'),
  93: require('../lessons/lesson-093.json'),
  94: require('../lessons/lesson-094.json'),
  95: require('../lessons/lesson-095.json'),
  96: require('../lessons/lesson-096.json'),
  97: require('../lessons/lesson-097.json'),
  98: require('../lessons/lesson-098.json'),
  99: require('../lessons/lesson-099.json'),
  100: require('../lessons/lesson-100.json'),
  101: require('../lessons/lesson-101.json'),
  102: require('../lessons/lesson-102.json'),
  103: require('../lessons/lesson-103.json'),
  104: require('../lessons/lesson-104.json'),
  105: require('../lessons/lesson-105.json'),
  106: require('../lessons/lesson-106.json'),
  107: require('../lessons/lesson-107.json'),
  108: require('../lessons/lesson-108.json'),
  109: require('../lessons/lesson-109.json'),
  110: require('../lessons/lesson-110.json'),
  111: require('../lessons/lesson-111.json'),
  112: require('../lessons/lesson-112.json'),
  113: require('../lessons/lesson-113.json'),
  114: require('../lessons/lesson-114.json'),
  115: require('../lessons/lesson-115.json'),
  116: require('../lessons/lesson-116.json'),
  117: require('../lessons/lesson-117.json'),
  118: require('../lessons/lesson-118.json'),
  119: require('../lessons/lesson-119.json'),
  120: require('../lessons/lesson-120.json'),
  121: require('../lessons/lesson-121.json'),
  122: require('../lessons/lesson-122.json'),
  123: require('../lessons/lesson-123.json'),
  124: require('../lessons/lesson-124.json'),
  125: require('../lessons/lesson-125.json'),
  126: require('../lessons/lesson-126.json'),
  127: require('../lessons/lesson-127.json'),
  128: require('../lessons/lesson-128.json'),
  129: require('../lessons/lesson-129.json'),
  130: require('../lessons/lesson-130.json'),
  131: require('../lessons/lesson-131.json'),
  132: require('../lessons/lesson-132.json'),
  133: require('../lessons/lesson-133.json'),
  134: require('../lessons/lesson-134.json'),
  135: require('../lessons/lesson-135.json'),
  136: require('../lessons/lesson-136.json'),
  137: require('../lessons/lesson-137.json'),
  138: require('../lessons/lesson-138.json'),
  139: require('../lessons/lesson-139.json'),
  140: require('../lessons/lesson-140.json'),
  141: require('../lessons/lesson-141.json'),
  142: require('../lessons/lesson-142.json'),
  143: require('../lessons/lesson-143.json'),
  144: require('../lessons/lesson-144.json'),
  145: require('../lessons/lesson-145.json'),
  146: require('../lessons/lesson-146.json'),
  147: require('../lessons/lesson-147.json'),
  148: require('../lessons/lesson-148.json'),
  149: require('../lessons/lesson-149.json'),
  150: require('../lessons/lesson-150.json'),
  151: require('../lessons/lesson-151.json'),
  152: require('../lessons/lesson-152.json'),
  153: require('../lessons/lesson-153.json'),
  154: require('../lessons/lesson-154.json'),
  155: require('../lessons/lesson-155.json'),
  156: require('../lessons/lesson-156.json'),
  157: require('../lessons/lesson-157.json'),
  158: require('../lessons/lesson-158.json'),
  159: require('../lessons/lesson-159.json'),
  160: require('../lessons/lesson-160.json'),
  161: require('../lessons/lesson-161.json'),
  162: require('../lessons/lesson-162.json'),
  163: require('../lessons/lesson-163.json'),
  164: require('../lessons/lesson-164.json'),
  165: require('../lessons/lesson-165.json'),
  166: require('../lessons/lesson-166.json'),
  167: require('../lessons/lesson-167.json'),
  168: require('../lessons/lesson-168.json'),
  169: require('../lessons/lesson-169.json'),
  170: require('../lessons/lesson-170.json'),
};

class LessonService {
  
  // Force refresh - clear cache and fetch fresh data
  async forceRefresh() {
    try {
      console.log('🔄 LessonService: Force refresh - clearing cache...');
      await this.clearCache();
      return await this.getAllLessons();
    } catch (error) {
      console.error('❌ LessonService: Error in force refresh:', error);
      throw error;
    }
  }

  // Get all lessons with caching
  async getAllLessons() {
    try {
      console.log('🔍 LessonService: Starting getAllLessons...');
      
      // Try to get from cache first
      const cachedLessons = await this.getCachedLessons();
      if (cachedLessons && cachedLessons.length > 0) {
        console.log('✅ LessonService: Found cached lessons:', cachedLessons.length);
        return cachedLessons;
      }
      
      console.log('📡 LessonService: No valid cache, fetching from Firebase...');
      console.log('🔗 LessonService: Firestore instance:', firestore);
      console.log('📂 LessonService: Collection name:', LESSONS_COLLECTION);
      
      // Try fetching with orderBy first, then fallback to simple collection query
      let lessonsSnapshot;
      try {
        console.log('🔄 LessonService: Trying with orderBy...');
        lessonsSnapshot = await getDocs(
          query(collection(firestore, LESSONS_COLLECTION), orderBy('id', 'asc'))
        );
      } catch (orderError) {
        console.log('⚠️ LessonService: OrderBy failed, trying simple query...', orderError.message);
        lessonsSnapshot = await getDocs(collection(firestore, LESSONS_COLLECTION));
      }
      
      console.log('📊 LessonService: Snapshot size:', lessonsSnapshot.size);
      console.log('📊 LessonService: Snapshot empty:', lessonsSnapshot.empty);
      
      const lessons = [];
      lessonsSnapshot.forEach((doc) => {
        lessons.push({
          id: doc.id,
          ...doc.data()
        });
      });
      
      console.log('✅ LessonService: Processed lessons:', lessons.length);
      console.log('📝 LessonService: First lesson:', lessons[0] ? lessons[0].title : 'None');
      
      // Only cache if we actually got lessons
      if (lessons.length > 0) {
        await this.cacheLessons(lessons);
      }
      
      return lessons;
    } catch (error) {
      console.error('❌ LessonService: Error fetching lessons:', error);
      console.error('❌ LessonService: Error code:', error.code);
      console.error('❌ LessonService: Error message:', error.message);
      throw error;
    }
  }
  
  // Get lessons by category
  async getLessonsByCategory(category) {
    try {
      if (category === 'all') {
        return await this.getAllLessons();
      }
      
      const lessonsSnapshot = await getDocs(
        query(
          collection(firestore, LESSONS_COLLECTION),
          where('category', '==', category),
          orderBy('id', 'asc')
        )
      );
      
      const lessons = [];
      lessonsSnapshot.forEach((doc) => {
        lessons.push({
          id: doc.id,
          ...doc.data()
        });
      });
      
      return lessons;
    } catch (error) {
      console.error('Error fetching lessons by category:', error);
      throw error;
    }
  }
  
  // Get a single lesson by ID (local files only)
  async getLessonById(lessonId) {
    try {
      console.log('🔍 LessonService: Fetching lesson by ID from local files:', lessonId);
      
      // Use local lesson files directly - no Firebase
      const localLesson = await this.getLocalLessonById(lessonId);
      console.log('✅ LessonService: Found lesson in local files');
      return localLesson;
    } catch (error) {
      console.error('❌ LessonService: Failed to load lesson from local files:', error.message);
      throw new Error(`Lesson with ID ${lessonId} not found in local files`);
    }
  }

  // Get lesson from local JSON files based on current language
  async getLocalLessonById(lessonId) {
    try {
      const currentLanguage = await getCurrentLanguage();
      console.log('🌐 LessonService: Loading lesson by ID for language:', currentLanguage);
      
      let lessonFilesToUse = lessonFiles; // Default to English
      
      // Load language-specific lesson files if available
      if (currentLanguage !== 'english') {
        try {
          switch (currentLanguage) {
            case 'spanish':
              lessonFilesToUse = require('../lessons/spanish/lessonFiles').default;
              console.log('🇪🇸 LessonService: Successfully loaded Spanish lesson files for getLessonById');
              break;
            case 'french':
              lessonFilesToUse = require('../lessons/french lessons/lessonFiles').default;
              console.log('🇫🇷 LessonService: Successfully loaded French lesson files for getLessonById');
              break;
            case 'italian':
              lessonFilesToUse = require('../lessons/italian/lessonFiles').default;
              console.log('🇮🇹 LessonService: Successfully loaded Italian lesson files for getLessonById');
              break;
            default:
              console.log('⚠️ Language not supported, using English lessons');
              lessonFilesToUse = lessonFiles;
          }
          console.log(`✅ LessonService: Using ${currentLanguage} lesson files for getLessonById`);
        } catch (error) {
          console.log(`⚠️ Failed to load ${currentLanguage} lesson files, falling back to English:`, error.message);
          lessonFilesToUse = lessonFiles;
        }
      } else {
        console.log('🇺🇸 LessonService: Using English lesson files for getLessonById');
      }
      
      const numericId = parseInt(lessonId, 10);
      console.log('🔍 Looking for lesson ID:', numericId, 'in language:', currentLanguage);
      console.log('🔍 Available lesson IDs in current language:', Object.keys(lessonFilesToUse));
      
      const lessonData = lessonFilesToUse[numericId];
      
      if (lessonData) {
        console.log('✅ LessonService: Found local lesson:', lessonData.title);
        return lessonData;
      } else {
        // If lesson not found in current language, try English as fallback
        if (currentLanguage !== 'english') {
          console.log(`⚠️ Lesson ${lessonId} not found in ${currentLanguage}, trying English fallback`);
          console.log('🔍 Available lesson IDs in English:', Object.keys(lessonFiles));
          const englishLessonData = lessonFiles[numericId];
          if (englishLessonData) {
            console.log('✅ LessonService: Found lesson in English fallback:', englishLessonData.title);
            return englishLessonData;
          }
        }
        throw new Error(`No local lesson file found for ID ${lessonId} in language ${currentLanguage} or English fallback`);
      }
    } catch (error) {
      console.error('❌ LessonService: Error loading local lesson:', error);
      throw error;
    }
  }

  // Get all local lessons based on current language
  async getAllLocalLessons() {
    try {
      const currentLanguage = await getCurrentLanguage();
      console.log('🌐 LessonService: Loading lessons for language:', currentLanguage);
      
      let lessonFilesToUse = lessonFiles; // Default to English
      
      // Load language-specific lesson files if available
      if (currentLanguage !== 'english') {
        try {
          switch (currentLanguage) {
            case 'spanish':
              lessonFilesToUse = require('../lessons/spanish/lessonFiles').default;
              console.log('🇪🇸 LessonService: Successfully loaded Spanish lesson files');
              break;
            case 'french':
              lessonFilesToUse = require('../lessons/french lessons/lessonFiles').default;
              console.log('🇫🇷 LessonService: Successfully loaded French lesson files');
              break;
            case 'italian':
              lessonFilesToUse = require('../lessons/italian/lessonFiles').default;
              console.log('🇮🇹 LessonService: Successfully loaded Italian lesson files');
              break;
            default:
              console.log('⚠️ Language not supported, using English lessons');
              lessonFilesToUse = lessonFiles;
          }
          console.log(`✅ LessonService: Loaded ${currentLanguage} lessons`);
        } catch (error) {
          console.log(`⚠️ Failed to load ${currentLanguage} lessons, falling back to English:`, error.message);
          lessonFilesToUse = lessonFiles;
        }
      } else {
        console.log('🇺🇸 LessonService: Using English lesson files');
      }
      
      const allLessons = Object.values(lessonFilesToUse);
      console.log('✅ LessonService: Loaded all local lessons:', allLessons.length);
      
      // Debug: Show first few lesson titles
      if (allLessons.length > 0) {
        console.log('🔍 First 3 lesson titles:');
        allLessons.slice(0, 3).forEach((lesson, index) => {
          console.log(`  ${index + 1}. ${lesson.title}`);
        });
      }
      
      return allLessons;
    } catch (error) {
      console.error('❌ LessonService: Error loading all local lessons:', error);
      throw error;
    }
  }
  
  // Get random lessons for daily display
  async getRandomLessons(count = 2) {
    try {
      // Get current language and update multilingual service
      const currentLanguage = await getCurrentLanguage();
      await multilingualLessonService.setLanguage(currentLanguage);
      
      // Get random lessons from multilingual service
      const randomLessons = await multilingualLessonService.getRandomLessons(count);
      
      // If multilingual service doesn't have enough lessons, fallback to original method
      if (randomLessons.length < count) {
        console.log('⚠️ Multilingual service has limited lessons, falling back to original method');
        let allLessons;
        try {
          allLessons = await this.getAllLessons();
        } catch (error) {
          console.log('⚠️ LessonService: Using local lessons for random selection');
          allLessons = await this.getAllLocalLessons();
        }
        
        // Use date as seed for consistent daily selection
        const today = new Date();
        const baseSeed = today.getFullYear() * 10000 + (today.getMonth() + 1) * 100 + today.getDate();
        
        const seededRandom = (index) => {
          const seed = baseSeed + index;
          return Math.abs(Math.sin(seed) * 10000 - Math.floor(Math.sin(seed) * 10000));
        };
        
        const shuffled = [...allLessons];
        const fallbackLessons = [];
        
        for (let i = 0; i < Math.min(count, shuffled.length); i++) {
          const randomIndex = Math.floor(seededRandom(i) * shuffled.length);
          fallbackLessons.push(shuffled[randomIndex]);
          shuffled.splice(randomIndex, 1);
        }
        
        return fallbackLessons;
      }
      
      return randomLessons;
    } catch (error) {
      console.error('Error fetching random lessons:', error);
      throw error;
    }
  }
  
  // Cache lessons locally
  async cacheLessons(lessons) {
    try {
      const expiryTime = Date.now() + CACHE_DURATION;
      await AsyncStorage.setItem(CACHE_KEY, JSON.stringify(lessons));
      await AsyncStorage.setItem(CACHE_EXPIRY_KEY, expiryTime.toString());
    } catch (error) {
      console.error('Error caching lessons:', error);
    }
  }
  
  // Get cached lessons if not expired
  async getCachedLessons() {
    try {
      const expiryTime = await AsyncStorage.getItem(CACHE_EXPIRY_KEY);
      
      if (!expiryTime || Date.now() > parseInt(expiryTime)) {
        // Cache expired
        await this.clearCache();
        return null;
      }
      
      const cachedData = await AsyncStorage.getItem(CACHE_KEY);
      if (cachedData) {
        return JSON.parse(cachedData);
      }
      
      return null;
    } catch (error) {
      console.error('Error getting cached lessons:', error);
      return null;
    }
  }
  
  // Clear lesson cache
  async clearCache() {
    try {
      await AsyncStorage.removeItem(CACHE_KEY);
      await AsyncStorage.removeItem(CACHE_EXPIRY_KEY);
    } catch (error) {
      console.error('Error clearing lesson cache:', error);
    }
  }
  
  // Get lesson statistics
  async getLessonStats() {
    try {
      const allLessons = await this.getAllLessons();
      
      const stats = {
        total: allLessons.length,
        byCategory: {},
        byDifficulty: {}
      };
      
      allLessons.forEach(lesson => {
        // Count by category
        stats.byCategory[lesson.category] = (stats.byCategory[lesson.category] || 0) + 1;
        
        // Count by difficulty
        stats.byDifficulty[lesson.difficulty] = (stats.byDifficulty[lesson.difficulty] || 0) + 1;
      });
      
      return stats;
    } catch (error) {
      console.error('Error getting lesson stats:', error);
      throw error;
    }
  }
  
  // Search lessons
  async searchLessons(searchTerm) {
    try {
      const allLessons = await this.getAllLessons();
      const searchLower = searchTerm.toLowerCase();
      
      return allLessons.filter(lesson => 
        lesson.title.toLowerCase().includes(searchLower) ||
        lesson.description.toLowerCase().includes(searchLower) ||
        (lesson.introduction && lesson.introduction.toLowerCase().includes(searchLower))
      );
    } catch (error) {
      console.error('Error searching lessons:', error);
      throw error;
    }
  }
}

// Lesson Progress Tracking Functions
export const saveLessonProgress = async (lessonId, progress = {}) => {
  try {
    const user = auth.currentUser;
    if (!user) {
      console.log('❌ No user authenticated for lesson progress');
      return false;
    }

    const progressData = {
      lessonId: parseInt(lessonId),
      completed: progress.completed || false,
      completedAt: progress.completed ? new Date() : null,
      timeSpent: progress.timeSpent || 0,
      lastViewed: new Date(),
      ...progress
    };

    await setDoc(
      doc(firestore, 'users', user.uid, 'lessonProgress', lessonId.toString()),
      progressData,
      { merge: true }
    );

    console.log('✅ Lesson progress saved:', { lessonId, progress: progressData });
    return true;
  } catch (error) {
    console.error('❌ Error saving lesson progress:', error);
    return false;
  }
};

export const markLessonComplete = async (lessonId) => {
  try {
    const user = auth.currentUser;
    if (!user) {
      console.log('❌ No user authenticated for lesson completion');
      return false;
    }

    const completionData = {
      lessonId: parseInt(lessonId),
      completed: true,
      completedAt: new Date(),
      lastViewed: new Date()
    };

    await setDoc(
      doc(firestore, 'users', user.uid, 'lessonProgress', lessonId.toString()),
      completionData,
      { merge: true }
    );

    console.log('✅ Lesson marked complete:', lessonId);
    return true;
  } catch (error) {
    console.error('❌ Error marking lesson complete:', error);
    return false;
  }
};

export const getLessonProgress = async (lessonId) => {
  try {
    const user = auth.currentUser;
    if (!user) return null;

    const progressDoc = await getDoc(
      doc(firestore, 'users', user.uid, 'lessonProgress', lessonId.toString())
    );

    if (progressDoc.exists()) {
      return progressDoc.data();
    }
    return null;
  } catch (error) {
    console.error('❌ Error getting lesson progress:', error);
    return null;
  }
};

export const getAllLessonProgress = async () => {
  try {
    const user = auth.currentUser;
    if (!user) {
      console.log('❌ No user authenticated for progress loading');
      return {};
    }

    const progressSnapshot = await getDocs(
      collection(firestore, 'users', user.uid, 'lessonProgress')
    );

    const progressMap = {};
    progressSnapshot.forEach((doc) => {
      const data = doc.data();
      progressMap[data.lessonId] = data;
    });

    console.log('✅ All lesson progress loaded:', Object.keys(progressMap).length, 'lessons');
    return progressMap;
  } catch (error) {
    console.error('❌ Error loading all lesson progress:', error);
    return {};
  }
};

export const getCompletedLessonsCount = async () => {
  try {
    const progressMap = await getAllLessonProgress();
    const completedCount = Object.values(progressMap).filter(p => p.completed).length;
    return completedCount;
  } catch (error) {
    console.error('❌ Error getting completed lessons count:', error);
    return 0;
  }
};

export const calculateOverallProgress = async () => {
  try {
    const progressMap = await getAllLessonProgress();
    const totalLessons = 170; // Update this if you have more lessons
    const completedLessons = Object.values(progressMap).filter(p => p.completed).length;
    
    return {
      completed: completedLessons,
      total: totalLessons,
      percentage: Math.round((completedLessons / totalLessons) * 100)
    };
  } catch (error) {
    console.error('❌ Error calculating overall progress:', error);
    return { completed: 0, total: totalLessons, percentage: 0 };
  }
};

export default new LessonService(); 