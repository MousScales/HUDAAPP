import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  SafeAreaView,
  TouchableOpacity,
  StatusBar,
  Dimensions,
  Animated,
  Alert,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { Audio } from 'expo-av';
import { useLanguage } from '../utils/useLanguage';
import { t } from '../utils/translations';
import { namesOfAllah } from '../data/namesOfAllah';

const { width, height } = Dimensions.get('window');

export default function NamesOfAllahScreen({ navigation }) {
  const { currentLanguage } = useLanguage();
  const [selectedName, setSelectedName] = useState(null);
  const [playingAudio, setPlayingAudio] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(50)).current;
  const soundRef = useRef(null);

  useEffect(() => {
    // Configure audio mode
    Audio.setAudioModeAsync({
      allowsRecordingIOS: false,
      staysActiveInBackground: false,
      playsInSilentModeIOS: true,
      shouldDuckAndroid: true,
      playThroughEarpieceAndroid: false,
    });

    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 800,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 800,
        useNativeDriver: true,
      }),
    ]).start();

    // Cleanup function
    return () => {
      if (soundRef.current) {
        soundRef.current.unloadAsync();
      }
    };
  }, []);

  const playAudio = async (name, index) => {
    try {
      setIsLoading(true);
      
      // Stop any currently playing audio
      if (soundRef.current) {
        await soundRef.current.unloadAsync();
        soundRef.current = null;
      }

      // Option 1: Use local audio files (recommended for production)
      // You would store audio files like: assets/audio/names/001-ar-rahman.mp3
      // const audioSource = require(`../assets/audio/names/${String(index + 1).padStart(3, '0')}-${name.transliteration.toLowerCase().replace(/[^a-z]/g, '-')}.mp3`);
      
      // Option 2: Use online TTS service (requires API key) - Male voice
      // const audioUrl = `https://api.voicerss.org/?key=YOUR_API_KEY&hl=ar-sa&src=${encodeURIComponent(name.arabic)}&f=48khz_16bit_stereo&v=Naayf`;
      
      // Option 3: Use ResponsiveVoice API for male Arabic voice (free tier available)
      // const audioUrl = `https://responsivevoice.org/responsivevoice/getvoice.php?t=${encodeURIComponent(name.arabic)}&tl=ar&sv=g1&vn=&pitch=0.5&rate=0.5&vol=1`;
      
      // Option 4: Use Google Cloud TTS with male voice (requires setup)
      // const audioUrl = `https://texttospeech.googleapis.com/v1/text:synthesize?key=YOUR_API_KEY` with voice: { languageCode: 'ar-XA', name: 'ar-XA-Standard-C', ssmlGender: 'MALE' }
      
      // Option 5: Use Azure Cognitive Services with male Arabic voice
      // const audioUrl = `https://eastus.tts.speech.microsoft.com/cognitiveservices/v1` with voice: 'ar-SA-HamedNeural' (male)
      
      // For now, using Google Translate with male-preferred settings
      const audioUrl = `https://translate.google.com/translate_tts?ie=UTF-8&tl=ar&client=tw-ob&q=${encodeURIComponent(name.arabic)}&ttsspeed=0.8`;
      
      // Load and play audio
      const { sound } = await Audio.Sound.createAsync(
        { uri: audioUrl },
        { shouldPlay: true, volume: 1.0 },
        (status) => {
          if (status.didJustFinish) {
            setPlayingAudio(null);
            setSelectedName(null); // Unselect card when audio finishes
            if (soundRef.current) {
              soundRef.current.unloadAsync();
              soundRef.current = null;
            }
          }
        }
      );
      
      soundRef.current = sound;
      setPlayingAudio(index);
      setIsLoading(false);
      
    } catch (error) {
      console.error('Error playing audio:', error);
      
      // Fallback: Show pronunciation guide
      Alert.alert(
        t('audioPronunciation', currentLanguage),
        `${name.arabic}\n\n${t('pronouncedAs', currentLanguage)}: "${name.transliteration}"\n${t('meaning', currentLanguage)}: ${typeof name.meaning === 'object' ? name.meaning[currentLanguage] || name.meaning.english : name.meaning}`,
        [
          { text: 'OK', style: 'default' }
        ]
      );
      
      setIsLoading(false);
      setPlayingAudio(null);
    }
  };

  const stopAudio = async () => {
    try {
      if (soundRef.current) {
        await soundRef.current.stopAsync();
        await soundRef.current.unloadAsync();
        soundRef.current = null;
      }
      setPlayingAudio(null);
      setSelectedName(null); // Unselect card when audio is stopped
    } catch (error) {
      console.error('Error stopping audio:', error);
    }
  };

  const renderNameCard = (name, index) => {
    const animatedValue = useRef(new Animated.Value(0)).current;
    const isCurrentlyPlaying = playingAudio === index;
    
    const handlePress = () => {
      Animated.sequence([
        Animated.timing(animatedValue, {
          toValue: 1,
          duration: 150,
          useNativeDriver: true,
        }),
        Animated.timing(animatedValue, {
          toValue: 0,
          duration: 150,
          useNativeDriver: true,
        }),
      ]).start();
      
      // Select the card and play audio
      setSelectedName(selectedName === index ? null : index);
      
      // Play or stop audio when card is clicked
      if (isCurrentlyPlaying) {
        stopAudio();
      } else {
        playAudio(name, index);
      }
    };

    const handleAudioPress = (e) => {
      e.stopPropagation(); // Prevent double triggering
      // Audio is now handled by the main card press
    };

    const scale = animatedValue.interpolate({
      inputRange: [0, 1],
      outputRange: [1, 0.95],
    });

    return (
      <Animated.View
        key={index}
        style={[
          {
            transform: [{ scale }],
            opacity: fadeAnim,
            translateY: slideAnim,
          },
        ]}
      >
        <TouchableOpacity
          style={[
            styles.nameCard, 
            selectedName === index && styles.selectedCard,
            isCurrentlyPlaying && styles.playingCard
          ]}
          onPress={handlePress}
          activeOpacity={0.8}
        >
          <View style={styles.nameContent}>
            <View style={styles.nameRow}>
              <Text style={styles.transliterationText}>
                <Text style={styles.numberText}>{index + 1}. </Text>
                {name.transliteration}
              </Text>
              <Text style={styles.arabicText}>{name.arabic}</Text>
            </View>
            <Text style={[styles.meaningText, selectedName === index && styles.selectedMeaningText]}>
              {typeof name.meaning === 'object' ? name.meaning[currentLanguage] || name.meaning.english : name.meaning}
            </Text>
          </View>
          
          {/* Audio Status Indicator */}
          <View
            style={[
              styles.audioButton,
              isCurrentlyPlaying && styles.audioButtonPlaying
            ]}
          >
            {isLoading && playingAudio === index ? (
              <Ionicons name="hourglass" size={18} color="#FFD700" />
            ) : isCurrentlyPlaying ? (
              <Ionicons name="volume-high" size={18} color="#FFD700" />
            ) : (
              <Ionicons name="volume-medium" size={18} color="#FFD700" />
            )}
          </View>

        </TouchableOpacity>
      </Animated.View>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#0a0a0a" />
      
      <LinearGradient
        colors={['#0a0a0a', '#1a1a2e', '#16213e', '#1a1a2e', '#0a0a0a']}
        style={styles.gradient}
      >
        {/* Decorative Background Elements */}
        <View style={styles.decorativeBackground}>
          <View style={[styles.decorativeCircle, styles.circle1]} />
          <View style={[styles.decorativeCircle, styles.circle2]} />
          <View style={[styles.decorativeCircle, styles.circle3]} />
        </View>

        {/* Fixed Header */}
        <Animated.View 
          style={[
            styles.fixedHeader,
            {
              opacity: fadeAnim,
              transform: [{ translateY: slideAnim }],
            },
          ]}
        >
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => navigation.goBack()}
          >
            <Ionicons name="arrow-back" size={24} color="#fff" />
          </TouchableOpacity>
          
          <View style={styles.headerContent}>
            <View style={styles.titleContainer}>
              <Ionicons name="star" size={20} color="#FFD700" style={styles.titleIcon} />
              <Text style={styles.headerTitle}>أسماء الله الحسنى</Text>
              <Ionicons name="star" size={20} color="#FFD700" style={styles.titleIcon} />
            </View>
            <Text style={styles.headerSubtitle}>{t('namesOfAllahTitle', currentLanguage)}</Text>
            <View style={styles.divider} />
          </View>
        </Animated.View>

        {/* Scrollable Content */}
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* Introduction - Now Scrollable */}
          <Animated.View 
            style={[
              styles.introSection,
              {
                opacity: fadeAnim,
                transform: [{ translateY: slideAnim }],
              },
            ]}
          >
            <LinearGradient
              colors={['rgba(255, 215, 0, 0.1)', 'rgba(255, 215, 0, 0.05)']}
              style={styles.introCard}
            >
            <Text style={styles.introText}>
              {t('namesOfAllahIntro', currentLanguage)}
            </Text>
            </LinearGradient>
          </Animated.View>

          {/* Names List */}
          {namesOfAllah.map((name, index) => renderNameCard(name, index))}
          
          {/* Bottom Padding */}
          <View style={styles.bottomPadding} />
        </ScrollView>
      </LinearGradient>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0a0a0a',
  },
  gradient: {
    flex: 1,
  },
  decorativeBackground: {
    position: 'absolute',
    width: '100%',
    height: '100%',
    zIndex: 0,
  },
  decorativeCircle: {
    position: 'absolute',
    borderRadius: 100,
    opacity: 0.03,
  },
  circle1: {
    width: 200,
    height: 200,
    backgroundColor: '#FFD700',
    top: -50,
    right: -50,
  },
  circle2: {
    width: 150,
    height: 150,
    backgroundColor: '#FFA500',
    bottom: 100,
    left: -30,
  },
  circle3: {
    width: 100,
    height: 100,
    backgroundColor: '#FF8C00',
    top: '40%',
    right: -20,
  },
  fixedHeader: {
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 25,
    zIndex: 1,
    position: 'relative',
  },
  backButton: {
    position: 'absolute',
    left: 20,
    top: 10,
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255, 215, 0, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 215, 0, 0.3)',
    shadowColor: '#FFD700',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 5,
  },
  headerContent: {
    alignItems: 'center',
    marginTop: 50,
  },
  titleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  titleIcon: {
    marginHorizontal: 10,
  },
  headerTitle: {
    fontSize: 26,
    fontWeight: 'bold',
    color: '#fff',
    textAlign: 'center',
    textShadowColor: 'rgba(255, 215, 0, 0.3)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  headerSubtitle: {
    fontSize: 16,
    color: '#D4AF37',
    textAlign: 'center',
    fontWeight: '500',
  },
  divider: {
    width: 60,
    height: 3,
    backgroundColor: '#FFD700',
    borderRadius: 2,
    marginTop: 12,
  },
  introSection: {
    paddingHorizontal: 4,
    marginBottom: 25,
    zIndex: 1,
  },
  introCard: {
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: 'rgba(255, 215, 0, 0.2)',
  },
  introText: {
    fontSize: 15,
    color: '#E8E8E8',
    lineHeight: 24,
    textAlign: 'center',
    fontStyle: 'italic',
  },
  scrollView: {
    flex: 1,
    zIndex: 1,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 0,
  },
  nameCard: {
    flexDirection: 'row',
    backgroundColor: 'rgba(42, 42, 58, 0.8)',
    borderRadius: 18,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 8,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    backdropFilter: 'blur(10px)',
  },
  selectedCard: {
    backgroundColor: 'rgba(255, 215, 0, 0.15)',
    borderColor: '#FFD700',
    borderWidth: 2,
    shadowColor: '#FFD700',
    shadowOpacity: 0.3,
    transform: [{ scale: 1.02 }],
  },
  playingCard: {
    backgroundColor: 'rgba(255, 165, 0, 0.2)',
    borderColor: '#FFA500',
    borderWidth: 1,
  },
  nameNumber: {
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
    alignSelf: 'flex-start',
    marginTop: 2,
    shadowColor: '#FFD700',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.4,
    shadowRadius: 4,
    elevation: 4,
  },
  numberText: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#B0B0B0',
  },
  nameContent: {
    flex: 1,
    justifyContent: 'flex-start',
  },
  nameRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 6,
    flexWrap: 'nowrap',
  },
  arabicText: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#fff',
    textAlign: 'right',
    textShadowColor: 'rgba(255, 215, 0, 0.2)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
    minWidth: '50%',
    paddingRight: 8,
    fontFamily: Platform.OS === 'ios' ? 'Arial' : 'Roboto',
  },
  transliterationText: {
    fontSize: 16,
    color: '#FFD700',
    fontWeight: '600',
    textAlign: 'left',
    minWidth: '40%',
    paddingLeft: 8,
  },
  meaningText: {
    fontSize: 14,
    color: '#C0C0C0',
    lineHeight: 20,
  },
  selectedMeaningText: {
    color: '#E8E8E8',
    fontWeight: '500',
  },
  audioButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255, 215, 0, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    alignSelf: 'center',
    marginLeft: 8,
    borderWidth: 1,
    borderColor: 'rgba(255, 215, 0, 0.3)',
  },
  audioButtonPlaying: {
    backgroundColor: 'rgba(255, 165, 0, 0.2)',
    borderColor: '#FFA500',
    shadowColor: '#FFA500',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.4,
    shadowRadius: 4,
    elevation: 4,
  },
  bottomPadding: {
    height: 40,
  },
});
