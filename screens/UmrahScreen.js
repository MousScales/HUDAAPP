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

export default function UmrahScreen({ navigation }) {
  // Language support
  const { currentLanguage } = useLanguage();
  
  const [currentCardIndex, setCurrentCardIndex] = useState(0);

  // Create umrah cards with translations
  const getUmrahCards = () => [
    {
      id: 1,
      title: t('whatIsUmrah', currentLanguage),
      arabic: "العمرة",
      content: t('whatIsUmrahContent', currentLanguage),
      dua: "",
      duaTransliteration: "",
      duaTranslation: "",
      timing: "Any time except Hajj days",
      icon: "home"
    },
    {
      id: 2,
      title: t('whenToPerformUmrah', currentLanguage),
      arabic: "وقت العمرة",
      content: t('whenToPerformUmrahContent', currentLanguage),
      dua: "",
      duaTransliteration: "",
      duaTranslation: "",
      timing: "Year-round (except Hajj days)",
      icon: "calendar"
    },
    {
      id: 3,
      title: t('ihramForUmrah', currentLanguage),
      arabic: "الإحرام للعمرة",
      content: t('ihramForUmrahContent', currentLanguage),
      dua: "لَبَّيْكَ اللَّهُمَّ لَبَّيْكَ، لَبَّيْكَ لَا شَرِيكَ لَكَ لَبَّيْكَ، إِنَّ الْحَمْدَ وَالنِّعْمَةَ لَكَ وَالْمُلْكَ، لَا شَرِيكَ لَكَ",
      duaTransliteration: "Labbaik Allahumma Labbaik, Labbaik La Shareeka Laka Labbaik, Innal Hamda Wan Ni'mata Laka Wal Mulk, La Shareeka Lak",
      duaTranslation: "Here I am, O Allah, here I am. Here I am, You have no partner, here I am. Surely all praise, grace and dominion belong to You. You have no partner",
      timing: "At Miqat points",
      icon: "shirt"
    },
    {
      id: 4,
      title: t('tawaf', currentLanguage),
      arabic: "الطواف",
      content: t('tawafContent', currentLanguage),
      dua: "بِسْمِ اللَّهِ، اللَّهُ أَكْبَرُ",
      duaTransliteration: "Bismillah, Allahu Akbar",
      duaTranslation: "In the name of Allah, Allah is the Greatest",
      timing: "Upon arrival in Mecca",
      icon: "refresh"
    },
    {
      id: 5,
      title: t('sai', currentLanguage),
      arabic: "السعي",
      content: t('saiContent', currentLanguage),
      dua: "إِنَّ الصَّفَا وَالْمَرْوَةَ مِنْ شَعَائِرِ اللَّهِ",
      duaTransliteration: "Inna Safa wal Marwata min sha'a'irillah",
      duaTranslation: "Indeed, Safa and Marwah are among the symbols of Allah",
      timing: "After Tawaf",
      icon: "walk"
    },
    {
      id: 6,
      title: t('halqOrTaqsir', currentLanguage),
      arabic: "الحلق أو التقصير",
      content: t('halqOrTaqsirContent', currentLanguage),
      dua: "اللَّهُمَّ إِنِّي أَسْأَلُكَ رِضَاكَ وَالْجَنَّةَ",
      duaTransliteration: "Allahumma inni as'aluka ridaka wal jannah",
      duaTranslation: "O Allah, I ask You for Your pleasure and Paradise",
      timing: "After Sa'i",
      icon: "cut"
    },
    {
      id: 7,
      title: t('duasAndSupplications', currentLanguage),
      arabic: "الدعاء",
      content: t('duasAndSupplicationsContent', currentLanguage),
      dua: "اللَّهُمَّ إِنِّي أَسْأَلُكَ الْجَنَّةَ وَأَعُوذُ بِكَ مِنَ النَّارِ",
      duaTransliteration: "Allahumma inni as'aluka al-jannata wa a'udhu bika minan naar",
      duaTranslation: "O Allah, I ask You for Paradise and I seek refuge with You from the Fire",
      timing: "Throughout Umrah",
      icon: "chatbubbles"
    },
    {
      id: 8,
      title: t('virtuesOfUmrah', currentLanguage),
      arabic: "فضائل العمرة",
      content: t('virtuesOfUmrahContent', currentLanguage),
      dua: "",
      duaTransliteration: "",
      duaTranslation: "",
      timing: "Especially rewarding in Ramadan",
      icon: "star"
    },
    {
      id: 9,
      title: t('preparation', currentLanguage),
      arabic: "الاستعداد",
      content: t('preparationContent', currentLanguage),
      dua: "",
      duaTransliteration: "",
      duaTranslation: "",
      timing: "Before departure",
      icon: "checkmark-circle"
    },
    {
      id: 10,
      title: t('completion', currentLanguage),
      arabic: "إتمام العمرة",
      content: t('completionContent', currentLanguage),
      dua: "اللَّهُمَّ تَقَبَّلْ مِنِّي إِنَّكَ أَنْتَ السَّمِيعُ الْعَلِيمُ",
      duaTransliteration: "Allahumma taqabbal minni innaka antas samee'ul 'aleem",
      duaTranslation: "O Allah, accept this from me, indeed You are the All-Hearing, the All-Knowing",
      timing: "After completing all rituals",
      icon: "checkmark-done"
    }
  ];

  const nextCard = () => {
    if (currentCardIndex < getUmrahCards().length - 1) {
      setCurrentCardIndex(currentCardIndex + 1);
    }
  };

  const prevCard = () => {
    if (currentCardIndex > 0) {
      setCurrentCardIndex(currentCardIndex - 1);
    }
  };

  const currentCard = getUmrahCards()[currentCardIndex];

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
          <Text style={styles.headerTitle}>{t('umrahGuide', currentLanguage)}</Text>
          <View style={styles.headerSpacer} />
        </View>

        {/* Progress Indicator */}
        <View style={styles.progressContainer}>
          <Text style={styles.progressText}>
            {currentCardIndex + 1} {t('of', currentLanguage)} {getUmrahCards().length}
          </Text>
          <View style={styles.progressBar}>
            <View 
              style={[
                styles.progressFill, 
                { width: `${((currentCardIndex + 1) / getUmrahCards().length) * 100}%` }
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
                <Ionicons name={currentCard.icon} size={32} color="#4CAF50" />
              </View>
              <Text style={styles.cardTitle}>{currentCard.title}</Text>
              <Text style={styles.cardArabic}>{currentCard.arabic}</Text>
            </View>

            {/* Card Content */}
            <ScrollView style={styles.cardContentScroll} contentContainerStyle={{paddingBottom: 10}} showsVerticalScrollIndicator={false}>
              <Text style={styles.cardText}>{currentCard.content}</Text>
              
              {currentCard.timing && (
                <View style={styles.timingContainer}>
                  <Text style={styles.timingLabel}>{t('timing', currentLanguage)}</Text>
                  <Text style={styles.timingText}>{currentCard.timing}</Text>
                </View>
              )}
              
              {currentCard.dua && (
                <View style={styles.duaContainer}>
                  <Text style={styles.duaLabel}>{t('dua', currentLanguage)}</Text>
                  <Text style={styles.duaArabic}>{currentCard.dua}</Text>
                  <Text style={styles.duaTransliteration}>{currentCard.duaTransliteration}</Text>
                  <Text style={styles.duaTranslation}>{currentCard.duaTranslation}</Text>
                </View>
              )}
            </ScrollView>
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
              currentCardIndex === getUmrahCards().length - 1 && styles.disabledButton
            ]}
            onPress={nextCard}
            disabled={currentCardIndex === getUmrahCards().length - 1}
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
    paddingTop: 10,
    paddingBottom: 20,
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
  },
  headerSpacer: {
    width: 40,
  },
  progressContainer: {
    paddingHorizontal: 20,
    marginBottom: 20,
  },
  progressText: {
    fontSize: 14,
    color: '#b0b0b0',
    textAlign: 'center',
    marginBottom: 8,
  },
  progressBar: {
    height: 4,
    backgroundColor: '#333',
    borderRadius: 2,
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#4CAF50',
    borderRadius: 2,
  },
  cardContainer: {
    flex: 1,
    paddingHorizontal: 20,
    justifyContent: 'center',
  },
  card: {
    backgroundColor: '#232323',
    borderRadius: 20,
    padding: 30,
    marginVertical: 20,
    borderWidth: 1,
    borderColor: '#333',
    minHeight: height * 0.5,
  },
  cardHeader: {
    alignItems: 'center',
    marginBottom: 30,
  },
  iconContainer: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#333',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 15,
  },
  cardTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
    textAlign: 'center',
    marginBottom: 8,
  },
  cardArabic: {
    fontSize: 18,
    color: '#4CAF50',
    textAlign: 'center',
  },
  cardContent: {
    flex: 1,
    justifyContent: 'center',
  },
  cardText: {
    fontSize: 16,
    color: '#fff',
    lineHeight: 24,
    textAlign: 'center',
    marginBottom: 15,
  },
  timingContainer: {
    marginTop: 15,
    padding: 10,
    backgroundColor: '#2C2C2C',
    borderRadius: 8,
    marginBottom: 10,
  },
  timingLabel: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#4CAF50',
    marginBottom: 5,
  },
  timingText: {
    fontSize: 14,
    color: '#FFFFFF',
  },
  duaContainer: {
    marginTop: 15,
    padding: 15,
    backgroundColor: '#2C2C2C',
    borderRadius: 10,
  },
  duaLabel: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#4CAF50',
    marginBottom: 10,
  },
  duaArabic: {
    fontSize: 18,
    color: '#FFFFFF',
    textAlign: 'center',
    marginBottom: 8,
    lineHeight: 26,
  },
  duaTransliteration: {
    fontSize: 14,
    color: '#D3D3D3',
    textAlign: 'center',
    fontStyle: 'italic',
    marginBottom: 5,
  },
  duaTranslation: {
    fontSize: 14,
    color: '#A9A9A9',
    textAlign: 'center',
    fontStyle: 'italic',
  },
  navigationContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingBottom: 30,
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
  },
  navButtonText: {
    fontSize: 16,
    color: '#fff',
    marginHorizontal: 8,
  },
  disabledButton: {
    opacity: 0.5,
  },
  cardContentScroll: {
    maxHeight: height * 0.35,
    paddingHorizontal: 4,
  },
}); 