import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  ScrollView, 
  TouchableOpacity, 
  SafeAreaView,
  StatusBar,
  ActivityIndicator,
  Alert,
  Platform
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import lessonService from '../services/lessonService';
import { useLanguage } from '../utils/useLanguage';
import { t } from '../utils/translations';
import subscriptionGuard from '../services/subscriptionGuard';
import SubscriptionModal from '../components/SubscriptionModal';

export default function LessonDetailScreen({ route, navigation }) {
  // Language support
  const { currentLanguage } = useLanguage();
  
  const { lesson } = route.params;
  const [completedSections, setCompletedSections] = useState([]);
  const [fullLessonData, setFullLessonData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [lessonProgress, setLessonProgress] = useState(null);
  const [startTime, setStartTime] = useState(Date.now());
  const [showSubscriptionModal, setShowSubscriptionModal] = useState(false);
  const [subscriptionChecked, setSubscriptionChecked] = useState(false);

  // Check subscription on screen mount
  useEffect(() => {
    const checkSubscription = async () => {
      try {
        console.log('🔒 LessonDetailScreen: Checking subscription on mount...');
        subscriptionGuard.resetCache();
        const isSubscribed = await subscriptionGuard.forceCheckSubscriptionStatus();
        
        if (!isSubscribed) {
          console.log('❌ LessonDetailScreen: User not subscribed, showing modal and blocking access');
          setShowSubscriptionModal(true);
          setLoading(false);
          // Don't load lesson content if not subscribed
          return;
        }
        
        console.log('✅ LessonDetailScreen: User is subscribed, allowing access');
        setSubscriptionChecked(true);
      } catch (error) {
        console.error('❌ LessonDetailScreen: Error checking subscription:', error);
        // On error, re-check subscription before showing modal
        try {
          const isSubscribed = await subscriptionGuard.forceCheckSubscriptionStatus();
          if (!isSubscribed) {
            setShowSubscriptionModal(true);
          } else {
            setSubscriptionChecked(true);
          }
        } catch (recheckError) {
          // Only show modal if we can't verify subscription
          setShowSubscriptionModal(true);
        }
        setLoading(false);
      }
    };
    
    checkSubscription();
  }, []);

  // Load lesson content and progress (only if subscribed)
  useEffect(() => {
    if (!subscriptionChecked) return; // Wait for subscription check
    
    const loadLessonContent = async () => {
      try {
        setLoading(true);
        setError(null);
        setStartTime(Date.now());
        
        console.log('🔄 Loading lesson content for ID:', lesson.id, '(type:', typeof lesson.id, ')');
        console.log('🔍 Full lesson data received:', JSON.stringify(lesson, null, 2));
        
        // Use local lesson files directly - no Firebase
        let data;
        try {
          // Try to load from local lesson files first
          console.log('🌐 Current language in LessonDetailScreen:', currentLanguage);
          console.log('🔍 Attempting to load lesson ID:', lesson.id);
          data = await lessonService.getLessonById(lesson.id);
          console.log('✅ Local lesson data loaded:', data?.title);
          console.log('🔍 Local lesson data:', JSON.stringify(data, null, 2));
        } catch (localError) {
          console.log('⚠️ Local lesson file not found, using fallback content:', localError.message);
          throw localError;
        }
        
        setFullLessonData(data);
        
        // Initialize empty progress (no Firebase)
        setLessonProgress({
          lastViewed: new Date(),
          timeSpent: 0,
          completed: false,
          completedSections: []
        });
        setCompletedSections([]);
        
      } catch (error) {
        console.error('❌ Error loading lesson content:', error);
        
        // Create comprehensive fallback content based on the lesson
        console.log('⚠️ Using fallback content for lesson:', lesson.title);
        console.log('🔍 Creating fallback content with lesson data:', JSON.stringify(lesson, null, 2));
        
        setFullLessonData({
          ...lesson,
          introduction: lesson.description || lesson.introduction || `Learn about ${lesson.title}, an important topic in Islamic education that will help deepen your understanding of Islamic principles and practices.`,
          sections: [
            {
              heading: 'Overview',
              content: `This lesson covers the fundamentals of ${lesson.title}. Understanding this topic is essential for developing a comprehensive knowledge of Islamic teachings and practices. The lesson is designed to provide both theoretical knowledge and practical guidance.`
            },
            {
              heading: 'Key Teachings',
              content: `${lesson.title} encompasses important concepts that help Muslims strengthen their faith and practice. This lesson provides practical guidance based on authentic Islamic sources including the Quran and Sunnah.`
            },
            {
              heading: 'Practical Application',
              content: `Learn how to implement the teachings of ${lesson.title} in your daily life. This section provides actionable steps and practical examples that you can apply as a practicing Muslim.`
            }
          ],
          conclusion: `By studying ${lesson.title}, you will gain valuable insights that can be applied in your daily life as a practicing Muslim. Continue to reflect on these teachings and seek to implement them consistently.`,
          references: ['Quran', 'Hadith', 'Islamic Scholarship', 'Classical Islamic Texts']
        });
        
        // Initialize empty progress
        setLessonProgress({
          lastViewed: new Date(),
          timeSpent: 0,
          completed: false,
          completedSections: []
        });
        setCompletedSections([]);
      } finally {
        setLoading(false);
      }
    };

    loadLessonContent();
  }, [lesson.id, subscriptionChecked, currentLanguage]);

  // No Firebase progress saving - just track locally
  useEffect(() => {
    return () => {
      // Calculate time spent for local tracking only
      const timeSpent = Date.now() - startTime;
      console.log(`📊 Lesson ${lesson.title} - Time spent: ${Math.floor(timeSpent / 1000)} seconds`);
    };
  }, [lesson.id, startTime]);

  const toggleSection = async (sectionIndex) => {
    let newCompletedSections;
    
    if (completedSections.includes(sectionIndex)) {
      newCompletedSections = completedSections.filter(index => index !== sectionIndex);
    } else {
      newCompletedSections = [...completedSections, sectionIndex];
    }
    
    setCompletedSections(newCompletedSections);
    
    // Check if all sections are completed
    const allSectionsCompleted = fullLessonData?.sections && 
      newCompletedSections.length === fullLessonData.sections.length;
    
    // Save progress immediately
    await saveLessonProgress(lesson.id, {
      completedSections: newCompletedSections,
      completed: allSectionsCompleted,
      lastViewed: new Date(),
      timeSpent: Math.floor((Date.now() - startTime) / 1000)
    });
    
    // Show completion message if all sections are done
    if (allSectionsCompleted && newCompletedSections.length === fullLessonData.sections.length) {
      await markLessonComplete(lesson.id);
      Alert.alert(
        '🎉 Lesson Complete!',
        `Congratulations! You've completed "${fullLessonData.title}". Your progress has been saved.`,
        [{ text: 'Continue Learning', style: 'default' }]
      );
    }
  };

  // Add completion button for manual marking
  const handleMarkComplete = async () => {
    Alert.alert(
      'Mark Lesson Complete',
      'Are you sure you want to mark this lesson as complete?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Complete',
          style: 'default',
          onPress: async () => {
            await markLessonComplete(lesson.id);
            setLessonProgress({ ...lessonProgress, completed: true });
            Alert.alert('✅ Lesson Complete!', 'Your progress has been saved.');
          }
        }
      ]
    );
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

  const progressPercentage = fullLessonData?.sections?.length > 0 
    ? Math.round((completedSections.length / fullLessonData.sections.length) * 100)
    : 0;

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView 
        style={styles.scrollView} 
        contentContainerStyle={{ 
          flexGrow: 1,
          paddingBottom: Platform.OS === 'android' ? 180 : 20
        }}
      >
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity 
            style={styles.backButton}
            onPress={() => navigation.goBack()}
          >
            <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
          </TouchableOpacity>
          <View style={styles.headerContent}>
            <View style={styles.headerTitleRow}>
              <Text style={styles.headerTitle} numberOfLines={2}>
                {fullLessonData?.title || lesson.title}
              </Text>
              {(lessonProgress?.completed || progressPercentage === 100) && (
                <Ionicons name="checkmark-circle" size={24} color="#4CAF50" style={styles.headerCheckmark} />
              )}
            </View>
            <View style={styles.headerBadges}>
              <View style={[styles.difficultyBadge, { backgroundColor: getDifficultyColor(lesson.difficulty) + '30' }]}>
                                        <Text style={[styles.difficultyText, { color: getDifficultyColor(lesson.difficulty) }]}>
                          {t(lesson.category, currentLanguage)}
                        </Text>
              </View>
              {lessonProgress?.completed && (
                <View style={styles.completedBadge}>
                  <Text style={styles.completedBadgeText}>Completed</Text>
                </View>
              )}
            </View>
          </View>
        </View>

        {/* Loading State */}
        {loading && (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#FFFFFF" />
            <Text style={styles.loadingText}>Loading lesson content...</Text>
          </View>
        )}

        {/* Error State */}
        {error && !loading && (
          <View style={styles.errorContainer}>
            <Ionicons name="alert-circle-outline" size={48} color="#e74c3c" />
            <Text style={styles.errorText}>{error}</Text>
            <TouchableOpacity 
              style={styles.retryButton}
              onPress={() => {
                setError(null);
                setLoading(true);
                // Re-trigger the lesson loading
                const retryLoad = async () => {
                  try {
                    const data = await lessonService.getLessonById(lesson.id);
                    setFullLessonData(data);
                    setError(null);
                  } catch (error) {
                    setError('Failed to load lesson content. Please try again.');
                  } finally {
                    setLoading(false);
                  }
                };
                retryLoad();
              }}
            >
              <Text style={styles.retryButtonText}>Retry</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Lesson Content - Only show if subscribed */}
        {!loading && !error && fullLessonData && subscriptionChecked && (
        <ScrollView showsVerticalScrollIndicator={false} style={styles.scrollView}>
          {/* Lesson Header */}
            <View style={[styles.lessonHeader, { backgroundColor: lesson.color ? lesson.color + '20' : '#333333' }]}>
            <View style={styles.lessonHeaderText}>
                <Text style={styles.lessonTitle}>{fullLessonData.title}</Text>
                <Text style={styles.lessonCategory}>
                  {lesson.category ? t(lesson.category, currentLanguage) : t('islamicLesson', currentLanguage)}
                </Text>
            </View>
          </View>

          {/* Progress */}
            {fullLessonData.sections && fullLessonData.sections.length > 0 && (
            <View style={styles.progressSection}>
              <View style={styles.progressHeader}>
                <Text style={styles.progressText}>
                    Progress: {completedSections.length} / {fullLessonData.sections.length} sections
                </Text>
                <Text style={styles.progressPercentage}>{progressPercentage}%</Text>
              </View>
              <View style={styles.progressBar}>
                <View style={[styles.progressFill, { width: `${progressPercentage}%` }]} />
              </View>
            </View>
          )}

          {/* Introduction */}
          <View style={styles.introSection}>
            <Text style={styles.sectionTitle}>Introduction</Text>
              <Text style={styles.introText}>{fullLessonData.introduction}</Text>
          </View>

          {/* Lesson Sections */}
            {fullLessonData.sections && fullLessonData.sections.map((section, index) => {
            const isCompleted = completedSections.includes(index);
              const sectionTitle = section.heading || section.title || `Section ${index + 1}`;
              
            return (
              <View key={index} style={styles.sectionCard}>
                <TouchableOpacity 
                  style={styles.sectionHeader}
                  onPress={() => toggleSection(index)}
                >
                  <View style={styles.sectionHeaderLeft}>
                    <View style={[
                      styles.sectionNumber,
                      isCompleted && styles.completedSectionNumber
                    ]}>
                      {isCompleted ? (
                        <Ionicons name="checkmark" size={16} color="#fff" />
                      ) : (
                        <Text style={styles.sectionNumberText}>{index + 1}</Text>
                      )}
                    </View>
                    <Text style={[
                      styles.sectionTitleText,
                      isCompleted && styles.completedSectionTitle
                    ]}>
                        {sectionTitle}
                    </Text>
                  </View>
                    <TouchableOpacity onPress={() => toggleSection(index)}>
                    <Ionicons
                      name={isCompleted ? "checkmark-circle" : "ellipse-outline"}
                      size={24}
                        color={isCompleted ? "#4CAF50" : "#666"}
                    />
                  </TouchableOpacity>
                </TouchableOpacity>

                <View style={styles.sectionContent}>
                  <Text style={styles.sectionText}>{section.content}</Text>
                  
                    {/* Display details if they exist (for locally loaded content) */}
                  {section.details && section.details.length > 0 && (
                    <View style={styles.detailsList}>
                      {section.details.map((detail, detailIndex) => (
                        <View key={detailIndex} style={styles.detailItem}>
                          <View style={styles.bullet} />
                          <Text style={styles.detailText}>{detail}</Text>
                        </View>
                      ))}
                    </View>
                  )}
                </View>
              </View>
            );
          })}

          {/* Conclusion */}
            {fullLessonData.conclusion && (
            <View style={styles.conclusionSection}>
              <Text style={styles.sectionTitle}>Conclusion</Text>
                <Text style={styles.conclusionText}>{fullLessonData.conclusion}</Text>
              </View>
            )}

            {/* References */}
            {fullLessonData.references && fullLessonData.references.length > 0 && (
              <View style={styles.referencesSection}>
                <Text style={styles.sectionTitle}>References</Text>
                {fullLessonData.references.map((reference, index) => (
                  <Text key={index} style={styles.referenceText}>• {reference}</Text>
                ))}
            </View>
          )}

            {/* Completion Actions */}
            <View style={styles.completionSection}>
              {progressPercentage === 100 || lessonProgress?.completed ? (
                <TouchableOpacity style={[styles.completionButton, styles.completedButton]} disabled>
                  <Ionicons name="trophy" size={20} color="#FFD700" />
                  <Text style={styles.completedButtonText}>{t('lessonCompleted', currentLanguage)} 🎉</Text>
                </TouchableOpacity>
              ) : (
                <View style={styles.completionActions}>
                  <TouchableOpacity 
                    style={styles.markCompleteButton}
                    onPress={handleMarkComplete}
                  >
                    <Ionicons name="checkmark-circle-outline" size={20} color="#FFFFFF" />
                    <Text style={styles.markCompleteButtonText}>{t('markAsComplete', currentLanguage)}</Text>
              </TouchableOpacity>
                  
                  <View style={styles.progressInfo}>
                    <Text style={styles.progressInfoText}>
                      {t('completeAllSectionsToFinish', currentLanguage)}
                    </Text>
                  </View>
                </View>
              )}
            </View>

            {/* Bottom Padding */}
            <View style={styles.bottomPadding} />
          </ScrollView>
          )}
      </ScrollView>
      
      {/* Subscription Modal */}
      <SubscriptionModal
        visible={showSubscriptionModal}
        onClose={() => {
          setShowSubscriptionModal(false);
          navigation.goBack(); // Go back if user closes modal
        }}
        onSubscribeSuccess={async () => {
          setShowSubscriptionModal(false);
          // Re-check subscription and allow access
          subscriptionGuard.resetCache();
          const isSubscribed = await subscriptionGuard.forceCheckSubscriptionStatus();
          if (isSubscribed) {
            setSubscriptionChecked(true);
          }
        }}
        feature="lessons"
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
    backgroundColor: '#1E1E1E',
  },
  scrollView: {
    flex: 1,
    backgroundColor: '#1E1E1E',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 15,
    backgroundColor: '#1E1E1E',
    borderBottomWidth: 1,
    borderBottomColor: '#333333',
  },
  backButton: {
    padding: 8,
    borderRadius: 8,
    backgroundColor: '#333333',
    marginRight: 15,
  },
  headerContent: {
    flex: 1,
  },
  headerTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FFFFFF',
    flex: 1,
  },
  headerCheckmark: {
    marginLeft: 10,
  },
  headerBadges: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  difficultyBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
  },
  difficultyText: {
    fontSize: 12,
    fontWeight: '600',
  },
  completedBadge: {
    backgroundColor: '#4CAF50',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
    marginLeft: 10,
  },
  completedBadgeText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  lessonHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 20,
    borderRadius: 15,
    marginVertical: 20,
  },
  lessonIcon: {
    width: 60,
    height: 60,
    borderRadius: 30,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 20,
  },
  lessonHeaderText: {
    flex: 1,
  },
  lessonTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 5,
  },
  lessonCategory: {
    fontSize: 16,
    color: '#B0B0B0',
    fontStyle: 'italic',
  },
  progressSection: {
    backgroundColor: '#1E1E1E',
    borderRadius: 12,
    padding: 20,
    marginBottom: 20,
  },
  progressHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  progressText: {
    fontSize: 14,
    color: '#FFFFFF',
    fontWeight: '600',
  },
  progressPercentage: {
    fontSize: 16,
    color: '#4CAF50',
    fontWeight: 'bold',
  },
  progressBar: {
    width: '100%',
    height: 8,
    backgroundColor: '#333333',
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#4CAF50',
    borderRadius: 4,
  },
  introSection: {
    backgroundColor: '#232323',
    borderRadius: 12,
    padding: 20,
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 12,
  },
  introText: {
    fontSize: 15,
    color: '#B0B0B0',
    lineHeight: 24,
  },
  sectionCard: {
    backgroundColor: '#1E1E1E',
    borderRadius: 12,
    marginBottom: 15,
    overflow: 'hidden',
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#333333',
    backgroundColor: '#232323',
    borderTopLeftRadius: 12,
    borderTopRightRadius: 12,
  },
  sectionHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  sectionNumber: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#333333',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  completedSectionNumber: {
    backgroundColor: '#4CAF50',
  },
  sectionNumberText: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  sectionTitleText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
    flex: 1,
    marginRight: 10,
  },
  completedSectionTitle: {
    color: '#4CAF50',
  },
  sectionContent: {
    padding: 20,
    backgroundColor: '#232323',
    borderBottomLeftRadius: 12,
    borderBottomRightRadius: 12,
    marginBottom: 20,
  },
  sectionText: {
    fontSize: 15,
    color: '#B0B0B0',
    lineHeight: 24,
    marginBottom: 15,
  },
  detailsList: {
    marginTop: 10,
  },
  detailItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  bullet: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#4CAF50',
    marginRight: 12,
    marginTop: 8,
  },
  detailText: {
    fontSize: 14,
    color: '#B0B0B0',
    lineHeight: 22,
    flex: 1,
  },
  conclusionSection: {
    backgroundColor: '#232323',
    borderRadius: 12,
    padding: 20,
    marginBottom: 20,
  },
  conclusionText: {
    fontSize: 15,
    color: '#B0B0B0',
    lineHeight: 24,
  },
  referencesSection: {
    backgroundColor: '#232323',
    borderRadius: 12,
    padding: 20,
    marginBottom: 20,
  },
  referenceText: {
    fontSize: 14,
    color: '#B0B0B0',
    marginBottom: 5,
    lineHeight: 20,
  },
  completionSection: {
    alignItems: 'center',
    marginVertical: 20,
  },
  completionActions: {
    alignItems: 'center',
    marginTop: 10,
  },
  markCompleteButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#2196F3',
    paddingHorizontal: 30,
    paddingVertical: 15,
    borderRadius: 25,
    shadowColor: '#2196F3',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  markCompleteButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
    marginLeft: 8,
  },
  progressInfo: {
    marginTop: 10,
    paddingHorizontal: 20,
  },
  progressInfoText: {
    fontSize: 14,
    color: '#B0B0B0',
    textAlign: 'center',
  },
  completionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#4CAF50',
    paddingHorizontal: 30,
    paddingVertical: 15,
    borderRadius: 25,
    shadowColor: '#4CAF50',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  completedButton: {
    backgroundColor: '#4CAF50',
    opacity: 0.7,
  },
  completionButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
    marginLeft: 8,
  },
  completedButtonText: {
    color: '#FFD700',
    fontSize: 16,
    fontWeight: 'bold',
    marginLeft: 8,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 50,
  },
  loadingText: {
    color: '#FFFFFF',
    fontSize: 16,
    marginTop: 16,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  errorText: {
    color: '#e74c3c',
    fontSize: 16,
    textAlign: 'center',
    marginVertical: 16,
    lineHeight: 24,
  },
  retryButton: {
    backgroundColor: '#2196F3',
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
  bottomPadding: {
    height: 30,
  },
});