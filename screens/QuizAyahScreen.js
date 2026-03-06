import React, { useState, useEffect, useRef, useCallback } from 'react';
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
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { Audio } from 'expo-av';
import { useLanguage } from '../utils/useLanguage';
import { t } from '../utils/translations';
import { availableReciters, getAyahAudioUrl } from '../services/reciterService';

// Removed DraggablePart - now using simple tap to select

export default function QuizAyahScreen({ route, navigation }) {
  const { currentLanguage } = useLanguage();
  const { surah, ayah, onQuizComplete } = route.params || {};
  
  const [selectedReciter, setSelectedReciter] = useState('5');
  const [audio, setAudio] = useState(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [ayahData, setAyahData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [ayahText, setAyahText] = useState('');
  const [correctTranslation, setCorrectTranslation] = useState('');
  const [translationOptions, setTranslationOptions] = useState([]);
  const [selectedTranslation, setSelectedTranslation] = useState(null);
  const [showAnswer, setShowAnswer] = useState(false);
  const [quizStage, setQuizStage] = useState('dragDrop'); // 'dragDrop', 'translation', or 'fillBlank'
  const [ayahParts, setAyahParts] = useState([]);
  const [arrangedParts, setArrangedParts] = useState([]);
  const [correctOrder, setCorrectOrder] = useState([]);
  const [fillBlankQuestions, setFillBlankQuestions] = useState([]);
  const [currentFillBlankIndex, setCurrentFillBlankIndex] = useState(0);
  const [selectedFillBlankAnswer, setSelectedFillBlankAnswer] = useState(null);
  const [quizResults, setQuizResults] = useState({
    dragDrop: null, // null = not answered, true = correct, false = incorrect
    translation: null,
    fillBlank: [], // Array of true/false for each fill blank question
  });
  const [showResults, setShowResults] = useState(false);
  const [totalQuestions, setTotalQuestions] = useState(0);
  const dropZoneRef = useRef(null);
  const arrangedPartsRefs = useRef([]);
  const [selectedPartIndex, setSelectedPartIndex] = useState(null); // Track which part is selected for placement

  useEffect(() => {
    if (surah && ayah) {
      loadAyahData();
    }

    Audio.setAudioModeAsync({
      allowsRecordingIOS: false,
      staysActiveInBackground: true,
      playsInSilentModeIOS: true,
      shouldDuckAndroid: true,
      playThroughEarpieceAndroid: false,
    });

    return () => {
      if (audio) {
        audio.unloadAsync().catch(console.error);
      }
    };
  }, [surah, ayah]);

  const loadAyahData = async () => {
    if (!surah || !ayah) return;
    
    setLoading(true);
    try {
      const response = await fetch(`https://api.alquran.cloud/v1/surah/${surah.number}`);
      const data = await response.json();
      
      if (data.code === 200 && data.data && data.data.ayahs) {
        const ayahItem = data.data.ayahs.find(a => a.numberInSurah === ayah.numberInSurah);
        
        if (ayahItem) {
          setAyahData(ayahItem);
          
          setAyahText(ayahItem.text);
          
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

          if (translation) {
            setCorrectTranslation(translation);
            
            // Generate wrong translations (from other ayahs in the surah)
            try {
              const translationResponse = await fetch(`https://api.alquran.cloud/v1/surah/${surah.number}/en.sahih`);
              const translationData = await translationResponse.json();
              if (translationData.code === 200 && translationData.data) {
                const allTranslations = translationData.data.ayahs
                  .filter(a => a.numberInSurah !== ayah.numberInSurah)
                  .map(a => a.text)
                  .filter(t => t && t.trim().length > 0);
                
                // Get 2 random wrong translations
                const wrongTranslations = allTranslations
                  .sort(() => Math.random() - 0.5)
                  .slice(0, 2);
                
                // Combine correct and wrong, then shuffle
                const options = [translation, ...wrongTranslations].sort(() => Math.random() - 0.5);
                setTranslationOptions(options);
              }
            } catch (error) {
              console.log('Could not fetch wrong translations:', error);
              // Fallback: use placeholder wrong translations
              setTranslationOptions([
                translation,
                "But those who strive against Our Ayat (proofs, evidences, lessons, signs, revelations, etc.) to frustrate them, those, for them will be a severe painful torment.",
                "He it is Who sends down water (rain) from the sky; from it you drink and from it (grows) the vegetation on which you send your cattle to pasture."
              ].sort(() => Math.random() - 0.5));
            }
          }

          // Prepare drag and drop parts
          const arabicText = ayahItem.text;
          const words = arabicText.split(/\s+/).filter(w => w.trim().length > 0);
          
          // Shuffle for drag and drop
          const shuffled = [...words].sort(() => Math.random() - 0.5);
          setAyahParts(shuffled);
          setArrangedParts([]);
          setCorrectOrder(words);

          // Prepare fill-in-the-blank questions (1-5 questions)
          const numQuestions = Math.min(5, Math.max(1, Math.floor(words.length / 2)));
          const questionIndices = [];
          while (questionIndices.length < numQuestions) {
            const randomIndex = Math.floor(Math.random() * words.length);
            if (!questionIndices.includes(randomIndex)) {
              questionIndices.push(randomIndex);
            }
          }
          questionIndices.sort((a, b) => a - b);

          const questions = questionIndices.map(blankIndex => {
            const correctWord = words[blankIndex];
            // Get wrong options from other words in the ayah
            const wrongOptions = words
              .filter((_, index) => index !== blankIndex)
              .sort(() => Math.random() - 0.5)
              .slice(0, 2);
            
            const options = [correctWord, ...wrongOptions].sort(() => Math.random() - 0.5);
            
            return {
              blankIndex,
              correctWord,
              options,
              words: [...words], // Keep full word array for display
            };
          });

          setFillBlankQuestions(questions);
          setTotalQuestions(2 + questions.length); // Drag drop + translation + fill blanks
          // Initialize fill blank results array
          setQuizResults(prev => ({ ...prev, fillBlank: new Array(questions.length).fill(null) }));
        }
      }
    } catch (error) {
      console.error('Error loading ayah data:', error);
      Alert.alert('Error', 'Failed to load ayah data.');
    } finally {
      setLoading(false);
    }
  };

  const handlePlayAudio = async () => {
    if (!ayah || !selectedReciter) return;

    try {
      if (isPlaying && audio) {
        await audio.pauseAsync();
        setIsPlaying(false);
        return;
      }

      if (audio) {
        await audio.unloadAsync();
        setAudio(null);
      }

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

      const { sound } = await Audio.Sound.createAsync(
        { uri: audioUrl },
        { shouldPlay: true }
      );

      setAudio(sound);
      setIsPlaying(true);

      sound.setOnPlaybackStatusUpdate((status) => {
        if (status.didJustFinish) {
          setIsPlaying(false);
        }
      });
    } catch (error) {
      console.error('Error playing audio:', error);
      Alert.alert('Error', 'Failed to play audio.');
    }
  };

  const selectTranslation = (translation) => {
    setSelectedTranslation(translation);
    
    // Check answer and update results (only if not already set, to track first attempt)
    const isCorrect = translation === correctTranslation;
    if (quizResults.translation === null) {
      setQuizResults(prev => ({ ...prev, translation: isCorrect }));
    }
  };

  const continueTranslation = () => {
    if (!selectedTranslation) return;
    
    // Move to fill blank stage
    if (fillBlankQuestions.length > 0) {
      setQuizStage('fillBlank');
      setCurrentFillBlankIndex(0);
      setSelectedFillBlankAnswer(null);
    } else {
      // No fill blank questions, show results
      calculateAndShowResults();
    }
  };

  // Handle selecting a part to place
  const selectPartToPlace = (partIndex) => {
    setSelectedPartIndex(partIndex);
  };

  // Handle placing selected part before or after an arranged part
  const placePartInArranged = (arrangedIndex, placeBefore = true) => {
    if (selectedPartIndex === null) return;
    
    const part = ayahParts[selectedPartIndex];
    const insertIndex = placeBefore ? arrangedIndex : arrangedIndex + 1;
    
    setArrangedParts(prev => {
      const newArranged = [...prev];
      newArranged.splice(insertIndex, 0, part);
      return newArranged;
    });
    setAyahParts(prev => prev.filter((_, index) => index !== selectedPartIndex));
    setSelectedPartIndex(null);
  };

  // Handle placing part when drop zone is empty
  const placePartInEmptyZone = () => {
    if (selectedPartIndex === null) return;
    
    const part = ayahParts[selectedPartIndex];
    setArrangedParts([part]);
    setAyahParts(prev => prev.filter((_, index) => index !== selectedPartIndex));
    setSelectedPartIndex(null);
  };

  const removePartFromArranged = (partIndex) => {
    const part = arrangedParts[partIndex];
    setAyahParts(prev => [...prev, part]);
    setArrangedParts(prev => prev.filter((_, index) => index !== partIndex));
    // Update refs array to match - but do it after state update
    setTimeout(() => {
      arrangedPartsRefs.current = arrangedPartsRefs.current.filter((_, index) => index !== partIndex);
    }, 0);
  };

  const clearAllArrangedParts = () => {
    setAyahParts(prev => [...prev, ...arrangedParts]);
    setArrangedParts([]);
    arrangedPartsRefs.current = [];
  };

  // Handle completing drag and drop (user clicks Complete button)
  const completeDragDrop = () => {
    if (ayahParts.length > 0) {
      Alert.alert('Incomplete', 'Please arrange all parts before completing.');
      return;
    }
    
    // Check answer
    const isCorrect = arrangedParts.length === correctOrder.length && 
                      arrangedParts.every((part, index) => part === correctOrder[index]);
    
    // Update results (only if not already set, to track first attempt)
    if (quizResults.dragDrop === null) {
      setQuizResults(prev => ({ ...prev, dragDrop: isCorrect }));
    }
    
    // Move to translation stage
    setQuizStage('translation');
    setArrangedParts([]);
    setAyahParts([]);
    arrangedPartsRefs.current = [];
  };

  // Removed checkTranslationAnswer - now handled in selectTranslation

  // Handle fill blank selection
  const handleFillBlankSelection = (option) => {
    setSelectedFillBlankAnswer(option);
    
    const currentQuestion = fillBlankQuestions[currentFillBlankIndex];
    const isCorrect = option === currentQuestion.correctWord;
    
    // Update results (only if not already set, to track first attempt)
    const newFillBlankResults = [...quizResults.fillBlank];
    if (newFillBlankResults[currentFillBlankIndex] === null) {
      newFillBlankResults[currentFillBlankIndex] = isCorrect;
      setQuizResults(prev => ({ ...prev, fillBlank: newFillBlankResults }));
    } else if (isCorrect && newFillBlankResults[currentFillBlankIndex] === false) {
      // Update to correct if they got it right on retry
      newFillBlankResults[currentFillBlankIndex] = true;
      setQuizResults(prev => ({ ...prev, fillBlank: newFillBlankResults }));
    }
  };

  const continueFillBlank = () => {
    if (!selectedFillBlankAnswer) return;
    
    // Move to next question or show results
    if (currentFillBlankIndex < fillBlankQuestions.length - 1) {
      setCurrentFillBlankIndex(currentFillBlankIndex + 1);
      setSelectedFillBlankAnswer(null);
    } else {
      // All questions completed, show results
      calculateAndShowResults();
    }
  };

  const calculateAndShowResults = () => {
    const results = [];
    let correctCount = 0;

    // Drag drop
    results.push({
      type: 'Drag and Drop',
      question: 'Arrange the ayah in correct order',
      correct: quizResults.dragDrop,
    });
    if (quizResults.dragDrop) correctCount++;

    // Translation
    results.push({
      type: 'Translation',
      question: 'Select the correct translation',
      correct: quizResults.translation,
    });
    if (quizResults.translation) correctCount++;

    // Fill blanks
    fillBlankQuestions.forEach((q, index) => {
      const isCorrect = quizResults.fillBlank[index] === true;
      results.push({
        type: 'Fill in the Blank',
        question: `Fill in the blank (Question ${index + 3})`,
        correct: isCorrect,
      });
      if (isCorrect) correctCount++;
    });

    const percentage = Math.round((correctCount / totalQuestions) * 100);
    setShowResults(true);

    // Check if should unlock next section (75% or better)
    if (percentage >= 75) {
      // Unlock next ayah - this will be handled by the parent screen
      // For now, just show success
    }
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
        
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => navigation.goBack()}
          >
            <Ionicons name="chevron-back" size={24} color="#fff" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>
            {surah?.englishName || 'Surah'} - Ayah {ayah?.numberInSurah}
          </Text>
          <View style={{ width: 40 }} />
        </View>

        {quizStage === 'dragDrop' ? (
          <View style={styles.quizContent}>
            <ScrollView 
              style={styles.quizScrollView}
              contentContainerStyle={[
                styles.quizScrollContent,
                { paddingBottom: Platform.OS === 'android' ? 180 : 20 }
              ]}
              showsVerticalScrollIndicator={false}
            >
              {/* Drag and Drop Section */}
              <View style={styles.translationsContainer}>
                <Text style={styles.instructionText}>
                  <Text style={styles.questionNumber}>1/{totalQuestions}</Text>
                  <Text style={styles.questionTextBold}>: Place the parts of the ayah to arrange the ayah in the correct order</Text>
                </Text>
              </View>

            {/* Drop Zone */}
            <View 
              ref={dropZoneRef} 
              style={[
                styles.dropZone,
                { minHeight: Math.max(150, 60 + Math.ceil(arrangedParts.length / 3) * 50) }
              ]}
            >
                {arrangedParts.length > 0 && (
                  <TouchableOpacity
                    style={styles.clearButton}
                    onPress={clearAllArrangedParts}
                  >
                    <Ionicons name="close-circle" size={24} color="#FFFFFF" />
                  </TouchableOpacity>
                )}
              {arrangedParts.length > 0 ? (
                <View style={styles.arrangedParts}>
                  {selectedPartIndex !== null && (
                    <TouchableOpacity
                      style={styles.placementIconButton}
                      onPress={() => placePartInArranged(0, true)}
                    >
                      <Ionicons name="add-circle" size={24} color="#FFD700" />
                    </TouchableOpacity>
                  )}
                  {arrangedParts.map((part, index) => {
                    // Ensure refs array is properly sized
                    while (arrangedPartsRefs.current.length <= index) {
                      arrangedPartsRefs.current.push(null);
                    }
                    return (
                      <React.Fragment key={`${part}-${index}-${arrangedParts.length}`}>
                        <View
                          ref={(ref) => {
                            arrangedPartsRefs.current[index] = ref;
                          }}
                          style={styles.arrangedPartContainer}
                        >
                          <View style={styles.arrangedPartButton}>
                            <View style={styles.arrangedPartTextContainer}>
                              <Text style={styles.arrangedPartText}>{part}</Text>
                            </View>
                            <TouchableOpacity
                              style={styles.removePartButton}
                              onPress={() => removePartFromArranged(index)}
                            >
                              <Ionicons name="close-circle" size={18} color="#FFFFFF" />
                            </TouchableOpacity>
                          </View>
                        </View>
                        {selectedPartIndex !== null && (
                          <TouchableOpacity
                            style={styles.placementIconButton}
                            onPress={() => placePartInArranged(index + 1, true)}
                          >
                            <Ionicons name="add-circle" size={24} color="#FFD700" />
                          </TouchableOpacity>
                        )}
                      </React.Fragment>
                    );
                  })}
                </View>
              ) : (
                <TouchableOpacity
                  style={styles.emptyZoneButton}
                  onPress={placePartInEmptyZone}
                  disabled={selectedPartIndex === null}
                >
                  <Text style={[
                    styles.dropZonePlaceholder,
                    selectedPartIndex !== null && styles.dropZonePlaceholderActive
                  ]}>
                    {selectedPartIndex !== null ? 'Tap to place part here' : 'Tap a part, then tap here'}
                  </Text>
                </TouchableOpacity>
              )}
              </View>

              {/* Complete Button - Show when all parts are arranged */}
              {ayahParts.length === 0 && arrangedParts.length > 0 && (
                <View style={styles.checkButtonContainer}>
                  <TouchableOpacity
                    style={styles.checkButton}
                    onPress={completeDragDrop}
                  >
                    <Text style={styles.checkButtonText}>Complete</Text>
                  </TouchableOpacity>
                </View>
              )}

              {/* Available Parts */}
              <View style={styles.draggableContainer}>
                <Text style={styles.draggableTitle}>
                  {selectedPartIndex !== null ? 'Selected: Tap "Before" or "After" on a part above' : 'Parts: Tap to select'}
                </Text>
                <View style={styles.draggableScrollContent}>
                  {ayahParts.map((part, index) => (
                    <TouchableOpacity
                      key={`${part}-${index}`}
                      style={[
                        styles.draggablePart,
                        selectedPartIndex === index && styles.draggablePartSelected
                      ]}
                      onPress={() => selectPartToPlace(index)}
                    >
                      <Text style={styles.draggablePartText}>{part}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            </ScrollView>

          </View>
        ) : quizStage === 'translation' ? (
          <View style={styles.quizContent}>
            <ScrollView 
              style={styles.quizScrollView}
              contentContainerStyle={[
                styles.quizScrollContent,
                { paddingBottom: Platform.OS === 'android' ? 180 : 20 }
              ]}
              showsVerticalScrollIndicator={false}
            >
              {/* Arabic Ayah */}
              <View style={styles.arabicContainer}>
                <Text style={styles.arabicText}>{ayahText}</Text>
              </View>

              {/* Translation Options */}
              <View style={styles.translationsContainer}>
                <Text style={styles.instructionText}>
                  <Text style={styles.questionNumber}>2/{totalQuestions}</Text>
                  <Text style={styles.questionTextBold}>: Select the correct translation</Text>
                </Text>
                <View style={styles.translationsScrollContent}>
                  {translationOptions.map((translation, index) => (
                    <TouchableOpacity
                      key={index}
                      style={[
                        styles.translationOption,
                        selectedTranslation === translation && styles.translationOptionSelected
                      ]}
                      onPress={() => selectTranslation(translation)}
                      activeOpacity={0.7}
                    >
                      <Text style={[
                        styles.translationText,
                        selectedTranslation === translation && styles.translationTextSelected
                      ]}>
                        {translation}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              {/* Show Correct Answer */}
              {showAnswer && (
                <View style={styles.answerContainer}>
                  <Text style={styles.answerLabel}>Correct Translation:</Text>
                  <Text style={styles.answerText}>{correctTranslation}</Text>
                </View>
              )}
            </ScrollView>

            {/* Continue Button - Always at bottom */}
            <View style={styles.checkButtonContainer}>
              <TouchableOpacity
                style={[
                  styles.checkButton,
                  !selectedTranslation && styles.checkButtonDisabled
                ]}
                onPress={continueTranslation}
                disabled={!selectedTranslation}
              >
                <Text style={[
                  styles.checkButtonText,
                  !selectedTranslation && styles.checkButtonTextDisabled
                ]}>
                  Continue
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        ) : (
          <View style={styles.quizContent}>
            <ScrollView 
              style={styles.quizScrollView}
              contentContainerStyle={[
                styles.quizScrollContent,
                { paddingBottom: Platform.OS === 'android' ? 180 : 20 }
              ]}
              showsVerticalScrollIndicator={false}
            >
              {/* Fill in the Blank Section */}
              {!showResults && fillBlankQuestions.length > 0 && currentFillBlankIndex < fillBlankQuestions.length && (() => {
                const currentQuestion = fillBlankQuestions[currentFillBlankIndex];
                const questionNumber = currentFillBlankIndex + 3; // Questions start at 3
                return (
                  <>
                    {/* Arabic Ayah with Blank */}
                    <View style={styles.arabicContainer}>
                      <Text style={styles.arabicText}>
                        {currentQuestion.words.map((word, index) => {
                          if (index === currentQuestion.blankIndex) {
                            return (
                              <Text key={index} style={styles.blankText}>
                                {'___ '}
                              </Text>
                            );
                          }
                          return <Text key={index}>{word + ' '}</Text>;
                        })}
                      </Text>
                    </View>

                    {/* Fill Blank Options */}
                    <View style={styles.translationsContainer}>
                      <Text style={styles.instructionText}>
                        <Text style={styles.questionNumber}>{questionNumber}/{totalQuestions}</Text>
                        <Text style={styles.questionTextBold}>: Select the correct word to fill in the blank</Text>
                      </Text>
                      <View style={styles.translationsScrollContent}>
                            {currentQuestion.options.map((option, index) => (
                              <TouchableOpacity
                                key={index}
                                style={[
                                  styles.translationOption,
                                  selectedFillBlankAnswer === option && styles.translationOptionSelected
                                ]}
                                onPress={() => handleFillBlankSelection(option)}
                                activeOpacity={0.7}
                              >
                                <Text style={[
                                  styles.translationText,
                                  selectedFillBlankAnswer === option && styles.translationTextSelected
                                ]}>
                                  {option}
                                </Text>
                              </TouchableOpacity>
                            ))}
                      </View>
                    </View>
                  </>
                );
              })()}
            </ScrollView>

            {/* Continue Button - Always at bottom */}
            {!showResults && fillBlankQuestions.length > 0 && currentFillBlankIndex < fillBlankQuestions.length && (
              <View style={styles.checkButtonContainer}>
                <TouchableOpacity
                  style={[
                    styles.checkButton,
                    !selectedFillBlankAnswer && styles.checkButtonDisabled
                  ]}
                  onPress={continueFillBlank}
                  disabled={!selectedFillBlankAnswer}
                >
                  <Text style={[
                    styles.checkButtonText,
                    !selectedFillBlankAnswer && styles.checkButtonTextDisabled
                  ]}>
                    Continue
                  </Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        )}

        {/* Results Screen - Full Screen */}
        {showResults && (
          <View style={styles.resultsFullScreen}>
            <ScrollView 
              style={styles.resultsScrollView}
              showsVerticalScrollIndicator={false}
              contentContainerStyle={[
                styles.resultsScrollContent,
                { paddingBottom: Platform.OS === 'android' ? 180 : 20 }
              ]}
            >
              <Text style={styles.resultsTitle}>Quiz Results</Text>
              
              {/* Overall Score */}
              {(() => {
                const correctCount = (quizResults.dragDrop ? 1 : 0) + 
                                   (quizResults.translation ? 1 : 0) + 
                                   quizResults.fillBlank.filter(r => r === true).length;
                const percentage = Math.round((correctCount / totalQuestions) * 100);
                const isPassing = percentage >= 75;
                const isBarelyPassing = percentage >= 75 && percentage < 80;

                return (
                  <>
                    <View style={styles.scoreContainer}>
                      <Text style={styles.scoreText}>{percentage}%</Text>
                      <Text style={styles.scoreLabel}>
                        {correctCount} out of {totalQuestions} correct
                      </Text>
                      {isPassing ? (
                        <View style={styles.passBadge}>
                          <Ionicons name="checkmark-circle" size={24} color="#34D399" />
                          <Text style={styles.passText}>Passed</Text>
                        </View>
                      ) : (
                        <View style={styles.failBadge}>
                          <Ionicons name="close-circle" size={24} color="#F87171" />
                          <Text style={styles.failText}>Not Passed</Text>
                        </View>
                      )}
                    </View>

                    {/* Question Breakdown */}
                    <View style={styles.breakdownContainer}>
                      <Text style={styles.breakdownTitle}>Question Breakdown:</Text>
                      
                      {/* Drag Drop */}
                      <View style={styles.resultItem}>
                        <Ionicons 
                          name={quizResults.dragDrop ? "checkmark-circle" : "close-circle"} 
                          size={20} 
                          color={quizResults.dragDrop ? "#FFD700" : "#F87171"} 
                        />
                        <Text style={styles.resultText}>
                          Question 1 (Drag and Drop): {quizResults.dragDrop ? 'Correct' : 'Incorrect'}
                        </Text>
                      </View>

                      {/* Translation */}
                      <View style={styles.resultItem}>
                        <Ionicons 
                          name={quizResults.translation ? "checkmark-circle" : "close-circle"} 
                          size={20} 
                          color={quizResults.translation ? "#FFD700" : "#F87171"} 
                        />
                        <Text style={styles.resultText}>
                          Question 2 (Translation): {quizResults.translation ? 'Correct' : 'Incorrect'}
                        </Text>
                      </View>

                      {/* Fill Blanks */}
                      {fillBlankQuestions.map((q, index) => {
                        const isCorrect = quizResults.fillBlank[index] === true;
                        return (
                          <View key={index} style={styles.resultItem}>
                            <Ionicons 
                              name={isCorrect ? "checkmark-circle" : "close-circle"} 
                              size={20} 
                              color={isCorrect ? "#FFD700" : "#F87171"} 
                            />
                            <Text style={styles.resultText}>
                              Question {index + 3} (Fill in the Blank): {isCorrect ? 'Correct' : 'Incorrect'}
                            </Text>
                          </View>
                        );
                      })}
                    </View>

                    {/* Recommendation */}
                    {isBarelyPassing && (
                      <View style={styles.recommendationContainer}>
                        <Ionicons name="information-circle" size={24} color="#FFD700" />
                        <Text style={styles.recommendationText}>
                          You barely passed. Consider going back to rememorize this ayah for better retention.
                        </Text>
                      </View>
                    )}

                    {!isPassing && (
                      <View style={styles.recommendationContainer}>
                        <Ionicons name="alert-circle" size={24} color="#F87171" />
                        <Text style={styles.recommendationText}>
                          You need 75% or better to pass. Please rememorize this ayah and try again.
                        </Text>
                      </View>
                    )}
                  </>
                );
              })()}

              {/* Action Buttons */}
              <View style={styles.resultsActions}>
                <TouchableOpacity
                  style={styles.resultsButton}
                  onPress={() => {
                    const correctCount = (quizResults.dragDrop ? 1 : 0) + 
                                       (quizResults.translation ? 1 : 0) + 
                                       quizResults.fillBlank.filter(r => r === true).length;
                    const percentage = Math.round((correctCount / totalQuestions) * 100);
                    const passed = percentage >= 75;
                    
                    if (onQuizComplete) {
                      onQuizComplete(passed);
                    }
                    navigation.goBack();
                  }}
                >
                  <Text style={styles.resultsButtonText}>Done</Text>
                </TouchableOpacity>
              </View>
            </ScrollView>
          </View>
        )}
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
    backgroundColor: '#121212',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#FFFFFF',
    flex: 1,
    textAlign: 'center',
  },
  backButton: {
    padding: 8,
  },
  instructionText: {
    color: '#FFFFFF',
    fontSize: 16,
  },
  questionNumber: {
    fontWeight: 'normal',
  },
  questionTextBold: {
    fontWeight: 'bold',
  },
  dropZone: {
    backgroundColor: '#1E1E1E',
    marginHorizontal: 20,
    marginTop: 0,
    marginBottom: 20,
    borderRadius: 12,
    padding: 20,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#2A2A2A',
    position: 'relative',
  },
  clearButton: {
    position: 'absolute',
    top: 10,
    right: 10,
    zIndex: 10,
    padding: 5,
  },
  arrangedParts: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    justifyContent: 'flex-start',
    zIndex: 2,
    minHeight: 60,
    padding: 8,
  },
  arrangedPartContainer: {
    margin: 3,
    position: 'relative',
    alignSelf: 'flex-start',
  },
  arrangedPartRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  arrangedPartButton: {
    backgroundColor: '#2A2A2A',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 8,
    paddingTop: 8,
    paddingRight: 8,
    borderWidth: 1,
    borderColor: '#4B5563',
    position: 'relative',
    alignSelf: 'flex-start',
  },
  removePartButton: {
    position: 'absolute',
    top: 4,
    right: 4,
    padding: 4,
    zIndex: 10,
  },
  placementIconButton: {
    padding: 4,
  },
  emptyZoneButton: {
    width: '100%',
    padding: 20,
  },
  dropZonePlaceholderActive: {
    color: '#FFD700',
  },
  arrangedPartTextContainer: {
    justifyContent: 'center',
    alignItems: 'center',
    paddingRight: 18, // Space for X button
    paddingTop: 2,
  },
  arrangedPartText: {
    fontSize: 16,
    color: '#FFFFFF',
    fontFamily: Platform.OS === 'ios' ? 'Arial' : 'Roboto',
    textAlign: 'center',
  },
  dropZonePlaceholder: {
    fontSize: 16,
    color: '#666666',
    fontStyle: 'italic',
    zIndex: 2,
  },
  draggableContainer: {
    padding: 20,
    paddingBottom: 12,
  },
  draggableTitle: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 12,
  },
  draggableScrollContent: {
    paddingVertical: 10,
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  draggablePart: {
    backgroundColor: '#2A2A2A',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginRight: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#4B5563',
  },
  draggablePartSelected: {
    borderColor: '#FFD700',
    borderWidth: 2,
    backgroundColor: '#3A3A3A',
  },
  draggablePartText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontFamily: Platform.OS === 'ios' ? 'Arial' : 'Roboto',
  },
  arabicContainer: {
    backgroundColor: '#1E1E1E',
    padding: 20,
    margin: 20,
    borderRadius: 12,
    alignItems: 'center',
  },
  arabicText: {
    fontSize: 28,
    color: '#FFFFFF',
    textAlign: 'center',
    lineHeight: 48,
    fontFamily: Platform.OS === 'ios' ? 'Arial' : 'Roboto',
  },
  blankText: {
    fontSize: 28,
    color: '#FFD700',
    textAlign: 'center',
    lineHeight: 48,
    fontFamily: Platform.OS === 'ios' ? 'Arial' : 'Roboto',
    textDecorationLine: 'underline',
  },
  translationsContainer: {
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 8,
  },
  translationsScrollContent: {
    paddingTop: 20,
    paddingBottom: 20,
  },
  translationOption: {
    backgroundColor: '#1E1E1E',
    borderRadius: 12,
    padding: 18,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#2A2A2A',
  },
  translationOptionSelected: {
    borderColor: '#FFD700',
    backgroundColor: '#2A2A2A',
  },
  translationText: {
    color: '#FFFFFF',
    fontSize: 16,
    lineHeight: 24,
  },
  translationTextSelected: {
    color: '#FFD700',
  },
  quizContent: {
    flex: 1,
  },
  quizScrollView: {
    flex: 1,
  },
  quizScrollContent: {
    paddingBottom: 20,
  },
  checkButtonContainer: {
    paddingHorizontal: 20,
    paddingBottom: 20,
    paddingTop: 10,
    backgroundColor: '#121212',
    borderTopWidth: 1,
    borderTopColor: '#2A2A2A',
  },
  checkButton: {
    backgroundColor: '#2A2A2A',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#4B5563',
  },
  checkButtonDisabled: {
    backgroundColor: '#1A1A1A',
    borderColor: '#2A2A2A',
    opacity: 0.5,
  },
  checkButtonText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: 'bold',
  },
  checkButtonTextDisabled: {
    color: '#666666',
  },
  answerContainer: {
    backgroundColor: '#1E1E1E',
    padding: 20,
    margin: 20,
    borderRadius: 12,
  },
  answerLabel: {
    color: '#B0B0B0',
    fontSize: 14,
    marginBottom: 8,
  },
  answerText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontFamily: Platform.OS === 'ios' ? 'Arial' : 'Roboto',
    textAlign: 'center',
  },
  resultsFullScreen: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: '#121212',
    zIndex: 1000,
  },
  resultsScrollView: {
    flex: 1,
  },
  resultsScrollContent: {
    padding: 20,
    paddingBottom: 40,
  },
  resultsTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#FFFFFF',
    textAlign: 'center',
    marginBottom: 24,
  },
  scoreContainer: {
    backgroundColor: '#1E1E1E',
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
    marginBottom: 24,
  },
  scoreText: {
    fontSize: 48,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 8,
  },
  scoreLabel: {
    fontSize: 16,
    color: '#B0B0B0',
    marginBottom: 16,
  },
  passBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#2A2A2A',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#4B5563',
  },
  passText: {
    color: '#FFD700',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  failBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#2A2A2A',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#4B5563',
  },
  failText: {
    color: '#F87171',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  breakdownContainer: {
    backgroundColor: '#1E1E1E',
    borderRadius: 16,
    padding: 20,
    marginBottom: 24,
  },
  breakdownTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 16,
  },
  resultItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#2A2A2A',
  },
  resultText: {
    fontSize: 16,
    color: '#FFFFFF',
    marginLeft: 12,
    flex: 1,
  },
  recommendationContainer: {
    flexDirection: 'row',
    backgroundColor: '#2A2A2A',
    borderRadius: 12,
    padding: 16,
    marginBottom: 24,
    alignItems: 'flex-start',
  },
  recommendationText: {
    fontSize: 16,
    color: '#FFFFFF',
    marginLeft: 12,
    flex: 1,
    lineHeight: 24,
  },
  resultsActions: {
    marginTop: 20,
  },
  resultsButton: {
    backgroundColor: '#2A2A2A',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#4B5563',
  },
  resultsButtonText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: 'bold',
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
});

