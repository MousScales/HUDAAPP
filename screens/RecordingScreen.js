import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  Alert,
  Modal,
  SafeAreaView,
  StatusBar,
  Animated,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Audio } from 'expo-av';
import { auth, firestore, storage } from '../firebase';
import { doc, setDoc, collection, serverTimestamp, deleteDoc } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage';
import { useLanguage } from '../utils/useLanguage';
import { t } from '../utils/translations';
import { getTranslationEdition } from '../utils/quranTranslations';
import { availableReciters, getAyahAudioUrl, getReciterById } from '../services/reciterService';

// First verse map for all surahs
const FIRST_VERSE_MAP = {
  1: 'بِسْمِ ٱللَّهِ ٱلرَّحْمَـٰنِ ٱلرَّحِيمِ',
  2: 'الم',
  3: 'الم',
  4: 'يَـٰٓأَيُّهَا ٱلنَّاسُ ٱتَّقُوا۟ رَبَّكُمُ ٱلَّذِى خَلَقَكُم مِّن نَّفْسٍۢ وَٰحِدَةٍۢ وَخَلَقَ مِنْهَا زَوْجَهَا وَبَثَّ مِنْهُمَا رِجَالًۭا كَثِيرًۭا وَنِسَآءًۭ ۚ وَٱتَّقُوا۟ ٱللَّهَ ٱلَّذِى تَسَآءَلُونَ بِهِۦ وَٱلْأَرْحَامَ ۚ إِنَّ ٱللَّهَ كَانَ عَلَيْكُمْ رَقِيبًۭا',
  5: 'يَـٰٓأَيُّهَا ٱلَّذِينَ ءَامَنُوٓا۟ أَوْفُوا۟ بِٱلْعُقُودِ ۚ أُحِلَّتْ لَكُم بَهِيمَةُ ٱلْأَنْعَـٰمِ إِلَّا مَا يُتْلَىٰ عَلَيْكُمْ غَيْرَ مُحِلِّى ٱلصَّيْدِ وَأَنتُمْ حُرُمٌ ۗ إِنَّ ٱللَّهَ يَحْكُمُ مَا يُرِيدُ',
  6: 'ٱلْحَمْدُ لِلَّهِ ٱلَّذِى خَلَقَ ٱلسَّمَـٰوَٰتِ وَٱلْأَرْضَ وَجَعَلَ ٱلظُّلُمَـٰتِ وَٱلنُّورَ ۖ ثُمَّ ٱلَّذِينَ كَفَرُوا۟ بِرَبِّهِمْ يَعْدِلُونَ',
  7: 'المص',
  8: 'يَسْـَٔلُونَكَ عَنِ ٱلْأَنفَالِ ۖ قُلِ ٱلْأَنفَالُ لِلَّهِ وَٱلرَّسُولِ ۖ فَٱتَّقُوا۟ ٱللَّهَ وَأَصْلِحُوا۟ ذَاتَ بَيْنِكُمْ ۖ وَأَطِيعُوا۟ ٱللَّهَ وَرَسُولَهُۥٓ إِن كُنتُم مُّؤْمِنِينَ',
  9: 'بَرَآءَةٌۭ مِّنَ ٱللَّهِ وَرَسُولِهِۦٓ إِلَى ٱلَّذِينَ عَـٰهَدتُّم مِّنَ ٱلْمُشْرِكِينَ',
  10: 'الۤر ۚ تِلْكَ ءَايَـٰتُ ٱلْكِتَـٰبِ ٱلْحَكِيمِ',
  11: 'الۤر ۚ كِتَـٰبٌ أُحْكِمَتْ ءَايَـٰتُهُۥ ثُمَّ فُصِّلَتْ مِن لَّدُنْ حَكِيمٍ خَبِيرٍۢ',
  12: 'الۤر ۚ تِلْكَ ءَايَـٰتُ ٱلْكِتَـٰبِ ٱلْمُبِينِ',
  13: 'الۤمۤر ۚ تِلْكَ ءَايَـٰتُ ٱلْكِتَـٰبِ ۗ وَٱلَّذِىٓ أُنزِلَ إِلَيْكَ مِن رَّبِّكَ ٱلْحَقُّ وَلَـٰكِنَّ أَكْثَرَ ٱلنَّاسِ لَا يُؤْمِنُونَ',
  14: 'الۤر ۚ كِتَـٰبٌ أَنزَلْنَـٰهُ إِلَيْكَ لِتُخْرِجَ ٱلنَّاسَ مِنَ ٱلظُّلُمَـٰتِ إِلَى ٱلنُّورِ بِإِذْنِ رَبِّهِمْ إِلَىٰ صِرَٰطِ ٱلْعَزِيزِ ٱلْحَمِيدِ',
  15: 'الۤر ۚ تِلْكَ ءَايَـٰتُ ٱلْكِتَـٰبِ وَقُرْءَانٍۢ مُّبِينٍۢ',
  16: 'أَتَىٰٓ أَمْرُ ٱللَّهِ فَلَا تَسْتَعْجِلُوهُ ۚ سُبْحَـٰنَهُۥ وَتَعَـٰلَىٰ عَمَّا يُشْرِكُونَ',
  17: 'سُبْحَـٰنَ ٱلَّذِىٓ أَسْرَىٰ بِعَبْدِهِۦ لَيْلًۭا مِّنَ ٱلْمَسْجِدِ ٱلْحَرَامِ إِلَى ٱلْمَسْجِدِ ٱلْأَقْصَا ٱلَّذِى بَـٰرَكْنَا حَوْلَهُۥ لِنُرِيَهُۥ مِنْ ءَايَـٰتِنَآ ۚ إِنَّهُۥ هُوَ ٱلسَّمِيعُ ٱلْبَصِيرُ',
  18: 'ٱلْحَمْدُ لِلَّهِ ٱلَّذِىٓ أَنزَلَ عَلَىٰ عَبْدِهِ ٱلْكِتَـٰبَ وَلَمْ يَجْعَل لَّهُۥ عِوَجًۭا',
  19: 'كهيعص',
  20: 'طه',
  21: 'ٱقْتَرَبَ لِلنَّاسِ حِسَابُهُمْ وَهُمْ فِى غَفْلَةٍۢ مُّعْرِضُونَ',
  22: 'يَـٰٓأَيُّهَا ٱلنَّاسُ ٱتَّقُوا۟ رَبَّكُمْ ۚ إِنَّ زَلْزَلَةَ ٱلسَّاعَةِ شَىْءٌ عَظِيمٌۭ',
  23: 'قَدْ أَفْلَحَ ٱلْمُؤْمِنُونَ',
  24: 'سُورَةٌ أَنزَلْنَـٰهَا وَفَرَضْنَـٰهَا وَأَنزَلْنَا فِيهَآ ءَايَـٰتٍۢ بَيِّنَـٰتٍۢ لَّعَلَّكُمْ تَذَكَّرُونَ',
  25: 'تَبَارَكَ ٱلَّذِى نَزَّلَ ٱلْفُرْقَانَ عَلَىٰ عَبْدِهِۦ لِيَكُونَ لِلْعَـٰلَمِينَ نَذِيرًا',
  26: 'طسم',
  27: 'طس ۚ تِلْكَ ءَايَـٰتُ ٱلْقُرْءَانِ وَكِتَـٰبٍۢ مُّبِينٍۢ',
  28: 'طسم',
  29: 'الم',
  30: 'الم',
  31: 'الم',
  32: 'الم',
  33: 'يَـٰٓأَيُّهَا ٱلنَّبِىُّ ٱتَّقِ ٱللَّهَ وَلَا تُطِعِ ٱلْكَـٰفِرِينَ وَٱلْمُنَـٰفِقِينَ ۗ إِنَّ ٱللَّهَ كَانَ عَلِيمًا حَكِيمًا',
  34: 'ٱلْحَمْدُ لِلَّهِ ٱلَّذِى لَهُۥ مَا فِى ٱلسَّمَـٰوَٰتِ وَمَا فِى ٱلْأَرْضِ ۖ وَلَهُ ٱلْحَمْدُ فِى ٱلْـَٔاخِرَةِ ۚ وَهُوَ ٱلْحَكِيمُ ٱلْخَبِيرُ',
  35: 'ٱلْحَمْدُ لِلَّهِ فَاطِرِ ٱلسَّمَـٰوَٰتِ وَٱلْأَرْضِ جَاعِلِ ٱلْمَلَـٰٓئِكَةِ رُسُلًا أُو۟لِىٓ أَجْنِحَةٍۢ مَّثْنَىٰ وَثُلَـٰثَ وَرُبَـٰعَ ۚ يَزِيدُ فِى ٱلْخَلْقِ مَا يَشَآءُ ۚ إِنَّ ٱللَّهَ كَانَ عَلَىٰ كُلِّ شَىْءٍۢ قَدِيرٌۭ',
  36: 'يس',
  37: 'وَٱلصَّـٰٓفَّـٰتِ صَفًّۭا',
  38: 'ص ۚ وَٱلْقُرْءَانِ ذِى ٱلذِّكْرِ',
  39: 'تَنزِيلُ ٱلْكِتَـٰبِ مِنَ ٱللَّهِ ٱلْعَزِيزِ ٱلْحَكِيمِ',
  40: 'حم',
  41: 'حم',
  42: 'حم',
  43: 'حم',
  44: 'حم',
  45: 'حم',
  46: 'حم',
  47: 'ٱلَّذِينَ كَفَرُوا۟ وَصَدُّوا۟ عَن سَبِيلِ ٱللَّهِ أَضَلَّ أَعْمَـٰلَهُمْ',
  48: 'إِنَّا فَتَحْنَا لَكَ فَتْحًۭا مُّبِينًۭا',
  49: 'يَـٰٓأَيُّهَا ٱلَّذِينَ ءَامَنُوا۟ لَا تُقَدِّمُوا۟ بَيْنَ يَدَىِ ٱللَّهِ وَرَسُولِهِۦ ۖ وَٱتَّقُوا۟ ٱللَّهَ ۚ إِنَّ ٱللَّهَ سَمِيعٌ عَلِيمٌۭ',
  50: 'ق ۚ وَٱلْقُرْءَانِ ٱلْمَجِيدِ',
  51: 'وَٱلذَّـٰرِيَـٰتِ ذَرْوًۭا',
  52: 'وَٱلطُّورِ',
  53: 'وَٱلنَّجْمِ إِذَا هَوَىٰ',
  54: 'ٱقْتَرَبَتِ ٱلسَّاعَةُ وَٱنشَقَّ ٱلْقَمَرُ',
  55: 'ٱلرَّحْمَـٰنُ',
};

// Surah names in different languages
const SURAH_NAMES = {
  en: {
    "1": "The Opening",
    "2": "The Cow",
    "3": "The Family of Imran",
    "4": "The Women",
    "5": "The Table Spread",
    "6": "The Cattle",
    "7": "The Heights",
    "8": "The Spoils of War",
    "9": "The Repentance",
    "10": "Jonah",
    "11": "Hud",
    "12": "Joseph",
    "13": "The Thunder",
    "14": "Abraham",
    "15": "The Rocky Tract",
    "16": "The Bees",
    "17": "The Night Journey",
    "18": "The Cave",
    "19": "Mary",
    "20": "Ta-Ha",
    "21": "The Prophets",
    "22": "The Pilgrimage",
    "23": "The Believers",
    "24": "The Light",
    "25": "The Criterion",
    "26": "The Poets",
    "27": "The Ants",
    "28": "The Stories",
    "29": "The Spider",
    "30": "The Romans",
    "31": "Luqman",
    "32": "The Prostration",
    "33": "The Combined Forces",
    "34": "Sheba",
    "35": "Originator",
    "36": "Ya-Sin",
    "37": "Those Who Set the Ranks",
    "38": "Sad",
    "39": "The Troops",
    "40": "The Forgiver",
    "41": "Explained in Detail",
    "42": "The Consultation",
    "43": "The Ornaments of Gold",
    "44": "The Smoke",
    "45": "The Kneeling",
    "46": "The Wind-Curved Sandhills",
    "47": "Muhammad",
    "48": "The Victory",
    "49": "The Private Apartments",
    "50": "Qaf",
    "51": "The Winnowing Winds",
    "52": "The Mount",
    "53": "The Star",
    "54": "The Moon",
    "55": "The Beneficent"
  },
  transliteration: {
    "1": "Al-Fatihah",
    "2": "Al-Baqarah",
    "3": "Ali 'Imran",
    "4": "An-Nisa'",
    "5": "Al-Ma'idah",
    "6": "Al-An'am",
    "7": "Al-A'raf",
    "8": "Al-Anfal",
    "9": "At-Tawbah",
    "10": "Yunus",
    "11": "Hud",
    "12": "Yusuf",
    "13": "Ar-Ra'd",
    "14": "Ibrahim",
    "15": "Al-Hijr",
    "16": "An-Nahl",
    "17": "Al-Isra'",
    "18": "Al-Kahf",
    "19": "Maryam",
    "20": "Ta-Ha",
    "21": "Al-Anbiya'",
    "22": "Al-Hajj",
    "23": "Al-Mu'minun",
    "24": "An-Nur",
    "25": "Al-Furqan",
    "26": "Ash-Shu'ara'",
    "27": "An-Naml",
    "28": "Al-Qasas",
    "29": "Al-'Ankabut",
    "30": "Ar-Rum",
    "31": "Luqman",
    "32": "As-Sajdah",
    "33": "Al-Ahzab",
    "34": "Saba'",
    "35": "Fatir",
    "36": "Ya-Sin",
    "37": "As-Saffat",
    "38": "Sad",
    "39": "Az-Zumar",
    "40": "Ghafir",
    "41": "Fussilat",
    "42": "Ash-Shura",
    "43": "Az-Zukhruf",
    "44": "Ad-Dukhan",
    "45": "Al-Jathiyah",
    "46": "Al-Ahqaf",
    "47": "Muhammad",
    "48": "Al-Fath",
    "49": "Al-Hujurat",
    "50": "Qaf",
    "51": "Adh-Dhariyat",
    "52": "At-Tur",
    "53": "An-Najm",
    "54": "Al-Qamar",
    "55": "Ar-Rahman"
  },
  es: {
    "1": "La Apertura",
    "2": "La Vaca",
    "3": "La Familia de Imran",
    "4": "Las Mujeres",
    "5": "La Mesa Servida",
    "6": "Los Rebaños",
    "7": "Los Lugares Elevados",
    "8": "El Botín",
    "9": "El Arrepentimiento",
    "10": "Jonás",
    "11": "Hud",
    "12": "José",
    "13": "El Trueno",
    "14": "Abraham",
    "15": "Al-Hijr",
    "16": "Las Abejas",
    "17": "El Viaje Nocturno",
    "18": "La Caverna",
    "19": "María",
    "20": "Ta-Ha",
    "21": "Los Profetas",
    "22": "La Peregrinación",
    "23": "Los Creyentes",
    "24": "La Luz",
    "25": "El Discernimiento",
    "26": "Los Poetas",
    "27": "Las Hormigas",
    "28": "Los Relatos",
    "29": "La Araña",
    "30": "Los Romanos",
    "31": "Luqmán",
    "32": "La Prosternación",
    "33": "Los Coaligados",
    "34": "Saba",
    "35": "El Originador",
    "36": "Ya-Sin",
    "37": "Los Ordenados en Filas",
    "38": "Sad",
    "39": "Los Grupos",
    "40": "El Perdonador",
    "41": "Los Versículos Detallados",
    "42": "La Consulta",
    "43": "Los Ornamentos de Oro",
    "44": "El Humo",
    "45": "La Arrodillada",
    "46": "Las Dunas",
    "47": "Muhammad",
    "48": "La Victoria",
    "49": "Los Aposentos Privados",
    "50": "Qaf",
    "51": "Los Vientos Dispersores",
    "52": "El Monte",
    "53": "La Estrella",
    "54": "La Luna",
    "55": "El Misericordioso"
  },
  fr: {
    "1": "L'Ouverture",
    "2": "La Vache",
    "3": "La Famille d'Imran",
    "4": "Les Femmes",
    "5": "La Table Servie",
    "6": "Les Bestiaux",
    "7": "Les Murailles",
    "8": "Le Butin",
    "9": "Le Repentir",
    "10": "Jonas",
    "11": "Hud",
    "12": "Joseph",
    "13": "Le Tonnerre",
    "14": "Abraham",
    "15": "Al-Hijr",
    "16": "Les Abeilles",
    "17": "Le Voyage Nocturne",
    "18": "La Caverne",
    "19": "Marie",
    "20": "Ta-Ha",
    "21": "Les Prophètes",
    "22": "Le Pèlerinage",
    "23": "Les Croyants",
    "24": "La Lumière",
    "25": "Le Discernement",
    "26": "Les Poètes",
    "27": "Les Fourmis",
    "28": "Les Récits",
    "29": "L'Araignée",
    "30": "Les Romains",
    "31": "Luqmân",
    "32": "La Prosternation",
    "33": "Les Coalisés",
    "34": "Saba",
    "35": "Le Créateur",
    "36": "Ya-Sin",
    "37": "Les Rangés",
    "38": "Sad",
    "39": "Les Groupes",
    "40": "Le Pardonneur",
    "41": "Les Versets Détaillés",
    "42": "La Consultation",
    "43": "L'Ornement",
    "44": "La Fumée",
    "45": "L'Agenouillée",
    "46": "Les Dunes",
    "47": "Muhammad",
    "48": "La Victoire",
    "49": "Les Appartements",
    "50": "Qaf",
    "51": "Qui Éparpillent",
    "52": "Le Mont",
    "53": "L'Étoile",
    "54": "La Lune",
    "55": "Le Tout Miséricordieux"
  },
  it: {
    "1": "L'Apertura",
    "2": "La Giovenca",
    "3": "La Famiglia di Imran",
    "4": "Le Donne",
    "5": "La Tavola Imbandita",
    "6": "Il Bestiame",
    "7": "Gli Alture",
    "8": "Il Bottino",
    "9": "Il Pentimento",
    "10": "Giona",
    "11": "Hud",
    "12": "Giuseppe",
    "13": "Il Tuono",
    "14": "Abramo",
    "15": "Al-Hijr",
    "16": "Le Api",
    "17": "Il Viaggio Notturno",
    "18": "La Caverna",
    "19": "Maria",
    "20": "Ta-Ha",
    "21": "I Profeti",
    "22": "Il Pellegrinaggio",
    "23": "I Credenti",
    "24": "La Luce",
    "25": "Il Discernimento",
    "26": "I Poeti",
    "27": "Le Formiche",
    "28": "Il Racconto",
    "29": "Il Ragno",
    "30": "I Romani",
    "31": "Luqman",
    "32": "La Prostrazione",
    "33": "I Coalizzati",
    "34": "Saba",
    "35": "Il Creatore",
    "36": "Ya-Sin",
    "37": "I Ranghi",
    "38": "Sad",
    "39": "I Gruppi",
    "40": "Il Perdonatore",
    "41": "I Versetti Dettagliati",
    "42": "La Consultazione",
    "43": "Gli Ornamenti",
    "44": "Il Fumo",
    "45": "L'Inginocchiata",
    "46": "Le Dune",
    "47": "Muhammad",
    "48": "La Vittoria",
    "49": "Gli Appartamenti",
    "50": "Qaf",
    "51": "I Ventilatori",
    "52": "Il Monte",
    "53": "La Stella",
    "54": "La Luna",
    "55": "Il Compassionevole"
  }
};

// Helper function to get proper surah name based on language
const getProperSurahName = (surahNumber, language) => {
  if (!surahNumber) return 'Unknown';
  
  // Always use transliteration for surah names
  return SURAH_NAMES.transliteration?.[surahNumber.toString()] || 'Unknown';
};

const RecordingScreen = ({ 
  route, 
  navigation 
}) => {
  // Language support
  const { currentLanguage } = useLanguage();
  
  const { 
    surah, 
    verse, 
    surahs, 
    userRecordings, 
    setUserRecordings,
  } = route.params;

  // Recording is now open to all users - no subscription check needed
  const [subscriptionChecked, setSubscriptionChecked] = useState(true);

  // State variables
  const [isRecording, setIsRecording] = useState(false);
  const [recording, setRecording] = useState(null);
  const [recordingTime, setRecordingTime] = useState(0);
  const [recordingUri, setRecordingUri] = useState(null);
  const [isPlayingPreview, setIsPlayingPreview] = useState(false);
  const [previewAudio, setPreviewAudio] = useState(null);
  const [textDisplayMode, setTextDisplayMode] = useState('arabic'); // 'arabic', 'transliteration', 'translation'
  const [currentVerseIndex, setCurrentVerseIndex] = useState(0);
  const [verses, setVerses] = useState([]);
  
  // Reference audio state
  const [showReciterModal, setShowReciterModal] = useState(false);
  const [selectedReciter, setSelectedReciter] = useState('5'); // Default to Mishary Alafasy
  const [isPlayingReference, setIsPlayingReference] = useState(false);
  const [referenceAudio, setReferenceAudio] = useState(null);
  
  // Translation state
  const [translatedVerse, setTranslatedVerse] = useState(null);
  
  // Track if recording was just deleted to prevent restoration
  const [recordingJustDeleted, setRecordingJustDeleted] = useState(false);
  
  const recordingTimer = useRef(null);
  const buttonAnimation = useRef(new Animated.Value(0)).current;

  // Format time utility
  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // Check if verse is already recorded
  const isVerseRecorded = (surahNumber, verseNumber) => {
    const key = `${surahNumber}_${verseNumber}`;
    return userRecordings[key] !== undefined;
  };

  // Initialize verses on component mount
  useEffect(() => {
    if (route.params.verses) {
      setVerses(route.params.verses);
      // Find the index of the current verse
      const index = route.params.verses.findIndex(v => v.numberInSurah === verse.numberInSurah);
      const initialIndex = index >= 0 ? index : 0;
      setCurrentVerseIndex(initialIndex);
    } else {
      // If no verses passed, create array with current verse
      setVerses([verse]);
      setCurrentVerseIndex(0);
    }
  }, [route.params.verses, verse]);

  // Check for existing recordings when component mounts or userRecordings changes
  useEffect(() => {
    const checkExistingRecording = () => {
      // Don't restore recording if it was just deleted
      if (recordingJustDeleted) {
        console.log('🔄 Skipping recording restoration - recording was just deleted');
        setRecordingJustDeleted(false); // Reset the flag
        return;
      }
      
      const surahNumber = surah?.number || currentVerse?.surah?.number || currentVerse?.surahNumber;
      const verseNumber = currentVerse?.numberInSurah;
      
      if (surahNumber && verseNumber) {
        const existingRecordingKey = `${surahNumber}_${verseNumber}`;
        const existingRecording = userRecordings[existingRecordingKey];
        
        console.log('🔄 Checking recording for verse:', { surahNumber, verseNumber, existingRecordingKey, hasRecording: !!existingRecording });
        
        if (existingRecording) {
          // Set the recording URI to show the preview controls
          setRecordingUri(existingRecording.downloadURL);
          setRecordingTime(existingRecording.duration || 0);
          console.log('✅ Recording loaded for verse:', { surahNumber, verseNumber, duration: existingRecording.duration });
        } else {
          // Clear recording state if no recording exists
          setRecordingUri(null);
          setRecordingTime(0);
          console.log('❌ No recording found for verse:', { surahNumber, verseNumber });
        }
      }
    };

    checkExistingRecording();
  }, [userRecordings, currentVerse, surah, recordingJustDeleted]);

  // Force refresh recordings when route params change (when navigating back to this screen)
  useEffect(() => {
    console.log('🔄 Route params changed, refreshing recordings...');
    console.log('🔄 Current userRecordings keys:', Object.keys(userRecordings));
    
    // Don't restore recording if it was just deleted
    if (recordingJustDeleted) {
      console.log('🔄 Skipping force refresh - recording was just deleted');
      setRecordingJustDeleted(false); // Reset the flag
      return;
    }
    
    // Force a check for the current verse
    const surahNumber = surah?.number || currentVerse?.surah?.number || currentVerse?.surahNumber;
    const verseNumber = currentVerse?.numberInSurah;
    
    if (surahNumber && verseNumber) {
      const existingRecordingKey = `${surahNumber}_${verseNumber}`;
      const existingRecording = userRecordings[existingRecordingKey];
      
      console.log('🔄 Force refresh for verse:', { surahNumber, verseNumber, existingRecordingKey, hasRecording: !!existingRecording });
      
      if (existingRecording) {
        setRecordingUri(existingRecording.downloadURL);
        setRecordingTime(existingRecording.duration || 0);
        console.log('✅ Force refresh: Recording loaded');
      } else {
        setRecordingUri(null);
        setRecordingTime(0);
        console.log('❌ Force refresh: No recording found');
      }
    }
  }, [route.params, recordingJustDeleted]);

  // Add navigation listener to refresh parent screens when going back
  useEffect(() => {
    const unsubscribe = navigation.addListener('beforeRemove', (e) => {
      // Force parent screens to refresh when leaving this screen
      console.log('🔄 Navigating back, parent screens should refresh');
    });

    return unsubscribe;
  }, [navigation]);

  // Cleanup audio when component unmounts
  useEffect(() => {
    return () => {
      if (referenceAudio) {
        referenceAudio.unloadAsync();
      }
      if (previewAudio) {
        previewAudio.unloadAsync();
      }
    };
  }, [referenceAudio, previewAudio]);

  // Get current verse
  const currentVerse = verses[currentVerseIndex] || verse;

  // Navigate to next verse
  const goToNextVerse = async () => {
    if (currentVerseIndex < verses.length - 1) {
      const wasRecording = isRecording;
      
      // If currently recording, stop it first
      if (isRecording) {
        await stopRecording();
      }
      
      // Move to next verse
      const nextIndex = currentVerseIndex + 1;
      setCurrentVerseIndex(nextIndex);
      
      // Force a small delay to ensure state updates properly
      setTimeout(() => {
        // Force check for recording after state update
        const surahNumber = surah?.number || nextVerse?.surah?.number || nextVerse?.surahNumber;
        const verseNumber = nextVerse?.numberInSurah;
        
        if (surahNumber && verseNumber) {
          const existingRecordingKey = `${surahNumber}_${verseNumber}`;
          const existingRecording = userRecordings[existingRecordingKey];
          
          console.log('🔄 Post-navigation check for recording:', { surahNumber, verseNumber, hasRecording: !!existingRecording });
          
          if (existingRecording && !wasRecording) {
            setRecordingUri(existingRecording.downloadURL);
            setRecordingTime(existingRecording.duration || 0);
            console.log('✅ Post-navigation: Recording loaded');
          }
        }
      }, 100);
      
      // Get the next verse
      const nextVerse = verses[nextIndex];
      
      // Check for existing recording in userRecordings
      const surahNumber = surah?.number || nextVerse?.surah?.number || nextVerse?.surahNumber;
      const verseNumber = nextVerse?.numberInSurah;
      
      console.log('➡️ Navigating to next verse:', { surahNumber, verseNumber, nextVerse });
      
      if (surahNumber && verseNumber) {
        const existingRecordingKey = `${surahNumber}_${verseNumber}`;
        const existingRecording = userRecordings[existingRecordingKey];
        
        console.log('➡️ Checking for existing recording:', { existingRecordingKey, hasRecording: !!existingRecording });
        
        if (existingRecording) {
          if (wasRecording) {
            // If we were recording, delete the existing recording to overwrite it
            console.log('🗑️ Deleting existing recording to overwrite with new one...');
            
            // Delete from Firestore
            if (existingRecording.id) {
              try {
                const recordingDocRef = doc(firestore, 'userRecordings', existingRecording.id);
                await deleteDoc(recordingDocRef);
                console.log('🗑️ Existing recording deleted from Firestore');
              } catch (firestoreError) {
                console.warn('⚠️ Could not delete from Firestore:', firestoreError);
              }
            }
            
            // Delete from Firebase Storage
            if (existingRecording.downloadURL) {
              try {
                const urlParts = existingRecording.downloadURL.split('/');
                const fileName = urlParts[urlParts.length - 1].split('?')[0];
                const filePath = `recordings/${auth.currentUser.uid}/${fileName}`;
                const storageRef = ref(storage, filePath);
                await deleteObject(storageRef);
                console.log('🗑️ Existing audio file deleted from Firebase Storage');
              } catch (storageError) {
                console.warn('⚠️ Could not delete from Firebase Storage:', storageError);
              }
            }
            
            // Remove from userRecordings state
            setUserRecordings(prev => {
              const newState = { ...prev };
              delete newState[existingRecordingKey];
              return newState;
            });
            
            // Reset recording state for new recording
            setRecordingUri(null);
            setRecordingTime(0);
            console.log('🗑️ Existing recording deleted, ready for new recording');
          } else {
            // If not recording, just show the existing recording
            setRecordingUri(existingRecording.downloadURL);
            setRecordingTime(existingRecording.duration || 0);
          }
        } else {
          // Reset recording state for new verse
          setRecordingUri(null);
          setRecordingTime(0);
        }
      }
      
      // Only auto-start recording if we were recording before
      if (wasRecording) {
        setTimeout(() => {
          startRecording();
        }, 500);
      }
    }
  };

  // Navigate to previous verse
  const goToPreviousVerse = async () => {
    if (currentVerseIndex > 0) {
      // If currently recording, stop it
      if (isRecording) {
        await stopRecording();
      }
      
      // Move to previous verse
      const prevIndex = currentVerseIndex - 1;
      setCurrentVerseIndex(prevIndex);
      
      // Force a small delay to ensure state updates properly
      setTimeout(() => {
        // Force check for recording after state update
        const surahNumber = surah?.number || prevVerse?.surah?.number || prevVerse?.surahNumber;
        const verseNumber = prevVerse?.numberInSurah;
        
        if (surahNumber && verseNumber) {
          const existingRecordingKey = `${surahNumber}_${verseNumber}`;
          const existingRecording = userRecordings[existingRecordingKey];
          
          console.log('🔄 Post-navigation check for recording:', { surahNumber, verseNumber, hasRecording: !!existingRecording });
          
          if (existingRecording) {
            setRecordingUri(existingRecording.downloadURL);
            setRecordingTime(existingRecording.duration || 0);
            console.log('✅ Post-navigation: Recording loaded');
          }
        }
      }, 100);
      
      // Get the previous verse
      const prevVerse = verses[prevIndex];
      
      // Check for existing recording in userRecordings
      const surahNumber = surah?.number || prevVerse?.surah?.number || prevVerse?.surahNumber;
      const verseNumber = prevVerse?.numberInSurah;
      
      console.log('⬅️ Navigating to previous verse:', { surahNumber, verseNumber, prevVerse });
      
      if (surahNumber && verseNumber) {
        const existingRecordingKey = `${surahNumber}_${verseNumber}`;
        const existingRecording = userRecordings[existingRecordingKey];
        
        console.log('⬅️ Checking for existing recording:', { existingRecordingKey, hasRecording: !!existingRecording });
        
        if (existingRecording) {
          setRecordingUri(existingRecording.downloadURL);
          setRecordingTime(existingRecording.duration || 0);
          console.log('✅ Previous verse recording loaded:', { surahNumber, verseNumber, duration: existingRecording.duration });
        } else {
          // Reset recording state for new verse
          setRecordingUri(null);
          setRecordingTime(0);
          console.log('❌ No recording found for previous verse:', { surahNumber, verseNumber });
        }
      }
    }
  };

  // Check if can go to next verse
  const canGoNext = currentVerseIndex < verses.length - 1;
  
  // Check if can go to previous verse
  const canGoPrevious = currentVerseIndex > 0;

  // Fetch translated verse
  const fetchTranslatedVerse = async () => {
    try {
      const surahNumber = surah?.number || currentVerse?.surah?.number || currentVerse?.surahNumber;
      const verseNumber = currentVerse?.numberInSurah;
      
      if (!surahNumber || !verseNumber) return;
      
      const selectedTranslation = getTranslationEdition(currentLanguage);
      const url = `https://api.alquran.cloud/v1/ayah/${surahNumber}:${verseNumber}/${selectedTranslation}`;
      
      console.log('🌐 Fetching translation for verse:', { surahNumber, verseNumber, selectedTranslation });
      
      const response = await fetch(url);
      const data = await response.json();
      
      if (data.code === 200 && data.data) {
        setTranslatedVerse(data.data.text);
        console.log('✅ Translation fetched successfully');
      } else {
        console.warn('⚠️ No translation data received');
        setTranslatedVerse(null);
      }
    } catch (error) {
      console.error('❌ Error fetching translation:', error);
      setTranslatedVerse(null);
    }
  };

  // Fetch translation when verse changes
  useEffect(() => {
    fetchTranslatedVerse();
  }, [currentVerse, currentLanguage]);

  // Start recording
  const startRecording = async () => {
    try {
      console.log('🎤 Starting recording for verse:', currentVerse);
      
      const { status } = await Audio.requestPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission Required', 'Please grant microphone permission to record your recitation.');
        return;
      }

      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        staysActiveInBackground: true, // Keep audio playing in background
        playsInSilentModeIOS: true, // This is the key setting for ringer off
        shouldDuckAndroid: true,
        playThroughEarpieceAndroid: false,
      });

      const { recording } = await Audio.Recording.createAsync(
        Audio.RecordingOptionsPresets.HIGH_QUALITY
      );
      
      setRecording(recording);
      setIsRecording(true);
      setRecordingTime(0);
      
      // Animate button to square
      Animated.spring(buttonAnimation, {
        toValue: 1,
        useNativeDriver: false,
        tension: 100,
        friction: 8,
      }).start();
      
      recordingTimer.current = setInterval(() => {
        setRecordingTime(prev => prev + 1);
      }, 1000);
      
      console.log('🎤 Recording started successfully');
    } catch (error) {
      console.error('🎤 Error starting recording:', error);
      Alert.alert(t('recordingError', currentLanguage), t('failedToStartRecording', currentLanguage));
    }
  };

  // Stop recording
  const stopRecording = async () => {
    try {
      console.log('🎤 Stopping recording...');
      
      if (recordingTimer.current) {
        clearInterval(recordingTimer.current);
        recordingTimer.current = null;
      }
      
      if (recording) {
        await recording.stopAndUnloadAsync();
        const uri = recording.getURI();
        console.log('🎤 Recording stopped, URI:', uri);
        
        setRecording(null);
        setIsRecording(false);
        setRecordingUri(uri);
        
        // Auto-save the recording
        await autoSaveRecording(uri);
        
        // Animate button back to circle
        Animated.spring(buttonAnimation, {
          toValue: 0,
          useNativeDriver: false,
          tension: 100,
          friction: 8,
        }).start();
        
        await Audio.setAudioModeAsync({
          allowsRecordingIOS: false,
          staysActiveInBackground: true, // Keep audio playing in background
          playsInSilentModeIOS: true, // This is the key setting for ringer off
          shouldDuckAndroid: true,
          playThroughEarpieceAndroid: false,
        });
      }
    } catch (error) {
      console.error('🎤 Error stopping recording:', error);
      Alert.alert(t('recordingError', currentLanguage), t('failedToStopRecording', currentLanguage));
    }
  };

  // Play preview
  const playPreview = async () => {
    try {
      if (!recordingUri) return;
      
      if (previewAudio) {
        await previewAudio.unloadAsync();
      }
      
      const { sound } = await Audio.Sound.createAsync({ uri: recordingUri });
      setPreviewAudio(sound);
      setIsPlayingPreview(true);
      
      await sound.playAsync();
      
      sound.setOnPlaybackStatusUpdate((status) => {
        if (status.didJustFinish) {
          setIsPlayingPreview(false);
        }
      });
    } catch (error) {
      console.error('Error playing preview:', error);
      Alert.alert(t('playbackError', currentLanguage), t('couldNotPlayRecordingPreview', currentLanguage));
    }
  };

  // Reference audio functions
  const playReferenceAudio = async () => {
    if (isPlayingReference && referenceAudio) {
      // If already playing, pause it
      try {
        await referenceAudio.pauseAsync();
        setIsPlayingReference(false);
      } catch (error) {
        console.error('Error pausing reference audio:', error);
      }
    } else if (referenceAudio) {
      // If paused, resume it
      try {
        await referenceAudio.playAsync();
        setIsPlayingReference(true);
      } catch (error) {
        console.error('Error resuming reference audio:', error);
      }
    } else if (selectedReciter) {
      // If no audio loaded but reciter is selected, load and play
      try {
        const surahNumber = surah?.number || currentVerse?.surah?.number || currentVerse?.surahNumber;
        const verseNumber = currentVerse?.numberInSurah;
        
        if (!surahNumber || !verseNumber) {
          Alert.alert(t('error', currentLanguage), t('couldNotDetermineVerseInfo', currentLanguage));
          return;
        }

        // Get the ayah number (global verse number)
        const ayahNumber = currentVerse.number;
        
        // Get audio URL using shared service
        const audioUrl = await getAyahAudioUrl(ayahNumber, selectedReciter);
        
        console.log('🎵 Loading and playing reference audio:', { selectedReciter, ayahNumber, audioUrl });
        
        // Stop any existing reference audio
        if (referenceAudio) {
          await referenceAudio.unloadAsync();
        }
        
        const { sound } = await Audio.Sound.createAsync({ uri: audioUrl });
        setReferenceAudio(sound);
        setIsPlayingReference(true);
        
        await sound.playAsync();
        
        sound.setOnPlaybackStatusUpdate((status) => {
          if (status.didJustFinish) {
            setIsPlayingReference(false);
          }
        });
      } catch (error) {
        console.error('Error loading and playing reference audio:', error);
        Alert.alert(t('playbackError', currentLanguage), t('couldNotPlayReferenceAudio', currentLanguage));
      }
    } else {
      // If no reciter selected, show message to choose reciter first
      Alert.alert(
        t('noReciterSelected', currentLanguage), 
        t('pleaseChooseReciterFirst', currentLanguage)
      );
    }
  };

  const selectReciter = async (reciter) => {
    try {
      setShowReciterModal(false);
      setSelectedReciter(reciter);
      
      // Stop any existing reference audio
      if (referenceAudio) {
        await referenceAudio.unloadAsync();
        setReferenceAudio(null);
        setIsPlayingReference(false);
      }
      
      console.log('🎵 Reciter selected:', { reciter, name: getReciterById(reciter)?.name });
    } catch (error) {
      console.error('Error selecting reciter:', error);
      Alert.alert(t('error', currentLanguage), t('couldNotSelectReciter', currentLanguage));
    }
  };

  const stopReferenceAudio = async () => {
    try {
      if (referenceAudio) {
        await referenceAudio.unloadAsync();
        setReferenceAudio(null);
      }
      setIsPlayingReference(false);
    } catch (error) {
      console.error('Error stopping reference audio:', error);
    }
  };

  // Stop preview
  const stopPreview = async () => {
    try {
      if (previewAudio) {
        await previewAudio.unloadAsync();
        setPreviewAudio(null);
      }
      setIsPlayingPreview(false);
    } catch (error) {
      console.error('Error stopping preview:', error);
    }
  };

  // Delete recording
  const deleteRecording = async () => {
    try {
      console.log('🗑️ Delete button pressed');
      
      const user = auth.currentUser;
      if (!user) {
        console.log('🗑️ No authenticated user found');
        Alert.alert('Authentication Required', 'Please sign in to delete your recitation.');
        return;
      }

      console.log('🗑️ User authenticated:', user.uid);

      const surahNumber = surah?.number || currentVerse?.surah?.number || currentVerse?.surahNumber;
      const verseNumber = currentVerse?.numberInSurah;
      
      console.log('🗑️ Looking for recording:', { surahNumber, verseNumber, currentVerse });
      
      if (surahNumber && verseNumber) {
        const existingRecordingKey = `${surahNumber}_${verseNumber}`;
        const existingRecording = userRecordings[existingRecordingKey];
        
        console.log('🗑️ Existing recording key:', existingRecordingKey);
        console.log('🗑️ Existing recording found:', !!existingRecording);
        console.log('🗑️ All userRecordings keys:', Object.keys(userRecordings));
        
        if (existingRecording) {
          console.log('🗑️ Deleting recording from Firebase...');
          
          // Delete from Firestore
          if (existingRecording.id) {
            const recordingDocRef = doc(firestore, 'userRecordings', existingRecording.id);
            await deleteDoc(recordingDocRef);
            console.log('🗑️ Recording deleted from Firestore');
          }
          
          // Delete from Firebase Storage
          if (existingRecording.downloadURL) {
            try {
              // Extract the file path from the download URL
              const urlParts = existingRecording.downloadURL.split('/');
              const fileName = urlParts[urlParts.length - 1].split('?')[0]; // Remove query parameters
              const filePath = `recordings/${user.uid}/${fileName}`;
              const storageRef = ref(storage, filePath);
              await deleteObject(storageRef);
              console.log('🗑️ Audio file deleted from Firebase Storage');
            } catch (storageError) {
              console.warn('⚠️ Could not delete from Firebase Storage:', storageError);
              // Continue with deletion even if storage deletion fails
            }
          }
          
          // Remove from userRecordings state
          setUserRecordings(prev => {
            const newState = { ...prev };
            delete newState[existingRecordingKey];
            console.log('🗑️ Updated userRecordings state:', newState);
            return newState;
          });
          
          console.log('🗑️ Recording completely deleted from Firebase and local state');
        } else {
          console.log('🗑️ No existing recording found to delete');
        }
      } else {
        console.log('🗑️ Missing surah or verse number');
      }
      
      console.log('🗑️ Clearing local state...');
      
      // Clear local state immediately
      setRecordingUri(null);
      setRecordingTime(0);
      setIsPlayingPreview(false);
      setIsRecording(false);
      setRecordingJustDeleted(true); // Set flag to prevent restoration
      if (previewAudio) {
        previewAudio.unloadAsync();
        setPreviewAudio(null);
      }
      
      // Force UI refresh by ensuring all recording-related state is cleared
      setRecordingUri(null);
      setRecordingTime(0);
      setIsRecording(false);
      
      console.log('🗑️ Local state cleared, showing success alert');
      
      // Show success message and ensure UI updates
      console.log('🗑️ Final state check - recordingUri:', recordingUri, 'isRecording:', isRecording, 'isVerseRecorded:', isVerseRecorded(surah?.number, currentVerse.numberInSurah));
      
      Alert.alert(t('success', currentLanguage), t('recordingDeletedSuccessfully', currentLanguage));
    } catch (error) {
      console.error('🗑️ Error deleting recording:', error);
      Alert.alert(t('deleteError', currentLanguage), t('failedToDeleteRecording', currentLanguage));
    }
  };

  // Auto-save recording
  const autoSaveRecording = async (recordingUri) => {
    try {
      const user = auth.currentUser;
      if (!user) {
        console.log('⚠️ User not authenticated, skipping auto-save');
        return;
      }

      if (!recordingUri || !currentVerse) {
        console.log('⚠️ No recording to auto-save');
        return;
      }

      console.log('💾 Auto-saving recording for verse:', currentVerse);
      
      const surahNumber = surah?.number || currentVerse.surah?.number || currentVerse.surahNumber;
      const verseNumber = currentVerse.numberInSurah;
      
      if (!surahNumber || !verseNumber) {
        console.error('💾 Missing surah or verse number:', { surahNumber, verseNumber, currentVerse });
        return;
      }

      // Upload audio file to Firebase Storage
      console.log('📤 Uploading audio file to Firebase Storage...');
      const response = await fetch(recordingUri);
      const blob = await response.blob();
      
      const fileName = `recordings/${user.uid}/${surahNumber}_${verseNumber}_${Date.now()}.m4a`;
      const storageRef = ref(storage, fileName);
      
      const uploadResult = await uploadBytes(storageRef, blob);
      const downloadURL = await getDownloadURL(uploadResult.ref);
      
      console.log('📤 Audio file uploaded successfully:', downloadURL);
      
      const recordingData = {
        userId: user.uid,
        surahNumber: surahNumber,
        verseNumber: verseNumber,
        title: `My Recitation - ${surahNumber}:${verseNumber}`,
        duration: recordingTime,
        timestamp: serverTimestamp(),
        downloadURL: downloadURL,
        surahName: surah?.englishName || surahs.find(s => s.number === surahNumber)?.englishName || '',
        verseText: currentVerse.text,
      };

      // Check if recording already exists
      const existingRecordingKey = `${surahNumber}_${verseNumber}`;
      const existingRecording = userRecordings[existingRecordingKey];
      
      let recordingRef;
      if (existingRecording) {
        // Update existing recording
        recordingRef = doc(firestore, 'userRecordings', existingRecording.id);
        await setDoc(recordingRef, recordingData);
        console.log('💾 Existing recording updated successfully');
      } else {
        // Create new recording
        recordingRef = doc(collection(firestore, 'userRecordings'));
        await setDoc(recordingRef, recordingData);
        console.log('💾 New recording auto-saved successfully');
      }
      
      // Update userRecordings state with Firebase Storage URL for playback
      setUserRecordings(prev => ({
        ...prev,
        [existingRecordingKey]: {
          id: recordingRef.id,
          ...recordingData,
          downloadURL: downloadURL
        }
      }));
      
      // Set the recording URI to the Firebase Storage URL for immediate playback
      setRecordingUri(downloadURL);
      
      console.log('✅ Recording auto-saved successfully!');
      
    } catch (error) {
      console.error('💾 Error auto-saving recording:', error);
      // Don't show alert for auto-save errors to avoid interrupting user experience
    }
  };

  // Save recording (kept for backward compatibility, but not used in UI)
  const saveRecording = async () => {
    try {
      const user = auth.currentUser;
      if (!user) {
        Alert.alert('Authentication Required', 'Please sign in to save your recitation.');
        return;
      }

      if (!recordingUri || !currentVerse) {
        Alert.alert(t('error', currentLanguage), t('noRecordingToSave', currentLanguage));
        return;
      }

      console.log('💾 Saving recording for verse:', currentVerse);
      
      const surahNumber = surah?.number || currentVerse.surah?.number || currentVerse.surahNumber;
      const verseNumber = currentVerse.numberInSurah;
      
      if (!surahNumber || !verseNumber) {
        console.error('💾 Missing surah or verse number:', { surahNumber, verseNumber, verse });
        Alert.alert(t('saveError', currentLanguage), t('missingVerseInformation', currentLanguage));
        return;
      }

      // Upload audio file to Firebase Storage
      console.log('📤 Uploading audio file to Firebase Storage...');
      const response = await fetch(recordingUri);
      const blob = await response.blob();
      
      const fileName = `recordings/${user.uid}/${surahNumber}_${verseNumber}_${Date.now()}.m4a`;
      const storageRef = ref(storage, fileName);
      
      const uploadResult = await uploadBytes(storageRef, blob);
      const downloadURL = await getDownloadURL(uploadResult.ref);
      
      console.log('📤 Audio file uploaded successfully:', downloadURL);
      
      const recordingData = {
        userId: user.uid,
        surahNumber: surahNumber,
        verseNumber: verseNumber,
        title: `My Recitation - ${surahNumber}:${verseNumber}`,
        duration: recordingTime,
        timestamp: serverTimestamp(),
        downloadURL: downloadURL,
        surahName: surah?.englishName || surahs.find(s => s.number === surahNumber)?.englishName || '',
        verseText: currentVerse.text,
      };

      // Check if recording already exists
      const existingRecordingKey = `${surahNumber}_${verseNumber}`;
      const existingRecording = userRecordings[existingRecordingKey];
      
      let recordingRef;
      if (existingRecording) {
        // Update existing recording
        recordingRef = doc(firestore, 'userRecordings', existingRecording.id);
        await setDoc(recordingRef, recordingData);
        console.log('💾 Existing recording updated successfully');
      } else {
        // Create new recording
        recordingRef = doc(collection(firestore, 'userRecordings'));
        await setDoc(recordingRef, recordingData);
        console.log('💾 New recording saved successfully');
      }
      
      // Update userRecordings state with Firebase Storage URL for playback
      setUserRecordings(prev => ({
        ...prev,
        [existingRecordingKey]: {
          id: recordingRef.id,
          ...recordingData,
          downloadURL: downloadURL
        }
      }));
      
      // Set the recording URI to the Firebase Storage URL for immediate playback
      setRecordingUri(downloadURL);
      
      Alert.alert(t('success', currentLanguage), t('recitationSavedSuccessfully', currentLanguage));
      
      // Keep the recording visible for preview/listening
      // Don't clear local state or navigate back
      
    } catch (error) {
      console.error('💾 Error saving recording:', error);
      Alert.alert(t('saveError', currentLanguage), t('failedToSaveRecitation', currentLanguage));
    }
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (recordingTimer.current) {
        clearInterval(recordingTimer.current);
      }
      if (previewAudio) {
        previewAudio.unloadAsync();
      }
    };
  }, []);

  // Reset animation when no recording
  useEffect(() => {
    if (!isRecording && !recordingUri) {
      Animated.spring(buttonAnimation, {
        toValue: 0,
        useNativeDriver: false,
        tension: 100,
        friction: 8,
      }).start();
    }
  }, [isRecording, recordingUri]);

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#000000' }}>
      <StatusBar barStyle="light-content" backgroundColor="#000000" />
      
      {/* Recording is available to all users */}
      {!subscriptionChecked ? (
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20 }}>
          <ActivityIndicator size="large" color="#FFFFFF" />
          <Text style={{ color: '#FFFFFF', marginTop: 16, fontSize: 16 }}>
            Checking subscription...
          </Text>
        </View>
      ) : (
        <>
      {/* Header */}
      <View style={{ 
        backgroundColor: 'rgba(255,255,255,0.05)', 
        paddingTop: 20, 
        paddingBottom: 20, 
        paddingHorizontal: 20,
        borderBottomWidth: 1,
        borderBottomColor: 'rgba(255,255,255,0.1)',
      }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
          <TouchableOpacity 
            onPress={() => navigation.goBack()}
            style={{
              backgroundColor: 'rgba(255,255,255,0.1)',
              borderRadius: 20,
              padding: 8,
              width: 40,
              height: 40,
              justifyContent: 'center',
              alignItems: 'center',
            }}
          >
            <Ionicons name="close" size={20} color="#fff" />
          </TouchableOpacity>
          <View style={{ flex: 1, alignItems: 'center' }}>
            <Text style={{ 
              fontWeight: '600', 
              fontSize: 18, 
              color: '#fff',
              letterSpacing: 0.5,
            }}>
              Hudā
            </Text>
            <Text style={{ 
              fontWeight: '400', 
              fontSize: 12, 
              color: 'rgba(255,255,255,0.7)',
              letterSpacing: 0.3,
              marginTop: 2,
            }}>
              {t('goBackToVerseSelector', currentLanguage)}
            </Text>
          </View>
          <View style={{ width: 40 }} />
        </View>
      </View>

      <ScrollView 
        style={{ flex: 1, backgroundColor: '#000000' }} 
        contentContainerStyle={{ padding: 20, paddingBottom: 120 }}
        showsVerticalScrollIndicator={false}
      >
        {/* Verse Display */}
        <View style={{ marginBottom: 40 }}>
          {/* Surah and Verse Info */}
          <View style={{ 
            alignItems: 'center', 
            marginBottom: 24,
            paddingTop: 20,
          }}>
            <View style={{
              backgroundColor: 'rgba(255,255,255,0.12)',
              borderRadius: 24,
              paddingHorizontal: 24,
              paddingVertical: 20,
              shadowColor: '#000',
              shadowOffset: { width: 0, height: 4 },
              shadowOpacity: 0.15,
              shadowRadius: 12,
              elevation: 6,
              borderWidth: 1,
              borderColor: 'rgba(255,255,255,0.1)',
              alignItems: 'center',
              justifyContent: 'center',
            }}>
              <View style={{
                flexDirection: 'row',
                alignItems: 'center',
                gap: 12,
                marginBottom: 8,
              }}>
                <Text style={{ 
                  color: '#FFFFFF', 
                  fontSize: 24, 
                  fontWeight: '700',
                  letterSpacing: 0.8,
                }}>
                  {getProperSurahName(surah?.number, currentLanguage)}
                </Text>
                <View style={{
                  backgroundColor: 'rgba(255,255,255,0.15)',
                  borderRadius: 16,
                  paddingHorizontal: 12,
                  paddingVertical: 6,
                  borderWidth: 1,
                  borderColor: 'rgba(255,255,255,0.2)',
                }}>
                  <Text style={{ 
                    color: '#FFFFFF', 
                    fontSize: 16,
                    fontWeight: '600',
                    letterSpacing: 0.5,
                  }}>
                    {t('verse', currentLanguage)} {currentVerse.numberInSurah}
                  </Text>
                </View>
              </View>
            </View>
          </View>

          {/* Reference Controls */}
          <View style={{ 
            alignItems: 'center', 
            marginBottom: 32,
          }}>
            <View style={{
              flexDirection: 'row',
              alignItems: 'center',
              gap: 12,
              justifyContent: 'center',
            }}>
              {/* Play Reference Button */}
              <TouchableOpacity
                onPress={playReferenceAudio}
                style={{
                  backgroundColor: isPlayingReference ? 'rgba(255,59,48,0.2)' : 'rgba(255,255,255,0.15)',
                  borderRadius: 20,
                  paddingHorizontal: 16,
                  paddingVertical: 12,
                  borderWidth: 1,
                  borderColor: isPlayingReference ? 'rgba(255,59,48,0.3)' : 'rgba(255,255,255,0.2)',
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 6,
                  shadowColor: isPlayingReference ? '#FF3B30' : '#000',
                  shadowOffset: { width: 0, height: 2 },
                  shadowOpacity: isPlayingReference ? 0.3 : 0.1,
                  shadowRadius: 4,
                  elevation: 4,
                  flex: 1,
                  justifyContent: 'center',
                }}
              >
                <Ionicons 
                  name={isPlayingReference ? "pause-circle" : "play-circle"} 
                  size={16} 
                  color={isPlayingReference ? "#FF3B30" : "#FFFFFF"} 
                />
                <Text style={{ 
                  color: isPlayingReference ? "#FF3B30" : "#FFFFFF", 
                  fontSize: 14,
                  fontWeight: '600',
                  letterSpacing: 0.3,
                }}>
                  {isPlayingReference ? t('pause', currentLanguage) : t('play', currentLanguage)}
                </Text>
              </TouchableOpacity>

              {/* Reciter Selection Button */}
              <TouchableOpacity
                onPress={() => setShowReciterModal(true)}
                style={{
                  backgroundColor: selectedReciter ? 'rgba(34,197,94,0.2)' : 'rgba(255,255,255,0.15)',
                  borderRadius: 20,
                  paddingHorizontal: 16,
                  paddingVertical: 12,
                  borderWidth: 1,
                  borderColor: selectedReciter ? 'rgba(34,197,94,0.3)' : 'rgba(255,255,255,0.2)',
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 6,
                  shadowColor: selectedReciter ? '#22C55E' : '#000',
                  shadowOffset: { width: 0, height: 2 },
                  shadowOpacity: selectedReciter ? 0.3 : 0.1,
                  shadowRadius: 4,
                  elevation: 4,
                  flex: 1,
                  justifyContent: 'center',
                }}
              >
                <Ionicons 
                  name="person-circle" 
                  size={16} 
                  color={selectedReciter ? "#22C55E" : "#FFFFFF"} 
                />
                <Text style={{ 
                  color: selectedReciter ? "#22C55E" : "#FFFFFF", 
                  fontSize: 14,
                  fontWeight: '600',
                  letterSpacing: 0.3,
                }}>
                  {selectedReciter ? getReciterById(selectedReciter)?.name || 'Unknown' : t('chooseReciter', currentLanguage)}
                </Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Text Display Toggle */}
          <View style={{ 
            flexDirection: 'row', 
            backgroundColor: 'rgba(255,255,255,0.08)',
            borderRadius: 20,
            padding: 4,
            marginBottom: 32,
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: 0.1,
            shadowRadius: 8,
            elevation: 4,
          }}>
            <TouchableOpacity
              style={{
                flex: 1,
                paddingVertical: 12,
                paddingHorizontal: 8,
                borderRadius: 16,
                backgroundColor: textDisplayMode === 'arabic' ? 'rgba(255,255,255,0.15)' : 'transparent',
                alignItems: 'center',
                shadowColor: textDisplayMode === 'arabic' ? '#000' : 'transparent',
                shadowOffset: { width: 0, height: 2 },
                shadowOpacity: textDisplayMode === 'arabic' ? 0.1 : 0,
                shadowRadius: 4,
                elevation: textDisplayMode === 'arabic' ? 2 : 0,
              }}
              onPress={() => setTextDisplayMode('arabic')}
            >
              <Text style={{
                color: textDisplayMode === 'arabic' ? '#FFFFFF' : 'rgba(255,255,255,0.6)',
                fontSize: 13,
                fontWeight: '600',
                letterSpacing: 0.3,
              }}>
                {t('arabic', currentLanguage)}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={{
                flex: 1,
                paddingVertical: 12,
                paddingHorizontal: 6,
                borderRadius: 16,
                backgroundColor: textDisplayMode === 'transliteration' ? 'rgba(255,255,255,0.15)' : 'transparent',
                alignItems: 'center',
                shadowColor: textDisplayMode === 'transliteration' ? '#000' : 'transparent',
                shadowOffset: { width: 0, height: 2 },
                shadowOpacity: textDisplayMode === 'transliteration' ? 0.1 : 0,
                shadowRadius: 4,
                elevation: textDisplayMode === 'transliteration' ? 2 : 0,
              }}
              onPress={() => setTextDisplayMode('transliteration')}
            >
              <Text style={{
                color: textDisplayMode === 'transliteration' ? '#FFFFFF' : 'rgba(255,255,255,0.6)',
                fontSize: 12,
                fontWeight: '600',
                letterSpacing: 0.2,
                textAlign: 'center',
                lineHeight: 16,
              }}>
                {t('transliteration', currentLanguage)}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={{
                flex: 1,
                paddingVertical: 12,
                paddingHorizontal: 8,
                borderRadius: 16,
                backgroundColor: textDisplayMode === 'translation' ? 'rgba(255,255,255,0.15)' : 'transparent',
                alignItems: 'center',
                shadowColor: textDisplayMode === 'translation' ? '#000' : 'transparent',
                shadowOffset: { width: 0, height: 2 },
                shadowOpacity: textDisplayMode === 'translation' ? 0.1 : 0,
                shadowRadius: 4,
                elevation: textDisplayMode === 'translation' ? 2 : 0,
              }}
              onPress={() => setTextDisplayMode('translation')}
            >
              <Text style={{
                color: textDisplayMode === 'translation' ? '#FFFFFF' : 'rgba(255,255,255,0.6)',
                fontSize: 13,
                fontWeight: '600',
                letterSpacing: 0.3,
              }}>
                {t('translation', currentLanguage)}
              </Text>
            </TouchableOpacity>
          </View>

          {/* Verse Text */}
          <View style={{ 
            backgroundColor: 'rgba(255,255,255,0.08)',
            borderRadius: 24,
            padding: 28,
            borderWidth: 1,
            borderColor: 'rgba(255,255,255,0.1)',
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 4 },
            shadowOpacity: 0.1,
            shadowRadius: 12,
            elevation: 8,
            minHeight: 120,
            justifyContent: 'center',
          }}>
            <Text style={{
              color: '#FFFFFF',
              fontSize: textDisplayMode === 'arabic' ? 28 : 20,
              lineHeight: textDisplayMode === 'arabic' ? 44 : 28,
              textAlign: 'center',
              fontWeight: textDisplayMode === 'arabic' ? '400' : '500',
              letterSpacing: textDisplayMode === 'arabic' ? 0.8 : 0.4,
              fontFamily: textDisplayMode === 'arabic' ? (Platform.OS === 'ios' ? 'Arial' : 'Roboto') : undefined,
            }}>
              {textDisplayMode === 'arabic' 
                ? (currentVerse.numberInSurah === 1 && surah?.number !== 1 ? FIRST_VERSE_MAP[surah?.number] || currentVerse.text : currentVerse.text)
                : textDisplayMode === 'transliteration'
                ? (currentVerse.transliteration || t('transliterationNotAvailable', currentLanguage))
                : (translatedVerse || currentVerse.translation || t('translationNotAvailable', currentLanguage))
              }
            </Text>
          </View>
        </View>



        {/* Recording Status - Only show during recording */}
        {isRecording && (
          <View style={{ 
            backgroundColor: 'rgba(255,255,255,0.05)', 
            borderRadius: 24, 
            padding: 24, 
            marginBottom: 24,
            borderWidth: 1,
            borderColor: 'rgba(255,255,255,0.1)',
            alignItems: 'center',
          }}>
            <View style={{
              backgroundColor: '#FF3B30',
              borderRadius: 16,
              paddingHorizontal: 20,
              paddingVertical: 10,
              marginBottom: 12,
            }}>
              <Text style={{ color: '#FFFFFF', fontSize: 16, fontWeight: '600' }}>
                {t('rec', currentLanguage)}
              </Text>
            </View>
            <Text style={{ color: '#FF3B30', fontSize: 24, fontWeight: '700' }}>
              {formatTime(recordingTime)}
            </Text>
          </View>
        )}

        {/* Preview Controls - Only show after recording is complete */}
        {recordingUri && !isRecording && (
          <View style={{ 
            backgroundColor: 'rgba(255,255,255,0.05)', 
            borderRadius: 24, 
            padding: 24, 
            marginBottom: 24,
            borderWidth: 1,
            borderColor: 'rgba(255,255,255,0.1)',
            alignItems: 'center',
          }}>
            <Text style={{ 
              color: 'rgba(255,255,255,0.7)', 
              fontSize: 16, 
              marginBottom: 16,
              fontWeight: '500',
            }}>
              {t('recordingDuration', currentLanguage)}: {formatTime(recordingTime)}
            </Text>
            
            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 20 }}>
              <TouchableOpacity
                onPress={isPlayingPreview ? stopPreview : playPreview}
                style={{
                  backgroundColor: isPlayingPreview ? '#FF3B30' : '#34D399',
                  width: 60,
                  height: 60,
                  borderRadius: 30,
                  justifyContent: 'center',
                  alignItems: 'center',
                  marginRight: 16,
                  shadowColor: isPlayingPreview ? '#FF3B30' : '#34D399',
                  shadowOffset: { width: 0, height: 4 },
                  shadowOpacity: 0.3,
                  shadowRadius: 8,
                  elevation: 8,
                }}
              >
                <Ionicons 
                  name={isPlayingPreview ? 'stop' : 'play'} 
                  size={28} 
                  color="#FFFFFF" 
                />
              </TouchableOpacity>
              
              <Text style={{ 
                color: '#FFFFFF', 
                fontSize: 16, 
                fontWeight: '600' 
              }}>
                {isPlayingPreview ? t('stopPreview', currentLanguage) : t('playPreview', currentLanguage)}
              </Text>
            </View>

            {/* Action Buttons */}
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center' }}>
              <TouchableOpacity
                onPress={() => {
                  console.log('🗑️ Delete button pressed!');
                  deleteRecording();
                }}
                style={{
                  backgroundColor: '#FF3B30',
                  borderRadius: 16,
                  paddingHorizontal: 24,
                  paddingVertical: 14,
                  flexDirection: 'row',
                  alignItems: 'center',
                  shadowColor: '#FF3B30',
                  shadowOffset: { width: 0, height: 2 },
                  shadowOpacity: 0.2,
                  shadowRadius: 4,
                  elevation: 4,
                }}
              >
                <Ionicons name="trash-outline" size={20} color="#FFFFFF" style={{ marginRight: 8 }} />
                <Text style={{ color: '#FFFFFF', fontWeight: '600' }}>{t('delete', currentLanguage)}</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
      </ScrollView>

      {/* Footer Recording Button */}
      <View style={{
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        backgroundColor: 'rgba(255,255,255,0.05)',
        borderTopWidth: 1,
        borderTopColor: 'rgba(255,255,255,0.1)',
        paddingTop: 20,
        paddingBottom: 40,
        paddingHorizontal: 20,
      }}>
        <View style={{
          flexDirection: 'row',
          justifyContent: 'center',
          alignItems: 'center',
          position: 'relative',
        }}>
          {/* Back Button - Positioned absolutely on the left */}
          {verses.length > 1 && (
            <TouchableOpacity
              onPress={goToPreviousVerse}
              disabled={!canGoPrevious}
              style={{
                position: 'absolute',
                left: 0,
                backgroundColor: canGoPrevious ? 'rgba(255,255,255,0.1)' : 'rgba(255,255,255,0.05)',
                borderRadius: 20,
                paddingHorizontal: 16,
                paddingVertical: 12,
                flexDirection: 'row',
                alignItems: 'center',
                opacity: canGoPrevious ? 1 : 0.5,
                minWidth: 80,
                justifyContent: 'center',
              }}
            >
              <Ionicons 
                name="chevron-back" 
                size={18} 
                color={canGoPrevious ? "#FFFFFF" : "rgba(255,255,255,0.3)"} 
              />
              <Text style={{ 
                color: canGoPrevious ? "#FFFFFF" : "rgba(255,255,255,0.3)", 
                fontSize: 14,
                fontWeight: '600',
                marginLeft: 4,
              }}>
                {t('back', currentLanguage)}
              </Text>
            </TouchableOpacity>
          )}

          {/* Recording Button - Centered */}
          {(!isRecording && !recordingUri && !isVerseRecorded(surah?.number, currentVerse.numberInSurah)) || isRecording ? (
            <TouchableOpacity
              onPress={isRecording ? stopRecording : startRecording}
              style={{
                backgroundColor: 'transparent',
                width: 70,
                height: 70,
                borderRadius: 35,
                borderWidth: 4,
                borderColor: '#FFFFFF',
                shadowColor: '#FF3B30',
                shadowOffset: { width: 0, height: 8 },
                shadowOpacity: 0.4,
                shadowRadius: 16,
                elevation: 16,
                justifyContent: 'center',
                alignItems: 'center',
              }}
            >
              <Animated.View
                style={{
                  width: buttonAnimation.interpolate({
                    inputRange: [0, 1],
                    outputRange: [50, 30], // From large circle (50) to small square (30)
                }),
                  height: buttonAnimation.interpolate({
                    inputRange: [0, 1],
                    outputRange: [50, 30], // From large circle (50) to small square (30)
                }),
                  borderRadius: buttonAnimation.interpolate({
                    inputRange: [0, 1],
                    outputRange: [25, 6], // From circle (25) to square with slight rounding (6)
                }),
                  backgroundColor: '#FF3B30',
                }}
              />
            </TouchableOpacity>
          ) : recordingUri ? (
            <TouchableOpacity
              onPress={async () => {
                // Delete from Firebase if it exists
                const surahNumber = surah?.number || currentVerse?.surah?.number || currentVerse?.surahNumber;
                const verseNumber = currentVerse?.numberInSurah;
                
                if (surahNumber && verseNumber) {
                  const existingRecordingKey = `${surahNumber}_${verseNumber}`;
                  const existingRecording = userRecordings[existingRecordingKey];
                  
                  if (existingRecording) {
                    console.log('🗑️ Deleting existing recording for redo...');
                    
                    // Delete from Firestore
                    if (existingRecording.id) {
                      try {
                        const recordingDocRef = doc(firestore, 'userRecordings', existingRecording.id);
                        await deleteDoc(recordingDocRef);
                        console.log('🗑️ Recording deleted from Firestore for redo');
                      } catch (firestoreError) {
                        console.warn('⚠️ Could not delete from Firestore for redo:', firestoreError);
                      }
                    }
                    
                    // Delete from Firebase Storage
                    if (existingRecording.downloadURL) {
                      try {
                        // Extract the file path from the download URL
                        const urlParts = existingRecording.downloadURL.split('/');
                        const fileName = urlParts[urlParts.length - 1].split('?')[0]; // Remove query parameters
                        const filePath = `recordings/${auth.currentUser.uid}/${fileName}`;
                        const storageRef = ref(storage, filePath);
                        await deleteObject(storageRef);
                        console.log('🗑️ Audio file deleted from Firebase Storage for redo');
                      } catch (storageError) {
                        console.warn('⚠️ Could not delete from Firebase Storage for redo:', storageError);
                      }
                    }
                    
                    // Remove from userRecordings state
                    setUserRecordings(prev => {
                      const newState = { ...prev };
                      delete newState[existingRecordingKey];
                      return newState;
                    });
                    
                    console.log('🗑️ Recording completely deleted for redo');
                  }
                }
                
                // Clear local state
                setRecordingUri(null);
                setRecordingTime(0);
                setIsPlayingPreview(false);
                if (previewAudio) {
                  previewAudio.unloadAsync();
                  setPreviewAudio(null);
                }
                
                // Clear local recording state
                setRecordingUri(null);
                setRecordingTime(0);
                
                // Start recording immediately
                setTimeout(() => {
                  startRecording();
                }, 100);
              }}
              style={{
                backgroundColor: 'rgba(255,59,48,0.15)',
                borderRadius: 20,
                paddingHorizontal: 20,
                paddingVertical: 12,
                justifyContent: 'center',
                alignItems: 'center',
                borderWidth: 1,
                borderColor: 'rgba(255,59,48,0.3)',
                shadowColor: '#FF3B30',
                shadowOffset: { width: 0, height: 2 },
                shadowOpacity: 0.2,
                shadowRadius: 4,
                elevation: 4,
              }}
            >
              <Text style={{ 
                color: '#FF3B30', 
                fontSize: 16, 
                fontWeight: '700',
                letterSpacing: 0.5,
              }}>
                {t('redo', currentLanguage)}
              </Text>
            </TouchableOpacity>
          ) : (
            <View style={{ width: 70, height: 70 }} />
          )}

          {/* Next Button - Positioned absolutely on the right */}
          {verses.length > 1 && (
            <TouchableOpacity
              onPress={goToNextVerse}
              disabled={!canGoNext}
              style={{
                position: 'absolute',
                right: 0,
                backgroundColor: canGoNext ? 'rgba(255,255,255,0.1)' : 'rgba(255,255,255,0.05)',
                borderRadius: 20,
                paddingHorizontal: 16,
                paddingVertical: 12,
                flexDirection: 'row',
                alignItems: 'center',
                opacity: canGoNext ? 1 : 0.5,
                minWidth: 80,
                justifyContent: 'center',
              }}
            >
              <Text style={{ 
                color: canGoNext ? "#FFFFFF" : "rgba(255,255,255,0.3)", 
                fontSize: 14,
                fontWeight: '600',
                marginRight: 4,
              }}>
                {t('next', currentLanguage)}
              </Text>
              <Ionicons 
                name="chevron-forward" 
                size={18} 
                color={canGoNext ? "#FFFFFF" : "rgba(255,255,255,0.3)"} 
              />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Reciter Selection Modal */}
      <Modal
        visible={showReciterModal}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowReciterModal(false)}
      >
        <View style={{
          flex: 1,
          backgroundColor: 'rgba(0,0,0,0.8)',
          justifyContent: 'center',
          alignItems: 'center',
          padding: 20,
        }}>
          <View style={{
            backgroundColor: 'rgba(255,255,255,0.1)',
            borderRadius: 24,
            padding: 24,
            width: '100%',
            maxWidth: 400,
            borderWidth: 1,
            borderColor: 'rgba(255,255,255,0.2)',
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 8 },
            shadowOpacity: 0.3,
            shadowRadius: 16,
            elevation: 8,
          }}>
            <Text style={{
              color: '#FFFFFF',
              fontSize: 20,
              fontWeight: '700',
              textAlign: 'center',
              marginBottom: 24,
              letterSpacing: 0.5,
            }}>
              Choose Reciter
            </Text>
            
            <ScrollView 
              style={{ maxHeight: 300 }}
              showsVerticalScrollIndicator={true}
              contentContainerStyle={{ gap: 12 }}
            >
              {availableReciters.filter(reciter => reciter.id !== 'user').map((reciter) => (
                <TouchableOpacity
                  key={reciter.id}
                  onPress={() => selectReciter(reciter.id)}
                  style={{
                    backgroundColor: selectedReciter === reciter.id ? 'rgba(34,197,94,0.2)' : 'rgba(255,255,255,0.1)',
                    borderRadius: 16,
                    padding: 16,
                    borderWidth: 1,
                    borderColor: selectedReciter === reciter.id ? 'rgba(34,197,94,0.3)' : 'rgba(255,255,255,0.1)',
                    flexDirection: 'row',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                  }}
                >
                  <Text style={{
                    color: selectedReciter === reciter.id ? '#22C55E' : '#FFFFFF',
                    fontSize: 16,
                    fontWeight: '600',
                    letterSpacing: 0.3,
                  }}>
                    {reciter.name}
                  </Text>
                  <Ionicons 
                    name="person-circle" 
                    size={20} 
                    color={selectedReciter === reciter.id ? "#22C55E" : "#FFFFFF"} 
                  />
                </TouchableOpacity>
              ))}
            </ScrollView>
            
            <TouchableOpacity
              onPress={() => setShowReciterModal(false)}
              style={{
                backgroundColor: 'rgba(255,255,255,0.1)',
                borderRadius: 16,
                padding: 16,
                marginTop: 16,
                borderWidth: 1,
                borderColor: 'rgba(255,255,255,0.1)',
                alignItems: 'center',
              }}
            >
              <Text style={{
                color: '#FFFFFF',
                fontSize: 16,
                fontWeight: '600',
                letterSpacing: 0.3,
              }}>
                Cancel
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
        </>
      )}
    </SafeAreaView>
  );
};


export default RecordingScreen; 