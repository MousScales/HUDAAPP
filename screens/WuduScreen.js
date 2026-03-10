import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  StatusBar,
  TouchableOpacity,
  ScrollView,
  Dimensions,
  Platform
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useLanguage } from '../utils/useLanguage';
import { t } from '../utils/translations';

const { width, height } = Dimensions.get('window');

export default function WuduScreen({ navigation }) {
  // Language support
  const { currentLanguage } = useLanguage();
  
  const [currentCardIndex, setCurrentCardIndex] = useState(0);

  // Create wudu cards with translations
  const getWuduCards = () => [
    {
      id: 1,
      title: t('intentionNiyyah', currentLanguage),
      arabic: "النية",
      content: t('intentionContent', currentLanguage),
      icon: "heart"
    },
    {
      id: 2,
      title: t('washHands', currentLanguage),
      arabic: "غسل اليدين",
      content: t('washHandsContent', currentLanguage),
      icon: "hand-left"
    },
    {
      id: 3,
      title: t('rinseMouth', currentLanguage),
      arabic: "المضمضة",
      content: t('rinseMouthContent', currentLanguage),
      icon: "water"
    },
    {
      id: 4,
      title: t('cleanNostrils', currentLanguage),
      arabic: "الاستنشاق",
      content: t('cleanNostrilsContent', currentLanguage),
      icon: "filter"
    },
    {
      id: 5,
      title: t('washFace', currentLanguage),
      arabic: "غسل الوجه",
      content: t('washFaceContent', currentLanguage),
      icon: "person"
    },
    {
      id: 6,
      title: t('washRightArm', currentLanguage),
      arabic: "غسل اليد اليمنى",
      content: t('washRightArmContent', currentLanguage),
      icon: "body-outline"
    },
    {
      id: 7,
      title: t('washLeftArm', currentLanguage),
      arabic: "غسل اليد اليسرى",
      content: t('washLeftArmContent', currentLanguage),
      icon: "body-outline"
    },
    {
      id: 8,
      title: t('wipeHead', currentLanguage),
      arabic: "مسح الرأس",
      content: t('wipeHeadContent', currentLanguage),
      icon: "person-circle"
    },
    {
      id: 9,
      title: t('wipeEars', currentLanguage),
      arabic: "مسح الأذنين",
      content: t('wipeEarsContent', currentLanguage),
      icon: "ear-outline"
    },
    {
      id: 10,
      title: t('washRightFoot', currentLanguage),
      arabic: "غسل الرجل اليمنى",
      content: t('washRightFootContent', currentLanguage),
      icon: "footsteps-outline"
    },
    {
      id: 11,
      title: t('washLeftFoot', currentLanguage),
      arabic: "غسل الرجل اليسرى",
      content: t('washLeftFootContent', currentLanguage),
      icon: "footsteps-outline"
    },
    {
      id: 12,
      title: t('wuduComplete', currentLanguage),
      arabic: "انتهاء الوضوء",
      content: t('wuduCompleteContent', currentLanguage),
      icon: "checkmark-done"
    }
  ];

  const nextCard = () => {
    if (currentCardIndex < getWuduCards().length - 1) {
      setCurrentCardIndex(currentCardIndex + 1);
    }
  };

  const prevCard = () => {
    if (currentCardIndex > 0) {
      setCurrentCardIndex(currentCardIndex - 1);
    }
  };

  const currentCard = getWuduCards()[currentCardIndex];

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
          <Text style={styles.headerTitle}>{t('wuduGuide', currentLanguage)}</Text>
          <View style={styles.headerSpacer} />
        </View>

        {/* Progress Indicator */}
        <View style={styles.progressContainer}>
          <Text style={styles.progressText}>
            {currentCardIndex + 1} {t('of', currentLanguage)} {getWuduCards().length}
          </Text>
          <View style={styles.progressBar}>
            <View 
              style={[
                styles.progressFill, 
                { width: `${((currentCardIndex + 1) / getWuduCards().length) * 100}%` }
              ]} 
            />
          </View>
        </View>

        {/* Card Container */}
        <View style={styles.cardContainer}>
          <View style={styles.card}>
            {/* Card Header */}
            <View style={styles.cardHeader}>
              <View style={styles.iconContainer}>
                <Ionicons name={currentCard.icon} size={32} color="#3498db" />
              </View>
              <Text style={styles.cardTitle}>{currentCard.title}</Text>
              <Text style={styles.cardArabic}>{currentCard.arabic}</Text>
            </View>

            {/* Card Content */}
            <View style={styles.cardContent}>
              <Text style={styles.cardText}>{currentCard.content}</Text>
            </View>
          </View>
        </View>

        {/* Navigation Buttons */}
        <View style={styles.navigationContainer}>
          <TouchableOpacity
            style={[
              styles.navButton,
              currentCardIndex === 0 && styles.disabledButton
            ]}
            onPress={prevCard}
            disabled={currentCardIndex === 0}
          >
            <Ionicons name="chevron-back" size={24} color="#fff" />
                          <Text style={styles.navButtonText}>{t('previous', currentLanguage)}</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.navButton,
              currentCardIndex === getWuduCards().length - 1 && styles.disabledButton
            ]}
            onPress={nextCard}
                          disabled={currentCardIndex === getWuduCards().length - 1}
          >
                          <Text style={styles.navButtonText}>{t('next', currentLanguage)}</Text>
            <Ionicons name="chevron-forward" size={24} color="#fff" />
          </TouchableOpacity>
        </View>
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
    paddingVertical: 15,
    backgroundColor: '#1E1E1E',
    borderBottomWidth: 1,
    borderBottomColor: '#272727',
  },
  backButton: {
    padding: 5,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#FFFFFF',
    textAlign: 'center',
    flex: 1,
  },
  headerSpacer: {
    width: 50, // Adjust as needed for spacing
  },
  progressContainer: {
    paddingHorizontal: 20,
    paddingTop: 15,
    backgroundColor: '#1E1E1E',
  },
  progressText: {
    fontSize: 14,
    color: '#FFFFFF',
    fontWeight: '600',
    marginBottom: 10,
    textAlign: 'center',
  },
  progressBar: {
    height: 4,
    backgroundColor: '#333333',
    borderRadius: 2,
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#FFFFFF',
    borderRadius: 2,
  },
  cardContainer: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 20,
  },
  card: {
    backgroundColor: '#1E1E1E',
    borderRadius: 15,
    padding: 25,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 5,
  },
  cardHeader: {
    alignItems: 'center',
    marginBottom: 20,
  },
  iconContainer: {
    width: 70,
    height: 70,
    borderRadius: 35,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 15,
  },
  cardTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#FFFFFF',
    textAlign: 'center',
    marginBottom: 10,
  },
  cardArabic: {
    fontSize: 22,
    fontFamily: Platform.OS === 'ios' ? 'Arial' : 'Roboto',
    color: '#FFFFFF',
    textAlign: 'center',
  },
  cardContent: {
    // No specific styles for content as it's just text
  },
  cardText: {
    fontSize: 16,
    color: '#FFFFFF',
    textAlign: 'center',
    lineHeight: 24,
  },
  navigationContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    marginBottom: 20,
  },
  navButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#232323',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#333',
    flex: 1,
    marginHorizontal: 5,
    justifyContent: 'center',
  },
  navButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
    marginRight: 5,
  },
  disabledButton: {
    opacity: 0.5,
  },
}); 