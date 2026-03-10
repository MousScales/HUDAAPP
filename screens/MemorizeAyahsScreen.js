import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  StatusBar,
  TouchableOpacity,
  FlatList,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useLanguage } from '../utils/useLanguage';
import { t } from '../utils/translations';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { auth } from '../firebase';
import { 
  getSurahMemorization,
  saveReadingCount,
  saveListeningCount,
  saveQuizPassed,
  getUserSettings
} from '../services/memorizationService';

export default function MemorizeAyahsScreen({ route, navigation }) {
  const { currentLanguage } = useLanguage();
  const { surah } = route.params || {};
  
  const [surahAyahs, setSurahAyahs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [completedAyahs, setCompletedAyahs] = useState(new Set());
  const [quizPassedAyahs, setQuizPassedAyahs] = useState(new Set());
  const [activeAyah, setActiveAyah] = useState(null);

  useEffect(() => {
    if (surah) {
      loadSurahAyahs();
    }
  }, [surah]);

  // Load completion status after ayahs are loaded
  useEffect(() => {
    if (surahAyahs.length > 0 && surah) {
      loadCompletedAyahs();
      loadQuizPassedAyahs();
    }
  }, [surahAyahs, surah]);

  // Listen for focus to reload completion status
  useEffect(() => {
    const unsubscribe = navigation.addListener('focus', () => {
      if (surahAyahs.length > 0) {
        loadCompletedAyahs();
        loadQuizPassedAyahs();
      }
      setActiveAyah(null); // Reset active ayah when returning to screen
    });

    return unsubscribe;
  }, [navigation, surahAyahs]);

  const loadCompletedAyahs = async () => {
    if (!surah || surahAyahs.length === 0) return;
    
    try {
      // Get user settings first
      const settings = await getUserSettings();
      const targetRead = settings.readTarget;
      const targetListen = settings.listenTarget;
      
      const memorization = await getSurahMemorization(surah.number);
      const completed = new Set();
      
      for (const ayah of surahAyahs) {
        const ayahData = memorization[ayah.numberInSurah];
        if (ayahData) {
          const readCompleted = ayahData.readingCount && ayahData.readingCount >= targetRead;
          const listenCompleted = ayahData.listeningCount && ayahData.listeningCount >= targetListen;
          
          if (readCompleted || listenCompleted) {
            completed.add(ayah.numberInSurah);
          }
        }
      }
      
      setCompletedAyahs(completed);
    } catch (error) {
      console.error('Error loading completed ayahs:', error);
    }
  };

  const loadQuizPassedAyahs = async () => {
    if (!surah || surahAyahs.length === 0) return;
    
    try {
      const memorization = await getSurahMemorization(surah.number);
      const passed = new Set();
      
      for (const ayah of surahAyahs) {
        const ayahData = memorization[ayah.numberInSurah];
        if (ayahData && ayahData.quizPassed === true) {
          passed.add(ayah.numberInSurah);
        }
      }
      
      setQuizPassedAyahs(passed);
    } catch (error) {
      console.error('Error loading quiz passed ayahs:', error);
    }
  };

  const loadSurahAyahs = async () => {
    if (!surah) return;
    
    setLoading(true);
    try {
      const response = await fetch(`https://api.alquran.cloud/v1/surah/${surah.number}`);
      const data = await response.json();
      
      if (data.code === 200 && data.data && data.data.ayahs) {
        setSurahAyahs(data.data.ayahs);
      } else {
        Alert.alert('Error', 'Failed to load ayahs for this surah.');
      }
    } catch (error) {
      console.error('Error loading ayahs:', error);
      Alert.alert('Error', 'Failed to load ayahs. Please check your connection and try again.');
    } finally {
      setLoading(false);
    }
  };

  // Handle memorize ayah action
  const handleMemorizeAyah = (ayahItem) => {
    const currentAyah = getCurrentAyah();
    // Only allow if this is the current ayah
    if (currentAyah !== ayahItem.numberInSurah) {
      return;
    }
    
    // Check if previous ayah is fully complete (if not the first ayah)
    const previousAyahNumber = ayahItem.numberInSurah - 1;
    if (previousAyahNumber > 0) {
      const previousAyah = surahAyahs.find(a => a.numberInSurah === previousAyahNumber);
      if (previousAyah && !isAyahFullyComplete(previousAyahNumber)) {
        Alert.alert('Complete Previous Ayah', 'Please complete both memorization and quiz for the previous ayah before starting the next one.');
        return;
      }
    }
    
    setActiveAyah(ayahItem.numberInSurah);
    navigation.navigate('MemorizeAyahScreen', {
      surah: surah,
      ayah: ayahItem,
      onComplete: () => {
        // Mark as completed when returning
        setCompletedAyahs(prev => new Set([...prev, ayahItem.numberInSurah]));
        setActiveAyah(null);
        // Reload completion status to update current ayah
        loadCompletedAyahs();
      }
    });
  };

  // Handle already memorized - auto-complete both memorization and quiz
  const handleAlreadyMemorized = (ayahItem) => {
    Alert.alert(
      'Already Memorized?',
      `Are you sure you want to mark Ayah ${ayahItem.numberInSurah} as already memorized? This will auto-complete both memorization and quiz.`,
      [
        {
          text: 'Cancel',
          style: 'cancel'
        },
        {
          text: 'Yes, Mark Complete',
          onPress: async () => {
            if (!surah) return;
            
            try {
              const user = auth.currentUser;
              if (!user) {
                Alert.alert('Error', 'Please log in to save progress.');
                return;
              }

              // Set both reading and listening counts to 10 to mark memorization as complete
              await saveReadingCount(surah.number, ayahItem.numberInSurah, 10);
              await saveListeningCount(surah.number, ayahItem.numberInSurah, 10);
              
              // Mark quiz as passed
              await saveQuizPassed(surah.number, ayahItem.numberInSurah, true);
              
              // Update state
              setCompletedAyahs(prev => new Set([...prev, ayahItem.numberInSurah]));
              setQuizPassedAyahs(prev => new Set([...prev, ayahItem.numberInSurah]));
              
              // Reload to update current ayah
              loadCompletedAyahs();
              loadQuizPassedAyahs();
            } catch (error) {
              console.error('Error marking as already memorized:', error);
              Alert.alert('Error', 'Failed to save progress.');
            }
          }
        }
      ]
    );
  };

  // Handle quiz ayah action
  const handleQuizAyah = (ayahItem) => {
    // Only allow if memorize is completed
    if (!completedAyahs.has(ayahItem.numberInSurah)) {
      return;
    }
    
    setActiveAyah(ayahItem.numberInSurah);
    navigation.navigate('QuizAyahScreen', {
      surah: surah,
      ayah: ayahItem,
      onQuizComplete: async (passed) => {
        // If quiz passed (75%+), save to Firebase
        if (passed) {
          try {
            await saveQuizPassed(surah.number, ayahItem.numberInSurah, true);
            setQuizPassedAyahs(prev => new Set([...prev, ayahItem.numberInSurah]));
          } catch (error) {
            console.error('Error saving quiz passed:', error);
          }
          // Reload to update current ayah
          loadCompletedAyahs();
          loadQuizPassedAyahs();
        }
        setActiveAyah(null);
      }
    });
  };

  // Check if an ayah is fully complete (both memorize and quiz done)
  const isAyahFullyComplete = (ayahNumber) => {
    return completedAyahs.has(ayahNumber) && quizPassedAyahs.has(ayahNumber);
  };

  // Get the current ayah (first uncompleted one, but only if previous is fully complete)
  const getCurrentAyah = () => {
    if (surahAyahs.length === 0) return null;
    
    // Find first ayah that is not fully completed
    for (const ayah of surahAyahs) {
      const ayahNumber = ayah.numberInSurah;
      
      // Check if this ayah is fully complete
      if (isAyahFullyComplete(ayahNumber)) {
        continue; // Skip fully completed ayahs
      }
      
      // Check if previous ayah is fully complete (if not the first ayah)
      const previousAyahNumber = ayahNumber - 1;
      if (previousAyahNumber > 0) {
        const previousAyah = surahAyahs.find(a => a.numberInSurah === previousAyahNumber);
        if (previousAyah && !isAyahFullyComplete(previousAyahNumber)) {
          // Previous ayah is not fully complete, so this ayah is not available yet
          continue;
        }
      }
      
      // This is the current ayah
      return ayahNumber;
    }
    
    // All ayahs are fully completed
    return null;
  };

  // Render ayah item
  const renderAyahItem = ({ item, index }) => {
    const ayahNumber = item.numberInSurah || index + 1;
    const isMemorizeCompleted = completedAyahs.has(ayahNumber);
    const isQuizPassed = quizPassedAyahs.has(ayahNumber);
    const isFullyComplete = isAyahFullyComplete(ayahNumber);
    const currentAyah = getCurrentAyah();
    const isCurrentAyah = currentAyah === ayahNumber;
    // Disable if not current ayah and not fully complete
    const isDisabled = !isCurrentAyah && !isFullyComplete;
    // Show "Already Memorized?" only for current ayah
    const showAlreadyMemorized = isCurrentAyah && !isFullyComplete;

    return (
      <View style={styles.ayahSection}>
        {/* Ayah Header */}
        <View style={styles.ayahHeader}>
          <View style={styles.ayahHeaderRow}>
            <Text style={styles.ayahTitle}>
              Ayah {ayahNumber}
            </Text>
            {showAlreadyMemorized && (
              <TouchableOpacity
                onPress={() => handleAlreadyMemorized(item)}
              >
                <Text style={styles.alreadyMemorizedText}>
                  Already Memorized?
                </Text>
              </TouchableOpacity>
            )}
          </View>
          <Text style={styles.ayahStatus}>
            {isFullyComplete ? 'Completed' : isCurrentAyah ? 'Current Step' : 'Locked'}
          </Text>
        </View>

        {/* Memorize Ayah Card */}
        <TouchableOpacity
          style={[
            styles.memorizeCard,
            isCurrentAyah && !isMemorizeCompleted && styles.memorizeCardActive,
            isDisabled && styles.cardDisabled
          ]}
          onPress={() => !isDisabled && handleMemorizeAyah(item)}
          activeOpacity={isDisabled ? 1 : 0.7}
          disabled={isDisabled}
        >
          <Text style={[
            styles.cardPrimaryText,
            isCurrentAyah && !isMemorizeCompleted && styles.cardPrimaryTextActive,
            isDisabled && styles.cardTextDisabled
          ]}>
            Memorize
          </Text>
          {isMemorizeCompleted && (
            <Ionicons 
              name="checkmark-circle" 
              size={24} 
              color="#34D399" 
              style={styles.checkmarkIcon} 
            />
          )}
        </TouchableOpacity>

        {/* Quiz Card */}
        <TouchableOpacity
          style={[
            styles.quizCard,
            isMemorizeCompleted && !isQuizPassed && isCurrentAyah && styles.quizCardActive,
            (!isMemorizeCompleted || isDisabled) && styles.cardDisabled
          ]}
          onPress={() => isMemorizeCompleted && handleQuizAyah(item)}
          activeOpacity={(!isMemorizeCompleted || isDisabled) ? 1 : 0.7}
          disabled={!isMemorizeCompleted || isDisabled}
        >
          <Text style={[
            styles.quizCardPrimaryText,
            isMemorizeCompleted && !isQuizPassed && isCurrentAyah && styles.quizCardPrimaryTextActive,
            (!isMemorizeCompleted || isDisabled) && styles.cardTextDisabled
          ]}>
            Quiz
          </Text>
          {isQuizPassed && (
            <Ionicons 
              name="checkmark-circle" 
              size={24} 
              color="#34D399" 
              style={styles.checkmarkIcon} 
            />
          )}
        </TouchableOpacity>
      </View>
    );
  };

  if (loading) {
    return (
      <LinearGradient colors={["#181818", "#232323"]} style={styles.gradient}>
        <SafeAreaView style={styles.container}>
          <StatusBar barStyle="light-content" backgroundColor="#121212" />
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#FFD700" />
            <Text style={styles.loadingText}>{t('loading', currentLanguage) || 'Loading...'}</Text>
          </View>
        </SafeAreaView>
      </LinearGradient>
    );
  }

  const memorizedAyahsCount = completedAyahs.size;
  const totalAyahs = surahAyahs.length;

  return (
    <LinearGradient colors={["#181818", "#232323"]} style={styles.gradient}>
      <SafeAreaView style={styles.container}>
        <StatusBar barStyle="light-content" backgroundColor="#121212" />
        
        {/* Header with back button and stats */}
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => navigation.goBack()}
          >
            <Ionicons name="chevron-back" size={24} color="#fff" />
          </TouchableOpacity>
          <View style={{ flex: 1, marginLeft: 12 }}>
            <Text style={styles.headerTitle}>
              {surah?.englishName || 'Surah'}
            </Text>
            <Text style={styles.stats}>
              {memorizedAyahsCount} / {totalAyahs} memorized
            </Text>
          </View>
        </View>

        {/* Ayahs List */}
        <FlatList
          data={surahAyahs}
          renderItem={renderAyahItem}
          keyExtractor={(item, index) => `ayah-${item.numberInSurah || index}`}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.ayahListContent}
        />
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
  stats: {
    fontSize: 16,
    color: '#B0B0B0',
    marginTop: 4,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    color: '#fff',
    marginTop: 10,
  },
  ayahSection: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#2A2A2A',
  },
  ayahHeader: {
    marginBottom: 16,
  },
  ayahHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  ayahTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  ayahStatus: {
    fontSize: 14,
    color: '#B0B0B0',
  },
  alreadyMemorizedText: {
    fontSize: 12,
    color: '#34D399',
    fontStyle: 'italic',
  },
  memorizeCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1E1E1E',
    borderWidth: 1,
    borderColor: '#4B5563',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },
  memorizeCardActive: {
    borderColor: '#34D399',
  },
  checkmarkIcon: {
    marginLeft: 'auto',
  },
  quizCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1E1E1E',
    borderWidth: 1,
    borderColor: '#4B5563',
    borderRadius: 12,
    padding: 16,
  },
  quizCardActive: {
    borderColor: '#34D399',
  },
  quizCardPrimaryTextActive: {
    color: '#34D399',
  },
  cardIcon: {
    marginRight: 12,
  },
  cardPrimaryText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#B0B0B0',
  },
  cardPrimaryTextActive: {
    color: '#34D399',
  },
  quizCardPrimaryText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  ayahListContent: {
    paddingVertical: 16,
  },
  cardDisabled: {
    opacity: 0.4,
  },
  cardTextDisabled: {
    color: '#4B5563',
  },
});

