import React, { useState, useEffect, useRef, useCallback } from 'react';
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
  Dimensions,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import dhikrService from '../services/dhikrService';
import { useLanguage } from '../utils/useLanguage';
import { t } from '../utils/translations';
import { 
  getResponsiveFontSize, 
  getResponsiveLineHeight, 
  getResponsivePadding,
  getResponsiveTextStyle,
  getResponsiveCardStyle,
  getResponsiveBadgeStyle,
  getResponsiveContainerWidth
} from '../utils/languageResponsiveSizing';
import { getDhikrContent, getDhikrCategories, searchDhikr } from '../services/multilingualDhikrService';

const DhikrScreen = ({ navigation, route }) => {
  // Language support
  const { currentLanguage } = useLanguage();
  
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [dhikrCollection, setDhikrCollection] = useState([]);
  const [filteredDhikrs, setFilteredDhikrs] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [sortBy, setSortBy] = useState('category');
  const [showSortModal, setShowSortModal] = useState(false);
  const [selectedDhikr, setSelectedDhikr] = useState(null);
  const [showDhikrModal, setShowDhikrModal] = useState(false);
  const scrollViewRef = useRef(null);

  // Dhikr categories for organization - will be updated with translations
  const [categories, setCategories] = useState([
    { id: 'all', name: t('allDhikr', currentLanguage), icon: 'library-outline', count: 0 },
    { id: 'morning', name: t('morning', currentLanguage), icon: 'sunny-outline', count: 0 },
    { id: 'evening', name: t('evening', currentLanguage), icon: 'moon-outline', count: 0 },
    { id: 'general', name: t('general', currentLanguage), icon: 'repeat-outline', count: 0 },
    { id: 'afterPrayer', name: t('afterPrayer', currentLanguage), icon: 'cellular-outline', count: 0 },
    { id: 'istighfar', name: t('istighfar', currentLanguage), icon: 'heart-outline', count: 0 },
    { id: 'sleep', name: t('sleep', currentLanguage), icon: 'bed-outline', count: 0 },
    { id: 'travel', name: t('travel', currentLanguage), icon: 'airplane-outline', count: 0 },
    { id: 'protection', name: t('protection', currentLanguage), icon: 'shield-outline', count: 0 },
  ]);

  const sortOptions = [
    { id: 'category', name: t('byCategory', currentLanguage), icon: 'library-outline' },
    { id: 'title', name: t('byTitle', currentLanguage), icon: 'text-outline' },
    { id: 'source', name: t('bySource', currentLanguage), icon: 'bookmark-outline' },
    { id: 'repetitions', name: t('byRepetitions', currentLanguage), icon: 'refresh-outline' },
  ];

  // Handle navigation parameters for highlighted dhikr
  useEffect(() => {
    if (route.params?.highlightDhikr) {
      const { title, arabic, translation, reference, dhikrId, category } = route.params.highlightDhikr;
      
      console.log('🔍 DhikrScreen: Handling highlight dhikr:', { title, dhikrId, category });
      
      // Wait for dhikr collection to be loaded
      if (dhikrCollection.length === 0) {
        console.log('⏳ DhikrScreen: Waiting for dhikr collection to load...');
        return; // Wait for collection to load
      }
      
      console.log(`📊 DhikrScreen: Collection loaded with ${dhikrCollection.length} dhikrs`);
      
      // First try to find by Firebase document ID (most reliable)
      let foundDhikr = null;
      if (dhikrId) {
        foundDhikr = dhikrCollection.find(dhikr => dhikr.id === dhikrId);
        console.log(`🔍 DhikrScreen: Looking for dhikr with ID ${dhikrId}:`, foundDhikr ? 'Found' : 'Not found');
      }
      
      // If not found by ID, try to find by exact match
      if (!foundDhikr) {
        foundDhikr = dhikrCollection.find(dhikr => 
          dhikr.title === title || 
          dhikr.arabic === arabic || 
          dhikr.translation === translation
        );
        console.log('🔍 DhikrScreen: Looking for exact match:', foundDhikr ? 'Found' : 'Not found');
      }
      
      // If still not found, try to find by partial match
      if (!foundDhikr) {
        foundDhikr = dhikrCollection.find(dhikr => 
          dhikr.title?.toLowerCase().includes(title?.toLowerCase()) ||
          dhikr.translation?.toLowerCase().includes(translation?.toLowerCase())
        );
        console.log('🔍 DhikrScreen: Looking for partial match:', foundDhikr ? 'Found' : 'Not found');
      }
      
      // If found, set category and open modal
      if (foundDhikr) {
        console.log('✅ DhikrScreen: Found dhikr, setting category and opening modal');
        console.log('📋 Found dhikr details:', {
          id: foundDhikr.id,
          title: foundDhikr.title,
          category: foundDhikr.category,
          arabic: foundDhikr.arabic?.substring(0, 50) + '...'
        });
        setSelectedCategory(foundDhikr.category);
        setSelectedDhikr(foundDhikr);
        // Add a small delay to ensure the category change is processed
        setTimeout(() => {
          console.log('🎯 DhikrScreen: Opening modal for dhikr:', foundDhikr.title);
          setShowDhikrModal(true);
        }, 300);
      } else {
        console.log('❌ DhikrScreen: Could not find matching dhikr in collection');
        console.log('🔍 DhikrScreen: Available dhikrs in collection:', dhikrCollection.length);
        console.log('🔍 DhikrScreen: First few dhikr titles:', dhikrCollection.slice(0, 3).map(d => d.title));
        // If we have a category, at least set that
        if (category) {
          setSelectedCategory(category);
        }
      }
    }
  }, [route.params, dhikrCollection]);

  useEffect(() => {
    fetchDhikrCollection();
  }, [currentLanguage]); // Reload when language changes

  // Update categories when language changes
  useEffect(() => {
    const updatedCategories = [
      { id: 'all', name: t('allDhikr', currentLanguage), icon: 'library-outline', count: 0 },
      { id: 'morning', name: t('morning', currentLanguage), icon: 'sunny-outline', count: 0 },
      { id: 'evening', name: t('evening', currentLanguage), icon: 'moon-outline', count: 0 },
      { id: 'general', name: t('general', currentLanguage), icon: 'repeat-outline', count: 0 },
      { id: 'afterPrayer', name: t('afterPrayer', currentLanguage), icon: 'cellular-outline', count: 0 },
      { id: 'istighfar', name: t('istighfar', currentLanguage), icon: 'heart-outline', count: 0 },
      { id: 'sleep', name: t('sleep', currentLanguage), icon: 'bed-outline', count: 0 },
      { id: 'travel', name: t('travel', currentLanguage), icon: 'airplane-outline', count: 0 },
      { id: 'protection', name: t('protection', currentLanguage), icon: 'shield-outline', count: 0 },
    ];
    setCategories(updatedCategories);
  }, [currentLanguage]);

  useEffect(() => {
    filterAndSortDhikrs();
  }, [selectedCategory, searchQuery, sortBy, dhikrCollection]);

  // Fetch dhikr collection using multilingual service
  const fetchDhikrCollection = async () => {
    try {
      setLoading(true);
      setError(null);

      console.log('🔍 DhikrScreen: Fetching dhikr collection using multilingual service...');
      console.log('🌍 DhikrScreen: Current language:', currentLanguage);
      
      // Use the multilingual service to get all dhikr for current language
      const allDhikrs = await getDhikrContent('all', currentLanguage);
      console.log('📊 DhikrScreen: Received dhikr count:', allDhikrs.length);
      
      if (allDhikrs.length === 0) {
        throw new Error('No dhikr data available');
      }

      // Ensure colors are set for each dhikr
      const dhikrsWithColors = allDhikrs.map(dhikr => ({
        ...dhikr,
        color: dhikr.color || dhikrService.getCategoryColor(dhikr.category)
      }));

      console.log(`✅ DhikrScreen: Loaded ${dhikrsWithColors.length} dhikrs successfully in ${currentLanguage}`);
      
      setDhikrCollection(dhikrsWithColors);
      updateCategoryCounts(dhikrsWithColors);
      setLoading(false);

    } catch (error) {
      console.error('❌ DhikrScreen: Error fetching dhikr collection:', error);
      setError('Unable to load dhikr content. Please check your connection and try again.');
      setLoading(false);
    }
  };

  // Update category counts
  const updateCategoryCounts = (dhikrList) => {
    const updatedCategories = categories.map(category => {
      if (category.id === 'all') {
        return { ...category, count: dhikrList.length };
      }
      return {
        ...category,
        count: dhikrList.filter(dhikr => dhikr.category === category.id).length
      };
    });
    setCategories(updatedCategories);
  };

  // Filter and sort dhikrs
  const filterAndSortDhikrs = () => {
    let filtered = dhikrCollection;

    // Filter by category
    if (selectedCategory !== 'all') {
      filtered = filtered.filter(dhikr => dhikr.category === selectedCategory);
    }

    // Filter by search query
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(dhikr =>
        dhikr.title?.toLowerCase().includes(query) ||
        dhikr.arabic?.toLowerCase().includes(query) ||
        dhikr.transliteration?.toLowerCase().includes(query) ||
        dhikr.translation?.toLowerCase().includes(query) ||
        dhikr.benefits?.toLowerCase().includes(query) ||
        dhikr.source?.toLowerCase().includes(query) ||
        dhikr.occasion?.toLowerCase().includes(query)
      );
    }

    // Sort dhikrs
    filtered.sort((a, b) => {
      switch (sortBy) {
        case 'title':
          return (a.title || '').localeCompare(b.title || '');
        case 'source':
          return (a.source || '').localeCompare(b.source || '');
        case 'repetitions':
          return (a.repetitions || '').localeCompare(b.repetitions || '');
        case 'category':
        default:
          return (a.category || '').localeCompare(b.category || '');
      }
    });

    setFilteredDhikrs(filtered);
  };

  // Handle search
  const handleSearch = (text) => {
    setSearchQuery(text);
  };

  const clearSearch = () => {
    setSearchQuery('');
  };

  const retryFetch = () => {
    fetchDhikrCollection();
  };

  const handleDhikrPress = (item) => {
    setSelectedDhikr(item);
    setShowDhikrModal(true);
  };

  const closeDhikrModal = () => {
    setShowDhikrModal(false);
    setSelectedDhikr(null);
  };

  // Scroll to top function
  const scrollToTop = useCallback(() => {
    if (scrollViewRef.current) {
      // For ScrollView, use scrollTo
      scrollViewRef.current.scrollTo({ y: 0, animated: true });
    }
  }, []);

  const renderDhikrCard = ({ item }) => (
    <TouchableOpacity style={styles.hadithCard} activeOpacity={0.7} onPress={() => handleDhikrPress(item)}>
      <View style={styles.hadithHeader}>
        <View style={styles.collectionInfo}>
          <Text style={[
            styles.collectionName,
            getResponsiveTextStyle(dhikrService.getCategoryDisplayName(item.category), 14, currentLanguage, Dimensions.get('window').width - 120)
          ]}>
            {dhikrService.getCategoryDisplayName(item.category)}
          </Text>
          {item.id && <Text style={styles.hadithNumber}>#{item.id}</Text>}
        </View>
        {item.repetitions && (
          <View style={styles.gradeContainer}>
            <Text style={styles.grade}>{item.repetitions}</Text>
      </View>
        )}
      </View>
      <Text style={[
        styles.hadithText,
        getResponsiveTextStyle(item.translation, 18, currentLanguage, Dimensions.get('window').width - 80)
      ]}>
        {item.translation}
      </Text>
      {item.arabic && (
        <Text style={styles.arabicText}>{item.arabic}</Text>
      )}
      {item.transliteration && (
      <Text style={styles.dhikrTransliteration}>{item.transliteration}</Text>
      )}
      {item.benefits && (
        <View style={styles.benefitsSection}>
          <Text style={styles.benefitsLabel}>Benefits:</Text>
          <Text style={styles.benefitsText}>{item.benefits}</Text>
          </View>
        )}
      <View style={styles.hadithFooter}>
        <View style={styles.narratorInfo}>
          <Ionicons name="bookmark-outline" size={16} color="#B0B0B0" />
          <Text style={styles.narrator}>{item.source}</Text>
        </View>
        {item.repetitions && <Text style={styles.theme}>{item.repetitions}</Text>}
      </View>
    </TouchableOpacity>
  );

  const renderCategoryCard = ({ item }) => (
    <TouchableOpacity
      style={[
        styles.categoryCard,
        selectedCategory === item.id && styles.selectedCategoryCard
      ]}
      onPress={() => setSelectedCategory(item.id)}
    >
        <Ionicons 
          name={item.icon} 
        size={24}
        color={selectedCategory === item.id ? '#E5E7EB' : '#6366F1'}
        />
      <Text 
        style={[
          styles.categoryName,
          selectedCategory === item.id && styles.selectedCategoryName,
          getResponsiveTextStyle(item.name, 11, currentLanguage, 80)
        ]}
        numberOfLines={2}
        adjustsFontSizeToFit={true}
        minimumFontScale={0.8}
      >
        {item.name}
      </Text>
      <Text style={[
        styles.categoryCount,
        selectedCategory === item.id && styles.selectedCategoryCount
      ]}>
        {item.count}
      </Text>
    </TouchableOpacity>
  );

  const renderSortModal = () => (
    <Modal
      visible={showSortModal}
      transparent={true}
      animationType="fade"
      onRequestClose={() => setShowSortModal(false)}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <Text style={styles.modalTitle}>Sort Dhikr By</Text>
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
                color={sortBy === option.id ? '#6366F1' : '#6B7280'}
              />
              <Text style={[
                styles.sortOptionText,
                sortBy === option.id && styles.selectedSortOptionText
              ]}>
                {option.name}
              </Text>
              {sortBy === option.id && (
                <Ionicons name="checkmark" size={20} color="#6366F1" />
              )}
            </TouchableOpacity>
          ))}
            </View>
            </View>
    </Modal>
  );

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar barStyle="light-content" backgroundColor="#121212" />
          <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#6366F1" />
          <Text style={styles.loadingText}>Loading Dhikr Collection...</Text>
          <Text style={styles.loadingSubtext}>Authentic Islamic Remembrances</Text>
          </View>
        </SafeAreaView>
    );
  }

  if (error) {
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar barStyle="light-content" backgroundColor="#121212" />
          <View style={styles.errorContainer}>
          <Ionicons name="alert-circle" size={60} color="#EF4444" />
          <Text style={styles.errorTitle}>Unable to Load Dhikr</Text>
          <Text style={styles.errorMessage}>{error}</Text>
              <TouchableOpacity style={styles.retryButton} onPress={retryFetch}>
                <Text style={styles.retryButtonText}>Try Again</Text>
              </TouchableOpacity>
          </View>
        </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#121212' }}>
      {/* Fixed Header */}
        <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#fff" />
          </TouchableOpacity>
          <TouchableOpacity onPress={scrollToTop} style={styles.headerTitleContainer}>
            <Text style={styles.headerTitle}>ذِكْر</Text>
            <Text style={[styles.headerSubtitle, { fontSize: getResponsiveFontSize(t('dhikr', currentLanguage), 12, currentLanguage) }]}>{t('dhikr', currentLanguage)}</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={() => setShowSortModal(true)} style={styles.sortButton}>
          <Ionicons name="filter-outline" size={24} color="#fff" />
        </TouchableOpacity>
          </View>
          
      {/* Fixed Search Bar */}
      <View style={styles.searchContainer}>
        <View style={styles.searchBar}>
          <Ionicons name="search" size={20} color="#6B7280" />
            <TextInput
              style={styles.searchInput}
              placeholder={t('searchDhikr', currentLanguage)}
            placeholderTextColor="#6B7280"
              value={searchQuery}
              onChangeText={handleSearch}
            />
            {searchQuery.length > 0 && (
            <TouchableOpacity onPress={clearSearch}>
              <Ionicons name="close-circle" size={20} color="#6B7280" />
              </TouchableOpacity>
            )}
          </View>
        </View>

      {/* Scrollable Content */}
      <ScrollView 
        ref={scrollViewRef}
        style={styles.scrollableContent}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollableContentContainer}
      >
        {/* Categories */}
      <View style={styles.categoriesContainer}>
                  <FlatList
          data={categories}
          renderItem={renderCategoryCard}
          keyExtractor={item => item.id}
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.categoriesList}
        />
        </View>

      {/* Results Summary */}
      <View style={styles.summaryContainer}>
        <Text style={styles.summaryText}>
          {filteredDhikrs.length} {filteredDhikrs.length === 1 ? t('dhikr', currentLanguage) : t('dhikrs', currentLanguage)} 
          {selectedCategory !== 'all' && ` ${t('in', currentLanguage)} ${dhikrService.getCategoryDisplayName(selectedCategory)}`}
          {searchQuery && ` ${t('matching', currentLanguage)} "${searchQuery}"`}
          </Text>
        </View>

        {/* Dhikr List */}
        <View style={styles.dhikrList}>
          {filteredDhikrs.length === 0 ? (
            <View style={styles.emptyContainer}>
              <Ionicons name="book-outline" size={60} color="#6B7280" />
              <Text style={styles.emptyTitle}>{t('noDhikrFound', currentLanguage)}</Text>
              <Text style={styles.emptyMessage}>
                {searchQuery ? t('tryAdjustingSearch', currentLanguage) : t('noDhikrAvailableForCategory', currentLanguage)}
              </Text>
            </View>
          ) : (
            filteredDhikrs.map((item) => (
              <View key={`dhikr-${item.id}`}>
                {renderDhikrCard({ item })}
              </View>
            ))
          )}
        </View>
      </ScrollView>

      {renderSortModal()}
      {showDhikrModal && selectedDhikr && (
  <Modal visible={showDhikrModal} animationType="slide" onRequestClose={closeDhikrModal}>
    <SafeAreaView style={{ flex: 1, backgroundColor: '#121212' }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', padding: 20, backgroundColor: '#1E1E1E' }}>
        <TouchableOpacity onPress={closeDhikrModal} style={{ padding: 5 }}>
          <Ionicons name="close" size={28} color="#fff" />
                </TouchableOpacity>
        <Text style={{ color: '#fff', fontSize: 20, fontWeight: 'bold', marginLeft: 20 }}>
          {selectedDhikr.title || 'Dhikr Detail'}
        </Text>
              </View>
      <ScrollView contentContainerStyle={{ padding: 24 }}>
        {/* Repeat card content here, but larger font sizes if desired */}
        <Text style={{ color: '#B0B0B0', fontSize: 18, marginBottom: 8 }}>
          {dhikrService.getCategoryDisplayName(selectedDhikr.category)} #{selectedDhikr.id}
                  </Text>
        <Text style={{ color: '#fff', fontSize: 22, marginBottom: 16 }}>{selectedDhikr.translation}</Text>
        {selectedDhikr.arabic && (
          <Text style={{ color: '#fff', fontSize: 28, textAlign: 'right', marginBottom: 16, lineHeight: 40, fontFamily: Platform.OS === 'ios' ? 'Arial' : 'Roboto' }}>{selectedDhikr.arabic}</Text>
        )}
        {selectedDhikr.transliteration && (
          <Text style={{ color: '#9CA3AF', fontSize: 16, fontStyle: 'italic', marginBottom: 16 }}>{selectedDhikr.transliteration}</Text>
        )}
        {selectedDhikr.benefits && (
          <View style={styles.benefitsSection}>
            <Text style={styles.benefitsLabel}>Benefits:</Text>
            <Text style={styles.benefitsText}>{selectedDhikr.benefits}</Text>
            </View>
        )}
        <View style={styles.hadithFooter}>
          <View style={styles.narratorInfo}>
            <Ionicons name="bookmark-outline" size={16} color="#B0B0B0" />
            <Text style={styles.narrator}>{selectedDhikr.source}</Text>
          </View>
          {selectedDhikr.repetitions && <Text style={styles.theme}>{selectedDhikr.repetitions}</Text>}
        </View>
      </ScrollView>
    </SafeAreaView>
        </Modal>
)}
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
    backgroundColor: '#121212',
    borderBottomWidth: 1,
    borderBottomColor: '#2A2A2A',
  },
  backButton: {
    padding: 5,
  },
  headerTitleContainer: {
    flex: 1,
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
  },
  headerSubtitle: {
    fontSize: 12,
    color: '#B0B0B0',
    marginTop: 2,
    letterSpacing: 0.5,
  },
  sortButton: {
    padding: 5,
  },
  searchContainer: {
    paddingHorizontal: 20,
    paddingVertical: 15,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1E1E1E',
    borderRadius: 10,
    paddingHorizontal: 15,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: '#2A2A2A',
  },
  searchInput: {
    flex: 1,
    marginLeft: 10,
    fontSize: 16,
    color: '#fff',
  },
  categoriesContainer: {
    paddingVertical: 10,
  },
  categoriesList: {
    paddingHorizontal: 15,
  },
  categoryCard: {
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 16,
    paddingVertical: 18,
    paddingHorizontal: 20,
    marginHorizontal: 8,
    minWidth: 110,
    maxWidth: 140,
    borderWidth: 1,
    borderColor: '#2A2A2A',
    backgroundColor: '#1A1A1A',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  selectedCategoryCard: {
    backgroundColor: '#23272F',
    borderColor: '#6366F1',
    shadowColor: '#6366F1',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  categoryName: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '600',
    marginTop: 5,
    textAlign: 'center',
    flexWrap: 'wrap',
    numberOfLines: 2,
    lineHeight: 14,
  },
  selectedCategoryName: {
    color: '#E5E7EB',
  },
  categoryCount: {
    color: '#6B7280',
    fontSize: 10,
    marginTop: 2,
  },
  selectedCategoryCount: {
    color: '#E5E7EB',
  },
  summaryContainer: {
    paddingHorizontal: 20,
    paddingBottom: 10,
  },
  summaryText: {
    color: '#6B7280',
    fontSize: 13,
    textAlign: 'center',
    numberOfLines: 2,
    adjustsFontSizeToFit: true,
    minimumFontScale: 0.8,
  },
  duaList: {
    padding: 20,
  },
  dhikrCard: {
    backgroundColor: '#1E1E1E',
    borderRadius: 12,
    padding: 20,
    marginBottom: 15,
    borderWidth: 1,
    borderColor: '#2A2A2A',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 3,
    marginHorizontal: 10,
    maxWidth: 500,
    alignSelf: 'center',
  },
  dhikrHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 15,
  },
  dhikrTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
    flex: 1,
    marginRight: 10,
  },
  categoryBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    backgroundColor: '#23272F',
    minWidth: 60,
    maxWidth: 120,
  },
  categoryBadgeText: {
    color: '#fff',
    fontSize: 9,
    fontWeight: '600',
    textAlign: 'center',
    numberOfLines: 1,
    adjustsFontSizeToFit: true,
    minimumFontScale: 0.8,
  },
  dhikrArabic: {
    fontSize: 20,
    color: '#6366F1',
    textAlign: 'right',
    lineHeight: 35,
    marginBottom: 10,
    fontWeight: '500',
    fontFamily: Platform.OS === 'ios' ? 'Arial' : 'Roboto',
  },
  dhikrTransliteration: {
    fontSize: 14,
    color: '#9CA3AF',
    fontStyle: 'italic',
    marginBottom: 10,
    lineHeight: 20,
  },
  dhikrTranslation: {
    fontSize: 16,
    color: '#E5E7EB',
    lineHeight: 24,
    marginBottom: 15,
  },
  benefitsSection: {
    backgroundColor: '#121212',
    borderRadius: 8,
    padding: 12,
    marginBottom: 15,
    borderWidth: 1,
    borderColor: '#2A2A2A',
  },
  benefitsLabel: {
    fontSize: 12,
    color: '#6366F1',
    fontWeight: '600',
    marginBottom: 5,
  },
  benefitsText: {
    fontSize: 14,
    color: '#D1D5DB',
    lineHeight: 20,
  },
  dhikrFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingTop: 15,
    borderTopWidth: 1,
    borderTopColor: '#2A2A2A',
  },
  sourceContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  sourceText: {
    fontSize: 12,
    color: '#6B7280',
    marginLeft: 5,
  },
  repetitionsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  repetitionsText: {
    fontSize: 12,
    color: '#6B7280',
    marginLeft: 5,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    color: '#9CA3AF',
    marginTop: 10,
    fontSize: 16,
    fontWeight: '600',
  },
  loadingSubtext: {
    color: '#6B7280',
    marginTop: 5,
    fontSize: 14,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  errorTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
    marginTop: 20,
    marginBottom: 10,
    textAlign: 'center',
  },
  errorMessage: {
    fontSize: 16,
    color: '#6B7280',
    textAlign: 'center',
    marginBottom: 30,
    lineHeight: 24,
  },
  retryButton: {
    backgroundColor: '#6366F1',
    paddingHorizontal: 30,
    paddingVertical: 15,
    borderRadius: 10,
  },
  retryButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
    marginTop: 20,
    marginBottom: 10,
  },
  emptyMessage: {
    fontSize: 16,
    color: '#6B7280',
    textAlign: 'center',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: '#1E1E1E',
    borderRadius: 15,
    padding: 20,
    width: '80%',
    maxWidth: 300,
    borderWidth: 1,
    borderColor: '#2A2A2A',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
    textAlign: 'center',
    marginBottom: 20,
  },
  sortOption: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#2A2A2A',
  },
  selectedSortOption: {
    backgroundColor: '#2A2A2A',
    borderRadius: 8,
    paddingHorizontal: 10,
  },
  sortOptionText: {
    fontSize: 16,
    color: '#E5E7EB',
    marginLeft: 15,
    flex: 1,
  },
  selectedSortOptionText: {
    color: '#6366F1',
    fontWeight: '600',
  },
  // New styles for hadithCard
  hadithCard: {
    backgroundColor: '#1E1E1E',
    borderRadius: 12,
    padding: 20,
    marginBottom: 15,
    borderWidth: 1,
    borderColor: '#2A2A2A',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 3,
    marginHorizontal: 10,
    maxWidth: 500,
    alignSelf: 'center',
  },
  hadithHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 15,
  },
  collectionInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  collectionName: {
    fontSize: 14,
    color: '#B0B0B0',
    fontWeight: '600',
  },
  hadithNumber: {
    fontSize: 14,
    color: '#6B7280',
    marginLeft: 5,
  },
  gradeContainer: {
    backgroundColor: '#23272F',
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  grade: {
    fontSize: 12,
    color: '#fff',
    fontWeight: '600',
  },
  hadithText: {
    fontSize: 16,
    color: '#E5E7EB',
    lineHeight: 24,
    marginBottom: 10,
  },
  arabicText: {
    fontSize: 20,
    color: '#fff',
    textAlign: 'right',
    lineHeight: 35,
    fontWeight: '500',
    fontFamily: Platform.OS === 'ios' ? 'Arial' : 'Roboto',
  },
  narratorInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  narrator: {
    fontSize: 12,
    color: '#B0B0B0',
    marginLeft: 5,
  },
  theme: {
    fontSize: 12,
    color: '#6B7280',
    marginLeft: 10,
  },
  scrollableContent: {
    flex: 1,
  },
  scrollableContentContainer: {
    paddingBottom: 20,
  },
});

export default DhikrScreen; 