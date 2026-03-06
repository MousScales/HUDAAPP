import React, { useState, useEffect, useCallback } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  ScrollView, 
  TouchableOpacity, 
  SafeAreaView,
  StatusBar,
  ActivityIndicator,
  Animated,
  Easing,
  Platform
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { getResponsiveIconSize, isTablet, getResponsiveGridColumns, getTabletSpacing } from '../utils/responsiveSizing';
// Removed Firebase progress import
import lessonService from '../services/lessonService';
import subscriptionGuard from '../services/subscriptionGuard';
import SubscriptionModal from '../components/SubscriptionModal';
import { useLanguage } from '../utils/useLanguage';
import { t } from '../utils/translations';
import multilingualLessonService from '../services/multilingualLessonService';

// Keep this export for backward compatibility (will be removed after migration)
export const lessonTopics = [
  // Theology & Core Beliefs
  {
    id: 1,
    title: 'Tawheed (Oneness of Allah)',
    description: 'Understanding the fundamental concept of Islamic monotheism',
    category: 'theology',
    icon: 'infinite-outline',
    color: '#1abc9c',
    difficulty: 'Essential'
  },
  {
    id: 2,
    title: 'Names and Attributes of Allah',
    description: 'Learning the 99 beautiful names of Allah and their meanings',
    category: 'theology',
    icon: 'text-outline',
    color: '#2ecc71',
    difficulty: 'Essential'
  },
  {
    id: 3,
    title: 'Belief in Angels',
    description: 'Understanding the nature and roles of angels in Islam',
    category: 'theology',
    icon: 'cloud-outline',
    color: '#3498db',
    difficulty: 'Essential'
  },
  {
    id: 4,
    title: 'Divine Books in Islam',
    description: 'Study of the revealed scriptures and their significance',
    category: 'theology',
    icon: 'book-outline',
    color: '#9b59b6',
    difficulty: 'Essential'
  },
  {
    id: 5,
    title: 'The Prophets of Allah',
    description: 'Lives and teachings of the 25 prophets mentioned in the Quran',
    category: 'prophets',
    icon: 'people-outline',
    color: '#34495e',
    difficulty: 'Essential'
  },
  // Qur'an Studies
  {
    id: 6,
    title: 'The Quran as a Miracle',
    description: 'Exploring the miraculous nature of the Quran',
    category: 'quran',
    icon: 'book-outline',
    color: '#16a085',
    difficulty: 'Intermediate'
  },
  {
    id: 7,
    title: 'Major Quranic Themes',
    description: 'Understanding the main topics and messages in the Quran',
    category: 'quran',
    icon: 'list-outline',
    color: '#27ae60',
    difficulty: 'Intermediate'
  },
  {
    id: 8,
    title: 'Stories from the Quran',
    description: 'Lessons from the narratives mentioned in the Quran',
    category: 'quran',
    icon: 'book-outline',
    color: '#2980b9',
    difficulty: 'Intermediate'
  },
  // Prophet Muhammad (SAW)
  {
    id: 9,
    title: 'Life of Prophet Muhammad (SAW)',
    description: 'Complete biography of the final messenger',
    category: 'seerah',
    icon: 'person-outline',
    color: '#8e44ad',
    difficulty: 'Essential'
  },
  {
    id: 10,
    title: 'Character of Prophet Muhammad (SAW)',
    description: 'Study of the Prophet\'s exemplary character and conduct',
    category: 'seerah',
    icon: 'heart-outline',
    color: '#c0392b',
    difficulty: 'Essential'
  },
  // Worship and Rituals
  {
    id: 11,
    title: 'Perfecting Your Prayer',
    description: 'Detailed guide to achieving excellence in Salah',
    category: 'worship',
    icon: 'person-outline',
    color: '#d35400',
    difficulty: 'Essential'
  },
  {
    id: 12,
    title: 'Fasting in Ramadan',
    description: 'Complete guide to fasting and its spiritual benefits',
    category: 'worship',
    icon: 'moon-outline',
    color: '#e67e22',
    difficulty: 'Essential'
  },
  {
    id: 13,
    title: 'Zakat and Charity',
    description: 'Understanding the principles of Islamic charity',
    category: 'worship',
    icon: 'gift-outline',
    color: '#f39c12',
    difficulty: 'Essential'
  },
  // Ethics and Character
  {
    id: 14,
    title: 'Islamic Ethics (Akhlaq)',
    description: 'Building noble character based on Islamic teachings',
    category: 'ethics',
    icon: 'heart-outline',
    color: '#1abc9c',
    difficulty: 'Essential'
  },
  {
    id: 15,
    title: 'Rights and Responsibilities',
    description: 'Understanding our duties towards Allah and creation',
    category: 'ethics',
    icon: 'list-outline',
    color: '#2ecc71',
    difficulty: 'Essential'
  },
  // Family Life
  {
    id: 16,
    title: 'Family in Islam',
    description: 'Islamic guidelines for family life and relationships',
    category: 'family',
    icon: 'people-outline',
    color: '#3498db',
    difficulty: 'Essential'
  },
  {
    id: 17,
    title: 'Marriage Guidance',
    description: 'Islamic perspective on marriage and family life',
    category: 'family',
    icon: 'heart-outline',
    color: '#9b59b6',
    difficulty: 'Essential'
  },
  // Contemporary Issues
  {
    id: 18,
    title: 'Islam in Modern Times',
    description: 'Applying Islamic principles in contemporary life',
    category: 'modern',
    icon: 'globe-outline',
    color: '#34495e',
    difficulty: 'Advanced'
  },
  {
    id: 19,
    title: 'Digital Age Challenges',
    description: 'Islamic guidance for technology and social media use',
    category: 'modern',
    icon: 'phone-portrait-outline',
    color: '#16a085',
    difficulty: 'Advanced'
  },
  // Death and Afterlife
  {
    id: 20,
    title: 'Journey to the Hereafter',
    description: 'Islamic teachings about death and the afterlife',
    category: 'afterlife',
    icon: 'time-outline',
    color: '#2c3e50',
    difficulty: 'Essential'
  }
];

export default function LessonsScreen({ navigation }) {
  // Language support
  const { currentLanguage } = useLanguage();
  
  const [activeCategory, setActiveCategory] = useState('all');
  const [visibleLessons, setVisibleLessons] = useState([]);
  const [lessonProgress, setLessonProgress] = useState({});
  const [loading, setLoading] = useState(true);
  const [showRoadmap, setShowRoadmap] = useState(false);
  const [lessons, setLessons] = useState([]); // New state for loaded lessons
  const [loadingLessons, setLoadingLessons] = useState(true); // New state for lesson loading
  const [progressLoading, setProgressLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [displayedLessons, setDisplayedLessons] = useState([]);
  const [viewMode, setViewMode] = useState('list'); // Add missing viewMode state
  const LESSONS_PER_PAGE = 10;

  // Subscription modal state
  const [showSubscriptionModal, setShowSubscriptionModal] = useState(false);
  const [selectedLessonForSubscription, setSelectedLessonForSubscription] = useState(null);

  // Animation values for staggered entrance
  const [headerAnim] = useState(new Animated.Value(0));
  const [categoriesAnim] = useState(new Animated.Value(0));
  const [lessonsAnim] = useState(new Animated.Value(0));
  
  // Button press animations
  const [backButtonScale] = useState(new Animated.Value(1));
  const [toggleButtonScale] = useState(new Animated.Value(1));
  const [categoryButtonScale] = useState(new Animated.Value(1));
  
  // Individual lesson card animations
  const [lessonAnimations, setLessonAnimations] = useState({});

  // Define available categories with translations
  const categories = [
    { id: 'all', name: t('all', currentLanguage), icon: 'apps' },
    { id: 'theology', name: t('theology', currentLanguage), icon: 'infinite' },
    { id: 'quran', name: t('quran', currentLanguage), icon: 'book' },
    { id: 'seerah', name: t('seerah', currentLanguage), icon: 'person' },
    { id: 'worship', name: t('worship', currentLanguage), icon: 'person' },
    { id: 'ethics', name: t('ethics', currentLanguage), icon: 'heart' },
    { id: 'family', name: t('family', currentLanguage), icon: 'people' },
    { id: 'modern', name: t('modern', currentLanguage), icon: 'globe' },
    { id: 'afterlife', name: t('afterlife', currentLanguage), icon: 'time' },
    { id: 'prophets', name: t('prophets', currentLanguage), icon: 'people' },
    { id: 'spirituality', name: t('spirituality', currentLanguage), icon: 'heart' },
    { id: 'knowledge', name: t('knowledge', currentLanguage), icon: 'school' },
    { id: 'history', name: t('history', currentLanguage), icon: 'library' },
    { id: 'companions', name: t('companions', currentLanguage), icon: 'people' },
    { id: 'women', name: t('women', currentLanguage), icon: 'person' },
    { id: 'scholars', name: t('scholars', currentLanguage), icon: 'school' },
    { id: 'leaders', name: t('leaders', currentLanguage), icon: 'shield' }
  ];

  // Load lessons from local files only
  const loadLessons = useCallback(async () => {
    try {
      setLoadingLessons(true);
      console.log('📚 Loading lessons from local files...');
      
      // Use local lesson files directly - no Firebase
      let loadedLessons;
      try {
        loadedLessons = await lessonService.getAllLocalLessons();
        console.log('✅ Loaded lessons from local files:', loadedLessons.length);
      } catch (error) {
        console.log('⚠️ Local lessons failed, using hardcoded lessons:', error.message);
        loadedLessons = lessonTopics;
        console.log('✅ Using hardcoded lessons:', loadedLessons.length);
      }
      
      // Transform lessons to match the expected format
      const transformedLessons = loadedLessons.map(lesson => {
        console.log('🔍 Original lesson data:', JSON.stringify(lesson, null, 2));
        console.log('🌐 Current language in LessonsScreen:', currentLanguage);
        console.log('🌐 Lesson title from file:', lesson.title);
        const category = getLessonCategory(lesson);
        console.log('🏷️ Assigned category for lesson', lesson.id, ':', category);
        return {
          id: lesson.id,
          title: lesson.title, // Use the title from the loaded lesson file (already translated)
          description: lesson.introduction || 'Islamic lesson content',
          category: category,
          icon: 'book-outline', // Default icon
          color: '#1abc9c', // Default color
          difficulty: lesson.difficulty || 'Essential'
        };
      });
      
      setLessons(transformedLessons);
      setVisibleLessons(transformedLessons.slice(0, 10));
      
      // Debug: Show category distribution
      const categoryCounts = {};
      transformedLessons.forEach(lesson => {
        categoryCounts[lesson.category] = (categoryCounts[lesson.category] || 0) + 1;
      });
      console.log('📊 Category distribution:', categoryCounts);
    } catch (error) {
      console.error('❌ Error loading lessons:', error);
      // Fallback to hardcoded lessons if everything fails
      setLessons(lessonTopics);
      setVisibleLessons(lessonTopics.slice(0, 10));
    } finally {
      setLoadingLessons(false);
    }
  }, [currentLanguage]);

  // No Firebase progress loading - use local state only
  const loadLessonProgress = async () => {
    try {
      setProgressLoading(true);
      console.log('📊 Initializing local lesson progress...');
      // Initialize empty progress object
      setLessonProgress({});
      console.log('✅ Local progress initialized');
    } catch (error) {
      console.error('❌ Error initializing lesson progress:', error);
    } finally {
      setProgressLoading(false);
    }
  };

  // Check if lesson is completed
  const isLessonCompleted = (lessonId) => {
    return lessonProgress[lessonId]?.completed || false;
  };

  // Get completion percentage for progress display
  const getCompletionPercentage = () => {
    const totalLessons = lessons.length;
    const completedLessons = Object.values(lessonProgress).filter(p => p.completed).length;
    return totalLessons > 0 ? Math.round((completedLessons / totalLessons) * 100) : 0;
  };

  // Get or create animation value for a specific lesson
  const getLessonAnimation = (lessonId) => {
    if (!lessonAnimations[lessonId]) {
      const newAnimation = new Animated.Value(1);
      setLessonAnimations(prev => ({
        ...prev,
        [lessonId]: newAnimation
      }));
      return newAnimation;
    }
    return lessonAnimations[lessonId];
  };



  // Function to determine lesson category based on title and content
  const getLessonCategory = (lesson) => {
    const title = lesson.title.toLowerCase();
    const introduction = (lesson.introduction || '').toLowerCase();
    
    // Theology & Core Beliefs
    if (title.includes('tawheed') || title.includes('allah') || title.includes('belief') || 
        title.includes('angels') || title.includes('books') || title.includes('prophets') ||
        introduction.includes('tawheed') || introduction.includes('allah') || introduction.includes('belief')) {
      return 'theology';
    }
    
    // Quran Studies
    if (title.includes('quran') || title.includes('miracle') || title.includes('themes') || 
        title.includes('stories') || introduction.includes('quran')) {
      return 'quran';
    }
    
    // Seerah (Prophet's Life)
    if (title.includes('prophet') || title.includes('muhammad') || title.includes('seerah') ||
        introduction.includes('prophet') || introduction.includes('muhammad')) {
      return 'seerah';
    }
    
    // Worship
    if (title.includes('prayer') || title.includes('worship') || title.includes('salah') ||
        title.includes('fasting') || title.includes('hajj') || title.includes('zakat') ||
        introduction.includes('prayer') || introduction.includes('worship')) {
      return 'worship';
    }
    
    // Ethics & Morality
    if (title.includes('ethics') || title.includes('morality') || title.includes('character') ||
        title.includes('manners') || title.includes('behavior') || introduction.includes('ethics')) {
      return 'ethics';
    }
    
    // Family
    if (title.includes('family') || title.includes('marriage') || title.includes('parenting') ||
        title.includes('children') || introduction.includes('family')) {
      return 'family';
    }
    
    // Modern Issues
    if (title.includes('modern') || title.includes('technology') || title.includes('social') ||
        title.includes('environment') || title.includes('stewardship') || introduction.includes('modern')) {
      return 'modern';
    }
    
    // Afterlife
    if (title.includes('afterlife') || title.includes('judgment') || title.includes('paradise') ||
        title.includes('hell') || title.includes('death') || introduction.includes('afterlife')) {
      return 'afterlife';
    }
    
    // Prophets
    if (title.includes('prophet') || title.includes('messenger') || introduction.includes('prophet')) {
      return 'prophets';
    }
    
    // Spirituality
    if (title.includes('spirituality') || title.includes('heart') || title.includes('soul') ||
        title.includes('purification') || introduction.includes('spirituality')) {
      return 'spirituality';
    }
    
    // Knowledge & Education
    if (title.includes('knowledge') || title.includes('learning') || title.includes('education') ||
        title.includes('wisdom') || introduction.includes('knowledge')) {
      return 'knowledge';
    }
    
    // History
    if (title.includes('history') || title.includes('caliphate') || title.includes('empire') ||
        introduction.includes('history')) {
      return 'history';
    }
    
    // Companions
    if (title.includes('companion') || title.includes('sahabah') || title.includes('caliph') ||
        introduction.includes('companion')) {
      return 'companions';
    }
    
    // Women
    if (title.includes('women') || title.includes('woman') || title.includes('female') ||
        introduction.includes('women')) {
      return 'women';
    }
    
    // Scholars
    if (title.includes('scholar') || title.includes('imam') || title.includes('ulema') ||
        introduction.includes('scholar')) {
      return 'scholars';
    }
    
    // Leaders
    if (title.includes('leader') || title.includes('leadership') || title.includes('governance') ||
        introduction.includes('leader')) {
      return 'leaders';
    }
    
    // Default to theology for foundational topics
    return 'theology';
  };

  // Sort lessons by difficulty for roadmap view
  const getSortedLessonsForRoadmap = () => {
    const difficultyOrder = ['Beginner', 'Essential', 'Intermediate', 'Advanced'];
    const filteredLessons = activeCategory === 'all' 
      ? lessons 
      : lessons.filter(lesson => lesson.category === activeCategory);
    
    return filteredLessons.sort((a, b) => {
      const aIndex = difficultyOrder.indexOf(a.difficulty);
      const bIndex = difficultyOrder.indexOf(b.difficulty);
      
      // If difficulty not found, put at end
      if (aIndex === -1) return 1;
      if (bIndex === -1) return -1;
      
      // Sort by difficulty first, then by id
      if (aIndex !== bIndex) {
        return aIndex - bIndex;
      }
      return a.id - b.id;
    });
  };

  // Remove pagination and always show all lessons
  const loadMoreLessons = (category = null) => {
    setLoading(true);
    // Use provided category or fall back to activeCategory state
    const categoryToUse = category !== null ? category : activeCategory;
    const filteredLessons = categoryToUse === 'all' 
      ? lessons 
      : lessons.filter(lesson => lesson.category === categoryToUse);
    
    console.log('🔍 Filtering lessons:');
    console.log('  - Active category:', categoryToUse);
    console.log('  - Total lessons:', lessons.length);
    console.log('  - Filtered lessons:', filteredLessons.length);
    console.log('  - Sample filtered lessons:', filteredLessons.slice(0, 3).map(l => ({ title: l.title, category: l.category })));
    
    setDisplayedLessons(filteredLessons);
    setLoading(false);
  };

  // Handle lesson access with subscription check
  const handleLessonPress = async (lesson) => {
    console.log('🎯 handleLessonPress called for lesson:', lesson.title);
    console.log('🔍 Lesson data being passed:', JSON.stringify(lesson, null, 2));
    console.log('🔍 Current showSubscriptionModal state:', showSubscriptionModal);
    
    // Validate lesson data
    if (!lesson || !lesson.id || !lesson.title) {
      console.error('❌ Invalid lesson data:', lesson);
      return;
    }
    
    // Ensure lesson has required fields
    const validatedLesson = {
      id: lesson.id,
      title: lesson.title,
      description: lesson.description || lesson.introduction || 'Islamic lesson content',
      category: lesson.category || 'general',
      icon: lesson.icon || 'book-outline',
      color: lesson.color || '#1abc9c',
      difficulty: lesson.difficulty || 'Essential'
    };
    
    console.log('✅ Validated lesson data:', JSON.stringify(validatedLesson, null, 2));
    console.log('🔍 Lesson ID type:', typeof validatedLesson.id, 'Value:', validatedLesson.id);
    
    try {
      // Reset cache to ensure fresh check
      subscriptionGuard.resetCache();
      // Force a fresh subscription check by bypassing cache
      const isSubscribed = await subscriptionGuard.forceCheckSubscriptionStatus();
      
      if (isSubscribed) {
        console.log('✅ User is subscribed - allowing access to lesson');
        try {
          navigation.navigate('LessonDetail', { lesson: validatedLesson });
        } catch (navError) {
          console.error('❌ Navigation error:', navError);
        }
      } else {
        console.log('❌ User not subscribed - showing subscription modal');
        setSelectedLessonForSubscription(lesson);
        setShowSubscriptionModal(true);
      }
    } catch (error) {
      console.error('❌ Error checking subscription:', error);
      // Re-check subscription before showing modal in case of error
      try {
        console.log('🔄 Re-checking subscription status after error...');
        const isSubscribedAfterError = await subscriptionGuard.forceCheckSubscriptionStatus();
        if (isSubscribedAfterError) {
          console.log('✅ User is subscribed (after error check) - allowing access');
          navigation.navigate('LessonDetail', { lesson: validatedLesson });
        } else {
          console.log('❌ User not subscribed (after error check) - showing subscription modal');
          setSelectedLessonForSubscription(lesson);
          setShowSubscriptionModal(true);
        }
      } catch (recheckError) {
        console.error('❌ Error in re-check:', recheckError);
        // Only show modal if we can't verify subscription
        setSelectedLessonForSubscription(lesson);
        setShowSubscriptionModal(true);
      }
    }
  };

  // Handle subscription success
  const handleSubscriptionSuccess = () => {
    console.log('🎉 handleSubscriptionSuccess called');
    console.log('📱 Closing subscription modal');
    setShowSubscriptionModal(false);
    
    if (selectedLessonForSubscription) {
      console.log('🧭 Navigating to lesson detail after successful subscription');
      // Validate lesson data for subscription success too
      const validatedLesson = {
        id: selectedLessonForSubscription.id,
        title: selectedLessonForSubscription.title,
        description: selectedLessonForSubscription.description || selectedLessonForSubscription.introduction || 'Islamic lesson content',
        category: selectedLessonForSubscription.category || 'general',
        icon: selectedLessonForSubscription.icon || 'book-outline',
        color: selectedLessonForSubscription.color || '#1abc9c',
        difficulty: selectedLessonForSubscription.difficulty || 'Essential'
      };
      navigation.navigate('LessonDetail', { lesson: validatedLesson });
      setSelectedLessonForSubscription(null);
    }
  };

  // Load lessons when screen is focused or language changes
  useFocusEffect(
    React.useCallback(() => {
      console.log('📚 Loading lessons from service...');
      loadLessons();
      loadLessonProgress(); // Load user's lesson progress
      
      // Start entrance animations
      startEntranceAnimations();
    }, [])
  );

  // Reload lessons when language changes
  useEffect(() => {
    console.log('🌍 Language changed to:', currentLanguage);
    loadLessons();
  }, [currentLanguage]);

  // Load more lessons when page changes
  useEffect(() => {
    if (lessons.length > 0) {
      loadMoreLessons();
    }
  }, [page, activeCategory, lessons]);

  // Reset pagination when category changes
  const handleCategoryChange = (category) => {
    console.log('🔄 Category changed to:', category);
    console.log('📊 Current lessons count:', lessons.length);
    console.log('🔍 Available lesson categories:', [...new Set(lessons.map(l => l.category))]);
    
    setActiveCategory(category);
    setPage(1);
    setDisplayedLessons([]);
    
    // Load lessons for the new category immediately (pass category directly to avoid state delay)
    loadMoreLessons(category);
  };

  // Debug: Monitor subscription modal state changes
  useEffect(() => {
    console.log('🔍 showSubscriptionModal state changed to:', showSubscriptionModal);
  }, [showSubscriptionModal]);

  const handleScroll = (event) => {
    const { layoutMeasurement, contentOffset, contentSize } = event.nativeEvent;
    const paddingToBottom = 50;
    
    if (layoutMeasurement.height + contentOffset.y >= 
        contentSize.height - paddingToBottom && !loading) {
      setPage(prevPage => prevPage + 1);
    }
  };

  const getDifficultyColor = (difficulty) => {
    switch (difficulty) {
      case 'Beginner': return '#2ecc71';
      case 'Intermediate': return '#f39c12';
      case 'Advanced': return '#e74c3c';
      case 'Essential': return '#3498db';
      default: return '#95a5a6';
    }
  };

  // Animation functions
  const startEntranceAnimations = () => {
    // Reset all animations
    headerAnim.setValue(0);
    categoriesAnim.setValue(0);
    lessonsAnim.setValue(0);

    // Staggered entrance animations
    Animated.stagger(100, [
      Animated.timing(headerAnim, {
        toValue: 1,
        duration: 450,
        useNativeDriver: true,
        easing: Easing.out(Easing.cubic),
      }),
      Animated.timing(categoriesAnim, {
        toValue: 1,
        duration: 400,
        useNativeDriver: true,
        easing: Easing.out(Easing.cubic),
      }),
      Animated.timing(lessonsAnim, {
        toValue: 1,
        duration: 400,
        useNativeDriver: true,
        easing: Easing.out(Easing.cubic),
      }),
    ]).start();
  };

  const animateButtonPress = (buttonScale, onPress) => {
    // Call the callback immediately for better responsiveness
    if (onPress) onPress();
    
    // Run animation in parallel (non-blocking)
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
    ]).start();
  };

  // Roadmap Node Component
  const RoadmapNode = ({ lesson, index, totalLessons }) => {
    const nodeSize = 70;
    const isCompleted = isLessonCompleted(lesson.id);
    const lastViewed = lessonProgress[lesson.id]?.lastViewed;
    
    return (
      <View style={styles.roadmapNodeContainer}>
        {/* Straight Connecting Line */}
        {index < totalLessons - 1 && (
          <View style={[
            styles.connectingLine,
            { backgroundColor: '#444444' }
          ]} />
        )}
        
        {/* Lesson Node */}
        <Animated.View style={{ transform: [{ scale: getLessonAnimation(lesson.id) }] }}>
          <TouchableOpacity
            style={[
              styles.roadmapNode,
              { 
                backgroundColor: lesson.color || getDifficultyColor(lesson.difficulty),
                width: nodeSize,
                height: nodeSize,
                opacity: isCompleted ? 1.0 : (lastViewed ? 0.8 : 0.6) // Different opacity based on status
              }
            ]}
            onPress={() => animateButtonPress(getLessonAnimation(lesson.id), () => handleLessonPress(lesson))}
            activeOpacity={0.8}
          >
          <View style={styles.nodeInner}>
            <Ionicons name={lesson.icon} size={getResponsiveIconSize(28)} color="#FFFFFF" />
          </View>
          
          {/* Small Checkmark in Top Right Corner for Completed Lessons */}
          {isCompleted && (
            <View style={styles.completionCheckmark}>
              <Ionicons name="checkmark-circle" size={16} color="#4CAF50" />
            </View>
          )}
          
          {/* Last Viewed Indicator for Non-Completed but Viewed Lessons */}
          {!isCompleted && lastViewed && (
            <View style={styles.viewedIndicator}>
              <View style={styles.viewedDot} />
            </View>
          )}
        </TouchableOpacity>
        </Animated.View>
        
        {/* Lesson Info - Centered */}
        <View style={styles.lessonInfo}>
          <View style={styles.lessonTitleContainer}>
            <Text style={[
              styles.roadmapLessonTitle,
              isCompleted && styles.completedLessonTitle
            ]} numberOfLines={2}>
              {lesson.title}
            </Text>
          </View>
          <View style={[
            styles.roadmapDifficultyBadge,
            { backgroundColor: getDifficultyColor(lesson.difficulty) + '20' }
          ]}>
            <Text style={[
              styles.roadmapDifficultyText,
              { color: getDifficultyColor(lesson.difficulty) }
            ]}>
              {t(lesson.category, currentLanguage)}
            </Text>
          </View>
          {lastViewed && (
            <Text style={styles.lastViewedText}>
              Last viewed: {new Date(lastViewed.seconds * 1000).toLocaleDateString()}
            </Text>
          )}
        </View>
      </View>
    );
  };

  // Roadmap View Component
  const RoadmapView = () => {
    const roadmapLessons = getSortedLessonsForRoadmap();
    
    return (
      <View style={styles.roadmapContainer}>
        <ScrollView 
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{
            paddingBottom: Platform.OS === 'android' ? 180 : 20
          }}
        >
          {/* Roadmap Header */}
          <View style={styles.roadmapHeader}>
            <Text style={styles.roadmapTitle}>{t('yourLearningJourney', currentLanguage)}</Text>
            <Text style={styles.roadmapSubtitle}>
              {roadmapLessons.length} {t('lessonsFromBeginnerToAdvanced', currentLanguage)}
            </Text>
            <Text style={styles.progressSummary}>
              {getCompletionPercentage()}% {t('complete', currentLanguage)} ({Object.values(lessonProgress).filter(p => p.completed).length} {t('lessons', currentLanguage)})
            </Text>
          </View>
          
          {/* Start Point */}
          <View style={styles.startPoint}>
            <View style={styles.startNode}>
                                  <Ionicons name="flag" size={getResponsiveIconSize(24)} color="#FFD700" />
            </View>
            <Text style={styles.startText}>{t('startHere', currentLanguage)}</Text>
            
            {/* Line from start to first lesson */}
            {roadmapLessons.length > 0 && (
              <View style={styles.startConnectingLine} />
            )}
          </View>
          
          {/* Lesson Nodes - Straight Path */}
          <View style={styles.roadmapPath}>
            {roadmapLessons.map((lesson, index) => (
              <RoadmapNode
                key={lesson.id}
                lesson={lesson}
                index={index}
                totalLessons={roadmapLessons.length}
              />
            ))}
          </View>
          
          {/* End Point */}
          <View style={styles.endPoint}>
            {/* Line from last lesson to end */}
            {roadmapLessons.length > 0 && (
              <View style={styles.endConnectingLine} />
            )}
            <View style={styles.endNode}>
                                  <Ionicons name="trophy" size={getResponsiveIconSize(24)} color="#FFD700" />
            </View>
            <Text style={styles.endText}>{t('masterScholar', currentLanguage)}</Text>
          </View>
          
          <View style={styles.roadmapBottomPadding} />
        </ScrollView>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView 
        style={styles.scrollView} 
        contentContainerStyle={{ 
          flexGrow: 1,
          paddingBottom: Platform.OS === 'android' ? 180 : 20
        }}
      >
        <StatusBar barStyle="dark-content" backgroundColor="#ffffff" />
        {/* Header */}
        <Animated.View 
          style={[
            styles.header,
            {
              opacity: headerAnim,
              transform: [
                {
                  translateY: headerAnim.interpolate({
                    inputRange: [0, 1],
                    outputRange: [30, 0],
                  }),
                },
              ],
            },
          ]}
        >
          <Animated.View style={{ transform: [{ scale: backButtonScale }] }}>
            <TouchableOpacity 
              style={styles.backButton}
              onPress={() => animateButtonPress(backButtonScale, () => navigation.goBack())}
            >
                              <Ionicons name="arrow-back" size={getResponsiveIconSize(24)} color="#FFFFFF" />
            </TouchableOpacity>
          </Animated.View>
          <Text style={styles.headerTitle}>{t('islamicLessons', currentLanguage)}</Text>
          
          {/* View Mode Toggle */}
          <View style={styles.viewToggle}>
            <Animated.View style={{ transform: [{ scale: toggleButtonScale }] }}>
              <TouchableOpacity
                style={[
                  styles.toggleButton,
                  viewMode === 'list' && styles.activeToggleButton
                ]}
                onPress={() => animateButtonPress(toggleButtonScale, () => setViewMode('list'))}
              >
                <Ionicons name="list" size={18} color={viewMode === 'list' ? '#121212' : '#FFFFFF'} />
              </TouchableOpacity>
            </Animated.View>
            <Animated.View style={{ transform: [{ scale: toggleButtonScale }] }}>
              <TouchableOpacity
                style={[
                  styles.toggleButton,
                  viewMode === 'roadmap' && styles.activeToggleButton
                ]}
                onPress={() => animateButtonPress(toggleButtonScale, () => setViewMode('roadmap'))}
              >
                <Ionicons name="map" size={18} color={viewMode === 'roadmap' ? '#121212' : '#FFFFFF'} />
              </TouchableOpacity>
            </Animated.View>
          </View>
        </Animated.View>

        {viewMode === 'roadmap' ? (
          <RoadmapView />
        ) : (
        <ScrollView 
          showsVerticalScrollIndicator={false}
          onScroll={handleScroll}
          scrollEventThrottle={400}
        >
          {/* Category Filter */}
          <Animated.View 
            style={[
              styles.categoriesSection,
              {
                opacity: categoriesAnim,
                transform: [
                  {
                    translateY: categoriesAnim.interpolate({
                      inputRange: [0, 1],
                      outputRange: [30, 0],
                    }),
                  },
                ],
              },
            ]}
          >
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              <View style={styles.categoriesContainer}>
                {categories.map((category) => (
                  <Animated.View key={category.id} style={{ transform: [{ scale: categoryButtonScale }] }}>
                    <TouchableOpacity
                      style={[
                        styles.categoryChip,
                        activeCategory === category.id && styles.activeCategoryChip
                      ]}
                      onPress={() => animateButtonPress(categoryButtonScale, () => handleCategoryChange(category.id))}
                    >
                      <Text style={[
                        styles.categoryChipText,
                        activeCategory === category.id && styles.activeCategoryChipText
                      ]}>
                        {category.name}
                      </Text>
                    </TouchableOpacity>
                  </Animated.View>
                ))}
              </View>
            </ScrollView>
          </Animated.View>

          {/* Lessons List */}
          <Animated.View 
            style={[
              styles.lessonsSection,
              {
                opacity: lessonsAnim,
                transform: [
                  {
                    translateY: lessonsAnim.interpolate({
                      inputRange: [0, 1],
                      outputRange: [30, 0],
                    }),
                  },
                ],
              },
            ]}
          >
            <Text style={styles.sectionTitle}>
              {t('availableLessons', currentLanguage)} 
              ({displayedLessons.length})
            </Text>
            
              {/* Lessons List */}
            {displayedLessons.map((lesson) => (
              <Animated.View key={lesson.id} style={{ transform: [{ scale: getLessonAnimation(lesson.id) }] }}>
                <TouchableOpacity 
                  style={styles.lessonCard}
                  onPress={() => animateButtonPress(getLessonAnimation(lesson.id), () => handleLessonPress(lesson))}
                >
                  <View style={styles.lessonContent}>
                    <Text style={styles.lessonTitle}>{lesson.title}</Text>
                    
                    <View style={styles.lessonMeta}>
                      <View style={[styles.difficultyBadge, { backgroundColor: getDifficultyColor(lesson.difficulty) + '20' }]}>
                        <Text style={[styles.difficultyText, { color: getDifficultyColor(lesson.difficulty) }]}>
                          {t(lesson.category, currentLanguage)}
                        </Text>
                      </View>
                    </View>
                  </View>

                  <View style={styles.lessonArrow}>
                    <Ionicons name="chevron-forward" size={20} color="#bdc3c7" />
                  </View>
                </TouchableOpacity>
              </Animated.View>
            ))}

            {loading && (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="small" color="#FFFFFF" />
              </View>
            )}
          </Animated.View>
        </ScrollView>
        )}
      </ScrollView>

      {/* Subscription Modal */}
      {console.log('🔍 LessonsScreen: Rendering SubscriptionModal with feature="lessons"')}
      {console.log('🔍 LessonsScreen: showSubscriptionModal state:', showSubscriptionModal)}
      <SubscriptionModal
        visible={showSubscriptionModal}
        onClose={() => setShowSubscriptionModal(false)}
        onSubscribeSuccess={handleSubscriptionSuccess}
        feature="lessons"
        key={`lessons-modal-${Date.now()}`}
      />
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
    borderBottomColor: 'rgba(255, 255, 255, 0.1)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 4,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 15,
    backgroundColor: '#2A2A2A',
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  refreshButton: {
    width: 40,
    height: 40,
    borderRadius: 15,
    backgroundColor: '#2A2A2A',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  backIcon: {
    color: '#FFFFFF',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#FFFFFF',
    textShadowColor: 'rgba(0, 0, 0, 0.6)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4,
  },
  placeholder: {
    width: 32,
  },
  scrollView: {
    flex: 1,
    paddingHorizontal: 16,
    backgroundColor: '#121212',
  },
  categoriesSection: {
    paddingVertical: 16,
  },
  categoriesContainer: {
    flexDirection: 'row',
    gap: 10,
  },
  categoryChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: '#232323',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  activeCategoryChip: {
    backgroundColor: '#1E1E1E',
    borderColor: 'rgba(255, 255, 255, 0.2)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 4,
  },
  categoryChipText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#B0B0B0',
    marginLeft: 5,
    textShadowColor: 'rgba(0, 0, 0, 0.3)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  activeCategoryChipText: {
    color: '#fff',
    fontWeight: '700',
    textShadowColor: 'rgba(0, 0, 0, 0.5)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4,
  },
  lessonsSection: {
    marginBottom: 30,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#FFFFFF',
    marginBottom: 16,
    textShadowColor: 'rgba(0, 0, 0, 0.6)',
    textShadowOffset: { width: 0, height: 3 },
    textShadowRadius: 6,
    letterSpacing: 0.5,
  },
  lessonCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1E1E1E',
    borderRadius: 16,
    padding: 18,
    marginHorizontal: 16,
    marginVertical: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  lessonIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.3,
    shadowRadius: 5,
    elevation: 4,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  lessonContent: {
    flex: 1,
  },
  lessonTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 5,
    textShadowColor: 'rgba(0, 0, 0, 0.5)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4,
  },
  lessonDescription: {
    fontSize: 14,
    color: '#B0B0B0',
    marginBottom: 10,
  },
  lessonMeta: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  difficultyBadge: {
    backgroundColor: '#2A2A2A',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 15,
    alignSelf: 'flex-start',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  difficultyText: {
    color: '#B0B0B0',
    fontSize: 12,
    fontWeight: '600',
  },
  lessonArrow: {
    marginLeft: 10,
    color: '#B0B0B0',
  },
  loadingContainer: {
    padding: 20,
    alignItems: 'center',
  },
  errorContainer: {
    padding: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  errorText: {
    color: '#e74c3c',
    fontSize: 16,
    textAlign: 'center',
    marginVertical: 16,
    lineHeight: 24,
  },
  retryButton: {
    backgroundColor: '#1E1E1E',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
    marginTop: 16,
  },
  retryButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
  loadingText: {
    color: '#FFFFFF',
    fontSize: 16,
    marginTop: 16,
  },
  // Roadmap Styles
  roadmapContainer: {
    flex: 1,
    backgroundColor: '#121212',
  },
  roadmapHeader: {
    alignItems: 'center',
    paddingTop: 20,
    paddingBottom: 15,
    paddingHorizontal: 20,
  },
  roadmapTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#FFFFFF',
    textAlign: 'center',
  },
  roadmapSubtitle: {
    fontSize: 16,
    color: '#B0B0B0',
    textAlign: 'center',
    marginTop: 5,
  },
  startPoint: {
    alignItems: 'center',
    marginBottom: 30,
    paddingHorizontal: 20,
  },
  startNode: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#FFD700',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 10,
    shadowColor: '#FFD700',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 10,
    elevation: 8,
  },
  startText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#FFD700',
    textAlign: 'center',
  },
  roadmapPath: {
    paddingHorizontal: 20,
    paddingBottom: 30,
  },
  roadmapNodeContainer: {
    position: 'relative',
    marginBottom: 80,
    width: '100%',
    alignItems: 'center',
  },
  roadmapNode: {
    borderRadius: 35,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
    borderWidth: 4,
    borderColor: '#FFFFFF',
    alignSelf: 'center',
  },
  nodeInner: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  progressRing: {
    position: 'absolute',
    top: -5,
    left: -5,
    right: -5,
    bottom: -5,
    borderRadius: 40,
    borderWidth: 3,
    borderColor: 'transparent',
  },
  progressArc: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    borderRadius: 40,
  },
  lessonInfo: {
    maxWidth: 200,
    marginTop: 15,
    alignItems: 'center',
    alignSelf: 'center',
  },
  lessonInfoLeft: {
    alignItems: 'flex-start',
    alignSelf: 'flex-start',
    marginLeft: 10,
  },
  lessonInfoRight: {
    alignItems: 'flex-end',
    alignSelf: 'flex-end',
    marginRight: 10,
  },
  roadmapLessonTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 8,
    textAlign: 'center',
  },
  roadmapDifficultyBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 15,
    alignSelf: 'center',
  },
  roadmapDifficultyText: {
    fontSize: 12,
    fontWeight: '600',
  },

  endPoint: {
    alignItems: 'center',
    paddingTop: 20,
    paddingBottom: 40,
    paddingHorizontal: 20,
  },
  endNode: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#FFD700',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 15,
    shadowColor: '#FFD700',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.7,
    shadowRadius: 15,
    elevation: 10,
    borderWidth: 4,
    borderColor: '#FFFFFF',
  },
  endText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FFD700',
    textAlign: 'center',
  },
  roadmapBottomPadding: {
    height: 50,
  },
  toggleButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    marginHorizontal: 2,
  },
  activeToggleButton: {
    backgroundColor: '#FFFFFF',
  },
  viewToggle: {
    flexDirection: 'row',
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 20,
    padding: 2,
  },
  startConnectingLine: {
    position: 'absolute',
    bottom: -30,
    width: 4,
    height: 60,
    backgroundColor: '#444444',
    borderRadius: 2,
    left: '50%',
    marginLeft: 17,
    transformOrigin: '50% 0%',
    zIndex: -1,
  },
  endConnectingLine: {
    position: 'absolute',
    top: -225,
    width: 4,
    height: 250,
    backgroundColor: '#444444',
    borderRadius: 2,
    left: '50%',
    marginLeft: 17,
    transformOrigin: '50% 100%',
    zIndex: -1,
  },
  completionCheckmark: {
    position: 'absolute',
    top: -3,
    right: -3,
    backgroundColor: '#121212',
    borderRadius: 12,
    width: 24,
    height: 24,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  viewedIndicator: {
    position: 'absolute',
    top: -5,
    left: -5,
    right: -5,
    bottom: -5,
    borderRadius: 40,
    borderWidth: 3,
    borderColor: 'transparent',
    justifyContent: 'center',
    alignItems: 'center',
  },
  viewedDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#FFFFFF',
  },
  lessonTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  completedLessonTitle: {
    color: '#4CAF50',
  },
  lastViewedText: {
    color: '#FFFFFF',
    fontSize: 12,
    marginTop: 5,
  },
  progressSummary: {
    fontSize: 14,
    color: '#B0B0B0',
    textAlign: 'center',
    marginTop: 5,
  },
  connectingLine: {
    position: 'absolute',
    bottom: -80,
    width: 4,
    height: 250,
    borderRadius: 2,
    left: '50%',
    marginLeft: -2,
    transformOrigin: '50% 0%',
    zIndex: -1,
  },
}); 