import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  ActivityIndicator,
  StatusBar,
  SafeAreaView,
  Image,
  Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useLanguage } from '../utils/useLanguage';
import { t } from '../utils/translations';
import { getMajorCollectionsForLanguage } from '../services/multilingualHadithService';

const { width } = Dimensions.get('window');

const HadithBookCatalogScreen = ({ navigation }) => {
  const { currentLanguage } = useLanguage();
  const [majorCollections, setMajorCollections] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadHadithBooks();
  }, [currentLanguage]);

  const loadHadithBooks = () => {
    setLoading(true);
    try {
      const collections = getMajorCollectionsForLanguage(currentLanguage);
      setMajorCollections(collections);
    } catch (error) {
      console.error('Error loading hadith books:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleBookSelect = (book) => {
    navigation.navigate('Hadith', { 
      selectedBook: book.id,
      bookName: book.name,
      bookNameAr: book.nameAr 
    });
  };

  const renderBookCard = ({ item: book }) => (
    <TouchableOpacity
      style={styles.bookCard}
      onPress={() => handleBookSelect(book)}
      activeOpacity={0.7}
    >
      <View style={styles.bookCardContent}>
        <View style={styles.bookInfo}>
          <Text style={styles.bookName}>{book.name}</Text>
          {book.nameAr && (
            <Text style={styles.bookNameAr}>{book.nameAr}</Text>
          )}
          <Text style={styles.bookDescription}>
            {t('hadithCollection', currentLanguage) || 'Hadith Collection'}
          </Text>
        </View>
        
        <View style={styles.arrowContainer}>
          <Text style={styles.arrowText}>›</Text>
        </View>
      </View>
    </TouchableOpacity>
  );

  if (loading) {
    return (
      <LinearGradient colors={["#181818", "#232323"]} style={styles.gradient}>
        <SafeAreaView style={styles.container}>
          <StatusBar barStyle="light-content" backgroundColor="#121212" />
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#FFD700" />
            <Text style={styles.loadingText}>
              {t('loadingBooks', currentLanguage) || 'Loading Hadith Books...'}
            </Text>
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
            <Text style={styles.backButtonText}>‹</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>
            {t('hadithBooks', currentLanguage) || 'Hadith Books'}
          </Text>
          <View style={styles.headerSpacer} />
        </View>

        {/* Description */}
        <View style={styles.descriptionContainer}>
          <Text style={styles.descriptionText}>
            {t('selectHadithBook', currentLanguage) || 'Select a hadith book to read hadiths from that specific collection'}
          </Text>
        </View>

        {/* Books List */}
        <FlatList
          data={majorCollections}
          renderItem={renderBookCard}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.booksList}
          showsVerticalScrollIndicator={false}
        />
      </SafeAreaView>
    </LinearGradient>
  );
};

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
  backButtonText: {
    fontSize: 24,
    color: '#FFFFFF',
    fontWeight: '300',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '500',
    color: '#FFFFFF',
  },
  headerSpacer: {
    width: 40,
  },
  descriptionContainer: {
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  descriptionText: {
    fontSize: 14,
    color: '#888888',
    textAlign: 'center',
    lineHeight: 20,
  },
  booksList: {
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  bookCard: {
    marginBottom: 12,
    backgroundColor: '#1A1A1A',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#2A2A2A',
  },
  bookCardContent: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 20,
  },
  bookInfo: {
    flex: 1,
  },
  bookName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
    marginBottom: 2,
  },
  bookNameAr: {
    fontSize: 13,
    color: '#888888',
    marginBottom: 6,
    fontFamily: 'Amiri-Regular',
  },
  bookDescription: {
    fontSize: 12,
    color: '#666666',
  },
  arrowContainer: {
    marginLeft: 12,
  },
  arrowText: {
    fontSize: 20,
    color: '#666666',
    fontWeight: '300',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    color: '#B0B0B0',
    fontSize: 16,
    marginTop: 12,
  },
});

export default HadithBookCatalogScreen;
