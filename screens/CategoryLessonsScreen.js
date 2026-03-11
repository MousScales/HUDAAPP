import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  SafeAreaView,
  StatusBar,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useLanguage } from '../utils/useLanguage';
import { t } from '../utils/translations';
import { getResponsiveIconSize } from '../utils/responsiveSizing';

export default function CategoryLessonsScreen({ route, navigation }) {
  const { currentLanguage } = useLanguage();
  const { categoryName, lessons } = route.params;

  const handleLessonPress = (lesson) => {
    navigation.navigate('LessonDetail', { lesson });
  };

  const renderLessonItem = ({ item }) => (
    <TouchableOpacity
      style={styles.lessonItem}
      onPress={() => handleLessonPress(item)}
      activeOpacity={0.7}
    >
      <Text style={styles.lessonTitle} numberOfLines={2}>
        {item.title}
      </Text>
      <Ionicons name="chevron-forward" size={18} color="#666" />
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#121212" />
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Ionicons name="arrow-back" size={getResponsiveIconSize(24)} color="#FFFFFF" />
        </TouchableOpacity>
        <Text style={styles.headerTitle} numberOfLines={1}>
          {categoryName}
        </Text>
        <View style={styles.headerRight} />
      </View>

      <FlatList
        data={lessons}
        keyExtractor={(item) => String(item.id)}
        renderItem={renderLessonItem}
        contentContainerStyle={[
          styles.listContent,
          { paddingBottom: Platform.OS === 'android' ? 100 : 40 },
        ]}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Text style={styles.emptyText}>
              {t('noLessons', currentLanguage) || 'No lessons in this category'}
            </Text>
          </View>
        }
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#121212',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#1E1E1E',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.1)',
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: '#2A2A2A',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    flex: 1,
    fontSize: 17,
    fontWeight: '600',
    color: '#FFFFFF',
    marginHorizontal: 12,
    textAlign: 'center',
  },
  headerRight: {
    width: 40,
  },
  listContent: {
    paddingHorizontal: 16,
    paddingTop: 8,
  },
  lessonItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    borderRadius: 12,
    padding: 16,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  lessonTitle: {
    flex: 1,
    fontSize: 15,
    fontWeight: '500',
    color: '#FFFFFF',
    marginRight: 12,
  },
  emptyState: {
    padding: 40,
    alignItems: 'center',
  },
  emptyText: {
    color: '#888',
    fontSize: 15,
  },
});
