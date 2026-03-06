import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  FlatList,
  ActivityIndicator,
  StatusBar,
  SafeAreaView,
  Modal,
  Alert,
  ScrollView,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useLanguage } from '../utils/useLanguage';
import { t } from '../utils/translations';
import { 
  getResponsiveFontSize, 
  getResponsiveLineHeight, 
  getResponsivePadding,
  getResponsiveTextStyle,
  getResponsiveCardStyle,
  getResponsiveBadgeStyle
} from '../utils/languageResponsiveSizing';
import { 
  fetchAvailableEditions as fetchEditionsAPI, 
  fetchHadithCollection as fetchCollectionAPI, 
  getMajorCollectionsForLanguage,
  getEditionId,
  isLanguageSupported,
  getLanguageSupportInfo
} from '../services/multilingualHadithService';
import streakService from '../services/streakService';

const HadithScreen = ({ navigation, route }) => {
  // Language support
  const { currentLanguage } = useLanguage();
  
  const [hadithCollection, setHadithCollection] = useState([]);
  const [filteredHadith, setFilteredHadith] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [sortBy, setSortBy] = useState('collection');
  const [showSortModal, setShowSortModal] = useState(false);
  const [availableEditions, setAvailableEditions] = useState([]);
  const [selectedHadith, setSelectedHadith] = useState(null);
  const [showHadithModal, setShowHadithModal] = useState(false);
  const [loadingProgress, setLoadingProgress] = useState(0);
  const [currentCollection, setCurrentCollection] = useState('');
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [languageSupportMessage, setLanguageSupportMessage] = useState(null);
  const [searchTimeout, setSearchTimeout] = useState(null);
  const [ignoreNavigationParams, setIgnoreNavigationParams] = useState(false);
  const [closeButtonPressCount, setCloseButtonPressCount] = useState(0);
  const [displayedHadithCount, setDisplayedHadithCount] = useState(50); // Start with 50 hadiths
  const [hasMoreHadith, setHasMoreHadith] = useState(true);
  const scrollViewRef = useRef(null);

  // Hadith API configuration
  const HADITH_API_BASE = 'https://cdn.jsdelivr.net/gh/fawazahmed0/hadith-api@1';

  // Major hadith collections to fetch - dynamic based on language
  const [majorCollections, setMajorCollections] = useState([]);

  const sortOptions = [
    { id: 'collection', name: t('byCollection', currentLanguage), icon: 'library-outline' },
    { id: 'narrator', name: t('byNarrator', currentLanguage), icon: 'person-outline' },
    { id: 'theme', name: t('byTheme', currentLanguage), icon: 'list-outline' },
    { id: 'length', name: t('byLength', currentLanguage), icon: 'resize-outline' },
    { id: 'grade', name: t('byGrade', currentLanguage), icon: 'checkmark-circle-outline' },
  ];

  // Update major collections when language changes
  useEffect(() => {
    const collections = getMajorCollectionsForLanguage(currentLanguage);
    setMajorCollections(collections);
    
    // Check language support and set message
    const supportInfo = getLanguageSupportInfo(currentLanguage);
    const currentSupport = supportInfo[currentLanguage];
    if (currentSupport && !currentSupport.supported) {
      setLanguageSupportMessage(currentSupport.message);
    } else {
      setLanguageSupportMessage(null);
    }
  }, [currentLanguage]);

  // Reload hadith when language changes or when a specific book is selected
  useEffect(() => {
    if (majorCollections.length > 0) {
      const selectedBookId = route?.params?.selectedBook || 'all';
      fetchHadithCollection(selectedBookId);
    }
  }, [currentLanguage, majorCollections, route?.params?.selectedBook]);

  // Fetch available editions from the API
  const fetchAvailableEditions = async () => {
    try {
      console.log('📚 Fetching available hadith editions...');
      const editions = await fetchEditionsAPI();
      setAvailableEditions(editions);
      return editions;
    } catch (error) {
      console.error('❌ Error fetching editions:', error);
      return {};
    }
  };

  // Fetch hadith collection from a specific book
  const fetchHadithCollection = async (selectedBookId = null) => {
    try {
      setLoading(true);
      setError(null);
      setLoadingProgress(0);
      setCurrentCollection('');

      // First fetch available editions
      const editions = await fetchAvailableEditions();
      
      let allHadith = [];
      let hadithId = 1;

      // If a specific book is selected, only load that book
      if (selectedBookId && selectedBookId !== 'all') {
        const selectedCollection = majorCollections.find(col => col.id === selectedBookId);
        if (selectedCollection) {
          console.log(`📚 Loading ${selectedCollection.name}...`);
          setCurrentCollection(selectedCollection.name);
          setLoadingProgress(50);
          
          // Fetch the specific collection using multilingual service
          const collectionData = await fetchCollectionAPI(selectedCollection.id, currentLanguage);
          
          if (collectionData && collectionData.hadiths && Array.isArray(collectionData.hadiths)) {
            console.log(`✅ ${selectedCollection.name}: ${collectionData.hadiths.length} hadiths`);
            
            // Process hadiths in smaller batches for better performance
            const BATCH_SIZE = 25;
            const hadithsToProcess = collectionData.hadiths; // Process all hadiths
            
            for (let j = 0; j < hadithsToProcess.length; j += BATCH_SIZE) {
              const batch = hadithsToProcess.slice(j, j + BATCH_SIZE);
              const formattedBatch = batch.map((hadith, index) => ({
                id: hadithId++,
                collection: selectedCollection.name,
                collectionAr: selectedCollection.nameAr,
                book: selectedCollection.id,
                number: hadith.hadithnumber || hadith.number || (j + index + 1),
                category: mapCategoryFromContent(hadith.text || hadith.english || hadith.translation || hadith.hadith || ''),
                narrator: extractNarrator(hadith.text || hadith.english || hadith.translation || hadith.hadith || '') || 'Sahaba',
                arabic: hadith.arabic || '',
                english: hadith.text || hadith.english || hadith.translation || hadith.hadith || 'Hadith text not available',
                urdu: hadith.urdu || '',
                theme: extractTheme(hadith.text || hadith.english || hadith.translation || hadith.hadith || ''),
                grade: hadith.grade || determineGrade(selectedCollection.name),
                explanation: generateExplanation(hadith.text || hadith.english || hadith.translation || hadith.hadith || ''),
                chapter: hadith.chapter_title || hadith.chapter || null,
                section: hadith.section || null,
                bookSlug: selectedCollection.id,
                reference: `${selectedCollection.name} ${hadith.hadithnumber || (j + index + 1)}`,
              }));

              // Add batch to collection
              allHadith.push(...formattedBatch);
              
              // Update UI every 2 batches to reduce UI updates
              if (j % (BATCH_SIZE * 2) === 0) {
                setHadithCollection([...allHadith]);
                setFilteredHadith([...allHadith]);
              }
            }
            
            // Final update with sorting
            const sortedHadith = sortHadiths(allHadith);
            setHadithCollection(sortedHadith);
            setFilteredHadith(sortedHadith);
            setLoadingProgress(100);
          } else {
            console.warn(`⚠️ No hadiths found for ${selectedCollection.name}`);
            // Show empty state
            setHadithCollection([]);
            setFilteredHadith([]);
          }
        } else {
          console.warn(`⚠️ Collection ${selectedBookId} not found`);
          setHadithCollection([]);
          setFilteredHadith([]);
        }
      } else {
        // Load curated collection for "all" or no specific book
        console.log('📝 Loading curated collection...');
        setCurrentCollection('Curated Collection');
        const curatedHadith = getCuratedHadithCollection(hadithId);
        allHadith.push(...curatedHadith);
        
        const sortedHadith = sortHadiths(allHadith);
        setHadithCollection(sortedHadith);
        setFilteredHadith(sortedHadith);
        setLoadingProgress(100);
      }
      
      setLoading(false);
      setIsLoadingMore(false);
      
    } catch (error) {
      console.error('❌ Error fetching hadith collection:', error);
      setError(error.message);
      setLoading(false);
      setIsLoadingMore(false);
    }
  };

  // Helper function to determine hadith grade based on collection
  const determineGrade = (collectionName) => {
    if (collectionName.includes('Bukhari') || collectionName.includes('Muslim')) {
      return 'Sahih';
    }
    if (collectionName.includes('Tirmidhi') || collectionName.includes('Abu Dawood')) {
      return 'Hasan';
    }
    return 'Authentic';
  };

  // Remove duplicate hadiths based on text similarity
  const removeDuplicateHadiths = (hadiths) => {
    const seen = new Set();
    return hadiths.filter(hadith => {
      const key = hadith.english.substring(0, 100).toLowerCase().trim();
      if (seen.has(key)) {
        return false;
      }
      seen.add(key);
      return true;
    });
  };

  // Map content to appropriate category (optimized)
  const mapCategoryFromContent = useCallback((content) => {
    if (!content || content.length < 10) return 'all';
    
    const lowerContent = content.toLowerCase();
    
    // Use more efficient string matching
    if (lowerContent.includes('prayer') || lowerContent.includes('salah')) return 'prayer';
    if (lowerContent.includes('faith') || lowerContent.includes('allah')) return 'faith';
    if (lowerContent.includes('character') || lowerContent.includes('moral')) return 'character';
    if (lowerContent.includes('knowledge') || lowerContent.includes('learn')) return 'knowledge';
    if (lowerContent.includes('charity') || lowerContent.includes('zakat')) return 'charity';
    if (lowerContent.includes('family') || lowerContent.includes('parent')) return 'family';
    if (lowerContent.includes('business') || lowerContent.includes('trade')) return 'business';
    if (lowerContent.includes('society') || lowerContent.includes('community')) return 'society';
    
    return 'all';
  }, []);

  // Extract theme from hadith content (optimized)
  const extractTheme = useCallback((content) => {
    if (!content || content.length < 10) return 'General Guidance';
    
    const lowerContent = content.toLowerCase();
    
    // Prayer and Worship
    if (lowerContent.includes('prayer') || lowerContent.includes('worship') || 
        lowerContent.includes('salah') || lowerContent.includes('namaz') ||
        lowerContent.includes('fajr') || lowerContent.includes('dhuhr') ||
        lowerContent.includes('asr') || lowerContent.includes('maghrib') ||
        lowerContent.includes('isha') || lowerContent.includes('qibla') ||
        lowerContent.includes('mosque') || lowerContent.includes('masjid')) {
      return 'Prayer and Worship';
    }
    
    // Faith and Belief
    if (lowerContent.includes('faith') || lowerContent.includes('belief') ||
        lowerContent.includes('iman') || lowerContent.includes('islam') ||
        lowerContent.includes('allah') || lowerContent.includes('god') ||
        lowerContent.includes('quran') || lowerContent.includes('prophet') ||
        lowerContent.includes('muhammad') || lowerContent.includes('messenger')) {
      return 'Faith and Belief';
    }
    
    // Character and Morals
    if (lowerContent.includes('character') || lowerContent.includes('moral') ||
        lowerContent.includes('honesty') || lowerContent.includes('truth') ||
        lowerContent.includes('patience') || lowerContent.includes('sabr') ||
        lowerContent.includes('kindness') || lowerContent.includes('mercy') ||
        lowerContent.includes('forgiveness') || lowerContent.includes('humility') ||
        lowerContent.includes('modesty') || lowerContent.includes('good deed')) {
      return 'Character and Morals';
    }
    
    // Knowledge and Learning
    if (lowerContent.includes('knowledge') || lowerContent.includes('learn') ||
        lowerContent.includes('study') || lowerContent.includes('wisdom') ||
        lowerContent.includes('understanding') || lowerContent.includes('scholar') ||
        lowerContent.includes('teacher') || lowerContent.includes('student') ||
        lowerContent.includes('book') || lowerContent.includes('reading')) {
      return 'Knowledge and Learning';
    }
    
    // Charity and Giving
    if (lowerContent.includes('charity') || lowerContent.includes('giving') ||
        lowerContent.includes('zakat') || lowerContent.includes('sadaqah') ||
        lowerContent.includes('poor') || lowerContent.includes('needy') ||
        lowerContent.includes('help') || lowerContent.includes('assist') ||
        lowerContent.includes('wealth') || lowerContent.includes('money') ||
        lowerContent.includes('donation') || lowerContent.includes('alms')) {
      return 'Charity and Giving';
    }
    
    // Family and Relationships
    if (lowerContent.includes('family') || lowerContent.includes('parent') ||
        lowerContent.includes('mother') || lowerContent.includes('father') ||
        lowerContent.includes('child') || lowerContent.includes('son') ||
        lowerContent.includes('daughter') || lowerContent.includes('wife') ||
        lowerContent.includes('husband') || lowerContent.includes('marriage') ||
        lowerContent.includes('divorce') || lowerContent.includes('relatives')) {
      return 'Family and Relationships';
    }
    
    // Business and Ethics
    if (lowerContent.includes('business') || lowerContent.includes('trade') ||
        lowerContent.includes('buy') || lowerContent.includes('sell') ||
        lowerContent.includes('money') || lowerContent.includes('wealth') ||
        lowerContent.includes('transaction') || lowerContent.includes('contract') ||
        lowerContent.includes('debt') || lowerContent.includes('interest') ||
        lowerContent.includes('usury') || lowerContent.includes('profit')) {
      return 'Business and Ethics';
    }
    
    // Health and Medicine
    if (lowerContent.includes('health') || lowerContent.includes('medicine') ||
        lowerContent.includes('illness') || lowerContent.includes('sick') ||
        lowerContent.includes('cure') || lowerContent.includes('treatment') ||
        lowerContent.includes('doctor') || lowerContent.includes('healing') ||
        lowerContent.includes('fever') || lowerContent.includes('pain')) {
      return 'Health and Medicine';
    }
    
    // Food and Diet
    if (lowerContent.includes('food') || lowerContent.includes('eat') ||
        lowerContent.includes('drink') || lowerContent.includes('meal') ||
        lowerContent.includes('bread') || lowerContent.includes('meat') ||
        lowerContent.includes('fruit') || lowerContent.includes('water') ||
        lowerContent.includes('hunger') || lowerContent.includes('thirst') ||
        lowerContent.includes('fasting') || lowerContent.includes('ramadan')) {
      return 'Food and Diet';
    }
    
    // Death and Afterlife
    if (lowerContent.includes('death') || lowerContent.includes('die') ||
        lowerContent.includes('grave') || lowerContent.includes('funeral') ||
        lowerContent.includes('paradise') || lowerContent.includes('hell') ||
        lowerContent.includes('judgment') || lowerContent.includes('resurrection') ||
        lowerContent.includes('angel') || lowerContent.includes('jinn')) {
      return 'Death and Afterlife';
    }
    
    // Community and Society
    if (lowerContent.includes('community') || lowerContent.includes('society') ||
        lowerContent.includes('neighbor') || lowerContent.includes('friend') ||
        lowerContent.includes('brother') || lowerContent.includes('sister') ||
        lowerContent.includes('ummah') || lowerContent.includes('nation') ||
        lowerContent.includes('leader') || lowerContent.includes('ruler')) {
      return 'Community and Society';
    }
    
    // Repentance and Forgiveness
    if (lowerContent.includes('repent') || lowerContent.includes('forgive') ||
        lowerContent.includes('sin') || lowerContent.includes('mistake') ||
        lowerContent.includes('regret') || lowerContent.includes('atonement') ||
        lowerContent.includes('pardon') || lowerContent.includes('mercy')) {
      return 'Repentance and Forgiveness';
    }
    
    // Patience and Perseverance
    if (lowerContent.includes('patience') || lowerContent.includes('perseverance') ||
        lowerContent.includes('endurance') || lowerContent.includes('trial') ||
        lowerContent.includes('difficulty') || lowerContent.includes('hardship') ||
        lowerContent.includes('test') || lowerContent.includes('challenge')) {
      return 'Patience and Perseverance';
    }
    
    // Gratitude and Thankfulness
    if (lowerContent.includes('gratitude') || lowerContent.includes('thankful') ||
        lowerContent.includes('thanks') || lowerContent.includes('blessing') ||
        lowerContent.includes('grateful') || lowerContent.includes('appreciate')) {
      return 'Gratitude and Thankfulness';
    }
    
    return 'General Guidance';
  }, []);

  // Generate explanation for hadith (optimized)
  const generateExplanation = useCallback((content) => {
    if (!content || content.length < 50) return 'This hadith provides guidance for Muslim conduct.';
    
    // Use a simple, consistent explanation instead of random selection
    return 'This hadith provides valuable guidance for Muslim conduct and spiritual practice.';
  }, []);

  // Extract narrator from hadith text (optimized)
  const extractNarrator = useCallback((text) => {
    if (!text || text.length < 10) return 'Sahaba (RA)';
    
    // Simplified narrator extraction
    if (text.includes('Abu Huraira')) return 'Abu Huraira (RA)';
    if (text.includes('Aisha')) return 'Aisha (RA)';
    if (text.includes('Umar')) return 'Umar ibn al-Khattab (RA)';
    if (text.includes('Ali')) return 'Ali ibn Abi Talib (RA)';
    if (text.includes('Anas')) return 'Anas ibn Malik (RA)';
    
    return 'Sahaba (RA)';
  }, []);

  // Get curated hadith collection as backup
  const getCuratedHadithCollection = (startId) => {
    return [
      {
        id: startId,
        collection: 'Sahih al-Bukhari',
        collectionAr: 'صحيح البخاري',
        book: 'eng-bukhari',
        number: 1,
        category: 'faith',
        narrator: 'Umar ibn al-Khattab (RA)',
        arabic: 'إِنَّمَا الأَعْمَالُ بِالنِّيَّاتِ وَإِنَّمَا لِكُلِّ امْرِئٍ مَا نَوَى',
        english: 'Actions are but by intention and every man shall have only that which he intended.',
        theme: 'Intention and Sincerity',
        grade: 'Sahih',
        explanation: 'This fundamental hadith teaches that the value of actions lies in the intention behind them.',
        reference: 'Sahih al-Bukhari 1'
      },
      {
        id: startId + 1,
        collection: 'Sahih Muslim',
        collectionAr: 'صحيح مسلم',
        book: 'eng-muslim',
        number: 99,
        category: 'character',
        narrator: 'Abu Huraira (RA)',
        arabic: 'مَن كَانَ يُؤْمِنُ بِاللَّهِ وَالْيَوْمِ الآخِرِ فَلْيَقُلْ خَيْراً أَوْ لِيَصْمُتْ',
        english: 'Whoever believes in Allah and the Last Day should speak good or remain silent.',
        theme: 'Speech and Character',
        grade: 'Sahih',
        explanation: 'This hadith emphasizes the importance of speaking only good words or maintaining silence.',
        reference: 'Sahih Muslim 99'
      },
      {
        id: startId + 2,
        collection: 'Jami At-Tirmidhi',
        collectionAr: 'جامع الترمذي',
        book: 'eng-tirmidhi',
        number: 1162,
        category: 'knowledge',
        narrator: 'Anas ibn Malik (RA)',
        arabic: 'اطْلُبُوا الْعِلْمَ مِنَ الْمَهْدِ إِلَى اللَّحْدِ',
        english: 'Seek knowledge from the cradle to the grave.',
        theme: 'Knowledge Seeking',
        grade: 'Hasan',
        explanation: 'Islam encourages continuous learning throughout one\'s entire life.',
        reference: 'Jami At-Tirmidhi 1162'
      },
      {
        id: startId + 3,
        collection: 'Sunan Abu Dawood',
        collectionAr: 'سنن أبي داود',
        book: 'eng-abudawud',
        number: 4031,
        category: 'society',
        narrator: 'Abdullah ibn Umar (RA)',
        arabic: 'الْمُسْلِمُ أَخُو الْمُسْلِمِ لاَ يَظْلِمُهُ وَلاَ يُسْلِمُهُ',
        english: 'A Muslim is the brother of another Muslim. He does not oppress him, nor does he leave him at the mercy of others.',
        theme: 'Brotherhood and Justice',
        grade: 'Sahih',
        explanation: 'This hadith establishes the foundation of Muslim brotherhood and mutual support.',
        reference: 'Sunan Abu Dawood 4031'
      },
      {
        id: startId + 4,
        collection: 'Sunan Ibn Majah',
        collectionAr: 'سنن ابن ماجه',
        book: 'eng-ibnmajah',
        number: 1844,
        category: 'charity',
        narrator: 'Abu Sa\'id al-Khudri (RA)',
        arabic: 'مَا نَقَصَ مَالٌ مِنْ صَدَقَةٍ',
        english: 'No wealth decreases by giving charity.',
        theme: 'Charity and Giving',
        grade: 'Hasan',
        explanation: 'This hadith teaches that charitable giving brings blessings and does not reduce true wealth.',
        reference: 'Sunan Ibn Majah 1844'
      }
    ];
  };

  // Emergency hadith collection if API fails
  const getEmergencyHadithCollection = (startId) => {
    const emergency = getCuratedHadithCollection(startId);
    
    // Add more emergency hadiths
    emergency.push(
      {
        id: startId + 5,
        collection: 'Sahih al-Bukhari',
        collectionAr: 'صحيح البخاري',
        book: 'eng-bukhari',
        number: 6011,
        category: 'character',
        narrator: 'Aisha (RA)',
        arabic: 'إِنَّ اللَّهَ رَفِيقٌ يُحِبُّ الرِّفْقَ فِي الأَمْرِ كُلِّهِ',
        english: 'Allah is gentle and loves gentleness in all matters.',
        theme: 'Gentleness and Kindness',
        grade: 'Sahih',
        explanation: 'This hadith teaches the importance of being gentle and kind in all our dealings.',
        reference: 'Sahih al-Bukhari 6011'
      },
      {
        id: startId + 6,
        collection: 'Sahih Muslim',
        collectionAr: 'صحيح مسلم',
        book: 'eng-muslim',
        number: 2566,
        category: 'prayer',
        narrator: 'Abu Huraira (RA)',
        arabic: 'الدُّعَاءُ مُخُّ الْعِبَادَةِ',
        english: 'Supplication is the essence of worship.',
        theme: 'Prayer and Devotion',
        grade: 'Sahih',
        explanation: 'This hadith emphasizes that making dua (supplication) is central to Islamic worship.',
        reference: 'Sahih Muslim 2566'
      }
    );

    return emergency;
  };


  // Handle search functionality with debouncing
  const handleSearch = useCallback(async (text) => {
    setSearchQuery(text);
    
    // Clear existing timeout
    if (searchTimeout) {
      clearTimeout(searchTimeout);
    }
    
    // Set new timeout for debounced search
    const timeout = setTimeout(async () => {
      if (text.trim() === '') {
        setFilteredHadith(hadithCollection);
        setDisplayedHadithCount(50); // Reset to initial count
        setHasMoreHadith(true);
        return;
      }

      const searchTerm = text.toLowerCase();
      
      // Check if search term is in "book:hadith" format (e.g., "3:3", "1:1")
      const bookHadithMatch = searchTerm.match(/^(\d+):(\d+)$/);
      
      // Mapping from book numbers to book IDs
      const bookNumberToId = {
        '1': 'bukhari',
        '2': 'abudawud',
        '3': 'tirmidhi',
        '4': 'ibnmajah',
        '5': 'nasai',
        '6': 'malik',
        '7': 'qudsi',
        '8': 'nawawi',
        '9': 'dehlawi'
      };

      // If searching by book:hadith format, search through all hadiths
      if (bookHadithMatch) {
        const [, bookNum, hadithNum] = bookHadithMatch;
        const bookId = bookNumberToId[bookNum];
        
        if (bookId) {
          try {
            // Fetch all hadiths from the specific book
            const selectedCollection = majorCollections.find(col => col.id === bookId);
            if (selectedCollection) {
              const collectionData = await fetchCollectionAPI(selectedCollection.id, currentLanguage);
              
              if (collectionData && collectionData.hadiths && Array.isArray(collectionData.hadiths)) {
                // Find the specific hadith by searching through ALL hadiths
                const foundHadith = collectionData.hadiths.find(hadith => {
                  const hadithNumber = hadith.hadithnumber || hadith.number;
                  return hadithNumber && hadithNumber.toString() === hadithNum;
                });
                
                if (foundHadith) {
                  // Format the found hadith
                  const formattedHadith = {
                    id: Date.now(),
                    collection: selectedCollection.name,
                    collectionAr: selectedCollection.nameAr,
                    book: selectedCollection.id,
                    number: foundHadith.hadithnumber || foundHadith.number || 1,
                    category: mapCategoryFromContent(foundHadith.text || foundHadith.english || foundHadith.translation || foundHadith.hadith || ''),
                    narrator: extractNarrator(foundHadith.text || foundHadith.english || foundHadith.translation || foundHadith.hadith || '') || 'Sahaba',
                    arabic: foundHadith.arabic || '',
                    english: foundHadith.text || foundHadith.english || foundHadith.translation || foundHadith.hadith || 'Hadith text not available',
                    urdu: foundHadith.urdu || '',
                    theme: extractTheme(foundHadith.text || foundHadith.english || foundHadith.translation || foundHadith.hadith || ''),
                    grade: foundHadith.grade || determineGrade(selectedCollection.name),
                    explanation: generateExplanation(foundHadith.text || foundHadith.english || foundHadith.translation || foundHadith.hadith || ''),
                    chapter: foundHadith.chapter_title || foundHadith.chapter || null,
                    section: foundHadith.section || null,
                    bookSlug: selectedCollection.id,
                    reference: `${selectedCollection.name} ${foundHadith.hadithnumber || foundHadith.number || 1}`,
                  };
                  
                  setFilteredHadith([formattedHadith]);
                  setDisplayedHadithCount(1);
                  setHasMoreHadith(false);
                  return;
                }
              }
            }
          } catch (error) {
            console.error('Error searching specific hadith:', error);
          }
        }
        
        // If not found, show empty results
        setFilteredHadith([]);
        setDisplayedHadithCount(0);
        setHasMoreHadith(false);
        return;
      }
      
      // For regular text search, search through loaded hadiths
      const filtered = hadithCollection.filter(hadith => {
        return hadith.english.toLowerCase().includes(searchTerm) ||
               hadith.arabic.toLowerCase().includes(searchTerm) ||
               hadith.narrator.toLowerCase().includes(searchTerm) ||
               hadith.theme.toLowerCase().includes(searchTerm) ||
               hadith.collection.toLowerCase().includes(searchTerm) ||
               hadith.reference.toLowerCase().includes(searchTerm) ||
               hadith.number.toString().includes(searchTerm);
      });

      const sortedFiltered = sortHadiths(filtered);
      setFilteredHadith(sortedFiltered);
      setDisplayedHadithCount(Math.min(50, sortedFiltered.length)); // Reset display count
      setHasMoreHadith(sortedFiltered.length > 50);
    }, 500); // Increased debounce to 500ms
    
    setSearchTimeout(timeout);
  }, [hadithCollection, searchTimeout, sortHadiths, majorCollections, currentLanguage]);

  // Handle book filtering


  // Sort hadiths based on current sort option
  const sortHadiths = useCallback((hadiths) => {
    const sorted = [...hadiths];
    
    switch (sortBy) {
      case 'collection':
        return sorted.sort((a, b) => {
          // First sort by collection, then by hadith number
          if (a.collection !== b.collection) {
            return a.collection.localeCompare(b.collection);
          }
          return a.number - b.number;
        });
      case 'narrator':
        return sorted.sort((a, b) => a.narrator.localeCompare(b.narrator));
      case 'theme':
        return sorted.sort((a, b) => a.theme.localeCompare(b.theme));
      case 'length':
        return sorted.sort((a, b) => b.english.length - a.english.length);
      case 'grade':
        return sorted.sort((a, b) => {
          const gradeOrder = { 'Sahih': 1, 'Hasan': 2, 'Daif': 3 };
          return (gradeOrder[a.grade] || 4) - (gradeOrder[b.grade] || 4);
        });
      default:
        return sorted.sort((a, b) => a.number - b.number);
    }
  }, [sortBy]);

  // Clear search
  const clearSearch = useCallback(() => {
    setSearchQuery('');
    setFilteredHadith(hadithCollection);
    setDisplayedHadithCount(50); // Reset to initial count
    setHasMoreHadith(true);
  }, [hadithCollection]);

  // Retry fetch
  const retryFetch = () => {
    fetchHadithCollection();
  };

  // Handle hadith card press
  const handleHadithPress = useCallback((hadith) => {
    setSelectedHadith(hadith);
    setShowHadithModal(true);
    setIgnoreNavigationParams(false); // Reset flag when manually opening hadith
    setCloseButtonPressCount(0); // Reset close button press count
  }, []);

  // Close hadith modal
  const closeHadithModal = useCallback(() => {
    console.log('🔴 Closing hadith modal...');
    
    // Force close the modal immediately
    setShowHadithModal(false);
    setSelectedHadith(null);
    setIgnoreNavigationParams(true); // Ignore future navigation params
    
    // Clear navigation parameters to prevent re-opening
    if (route.params?.highlightHadith) {
      console.log('🔴 Clearing navigation params...');
      navigation.setParams({ highlightHadith: null });
    }
    
    // Reset the ignore flag after a short delay to allow future navigation
    setTimeout(() => {
      setIgnoreNavigationParams(false);
    }, 1000);
  }, [navigation, route.params?.highlightHadith]);

  // Force close modal function as backup
  const forceCloseModal = useCallback(() => {
    console.log('🔴 Force closing modal...');
    setShowHadithModal(false);
    setSelectedHadith(null);
    setIgnoreNavigationParams(true);
  }, []);

  // Scroll to top function
  const scrollToTop = useCallback(() => {
    if (scrollViewRef.current) {
      // For FlatList, use scrollToOffset
      scrollViewRef.current.scrollToOffset({ offset: 0, animated: true });
    }
  }, []);

  // Handle close button press with double-tap fallback
  const handleClosePress = useCallback(() => {
    console.log('🔴 Close button pressed...');
    setCloseButtonPressCount(prev => prev + 1);
    
    // Try normal close first
    closeHadithModal();
    
    // If modal is still open after 500ms, force close
    setTimeout(() => {
      if (showHadithModal) {
        console.log('🔴 Modal still open, force closing...');
        forceCloseModal();
      }
    }, 500);
  }, [closeHadithModal, forceCloseModal, showHadithModal]);

  // Handle navigation parameters for highlighted hadith
  useEffect(() => {
    console.log('🔍 Navigation params effect:', { 
      hasHighlightHadith: !!route.params?.highlightHadith, 
      showHadithModal, 
      hadithCollectionLength: hadithCollection.length,
      ignoreNavigationParams
    });
    
    if (route.params?.highlightHadith && !showHadithModal && !ignoreNavigationParams) {
      console.log('🟡 Opening hadith from navigation params...');
      const { title, arabic, translation, reference, collection, collectionAr, hadithNumber } = route.params.highlightHadith;
      
      // Wait for hadith collection to be loaded
      if (hadithCollection.length === 0) {
        console.log('🟡 Waiting for hadith collection to load...');
        return; // Wait for collection to load
      }
      
      // Find the hadith in the collection
      const foundHadith = hadithCollection.find(hadith => 
        hadith.english === translation || 
        hadith.arabic === arabic || 
        hadith.reference === reference ||
        (hadith.collection === collection && hadith.number === hadithNumber)
      );
      
      if (foundHadith) {
        console.log('🟢 Found hadith, opening modal...');
        // Open the hadith modal immediately
        setSelectedHadith(foundHadith);
        setShowHadithModal(true);
      } else {
        console.log('🟡 Hadith not found, trying partial match...');
        // If exact match not found, try to find by partial match
        const partialMatch = hadithCollection.find(hadith => 
          hadith.english?.toLowerCase().includes(translation?.toLowerCase()) ||
          hadith.reference?.toLowerCase().includes(reference?.toLowerCase())
        );
        
        if (partialMatch) {
          console.log('🟢 Found partial match, opening modal...');
          setSelectedHadith(partialMatch);
          setShowHadithModal(true);
        }
      }
    }
  }, [route.params, hadithCollection, showHadithModal, ignoreNavigationParams]);

  useEffect(() => {
    fetchHadithCollection();
  }, []);

  // Cleanup search timeout on unmount
  useEffect(() => {
    return () => {
      if (searchTimeout) {
        clearTimeout(searchTimeout);
      }
    };
  }, [searchTimeout]);

  // Debug modal state changes
  useEffect(() => {
    console.log('🔍 Modal state changed:', { showHadithModal, selectedHadith: !!selectedHadith });
  }, [showHadithModal, selectedHadith]);

  // Debug pagination state
  useEffect(() => {
    console.log('📊 Pagination state:', { 
      displayedHadithCount, 
      totalFiltered: filteredHadith.length, 
      hasMoreHadith,
      isLoadingMore 
    });
  }, [displayedHadithCount, filteredHadith.length, hasMoreHadith, isLoadingMore]);

  // Memoized displayed hadith for performance
  const displayedHadith = useMemo(() => {
    return filteredHadith.slice(0, displayedHadithCount);
  }, [filteredHadith, displayedHadithCount]);

  // Load more hadith function with debouncing
  const loadMoreHadith = useCallback(() => {
    console.log('🔄 Loading more hadiths...', { 
      hasMoreHadith, 
      isLoadingMore, 
      displayedHadithCount, 
      totalFiltered: filteredHadith.length 
    });
    
    if (hasMoreHadith && !isLoadingMore) {
      setIsLoadingMore(true);
      
      // Simulate a small delay to prevent rapid calls
      setTimeout(() => {
        const newCount = Math.min(displayedHadithCount + 25, filteredHadith.length);
        setDisplayedHadithCount(newCount);
        
        if (newCount >= filteredHadith.length) {
          setHasMoreHadith(false);
          console.log('🔄 No more hadiths to load');
        }
        
        setIsLoadingMore(false);
      }, 300);
    }
  }, [hasMoreHadith, isLoadingMore, displayedHadithCount, filteredHadith.length]);

  // Track daily Hadith visit for streak
  useEffect(() => {
    const trackHadithVisit = async () => {
      try {
        const result = await streakService.recordHadithVisit();
        console.log('📚 HadithScreen: Streak tracking result:', result);
        
        // Optional: Show a small notification if streak increased
        if (result.updated && result.isNewDay && result.isConsecutive) {
          console.log(`📚 HadithScreen: Streak increased to ${result.streak} days!`);
        }
      } catch (error) {
        console.error('📚 HadithScreen: Error tracking visit:', error);
      }
    };
    
    trackHadithVisit();
  }, []); // Run once when component mounts

  // Render hadith card with memoization
  const renderHadithCard = useCallback(({ item }) => {
    // Mapping from book IDs to book numbers
    const bookIdToNumber = {
      'bukhari': '1',
      'abudawud': '2',
      'tirmidhi': '3',
      'ibnmajah': '4',
      'nasai': '5',
      'malik': '6',
      'qudsi': '7',
      'nawawi': '8',
      'dehlawi': '9'
    };
    
    const bookNumber = bookIdToNumber[item.book] || item.book;
    
    return (
      <TouchableOpacity 
        style={styles.hadithCard}
        onPress={() => handleHadithPress(item)}
        activeOpacity={0.7}
      >
        <View style={styles.hadithHeader}>
          <View style={styles.collectionInfo}>
            <Text style={styles.collectionName}>{item.collection}</Text>
            <Text style={styles.hadithNumber}>{bookNumber}:{item.number}</Text>
          </View>
        <View style={styles.gradeContainer}>
          <Text style={[styles.grade, { backgroundColor: item.grade === 'Sahih' ? '#4CAF50' : '#FF9800' }]}>
            {item.grade}
          </Text>
        </View>
      </View>
      
      <Text style={styles.hadithText}>{item.english}</Text>
      
      {item.arabic && (
        <Text style={styles.arabicText}>{item.arabic}</Text>
      )}
      
      <View style={styles.hadithFooter}>
        <View style={styles.narratorInfo}>
          <Ionicons name="person-outline" size={16} color="#B0B0B0" />
          <Text style={styles.narrator}>{item.narrator}</Text>
        </View>
        <Text style={styles.theme}>{item.theme}</Text>
      </View>
    </TouchableOpacity>
    );
  }, []);

  // Render category card with memoization


  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar barStyle="light-content" backgroundColor="#121212" />
          <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#4A90E2" />
          <Text style={styles.loadingText}>Loading Hadith Collection...</Text>
          <Text style={styles.loadingSubtext}>
            {currentCollection ? `Loading ${currentCollection}...` : 'Preparing hadith collection...'}
          </Text>
          {loadingProgress > 0 && (
            <View style={styles.progressContainer}>
              <View style={styles.progressBar}>
                <View style={[styles.progressFill, { width: `${loadingProgress}%` }]} />
              </View>
              <Text style={styles.progressText}>{Math.round(loadingProgress)}%</Text>
            </View>
          )}
          </View>
        </SafeAreaView>
    );
  }

  if (error) {
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar barStyle="light-content" backgroundColor="#121212" />
          <View style={styles.errorContainer}>
          <Ionicons name="alert-circle-outline" size={64} color="#E74C3C" />
          <Text style={styles.errorTitle}>{t('connectionError', currentLanguage)}</Text>
          <Text style={styles.errorMessage}>{error}</Text>
              <TouchableOpacity style={styles.retryButton} onPress={retryFetch}>
                <Text style={styles.retryButtonText}>Try Again</Text>
              </TouchableOpacity>
          </View>
        </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#121212" />
      
      {/* Fixed Header */}
        <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
          </TouchableOpacity>
          <TouchableOpacity onPress={scrollToTop} style={styles.headerTitleContainer}>
            <Text style={styles.headerTitle}>
              {route?.params?.bookNameAr || 'حَدِيث'}
            </Text>
            <Text style={[styles.headerSubtitle, { fontSize: getResponsiveFontSize(route?.params?.bookName || t('hadith', currentLanguage), 12, currentLanguage) }]}>
              {route?.params?.bookName || t('hadith', currentLanguage)}
            </Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={() => navigation.navigate('HadithBookCatalogScreen')} style={styles.catalogButton}>
          <Ionicons name="library" size={24} color="#FFD700" />
        </TouchableOpacity>
          </View>
          
      {/* Language Support Message */}
      {languageSupportMessage && (
        <View style={styles.languageSupportContainer}>
          <Ionicons name="information-circle-outline" size={16} color="#FFA500" />
          <Text style={styles.languageSupportText}>{languageSupportMessage}</Text>
        </View>
      )}
          
      {/* Fixed Search Bar */}
      <View style={styles.searchContainer}>
          <View style={styles.searchInputContainer}>
          <Ionicons name="search" size={20} color="#B0B0B0" style={styles.searchIcon} />
            <TextInput
              style={styles.searchInput}
            placeholder={t('searchHadithsNarratorsThemes', currentLanguage)}
              value={searchQuery}
              onChangeText={handleSearch}
            placeholderTextColor="#666666"
            />
          {searchQuery !== '' && (
              <TouchableOpacity onPress={clearSearch} style={styles.clearButton}>
              <Ionicons name="close-circle" size={20} color="#B0B0B0" />
              </TouchableOpacity>
            )}
          </View>
        </View>


      {/* Hadith List - Main scrollable component with categories inside */}
      <FlatList
        ref={scrollViewRef}
        data={displayedHadith}
        keyExtractor={(item) => `hadith-${item.id}-${item.collection}-${item.number}`}
        renderItem={renderHadithCard}
        contentContainerStyle={styles.listContainer}
        showsVerticalScrollIndicator={false}
        scrollEnabled={true}
        removeClippedSubviews={false}
        maxToRenderPerBatch={10}
        windowSize={10}
        initialNumToRender={15}
        onEndReached={loadMoreHadith}
        onEndReachedThreshold={0.5}
        ListHeaderComponent={() => (
          <>
            {/* Results Info */}
            <View style={styles.resultsInfo}>
              <Text style={styles.resultsText}>
                {filteredHadith.length} {filteredHadith.length === 1 ? t('hadith', currentLanguage) : t('hadiths', currentLanguage)} {t('found', currentLanguage)}
              </Text>
            </View>
          </>
        )}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Ionicons name="library-outline" size={64} color="#666666" />
            <Text style={styles.emptyText}>{t('noHadithsFound', currentLanguage)}</Text>
            <Text style={styles.emptySubtext}>{t('tryAdjustingSearchOrFilters', currentLanguage)}</Text>
          </View>
        }
        ListFooterComponent={
          <>
            {/* Load More Button */}
            {hasMoreHadith && !isLoadingMore && (
              <TouchableOpacity style={styles.loadMoreButton} onPress={loadMoreHadith}>
                <Text style={styles.loadMoreButtonText}>
                  Load More Hadiths ({filteredHadith.length - displayedHadithCount} remaining)
                </Text>
              </TouchableOpacity>
            )}

            {/* Loading More Indicator */}
            {isLoadingMore && (
              <View style={styles.loadingMoreContainer}>
                <ActivityIndicator size="small" color="#4A90E2" />
                <Text style={styles.loadingMoreText}>
                  {t('loadingMoreHadiths', currentLanguage)} {currentCollection && `(${currentCollection})`}
                </Text>
              </View>
            )}

            {/* Bottom padding */}
            <View style={{ height: 20 }} />
          </>
        }
      />

      {/* Full Screen Hadith Modal */}
      <Modal
        visible={showHadithModal}
        animationType="slide"
        onRequestClose={handleClosePress}
        statusBarTranslucent
        presentationStyle="fullScreen"
      >
        <SafeAreaView style={styles.fullScreenContainer}>
          <StatusBar barStyle="light-content" backgroundColor="#121212" />
          
          {/* Header */}
          <View style={styles.fullScreenHeader}>
            <TouchableOpacity onPress={handleClosePress} style={styles.closeButton}>
              <Ionicons name="close" size={28} color="#FFFFFF" />
            </TouchableOpacity>
            <Text style={styles.fullScreenTitle}>{t('hadith', currentLanguage)}</Text>
            <View style={styles.shareButton} />
          </View>

          {selectedHadith && (
            <ScrollView 
              style={styles.fullScreenContent}
              contentContainerStyle={styles.fullScreenScrollContainer}
              showsVerticalScrollIndicator={false}
            >
                {/* Collection Info */}
                <View style={styles.fullScreenCollectionInfo}>
                  <View style={styles.collectionHeader}>
                    <Text style={styles.fullScreenCollectionName}>
                      {selectedHadith.collection}
                    </Text>
                    <View style={styles.fullScreenGrade}>
                      <Text style={[styles.grade, { 
                        backgroundColor: selectedHadith.grade === 'Sahih' ? '#4CAF50' : '#FF9800' 
                      }]}>
                        {selectedHadith.grade}
                      </Text>
                    </View>
                  </View>
                  <Text style={styles.fullScreenReference}>
                    {selectedHadith.reference} • {selectedHadith.theme}
                  </Text>
                </View>

                {/* Arabic Text */}
                {selectedHadith.arabic && (
                  <View style={styles.fullScreenArabicContainer}>
                    <Text style={styles.fullScreenArabicText}>
                      {selectedHadith.arabic}
                    </Text>
                  </View>
                )}

                {/* English Text */}
                <View style={styles.fullScreenEnglishContainer}>
                  <Text style={styles.fullScreenEnglishText}>
                    {selectedHadith.english}
                  </Text>
                </View>

                {/* Narrator Info */}
                <View style={styles.fullScreenNarratorContainer}>
                  <View style={styles.narratorHeader}>
                    <Ionicons name="person-outline" size={20} color="#4A90E2" />
                    <Text style={styles.narratorLabel}>Narrated by</Text>
                  </View>
                  <Text style={styles.fullScreenNarrator}>
                    {selectedHadith.narrator}
                  </Text>
                </View>

                {/* Explanation */}
                {selectedHadith.explanation && (
                  <View style={styles.fullScreenExplanationContainer}>
                    <View style={styles.explanationHeader}>
                      <Ionicons name="bulb-outline" size={20} color="#FFD700" />
                      <Text style={styles.explanationLabel}>Explanation</Text>
                    </View>
                    <Text style={styles.fullScreenExplanation}>
                      {selectedHadith.explanation}
                    </Text>
                  </View>
                )}


              </ScrollView>
            )
          }
        </SafeAreaView>
      </Modal>

        {/* Sort Modal */}
        <Modal
          visible={showSortModal}
          transparent={true}
          animationType="slide"
          onRequestClose={() => setShowSortModal(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{t('sortBy', currentLanguage)}</Text>
                <TouchableOpacity onPress={() => setShowSortModal(false)}>
                <Ionicons name="close" size={24} color="#FFFFFF" />
                </TouchableOpacity>
              </View>
              
              {sortOptions.map((option) => (
                <TouchableOpacity
                  key={option.id}
                  style={[
                    styles.sortOption,
                    sortBy === option.id && styles.selectedSortOption
                  ]}
                  onPress={() => {
                    setSortBy(option.id);
                    setShowSortModal(false);
                  }}
                >
                  <Ionicons 
                    name={option.icon} 
                    size={20} 
                  color={sortBy === option.id ? '#4A90E2' : '#B0B0B0'} 
                  />
                  <Text style={[
                    styles.sortOptionText,
                    sortBy === option.id && styles.selectedSortOptionText
                  ]}>
                    {option.name}
                  </Text>
                  {sortBy === option.id && (
                  <Ionicons name="checkmark" size={20} color="#4A90E2" />
                  )}
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </Modal>
      </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#121212',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 15,
    backgroundColor: '#1E1E1E',
    borderBottomWidth: 1,
    borderBottomColor: '#2A2A2A',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  headerTitleContainer: {
    flexDirection: 'column',
    alignItems: 'center',
  },
  headerSubtitle: {
    fontSize: 12,
    color: '#B0B0B0',
    marginTop: 2,
    letterSpacing: 0.5,
  },
  catalogButton: {
    padding: 8,
    marginRight: 8,
  },
  languageSupportContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#2A2A2A',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#333333',
  },
  languageSupportText: {
    color: '#FFA500',
    fontSize: 12,
    marginLeft: 8,
    flex: 1,
    fontStyle: 'italic',
  },
  searchContainer: {
    padding: 20,
    backgroundColor: '#1E1E1E',
  },
  searchInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#2A2A2A',
    borderRadius: 25,
    paddingHorizontal: 15,
    borderWidth: 1,
    borderColor: '#333333',
  },
  searchIcon: {
    marginRight: 10,
  },
  searchInput: {
    flex: 1,
    paddingVertical: 12,
    fontSize: 16,
    color: '#FFFFFF',
  },
  clearButton: {
    padding: 5,
  },
  resultsInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 10,
    backgroundColor: '#1E1E1E',
  },
  resultsText: {
    fontSize: 14,
    color: '#B0B0B0',
  },

  listContainer: {
    padding: 20,
    backgroundColor: '#121212',
  },
  hadithCard: {
    backgroundColor: '#1E1E1E',
    borderRadius: 12,
    padding: 20,
    marginBottom: 15,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    borderWidth: 1,
    borderColor: '#2A2A2A',
  },
  hadithHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 15,
  },
  collectionInfo: {
    flex: 1,
  },
  collectionName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#4A90E2',
  },
  hadithNumber: {
    fontSize: 12,
    color: '#888888',
    marginTop: 2,
  },
  gradeContainer: {
    alignItems: 'flex-end',
  },
  grade: {
    fontSize: 11,
    fontWeight: 'bold',
    color: '#FFFFFF',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 10,
    overflow: 'hidden',
    backgroundColor: '#23272F',
  },
  hadithText: {
    fontSize: 16,
    lineHeight: 24,
    color: '#FFFFFF',
    marginBottom: 15,
    fontFamily: 'System',
  },
  arabicText: {
    fontSize: 18,
    lineHeight: 28,
    color: '#E8E8E8',
    textAlign: 'right',
    marginBottom: 15,
    fontFamily: Platform.OS === 'ios' ? 'Arial' : 'Roboto',
  },
  hadithFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  narratorInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  narrator: {
    fontSize: 13,
    color: '#B0B0B0',
    marginLeft: 5,
    fontStyle: 'italic',
  },
  theme: {
    fontSize: 12,
    color: '#4A90E2',
    fontWeight: '500',
  },

  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#121212',
  },
  loadingText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#FFFFFF',
    marginTop: 20,
  },
  loadingSubtext: {
    fontSize: 14,
    color: '#B0B0B0',
    marginTop: 10,
    textAlign: 'center',
  },
  progressContainer: {
    marginTop: 20,
    alignItems: 'center',
    width: '80%',
  },
  progressBar: {
    width: '100%',
    height: 6,
    backgroundColor: '#2A2A2A',
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#4A90E2',
    borderRadius: 3,
  },
  progressText: {
    fontSize: 12,
    color: '#B0B0B0',
    marginTop: 8,
  },
  loadingMoreContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 20,
    paddingHorizontal: 20,
  },
  loadingMoreText: {
    fontSize: 14,
    color: '#B0B0B0',
    marginLeft: 10,
  },
  loadMoreButton: {
    backgroundColor: '#4A90E2',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 25,
    marginHorizontal: 20,
    marginVertical: 10,
    alignItems: 'center',
  },
  loadMoreButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#121212',
  },
  errorTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#E74C3C',
    marginTop: 20,
  },
  errorMessage: {
    fontSize: 16,
    color: '#B0B0B0',
    textAlign: 'center',
    marginTop: 10,
    lineHeight: 22,
  },
  retryButton: {
    backgroundColor: '#4A90E2',
    paddingHorizontal: 30,
    paddingVertical: 12,
    borderRadius: 25,
    marginTop: 20,
  },
  retryButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: 60,
    backgroundColor: '#121212',
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#666666',
    marginTop: 15,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#444444',
    marginTop: 5,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#1E1E1E',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    borderWidth: 1,
    borderColor: '#2A2A2A',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  sortOption: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 15,
    paddingHorizontal: 10,
    borderRadius: 10,
    marginBottom: 5,
  },
  selectedSortOption: {
    backgroundColor: '#2A2A2A',
  },
  sortOptionText: {
    fontSize: 16,
    color: '#B0B0B0',
    marginLeft: 15,
    flex: 1,
  },
  selectedSortOptionText: {
    color: '#4A90E2',
    fontWeight: '600',
  },
  // Full Screen Hadith Modal Styles
  fullScreenContainer: {
    flex: 1,
    backgroundColor: '#121212',
  },
  fullScreenHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 15,
    backgroundColor: '#1E1E1E',
    borderBottomWidth: 1,
    borderBottomColor: '#2A2A2A',
  },
  closeButton: {
    padding: 5,
  },
  fullScreenTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  shareButton: {
    padding: 5,
  },
  fullScreenContent: {
    flex: 1,
  },
  fullScreenScrollContainer: {
    padding: 20,
  },
  fullScreenCollectionInfo: {
    marginBottom: 25,
    padding: 20,
    backgroundColor: '#1E1E1E',
    borderRadius: 15,
    borderWidth: 1,
    borderColor: '#2A2A2A',
  },
  collectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  fullScreenCollectionName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#4A90E2',
    flex: 1,
  },
  fullScreenGrade: {
    marginLeft: 10,
  },
  fullScreenReference: {
    fontSize: 14,
    color: '#B0B0B0',
  },
  fullScreenArabicContainer: {
    marginBottom: 25,
    padding: 20,
    backgroundColor: '#1E1E1E',
    borderRadius: 15,
    borderWidth: 1,
    borderColor: '#2A2A2A',
    alignItems: 'center',
  },
  fullScreenArabicText: {
    fontSize: 20,
    lineHeight: 35,
    color: '#FFFFFF',
    textAlign: 'center',
    fontFamily: Platform.OS === 'ios' ? 'Arial' : 'Roboto',
  },
  fullScreenEnglishContainer: {
    marginBottom: 25,
    padding: 20,
    backgroundColor: '#1E1E1E',
    borderRadius: 15,
    borderWidth: 1,
    borderColor: '#2A2A2A',
  },
  fullScreenEnglishText: {
    fontSize: 16,
    lineHeight: 26,
    color: '#FFFFFF',
    textAlign: 'left',
  },
  fullScreenNarratorContainer: {
    marginBottom: 25,
    padding: 20,
    backgroundColor: '#1E1E1E',
    borderRadius: 15,
    borderWidth: 1,
    borderColor: '#2A2A2A',
  },
  narratorHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  narratorLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#4A90E2',
    marginLeft: 8,
  },
  fullScreenNarrator: {
    fontSize: 15,
    color: '#FFFFFF',
    fontStyle: 'italic',
  },
  fullScreenExplanationContainer: {
    marginBottom: 25,
    padding: 20,
    backgroundColor: '#1E1E1E',
    borderRadius: 15,
    borderWidth: 1,
    borderColor: '#2A2A2A',
  },
  explanationHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  explanationLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFD700',
    marginLeft: 8,
  },
  fullScreenExplanation: {
    fontSize: 15,
    lineHeight: 24,
    color: '#FFFFFF',
    fontStyle: 'italic',
  },

});

export default HadithScreen;
