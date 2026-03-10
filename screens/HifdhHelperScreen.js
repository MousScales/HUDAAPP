import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  StatusBar,
  TouchableOpacity,
  ScrollView,
  FlatList,
  ActivityIndicator,
  Alert,
  TextInput,
  Switch,
  Animated,
  Easing,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useLanguage } from '../utils/useLanguage';
import { t } from '../utils/translations';
import { CommonActions } from '@react-navigation/native';
// import subscriptionGuard from '../services/subscriptionGuard'; // Removed subscription check
import { auth, firestore } from '../firebase';
import { getResponsiveFontSize, getResponsiveSpacing, isTablet, getTabletPadding, getResponsiveBorderRadius, getResponsiveContainerSize } from '../utils/responsiveSizing';
import { collection, getDocs, query, where, onSnapshot } from 'firebase/firestore';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  getAllMemorization,
  getMemorizedSurahs as getMemorizedSurahsFirebase,
  saveMemorizedSurahs as saveMemorizedSurahsFirebase,
  getUserSettings,
  saveUserSettings,
  saveReadingCount,
  saveListeningCount,
  saveQuizPassed,
  getSurahMemorization
} from '../services/memorizationService';

// Helper function to get proper surah name based on current language
const getProperSurahName = (surahNumber, language = 'en') => {
  const surahKey = surahNumber?.toString();
  const validLanguage = language || 'en';
  
  // Simple mapping - you can expand this with full SURAH_NAMES if needed
  let languageKey = 'en';
  if (validLanguage === 'es' || validLanguage === 'spanish') languageKey = 'es';
  else if (validLanguage === 'fr' || validLanguage === 'french') languageKey = 'fr';
  else if (validLanguage === 'it' || validLanguage === 'italian') languageKey = 'it';
  
  // For now, return English name - can be expanded with full mapping
  return `Surah ${surahNumber}`;
};

export default function HifdhHelperScreen({ navigation }) {
  const { currentLanguage } = useLanguage();
  const [activeTab, setActiveTab] = useState('home');
  const [surahs, setSurahs] = useState([]);
  const [userRecordings, setUserRecordings] = useState({});
  const [loading, setLoading] = useState(false);
  const [recordLoading, setRecordLoading] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);
  const [memorizedSurahs, setMemorizedSurahs] = useState(new Set()); // For checkbox state
  const [calculatedMemorizedSurahs, setCalculatedMemorizedSurahs] = useState(new Set()); // For stats (all ayahs completed)
  const [userName, setUserName] = useState('');
  const [totalMemorizedAyahs, setTotalMemorizedAyahs] = useState(0);
  const [totalTimeSpent, setTotalTimeSpent] = useState(0);
  const [dailyGoalProgress, setDailyGoalProgress] = useState(0);
  const [weeklyProgress, setWeeklyProgress] = useState({});
  const [readTrackerTarget, setReadTrackerTarget] = useState(10);
  const [listenTrackerTarget, setListenTrackerTarget] = useState(10);
  const [quizRequired, setQuizRequired] = useState(true);
  const [memorize30thJuzFirst, setMemorize30thJuzFirst] = useState(false);
  const [nextAyahInfo, setNextAyahInfo] = useState(null);

  // Animation values
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const progressAnim1 = useRef(new Animated.Value(0)).current;
  const progressAnim2 = useRef(new Animated.Value(0)).current;
  const reminderOpacity = useRef(new Animated.Value(0)).current;
  const buttonScale = useRef(new Animated.Value(1)).current;

  // Load surahs and recordings when component mounts
  useEffect(() => {
    loadSurahs();
    loadUserRecordings();
    loadMemorizedSurahs();
    loadUserName();
    loadHomeStats();
    loadSettings();
  }, []);

  // Load next ayah info when settings or stats change
  useEffect(() => {
    if (surahs.length > 0) {
      loadNextAyahInfo();
    }
  }, [surahs, readTrackerTarget, listenTrackerTarget, quizRequired, memorize30thJuzFirst, totalMemorizedAyahs]);

  // Animate on mount and when activeTab changes
  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 600,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.timing(reminderOpacity, {
        toValue: 1,
        duration: 800,
        delay: 200,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
    ]).start();
  }, [activeTab]);

  // Animate progress bars when values change
  useEffect(() => {
    const totalAyahsInQuran = 6236;
    const totalSurahsInQuran = 114;
    const ayahsProgress = totalAyahsInQuran > 0 ? (totalMemorizedAyahs / totalAyahsInQuran) * 100 : 0;
    const surahsMemorized = calculatedMemorizedSurahs.size;
    const surahsProgress = totalSurahsInQuran > 0 ? (surahsMemorized / totalSurahsInQuran) * 100 : 0;

    Animated.parallel([
      Animated.timing(progressAnim1, {
        toValue: Math.min(100, Math.max(0, ayahsProgress)),
        duration: 1000,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: false,
      }),
      Animated.timing(progressAnim2, {
        toValue: Math.min(100, Math.max(0, surahsProgress)),
        duration: 1000,
        delay: 200,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: false,
      }),
    ]).start();
  }, [totalMemorizedAyahs, calculatedMemorizedSurahs]);

  // Reload stats when component comes into focus
  useEffect(() => {
    const unsubscribe = navigation.addListener('focus', () => {
      loadHomeStats();
    });
    return unsubscribe;
  }, [navigation]);

  // Load memorized surahs from Firebase
  const loadMemorizedSurahs = async () => {
    try {
      const memorizedSet = await getMemorizedSurahsFirebase();
      setMemorizedSurahs(memorizedSet);
    } catch (error) {
      console.error('Error loading memorized surahs:', error);
    }
  };

  // Save memorized surahs to Firebase
  const saveMemorizedSurahs = async (memorizedSet) => {
    try {
      await saveMemorizedSurahsFirebase(memorizedSet);
    } catch (error) {
      console.error('Error saving memorized surahs:', error);
    }
  };

  // Load user name
  const loadUserName = async () => {
    try {
      const user = auth.currentUser;
      if (!user) return;

      // Try AsyncStorage first
      const userProfile = await AsyncStorage.getItem('userProfile');
      if (userProfile) {
        const profile = JSON.parse(userProfile);
        const name = profile.firstName || profile.name || profile.displayName || '';
        if (name && name.trim() !== '') {
          setUserName(name);
          // Still refresh from Firebase in background to ensure we have latest data
          refreshNameFromFirebase();
          return;
        }
      }

      // If no name found, try Firebase
      await refreshNameFromFirebase();
    } catch (error) {
      console.error('Error loading user name:', error);
    }
  };

  // Refresh name from Firebase
  const refreshNameFromFirebase = async () => {
    try {
      const user = auth.currentUser;
      if (!user) return;

      const { doc, getDoc } = await import('firebase/firestore');
      const userDoc = await getDoc(doc(firestore, 'users', user.uid));
      
      if (userDoc.exists()) {
        const profile = userDoc.data();
        const name = profile.firstName || profile.name || profile.displayName || '';
        if (name && name.trim() !== '') {
          setUserName(name);
          // Update AsyncStorage
          const currentProfile = await AsyncStorage.getItem('userProfile');
          const updatedProfile = currentProfile ? JSON.parse(currentProfile) : {};
          updatedProfile.firstName = profile.firstName || updatedProfile.firstName;
          updatedProfile.name = profile.name || updatedProfile.name;
          updatedProfile.displayName = profile.displayName || updatedProfile.displayName;
          await AsyncStorage.setItem('userProfile', JSON.stringify(updatedProfile));
        } else {
          // Fallback to email or display name
          setUserName(user.displayName || user.email?.split('@')[0] || '');
        }
      } else {
        // Fallback to email or display name
        setUserName(user.displayName || user.email?.split('@')[0] || '');
      }
    } catch (error) {
      console.error('Error refreshing name from Firebase:', error);
      // Fallback to email or display name
      const user = auth.currentUser;
      if (user) {
        setUserName(user.displayName || user.email?.split('@')[0] || '');
      }
    }
  };

  // Load settings from Firebase
  const loadSettings = async () => {
    try {
      const settings = await getUserSettings();
      setReadTrackerTarget(settings.readTarget);
      setListenTrackerTarget(settings.listenTarget);
      setQuizRequired(settings.quizRequired);
      setMemorize30thJuzFirst(settings.memorize30thJuzFirst || false);
    } catch (error) {
      console.error('Error loading settings:', error);
    }
  };

  // Save settings to Firebase
  const saveSettings = async (readTarget, listenTarget, quizReq, memorize30thJuzFirst = false) => {
    try {
      await saveUserSettings(readTarget, listenTarget, quizReq, memorize30thJuzFirst);
    } catch (error) {
      console.error('Error saving settings:', error);
    }
  };

  // Load home statistics
  const loadHomeStats = async () => {
    try {
      const user = auth.currentUser;
      if (!user) return;

      // Get user settings for targets
      const settings = await getUserSettings();
      const readTargetNum = settings.readTarget;
      const listenTargetNum = settings.listenTarget;
      const isQuizRequired = settings.quizRequired;

      // Get all memorization data from Firebase
      const allMemorization = await getAllMemorization();

      // Fetch all surahs to get accurate counts
      let allSurahs = [];
      try {
        const response = await fetch('https://api.alquran.cloud/v1/surah');
        const data = await response.json();
        if (data.code === 200 && data.data) {
          allSurahs = data.data;
        }
      } catch (error) {
        console.error('Error fetching surahs:', error);
      }

      // Calculate total memorized ayahs and surahs
      let totalMemorizedAyahsCount = 0;
      const memorizedSurahsSet = new Set();

      for (const surah of allSurahs) {
        try {
          // Fetch ayahs for this surah
          const ayahResponse = await fetch(`https://api.alquran.cloud/v1/surah/${surah.number}`);
          const ayahData = await ayahResponse.json();
          
          if (ayahData.code === 200 && ayahData.data && ayahData.data.ayahs) {
            let surahMemorizedCount = 0;
            const totalAyahsInSurah = ayahData.data.ayahs.length;
            
            for (const ayah of ayahData.data.ayahs) {
              const memorizationKey = `${surah.number}_${ayah.numberInSurah}`;
              const ayahMemorization = allMemorization[memorizationKey];
              
              if (ayahMemorization) {
                const readCompleted = ayahMemorization.readingCount && ayahMemorization.readingCount >= readTargetNum;
                const listenCompleted = ayahMemorization.listeningCount && ayahMemorization.listeningCount >= listenTargetNum;
                const quizCompleted = ayahMemorization.quizPassed === true;
                
                // An ayah is fully memorized if:
                // 1. Memorization is complete (read OR listen reached target)
                // 2. Quiz is passed (if quiz is required) OR quiz is not required
                const isMemorized = (readCompleted || listenCompleted) && 
                                    (isQuizRequired ? quizCompleted : true);
                
                if (isMemorized) {
                  totalMemorizedAyahsCount++;
                  surahMemorizedCount++;
                }
              }
            }
            
            // If all ayahs in surah are memorized, mark surah as memorized
            if (surahMemorizedCount === totalAyahsInSurah && totalAyahsInSurah > 0) {
              memorizedSurahsSet.add(surah.number);
            }
          }
        } catch (error) {
          console.error(`Error processing surah ${surah.number}:`, error);
        }
      }
      
      setTotalMemorizedAyahs(totalMemorizedAyahsCount);
      setCalculatedMemorizedSurahs(memorizedSurahsSet);

      // Calculate time spent (in minutes)
      const timeSpentKey = `totalTimeSpent_${user.uid}`;
      const timeSpent = await AsyncStorage.getItem(timeSpentKey);
      const timeInMinutes = timeSpent ? Math.floor(parseInt(timeSpent, 10) / 60) : 0;
      setTotalTimeSpent(timeInMinutes);

      // Calculate daily goal progress (30 minutes goal)
      const today = new Date().toDateString();
      const dailyTimeKey = `dailyTime_${user.uid}_${today}`;
      const dailyTime = await AsyncStorage.getItem(dailyTimeKey);
      const dailyMinutes = dailyTime ? Math.floor(parseInt(dailyTime, 10) / 60) : 0;
      const goalProgress = Math.min((dailyMinutes / 30) * 100, 100);
      setDailyGoalProgress(goalProgress);

      // Calculate weekly progress - map days correctly (Mon-Sun)
      const weekProgress = {};
      const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
      const displayDays = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
      const todayDate = new Date();
      const todayDayOfWeek = todayDate.getDay(); // 0 = Sunday, 1 = Monday, etc.
      
      // Start from Monday of current week
      for (let i = 0; i < 7; i++) {
        const date = new Date(todayDate);
        // Calculate days to subtract to get Monday of current week
        const daysFromMonday = (todayDayOfWeek + 6) % 7; // Convert Sunday=0 to Monday=0
        date.setDate(todayDate.getDate() - daysFromMonday + i);
        const dateKey = date.toDateString();
        const dayKey = `dailyTime_${user.uid}_${dateKey}`;
        const dayTime = await AsyncStorage.getItem(dayKey);
        const dayName = displayDays[i]; // Use displayDays array to match the order
        weekProgress[dayName] = dayTime ? parseInt(dayTime, 10) > 0 : false;
      }
      setWeeklyProgress(weekProgress);
    } catch (error) {
      console.error('Error loading home stats:', error);
    }
  };

  // Mark entire surah as memorized (all ayahs)
  const handleSurahAlreadyMemorized = async (surah) => {
    Alert.alert(
      'Already Memorized?',
      `Are you sure you want to mark ${surah.englishName} and all ${surah.numberOfAyahs} ayahs as already memorized? This will auto-complete memorization and quiz for all ayahs.`,
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Yes, Mark Complete', 
          onPress: async () => {
            try {
              const user = auth.currentUser;
              if (!user) {
                Alert.alert('Error', 'Please log in to save progress.');
                return;
              }

              // Get user settings for targets
              const settings = await getUserSettings();
              const readTarget = settings.readTarget;
              const listenTarget = settings.listenTarget;

              // Fetch all ayahs for this surah
              const response = await fetch(`https://api.alquran.cloud/v1/surah/${surah.number}`);
              const data = await response.json();
              
              if (data.code === 200 && data.data && data.data.ayahs) {
                // Mark all ayahs as memorized
                for (const ayah of data.data.ayahs) {
                  await saveReadingCount(surah.number, ayah.numberInSurah, readTarget);
                  await saveListeningCount(surah.number, ayah.numberInSurah, listenTarget);
                  await saveQuizPassed(surah.number, ayah.numberInSurah, true);
                }

                // Mark surah as memorized
                const newMemorized = new Set(memorizedSurahs);
                newMemorized.add(surah.number);
                setMemorizedSurahs(newMemorized);
                await saveMemorizedSurahs(newMemorized);

                // Reload stats
                loadHomeStats();
                
                Alert.alert('Success', `${surah.englishName} has been marked as memorized!`);
              } else {
                Alert.alert('Error', 'Failed to load ayahs for this surah.');
              }
            } catch (error) {
              console.error('Error marking surah as already memorized:', error);
              Alert.alert('Error', 'Failed to save progress.');
            }
          }
        }
      ]
    );
  };

  // Navigate to ayahs screen for a selected surah (for memorization)
  const loadSurahAyahs = (surah) => {
    navigation.navigate('MemorizeAyahsScreen', {
      surah,
      source: 'memorize' // Mark that this came from memorization
    });
  };

  // Get info about the next ayah to memorize (without navigating)
  const loadNextAyahInfo = async () => {
    try {
      const user = auth.currentUser;
      if (!user) {
        setNextAyahInfo(null);
        return;
      }

      // Load user settings
      const settings = await getUserSettings();
      const readTarget = settings.readTarget || 10;
      const listenTarget = settings.listenTarget || 10;
      const quizRequired = settings.quizRequired !== false; // Default to true
      const memorize30thJuzFirst = settings.memorize30thJuzFirst || false;

      // Load all surahs if not already loaded
      let surahsList = surahs;
      if (surahsList.length === 0) {
        setNextAyahInfo(null);
        return;
      }

      // Sort surahs based on memorize30thJuzFirst setting
      // 30th juz contains surahs 78-114
      if (memorize30thJuzFirst) {
        // Sort: 30th juz (78-114) first, then 1-77
        surahsList = [...surahsList].sort((a, b) => {
          const aIn30thJuz = a.number >= 78 && a.number <= 114;
          const bIn30thJuz = b.number >= 78 && b.number <= 114;
          
          if (aIn30thJuz && !bIn30thJuz) return -1;
          if (!aIn30thJuz && bIn30thJuz) return 1;
          
          // Within same group, sort by number
          return a.number - b.number;
        });
      } else {
        // Normal order: 1-114
        surahsList = [...surahsList].sort((a, b) => a.number - b.number);
      }

      // Go through each surah in order
      for (const surah of surahsList) {
        // Fetch ayahs for this surah
        const response = await fetch(`https://api.alquran.cloud/v1/surah/${surah.number}`);
        const data = await response.json();
        
        if (data.code !== 200 || !data.data || !data.data.ayahs) {
          continue; // Skip if we can't load ayahs
        }

        const ayahs = data.data.ayahs;
        const memorization = await getSurahMemorization(surah.number);

        // Check each ayah in order
        for (let i = 0; i < ayahs.length; i++) {
          const ayah = ayahs[i];
          const ayahNumber = ayah.numberInSurah;
          const ayahData = memorization[ayahNumber];

          // Check if previous ayah is complete (if not the first ayah)
          if (ayahNumber > 1) {
            const previousAyahNumber = ayahNumber - 1;
            const previousAyahData = memorization[previousAyahNumber];
            
            // Check if previous ayah is fully complete
            const prevReadCompleted = previousAyahData?.readingCount >= readTarget;
            const prevListenCompleted = previousAyahData?.listeningCount >= listenTarget;
            const prevMemorized = prevReadCompleted || prevListenCompleted;
            const prevQuizPassed = !quizRequired || previousAyahData?.quizPassed === true;
            const prevFullyComplete = prevMemorized && prevQuizPassed;

            if (!prevFullyComplete) {
              // Previous ayah is not complete, show that one
              setNextAyahInfo({
                surahName: surah.englishName || `Surah ${surah.number}`,
                ayahNumber: previousAyahNumber
              });
              return;
            }
          }

          // Check if this ayah is fully complete
          const readCompleted = ayahData?.readingCount >= readTarget;
          const listenCompleted = ayahData?.listeningCount >= listenTarget;
          const memorized = readCompleted || listenCompleted;
          const quizPassed = !quizRequired || ayahData?.quizPassed === true;
          const fullyComplete = memorized && quizPassed;

          if (!fullyComplete) {
            // Found the next ayah to memorize
            setNextAyahInfo({
              surahName: surah.englishName || `Surah ${surah.number}`,
              ayahNumber: ayahNumber
            });
            return;
          }
        }
      }

      // If we get here, all ayahs are memorized
      setNextAyahInfo(null);
    } catch (error) {
      console.error('Error loading next ayah info:', error);
      setNextAyahInfo(null);
    }
  };

  // Find the next ayah to memorize across all surahs
  const findNextAyahToMemorize = async () => {
    try {
      const user = auth.currentUser;
      if (!user) {
        Alert.alert('Error', 'Please log in to continue memorizing.');
        return;
      }

      // Load user settings
      const settings = await getUserSettings();
      const readTarget = settings.readTarget || 10;
      const listenTarget = settings.listenTarget || 10;
      const quizRequired = settings.quizRequired !== false; // Default to true
      const memorize30thJuzFirst = settings.memorize30thJuzFirst || false;

      // Load all surahs if not already loaded
      let surahsList = surahs;
      if (surahsList.length === 0) {
        const response = await fetch('https://api.alquran.cloud/v1/surah');
        const data = await response.json();
        if (data.code === 200 && data.data) {
          surahsList = data.data;
        } else {
          Alert.alert('Error', 'Failed to load surahs.');
          return;
        }
      }

      // Sort surahs based on memorize30thJuzFirst setting
      // 30th juz contains surahs 78-114
      if (memorize30thJuzFirst) {
        // Sort: 30th juz (78-114) first, then 1-77
        surahsList.sort((a, b) => {
          const aIn30thJuz = a.number >= 78 && a.number <= 114;
          const bIn30thJuz = b.number >= 78 && b.number <= 114;
          
          if (aIn30thJuz && !bIn30thJuz) return -1;
          if (!aIn30thJuz && bIn30thJuz) return 1;
          
          // Within same group, sort by number
          return a.number - b.number;
        });
      } else {
        // Normal order: 1-114
        surahsList.sort((a, b) => a.number - b.number);
      }

      // Go through each surah in order
      for (const surah of surahsList) {
        // Fetch ayahs for this surah
        const response = await fetch(`https://api.alquran.cloud/v1/surah/${surah.number}`);
        const data = await response.json();
        
        if (data.code !== 200 || !data.data || !data.data.ayahs) {
          continue; // Skip if we can't load ayahs
        }

        const ayahs = data.data.ayahs;
        const memorization = await getSurahMemorization(surah.number);

        // Check each ayah in order
        for (let i = 0; i < ayahs.length; i++) {
          const ayah = ayahs[i];
          const ayahNumber = ayah.numberInSurah;
          const ayahData = memorization[ayahNumber];

          // Check if previous ayah is complete (if not the first ayah)
          if (ayahNumber > 1) {
            const previousAyahNumber = ayahNumber - 1;
            const previousAyahData = memorization[previousAyahNumber];
            
            // Check if previous ayah is fully complete
            const prevReadCompleted = previousAyahData?.readingCount >= readTarget;
            const prevListenCompleted = previousAyahData?.listeningCount >= listenTarget;
            const prevMemorized = prevReadCompleted || prevListenCompleted;
            const prevQuizPassed = !quizRequired || previousAyahData?.quizPassed === true;
            const prevFullyComplete = prevMemorized && prevQuizPassed;

            if (!prevFullyComplete) {
              // Previous ayah is not complete, so this ayah is not available yet
              // Navigate to the previous ayah instead
              const prevAyah = ayahs.find(a => a.numberInSurah === previousAyahNumber);
              if (prevAyah) {
                navigation.navigate('Book', {
                  screen: 'MemorizeAyahScreen',
                  params: {
                    surah: surah,
                    ayah: prevAyah
                  }
                });
                return;
              }
            }
          }

          // Check if this ayah is fully complete
          const readCompleted = ayahData?.readingCount >= readTarget;
          const listenCompleted = ayahData?.listeningCount >= listenTarget;
          const memorized = readCompleted || listenCompleted;
          const quizPassed = !quizRequired || ayahData?.quizPassed === true;
          const fullyComplete = memorized && quizPassed;

          if (!fullyComplete) {
            // Found the next ayah to memorize
            navigation.navigate('Book', {
              screen: 'MemorizeAyahScreen',
              params: {
                surah: surah,
                ayah: ayah
              }
            });
            return;
          }
        }
      }

      // If we get here, all ayahs are memorized
      Alert.alert('Congratulations!', 'You have memorized all ayahs in the Quran!');
    } catch (error) {
      console.error('Error finding next ayah to memorize:', error);
      Alert.alert('Error', 'Failed to find next ayah. Please try again.');
    }
  };

  // Real-time listener for user recordings
  useEffect(() => {
    const user = auth.currentUser;
    if (!user) {
      setUserRecordings({});
      return;
    }

    const recordingsQuery = query(
      collection(firestore, 'userRecordings'),
      where('userId', '==', user.uid)
    );

    const unsubscribe = onSnapshot(recordingsQuery, (snapshot) => {
      const recordings = {};
      snapshot.forEach((doc) => {
        const data = doc.data();
        const key = `${data.surahNumber}_${data.verseNumber}`;
        recordings[key] = {
          id: doc.id,
          ...data
        };
      });
      setUserRecordings(recordings);
    }, (error) => {
      console.error('Error fetching recordings:', error);
      if (error.code === 'permission-denied') {
        setUserRecordings({});
      }
    });

    return unsubscribe;
  }, [auth.currentUser?.uid]);

  const loadSurahs = async () => {
    try {
      setLoading(true);
      const response = await fetch('https://api.alquran.cloud/v1/surah');
      const data = await response.json();
      if (data.code === 200 && data.data) {
        setSurahs(data.data);
      }
    } catch (error) {
      console.error('Error loading surahs:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadUserRecordings = async () => {
    try {
      const user = auth.currentUser;
      if (!user) return;

      const recordingsQuery = query(
        collection(firestore, 'userRecordings'),
        where('userId', '==', user.uid)
      );
      const querySnapshot = await getDocs(recordingsQuery);
      const recordings = {};
      querySnapshot.forEach((doc) => {
        const data = doc.data();
        const key = `${data.surahNumber}_${data.verseNumber}`;
        recordings[key] = {
          id: doc.id,
          ...data
        };
      });
      setUserRecordings(recordings);
    } catch (error) {
      console.error('Error loading recordings:', error);
    }
  };

  // Check if verse is already recorded
  const isVerseRecorded = (surahNumber, verseNumber) => {
    return userRecordings[`${surahNumber}_${verseNumber}`] !== undefined;
  };

  // Check if surah is completely recorded
  const isSurahRecorded = (surahNumber) => {
    const surah = surahs.find(s => s.number === surahNumber);
    if (!surah) return false;
    
    for (let i = 1; i <= surah.numberOfAyahs; i++) {
      if (!isVerseRecorded(surahNumber, i)) {
        return false;
      }
    }
    return true;
  };

  // Get surah recording progress percentage
  const getSurahRecordingProgress = (surahNumber) => {
    const surah = surahs.find(s => s.number === surahNumber);
    if (!surah) return 0;
    
    let recordedCount = 0;
    for (let i = 1; i <= surah.numberOfAyahs; i++) {
      if (isVerseRecorded(surahNumber, i)) {
        recordedCount++;
      }
    }
    
    return Math.round((recordedCount / surah.numberOfAyahs) * 100);
  };

  // Handle surah selection
  const handleSurahSelection = async (surah) => {
    setRecordLoading(true);
    
    try {
      const response = await fetch(`https://api.alquran.cloud/v1/surah/${surah.number}`);
      const data = await response.json();
      
      if (data.code === 200 && data.data) {
        const verses = data.data.ayahs.map(ayah => ({
          ...ayah,
          text: ayah.text,
          numberInSurah: ayah.numberInSurah,
          surah: { number: surah.number, englishName: surah.englishName }
        }));

        // Fetch transliteration if available
        try {
          const transliterationResponse = await fetch(`https://api.alquran.cloud/v1/surah/${surah.number}/en.transliteration`);
          const transliterationData = await transliterationResponse.json();
          
          if (transliterationData.code === 200 && transliterationData.data) {
            verses.forEach(verse => {
              const transliterationVerse = transliterationData.data.ayahs.find(tv => tv.numberInSurah === verse.numberInSurah);
              if (transliterationVerse) {
                verse.transliteration = transliterationVerse.text;
              }
            });
          }
        } catch (error) {
          console.log('Could not fetch transliteration:', error);
        }

        // Fetch translation if available
        try {
          const translationResponse = await fetch(`https://api.alquran.cloud/v1/surah/${surah.number}/en.sahih`);
          const translationData = await translationResponse.json();
          
          if (translationData.code === 200 && translationData.data) {
            verses.forEach(verse => {
              const translationVerse = translationData.data.ayahs.find(tv => tv.numberInSurah === verse.numberInSurah);
              if (translationVerse) {
                verse.translation = translationVerse.text;
              }
            });
          }
        } catch (error) {
          console.log('Could not fetch translation:', error);
        }

        // Navigate to verse selection screen (for recording)
        // Stay within Home stack
        navigation.navigate('VerseSelectionScreen', {
          surah: surah,
          verses: verses,
          surahs: surahs,
          userRecordings: userRecordings,
          setUserRecordings: setUserRecordings,
          source: 'record' // Mark that this came from recording
        });
      } else {
        Alert.alert('Error', 'Failed to load verses for this surah.');
      }
    } catch (error) {
      console.error('Error fetching verses:', error);
      Alert.alert('Error', 'Failed to load verses. Please check your connection and try again.');
    } finally {
      setRecordLoading(false);
    }
  };

  const renderHomeTab = () => {
    const safeDailyGoalProgress = dailyGoalProgress || 0;
    const safeDailyMinutes = Math.floor((safeDailyGoalProgress / 100) * 30);
    const safeTotalMemorizedAyahs = totalMemorizedAyahs || 0;
    const safeTotalTimeSpent = totalTimeSpent || 0;

    const totalAyahsInQuran = 6236;
    const totalSurahsInQuran = 114;
    const ayahsProgress = totalAyahsInQuran > 0 ? (safeTotalMemorizedAyahs / totalAyahsInQuran) * 100 : 0;
    // Use the calculated memorized surahs from stats (all ayahs completed)
    const surahsMemorized = calculatedMemorizedSurahs.size;
    const surahsProgress = totalSurahsInQuran > 0 ? (surahsMemorized / totalSurahsInQuran) * 100 : 0;

    return (
      <ScrollView 
        style={styles.tabContent} 
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[
          styles.homeScrollContent,
          { paddingBottom: Platform.OS === 'android' ? 180 : 20 }
        ]}
      >
        <Animated.View 
          style={[styles.homeContainer, { opacity: fadeAnim }]}
        >
          {/* Recording Reminder - Always at Top */}
          <Animated.View style={[styles.reminderContainer, { opacity: reminderOpacity }]}>
            <Ionicons name="information-circle" size={16} color="#A3B1CC" />
            <Text style={styles.reminderText}>
              You can now record and save a collection of your recorded audio and listen to it in the Quran and Guided Prayer screen through the Record option.
            </Text>
          </Animated.View>

          {/* Progress Section */}
          <View style={styles.progressSection}>
            {/* Ayahs Memorized Progress */}
            <View style={styles.progressItem}>
              <View style={styles.progressHeader}>
                <Text style={styles.progressLabel}>
                  Ayahs Memorized
                </Text>
                <Text style={styles.progressText}>
                  {safeTotalMemorizedAyahs} / {totalAyahsInQuran}
                </Text>
              </View>
              <View style={styles.progressBarContainer}>
                <Animated.View 
                  style={[
                    styles.progressBar, 
                    { 
                      width: progressAnim1.interpolate({
                        inputRange: [0, 100],
                        outputRange: ['0%', '100%'],
                      })
                    }
                  ]} 
                />
              </View>
            </View>

            {/* Surahs Memorized Progress */}
            <View style={styles.progressItem}>
              <View style={styles.progressHeader}>
                <Text style={styles.progressLabel}>
                  Surahs Memorized
                </Text>
                <Text style={styles.progressText}>
                  {surahsMemorized} / {totalSurahsInQuran}
                </Text>
              </View>
              <View style={styles.progressBarContainer}>
                <Animated.View 
                  style={[
                    styles.progressBar, 
                    { 
                      width: progressAnim2.interpolate({
                        inputRange: [0, 100],
                        outputRange: ['0%', '100%'],
                      })
                    }
                  ]} 
                />
              </View>
            </View>
          </View>

          {/* Settings Section */}
          <View style={styles.settingsSection}>
            <Text style={styles.settingsTitle}>Settings</Text>
            
            {/* Read Tracker Target */}
            <View style={styles.settingItem}>
              <Text style={styles.settingLabel}>Read Tracker Target</Text>
              <TextInput
                style={styles.settingInput}
                value={readTrackerTarget.toString()}
                onChangeText={(text) => {
                  const num = parseInt(text, 10) || 0;
                  if (num >= 1 && num <= 100) {
                    setReadTrackerTarget(num);
                    saveSettings(num, listenTrackerTarget, quizRequired, memorize30thJuzFirst);
                  }
                }}
                keyboardType="number-pad"
                placeholder="10"
              />
            </View>

            {/* Listen Tracker Target */}
            <View style={styles.settingItem}>
              <Text style={styles.settingLabel}>Listen Tracker Target</Text>
              <TextInput
                style={styles.settingInput}
                value={listenTrackerTarget.toString()}
                onChangeText={(text) => {
                  const num = parseInt(text, 10) || 0;
                  if (num >= 1 && num <= 100) {
                    setListenTrackerTarget(num);
                    saveSettings(readTrackerTarget, num, quizRequired, memorize30thJuzFirst);
                  }
                }}
                keyboardType="number-pad"
                placeholder="10"
              />
            </View>

            {/* Quiz Required */}
            <View style={styles.settingItem}>
              <Text style={styles.settingLabel}>Quiz Required</Text>
              <Switch
                value={quizRequired}
                onValueChange={(value) => {
                  setQuizRequired(value);
                  saveSettings(readTrackerTarget, listenTrackerTarget, value, memorize30thJuzFirst);
                }}
                trackColor={{ false: '#4B5563', true: '#A3B1CC' }}
                thumbColor={quizRequired ? '#FFFFFF' : '#B0B0B0'}
              />
            </View>

            {/* Memorize 30th Juz First */}
            <View style={[styles.settingItem, styles.settingItemLast]}>
              <Text style={styles.settingLabel}>Memorize 30th Juz First</Text>
              <Switch
                value={memorize30thJuzFirst}
                onValueChange={(value) => {
                  setMemorize30thJuzFirst(value);
                  saveSettings(readTrackerTarget, listenTrackerTarget, quizRequired, value);
                }}
                trackColor={{ false: '#4B5563', true: '#A3B1CC' }}
                thumbColor={memorize30thJuzFirst ? '#FFFFFF' : '#B0B0B0'}
              />
            </View>
          </View>
        </Animated.View>
        
        {/* Continue Memorizing Button - At Bottom */}
        <View style={styles.continueButtonContainer}>
          <Animated.View style={{ transform: [{ scale: buttonScale }] }}>
            <TouchableOpacity
              style={styles.continueButton}
              onPress={() => {
                Animated.sequence([
                  Animated.timing(buttonScale, {
                    toValue: 0.95,
                    duration: 100,
                    useNativeDriver: true,
                  }),
                  Animated.timing(buttonScale, {
                    toValue: 1,
                    duration: 100,
                    useNativeDriver: true,
                  }),
                ]).start();
                findNextAyahToMemorize();
              }}
              activeOpacity={0.8}
            >
            <Text style={styles.continueButtonText}>Continue memorizing</Text>
            {nextAyahInfo && (
              <Text style={styles.continueButtonNote}>
                {nextAyahInfo.surahName} - Ayah {nextAyahInfo.ayahNumber}
              </Text>
            )}
            {!nextAyahInfo && totalMemorizedAyahs > 0 && (
              <Text style={styles.continueButtonNote}>
                All ayahs memorized! 🎉
              </Text>
            )}
          </TouchableOpacity>
          </Animated.View>
        </View>
      </ScrollView>
    );
  };

  const renderReviewTab = () => (
    <ScrollView 
      style={styles.tabContent} 
      showsVerticalScrollIndicator={false}
      contentContainerStyle={{
        paddingBottom: Platform.OS === 'android' ? 180 : 20
      }}
    >
      <View style={styles.tabContainer}>
        <Text style={styles.tabTitle}>{t('review', currentLanguage) || 'Review'}</Text>
        <Text style={styles.comingSoonText}>
          {t('comingSoon', currentLanguage) || 'Coming Soon'}
        </Text>
        <Text style={styles.comingSoonDescription}>
          {t('reviewFeatureDescription', currentLanguage) || 'Review your memorized verses and track your progress.'}
        </Text>
      </View>
    </ScrollView>
  );

  // Animated surah item component for memorize tab
  const AnimatedMemorizeSurahItem = ({ item, index }) => {
    const itemOpacity = useRef(new Animated.Value(0)).current;
    const itemTranslateY = useRef(new Animated.Value(20)).current;
    
    useEffect(() => {
      Animated.parallel([
        Animated.timing(itemOpacity, {
          toValue: 1,
          duration: 400,
          delay: index * 50,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
        Animated.timing(itemTranslateY, {
          toValue: 0,
          duration: 400,
          delay: index * 50,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
      ]).start();
    }, []);
    
    return (
      <Animated.View
        style={{
          opacity: itemOpacity,
          transform: [{ translateY: itemTranslateY }],
        }}
      >
        {renderMemorizeSurahItem({ item })}
      </Animated.View>
    );
  };

  const AnimatedRecordSurahItem = ({ item, index }) => {
    const itemOpacity = useRef(new Animated.Value(0)).current;
    const itemTranslateX = useRef(new Animated.Value(20)).current;
    
    useEffect(() => {
      Animated.parallel([
        Animated.timing(itemOpacity, {
          toValue: 1,
          duration: 400,
          delay: index * 50,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
        Animated.timing(itemTranslateX, {
          toValue: 0,
          duration: 400,
          delay: index * 50,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
      ]).start();
    }, []);
    
    return (
      <Animated.View
        style={{
          opacity: itemOpacity,
          transform: [{ translateX: itemTranslateX }],
        }}
      >
        {renderSurahItem({ item })}
      </Animated.View>
    );
  };

  // Render surah item for memorize tab
  const renderMemorizeSurahItem = ({ item }) => {
    if (!item || typeof item !== 'object') {
      return null;
    }

    const isMemorized = memorizedSurahs.has(item.number);

    return (
      <TouchableOpacity
        style={styles.memorizeSurahItem}
        onPress={() => loadSurahAyahs(item)}
        activeOpacity={0.7}
      >
        <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
          {/* Surah Number on the left */}
          <Text style={styles.memorizeSurahNumber}>
            {item.number || '?'}
          </Text>

          {/* Surah Info */}
          <View style={{ flex: 1, marginLeft: 12 }}>
            <Text style={styles.memorizeSurahName}>
              {item.englishName || 'Unknown'}
            </Text>
            <Text style={styles.memorizeSurahInfo}>
              {getProperSurahName(item.number, currentLanguage)} • {item.revelationType || ''} • {item.numberOfAyahs || 0} ayahs
            </Text>
          </View>

          {/* Already Memorized? text on the right */}
          {!isMemorized && (
            <TouchableOpacity
              style={styles.alreadyMemorizedSurahButton}
              onPress={(e) => {
                e.stopPropagation();
                handleSurahAlreadyMemorized(item);
              }}
            >
              <Text style={styles.alreadyMemorizedSurahText}>Already Memorized?</Text>
            </TouchableOpacity>
          )}
          {isMemorized && (
            <Ionicons name="checkmark-circle" size={24} color="#34D399" />
          )}
        </View>
      </TouchableOpacity>
    );
  };

  const renderMemorizeTab = () => {
    // Show surah list
    if (loading && surahs.length === 0) {
      return (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#FFD700" />
          <Text style={styles.loadingText}>{t('loading', currentLanguage) || 'Loading...'}</Text>
        </View>
      );
    }

    const memorizedCount = memorizedSurahs.size;
    const totalCount = surahs.length;

    // Sort surahs based on memorize30thJuzFirst setting
    // 30th juz contains surahs 78-114
    const sortedSurahs = [...surahs].sort((a, b) => {
      if (memorize30thJuzFirst) {
        // Show 30th juz (78-114) first, then 1-77
        const aIn30thJuz = a.number >= 78 && a.number <= 114;
        const bIn30thJuz = b.number >= 78 && b.number <= 114;
        
        if (aIn30thJuz && !bIn30thJuz) return -1;
        if (!aIn30thJuz && bIn30thJuz) return 1;
        
        // Within same group, sort by number
        return a.number - b.number;
      } else {
        // Normal order: 1-114
        return a.number - b.number;
      }
    });

    return (
      <Animated.View style={[styles.tabContent, { opacity: fadeAnim }]}>
        {/* Surah List */}
        <FlatList
          data={sortedSurahs}
          renderItem={({ item, index }) => <AnimatedMemorizeSurahItem item={item} index={index} />}
          keyExtractor={(item) => item.number.toString()}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.memorizeListContent}
          extraData={[memorizedSurahs, memorize30thJuzFirst]}
        />
      </Animated.View>
    );
  };

  // Render surah item with progress indicator
  const renderSurahItem = ({ item }) => {
    if (!item || typeof item !== 'object') {
      return null;
    }

    const progress = getSurahRecordingProgress(item.number);
    const isComplete = isSurahRecorded(item.number);
    const hasRecordings = progress > 0;

    return (
      <TouchableOpacity
        style={styles.surahItem}
        onPress={() => handleSurahSelection(item)}
        disabled={recordLoading}
      >
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
          <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center' }}>
            {/* Progress Circle */}
            <View style={[
              styles.progressCircle,
              { borderColor: isComplete ? '#34D399' : hasRecordings ? '#F87171' : '#4B5563' }
            ]}>
              {isComplete ? (
                <Ionicons name="checkmark" size={20} color="#34D399" />
              ) : hasRecordings ? (
                <Text style={styles.progressText}>
                  {progress}%
                </Text>
              ) : (
                <View style={styles.progressDot} />
              )}
            </View>

            {/* Surah Info */}
            <View style={{ flex: 1 }}>
              <Text style={styles.surahName}>
                {item.englishName || 'Unknown'}
              </Text>
              <Text style={styles.surahInfo}>
                {getProperSurahName(item.number, currentLanguage)} • {item.revelationType || ''} • {item.numberOfAyahs || 0} ayahs
              </Text>
            </View>
          </View>

          {/* Surah Number */}
          <Text style={styles.surahNumber}>
            {item.number || '?'}
          </Text>
        </View>

        {/* Progress Bar */}
        {hasRecordings && (
          <View style={styles.progressBarContainer}>
            <View style={[styles.progressBar, { 
              backgroundColor: isComplete ? '#34D399' : '#F87171',
              width: `${progress}%`,
            }]} />
          </View>
        )}
      </TouchableOpacity>
    );
  };

  const renderRecordTab = () => {
    if (loading && surahs.length === 0) {
      return (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#FFD700" />
          <Text style={styles.loadingText}>{t('loading', currentLanguage) || 'Loading...'}</Text>
        </View>
      );
    }

    return (
      <Animated.View style={[styles.tabContent, { opacity: fadeAnim }]}>
        <FlatList
          data={surahs}
          renderItem={({ item, index }) => <AnimatedRecordSurahItem item={item} index={index} />}
          keyExtractor={(item) => item.number.toString()}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.surahListContent}
          extraData={refreshKey}
          ListHeaderComponent={
            <Animated.View style={[styles.surahListHeader, { opacity: reminderOpacity }]}>
              <Text style={styles.surahListHeaderText}>
                {surahs.length} {t('surahsAvailable', currentLanguage) || 'Surahs Available'}
              </Text>
            </Animated.View>
          }
        />
        {recordLoading && (
          <View style={styles.recordLoadingOverlay}>
            <ActivityIndicator size="large" color="#FFD700" />
          </View>
        )}
      </Animated.View>
    );
  };

  const renderContent = () => {
    switch (activeTab) {
      case 'home':
        return renderHomeTab();
      case 'memorize':
        return renderMemorizeTab();
      case 'record':
        return renderRecordTab();
      default:
        return renderHomeTab();
    }
  };

  return (
    <LinearGradient colors={["#181818", "#232323"]} style={styles.gradient}>
      <SafeAreaView style={styles.container}>
        <StatusBar barStyle="light-content" backgroundColor="#121212" />
        
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => navigation.goBack()}
          >
            <Ionicons name="chevron-back" size={24} color="#fff" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>
            {t('memorization', currentLanguage) || 'Memorization'}
          </Text>
          <View style={styles.headerSpacer} />
        </View>

        {/* Content */}
        {renderContent()}

        {/* Tab Navigation - Moved to Bottom */}
        <View style={styles.tabBar}>
          <TouchableOpacity
            style={[styles.tab, activeTab === 'home' && styles.activeTab]}
            onPress={() => setActiveTab('home')}
            activeOpacity={0.7}
          >
            <Ionicons 
              name={activeTab === 'home' ? 'home' : 'home-outline'} 
              size={20} 
              color={activeTab === 'home' ? '#A3B1CC' : '#b0b0b0'} 
            />
            <Text style={[styles.tabLabel, activeTab === 'home' && styles.activeTabLabel]}>
              {t('home', currentLanguage) || 'Home'}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.tab, activeTab === 'memorize' && styles.activeTab]}
            onPress={() => setActiveTab('memorize')}
            activeOpacity={0.7}
          >
            <Ionicons 
              name={activeTab === 'memorize' ? 'book' : 'book-outline'} 
              size={20} 
              color={activeTab === 'memorize' ? '#A3B1CC' : '#b0b0b0'} 
            />
            <Text style={[styles.tabLabel, activeTab === 'memorize' && styles.activeTabLabel]}>
              {t('memorize', currentLanguage) || 'Memorize'}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.tab, activeTab === 'record' && styles.activeTab]}
            onPress={() => setActiveTab('record')}
            activeOpacity={0.7}
          >
            <Ionicons 
              name={activeTab === 'record' ? 'mic' : 'mic-outline'} 
              size={20} 
              color={activeTab === 'record' ? '#A3B1CC' : '#b0b0b0'} 
            />
            <Text style={[styles.tabLabel, activeTab === 'record' && styles.activeTabLabel]}>
              {t('record', currentLanguage) || 'Record'}
            </Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  gradient: {
    flex: 1,
  },
  container: {
    flex: 1,
    backgroundColor: '#121212',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 20,
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
  },
  headerSpacer: {
    width: 40,
  },
  tabBar: {
    flexDirection: 'row',
    backgroundColor: '#232323',
    paddingHorizontal: 10,
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: '#333',
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    borderRadius: 8,
  },
  activeTab: {
    backgroundColor: '#333',
  },
  tabLabel: {
    fontSize: 12,
    color: '#b0b0b0',
    marginTop: 4,
    fontWeight: '500',
  },
  activeTabLabel: {
    color: '#A3B1CC',
    fontWeight: '600',
  },
  tabContent: {
    flex: 1,
    paddingBottom: 80, // Add padding to account for bottom navbar
  },
  homeContainer: {
    padding: getTabletPadding(20),
  },
  topBanner: {
    backgroundColor: '#1E1E1E',
    borderRadius: 16,
    padding: 20,
    marginBottom: 24,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: '#2A2A2A',
  },
  bannerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  bannerIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#A3B1CC',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  bannerIconText: {
    color: '#121212',
    fontSize: 18,
    fontWeight: 'bold',
  },
  greetingText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#FFFFFF',
    flex: 1,
  },
  bannerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  bannerBookText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#A3B1CC',
  },
  weeklyProgressSection: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 16,
  },
  weeklyProgressDays: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 8,
  },
  dayContainer: {
    alignItems: 'center',
    flex: 1,
  },
  dayActiveIndicator: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#1E1E1E',
    borderWidth: 2,
    borderColor: '#A3B1CC',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
    flexDirection: 'row',
  },
  dayInactiveIndicator: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#2A2A2A',
    borderWidth: 2,
    borderColor: '#4B5563',
    marginBottom: 8,
  },
  dayTodayIndicator: {
    borderColor: '#A3B1CC',
    borderWidth: 3,
  },
  dayIcon: {
    marginHorizontal: 1,
  },
  dayLabel: {
    fontSize: 12,
    color: '#B0B0B0',
    fontWeight: '500',
  },
  dayLabelToday: {
    color: '#A3B1CC',
    fontWeight: '600',
  },
  dailyGoalSection: {
    marginBottom: 24,
  },
  dailyGoalContent: {
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  dailyGoalText: {
    fontSize: 16,
    color: '#FFFFFF',
    fontWeight: '500',
    textAlign: 'center',
  },
  progressBarContainer: {
    height: 8,
    backgroundColor: '#2A2A2A',
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressBar: {
    height: '100%',
    backgroundColor: '#A3B1CC',
    borderRadius: 4,
  },
  progressSection: {
    marginBottom: getResponsiveSpacing(24),
  },
  progressItem: {
    backgroundColor: '#1E1E1E',
    borderRadius: getResponsiveBorderRadius(16),
    padding: getTabletPadding(20),
    marginBottom: getResponsiveSpacing(16),
    borderWidth: 1,
    borderColor: '#2A2A2A',
  },
  progressHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  progressLabel: {
    fontSize: getResponsiveFontSize(18),
    fontWeight: 'bold',
    color: '#FFFFFF',
    flex: 1,
  },
  progressText: {
    fontSize: getResponsiveFontSize(18),
    color: '#FFFFFF',
    fontWeight: 'normal',
  },
  reminderContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginTop: 0,
    marginBottom: getResponsiveSpacing(24),
    padding: getTabletPadding(12),
    backgroundColor: '#2A2A2A',
    borderRadius: getResponsiveBorderRadius(8),
    borderWidth: 1,
    borderColor: '#4B5563',
  },
  reminderText: {
    fontSize: getResponsiveFontSize(12),
    color: '#B0B0B0',
    marginLeft: getResponsiveSpacing(8),
    flex: 1,
    lineHeight: getResponsiveFontSize(18),
  },
  settingsSection: {
    marginTop: getResponsiveSpacing(24),
    backgroundColor: '#1E1E1E',
    borderRadius: getResponsiveBorderRadius(16),
    padding: getTabletPadding(20),
    borderWidth: 1,
    borderColor: '#2A2A2A',
  },
  settingsTitle: {
    fontSize: getResponsiveFontSize(18),
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: getResponsiveSpacing(20),
  },
  settingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: getResponsiveSpacing(16),
    paddingBottom: getResponsiveSpacing(16),
    borderBottomWidth: 1,
    borderBottomColor: '#2A2A2A',
  },
  settingItemLast: {
    marginBottom: 0,
    paddingBottom: 0,
    borderBottomWidth: 0,
  },
  settingLabel: {
    fontSize: getResponsiveFontSize(16),
    color: '#FFFFFF',
    fontWeight: '500',
    flex: 1,
  },
  settingInput: {
    backgroundColor: '#2A2A2A',
    borderWidth: 1,
    borderColor: '#4B5563',
    borderRadius: getResponsiveBorderRadius(8),
    paddingHorizontal: getResponsiveSpacing(12),
    paddingVertical: getResponsiveSpacing(8),
    color: '#FFFFFF',
    fontSize: getResponsiveFontSize(16),
    width: getResponsiveContainerSize(80),
    textAlign: 'center',
  },
  continueButtonContainer: {
    paddingHorizontal: getTabletPadding(20),
    paddingBottom: getTabletPadding(20),
    paddingTop: getTabletPadding(20),
    backgroundColor: '#121212',
  },
  continueButton: {
    backgroundColor: '#2A2A2A',
    borderRadius: getResponsiveBorderRadius(16),
    padding: getTabletPadding(18),
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#A3B1CC',
  },
  continueButtonText: {
    fontSize: getResponsiveFontSize(18),
    fontWeight: 'bold',
    color: '#A3B1CC',
    marginBottom: getResponsiveSpacing(4),
  },
  continueButtonNote: {
    fontSize: getResponsiveFontSize(12),
    color: '#B0B0B0',
    fontWeight: 'normal',
    textAlign: 'center',
    marginTop: getResponsiveSpacing(4),
  },
  homeScrollContent: {
    paddingBottom: getResponsiveSpacing(100),
  },
  tabContainer: {
    padding: 20,
  },
  tabTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 20,
  },
  comingSoonText: {
    fontSize: 20,
    color: '#FFD700',
    fontWeight: '600',
    marginBottom: 12,
  },
  comingSoonDescription: {
    fontSize: 16,
    color: '#b0b0b0',
    lineHeight: 24,
  },
  recordDescription: {
    fontSize: 16,
    color: '#b0b0b0',
    lineHeight: 24,
    marginBottom: 30,
  },
  recordButton: {
    backgroundColor: '#FF3B30',
    borderRadius: 16,
    padding: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    marginTop: 20,
  },
  recordButtonText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  surahItem: {
    padding: getTabletPadding(20),
    borderBottomWidth: 1,
    borderColor: '#2A2A2A',
    backgroundColor: '#1E1E1E',
    marginHorizontal: getResponsiveSpacing(16),
    marginVertical: getResponsiveSpacing(4),
    borderRadius: getResponsiveBorderRadius(12),
  },
  progressCircle: {
    width: getResponsiveContainerSize(40),
    height: getResponsiveContainerSize(40),
    borderRadius: getResponsiveContainerSize(20),
    borderWidth: 2,
    backgroundColor: 'transparent',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: getResponsiveSpacing(16),
  },
  progressText: {
    color: '#F87171',
    fontSize: getResponsiveFontSize(12),
    fontWeight: 'bold',
  },
  progressDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#4B5563',
  },
  surahName: {
    fontWeight: 'bold',
    color: '#FFFFFF',
    fontSize: 16,
  },
  surahInfo: {
    color: '#B0B0B0',
    marginTop: 4,
    marginRight: 50,
  },
  surahNumber: {
    color: '#B0B0B0',
    fontWeight: 'bold',
    fontSize: 16,
    marginLeft: 12,
    minWidth: 32,
    textAlign: 'right',
  },
  progressBarContainer: {
    marginTop: 12,
    height: 4,
    backgroundColor: '#374151',
    borderRadius: 2,
    overflow: 'hidden',
  },
  progressBar: {
    height: '100%',
    borderRadius: 2,
  },
  surahListContent: {
    paddingVertical: 16,
  },
  surahListHeader: {
    paddingHorizontal: 20,
    paddingBottom: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  surahListHeaderText: {
    color: '#B0B0B0',
    fontSize: 16,
    fontWeight: '500',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#232323',
  },
  loadingText: {
    color: '#fff',
    marginTop: 10,
  },
  recordLoadingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  memorizeHeader: {
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#2A2A2A',
    backgroundColor: '#1E1E1E',
  },
  memorizeHeaderTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 8,
  },
  memorizeStats: {
    fontSize: 16,
    color: '#B0B0B0',
  },
  memorizeSurahItem: {
    padding: getTabletPadding(20),
    borderBottomWidth: 1,
    borderColor: '#2A2A2A',
    backgroundColor: '#1E1E1E',
    marginHorizontal: getResponsiveSpacing(16),
    marginVertical: getResponsiveSpacing(4),
    borderRadius: getResponsiveBorderRadius(12),
  },
  memorizeSurahName: {
    fontWeight: 'bold',
    color: '#FFFFFF',
    fontSize: getResponsiveFontSize(16),
  },
  memorizeSurahInfo: {
    color: '#888888',
    marginTop: getResponsiveSpacing(2),
    fontSize: getResponsiveFontSize(11),
    fontWeight: '400',
    opacity: 0.8,
  },
  memorizeSurahNumber: {
    color: '#B0B0B0',
    fontWeight: 'bold',
    fontSize: getResponsiveFontSize(16),
    minWidth: getResponsiveContainerSize(32),
    textAlign: 'left',
  },
  alreadyMemorizedSurahButton: {
    marginLeft: getResponsiveSpacing(12),
  },
  alreadyMemorizedSurahText: {
    fontSize: getResponsiveFontSize(12),
    color: '#34D399',
    fontStyle: 'italic',
  },
  memorizeListContent: {
    paddingVertical: getResponsiveSpacing(16),
  },
});

