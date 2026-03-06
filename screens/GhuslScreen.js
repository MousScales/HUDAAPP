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

export default function GhuslScreen({ navigation }) {
  // Language support
  const { currentLanguage } = useLanguage();
  
  const [currentCardIndex, setCurrentCardIndex] = useState(0);

  // Create ghusl cards with translations
  const getGhuslCards = () => [
    {
      id: 1,
      title: t('ghuslIntentionNiyyah', currentLanguage),
      arabic: "النية",
      content: t('ghuslIntentionContent', currentLanguage),
      icon: "heart"
    },
    {
      id: 2,
      title: t('sayBismillah', currentLanguage),
      arabic: "بسم الله",
      content: t('sayBismillahContent', currentLanguage),
      icon: "chatbubbles"
    },
    {
      id: 3,
      title: t('washHands', currentLanguage),
      arabic: "غسل اليدين",
      content: t('washHandsContent', currentLanguage),
      icon: "hand-left"
    },
    {
      id: 4,
      title: t('washPrivateParts', currentLanguage),
      arabic: "غسل الفرج",
      content: t('washPrivatePartsContent', currentLanguage),
      icon: "water"
    },
    {
      id: 5,
      title: t('performWudu', currentLanguage),
      arabic: "الوضوء",
      content: t('performWuduContent', currentLanguage),
      icon: "checkmark-circle"
    },
    {
      id: 6,
      title: t('pourWaterOverHead', currentLanguage),
      arabic: "غسل الرأس",
      content: t('pourWaterOverHeadContent', currentLanguage),
      icon: "rainy"
    },
    {
      id: 7,
      title: t('washEntireBody', currentLanguage),
      arabic: "غسل جميع الجسد",
      content: t('washEntireBodyContent', currentLanguage),
      icon: "body-outline"
    },
    {
      id: 8,
      title: t('washFeetIfDelayed', currentLanguage),
      arabic: "غسل القدمين",
      content: t('washFeetIfDelayedContent', currentLanguage),
      icon: "footsteps-outline"
    },
    {
      id: 9,
      title: t('ghuslComplete', currentLanguage),
      arabic: "انتهاء الغسل",
      content: t('ghuslCompleteContent', currentLanguage),
      icon: "checkmark-done"
    }
  ];

  const nextCard = () => {
    if (currentCardIndex < getGhuslCards().length - 1) {
      setCurrentCardIndex(currentCardIndex + 1);
    }
  };

  const prevCard = () => {
    if (currentCardIndex > 0) {
      setCurrentCardIndex(currentCardIndex - 1);
    }
  };

  const currentCard = getGhuslCards()[currentCardIndex];

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
          <Text style={styles.headerTitle}>{t('ghuslGuide', currentLanguage)}</Text>
          <View style={styles.headerSpacer} />
        </View>

        {/* Progress Indicator */}
        <View style={styles.progressContainer}>
          <Text style={styles.progressText}>
            {currentCardIndex + 1} {t('of', currentLanguage)} {getGhuslCards().length}
          </Text>
          <View style={styles.progressBar}>
            <View 
              style={[
                styles.progressFill, 
                { width: `${((currentCardIndex + 1) / getGhuslCards().length) * 100}%` }
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
                <Ionicons name={currentCard.icon} size={32} color="#2196F3" />
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
              currentCardIndex === getGhuslCards().length - 1 && styles.disabledButton
            ]}
            onPress={nextCard}
            disabled={currentCardIndex === getGhuslCards().length - 1}
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
    width: 40, // Adjust as needed for spacing
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
    backgroundColor: '#2196F3',
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
    backgroundColor: '#2C2C2C',
    marginBottom: 15,
  },
  cardTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#FFFFFF',
    textAlign: 'center',
    marginBottom: 10,
  },
  cardArabic: {
    fontSize: 20,
    color: '#A9A9A9',
    textAlign: 'center',
  },
  cardContent: {
    marginTop: 10,
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
    marginRight: 10,
  },
  disabledButton: {
    opacity: 0.5,
  },
}); 