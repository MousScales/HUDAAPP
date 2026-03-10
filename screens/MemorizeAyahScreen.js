import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  StatusBar,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Alert,
  Modal,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { Audio } from 'expo-av';
import { useLanguage } from '../utils/useLanguage';
import { t } from '../utils/translations';
import { availableReciters, getAyahAudioUrl } from '../services/reciterService';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { auth } from '../firebase';
import { 
  saveReadingCount as saveReadingCountFirebase, 
  saveListeningCount as saveListeningCountFirebase,
  getAyahMemorization,
  getUserSettings
} from '../services/memorizationService';

export default function MemorizeAyahScreen({ route, navigation }) {
  const { currentLanguage } = useLanguage();
  const { surah, ayah, onComplete } = route.params || {};
  
  const [selectedReciter, setSelectedReciter] = useState('5'); // Default to Mishary Alafasy
  const [audio, setAudio] = useState(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [readingCount, setReadingCount] = useState(0);
  const [listeningCount, setListeningCount] = useState(0);
  const [showReciterModal, setShowReciterModal] = useState(false);
  const [ayahData, setAyahData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showQuizAvailablePopup, setShowQuizAvailablePopup] = useState(false);
  const audioRef = useRef(null);
  const [readTarget, setReadTarget] = useState(10);
  const [listenTarget, setListenTarget] = useState(10);

  useEffect(() => {
    if (surah && ayah) {
      loadAyahData();
      loadReadingCount();
      loadListeningCount();
    }

    // Configure audio mode
    Audio.setAudioModeAsync({
      allowsRecordingIOS: false,
      staysActiveInBackground: true,
      playsInSilentModeIOS: true,
      shouldDuckAndroid: true,
      playThroughEarpieceAndroid: false,
    });

    return () => {
      // Cleanup audio on unmount
      if (audio) {
        audio.unloadAsync().catch(console.error);
      }
    };
  }, [surah, ayah]);

  // Load user settings on mount
  useEffect(() => {
    const loadSettings = async () => {
      try {
        const settings = await getUserSettings();
        setReadTarget(settings.readTarget);
        setListenTarget(settings.listenTarget);
      } catch (error) {
        console.error('Error loading user settings:', error);
      }
    };
    loadSettings();
  }, []);


  // Check completion status when counts are loaded
  useEffect(() => {
    const bothCompleted = readingCount >= readTarget && listeningCount >= listenTarget;
    
    if (bothCompleted) {
      if (onComplete) {
        onComplete();
      }
      // Show popup when both counters are done
      setShowQuizAvailablePopup(true);
    }
  }, [readingCount, listeningCount, readTarget, listenTarget, onComplete]);

  // Unload audio when reciter changes
  useEffect(() => {
    const unloadAudio = async () => {
      if (audio) {
        try {
          await audio.unloadAsync();
          setAudio(null);
          setIsPlaying(false);
        } catch (error) {
          console.error('Error unloading audio:', error);
        }
      }
    };
    
    unloadAudio();
  }, [selectedReciter]);

  const loadAyahData = async () => {
    if (!surah || !ayah) return;
    
    setLoading(true);
    try {
      // Fetch Arabic text
      const response = await fetch(`https://api.alquran.cloud/v1/surah/${surah.number}`);
      const data = await response.json();
      
      if (data.code === 200 && data.data && data.data.ayahs) {
        const ayahItem = data.data.ayahs.find(a => a.numberInSurah === ayah.numberInSurah);
        
        if (ayahItem) {
          // Fetch transliteration
          let transliteration = '';
          try {
            const transliterationResponse = await fetch(`https://api.alquran.cloud/v1/surah/${surah.number}/en.transliteration`);
            const transliterationData = await transliterationResponse.json();
            if (transliterationData.code === 200 && transliterationData.data) {
              const transliterationAyah = transliterationData.data.ayahs.find(a => a.numberInSurah === ayah.numberInSurah);
              if (transliterationAyah) {
                transliteration = transliterationAyah.text;
              }
            }
          } catch (error) {
            console.log('Could not fetch transliteration:', error);
          }

          // Fetch translation
          let translation = '';
          try {
            const translationResponse = await fetch(`https://api.alquran.cloud/v1/surah/${surah.number}/en.sahih`);
            const translationData = await translationResponse.json();
            if (translationData.code === 200 && translationData.data) {
              const translationAyah = translationData.data.ayahs.find(a => a.numberInSurah === ayah.numberInSurah);
              if (translationAyah) {
                translation = translationAyah.text;
              }
            }
          } catch (error) {
            console.log('Could not fetch translation:', error);
          }

          setAyahData({
            ...ayahItem,
            transliteration,
            translation,
            number: ayahItem.number, // Global ayah number
          });
        }
      }
    } catch (error) {
      console.error('Error loading ayah data:', error);
      Alert.alert('Error', 'Failed to load ayah data.');
    } finally {
      setLoading(false);
    }
  };

  const loadReadingCount = async () => {
    if (!surah || !ayah) return;
    
    try {
      const memorization = await getAyahMemorization(surah.number, ayah.numberInSurah);
      if (memorization && memorization.readingCount !== undefined) {
        setReadingCount(Math.min(memorization.readingCount, readTarget));
      }
    } catch (error) {
      console.error('Error loading reading count:', error);
    }
  };

  const loadListeningCount = async () => {
    if (!surah || !ayah) return;
    
    try {
      const memorization = await getAyahMemorization(surah.number, ayah.numberInSurah);
      if (memorization && memorization.listeningCount !== undefined) {
        setListeningCount(Math.min(memorization.listeningCount, listenTarget));
      }
    } catch (error) {
      console.error('Error loading listening count:', error);
    }
  };

  const saveReadingCount = async (count) => {
    if (!surah || !ayah) return;
    
    try {
      await saveReadingCountFirebase(surah.number, ayah.numberInSurah, Math.min(count, readTarget));
    } catch (error) {
      console.error('Error saving reading count:', error);
    }
  };

  const saveListeningCount = async (count) => {
    if (!surah || !ayah) return;
    
    try {
      await saveListeningCountFirebase(surah.number, ayah.numberInSurah, Math.min(count, listenTarget));
    } catch (error) {
      console.error('Error saving listening count:', error);
    }
  };

  const checkCompletion = () => {
    // Check if either counter reached target
    if (readingCount >= readTarget || listeningCount >= listenTarget) {
      if (onComplete) {
        onComplete();
      }
    }
  };

  const handleScreenTap = () => {
    if (readingCount >= readTarget) return; // Don't increment if already at max
    
    const newCount = Math.min(readingCount + 1, readTarget);
    setReadingCount(newCount);
    saveReadingCount(newCount);
    
    // Check if completed
    if (newCount >= readTarget || listeningCount >= listenTarget) {
      if (onComplete) {
        onComplete();
      }
    }
  };

  const handlePlayAudio = async () => {
    if (!ayah || !selectedReciter) return;

    try {
      if (isPlaying && audio) {
        // Pause current playback
        await audio.pauseAsync();
        setIsPlaying(false);
        return;
      }
      
      // If audio exists but not playing, unload it first to allow new reciter
      if (audio) {
        await audio.unloadAsync();
        setAudio(null);
      }

      // Use the global ayah number from ayahData
      const ayahNumber = ayahData?.number || ayah?.number;
      
      if (!ayahNumber) {
        Alert.alert('Error', 'Could not determine ayah number.');
        return;
      }
      
      const audioUrl = await getAyahAudioUrl(ayahNumber, selectedReciter, {});
      
      if (!audioUrl) {
        Alert.alert('Error', 'Could not load audio for this ayah.');
        return;
      }

      // Unload previous audio if exists
      if (audio) {
        await audio.unloadAsync();
      }

      // Create and play new audio
      const { sound } = await Audio.Sound.createAsync(
        { uri: audioUrl },
        { shouldPlay: true }
      );

      setAudio(sound);
      setIsPlaying(true);

      // Increment listening count when starting playback
      if (listeningCount < listenTarget) {
        const newListeningCount = Math.min(listeningCount + 1, listenTarget);
        setListeningCount(newListeningCount);
        saveListeningCount(newListeningCount);
        
        // Check if completed
        if (newListeningCount >= listenTarget || readingCount >= readTarget) {
          if (onComplete) {
            onComplete();
          }
        }
      }

      sound.setOnPlaybackStatusUpdate((status) => {
        if (status.didJustFinish) {
          setIsPlaying(false);
          checkCompletion();
        }
      });
    } catch (error) {
      console.error('Error playing audio:', error);
      Alert.alert('Error', 'Failed to play audio.');
    }
  };


  const getReciterName = () => {
    const reciter = availableReciters.find(r => r.id === selectedReciter);
    return reciter ? reciter.name : 'Unknown';
  };

  if (loading || !ayahData) {
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

  return (
    <LinearGradient colors={["#181818", "#232323"]} style={styles.gradient}>
      <SafeAreaView style={styles.container}>
        <StatusBar barStyle="light-content" backgroundColor="#121212" />
        
        {/* Header with back button and reciter */}
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => {
              // Check completion before going back
              if ((readingCount >= readTarget || listeningCount >= listenTarget) && onComplete) {
                onComplete();
              }
              navigation.goBack();
            }}
          >
            <Ionicons name="chevron-back" size={24} color="#fff" />
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.reciterButtonHeader}
            onPress={() => setShowReciterModal(true)}
          >
            <Text style={styles.reciterTextHeader} numberOfLines={1}>
              {getReciterName()}
            </Text>
            <Ionicons name="chevron-down" size={16} color="#FFFFFF" />
          </TouchableOpacity>
          <View style={{ flex: 1 }} />
        </View>

        {/* Main content */}
        <View style={styles.contentArea}>
          <ScrollView
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
          >
            {/* Ayah Number */}
            <Text style={styles.ayahNumberText}>
              {surah?.englishName || 'Surah'} Ayah {ayah?.numberInSurah}
            </Text>
            
            {/* Arabic Text */}
            <Text style={styles.arabicText}>
              {ayahData.text}
            </Text>

            {/* Transliteration */}
            {ayahData.transliteration && (
              <Text style={styles.transliterationText}>
                {ayahData.transliteration}
              </Text>
            )}

            {/* Translation */}
            {ayahData.translation && (
              <Text style={styles.translationText}>
                {ayahData.translation}
              </Text>
            )}
          </ScrollView>
        </View>

        {/* Bottom controls */}
        <View style={styles.bottomControls}>
          {/* Listen Counter (Left) */}
          <View style={styles.counterContainer}>
            <Text style={[
              styles.counterNumber,
              listeningCount >= listenTarget && styles.counterNumberCompleted
            ]}>
              {listeningCount}/{listenTarget}
            </Text>
            <Text style={styles.counterLabel}>listen counter</Text>
          </View>

          {/* Play/Pause Button (Center) */}
          <TouchableOpacity
            style={styles.playButton}
            onPress={handlePlayAudio}
          >
            <Ionicons
              name={isPlaying ? "pause" : "play"}
              size={32}
              color="#FFFFFF"
            />
          </TouchableOpacity>

          {/* Read Counter (Right) */}
          <TouchableOpacity
            style={styles.counterContainer}
            onPress={handleScreenTap}
            activeOpacity={0.7}
            disabled={readingCount >= readTarget}
          >
            <Text style={[
              styles.counterNumber,
              readingCount >= readTarget && styles.counterNumberCompleted
            ]}>
              {readingCount}/{readTarget}
            </Text>
            <Text style={styles.counterLabel}>read counter</Text>
          </TouchableOpacity>
        </View>

        {/* Quiz Available Popup */}
        {showQuizAvailablePopup && (
          <View style={styles.quizAvailablePopup}>
            <View style={styles.quizAvailableContent}>
              <Ionicons name="checkmark-circle" size={24} color="#34D399" />
              <Text style={styles.quizAvailableText}>Quiz is now available</Text>
              <TouchableOpacity
                onPress={() => setShowQuizAvailablePopup(false)}
                style={styles.closePopupButton}
              >
                <Ionicons name="close" size={20} color="#FFFFFF" />
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* Reciter Selection Modal */}
        <Modal
          visible={showReciterModal}
          transparent={true}
          animationType="slide"
          onRequestClose={() => setShowReciterModal(false)}
        >
          <TouchableOpacity
            style={styles.modalOverlay}
            activeOpacity={1}
            onPress={() => setShowReciterModal(false)}
          >
            <View style={styles.modalContent}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Select Reciter</Text>
                <TouchableOpacity onPress={() => setShowReciterModal(false)}>
                  <Ionicons name="close" size={24} color="#fff" />
                </TouchableOpacity>
              </View>
              <ScrollView style={styles.reciterList}>
                {availableReciters.map((reciter) => (
                  <TouchableOpacity
                    key={reciter.id}
                    style={[
                      styles.reciterItem,
                      selectedReciter === reciter.id && styles.reciterItemSelected
                    ]}
                    onPress={() => {
                      setSelectedReciter(reciter.id);
                      setShowReciterModal(false);
                    }}
                  >
                    <Text style={[
                      styles.reciterItemText,
                      selectedReciter === reciter.id && styles.reciterItemTextSelected
                    ]}>
                      {reciter.name}
                    </Text>
                    {selectedReciter === reciter.id && (
                      <Ionicons name="checkmark" size={20} color="#34D399" />
                    )}
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
          </TouchableOpacity>
        </Modal>
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
  contentArea: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: '100%',
  },
  ayahNumberText: {
    fontSize: 18,
    color: '#B0B0B0',
    textAlign: 'center',
    marginBottom: 16,
    fontWeight: '500',
  },
  arabicText: {
    fontSize: 32,
    color: '#FFFFFF',
    textAlign: 'center',
    lineHeight: 56,
    marginBottom: 24,
    fontFamily: Platform.OS === 'ios' ? 'Arial' : 'Roboto',
  },
  transliterationText: {
    fontSize: 18,
    color: '#B0B0B0',
    textAlign: 'center',
    lineHeight: 28,
    marginBottom: 24,
    fontStyle: 'italic',
  },
  translationText: {
    fontSize: 16,
    color: '#D0D0D0',
    textAlign: 'center',
    lineHeight: 24,
  },
  bottomControls: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 20,
  },
  reciterButtonHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    flex: 1,
    marginRight: 12,
  },
  reciterTextHeader: {
    fontSize: 16,
    color: '#FFFFFF',
    marginRight: 6,
    fontWeight: '600',
    textShadowColor: 'rgba(255, 255, 255, 0.8)',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 10,
  },
  playButton: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#000000',
    alignItems: 'center',
    justifyContent: 'center',
  },
  counterContainer: {
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    minWidth: 80,
  },
  counterNumber: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  counterNumberCompleted: {
    color: '#34D399',
  },
  counterLabel: {
    fontSize: 10,
    color: '#B0B0B0',
    marginTop: 2,
    textTransform: 'lowercase',
  },
  quizAvailablePopup: {
    position: 'absolute',
    top: 80,
    left: 20,
    right: 20,
    backgroundColor: '#34D399',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 12,
    zIndex: 1000,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  quizAvailableContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  quizAvailableText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
    marginLeft: 8,
    flex: 1,
    textAlign: 'center',
  },
  closePopupButton: {
    padding: 4,
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
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#1E1E1E',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '70%',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#2A2A2A',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  reciterList: {
    maxHeight: 400,
  },
  reciterItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#2A2A2A',
  },
  reciterItemSelected: {
    backgroundColor: '#2A2A2A',
  },
  reciterItemText: {
    fontSize: 16,
    color: '#B0B0B0',
    flex: 1,
  },
  reciterItemTextSelected: {
    color: '#34D399',
    fontWeight: '600',
  },
});

