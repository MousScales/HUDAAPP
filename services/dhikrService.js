import { collection, getDocs, doc, getDoc, setDoc, updateDoc, query, where, orderBy, limit } from 'firebase/firestore';
import { firestore, auth } from '../firebase';
import AsyncStorage from '@react-native-async-storage/async-storage';

const DHIKR_COLLECTION = 'dhikr';
const DHIKR_PROGRESS_COLLECTION = 'dhikrProgress';
const CACHE_KEY = 'cached_dhikr';
const CACHE_EXPIRY_KEY = 'dhikr_cache_expiry';
const CACHE_DURATION = 24 * 60 * 60 * 1000; // 24 hours

// Import all dhikr files
const dhikrFiles = {
  morning: require('../data/dhikr/morning.json'),
  evening: require('../data/dhikr/evening.json'),
  general: require('../data/dhikr/general.json'),
  afterPrayer: require('../data/dhikr/afterPrayer.json'),
  istighfar: require('../data/dhikr/istighfar.json'),
  sleep: require('../data/dhikr/sleep.json'),
  travel: require('../data/dhikr/travel.json'),
  protection: require('../data/dhikr/protection.json'),
};

class DhikrService {
  
  // Force refresh - clear cache and fetch fresh data
  async forceRefresh() {
    try {
      console.log('🔄 DhikrService: Force refresh - clearing cache...');
      await this.clearCache();
      return await this.getAllDhikr();
    } catch (error) {
      console.error('❌ DhikrService: Error in force refresh:', error);
      throw error;
    }
  }

  // Get all dhikr with caching
  async getAllDhikr() {
    try {
      console.log('🔍 DhikrService: Starting getAllDhikr...');
      
      // Try to get from cache first
      const cachedDhikr = await this.getCachedDhikr();
      if (cachedDhikr && cachedDhikr.length > 0) {
        console.log('✅ DhikrService: Found cached dhikr:', cachedDhikr.length);
        return cachedDhikr;
      }
      
      console.log('📡 DhikrService: No valid cache, fetching from Firebase...');
      
      // Try fetching from Firebase first
      let dhikrSnapshot;
      try {
        dhikrSnapshot = await getDocs(collection(firestore, DHIKR_COLLECTION));
      } catch (firebaseError) {
        console.log('⚠️ DhikrService: Firebase fetch failed, using local data...', firebaseError.message);
        return await this.getAllLocalDhikr();
      }
      
      console.log('📊 DhikrService: Snapshot size:', dhikrSnapshot.size);
      
      const dhikrList = [];
      dhikrSnapshot.forEach((doc) => {
        dhikrList.push({
          id: doc.id,
          ...doc.data()
        });
      });
      
      console.log('✅ DhikrService: Processed dhikr from Firebase:', dhikrList.length);
      
      // If Firebase is empty, use local data
      if (dhikrList.length === 0) {
        console.log('📱 DhikrService: Firebase empty, using local dhikr data...');
        return await this.getAllLocalDhikr();
      }
      
      // Cache the results if we got them
      if (dhikrList.length > 0) {
        await this.cacheDhikr(dhikrList);
      }
      
      return dhikrList;
    } catch (error) {
      console.error('❌ DhikrService: Error fetching dhikr:', error);
      // Fallback to local data
      return await this.getAllLocalDhikr();
    }
  }

  // Get dhikr by category
  async getDhikrByCategory(category) {
    try {
      console.log('🔍 DhikrService: Getting dhikr for category:', category);
      
      if (category === 'all') {
        return await this.getAllDhikr();
      }
      
      // Try Firebase first
      try {
        const dhikrQuery = query(
          collection(firestore, DHIKR_COLLECTION),
          where('category', '==', category)
        );
        const querySnapshot = await getDocs(dhikrQuery);
        
        const categoryDhikr = [];
        querySnapshot.forEach((doc) => {
          categoryDhikr.push({
            id: doc.id,
            ...doc.data()
          });
        });
        
        if (categoryDhikr.length > 0) {
          return categoryDhikr;
        }
      } catch (firebaseError) {
        console.log('⚠️ DhikrService: Firebase category query failed, using local data...');
      }
      
      // Fallback to local data
      return await this.getLocalDhikrByCategory(category);
    } catch (error) {
      console.error('❌ DhikrService: Error fetching category dhikr:', error);
      return await this.getLocalDhikrByCategory(category);
    }
  }

  // Get local dhikr by category
  async getLocalDhikrByCategory(category) {
    try {
      if (category === 'all') {
        return await this.getAllLocalDhikr();
      }
      
      const categoryData = dhikrFiles[category];
      if (!categoryData) {
        console.warn('⚠️ DhikrService: Category not found:', category);
        return [];
      }
      
      return categoryData.dhikrs.map(dhikr => ({
        ...dhikr,
        category: categoryData.category,
        categoryName: categoryData.name,
        categoryDescription: categoryData.description
      }));
    } catch (error) {
      console.error('❌ DhikrService: Error getting local category dhikr:', error);
      return [];
    }
  }

  // Get all local dhikr
  async getAllLocalDhikr() {
    try {
      console.log('📱 DhikrService: Loading all local dhikr...');
      
      const allDhikr = [];
      let currentId = 1;
      
      for (const [categoryKey, categoryData] of Object.entries(dhikrFiles)) {
        for (const dhikr of categoryData.dhikrs) {
          allDhikr.push({
            ...dhikr,
            id: currentId++,
            category: categoryData.category,
            categoryName: categoryData.name,
            categoryDescription: categoryData.description,
            apiSource: 'Local JSON'
          });
        }
      }
      
      console.log('✅ DhikrService: Loaded local dhikr:', allDhikr.length);
      return allDhikr;
    } catch (error) {
      console.error('❌ DhikrService: Error loading local dhikr:', error);
      return [];
    }
  }

  // Get dhikr stats
  async getDhikrStats() {
    try {
      const allDhikr = await this.getAllDhikr();
      
      const categoryStats = {};
      for (const category of Object.keys(dhikrFiles)) {
        categoryStats[category] = allDhikr.filter(d => d.category === category).length;
      }
      
      return {
        total: allDhikr.length,
        categories: categoryStats,
        sources: {
          local: allDhikr.filter(d => d.apiSource === 'Local JSON').length,
          firebase: allDhikr.filter(d => d.apiSource !== 'Local JSON').length
        }
      };
    } catch (error) {
      console.error('❌ DhikrService: Error getting dhikr stats:', error);
      return { total: 0, categories: {}, sources: {} };
    }
  }

  // Search dhikr
  async searchDhikr(searchTerm) {
    try {
      const allDhikr = await this.getAllDhikr();
      const term = searchTerm.toLowerCase();
      
      return allDhikr.filter(dhikr => 
        dhikr.title?.toLowerCase().includes(term) ||
        dhikr.arabic?.toLowerCase().includes(term) ||
        dhikr.transliteration?.toLowerCase().includes(term) ||
        dhikr.translation?.toLowerCase().includes(term) ||
        dhikr.benefits?.toLowerCase().includes(term) ||
        dhikr.category?.toLowerCase().includes(term)
      );
    } catch (error) {
      console.error('❌ DhikrService: Error searching dhikr:', error);
      return [];
    }
  }

  // Cache dhikr data
  async cacheDhikr(dhikrList) {
    try {
      await AsyncStorage.setItem(CACHE_KEY, JSON.stringify(dhikrList));
      await AsyncStorage.setItem(CACHE_EXPIRY_KEY, (Date.now() + CACHE_DURATION).toString());
      console.log('✅ DhikrService: Cached dhikr data successfully');
    } catch (error) {
      console.warn('⚠️ DhikrService: Failed to cache dhikr:', error);
    }
  }

  // Get cached dhikr
  async getCachedDhikr() {
    try {
      const [cachedData, expiryTime] = await Promise.all([
        AsyncStorage.getItem(CACHE_KEY),
        AsyncStorage.getItem(CACHE_EXPIRY_KEY)
      ]);

      if (!cachedData || !expiryTime) {
        return null;
      }

      if (Date.now() > parseInt(expiryTime)) {
        console.log('⏰ DhikrService: Cache expired, clearing...');
        await this.clearCache();
        return null;
      }

      return JSON.parse(cachedData);
    } catch (error) {
      console.warn('⚠️ DhikrService: Error reading cache:', error);
      return null;
    }
  }

  // Clear cache
  async clearCache() {
    try {
      await AsyncStorage.multiRemove([CACHE_KEY, CACHE_EXPIRY_KEY]);
      console.log('🧹 DhikrService: Cache cleared successfully');
    } catch (error) {
      console.warn('⚠️ DhikrService: Error clearing cache:', error);
    }
  }

  // Upload local dhikr to Firebase (for admin use)
  async uploadLocalDhikrToFirebase() {
    try {
      console.log('📤 DhikrService: Uploading local dhikr to Firebase...');
      const allLocalDhikr = await this.getAllLocalDhikr();
      
      let uploadCount = 0;
      for (const dhikr of allLocalDhikr) {
        const dhikrRef = doc(firestore, DHIKR_COLLECTION, `dhikr_${dhikr.category}_${dhikr.id}`);
        await setDoc(dhikrRef, {
          ...dhikr,
          uploadedAt: new Date(),
          source: 'local_upload'
        });
        uploadCount++;
      }
      
      console.log(`✅ DhikrService: Successfully uploaded ${uploadCount} dhikr to Firebase`);
      await this.clearCache(); // Clear cache to fetch fresh data
      return { success: true, uploaded: uploadCount };
    } catch (error) {
      console.error('❌ DhikrService: Error uploading to Firebase:', error);
      return { success: false, error: error.message };
    }
  }

  // Save dhikr progress per user to Firestore
  async saveDhikrProgress(progress) {
    try {
      const user = auth.currentUser;
      if (!user) {
        // Save locally if not logged in
        await AsyncStorage.setItem('dhikrProgress', JSON.stringify(progress));
        return true;
      }
      const userDocRef = doc(firestore, 'users', user.uid, DHIKR_PROGRESS_COLLECTION, 'progress');
      await setDoc(userDocRef, progress, { merge: true });
      // Also cache locally
      await AsyncStorage.setItem('dhikrProgress', JSON.stringify(progress));
      return true;
    } catch (error) {
      console.error('❌ DhikrService: Error saving dhikr progress:', error);
      // Fallback to local
      await AsyncStorage.setItem('dhikrProgress', JSON.stringify(progress));
      return false;
    }
  }

  // Get dhikr progress per user from Firestore
  async getDhikrProgress() {
    try {
      const user = auth.currentUser;
      if (!user) {
        // Load from local if not logged in
        const local = await AsyncStorage.getItem('dhikrProgress');
        return local ? JSON.parse(local) : {};
      }
      const userDocRef = doc(firestore, 'users', user.uid, DHIKR_PROGRESS_COLLECTION, 'progress');
      const docSnap = await getDoc(userDocRef);
      if (docSnap.exists()) {
        const data = docSnap.data();
        // Cache locally
        await AsyncStorage.setItem('dhikrProgress', JSON.stringify(data));
        return data;
      } else {
        // Fallback to local
        const local = await AsyncStorage.getItem('dhikrProgress');
        return local ? JSON.parse(local) : {};
      }
    } catch (error) {
      console.error('❌ DhikrService: Error loading dhikr progress:', error);
      // Fallback to local
      const local = await AsyncStorage.getItem('dhikrProgress');
      return local ? JSON.parse(local) : {};
    }
  }

  // Get category colors
  getCategoryColor(category) {
    const colorMap = {
      morning: '#FFB347',
      evening: '#9370DB',
      general: '#20B2AA',
      afterPrayer: '#FF6347',
      istighfar: '#DA70D6',
      sleep: '#2F4F4F',
      travel: '#8B4513',
      protection: '#8B0000'
    };
    return colorMap[category] || '#20B2AA';
  }

  // Map category names for display
  getCategoryDisplayName(category) {
    const nameMap = {
      morning: 'Morning',
      evening: 'Evening',
      general: 'General',
      afterPrayer: 'After Prayer',
      istighfar: 'Istighfar',
      sleep: 'Sleep',
      travel: 'Travel',
      protection: 'Protection'
    };
    return nameMap[category] || category;
  }
}

// Export singleton instance
const dhikrService = new DhikrService();
export default dhikrService; 