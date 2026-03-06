import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  FlatList,
  SafeAreaView,
  StatusBar,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { auth, firestore } from '../firebase';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { useLanguage } from '../utils/useLanguage';
import { t } from '../utils/translations';

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
  
  return surahName;
};

const SurahSelectionScreen = ({ 
  route, 
  navigation 
}) => {
  // Language support
  const { currentLanguage } = useLanguage();
  
  const { 
    surahs, 
    userRecordings, 
    setUserRecordings,
  } = route.params || {};

  const [loading, setLoading] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);
  const [localUserRecordings, setLocalUserRecordings] = useState(userRecordings || {});
  const [localSurahs, setLocalSurahs] = useState(surahs || []);
  
  // Create a setUserRecordings function if not provided
  const updateUserRecordings = setUserRecordings || ((recordings) => {
    setLocalUserRecordings(recordings);
  });

  // Load surahs if not provided
  useEffect(() => {
    const loadSurahs = async () => {
      if (localSurahs.length === 0) {
        try {
          setLoading(true);
          const response = await fetch('https://api.alquran.cloud/v1/surah');
          const data = await response.json();
          if (data.code === 200 && data.data) {
            setLocalSurahs(data.data);
          }
        } catch (error) {
          console.error('Error loading surahs:', error);
        } finally {
          setLoading(false);
        }
      }
    };
    loadSurahs();
  }, []);

  // Real-time listener for user recordings
  useEffect(() => {
    const user = auth.currentUser;
    if (!user) {
      // Clear recordings if no user is logged in
      setLocalUserRecordings({});
      updateUserRecordings({});
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
      
      setLocalUserRecordings(recordings);
      updateUserRecordings(recordings); // Update global state
    }, (error) => {
      console.error('Error fetching recordings:', error);
      // If there's a permission error, it likely means the user logged out
      if (error.code === 'permission-denied') {
        console.log('Permission denied - user likely logged out, clearing recordings');
        setLocalUserRecordings({});
        updateUserRecordings({});
      }
    });

    return unsubscribe;
  }, [auth.currentUser?.uid, updateUserRecordings]);

  // Refresh data when screen comes into focus
  const refreshData = useCallback(() => {
    setRefreshKey(prev => prev + 1);
  }, []);

  useEffect(() => {
    const unsubscribe = navigation.addListener('focus', () => {
      refreshData();
    });

    return unsubscribe;
  }, [navigation, refreshData]);

  // Check if verse is already recorded
  const isVerseRecorded = (surahNumber, verseNumber) => {
    return localUserRecordings[`${surahNumber}_${verseNumber}`] !== undefined;
  };

  // Check if surah is completely recorded
  const isSurahRecorded = (surahNumber) => {
    const surah = localSurahs.find(s => s.number === surahNumber);
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
    const surah = localSurahs.find(s => s.number === surahNumber);
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
    setLoading(true);
    
    try {
      // Fetch verses for the selected surah
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

        // Navigate to verse selection screen
        navigation.navigate('VerseSelectionScreen', {
          surah: surah,
          verses: verses,
          surahs: localSurahs,
          userRecordings: localUserRecordings,
          setUserRecordings: updateUserRecordings,
        });
      } else {
        Alert.alert('Error', 'Failed to load verses for this surah.');
      }
    } catch (error) {
      console.error('Error fetching verses:', error);
      Alert.alert('Error', 'Failed to load verses. Please check your connection and try again.');
    } finally {
      setLoading(false);
    }
  };

  // Render surah item with progress indicator
  const renderSurahItem = ({ item }) => {
    if (!item || typeof item !== 'object') {
      console.warn('Invalid surah item:', item);
      return null;
    }

    const progress = getSurahRecordingProgress(item.number);
    const isComplete = isSurahRecorded(item.number);
    const hasRecordings = progress > 0;

    return (
      <TouchableOpacity
        style={{ 
          padding: 20, 
          borderBottomWidth: 1, 
          borderColor: '#2A2A2A', 
          backgroundColor: '#1E1E1E',
          marginHorizontal: 16,
          marginVertical: 4,
          borderRadius: 12,
        }}
        onPress={() => handleSurahSelection(item)}
        disabled={loading}
      >
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
          <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center' }}>
            {/* Progress Circle */}
            <View style={{ 
              width: 40, 
              height: 40, 
              borderRadius: 20, 
              borderWidth: 2,
              borderColor: isComplete ? '#34D399' : hasRecordings ? '#F87171' : '#4B5563',
              backgroundColor: 'transparent',
              justifyContent: 'center',
              alignItems: 'center',
              marginRight: 16,
            }}>
              {isComplete ? (
                <Ionicons name="checkmark" size={20} color="#34D399" />
              ) : hasRecordings ? (
                <Text style={{ 
                  color: '#F87171', 
                  fontSize: 12, 
                  fontWeight: 'bold' 
                }}>
                  {progress}%
                </Text>
              ) : (
                <View style={{ 
                  width: 8, 
                  height: 8, 
                  borderRadius: 4, 
                  backgroundColor: '#4B5563' 
                }} />
              )}
            </View>

            {/* Surah Info */}
            <View style={{ flex: 1 }}>
              <Text style={{ 
                fontWeight: 'bold', 
                color: '#FFFFFF',
                fontSize: 16,
              }}>
                {item.englishName || 'Unknown'}
              </Text>
              <Text style={{ 
                color: '#B0B0B0',
                marginTop: 4,
                marginRight: 50, // Add margin to prevent overlap with surah number
              }}>
                {getProperSurahName(item.number, currentLanguage)} • {item.revelationType || ''} • {item.numberOfAyahs || 0} ayahs
              </Text>
            </View>
          </View>

          {/* Surah Number */}
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

        {/* Progress Bar */}
        {hasRecordings && (
          <View style={{ 
            marginTop: 12, 
            height: 4, 
            backgroundColor: '#374151', 
            borderRadius: 2,
            overflow: 'hidden',
          }}>
            <View style={{ 
              height: '100%', 
              backgroundColor: isComplete ? '#34D399' : '#F87171',
              width: `${progress}%`,
              borderRadius: 2,
            }} />
          </View>
        )}
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#000000' }}>
      <StatusBar barStyle="light-content" backgroundColor="#000000" />
      
      {/* Header */}
      <LinearGradient
        colors={['#1E1E1E', '#2A2A2A']}
        style={{
          paddingTop: 20,
          paddingBottom: 20,
          paddingHorizontal: 20,
          borderBottomWidth: 1,
          borderBottomColor: '#2A2A2A',
        }}
      >
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
            <Ionicons name="arrow-back" size={20} color="#fff" />
          </TouchableOpacity>
          <Text style={{ 
            fontWeight: '600', 
            fontSize: 18, 
            color: '#fff',
            letterSpacing: 0.5,
          }}>
            {t('chooseASurah', currentLanguage)}
          </Text>
          <View style={{ width: 40 }} />
        </View>
        
        <Text style={{ 
          color: 'rgba(255,255,255,0.7)', 
          fontSize: 14, 
          marginTop: 8,
          textAlign: 'center',
        }}>
          {t('selectSurahAndRecord', currentLanguage)}
        </Text>
      </LinearGradient>

      {/* Surah List */}
      <FlatList
        data={localSurahs}
        renderItem={renderSurahItem}
        keyExtractor={(item) => item.number.toString()}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingVertical: 16 }}
        extraData={refreshKey}
        ListHeaderComponent={
          <View style={{ 
            paddingHorizontal: 20, 
            paddingBottom: 16,
            alignItems: 'center',
            justifyContent: 'center',
          }}>
            <Text style={{ 
              color: '#B0B0B0', 
              fontSize: 16, 
              fontWeight: '500' 
            }}>
              {localSurahs.length} {t('surahsAvailable', currentLanguage)}
            </Text>
          </View>
        }
      />

      {/* Loading Overlay */}
      {loading && (
        <View style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0,0,0,0.7)',
          justifyContent: 'center',
          alignItems: 'center',
        }}>
          <View style={{
            backgroundColor: '#1E1E1E',
            borderRadius: 16,
            padding: 24,
            alignItems: 'center',
          }}>
            <ActivityIndicator size="large" color="#34D399" />
            <Text style={{ 
              color: '#FFFFFF', 
              marginTop: 16, 
              fontSize: 16,
              fontWeight: '500',
            }}>
              {t('loading', currentLanguage)}
            </Text>
          </View>
        </View>
      )}
    </SafeAreaView>
  );
};

export default SurahSelectionScreen; 