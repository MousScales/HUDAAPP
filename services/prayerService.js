import { collection, doc, setDoc, getDoc, updateDoc, query, where, orderBy, limit, getDocs } from 'firebase/firestore';
import { firestore, auth } from '../firebase';
import AsyncStorage from '@react-native-async-storage/async-storage';
import prayerBlockerService from './prayerBlockerService';

const PRAYER_COLLECTION = 'prayerTracking';
const CACHE_KEY = 'cached_prayer_data';
const CACHE_EXPIRY_KEY = 'prayer_cache_expiry';
const CACHE_DURATION = 24 * 60 * 60 * 1000; // 24 hours

class PrayerService {
  
  // Get date key in YYYY-MM-DD format using local date to avoid timezone issues
  getDateKey(date = new Date()) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  // Save prayer completion to Firebase
  async savePrayerCompletion(prayerId, isCompleted = true, date = new Date()) {
    try {
      console.log(`📝 PrayerService.savePrayerCompletion called: ${prayerId} = ${isCompleted}`);
      const user = auth.currentUser;
      if (!user) {
        console.log('⚠️ PrayerService: No authenticated user, saving locally only');
        await this.savePrayerCompletionLocally(prayerId, isCompleted, date);
        // IMPORTANT: Still call prayer blocker service even if no user
        console.log(`   - Calling prayerBlockerService.updatePrayerCompletion(${prayerId}, ${isCompleted})`);
        await prayerBlockerService.updatePrayerCompletion(prayerId, isCompleted);
        return true;
      }

      const dateKey = this.getDateKey(date);
      const userDocRef = doc(firestore, PRAYER_COLLECTION, user.uid);
      
      // Get existing data
      const userDoc = await getDoc(userDocRef);
      const existingData = userDoc.exists() ? userDoc.data() : {};
      
      // Update the specific prayer for the specific date
      const updatedData = {
        ...existingData,
        [dateKey]: {
          ...existingData[dateKey],
          [prayerId]: isCompleted,
          lastUpdated: new Date().toISOString()
        }
      };

      // Save to Firebase
      await setDoc(userDocRef, updatedData, { merge: true });
      console.log(`   - PrayerService: Saved to Firebase for ${dateKey}.${prayerId} = ${isCompleted}`);
      
      // Also save locally for offline access
      await this.savePrayerCompletionLocally(prayerId, isCompleted, date);
      console.log(`   - PrayerService: Saved locally`);
      
      // Sync with prayer blocker service for app unlocking
      console.log(`   - PrayerService: Calling prayerBlockerService.updatePrayerCompletion(${prayerId}, ${isCompleted})`);
      await prayerBlockerService.updatePrayerCompletion(prayerId, isCompleted);
      console.log(`   - PrayerService: prayerBlockerService.updatePrayerCompletion returned`);
      
      console.log(`✅ PrayerService: ${prayerId} completion saved to Firebase and locally`);
      return true;
    } catch (error) {
      console.error('❌ PrayerService: Error saving prayer completion to Firebase:', error);
      
      // Fallback to local storage
      return await this.savePrayerCompletionLocally(prayerId, isCompleted, date);
    }
  }

  // Save excused prayer (for menstruation mode)
  async saveExcusedPrayer(prayerId, date = new Date()) {
    try {
      const user = auth.currentUser;
      if (!user) {
        console.log('⚠️ PrayerService: No authenticated user, saving excused prayer locally only');
        return await this.saveExcusedPrayerLocally(prayerId, date);
      }

      const dateKey = this.getDateKey(date);
      const userDocRef = doc(firestore, PRAYER_COLLECTION, user.uid);
      
      // Get existing data
      const userDoc = await getDoc(userDocRef);
      const existingData = userDoc.exists() ? userDoc.data() : {};
      
      // Update the specific prayer as excused for the specific date
      const updatedData = {
        ...existingData,
        [dateKey]: {
          ...existingData[dateKey],
          [prayerId]: 'excused',
          lastUpdated: new Date().toISOString()
        }
      };

      // Save to Firebase
      await setDoc(userDocRef, updatedData, { merge: true });
      
      // Also save locally for offline access
      await this.saveExcusedPrayerLocally(prayerId, date);
      
      console.log(`✅ PrayerService: ${prayerId} marked as excused`);
      return true;
    } catch (error) {
      console.error('❌ PrayerService: Error saving excused prayer to Firebase:', error);
      
      // Fallback to local storage
      return await this.saveExcusedPrayerLocally(prayerId, date);
    }
  }

  // Save prayer completion locally (fallback)
  async savePrayerCompletionLocally(prayerId, isCompleted = true, date = new Date()) {
    try {
      const dateKey = this.getDateKey(date);
      const existingData = await this.getPrayerDataFromStorage();
      
      const updatedData = {
        ...existingData,
        [dateKey]: {
          ...existingData[dateKey],
          [prayerId]: isCompleted,
          lastUpdated: new Date().toISOString()
        }
      };

      await AsyncStorage.setItem('prayerTracking', JSON.stringify(updatedData));
      console.log(`✅ PrayerService: ${prayerId} completion saved locally`);
      return true;
    } catch (error) {
      console.error('❌ PrayerService: Error saving prayer completion locally:', error);
      return false;
    }
  }

  // Save excused prayer locally (fallback)
  async saveExcusedPrayerLocally(prayerId, date = new Date()) {
    try {
      const dateKey = this.getDateKey(date);
      const existingData = await this.getPrayerDataFromStorage();
      
      const updatedData = {
        ...existingData,
        [dateKey]: {
          ...existingData[dateKey],
          [prayerId]: 'excused',
          lastUpdated: new Date().toISOString()
        }
      };

      await AsyncStorage.setItem('prayerTracking', JSON.stringify(updatedData));
      console.log(`✅ PrayerService: ${prayerId} marked as excused locally`);
      return true;
    } catch (error) {
      console.error('❌ PrayerService: Error saving excused prayer locally:', error);
      return false;
    }
  }

  // Get prayer data from local storage
  async getPrayerDataFromStorage() {
    try {
      const data = await AsyncStorage.getItem('prayerTracking');
      return data ? JSON.parse(data) : {};
    } catch (error) {
      console.error('❌ PrayerService: Error reading local prayer data:', error);
      return {};
    }
  }

  // Load prayer data (try Firebase first, fallback to local)
  async loadPrayerData() {
    try {
      const user = auth.currentUser;
      if (!user) {
        console.log('⚠️ PrayerService: No authenticated user, loading locally only');
        return await this.getPrayerDataFromStorage();
      }

      // Check cache first
      const cachedData = await this.getCachedPrayerData();
      if (cachedData) {
        console.log('📦 PrayerService: Using cached prayer data');
        return cachedData;
      }

      // Load from Firebase
      const userDocRef = doc(firestore, PRAYER_COLLECTION, user.uid);
      const userDoc = await getDoc(userDocRef);
      
      if (userDoc.exists()) {
        const firebaseData = userDoc.data();
        
        // Cache the data
        await this.cachePrayerData(firebaseData);
        
        // Also sync with local storage for offline access
        await AsyncStorage.setItem('prayerTracking', JSON.stringify(firebaseData));
        
        // CRITICAL: Sync to shared storage (App Groups) so the blocker extension can see it
        await prayerBlockerService.syncPrayerData(firebaseData);
        console.log('🔄 PrayerService: Prayer data synced to shared storage for blocker');
        
        console.log('✅ PrayerService: Prayer data loaded from Firebase');
        return firebaseData;
      } else {
        // No Firebase data, try local storage
        const localData = await this.getPrayerDataFromStorage();
        
        // If we have local data, sync it to Firebase
        if (Object.keys(localData).length > 0) {
          await setDoc(userDocRef, localData);
          console.log('🔄 PrayerService: Local data synced to Firebase');
          
          // Also sync to shared storage for blocker
          await prayerBlockerService.syncPrayerData(localData);
          console.log('🔄 PrayerService: Local data synced to shared storage for blocker');
        }
        
        return localData;
      }
    } catch (error) {
      console.error('❌ PrayerService: Error loading prayer data from Firebase:', error);
      
      // Fallback to local storage
      return await this.getPrayerDataFromStorage();
    }
  }

  // Cache prayer data
  async cachePrayerData(data) {
    try {
      const cacheEntry = {
        data,
        timestamp: Date.now()
      };
      await AsyncStorage.setItem(CACHE_KEY, JSON.stringify(cacheEntry));
      await AsyncStorage.setItem(CACHE_EXPIRY_KEY, Date.now().toString());
    } catch (error) {
      console.error('❌ PrayerService: Error caching prayer data:', error);
    }
  }

  // Get cached prayer data if still valid
  async getCachedPrayerData() {
    try {
      const cachedDataString = await AsyncStorage.getItem(CACHE_KEY);
      const cacheExpiryString = await AsyncStorage.getItem(CACHE_EXPIRY_KEY);
      
      if (!cachedDataString || !cacheExpiryString) {
        return null;
      }
      
      const cacheExpiry = parseInt(cacheExpiryString);
      const now = Date.now();
      
      if (now - cacheExpiry > CACHE_DURATION) {
        // Cache expired
        await this.clearPrayerCache();
        return null;
      }
      
      const cacheEntry = JSON.parse(cachedDataString);
      return cacheEntry.data;
    } catch (error) {
      console.error('❌ PrayerService: Error reading cached prayer data:', error);
      return null;
    }
  }

  // Clear prayer cache
  async clearPrayerCache() {
    try {
      await AsyncStorage.removeItem(CACHE_KEY);
      await AsyncStorage.removeItem(CACHE_EXPIRY_KEY);
      console.log('🗑️ PrayerService: Prayer cache cleared');
    } catch (error) {
      console.error('❌ PrayerService: Error clearing prayer cache:', error);
    }
  }

  // Check if a prayer is completed
  async isPrayerCompleted(prayerId, date = new Date()) {
    try {
      const prayerData = await this.loadPrayerData();
      const dateKey = this.getDateKey(date);
      return prayerData[dateKey]?.[prayerId] || false;
    } catch (error) {
      console.error('❌ PrayerService: Error checking prayer completion:', error);
      return false;
    }
  }

  // Toggle prayer completion
  async togglePrayerCompletion(prayerId, date = new Date()) {
    try {
      const isCurrentlyCompleted = await this.isPrayerCompleted(prayerId, date);
      const newCompletionStatus = !isCurrentlyCompleted;
      
      await this.savePrayerCompletion(prayerId, newCompletionStatus, date);
      
      // Clear cache to force refresh
      await this.clearPrayerCache();
      
      return newCompletionStatus;
    } catch (error) {
      console.error('❌ PrayerService: Error toggling prayer completion:', error);
      return false;
    }
  }

  // Check if it's a new day (for resetting prayer checkboxes)
  async isNewDay() {
    const today = new Date();
    const todayKey = this.getDateKey(today);
    
    // Check if we have any data for today
    return !(await this.hasDataForDate(todayKey));
  }

  // Check if we have data for a specific date
  async hasDataForDate(dateKey) {
    try {
      const prayerData = await this.loadPrayerData();
      return prayerData[dateKey] && Object.keys(prayerData[dateKey]).length > 0;
    } catch (error) {
      console.error('❌ PrayerService: Error checking date data:', error);
      return false;
    }
  }

  // Check if prayers should be reset (new day, no data for today)
  async shouldResetPrayers() {
    try {
      const today = new Date();
      const todayKey = this.getDateKey(today);
      const prayerData = await this.loadPrayerData();
      
      // If no data exists for today, prayers should be reset
      return !prayerData[todayKey] || Object.keys(prayerData[todayKey]).length === 0;
    } catch (error) {
      console.error('❌ PrayerService: Error checking if prayers should reset:', error);
      return true; // Default to reset if error
    }
  }

  // Check if a day has ended (for streak management)
  async hasDayEnded(date = new Date()) {
    try {
      const dateKey = this.getDateKey(date);
      const prayerData = await this.loadPrayerData();
      const dayPrayers = prayerData[dateKey] || {};
      
      // Check if any prayers were marked for this day
      const hasAnyPrayers = Object.keys(dayPrayers).length > 0;
      
      if (!hasAnyPrayers) {
        return false; // No prayers marked, day hasn't "ended" yet
      }
      
      // Check if all 5 prayers were completed
      const allPrayersComplete = ['fajr', 'dhuhr', 'asr', 'maghrib', 'isha']
        .every(prayer => dayPrayers[prayer]);
      
      return !allPrayersComplete; // Day has ended if not all prayers were completed
    } catch (error) {
      console.error('❌ PrayerService: Error checking if day has ended:', error);
      return false;
    }
  }

  // Get the last completed day (for streak calculation)
  async getLastCompletedDay() {
    try {
      const prayerData = await this.loadPrayerData();
      const today = new Date();
      let currentDate = new Date();
      
      // Start from yesterday
      currentDate.setDate(currentDate.getDate() - 1);
      
      while (true) {
        const dateKey = this.getDateKey(currentDate);
        const dayPrayers = prayerData[dateKey] || {};
        
        // Check if all 5 prayers were completed for this day (not excused)
        const prayersCompleted = ['fajr', 'dhuhr', 'asr', 'maghrib', 'isha']
          .every(prayer => dayPrayers[prayer] === true);
        
        if (prayersCompleted) {
          return dateKey; // Found the last completed day
        }
        
        // Move to previous day
        currentDate.setDate(currentDate.getDate() - 1);
        
        // Don't check more than 30 days back
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
        if (currentDate < thirtyDaysAgo) {
          return null; // No completed day found in last 30 days
        }
      }
    } catch (error) {
      console.error('❌ PrayerService: Error getting last completed day:', error);
      return null;
    }
  }

  // Get today's prayer status (for UI display)
  async getTodayPrayerStatus() {
    try {
      const today = new Date();
      const dateKey = this.getDateKey(today);
      const prayerData = await this.loadPrayerData();
      
      return prayerData[dateKey] || {};
    } catch (error) {
      console.error('❌ PrayerService: Error getting today prayer status:', error);
      return {};
    }
  }

  // Get prayer status for a specific date (for calendar display)
  async getPrayerStatusForDate(date) {
    try {
      const dateKey = this.getDateKey(date);
      const prayerData = await this.loadPrayerData();
      
      return prayerData[dateKey] || {};
    } catch (error) {
      console.error('❌ PrayerService: Error getting prayer status for date:', error);
      return {};
    }
  }

    // Calculate prayer streak with improved logic
  async calculatePrayerStreak() {
    try {
      const prayerData = await this.loadPrayerData();
      const today = new Date();
      const todayKey = this.getDateKey(today);
      let streak = 0;
      let currentDate = new Date();

      // Start checking from yesterday backwards (don't count today until all prayers are done)
      currentDate.setDate(currentDate.getDate() - 1);

      // Limit to checking only the last 30 days to prevent infinite loops
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      while (currentDate >= thirtyDaysAgo) {
        const dateKey = this.getDateKey(currentDate);
        const dayPrayers = prayerData[dateKey] || {};
        
        // Check if this day has any prayers marked (completed only - excused prayers don't count for streak)
        const hasAnyPrayersMarked = ['fajr', 'dhuhr', 'asr', 'maghrib', 'isha']
          .some(prayer => dayPrayers[prayer] === true);
        
        if (hasAnyPrayersMarked) {
          // If any prayers are marked, ALL prayers must be completed (not excused) for streak to continue
          const allPrayersCompleted = ['fajr', 'dhuhr', 'asr', 'maghrib', 'isha']
            .every(prayer => dayPrayers[prayer] === true);
          
          if (allPrayersCompleted) {
            streak++;
          } else {
            // If any prayers are marked but not all are completed/excused, break the streak
            break;
          }
        } else {
          // If no prayers are marked for this day, break the streak
          // (user didn't use the app that day)
          break;
        }
        
        // Move to previous day
        currentDate.setDate(currentDate.getDate() - 1);
      }

            // Now check if today's prayers are complete (not excused) to add to streak
      const todayPrayers = prayerData[todayKey] || {};
      const todayHasAnyPrayers = ['fajr', 'dhuhr', 'asr', 'maghrib', 'isha']
        .some(prayer => todayPrayers[prayer] === true);
      
      if (todayHasAnyPrayers) {
        const todayComplete = ['fajr', 'dhuhr', 'asr', 'maghrib', 'isha']
          .every(prayer => todayPrayers[prayer] === true);
        
        if (todayComplete) {
          streak++;
        }
      }
      
      return streak;
    } catch (error) {
      console.error('❌ PrayerService: Error calculating prayer streak:', error);
      return 0;
    }
  }

  // Get prayer statistics
  async getPrayerStats() {
    try {
      const prayerData = await this.loadPrayerData();
      const today = new Date();
      const currentMonth = today.getMonth();
      const currentYear = today.getFullYear();
      
      let monthlyCompletions = 0;
      let totalPrayers = 0;
      let completedPrayers = 0;
      
      Object.keys(prayerData).forEach(dateKey => {
        const date = new Date(dateKey);
        const dayPrayers = prayerData[dateKey];
        
        Object.keys(dayPrayers).forEach(prayerId => {
          if (['fajr', 'dhuhr', 'asr', 'maghrib', 'isha'].includes(prayerId)) {
            totalPrayers++;
            if (dayPrayers[prayerId]) {
              completedPrayers++;
              
              // Count monthly completions for current month
              if (date.getMonth() === currentMonth && date.getFullYear() === currentYear) {
                monthlyCompletions++;
              }
            }
          }
        });
      });
      
      const streak = await this.calculatePrayerStreak();
      const completionRate = totalPrayers > 0 ? (completedPrayers / totalPrayers) * 100 : 0;
      
      return {
        streak,
        completionRate: Math.round(completionRate),
        monthlyCompletions,
        totalCompleted: completedPrayers,
        totalPrayers
      };
    } catch (error) {
      console.error('❌ PrayerService: Error getting prayer stats:', error);
      return {
        streak: 0,
        completionRate: 0,
        monthlyCompletions: 0,
        totalCompleted: 0,
        totalPrayers: 0
      };
    }
  }

  // Handle daily reset and streak management
  async handleDailyReset() {
    try {
      const today = new Date();
      const todayKey = this.getDateKey(today);
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      const yesterdayKey = this.getDateKey(yesterday);
      
      const prayerData = await this.loadPrayerData();
      
      // Check if yesterday had any prayers marked (completed only - excused prayers don't count)
      const yesterdayPrayers = prayerData[yesterdayKey] || {};
      const hadYesterdayPrayers = ['fajr', 'dhuhr', 'asr', 'maghrib', 'isha']
        .some(prayer => yesterdayPrayers[prayer] === true);
      
      if (hadYesterdayPrayers) {
        // Check if yesterday was fully completed (all prayers completed, not excused)
        const yesterdayComplete = ['fajr', 'dhuhr', 'asr', 'maghrib', 'isha']
          .every(prayer => yesterdayPrayers[prayer] === true);
        
        if (!yesterdayComplete) {
          console.log('📅 PrayerService: Yesterday was not fully completed - streak will be broken');
          // The streak calculation will handle this automatically
        } else {
          console.log('📅 PrayerService: Yesterday was fully completed - streak continues');
        }
      } else {
        console.log('📅 PrayerService: Yesterday had no prayers marked - streak unaffected');
      }
      
      // Check if today already has data
      const todayPrayers = prayerData[todayKey] || {};
      const hasTodayData = Object.keys(todayPrayers).length > 0;
      
      if (!hasTodayData) {
        console.log('🔄 PrayerService: New day detected - prayers reset to unchecked');
        // Today's prayers will start unchecked
      }
      
      return {
        isNewDay: !hasTodayData,
        yesterdayIncomplete: hadYesterdayPrayers && !['fajr', 'dhuhr', 'asr', 'maghrib', 'isha']
          .every(prayer => yesterdayPrayers[prayer] === true)
      };
    } catch (error) {
      console.error('❌ PrayerService: Error handling daily reset:', error);
      return { isNewDay: true, yesterdayIncomplete: false };
    }
  }





  // Force refresh - clear cache and reload from Firebase
  async forceRefresh() {
    try {
      console.log('🔄 PrayerService: Force refresh - clearing cache...');
      await this.clearPrayerCache();
      return await this.loadPrayerData();
    } catch (error) {
      console.error('❌ PrayerService: Error in force refresh:', error);
      throw error;
    }
  }
}

// Create singleton instance
const prayerService = new PrayerService();

export default prayerService; 