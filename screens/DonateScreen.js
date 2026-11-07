import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  SafeAreaView,
  StatusBar,
  Image,
  Alert,
  Linking,
  Platform,
  Modal,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useFonts } from 'expo-font';
import { useLanguage } from '../utils/useLanguage';
import { t } from '../utils/translations';
import { isStripeConfigured } from '../config/stripeConfig';
import {
  fetchPublicDonations,
  getDisplaySupporters,
} from '../services/donateService';
import DonateAmountModal from '../components/DonateAmountModal';

const GOLD = {
  start: '#F5D76E',
  mid: '#E8C547',
  end: '#D4AF37',
};

const TEXT = {
  primary: '#1A1408',
  secondary: '#3D3420',
  muted: '#5C5030',
};

const SANS = Platform.select({ ios: 'System', android: 'Roboto', default: 'System' });
const SERIF_FALLBACK = Platform.select({ ios: 'Georgia', android: 'serif', default: 'serif' });
const SUPPORTER_MESSAGE_LINE_LIMIT = 4;

export default function DonateScreen({ navigation }) {
  const { currentLanguage } = useLanguage();
  const [fontsLoaded] = useFonts({
    'Amiri-Regular': require('../assets/fonts/Amiri-Regular.ttf'),
  });
  const serif = fontsLoaded ? 'Amiri-Regular' : SERIF_FALLBACK;

  const [showAmountModal, setShowAmountModal] = useState(false);
  const [showMore, setShowMore] = useState(false);
  const [supporters, setSupporters] = useState([]);
  const [loadingSupporters, setLoadingSupporters] = useState(false);
  const [selectedSupporter, setSelectedSupporter] = useState(null);

  const fullMessage = t('donateMessage', currentLanguage);
  const messageParts = fullMessage.split('\n\n');
  const firstParagraph = messageParts[0] || fullMessage;
  const restOfMessage = messageParts.slice(1).join('\n\n');

  const loadSupporters = useCallback(async () => {
    setLoadingSupporters(true);
    const donations = await fetchPublicDonations();
    setSupporters(getDisplaySupporters(donations));
    setLoadingSupporters(false);
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadSupporters();

      return () => {
        setShowAmountModal(false);
        setShowMore(false);
        setSelectedSupporter(null);
      };
    }, [loadSupporters])
  );

  const handleOpenAmountPicker = () => {
    if (!isStripeConfigured()) {
      Alert.alert(t('donate', currentLanguage), t('stripeNotConfigured', currentLanguage));
      return;
    }
    setShowAmountModal(true);
  };

  const getSupporterDisplayName = (supporter) => {
    if (supporter.isAnonymous) {
      return t('donateAnonymousName', currentLanguage);
    }
    return supporter.donorName || t('donateAnonymousName', currentLanguage);
  };

  const renderSupporterCard = (supporter) => {
    const fullQuotedMessage = supporter.impactMessage ? `"${supporter.impactMessage}"` : '';

    return (
      <TouchableOpacity
        key={supporter.id}
        style={styles.supporterCard}
        activeOpacity={0.85}
        onPress={() => setSelectedSupporter(supporter)}
      >
        <Text style={[styles.supporterName, { fontFamily: serif }]}>
          {getSupporterDisplayName(supporter)}
        </Text>
        {!!supporter.impactMessage && (
          <Text
            style={[styles.supporterMessage, { fontFamily: serif }]}
            numberOfLines={SUPPORTER_MESSAGE_LINE_LIMIT}
          >
            {fullQuotedMessage}
          </Text>
        )}
        <Text style={[styles.supporterDua, { fontFamily: SANS }]}>
          {t('donateMakeDua', currentLanguage)}
        </Text>
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.root}>
      <LinearGradient
        colors={[GOLD.start, GOLD.mid, GOLD.end]}
        start={{ x: 0.5, y: 0 }}
        end={{ x: 0.5, y: 1 }}
        style={StyleSheet.absoluteFill}
      />

      <SafeAreaView style={styles.container}>
        <StatusBar barStyle="dark-content" />

        <View style={styles.header}>
          <TouchableOpacity
            style={styles.closeButton}
            onPress={() => navigation.goBack()}
            activeOpacity={0.7}
          >
            <Ionicons name="close" size={26} color={TEXT.primary} />
          </TouchableOpacity>
          <View style={styles.headerCenter}>
            <Text style={[styles.headerEyebrow, { fontFamily: SANS }]}>{t('donate', currentLanguage).toUpperCase()}</Text>
            <Text style={[styles.headerTitle, { fontFamily: serif }]}>Support Hudā</Text>
          </View>
          <View style={styles.headerSpacer} />
        </View>

        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.photoWrap}>
            <View style={styles.profileImageRing}>
              <Image
                source={require('../assets/hudapfp.png')}
                style={styles.profileImage}
                resizeMode="cover"
              />
            </View>
          </View>

          <Text style={[styles.founderName, { fontFamily: serif }]}>Moustapha Gueye</Text>
          <Text style={[styles.founderRole, { fontFamily: SANS }]}>Founder, Hudā</Text>

          <Text style={[styles.greeting, { fontFamily: serif }]}>{t('donateGreeting', currentLanguage)}</Text>
          <Text style={[styles.messageText, { fontFamily: serif }]}>{firstParagraph}</Text>

          {!showMore ? (
            <TouchableOpacity
              style={styles.showMoreButton}
              onPress={() => setShowMore(true)}
              activeOpacity={0.7}
            >
              <Text style={[styles.showMoreText, { fontFamily: SANS }]}>{t('donateShowMore', currentLanguage)}</Text>
              <Ionicons name="chevron-down" size={16} color={TEXT.muted} />
            </TouchableOpacity>
          ) : (
            <>
              {!!restOfMessage && (
                <Text style={[styles.messageText, styles.messageTextExpanded, { fontFamily: serif }]}>
                  {restOfMessage}
                </Text>
              )}
              <Text style={[styles.signOff, { fontFamily: serif }]}>{t('donateSignOff', currentLanguage)}</Text>

              <TouchableOpacity
                style={styles.showMoreButton}
                onPress={() => setShowMore(false)}
                activeOpacity={0.7}
              >
                <Text style={[styles.showMoreText, { fontFamily: SANS }]}>{t('donateShowLess', currentLanguage)}</Text>
                <Ionicons name="chevron-up" size={16} color={TEXT.muted} />
              </TouchableOpacity>
            </>
          )}

          <View style={styles.supportersSection}>
            <Text style={[styles.supportersTitle, { fontFamily: serif }]}>
              {t('donateSupportersTitle', currentLanguage)}
            </Text>
            <Text style={[styles.supportersSubtitle, { fontFamily: SANS }]}>
              {t('donateSupportersSubtitle', currentLanguage)}
            </Text>

            {loadingSupporters ? (
              <Text style={[styles.supportersEmpty, { fontFamily: SANS }]}>
                {t('donateSupportersLoading', currentLanguage)}
              </Text>
            ) : (
              supporters.map(renderSupporterCard)
            )}
          </View>

          <TouchableOpacity
            style={styles.followLink}
            onPress={() => Linking.openURL('https://instagram.com/tafa.__')}
            activeOpacity={0.7}
          >
            <Ionicons name="logo-instagram" size={16} color={TEXT.muted} />
            <Text style={[styles.followLinkText, { fontFamily: SANS }]}>{t('followMe', currentLanguage)}</Text>
          </TouchableOpacity>
        </ScrollView>

        <View style={styles.bottomBar}>
          {!isStripeConfigured() && (
            <Text style={styles.setupNote}>{t('stripeNotConfigured', currentLanguage)}</Text>
          )}
          <TouchableOpacity
            style={styles.donateButton}
            onPress={handleOpenAmountPicker}
            activeOpacity={0.9}
          >
            <Text style={[styles.donateButtonText, { fontFamily: SANS }]}>
              {t('supportHudaToday', currentLanguage)}
            </Text>
          </TouchableOpacity>
          <Text style={[styles.trustText, { fontFamily: SANS }]}>{t('donateSecureNote', currentLanguage)}</Text>
        </View>
      </SafeAreaView>

      <Modal
        visible={!!selectedSupporter}
        animationType="fade"
        transparent
        onRequestClose={() => setSelectedSupporter(null)}
      >
        <TouchableOpacity
          style={styles.messageModalOverlay}
          activeOpacity={1}
          onPress={() => setSelectedSupporter(null)}
        >
          <TouchableOpacity
            style={styles.messageModalContent}
            activeOpacity={1}
            onPress={() => {}}
          >
            {selectedSupporter && (
              <>
                <View style={styles.messageModalHeader}>
                  <Text style={[styles.messageModalName, { fontFamily: serif }]}>
                    {getSupporterDisplayName(selectedSupporter)}
                  </Text>
                  <TouchableOpacity
                    onPress={() => setSelectedSupporter(null)}
                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                  >
                    <Ionicons name="close" size={22} color={TEXT.primary} />
                  </TouchableOpacity>
                </View>
                {!!selectedSupporter.impactMessage && (
                  <ScrollView
                    style={styles.messageModalScroll}
                    showsVerticalScrollIndicator={false}
                  >
                    <Text style={[styles.messageModalText, { fontFamily: serif }]}>
                      {`"${selectedSupporter.impactMessage}"`}
                    </Text>
                  </ScrollView>
                )}
                <Text style={[styles.messageModalDua, { fontFamily: SANS }]}>
                  {t('donateMakeDua', currentLanguage)}
                </Text>
                <TouchableOpacity
                  style={styles.messageModalCloseButton}
                  onPress={() => setSelectedSupporter(null)}
                  activeOpacity={0.8}
                >
                  <Text style={[styles.messageModalCloseText, { fontFamily: SANS }]}>
                    {t('close', currentLanguage)}
                  </Text>
                </TouchableOpacity>
              </>
            )}
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>

      {showAmountModal && (
        <DonateAmountModal
          visible={showAmountModal}
          embedded
          onClose={() => setShowAmountModal(false)}
          onDonationSuccess={() => loadSupporters()}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 12,
  },
  closeButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(26, 20, 8, 0.28)',
    borderWidth: 1.5,
    borderColor: 'rgba(26, 20, 8, 0.35)',
    shadowColor: '#1A1408',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 4,
  },
  headerCenter: {
    flex: 1,
    alignItems: 'center',
  },
  headerEyebrow: {
    color: TEXT.muted,
    fontSize: 10,
    fontWeight: '500',
    letterSpacing: 3,
    marginBottom: 4,
  },
  headerTitle: {
    color: TEXT.primary,
    fontSize: 26,
    fontWeight: '400',
    letterSpacing: 0.5,
  },
  headerSpacer: {
    width: 44,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 28,
    paddingBottom: 16,
    alignItems: 'center',
  },
  photoWrap: {
    alignItems: 'center',
    marginTop: 8,
    marginBottom: 16,
  },
  profileImageRing: {
    width: 130,
    height: 130,
    borderRadius: 65,
    padding: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.35)',
    borderWidth: 3,
    borderColor: 'rgba(26, 20, 8, 0.15)',
    shadowColor: '#1A1408',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.2,
    shadowRadius: 12,
    elevation: 8,
  },
  profileImage: {
    width: '100%',
    height: '100%',
    borderRadius: 60,
  },
  founderName: {
    color: TEXT.primary,
    fontSize: 26,
    fontWeight: '400',
    letterSpacing: 0.4,
    marginBottom: 4,
    textAlign: 'center',
  },
  founderRole: {
    color: TEXT.muted,
    fontSize: 12,
    fontWeight: '500',
    letterSpacing: 1.6,
    marginBottom: 28,
    textAlign: 'center',
    textTransform: 'uppercase',
  },
  greeting: {
    color: TEXT.primary,
    fontSize: 20,
    fontWeight: '400',
    marginBottom: 16,
    letterSpacing: 0.3,
    alignSelf: 'stretch',
  },
  messageText: {
    color: TEXT.secondary,
    fontSize: 16,
    lineHeight: 28,
    letterSpacing: 0.25,
    alignSelf: 'stretch',
  },
  messageTextExpanded: {
    marginTop: 4,
  },
  showMoreButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    alignSelf: 'stretch',
    paddingVertical: 14,
    marginTop: 4,
    marginBottom: 4,
  },
  showMoreText: {
    color: TEXT.muted,
    fontSize: 13,
    fontWeight: '600',
    letterSpacing: 0.4,
  },
  supportersSection: {
    alignSelf: 'stretch',
    marginTop: 8,
    paddingTop: 20,
    borderTopWidth: 1,
    borderTopColor: 'rgba(26, 20, 8, 0.12)',
  },
  supportersTitle: {
    color: TEXT.primary,
    fontSize: 20,
    fontWeight: '400',
    marginBottom: 8,
    letterSpacing: 0.3,
  },
  supportersSubtitle: {
    color: TEXT.muted,
    fontSize: 13,
    lineHeight: 20,
    marginBottom: 16,
    letterSpacing: 0.2,
  },
  supportersEmpty: {
    color: TEXT.muted,
    fontSize: 14,
    lineHeight: 22,
    fontStyle: 'italic',
  },
  supporterCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.22)',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(26, 20, 8, 0.1)',
    paddingHorizontal: 16,
    paddingVertical: 14,
    marginBottom: 10,
  },
  supporterName: {
    color: TEXT.primary,
    fontSize: 17,
    fontWeight: '400',
    letterSpacing: 0.2,
    marginBottom: 6,
  },
  supporterMessage: {
    color: TEXT.secondary,
    fontSize: 15,
    lineHeight: 24,
    fontStyle: 'italic',
    marginBottom: 8,
  },
  supporterDua: {
    color: TEXT.muted,
    fontSize: 11,
    letterSpacing: 0.6,
    textTransform: 'uppercase',
  },
  messageModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(26, 20, 8, 0.45)',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  messageModalContent: {
    backgroundColor: '#F8F0D8',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: 'rgba(26, 20, 8, 0.12)',
    paddingHorizontal: 20,
    paddingTop: 18,
    paddingBottom: 16,
    maxHeight: '70%',
  },
  messageModalHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 12,
    marginBottom: 14,
  },
  messageModalName: {
    flex: 1,
    color: TEXT.primary,
    fontSize: 20,
    fontWeight: '400',
    letterSpacing: 0.2,
  },
  messageModalScroll: {
    maxHeight: 280,
    marginBottom: 12,
  },
  messageModalText: {
    color: TEXT.secondary,
    fontSize: 16,
    lineHeight: 26,
    fontStyle: 'italic',
  },
  messageModalDua: {
    color: TEXT.muted,
    fontSize: 11,
    letterSpacing: 0.6,
    textTransform: 'uppercase',
    marginBottom: 14,
  },
  messageModalCloseButton: {
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(26, 20, 8, 0.2)',
    borderRadius: 12,
    paddingVertical: 12,
  },
  messageModalCloseText: {
    color: TEXT.primary,
    fontSize: 14,
    fontWeight: '600',
    letterSpacing: 0.3,
  },
  signOff: {
    color: TEXT.secondary,
    fontSize: 16,
    lineHeight: 26,
    marginTop: 22,
    letterSpacing: 0.3,
    alignSelf: 'stretch',
    fontStyle: 'italic',
  },
  followLink: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 20,
  },
  followLinkText: {
    color: TEXT.muted,
    fontSize: 13,
    letterSpacing: 0.4,
  },
  bottomBar: {
    paddingHorizontal: 24,
    paddingTop: 12,
    paddingBottom: Platform.OS === 'android' ? 24 : 12,
  },
  setupNote: {
    color: TEXT.muted,
    fontSize: 12,
    lineHeight: 18,
    textAlign: 'center',
    marginBottom: 10,
  },
  donateButton: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'transparent',
    borderWidth: 1.5,
    borderColor: TEXT.primary,
    borderRadius: 16,
    paddingVertical: 18,
  },
  donateButtonText: {
    color: TEXT.primary,
    fontSize: 15,
    fontWeight: '600',
    letterSpacing: 0.3,
  },
  trustText: {
    color: TEXT.muted,
    fontSize: 11,
    textAlign: 'center',
    marginTop: 10,
    letterSpacing: 0.5,
  },
});
