import { NativeModules, Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { ExtensionStorage } from '@bacons/apple-targets';
import subscriptionGuard from './subscriptionGuard';

const { PrayerBlockerModule } = NativeModules;

const PRAYER_BLOCKER_STORAGE_KEY = '@prayer_blocker_settings';
const APP_GROUP_ID = 'group.com.digaifounder.huda';

class PrayerBlockerService {
  constructor() {
    this.isInitialized = false;
    this.isAuthorized = false;
    this.blockedApps = [];
  }

  // Initialize the service
  async initialize() {
    if (Platform.OS !== 'ios') {
      console.log('⚠️ PrayerBlockerService: Only available on iOS');
      return false;
    }

    // Wait a bit for native modules to be registered
    await new Promise(resolve => setTimeout(resolve, 500));

    if (!PrayerBlockerModule) {
      console.error('❌ PrayerBlockerService: Native module not found');
      console.error('Available modules:', Object.keys(NativeModules));
      return false;
    }

    try {
      // Check authorization status
      this.isAuthorized = await PrayerBlockerModule.isAuthorized();
      this.isInitialized = true;
      
      console.log('✅ PrayerBlockerService: Initialized', { isAuthorized: this.isAuthorized });
      return true;
    } catch (error) {
      console.error('❌ PrayerBlockerService: Initialization error:', error);
      return false;
    }
  }

  // Request authorization from user
  async requestAuthorization() {
    if (!PrayerBlockerModule) {
      console.error('❌ PrayerBlockerService: Native module not found. Make sure:');
      console.error('1. The app has been rebuilt after adding the native module files');
      console.error('2. The app has been restarted');
      console.error('3. The files are added to the Hud target in Xcode');
      throw new Error('PrayerBlockerModule not found. Please rebuild the app.');
    }

    try {
      const authorized = await PrayerBlockerModule.requestAuthorization();
      this.isAuthorized = authorized;
      
      if (authorized) {
        console.log('✅ PrayerBlockerService: Authorization granted');
      } else {
        console.log('⚠️ PrayerBlockerService: Authorization denied');
      }
      
      return authorized;
    } catch (error) {
      console.error('❌ PrayerBlockerService: Authorization error:', error);
      throw error;
    }
  }

  // Check if authorized
  async checkAuthorization() {
    try {
      this.isAuthorized = await PrayerBlockerModule.isAuthorized();
      return this.isAuthorized;
    } catch (error) {
      console.error('❌ PrayerBlockerService: Check authorization error:', error);
      return false;
    }
  }

  // Select apps to block (opens Family Controls picker)
  async selectAppsToBlock() {
    if (!this.isAuthorized) {
      const authorized = await this.requestAuthorization();
      if (!authorized) {
        throw new Error('Authorization required to select apps');
      }
    }

    try {
      const success = await PrayerBlockerModule.selectAppsToBlock();
      console.log('✅ PrayerBlockerService: Apps selected for blocking');
      return success;
    } catch (error) {
      console.error('❌ PrayerBlockerService: Select apps error:', error);
      throw error;
    }
  }

  // Schedule blocking for a specific prayer time - stays active until prayer is checked off
  async schedulePrayerBlocking(prayerTime, prayerId) {
    // Check subscription with RevenueCat first
    subscriptionGuard.resetCache();
    const isSubscribed = await subscriptionGuard.forceCheckSubscriptionStatus();
    if (!isSubscribed) {
      console.log('❌ PrayerBlockerService: User not subscribed - cannot schedule blocking');
      throw new Error('Premium subscription required. Please subscribe to use Prayer Blocker.');
    }
    
    if (!this.isAuthorized) {
      throw new Error('Not authorized. Please request authorization first.');
    }

    try {
      const now = new Date();
      const startTimestamp = prayerTime.getTime();
      
      // If prayer time has passed, activate blocking immediately
      if (prayerTime <= now) {
        console.log(`🔒 Prayer ${prayerId} time has passed - activating blocking immediately`);
        
        // Store prayer blocking info in shared storage for the extension (as JSON string)
        const storage = new ExtensionStorage(APP_GROUP_ID);
        const blockingInfo = {
          prayerId,
          startTime: startTimestamp,
          isActive: true,
          unlockOnCompletion: true // Flag to unlock when prayer is checked off
        };
        storage.set('currentPrayerBlocking', JSON.stringify(blockingInfo));
        console.log(`💾 Stored blocking info for ${prayerId}: ${JSON.stringify(blockingInfo)}`);
        
        // CRITICAL: Force synchronization so extension can read it immediately
        await PrayerBlockerModule.forceSyncUserDefaults();
        console.log(`✅ Forced UserDefaults sync for ${prayerId}`);
        
        // Activate blocking immediately - no time limit, stays active until manually unblocked
        await PrayerBlockerModule.activateBlockingNow();
        
        console.log(`✅ PrayerBlockerService: Blocking activated immediately for ${prayerId} - will stay active until prayer is checked off`);
        return true;
      }
      
      // Prayer time is in the future, schedule to activate at that time
      // IMPORTANT: Store blocking info BEFORE scheduling so the extension can read it when time comes
      const storage = new ExtensionStorage(APP_GROUP_ID);
      const blockingInfo = {
        prayerId,
        startTime: startTimestamp,
        isActive: true,
        unlockOnCompletion: true // Flag to unlock when prayer is checked off
      };
      storage.set('currentPrayerBlocking', JSON.stringify(blockingInfo));
      console.log(`💾 Stored blocking info for ${prayerId}: ${JSON.stringify(blockingInfo)}`);
      
      // Force sync so extension can read it
      await PrayerBlockerModule.forceSyncUserDefaults();
      
      // Now schedule the blocking - when time comes, extension will read the stored info
      // Duration parameter is ignored - blocking stays active until manually cleared
      await PrayerBlockerModule.schedulePrayerBlocking(
        startTimestamp,
        0 // Duration is ignored - blocking stays active until manually cleared
      );

      console.log(`✅ PrayerBlockerService: Blocking scheduled for ${prayerId} at ${prayerTime.toISOString()} - blocking info stored, will activate at prayer time`);
      return true;
    } catch (error) {
      console.error('❌ PrayerBlockerService: Schedule blocking error:', error);
      throw error;
    }
  }

  // Stop blocking immediately
  async stopPrayerBlocking() {
    try {
      await PrayerBlockerModule.stopPrayerBlocking();
      
      // Clear shared storage
      const storage = new ExtensionStorage(APP_GROUP_ID);
      storage.set('currentPrayerBlocking', undefined);
      
      console.log('✅ PrayerBlockerService: Blocking stopped');
      return true;
    } catch (error) {
      console.error('❌ PrayerBlockerService: Stop blocking error:', error);
      throw error;
    }
  }

  // Check if prayer is completed and unlock apps
  async checkPrayerAndUnlock(prayerId) {
    try {
      const isCompleted = await PrayerBlockerModule.checkPrayerAndUnlock(prayerId);
      
      if (isCompleted) {
        await this.stopPrayerBlocking();
        console.log(`✅ PrayerBlockerService: Prayer ${prayerId} completed, apps unlocked`);
      }
      
      return isCompleted;
    } catch (error) {
      console.error('❌ PrayerBlockerService: Check prayer error:', error);
      return false;
    }
  }

  // Check if any prayer time has passed and isn't completed - activate blocking if needed
  async checkAndActivateBlockingForPastPrayers(prayerTimes) {
    console.log('🔍 checkAndActivateBlockingForPastPrayers: Starting check...');
    console.log('🔍 Prayer times received:', prayerTimes.length);
    
    // Check subscription with RevenueCat first
    subscriptionGuard.resetCache();
    const isSubscribed = await subscriptionGuard.forceCheckSubscriptionStatus();
    if (!isSubscribed) {
      console.log('❌ PrayerBlockerService: User not subscribed - cannot activate blocking');
      return false;
    }
    
    if (!this.isAuthorized) {
      console.log('⚠️ Not authorized, skipping past prayer check');
      return false;
    }

    try {
      const now = new Date();
      // Use local date to match prayerService format
      const year = now.getFullYear();
      const month = String(now.getMonth() + 1).padStart(2, '0');
      const day = String(now.getDate()).padStart(2, '0');
      const today = `${year}-${month}-${day}`; // YYYY-MM-DD in LOCAL timezone
      console.log('🔍 Today (local):', today);
      console.log('🔍 Now:', now.toISOString());
      
      const storage = new ExtensionStorage(APP_GROUP_ID);
      
      // Get prayer completion data
      let prayerData = {};
      try {
        const stored = storage.get('prayerData');
        console.log('🔍 Raw stored prayer data:', stored);
        if (stored) {
          prayerData = typeof stored === 'string' ? JSON.parse(stored) : stored;
          console.log('🔍 Parsed prayer data:', prayerData);
        }
      } catch (e) {
        console.log('⚠️ No existing prayer data or parse error:', e);
      }

      const todayPrayerData = prayerData[today] || {};
      console.log('🔍 Today\'s prayer data:', todayPrayerData);

      // Find the MOST RECENT past prayer that isn't completed
      let mostRecentUncompletedPrayer = null;
      
      for (const prayer of prayerTimes) {
        console.log('🔍 Checking prayer:', prayer.name, 'enabled:', prayer.enabled, 'dateObj:', prayer.dateObj);
        
        // Skip Sunrise - it's not a mandatory prayer
        if (prayer.name.toLowerCase() === 'sunrise') {
          console.log('  ⏭️ Skipping Sunrise (not a mandatory prayer)');
          continue;
        }
        
        // Skip if no dateObj (enabled is optional, defaults to true)
        if (!prayer.dateObj) {
          console.log('  ⏭️ Skipping (no dateObj)');
          continue;
        }
        
        // Skip if explicitly disabled (but allow undefined/true)
        if (prayer.enabled === false) {
          console.log('  ⏭️ Skipping (explicitly disabled)');
          continue;
        }

        const prayerId = prayer.name.toLowerCase();
        const prayerTime = new Date(prayer.dateObj);
        
        console.log('  📅 Prayer time:', prayerTime.toISOString());
        console.log('  ⏰ Has passed?', now >= prayerTime);
        
        // Check if prayer time has passed
        if (now >= prayerTime) {
          // Check if prayer is NOT completed
          const isCompleted = todayPrayerData[prayerId] === true;
          console.log('  ✅ Is completed?', isCompleted);
          
          if (!isCompleted) {
            console.log('  🎯 Found uncompleted past prayer:', prayerId);
            // Keep track of the MOST RECENT (latest) uncompleted prayer
            if (!mostRecentUncompletedPrayer || prayerTime > new Date(mostRecentUncompletedPrayer.dateObj)) {
              mostRecentUncompletedPrayer = { ...prayer, prayerId };
              console.log('  ⭐ This is now the MOST RECENT uncompleted past prayer');
            }
          }
        }
      }

      console.log('🔍 Most recent uncompleted past prayer:', mostRecentUncompletedPrayer?.prayerId || 'none');
      
      if (mostRecentUncompletedPrayer) {
        const prayerId = mostRecentUncompletedPrayer.prayerId;
        const prayerTime = new Date(mostRecentUncompletedPrayer.dateObj);
        
        console.log(`🔒 Prayer ${prayerId} is the most recent uncompleted prayer - activating blocking now`);
        console.log(`🔒 Prayer time was: ${prayerTime.toISOString()}`);
        
        // Store current blocking info as JSON string
        const blockingInfo = {
          prayerId,
          startTime: prayerTime.getTime(),
          isActive: true,
          unlockOnCompletion: true
        };
        console.log('💾 Storing blocking info:', blockingInfo);
        storage.set('currentPrayerBlocking', JSON.stringify(blockingInfo));
        console.log(`💾 Stored blocking info for ${prayerId}: ${JSON.stringify(blockingInfo)}`);
        
        // Force sync so extension can read it
        await PrayerBlockerModule.forceSyncUserDefaults();
        
        // Activate blocking immediately for past prayer times
        try {
          await PrayerBlockerModule.activateBlockingNow();
          console.log(`✅ Blocking activated immediately for ${prayerId}`);
        } catch (error) {
          console.error(`❌ Error activating blocking immediately:`, error);
        }
        
        // Also ensure a continuous schedule is running so the extension stays active
        // Schedule a continuous schedule that runs all day
        try {
          const startOfDay = new Date(now);
          startOfDay.setHours(0, 0, 0, 0);
          const endOfDay = new Date(now);
          endOfDay.setHours(23, 59, 59, 999);
          
          await PrayerBlockerModule.schedulePrayerBlocking(
            startOfDay.getTime(),
            Math.round((endOfDay.getTime() - startOfDay.getTime()) / (1000 * 60))
          );
          console.log(`✅ Continuous schedule activated to keep blocking active`);
        } catch (error) {
          console.error(`❌ Error scheduling continuous blocking:`, error);
        }
        
        console.log(`✅ Blocking activated for ${prayerId} - will unlock when prayer is checked off`);
        return true;
      } else {
        console.log('ℹ️ No uncompleted past prayers found - no blocking needed');
      }

      return false;
    } catch (error) {
      console.error('❌ PrayerBlockerService: Check and activate blocking error:', error);
      return false;
    }
  }

  // Schedule a continuous monitoring schedule that runs automatically all day
  async scheduleContinuousMonitoring() {
    // Check subscription with RevenueCat first
    subscriptionGuard.resetCache();
    const isSubscribed = await subscriptionGuard.forceCheckSubscriptionStatus();
    if (!isSubscribed) {
      console.log('❌ PrayerBlockerService: User not subscribed - cannot schedule continuous monitoring');
      throw new Error('Premium subscription required. Please subscribe to use Prayer Blocker.');
    }
    
    if (!this.isAuthorized) {
      throw new Error('Not authorized. Please request authorization first.');
    }

    try {
      console.log('🔄 Scheduling continuous prayer monitoring...');
      
      // Schedule a long-running monitor that covers the entire day
      // This will run in the background and check prayer times automatically
      const now = new Date();
      const startOfDay = new Date(now);
      startOfDay.setHours(0, 0, 0, 0);
      
      // Schedule for next 7 days to ensure continuous coverage
      const endTime = new Date(startOfDay);
      endTime.setDate(endTime.getDate() + 7);
      
      const durationMinutes = Math.round((endTime.getTime() - startOfDay.getTime()) / (1000 * 60));
      
      await PrayerBlockerModule.schedulePrayerBlocking(
        startOfDay.getTime(),
        durationMinutes
      );
      
      console.log(`✅ Continuous monitoring scheduled for 7 days (until ${endTime.toISOString()})`);
      console.log('   The extension will automatically check prayer times and activate blocking as needed');
      return true;
    } catch (error) {
      console.error('❌ Failed to schedule continuous monitoring:', error);
      throw error;
    }
  }

  // Reschedule the next prayer after one completes or passes
  async rescheduleNextPrayer() {
    try {
      // Check subscription with RevenueCat first
      subscriptionGuard.resetCache();
      const isSubscribed = await subscriptionGuard.forceCheckSubscriptionStatus();
      if (!isSubscribed) {
        console.log('❌ PrayerBlockerService: User not subscribed - cannot reschedule');
        return false;
      }
      
      console.log('🔄 Reschedule next prayer called...');
      
      // Get prayer times from shared storage
      const storage = new ExtensionStorage(APP_GROUP_ID);
      const prayerTimesJson = storage.get('prayer_times_widget');
      
      if (!prayerTimesJson) {
        console.log('⚠️ No prayer times found in storage');
        return false;
      }
      
      const widgetData = JSON.parse(prayerTimesJson);
      const prayerTimes = widgetData.prayerTimes || [];
      
      // Schedule the next prayer
      await this.scheduleAllPrayerTimes(prayerTimes);
      return true;
    } catch (error) {
      console.error('❌ Error rescheduling next prayer:', error);
      return false;
    }
  }

  // Schedule blocking for all prayer times - each prayer stays locked until checked off
  async scheduleAllPrayerTimes(prayerTimes) {
    // Check subscription with RevenueCat first
    subscriptionGuard.resetCache();
    const isSubscribed = await subscriptionGuard.forceCheckSubscriptionStatus();
    if (!isSubscribed) {
      console.log('❌ PrayerBlockerService: User not subscribed - cannot schedule blocking');
      throw new Error('Premium subscription required. Please subscribe to use Prayer Blocker.');
    }
    
    if (!this.isAuthorized) {
      throw new Error('Not authorized. Please request authorization first.');
    }

    try {
      console.log('⏰ Scheduling next prayer time for automatic blocking...');
      
      // Filter out non-fardh prayers (we only want to block for obligatory prayers)
      const fardhPrayers = ['Fajr', 'Dhuhr', 'Asr', 'Maghrib', 'Isha'];
      const filteredPrayers = prayerTimes.filter(prayer => 
        fardhPrayers.includes(prayer.name)
      );
      
      // Find the NEXT prayer that hasn't happened yet
      // Since Device Activity can only have one active schedule per activity name,
      // we schedule only the next prayer. When that prayer is completed or passed,
      // we'll reschedule the next one.
      const now = new Date();
      const nextPrayer = filteredPrayers.find(prayer => {
        if (!prayer.dateObj) return false;
        const prayerTime = new Date(prayer.dateObj);
        return prayerTime > now;
      });
      
      if (nextPrayer) {
        const prayerTime = new Date(nextPrayer.dateObj);
        // Schedule interval to start at prayer time and last for 24 hours
        // (user needs to check it off to unlock, or it auto-unlocks after 24h)
        const durationMinutes = 24 * 60; // 24 hours
        
        await PrayerBlockerModule.schedulePrayerBlocking(
          prayerTime.getTime(),
          durationMinutes
        );
        
        console.log(`✅ Scheduled next prayer: ${nextPrayer.name} at ${prayerTime.toLocaleTimeString()}`);
        console.log(`   Device will automatically activate blocking at this time, even if app is closed`);
      } else {
        console.log('⚠️ No future prayers found to schedule today');
      }
      
      // Also check if any past prayers need blocking activated immediately
      await this.checkAndActivateBlockingForPastPrayers(prayerTimes);

      console.log('✅ PrayerBlockerService: Next prayer scheduled - blocking will activate automatically');
      console.log('   Note: Cloud Functions also send backup notifications every minute');
      return true;
    } catch (error) {
      console.error('❌ PrayerBlockerService: Schedule all prayers error:', error);
      throw error;
    }
  }

  // Update prayer completion status in shared storage and unlock if completed, or reblock if unchecked
  async updatePrayerCompletion(prayerId, isCompleted) {
    try {
      const storage = new ExtensionStorage(APP_GROUP_ID);
      // Use local date to match prayerService format
      const now = new Date();
      const year = now.getFullYear();
      const month = String(now.getMonth() + 1).padStart(2, '0');
      const day = String(now.getDate()).padStart(2, '0');
      const today = `${year}-${month}-${day}`; // YYYY-MM-DD in LOCAL timezone
      
      // CRITICAL: Get prayer data from AsyncStorage (source of truth), not shared storage
      let prayerData = {};
      try {
        const asyncStorageData = await AsyncStorage.getItem('prayerTracking');
        if (asyncStorageData) {
          prayerData = JSON.parse(asyncStorageData);
          console.log(`📖 PrayerBlockerService: Loaded prayer data from AsyncStorage for ${today}`);
        } else {
          console.log('⚠️ PrayerBlockerService: No prayer data in AsyncStorage, starting fresh');
        }
      } catch (e) {
        console.log('⚠️ PrayerBlockerService: Error reading from AsyncStorage:', e);
      }
      
      if (!prayerData[today]) {
        prayerData[today] = {};
      }
      
      prayerData[today][prayerId] = isCompleted;
      console.log(`💾 PrayerBlockerService: Syncing to shared storage: ${today}.${prayerId} = ${isCompleted}`);
      storage.set('prayerData', JSON.stringify(prayerData));
      
      // CRITICAL: Force sync UserDefaults so blocker extension can see the update immediately
      await PrayerBlockerModule.forceSyncUserDefaults();
      console.log(`🔄 PrayerBlockerService: Forced sync after prayer ${prayerId} ${isCompleted ? 'completed' : 'unchecked'}`);
      
      // If prayer is completed, immediately unlock apps
      if (isCompleted) {
        console.log(`🔓 PrayerBlockerService: Prayer ${prayerId} marked as completed - unlocking apps...`);
        console.log(`   1. Saving prayer data to shared storage: ${prayerId} = true`);
        console.log(`   2. Prayer data saved for date: ${today}`);
        
        // First, make absolutely sure the prayer data is synced
        await PrayerBlockerModule.forceSyncUserDefaults();
        console.log(`   3. Forced UserDefaults sync #1`);
        
        // Stop the blocking
        await this.stopPrayerBlocking();
        console.log(`   4. Called stopPrayerBlocking()`);
        
        // Clear the blocking info
        storage.set('currentPrayerBlocking', JSON.stringify({
          prayerId: null,
          isActive: false
        }));
        console.log(`   5. Cleared currentPrayerBlocking info`);
        
        // Force sync AGAIN to make absolutely sure extension sees it
        await PrayerBlockerModule.forceSyncUserDefaults();
        console.log(`   6. Forced UserDefaults sync #2`);
        
        console.log(`✅ PrayerBlockerService: Prayer ${prayerId} completed - apps should be unlocked now!`);
        
        // CRITICAL: Reschedule the next prayer now that this one is complete
        // This ensures the next prayer will auto-activate at its time
        try {
          await this.rescheduleNextPrayer();
          console.log('✅ Next prayer rescheduled after completion');
        } catch (error) {
          console.error('❌ Error rescheduling next prayer:', error);
        }
      } else {
        // Prayer was unchecked - reactivate blocking if this prayer's time has passed
        try {
          const widgetStorage = new ExtensionStorage(APP_GROUP_ID);
          const prayerTimesJson = widgetStorage.get('prayer_times_widget');
          
          if (prayerTimesJson) {
            const widgetData = JSON.parse(prayerTimesJson);
            const prayerTimes = widgetData.prayerTimes || [];
            
            // Find the prayer that was unchecked
            const prayer = prayerTimes.find(p => p.name.toLowerCase() === prayerId.toLowerCase());
            
            if (prayer && prayer.dateObj) {
              const prayerTime = new Date(prayer.dateObj);
              const now = new Date();
              
              // If prayer time has passed and it was unchecked, reactivate blocking
              if (prayerTime <= now) {
                console.log(`🔒 PrayerBlockerService: Prayer ${prayerId} was unchecked and its time has passed - reactivating blocking`);
                
                // Store blocking info
                const blockingInfo = {
                  prayerId,
                  startTime: prayerTime.getTime(),
                  isActive: true,
                  unlockOnCompletion: true
                };
                storage.set('currentPrayerBlocking', JSON.stringify(blockingInfo));
                console.log(`💾 Stored blocking info for ${prayerId}: ${JSON.stringify(blockingInfo)}`);
                
                // Force sync so extension can read it
                await PrayerBlockerModule.forceSyncUserDefaults();
                
                // Reactivate blocking immediately
                try {
                  await PrayerBlockerModule.activateBlockingNow();
                  console.log(`✅ PrayerBlockerService: Blocking reactivated for unchecked prayer ${prayerId}`);
                } catch (error) {
                  console.error(`❌ PrayerBlockerService: Error reactivating blocking:`, error);
                }
              }
            }
          }
        } catch (error) {
          console.error('❌ PrayerBlockerService: Error checking prayer times for reblocking:', error);
        }
      }
      
      return true;
    } catch (error) {
      console.error('❌ PrayerBlockerService: Update prayer completion error:', error);
      return false;
    }
  }

  // Sync prayer data from prayerService to shared storage
  async syncPrayerData(prayerData) {
    try {
      const storage = new ExtensionStorage(APP_GROUP_ID);
      storage.set('prayerData', JSON.stringify(prayerData));
      console.log('✅ PrayerBlockerService: Prayer data synced to shared storage');
      return true;
    } catch (error) {
      console.error('❌ PrayerBlockerService: Sync prayer data error:', error);
      return false;
    }
  }

  // Sync prayer times and data to Firebase for cloud function access
  async syncToFirebase(prayerTimes, prayerData) {
    try {
      const { auth, db } = require('../firebase');
      const { doc, setDoc } = require('firebase/firestore');
      
      const user = auth.currentUser;
      if (!user) {
        console.log('⚠️ No user logged in, skipping Firebase sync');
        return false;
      }
      
      const userDocRef = doc(db, 'users', user.uid);
      await setDoc(userDocRef, {
        prayerTimes: prayerTimes,
        prayerData: prayerData,
        prayerBlockerEnabled: true,
        lastUpdated: new Date().toISOString()
      }, { merge: true });
      
      console.log('✅ Prayer times synced to Firebase for cloud function');
      return true;
    } catch (error) {
      console.error('❌ Error syncing to Firebase:', error);
      return false;
    }
  }

}

export default new PrayerBlockerService();

