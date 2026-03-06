import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  SafeAreaView,
  StatusBar,
  ActivityIndicator,
  Alert,
  RefreshControl,
  Platform
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import bookmarkService from '../services/bookmarkService';
import { useLanguage } from '../utils/useLanguage';
import { t } from '../utils/translations';

export default function BookmarksScreen({ navigation }) {
  const { currentLanguage } = useLanguage();
  const [bookmarks, setBookmarks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    loadBookmarks();
  }, []);

  const loadBookmarks = async () => {
    try {
      setLoading(true);
      const savedBookmarks = await bookmarkService.getBookmarks();
      setBookmarks(savedBookmarks);
    } catch (error) {
      console.error('Error loading bookmarks:', error);
      Alert.alert(t('error', currentLanguage), t('failedToLoadBookmarks', currentLanguage));
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadBookmarks();
    setRefreshing(false);
  };

  const removeBookmark = async (bookmarkId) => {
    Alert.alert(
      t('removeBookmark', currentLanguage),
      t('removeBookmarkMessage', currentLanguage),
      [
        { text: t('cancel', currentLanguage), style: 'cancel' },
        {
          text: t('remove', currentLanguage),
          style: 'destructive',
          onPress: async () => {
            try {
              const success = await bookmarkService.removeBookmark(bookmarkId);
              if (success) {
                setBookmarks(bookmarks.filter(b => b.id !== bookmarkId));
              }
            } catch (error) {
              console.error('Error removing bookmark:', error);
              Alert.alert(t('error', currentLanguage), t('failedToRemoveBookmark', currentLanguage));
            }
          }
        }
      ]
    );
  };

  const navigateToVerse = (bookmark) => {
    navigation.replace('Quran', {
      surah: bookmark.surah,
      ayah: bookmark.ayah,
      scrollToVerse: true
    });
  };

  const clearAllBookmarks = () => {
    Alert.alert(
      t('clearAllBookmarks', currentLanguage),
      t('clearAllBookmarksMessage', currentLanguage),
      [
        { text: t('cancel', currentLanguage), style: 'cancel' },
        {
          text: t('clearAll', currentLanguage),
          style: 'destructive',
          onPress: async () => {
            try {
              const success = await bookmarkService.clearAllBookmarks();
              if (success) {
                setBookmarks([]);
              }
            } catch (error) {
              console.error('Error clearing bookmarks:', error);
              Alert.alert(t('error', currentLanguage), t('failedToClearBookmarks', currentLanguage));
            }
          }
        }
      ]
    );
  };

  const renderBookmark = ({ item }) => (
    <TouchableOpacity
      style={styles.bookmarkItem}
      onPress={() => navigateToVerse(item)}
      activeOpacity={0.7}
    >
      <View style={styles.bookmarkHeader}>
        <View style={styles.verseInfo}>
          <Text style={styles.surahName}>{item.surahName}</Text>
          <Text style={styles.verseNumber}>{t('verse', currentLanguage)} {item.ayah}</Text>
        </View>
        <TouchableOpacity
          style={styles.removeButton}
          onPress={() => removeBookmark(item.id)}
        >
          <Ionicons name="close-circle" size={24} color="#FF6B6B" />
        </TouchableOpacity>
      </View>
      
      <View style={styles.verseContent}>
        <Text style={styles.arabicText} numberOfLines={3}>
          {item.text}
        </Text>
        <Text style={styles.translationText} numberOfLines={2}>
          {item.translation}
        </Text>
      </View>
      
      <View style={styles.bookmarkFooter}>
        <Text style={styles.dateText}>
          {item.createdAt ? new Date(item.createdAt.seconds * 1000).toLocaleDateString() : t('recently', currentLanguage)}
        </Text>
        <View style={styles.navigateIcon}>
          <Ionicons name="arrow-forward" size={16} color="#FFD700" />
        </View>
      </View>
    </TouchableOpacity>
  );

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar barStyle="light-content" />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#FFD700" />
          <Text style={styles.loadingText}>{t('loadingBookmarks', currentLanguage)}</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" />
      
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity 
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{t('bookmarks', currentLanguage)}</Text>
        {bookmarks.length > 0 && (
          <TouchableOpacity 
            style={styles.clearButton}
            onPress={clearAllBookmarks}
          >
            <Ionicons name="trash-outline" size={20} color="#FF6B6B" />
          </TouchableOpacity>
        )}
      </View>

      {bookmarks.length === 0 ? (
        <View style={styles.emptyContainer}>
          <View style={styles.emptyIcon}>
            <Ionicons name="bookmark-outline" size={64} color="#666666" />
          </View>
          <Text style={styles.emptyTitle}>{t('noBookmarksYet', currentLanguage)}</Text>
          <Text style={styles.emptyDescription}>
            {t('noBookmarksDescription', currentLanguage)}
          </Text>
          <TouchableOpacity
            style={styles.browseButton}
            onPress={() => navigation.navigate('Quran')}
          >
            <Text style={styles.browseButtonText}>{t('browseQuran', currentLanguage)}</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={bookmarks}
          renderItem={renderBookmark}
          keyExtractor={(item) => item.id}
          contentContainerStyle={[
            styles.listContainer,
            { paddingBottom: Platform.OS === 'android' ? 180 : 20 }
          ]}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor="#FFD700"
              colors={["#FFD700"]}
            />
          }
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#121212',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    color: '#FFFFFF',
    fontSize: 16,
    marginTop: 10,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#1E1E1E',
    borderBottomWidth: 1,
    borderBottomColor: '#333333',
  },
  backButton: {
    padding: 5,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#FFFFFF',
    textAlign: 'center',
    flex: 1,
  },
  clearButton: {
    padding: 5,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  emptyIcon: {
    marginBottom: 20,
  },
  emptyTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 10,
    textAlign: 'center',
  },
  emptyDescription: {
    fontSize: 16,
    color: '#BBBBBB',
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 30,
  },
  browseButton: {
    backgroundColor: '#FFD700',
    paddingHorizontal: 30,
    paddingVertical: 15,
    borderRadius: 25,
  },
  browseButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#0F172A',
  },
  listContainer: {
    padding: 15,
  },
  bookmarkItem: {
    backgroundColor: '#1E1E1E',
    borderRadius: 16,
    padding: 18,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 215, 0, 0.1)',
  },
  bookmarkHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  verseInfo: {
    flex: 1,
  },
  surahName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
    marginBottom: 2,
  },
  verseNumber: {
    fontSize: 14,
    color: '#FFD700',
    fontWeight: '500',
  },
  removeButton: {
    padding: 5,
  },
  verseContent: {
    marginBottom: 12,
  },
  arabicText: {
    fontSize: 18,
    color: '#FFFFFF',
    lineHeight: 28,
    marginBottom: 8,
    textAlign: 'right',
    fontFamily: Platform.OS === 'ios' ? 'Arial' : 'Roboto',
  },
  translationText: {
    fontSize: 14,
    color: '#BBBBBB',
    lineHeight: 20,
  },
  bookmarkFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  dateText: {
    fontSize: 12,
    color: '#888888',
  },
  navigateIcon: {
    padding: 4,
  },
}); 
 
 