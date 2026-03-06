import React, { useEffect, useState, useRef } from 'react';
import { Audio } from 'expo-av';
import { View, Text, FlatList, TouchableOpacity, ActivityIndicator, SafeAreaView, StatusBar, TextInput, Modal, Alert, ScrollView, Dimensions, AppState, Platform } from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { LinearGradient } from 'expo-linear-gradient';
import bookmarkService from '../services/bookmarkService';
import subscriptionGuard from '../services/subscriptionGuard';
import SubscriptionModal from '../components/SubscriptionModal';
import { getResponsiveIconSize } from '../utils/responsiveSizing';
import { getAndroidTopPadding } from '../utils/languageResponsiveSizing';
import { auth, firestore } from '../firebase';
import { doc, setDoc, getDoc, collection, query, where, getDocs, serverTimestamp, onSnapshot, deleteDoc } from 'firebase/firestore';
import * as FileSystem from 'expo-file-system';
import { useLanguage } from '../utils/useLanguage';
import { t } from '../utils/translations';
import { 
  getResponsiveFontSize, 
  getResponsiveLineHeight, 
  getResponsivePadding, 
  getResponsiveContainerWidth,
  getResponsiveTextStyle,
  getResponsiveCardStyle,
  getResponsiveBadgeStyle
} from '../utils/languageResponsiveSizing';
import { getTranslationEdition } from '../utils/quranTranslations';
import { availableReciters, getAyahAudioUrl } from '../services/reciterService';
import streakService from '../services/streakService';
import liveAudioRecorderService from '../services/liveAudioRecorderService';
import liveSpeechRecognitionService from '../services/liveSpeechRecognitionService';

const { width, height } = Dimensions.get('window');
const ALQURAN_API_BASE = 'https://api.alquran.cloud/v1';
const TAFSIR_API_BASE = 'https://quranapi.pages.dev/api/tafsir';
const FAVORITES_STORAGE_KEY = 'quran_favorite_verses';

// Complete multilingual surah names mapping for all supported languages
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
    "16": "The Bee",
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
    "27": "The Ant",
    "28": "The Stories",
    "29": "The Spider",
    "30": "The Romans",
    "31": "Luqman",
    "32": "The Prostration",
    "33": "The Confederates",
    "34": "Sheba",
    "35": "The Originator",
    "36": "Ya-Sin",
    "37": "Those Who Set the Ranks",
    "38": "Sad",
    "39": "The Groups",
    "40": "The Forgiver",
    "41": "Explained in Detail",
    "42": "The Consultation",
    "43": "The Gold Adornments",
    "44": "The Smoke",
    "45": "The Crouching",
    "46": "The Wind-Curved Sandhills",
    "47": "Muhammad",
    "48": "The Victory",
    "49": "The Rooms",
    "50": "Qaf",
    "51": "The Winnowing Winds",
    "52": "The Mount",
    "53": "The Star",
    "54": "The Moon",
    "55": "The Beneficent",
    "56": "The Inevitable",
    "57": "The Iron",
    "58": "The Pleading Woman",
    "59": "The Exile",
    "60": "She That Is To Be Examined",
    "61": "The Ranks",
    "62": "The Congregation",
    "63": "The Hypocrites",
    "64": "The Mutual Disillusion",
    "65": "The Divorce",
    "66": "The Prohibition",
    "67": "The Sovereignty",
    "68": "The Pen",
    "69": "The Inevitable",
    "70": "The Ascending Stairways",
    "71": "Noah",
    "72": "The Jinn",
    "73": "The Enshrouded One",
    "74": "The Cloaked One",
    "75": "The Resurrection",
    "76": "Man",
    "77": "The Emissaries",
    "78": "The Tidings",
    "79": "Those Who Drag Forth",
    "80": "He Frowned",
    "81": "The Overthrowing",
    "82": "The Cleaving",
    "83": "Defrauding",
    "84": "The Splitting Open",
    "85": "The Constellations",
    "86": "The Morning Star",
    "87": "The Most High",
    "88": "The Overwhelming",
    "89": "The Dawn",
    "90": "The City",
    "91": "The Sun",
    "92": "The Night",
    "93": "The Morning Hours",
    "94": "The Relief",
    "95": "The Fig",
    "96": "The Clot",
    "97": "The Power",
    "98": "The Clear Proof",
    "99": "The Earthquake",
    "100": "The Courser",
    "101": "The Calamity",
    "102": "The Rivalry in World Increase",
    "103": "The Declining Day",
    "104": "The Traducer",
    "105": "The Elephant",
    "106": "Quraysh",
    "107": "The Small Kindnesses",
    "108": "Abundance",
    "109": "The Disbelievers",
    "110": "The Divine Support",
    "111": "The Palm Fiber",
    "112": "The Sincerity",
    "113": "The Daybreak",
    "114": "The Mankind"
  },
  es: {
    "1": "La Apertura",
    "2": "La Vaca",
    "3": "La Familia de Imran",
    "4": "Las Mujeres",
    "5": "La Mesa Servida",
    "6": "El Ganado",
    "7": "Las Alturas",
    "8": "El Botín",
    "9": "El Arrepentimiento",
    "10": "Jonás",
    "11": "Hud",
    "12": "José",
    "13": "El Trueno",
    "14": "Abraham",
    "15": "El Pedregal",
    "16": "La Abeja",
    "17": "El Viaje Nocturno",
    "18": "La Cueva",
    "19": "María",
    "20": "Ta-Ha",
    "21": "Los Profetas",
    "22": "La Peregrinación",
    "23": "Los Creyentes",
    "24": "La Luz",
    "25": "El Discernimiento",
    "26": "Los Poetas",
    "27": "La Hormiga",
    "28": "Los Relatos",
    "29": "La Araña",
    "30": "Los Romanos",
    "31": "Luqmán",
    "32": "La Postración",
    "33": "Los Confederados",
    "34": "Saba",
    "35": "El Originador",
    "36": "Ya-Sin",
    "37": "Los que Forman las Filas",
    "38": "Sad",
    "39": "Los Grupos",
    "40": "El Perdonador",
    "41": "Explicado con Detalle",
    "42": "La Consulta",
    "43": "Los Adornos de Oro",
    "44": "El Humo",
    "45": "Los Arrodillados",
    "46": "Las Dunas",
    "47": "Muhammad",
    "48": "La Victoria",
    "49": "Las Habitaciones",
    "50": "Qaf",
    "51": "Los Vientos que Dispersan",
    "52": "El Monte",
    "53": "La Estrella",
    "54": "La Luna",
    "55": "El Misericordioso",
    "56": "Lo Ineludible",
    "57": "El Hierro",
    "58": "La Que Discute",
    "59": "La Reunión",
    "60": "La Examinada",
    "61": "Las Filas",
    "62": "La Congregación del Viernes",
    "63": "Los Hipócritas",
    "64": "La Mutua Pérdida",
    "65": "El Divorcio",
    "66": "La Prohibición",
    "67": "La Soberanía",
    "68": "La Pluma",
    "69": "La Inevitabilidad",
    "70": "Las Vías de Ascenso",
    "71": "Noé",
    "72": "Los Genios",
    "73": "El Envueltos en un Manto",
    "74": "El Envuelto en un Manto",
    "75": "La Resurrección",
    "76": "El Hombre",
    "77": "Los Enviados",
    "78": "La Noticia",
    "79": "Los que Arrancan",
    "80": "Frunció el Ceño",
    "81": "El Oscurecimiento",
    "82": "La Hendidura",
    "83": "Los Defraudadores",
    "84": "La Ruptura",
    "85": "Las Constelaciones",
    "86": "El Astro Nocturno",
    "87": "El Altísimo",
    "88": "El Abrumador",
    "89": "El Alba",
    "90": "La Ciudad",
    "91": "El Sol",
    "92": "La Noche",
    "93": "La Mañana",
    "94": "La Expansión",
    "95": "La Higuera",
    "96": "El Coágulo",
    "97": "El Decreto",
    "98": "La Prueba Clara",
    "99": "El Temblor",
    "100": "Los Corceles",
    "101": "La Calamidad",
    "102": "La Rivalidad en la Abundancia",
    "103": "El Tiempo",
    "104": "El Calumniador",
    "105": "El Elefante",
    "106": "Quraysh",
    "107": "La Caridad Sencilla",
    "108": "La Abundancia",
    "109": "Los Incrédulos",
    "110": "La Ayuda Divina",
    "111": "Las Fibras",
    "112": "La Sinceridad",
    "113": "El Alba",
    "114": "La Humanidad"
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
    "48": "La Victoire Éclatante",
    "49": "Les Appartements",
    "50": "Qaf",
    "51": "Qui éparpillent",
    "52": "La Montagne",
    "53": "L'Étoile",
    "54": "La Lune",
    "55": "Le Tout Miséricordieux",
    "56": "L'Événement",
    "57": "Le Fer",
    "58": "La Discussion",
    "59": "L'Exode",
    "60": "L'Éprouvée",
    "61": "Le Rang",
    "62": "Le Vendredi",
    "63": "Les Hypocrites",
    "64": "La Grande Perte",
    "65": "Le Divorce",
    "66": "L'Interdiction",
    "67": "La Royauté",
    "68": "La Plume",
    "69": "L'Inévitable",
    "70": "Les Voies d'Ascension",
    "71": "Noé",
    "72": "Les Djinns",
    "73": "L'Enveloppé",
    "74": "Le Revêtu d'un Manteau",
    "75": "La Résurrection",
    "76": "L'Homme",
    "77": "Les Envoyés",
    "78": "La Nouvelle",
    "79": "Les Anges qui Arrachent",
    "80": "Il s'est Renfrogné",
    "81": "L'Obscurcissement",
    "82": "La Déchirure",
    "83": "Les Fraudeurs",
    "84": "La Déchirée",
    "85": "Les Constellations",
    "86": "L'Astre Nocturne",
    "87": "Le Très-Haut",
    "88": "L'Enveloppante",
    "89": "L'Aube",
    "90": "La Cité",
    "91": "Le Soleil",
    "92": "La Nuit",
    "93": "Le Jour Montant",
    "94": "L'Ouverture",
    "95": "Le Figuier",
    "96": "L'Adhérence",
    "97": "La Destinée",
    "98": "La Preuve",
    "99": "La Secousse",
    "100": "Les Coursiers",
    "101": "Le Fracas",
    "102": "La Course aux Richesses",
    "103": "Le Temps",
    "104": "Les Calomniateurs",
    "105": "L'Éléphant",
    "106": "Quraysh",
    "107": "L'Ustensile",
    "108": "L'Abondance",
    "109": "Les Infidèles",
    "110": "Le Secours",
    "111": "Les Fibres",
    "112": "Le Monothéisme Pur",
    "113": "L'Aube Naissante",
    "114": "Les Hommes"
  },
  it: {
    "1": "L'Apertura",
    "2": "La Giovenca",
    "3": "La Famiglia di Imran",
    "4": "Le Donne",
    "5": "La Tavola Imbandita",
    "6": "Il Bestiame",
    "7": "Le Alture",
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
    "25": "Il Discrimine",
    "26": "I Poeti",
    "27": "Le Formiche",
    "28": "I Racconti",
    "29": "Il Ragno",
    "30": "I Romani",
    "31": "Luqman",
    "32": "La Prosternazione",
    "33": "I Coalizzati",
    "34": "Saba",
    "35": "Il Creatore",
    "36": "Ya-Sin",
    "37": "Coloro che Sono in Righe",
    "38": "Sad",
    "39": "I Gruppi",
    "40": "Il Perdonatore",
    "41": "Spiegata in Dettaglio",
    "42": "La Consultazione",
    "43": "Gli Ornamenti d'Oro",
    "44": "Il Fumo",
    "45": "L'Inginocchiata",
    "46": "Le Dune",
    "47": "Muhammad",
    "48": "La Vittoria",
    "49": "Le Stanze",
    "50": "Qaf",
    "51": "I Ventilanti",
    "52": "Il Monte",
    "53": "La Stella",
    "54": "La Luna",
    "55": "Il Compassionevole",
    "56": "L'Inevitabile",
    "57": "Il Ferro",
    "58": "La Donna che Discute",
    "59": "L'Esodo",
    "60": "L'Esaminata",
    "61": "Le Schiere",
    "62": "Il Venerdì",
    "63": "Gli Ipocriti",
    "64": "L'Inganno Reciproco",
    "65": "Il Divorzio",
    "66": "L'Interdizione",
    "67": "La Sovranità",
    "68": "La Penna",
    "69": "L'Inevitabile",
    "70": "I Gradi",
    "71": "Noè",
    "72": "I Ginn",
    "73": "L'Avvolto",
    "74": "Il Rivestito",
    "75": "La Resurrezione",
    "76": "L'Uomo",
    "77": "Gli Inviati",
    "78": "La Notizia",
    "79": "Coloro che Strappano",
    "80": "Si Incupì",
    "81": "L'Avvolgimento",
    "82": "Lo Squarciamento",
    "83": "I Frodi",
    "84": "Lo Scisma",
    "85": "Le Costellazioni",
    "86": "La Stella del Mattino",
    "87": "L'Altissimo",
    "88": "L'Avvolgente",
    "89": "L'Aurora",
    "90": "La Città",
    "91": "Il Sole",
    "92": "La Notte",
    "93": "Il Giorno Radioso",
    "94": "L'Apertura del Petto",
    "95": "Il Fico",
    "96": "Il Grumo",
    "97": "Il Destino",
    "98": "La Prova Chiara",
    "99": "Il Terremoto",
    "100": "I Corridori",
    "101": "La Sciagura",
    "102": "La Gara all'Abbondanza",
    "103": "Il Tempo",
    "104": "Il Diffamatore",
    "105": "L'Elefante",
    "106": "Quraysh",
    "107": "Le Opere di Carità",
    "108": "L'Abbondanza",
    "109": "I Miscredenti",
    "110": "Il Soccorso Divino",
    "111": "Le Fibre",
    "112": "Il Sincero",
    "113": "L'Alba",
    "114": "Gli Uomini"
  }
};

const QURAN_COM_RECITERS_API = 'https://api.quran.com/api/v4/resources/reciters';
const QURAN_COM_AUDIO_CDN = 'https://verses.quran.com';

// Helper function to get proper surah name based on current language
const getProperSurahName = (surahNumber, language = 'en') => {
  // Ensure surahNumber is a string and language is valid
  const surahKey = surahNumber?.toString();
  const validLanguage = language || 'en';
  
  // Map language codes to our surah names keys
  let languageKey = 'en'; // Default to English
  if (validLanguage === 'es' || validLanguage === 'spanish') languageKey = 'es';
  else if (validLanguage === 'fr' || validLanguage === 'french') languageKey = 'fr';
  else if (validLanguage === 'it' || validLanguage === 'italian') languageKey = 'it';
  
  const surahName = SURAH_NAMES[languageKey]?.[surahKey] || `Surah ${surahNumber}`;
  console.log(`🌍 Surah ${surahNumber}: Language=${validLanguage}, Key=${languageKey}, Name="${surahName}"`);
  
  return surahName;
};




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
  11: 'الۤر ۚ كِتَـٰبٌ أُحْكِمَتْ ءَايَـٰتُهُۥ ثُمَّ فُصِّلَتْ مِن لَّدُن حَكِيمٍ خَبِيرٍۢ',
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
  35: 'ٱلْحَمْدُ لِلَّهِ فَاطِرِ ٱلسَّمَـٰوَٰتِ وَٱلْأَرْضِ جَاعِلِ ٱلْمَلَـٰٓئِكَةِ رُسُلًا أُو۟لِىٓ أَجْنِحَةٍۢ مَّثْنَىٰ وَثُلَـٰثَ وَرُبَـٰعَ ۚ يَزِيدُ فِى ٱلْخَلْقِ مَا يَشَآءُ ۚ إِنَّ ٱللَّهَ عَلَىٰ كُلِّ شَىْءٍۢ قَدِيرٌۭ',
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
  56: 'إِذَا وَقَعَتِ ٱلْوَاقِعَةُ',
  57: 'سَبَّحَ لِلَّهِ مَا فِى ٱلسَّمَـٰوَٰتِ وَٱلْأَرْضِ ۖ وَهُوَ ٱلْعَزِيزُ ٱلْحَكِيمُ',
  58: 'قَدْ سَمِعَ ٱللَّهُ قَوْلَ ٱلَّتِى تُجَـٰدِلُكَ فِى زَوْجِهَا وَتَشْتَكِىٓ إِلَى ٱللَّهِ وَٱللَّهُ يَسْمَعُ تَحَاوُرَكُمَآ ۚ إِنَّ ٱللَّهَ سَمِيعٌۢ بَصِيرٌۭ',
  59: 'سَبَّحَ لِلَّهِ مَا فِى ٱلسَّمَـٰوَٰتِ وَمَا فِى ٱلْأَرْضِ ۖ وَهُوَ ٱلْعَزِيزُ ٱلْحَكِيمُ',
  60: 'يَـٰٓأَيُّهَا ٱلَّذِينَ ءَامَنُوا۟ لَا تَتَّخِذُوا۟ عَدُوِّى وَعَدُوَّكُمْ أَوْلِيَآءَ تُلْقُونَ إِلَيْهِم بِٱلْمَوَدَّةِ وَقَدْ كَفَرُوا۟ بِمَا جَآءَكُم مِّنَ ٱلْحَقِّ يُخْرِجُونَ ٱلرَّسُولَ وَإِيَّاكُمْ أَن تُؤْمِنُوا۟ بِٱللَّهِ رَبِّكُمْ ۖ إِن كُنتُمْ خَرَجْتُمْ جِهَـٰدًۭا فِى سَبِيلِى وَٱبْتِغَآءَ مَرْضَاتِى ۖ تُسِرُّونَ إِلَيْهِم بِٱلْمَوَدَّةِ وَأَنَا۠ أَعْلَمُ بِمَآ أَخْفَيْتُمْ وَمَآ أَعْلَنتُمْ ۚ وَمَن يَفْعَلْهُ مِنكُمْ فَقَدْ ضَلَّ سَوَآءَ ٱلسَّبِيلِ',
  61: 'سَبَّحَ لِلَّهِ مَا فِى ٱلسَّمَـٰوَٰتِ وَمَا فِى ٱلْأَرْضِ ۖ وَهُوَ ٱلْعَزِيزُ ٱلْحَكِيمُ',
  62: 'يُسَبِّحُ لِلَّهِ مَا فِى ٱلسَّمَـٰوَٰتِ وَمَا فِى ٱلْأَرْضِ ٱلْمَلِكِ ٱلْقُدُّوسِ ٱلْعَزِيزِ ٱلْحَكِيمِ',
  63: 'إِذَا جَآءَكَ ٱلْمُنَـٰفِقُونَ قَالُوا۟ نَشْهَدُ إِنَّكَ لَرَسُولُ ٱللَّهِ ۗ وَٱللَّهُ يَعْلَمُ إِنَّكَ لَرَسُولُهُۥ وَٱللَّهُ يَشْهَدُ إِنَّ ٱلْمُنَـٰفِقِينَ لَكَـٰذِبُونَ',
  64: 'يُسَبِّحُ لِلَّهِ مَا فِى ٱلسَّمَـٰوَٰتِ وَمَا فِى ٱلْأَرْضِ ۖ لَهُ ٱلْمُلْكُ وَلَهُ ٱلْحَمْدُ ۖ وَهُوَ عَلَىٰ كُلِّ شَىْءٍۢ قَدِيرٌۭ',
  65: 'يَـٰٓأَيُّهَا ٱلنَّبِىُّ إِذَا طَلَّقْتُمُ ٱلنِّسَآءَ فَطَلِّقُوهُنَّ لِعِدَّتِهِنَّ وَأَحْصُوا۟ ٱلْعِدَّةَ ۖ وَٱتَّقُوا۟ ٱللَّهَ رَبَّكُمْ ۖ لَا تُخْرِجُوهُنَّ مِنۢ بُيُوتِهِنَّ وَلَا يَخْرُجْنَ إِلَّآ أَن يَأْتِينَ بِفَـٰحِشَةٍۢ مُّبَيِّنَةٍۢ ۚ وَتِلْكَ حُدُودُ ٱللَّهِ ۚ وَمَن يَتَعَدَّ حُدُودَ ٱللَّهِ فَقَدْ ظَلَمَ نَفْسَهُۥ ۚ لَا تَدْرِى لَعَلَّ ٱللَّهَ يُحْدِثُ بَعْدَ ذَٰلِكَ أَمْرًۭا',
  66: 'يَـٰٓأَيُّهَا ٱلنَّبِىُّ لِمَ تُحَرِّمُ مَآ أَحَلَّ ٱللَّهُ لَكَ ۖ تَبْتَغِى مَرْضَاتَ أَزْوَٰجِكَ ۚ وَٱللَّهُ غَفُورٌۭ رَّحِيمٌۭ',
  67: 'تَبَارَكَ ٱلَّذِى بِيَدِهِ ٱلْمُلْكُ وَهُوَ عَلَىٰ كُلِّ شَىْءٍۢ قَدِيرٌ',
  68: 'ن ۚ وَٱلْقَلَمِ وَمَا يَسْطُرُونَ',
  69: 'ٱلْحَآقَّةُ',
  70: 'سَأَلَ سَآئِلٌۢ بِعَذَابٍۢ وَاقِعٍۢ',
  71: 'إِنَّآ أَرْسَلْنَا نُوحًا إِلَىٰ قَوْمِهِۦٓ أَنْ أَنذِرْ قَوْمَكَ مِن قَبْلِ أَن يَأْتِيَهُمْ عَذَابٌ أَلِيمٌۭ',
  72: 'قُلْ أُوحِىَ إِلَىَّ أَنَّهُ ٱسْتَمَعَ نَفَرٌۭ مِّنَ ٱلْجِنِّ فَقَالُوٓا۟ إِنَّا سَمِعْنَا قُرْءَانًا عَجَبًۭا',
  73: 'يَـٰٓأَيُّهَا ٱلْمُزَّمِّلُ',
  74: 'يَـٰٓأَيُّهَا ٱلْمُدَّثِّرُ',
  75: 'لَآ أُقْسِمُ بِيَوْمِ ٱلْقِيَـٰمَةِ',
  76: 'هَلْ أَتَىٰ عَلَى ٱلْإِنسَـٰنِ حِينٌۭ مِّنَ ٱلدَّهْرِ لَمْ يَكُن شَيْـًۭٔا مَّذْكُورًا',
  77: 'وَٱلْمُرْسَلَـٰتِ عُرْفًۭا',
  78: 'عَمَّ يَتَسَآءَلُونَ',
  79: 'وَٱلنَّـٰزِعَـٰتِ غَرْقًۭا',
  80: 'عَبَسَ وَتَوَلَّىٰ',
  81: 'إِذَا ٱلشَّمْسُ كُوِّرَتْ',
  82: 'إِذَا ٱلسَّمَآءُ ٱنفَطَرَتْ',
  83: 'وَيْلٌۭ لِّلْمُطَفِّفِينَ',
  84: 'إِذَا ٱلسَّمَآءُ ٱنشَقَّتْ',
  85: 'وَٱلسَّمَآءِ ذَاتِ ٱلْبُرُوجِ',
  86: 'وَٱلسَّمَآءِ وَٱلطَّارِقِ',
  87: 'سَبِّحِ ٱسْمَ رَبِّكَ ٱلْأَعْلَى',
  88: 'هَلْ أَتَىٰكَ حَدِيثُ ٱلْغَـٰشِيَةِ',
  89: 'وَٱلْفَجْرِ',
  90: 'لَآ أُقْسِمُ بِهَـٰذَا ٱلْبَلَدِ',
  91: 'وَٱلشَّمْسِ وَضُحَىٰهَا',
  92: 'وَٱللَّيْلِ إِذَا يَغْشَىٰ',
  93: 'وَٱلضُّحَىٰ',
  94: 'أَلَمْ نَشْرَحْ لَكَ صَدْرَكَ',
  95: 'وَٱلتِّينِ وَٱلزَّيْتُونِ',
  96: 'ٱقْرَأْ بِٱسْمِ رَبِّكَ ٱلَّذِى خَلَقَ',
  97: 'إِنَّآ أَنزَلْنَـٰهُ فِى لَيْلَةِ ٱلْقَدْرِ',
  98: 'لَمْ يَكُنِ ٱلَّذِينَ كَفَرُوا۟ مِنْ أَهْلِ ٱلْكِتَـٰبِ وَٱلْمُشْرِكِينَ مُنفَكِّينَ حَتَّىٰ تَأْتِيَهُمُ ٱلْبَيِّنَةُ',
  99: 'إِذَا زُلْزِلَتِ ٱلْأَرْضُ زِلْزَالَهَا',
  100: 'وَٱلْعَـٰدِيَـٰتِ ضَبْحًۭا',
  101: 'ٱلْقَارِعَةُ',
  102: 'أَلْهَىٰكُمُ ٱلتَّكَاثُرُ',
  103: 'وَٱلْعَصْرِ',
  104: 'وَيْلٌۭ لِّكُلِّ هُمَزَةٍۢ لُّمَزَةٍۢ',
  105: 'أَلَمْ تَرَ كَيْفَ فَعَلَ رَبُّكَ بِأَصْحَـٰبِ ٱلْفِيلِ',
  106: 'لِإِيلَـٰفِ قُرَيْشٍۢ',
  107: 'أَرَءَيْتَ ٱلَّذِى يُكَذِّبُ بِٱلدِّينِ',
  108: 'إِنَّآ أَعْطَيْنَـٰكَ ٱلْكَوْثَرَ',
  109: 'قُلْ يَـٰٓأَيُّهَا ٱلْكَـٰفِرُونَ',
  110: 'إِذَا جَآءَ نَصْرُ ٱللَّهِ وَٱلْفَتْحُ',
  111: 'تَبَّتْ يَدَآ أَبِى لَهَبٍۢ وَتَبَّ',
  112: 'قُلْ هُوَ ٱللَّهُ أَحَدٌۭ',
  113: 'قُلْ أَعُوذُ بِرَبِّ ٱلْفَلَقِ',
  114: 'قُلْ أَعُوذُ بِرَبِّ ٱلنَّاسِ'
};


const BISMILLAH = 'بِسْمِ اللَّهِ الرَّحْمَـٰنِ الرَّحِيمِ';

const QuranScreen = ({ navigation, route }) => {
  // Language support
  const { currentLanguage } = useLanguage();
  
  // Debug: Log current language
  console.log('🌍 QuranScreen: Current language is:', currentLanguage);
  
  // Debug: Log when selected surah changes
  useEffect(() => {
    if (selectedSurah) {
      console.log('📖 QuranScreen: Selected surah changed to:', selectedSurah);
      console.log('🌍 QuranScreen: Current language:', currentLanguage);
      console.log('📝 QuranScreen: Proper surah name:', getProperSurahName(selectedSurah, currentLanguage));
    }
  }, [selectedSurah, currentLanguage]);
  
  const [surahs, setSurahs] = useState([]);
  const [selectedSurah, setSelectedSurah] = useState(null);
  const [verses, setVerses] = useState([]);
  const [filteredVerses, setFilteredVerses] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showSurahList, setShowSurahList] = useState(false);
  const [audio, setAudio] = useState(null);
  const [playingAyah, setPlayingAyah] = useState(null);
  const [showTafsirModal, setShowTafsirModal] = useState(false);
  const [selectedVerse, setSelectedVerse] = useState(null);
  const [tafsir, setTafsir] = useState(null);
  const [tafsirLoading, setTafsirLoading] = useState(false);
  const [tafsirError, setTafsirError] = useState(null);
  const [favoriteVerses, setFavoriteVerses] = useState([]);
  const [showSearchModal, setShowSearchModal] = useState(false);
  const [globalSearchQuery, setGlobalSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [searchType, setSearchType] = useState('verses'); // 'verses', 'surahs', 'reference'
  const [highlightedVerse, setHighlightedVerse] = useState(null);
  const [flatListRef, setFlatListRef] = useState(null);
  const [showAudioControls, setShowAudioControls] = useState(false);
  const [selectedReciter, setSelectedReciter] = useState('5'); // Default to Mishary Alafasy
  const [playbackSpeed, setPlaybackSpeed] = useState(1.0);
  const [isPlaying, setIsPlaying] = useState(false);
  
  // Enhanced audio controls state
  const [showAdvancedAudioModal, setShowAdvancedAudioModal] = useState(false);
  const [audioPlayMode, setAudioPlayMode] = useState('range'); // 'surah', 'range', 'custom'
  const [loopCount, setLoopCount] = useState(1);
  const [startVerse, setStartVerse] = useState(1);
  const [endVerse, setEndVerse] = useState(1);
  const [selectedVerses, setSelectedVerses] = useState([]);
  const [autoPlayNext, setAutoPlayNext] = useState(true);
  const [showVerseSelection, setShowVerseSelection] = useState(false);
  
  // New state for inline reciter selection
  const [showInlineReciterSelection, setShowInlineReciterSelection] = useState(false);
  const [showStartVerseSelection, setShowStartVerseSelection] = useState(false);
  const [showEndVerseSelection, setShowEndVerseSelection] = useState(false);
  
  // Separate loop counts for verse and range
  const [verseLoopCount, setVerseLoopCount] = useState(1);
  const [rangeLoopCount, setRangeLoopCount] = useState(1);
  
  // Cross-surah range selection
  const [startSurah, setStartSurah] = useState(selectedSurah);
  const [endSurah, setEndSurah] = useState(selectedSurah);
  const [showSurahSelection, setShowSurahSelection] = useState(false);
  
  // Floating play button states
  const [showFloatingMenu, setShowFloatingMenu] = useState(false);
  const [showListenReciteMenu, setShowListenReciteMenu] = useState(false);
  const [isReciteMode, setIsReciteMode] = useState(false);

  // Memorization mode states
  const [isMemorizationMode, setIsMemorizationMode] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [memorizationRecording, setMemorizationRecording] = useState(null);
  const [openAIKey, setOpenAIKey] = useState(null);
  const [showAPIKeyModal, setShowAPIKeyModal] = useState(false);
  const [tarteelQuranDB, setTarteelQuranDB] = useState(null); // Tarteel's local Quran database
  const [apiKeyInput, setAPIKeyInput] = useState('');
  const [transcribedText, setTranscribedText] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [detectedSurah, setDetectedSurah] = useState(null);
  const [detectedVerse, setDetectedVerse] = useState(null);
  const [memorizationRecordingTime, setMemorizationRecordingTime] = useState(0);
  const [liveTranscription, setLiveTranscription] = useState('');
  const continuousDetectionInterval = useRef(null);
  const recordingTimerInterval = useRef(null);
  const recordingChunks = useRef([]);
  const currentRecordingRef = useRef(null);
  const longPressTimerRef = useRef(null);
  const isCreatingRecording = useRef(false);
  const isListeningRef = useRef(false);
  const processingIntervalMs = useRef(8000); // Start with 8 seconds to accumulate more audio
  const lastDetectedSurahVerse = useRef(null); // Track last detection for duplicate check
  const duplicateCount = useRef(0); // Track consecutive duplicates
  const nextRecordingRef = useRef(null); // Next recording for overlapping approach
  const accumulatedTranscriptionRef = useRef(''); // Accumulate ALL transcription text so user sees full verse building up
  const shouldStopDetectionRef = useRef(false); // Stop detection after first match
  const detectionInProgressRef = useRef(false); // Track if detection is running

  // Load API keys from storage
  useEffect(() => {
    const loadAPIKeys = async () => {
      try {
        // Load OpenAI key
        const openAIKeyValue = await AsyncStorage.getItem('openai_api_key');
        if (openAIKeyValue && openAIKeyValue.trim().length > 0) {
          setOpenAIKey(openAIKeyValue.trim());
        } else {
          // Do NOT hardcode API keys in the repo (GitHub will block pushes).
          console.log('ℹ️ No OpenAI API key found in storage');
          setOpenAIKey(null);
        }
        
        // Load Tarteel's local Quran database (like Tarteel app)
        try {
          const quranDB = require('../data/tarteel-quran.json');
          setTarteelQuranDB(quranDB);
          console.log('✅ Loaded Tarteel Quran database for fast local matching');
        } catch (error) {
          console.log('⚠️ Could not load Tarteel Quran database:', error);
          console.log('⚠️ Will use API-based matching as fallback');
        }
      } catch (error) {
        console.log('Error loading API keys:', error);
      }
    };
    loadAPIKeys();
  }, []);

  // Start continuous detection - records and detects in real-time
  const startContinuousDetection = async () => {
    try {
      console.log('🚀 ===== STARTING CONTINUOUS DETECTION =====');
      
      // First, make sure any existing recording is stopped and cleaned up
      console.log('🧹 Step 1: Cleaning up any existing recordings...');
      const existingRecording = currentRecordingRef.current || memorizationRecording;
      if (existingRecording) {
        try {
          const status = await existingRecording.getStatusAsync();
          if (status.isRecording) {
            console.log('⚠️ Stopping existing recording before starting new one...');
            await existingRecording.stopAndUnloadAsync();
          }
        } catch (err) {
          console.log('Error stopping existing recording:', err);
        }
        setMemorizationRecording(null);
        currentRecordingRef.current = null;
      }
      
      // Stop any existing audio recording (cleanup)
      console.log('🛑 Step 1.5: Stopping any existing audio recording...');
      try {
        if (Platform.OS === 'ios' && liveAudioRecorderService.getIsRecording()) {
          await liveAudioRecorderService.stopRecording();
          console.log('✅ Stopped existing recording (if any)');
        }
      } catch (err) {
        console.log('⚠️ Error stopping recording (may not have been running):', err.message);
      }
      // Wait to ensure it's fully stopped
      await new Promise(resolve => setTimeout(resolve, 300));
      
      // Clear any intervals
      console.log('🧹 Step 2: Clearing intervals...');
      if (continuousDetectionInterval.current) {
        clearInterval(continuousDetectionInterval.current);
        continuousDetectionInterval.current = null;
      }
      if (recordingTimerInterval.current) {
        clearInterval(recordingTimerInterval.current);
        recordingTimerInterval.current = null;
      }
      
      // Longer delay to ensure previous recording is fully stopped and released
      console.log('⏳ Step 3: Waiting for cleanup to complete...');
      await new Promise(resolve => setTimeout(resolve, 500));
      
      // Request permissions
      console.log('🔐 Step 4: Requesting permissions...');
      const { status: audioStatus } = await Audio.requestPermissionsAsync();
      if (audioStatus !== 'granted') {
        Alert.alert(
          t('permissionRequired', currentLanguage) || 'Permission Required',
          t('microphonePermission', currentLanguage) || 'Microphone permission is required for memorization mode.'
        );
        return;
      }
      console.log('✅ Microphone permission granted');
      
      // Set audio mode for recording
      console.log('🎵 Step 5: Setting audio mode...');
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
        staysActiveInBackground: false,
        shouldDuckAndroid: true,
        playThroughEarpieceAndroid: false,
      });
      console.log('✅ Audio mode set');
      
      // Reset detection state
      console.log('🔄 Step 6: Resetting state...');
      setDetectedSurah(null);
      setDetectedVerse(null);
      setMemorizationRecordingTime(0);
      setLiveTranscription(''); // Start empty - will accumulate as user recites
      setTranscribedText(''); // Reset transcribed text
      accumulatedTranscriptionRef.current = ''; // Reset accumulated transcription
      recordingChunks.current = [];
      // Reset adaptive interval tracking
      processingIntervalMs.current = 8000; // Start with 8 seconds to accumulate more audio
      lastDetectedSurahVerse.current = null;
      shouldStopDetectionRef.current = false; // Reset detection stop flag
      detectionInProgressRef.current = false; // Reset detection in progress flag
      duplicateCount.current = 0;
      console.log('✅ State reset');
      
      // Build contextual strings from current verses (Tarteel approach - helps iOS SFSpeechRecognizer)
      // Get normalized Quran text (without diacritics) from current surah for better recognition
      const buildContextualStrings = () => {
        if (!verses || verses.length === 0) return [];
        
        // Get normalized text (no diacritics) from current verses - max 100 strings (iOS limit)
        const contextualStrings = [];
        const maxStrings = 100;
        
        for (let i = 0; i < Math.min(verses.length, maxStrings); i++) {
          const ayah = verses[i];
          if (ayah && ayah.text) {
            // Normalize: remove diacritics (like Tarteel does)
            const normalizedText = ayah.text.replace(/[\u064B-\u065F\u0670]/g, '').trim();
            if (normalizedText.length > 0) {
              contextualStrings.push(normalizedText);
            }
          }
        }
        
        console.log(`📝 Built ${contextualStrings.length} contextual strings from current surah`);
        return contextualStrings;
      };
      
      // Use continuous live recording with periodic transcription (no chunking)
      // This allows the system to listen for as long as needed without cutting off mid-verse
      try {
        console.log('🎤 Step 7: Starting continuous live recording...');
        console.log('📝 Using Whisper API for periodic transcription (continuous audio, no chunking)');
        console.log('🎯 Recording will continue uninterrupted - transcription happens in background');
        
        if (isCreatingRecording.current) {
          console.log('⚠️ Already creating recording, skipping...');
          return;
        }
        
        isCreatingRecording.current = true;
        console.log('🎤 Creating continuous recording instance...');
        
        // Start a single continuous recording that runs until user stops it
        const { recording: newRecording } = await Audio.Recording.createAsync(
          Audio.RecordingOptionsPresets.HIGH_QUALITY,
          (status) => {
            if (status.isDoneRecording) {
              console.log('⚠️ Recording done callback triggered');
            }
          }
        );
        
        setMemorizationRecording(newRecording);
        currentRecordingRef.current = newRecording;
        setIsListening(true);
        isListeningRef.current = true;
        console.log('✅ Continuous recording started - will run until stopped');
        
        // Track the last transcription time to avoid processing too frequently
        let lastTranscriptionTime = 0;
        // Reset accumulated transcription at start of new session
        accumulatedTranscriptionRef.current = '';
        
        // Process transcription periodically WITHOUT stopping the recording
        // This creates a snapshot of the current recording, transcribes it, then continues
        continuousDetectionInterval.current = setInterval(async () => {
          if (!isListeningRef.current) {
            if (continuousDetectionInterval.current) {
              clearInterval(continuousDetectionInterval.current);
              continuousDetectionInterval.current = null;
            }
            return;
          }
          
          const currentRecording = currentRecordingRef.current;
          if (!currentRecording) return;
          
          try {
            const status = await currentRecording.getStatusAsync();
            if (!status.isRecording) return;
            
            const now = Date.now();
            const timeSinceLastTranscription = now - lastTranscriptionTime;
            
            // Process transcription every 3-5 seconds (adaptive interval)
            if (timeSinceLastTranscription >= processingIntervalMs.current && status.durationMillis >= 2000) {
              // Minimum 2 seconds of audio before first transcription
              console.log('📝 Processing live transcription (recording duration:', status.durationMillis, 'ms)');
              console.log('🔄 Creating snapshot of current recording for transcription...');
              
              lastTranscriptionTime = now;
              
              // Create a snapshot: stop recording temporarily, get the audio, then restart
              // Each transcription includes ALL accumulated audio from the start, preventing mid-verse cutoffs
              try {
                // Stop recording to get current audio (includes all previous audio)
                await currentRecording.stopAndUnloadAsync();
                const uri = currentRecording.getURI();
                
                if (uri) {
                  // Transcribe the FULL accumulated audio (from start of recording session)
                  // This ensures we have complete context and won't cut off mid-verse
                  console.log('📤 Sending full accumulated audio to Whisper API...');
                  console.log('📁 Audio file URI:', uri);
                  console.log('⏱️ Recording duration:', status.durationMillis, 'ms');
                  
                  // Verify we have meaningful audio before transcribing
                  // Check recording duration - need at least 2 seconds of audio
                  if (status.durationMillis < 2000) {
                    console.log('⚠️ Recording too short (', status.durationMillis, 'ms) - skipping transcription (need 2+ seconds)');
                    // Restart recording without transcribing
                    await new Promise(resolve => setTimeout(resolve, 50));
                    const { recording: nextRecording } = await Audio.Recording.createAsync(
                      Audio.RecordingOptionsPresets.HIGH_QUALITY
                    );
                    setMemorizationRecording(nextRecording);
                    currentRecordingRef.current = nextRecording;
                    console.log('✅ Recording restarted - continuing live listening');
                    return; // Exit callback, interval will call again
                  }
                  
                  // Verify we're actually using audio transcription
                  const transcribedText = await transcribeAudio(uri);
                  
                  if (!transcribedText) {
                    console.log('⚠️ WARNING: No transcription received from Whisper API');
                    console.log('⚠️ This means audio transcription is not working - check API key and audio file');
                    // Restart recording
                    await new Promise(resolve => setTimeout(resolve, 50));
                    const { recording: nextRecording } = await Audio.Recording.createAsync(
                      Audio.RecordingOptionsPresets.HIGH_QUALITY
                    );
                    setMemorizationRecording(nextRecording);
                    currentRecordingRef.current = nextRecording;
                    return; // Exit callback, interval will call again
                  }
                  
                  // Validate transcription is meaningful (not just noise/silence)
                  // Check if it contains actual Arabic characters (not just punctuation/numbers)
                  const arabicCharPattern = /[\u0600-\u06FF]/;
                  const hasArabicChars = arabicCharPattern.test(transcribedText);
                  const meaningfulLength = transcribedText.replace(/[\s\u064B-\u065F\u0670]/g, '').length;
                  
                  if (!hasArabicChars || meaningfulLength < 5) {
                    console.log('⚠️ Transcription appears to be noise/silence (no Arabic chars or too short):', transcribedText);
                    console.log('⚠️ Skipping accumulation and detection - waiting for actual speech');
                    // Still restart recording but don't accumulate this transcription
                    await new Promise(resolve => setTimeout(resolve, 50));
                    const { recording: nextRecording } = await Audio.Recording.createAsync(
                      Audio.RecordingOptionsPresets.HIGH_QUALITY
                    );
                    setMemorizationRecording(nextRecording);
                    currentRecordingRef.current = nextRecording;
                    return; // Exit callback, interval will call again
                  }
                  
                  if (transcribedText && transcribedText.length > 0) {
                    // Since we restart recording each time, each Whisper transcription is for NEW audio
                    // Simply append the new transcription to show the full verse building up
                    const currentAccumulated = accumulatedTranscriptionRef.current;
                    let newAccumulated = '';
                    
                    if (currentAccumulated.length === 0) {
                      // First transcription - use it directly
                      newAccumulated = transcribedText;
                      console.log('📝 First transcription:', transcribedText);
                    } else {
                      // Append new transcription (with space separator)
                      // This shows the full verse as user continues reciting
                      newAccumulated = currentAccumulated + ' ' + transcribedText;
                      console.log('📝 Appended new transcription to accumulated text');
                    }
                    
                    // Update accumulated transcription
                    accumulatedTranscriptionRef.current = newAccumulated;
                    
                    // Update UI to show ALL accumulated text (full verse building up)
                    setLiveTranscription(newAccumulated);
                    setTranscribedText(newAccumulated);
                    
                    console.log('✅ Accumulated transcription (full verse):', newAccumulated.substring(0, 80) + '...');
                    console.log('📊 Total transcription length:', newAccumulated.length, 'characters');
                    
                    // Separate transcription display from detection
                    // Show transcription immediately, but only detect when we have enough text
                    // Only detect when we have enough text (at least 30 characters)
                    // AND detection is not already in progress AND we haven't found a match yet
                    // AND the transcription contains meaningful Arabic text
                    const accumulatedHasArabic = arabicCharPattern.test(newAccumulated);
                    const accumulatedMeaningfulLength = newAccumulated.replace(/[\s\u064B-\u065F\u0670]/g, '').length;
                    
                    if (newAccumulated.length >= 30 && 
                        accumulatedHasArabic && 
                        accumulatedMeaningfulLength >= 20 &&
                        !detectionInProgressRef.current && 
                        !shouldStopDetectionRef.current) {
                      console.log('🔍 Attempting detection with full accumulated text...');
                      detectionInProgressRef.current = true;
                      
                      // Detect surah/verse from the FULL accumulated transcription
                      // This has complete context - the full verse the user has recited so far
                      detectSurahFromTranscription(newAccumulated, true)
                        .then(() => {
                          detectionInProgressRef.current = false;
                        })
                        .catch(err => {
                          console.log('❌ Error in detection:', err);
                          detectionInProgressRef.current = false;
                        });
                    } else if (newAccumulated.length < 30) {
                      console.log('⏳ Waiting for more text before detection (current:', newAccumulated.length, 'chars, need 30+ for full ayah)');
                    } else if (shouldStopDetectionRef.current) {
                      console.log('⏳ Detection stopped - match already found');
                    } else if (detectionInProgressRef.current) {
                      console.log('⏳ Detection already in progress, waiting...');
                    }
                  } else {
                    console.log('⚠️ No transcription received (may be silence or too short)');
                  }
                }
                
                // Immediately restart recording to continue (minimal gap ~50-100ms)
                // The recording continues from where it left off conceptually
                await new Promise(resolve => setTimeout(resolve, 50)); // Minimal delay
                
                const { recording: nextRecording } = await Audio.Recording.createAsync(
                  Audio.RecordingOptionsPresets.HIGH_QUALITY
                );
                setMemorizationRecording(nextRecording);
                currentRecordingRef.current = nextRecording;
                
                console.log('✅ Recording restarted - continuing live listening (gap: ~50ms)');
              } catch (snapshotError) {
                console.log('❌ Error creating snapshot:', snapshotError);
                // Try to restart recording even if snapshot failed to maintain continuity
                try {
                  await new Promise(resolve => setTimeout(resolve, 50));
                  const { recording: recoveryRecording } = await Audio.Recording.createAsync(
                    Audio.RecordingOptionsPresets.HIGH_QUALITY
                  );
                  setMemorizationRecording(recoveryRecording);
                  currentRecordingRef.current = recoveryRecording;
                  console.log('✅ Recording recovered after error');
                } catch (recoveryError) {
                  console.log('❌ Failed to recover recording:', recoveryError);
                  // Stop listening if we can't recover
                  setIsListening(false);
                  isListeningRef.current = false;
                }
              }
            }
          } catch (error) {
            console.log('❌ Error in live transcription processing:', error);
          }
        }, processingIntervalMs.current); // Check every 8 seconds (adaptive)
        
        isCreatingRecording.current = false;
        
        console.log('✅ Step 9: Continuous live recording started');
        console.log('✅ Recording will continue uninterrupted');
        console.log('📝 Transcription will happen periodically in background');
        console.log('🎤 Speak Arabic - the system will listen continuously and transcribe');
        
        // Start timer for display
        console.log('⏱️ Step 10: Starting recording timer...');
        recordingTimerInterval.current = setInterval(() => {
          setMemorizationRecordingTime(prev => prev + 1);
        }, 1000);
        console.log('✅ ===== CONTINUOUS LIVE DETECTION STARTED SUCCESSFULLY =====');
        
      } catch (error) {
        console.log('❌ Error starting continuous recording:', error);
        isCreatingRecording.current = false;
        setIsListening(false);
        isListeningRef.current = false;
        setMemorizationRecording(null);
        currentRecordingRef.current = null;
        
        let errorMessage = 'Failed to start recording';
        if (error && error.message) {
          errorMessage = error.message;
        }
        
        Alert.alert(
          'Recording Error', 
          'Failed to start audio recording. Please check microphone permissions.\n\nError: ' + errorMessage
        );
        return;
      }
      
      
      console.log('✅ Continuous detection started');
      
    } catch (error) {
      console.log('❌ Error starting continuous detection:', error);
      console.log('❌ Error details:', JSON.stringify(error, null, 2));
      isCreatingRecording.current = false;
      setIsListening(false);
      isListeningRef.current = false;
      setMemorizationRecording(null);
      currentRecordingRef.current = null;
      
      let errorMessage = 'Failed to start recording';
      if (error && error.message) {
        errorMessage = error.message;
        if (errorMessage.includes('only one recording') || errorMessage.includes('recording')) {
          errorMessage = 'Another recording is active. Please wait a moment and try again.';
        } else if (errorMessage.includes('permission')) {
          errorMessage = 'Microphone permission is required. Please grant permission in settings.';
        }
      } else if (error && typeof error === 'string') {
        errorMessage = error;
      }
      
      setLiveTranscription(`Error: ${errorMessage}`);
      Alert.alert(
        t('error', currentLanguage) || 'Error', 
        errorMessage
      );
    }
  };

  // Stop continuous detection
  const stopContinuousDetection = async () => {
    try {
      console.log('🛑 Stopping continuous detection...');
      
      // Clear intervals first
      if (continuousDetectionInterval.current) {
        clearInterval(continuousDetectionInterval.current);
        continuousDetectionInterval.current = null;
      }
      if (recordingTimerInterval.current) {
        clearInterval(recordingTimerInterval.current);
        recordingTimerInterval.current = null;
      }
      
      // Stop native iOS audio recorder (Tarteel-like approach)
      if (Platform.OS === 'ios' && liveAudioRecorderService.getIsRecording()) {
        try {
          await liveAudioRecorderService.stopRecording();
          console.log('✅ Native iOS chunk-based recording stopped');
        } catch (error) {
          console.log('❌ Error stopping native recording:', error);
        }
      }
      
      // Also stop speech recognition if it was somehow still active (shouldn't be, but just in case)
      if (Platform.OS === 'ios' && liveSpeechRecognitionService.getIsRecognizingSync()) {
        try {
          await liveSpeechRecognitionService.stopRecognition();
          console.log('✅ Native iOS speech recognition stopped (cleanup)');
        } catch (error) {
          console.log('❌ Error stopping live recognition:', error);
        }
      }
      
      // Stop recording using ref (Android/fallback)
      const currentRecording = currentRecordingRef.current;
      if (currentRecording) {
        try {
          const status = await currentRecording.getStatusAsync();
          if (status.isRecording) {
            console.log('🛑 Stopping active recording...');
            await currentRecording.stopAndUnloadAsync();
            console.log('✅ Recording stopped');
          }
        } catch (error) {
          console.log('Error stopping recording:', error);
          // Try to unload anyway
          try {
            await currentRecording.unloadAsync();
          } catch (unloadError) {
            console.log('Error unloading recording:', unloadError);
          }
        }
      }
      
      // Also check state recording
      if (memorizationRecording) {
        try {
          const status = await memorizationRecording.getStatusAsync();
          if (status.isRecording) {
            console.log('🛑 Stopping state recording...');
            await memorizationRecording.stopAndUnloadAsync();
          }
        } catch (error) {
          console.log('Error stopping state recording:', error);
        }
      }
      
      // Wait a bit to ensure recording is fully released
      await new Promise(resolve => setTimeout(resolve, 200));
      
      setIsListening(false);
      isListeningRef.current = false;
      setIsProcessing(false);
      setMemorizationRecording(null);
      currentRecordingRef.current = null;
      isCreatingRecording.current = false;
      setMemorizationRecordingTime(0);
      setLiveTranscription('');
      setIsReciteMode(false);
      console.log('✅ Continuous detection stopped');
    } catch (error) {
      console.log('❌ Error stopping detection:', error);
      setIsListening(false);
      isListeningRef.current = false;
      setMemorizationRecording(null);
      currentRecordingRef.current = null;
    }
  };

  // Transcribe audio to Arabic text using OpenAI Whisper (Tarteel-style approach)
  const transcribeAudio = async (audioUri) => {
    if (!audioUri) {
      return null;
    }
    
    // Use OpenAI Whisper (like Tarteel uses their custom model, but we use Whisper)
    if (openAIKey) {
      return await transcribeWithOpenAI(audioUri);
    }
    
    console.log('❌ No OpenAI API key available for transcription');
    return null;
  };

  // Transcribe using OpenAI Whisper (Tarteel-style: using Whisper for transcription)
  const transcribeWithOpenAI = async (audioUri) => {
    if (!openAIKey) {
      return null;
    }
    
    try {
      console.log('📝 Transcribing with OpenAI Whisper (Tarteel-style approach)...');
      
      // Handle file paths
      let fileUri = audioUri;
      let checkUri = audioUri;
      
      if (audioUri.startsWith('/') && !audioUri.startsWith('file://')) {
        checkUri = audioUri;
        fileUri = `file://${audioUri}`;
      } else if (audioUri.startsWith('file://')) {
        checkUri = audioUri;
        fileUri = audioUri;
      }
      
      const fileInfo = await FileSystem.getInfoAsync(checkUri);
      console.log('📁 File info:', { exists: fileInfo.exists, size: fileInfo.size, originalUri: audioUri, checkUri, fileUri });
      
      if (!fileInfo.exists) {
        console.log('❌ File does not exist:', checkUri);
        return null;
      }
      if (fileInfo.size < 1000) {
        console.log('⚠️ File too small:', fileInfo.size, 'bytes');
        return null;
      }
      
      const formData = new FormData();
      const fileData = {
        uri: fileUri,
        type: 'audio/m4a',
        name: 'recording.m4a',
      };
      
      console.log('📤 Preparing FormData for OpenAI:', { 
        originalUri: audioUri, 
        fileUri: fileUri, 
        type: fileData.type,
        fileSize: fileInfo.size 
      });
      
      formData.append('file', fileData);
      formData.append('model', 'whisper-1');
      formData.append('language', 'ar');
      formData.append('response_format', 'json');
      
      // Add Quran-specific prompt to guide transcription
      const quranPrompt = 'هذا نص قرآني من القرآن الكريم. الآيات القرآنية بالعربية الفصحى.';
      formData.append('prompt', quranPrompt);
      
      const response = await fetch('https://api.openai.com/v1/audio/transcriptions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${openAIKey}`,
        },
        body: formData,
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        console.log('❌ Transcription API error:', response.status);
        console.log('❌ Error details:', errorText);
        try {
          const errorData = JSON.parse(errorText);
          console.log('❌ Parsed error:', errorData);
        } catch (e) {
          console.log('❌ Could not parse error response');
        }
        return null;
      }
      
      const data = await response.json();
      const transcribedArabic = data.text.trim();
      
      if (transcribedArabic && transcribedArabic.length > 0) {
        console.log('✅ Arabic transcription received from OpenAI Whisper:', transcribedArabic);
        console.log('📊 Transcription length:', transcribedArabic.length, 'characters');
        return transcribedArabic;
      } else {
        console.log('⚠️ Empty transcription received from OpenAI Whisper');
      }
      return null;
    } catch (error) {
      console.log('❌ Error transcribing with OpenAI:', error);
      return null;
    }
  };

  // Detect surah/verse from audio (separate process - for navigation)
  const detectSurahFromTranscription = async (transcribedText, isContinuous = false) => {
    if (!transcribedText || transcribedText.trim().length === 0) {
      return;
    }
    
    try {
      console.log('🔍 Detecting surah from transcription:', transcribedText);
      
      // Clean and normalize the transcribed text (Tarteel approach)
      // Remove all diacritics (tashkeel) for matching - same as Tarteel's 'text' field
      const cleanTranscribed = transcribedText
        .replace(/[\u064B-\u065F\u0670]/g, '') // Remove diacritics
        .replace(/\r\n/g, ' ') // Normalize line breaks
        .replace(/\s+/g, ' ') // Normalize whitespace
        .trim();
      
      // Validate transcription contains actual Arabic characters (not just noise/silence)
      const arabicCharPattern = /[\u0600-\u06FF]/;
      const hasArabicChars = arabicCharPattern.test(cleanTranscribed);
      const meaningfulLength = cleanTranscribed.replace(/[\s\u064B-\u065F\u0670]/g, '').length;
      
      if (!hasArabicChars) {
        console.log('⚠️ Transcription contains no Arabic characters - skipping detection (likely noise/silence)');
        return;
      }
      
      if (meaningfulLength < 10) {
        console.log('⚠️ Transcription too short (meaningful chars:', meaningfulLength, ') - skipping detection (need 10+)');
        return;
      }
      
      // Require minimum text length (at least 20 characters)
      // This ensures we have enough text to confidently match a verse
      if (cleanTranscribed.length < 20) {
        console.log('⚠️ Transcribed text too short:', cleanTranscribed.length, 'chars (need 20+)');
        return;
      }
      
      // Match any Arabic text - don't filter out non-Quranic text
      
      console.log('🔍 Detecting verse with transcribed text:', cleanTranscribed.substring(0, 60) + '...');
      console.log('📊 Transcribed text length:', cleanTranscribed.length, 'characters');
      console.log('🎯 Using Tarteel-style local database matching (no API calls)');
      
      // Use longer search length for better accuracy (use more of the transcribed text)
      const searchLength = isContinuous ? Math.min(50, cleanTranscribed.length) : Math.min(30, cleanTranscribed.length);
      const searchText = cleanTranscribed.substring(0, searchLength);
      
      let bestMatch = null;
      let bestScore = 0;
      
      // Check if detection should stop (first match found)
      if (shouldStopDetectionRef.current) {
        console.log('🛑 Detection stopped - first match already found');
        return;
      }
      
      // Use Tarteel's local database if available (much faster than API calls)
      if (tarteelQuranDB) {
        console.log('📚 Using Tarteel local Quran database for fast matching...');
        
        // Search common surahs first (most frequently recited)
        const commonSurahs = [1, 2, 112, 113, 114, 18, 36, 55, 67, 78, 87, 93, 108];
        const allSurahs = [...commonSurahs];
        for (let i = 1; i <= 114; i++) {
          if (!commonSurahs.includes(i)) {
            allSurahs.push(i);
          }
        }
        
        console.log('🔍 Searching through', allSurahs.length, 'surahs in local database...');
        
        for (const surahNum of allSurahs) {
          // Stop if detection was cancelled (first match found)
          if (shouldStopDetectionRef.current) {
            console.log('🛑 Stopping search - first match found');
            break;
          }
          
          try {
            const surah = tarteelQuranDB[String(surahNum)];
            if (!surah) {
              continue;
            }
            
            // Iterate through all ayahs in this surah
            for (const ayahNum in surah) {
              const ayah = surah[ayahNum];
              if (!ayah || !ayah.text) {
                continue;
              }
              
              // Use Tarteel's normalized 'text' field (already has no diacritics)
              // Just normalize whitespace to match our transcription
              const cleanAyah = ayah.text
                .replace(/\r\n/g, ' ') // Normalize line breaks
                .replace(/\s+/g, ' ') // Normalize whitespace
                .trim();
              
              // Improved matching: check multiple ways for better accuracy
              let score = 0;
              
              // Improved matching algorithm - navigate on any match found
              // 1. Check if transcribed text is contained in verse (best match - exact substring)
              if (cleanAyah.includes(searchText)) {
                score = searchText.length * 5; // High score for exact substring match
                console.log(`✅ Exact substring match: Surah ${surahNum}, Verse ${ayahNum}`);
              } 
              // 2. Check if verse contains a significant portion of transcribed text
              else if (searchText.length >= 10) {
                for (let len = Math.min(searchText.length, 50); len >= 10; len--) {
                  const substring = searchText.substring(0, len);
                  if (cleanAyah.includes(substring)) {
                    score = len * 4; // High score for significant substring match
                    console.log(`✅ Significant substring match (${len} chars): Surah ${surahNum}, Verse ${ayahNum}`);
                    break;
                  }
                }
              }
              // 3. Check if verse starts with transcribed text
              if (score === 0 && cleanAyah.startsWith(searchText.substring(0, Math.min(15, searchText.length)))) {
                score = Math.min(15, searchText.length) * 3;
              }
              // 4. Check if transcribed text starts with verse
              else if (score === 0 && searchText.startsWith(cleanAyah.substring(0, Math.min(15, cleanAyah.length)))) {
                score = Math.min(15, cleanAyah.length) * 3;
              }
              // 5. Fuzzy matching - find longest substring match
              else if (score === 0) {
                const minLength = Math.min(searchText.length, cleanAyah.length, 30);
                
                // Find longest matching substring
                let longestMatch = 0;
                for (let len = Math.min(20, searchText.length); len >= 5; len--) {
                  const substring = searchText.substring(0, len);
                  if (cleanAyah.includes(substring)) {
                    longestMatch = len;
                    break;
                  }
                }
                
                // Character-by-character matching for first portion
                let charMatches = 0;
                for (let i = 0; i < minLength; i++) {
                  if (searchText[i] === cleanAyah[i]) {
                    charMatches++;
                  }
                }
                
                // Combine scores
                score = (longestMatch * 2) + charMatches;
              }
              
              // Only consider matches with meaningful scores
              // No minimum threshold - navigate on any match
              if (score > bestScore) {
                bestScore = score;
                bestMatch = {
                  surah: surahNum,
                  verse: parseInt(ayahNum),
                  ayah: ayah,
                  score: score
                };
                
                console.log(`📊 New best match: Surah ${surahNum}, Verse ${ayahNum} (score: ${score})`);
                
                // If we have a very strong match (exact substring with high score), stop searching this surah
                if (score >= searchText.length * 4) {
                  console.log(`✅ Very strong match found! Stopping search in this surah.`);
                  break;
                }
              }
            }
            
            // If we found a very strong match, stop searching all surahs
            if (bestMatch && bestScore >= 10) {
              console.log('✅ Very strong match found, stopping search');
              break;
            }
          } catch (error) {
            console.log(`❌ Error processing surah ${surahNum}:`, error);
            continue;
          }
        }
      } else {
        // Fallback to API-based matching if local database not available
        console.log('⚠️ Tarteel database not loaded, falling back to API-based matching...');
        
        // Search common surahs first (most frequently recited)
        const commonSurahs = [1, 2, 112, 113, 114, 18, 36, 55, 67, 78, 87, 93, 108];
        const allSurahs = [...commonSurahs];
        for (let i = 1; i <= 114; i++) {
          if (!commonSurahs.includes(i)) {
            allSurahs.push(i);
          }
        }
        
        console.log('🔍 Searching through', allSurahs.length, 'surahs via API...');
        
        let requestCount = 0;
        const maxRequests = 50; // Limit to first 50 surahs to avoid rate limiting
        
        for (const surahNum of allSurahs) {
          // Stop if detection was cancelled (first match found)
          if (shouldStopDetectionRef.current) {
            console.log('🛑 Stopping search - first match found');
            break;
          }
          
          // Rate limiting: stop after max requests to avoid 429 errors
          if (requestCount >= maxRequests) {
            console.log('⚠️ Reached request limit, stopping search to avoid rate limiting');
            break;
          }
          
          try {
            // Small delay to avoid rate limiting (every 5th request)
            if (requestCount > 0 && requestCount % 5 === 0) {
              await new Promise(resolve => setTimeout(resolve, 100));
            }
            
            requestCount++;
            let response = await fetch(`https://api.alquran.cloud/v1/surah/${surahNum}/ar.asad`);
            
            // Handle rate limiting
            if (response.status === 429) {
              console.log('⚠️ Rate limited (429), waiting 2 seconds before retrying...');
              await new Promise(resolve => setTimeout(resolve, 2000));
              // Retry once
              response = await fetch(`https://api.alquran.cloud/v1/surah/${surahNum}/ar.asad`);
              if (response.status === 429) {
                console.log('❌ Still rate limited, stopping search');
                break;
              }
            }
            
            if (!response.ok) {
              console.log(`⚠️ API error for surah ${surahNum}:`, response.status);
              continue;
            }
            
            const surahData = await response.json();
            if (!surahData.data || !surahData.data.ayahs) {
              continue;
            }
            
            for (const ayah of surahData.data.ayahs) {
              // Normalize ayah text (Tarteel approach - use normalized 'text' field)
              // Remove diacritics and normalize whitespace for better matching
              const cleanAyah = (ayah.text || '')
                .replace(/[\u064B-\u065F\u0670]/g, '') // Remove diacritics
                .replace(/\r\n/g, ' ') // Normalize line breaks
                .replace(/\s+/g, ' ') // Normalize whitespace
                .trim();
              
              // Improved matching: check multiple ways for better accuracy
              let score = 0;
              
              // Improved matching algorithm - navigate on any match found
              // 1. Check if transcribed text is contained in verse (best match - exact substring)
              if (cleanAyah.includes(searchText)) {
                score = searchText.length * 5; // High score for exact substring match
                console.log(`✅ Exact substring match: Surah ${surahNum}, Verse ${ayah.numberInSurah}`);
              } 
              // 2. Check if verse contains a significant portion of transcribed text
              else if (searchText.length >= 10) {
                for (let len = Math.min(searchText.length, 50); len >= 10; len--) {
                  const substring = searchText.substring(0, len);
                  if (cleanAyah.includes(substring)) {
                    score = len * 4; // High score for significant substring match
                    console.log(`✅ Significant substring match (${len} chars): Surah ${surahNum}, Verse ${ayah.numberInSurah}`);
                    break;
                  }
                }
              }
              // 3. Check if verse starts with transcribed text
              if (score === 0 && cleanAyah.startsWith(searchText.substring(0, Math.min(15, searchText.length)))) {
                score = Math.min(15, searchText.length) * 3;
              }
              // 4. Check if transcribed text starts with verse
              else if (score === 0 && searchText.startsWith(cleanAyah.substring(0, Math.min(15, cleanAyah.length)))) {
                score = Math.min(15, cleanAyah.length) * 3;
              }
              // 5. Fuzzy matching - find longest substring match
              else if (score === 0) {
                const minLength = Math.min(searchText.length, cleanAyah.length, 30);
                
                // Find longest matching substring
                let longestMatch = 0;
                for (let len = Math.min(20, searchText.length); len >= 5; len--) {
                  const substring = searchText.substring(0, len);
                  if (cleanAyah.includes(substring)) {
                    longestMatch = len;
                    break;
                  }
                }
                
                // Character-by-character matching for first portion
                let charMatches = 0;
                for (let i = 0; i < minLength; i++) {
                  if (searchText[i] === cleanAyah[i]) {
                    charMatches++;
                  }
                }
                
                // Combine scores
                score = (longestMatch * 2) + charMatches;
              }
              
              // Only consider matches with meaningful scores
              // No minimum threshold - navigate on any match
              if (score > bestScore) {
                bestScore = score;
                bestMatch = {
                  surah: surahNum,
                  verse: ayah.numberInSurah,
                  ayah: ayah,
                  score: score
                };
                
                console.log(`📊 New best match: Surah ${surahNum}, Verse ${ayah.numberInSurah} (score: ${score})`);
                
                // If we have a very strong match (exact substring with high score), stop searching this surah
                if (score >= searchText.length * 4) {
                  console.log(`✅ Very strong match found! Stopping search in this surah.`);
                  break;
                }
              }
            }
            
            // If we found a very strong match, stop searching all surahs
            if (bestMatch && bestScore >= 10) {
              console.log('✅ Very strong match found, stopping search');
              break;
            }
          } catch (error) {
            console.log(`❌ Error fetching surah ${surahNum}:`, error);
            continue;
          }
        }
      }
      
      // Navigate on any match found (no confidence threshold)
      if (bestMatch && bestScore > 0) {
        console.log(`✅ Found match: Surah ${bestMatch.surah}, Verse ${bestMatch.verse} (score: ${bestScore})`);
        
        // Stop detection after first match
        shouldStopDetectionRef.current = true;
        
        const currentDetection = `${bestMatch.surah}-${bestMatch.verse}`;
        const isDuplicate = lastDetectedSurahVerse.current === currentDetection;
        
        // Always navigate if it's a new detection
        if (!isContinuous || !detectedSurah || detectedSurah !== bestMatch.surah || detectedVerse !== bestMatch.verse) {
          setDetectedSurah(bestMatch.surah);
          setDetectedVerse(bestMatch.verse);
          
          console.log(`🚀 Navigating to Surah ${bestMatch.surah}, Verse ${bestMatch.verse}`);
          
          // STOP RECORDING when navigation happens
          console.log('🛑 Stopping recording after match found...');
          try {
            if (currentRecordingRef.current) {
              await currentRecordingRef.current.stopAndUnloadAsync();
              currentRecordingRef.current = null;
              setMemorizationRecording(null);
            }
            setIsListening(false);
            isListeningRef.current = false;
            console.log('✅ Recording stopped');
          } catch (stopError) {
            console.log('⚠️ Error stopping recording:', stopError);
          }
          
          try {
            await loadSurah(bestMatch.surah, bestMatch.verse);
            console.log(`✅ Navigation complete to Surah ${bestMatch.surah}, Verse ${bestMatch.verse}`);
          } catch (navError) {
            console.log('❌ Error navigating:', navError);
          }
          
          // Always stop continuous detection after navigation
          await stopContinuousDetection();
        } else {
          console.log('ℹ️ Already detected this surah/verse, skipping navigation');
        }
      } else {
        console.log('❌ No match found. Best score:', bestScore);
      }
    } catch (error) {
      console.log('❌ Error detecting surah:', error);
    }
  };

  // Process audio chunk - runs transcription and detection separately
  const processAudioChunk = async (audioUri) => {
    if (!audioUri) {
      console.log('⚠️ No audio URI provided for chunk processing');
      return;
    }
    
    if (!openAIKey) {
      console.log('⚠️ No OpenAI API key - skipping transcription');
      return;
    }
    
    try {
      console.log('🔄 Processing audio chunk:', audioUri);
      
      // Process 1: Transcribe for Arabic display (shows immediately)
      // This is the Tarteel-like approach: continuous Whisper API transcription
      const transcribedText = await transcribeAudio(audioUri);
      
      // Process 2: Detect surah/verse from transcription (runs separately after transcription)
      if (transcribedText && transcribedText.length > 0) {
        console.log('📝 Got transcription, starting detection:', transcribedText.substring(0, 50) + '...');
        // Run detection in background (separate from transcription display)
        detectSurahFromTranscription(transcribedText, true).catch(err => {
          console.log('❌ Error in detection process:', err);
        });
      } else {
        console.log('⚠️ No transcription text to detect from (may be silence or too short)');
      }
    } catch (error) {
      console.log('❌ Error processing audio chunk:', error);
      // Don't block - continue listening even if one chunk fails
    }
  };

  // Legacy function - kept for compatibility but now uses separate processes
  const detectSurahFromAudio = async (audioUri, isContinuous = false) => {
    // This is now handled by processAudioChunk which uses separate processes
    // Keeping for backward compatibility
    return;
  };

  // Search for surah by matching transcribed text (uses same logic as detectSurahFromTranscription)
  // This is a legacy function - now just calls detectSurahFromTranscription
  const searchForSurahByText = async (transcribedText, isContinuous = false) => {
    // Use the same detection logic
    return await detectSurahFromTranscription(transcribedText, isContinuous);
  };

  // Word-by-word recitation states (always enabled)
  const wordByWordEnabled = true; // Always on
  const [currentPlayingWord, setCurrentPlayingWord] = useState(null);
  const [wordTimings, setWordTimings] = useState({});
  const [verseWords, setVerseWords] = useState({});

  // Audio session configuration for background playback
  useEffect(() => {
    const configureAudioSession = async () => {
      try {
        await Audio.setAudioModeAsync({
          allowsRecordingIOS: false,
          staysActiveInBackground: true,
          playsInSilentModeIOS: true,
          shouldDuckAndroid: true,
          playThroughEarpieceAndroid: false,
        });
      } catch (error) {
        console.log('Error configuring audio session:', error);
      }
    };
    
    configureAudioSession();
  }, []);

  // Track daily Quran visit for streak
  useEffect(() => {
    const trackQuranVisit = async () => {
      try {
        const result = await streakService.recordQuranVisit();
        console.log('🔥 QuranScreen: Streak tracking result:', result);
        
        // Optional: Show a small notification if streak increased
        if (result.updated && result.isNewDay && result.isConsecutive) {
          console.log(`🔥 QuranScreen: Streak increased to ${result.streak} days!`);
        }
      } catch (error) {
        console.error('🔥 QuranScreen: Error tracking visit:', error);
      }
    };
    
    trackQuranVisit();
  }, []); // Run once when component mounts
  
  // Cleanup audio when component unmounts or navigation changes
  useEffect(() => {
    const cleanup = () => {
      if (audio) {
        audio.stopAsync();
        audio.unloadAsync();
      }
      setIsPlaying(false);
      setCurrentPlayingVerse(null);
      setCurrentPlayingWord(null);
    };

    // This will run when the component unmounts
    return cleanup;
  }, [audio]);
  
  // Stop audio when navigating away from Quran screen
  useEffect(() => {
    const unsubscribe = navigation.addListener('beforeRemove', (e) => {
      if (isPlaying) {
        // Stop audio when leaving the screen
        if (audio) {
          audio.stopAsync();
          audio.unloadAsync();
        }
        setIsPlaying(false);
        setCurrentPlayingVerse(null);
        setCurrentPlayingWord(null);
      }
    });

    return unsubscribe;
  }, [navigation, isPlaying, audio]);
  
  // Handle app state changes for background audio
  useEffect(() => {
    const handleAppStateChange = (nextAppState) => {
      if (nextAppState === 'active' && isPlaying) {
        // App came to foreground, ensure audio is still playing
        if (audio) {
          audio.getStatusAsync().then(status => {
            if (!status.isPlaying) {
              audio.playAsync();
            }
          });
        }
      }
    };
    
    // Add app state listener
    const subscription = AppState.addEventListener('change', handleAppStateChange);
    
    return () => {
      subscription?.remove();
    };
  }, [isPlaying, audio]);
  
  // Sync play button state with actual audio state
  useEffect(() => {
    if (audio) {
      const checkAudioStatus = async () => {
        try {
          const status = await audio.getStatusAsync();
          if (status.isLoaded && status.isPlaying !== isPlaying) {
            console.log('🔄 Syncing audio state:', status.isPlaying, 'was:', isPlaying);
            setIsPlaying(status.isPlaying);
          }
        } catch (error) {
          console.log('Error checking audio status:', error);
        }
      };
      
      checkAudioStatus();
      
      // Set up periodic checking
      const interval = setInterval(checkAudioStatus, 500);
      
      return () => {
        clearInterval(interval);
      };
    }
  }, [audio, isPlaying]);
  
  // Animation timer for audio bars
  useEffect(() => {
    let animationId;
    if (isPlaying) {
      const animate = () => {
        setAnimationTime(prev => prev + 1);
        animationId = requestAnimationFrame(animate);
      };
      animationId = requestAnimationFrame(animate);
    }
    
    return () => {
      if (animationId) {
        cancelAnimationFrame(animationId);
      }
    };
  }, [isPlaying]);
  
  // Inline picker states
  const [showStartPicker, setShowStartPicker] = useState(false);
  const [showEndPicker, setShowEndPicker] = useState(false);
  const [currentPlayingVerse, setCurrentPlayingVerse] = useState(null);
  const [showReciterDropdown, setShowReciterDropdown] = useState(false);
  const [showSpeedDropdown, setShowSpeedDropdown] = useState(false);
  const [showTafsirDropdown, setShowTafsirDropdown] = useState(false);
  const [selectedTafsir, setSelectedTafsir] = useState(getTranslationEdition(currentLanguage));
  const [animationTime, setAnimationTime] = useState(0);
  const [tafsirOptions] = useState([
    { id: 'en.sahih', name: 'Sahih International' },
    { id: 'en.hilali', name: 'Hilali & Khan' },
    { id: 'en.pickthall', name: 'Pickthall' },
    { id: 'en.yusufali', name: 'Yusuf Ali' },
    { id: 'en.transliteration', name: 'Transliteration' },
    { id: 'es.garcia', name: 'García (Spanish)' },
    { id: 'fr.hamidullah', name: 'Hamidullah (French)' },
    { id: 'it.piccardo', name: 'Piccardo (Italian)' },
  ]);

  // Subscription modal state
  const [showSubscriptionModal, setShowSubscriptionModal] = useState(false);
  // Removed showRecordingSubscriptionModal - recording features moved to Hifdh Helper
  const [selectedVerseForSubscription, setSelectedVerseForSubscription] = useState(null);

  // Recording states
  const [isRecording, setIsRecording] = useState(false);
  const [recording, setRecording] = useState(null);

  const [recordingVerse, setRecordingVerse] = useState(null);
  const [recordingTime, setRecordingTime] = useState(0);
  const [userRecordings, setUserRecordings] = useState({});
  const [recordingSurah, setRecordingSurah] = useState(null);
  const [recordingVerseIndex, setRecordingVerseIndex] = useState(0);
  const [recordingVerses, setRecordingVerses] = useState([]);
  const [recordingUri, setRecordingUri] = useState(null);
  const [isPlayingPreview, setIsPlayingPreview] = useState(false);
  const [previewAudio, setPreviewAudio] = useState(null);
  const [showTransliteration, setShowTransliteration] = useState(false);
  const recordingTimer = useRef(null);

  // Update translation edition when language changes
  useEffect(() => {
    setSelectedTafsir(getTranslationEdition(currentLanguage));
  }, [currentLanguage]);

  // Handle navigation parameters
  useEffect(() => {
    if (route.params) {
      const { surah, ayah, scrollToVerse, highlightVerse } = route.params;
      
      if (highlightVerse) {
        // Handle highlighted verse from daily inspiration
        const { surahNumber, ayahNumber, surahName, surahNameArabic } = highlightVerse;
        
        // Wait for surahs to be loaded before proceeding
        const handleHighlightVerse = async () => {
          try {
            console.log(`handleHighlightVerse: Starting with surah ${surahNumber}, ayah ${ayahNumber}`);
            
            // Wait for surahs to be loaded
            if (surahs.length === 0) {
              console.log('Waiting for surahs to load before handling highlight...');
              await new Promise(resolve => {
                const checkSurahs = () => {
                  if (surahs.length > 0) {
                    resolve();
                  } else {
                    setTimeout(checkSurahs, 100);
                  }
                };
                checkSurahs();
              });
            }
            
            console.log(`handleHighlightVerse: Setting selectedSurah to ${surahNumber} (type: ${typeof surahNumber})`);
            setSelectedSurah(surahNumber);
            
            // Load the specific surah and scroll to the verse
            await loadSurah(surahNumber, ayahNumber);
            
            // Set highlighted verse after surah is loaded to avoid conflicts
            console.log(`handleHighlightVerse: Setting highlightedVerse to ${ayahNumber} after surah load (type: ${typeof ayahNumber})`);
            setHighlightedVerse(ayahNumber);
            
            // Keep the highlight for a longer time for daily verse navigation
            setTimeout(() => {
              console.log('Clearing highlight after 5 seconds');
              setHighlightedVerse(null);
            }, 5000);
            
            // Clear the route params to prevent re-triggering
            navigation.setParams({ highlightVerse: undefined });
          } catch (error) {
            console.error('Error handling highlight verse:', error);
          }
        };
        
        handleHighlightVerse();
      } else if (surah && ayah) {
        // Set the surah if different from current
        if (selectedSurah !== surah) {
          setSelectedSurah(typeof surah === 'object' ? surah.number : surah);
          // Set highlighted verse to scroll when surah loads
          setHighlightedVerse(ayah);
        } else {
          // Same surah, scroll immediately if verses are loaded
          if (filteredVerses.length > 0) {
            const index = filteredVerses.findIndex(verse => verse.numberInSurah === ayah);
            if (index !== -1 && flatListRef) {
              flatListRef.scrollToIndex({
                index,
                animated: true,
                viewPosition: 0.2, // Show verse at 20% from top
              });
            }
            setHighlightedVerse(ayah);
            // Clear highlight after 3 seconds
            setTimeout(() => setHighlightedVerse(null), 3000);
          }
        }
      }
    }
  }, [route.params, selectedSurah, surahs]);

  // Load favorite verses from storage
  useEffect(() => {
    loadFavoriteVerses();
  }, []);

  // Reload bookmarks when screen comes into focus
  useEffect(() => {
    const unsubscribe = navigation.addListener('focus', () => {
      loadFavoriteVerses();
    });

    return unsubscribe;
  }, [navigation]);

  // Animation timer for audio bars
  useEffect(() => {
    let interval;
    if (isPlaying) {
      interval = setInterval(() => {
        setAnimationTime(Date.now());
      }, 100);
    } else {
      setAnimationTime(0);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isPlaying]);

  const loadFavoriteVerses = async () => {
    try {
      const bookmarks = await bookmarkService.getBookmarks();
      setFavoriteVerses(bookmarks);
    } catch (error) {
      console.error('Error loading bookmarks:', error);
    }
  };

  const saveFavoriteVerses = async (favorites) => {
    // This function is kept for compatibility but bookmarks are saved individually
    setFavoriteVerses(favorites);
  };

  const toggleFavorite = async (verse) => {
    try {
      const verseId = `${selectedSurah}_${verse.numberInSurah}`;
      const isCurrentlyBookmarked = favoriteVerses.some(fav => fav.id === verseId);
      
      if (isCurrentlyBookmarked) {
        // Remove bookmark
        const success = await bookmarkService.removeBookmark(verseId);
        if (success) {
          setFavoriteVerses(favoriteVerses.filter(fav => fav.id !== verseId));
        }
      } else {
        // Add bookmark
        const currentSurah = surahs.find(s => s.number === selectedSurah);
        const bookmarkData = {
          surah: selectedSurah,
          ayah: verse.numberInSurah,
          surahName: getProperSurahName(selectedSurah, currentLanguage),
          text: verse.text,
          translation: verse.translation,
        };
        
        const success = await bookmarkService.saveBookmark(bookmarkData);
        if (success) {
          // Reload bookmarks to get the updated list
          await loadFavoriteVerses();
        }
      }
    } catch (error) {
      console.error('Error toggling bookmark:', error);
              Alert.alert(t('error', currentLanguage), t('failedToSaveBookmark', currentLanguage));
    }
  };

  const isFavorite = (verse) => {
    const verseId = `${selectedSurah}_${verse.numberInSurah}`;
    return favoriteVerses.some(fav => fav.id === verseId);
  };

  const navigateToFavoriteVerse = (favorite) => {
    setShowFavoritesModal(false);
    if (selectedSurah !== favorite.surah) {
      setSelectedSurah(favorite.surah);
      setHighlightedVerse(favorite.ayah);
    } else {
      // Same surah, scroll immediately
      scrollToVerse(favorite.ayah);
      setHighlightedVerse(favorite.ayah);
      // Clear highlight after 3 seconds
      setTimeout(() => setHighlightedVerse(null), 3000);
    }
  };

  // Global search functionality
  const performGlobalSearch = async (query) => {
    if (!query.trim()) {
      setSearchResults([]);
      return;
    }

    setSearchLoading(true);
    try {
      // Check if it's a verse reference (e.g., "3:12", "2:255")
      const referenceMatch = query.match(/^(\d+):(\d+)$/);
      if (referenceMatch) {
        const [, surahNum, ayahNum] = referenceMatch;
        const surahNumber = parseInt(surahNum);
        const ayahNumber = parseInt(ayahNum);
        
        if (surahNumber >= 1 && surahNumber <= 114) {
          try {
            const response = await fetch(`${ALQURAN_API_BASE}/ayah/${surahNumber}:${ayahNumber}/editions/ar,${selectedTafsir}`);
            const data = await response.json();
            
            if (data.data && data.data.length >= 2) {
              const arabicVerse = data.data[0];
              const translationVerse = data.data[1];
              const surahInfo = surahs.find(s => s.number === surahNumber);
              
              // Filter out verses that don't exist or have no content
              if (arabicVerse.text && arabicVerse.text.trim().length > 0 && 
                  arabicVerse.numberInSurah > 0) {
                setSearchResults([{
                  type: 'verse',
                  surahNumber: surahNumber,
                  surahName: surahInfo?.englishName || `Surah ${surahNumber}`,
                  surahNameArabic: surahInfo?.name || '',
                  numberInSurah: ayahNumber,
                  text: arabicVerse.text,
                  translation: translationVerse.text,
                  searchType: 'reference'
                }]);
              } else {
                setSearchResults([]);
              }
            } else {
              setSearchResults([]);
            }
          } catch (error) {
            console.error('Error fetching verse reference:', error);
            setSearchResults([]);
          }
        }
        setSearchLoading(false);
        return;
      }

      // Search through all surahs if it's not a reference
      const searchResults = [];
      
      // Search surahs by name
      const matchingSurahs = surahs.filter(surah =>
        surah.englishName.toLowerCase().includes(query.toLowerCase()) ||
        surah.englishNameTranslation.toLowerCase().includes(query.toLowerCase()) ||
        getProperSurahName(surah.number, currentLanguage).toLowerCase().includes(query.toLowerCase()) ||
        surah.name.includes(query) ||
        surah.number.toString() === query
      );

      // Add surah results
      matchingSurahs.forEach(surah => {
        searchResults.push({
        type: 'surah',
          surahNumber: surah.number,
        surahName: surah.englishName, // Use transliteration instead of translated name
          surahNameArabic: surah.name,
          englishNameTranslation: surah.englishNameTranslation,
          revelationType: surah.revelationType,
          numberOfAyahs: surah.numberOfAyahs,
          searchType: 'surah'
        });
      });

      // Search verses across all surahs (limit to first 50 results for performance)
      let verseCount = 0;
      for (const surah of surahs.slice(0, 20)) { // Search first 20 surahs to avoid too many API calls
        if (verseCount >= 30) break; // Limit total verse results
        
        try {
          const [arabicRes, transRes] = await Promise.all([
            fetch(`${ALQURAN_API_BASE}/surah/${surah.number}/ar`),
            fetch(`${ALQURAN_API_BASE}/surah/${surah.number}/${selectedTafsir}`)
          ]);
          
          const [arabicData, transData] = await Promise.all([
            arabicRes.json(),
            transRes.json()
          ]);
          
          const arabicAyahs = arabicData.data?.ayahs || [];
          const transAyahs = transData.data?.ayahs || [];
          
          arabicAyahs.forEach(ayah => {
            if (verseCount >= 30) return;
            
            const translation = transAyahs.find(t => t.numberInSurah === ayah.numberInSurah);
            const arabicText = ayah.text || '';
            const translationText = translation?.text || '';
            
            // Filter out verses that don't exist or have no content
            if (arabicText.trim().length > 0 && ayah.numberInSurah > 0 &&
                (arabicText.toLowerCase().includes(query.toLowerCase()) ||
                translationText.toLowerCase().includes(query.toLowerCase()))) {
              searchResults.push({
                type: 'verse',
                surahNumber: surah.number,
                surahName: surah.englishName || `Surah ${surah.number}`,
                surahNameArabic: surah.name,
                numberInSurah: ayah.numberInSurah,
                text: arabicText,
                translation: translationText,
                searchType: 'content'
              });
              verseCount++;
            }
          });
        } catch (error) {
          console.error(`Error searching surah ${surah.number}:`, error);
        }
      }

      setSearchResults(searchResults);
    } catch (error) {
      console.error('Error performing global search:', error);
      setSearchResults([]);
    }
    setSearchLoading(false);
  };

  const navigateToSearchResult = (result) => {
    setShowSearchModal(false);
    setGlobalSearchQuery('');
    setSearchResults([]);
    
    if (result.type === 'surah') {
      setSelectedSurah(result.surahNumber);
      setHighlightedVerse(null);
    } else if (result.type === 'verse') {
      if (selectedSurah !== result.surahNumber) {
        // If we need to change surah, set highlighted verse and it will scroll when surah loads
        setSelectedSurah(result.surahNumber);
        setHighlightedVerse(result.numberInSurah);
    } else {
        // Same surah, scroll immediately
        scrollToVerse(result.numberInSurah);
        setHighlightedVerse(result.numberInSurah);
        // Clear highlight after 3 seconds
        setTimeout(() => setHighlightedVerse(null), 3000);
      }
    }
  };

  const scrollToVerse = (verseNumber) => {
    if (flatListRef && verseNumber) {
      const index = filteredVerses.findIndex(verse => verse.numberInSurah === verseNumber);
      if (index !== -1) {
        flatListRef.scrollToIndex({
          index,
          animated: false, // Instant appearance instead of scrolling
          viewPosition: 0.2, // Show verse at 20% from top
        });
      }
    }
  };

  // Auto-scroll when highlighted verse changes and verses are loaded
  useEffect(() => {
    console.log(`Auto-scroll effect triggered: highlightedVerse=${highlightedVerse}, filteredVerses.length=${filteredVerses.length}, flatListRef=${!!flatListRef}`);
    
    if (highlightedVerse && filteredVerses.length > 0 && flatListRef) {
      const index = filteredVerses.findIndex(verse => Number(verse.numberInSurah) === Number(highlightedVerse));
      console.log(`Looking for verse ${highlightedVerse} in filteredVerses, found at index: ${index}`);
      
      if (index !== -1) {
        console.log(`Scrolling to verse ${highlightedVerse} at index ${index}`);
        
        // Multiple attempts with increasing delays to ensure proper scrolling
        const scrollAttempts = [
          () => {
            try {
              flatListRef.scrollToIndex({
                index,
                animated: false, // Instant appearance instead of scrolling
                viewPosition: 0.1, // Show verse closer to top
              });
              console.log(`Auto-scroll: Successfully scrolled to index ${index} on attempt 1`);
            } catch (error) {
              console.log('Auto-scroll attempt 1 failed:', error);
            }
          },
          () => {
            try {
              flatListRef.scrollToIndex({
                index,
                animated: false, // Instant appearance instead of scrolling
                viewPosition: 0.2, // Show verse at 20% from top
              });
              console.log(`Auto-scroll: Successfully scrolled to index ${index} on attempt 2`);
            } catch (error) {
              console.log('Auto-scroll attempt 2 failed:', error);
            }
          },
          () => {
            try {
              flatListRef.scrollToIndex({
                index,
                animated: false, // Instant appearance instead of scrolling
                viewPosition: 0.3, // Show verse at 30% from top
              });
              console.log(`Auto-scroll: Successfully scrolled to index ${index} on attempt 3`);
            } catch (error) {
              console.log('Auto-scroll attempt 3 failed:', error);
            }
          },
        ];

        // Execute scroll attempts with delays
        scrollAttempts.forEach((attempt, i) => {
          setTimeout(attempt, i * 200);
        });
      } else {
        console.log(`Auto-scroll: Verse ${highlightedVerse} not found in filteredVerses`);
      }
    }
  }, [highlightedVerse, filteredVerses, flatListRef]);

  // Auto-scroll to follow current playing verse
  useEffect(() => {
    if (currentPlayingVerse && filteredVerses.length > 0 && flatListRef && isPlaying) {
      const index = filteredVerses.findIndex(verse => verse.numberInSurah === currentPlayingVerse.numberInSurah);
      
      if (index !== -1) {
        console.log(`Auto-scrolling to playing verse ${currentPlayingVerse.numberInSurah} at index ${index}`);
        
        // Smooth scroll to the current playing verse
        try {
          flatListRef.scrollToIndex({
            index,
            animated: false, // Instant appearance instead of scrolling
            viewPosition: 0.2, // Show verse at 20% from top
          });
        } catch (error) {
          console.log('Auto-scroll to playing verse failed:', error);
        }
      }
    }
  }, [currentPlayingVerse, isPlaying, filteredVerses, flatListRef]);

  // Fetch surah list on mount
  useEffect(() => {
    setLoading(true);
    fetch(`${ALQURAN_API_BASE}/surah`)
      .then(res => res.json())
      .then(data => {
        setSurahs(data.data);
        setSelectedSurah(data.data[0]?.number || 1);
        setLoading(false);
      })
      .catch(() => {
        setError('Failed to load surah list');
        setLoading(false);
      });
  }, []);

  // Fetch both Arabic and translation when surah changes
  useEffect(() => {
    if (!selectedSurah) return;
    setLoading(true);
    setError(null);
    Promise.all([
      fetch(`${ALQURAN_API_BASE}/surah/${selectedSurah}/ar`).then(res => res.json()),
      fetch(`${ALQURAN_API_BASE}/surah/${selectedSurah}/${selectedTafsir}`).then(res => res.json())
    ])
      .then(([arabicRes, transRes]) => {
        const arabicAyahs = arabicRes.data?.ayahs || [];
        const transAyahs = transRes.data?.ayahs || [];
        // Merge by ayah number
        let merged = arabicAyahs.map(ayah => {
          const trans = transAyahs.find(t => t.numberInSurah === ayah.numberInSurah);
          return {
            ...ayah,
            translation: trans ? trans.text : '',
          };
        });
        // Custom first verse logic
        if (merged.length && FIRST_VERSE_MAP[selectedSurah]) {
          merged[0] = {
            ...merged[0],
            text: FIRST_VERSE_MAP[selectedSurah],
          };
        }
        setVerses(merged);
        setFilteredVerses(merged);
        setLoading(false);
      })
      .catch(() => {
        setError('Could not load verses for this surah.');
        setVerses([]);
        setFilteredVerses([]);
        setLoading(false);
      });
  }, [selectedSurah]);

  // Function to reset audio state when changing surahs
  const resetAudioState = async (preserveHighlight = false) => {
    console.log('🔄 DEBUG: Resetting audio state for surah change, preserveHighlight:', preserveHighlight);
    if (!preserveHighlight) {
      setHighlightedVerse(null);
    }
    setPlayingAyah(null);
    setCurrentPlayingVerse(null);
    setIsPlaying(false);
    setCurrentPlayingWord(null);

    // Stop any currently playing audio
    if (audio) {
      await audio.unloadAsync();
      setAudio(null);
    }
  };

  // Effect to reset audio state when selectedSurah changes
  useEffect(() => {
    if (selectedSurah) {
      console.log('🔄 DEBUG: selectedSurah changed to:', selectedSurah);
      // Don't clear highlight if we're in the middle of handling a highlight verse navigation
      const isHighlightNavigation = route.params?.highlightVerse;
      resetAudioState(!isHighlightNavigation);
    }
  }, [selectedSurah, route.params?.highlightVerse]);

  // Load specific surah and scroll to specific ayah
  const loadSurah = async (surahNumber, ayahNumber = null) => {
    try {
      setLoading(true);
      setError(null);
      
      // Wait for surahs to be loaded if they're not already
      if (surahs.length === 0) {
        console.log('Waiting for surahs to load...');
        await new Promise(resolve => {
          const checkSurahs = () => {
            if (surahs.length > 0) {
              resolve();
            } else {
              setTimeout(checkSurahs, 100);
            }
          };
          checkSurahs();
        });
      }
      
      // Find the surah in the surahs list
      const surah = surahs.find(s => s.number === surahNumber);
      if (!surah) {
        console.error('Surah not found in list:', surahNumber, 'Available surahs:', surahs.length);
        throw new Error(`Surah ${surahNumber} not found`);
      }
      
      // Reset audio state before changing surah, but preserve highlight if we're navigating to a specific verse
      await resetAudioState(ayahNumber !== null);
      
      setSelectedSurah(surahNumber);
      
      // Load the surah verses with better error handling and caching
      const [arabicRes, transRes] = await Promise.all([
        fetch(`${ALQURAN_API_BASE}/surah/${surahNumber}/ar`).then(res => {
          if (!res.ok) throw new Error(`Arabic API failed: ${res.status}`);
          return res.json();
        }),
        fetch(`${ALQURAN_API_BASE}/surah/${surahNumber}/${selectedTafsir}`).then(res => {
          if (!res.ok) throw new Error(`Translation API failed: ${res.status}`);
          return res.json();
        })
      ]);
      
      const arabicAyahs = arabicRes.data?.ayahs || [];
      const transAyahs = transRes.data?.ayahs || [];
      
      // Merge by ayah number with better error handling
      let merged = arabicAyahs.map(ayah => {
        const trans = transAyahs.find(t => t.numberInSurah === ayah.numberInSurah);
        return {
          ...ayah,
          translation: trans ? trans.text : '',
          // Add unique key for better FlatList performance
          key: `${surahNumber}-${ayah.numberInSurah}`,
        };
      });
      
      // Custom first verse logic
      if (merged.length && FIRST_VERSE_MAP[surahNumber]) {
        merged[0] = {
          ...merged[0],
          text: FIRST_VERSE_MAP[surahNumber],
        };
      }
      
      // Set verses in a single update to prevent re-renders
      setVerses(merged);
      setFilteredVerses(merged);
      setLoading(false);
      
      // Scroll to specific ayah if provided
      if (ayahNumber && flatListRef) {
        console.log(`loadSurah: Attempting to scroll to ayah ${ayahNumber}`);
        console.log(`loadSurah: Merged verses length: ${merged.length}`);
        console.log(`loadSurah: First few verses:`, merged.slice(0, 3).map(v => ({ numberInSurah: v.numberInSurah, type: typeof v.numberInSurah })));
        
        // Multiple attempts with increasing delays to ensure proper scrolling
        const scrollAttempts = [
          () => {
            const verseIndex = merged.findIndex(v => Number(v.numberInSurah) === Number(ayahNumber));
            console.log(`loadSurah: Scroll attempt 1 - looking for ayah ${ayahNumber}, found at index: ${verseIndex}`);
            if (verseIndex !== -1) {
              try {
                flatListRef.scrollToIndex({
                  index: verseIndex,
                  animated: false,
                  viewPosition: 0.2
                });
                console.log(`loadSurah: Successfully scrolled to index ${verseIndex}`);
              } catch (error) {
                console.log('loadSurah: scrollToIndex failed:', error);
              }
            }
          },
          () => {
            const verseIndex = merged.findIndex(v => Number(v.numberInSurah) === Number(ayahNumber));
            console.log(`loadSurah: Scroll attempt 2 - looking for ayah ${ayahNumber}, found at index: ${verseIndex}`);
            if (verseIndex !== -1) {
              try {
                flatListRef.scrollToIndex({
                  index: verseIndex,
                  animated: false,
                  viewPosition: 0.3
                });
                console.log(`loadSurah: Successfully scrolled to index ${verseIndex} on attempt 2`);
              } catch (error) {
                console.log('loadSurah: scrollToIndex failed on attempt 2:', error);
                // Fallback to scrollToOffset
                const estimatedOffset = verseIndex * 300;
                flatListRef.scrollToOffset({
                  offset: estimatedOffset,
                  animated: false
                });
              }
            }
          },
          () => {
            const verseIndex = merged.findIndex(v => Number(v.numberInSurah) === Number(ayahNumber));
            console.log(`loadSurah: Scroll attempt 3 - looking for ayah ${ayahNumber}, found at index: ${verseIndex}`);
            if (verseIndex !== -1) {
              try {
                flatListRef.scrollToIndex({
                  index: verseIndex,
                  animated: false,
                  viewPosition: 0.4
                });
                console.log(`loadSurah: Successfully scrolled to index ${verseIndex} on attempt 3`);
              } catch (error) {
                console.log('loadSurah: scrollToIndex failed on attempt 3:', error);
              }
            } else {
              console.log(`loadSurah: Verse ${ayahNumber} not found in merged verses after all attempts`);
            }
          }
        ];

        // Execute scroll attempts with delays
        scrollAttempts.forEach((attempt, i) => {
          setTimeout(attempt, (i + 1) * 500);
        });
      }
      
    } catch (error) {
      console.error('Error loading surah:', error);
      setError('Could not load verses for this surah.');
      setVerses([]);
      setFilteredVerses([]);
      setLoading(false);
    }
  };

  // Search filter
  const handleSearch = (text) => {
    setSearchQuery(text);
    if (!text.trim()) {
      setFilteredVerses(verses);
      return;
    }
    const filtered = verses.filter(v =>
      v.text.toLowerCase().includes(text.toLowerCase()) ||
      (v.translation || '').toLowerCase().includes(text.toLowerCase())
    );
    setFilteredVerses(filtered);
  };

  // Fetch all reciters from Quran.com
  useEffect(() => {
    fetch(QURAN_COM_RECITERS_API)
      .then(res => res.json())
      .then(data => {
        if (data.reciters && Array.isArray(data.reciters)) {
          // This useEffect is no longer needed as reciters are hardcoded
          // setReciters(
          //   data.reciters.map(r => ({
          //     id: r.id,
          //     name: r.name,
          //     identifier: r.identifier, // Use this for audio URL
          //     lastName: r.name.split(' ').slice(-1)[0],
          //   }))
          // );
        }
      })
      .catch(() => {});
  }, []);


  // Map our reciter IDs to Quran.com reciter IDs for audio with segments
  const getQuranComReciterIdForSegments = (ourReciterId) => {
    // These are the Quran.com reciter IDs that support segments
    const mapping = {
      '1': '1',   // Abdul Basit
      '2': '12',  // Abdullah Basfar  
      '3': '6',   // Abdurrahman as-Sudais
      '4': '9',   // Abu Bakr ash-Shaatree
      '5': '7',   // Mishary Alafasy
      '6': '3',   // Saad al-Ghamdi
      '7': '2',   // Hani ar-Rifai
      '8': '1',   // Mahmoud Khalil al-Hussary
      '10': '13', // Maher al-Mu'aiqly
    };
    return mapping[ourReciterId] || '7'; // Default to Mishary
  };

  // Fetch word timing data using Quran.com's segments API and adapt for single verse audio
  const fetchWordTimings = async (surahNumber, ayahNumber, reciterId) => {
    try {
      const verseKey = `${surahNumber}:${ayahNumber}`;
      const cacheKey = `${verseKey}-${reciterId}`;
      
      // Check if already cached
      if (wordTimings[cacheKey]) {
        console.log('✅ Using cached word timings for', verseKey);
        return wordTimings[cacheKey];
      }

      const quranComReciterId = getQuranComReciterIdForSegments(reciterId);
      console.log('🔍 Fetching word timings for', verseKey, 'with reciter', quranComReciterId);

      // Use Quran.com's chapter reciter audio endpoint with segments=true
      const url = `https://api.qurancdn.com/api/qdc/audio/reciters/${quranComReciterId}/audio_files?chapter=${surahNumber}&segments=true`;
      console.log('🔍 API URL:', url);
      
      const response = await fetch(url);
      
      if (!response.ok) {
        console.log('⚠️ Segments not available (status:', response.status, ')');
        return null;
      }

      const data = await response.json();
      
      if (data.audio_files && data.audio_files.length > 0) {
        const audioFile = data.audio_files[0];
        
        if (audioFile.verse_timings) {
          // Find the timing for our specific verse
          const verseTiming = audioFile.verse_timings.find(vt => vt.verse_key === verseKey);
          
          if (verseTiming && verseTiming.segments && verseTiming.segments.length > 0) {
            console.log('✅ Found', verseTiming.segments.length, 'word segments for', verseKey);
            
            // Get verse duration and word durations from the chapter audio timing
            const verseStartTime = verseTiming.timestamp_from;
            const verseDuration = verseTiming.duration;
            
            // Calculate proportional timings for individual verse audio
            // Since we're playing a single verse, scale the word timings proportionally
            const timings = verseTiming.segments.map(segment => {
              const wordStartInChapter = segment[1] - verseStartTime;
              const wordEndInChapter = segment[2] - verseStartTime;
              
              // Scale to match verse-only audio (might be slightly different duration)
              return {
                word_index: segment[0],
                timestamp_from: wordStartInChapter,
                timestamp_to: wordEndInChapter,
              };
            });
            
            console.log('✅ First 3 word timings:', timings.slice(0, 3));
            console.log('✅ Verse duration:', verseDuration, 'ms');
            
            // Cache the timing data
            setWordTimings(prev => ({
              ...prev,
              [cacheKey]: timings
            }));
            return timings;
          } else {
            console.log('⚠️ No segments found for verse', verseKey);
          }
        } else {
          console.log('⚠️ No verse_timings in audio file');
        }
      } else {
        console.log('⚠️ No audio files in response');
      }
      
      return null;
    } catch (error) {
      console.log('❌ Error fetching word timings:', error);
      return null;
    }
  };

  // Split Arabic text into words
  const splitArabicIntoWords = (text) => {
    if (!text) return [];
    // Split by spaces and filter out empty strings
    return text.split(/\s+/).filter(word => word.length > 0);
  };

  // Monitor audio playback position for word-by-word highlighting
  const monitorWordPosition = async (sound, ayah, timings) => {
    if (!sound || !timings || !wordByWordEnabled) {
      console.log('❌ Cannot monitor: sound?', !!sound, 'timings?', !!timings, 'enabled?', wordByWordEnabled);
      return;
    }

    // Get the surah number from ayah object (handle both structures)
    const surahNum = ayah.surah?.number || selectedSurah;
    const ayahNum = ayah.numberInSurah;
    
    const words = splitArabicIntoWords(ayah.text);
    
    console.log('🔍 Word-by-word: Setting up for surah', surahNum, 'ayah', ayahNum, 'with', words.length, 'words');
    console.log('🔍 First 3 timings:', timings.slice(0, 3));
    
    // Store words for this verse
    setVerseWords(prev => ({
      ...prev,
      [`${surahNum}-${ayahNum}`]: words
    }));

    let lastWordIndex = -1;
    const updateInterval = setInterval(async () => {
      try {
        const status = await sound.getStatusAsync();
        
        if (status.isLoaded && status.isPlaying) {
          const currentTime = status.positionMillis;
          
          // Find which word should be highlighted based on current time
          let currentWordIndex = -1;
          for (let i = 0; i < timings.length; i++) {
            const timing = timings[i];
            if (currentTime >= timing.timestamp_from && currentTime <= timing.timestamp_to) {
              currentWordIndex = i;
              break;
            }
          }
          
          // Only log when word changes to reduce spam
          if (currentWordIndex !== lastWordIndex && currentWordIndex !== -1) {
            console.log('🎯 Highlighting word', currentWordIndex, 'of', words.length, 'at', currentTime, 'ms');
            lastWordIndex = currentWordIndex;
          }
          
          setCurrentPlayingWord({
            verseKey: `${surahNum}-${ayahNum}`,
            wordIndex: currentWordIndex
          });
        } else if (status.didJustFinish) {
          // Clear word highlighting when verse finishes
          console.log('✅ Verse finished, clearing highlight');
          setCurrentPlayingWord(null);
          clearInterval(updateInterval);
        }
      } catch (error) {
        console.log('❌ Error monitoring word position:', error);
        clearInterval(updateInterval);
      }
    }, 100); // Check every 100ms

    console.log('✅ Word monitoring interval started');
    // Store interval reference for cleanup
    return updateInterval;
  };

  // Play a single ayah
  const playAudio = async (ayah) => {
    try {
      if (!ayah || !selectedReciter) return;
      
      // Handle user recordings
      if (selectedReciter === 'user') {
        const userRecording = userRecordings[`${selectedSurah}_${ayah.numberInSurah}`];
        if (userRecording) {
          // Use downloadURL if available, otherwise fall back to localUri
          const audioUri = userRecording.downloadURL || userRecording.localUri;
          
          if (!audioUri) {
            console.log('❌ No audio URI found for user recording');
            Alert.alert(t('noRecording', currentLanguage), t('noRecordingMessage', currentLanguage));
            return;
          }
          
          console.log('🎵 Playing user recording:', audioUri);
          
          if (audio) {
            await audio.unloadAsync();
            setAudio(null);
          }
          
          const { sound } = await Audio.Sound.createAsync({ uri: audioUri });
          setAudio(sound);
          setPlayingAyah(ayah.numberInSurah);
          setCurrentPlayingVerse(ayah);
          // Only highlight entire verse if word-by-word mode is disabled
          if (!wordByWordEnabled) {
            setHighlightedVerse(ayah.numberInSurah); // Add green indicator
          }
          setIsPlaying(true);
          
          await sound.setRateAsync(playbackSpeed, true);
          await sound.playAsync();
          
          sound.setOnPlaybackStatusUpdate((status) => {
            if (status.didJustFinish) {
              setPlayingAyah(null);
              setCurrentPlayingVerse(null);
              setHighlightedVerse(null); // Remove green indicator
              setIsPlaying(false);
              setCurrentPlayingWord(null);
            }
          });
          return;
        } else {
          console.log('❌ No user recording found for this verse');
          Alert.alert(t('noRecording', currentLanguage), t('noRecordingMessage', currentLanguage));
          return;
        }
      }
      
      // Handle regular reciters
      if (!ayah.number) return;
      const audioUrl = await getAyahAudioUrl(ayah.number, selectedReciter, userRecordings);
      if (!audioUrl) throw new Error('Audio URL not found');
      
      if (audio) {
        await audio.unloadAsync();
        setAudio(null);
      }
      
      setPlayingAyah(ayah.numberInSurah);
      setCurrentPlayingVerse(ayah);
      // Only highlight entire verse if word-by-word mode is disabled
      if (!wordByWordEnabled) {
        setHighlightedVerse(ayah.numberInSurah); // Add green indicator
      }
      setIsPlaying(true);
      
      const { sound } = await Audio.Sound.createAsync({ uri: audioUrl });
      setAudio(sound);
      await sound.setRateAsync(playbackSpeed, true);
      await sound.playAsync();
      
      // Fetch word timings if word-by-word mode is enabled
      let monitorInterval = null;
      if (wordByWordEnabled) {
        console.log('🔍 Fetching word timings for surah', selectedSurah, 'ayah', ayah.numberInSurah);
        const timings = await fetchWordTimings(selectedSurah, ayah.numberInSurah, selectedReciter);
        if (timings && timings.length > 0) {
          console.log('✅ Starting word position monitoring with', timings.length, 'timings');
          monitorInterval = await monitorWordPosition(sound, ayah, timings);
        } else {
          console.log('⚠️ No word timings available - words will display but not highlight');
          // Still split words for display even without timing data
          const words = splitArabicIntoWords(ayah.text);
          setVerseWords(prev => ({
            ...prev,
            [`${selectedSurah}-${ayah.numberInSurah}`]: words
          }));
        }
      }
      
      sound.setOnPlaybackStatusUpdate((status) => {
        if (status.didJustFinish) {
          setPlayingAyah(null);
          setCurrentPlayingVerse(null);
          setHighlightedVerse(null); // Remove green indicator
          setIsPlaying(false);
          setCurrentPlayingWord(null); // Clear word highlighting
          if (monitorInterval) clearInterval(monitorInterval);
        }
      });
    } catch (e) {
      setPlayingAyah(null);
      setCurrentPlayingVerse(null);
      setHighlightedVerse(null); // Remove green indicator on error
      setIsPlaying(false);
      setCurrentPlayingWord(null);
      Alert.alert(t('audioError', currentLanguage), t('couldNotPlayAudio', currentLanguage));
    }
  };

  // Enhanced audio playback functions
  const playAudioWithMode = async () => {
    if (!filteredVerses.length) {
      console.log('❌ No filtered verses available, returning');
      return;
    }

    let versesToPlay = [];
    
    switch (audioPlayMode) {
      case 'surah':
        versesToPlay = await prepareSurahVerses();
        break;
      case 'range':
        versesToPlay = await prepareRangeVerses();
        break;
      case 'custom':
        versesToPlay = selectedVerses;
        break;
      default:
        versesToPlay = await prepareSurahVerses();
    }

    if (versesToPlay.length === 0) {
      Alert.alert(t('error', currentLanguage), t('noVersesToPlay', currentLanguage));
      return;
    }

    await playVersesWithLoop(versesToPlay, rangeLoopCount);
  };



  // Play verse range (supports cross-surah with verse repetition)
  const playVerseRange = async () => {
    console.log('🔍 DEBUG: playVerseRange called');
    console.log('🔍 DEBUG: Range params - startSurah:', startSurah, 'endSurah:', endSurah, 'startVerse:', startVerse, 'endVerse:', endVerse);
    console.log('🔍 DEBUG: Current selectedSurah:', selectedSurah?.number);
    console.log('🔍 DEBUG: Selected reciter:', selectedReciter);
    console.log('🔍 DEBUG: Playback speed:', playbackSpeed);
    
    // Validate the range before proceeding
    if (!startSurah || !endSurah || !startVerse || !endVerse) {
      console.log('❌ DEBUG: Invalid range parameters');
      Alert.alert('Invalid Range', 'Please select both starting and ending points.');
      return;
    }

    // Check if starting surah is greater than ending surah
    if (startSurah > endSurah) {
      console.log('❌ DEBUG: Starting surah greater than ending surah');
      Alert.alert('Invalid Range', 'Starting surah cannot be greater than ending surah.');
      return;
    }

    // Check if starting verse is greater than ending verse in the same surah
    if (startSurah === endSurah && startVerse > endVerse) {
      console.log('❌ DEBUG: Starting verse greater than ending verse');
      Alert.alert('Invalid Range', 'Starting verse cannot be greater than ending verse in the same surah.');
      return;
    }

    // Check if ending verse exceeds the number of verses in the ending surah
    const endSurahData = surahs.find(s => s.number === endSurah);
    if (endSurahData && endVerse > endSurahData.numberOfAyahs) {
      console.log('❌ DEBUG: End verse exceeds surah length');
      Alert.alert('Invalid Range', `Surah ${endSurahData.englishName} only has ${endSurahData.numberOfAyahs} verses.`);
      return;
    }

    // Check if starting verse exceeds the number of verses in the starting surah
    const startSurahData = surahs.find(s => s.number === startSurah);
    if (startSurahData && startVerse > startSurahData.numberOfAyahs) {
      console.log('❌ DEBUG: Start verse exceeds surah length');
      Alert.alert('Invalid Range', `Surah ${startSurahData.englishName} only has ${startSurahData.numberOfAyahs} verses.`);
      return;
    }

    try {
      console.log('🔄 DEBUG: Starting range playback - navigating to first verse');
      
      // Close the playback modal first
      setShowAdvancedAudioModal(false);
      console.log('🔄 DEBUG: Modal closed');
      
      // Navigate to the starting surah and verse
      if (startSurah !== selectedSurah?.number) {
        console.log('🔄 DEBUG: Navigating to different surah:', startSurah);
        await loadSurah(startSurah, startVerse);
        console.log('🔄 DEBUG: loadSurah completed');
        
        // Wait longer for the surah to fully load and render
        setTimeout(() => {
          console.log('🔄 DEBUG: Setting selected verse after loadSurah');
          console.log('🔍 DEBUG: Current filteredVerses length:', filteredVerses.length);
          console.log('🔍 DEBUG: Available verses:', filteredVerses.map(v => v.numberInSurah));
          
          const firstVerse = filteredVerses.find(v => v.numberInSurah === startVerse);
          if (firstVerse) {
            setSelectedVerse(firstVerse);
            setHighlightedVerse(startVerse);
            console.log('🔄 DEBUG: Set selected verse to:', firstVerse.numberInSurah);
            
            // Also scroll to make sure it's visible
            if (flatListRef) {
              const verseIndex = filteredVerses.findIndex(v => v.numberInSurah === startVerse);
              if (verseIndex !== -1) {
                console.log('🔄 DEBUG: Scrolling to verse index:', verseIndex);
                flatListRef.scrollToIndex({
                  index: verseIndex,
                  animated: true,
                  viewPosition: 0.1
                });
              }
            }
          } else {
            console.log('❌ DEBUG: Verse not found after loadSurah, available verses:', filteredVerses.map(v => v.numberInSurah));
          }
        }, 2000); // Increased delay to ensure full loading
      } else {
        console.log('🔄 DEBUG: Same surah - navigating to verse:', startVerse);
        const firstVerse = filteredVerses.find(v => v.numberInSurah === startVerse);
        if (firstVerse) {
          setSelectedVerse(firstVerse);
          setHighlightedVerse(startVerse);
          console.log('🔄 DEBUG: Set selected verse to:', firstVerse.numberInSurah);
          
          // Scroll to the verse
          if (flatListRef) {
            const verseIndex = filteredVerses.findIndex(v => v.numberInSurah === startVerse);
            if (verseIndex !== -1) {
              console.log('🔄 DEBUG: Scrolling to verse index:', verseIndex);
              flatListRef.scrollToIndex({
                index: verseIndex,
                animated: true,
                viewPosition: 0.1
              });
            }
          }
        }
      }
      
      // Force a longer wait to ensure navigation is complete before starting playback
      await new Promise(resolve => setTimeout(resolve, 3000));
      
      // Add navigation for cross-surah ranges during playback
      if (startSurah !== endSurah) {
        console.log('🔄 DEBUG: Cross-surah range detected - will navigate during playback');
      }
      
      // Now fetch and prepare the verses for playback
      console.log('🔄 DEBUG: Fetching verses for playback');
      let allVerses = [];
      
      if (startSurah === endSurah) {
        console.log('🔄 DEBUG: Same surah range');
        // Same surah range
        const response = await fetch(`${ALQURAN_API_BASE}/surah/${startSurah}`);
        const data = await response.json();
        
        if (data.code === 200 && data.data.ayahs) {
          allVerses = data.data.ayahs.filter(verse => 
            verse.numberInSurah >= startVerse && verse.numberInSurah <= endVerse
          ).map(verse => ({
            ...verse,
            surah: { number: startSurah } // Ensure surah property exists
          }));
          console.log('🔄 DEBUG: Same surah - fetched', allVerses.length, 'verses');
        }
      } else {
        console.log('🔄 DEBUG: Cross-surah range from', startSurah, 'to', endSurah);
        // Cross-surah range
        for (let surahNum = startSurah; surahNum <= endSurah; surahNum++) {
          console.log('🔄 DEBUG: Fetching surah', surahNum);
          const response = await fetch(`${ALQURAN_API_BASE}/surah/${surahNum}`);
          const data = await response.json();
          
          if (data.code === 200 && data.data.ayahs) {
            const surahVerses = data.data.ayahs.filter(verse => {
              if (surahNum === startSurah) {
                return verse.numberInSurah >= startVerse;
              } else if (surahNum === endSurah) {
                return verse.numberInSurah <= endVerse;
              } else {
                return true; // Include all verses in between surahs
              }
            }).map(verse => ({
              ...verse,
              surah: { number: surahNum } // Ensure surah property exists
            }));
            
            console.log('🔄 DEBUG: Surah', surahNum, '- filtered', surahVerses.length, 'verses');
            
            // Add Bismillah at the beginning of each surah (except Surah 1 and 9)
            if (surahNum !== 1 && surahNum !== 9) {
              // Get the first verse of Fatiha for Bismillah
              const fatihaResponse = await fetch(`${ALQURAN_API_BASE}/surah/1`);
              const fatihaData = await fatihaResponse.json();
              const bismillahVerse = fatihaData.data?.ayahs?.[0]; // First verse of Fatiha
              
              if (bismillahVerse) {
                const bismillahAyah = {
                  ...bismillahVerse,
                  numberInSurah: 0, // Special index for Bismillah
                  surah: { number: surahNum }, // But mark it as belonging to the current surah
                  isBismillah: true // Flag to identify it as Bismillah
                };
                allVerses = [...allVerses, bismillahAyah];
                console.log('🔄 DEBUG: Added Bismillah from Fatiha for surah', surahNum);
              }
            }
            
            allVerses = [...allVerses, ...surahVerses];
          }
        }
      }
      
      console.log('🔄 DEBUG: Total verses prepared:', allVerses.length);
      
      if (allVerses.length === 0) {
        console.log('❌ DEBUG: No verses found in range');
        Alert.alert(t('error', currentLanguage), t('noVersesInRange', currentLanguage));
        return;
      }
      
      // Apply verse repetition within the range
      console.log('🔄 DEBUG: Applying verse repetition, verseLoopCount:', verseLoopCount);
      let versesWithRepetition = [];
      allVerses.forEach(verse => {
        if (verseLoopCount === -1) {
          // Infinite loop for each verse - repeat 10 times as a reasonable limit
          for (let i = 0; i < 10; i++) {
            versesWithRepetition.push(verse);
          }
        } else {
          // Repeat each verse the specified number of times
          for (let i = 0; i < verseLoopCount; i++) {
            versesWithRepetition.push(verse);
          }
        }
      });
      
      console.log('🔄 DEBUG: Final verses with repetition:', versesWithRepetition.length);
      console.log('🔄 DEBUG: First few verses:', versesWithRepetition.slice(0, 3).map(v => ({ surah: v.surah.number, verse: v.numberInSurah })));
      
      // Start playing after navigation is complete
      console.log('🔄 DEBUG: Starting playback immediately after navigation');
      console.log('🔄 DEBUG: Calling playVersesWithLoop');
      playVersesWithLoop(versesWithRepetition, rangeLoopCount);
      
    } catch (error) {
      console.error('❌ DEBUG: Error in playVerseRange:', error);
      Alert.alert(t('error', currentLanguage), 'Network error');
    }
  };

  const prepareSurahVerses = async () => {
    const surahNumber = typeof selectedSurah === 'number' ? selectedSurah : selectedSurah?.number;
    const shouldStartWithBismillah = surahNumber && surahNumber !== 1 && surahNumber !== 9;
    
    let versesToPlay = [...filteredVerses];
    
    if (shouldStartWithBismillah) {
      const bismillahAyah = {
        number: 1,
        numberInSurah: 0,
        text: BISMILLAH,
        surah: { number: surahNumber }
      };
      versesToPlay = [bismillahAyah, ...filteredVerses];
    }
    
    return versesToPlay;
  };

  const prepareRangeVerses = async () => {
    const rangeVerses = filteredVerses.filter(verse => 
      verse.numberInSurah >= startVerse && verse.numberInSurah <= endVerse
    );
    return rangeVerses;
  };

  const playVersesWithLoop = async (versesToPlay, loopCountToUse) => {
    console.log('🔍 DEBUG: playVersesWithLoop called');
    console.log('🔍 DEBUG: Total verses to play:', versesToPlay.length);
    console.log('🔍 DEBUG: Loop count:', loopCountToUse);
    console.log('🔍 DEBUG: Selected reciter:', selectedReciter);
    
    let currentLoop = 0;
    let currentIndex = 0;
    setIsPlaying(true);
    console.log('🔄 DEBUG: Set isPlaying to true');
    
    const playNextAyah = async () => {
      console.log('🔍 DEBUG: playNextAyah called - index:', currentIndex, 'total:', versesToPlay.length);
      
      if (currentIndex >= versesToPlay.length) {
        currentLoop++;
        if (loopCountToUse === -1 || currentLoop < loopCountToUse) {
          currentIndex = 0;
          console.log(`🔄 DEBUG: Starting loop ${currentLoop + 1}${loopCountToUse === -1 ? ' (infinite)' : `/${loopCountToUse}`}`);
          playNextAyah();
          return;
        } else {
          console.log('✅ DEBUG: Finished playing with loops');
          setIsPlaying(false);
          setPlayingAyah(null);
          setCurrentPlayingVerse(null);
          setHighlightedVerse(null); // Remove green indicator at the end
          return;
        }
      }
      
      const ayah = versesToPlay[currentIndex];
      
      // Safety check for ayah structure
      if (!ayah || !ayah.surah || !ayah.surah.number) {
        console.log('❌ DEBUG: Invalid ayah structure:', ayah);
        currentIndex++;
        playNextAyah();
        return;
      }
      
      console.log(`🎵 DEBUG: Playing ayah ${ayah.numberInSurah} from surah ${ayah.surah.number} (loop ${currentLoop + 1}/${loopCountToUse})`);
      
      // Update the UI to show which verse is playing (only if it changed)
      if (currentPlayingVerse !== ayah.numberInSurah) {
        setCurrentPlayingVerse(ayah.numberInSurah);
        setPlayingAyah(ayah.numberInSurah);
        console.log('🔄 DEBUG: Set playing verse to:', ayah.numberInSurah);
      }
      
      // Don't set the green highlight for the entire verse since word-by-word is always on
      // setHighlightedVerse(ayah.numberInSurah);
      
      // Check if we need to navigate to a new surah for cross-surah ranges
      if (ayah.surah.number !== selectedSurah?.number) {
        console.log(`🔄 DEBUG: Cross-surah detected - navigating to surah ${ayah.surah.number}`);
        
        // For cross-surah navigation, always go to verse 1 of the new surah
        const targetVerse = ayah.isBismillah ? 1 : ayah.numberInSurah;
        console.log(`🔄 DEBUG: Navigating to surah ${ayah.surah.number}, verse ${targetVerse}`);
        
        // Navigate to the new surah
        await loadSurah(ayah.surah.number, targetVerse);
        console.log('🔄 DEBUG: Cross-surah navigation completed');
        
        // Wait for the surah to load
        setTimeout(() => {
          // Play the verse
          if (ayah.isBismillah) {
            // This is a Bismillah verse - play the first verse of Fatiha
            console.log('🔄 DEBUG: Playing Bismillah for surah', ayah.surah.number);
            playBismillah(() => {
              currentIndex++;
              playNextAyah();
            });
          } else {
            console.log('🔄 DEBUG: Playing regular verse via playRangeAudio');
            playRangeAudio(ayah, () => {
              currentIndex++;
              playNextAyah();
            });
          }
        }, 1000);
      } else {
        // Same surah, just scroll and play
        if (flatListRef) {
          const verseIndex = filteredVerses.findIndex(v => v.numberInSurah === ayah.numberInSurah);
          if (verseIndex !== -1) {
            console.log('🔄 DEBUG: Scrolling to verse index:', verseIndex);
            flatListRef.scrollToIndex({
              index: verseIndex,
              animated: true,
              viewPosition: 0.1
            });
          }
        }
        
        // Play the verse
        if (ayah.isBismillah) {
          // This is a Bismillah verse - play the first verse of Fatiha
          console.log('🔄 DEBUG: Playing Bismillah for surah', ayah.surah.number);
          playBismillah(() => {
            currentIndex++;
            playNextAyah();
          });
        } else {
          console.log('🔄 DEBUG: Playing regular verse via playRangeAudio');
          playRangeAudio(ayah, () => {
            currentIndex++;
            playNextAyah();
          });
        }
      }
    };
    
    console.log('🔄 DEBUG: Starting playNextAyah');
    playNextAyah();
  };

  // Function to play Bismillah (first verse of Fatiha)
  const playBismillah = async (onComplete) => {
    console.log('🔍 DEBUG: playBismillah called');
    
    try {
      if (!selectedReciter) {
        console.log('❌ DEBUG: No reciter selected for Bismillah');
        onComplete && onComplete();
        return;
      }
      
      // Get the first verse of Fatiha (ayah 1)
      const audioUrl = await getAyahAudioUrl(1, selectedReciter, userRecordings);
      if (!audioUrl) {
        console.log('❌ DEBUG: No audio URL found for Bismillah');
        onComplete && onComplete();
        return;
      }
      
      console.log('🎵 DEBUG: Playing Bismillah audio:', audioUrl);
      
      if (audio) {
        await audio.unloadAsync();
      }
      
      const { sound } = await Audio.Sound.createAsync({ uri: audioUrl });
      setAudio(sound);
      await sound.setRateAsync(playbackSpeed, true);
      await sound.playAsync();
      
      sound.setOnPlaybackStatusUpdate((status) => {
        if (status.didJustFinish) {
          onComplete && onComplete();
        }
      });
    } catch (e) {
      console.error('❌ DEBUG: Error playing Bismillah:', e);
      onComplete && onComplete();
    }
  };

  // Custom audio function for range playback
  const playRangeAudio = async (ayah, onComplete) => {
    console.log('🔍 DEBUG: playRangeAudio called');
    console.log('🔍 DEBUG: Ayah:', ayah?.numberInSurah, 'from surah:', ayah?.surah?.number);
    console.log('🔍 DEBUG: Selected reciter:', selectedReciter);
    console.log('🔍 DEBUG: Playback speed:', playbackSpeed);
    
    try {
      if (!ayah || !selectedReciter) {
        console.log('❌ DEBUG: Missing ayah or reciter');
        onComplete && onComplete();
        return;
      }
      
      // Handle user recordings
      if (selectedReciter === 'user') {
        console.log('🔍 DEBUG: Using user recording');
        const userRecording = userRecordings[`${ayah.surah.number}_${ayah.numberInSurah}`];
        if (userRecording) {
          const audioUri = userRecording.downloadURL || userRecording.localUri;
          
          if (!audioUri) {
            console.log('❌ DEBUG: No audio URI found for user recording');
            onComplete && onComplete();
            return;
          }
          
          console.log('🎵 DEBUG: Playing user recording for range:', audioUri);
          
          if (audio) {
            await audio.unloadAsync();
          }
          
          const { sound } = await Audio.Sound.createAsync({ uri: audioUri });
          setAudio(sound);
          await sound.setRateAsync(playbackSpeed, true);
          await sound.playAsync();

          // Note: User recordings don't have word timing data, so word-by-word won't work for them
          
          sound.setOnPlaybackStatusUpdate((status) => {
            if (status.didJustFinish) {
              console.log('🔄 DEBUG: User recording finished');
              setCurrentPlayingWord(null);
              onComplete && onComplete();
            }
          });
          return;
        } else {
          console.log('❌ DEBUG: No user recording found for this verse');
          onComplete && onComplete();
          return;
        }
      }
      
      // Handle regular reciters
      console.log('🔍 DEBUG: Using regular reciter');
      
      // For Bismillah, use the first verse of Fatiha (ayah 1)
      let ayahNumber = ayah.number;
      if (ayah.isBismillah) {
        ayahNumber = 1; // First verse of Fatiha
        console.log('🔍 DEBUG: Bismillah detected, using ayah 1 from Fatiha');
      }
      
      if (!ayahNumber) {
        console.log('❌ DEBUG: No ayah number');
        onComplete && onComplete();
        return;
      }
      
      console.log('🔍 DEBUG: Getting audio URL for ayah:', ayahNumber, 'reciter:', selectedReciter);
      const audioUrl = await getAyahAudioUrl(ayahNumber, selectedReciter, userRecordings);
      if (!audioUrl) {
        console.log('❌ DEBUG: Audio URL not found');
        onComplete && onComplete();
        return;
      }
      
      console.log('🎵 DEBUG: Playing range audio:', audioUrl);
      
      if (audio) {
        console.log('🔄 DEBUG: Unloading previous audio');
        await audio.unloadAsync();
      }
      
      console.log('🔄 DEBUG: Creating new audio sound');
      const { sound } = await Audio.Sound.createAsync({ uri: audioUrl });
      setAudio(sound);
      
      console.log('🔄 DEBUG: Setting playback speed:', playbackSpeed);
      await sound.setRateAsync(playbackSpeed, true);
      
      console.log('🔄 DEBUG: Starting playback');
      await sound.playAsync();
      
      // Fetch word timings for word-by-word highlighting
      let monitorInterval = null;
      if (wordByWordEnabled) {
        console.log('🔍 [Range] Fetching word timings for surah', ayah.surah.number, 'ayah', ayah.numberInSurah);
        const timings = await fetchWordTimings(ayah.surah.number, ayah.numberInSurah, selectedReciter);
        if (timings && timings.length > 0) {
          console.log('✅ [Range] Starting word position monitoring with', timings.length, 'timings');
          monitorInterval = await monitorWordPosition(sound, ayah, timings);
        } else {
          console.log('⚠️ [Range] No word timings available - words will display but not highlight');
          // Still split words for display even without timing data
          const words = splitArabicIntoWords(ayah.text);
          setVerseWords(prev => ({
            ...prev,
            [`${ayah.surah.number}-${ayah.numberInSurah}`]: words
          }));
        }
      }
      
      sound.setOnPlaybackStatusUpdate((status) => {
        if (status.didJustFinish) {
          if (monitorInterval) clearInterval(monitorInterval);
          setCurrentPlayingWord(null);
          onComplete && onComplete();
        }
      });
    } catch (e) {
      console.error('❌ DEBUG: Error playing range audio:', e);
      onComplete && onComplete();
    }
  };

  // Play entire surah
  const playEntireSurah = async () => {
    console.log('🎵 playEntireSurah called, filteredVerses length:', filteredVerses.length);
    if (!filteredVerses.length) {
      console.log('❌ No filtered verses available, returning');
      return;
    }
    
    console.log('🎵 Starting playEntireSurah for surah:', selectedSurah?.number);
    console.log('🎵 SelectedSurah object:', selectedSurah);
    
    // Create a list that starts with Bismillah (ayah 1) followed by the surah verses
    // Skip Surah 1 (Al-Fatiha) and Surah 9 (At-Tawbah) as they don't start with Bismillah
    // Handle case where selectedSurah might be a number or an object
    const surahNumber = typeof selectedSurah === 'number' ? selectedSurah : selectedSurah?.number;
    const shouldStartWithBismillah = surahNumber && surahNumber !== 1 && surahNumber !== 9;
    
    console.log('📋 Should start with Bismillah:', shouldStartWithBismillah);
    
    let versesToPlay = [...filteredVerses];
    console.log('📋 Original filteredVerses length:', filteredVerses.length);
    console.log('📋 First few verses:', filteredVerses.slice(0, 3));
    
    if (shouldStartWithBismillah) {
      // Add Bismillah (ayah 1) at the beginning
      const bismillahAyah = {
        number: 1, // Bismillah is always ayah 1
        numberInSurah: 0, // Special index for Bismillah
        text: BISMILLAH,
        surah: { number: surahNumber }
      };
      versesToPlay = [bismillahAyah, ...filteredVerses];
      console.log('🕌 Added Bismillah to versesToPlay, total verses:', versesToPlay.length);
      console.log('🕌 Bismillah ayah object:', bismillahAyah);
    }
    
    let currentIndex = 0;
    setIsPlaying(true);
    
    const playNextAyah = async () => {
      if (currentIndex >= versesToPlay.length) {
        console.log('✅ Finished playing entire surah');
        setIsPlaying(false);
        setPlayingAyah(null);
        setCurrentPlayingVerse(null);
        return;
      }
      
      const ayah = versesToPlay[currentIndex];
      console.log('🎵 Playing ayah:', ayah.numberInSurah === 0 ? 'Bismillah' : ayah.numberInSurah);
      
      // For Bismillah, use ayah 1 from Al-Fatiha (which is always the Bismillah)
      // Ayah 1 in the Quran is always the Bismillah from Al-Fatiha
      const ayahNumber = ayah.numberInSurah === 0 ? 1 : ayah.number;
      console.log('🔊 Getting audio for ayah number:', ayahNumber);
      
      try {
        // Handle user recordings
        if (selectedReciter === 'user') {
          const userRecording = userRecordings[`${selectedSurah}_${ayah.numberInSurah}`];
          if (userRecording) {
            // Use downloadURL if available, otherwise fall back to localUri
            const audioUri = userRecording.downloadURL || userRecording.localUri;
            
            if (!audioUri) {
              console.log('⚠️ No audio URI found for user recording, skipping to next');
              currentIndex++;
              playNextAyah();
              return;
            }
            
            console.log('🎵 Playing user recording for ayah:', ayah.numberInSurah);
            
            if (audio) {
              await audio.unloadAsync();
              setAudio(null);
            }
            
            setPlayingAyah(ayah.numberInSurah === 0 ? 'Bismillah' : ayah.numberInSurah);
            setCurrentPlayingVerse(ayah);
            setHighlightedVerse(ayah.numberInSurah); // Add green indicator
            
            const { sound } = await Audio.Sound.createAsync({ uri: audioUri });
            setAudio(sound);
            await sound.setRateAsync(playbackSpeed, true);
            await sound.playAsync();
            
            sound.setOnPlaybackStatusUpdate((status) => {
              if (status.didJustFinish) {
                console.log('🎵 User recording finished, moving to next ayah');
                currentIndex++;
                playNextAyah();
              }
            });
            return;
          } else {
            console.log('⚠️ No user recording found for ayah:', ayah.numberInSurah, 'skipping to next');
            currentIndex++;
            playNextAyah();
            return;
          }
        }
        
        // Handle regular reciters
        const audioUrl = await getAyahAudioUrl(ayahNumber, selectedReciter, userRecordings);
        console.log('🎵 Audio URL:', audioUrl);
        
        if (!audioUrl) {
          console.log('⚠️ No audio URL found, skipping to next ayah');
          currentIndex++;
          playNextAyah();
          return;
        }
        
        if (audio) {
          await audio.unloadAsync();
          setAudio(null);
        }
        
        // For Bismillah, show as "Bismillah" instead of ayah number
        setPlayingAyah(ayah.numberInSurah === 0 ? 'Bismillah' : ayah.numberInSurah);
        setCurrentPlayingVerse(ayah);
        setHighlightedVerse(ayah.numberInSurah); // Add green indicator
        
        console.log('🎵 Creating audio sound with URL:', audioUrl);
        const { sound } = await Audio.Sound.createAsync({ uri: audioUrl });
        setAudio(sound);
        console.log('🎵 Setting playback speed to:', playbackSpeed);
        await sound.setRateAsync(playbackSpeed, true);
        console.log('🎵 Starting playback...');
        await sound.playAsync();
        console.log('🎵 Playback started successfully');
        
        sound.setOnPlaybackStatusUpdate((status) => {
          if (status.didJustFinish) {
            console.log('🎵 Ayah finished, moving to next');
            currentIndex++;
            playNextAyah();
          }
        });
      } catch (error) {
        console.error('❌ Error playing ayah:', error);
        currentIndex++;
        playNextAyah();
      }
    };
    
    playNextAyah();
  };

  // Skip to next/previous ayah
  const skipVerse = async (direction) => {
    if (!currentPlayingVerse) return;
    const currentIndex = filteredVerses.findIndex(v => v.numberInSurah === currentPlayingVerse.numberInSurah);
    if (currentIndex === -1) return;
    const nextIndex = direction === 'next' ? currentIndex + 1 : currentIndex - 1;
    if (nextIndex >= 0 && nextIndex < filteredVerses.length) {
      await playAudio(filteredVerses[nextIndex]);
    } else {
      stopAudio();
    }
  };

  // Stop audio
  const stopAudio = async () => {
    if (audio) {
      await audio.unloadAsync();
      setAudio(null);
    }
    setPlayingAyah(null);
    setCurrentPlayingVerse(null);
    setIsPlaying(false);
    setCurrentPlayingWord(null);
  };

  // Update playback speed for currently playing audio
  const updatePlaybackSpeed = async (newSpeed) => {
    setPlaybackSpeed(newSpeed);
    if (audio && isPlaying) {
      try {
        await audio.setRateAsync(newSpeed, true);
      } catch (error) {
        console.error('Error updating playback speed:', error);
      }
    }
  };

  const cyclePlaybackSpeed = async () => {
    const speeds = [0.5, 0.75, 1.0, 1.25, 1.5, 1.75, 2.0];
    const currentIndex = speeds.indexOf(playbackSpeed);
    const nextIndex = (currentIndex + 1) % speeds.length;
    await updatePlaybackSpeed(speeds[nextIndex]);
  };

  // New: Fetch tafsir directly when opening modal
  const openTafsirModal = async (verse) => {
    console.log('🎯 openTafsirModal called for verse:', verse.numberInSurah);
    
    try {
      // Reset cache to ensure fresh check
      subscriptionGuard.resetCache();
      // Force a fresh subscription check by bypassing cache
      const isSubscribed = await subscriptionGuard.forceCheckSubscriptionStatus();
      
      if (isSubscribed) {
        setSelectedVerse(verse);
        setShowTafsirModal(true);
        setTafsir(null);
        setTafsirError(null);
        setTafsirLoading(true);
        
        // Check if tafsir is available in user's language
        const isEnglish = currentLanguage === 'english';
        let tafsirContent = '';
        let languageSupportMessage = '';
        
        if (!isEnglish) {
          // Show language support message for non-English users
          const languageName = t('language', currentLanguage);
          languageSupportMessage = t('tafsirNotAvailableInLanguage', currentLanguage).replace('{language}', languageName);
        }
        
        try {
          const url = `https://quranapi.pages.dev/api/tafsir/${selectedSurah}_${verse.numberInSurah}.json`;
          const res = await fetch(url);
          const data = await res.json();
          
          if (data && data.tafsirs && data.tafsirs.length > 0) {
            // Combine all tafsirs from different authors
            const allTafsirs = data.tafsirs.map(tafsir => {
              const author = tafsir.author || 'Unknown';
              const content = tafsir.content || '';
              return `## ${author}\n\n${content}`;
            }).join('\n\n---\n\n');
            
            // Add language support message at the top if needed
            if (languageSupportMessage) {
              tafsirContent = `> **${languageSupportMessage}**\n\n---\n\n${allTafsirs}`;
            } else {
              tafsirContent = allTafsirs;
            }
            
            setTafsir(tafsirContent);
          } else {
            setTafsirError(t('tafsirNotAvailable', currentLanguage));
          }
        } catch (e) {
          console.error('Error fetching tafsir:', e);
          setTafsirError(t('tafsirError', currentLanguage));
        } finally {
          setTafsirLoading(false);
        }
      } else {
        console.log('❌ Tafsir: User not subscribed, showing subscription modal');
        setSelectedVerseForSubscription(verse);
        setShowSubscriptionModal(true);
      }
    } catch (error) {
      console.error('❌ Error checking subscription for tafsir:', error);
      // On error, re-check subscription before showing modal
      try {
        subscriptionGuard.resetCache();
        const isSubscribed = await subscriptionGuard.forceCheckSubscriptionStatus();
        if (!isSubscribed) {
          console.log('🔄 Re-check confirmed: User not subscribed, showing subscription modal');
          setSelectedVerseForSubscription(verse);
          setShowSubscriptionModal(true);
        } else {
          console.log('✅ Re-check confirmed: User is subscribed, opening tafsir modal');
          // User is subscribed, open tafsir modal
          setSelectedVerse(verse);
          setShowTafsirModal(true);
          setTafsir(null);
          setTafsirError(null);
          setTafsirLoading(true);
          
          // Fetch tafsir
          try {
            const isEnglish = currentLanguage === 'english';
            let tafsirContent = '';
            let languageSupportMessage = '';
            
            if (!isEnglish) {
              const languageName = t('language', currentLanguage);
              languageSupportMessage = t('tafsirNotAvailableInLanguage', currentLanguage).replace('{language}', languageName);
            }
            
            const url = `https://quranapi.pages.dev/api/tafsir/${selectedSurah}_${verse.numberInSurah}.json`;
            const res = await fetch(url);
            const data = await res.json();
            
            if (data && data.tafsirs && data.tafsirs.length > 0) {
              const allTafsirs = data.tafsirs.map(tafsir => {
                const author = tafsir.author || 'Unknown';
                const content = tafsir.content || '';
                return `## ${author}\n\n${content}`;
              }).join('\n\n---\n\n');
              
              if (languageSupportMessage) {
                tafsirContent = `> **${languageSupportMessage}**\n\n---\n\n${allTafsirs}`;
              } else {
                tafsirContent = allTafsirs;
              }
              
              setTafsir(tafsirContent);
            } else {
              setTafsirError(t('tafsirNotAvailable', currentLanguage));
            }
          } catch (e) {
            console.error('Error fetching tafsir:', e);
            setTafsirError(t('tafsirError', currentLanguage));
          } finally {
            setTafsirLoading(false);
          }
        }
      } catch (recheckError) {
        console.error('❌ Error in re-check:', recheckError);
        // Only show modal if we can't verify subscription
        setSelectedVerseForSubscription(verse);
        setShowSubscriptionModal(true);
      }
    }
  };

  // Handle subscription success for tafsir
  const handleSubscriptionSuccess = () => {
    console.log('🎉 handleSubscriptionSuccess called');
    console.log('📱 Closing subscription modal');
    setShowSubscriptionModal(false);
    
    if (selectedVerseForSubscription) {
      console.log('🧭 Opening tafsir modal after successful subscription');
      // Open the tafsir modal for the verse that was originally requested
      const verse = selectedVerseForSubscription;
      setSelectedVerse(verse);
      setShowTafsirModal(true);
      setTafsir(null);
      setTafsirError(null);
      setTafsirLoading(true);
      
      // Fetch the tafsir
      const fetchTafsir = async () => {
        try {
          // Check if tafsir is available in user's language
          const isEnglish = currentLanguage === 'english';
          let tafsirContent = '';
          let languageSupportMessage = '';
          
          if (!isEnglish) {
            // Show language support message for non-English users
            const languageName = t('language', currentLanguage);
            languageSupportMessage = t('tafsirNotAvailableInLanguage', currentLanguage).replace('{language}', languageName);
          }
          
          const url = `https://quranapi.pages.dev/api/tafsir/${selectedSurah}_${verse.numberInSurah}.json`;
          const res = await fetch(url);
          const data = await res.json();
          
          if (data && data.tafsirs && data.tafsirs.length > 0) {
            // Combine all tafsirs from different authors
            const allTafsirs = data.tafsirs.map(tafsir => {
              const author = tafsir.author || 'Unknown';
              const content = tafsir.content || '';
              return `## ${author}\n\n${content}`;
            }).join('\n\n---\n\n');
            
            // Add language support message at the top if needed
            if (languageSupportMessage) {
              tafsirContent = `> **${languageSupportMessage}**\n\n---\n\n${allTafsirs}`;
            } else {
              tafsirContent = allTafsirs;
            }
            
            setTafsir(tafsirContent);
          } else {
            setTafsirError(t('tafsirNotAvailable', currentLanguage));
          }
        } catch (e) {
          console.error('Error fetching tafsir:', e);
          setTafsirError(t('tafsirError', currentLanguage));
        } finally {
          setTafsirLoading(false);
        }
      };
      
      fetchTafsir();
      setSelectedVerseForSubscription(null);
    }
  };

  // Cleanup audio on unmount
  useEffect(() => {
    return () => {
      if (audio) audio.unloadAsync();
    };
  }, [audio]);

  // Render verse card with dark theme - optimized for performance
  const renderVerseCard = ({ item }) => {
    const isHighlighted = Number(highlightedVerse) === Number(item.numberInSurah);
    
    // Debug logging for highlighting
    if (highlightedVerse && Number(highlightedVerse) === Number(item.numberInSurah)) {
      console.log(`🎯 Verse ${item.numberInSurah} is highlighted!`);
    }
    const isFirstAyah = item.numberInSurah === 1;
    const showBismillah = isFirstAyah && selectedSurah !== 9 && selectedSurah !== 1;
    const isFavoriteVerse = isFavorite(item);
    const isPlaying = playingAyah === item.numberInSurah;
    
    // Add Bismillah at the top of every surah (except 9 and 1)
    const shouldShowBismillah = isFirstAyah && selectedSurah !== 9 && selectedSurah !== 1;
    
    return (
      <>
        {/* Bismillah at the top of every surah */}
        {shouldShowBismillah && (
          <View style={{
            marginHorizontal: 16,
            marginVertical: 20,
            paddingVertical: 20,
            paddingHorizontal: 16,
            borderBottomWidth: 1,
            borderBottomColor: 'rgba(255, 255, 255, 0.1)',
          }}>
            <Text style={{
              fontSize: 24,
              lineHeight: 40,
              textAlign: 'center',
              color: '#FFFFFF',
              fontFamily: Platform.OS === 'ios' ? 'Arial' : 'Roboto',
            }}>
              {BISMILLAH}
            </Text>
          </View>
        )}
        
        <View style={{
          marginHorizontal: 16,
          paddingVertical: 20,
          paddingHorizontal: 16,
          backgroundColor: isHighlighted ? 'rgba(15, 81, 50, 0.3)' : 'transparent',
          borderBottomWidth: 1,
          borderBottomColor: 'rgba(255, 255, 255, 0.1)',
        }}>
          <TouchableOpacity
            activeOpacity={0.7}
            onPress={() => openTafsirModal(item)}
          >
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <View style={{
                backgroundColor: isHighlighted ? '#20C997' : 'rgba(42, 42, 42, 0.6)',
                borderRadius: 20,
                paddingHorizontal: 12,
                paddingVertical: 6,
              }}>
                <Text style={{ color: '#fff', fontWeight: 'bold', fontSize: 14 }}>
                  {selectedSurah}:{item.numberInSurah}
                </Text>
              </View>
              <TouchableOpacity 
                onPress={() => toggleFavorite(item)}
                style={{ 
                  padding: 8,
                }}
              >
                <Ionicons 
                  name={isFavoriteVerse ? 'bookmark' : 'bookmark-outline'} 
                  size={20} 
                  color={isFavoriteVerse ? '#20C997' : '#fff'}
                />
              </TouchableOpacity>
            </View>
            

            
            {/* Render Arabic text */}
            <Text style={{ 
              fontSize: 24, 
              lineHeight: 40, 
              textAlign: 'right', 
              color: '#FFFFFF',
              fontFamily: Platform.OS === 'ios' ? 'Arial' : 'Roboto',
              marginBottom: 16,
            }}>
              {isFirstAyah && FIRST_VERSE_MAP[selectedSurah] ? FIRST_VERSE_MAP[selectedSurah] : item.text}
            </Text>
            
            <Text style={[
              { 
                color: '#B0B0B0', 
                marginBottom: 16,
              },
              getResponsiveTextStyle(item.translation, 16, currentLanguage, Dimensions.get('window').width - 80)
            ]}>
              {item.translation}
            </Text>
            
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
              <TouchableOpacity 
                onPress={() => playAudio(item)} 
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  backgroundColor: isHighlighted ? '#20C997' : 'rgba(42, 42, 42, 0.6)',
                  borderRadius: 12,
                  paddingHorizontal: 16,
                  paddingVertical: 8,
                }}
              >
                <Ionicons 
                  name={isPlaying ? 'pause' : 'play'} 
                  size={16} 
                  color="#fff" 
                  style={{ marginRight: 8 }}
                />
                <Text style={{ color: '#fff', fontWeight: '600' }}>
                  {isPlaying ? t('playing', currentLanguage) : t('listen', currentLanguage)}
                </Text>
              </TouchableOpacity>
              
              <Text style={{ 
                color: 'rgba(255,255,255,0.6)', 
                fontSize: 12, 
                fontStyle: 'italic',
                textAlign: 'left',
                marginTop: 8,
              }}>
                {t('clickVerseForTafsir', currentLanguage)}
              </Text>
            </View>
            
            {/* Show note when user reciter is selected but no recording exists */}
            {selectedReciter === 'user' && !userRecordings[`${selectedSurah}_${item.numberInSurah}`] && (
              <View style={{
                backgroundColor: 'rgba(220, 38, 38, 0.6)',
                borderRadius: 8,
                padding: 8,
                marginTop: 12,
                flexDirection: 'row',
                alignItems: 'center',
              }}>
                <Ionicons name="mic-outline" size={16} color="#fff" style={{ marginRight: 8 }} />
                <Text style={{ 
                  color: '#fff', 
                  fontSize: 12, 
                  fontStyle: 'italic'
                }}>
                  {t('noRecordingYet', currentLanguage)}
                </Text>
              </View>
            )}
          </TouchableOpacity>
        </View>
      </>
    );
  };


  // Render surah selection item with dark theme
  const renderSurahItem = ({ item }) => {
    // Defensive check to ensure item exists and has required properties
    if (!item || typeof item !== 'object') {
      console.warn('Invalid surah item:', item);
      return null;
    }
    
    return (
      <TouchableOpacity
        style={{ 
          padding: 20, 
          borderBottomWidth: 1, 
          borderColor: '#2A2A2A', 
          backgroundColor: selectedSurah === item.number ? '#2A2A2A' : '#1E1E1E',
          marginHorizontal: 16,
          marginVertical: 4,
          borderRadius: 12,
        }}
        onPress={() => {
          setSelectedSurah(item.number);
          setShowSurahList(false);
        }}
      >
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
          <View style={{ flex: 1 }}>
            <Text style={{ 
              fontWeight: 'bold', 
              color: selectedSurah === item.number ? '#fff' : '#FFFFFF',
              fontSize: 16,
            }}>
              {item.englishName || 'Unknown'}
            </Text>
          </View>
          <Text style={{ 
            color: '#B0B0B0',
            fontWeight: 'bold',
            fontSize: 16,
            marginLeft: 12,
            minWidth: 32,
            textAlign: 'right',
          }}>
            {item.number || '?'}
          </Text>
        </View>
        <Text style={{ 
          color: selectedSurah === item.number ? '#B0B0B0' : '#B0B0B0',
          marginTop: 4,
        }}>
          {item.englishNameTranslation || getProperSurahName(item.number, currentLanguage)} • {item.revelationType || ''} • {item.numberOfAyahs || 0} ayahs
        </Text>
      </TouchableOpacity>
    );
  };

  const renderSearchResult = ({ item }) => (
    <TouchableOpacity
      style={{
        marginHorizontal: 16,
        marginVertical: 6,
        backgroundColor: '#1E1E1E',
        borderRadius: 12,
        overflow: 'hidden',
        elevation: 2,
        borderWidth: 1,
        borderColor: '#2A2A2A',
      }}
      onPress={() => navigateToSearchResult(item)}
    >
      <LinearGradient
        colors={['#1E1E1E', '#2A2A2A']}
        style={{ padding: 16 }}
      >
        {item.type === 'surah' ? (
          <View>
            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 }}>
              <View style={{
                backgroundColor: '#059669',
                borderRadius: 12,
                paddingHorizontal: 8,
                paddingVertical: 4,
                marginRight: 8,
              }}>
                <Text style={{ color: '#fff', fontSize: 12, fontWeight: 'bold' }}>SURAH</Text>
          </View>
              <Text style={{ color: '#FFFFFF', fontWeight: 'bold', fontSize: 16 }}>
                {item.surahNumber}. {item.surahName}
              </Text>
          </View>
            <Text style={{ color: '#B0B0B0', fontSize: 14 }}>
              {getProperSurahName(item.surahNumber, currentLanguage)} • {item.revelationType} • {item.numberOfAyahs} verses
              </Text>
          </View>
        ) : (
          <View>
            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 }}>
              <View style={{
                backgroundColor: '#7C3AED',
                borderRadius: 12,
                paddingHorizontal: 8,
                paddingVertical: 4,
                marginRight: 8,
              }}>
                <Text style={{ color: '#fff', fontSize: 12, fontWeight: 'bold' }}>VERSE</Text>
              </View>
              <Text style={{ color: '#FFFFFF', fontWeight: 'bold', fontSize: 14 }}>
                {item.surahName} {item.numberInSurah}
                  </Text>
                  </View>
            <Text style={{ 
              fontSize: 18, 
              lineHeight: 28, 
              textAlign: 'right', 
              color: '#FFFFFF',
              fontFamily: Platform.OS === 'ios' ? 'Arial' : 'Roboto',
              marginBottom: 8,
            }}>
              {item.text}
                  </Text>
            <Text style={{ 
              color: '#B0B0B0', 
              fontSize: 14, 
              lineHeight: 20 
            }}>
              {item.translation}
                </Text>
              </View>
            )}
      </LinearGradient>
    </TouchableOpacity>
  );

  // Recording functions
  const startRecording = async (verse) => {
    try {
      console.log('🎤 Starting recording for verse:', verse);
      
      // Request recording permissions
      const { status } = await Audio.requestPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert(t('permissionRequired', currentLanguage), t('microphonePermission', currentLanguage));
        return;
      }

      // Set audio mode for recording
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        staysActiveInBackground: false,
        playsInSilentModeIOS: true,
        shouldDuckAndroid: true,
        playThroughEarpieceAndroid: false,
      });

      // Start recording
      const { recording } = await Audio.Recording.createAsync(
        Audio.RecordingOptionsPresets.HIGH_QUALITY
      );
      
      setRecording(recording);
      setIsRecording(true);
      setRecordingVerse(verse);
      setRecordingTime(0);
      
      // Start timer
      recordingTimer.current = setInterval(() => {
        setRecordingTime(prev => prev + 1);
      }, 1000);
      
      console.log('🎤 Recording started successfully');
    } catch (error) {
      console.error('🎤 Error starting recording:', error);
      Alert.alert(t('recordingError', currentLanguage), t('failedToStartRecording', currentLanguage));
    }
  };

  const startRecordingCurrentVerse = async () => {
    if (!recordingVerses.length || recordingVerseIndex >= recordingVerses.length) {
      Alert.alert(t('error', currentLanguage), t('noVerseAvailable', currentLanguage));
      return;
    }
    
    const currentVerse = recordingVerses[recordingVerseIndex];
    await startRecording(currentVerse);
  };

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
        
        // Reset audio mode
        await Audio.setAudioModeAsync({
          allowsRecordingIOS: false,
          staysActiveInBackground: false,
          playsInSilentModeIOS: true,
          shouldDuckAndroid: true,
          playThroughEarpieceAndroid: false,
        });
      }
    } catch (error) {
      console.error('🎤 Error stopping recording:', error);
      Alert.alert(t('recordingError', currentLanguage), t('failedToStopRecording', currentLanguage));
    }
  };

  const saveRecording = async (recordingUri, verse, title = '') => {
    try {
      const user = auth.currentUser;
      if (!user) {
        Alert.alert(t('authenticationRequired', currentLanguage), t('pleaseSignInToSave', currentLanguage));
        return;
      }

      console.log('💾 Saving recording for verse:', verse);
      
      // Get surah number from recordingSurah or verse object
      const surahNumber = recordingSurah?.number || verse.surah?.number || verse.surahNumber;
      const verseNumber = verse.numberInSurah;
      
      if (!surahNumber || !verseNumber) {
        console.error('💾 Missing surah or verse number:', { surahNumber, verseNumber, verse });
        Alert.alert(t('saveError', currentLanguage), t('missingVerseInformation', currentLanguage));
        return;
      }
      
      // Create a unique filename
      const timestamp = Date.now();
      const fileName = `recording_${user.uid}_${surahNumber}_${verseNumber}_${timestamp}.m4a`;
      
      // Upload to Firebase Storage (you'll need to implement this)
      // For now, we'll save the metadata to Firestore
      const recordingData = {
        userId: user.uid,
        surahNumber: surahNumber,
        verseNumber: verseNumber,
        title: title || `My Recitation - ${surahNumber}:${verseNumber}`,
        duration: recordingTime,
        timestamp: serverTimestamp(),
        localUri: recordingUri, // This will be replaced with Firebase Storage URL
        surahName: getProperSurahName(surahNumber, currentLanguage),
        verseText: verse.text,
      };

      // Check if recording already exists for this verse
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
      
      console.log('💾 Recording saved successfully');
      
      // Update local state
      setUserRecordings(prev => ({
        ...prev,
        [`${surahNumber}_${verseNumber}`]: {
          id: recordingRef.id,
          ...recordingData
        }
      }));
      
      // Show success message
      Alert.alert(t('success', currentLanguage), t('recitationSavedSuccessfully', currentLanguage));
      
      // If we're in the recording session, move to next verse
      if (recordingSurah && recordingVerses.length > 0) {
        if (recordingVerseIndex < recordingVerses.length - 1) {
          setRecordingVerseIndex(recordingVerseIndex + 1);
        } else {
          Alert.alert(t('complete', currentLanguage), t('allVersesRecorded', currentLanguage));
          resetRecordingSession();
        }
      } else {
        // Original behavior for single recording
        setRecordingVerse(null);
        setRecordingTime(0);
      }
      
    } catch (error) {
      console.error('💾 Error saving recording:', error);
      Alert.alert(t('saveError', currentLanguage), t('failedToSaveRecitation', currentLanguage));
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
      
      querySnapshot.forEach(doc => {
        const data = doc.data();
        const key = `${data.surahNumber}_${data.verseNumber}`;
        recordings[key] = {
          id: doc.id,
          ...data
        };
      });
      
      setUserRecordings(recordings);
      console.log('📱 Loaded user recordings:', Object.keys(recordings).length);
    } catch (error) {
      console.error('📱 Error loading user recordings:', error);
    }
  };


  // Real-time listener for user recordings
  useEffect(() => {
    const user = auth.currentUser;
    if (!user) {
      // Clear recordings if no user is logged in
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
      console.log('📱 Real-time update - user recordings:', Object.keys(recordings).length);
    }, (error) => {
      console.error('📱 Error in real-time listener:', error);
      // If there's a permission error, it likely means the user logged out
      if (error.code === 'permission-denied') {
        console.log('📱 Permission denied - user likely logged out, clearing recordings');
        setUserRecordings({});
      }
    });

    return unsubscribe;
  }, [auth.currentUser?.uid]); // Add dependency on user ID to re-run when user changes


  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const selectSurahForRecording = async (surah) => {
    try {
      setRecordingSurah(surah);
      setShowSurahSelection(false);
      setShowVerseSelection(true);
      setRecordingVerseIndex(0);
      
      // Fetch verses for the selected surah
      const response = await fetch(`https://api.alquran.cloud/v1/surah/${surah.number}`);
      const data = await response.json();
      
      if (data.code === 200 && data.data) {
        // Fetch transliteration for the surah
        const transliterationResponse = await fetch(`https://api.alquran.cloud/v1/surah/${surah.number}/en.transliteration`);
        const transliterationData = await transliterationResponse.json();
        
        if (transliterationData.code === 200 && transliterationData.data) {
          // Merge Arabic text with transliteration
          const versesWithTransliteration = data.data.ayahs.map((ayah, index) => ({
            ...ayah,
            transliteration: transliterationData.data.ayahs[index]?.text || ''
          }));
          setRecordingVerses(versesWithTransliteration);
        } else {
          setRecordingVerses(data.data.ayahs);
        }
      } else {
        Alert.alert(t('error', currentLanguage), t('couldNotLoadVerses', currentLanguage));
      }
    } catch (error) {
      console.error('Error loading surah verses:', error);
      Alert.alert(t('error', currentLanguage), t('couldNotLoadVerses', currentLanguage));
    }
  };

  const nextVerse = () => {
    if (recordingVerseIndex < recordingVerses.length - 1) {
      setRecordingVerseIndex(recordingVerseIndex + 1);
    }
  };

  const previousVerse = () => {
    if (recordingVerseIndex > 0) {
      setRecordingVerseIndex(recordingVerseIndex - 1);
    }
  };

  const resetRecordingSession = () => {
    setRecordingSurah(null);
    setRecordingVerseIndex(0);
    setRecordingVerses([]);
    setShowSurahSelection(true);
    setShowVerseSelection(false);
    setRecordingUri(null);
    setRecordingTime(0);
    setIsPlayingPreview(false);
    setShowTransliteration(false);
    if (previewAudio) {
      previewAudio.unloadAsync();
      setPreviewAudio(null);
    }
  };

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
              Alert.alert(t('playbackError', currentLanguage), t('couldNotPlayPreview', currentLanguage));
    }
  };

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

  const deleteRecording = () => {
    setRecordingUri(null);
    setRecordingTime(0);
    setIsPlayingPreview(false);
    if (previewAudio) {
      previewAudio.unloadAsync();
      setPreviewAudio(null);
    }
  };

  const saveCurrentRecording = async () => {
    if (!recordingUri || !recordingVerse) {
      Alert.alert(t('error', currentLanguage), t('noRecordingToSave', currentLanguage));
      return;
    }
    
    await saveRecording(recordingUri, recordingVerse);
    setRecordingUri(null);
    setRecordingTime(0);
    setIsPlayingPreview(false);
    if (previewAudio) {
      previewAudio.unloadAsync();
      setPreviewAudio(null);
    }
  };

  const isVerseRecorded = (surahNumber, verseNumber) => {
    return userRecordings[`${surahNumber}_${verseNumber}`] !== undefined;
  };

  const isSurahRecorded = (surahNumber) => {
    if (!recordingVerses.length) return false;
    return recordingVerses.every(verse => 
      isVerseRecorded(surahNumber, verse.numberInSurah)
    );
  };

  const getSurahRecordingProgress = (surahNumber) => {
    if (!recordingVerses.length) return 0;
    const recordedCount = recordingVerses.filter(verse => 
      isVerseRecorded(surahNumber, verse.numberInSurah)
    ).length;
    return Math.round((recordedCount / recordingVerses.length) * 100);
  };

  const selectVerseForRecording = async (verseIndex) => {
    const currentVerse = recordingVerses[verseIndex];
    const existingRecording = userRecordings[`${recordingSurah?.number}_${currentVerse.numberInSurah}`];
    
    // Recording features moved to Hifdh Helper - navigate there
    if (existingRecording) {
      // Show options for existing recording
      Alert.alert(
        t('verseAlreadyRecorded', currentLanguage),
        t('verseAlreadyRecordedMessage', currentLanguage),
        [
          {
            text: t('listenToRecording', currentLanguage),
            onPress: () => playExistingRecording(existingRecording),
          },
          {
            text: t('recordAgain', currentLanguage),
            onPress: () => {
              // Navigate to Hifdh Helper Record tab
              navigation.navigate('HifdhHelperScreen');
            },
          },
          {
            text: t('cancel', currentLanguage),
            style: 'cancel',
          },
        ]
      );
    } else {
      // Navigate to Hifdh Helper Record tab for new recording
      navigation.navigate('HifdhHelperScreen');
    }
  };

  const playExistingRecording = async (recording) => {
    try {
      if (previewAudio) {
        await previewAudio.unloadAsync();
      }
      
      // Use downloadURL if available, otherwise fall back to localUri
      const audioUri = recording.downloadURL || recording.localUri;
      
      if (!audioUri) {
        Alert.alert(t('error', currentLanguage), t('noAudioFileFound', currentLanguage));
        return;
      }
      
      console.log('🎵 Playing recording with URI:', audioUri);
      
      const { sound } = await Audio.Sound.createAsync({ uri: audioUri });
      setPreviewAudio(sound);
      setIsPlayingPreview(true);
      
      await sound.playAsync();
      
      sound.setOnPlaybackStatusUpdate((status) => {
        if (status.didJustFinish) {
          setIsPlayingPreview(false);
        }
      });
      
      console.log('✅ Recording playback started successfully');
    } catch (error) {
      console.error('Error playing existing recording:', error);
      Alert.alert(t('playbackError', currentLanguage), t('couldNotPlayRecording', currentLanguage));
    }
  };

  useEffect(() => {
    // Configure audio for Quran listening - allows playback even when ringer is off
    Audio.setAudioModeAsync({
      allowsRecordingIOS: false,
      staysActiveInBackground: true, // Keep audio playing in background
      interruptionModeIOS: Audio.INTERRUPTION_MODE_IOS_DO_NOT_MIX,
      playsInSilentModeIOS: true, // This is the key setting for ringer off
      shouldDuckAndroid: true,
      interruptionModeAndroid: Audio.INTERRUPTION_MODE_ANDROID_DO_NOT_MIX,
      playThroughEarpieceAndroid: false,
    });
    
    // Load user recordings
    loadUserRecordings();
  }, []);

  // Update range settings when surah changes
  useEffect(() => {
    if (filteredVerses.length > 0) {
      setEndVerse(filteredVerses.length);
      setStartVerse(1);
      setStartSurah(selectedSurah);
      setEndSurah(selectedSurah);
    }
  }, [filteredVerses, selectedSurah]);

  return (
    <View style={{ flex: 1, backgroundColor: '#121212' }}>
      <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />
      <SafeAreaView style={{ flex: 1 }}>
        {loading && !verses.length ? (
          <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#121212' }}>
            <ActivityIndicator size="large" color="#2196F3" />
                          <Text style={{ color: '#B0B0B0', marginTop: 16 }}>{t('loading', currentLanguage)}...</Text>
          </View>
        ) : error ? (
          <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#121212', paddingHorizontal: 32 }}>
                            <Ionicons name="alert-circle-outline" size={getResponsiveIconSize(64)} color="#F87171" />
            <Text style={{ textAlign: 'center', color: '#F87171', fontSize: 18, marginTop: 16 }}>{error}</Text>
          </View>
        ) : (
          <>
            {/* Header with dark theme */}
            <View style={{ 
              backgroundColor: '#1E1E1E', 
              paddingTop: 20, 
              paddingBottom: 20, 
              paddingHorizontal: 16,
              borderBottomWidth: 1,
              borderBottomColor: '#2A2A2A'
            }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
                <TouchableOpacity onPress={() => navigation.goBack()}>
                  <Ionicons name="arrow-back" size={28} color="#fff" />
                </TouchableOpacity>
                
                {/* Surah Title - Clickable with hint */}
                {surahs.length > 0 && selectedSurah && (
                  <TouchableOpacity 
                    onPress={() => setShowSurahList(true)}
                    activeOpacity={0.7}
                    style={{ flex: 1, alignItems: 'center', marginHorizontal: 16, marginRight: 120 }}
                  >
                    <Text style={{ 
                      fontWeight: 'bold', 
                      fontSize: 20, 
                      color: '#fff',
                      textAlign: 'center',
                      marginBottom: 2,
                    }}>
                      {surahs.find(s => s.number === selectedSurah)?.englishName || 'Unknown'}
                    </Text>
                    
                    <Text 
                      key={`surah-subtitle-${selectedSurah}-${currentLanguage}`}
                      style={{ 
                        fontSize: 12, 
                        color: '#B0B0B0',
                        textAlign: 'center',
                      }}>
                      {surahs.find(s => s.number === selectedSurah)?.englishNameTranslation || 
                       getProperSurahName(selectedSurah, currentLanguage)} • {' '}
                      {surahs.find(s => s.number === selectedSurah)?.revelationType} • {' '}
                      {surahs.find(s => s.number === selectedSurah)?.numberOfAyahs} ayahs
                    </Text>
                  </TouchableOpacity>
                )}
                
                <View style={{ 
                  width: 100, 
                  height: 100,
                  position: 'absolute',
                  top: -10,
                  right: -10,
                  zIndex: 1,
                }}>
                  {/* Top row */}
                  <View style={{
                    flexDirection: 'row',
                    gap: 6,
                    marginBottom: 6,
                  }}>
                    <TouchableOpacity 
                      onPress={() => setShowSearchModal(true)}
                      style={{
                        padding: 8,
                        backgroundColor: '#2A2A2A',
                        borderRadius: 10,
                        width: 44,
                        height: 44,
                        justifyContent: 'center',
                        alignItems: 'center',
                      }}
                    >
                      <Ionicons name="search" size={20} color="#fff" />
                    </TouchableOpacity>
                    
                    <TouchableOpacity 
                      onPress={() => navigation.replace('Bookmarks')}
                      style={{
                        padding: 8,
                        backgroundColor: '#2A2A2A',
                        borderRadius: 10,
                        width: 44,
                        height: 44,
                        justifyContent: 'center',
                        alignItems: 'center',
                      }}
                    >
                      <Ionicons name="bookmark" size={20} color="#fff" />
                    </TouchableOpacity>
                  </View>
                  
                  {/* Bottom row - Recording button removed, now accessible via Hifdh Helper */}
                  <View style={{
                    flexDirection: 'row',
                    gap: 6,
                    justifyContent: 'flex-end',
                    paddingRight: 15,
                  }}>
                  </View>
                </View>
                  </View>

              {/* Tap hint - smaller and less prominent */}
              {surahs.length > 0 && selectedSurah && (
                <Text style={{ 
                  fontSize: 11, 
                  color: '#888888',
                  fontStyle: 'italic',
                  textAlign: 'left',
                  marginTop: 4,
                  marginLeft: 20, // Moved further left to avoid overlap with buttons
                }}>
                  {t('tapSurahNameToSwitch', currentLanguage)}
                </Text>
              )}
                </View>

            {/* Search Bar with dark theme */}
            <View style={{ 
              backgroundColor: '#1E1E1E', 
              paddingHorizontal: 16, 
              paddingVertical: 12,
              borderBottomWidth: 1,
              borderBottomColor: '#2A2A2A'
            }}>
              <View style={{
                backgroundColor: '#2A2A2A',
                borderRadius: 20,
                flexDirection: 'row',
                alignItems: 'center',
                paddingHorizontal: 16,
                borderWidth: 1,
                borderColor: '#333333',
              }}>
                <Ionicons name="search-outline" size={20} color="#B0B0B0" />
                <TextInput
                  style={{ 
                    flex: 1, 
                    padding: 12, 
                    fontSize: 16, 
                    color: '#FFFFFF',
                  }}
                  placeholder={t('searchChapter', currentLanguage)}
                  placeholderTextColor="#B0B0B0"
                  value={searchQuery}
                  onChangeText={handleSearch}
                />
                  </View>
                  </View>


            {/* Content Area */}
            <View style={{ flex: 1, backgroundColor: '#121212' }}>
              {loading ? (
                <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
                  <ActivityIndicator size="large" color="#20C997" />
                  <Text style={{ color: '#B0B0B0', marginTop: 16, fontSize: 16 }}>
                    Loading verses...
                  </Text>
                </View>
              ) : error ? (
                <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 32 }}>
                  <Ionicons name="alert-circle-outline" size={getResponsiveIconSize(64)} color="#F87171" />
                  <Text style={{ color: '#F87171', marginTop: 16, fontSize: 16, textAlign: 'center' }}>
                    {error}
                  </Text>
                  <TouchableOpacity 
                    style={{
                      backgroundColor: '#20C997',
                      paddingHorizontal: 24,
                      paddingVertical: 12,
                      borderRadius: 12,
                      marginTop: 16,
                    }}
                    onPress={() => loadSurah(selectedSurah)}
                  >
                    <Text style={{ color: '#FFFFFF', fontWeight: '600' }}>Retry</Text>
                  </TouchableOpacity>
                </View>
              ) : (
                <FlatList
                  ref={ref => setFlatListRef(ref)}
                  data={filteredVerses}
                  renderItem={renderVerseCard}
                  keyExtractor={item => `${selectedSurah}-${item.numberInSurah}`}
                  removeClippedSubviews={false}
                  maxToRenderPerBatch={filteredVerses.length || 1}
                  windowSize={Math.max(filteredVerses.length, 1)}
                  initialNumToRender={filteredVerses.length || 1}
                  updateCellsBatchingPeriod={0}
                  contentContainerStyle={{
                    paddingBottom: Platform.OS === 'android' ? 180 : 32
                  }}
                  onEndReachedThreshold={null}
                  onScrollToIndexFailed={({ index, highestMeasuredFrameIndex }) => {
                    if (flatListRef && highestMeasuredFrameIndex >= 0) {
                      // Try scrolling to the highest measured index first
                      flatListRef.scrollToIndex({ index: highestMeasuredFrameIndex, animated: false });
                      
                      // Then try to scroll to the target index after a delay
                      setTimeout(() => {
                        try {
                          flatListRef.scrollToIndex({ index, animated: false });
                        } catch (error) {
                          // If scrollToIndex fails, try scrollToOffset as fallback
                          const estimatedOffset = index * 300; // Better estimation for variable heights
                          flatListRef.scrollToOffset({ offset: estimatedOffset, animated: false });
                        }
                      }, 500);
                    }
                  }}
                  showsVerticalScrollIndicator={false}
                  ListEmptyComponent={
                    <View style={{ alignItems: 'center', marginTop: 32, marginHorizontal: 32 }}>
                      <Ionicons name="search-outline" size={getResponsiveIconSize(64)} color="#475569" />
                      <Text style={{ textAlign: 'center', color: '#B0B0B0', fontSize: 16, marginTop: 16 }}>
                        No verses found
                      </Text>
                    </View>
                  }
                />
              )}
            </View>
          </>
        )}
      </SafeAreaView>





      {/* Enhanced Audio Controls Modal */}
      <Modal 
        visible={showAdvancedAudioModal} 
        animationType="slide" 
        onRequestClose={() => setShowAdvancedAudioModal(false)}
      >
        <View style={{ flex: 1, backgroundColor: '#0A0A0A' }}>
          {/* Header with gradient */}
          <LinearGradient
            colors={['#1E1E1E', '#2A2A2A']}
            style={{
              paddingTop: 80,
              paddingBottom: 20,
              paddingHorizontal: 16,
              borderBottomWidth: 1,
              borderBottomColor: '#333333'
            }}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <TouchableOpacity 
                  onPress={() => setShowAdvancedAudioModal(false)}
                  style={{
                    backgroundColor: 'rgba(255,255,255,0.1)',
                    borderRadius: 20,
                    padding: 8,
                  }}
                >
                  <Ionicons name="close" size={24} color="#fff" />
                </TouchableOpacity>
                                  <View style={{ marginLeft: 16 }}>
                    <Text style={{ fontWeight: 'bold', fontSize: 22, color: '#fff' }}>
                      {t('playbackSettings', currentLanguage)}
                    </Text>
                  </View>
              </View>
              {isPlaying && (
                <TouchableOpacity 
                  style={{
                    backgroundColor: '#F87171',
                    paddingHorizontal: 16,
                    paddingVertical: 10,
                    borderRadius: 25,
                    flexDirection: 'row',
                    alignItems: 'center',
                  }}
                  onPress={stopAudio}
                >
                  <Ionicons name="stop" size={16} color="#FFFFFF" style={{ marginRight: 6 }} />
                  <Text style={{ color: '#FFFFFF', fontWeight: '600' }}>{t('stop', currentLanguage)}</Text>
                </TouchableOpacity>
              )}
            </View>
          </LinearGradient>

          {/* Content */}
          <ScrollView style={{ flex: 1, padding: 16, paddingBottom: 100 }} showsVerticalScrollIndicator={false}>
            {/* Reciter Selection */}
            <View style={{
              backgroundColor: '#1A1A1A',
              borderRadius: 16,
              padding: 20,
              marginBottom: 20,
              borderWidth: 1,
              borderColor: '#333333',
              shadowColor: '#000',
              shadowOffset: { width: 0, height: 4 },
              shadowOpacity: 0.3,
              shadowRadius: 8,
              elevation: 8,
            }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 16 }}>
                <Text style={{ color: '#FFFFFF', fontSize: 18, fontWeight: 'bold' }}>
                  {t('reciter', currentLanguage)}
                </Text>
              </View>
              
              {!showInlineReciterSelection ? (
                <TouchableOpacity
                  style={{
                    backgroundColor: '#2A2A2A',
                    padding: 16,
                    borderRadius: 12,
                    flexDirection: 'row',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    borderWidth: 1,
                    borderColor: '#444444',
                  }}
                  onPress={() => setShowInlineReciterSelection(true)}
                >
                  <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                    <Text style={{ color: '#FFFFFF', fontSize: 16, fontWeight: '500' }}>
                      {availableReciters.find(r => r.id === selectedReciter)?.name || t('selectReciter', currentLanguage)}
                    </Text>
                  </View>
                </TouchableOpacity>
              ) : (
                <View style={{
                  backgroundColor: '#2A2A2A',
                  borderRadius: 12,
                  maxHeight: 200,
                  borderWidth: 1,
                  borderColor: '#444444',
                }}>
                  <ScrollView showsVerticalScrollIndicator={true}>
                    {console.log('🔍 Available reciters:', availableReciters.map(r => ({ id: r.id, name: r.name })))}
                    {console.log('🔍 User authenticated:', !!auth.currentUser)}
                    {availableReciters.map((reciter) => (
                      <TouchableOpacity
                        key={reciter.id}
                        style={{
                          padding: 16,
                          borderBottomWidth: 1,
                          borderBottomColor: '#444444',
                          backgroundColor: selectedReciter === reciter.id ? '#FFFFFF' : 'transparent',
                          flexDirection: 'row',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                        }}
                        onPress={() => {
                          setSelectedReciter(reciter.id);
                          setShowInlineReciterSelection(false);
                        }}
                      >
                        <Text style={{ 
                          color: selectedReciter === reciter.id ? '#000000' : '#B0B0B0', 
                          fontSize: 16,
                          fontWeight: selectedReciter === reciter.id ? 'bold' : 'normal',
                        }}>
                          {reciter.name}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </ScrollView>
                </View>
              )}
            </View>

            {/* Playback Speed */}
            <View style={{
              backgroundColor: '#1A1A1A',
              borderRadius: 16,
              padding: 20,
              marginBottom: 20,
              borderWidth: 1,
              borderColor: '#333333',
              shadowColor: '#000',
              shadowOffset: { width: 0, height: 4 },
              shadowOpacity: 0.3,
              shadowRadius: 8,
              elevation: 8,
            }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 16 }}>
                <Text style={{ color: '#FFFFFF', fontSize: 18, fontWeight: 'bold' }}>
                  {t('playbackSpeed', currentLanguage)}
                </Text>
              </View>
              <View style={{ flexDirection: 'row', gap: 8, flexWrap: 'wrap' }}>
                {[0.5, 0.75, 1.0, 1.25, 1.5, 1.75].map((speed) => (
                  <TouchableOpacity
                    key={speed}
                    style={{
                      backgroundColor: playbackSpeed === speed ? '#FFFFFF' : 'transparent',
                      paddingHorizontal: 14,
                      paddingVertical: 8,
                      borderRadius: 20,
                      minWidth: 55,
                      alignItems: 'center',
                      borderWidth: 1,
                      borderColor: '#FFFFFF',
                      shadowColor: playbackSpeed === speed ? '#000' : 'transparent',
                      shadowOffset: { width: 0, height: 2 },
                      shadowOpacity: playbackSpeed === speed ? 0.3 : 0,
                      shadowRadius: 4,
                      elevation: playbackSpeed === speed ? 4 : 0,
                    }}
                    onPress={() => setPlaybackSpeed(speed)}
                  >
                    <Text style={{ 
                      color: playbackSpeed === speed ? '#000000' : '#FFFFFF', 
                      fontWeight: playbackSpeed === speed ? 'bold' : 'normal',
                      fontSize: 15,
                    }}>
                      {speed === 1.0 ? '1x' : `${speed}x`}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* Select Range */}
            <View style={{
              backgroundColor: '#1A1A1A',
              borderRadius: 16,
              padding: 20,
              marginBottom: 20,
              borderWidth: 1,
              borderColor: '#333333',
              shadowColor: '#000',
              shadowOffset: { width: 0, height: 4 },
              shadowOpacity: 0.3,
              shadowRadius: 8,
              elevation: 8,
            }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 16 }}>
                <Text style={{ color: '#FFFFFF', fontSize: 18, fontWeight: 'bold' }}>
                  {t('selectRange', currentLanguage)}
                </Text>
              </View>
              
              <View style={{ gap: 16 }}>
                {/* Starting Point */}
                <View>
                  <Text style={{ color: '#B0B0B0', fontSize: 14, marginBottom: 8, fontWeight: '500' }}>{t('startingPoint', currentLanguage)}</Text>
                  <TouchableOpacity
                    style={{
                      backgroundColor: '#2A2A2A',
                      padding: 16,
                      borderRadius: 12,
                      flexDirection: 'row',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      borderWidth: 1,
                      borderColor: '#444444',
                    }}
                    onPress={() => setShowStartPicker(!showStartPicker)}
                  >
                    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                      <Text style={{ color: '#FFFFFF', fontSize: 16, fontWeight: '500' }}>
                        {surahs.find(s => s.number === startSurah)?.englishName || 'Unknown'} - {startVerse}
                      </Text>
                    </View>
                  </TouchableOpacity>
                  
                  {showStartPicker && (
                    <View style={{
                      backgroundColor: '#2A2A2A',
                      borderRadius: 12,
                      marginTop: 8,
                      borderWidth: 1,
                      borderColor: '#444444',
                      maxHeight: 200,
                    }}>
                      <View style={{ flexDirection: 'row', height: 180 }}>
                        {/* Surah List */}
                        <View style={{ flex: 1, borderRightWidth: 1, borderRightColor: '#444444' }}>
                          <ScrollView showsVerticalScrollIndicator={true}>
                            {surahs.map((surah) => (
                              <TouchableOpacity
                                key={surah.number}
                                style={{
                                  padding: 12,
                                  backgroundColor: startSurah === surah.number ? '#444444' : 'transparent',
                                  borderBottomWidth: 1,
                                  borderBottomColor: '#444444',
                                }}
                                onPress={() => {
                                  setStartSurah(surah.number);
                                  setStartVerse(1);
                                }}
                              >
                                <Text style={{
                                  color: startSurah === surah.number ? '#FFFFFF' : '#B0B0B0',
                                  fontSize: 14,
                                  fontWeight: startSurah === surah.number ? 'bold' : 'normal',
                                }}>
                                  {surah.number} - {surah.englishName}
                                </Text>
                              </TouchableOpacity>
                            ))}
                          </ScrollView>
                        </View>
                        
                        {/* Verse List */}
                        <View style={{ flex: 1 }}>
                          <ScrollView showsVerticalScrollIndicator={true}>
                            {Array.from({ length: surahs.find(s => s.number === startSurah)?.numberOfAyahs || 1 }, (_, i) => i + 1).map((verse) => (
                              <TouchableOpacity
                                key={verse}
                                style={{
                                  padding: 12,
                                  backgroundColor: startVerse === verse ? '#444444' : 'transparent',
                                  borderBottomWidth: 1,
                                  borderBottomColor: '#444444',
                                }}
                                onPress={() => setStartVerse(verse)}
                              >
                                <Text style={{
                                  color: startVerse === verse ? '#FFFFFF' : '#B0B0B0',
                                  fontSize: 14,
                                  fontWeight: startVerse === verse ? 'bold' : 'normal',
                                }}>
                                  {verse}
                                </Text>
                              </TouchableOpacity>
                            ))}
                          </ScrollView>
                        </View>
                      </View>
                    </View>
                  )}
                </View>
                
                {/* Ending Point */}
                <View>
                  <Text style={{ color: '#B0B0B0', fontSize: 14, marginBottom: 8, fontWeight: '500' }}>{t('endingPoint', currentLanguage)}</Text>
                  <TouchableOpacity
                    style={{
                      backgroundColor: '#2A2A2A',
                      padding: 16,
                      borderRadius: 12,
                      flexDirection: 'row',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      borderWidth: 1,
                      borderColor: '#444444',
                    }}
                    onPress={() => setShowEndPicker(!showEndPicker)}
                  >
                    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                      <Text style={{ color: '#FFFFFF', fontSize: 16, fontWeight: '500' }}>
                        {surahs.find(s => s.number === endSurah)?.englishName || 'Unknown'} - {endVerse}
                      </Text>
                    </View>
                  </TouchableOpacity>
                  
                  {showEndPicker && (
                    <View style={{
                      backgroundColor: '#2A2A2A',
                      borderRadius: 12,
                      marginTop: 8,
                      borderWidth: 1,
                      borderColor: '#444444',
                      maxHeight: 200,
                    }}>
                      <View style={{ flexDirection: 'row', height: 180 }}>
                        {/* Surah List */}
                        <View style={{ flex: 1, borderRightWidth: 1, borderRightColor: '#444444' }}>
                          <ScrollView showsVerticalScrollIndicator={true}>
                            {surahs.filter(surah => surah.number >= startSurah).map((surah) => (
                              <TouchableOpacity
                                key={surah.number}
                                style={{
                                  padding: 12,
                                  backgroundColor: endSurah === surah.number ? '#444444' : 'transparent',
                                  borderBottomWidth: 1,
                                  borderBottomColor: '#444444',
                                }}
                                onPress={() => {
                                  setEndSurah(surah.number);
                                  setEndVerse(surah.numberOfAyahs);
                                }}
                              >
                                <Text style={{
                                  color: endSurah === surah.number ? '#FFFFFF' : '#B0B0B0',
                                  fontSize: 14,
                                  fontWeight: endSurah === surah.number ? 'bold' : 'normal',
                                }}>
                                  {surah.number} - {surah.englishName}
                                </Text>
                              </TouchableOpacity>
                            ))}
                          </ScrollView>
                        </View>
                        
                        {/* Verse List */}
                        <View style={{ flex: 1 }}>
                          <ScrollView showsVerticalScrollIndicator={true}>
                            {Array.from({ length: surahs.find(s => s.number === endSurah)?.numberOfAyahs || 1 }, (_, i) => i + 1).map((verse) => (
                              <TouchableOpacity
                                key={verse}
                                style={{
                                  padding: 12,
                                  backgroundColor: endVerse === verse ? '#444444' : 'transparent',
                                  borderBottomWidth: 1,
                                  borderBottomColor: '#444444',
                                }}
                                onPress={() => setEndVerse(verse)}
                              >
                                <Text style={{
                                  color: endVerse === verse ? '#FFFFFF' : '#B0B0B0',
                                  fontSize: 14,
                                  fontWeight: endVerse === verse ? 'bold' : 'normal',
                                }}>
                                  {verse}
                                </Text>
                              </TouchableOpacity>
                            ))}
                          </ScrollView>
                        </View>
                      </View>
                    </View>
                  )}
                </View>
                
                <View style={{
                  backgroundColor: '#2A2A2A',
                  padding: 12,
                  borderRadius: 8,
                  borderWidth: 1,
                  borderColor: '#444444',
                }}>
                  <Text style={{ color: '#B0B0B0', fontSize: 12, textAlign: 'center' }}>
                    {startSurah === endSurah ? 
                      `${t('range', currentLanguage)}: ${startVerse} - ${endVerse} (${endVerse - startVerse + 1} ${t('verses', currentLanguage)})` :
                      `${t('crossSurah', currentLanguage)}: ${surahs.find(s => s.number === startSurah)?.englishName} ${startVerse} to ${surahs.find(s => s.number === endSurah)?.englishName} ${endVerse}`
                    }
                  </Text>
                  {startSurah !== endSurah && (
                    <Text style={{ color: '#666666', fontSize: 10, textAlign: 'center', marginTop: 4 }}>
                      {startSurah === endSurah ? '' : 
                        `${endSurah - startSurah + 1} ${t('surahs', currentLanguage)} • ${surahs.slice(startSurah - 1, endSurah).reduce((total, surah) => total + surah.numberOfAyahs, 0)} ${t('totalVerses', currentLanguage)}`
                      }
                    </Text>
                  )}
                </View>
              </View>
            </View>





            {/* Loop Settings */}
            <View style={{
              backgroundColor: '#1A1A1A',
              borderRadius: 16,
              padding: 20,
              marginBottom: 20,
              borderWidth: 1,
              borderColor: '#333333',
              shadowColor: '#000',
              shadowOffset: { width: 0, height: 4 },
              shadowOpacity: 0.3,
              shadowRadius: 8,
              elevation: 8,
            }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 16 }}>
                <Text style={{ color: '#FFFFFF', fontSize: 18, fontWeight: 'bold' }}>
                  {t('loopSettings', currentLanguage)}
                </Text>
              </View>
              
              <View style={{ gap: 16 }}>
                {/* Verse Repetition */}
                <View>
                  <Text style={{ color: '#B0B0B0', fontSize: 14, marginBottom: 8, fontWeight: '500' }}>
                    {t('repeatEachVerse', currentLanguage)}
                  </Text>
                  <View style={{ flexDirection: 'row', gap: 8, flexWrap: 'wrap' }}>
                    {[1, 2, 3].map((count) => (
                      <TouchableOpacity
                        key={count}
                        style={{
                          backgroundColor: verseLoopCount === count ? '#FFFFFF' : 'transparent',
                          paddingHorizontal: 14,
                          paddingVertical: 8,
                          borderRadius: 20,
                          minWidth: 60,
                          alignItems: 'center',
                          borderWidth: 1,
                          borderColor: '#FFFFFF',
                          shadowColor: verseLoopCount === count ? '#000' : 'transparent',
                          shadowOffset: { width: 0, height: 2 },
                          shadowOpacity: verseLoopCount === count ? 0.3 : 0,
                          shadowRadius: 4,
                          elevation: verseLoopCount === count ? 4 : 0,
                        }}
                        onPress={() => setVerseLoopCount(count)}
                      >
                        <Text style={{ 
                          color: verseLoopCount === count ? '#000000' : '#FFFFFF', 
                          fontWeight: verseLoopCount === count ? 'bold' : 'normal',
                          fontSize: 15,
                        }}>
                          {count} {t('time', currentLanguage)}
                        </Text>
                      </TouchableOpacity>
                    ))}
                    <TouchableOpacity
                      style={{
                        backgroundColor: verseLoopCount === -1 ? '#FFFFFF' : 'transparent',
                        paddingHorizontal: 14,
                        paddingVertical: 8,
                        borderRadius: 20,
                        minWidth: 60,
                        alignItems: 'center',
                        borderWidth: 1,
                        borderColor: '#FFFFFF',
                        shadowColor: verseLoopCount === -1 ? '#000' : 'transparent',
                        shadowOffset: { width: 0, height: 2 },
                        shadowOpacity: verseLoopCount === -1 ? 0.3 : 0,
                        shadowRadius: 4,
                        elevation: verseLoopCount === -1 ? 4 : 0,
                      }}
                      onPress={() => setVerseLoopCount(-1)}
                    >
                      <Text style={{ 
                        color: verseLoopCount === -1 ? '#000000' : '#FFFFFF', 
                        fontWeight: verseLoopCount === -1 ? 'bold' : 'normal',
                        fontSize: 15,
                      }}>
                        {t('loop', currentLanguage)}
                      </Text>
                    </TouchableOpacity>
                  </View>
                </View>

                {/* Range Repetition */}
                <View>
                  <Text style={{ color: '#B0B0B0', fontSize: 14, marginBottom: 8, fontWeight: '500' }}>
                    {t('repeatEntireRange', currentLanguage)}
                  </Text>
                  <View style={{ flexDirection: 'row', gap: 8, flexWrap: 'wrap' }}>
                    {[1, 2, 3].map((count) => (
                      <TouchableOpacity
                        key={count}
                        style={{
                          backgroundColor: rangeLoopCount === count ? '#FFFFFF' : 'transparent',
                          paddingHorizontal: 14,
                          paddingVertical: 8,
                          borderRadius: 20,
                          minWidth: 60,
                          alignItems: 'center',
                          borderWidth: 1,
                          borderColor: '#FFFFFF',
                          shadowColor: rangeLoopCount === count ? '#000' : 'transparent',
                          shadowOffset: { width: 0, height: 2 },
                          shadowOpacity: rangeLoopCount === count ? 0.3 : 0,
                          shadowRadius: 4,
                          elevation: rangeLoopCount === count ? 4 : 0,
                        }}
                        onPress={() => setRangeLoopCount(count)}
                      >
                        <Text style={{ 
                          color: rangeLoopCount === count ? '#000000' : '#FFFFFF', 
                          fontWeight: rangeLoopCount === count ? 'bold' : 'normal',
                          fontSize: 15,
                        }}>
                          {count} {t('time', currentLanguage)}
                        </Text>
                      </TouchableOpacity>
                    ))}
                    <TouchableOpacity
                      style={{
                        backgroundColor: rangeLoopCount === -1 ? '#FFFFFF' : 'transparent',
                        paddingHorizontal: 14,
                        paddingVertical: 8,
                        borderRadius: 20,
                        minWidth: 60,
                        alignItems: 'center',
                        borderWidth: 1,
                        borderColor: '#FFFFFF',
                        shadowColor: rangeLoopCount === -1 ? '#000' : 'transparent',
                        shadowOffset: { width: 0, height: 2 },
                        shadowOpacity: rangeLoopCount === -1 ? 0.3 : 0,
                        shadowRadius: 4,
                        elevation: rangeLoopCount === -1 ? 4 : 0,
                      }}
                      onPress={() => setRangeLoopCount(-1)}
                    >
                      <Text style={{ 
                        color: rangeLoopCount === -1 ? '#000000' : '#FFFFFF', 
                        fontWeight: rangeLoopCount === -1 ? 'bold' : 'normal',
                        fontSize: 15,
                      }}>
                        {t('loop', currentLanguage)}
                      </Text>
                    </TouchableOpacity>
                  </View>
                </View>
              </View>
            </View>

            {/* Play Button */}
            <View style={{
              backgroundColor: '#1A1A1A',
              borderRadius: 16,
              padding: 20,
              marginBottom: 20,
              borderWidth: 1,
              borderColor: '#333333',
              shadowColor: '#000',
              shadowOffset: { width: 0, height: 4 },
              shadowOpacity: 0.3,
              shadowRadius: 8,
              elevation: 8,
            }}>
              <TouchableOpacity
                style={{
                  backgroundColor: isPlaying ? '#F87171' : '#2A2A2A',
                  paddingVertical: 20,
                  paddingHorizontal: 32,
                  borderRadius: 16,
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'center',
                  borderWidth: 2,
                  borderColor: '#444444',
                  shadowColor: '#000',
                  shadowOffset: { width: 0, height: 4 },
                  shadowOpacity: 0.5,
                  shadowRadius: 8,
                  elevation: 8,
                }}
                onPress={async () => {
                  if (isPlaying) {
                    // Pause logic
                    console.log('🔄 Pausing audio from settings...');
                    if (audio) {
                      try {
                        await audio.pauseAsync();
                        setIsPlaying(false);
                      } catch (error) {
                        console.log('Error pausing audio:', error);
                        setIsPlaying(false);
                      }
                    } else {
                      setIsPlaying(false);
                    }
                  } else {
                    // Play logic - close modal and start playing
                    console.log('🔄 Starting audio from settings...');
                    
                    // Close the playback settings modal
                    setShowAdvancedAudioModal(false);
                    
                    // Set audio play mode to range if range is selected
                    if (startSurah && endSurah && (startSurah !== selectedSurah?.number || startVerse !== 1 || endVerse !== filteredVerses.length)) {
                      setAudioPlayMode('range');
                    } else {
                      setAudioPlayMode('surah');
                    }
                    
                    // Let playVerseRange handle all navigation - just close modal and start playing
                    console.log('🔄 Starting range playback - letting playVerseRange handle navigation');
                    
                    // Start playing after a short delay to allow modal to close
                    setTimeout(() => {
                      if (audioPlayMode === 'range' && startSurah && endSurah) {
                        // Play selected range using playVerseRange
                        console.log('🔄 Playing verse range from settings');
                        playVerseRange();
                      } else {
                        // Play entire surah
                        console.log('🔄 Playing entire surah from settings');
                        playEntireSurah();
                      }
                    }, 300);
                  }
                }}
              >
                              <Text style={{ 
                color: '#FFFFFF', 
                fontSize: 20, 
                fontWeight: 'bold',
                textAlign: 'center'
              }}>
                {isPlaying ? t('pause', currentLanguage) : t('play', currentLanguage)}
              </Text>
              </TouchableOpacity>
            </View>

          </ScrollView>
        </View>
      </Modal>





      {/* Verse Selection Modal for Custom Mode */}
      <Modal 
        visible={showVerseSelection} 
        animationType="slide" 
        onRequestClose={() => setShowVerseSelection(false)}
      >
        <View style={{ flex: 1, backgroundColor: '#121212' }}>
          <View style={{ 
            backgroundColor: '#1E1E1E', 
            paddingTop: getAndroidTopPadding(50), 
            paddingBottom: 20, 
            paddingHorizontal: 16,
            borderBottomWidth: 1,
            borderBottomColor: '#2A2A2A'
          }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <TouchableOpacity onPress={() => setShowVerseSelection(false)}>
                  <Ionicons name="close" size={28} color="#fff" />
                </TouchableOpacity>
                <Text style={{ fontWeight: 'bold', fontSize: 20, color: '#fff', marginLeft: 16 }}>
                  {t('selectVerses', currentLanguage)}
                </Text>
              </View>
              <TouchableOpacity
                style={{
                  backgroundColor: '#4F46E5',
                  paddingHorizontal: 16,
                  paddingVertical: 8,
                  borderRadius: 20,
                }}
                onPress={() => setShowVerseSelection(false)}
              >
                                  <Text style={{ color: '#FFFFFF', fontWeight: '600' }}>{t('done', currentLanguage)}</Text>
              </TouchableOpacity>
            </View>
          </View>

          <FlatList
            data={filteredVerses}
            keyExtractor={(item) => `${item.numberInSurah}`}
            contentContainerStyle={{
              paddingBottom: Platform.OS === 'android' ? 180 : 20
            }}
            renderItem={({ item }) => {
              const isSelected = selectedVerses.some(v => v.numberInSurah === item.numberInSurah);
              return (
                <TouchableOpacity
                  style={{
                    backgroundColor: isSelected ? '#2A2A2A' : 'transparent',
                    padding: 16,
                    borderBottomWidth: 1,
                    borderBottomColor: '#2A2A2A',
                    flexDirection: 'row',
                    alignItems: 'center',
                  }}
                  onPress={() => {
                    if (isSelected) {
                      setSelectedVerses(selectedVerses.filter(v => v.numberInSurah !== item.numberInSurah));
                    } else {
                      setSelectedVerses([...selectedVerses, item]);
                    }
                  }}
                >
                  <View style={{
                    width: 24,
                    height: 24,
                    borderRadius: 12,
                    borderWidth: 2,
                    borderColor: isSelected ? '#4F46E5' : '#666',
                    backgroundColor: isSelected ? '#4F46E5' : 'transparent',
                    alignItems: 'center',
                    justifyContent: 'center',
                    marginRight: 16,
                  }}>
                    {isSelected && <Ionicons name="checkmark" size={16} color="#FFFFFF" />}
                  </View>
                  <Text style={{ color: '#FFFFFF', fontSize: 16 }}>
                    {t('verse', currentLanguage)} {item.numberInSurah}
                  </Text>
                </TouchableOpacity>
              );
            }}
            style={{ backgroundColor: '#121212' }}
          />
        </View>
      </Modal>

      {/* Surah List Modal */}
      <Modal visible={showSurahList} animationType="slide" onRequestClose={() => setShowSurahList(false)}>
        <View style={{ flex: 1, backgroundColor: '#121212' }}>
          <View style={{ 
            backgroundColor: '#1E1E1E', 
            paddingTop: getAndroidTopPadding(50), 
            paddingBottom: 20, 
            paddingHorizontal: 16,
            borderBottomWidth: 1,
            borderBottomColor: '#2A2A2A'
          }}>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <TouchableOpacity onPress={() => setShowSurahList(false)}>
                <Ionicons name="close" size={28} color="#fff" />
                </TouchableOpacity>
              <Text style={{ fontWeight: 'bold', fontSize: 20, color: '#fff', marginLeft: 16 }}>
                Select Surah
              </Text>
          </View>
          </View>
          
          <FlatList
            data={surahs}
            keyExtractor={(item) => `${item.number}`}
            renderItem={renderSurahItem}
            contentContainerStyle={{ 
              paddingVertical: 16,
              paddingBottom: Platform.OS === 'android' ? 196 : 16
            }}
            showsVerticalScrollIndicator={false}
            style={{ backgroundColor: '#121212' }}
          />
        </View>
      </Modal>

      {/* Tafsir Modal */}
      <Modal visible={showTafsirModal} animationType="slide" onRequestClose={() => setShowTafsirModal(false)}>
        <View style={{ flex: 1, backgroundColor: '#121212' }}>
          <View style={{ 
            backgroundColor: '#1E1E1E', 
            paddingTop: getAndroidTopPadding(50), 
            paddingBottom: 20, 
            paddingHorizontal: 16,
            borderBottomWidth: 1,
            borderBottomColor: '#2A2A2A'
          }}>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <TouchableOpacity onPress={() => setShowTafsirModal(false)}>
                <Ionicons name="close" size={28} color="#fff" />
              </TouchableOpacity>
              <Text style={{ fontWeight: 'bold', fontSize: 20, color: '#fff', marginLeft: 16 }}>
                {t('tafsir', currentLanguage)}
              </Text>
            </View>
                </View>
          
          <ScrollView style={{ flex: 1, backgroundColor: '#121212', padding: 16 }}>
            <View style={{
              backgroundColor: '#1E1E1E',
              borderRadius: 12,
              padding: 20,
              marginBottom: 16,
              borderWidth: 1,
              borderColor: '#2A2A2A',
              flex: 1,
            }}>
              <Text style={{ fontWeight: 'bold', fontSize: 18, marginBottom: 8, color: '#B0B0B0' }}>
                {selectedVerse ? `Surah ${selectedSurah}, Ayah ${selectedVerse.numberInSurah}` : ''}
              </Text>
               
              {/* Full Verse Display */}
              {selectedVerse && (
                <View style={{
                  backgroundColor: '#2A2A2A',
                  borderRadius: 12,
                  padding: 16,
                  marginBottom: 20,
                  borderWidth: 1,
                  borderColor: '#333333',
                }}>
                  {/* Bismillah for first ayah (except Surah 9 and Surah 1) */}
                  {selectedVerse.numberInSurah === 1 && selectedSurah !== 9 && selectedSurah !== 1 && (
                    <Text style={{
                      fontSize: 18,
                      lineHeight: 32,
                      textAlign: 'right',
                      color: '#FFFFFF',
                      fontFamily: Platform.OS === 'ios' ? 'Arial' : 'Roboto',
                      marginBottom: 12,
                    }}>
                      {BISMILLAH}
                    </Text>
                  )}
                  
                  {/* Arabic Text */}
                  <Text style={{ 
                    fontSize: 22, 
                    lineHeight: 36, 
                    textAlign: 'right', 
                    color: '#FFFFFF',
                    fontFamily: Platform.OS === 'ios' ? 'Arial' : 'Roboto',
                    marginBottom: 12,
                  }}>
                    {selectedVerse.numberInSurah === 1 && FIRST_VERSE_MAP[selectedSurah] 
                      ? FIRST_VERSE_MAP[selectedSurah] 
                      : selectedVerse.text}
                  </Text>
                  
                  {/* Translation */}
                  <Text style={{ 
                    color: '#B0B0B0', 
                    fontSize: 16, 
                    lineHeight: 24,
                    textAlign: 'left',
                  }}>
                    {selectedVerse.translation}
                  </Text>
                </View>
              )}
              
              {tafsirLoading && (
                <View style={{ alignItems: 'center', marginVertical: 32 }}>
                  <ActivityIndicator size="large" color="#B0B0B0" />
                  <Text style={{ color: '#B0B0B0', marginTop: 16 }}>{t('tafsirLoading', currentLanguage)}</Text>
          </View>
              )}
              
              {!tafsirLoading && tafsirError && (
                <View style={{ alignItems: 'center', marginVertical: 32 }}>
                  <Ionicons name="alert-circle-outline" size={48} color="#F87171" />
                  <Text style={{ color: '#F87171', fontSize: 16, marginTop: 16, textAlign: 'center' }}>
                    {tafsirError}
                  </Text>
                </View>
              )}
              
              {!tafsirLoading && tafsir && (
                <View style={{ flex: 1 }}>
                  {tafsir.split('\n\n').map((paragraph, index) => {
                    if (paragraph.startsWith('> **')) {
                      // This is the language support message
                      const message = paragraph.replace('> **', '').replace('**', '');
                      
                      // Dynamic sizing based on language
                      const getAlertFontSize = () => {
                        switch (currentLanguage) {
                          case 'spanish':
                            return 13; // Spanish text tends to be longer
                          case 'french':
                            return 13; // French text can be longer
                          case 'italian':
                            return 14; // Italian text is moderate
                          default:
                            return 14; // English default
                        }
                      };
                      
                      const getAlertPadding = () => {
                        switch (currentLanguage) {
                          case 'spanish':
                            return 20; // More padding for longer text
                          case 'french':
                            return 20; // More padding for longer text
                          case 'italian':
                            return 18; // Moderate padding
                          default:
                            return 16; // English default
                        }
                      };
                      
                      const getAlertMargin = () => {
                        switch (currentLanguage) {
                          case 'spanish':
                            return 24; // More margin for longer text
                          case 'french':
                            return 24; // More margin for longer text
                          case 'italian':
                            return 20; // Moderate margin
                          default:
                            return 20; // English default
                        }
                      };
                      
                      return (
                        <View key={index} style={{
                          backgroundColor: '#1E3A8A',
                          borderRadius: 12,
                          padding: getAlertPadding(),
                          marginBottom: getAlertMargin(),
                          borderLeftWidth: 4,
                          borderLeftColor: '#3B82F6',
                          shadowColor: '#000',
                          shadowOffset: { width: 0, height: 2 },
                          shadowOpacity: 0.1,
                          shadowRadius: 4,
                          elevation: 3
                        }}>
                          <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 10 }}>
                            <Ionicons name="information-circle" size={18} color="#93C5FD" />
                          <Text style={{ 
                            fontSize: getAlertFontSize() - 1, 
                            fontWeight: '600', 
                            color: '#93C5FD',
                            marginLeft: 8,
                            flex: 1,
                            fontFamily: Platform.OS === 'ios' ? 'Arial' : 'Roboto'
                          }}>
                            {t('tafsirLanguageSupportMessage', currentLanguage)}
                          </Text>
                          </View>
                          <Text style={{ 
                            fontSize: getAlertFontSize(), 
                            lineHeight: getAlertFontSize() + 6, 
                            color: '#DBEAFE',
                            textAlign: 'left',
                            fontFamily: Platform.OS === 'ios' ? 'Arial' : 'Roboto'
                          }}>
                            {message}
                          </Text>
                        </View>
                      );
                    } else if (paragraph.startsWith('## ')) {
                      // This is a header (author name)
                      return (
                        <Text key={index} style={{ 
                          fontSize: 18, 
                          fontWeight: 'bold', 
                          color: '#B0B0B0',
                          marginTop: index > 0 ? 20 : 0,
                          marginBottom: 10,
                          fontFamily: Platform.OS === 'ios' ? 'Arial' : 'Roboto'
                        }}>
                          {paragraph.replace('## ', '')}
                        </Text>
                      );
                    } else if (paragraph === '---') {
                      // This is a separator
                      return (
                        <View key={index} style={{ 
                          height: 1, 
                          backgroundColor: '#2A2A2A', 
                          marginVertical: 15 
                        }} />
                      );
                    } else {
                      // This is regular content
                      return (
                        <Text key={index} style={{ 
                          fontSize: 16, 
                          lineHeight: 24, 
                          color: '#FFFFFF',
                          marginBottom: 12,
                          textAlign: 'justify',
                          fontFamily: Platform.OS === 'ios' ? 'Arial' : 'Roboto'
                        }}>
                          {paragraph}
                        </Text>
                      );
                    }
                  })}
                </View>
              )}
            </View>
          </ScrollView>
          

        </View>
      </Modal>



      {/* Global Search Modal */}
      <Modal visible={showSearchModal} animationType="slide" onRequestClose={() => setShowSearchModal(false)}>
        <View style={{ flex: 1, backgroundColor: '#121212' }}>
          <View style={{ 
            backgroundColor: '#1E1E1E', 
            paddingTop: getAndroidTopPadding(50), 
            paddingBottom: 20, 
            paddingHorizontal: 16,
            borderBottomWidth: 1,
            borderBottomColor: '#2A2A2A'
          }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 16 }}>
              <TouchableOpacity onPress={() => setShowSearchModal(false)}>
                <Ionicons name="close" size={28} color="#fff" />
              </TouchableOpacity>
              <Text style={{ fontWeight: 'bold', fontSize: 20, color: '#fff', marginLeft: 16 }}>
                {t('searchEntireQuran', currentLanguage)}
              </Text>
            </View>
            
            <View style={{
              backgroundColor: '#2A2A2A',
              borderRadius: 12,
              borderWidth: 1,
              borderColor: '#333333',
            }}>
              <TextInput
                style={{ 
                  padding: 16, 
                  fontSize: 16, 
                  color: '#fff',
                }}
                placeholder={t('searchVersesSurahs', currentLanguage)}
                placeholderTextColor="#B0B0B0"
                value={globalSearchQuery}
                onChangeText={(text) => {
                  setGlobalSearchQuery(text);
                  performGlobalSearch(text);
                }}
                autoFocus
              />
            </View>
            
            <View style={{ flexDirection: 'row', marginTop: 12, gap: 8 }}>
              <View style={{ backgroundColor: '#2A2A2A', borderRadius: 8, paddingHorizontal: 8, paddingVertical: 4 }}>
                <Text style={{ color: '#B0B0B0', fontSize: 12 }}>{t('tryExamples', currentLanguage)}</Text>
                </View>
                        </View>
                      </View>
          
          {searchLoading ? (
            <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
              <ActivityIndicator size="large" color="#B0B0B0" />
              <Text style={{ color: '#B0B0B0', marginTop: 16 }}>{t('search', currentLanguage)}...</Text>
            </View>
          ) : (
            <FlatList
              data={searchResults}
              keyExtractor={(item, index) => `${item.type}-${item.surahNumber}-${item.numberInSurah || index}`}
              renderItem={renderSearchResult}
              contentContainerStyle={{ 
                paddingVertical: 16,
                paddingBottom: Platform.OS === 'android' ? 196 : 16
              }}
              showsVerticalScrollIndicator={false}
              ListEmptyComponent={
                globalSearchQuery.trim() ? (
                  <View style={{ alignItems: 'center', marginTop: 64, marginHorizontal: 32 }}>
                    <Ionicons name="search-outline" size={64} color="#475569" />
                    <Text style={{ textAlign: 'center', color: '#B0B0B0', fontSize: 16, marginTop: 16 }}>
                      {t('noResultsFound', currentLanguage)}
                      </Text>
                    <Text style={{ textAlign: 'center', color: '#B0B0B0', fontSize: 14, marginTop: 8 }}>
                      {t('searchSuggestions', currentLanguage)}
                  </Text>
                </View>
              ) : (
                  <View style={{ alignItems: 'center', marginTop: 64, marginHorizontal: 32 }}>
                    <Ionicons name="search-outline" size={64} color="#475569" />
                    <Text style={{ textAlign: 'center', color: '#B0B0B0', fontSize: 16, marginTop: 16 }}>
                      {t('searchEntireQuran', currentLanguage)}
                    </Text>
                    <Text style={{ textAlign: 'center', color: '#B0B0B0', fontSize: 14, marginTop: 8 }}>
                      {t('searchEntireQuranDescription', currentLanguage)}
                  </Text>
                </View>
                )
              }
              style={{ backgroundColor: '#121212' }}
            />
              )}
        </View>
      </Modal>





      {/* Subscription Modal for Tafsir */}
      <SubscriptionModal
        visible={showSubscriptionModal}
        onClose={() => {
          console.log('🔒 SubscriptionModal: onClose called');
          setShowSubscriptionModal(false);
        }}
        onSubscribeSuccess={handleSubscriptionSuccess}
        feature="tafsir"
      />

      {/* Recording subscription modal removed - recording features moved to Hifdh Helper */}

      {/* Listen & Recite Animated Menu - Above Play Button */}
      {showListenReciteMenu && (
        <>
          <TouchableOpacity
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              zIndex: 1000,
            }}
            activeOpacity={1}
            onPress={() => setShowListenReciteMenu(false)}
          />
          <View style={{
            position: 'absolute',
            bottom: 100,
            right: 20,
            zIndex: 1001,
            backgroundColor: '#1E1E1E',
            borderRadius: 16,
            padding: 16,
            minWidth: 200,
            borderWidth: 1,
            borderColor: '#2A2A2A',
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 4 },
            shadowOpacity: 0.3,
            shadowRadius: 8,
            elevation: 8,
          }}>
            {/* Listen Option */}
            <TouchableOpacity
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'space-between',
                paddingVertical: 16,
                borderBottomWidth: 1,
                borderBottomColor: '#2A2A2A',
              }}
              onPress={async () => {
                setShowListenReciteMenu(false);
                // Start playing the current verse or surah
                if (filteredVerses.length > 0) {
                  const currentVerse = filteredVerses[0];
                  await playAudio(currentVerse);
                }
              }}
              activeOpacity={0.7}
            >
              <Text style={{
                color: '#FFFFFF',
                fontSize: 16,
                fontWeight: '600',
              }}>
                Listen
              </Text>
              <View style={{
                width: 44,
                height: 44,
                borderRadius: 22,
                backgroundColor: '#2A2A2A',
                justifyContent: 'center',
                alignItems: 'center',
              }}>
                <Ionicons name="play" size={20} color="#FFFFFF" />
              </View>
            </TouchableOpacity>

            {/* Recite Option */}
            <TouchableOpacity
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'space-between',
                paddingVertical: 16,
              }}
              onPress={() => {
                setShowListenReciteMenu(false);
                setIsReciteMode(true);
              }}
              activeOpacity={0.7}
            >
              <Text style={{
                color: '#FFFFFF',
                fontSize: 16,
                fontWeight: '600',
              }}>
                Recite
              </Text>
              <View style={{
                width: 44,
                height: 44,
                borderRadius: 22,
                backgroundColor: '#2A2A2A',
                justifyContent: 'center',
                alignItems: 'center',
              }}>
                <Ionicons name="mic-outline" size={20} color="#FFFFFF" />
              </View>
            </TouchableOpacity>
          </View>
        </>
      )}

      {/* API Key Input Modal */}
      <Modal
        visible={showAPIKeyModal}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowAPIKeyModal(false)}
      >
        <View style={{
          flex: 1,
          backgroundColor: 'rgba(0, 0, 0, 0.7)',
          justifyContent: 'center',
          alignItems: 'center',
          padding: 20,
        }}>
          <View style={{
            backgroundColor: '#1E1E1E',
            borderRadius: 16,
            padding: 24,
            width: '100%',
            maxWidth: 400,
            borderWidth: 1,
            borderColor: '#2A2A2A',
          }}>
            <Text style={{
              color: '#FFFFFF',
              fontSize: 20,
              fontWeight: 'bold',
              marginBottom: 8,
            }}>
              OpenAI API Key
            </Text>
            <Text style={{
              color: '#B0B0B0',
              fontSize: 14,
              marginBottom: 16,
            }}>
              Enter your OpenAI API key for AI surah detection:
            </Text>
            <TextInput
              style={{
                backgroundColor: '#2A2A2A',
                borderRadius: 8,
                padding: 12,
                color: '#FFFFFF',
                fontSize: 16,
                marginBottom: 16,
                borderWidth: 1,
                borderColor: '#333333',
              }}
              placeholder="sk-..."
              placeholderTextColor="#666"
              value={apiKeyInput}
              onChangeText={setAPIKeyInput}
              secureTextEntry={true}
              autoCapitalize="none"
            />
            <View style={{ flexDirection: 'row', gap: 12 }}>
              <TouchableOpacity
                style={{
                  flex: 1,
                  backgroundColor: '#475569',
                  borderRadius: 8,
                  padding: 12,
                  alignItems: 'center',
                }}
                onPress={() => {
                  setShowAPIKeyModal(false);
                  setAPIKeyInput('');
                }}
              >
                <Text style={{ color: '#FFFFFF', fontWeight: '600' }}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={{
                  flex: 1,
                  backgroundColor: '#20C997',
                  borderRadius: 8,
                  padding: 12,
                  alignItems: 'center',
                }}
                onPress={async () => {
                  if (apiKeyInput.trim()) {
                    try {
                      await AsyncStorage.setItem('openai_api_key', apiKeyInput.trim());
                      setOpenAIKey(apiKeyInput.trim());
                      setShowAPIKeyModal(false);
                      setAPIKeyInput('');
                      Alert.alert('Success', 'API key saved!');
                    } catch (error) {
                      Alert.alert('Error', 'Failed to save API key');
                    }
                  }
                }}
              >
                <Text style={{ color: '#FFFFFF', fontWeight: '600' }}>Save</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Floating Play Button with Extendable Menu - Hidden, controls moved to bottom navbar */}
      {false && (
      <View style={{
        position: 'absolute',
        bottom: 30,
        right: 20,
        zIndex: 1000,
      }}>
        {/* Extendable Menu */}
        {showFloatingMenu && (
          <View style={{
            position: 'absolute',
            bottom: 0,
            right: 0,
            backgroundColor: '#1A1A1A',
            borderRadius: 35,
            paddingHorizontal: 20,
            paddingLeft: 10,
            paddingVertical: 15,
            borderWidth: 1,
            borderColor: '#333333',
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 4 },
            shadowOpacity: 0.3,
            shadowRadius: 8,
            elevation: 8,
            flexDirection: 'row',
            alignItems: 'center',
            gap: 8,
            minWidth: 390,
          }}>
            {/* Settings Arrow */}
            <TouchableOpacity
              style={{
                width: 40,
                height: 40,
                justifyContent: 'center',
                alignItems: 'center',
              }}
              onPress={() => {
                setShowFloatingMenu(false);
                setShowAdvancedAudioModal(true);
              }}
            >
              <Ionicons name="settings-outline" size={18} color="#B0B0B0" />
            </TouchableOpacity>

            {/* Skip Previous */}
            <TouchableOpacity
              style={{
                width: 40,
                height: 40,
                borderRadius: 20,
                backgroundColor: '#2A2A2A',
                justifyContent: 'center',
                alignItems: 'center',
              }}
              onPress={() => {
                // Skip to previous verse or stop if at beginning
                const currentVerse = playingAyah || currentPlayingVerse || 1;
                if (currentVerse > 1) {
                  const prevVerse = filteredVerses.find(v => v.numberInSurah === currentVerse - 1);
                  if (prevVerse) {
                    setCurrentPlayingVerse(currentVerse - 1);
                    setPlayingAyah(currentVerse - 1);
                    playAudio(prevVerse);
                  }
                } else {
                  // Stop playback if at the beginning
                  setIsPlaying(false);
                  setCurrentPlayingVerse(null);
                  setPlayingAyah(null);
                  if (audio) {
                    audio.stopAsync();
                  }
                }
              }}
            >
              <Ionicons name="play-skip-back" size={18} color="#FFFFFF" />
            </TouchableOpacity>

            {/* Play/Pause */}
            <TouchableOpacity
              style={{
                width: 40,
                height: 40,
                borderRadius: 20,
                backgroundColor: isPlaying ? '#F87171' : '#2A2A2A',
                justifyContent: 'center',
                alignItems: 'center',
              }}
              onPress={async () => {
                if (isPlaying) {
                  // Pause logic
                  console.log('🔄 Pausing audio...');
                  if (audio) {
                    try {
                      await audio.pauseAsync();
                      setIsPlaying(false);
                    } catch (error) {
                      console.log('Error pausing audio:', error);
                      setIsPlaying(false);
                    }
                  } else {
                    setIsPlaying(false);
                  }
                } else {
                  // Play logic - resume or start new
                  console.log('🔄 Starting audio...');
                  if (audio && (playingAyah || currentPlayingVerse)) {
                    // Resume paused audio
                    try {
                      console.log('🔄 Resuming paused audio...');
                      await audio.playAsync();
                      setIsPlaying(true);
                    } catch (error) {
                      console.log('Error resuming audio:', error);
                      // Fallback to restarting from current verse
                      const currentVerse = filteredVerses.find(v => v.numberInSurah === (playingAyah || currentPlayingVerse));
                      if (currentVerse) {
                        playAudio(currentVerse);
                      }
                    }
                  } else {
                    // Start playing entire surah
                    playEntireSurah();
                  }
                }
              }}
            >
              <Ionicons name={isPlaying ? "pause" : "play"} size={18} color="#FFFFFF" />
            </TouchableOpacity>

            {/* Skip Next */}
            <TouchableOpacity
              style={{
                width: 40,
                height: 40,
                borderRadius: 20,
                backgroundColor: '#2A2A2A',
                justifyContent: 'center',
                alignItems: 'center',
              }}
              onPress={() => {
                // Skip to next verse or stop if at end
                const currentVerse = playingAyah || currentPlayingVerse || 1;
                const maxVerse = filteredVerses.length;
                if (currentVerse < maxVerse) {
                  const nextVerse = filteredVerses.find(v => v.numberInSurah === currentVerse + 1);
                  if (nextVerse) {
                    setCurrentPlayingVerse(currentVerse + 1);
                    setPlayingAyah(currentVerse + 1);
                    playAudio(nextVerse);
                  }
                } else {
                  // Stop playback if at the end
                  setIsPlaying(false);
                  setCurrentPlayingVerse(null);
                  setPlayingAyah(null);
                  if (audio) {
                    audio.stopAsync();
                  }
                }
              }}
            >
              <Ionicons name="play-skip-forward" size={18} color="#FFFFFF" />
            </TouchableOpacity>

            {/* Speed Control */}
            <TouchableOpacity
              style={{
                width: 40,
                height: 40,
                borderRadius: 20,
                backgroundColor: '#2A2A2A',
                justifyContent: 'center',
                alignItems: 'center',
              }}
              onPress={() => {
                const speeds = [0.5, 0.75, 1.0, 1.25, 1.5, 1.75];
                const currentIndex = speeds.indexOf(playbackSpeed);
                const nextIndex = (currentIndex + 1) % speeds.length;
                const newSpeed = speeds[nextIndex];
                setPlaybackSpeed(newSpeed);
                
                // Apply speed change to current audio if playing
                if (audio && isPlaying) {
                  audio.setRateAsync(newSpeed, true);
                }
              }}
            >
              <Text style={{ color: '#FFFFFF', fontSize: 11, fontWeight: 'bold' }}>
                {playbackSpeed === 1.0 ? '1x' : `${playbackSpeed}x`}
              </Text>
            </TouchableOpacity>

            {/* Reciter Selection */}
            <TouchableOpacity
              style={{
                width: 60,
                height: 40,
                borderRadius: 20,
                backgroundColor: '#2A2A2A',
                justifyContent: 'center',
                alignItems: 'center',
                paddingHorizontal: 8,
              }}
              onPress={() => {
                // Toggle reciter selection dropdown
                setShowInlineReciterSelection(!showInlineReciterSelection);
              }}
            >
              <Text style={{ color: '#FFFFFF', fontSize: 10, fontWeight: 'bold' }}>
                {availableReciters.find(r => r.id === selectedReciter)?.name?.split(' ').pop() || 'R'}
              </Text>
            </TouchableOpacity>

            {/* Reciter Dropdown */}
            {showInlineReciterSelection && (
              <View style={{
                position: 'absolute',
                bottom: 50,
                right: 0,
                backgroundColor: '#1A1A1A',
                borderRadius: 12,
                padding: 8,
                borderWidth: 1,
                borderColor: '#333333',
                shadowColor: '#000',
                shadowOffset: { width: 0, height: 4 },
                shadowOpacity: 0.3,
                shadowRadius: 8,
                elevation: 8,
                maxHeight: 200,
                minWidth: 150,
              }}>
                <ScrollView showsVerticalScrollIndicator={true}>
                  {availableReciters.map((reciter) => (
                    <TouchableOpacity
                      key={reciter.id}
                      style={{
                        padding: 12,
                        borderBottomWidth: 1,
                        borderBottomColor: '#444444',
                        backgroundColor: selectedReciter === reciter.id ? '#4F46E5' : 'transparent',
                        flexDirection: 'row',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                      }}
                      onPress={() => {
                        setSelectedReciter(reciter.id);
                        setShowInlineReciterSelection(false);
                      }}
                    >
                      <Text style={{ 
                        color: selectedReciter === reciter.id ? '#FFFFFF' : '#B0B0B0', 
                        fontSize: 14,
                        fontWeight: selectedReciter === reciter.id ? 'bold' : 'normal',
                      }}>
                        {reciter.name}
                      </Text>
                      {selectedReciter === reciter.id && (
                        <Ionicons name="checkmark-circle" size={16} color="#FFFFFF" />
                      )}
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>
            )}
          </View>
        )}

        {/* Main Floating Play Button */}
        <TouchableOpacity
          style={{
            backgroundColor: isMemorizationMode ? (isListening ? '#20C997' : '#F87171') : '#2A2A2A',
            width: 70,
            height: 70,
            borderRadius: 35,
            justifyContent: 'center',
            alignItems: 'center',
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 4 },
            shadowOpacity: 0.3,
            shadowRadius: 8,
            elevation: 8,
          }}
          onPress={async () => {
            if (isReciteMode && !isListening) {
              // In recite mode, start recording
              await startContinuousDetection();
            } else if (isReciteMode && isListening) {
              // Stop recording
              await stopContinuousDetection();
              setIsReciteMode(false);
            } else if (!showListenReciteMenu) {
              setShowFloatingMenu(!showFloatingMenu);
            }
          }}
          onLongPress={() => {
            setShowListenReciteMenu(true);
            setShowFloatingMenu(false);
          }}
          delayLongPress={500}
        >
          {isReciteMode ? (
            isProcessing ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : (
              <Ionicons 
                name={isListening ? "mic" : "mic-outline"} 
                size={28} 
                color={isListening ? "#20C997" : "#FFFFFF"} 
              />
            )
          ) : isPlaying && !showFloatingMenu ? (
            <View style={{ 
              flexDirection: 'row', 
              alignItems: 'flex-end', 
              height: 32, 
              gap: 4,
              paddingHorizontal: 6,
              paddingVertical: 3,
            }}>
              {[1, 2, 3, 4, 5].map((bar, index) => (
                <View
                  key={bar}
                  style={{
                    width: 5,
                    borderRadius: 3,
                    height: index % 2 === 0 ? 28 : 16,
                    backgroundColor: '#FFFFFF',
                    transform: [
                      {
                        scaleY: 1 + Math.sin(animationTime / 150 + index * 0.8) * 0.4
                      }
                    ],
                    shadowColor: '#FFFFFF',
                    shadowOffset: { width: 0, height: 0 },
                    shadowOpacity: 0.6,
                    shadowRadius: 4,
                    elevation: 4,
                  }}
                />
              ))}
            </View>
          ) : (
            <Ionicons name={showFloatingMenu ? "close" : "play"} size={28} color="#FFFFFF" />
          )}
        </TouchableOpacity>
      </View>
      )}

      {/* Play Bottom Navbar - Always Visible */}
      {!isListening && (
        <View style={{
          position: 'absolute',
          bottom: 0,
          left: 0,
          right: 0,
          backgroundColor: '#1A1A1A',
          borderTopWidth: 1,
          borderTopColor: '#2A2A2A',
          paddingVertical: 16,
          paddingHorizontal: 16,
          zIndex: 1001,
        }}>
          {/* Bottom Row: Play Controls */}
          {!isReciteMode && (
            <View style={{
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}>
              {/* Settings - 3 Dots */}
              <TouchableOpacity
                style={{
                  width: 32,
                  height: 32,
                  justifyContent: 'center',
                  alignItems: 'center',
                }}
                onPress={() => {
                  setShowAdvancedAudioModal(true);
                }}
              >
                <Ionicons name="ellipsis-horizontal" size={18} color="#B0B0B0" />
              </TouchableOpacity>

              {/* Skip Previous */}
              <TouchableOpacity
                style={{
                  width: 32,
                  height: 32,
                  borderRadius: 16,
                  backgroundColor: '#2A2A2A',
                  justifyContent: 'center',
                  alignItems: 'center',
                }}
                onPress={() => {
                  const currentVerse = playingAyah || currentPlayingVerse || 1;
                  if (currentVerse > 1) {
                    const prevVerse = filteredVerses.find(v => v.numberInSurah === currentVerse - 1);
                    if (prevVerse) {
                      setCurrentPlayingVerse(currentVerse - 1);
                      setPlayingAyah(currentVerse - 1);
                      playAudio(prevVerse);
                    }
                  } else {
                    setIsPlaying(false);
                    setCurrentPlayingVerse(null);
                    setPlayingAyah(null);
                    if (audio) {
                      audio.stopAsync();
                    }
                  }
                }}
              >
                <Ionicons name="play-skip-back" size={16} color="#FFFFFF" />
              </TouchableOpacity>

              {/* Play/Pause */}
              <TouchableOpacity
                style={{
                  width: 48,
                  height: 48,
                  borderRadius: 24,
                  backgroundColor: isPlaying ? '#20C997' : '#2A2A2A',
                  justifyContent: 'center',
                  alignItems: 'center',
                  shadowColor: isPlaying ? '#20C997' : '#2A2A2A',
                  shadowOffset: { width: 0, height: 2 },
                  shadowOpacity: 0.5,
                  shadowRadius: 4,
                  elevation: 4,
                }}
                onPress={async () => {
                  if (isPlaying) {
                    if (audio) {
                      try {
                        await audio.pauseAsync();
                        setIsPlaying(false);
                      } catch (error) {
                        console.log('Error pausing audio:', error);
                        setIsPlaying(false);
                      }
                    } else {
                      setIsPlaying(false);
                    }
                  } else {
                    if (audio && (playingAyah || currentPlayingVerse)) {
                      try {
                        await audio.playAsync();
                        setIsPlaying(true);
                      } catch (error) {
                        const currentVerse = filteredVerses.find(v => v.numberInSurah === (playingAyah || currentPlayingVerse));
                        if (currentVerse) {
                          playAudio(currentVerse);
                        }
                      }
                    } else {
                      playEntireSurah();
                    }
                  }
                }}
                activeOpacity={0.8}
              >
                <Ionicons name={isPlaying ? "pause" : "play"} size={20} color="#FFFFFF" />
              </TouchableOpacity>

              {/* Skip Next */}
              <TouchableOpacity
                style={{
                  width: 32,
                  height: 32,
                  borderRadius: 16,
                  backgroundColor: '#2A2A2A',
                  justifyContent: 'center',
                  alignItems: 'center',
                }}
                onPress={() => {
                  const currentVerse = playingAyah || currentPlayingVerse || 1;
                  const maxVerse = filteredVerses.length;
                  if (currentVerse < maxVerse) {
                    const nextVerse = filteredVerses.find(v => v.numberInSurah === currentVerse + 1);
                    if (nextVerse) {
                      setCurrentPlayingVerse(currentVerse + 1);
                      setPlayingAyah(currentVerse + 1);
                      playAudio(nextVerse);
                    }
                  } else {
                    setIsPlaying(false);
                    setCurrentPlayingVerse(null);
                    setPlayingAyah(null);
                    if (audio) {
                      audio.stopAsync();
                    }
                  }
                }}
              >
                <Ionicons name="play-skip-forward" size={16} color="#FFFFFF" />
              </TouchableOpacity>

              {/* Speed Control */}
              <TouchableOpacity
                style={{
                  width: 32,
                  height: 32,
                  borderRadius: 16,
                  backgroundColor: '#2A2A2A',
                  justifyContent: 'center',
                  alignItems: 'center',
                }}
                onPress={() => {
                  const speeds = [0.5, 0.75, 1.0, 1.25, 1.5, 1.75];
                  const currentIndex = speeds.indexOf(playbackSpeed);
                  const nextIndex = (currentIndex + 1) % speeds.length;
                  const newSpeed = speeds[nextIndex];
                  setPlaybackSpeed(newSpeed);
                  
                  if (audio && isPlaying) {
                    audio.setRateAsync(newSpeed, true);
                  }
                }}
              >
                <Text style={{ color: '#FFFFFF', fontSize: 10, fontWeight: 'bold' }}>
                  {playbackSpeed === 1.0 ? '1x' : `${playbackSpeed}x`}
                </Text>
              </TouchableOpacity>

              {/* Reciter Selection */}
              <View style={{ position: 'relative' }}>
                <TouchableOpacity
                  style={{
                    width: 36,
                    height: 32,
                    borderRadius: 16,
                    backgroundColor: '#2A2A2A',
                    justifyContent: 'center',
                    alignItems: 'center',
                    paddingHorizontal: 6,
                  }}
                  onPress={() => {
                    setShowInlineReciterSelection(!showInlineReciterSelection);
                  }}
                >
                  <Text style={{ color: '#FFFFFF', fontSize: 9, fontWeight: 'bold' }}>
                    {availableReciters.find(r => r.id === selectedReciter)?.name?.split(' ').pop() || 'R'}
                  </Text>
                </TouchableOpacity>

                {/* Reciter Dropdown */}
                {showInlineReciterSelection && (
                  <View style={{
                    position: 'absolute',
                    bottom: 50,
                    right: 0,
                    backgroundColor: '#1A1A1A',
                    borderRadius: 12,
                    padding: 8,
                    borderWidth: 1,
                    borderColor: '#333333',
                    shadowColor: '#000',
                    shadowOffset: { width: 0, height: 4 },
                    shadowOpacity: 0.3,
                    shadowRadius: 8,
                    elevation: 8,
                    maxHeight: 200,
                    minWidth: 150,
                    zIndex: 1002,
                  }}>
                    <ScrollView showsVerticalScrollIndicator={true}>
                      {availableReciters.map((reciter) => (
                        <TouchableOpacity
                          key={reciter.id}
                          style={{
                            padding: 12,
                            borderBottomWidth: 1,
                            borderBottomColor: '#444444',
                            backgroundColor: selectedReciter === reciter.id ? '#4F46E5' : 'transparent',
                            flexDirection: 'row',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                          }}
                          onPress={() => {
                            setSelectedReciter(reciter.id);
                            setShowInlineReciterSelection(false);
                          }}
                        >
                          <Text style={{ 
                            color: selectedReciter === reciter.id ? '#FFFFFF' : '#B0B0B0', 
                            fontSize: 14,
                            fontWeight: selectedReciter === reciter.id ? 'bold' : 'normal',
                          }}>
                            {reciter.name}
                          </Text>
                          {selectedReciter === reciter.id && (
                            <Ionicons name="checkmark-circle" size={16} color="#FFFFFF" />
                          )}
                        </TouchableOpacity>
                      ))}
                    </ScrollView>
                  </View>
                )}
              </View>

              {/* Switch Mode Button */}
              <TouchableOpacity
                style={{
                  paddingHorizontal: 8,
                  paddingVertical: 4,
                }}
                onPress={() => {
                  setIsReciteMode(!isReciteMode);
                }}
                activeOpacity={0.7}
              >
                <Text style={{ 
                  color: '#666', 
                  fontSize: 10, 
                  fontWeight: '500',
                }}>
                  Switch Mode
                </Text>
              </TouchableOpacity>
            </View>
          )}

          {/* Bottom Row: Recite Mode Controls */}
          {isReciteMode && (
            <View style={{
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 12,
            }}>
              {!isListening ? (
                <>
                  <Text style={{
                    color: '#666',
                    fontSize: 12,
                    fontFamily: Platform.OS === 'ios' ? 'Arial' : 'Roboto',
                    fontStyle: 'italic',
                  }}>
                    Click record to start
                  </Text>
                  <TouchableOpacity
                    style={{
                      width: 48,
                      height: 48,
                      borderRadius: 24,
                      backgroundColor: '#20C997',
                      justifyContent: 'center',
                      alignItems: 'center',
                    }}
                    onPress={async () => {
                      await startContinuousDetection();
                    }}
                    activeOpacity={0.8}
                  >
                    <Ionicons name="mic" size={24} color="#FFFFFF" />
                  </TouchableOpacity>
                </>
              ) : (
                <Text style={{
                  color: '#FFFFFF',
                  fontSize: 12,
                  fontFamily: Platform.OS === 'ios' ? 'Arial' : 'Roboto',
                }}>
                  Listening...
                </Text>
              )}
              
              {/* Switch Mode Button */}
              <TouchableOpacity
                style={{
                  paddingHorizontal: 8,
                  paddingVertical: 4,
                }}
                onPress={() => {
                  if (isListening) {
                    stopContinuousDetection();
                  }
                  setIsReciteMode(false);
                }}
                activeOpacity={0.7}
              >
                <Text style={{ 
                  color: '#666', 
                  fontSize: 10, 
                  fontWeight: '500',
                }}>
                  Switch Mode
                </Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      )}

      {/* Recording Bottom Bar */}
      {isListening && (
        <View style={{
          position: 'absolute',
          bottom: 0,
          left: 0,
          right: 0,
          backgroundColor: '#1A1A1A',
          borderTopWidth: 1,
          borderTopColor: '#2A2A2A',
          paddingVertical: 20,
          paddingHorizontal: 16,
          flexDirection: 'row',
          alignItems: 'center',
          minHeight: 80,
          zIndex: 1001,
        }}>
          {/* Recording Indicator & Timer */}
          <View style={{ flexDirection: 'row', alignItems: 'center', marginRight: 16 }}>
            <View style={{
              width: 12,
              height: 12,
              borderRadius: 6,
              backgroundColor: '#F87171',
              marginRight: 8,
            }} />
            <Text style={{ color: '#FFFFFF', fontSize: 14, fontWeight: '600' }}>
              {Math.floor(memorizationRecordingTime / 60).toString().padStart(2, '0')}:
              {(memorizationRecordingTime % 60).toString().padStart(2, '0')}
            </Text>
          </View>

          {/* Live Transcription - Only Arabic Text (no status messages) */}
          <View style={{ flex: 1, marginRight: 12 }}>
            {liveTranscription && liveTranscription.length > 0 ? (
              <Text style={{
                color: '#FFFFFF',
                fontSize: 18,
                fontFamily: Platform.OS === 'ios' ? 'Arial' : 'Roboto',
                textAlign: 'right',
                fontWeight: '500',
                lineHeight: 28,
              }}>
                {liveTranscription}
              </Text>
            ) : null}
          </View>

          {/* Stop Button */}
          <TouchableOpacity
            style={{
              width: 56,
              height: 56,
              borderRadius: 28,
              backgroundColor: '#20C997',
              justifyContent: 'center',
              alignItems: 'center',
              shadowColor: '#20C997',
              shadowOffset: { width: 0, height: 2 },
              shadowOpacity: 0.5,
              shadowRadius: 4,
              elevation: 4,
            }}
            onPress={async () => {
              await stopContinuousDetection();
            }}
            activeOpacity={0.8}
          >
            <View style={{
              width: 20,
              height: 20,
              backgroundColor: '#FFFFFF',
              borderRadius: 2,
            }} />
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
};

export default QuranScreen;