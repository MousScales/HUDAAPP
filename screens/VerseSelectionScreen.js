import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  FlatList,
  SafeAreaView,
  StatusBar,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { Audio } from 'expo-av';
import { auth, firestore } from '../firebase';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { useLanguage } from '../utils/useLanguage';
import { t } from '../utils/translations';

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
};

const VerseSelectionScreen = ({ 
  route, 
  navigation 
}) => {
  // Language support
  const { currentLanguage } = useLanguage();
  
  const { 
    surah, 
    verses, 
    surahs, 
    userRecordings, 
    setUserRecordings,
    source, // 'record' or 'memorize' to track where we came from
  } = route.params;

  const [refreshKey, setRefreshKey] = useState(0);
  const [localUserRecordings, setLocalUserRecordings] = useState(userRecordings);

  // Handle back button - just go back normally since we're in the same stack
  const handleBackPress = () => {
    navigation.goBack();
  };

  // Configure audio for Quran listening - allows playback even when ringer is off
  useEffect(() => {
    Audio.setAudioModeAsync({
      allowsRecordingIOS: false,
      staysActiveInBackground: true, // Keep audio playing in background
      playsInSilentModeIOS: true, // This is the key setting for ringer off
      shouldDuckAndroid: true,
      playThroughEarpieceAndroid: false,
    });
  }, []);

  // Real-time listener for user recordings
  useEffect(() => {
    const user = auth.currentUser;
    if (!user) {
      // Clear recordings if no user is logged in
      setLocalUserRecordings({});
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
      
      setLocalUserRecordings(recordings);
      setUserRecordings(recordings); // Update global state
    }, (error) => {
      console.error('Error fetching recordings:', error);
      // If there's a permission error, it likely means the user logged out
      if (error.code === 'permission-denied') {
        console.log('Permission denied - user likely logged out, clearing recordings');
        setLocalUserRecordings({});
        setUserRecordings({});
      }
    });

    return unsubscribe;
  }, [auth.currentUser?.uid, setUserRecordings]);

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
    // For Bismillah (verse 0), check if Al-Fatiha verse 1 is recorded
    if (verseNumber === 0) {
      return localUserRecordings[`1_1`] !== undefined;
    }
    return localUserRecordings[`${surahNumber}_${verseNumber}`] !== undefined;
  };

  // Play existing recording
  const playExistingRecording = async (recording) => {
    try {
      // Use downloadURL if available, otherwise fall back to localUri
      const audioUri = recording.downloadURL || recording.localUri;
      
      if (!audioUri) {
        Alert.alert(t('error', currentLanguage), t('noAudioFileFound', currentLanguage));
        return;
      }
      
      console.log('🎵 Playing recording with URI:', audioUri);
      
      const { sound } = await Audio.Sound.createAsync({ uri: audioUri });
      await sound.playAsync();
      
      sound.setOnPlaybackStatusUpdate((status) => {
        if (status.didJustFinish) {
          sound.unloadAsync();
        }
      });
      
      console.log('✅ Recording playback started successfully');
    } catch (error) {
      console.error('Error playing existing recording:', error);
              Alert.alert(t('playbackError', currentLanguage), t('couldNotPlayRecording', currentLanguage));
    }
  };

  // Handle verse selection
  const handleVerseSelection = async (verse) => {
    // For Bismillah, check if Al-Fatiha verse 1 is recorded
    const checkSurahNumber = verse.isBismillah ? 1 : surah.number;
    const checkVerseNumber = verse.isBismillah ? 1 : verse.numberInSurah;
    const existingRecording = localUserRecordings[`${checkSurahNumber}_${checkVerseNumber}`];
    
    if (existingRecording) {
      // Show options for existing recording
      Alert.alert(
        'Verse Already Recorded',
        'This verse has already been recorded. What would you like to do?',
        [
          {
            text: 'Listen to Recording',
            onPress: () => playExistingRecording(existingRecording),
          },
          {
            text: 'Record Again',
            onPress: () => {
              navigation.navigate('RecordingScreen', {
                surah: surah,
                verse: verse,
                verses: verses,
                surahs: surahs,
                userRecordings: localUserRecordings,
                setUserRecordings: setUserRecordings,
                source: source, // Pass along the source
              });
            },
          },
          {
            text: 'Cancel',
            style: 'cancel',
          },
        ]
      );
    } else {
      // Navigate to recording screen for new recording
      navigation.navigate('RecordingScreen', {
        surah: surah,
        verse: verse,
        verses: verses,
        surahs: surahs,
        userRecordings: localUserRecordings,
        setUserRecordings: setUserRecordings,
        source: source, // Pass along the source
      });
    }
  };

  // Render verse item
  const renderVerseItem = ({ item }) => {
    const isRecorded = isVerseRecorded(surah.number, item.numberInSurah);
    const verseText = item.text.length > 50 ? item.text.substring(0, 50) + '...' : item.text;

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
        onPress={() => handleVerseSelection(item)}
      >
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
          <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center' }}>
            {/* Recording Status Circle */}
            <View style={{ 
              width: 40, 
              height: 40, 
              borderRadius: 20, 
              borderWidth: 2,
              borderColor: isRecorded ? '#34D399' : '#4B5563',
              backgroundColor: 'transparent',
              justifyContent: 'center',
              alignItems: 'center',
              marginRight: 16,
            }}>
              {isRecorded ? (
                <Ionicons name="checkmark" size={20} color="#34D399" />
              ) : (
                <Ionicons name="mic-outline" size={20} color="#4B5563" />
              )}
            </View>

            {/* Verse Info */}
            <View style={{ flex: 1 }}>
              <Text style={{ 
                fontWeight: 'bold', 
                color: '#FFFFFF',
                fontSize: 16,
              }}>
                {item.isBismillah ? t('tasmiyah', currentLanguage) : `${t('verse', currentLanguage)} ${item.numberInSurah}`}
              </Text>
              <Text style={{ 
                color: '#B0B0B0',
                marginTop: 4,
                fontSize: 14,
                lineHeight: 20,
              }}>
                {verseText}
              </Text>
            </View>
          </View>

          {/* Recording Date */}
          {isRecorded && (() => {
            const checkSurahNumber = item.isBismillah ? 1 : surah.number;
            const checkVerseNumber = item.isBismillah ? 1 : item.numberInSurah;
            const recording = userRecordings[`${checkSurahNumber}_${checkVerseNumber}`];
            
            if (recording && recording.timestamp) {
              const date = recording.timestamp.toDate ? recording.timestamp.toDate() : new Date(recording.timestamp);
              const formattedDate = date.toLocaleDateString('en-US', { 
                month: 'short', 
                day: 'numeric',
                year: 'numeric'
              });
              
              return (
                <View style={{ 
                  alignItems: 'flex-end',
                  marginLeft: 12,
                  minWidth: 80,
                }}>
                  <Text style={{ 
                    color: '#34D399',
                    fontSize: 12,
                    fontWeight: '500',
                    textAlign: 'right',
                  }}>
                    {formattedDate}
                  </Text>
                </View>
              );
            }
            return null;
          })()}

          {/* Chevron */}
          <Ionicons 
            name="chevron-forward" 
            size={20} 
            color="#4B5563" 
            style={{ marginLeft: 12 }}
          />
        </View>
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
            onPress={handleBackPress}
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
            {surah.englishName}
          </Text>
          <View style={{ width: 40 }} />
        </View>
        
        <Text style={{ 
          color: 'rgba(255,255,255,0.7)', 
          fontSize: 14, 
          marginTop: 8,
          textAlign: 'center',
        }}>
          {t('selectVerseToRecord', currentLanguage)}
        </Text>
      </LinearGradient>

      {/* Verse List */}
      <FlatList
        data={(() => {
          // Create a combined list with Bismillah and actual verses
          const combinedVerses = [];
          
          // Add Bismillah for all surahs except Al-Fatiha
          if (surah.number !== 1) {
            combinedVerses.push({
              numberInSurah: 0, // Special number for Bismillah
              text: FIRST_VERSE_MAP[1], // Al-Fatiha's first verse (Bismillah)
              isBismillah: true,
              transliteration: 'Bismillah',
            });
          }
          
          // Add actual verses, but replace first verse with the correct one from map
          verses.forEach((verse, index) => {
            if (verse.numberInSurah === 1) {
              // Use the correct first verse from the map
              combinedVerses.push({
                ...verse,
                text: FIRST_VERSE_MAP[surah.number] || verse.text,
              });
            } else {
              combinedVerses.push(verse);
            }
          });
          
          return combinedVerses;
        })()}
        renderItem={renderVerseItem}
        keyExtractor={(item) => item.isBismillah ? 'bismillah' : item.numberInSurah.toString()}
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
              {t('versesInSurah', currentLanguage).replace('{count}', verses.length + (surah.number !== 1 ? 1 : 0)).replace('{surah}', surah.englishName)}
            </Text>
          </View>
        }
      />
    </SafeAreaView>
  );
};

export default VerseSelectionScreen; 