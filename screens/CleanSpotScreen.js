import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  StatusBar,
  TouchableOpacity,
  ScrollView,
  Dimensions
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useLanguage } from '../utils/useLanguage';
import { t } from '../utils/translations';

const { width, height } = Dimensions.get('window');

export default function CleanSpotScreen({ navigation }) {
  // Language support
  const { currentLanguage } = useLanguage();
  
  const [currentCardIndex, setCurrentCardIndex] = useState(0);

  // Create clean spot cards with translations
  const getCleanSpotCards = () => [
    {
      id: 1,
      title: t('checkTheArea', currentLanguage),
      arabic: "فحص المكان",
      content: t('checkTheAreaContent', currentLanguage),
      icon: "eye"
    },
    {
      id: 2,
      title: t('removeImpurities', currentLanguage),
      arabic: "إزالة النجاسة",
      content: t('removeImpuritiesContent', currentLanguage),
      icon: "water"
    },
    {
      id: 3,
      title: t('chooseAppropriateSurface', currentLanguage),
      arabic: "اختيار السطح المناسب",
      content: t('chooseAppropriateSurfaceContent', currentLanguage),
      icon: "home"
    },
    {
      id: 4,
      title: t('placePrayerMat', currentLanguage),
      arabic: "وضع سجادة الصلاة",
      content: t('placePrayerMatContent', currentLanguage),
      icon: "grid"
    },
    {
      id: 5,
      title: t('removeFootwear', currentLanguage),
      arabic: "خلع الحذاء",
      content: t('removeFootwearContent', currentLanguage),
      icon: "footsteps-outline"
    },
    {
      id: 6,
      title: t('finalInspection', currentLanguage),
      arabic: "التفتيش النهائي",
      content: t('finalInspectionContent', currentLanguage),
      icon: "checkmark-circle"
    },
    {
      id: 7,
      title: t('spaceReady', currentLanguage),
      arabic: "المكان جاهز",
      content: t('spaceReadyContent', currentLanguage),
      icon: "star"
    }
  ];

  const nextCard = () => {
    if (currentCardIndex < getCleanSpotCards().length - 1) {
      setCurrentCardIndex(currentCardIndex + 1);
    }
  };

  const prevCard = () => {
    if (currentCardIndex > 0) {
      setCurrentCardIndex(currentCardIndex - 1);
    }
  };

  const currentCard = getCleanSpotCards()[currentCardIndex];

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
          <Text style={styles.headerTitle}>{t('cleanSpotGuide', currentLanguage)}</Text>
          <View style={styles.headerSpacer} />
        </View>

        {/* Progress Indicator */}
        <View style={styles.progressContainer}>
          <Text style={styles.progressText}>
            {currentCardIndex + 1} {t('of', currentLanguage)} {getCleanSpotCards().length}
          </Text>
          <View style={styles.progressBar}>
            <View 
              style={[
                styles.progressFill, 
                { width: `${((currentCardIndex + 1) / getCleanSpotCards().length) * 100}%` }
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
                <Ionicons name={currentCard.icon} size={32} color="#2ECC71" />
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
              currentCardIndex === getCleanSpotCards().length - 1 && styles.disabledButton
            ]}
            onPress={nextCard}
            disabled={currentCardIndex === getCleanSpotCards().length - 1}
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
    justifyContent: 'space-between',
    alignItems: 'center',
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
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  headerSpacer: {
    width: 34,
  },
  progressContainer: {
    paddingHorizontal: 20,
    paddingVertical: 15,
    backgroundColor: '#1E1E1E',
  },
  progressText: {
    textAlign: 'center',
    color: '#A9A9A9',
    marginBottom: 10,
    fontSize: 14,
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
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 5,
  },
  cardHeader: {
    flexDirection: 'column',
    alignItems: 'center',
    marginBottom: 20,
  },
  iconContainer: {
    width: 60,
    height: 60,
    borderRadius: 30,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 10,
  },
  cardTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 4,
    textAlign: 'center',
  },
  cardArabic: {
    fontSize: 20,
    color: '#2ECC71',
    marginBottom: 0,
    textAlign: 'center',
    fontStyle: 'normal',
  },
  cardContent: {
    marginTop: 10,
  },
  cardText: {
    fontSize: 16,
    color: '#FFFFFF',
    textAlign: 'center',
    lineHeight: 22,
  },
  navigationContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingBottom: 20,
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
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
    marginRight: 10,
  },
  disabledButton: {
    opacity: 0.5,
  },
});