import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  Alert,
  ActivityIndicator,
  Platform,
  Modal,
  KeyboardAvoidingView,
  ScrollView,
  Switch,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFonts } from 'expo-font';
import { useLanguage } from '../utils/useLanguage';
import { t } from '../utils/translations';
import { startDonation } from '../services/donateService';
import { isStripeConfigured, STRIPE_CONFIG } from '../config/stripeConfig';

const PRESET_AMOUNTS = STRIPE_CONFIG.presetAmountsCents;
const SANS = Platform.select({ ios: 'System', android: 'Roboto', default: 'System' });
const SERIF_FALLBACK = Platform.select({ ios: 'Georgia', android: 'serif', default: 'serif' });

function formatAmount(cents) {
  return `$${(cents / 100).toFixed(cents % 100 === 0 ? 0 : 2)}`;
}

export default function DonateAmountModal({ visible, onClose, embedded = false, onDonationSuccess }) {
  const { currentLanguage } = useLanguage();
  const [fontsLoaded] = useFonts({
    'Amiri-Regular': require('../assets/fonts/Amiri-Regular.ttf'),
  });
  const serif = fontsLoaded ? 'Amiri-Regular' : SERIF_FALLBACK;

  const [selectedAmount, setSelectedAmount] = useState(PRESET_AMOUNTS[1]);
  const [customAmount, setCustomAmount] = useState('');
  const [useCustomAmount, setUseCustomAmount] = useState(false);
  const [donorName, setDonorName] = useState('');
  const [impactMessage, setImpactMessage] = useState('');
  const [sharePublicly, setSharePublicly] = useState(true);
  const [isAnonymous, setIsAnonymous] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!visible) {
      setLoading(false);
      setDonorName('');
      setImpactMessage('');
      setSharePublicly(true);
      setIsAnonymous(false);
    }
  }, [visible]);

  const getDonationAmountCents = () => {
    if (useCustomAmount) {
      const dollars = Number.parseFloat(customAmount);
      if (!Number.isFinite(dollars) || dollars <= 0) return null;
      return Math.round(dollars * 100);
    }
    return selectedAmount;
  };

  const handleDonate = async () => {
    const amountInCents = getDonationAmountCents();

    if (!amountInCents) {
      Alert.alert(t('donate', currentLanguage), t('enterValidAmount', currentLanguage));
      return;
    }

    if (amountInCents < STRIPE_CONFIG.minAmountCents) {
      Alert.alert(t('donate', currentLanguage), t('minimumDonation', currentLanguage));
      return;
    }

    if (!isStripeConfigured()) {
      Alert.alert(t('donate', currentLanguage), t('stripeNotConfigured', currentLanguage));
      return;
    }

    if (sharePublicly && !impactMessage.trim()) {
      Alert.alert(t('donate', currentLanguage), t('donateMessageRequired', currentLanguage));
      return;
    }

    try {
      setLoading(true);
      const donationResult = await startDonation(amountInCents, {
        donorName: donorName.trim(),
        impactMessage: impactMessage.trim(),
        sharePublicly,
        isAnonymous,
      });
      if (sharePublicly && donationResult?.visibleOnWall === false) {
        Alert.alert(
          t('donate', currentLanguage),
          t('donationSuccessPendingWall', currentLanguage) || t('donationSuccess', currentLanguage)
        );
      } else {
        Alert.alert(t('donate', currentLanguage), t('donationSuccess', currentLanguage));
      }
      onDonationSuccess?.(donationResult);
      onClose();
    } catch (error) {
      if (error?.message === 'PAYMENT_CANCELED') {
        return;
      }
      if (error?.message === 'STRIPE_NOT_CONFIGURED') {
        Alert.alert(t('donate', currentLanguage), t('stripeNotConfigured', currentLanguage));
        return;
      }
      if (error?.message === 'MINIMUM_DONATION') {
        Alert.alert(t('donate', currentLanguage), t('minimumDonation', currentLanguage));
        return;
      }
      if (error?.message === 'IMPACT_MESSAGE_REQUIRED') {
        Alert.alert(t('donate', currentLanguage), t('donateMessageRequired', currentLanguage));
        return;
      }
      if (error?.code === 'functions/failed-precondition') {
        Alert.alert(t('donate', currentLanguage), t('stripeNotConfigured', currentLanguage));
        return;
      }
      console.error('Donation error:', error);
      Alert.alert(t('error', currentLanguage), t('donationFailed', currentLanguage));
    } finally {
      setLoading(false);
    }
  };

  const handleSelectPreset = (amount) => {
    setUseCustomAmount(false);
    setCustomAmount('');
    setSelectedAmount(amount);
  };

  const displayAmount = useCustomAmount && customAmount
    ? `$${customAmount}`
    : formatAmount(selectedAmount);

  if (!visible) {
    return null;
  }

  const sheet = (
    <KeyboardAvoidingView
      style={[styles.overlay, embedded && styles.embeddedOverlay]}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <TouchableOpacity
        style={styles.backdrop}
        activeOpacity={1}
        onPress={() => !loading && onClose()}
      />
      <View style={styles.sheet}>
          <View style={styles.handle} />

          <ScrollView
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
            contentContainerStyle={styles.sheetContent}
          >
            <Text style={[styles.title, { fontFamily: serif }]}>{t('selectAmount', currentLanguage)}</Text>
            <Text style={[styles.hint, { fontFamily: SANS }]}>{t('donateAmountHint', currentLanguage)}</Text>

            <View style={styles.amountGrid}>
              {PRESET_AMOUNTS.map((amount) => {
                const isSelected = !useCustomAmount && selectedAmount === amount;
                return (
                  <TouchableOpacity
                    key={amount}
                    style={[styles.amountButton, isSelected && styles.amountButtonSelected]}
                    onPress={() => handleSelectPreset(amount)}
                    activeOpacity={0.85}
                  >
                    <Text style={[styles.amountButtonText, isSelected && styles.amountButtonTextSelected]}>
                      {formatAmount(amount)}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            <Text style={styles.customLabel}>{t('customAmount', currentLanguage)}</Text>
            <View style={[styles.customInputRow, useCustomAmount && styles.customInputRowActive]}>
              <Text style={styles.currencySymbol}>$</Text>
              <TextInput
                style={styles.customInput}
                value={customAmount}
                onChangeText={(value) => {
                  setCustomAmount(value.replace(/[^0-9.]/g, ''));
                  setUseCustomAmount(true);
                }}
                onFocus={() => setUseCustomAmount(true)}
                placeholder="0.00"
                placeholderTextColor="#888888"
                keyboardType="decimal-pad"
                returnKeyType="done"
              />
            </View>

            <Text style={styles.sectionLabel}>{t('donateOptionalDetails', currentLanguage)}</Text>
            <Text style={[styles.sectionHint, { fontFamily: SANS }]}>{t('donateOptionalDetailsHint', currentLanguage)}</Text>

            <Text style={styles.fieldLabel}>{t('donateYourName', currentLanguage)}</Text>
            <TextInput
              style={[styles.textInput, isAnonymous && styles.textInputDisabled]}
              value={donorName}
              onChangeText={setDonorName}
              placeholder={t('donateYourNamePlaceholder', currentLanguage)}
              placeholderTextColor="#666666"
              maxLength={80}
              autoCapitalize="words"
              editable={!isAnonymous}
            />

            <Text style={styles.fieldLabel}>{t('donateImpactMessage', currentLanguage)}</Text>
            <TextInput
              style={[styles.textInput, styles.messageInput]}
              value={impactMessage}
              onChangeText={setImpactMessage}
              placeholder={t('donateImpactMessagePlaceholder', currentLanguage)}
              placeholderTextColor="#666666"
              maxLength={500}
              multiline
              textAlignVertical="top"
            />

            <View style={styles.shareRow}>
              <View style={styles.shareTextWrap}>
                <Text style={[styles.shareTitle, { fontFamily: SANS }]}>{t('donateSharePublicly', currentLanguage)}</Text>
                <Text style={[styles.shareHint, { fontFamily: SANS }]}>{t('donateSharePubliclyHint', currentLanguage)}</Text>
              </View>
              <Switch
                value={sharePublicly}
                onValueChange={setSharePublicly}
                trackColor={{ false: '#333333', true: 'rgba(212, 175, 55, 0.45)' }}
                thumbColor={sharePublicly ? '#D4AF37' : '#888888'}
              />
            </View>

            {sharePublicly && (
              <View style={styles.shareRow}>
                <View style={styles.shareTextWrap}>
                  <Text style={[styles.shareTitle, { fontFamily: SANS }]}>{t('donateAnonymous', currentLanguage)}</Text>
                  <Text style={[styles.shareHint, { fontFamily: SANS }]}>{t('donateAnonymousHint', currentLanguage)}</Text>
                </View>
                <Switch
                  value={isAnonymous}
                  onValueChange={(value) => {
                    setIsAnonymous(value);
                    if (value) {
                      setDonorName('');
                    }
                  }}
                  trackColor={{ false: '#333333', true: 'rgba(212, 175, 55, 0.45)' }}
                  thumbColor={isAnonymous ? '#D4AF37' : '#888888'}
                />
              </View>
            )}

            <TouchableOpacity
              style={[styles.donateButton, loading && styles.donateButtonDisabled]}
              onPress={handleDonate}
              disabled={loading}
              activeOpacity={0.9}
            >
              {loading ? (
                <ActivityIndicator color="#1A1A1A" />
              ) : (
                <>
                  <Text style={[styles.donateButtonText, { fontFamily: SANS }]}>
                    {t('donateNow', currentLanguage)} · {displayAmount}
                  </Text>
                  <Ionicons name="arrow-forward" size={18} color="#1A1A1A" />
                </>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.cancelButton}
              onPress={onClose}
              disabled={loading}
            >
              <Text style={[styles.cancelText, { fontFamily: SANS }]}>{t('cancel', currentLanguage)}</Text>
            </TouchableOpacity>
          </ScrollView>
        </View>
    </KeyboardAvoidingView>
  );

  if (embedded) {
    return sheet;
  }

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={() => !loading && onClose()}
    >
      {sheet}
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  embeddedOverlay: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 20,
    elevation: 20,
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.55)',
  },
  sheet: {
    backgroundColor: '#141414',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '92%',
    borderTopWidth: 1,
    borderColor: 'rgba(212, 175, 55, 0.45)',
  },
  sheetContent: {
    paddingHorizontal: 22,
    paddingTop: 12,
    paddingBottom: Platform.OS === 'ios' ? 34 : 24,
  },
  handle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignSelf: 'center',
    marginBottom: 20,
  },
  title: {
    color: '#FFFFFF',
    fontSize: 22,
    fontWeight: '400',
    marginBottom: 8,
    letterSpacing: 0.3,
  },
  hint: {
    color: '#B8B8B8',
    fontSize: 14,
    lineHeight: 22,
    marginBottom: 20,
    letterSpacing: 0.2,
  },
  amountGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: 16,
  },
  amountButton: {
    width: '47%',
    flexGrow: 1,
    backgroundColor: '#1C1C1C',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  amountButtonSelected: {
    backgroundColor: 'rgba(212, 175, 55, 0.15)',
    borderColor: '#D4AF37',
  },
  amountButtonText: {
    color: '#B8B8B8',
    fontSize: 17,
    fontFamily: SANS,
    fontWeight: '500',
    letterSpacing: 0.3,
  },
  amountButtonTextSelected: {
    color: '#F5D76E',
    fontWeight: '700',
  },
  customLabel: {
    color: '#777777',
    fontSize: 11,
    fontFamily: SANS,
    fontWeight: '500',
    letterSpacing: 1.4,
    marginBottom: 8,
    textTransform: 'uppercase',
  },
  customInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1C1C1C',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    paddingHorizontal: 16,
    marginBottom: 20,
  },
  customInputRowActive: {
    borderColor: '#D4AF37',
  },
  currencySymbol: {
    color: '#777777',
    fontSize: 17,
    fontFamily: SANS,
    fontWeight: '400',
    marginRight: 4,
  },
  customInput: {
    flex: 1,
    color: '#FFFFFF',
    fontSize: 17,
    fontFamily: SANS,
    paddingVertical: 15,
    letterSpacing: 0.3,
  },
  sectionLabel: {
    color: '#F5D76E',
    fontSize: 11,
    fontFamily: SANS,
    fontWeight: '600',
    letterSpacing: 1.4,
    marginBottom: 6,
    textTransform: 'uppercase',
  },
  sectionHint: {
    color: '#888888',
    fontSize: 13,
    lineHeight: 20,
    marginBottom: 14,
  },
  fieldLabel: {
    color: '#AAAAAA',
    fontSize: 12,
    fontFamily: SANS,
    fontWeight: '500',
    marginBottom: 8,
  },
  textInput: {
    backgroundColor: '#1C1C1C',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    color: '#FFFFFF',
    fontSize: 15,
    fontFamily: SANS,
    paddingHorizontal: 14,
    paddingVertical: 12,
    marginBottom: 14,
  },
  textInputDisabled: {
    opacity: 0.45,
  },
  messageInput: {
    minHeight: 96,
    paddingTop: 12,
  },
  shareRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: '#1C1C1C',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    paddingHorizontal: 14,
    paddingVertical: 12,
    marginBottom: 20,
  },
  shareTextWrap: {
    flex: 1,
  },
  shareTitle: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 4,
  },
  shareHint: {
    color: '#888888',
    fontSize: 12,
    lineHeight: 18,
  },
  donateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#D4AF37',
    borderRadius: 14,
    paddingVertical: 16,
    gap: 10,
  },
  donateButtonDisabled: {
    opacity: 0.75,
  },
  donateButtonText: {
    color: '#1A1A1A',
    fontSize: 15,
    fontWeight: '600',
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  cancelButton: {
    alignItems: 'center',
    paddingVertical: 14,
    marginTop: 4,
  },
  cancelText: {
    color: '#777777',
    fontSize: 14,
    letterSpacing: 0.3,
  },
});
