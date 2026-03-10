import React, { useState, useEffect, useRef } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  ScrollView, 
  TouchableOpacity, 
  StatusBar, 
  SafeAreaView,
  Modal,
  TextInput,
  Dimensions,
  Alert,
  ActivityIndicator,
  Animated,
  Easing,
  Platform
} from 'react-native';
import { Calendar, LocaleConfig } from 'react-native-calendars';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { auth, firestore } from '../firebase';
import { 
  doc, 
  getDoc, 
  setDoc, 
  updateDoc, 
  collection, 
  getDocs, 
  query, 
  orderBy,
  onSnapshot,
  serverTimestamp,
  deleteDoc 
} from 'firebase/firestore';
import prayerService from '../services/prayerService';
import prayerBlockerService from '../services/prayerBlockerService';
import { useLanguage } from '../utils/useLanguage';
import { t } from '../utils/translations';
import { getDynamicFontSize, getDynamicLineHeight, getDynamicPadding } from '../utils/responsiveText';

// Configure calendar locales
LocaleConfig.locales['en'] = {
  monthNames: ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'],
  monthNamesShort: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'],
  dayNames: ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'],
  dayNamesShort: ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
};

LocaleConfig.locales['es'] = {
  monthNames: ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'],
  monthNamesShort: ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'],
  dayNames: ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'],
  dayNamesShort: ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb']
};

LocaleConfig.locales['fr'] = {
  monthNames: ['Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin', 'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre'],
  monthNamesShort: ['Jan', 'Fév', 'Mar', 'Avr', 'Mai', 'Juin', 'Juil', 'Août', 'Sep', 'Oct', 'Nov', 'Déc'],
  dayNames: ['Dimanche', 'Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi'],
  dayNamesShort: ['Dim', 'Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam']
};

LocaleConfig.locales['it'] = {
  monthNames: ['Gennaio', 'Febbraio', 'Marzo', 'Aprile', 'Maggio', 'Giugno', 'Luglio', 'Agosto', 'Settembre', 'Ottobre', 'Novembre', 'Dicembre'],
  monthNamesShort: ['Gen', 'Feb', 'Mar', 'Apr', 'Mag', 'Giu', 'Lug', 'Ago', 'Set', 'Ott', 'Nov', 'Dic'],
  dayNames: ['Domenica', 'Lunedì', 'Martedì', 'Mercoledì', 'Giovedì', 'Venerdì', 'Sabato'],
  dayNamesShort: ['Dom', 'Lun', 'Mar', 'Mer', 'Gio', 'Ven', 'Sab']
};

// Set default locale
LocaleConfig.defaultLocale = 'en';

// Ramadan dates for different years (approximate, should be updated annually)
const RAMADAN_DATES = {
  2024: { start: new Date(2024, 2, 11), end: new Date(2024, 3, 9) }, // March 11 - April 9
  2025: { start: new Date(2025, 1, 28), end: new Date(2025, 2, 29) }, // Feb 28 - March 29
  2026: { start: new Date(2026, 1, 17), end: new Date(2026, 2, 18) }, // Feb 17 - March 18
  2027: { start: new Date(2027, 1, 6), end: new Date(2027, 2, 7) },   // Feb 6 - March 7
  2028: { start: new Date(2028, 0, 26), end: new Date(2028, 1, 24) }, // Jan 26 - Feb 24
};

const { width, height } = Dimensions.get('window');

// Helper function to get proper locale for calendar
const getCalendarLocale = (language) => {
  switch (language) {
    case 'english':
      return 'en';
    case 'spanish':
      return 'es';
    case 'french':
      return 'fr';
    case 'italian':
      return 'it';
    default:
      return 'en';
  }
};

// Helper function to get day names based on language
const getDayNames = (language) => {
  switch (language) {
    case 'english':
      return ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
    case 'spanish':
      return ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];
    case 'french':
      return ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'];
    case 'italian':
      return ['Lun', 'Mar', 'Mer', 'Gio', 'Ven', 'Sab', 'Dom'];
    default:
      return ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
  }
};

// Helper function to get day names with proper formatting for react-native-calendars
const getFormattedDayNames = (language) => {
  const dayNames = getDayNames(language);
  return dayNames.map(name => name.toUpperCase());
};

// Helper function to get language-specific day name styles for proper alignment
const getDayNameStyles = (language) => {
  switch (language) {
    case 'english':
      return {
        containerPadding: 5,
        textWidth: 45,
        fontSize: 14
      };
    case 'spanish':
      return {
        containerPadding: 8,
        textWidth: 50,
        fontSize: 13
      };
    case 'french':
      return {
        containerPadding: 6,
        textWidth: 48,
        fontSize: 13
      };
    case 'italian':
      return {
        containerPadding: 7,
        textWidth: 49,
        fontSize: 13
      };
    default:
      return {
        containerPadding: 5,
        textWidth: 45,
        fontSize: 14
      };
  }
};

// Add recommended fasting days configuration
const RECOMMENDED_FASTING_DAYS = {
  MONDAYS_THURSDAYS: {
    id: 'mondays_thursdays',
    name: 'Mondays and Thursdays',
    description: 'A gentle way to start regular voluntary fasting. The Prophet ﷺ fasted these days consistently.',
    hadith: 'Deeds are presented on Mondays and Thursdays, and I like that my deeds be presented while I am fasting.',
    source: 'Tirmidhi'
  },
  WHITE_DAYS: {
    id: 'white_days',
    name: 'White Days (Ayyam al-Beed)',
    description: '13th, 14th, and 15th of every Islamic month',
    hadith: 'If you fast three days of every month, then fast the 13th, 14th, and 15th.',
    source: 'Tirmidhi'
  },
  ARAFAH: {
    id: 'arafah',
    name: 'Day of Arafah',
    description: '9th Dhul-Hijjah - One of the most blessed days to fast (for non-pilgrims only)',
    hadith: 'It expiates the sins of the previous year and the coming year.',
    source: 'Muslim'
  },
  ASHURA: {
    id: 'ashura',
    name: 'Day of Ashura',
    description: '10th Muharram - A very important day of fasting in Islam',
    hadith: 'Fasting on the day of Ashura, I hope Allah will expiate thereby for the year that came before it.',
    source: 'Muslim'
  },
  SHAWWAL: {
    id: 'shawwal',
    name: 'Six Days of Shawwal',
    description: 'Fast any 6 days after Eid al-Fitr - great reward with manageable commitment',
    hadith: 'Whoever fasts Ramadan and follows it with six days of Shawwal, it is as if he fasted the entire year.',
    source: 'Muslim'
  },
  DHUL_HIJJAH: {
    id: 'dhul_hijjah',
    name: 'First Nine Days of Dhul-Hijjah',
    description: 'Especially Day 8 (Tarwiyah) and Day 9 (Arafah)',
    hadith: 'There are no days in which righteous deeds are more beloved to Allah than these ten days...',
    source: 'Bukhari'
  },
  SHABAN: {
    id: 'shaban',
    name: 'Days of Sha\'ban',
    description: 'The Prophet ﷺ fasted often in Sha\'ban',
    hadith: 'He used to fast Sha\'ban except for a few days.',
    source: 'Bukhari, Muslim'
  }
};

export default function ProfileScreen() {
  // Language support
  const { currentLanguage } = useLanguage();
  
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [selectedDateForDetail, setSelectedDateForDetail] = useState(null);
  const [currentMonth, setCurrentMonth] = useState(new Date().toISOString().split('T')[0]);
  const [prayerData, setPrayerData] = useState({});
  const [fastingData, setFastingData] = useState({
    regular: {},
    ramadan: {},
    missed: {
      incomplete: [],
      completed: []
    },
    completed: []
  });
  const [activeTab, setActiveTab] = useState('calendar');
  const [modalVisible, setModalVisible] = useState(false);
  const [dayDetailModalVisible, setDayDetailModalVisible] = useState(false);
  const [zakatCalculatorVisible, setZakatCalculatorVisible] = useState(false);
  const [zakatData, setZakatData] = useState({
    assets: {},
    deductions: {},
    nisabThreshold: 5000,
    lastCalculation: null,
    amount: 0,
    paid: false
  });
  const [excuseMode, setExcuseMode] = useState(false);
  const [excuseModeExplanationVisible, setExcuseModeExplanationVisible] = useState(false);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [showCancelFastOption, setShowCancelFastOption] = useState(false);
  const [calendarKey, setCalendarKey] = useState(0);
  const navigation = useNavigation();

  // Animation state variables
  const [headerAnim] = useState(new Animated.Value(0));
  const [sectionAnim] = useState(new Animated.Value(0));
  const [contentAnim] = useState(new Animated.Value(1));
  const [mainButtonScale] = useState(new Animated.Value(1));
  const [calculateButtonScale] = useState(new Animated.Value(1));
  const [paymentButtonScale] = useState(new Animated.Value(1));
  const [tabButtonScale] = useState(new Animated.Value(1));

  useEffect(() => {
    loadAllData();
    checkAndMarkMissedRamadanDays();
    
    // Check if cancel fast option should be shown
    const checkCancelFastOption = async () => {
      if (selectedDate && fastingData) {
        const selectedDateKey = getDateKey(selectedDate);
        const isAlreadyFasting = fastingData?.regular?.[selectedDateKey] || fastingData?.ramadan?.[selectedDateKey];
        setShowCancelFastOption(isAlreadyFasting);
      }
    };
    
    checkCancelFastOption();
    
    // Set up real-time listeners for all Deen Tracker data
    const user = auth.currentUser;
    if (user) {
      const unsubscribers = [];
      
      // Listen to prayer tracking changes
      const prayerUnsubscribe = onSnapshot(
        doc(firestore, 'prayerTracking', user.uid),
        async (doc) => {
          if (doc.exists()) {
            const prayerDataFromFirebase = doc.data();
            setPrayerData(prayerDataFromFirebase);
            
            // Cache locally for offline access
            AsyncStorage.setItem('prayerTracking', JSON.stringify(prayerDataFromFirebase));
            
            // CRITICAL: Sync to shared storage so blocker extension can see updates
            try {
              await prayerBlockerService.syncPrayerData(prayerDataFromFirebase);
              console.log('🔄 Real-time prayer data synced to shared storage for blocker');
            } catch (error) {
              console.error('❌ Error syncing prayer data to shared storage:', error);
            }
          } else {
            // If no document exists, set empty data
            setPrayerData({});
            AsyncStorage.setItem('prayerTracking', JSON.stringify({}));
            
            // Sync empty data to shared storage
            try {
              await prayerBlockerService.syncPrayerData({});
            } catch (error) {
              console.error('❌ Error syncing empty prayer data:', error);
            }
          }
        },
        (error) => {
          console.error('Error in prayer tracking listener:', error);
          if (error.code === 'permission-denied') {
            console.log('Permission denied - user likely logged out, clearing prayer data');
            setPrayerData({});
          }
        }
      );
      unsubscribers.push(prayerUnsubscribe);
      
      // Listen to fasting data changes
      const fastingUnsubscribe = onSnapshot(
        doc(firestore, 'users', user.uid, 'spiritualTracking', 'fastingData'),
        (doc) => {
          if (doc.exists()) {
            const fastingDataFromFirebase = doc.data();
            setFastingData(fastingDataFromFirebase);
            
            // Cache locally for offline access
            AsyncStorage.setItem('@fasting_data', JSON.stringify(fastingDataFromFirebase));
          }
        },
        (error) => {
          console.error('Error in fasting data listener:', error);
          if (error.code === 'permission-denied') {
            console.log('Permission denied - user likely logged out, clearing fasting data');
            setFastingData({});
          }
        }
      );
      unsubscribers.push(fastingUnsubscribe);
      
      // Listen to zakat data changes
      const zakatUnsubscribe = onSnapshot(
        doc(firestore, 'users', user.uid, 'spiritualTracking', 'zakatData'),
        (doc) => {
          if (doc.exists()) {
            const zakatDataFromFirebase = doc.data();
            setZakatData(zakatDataFromFirebase);
            
            // Cache locally for offline access
            AsyncStorage.setItem('@zakat_data', JSON.stringify(zakatDataFromFirebase));
          }
        },
        (error) => {
          console.error('Error in zakat data listener:', error);
          if (error.code === 'permission-denied') {
            console.log('Permission denied - user likely logged out, clearing zakat data');
            setZakatData({});
          }
        }
      );
      unsubscribers.push(zakatUnsubscribe);

      return () => {
        unsubscribers.forEach(unsubscribe => unsubscribe());
      };
    }
  }, []);
  
  // Check if cancel fast option should be shown when selectedDate or fastingData changes
  useEffect(() => {
    const checkCancelFastOption = async () => {
      if (selectedDate && fastingData) {
        const selectedDateKey = getDateKey(selectedDate);
        const isAlreadyFasting = fastingData?.regular?.[selectedDateKey] || fastingData?.ramadan?.[selectedDateKey];
        setShowCancelFastOption(isAlreadyFasting);
      }
    };
    
    checkCancelFastOption();
  }, [selectedDate, fastingData]);

  // Reload prayer data when screen comes into focus
  useFocusEffect(
    React.useCallback(() => {
      loadPrayerData();
      loadExcuseMode();
    }, [])
  );

  useEffect(() => {
    // Check for missed Ramadan days daily
    const interval = setInterval(() => {
      checkAndMarkMissedRamadanDays();
    }, 60000 * 60); // Check every hour

    return () => clearInterval(interval);
  }, [fastingData]);

  // Force calendar re-render when language changes
  useEffect(() => {
    // This will trigger a re-render of the calendar when language changes
    // The key prop will force the component to recreate
    console.log('🔄 Calendar language changed to:', currentLanguage, 'Locale:', getCalendarLocale(currentLanguage));
    
    // Set the locale configuration dynamically
    const locale = getCalendarLocale(currentLanguage);
    LocaleConfig.defaultLocale = locale;
    
    setCalendarKey(prev => prev + 1);
  }, [currentLanguage]);

  const loadAllData = async () => {
    try {
      setLoading(true);
      await Promise.all([
        loadPrayerData(),
        loadFastingData(),
        loadZakatData(),
        loadExcuseMode()
      ]);
    } catch (error) {
      console.error('Error loading all data:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadPrayerData = async () => {
    try {
      const user = auth.currentUser;
      if (!user) {
        console.log('No authenticated user found');
        return;
      }

      console.log('Loading prayer data from Firebase...');
      
      try {
        // Load from Firebase using prayerService
        const data = await prayerService.loadPrayerData();
        setPrayerData(data);
        console.log('✅ Prayer data loaded from Firebase');
        
        // Handle daily reset and streak management
        const resetInfo = await prayerService.handleDailyReset();
        if (resetInfo.isNewDay) {
          console.log('🔄 New day detected - prayers reset to unchecked');
          // Prayers are automatically unchecked for new days
          // Historical data is preserved in the calendar
        }
        
        if (resetInfo.yesterdayIncomplete) {
          console.log('⚠️ Yesterday was not completed - streak may be affected');
          // The streak calculation will handle this automatically
        }
        
      } catch (firebaseError) {
        console.warn('Firebase prayer load failed, using local cache:', firebaseError.message);
        
        // Fallback to local storage
        const storedData = await AsyncStorage.getItem('prayerTracking');
        if (storedData) {
          setPrayerData(JSON.parse(storedData));
          console.log('✅ Prayer data loaded from cache');
        }
      }
    } catch (error) {
      console.error('Error loading prayer data:', error);
    }
  };

  const loadFastingData = async () => {
    try {
      const user = auth.currentUser;
      if (!user) return;

      console.log('Loading fasting data from Firebase...');
      
      try {
        // Load from Firebase first
        const fastingDoc = await getDoc(doc(firestore, 'users', user.uid, 'spiritualTracking', 'fastingData'));
        
        if (fastingDoc.exists()) {
          const fastingDataFromFirebase = fastingDoc.data();
          setFastingData(fastingDataFromFirebase);
          console.log('✅ Fasting data loaded from Firebase');
          
          // Cache locally for offline access
          await AsyncStorage.setItem('@fasting_data', JSON.stringify(fastingDataFromFirebase));
        } else {
          console.log('No fasting data found in Firebase, creating default');
          await createDefaultFastingData(user);
        }
        
      } catch (firebaseError) {
        console.warn('Firebase fasting load failed, using local cache:', firebaseError.message);
        
        // Fallback to local storage
      const data = await AsyncStorage.getItem('@fasting_data');
      if (data) {
        setFastingData(JSON.parse(data));
          console.log('✅ Fasting data loaded from cache');
        }
      }
    } catch (error) {
      console.error('Error loading fasting data:', error);
    }
  };

  const loadZakatData = async () => {
    try {
      const user = auth.currentUser;
      if (!user) return;

      console.log('Loading zakat data from Firebase...');
      
      try {
        // Load from Firebase first
        const zakatDoc = await getDoc(doc(firestore, 'users', user.uid, 'spiritualTracking', 'zakatData'));
        
        if (zakatDoc.exists()) {
          const zakatDataFromFirebase = zakatDoc.data();
          setZakatData(zakatDataFromFirebase);
          console.log('✅ Zakat data loaded from Firebase');
          
          // Cache locally for offline access
          await AsyncStorage.setItem('@zakat_data', JSON.stringify(zakatDataFromFirebase));
        } else {
          console.log('No zakat data found in Firebase, creating default');
          await createDefaultZakatData(user);
        }
        
      } catch (firebaseError) {
        console.warn('Firebase zakat load failed, using local cache:', firebaseError.message);
        
        // Fallback to local storage
      const data = await AsyncStorage.getItem('@zakat_data');
      if (data) {
        setZakatData(JSON.parse(data));
          console.log('✅ Zakat data loaded from cache');
        }
      }
    } catch (error) {
      console.error('Error loading zakat data:', error);
    }
  };

  const createDefaultFastingData = async (user) => {
    try {
      const defaultFastingData = {
        regular: {},
        ramadan: {},
        missed: {
          incomplete: [],
          completed: []
        },
        completed: [],
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      };

      await setDoc(doc(firestore, 'users', user.uid, 'spiritualTracking', 'fastingData'), defaultFastingData);
      console.log('✅ Default fasting data created');
      
      setFastingData(defaultFastingData);
    } catch (error) {
      console.error('Error creating default fasting data:', error);
    }
  };

  const createDefaultZakatData = async (user) => {
    try {
      const defaultZakatData = {
        assets: {},
        deductions: {},
        nisabThreshold: 5000,
        lastCalculation: null,
        amount: 0,
        paid: false,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      };

      await setDoc(doc(firestore, 'users', user.uid, 'spiritualTracking', 'zakatData'), defaultZakatData);
      console.log('✅ Default zakat data created');
      
      setZakatData(defaultZakatData);
    } catch (error) {
      console.error('Error creating default zakat data:', error);
    }
  };

  const loadExcuseMode = async () => {
    try {
      const data = await AsyncStorage.getItem('@excuse_mode');
      if (data) {
        setExcuseMode(JSON.parse(data));
      }
    } catch (error) {
      console.error('Error loading excuse mode:', error);
    }
  };

  const saveFastingData = async (newData) => {
    try {
      setSyncing(true);
      const user = auth.currentUser;
      
      if (user) {
        console.log('Saving fasting data to Firebase...');
        
        // Add timestamp
        const dataToSave = {
          ...newData,
          updatedAt: serverTimestamp()
        };
        
        // Save to Firebase
        await setDoc(doc(firestore, 'users', user.uid, 'spiritualTracking', 'fastingData'), dataToSave);
        console.log('✅ Fasting data saved to Firebase');
      }
      
      // Update local state
      setFastingData(newData);
      
      // Cache locally for offline access
      await AsyncStorage.setItem('@fasting_data', JSON.stringify(newData));
      
    } catch (error) {
      console.error('Error saving fasting data:', error);
      
      // Try local fallback
      setFastingData(newData);
      await AsyncStorage.setItem('@fasting_data', JSON.stringify(newData));
      
      Alert.alert(
        'Saved Locally',
        'Fasting data saved locally. It will sync to cloud when connection is restored.',
        [{ text: 'OK' }]
      );
    } finally {
      setSyncing(false);
    }
  };

  const savePrayerData = async (newData) => {
    try {
      setPrayerData(newData);
      // Note: Individual prayer saving is now handled by prayerService.savePrayerCompletion
    } catch (error) {
      console.error('Error saving prayer data:', error);
    }
  };

  const saveZakatData = async (newData) => {
    try {
      setSyncing(true);
      const user = auth.currentUser;
      
      if (user) {
        console.log('Saving zakat data to Firebase...');
        
        // Add timestamp
        const dataToSave = {
          ...newData,
          updatedAt: serverTimestamp()
        };
        
        // Save to Firebase
        await setDoc(doc(firestore, 'users', user.uid, 'spiritualTracking', 'zakatData'), dataToSave);
        console.log('✅ Zakat data saved to Firebase');
      }
      
      // Update local state
      setZakatData(newData);
      
      // Cache locally for offline access
      await AsyncStorage.setItem('@zakat_data', JSON.stringify(newData));
      
    } catch (error) {
      console.error('Error saving zakat data:', error);
      
      // Try local fallback
      setZakatData(newData);
      await AsyncStorage.setItem('@zakat_data', JSON.stringify(newData));
      
      Alert.alert(
        'Saved Locally',
        'Zakat data saved locally. It will sync to cloud when connection is restored.',
        [{ text: 'OK' }]
      );
    } finally {
      setSyncing(false);
    }
  };

  const saveExcuseMode = async (mode) => {
    try {
      await AsyncStorage.setItem('@excuse_mode', JSON.stringify(mode));
      setExcuseMode(mode);
    } catch (error) {
      console.error('Error saving excuse mode:', error);
    }
  };

  const calculateTotalAssets = () => {
    const assets = zakatData?.assets || {};
    return Object.values(assets).reduce((sum, value) => sum + (parseFloat(value) || 0), 0);
  };

  const calculateTotalDeductions = () => {
    const deductions = zakatData?.deductions || {};
    return Object.values(deductions).reduce((sum, value) => sum + (parseFloat(value) || 0), 0);
  };

  const calculateNetWorth = () => {
    return calculateTotalAssets() - calculateTotalDeductions();
  };

  const calculateZakat = () => {
    const netWorth = calculateNetWorth();
    const nisab = zakatData?.nisabThreshold || 5000;
    
    if (netWorth >= nisab) {
      return netWorth * 0.025; // 2.5%
    }
    return 0;
  };

  const updateZakatField = (category, field, value) => {
    const newData = {
      ...zakatData,
      [category]: {
        ...(zakatData?.[category] || {}),
        [field]: parseFloat(value) || 0
      }
    };
    
    // Auto-calculate and update the amount
    const calculatedZakat = calculateZakat();
    newData.amount = calculatedZakat;
    newData.lastCalculation = new Date().toISOString();
    
    saveZakatData(newData);
  };

  const isDateInRamadan = (date) => {
    const year = date.getFullYear();
    const ramadanDates = RAMADAN_DATES[year];
    
    if (!ramadanDates) return false;
    
    return date >= ramadanDates.start && date <= ramadanDates.end;
  };

  const checkAndMarkMissedRamadanDays = async () => {
    const today = new Date();
    const dateKey = today.toISOString().split('T')[0];
    
    // Only check if today is in Ramadan and we haven't already marked today
    if (isDateInRamadan(today) && 
        !fastingData?.ramadan?.[dateKey] && 
        !fastingData?.missed?.incomplete?.includes(dateKey)) {
      
      // Check if today has passed (after sunset, let's say 8 PM)
      const now = new Date();
      const cutoffTime = new Date(today);
      cutoffTime.setHours(20, 0, 0, 0); // 8 PM cutoff
      
      if (now > cutoffTime) {
        // Automatically mark as missed
        const newMissed = [...(fastingData?.missed?.incomplete || [])];
        if (!newMissed.includes(dateKey)) {
          newMissed.push(dateKey);
          const newData = { 
            ...fastingData, 
            missed: { 
              ...(fastingData?.missed || {}), 
              incomplete: newMissed 
            } 
          };
          saveFastingData(newData);
        }
      }
    }
  };

  // Format date key for storage - use local date to avoid timezone issues
  const getDateKey = (date) => {
    if (!date) return null;
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  // Toggle prayer completion using Firebase prayer service
  const togglePrayer = async (prayerId) => {
    try {
      let newStatus;
      
      if (excuseMode) {
        // In excuse mode, mark prayer as excused
        await prayerService.saveExcusedPrayer(prayerId, selectedDateForDetail);
        newStatus = 'excused';
      } else {
        // Normal mode, toggle completion
        newStatus = await prayerService.togglePrayerCompletion(prayerId, selectedDateForDetail);
      }
      
      // Update local state for immediate UI feedback using local date format
      const dateKey = getDateKey(selectedDateForDetail);
      const newData = { ...prayerData };
      
      if (!newData[dateKey]) {
        newData[dateKey] = {};
      }
      
      newData[dateKey][prayerId] = newStatus;
      setPrayerData(newData);
      
      console.log(`✅ Prayer ${prayerId} marked as ${newStatus === 'excused' ? 'excused' : newStatus ? 'completed' : 'incomplete'}`);
    } catch (error) {
      console.error('Error toggling prayer:', error);
      Alert.alert('Error', 'Failed to update prayer status. Please try again.');
    }
  };

  // Check if prayer is completed using Firebase prayer service
  const isPrayerCompleted = (prayerId, date) => {
    if (!date) return false;
    // Use local date format to avoid timezone issues
    const dateKey = getDateKey(date);
    return prayerData[dateKey]?.[prayerId] === true;
  };

  const isPrayerExcused = (prayerId, date) => {
    if (!date) return false;
    // Use local date format to avoid timezone issues
    const dateKey = getDateKey(date);
    return prayerData[dateKey]?.[prayerId] === 'excused';
  };

  // Get completed prayers count for a date
  const getCompletedCount = (date) => {
    if (!date) return 0;
    // Use local date format to avoid timezone issues
    const dateKey = getDateKey(date);
    const dayData = prayerData[dateKey] || {};
    return Object.values(dayData).filter(value => value === true || value === 'excused').length;
  };

  // Toggle fasting status for a date
  const toggleFasting = async (date, type = 'regular') => {
    if (!date) return;
    // Use local date format to avoid timezone issues
    const dateKey = getDateKey(date);
    
    const newData = { ...fastingData };
    
    if (!newData[type]) {
      newData[type] = {};
    }
    
    newData[type][dateKey] = !newData[type][dateKey];
    
    if (newData[type][dateKey]) {
      // If marking as fasted, remove from missed days if it was there
      newData.missed.incomplete = newData.missed.incomplete.filter(d => d !== dateKey);
      if (!newData.completed.includes(dateKey)) {
        newData.completed.push(dateKey);
      }
    } else {
      // If unmarking as fasted, remove from completed if it was there
      newData.completed = newData.completed.filter(d => d !== dateKey);
    }
    
    saveFastingData(newData);
  };

  // Calendar functions
  const getDaysInMonth = (date) => {
    return new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
  };

  const getFirstDayOfMonth = (date) => {
    return new Date(date.getFullYear(), date.getMonth(), 1).getDay();
  };

  const navigateMonth = (direction) => {
    if (calendarType === 'gregorian') {
      const newMonth = new Date(currentMonth);
      newMonth.setMonth(currentMonth.getMonth() + direction);
      setCurrentMonth(newMonth);
    } else {
      // Navigate Hijri month
      let newHijriDate = { ...currentHijriDate };
      newHijriDate.hm += direction;
      
      // Handle year overflow/underflow
      if (newHijriDate.hm > 12) {
        newHijriDate.hm = 1;
        newHijriDate.hy += 1;
      } else if (newHijriDate.hm < 1) {
        newHijriDate.hm = 12;
        newHijriDate.hy -= 1;
      }
      
      setCurrentHijriDate(newHijriDate);
      
      // Also update the corresponding Gregorian month for consistency
      try {
        const gregorianDate = HijriConverter.toGregorian(newHijriDate.hy, newHijriDate.hm, 1);
        setCurrentMonth(new Date(gregorianDate.gy, gregorianDate.gm - 1, 1));
      } catch (error) {
        console.error('Error converting Hijri to Gregorian:', error);
      }
    }
  };

  const selectDate = (day) => {
    // Create date at midnight in local timezone to avoid offset issues
    const selectedDate = new Date(day.year, day.month - 1, day.day);
    setSelectedDate(selectedDate);
    setSelectedDateForDetail(selectedDate);
    setDayDetailModalVisible(true);
  };

  const showDayDetail = (date) => {
    if (!date) return;
    // Ensure we're working with midnight in local timezone
    const normalizedDate = new Date(date.getFullYear(), date.getMonth(), date.getDate());
    setSelectedDateForDetail(normalizedDate);
    setDayDetailModalVisible(true);
  };

  const isToday = (date) => {
    const today = new Date();
    return date.getFullYear() === today.getFullYear() &&
           date.getMonth() === today.getMonth() &&
           date.getDate() === today.getDate();
  };

  const isSelectedDate = (date) => {
    return selectedDate &&
           date.getFullYear() === selectedDate.getFullYear() &&
           date.getMonth() === selectedDate.getMonth() &&
           date.getDate() === selectedDate.getDate();
  };

  const isFasting = (date) => {
    if (!date) return false;
    // Use same date key format as other functions (UTC-based)
    const dateKey = date.toISOString().split('T')[0];
    return (fastingData?.regular?.[dateKey] || fastingData?.ramadan?.[dateKey] || false);
  };

  // Generate calendar days
  const generateCalendarDays = () => {
    if (calendarType === 'gregorian') {
      const daysInMonth = getDaysInMonth(currentMonth);
      const firstDay = getFirstDayOfMonth(currentMonth);
      const days = [];

      // Empty cells for days before month starts
      for (let i = 0; i < firstDay; i++) {
        days.push(null);
      }

      // Days of the month
      for (let day = 1; day <= daysInMonth; day++) {
        days.push(day);
      }

      return days;
    } else {
      // Generate Hijri calendar days
      return generateHijriCalendarDays();
    }
  };

  const generateHijriCalendarDays = () => {
    const hijriMonthNames = [
      'Muharram', 'Safar', 'Rabi al-Awwal', 'Rabi al-Thani', 
      'Jumada al-Awwal', 'Jumada al-Thani', 'Rajab', 'Sha\'ban', 
      'Ramadan', 'Shawwal', 'Dhu al-Qi\'dah', 'Dhu al-Hijjah'
    ];
    
    // Get the number of days in current Hijri month
    const daysInHijriMonth = getHijriMonthLength(currentHijriDate.hy, currentHijriDate.hm);
    
    // Get the first day of the month in Gregorian to determine starting day of week
    let firstDayOfWeek = 0;
    try {
      const firstDayGregorian = HijriConverter.toGregorian(currentHijriDate.hy, currentHijriDate.hm, 1);
      const firstDateGregorian = new Date(firstDayGregorian.gy, firstDayGregorian.gm - 1, firstDayGregorian.gd);
      firstDayOfWeek = firstDateGregorian.getDay();
    } catch (error) {
      console.error('Error getting first day of Hijri month:', error);
    }
    
    const days = [];
    
    // Empty cells for days before month starts
    for (let i = 0; i < firstDayOfWeek; i++) {
      days.push(null);
    }
    
    // Days of the month
    for (let day = 1; day <= daysInHijriMonth; day++) {
      days.push(day);
    }
    
    return days;
  };

  const getHijriMonthLength = (year, month) => {
    // Hijri months alternate between 29 and 30 days, with some variations
    // This is a simplified calculation - in practice, it depends on moon sighting
    const monthLengths = [30, 29, 30, 29, 30, 29, 30, 29, 30, 29, 30, 29];
    
    // Add leap day to Dhu al-Hijjah in leap years
    if (month === 12 && isHijriLeapYear(year)) {
      return 30;
    }
    
    return monthLengths[month - 1];
  };

  const isHijriLeapYear = (year) => {
    // Simplified Hijri leap year calculation
    // In a 30-year cycle, years 2, 5, 7, 10, 13, 16, 18, 21, 24, 26, 29 are leap years
    const cycle = year % 30;
    return [2, 5, 7, 10, 13, 16, 18, 21, 24, 26, 29].includes(cycle);
  };

  const formatSelectedDate = () => {
    const locale = 
      currentLanguage === 'english' ? 'en-US' : 
      currentLanguage === 'spanish' ? 'es-ES' : 
      currentLanguage === 'french' ? 'fr-FR' : 
      currentLanguage === 'italian' ? 'it-IT' : 'en-US';
    
    return selectedDate.toLocaleDateString(locale, {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const renderCalendarDay = async (date, displayDay = null) => {
    const dayToDisplay = displayDay || date.getDate();
    const dateKey = date.toISOString().split('T')[0];
    const isRegularFast = fastingData?.regular?.[dateKey] || false;
    const isRamadanFast = fastingData?.ramadan?.[dateKey] || false;
    const isMissedDay = fastingData?.missed?.incomplete?.includes(dateKey) || false;
    const isCompletedMissedDay = fastingData?.missed?.completed?.includes(dateKey) || false;
    const isCompleted = fastingData?.completed?.includes(dateKey) || false;
    const isRamadanDate = isDateInRamadan(date);
    
    // Convert to Hijri to check if it's a recommended fasting day
    const hijriDate = HijriConverter.toHijri(
      date.getFullYear(),
      date.getMonth() + 1,
      date.getDate()
    );
    
    const isRecommended = (() => {
      const dayOfWeek = date.getDay();
      
      // Only show major, beginner-friendly fasting days
      
      // Day of Arafah (most important)
      if (hijriDate.hm === 12 && hijriDate.hd === 9) return true;
      
      // Ashura (very important)
      if (hijriDate.hm === 1 && hijriDate.hd === 10) return true;
      
      // Mondays and Thursdays (most common sunnah fasting)
      if (dayOfWeek === 1 || dayOfWeek === 4) return true;
      
      // First 6 days of Shawwal (after Ramadan)
      if (hijriDate.hm === 10 && hijriDate.hd > 1 && hijriDate.hd <= 7) return true;
      
      return false;
    })();

    return (
      <TouchableOpacity
        key={dateKey}
        style={[
          styles.calendarDay,
          calendarType === 'gregorian' && date.getMonth() !== currentMonth.getMonth() && styles.otherMonthDay,
          isRegularFast && styles.regularFastDay,
          isRamadanFast && styles.ramadanFastDay,
          isMissedDay && styles.missedFastDay,
          isRecommended && styles.recommendedFastDay,
          isRamadanDate && styles.ramadanDate,
          isSelectedDate(date) && styles.selectedDay
        ]}
        onPress={() => {
          setSelectedDate(date);
          showDayDetail(date);
        }}
      >
        <Text style={[
          styles.calendarDayText,
          calendarType === 'gregorian' && date.getMonth() !== currentMonth.getMonth() && styles.otherMonthDayText,
          (isRegularFast || isRamadanFast) && styles.fastDayText,
          isSelectedDate(date) && styles.selectedDayText
        ]}>
          {dayToDisplay}
        </Text>
        
        {/* Fasting Indicators */}
        <View style={styles.fastingIndicators}>
          {isRegularFast && (
            <Ionicons name="moon" size={12} color="#2196F3" />
          )}
          {isRamadanFast && (
            <Ionicons name="star" size={12} color="#4CAF50" />
          )}
          {isMissedDay && (
            <Ionicons name="alert-circle" size={12} color="#FF9800" />
          )}
          {isRamadanDate && !isRamadanFast && !isMissedDay && (
            <Ionicons name="moon-outline" size={12} color="#E91E63" />
          )}
          {isRecommended && !isRegularFast && !isRamadanFast && !isRamadanDate && (
            <Ionicons name="time" size={12} color="#9C27B0" />
          )}
        </View>
      </TouchableOpacity>
    );
  };

  const getHijriMonthName = (monthNum) => {
    const hijriMonthNames = [
      'Muharram', 'Safar', 'Rabi\' al-Awwal', 'Rabi\' al-Thani', 
      'Jumada al-Awwal', 'Jumada al-Thani', 'Rajab', 'Sha\'ban', 
      'Ramadan', 'Shawwal', 'Dhu al-Qi\'dah', 'Dhu al-Hijjah'
    ];
    return hijriMonthNames[monthNum - 1] || 'Unknown';
  };

  const renderCalendarSection = () => {
    const generateMarkedDates = () => {
      const marked = {};
      const today = new Date();
      // Use local timezone instead of UTC to avoid date shifting
      const todayStr = today.getFullYear() + '-' + 
        String(today.getMonth() + 1).padStart(2, '0') + '-' + 
        String(today.getDate()).padStart(2, '0');

      // Mark today's date
      marked[todayStr] = {
        selected: true,
        selectedColor: '#ffffff',
      };

      // Mark fasting days
      Object.keys(fastingData.regular).forEach(dateStr => {
        if (fastingData.regular[dateStr]) {
          marked[dateStr] = {
            ...marked[dateStr],
            dots: [...(marked[dateStr]?.dots || []), { color: '#2196F3', key: 'fasting' }]
          };
        }
      });

      // Mark Ramadan days
      Object.keys(fastingData.ramadan).forEach(dateStr => {
        if (fastingData.ramadan[dateStr]) {
          marked[dateStr] = {
            ...marked[dateStr],
            dots: [...(marked[dateStr]?.dots || []), { color: '#4CAF50', key: 'ramadan' }]
          };
        }
      });

      return marked;
    };

    return (
      <View>
        <View style={styles.calendarContainer}>
          {/* Custom Month Header with Navigation */}
          <View style={{ 
            flexDirection: 'row', 
            justifyContent: 'space-between', 
            alignItems: 'center',
            paddingVertical: 15,
            paddingHorizontal: 20,
            backgroundColor: '#1E1E1E',
            borderBottomWidth: 1,
            borderBottomColor: '#333'
          }}>
            <TouchableOpacity onPress={() => {
              const prevMonth = new Date(currentMonth);
              prevMonth.setMonth(prevMonth.getMonth() - 1);
              setCurrentMonth(prevMonth.toISOString().split('T')[0]);
            }}>
              <Ionicons name="chevron-back" size={24} color="#FFD700" />
            </TouchableOpacity>
            
            <Text style={{ fontSize: 18, fontWeight: 'bold', color: '#ffffff', textAlign: 'center' }}>
              {(() => {
                const monthNames = {
                  'english': ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'],
                  'spanish': ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'],
                  'french': ['Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin', 'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre'],
                  'italian': ['Gennaio', 'Febbraio', 'Marzo', 'Aprile', 'Maggio', 'Giugno', 'Luglio', 'Agosto', 'Settembre', 'Ottobre', 'Novembre', 'Dicembre']
                };
                const date = new Date(currentMonth);
                const monthName = monthNames[currentLanguage]?.[date.getMonth()] || monthNames['english'][date.getMonth()];
                return `${monthName} ${date.getFullYear()}`;
              })()}
            </Text>
            
            <TouchableOpacity onPress={() => {
              const nextMonth = new Date(currentMonth);
              nextMonth.setMonth(nextMonth.getMonth() + 1);
              setCurrentMonth(nextMonth.toISOString().split('T')[0]);
            }}>
              <Ionicons name="chevron-forward" size={24} color="#FFD700" />
            </TouchableOpacity>
          </View>
          
          {/* Custom Day Names */}
          <View style={{ 
            flexDirection: 'row', 
            justifyContent: 'space-around', 
            paddingVertical: 10,
            backgroundColor: '#1E1E1E',
            borderBottomWidth: 1,
            borderBottomColor: '#333'
          }}>
            {getDayNames(currentLanguage).map((dayName, index) => (
              <Text key={index} style={{ 
                color: '#ffffff', 
                fontSize: 14, 
                fontWeight: '600',
                width: 40,
                textAlign: 'center'
              }}>
                {dayName}
              </Text>
            ))}
          </View>
          
          <Calendar
            key={`calendar-${currentLanguage}-${calendarKey}`}
            current={currentMonth}
            onDayPress={(day) => {
              // Fix: always use local midnight, not dateString (which is UTC)
              const selectedDate = new Date(day.year, day.month - 1, day.day);
              setSelectedDate(selectedDate);
              setSelectedDateForDetail(selectedDate);
              setDayDetailModalVisible(true);
            }}
            markedDates={generateMarkedDates()}
            enableSwipeMonths={true}
            hideExtraDays={true}
            locale={getCalendarLocale(currentLanguage)}
            firstDay={1}
            hideDayNames={true}
            hideArrows={true}
            renderHeader={() => null}


            theme={{
              backgroundColor: '#1E1E1E',
              calendarBackground: '#1E1E1E',
              textSectionTitleColor: '#ffffff',
              selectedDayBackgroundColor: '#ffffff',
              selectedDayTextColor: '#000000',
              todayTextColor: '#ffffff',
              dayTextColor: '#ffffff',
              textDisabledColor: '#666666',
              dotColor: '#FFD700',
              selectedDotColor: '#000000',
              arrowColor: '#FFD700',
              disabledArrowColor: '#666666',
              monthTextColor: '#ffffff',
              indicatorColor: '#FFD700',
              textDayFontFamily: 'System',
              textMonthFontFamily: 'System',
              textDayHeaderFontFamily: 'System',
              textDayFontWeight: '400',
              textMonthFontWeight: 'bold',
              textDayFontSize: 16,
              textMonthFontSize: 18,
              textDayHeaderFontSize: 14,
              textDayHeaderColor: '#ffffff'
            }}
          />
        </View>
        <View style={getResponsiveVerseContainerStyle()}>
          <Text style={styles.quranVerseArabic}>
            {t('quranVerseArabic', currentLanguage)}
          </Text>
          <Text style={[styles.quranVerseTranslation, { fontSize: getQuranVerseFontSize() }]}>
            {t('quranVerseTranslation', currentLanguage)}
          </Text>
        </View>
      </View>
    );
  };

  const renderFastingSection = () => (
    <ScrollView style={styles.fastingSection}>
      <View style={styles.statsContainer}>
        <View style={styles.statsRow}>
          <View style={styles.statCard}>
            <Text style={styles.statNumber}>
              {fastingData?.regular ? Object.values(fastingData.regular).filter(Boolean).length : 0}
            </Text>
            <Text style={styles.statLabel}>{t('voluntary', currentLanguage)}</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statNumber}>
              {fastingData?.ramadan ? Object.values(fastingData.ramadan).filter(Boolean).length : 0}
            </Text>
            <Text style={styles.statLabel}>{t('ramadan', currentLanguage)}</Text>
          </View>
        </View>
        <View style={styles.statsRow}>
          <View style={styles.statCard}>
            <Text style={styles.statNumber}>
              {fastingData?.missed?.incomplete?.length || 0}
            </Text>
            <Text style={styles.statLabel}>{t('toMakeUp', currentLanguage)}</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statNumber}>
              {((fastingData?.regular ? Object.values(fastingData.regular).filter(Boolean).length : 0) +
               (fastingData?.ramadan ? Object.values(fastingData.ramadan).filter(Boolean).length : 0))}
            </Text>
            <Text style={styles.statLabel}>{t('totalFasts', currentLanguage)}</Text>
          </View>
        </View>
      </View>

      {/* Main Fasting Button */}
      <TouchableOpacity
        style={styles.mainFastingButton}
        onPress={() => setModalVisible(true)}
      >
        <Ionicons name="add-circle" size={24} color="#fff" />
        <Text style={styles.mainFastingButtonText}>{t('recordFast', currentLanguage)}</Text>
      </TouchableOpacity>

      {/* Fasting Type Selection Modal */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={modalVisible}
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{t('recordFast', currentLanguage)}</Text>
              <TouchableOpacity
                style={styles.closeButton}
                onPress={() => setModalVisible(false)}
              >
                <Ionicons name="close" size={24} color="#888888" />
              </TouchableOpacity>
            </View>
            
            <View style={styles.fastingOptions}>
              <TouchableOpacity
                style={styles.fastingOption}
                onPress={() => {
                  toggleFasting(selectedDate, 'regular');
                  setModalVisible(false);
                }}
              >
                <View style={[styles.fastingOptionIcon, { backgroundColor: '#1E1E1E' }]}>
                  <Ionicons name="moon" size={24} color="#FFFFFF" />
                </View>
                <View style={styles.optionText}>
                  <Text style={styles.optionTitle}>{t('voluntaryFast', currentLanguage)}</Text>
                  <Text style={styles.optionDescription}>{t('voluntaryFastDescription', currentLanguage)}</Text>
                </View>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.fastingOption}
                onPress={() => {
                  toggleFasting(selectedDate, 'ramadan');
                  setModalVisible(false);
                }}
              >
                <View style={[styles.fastingOptionIcon, { backgroundColor: '#1E1E1E' }]}>
                  <Ionicons name="star" size={24} color="#FFFFFF" />
                </View>
                <View style={styles.optionText}>
                  <Text style={styles.optionTitle}>{t('ramadanFast', currentLanguage)}</Text>
                  <Text style={styles.optionDescription}>{t('ramadanFastDescription', currentLanguage)}</Text>
                </View>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.fastingOption}
                onPress={async () => {
                  const selectedDateKey = getDateKey(selectedDate);
                  if (fastingData?.missed?.incomplete?.includes(selectedDateKey)) {
                    const newMissed = (fastingData?.missed?.incomplete || []).filter(d => d !== selectedDateKey);
                    const newCompleted = [...(fastingData?.completed || []), selectedDateKey];
                    const newData = { 
                      ...fastingData, 
                      missed: { 
                        ...(fastingData?.missed || {}), 
                        incomplete: newMissed 
                      },
                      completed: newCompleted
                    };
                    saveFastingData(newData);
                  }
                  setModalVisible(false);
                }}
              >
                <View style={[styles.fastingOptionIcon, { backgroundColor: '#1E1E1E' }]}>
                  <Ionicons name="repeat" size={24} color="#FFFFFF" />
                </View>
                <View style={styles.optionText}>
                  <Text style={styles.optionTitle}>{t('makeUpMissedFast', currentLanguage)}</Text>
                  <Text style={styles.optionDescription}>{t('makeUpMissedFastDescription', currentLanguage)}</Text>
                </View>
              </TouchableOpacity>

              {/* Cancel Fast Option - only show if already fasting */}
              {showCancelFastOption && (
                <TouchableOpacity
                  style={[styles.fastingOption, styles.cancelFastOption]}
                  onPress={async () => {
                    const selectedDateKey = getDateKey(selectedDate);
                    const newData = { 
                      ...fastingData,
                      regular: {
                        ...(fastingData?.regular || {}),
                        [selectedDateKey]: false
                      },
                      ramadan: {
                        ...(fastingData?.ramadan || {}),
                        [selectedDateKey]: false
                      }
                    };
                    await saveFastingData(newData);
                    setModalVisible(false);
                  }}
                >
                  <View style={[styles.fastingOptionIcon, { backgroundColor: '#2E1A1A' }]}>
                    <Ionicons name="close-circle" size={24} color="#FF4444" />
                  </View>
                  <View style={styles.optionText}>
                    <Text style={[styles.optionTitle, { color: '#FF4444' }]}>{t('cancelFast', currentLanguage)}</Text>
                    <Text style={styles.optionDescription}>{t('cancelFastDescription', currentLanguage)}</Text>
                  </View>
                </TouchableOpacity>
              )}
            </View>
          </View>
        </View>
      </Modal>

      {/* Missed Days Section */}
      {renderMissedDaysSection()}
    </ScrollView>
  );

  const renderMissedDaysSection = () => {
    if (!fastingData?.missed?.incomplete?.length) {
      return null;
    }

    return (
      <View style={styles.missedDaysSection}>
        <View style={styles.missedDaysHeader}>
          <Text style={styles.missedDaysCount}>{fastingData.missed.incomplete.length}</Text>
          <Text style={styles.missedDaysTitle}>{t('toMakeUp', currentLanguage)}</Text>
        </View>
        {fastingData.missed.incomplete.map((dateStr) => {
          const date = new Date(dateStr);
          return (
            <View key={dateStr} style={styles.missedDayItem}>
              <Text style={styles.missedDayText}>
                {date.toLocaleDateString(
                  currentLanguage === 'english' ? 'en-US' : 
                  currentLanguage === 'spanish' ? 'es-ES' : 
                  currentLanguage === 'french' ? 'fr-FR' : 
                  currentLanguage === 'italian' ? 'it-IT' : 'en-US', { 
                  weekday: 'long',
                  month: 'long',
                  day: 'numeric'
                })}
              </Text>
            </View>
          );
        })}
      </View>
    );
  };

  const renderZakatSection = () => {
    const netWorth = calculateNetWorth();
    const zakatAmount = calculateZakat();
    const isAboveNisab = netWorth >= (zakatData?.nisabThreshold || 5000);

    return (
      <View style={styles.zakatSection}>
        {/* Summary Card */}
        <View style={styles.zakatSummaryCard}>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>{t('totalAssets', currentLanguage)}</Text>
            <Text style={styles.summaryAmount}>${calculateTotalAssets().toFixed(2)}</Text>
          </View>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>{t('totalDeductions', currentLanguage)}</Text>
            <Text style={styles.summaryAmount}>-${calculateTotalDeductions().toFixed(2)}</Text>
          </View>
          <View style={[styles.summaryRow, styles.summaryDivider]}>
            <Text style={[styles.summaryLabel, { fontWeight: '600' }]}>{t('netWorth', currentLanguage)}</Text>
            <Text style={styles.netAmount}>${netWorth.toFixed(2)}</Text>
          </View>
          
          {/* Nisab Status */}
          <View style={[styles.summaryRow, { marginTop: 10 }]}>
            <Text style={styles.summaryLabel}>{t('nisabStatus', currentLanguage)}</Text>
            <Text style={[
              styles.summaryAmount,
              { color: isAboveNisab ? '#4CAF50' : '#FF9800' }
            ]}>
              {isAboveNisab ? t('aboveNisab', currentLanguage) : t('belowNisab', currentLanguage)}
            </Text>
          </View>

          {/* Zakat Amount */}
          {isAboveNisab && (
            <View style={[styles.summaryRow, styles.zakatDueRow]}>
              <Text style={styles.zakatDueLabel}>{t('zakatDue', currentLanguage)}</Text>
              <Text style={styles.zakatDueAmount}>${zakatAmount.toFixed(2)}</Text>
            </View>
          )}

          {/* Nisab Warning */}
          {!isAboveNisab && (
            <View style={styles.nisabWarning}>
              <Ionicons name="information-circle" size={24} color="#856404" />
              <Text style={styles.nisabWarningText}>
                {t('nisabWarning', currentLanguage).replace('${nisabAmount}', (zakatData?.nisabThreshold || 5000).toFixed(2))}
              </Text>
            </View>
          )}
        </View>

        {/* Quick Actions */}
        <View style={styles.quickActions}>
          <TouchableOpacity
            style={[styles.calculateButton, { flex: 1 }]}
            onPress={() => setZakatCalculatorVisible(true)}
          >
            <Ionicons name="calculator-outline" size={20} color="#FFFFFF" />
            <Text style={[styles.actionButtonText, { marginLeft: 8 }]}>{t('calculate', currentLanguage)}</Text>
          </TouchableOpacity>

          {isAboveNisab && (
            <TouchableOpacity
              style={[styles.paymentButton, { opacity: zakatData.paid ? 0.7 : 1 }]}
              onPress={() => {
                const newData = { ...zakatData, paid: !zakatData.paid };
                setZakatData(newData);
                saveZakatData(newData);
              }}
            >
              <Ionicons 
                name={zakatData.paid ? "checkmark-circle" : "wallet-outline"} 
                size={20} 
                color="#FFFFFF" 
              />
              <Text style={[styles.actionButtonText, { marginLeft: 8 }]}>
                {zakatData.paid ? t('paid', currentLanguage) : t('markAsPaid', currentLanguage)}
              </Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    );
  };

  const renderZakatCalculator = () => (
    <Modal
      animationType="slide"
      transparent={true}
      visible={zakatCalculatorVisible}
      onRequestClose={() => setZakatCalculatorVisible(false)}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.calculatorContent}>
          <View style={styles.modalHeader}>
            <View style={styles.modalTitleContainer}>
              <Text style={styles.modalTitle}>{t('zakatCalculator', currentLanguage)}</Text>
            </View>
            <TouchableOpacity
              style={styles.closeButton}
              onPress={() => setZakatCalculatorVisible(false)}
            >
              <Ionicons name="close" size={24} color="#888888" />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.calculatorScroll}>
            {/* Assets Section */}
            <View style={styles.calculatorSection}>
              <Text style={styles.sectionTitle}>{t('zakatableAssets', currentLanguage)}</Text>
              
              {[
                { key: 'cash', label: t('cashBankAccounts', currentLanguage), placeholder: t('cashBankAccountsHint', currentLanguage) },
                { key: 'goldSilver', label: t('goldSilver', currentLanguage), placeholder: t('goldSilverHint', currentLanguage) },
                { key: 'investments', label: t('investments', currentLanguage), placeholder: t('investmentsHint', currentLanguage) },
                { key: 'businessInventory', label: t('businessInventory', currentLanguage), placeholder: t('businessInventoryHint', currentLanguage) },
                { key: 'receivables', label: t('moneyOwedToYou', currentLanguage), placeholder: t('moneyOwedToYouHint', currentLanguage) },
                { key: 'otherAssets', label: t('otherAssets', currentLanguage), placeholder: t('otherAssetsHint', currentLanguage) }
              ].map((asset) => (
                <View key={asset.key} style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>{asset.label}</Text>
                  <TextInput
                    style={styles.input}
                    value={zakatData.assets?.[asset.key]?.toString() || ''}
                    onChangeText={(value) => updateZakatField('assets', asset.key, value)}
                    placeholder="$0.00"
                    placeholderTextColor="#666666"
                    keyboardType="numeric"
                    returnKeyType="next"
                  />
                  <Text style={styles.inputHint}>{asset.placeholder}</Text>
                </View>
              ))}
            </View>

            {/* Deductions Section */}
            <View style={styles.calculatorSection}>
              <Text style={styles.sectionTitle}>{t('deductions', currentLanguage)}</Text>
              
              {[
                { key: 'debts', label: t('debtsDue', currentLanguage), placeholder: t('debtsDueHint', currentLanguage) },
                { key: 'expenses', label: t('essentialExpenses', currentLanguage), placeholder: t('essentialExpensesHint', currentLanguage) },
                { key: 'liabilities', label: t('otherLiabilities', currentLanguage), placeholder: t('otherLiabilitiesHint', currentLanguage) }
              ].map((deduction) => (
                <View key={deduction.key} style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>{deduction.label}</Text>
                  <TextInput
                    style={styles.input}
                    value={zakatData.deductions?.[deduction.key]?.toString() || ''}
                    onChangeText={(value) => updateZakatField('deductions', deduction.key, value)}
                    placeholder="$0.00"
                    placeholderTextColor="#666666"
                    keyboardType="numeric"
                    returnKeyType="next"
                  />
                  <Text style={styles.inputHint}>{deduction.placeholder}</Text>
                </View>
              ))}
            </View>

            {/* Nisab Section */}
            <View style={styles.calculatorSection}>
              <Text style={styles.sectionTitle}>{t('nisabThreshold', currentLanguage)}</Text>
              <View style={styles.nisabInfo}>
                <Text style={styles.nisabDescription}>
                  {t('nisabDescription', currentLanguage)}
                </Text>
                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>{t('currentNisabValue', currentLanguage)}</Text>
                  <TextInput
                    style={styles.input}
                    value={zakatData.nisabThreshold?.toString() || '5000'}
                    onChangeText={(value) => {
                      const newData = { ...zakatData, nisabThreshold: parseFloat(value) || 5000 };
                      saveZakatData(newData);
                    }}
                    placeholder="$5000.00"
                    placeholderTextColor="#666666"
                    keyboardType="numeric"
                    returnKeyType="done"
                  />
                </View>
              </View>
            </View>
          </ScrollView>

          {/* Save Button */}
          <TouchableOpacity
            style={styles.saveButton}
            onPress={() => setZakatCalculatorVisible(false)}
          >
            <Text style={styles.saveButtonText}>{t('saveAndClose', currentLanguage)}</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );

  const toggleExcuseMode = async () => {
    const newMode = !excuseMode;
    
    // Show explanation popup on first activation or when turning on
    if (newMode) {
      setExcuseModeExplanationVisible(true);
    } else {
      // Clear excused status when excuse mode is turned off
      try {
        console.log('🔄 ProfileScreen: Clearing excused status due to excuse mode being disabled');
        
        const today = new Date();
        const dateKey = today.toISOString().split('T')[0];
        const newData = { ...prayerData };
        
        if (newData[dateKey]) {
          // Remove excused status from all prayers
          for (const prayerId of ['fajr', 'dhuhr', 'asr', 'maghrib', 'isha']) {
            if (newData[dateKey][prayerId] === 'excused') {
              delete newData[dateKey][prayerId];
              // Also clear from Firebase
              await prayerService.togglePrayerCompletion(prayerId);
              console.log(`🗑️ ProfileScreen: Cleared excused status for ${prayerId}`);
            }
          }
          
          setPrayerData(newData);
          console.log('✅ ProfileScreen: All excused prayers cleared');
        }
      } catch (error) {
        console.error('Error clearing excused prayers in ProfileScreen:', error);
      }
    }
    
    await saveExcuseMode(newMode);
  };

  // Animation functions
  const startEntranceAnimations = () => {
    headerAnim.setValue(0);
    sectionAnim.setValue(0);
    Animated.stagger(100, [
      Animated.timing(headerAnim, {
        toValue: 1,
        duration: 450,
        useNativeDriver: true,
        easing: Easing.out(Easing.cubic),
      }),
      Animated.timing(sectionAnim, {
        toValue: 1,
        duration: 450,
        useNativeDriver: true,
        easing: Easing.out(Easing.cubic),
      }),
    ]).start();
  };

  const animateButtonPress = (buttonScale, onPress) => {
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
    ]).start(() => {
      if (onPress) onPress();
    });
  };

  const animateTabSwitch = (newTab) => {
    // Animate out current content
    Animated.timing(contentAnim, {
      toValue: 0,
      duration: 150,
      useNativeDriver: true,
    }).start(() => {
      setActiveTab(newTab);
      // Animate in new content
      Animated.timing(contentAnim, {
        toValue: 1,
        duration: 200,
        useNativeDriver: true,
      }).start();
    });
  };

  // Function to get dynamic header title font size based on language and text length
  const getHeaderTitleFontSize = () => {
    const headerText = t('deenTracker', currentLanguage);
    return getDynamicFontSize(headerText, 26, 18, 32, currentLanguage);
  };

  // Function to get dynamic header padding based on language
  const getHeaderPadding = () => {
    const headerText = t('deenTracker', currentLanguage);
    return getDynamicPadding(20, currentLanguage);
  };

  // Function to get header margin based on screen size
  const getHeaderMargin = () => {
    // Responsive margin based on screen width
    return Math.max(10, Math.min(20, width * 0.04)); // Between 10-20px, 4% of screen width
  };

  // Function to get dynamic Quran verse font size based on language and screen size
  const getQuranVerseFontSize = () => {
    const translationText = t('quranVerseTranslation', currentLanguage);
    const baseFontSize = Math.min(14, width * 0.035);
    const minFontSize = Math.min(10, width * 0.025);
    const maxFontSize = Math.min(16, width * 0.04);
    return getDynamicFontSize(translationText, baseFontSize, minFontSize, maxFontSize, currentLanguage);
  };

  // Function to get responsive verse container style
  const getResponsiveVerseContainerStyle = () => {
    const isSmallScreen = width < 375;
    const isLargeScreen = width > 768;
    
    return {
      backgroundColor: '#1E1E1E',
      borderRadius: 12,
      padding: isSmallScreen ? Math.min(12, width * 0.03) : Math.min(16, width * 0.04),
      marginTop: isSmallScreen ? Math.min(12, height * 0.015) : Math.min(18, height * 0.02),
      marginBottom: Math.min(8, height * 0.01),
      alignItems: 'center',
      width: isSmallScreen ? '95%' : Math.min('92%', width * 0.92),
      alignSelf: 'center',
      maxWidth: isLargeScreen ? 400 : width * 0.95,
    };
  };

  // Trigger entrance animation on focus
  useFocusEffect(
    React.useCallback(() => {
      startEntranceAnimations();
    }, [])
  );

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar barStyle="light-content" />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#FFD700" />
          <Text style={styles.loadingText}>Loading your spiritual journey...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: '#121212' }]}> 
      <ScrollView 
        style={[styles.scrollView, { backgroundColor: '#121212' }]} 
        contentContainerStyle={{ 
          flexGrow: 1,
          paddingBottom: Platform.OS === 'android' ? 180 : 20
        }}
      >
        <StatusBar barStyle="light-content" />
        <Animated.View
          style={{
            opacity: headerAnim,
            transform: [{
              translateY: headerAnim.interpolate({ inputRange: [0, 1], outputRange: [30, 0] })
            }]
          }}
        >
          <View style={[styles.header, { 
            padding: getHeaderPadding(),
            margin: getHeaderMargin()
          }]}>
            <Text style={[styles.headerTitle, { fontSize: getHeaderTitleFontSize() }]}>{t('deenTracker', currentLanguage)}</Text>
            <View style={styles.headerButtons}>
              {syncing && (
                <View style={styles.syncIndicator}>
                  <ActivityIndicator size="small" color="#FFD700" />
                  <Text style={styles.syncText}>{t('syncing', currentLanguage)}</Text>
                </View>
              )}
              <TouchableOpacity 
                style={[styles.excuseModeButton, excuseMode && styles.excuseModeActive]}
                onPress={toggleExcuseMode}
              >
                <Text style={styles.excuseModeIcon}>🌡️</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={styles.settingsButton}
                onPress={() => {
                  navigation.navigate('SettingsScreen');
                }}
              >
                <Ionicons name="settings-outline" size={24} color="#FFFFFF" />
              </TouchableOpacity>
            </View>
          </View>
        </Animated.View>

        <Animated.View
          style={{
            opacity: sectionAnim,
            transform: [{
              translateY: sectionAnim.interpolate({ inputRange: [0, 1], outputRange: [40, 0] })
            }]
          }}
        >
          <View style={styles.tabBar}>
            <TouchableOpacity 
              style={[
                styles.tab, 
                activeTab === 'calendar' && styles.activeTab,
                { transform: [{ scale: tabButtonScale }] }
              ]}
              onPress={() => animateButtonPress(tabButtonScale, () => animateTabSwitch('calendar'))}
            >
              <Text style={[styles.tabText, activeTab === 'calendar' && styles.activeTabText]}>{t('calendar', currentLanguage)}</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={[
                styles.tab, 
                activeTab === 'fasting' && styles.activeTab,
                { transform: [{ scale: tabButtonScale }] }
              ]}
              onPress={() => animateButtonPress(tabButtonScale, () => animateTabSwitch('fasting'))}
            >
              <Text style={[styles.tabText, activeTab === 'fasting' && styles.activeTabText]}>{t('fasting', currentLanguage)}</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={[
                styles.tab, 
                activeTab === 'zakat' && styles.activeTab,
                { transform: [{ scale: tabButtonScale }] }
              ]}
              onPress={() => animateButtonPress(tabButtonScale, () => animateTabSwitch('zakat'))}
            >
              <Text style={[styles.tabText, activeTab === 'zakat' && styles.activeTabText]}>{t('zakat', currentLanguage)}</Text>
            </TouchableOpacity>
          </View>

          <Animated.View
            style={{
              opacity: contentAnim,
              transform: [
                {
                  translateY: contentAnim.interpolate({
                    inputRange: [0, 1],
                    outputRange: [20, 0],
                  }),
                },
              ],
            }}
          >
            {activeTab === 'calendar' && renderCalendarSection()}
            {activeTab === 'fasting' && renderFastingSection()}
            {activeTab === 'zakat' && renderZakatSection()}
          </Animated.View>
        </Animated.View>
      </ScrollView>

      {/* Day Detail Modal */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={dayDetailModalVisible}
        onRequestClose={() => setDayDetailModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { maxHeight: '80%' }]}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                {selectedDateForDetail ? selectedDateForDetail.toLocaleDateString(
                  currentLanguage === 'english' ? 'en-US' : 
                  currentLanguage === 'spanish' ? 'es-ES' : 
                  currentLanguage === 'french' ? 'fr-FR' : 
                  currentLanguage === 'italian' ? 'it-IT' : 'en-US', {
                  weekday: 'long',
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric'
                }) : ''}
              </Text>
              <TouchableOpacity
                style={styles.closeButton}
                onPress={() => setDayDetailModalVisible(false)}
              >
                <Ionicons name="close" size={24} color="#666" />
              </TouchableOpacity>
            </View>

            <ScrollView>
              {/* Prayer Status Section */}
              <View style={styles.dayDetailSection}>
                <Text style={styles.dayDetailSectionTitle}>{t('prayerStatus', currentLanguage)}</Text>
                <View style={styles.prayerStatusGrid}>
                  {[
                    { id: 'fajr', name: t('fajr', currentLanguage), icon: 'sunny-outline' },
                    { id: 'sunrise', name: t('sunrise', currentLanguage), icon: 'sunny', optional: true },
                    { id: 'dhuhr', name: t('dhuhr', currentLanguage), icon: 'sunny' },
                    { id: 'asr', name: t('asr', currentLanguage), icon: 'partly-sunny' },
                    { id: 'maghrib', name: t('maghrib', currentLanguage), icon: 'moon-outline' },
                    { id: 'isha', name: t('isha', currentLanguage), icon: 'moon' }
                  ].map((prayer) => (
                    <TouchableOpacity
                      key={prayer.id}
                      style={[
                        styles.prayerStatusItem,
                        isPrayerCompleted(prayer.id, selectedDateForDetail) && styles.completedPrayerItem,
                        isPrayerExcused(prayer.id, selectedDateForDetail) && styles.excusedPrayerItem
                      ]}
                      onPress={() => selectedDateForDetail && !excuseMode && togglePrayer(prayer.id)}
                      disabled={excuseMode}
                    >
                      <View style={styles.prayerStatusIcon}>
                        {isPrayerExcused(prayer.id, selectedDateForDetail) || excuseMode ? (
                          <Text style={styles.excusedIcon}>🌡️</Text>
                        ) : (
                          <Ionicons
                            name={prayer.icon}
                            size={18}
                            color={isPrayerCompleted(prayer.id, selectedDateForDetail) ? '#4CAF50' : '#bbbbbb'}
                          />
                        )}
                      </View>
                      {prayer.id === 'sunrise' ? (
                        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', flex: 1 }}>
                          <Text style={[
                            styles.prayerStatusText,
                            isPrayerCompleted(prayer.id, selectedDateForDetail) && styles.completedPrayerText,
                            (isPrayerExcused(prayer.id, selectedDateForDetail) || excuseMode) && styles.excusedPrayerText
                          ]}>
                            {prayer.name}
                          </Text>
                          <Text style={{
                            fontSize: 10,
                            color: '#FFA500',
                            fontWeight: 'bold',
                            backgroundColor: 'rgba(255, 165, 0, 0.15)',
                            paddingHorizontal: 6,
                            paddingVertical: 2,
                            borderRadius: 8,
                            overflow: 'hidden',
                            marginTop: 1,
                            marginBottom: 1,
                          }}>
                            ({t('optional', currentLanguage)})
                          </Text>
                        </View>
                      ) : (
                        <Text style={[
                          styles.prayerStatusText,
                          isPrayerCompleted(prayer.id, selectedDateForDetail) && styles.completedPrayerText,
                          (isPrayerExcused(prayer.id, selectedDateForDetail) || excuseMode) && styles.excusedPrayerText
                        ]}>
                          {prayer.name}
                        </Text>
                      )}
                    </TouchableOpacity>
                  ))}
                </View>
                {selectedDateForDetail && (
                  <Text style={styles.prayerSummary}>
                    {excuseMode ? t('allPrayersExcused', currentLanguage) : `${getCompletedCount(selectedDateForDetail)} of 5 ${t('prayersCompleted', currentLanguage)}`}
                  </Text>
                )}
              </View>

              {/* Fasting Status Section */}
              <View style={styles.dayDetailSection}>
                <Text style={styles.dayDetailSectionTitle}>{t('fastingStatus', currentLanguage)}</Text>
                <View style={styles.fastingStatusContainer}>
                  {selectedDateForDetail && (
                    <>
                      {isDateInRamadan(selectedDateForDetail) ? (
                        <View style={styles.fastingStatusItem}>
                          <Ionicons name="moon" size={24} color="#E91E63" />
                          <Text style={styles.fastingStatusText}>{t('ramadanDay', currentLanguage)}</Text>
                        </View>
                      ) : null}
                      {isFasting(selectedDateForDetail) ? (
                        <View style={styles.fastingStatusItem}>
                          <Ionicons name="checkmark-circle" size={24} color="#4CAF50" />
                          <Text style={styles.fastingStatusText}>{t('fastingCompleted', currentLanguage)}</Text>
                        </View>
                      ) : (
                        <View style={styles.fastingStatusItem}>
                          <Ionicons name="close-circle" size={24} color="#bbbbbb" />
                          <Text style={styles.fastingStatusText}>{t('noFastRecorded', currentLanguage)}</Text>
                        </View>
                      )}
                    </>
                  )}
                </View>
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>
      {renderZakatCalculator()}

      {/* Excuse Mode Explanation Modal */}
      <Modal
        animationType="fade"
        transparent={true}
        visible={excuseModeExplanationVisible}
        onRequestClose={() => setExcuseModeExplanationVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.excuseModeModal}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{t('menstruationIllnessMode', currentLanguage)}</Text>
            </View>
            
            <Text style={styles.excuseModeExplanation}>
              {t('excuseModeExplanation', currentLanguage)}
              {'\n\n'}
              {t('excuseModeBullet1', currentLanguage)}
              {'\n'}
              {t('excuseModeBullet2', currentLanguage)}
              {'\n'}
              {t('excuseModeBullet3', currentLanguage)}
              {'\n'}
              {t('excuseModeBullet4', currentLanguage)}
            </Text>
            
            <TouchableOpacity
              style={styles.excuseModeOkButton}
              onPress={() => setExcuseModeExplanationVisible(false)}
            >
              <Text style={styles.excuseModeOkText}>{t('understood', currentLanguage)}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#121212',
  },
  safeArea: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#1E1E1E',
    borderRadius: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 8,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  headerTitle: {
    fontWeight: '800',
    color: '#FFFFFF',
    textShadowColor: 'rgba(0, 0, 0, 0.6)',
    textShadowOffset: { width: 0, height: 3 },
    textShadowRadius: 6,
    letterSpacing: 0.5,
    flex: 1,
    marginRight: 10,
  },
  headerButtons: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  excuseModeButton: {
    padding: 8,
    borderRadius: 8,
    backgroundColor: '#333333',
  },
  excuseModeActive: {
    backgroundColor: '#fff',
  },
  excuseModeIcon: {
    fontSize: 18,
  },
  settingsButton: {
    padding: 8,
  },
  tabBar: {
    flexDirection: 'row',
    backgroundColor: '#1E1E1E',
    borderRadius: 20,
    margin: 15,
    padding: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  tab: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    borderRadius: 15,
    position: 'relative',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  activeTab: {
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    borderBottomWidth: 3,
    borderBottomColor: '#FFFFFF',
    shadowColor: '#FFFFFF',
    shadowOpacity: 0.3,
    elevation: 4,
  },
  tabText: {
    color: '#888888',
    fontSize: 16,
    fontWeight: '600',
    textShadowColor: 'rgba(0, 0, 0, 0.3)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  activeTabText: {
    color: '#FFFFFF',
    fontWeight: '700',
    textShadowColor: 'rgba(0, 0, 0, 0.5)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4,
  },
  calendarContainer: {
    backgroundColor: '#1E1E1E',
    borderRadius: 20,
    margin: 15,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 8,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  legend: {
    marginTop: 15,
    padding: 10,
    backgroundColor: '#121212',
    borderRadius: 10,
  },
  legendTitle: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 10,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 5,
  },
  legendDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginRight: 8,
  },
  legendText: {
    color: '#FFFFFF',
    fontSize: 14,
  },
  fastingSection: {
    flex: 1,
    backgroundColor: '#121212',
  },
  sectionTitle: {
    fontSize: 24,
    fontWeight: '800',
    color: '#ffffff',
    marginBottom: 20,
    textShadowColor: 'rgba(0, 0, 0, 0.6)',
    textShadowOffset: { width: 0, height: 3 },
    textShadowRadius: 6,
    letterSpacing: 0.5,
  },
  recommendedFastAlert: {
    backgroundColor: '#2a2a2a',
    padding: 15,
    borderRadius: 10,
    marginBottom: 20,
  },
  recommendedHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  recommendedTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#ffffff',
    marginLeft: 10,
  },
  recommendedDescription: {
    fontSize: 14,
    color: '#bbbbbb',
  },
  hadithText: {
    fontSize: 14,
    color: '#bbbbbb',
    marginBottom: 5,
  },
  hadithSource: {
    fontSize: 12,
    color: '#bbbbbb',
  },
  statsContainer: {
    padding: 15,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 15,
  },
  statCard: {
    width: '48%',
    backgroundColor: '#1E1E1E',
    borderRadius: 20,
    padding: 25,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  statNumber: {
    fontSize: 32,
    fontWeight: '800',
    color: '#FFFFFF',
    marginBottom: 8,
    textShadowColor: 'rgba(0, 0, 0, 0.5)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4,
  },
  statLabel: {
    fontSize: 16,
    color: '#888888',
    fontWeight: '600',
    textShadowColor: 'rgba(0, 0, 0, 0.3)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  actionButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#2a2a2a',
    padding: 18,
    borderRadius: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 4,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  primaryButton: {
    backgroundColor: '#4CAF50',
    shadowColor: '#4CAF50',
    shadowOpacity: 0.4,
  },
  secondaryButton: {
    backgroundColor: '#2196F3',
    shadowColor: '#2196F3',
    shadowOpacity: 0.4,
  },
  warningButton: {
    backgroundColor: '#FF9800',
    shadowColor: '#FF9800',
    shadowOpacity: 0.4,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
    marginLeft: 10,
    textShadowColor: 'rgba(0, 0, 0, 0.5)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4,
  },
  missedDaysSection: {
    marginTop: 20,
    padding: 20,
    backgroundColor: '#1A1A1A',
    borderRadius: 15,
  },
  missedDaysHeader: {
    alignItems: 'center',
    marginBottom: 15,
  },
  missedDaysCount: {
    fontSize: 48,
    fontWeight: 'bold',
    color: '#FF4444',
    marginBottom: 5,
  },
  missedDaysTitle: {
    fontSize: 24,
    fontWeight: '600',
    color: '#FFFFFF',
    marginBottom: 15,
  },
  missedDayItem: {
    backgroundColor: '#2E2E2E',
    padding: 15,
    borderRadius: 10,
    marginBottom: 10,
  },
  missedDayText: {
    fontSize: 18,
    color: '#FF4444',
    fontWeight: '500',
  },
  zakatSection: {
    flex: 1,
    paddingTop: 15,
  },
  zakatSummaryCard: {
    backgroundColor: '#1E1E1E',
    borderRadius: 15,
    padding: 20,
    marginHorizontal: 15,
    marginBottom: 15,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
  },
  summaryDivider: {
    borderTopWidth: 1,
    borderTopColor: '#333',
    paddingTop: 12,
    marginTop: 8,
  },
  summaryLabel: {
    fontSize: 16,
    color: '#BBBBBB',
  },
  summaryAmount: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  netAmount: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#2196F3',
  },
  zakatDueRow: {
    backgroundColor: '#1A237E',
    marginHorizontal: -10,
    paddingHorizontal: 15,
    paddingVertical: 12,
    borderRadius: 10,
    marginTop: 15,
  },
  zakatDueLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2196F3',
  },
  zakatDueAmount: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#2196F3',
  },
  nisabWarning: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#2E2A1A',
    padding: 15,
    borderRadius: 10,
    marginTop: 15,
  },
  nisabWarningText: {
    fontSize: 14,
    color: '#FFB74D',
    marginLeft: 10,
    flex: 1,
  },
  quickActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 15,
    gap: 10,
  },
  calculateButton: {
    backgroundColor: '#1E1E1E',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 10,
  },
  paymentButton: {
    backgroundColor: '#4CAF50',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 10,
  },
  actionButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  modalContainer: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#232323',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    paddingBottom: 36,
    minHeight: 220,
    width: '100%',
    alignSelf: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.2,
    shadowRadius: 12,
    elevation: 12,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 18,
  },
  modalTitleContainer: {
    flex: 1,
    alignItems: 'center',
  },
  modalTitle: {
    color: '#fff',
    fontSize: 20,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  closeButton: {
    padding: 8,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.07)',
  },
  fastingOptions: {
    marginTop: 10,
  },
  fastingOption: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#181818',
    borderRadius: 14,
    paddingVertical: 16,
    paddingHorizontal: 16,
    marginBottom: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },
  fastingOptionIcon: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#232323',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  optionText: {
    flex: 1,
  },
  optionTitle: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 2,
  },
  optionDescription: {
    color: '#b0b0b0',
    fontSize: 13,
  },
  modalPrayerList: {
    marginBottom: 20,
  },
  modalPrayerCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#2a2a2a',
    padding: 15,
    borderRadius: 10,
    marginBottom: 10,
  },
  modalCompletedPrayerCard: {
    backgroundColor: '#1b5e20',
  },
  prayerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  prayerIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 15,
  },
  prayerInfo: {
    flex: 1,
  },
  prayerName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#ffffff',
    marginBottom: 2,
  },
  completedPrayerName: {
    color: '#4CAF50',
  },
  prayerArabic: {
    fontSize: 14,
    color: '#bbbbbb',
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#555',
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkedBox: {
    backgroundColor: '#4CAF50',
    borderColor: '#4CAF50',
  },
  fastingToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#2a2a2a',
    padding: 15,
    borderRadius: 10,
    marginTop: 10,
  },
  fastingActive: {
    backgroundColor: '#9c27b0',
  },
  fastingToggleText: {
    marginLeft: 10,
    fontSize: 16,
    color: '#bbbbbb',
  },
  fastingActiveText: {
    color: '#fff',
  },
  mainFastingButton: {
    backgroundColor: '#1E1E1E',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: 15,
    paddingVertical: 16,
    borderRadius: 15,
    marginBottom: 20,
  },
  mainFastingButtonText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '600',
    marginLeft: 10,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    justifyContent: 'flex-end',
  },
  calculatorContent: {
    backgroundColor: '#121212',
    borderTopLeftRadius: 25,
    borderTopRightRadius: 25,
    height: '90%',
    width: '100%',
  },
  calculatorScroll: {
    flex: 1,
    padding: 20,
  },
  calculatorSection: {
    marginBottom: 30,
  },
  inputGroup: {
    marginBottom: 20,
  },
  inputLabel: {
    fontSize: 16,
    color: '#FFFFFF',
    marginBottom: 8,
    fontWeight: '500',
  },
  input: {
    backgroundColor: '#1E1E1E',
    borderRadius: 10,
    padding: 15,
    color: '#FFFFFF',
    fontSize: 16,
    borderWidth: 1,
    borderColor: '#333333',
  },
  inputHint: {
    fontSize: 12,
    color: '#888888',
    marginTop: 4,
  },
  nisabInfo: {
    backgroundColor: '#1E1E1E',
    borderRadius: 15,
    padding: 20,
  },
  nisabDescription: {
    fontSize: 14,
    color: '#BBBBBB',
    lineHeight: 20,
    marginBottom: 20,
  },
  saveButton: {
    backgroundColor: '#2196F3',
    margin: 20,
    padding: 15,
    borderRadius: 10,
    alignItems: 'center',
  },
  saveButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  dayDetailSection: {
    marginBottom: 25,
  },
  dayDetailSectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#ffffff',
    marginBottom: 15,
  },
  prayerStatusGrid: {
    marginBottom: 15,
  },
  prayerStatusItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: '#2a2a2a',
    borderRadius: 10,
    marginBottom: 8,
  },
  prayerStatusIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  prayerStatusText: {
    fontSize: 18,
    color: '#ffffff',
    flex: 1,
  },
  completedPrayerItem: {
    backgroundColor: '#1a1a1a',
  },
  completedPrayerText: {
    color: '#4CAF50',
    textDecorationLine: 'line-through',
  },
  prayerSummary: {
    fontSize: 14,
    color: '#bbbbbb',
    textAlign: 'center',
    marginTop: 16,
    fontStyle: 'italic',
  },
  fastingStatusContainer: {
    backgroundColor: '#2a2a2a',
    borderRadius: 10,
    padding: 15,
  },
  fastingStatusItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  fastingStatusText: {
    fontSize: 16,
    color: '#ffffff',
    marginLeft: 12,
    fontWeight: '500',
  },
  ramadanDate: {
    backgroundColor: '#4a1138',
    borderColor: '#E91E63',
    borderWidth: 1,
  },
  calendarLegend: {
    backgroundColor: '#2a2a2a',
    borderRadius: 15,
    padding: 20,
    marginTop: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 2,
  },
  legendTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#ffffff',
    marginBottom: 15,
    textAlign: 'center',
  },
  legendGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '48%',
    marginBottom: 12,
    paddingVertical: 4,
  },
  legendIcon: {
    width: 24,
    height: 24,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8,
  },
  legendText: {
    fontSize: 13,
    color: '#ffffff',
    fontWeight: '500',
    flex: 1,
  },
  legendColorBox: {
    width: 16,
    height: 16,
    borderRadius: 3,
  },
  calendarDay: {
    width: (width - 70) / 7,
    height: (width - 70) / 7,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 15,
    backgroundColor: '#2a2a2a',
    margin: 2,
    position: 'relative',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 4,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  otherMonthDay: {
    opacity: 0.3,
    backgroundColor: '#1a1a1a',
  },
  regularFastDay: {
    backgroundColor: '#1565C0',
    borderWidth: 3,
    borderColor: '#2196F3',
    shadowColor: '#2196F3',
    shadowOpacity: 0.5,
    shadowRadius: 8,
    elevation: 6,
    transform: [{ scale: 1.05 }],
  },
  ramadanFastDay: {
    backgroundColor: '#2E7D32',
    borderWidth: 3,
    borderColor: '#4CAF50',
    shadowColor: '#4CAF50',
    shadowOpacity: 0.5,
    shadowRadius: 8,
    elevation: 6,
    transform: [{ scale: 1.05 }],
  },
  missedFastDay: {
    backgroundColor: '#F57C00',
    borderWidth: 3,
    borderColor: '#FF9800',
    shadowColor: '#FF9800',
    shadowOpacity: 0.5,
    shadowRadius: 8,
    elevation: 6,
    transform: [{ scale: 1.05 }],
  },
  recommendedFastDay: {
    borderWidth: 2,
    borderStyle: 'dashed',
    borderColor: '#9C27B0',
    backgroundColor: '#4A148C20',
  },
  selectedDay: {
    backgroundColor: '#2196F3',
    borderWidth: 4,
    borderColor: '#ffffff',
    shadowColor: '#2196F3',
    shadowOpacity: 0.6,
    shadowRadius: 10,
    elevation: 8,
    transform: [{ scale: 1.1 }],
  },
  calendarDayText: {
    fontSize: 16,
    color: '#ffffff',
    fontWeight: '700',
    textShadowColor: 'rgba(0, 0, 0, 0.5)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4,
  },
  otherMonthDayText: {
    color: '#666',
    fontWeight: '400',
    textShadowColor: 'rgba(0, 0, 0, 0.3)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  fastDayText: {
    color: '#fff',
    fontWeight: '800',
    textShadowColor: 'rgba(0, 0, 0, 0.6)',
    textShadowOffset: { width: 0, height: 3 },
    textShadowRadius: 6,
  },
  selectedDayText: {
    color: '#fff',
    fontWeight: '800',
    fontSize: 18,
    textShadowColor: 'rgba(0, 0, 0, 0.7)',
    textShadowOffset: { width: 0, height: 3 },
    textShadowRadius: 6,
  },
  fastingIndicators: {
    position: 'absolute',
    bottom: 3,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 2,
  },
  todayCell: {
    backgroundColor: '#2196F3',
    borderRadius: 20,
  },
  todayText: {
    color: '#FFF',
    fontWeight: 'bold',
  },
  fastingDay: {
    backgroundColor: 'rgba(33, 150, 243, 0.2)',
    borderRadius: 20,
  },
  fastingDayText: {
    color: '#2196F3',
  },
  excuseModeModal: {
    backgroundColor: '#1E1E1E',
    borderRadius: 20,
    padding: 25,
    margin: 20,
    maxWidth: '90%',
    alignSelf: 'center',
  },
  excuseModeExplanation: {
    fontSize: 16,
    color: '#FFFFFF',
    lineHeight: 24,
    marginBottom: 20,
  },
  excuseModeOkButton: {
    backgroundColor: '#FFFFFF',
    paddingVertical: 12,
    paddingHorizontal: 30,
    borderRadius: 10,
    alignItems: 'center',
  },
  excuseModeOkText: {
    color: '#121212',
    fontSize: 16,
    fontWeight: '600',
  },
  excusedPrayerItem: {
    backgroundColor: '#2E1A1A',
    borderWidth: 1,
    borderColor: '#4A1A1A',
  },
  excusedPrayerText: {
    color: '#FF8A80',
  },
  excusedIcon: {
    fontSize: 16,
  },
  quranVerseContainer: {
    backgroundColor: '#1E1E1E',
    borderRadius: 12,
    padding: Math.min(16, width * 0.04),
    marginTop: Math.min(18, height * 0.02),
    marginBottom: Math.min(8, height * 0.01),
    alignItems: 'center',
    width: Math.min('92%', width * 0.92),
    alignSelf: 'center',
    maxWidth: width * 0.95,
  },
  quranVerseArabic: {
    fontSize: Math.min(16, width * 0.04),
    color: '#FFFFFF',
    fontWeight: '600',
    marginBottom: Math.min(10, height * 0.012),
    textAlign: 'center',
    lineHeight: Math.min(24, width * 0.06),
    paddingHorizontal: Math.min(8, width * 0.02),
  },
  quranVerseTranslation: {
    fontSize: Math.min(14, width * 0.035),
    color: '#BBBBBB',
    textAlign: 'center',
    lineHeight: Math.min(20, width * 0.05),
    paddingHorizontal: Math.min(12, width * 0.03),
    flexWrap: 'wrap',
  },
}); 