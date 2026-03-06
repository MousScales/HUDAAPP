
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
import { useLanguage } from '../utils/useLanguage';
import { t } from '../utils/translations';
import { 
  getResponsiveFontSize, 
  getResponsiveLineHeight, 
  getResponsivePadding, 
  getResponsiveContainerWidth,
  getResponsiveTextStyle,
  getResponsiveCardStyle,
  getResponsiveBadgeStyle
} from '../utils/languageResponsiveSizing';

// Import multilingual dua service
import { getDuaContent, getDuaCategories, searchDuas } from '../services/multilingualDuaService';

const DuaScreen = ({ navigation, route }) => {
  // Language support
  const { currentLanguage } = useLanguage();
  
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [duaCollection, setDuaCollection] = useState([]);
  const [filteredDuas, setFilteredDuas] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [sortBy, setSortBy] = useState('category');
  const [showSortModal, setShowSortModal] = useState(false);
  const [selectedDua, setSelectedDua] = useState(null);
  const [showDuaModal, setShowDuaModal] = useState(false);
  const scrollViewRef = useRef(null);

  // Dua categories for organization - will be updated with translations
  const [categories, setCategories] = useState([
    { id: 'all', name: 'All Duas', icon: 'library-outline', count: 0 },
    { id: 'daily', name: 'Daily Duas', icon: 'sunny-outline', count: 0 },
    { id: 'food', name: 'Food & Drink', icon: 'restaurant-outline', count: 0 },
    { id: 'emotional', name: 'Emotional', icon: 'heart-outline', count: 0 },
    { id: 'travel', name: 'Travel', icon: 'airplane-outline', count: 0 },
    { id: 'spiritual', name: 'Spiritual', icon: 'flash-outline', count: 0 },
    { id: 'sleep', name: 'Sleep', icon: 'moon-outline', count: 0 },
    { id: 'protection', name: 'Protection', icon: 'shield-outline', count: 0 },
  ]);

  const sortOptions = [
    { id: 'category', name: 'By Category', icon: 'library-outline' },
    { id: 'title', name: 'By Title', icon: 'text-outline' },
    { id: 'source', name: 'By Source', icon: 'bookmark-outline' },
    { id: 'occasion', name: 'By Occasion', icon: 'calendar-outline' },
  ];

  // Update categories with translations
  const updateCategoriesWithTranslations = () => {
    setCategories([
      { id: 'all', name: t('allDuas', currentLanguage), icon: 'library-outline', count: 0 },
      { id: 'daily', name: t('dailyDuas', currentLanguage), icon: 'sunny-outline', count: 0 },
      { id: 'food', name: t('foodAndDrink', currentLanguage), icon: 'restaurant-outline', count: 0 },
      { id: 'emotional', name: t('emotional', currentLanguage), icon: 'heart-outline', count: 0 },
      { id: 'travel', name: t('travel', currentLanguage), icon: 'airplane-outline', count: 0 },
      { id: 'spiritual', name: t('spiritual', currentLanguage), icon: 'flash-outline', count: 0 },
      { id: 'sleep', name: t('sleep', currentLanguage), icon: 'moon-outline', count: 0 },
      { id: 'protection', name: t('protection', currentLanguage), icon: 'shield-outline', count: 0 },
    ]);
  };

  // Update sort options with translations
  const getSortOptionsWithTranslations = () => [
    { id: 'category', name: t('byCategory', currentLanguage), icon: 'library-outline' },
    { id: 'title', name: t('byTitle', currentLanguage), icon: 'text-outline' },
    { id: 'source', name: t('bySource', currentLanguage), icon: 'bookmark-outline' },
    { id: 'occasion', name: t('byOccasion', currentLanguage), icon: 'calendar-outline' },
  ];

  // Handle navigation parameters for highlighted dua
  useEffect(() => {
    if (route.params?.highlightDua) {
      const { title, arabic, translation, reference } = route.params.highlightDua;
      
      // Wait for dua collection to be loaded
      if (duaCollection.length === 0) {
        return; // Wait for collection to load
      }
      
      // Find the dua in the collection
      const foundDua = duaCollection.find(dua => 
        dua.title === title || 
        dua.arabic === arabic || 
        dua.english === translation
      );
      
      if (foundDua) {
        // Set the category to show the dua
        setSelectedCategory(foundDua.category);
        // Open the dua modal immediately
        setSelectedDua(foundDua);
        setShowDuaModal(true);
      } else {
        // If exact match not found, try to find by partial match
        const partialMatch = duaCollection.find(dua => 
          dua.title?.toLowerCase().includes(title?.toLowerCase()) ||
          (dua.english || dua.translation)?.toLowerCase().includes(translation?.toLowerCase())
        );
        
        if (partialMatch) {
          setSelectedCategory(partialMatch.category);
          setSelectedDua(partialMatch);
          setShowDuaModal(true);
        }
      }
    }
  }, [route.params, duaCollection]);

  useEffect(() => {
    loadLocalDuas();
  }, []);

  // Update categories and reload duas when language changes
  useEffect(() => {
    updateCategoriesWithTranslations();
    loadLocalDuas(); // Reload duas in the new language
  }, [currentLanguage]);

  useEffect(() => {
    filterAndSortDuas();
  }, [selectedCategory, searchQuery, sortBy, duaCollection]);

  // Load duas using multilingual service
  const loadLocalDuas = async () => {
    try {
      setLoading(true);
      setError(null);

      console.log('📚 DuaScreen: Loading duas using multilingual service...');

      // Load duas for the current language
      const allDuas = await getDuaContent('all', currentLanguage);

      if (allDuas.length === 0) {
        throw new Error('No dua data available');
      }

      // Add additional properties to each dua
      const processedDuas = allDuas.map((dua, idx) => ({
        ...dua,
        color: dua.color || getCategoryColor(dua.category),
        uniqueId: `${dua.category}-${dua.id || dua.title || idx}`
      }));

      console.log(`✅ DuaScreen: Loaded ${processedDuas.length} duas successfully in ${currentLanguage}`);
      console.log('🔍 DuaScreen: Sample dua content:', processedDuas[0]?.english);
      
      setDuaCollection(processedDuas);
      updateCategoryCounts(processedDuas);
      setLoading(false);

    } catch (error) {
      console.error('❌ DuaScreen: Error loading duas:', error);
      setError('Unable to load dua content. Please restart the app and try again.');
      setLoading(false);
    }
  };

  // Get category color
  const getCategoryColor = (category) => {
    const colors = {
      daily: '#F59E0B',
      food: '#10B981',
      emotional: '#8B5CF6',
      travel: '#F97316',
      spiritual: '#3B82F6',
      sleep: '#6366F1',
      protection: '#EF4444'
    };
    return colors[category] || '#6B7280';
  };

  // Get category display name
  const getCategoryDisplayName = (category) => {
    const displayNames = {
      daily: t('daily', currentLanguage),
      food: t('foodAndDrink', currentLanguage),
      emotional: t('emotional', currentLanguage),
      travel: t('travel', currentLanguage),
      spiritual: t('spiritual', currentLanguage),
      sleep: t('sleep', currentLanguage),
      protection: t('protection', currentLanguage)
    };
    return displayNames[category] || category;
  };

  // Update category counts
  const updateCategoryCounts = (duaList) => {
    const updatedCategories = categories.map(category => {
      if (category.id === 'all') {
        return { ...category, count: duaList.length };
      }
      return {
        ...category,
        count: duaList.filter(dua => dua.category === category.id).length
      };
    });
    setCategories(updatedCategories);
  };

  // Filter and sort duas
  const filterAndSortDuas = () => {
    let filtered = duaCollection;

    // Filter by category
    if (selectedCategory !== 'all') {
      filtered = filtered.filter(dua => dua.category === selectedCategory);
    }

    // Filter by search query
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(dua =>
        dua.title?.toLowerCase().includes(query) ||
        dua.arabic?.toLowerCase().includes(query) ||
        dua.transliteration?.toLowerCase().includes(query) ||
        (dua.english || dua.translation)?.toLowerCase().includes(query) ||
        dua.benefits?.toLowerCase().includes(query) ||
        dua.occasion?.toLowerCase().includes(query) ||
        dua.source?.toLowerCase().includes(query)
      );
    }

    // Sort duas
    filtered.sort((a, b) => {
      switch (sortBy) {
        case 'title':
          return (a.title || '').localeCompare(b.title || '');
        case 'source':
          return (a.source || '').localeCompare(b.source || '');
        case 'occasion':
          return (a.occasion || '').localeCompare(b.occasion || '');
        case 'category':
        default:
          return (a.category || '').localeCompare(b.category || '');
      }
    });

    setFilteredDuas(filtered);
  };

  // Handle search
  const handleSearch = (text) => {
    setSearchQuery(text);
  };

  const clearSearch = () => {
    setSearchQuery('');
  };

  const retryLoad = () => {
    loadLocalDuas();
  };

  const handleDuaPress = (item) => {
    setSelectedDua(item);
    setShowDuaModal(true);
  };

  const closeDuaModal = () => {
    setShowDuaModal(false);
    setSelectedDua(null);
  };

  // Scroll to top function
  const scrollToTop = useCallback(() => {
    if (scrollViewRef.current) {
      // For FlatList, use scrollToOffset
      if (scrollViewRef.current.scrollToOffset) {
        scrollViewRef.current.scrollToOffset({ offset: 0, animated: true });
      }
      // For ScrollView, use scrollTo
      else if (scrollViewRef.current.scrollTo) {
        scrollViewRef.current.scrollTo({ y: 0, animated: true });
      }
    }
  }, []);

  const renderDuaCard = ({ item }) => (
    <TouchableOpacity style={styles.duaCard} activeOpacity={0.7} onPress={() => handleDuaPress(item)}>
      <View style={styles.duaHeader}>
        <View style={styles.collectionInfo}>
          <Text style={[
            styles.collectionName,
            getResponsiveTextStyle(getCategoryDisplayName(item.category), 14, currentLanguage, Dimensions.get('window').width - 120)
          ]}>
            {getCategoryDisplayName(item.category)}
          </Text>
          {item.id && <Text style={styles.duaNumber}>#{item.id}</Text>}
        </View>
        {item.occasion && (
          <View style={styles.occasionContainer}>
            <Text 
              style={[
                styles.occasion,
                getResponsiveTextStyle(item.occasion, 12, currentLanguage, 120)
              ]}
              numberOfLines={2}
              adjustsFontSizeToFit={true}
              minimumFontScale={0.8}
            >
              {item.occasion}
            </Text>
          </View>
        )}
      </View>
      <Text style={[
        styles.duaText,
        getResponsiveTextStyle(item.english || item.translation, 18, currentLanguage, Dimensions.get('window').width - 80)
      ]}>
        {item.english || item.translation}
      </Text>
      {item.arabic && (
        <Text style={[
          styles.duaArabic,
          getResponsiveTextStyle(item.arabic, 20, currentLanguage, Dimensions.get('window').width - 40)
        ]}>
          {item.arabic}
        </Text>
      )}
      {item.transliteration && (
        <Text style={[
          styles.duaTransliteration,
          getResponsiveTextStyle(item.transliteration, 14, currentLanguage, Dimensions.get('window').width - 40)
        ]}>
          {item.transliteration}
        </Text>
      )}
      {item.benefits && (
        <View style={styles.benefitsSection}>
          <Text style={[
            styles.benefitsLabel,
            getResponsiveTextStyle('Benefits:', 12, currentLanguage, 80)
          ]}>
            Benefits:
          </Text>
          <Text style={[
            styles.benefitsText,
            getResponsiveTextStyle(item.benefits, 14, currentLanguage, Dimensions.get('window').width - 60)
          ]}>
            {item.benefits}
          </Text>
        </View>
      )}
      <View style={styles.duaFooter}>
        <View style={styles.narratorInfo}>
          <Ionicons name="bookmark-outline" size={16} color="#B0B0B0" />
          <Text style={[
            styles.narrator,
            getResponsiveTextStyle(item.source, 14, currentLanguage, 150)
          ]}>
            {item.source}
          </Text>
        </View>
        {item.occasion && (
          <Text 
            style={[
              styles.theme,
              getResponsiveTextStyle(item.occasion, 12, currentLanguage, 120)
            ]}
            numberOfLines={2}
            adjustsFontSizeToFit={true}
            minimumFontScale={0.8}
          >
            {item.occasion}
          </Text>
        )}
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
        color={selectedCategory === item.id ? '#fff' : '#22c55e'}
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
          <Text style={styles.modalTitle}>{t('sortDuasBy', currentLanguage)}</Text>
                      {getSortOptionsWithTranslations().map((option) => (
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
          <Text style={styles.loadingText}>{t('loadingDuaCollection', currentLanguage)}</Text>
          <Text style={styles.loadingSubtext}>{t('authenticIslamicSupplications', currentLanguage)}</Text>
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
          <Text style={styles.errorTitle}>{t('unableToLoadDuas', currentLanguage)}</Text>
          <Text style={styles.errorMessage}>{error}</Text>
          <TouchableOpacity style={styles.retryButton} onPress={retryLoad}>
                <Text style={styles.retryButtonText}>{t('tryAgain', currentLanguage)}</Text>
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
            <Text style={styles.headerTitle}>دُعَاء</Text>
            <Text style={[styles.headerSubtitle, { fontSize: getResponsiveFontSize(t('dua', currentLanguage), 12, currentLanguage) }]}>{t('dua', currentLanguage)}</Text>
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
              placeholder={t('searchDuas', currentLanguage)}
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

      {/* Scrollable Content with Categories and Dua List */}
      <FlatList
        ref={scrollViewRef}
        data={filteredDuas}
        renderItem={renderDuaCard}
        keyExtractor={item => item.uniqueId}
        contentContainerStyle={styles.duaList}
        showsVerticalScrollIndicator={false}
        scrollEnabled={true}
        ListHeaderComponent={() => (
          <>
            {/* Categories */}
            <View style={styles.categoriesContainer}>
              <FlatList
                data={categories}
                renderItem={renderCategoryCard}
                keyExtractor={item => item.id}
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.categoriesList}
                scrollEnabled={true}
                pagingEnabled={false}
                snapToInterval={120}
                decelerationRate="fast"
              />
            </View>

            {/* Results Summary */}
            <View style={styles.summaryContainer}>
              <Text style={styles.summaryText}>
                {filteredDuas.length} {filteredDuas.length === 1 ? t('dua', currentLanguage) : t('duas', currentLanguage)} 
                {selectedCategory !== 'all' && ` ${t('in', currentLanguage)} ${getCategoryDisplayName(selectedCategory)}`}
                {searchQuery && ` ${t('matching', currentLanguage)} "${searchQuery}"`}
              </Text>
            </View>
          </>
        )}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Ionicons name="book-outline" size={60} color="#6B7280" />
            <Text style={styles.emptyTitle}>{t('noDuasFound', currentLanguage)}</Text>
            <Text style={styles.emptyMessage}>
              {searchQuery ? t('tryAdjustingSearch', currentLanguage) : t('noDuasAvailableForCategory', currentLanguage)}
            </Text>
          </View>
        }
      />

      {renderSortModal()}
      {showDuaModal && selectedDua && (
  <Modal visible={showDuaModal} animationType="slide" onRequestClose={closeDuaModal}>
    <SafeAreaView style={{ flex: 1, backgroundColor: '#121212' }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', padding: 20, backgroundColor: '#1E1E1E' }}>
        <TouchableOpacity onPress={closeDuaModal} style={{ padding: 5 }}>
          <Ionicons name="close" size={28} color="#fff" />
                </TouchableOpacity>
        <Text style={{ color: '#fff', fontSize: 20, fontWeight: 'bold', marginLeft: 20 }}>{t('duaDetail', currentLanguage)}</Text>
              </View>
      <ScrollView contentContainerStyle={{ padding: 24 }}>
        {/* Repeat card content here, but larger font sizes if desired */}
        <Text style={{ color: '#B0B0B0', fontSize: 18, marginBottom: 8 }}>
          {getCategoryDisplayName(selectedDua.category)} #{selectedDua.id}
                  </Text>
        <Text style={{ color: '#fff', fontSize: 22, marginBottom: 16 }}>{selectedDua.english || selectedDua.translation}</Text>
        {selectedDua.arabic && (
          <Text style={{ color: '#fff', fontSize: 28, textAlign: 'right', marginBottom: 16, lineHeight: 40, fontFamily: Platform.OS === 'ios' ? 'Arial' : 'Roboto' }}>{selectedDua.arabic}</Text>
        )}
        {selectedDua.transliteration && (
          <Text style={{ color: '#9CA3AF', fontSize: 16, fontStyle: 'italic', marginBottom: 16 }}>{selectedDua.transliteration}</Text>
        )}
        {selectedDua.benefits && (
          <View style={styles.benefitsSection}>
            <Text style={styles.benefitsLabel}>Benefits:</Text>
            <Text style={styles.benefitsText}>{selectedDua.benefits}</Text>
            </View>
        )}
        <View style={styles.hadithFooter}>
          <View style={styles.narratorInfo}>
            <Ionicons name="bookmark-outline" size={16} color="#B0B0B0" />
            <Text style={styles.narrator}>{selectedDua.source}</Text>
          </View>
          {selectedDua.occasion && <Text style={styles.theme}>{selectedDua.occasion}</Text>}
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
    textAlign: 'center',
    flexWrap: 'wrap',
    numberOfLines: 2,
  },
  headerSubtitle: {
    fontSize: 12,
    color: '#B0B0B0',
    marginTop: 2,
    letterSpacing: 0.5,
    textAlign: 'center',
    numberOfLines: 2,
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
    paddingVertical: 15,
    paddingHorizontal: 20,
    marginBottom: 10,
  },
  categoriesList: {
    paddingVertical: 5,
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
    adjustsFontSizeToFit: true,
    minimumFontScale: 0.8,
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
    paddingBottom: 15,
  },
  summaryText: {
    color: '#6B7280',
    fontSize: 13,
    textAlign: 'center',
    numberOfLines: 2,
    adjustsFontSizeToFit: true,
    minimumFontScale: 0.8,
    lineHeight: 18,
  },
  duaList: {
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  duaCard: {
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
  },
  duaHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 15,
  },
  collectionInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  collectionName: {
    fontSize: 14,
    color: '#22c55e',
    fontWeight: '600',
    marginRight: 8,
  },
  duaNumber: {
    fontSize: 12,
    color: '#6B7280',
    fontWeight: '500',
  },
  occasionContainer: {
    backgroundColor: '#23272F',
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  occasion: {
    fontSize: 12,
    color: '#fff',
    fontWeight: '500',
  },
  duaText: {
    fontSize: 18,
    color: '#fff',
    lineHeight: 26,
    marginBottom: 15,
    fontWeight: '500',
  },
  duaTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
    flex: 1,
    marginRight: 10,
    lineHeight: 24,
    numberOfLines: 3,
    adjustsFontSizeToFit: true,
    minimumFontScale: 0.9,
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
  duaArabic: {
    fontSize: 20,
    color: '#fff',
    textAlign: 'right',
    lineHeight: 35,
    fontWeight: '500',
    fontFamily: Platform.OS === 'ios' ? 'Arial' : 'Roboto',
  },
  duaTransliteration: {
    fontSize: 14,
    color: '#9CA3AF',
    fontStyle: 'italic',
    marginBottom: 10,
    lineHeight: 20,
  },
  duaEnglish: {
    fontSize: 16,
    color: '#E5E7EB',
    lineHeight: 24,
    marginBottom: 15,
    numberOfLines: 10,
    adjustsFontSizeToFit: true,
    minimumFontScale: 0.9,
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
    color: '#22c55e',
    fontWeight: '600',
    marginBottom: 5,
  },
  benefitsText: {
    fontSize: 14,
    color: '#D1D5DB',
    lineHeight: 20,
    numberOfLines: 5,
    adjustsFontSizeToFit: true,
    minimumFontScale: 0.9,
  },
  duaFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingTop: 15,
    borderTopWidth: 1,
    borderTopColor: '#2A2A2A',
  },
  narratorInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  narrator: {
    fontSize: 14,
    color: '#B0B0B0',
    marginLeft: 5,
    numberOfLines: 1,
    adjustsFontSizeToFit: true,
    minimumFontScale: 0.8,
  },
  theme: {
    fontSize: 12,
    color: '#6B7280',
    numberOfLines: 2,
    adjustsFontSizeToFit: true,
    minimumFontScale: 0.8,
    flex: 1,
    textAlign: 'right',
  },
  scrollableContent: {
    flex: 1,
  },
  scrollableContentContainer: {
    paddingBottom: 20,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
    paddingHorizontal: 20,
  },
  emptyTitle: {
    fontSize: 18,
    color: '#fff',
    fontWeight: '600',
    marginTop: 15,
    marginBottom: 8,
    textAlign: 'center',
  },
  emptyMessage: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: 20,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  loadingText: {
    fontSize: 18,
    color: '#fff',
    fontWeight: '600',
    marginTop: 15,
    marginBottom: 8,
    textAlign: 'center',
  },
  loadingSubtext: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: 20,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  errorTitle: {
    fontSize: 18,
    color: '#fff',
    fontWeight: '600',
    marginTop: 15,
    marginBottom: 8,
    textAlign: 'center',
  },
  errorMessage: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 20,
  },
  retryButton: {
    backgroundColor: '#6366F1',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
  },
  retryButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  selectedCategoryCard: {
    backgroundColor: '#23272F',
    borderColor: '#22c55e',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: '#1E1E1E',
    borderRadius: 12,
    padding: 20,
    marginHorizontal: 20,
    maxWidth: 300,
    width: '100%',
  },
  modalTitle: {
    fontSize: 18,
    color: '#fff',
    fontWeight: '600',
    marginBottom: 15,
    textAlign: 'center',
  },
  sortOption: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 15,
    borderRadius: 8,
    marginBottom: 8,
  },
  selectedSortOption: {
    backgroundColor: '#23272F',
  },
  sortOptionText: {
    fontSize: 16,
    color: '#fff',
    marginLeft: 12,
    flex: 1,
  },
  selectedSortOptionText: {
    color: '#6366F1',
  },
});

export default DuaScreen; 