/**
 * Modal offering "Subscribe" or "Watch Ad" when user tries to access a premium feature.
 * Matches Hudā paywall theme: dark background, gold accent.
 */

import React, { useState, useEffect } from 'react';
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { showRewardedAd } from '../services/rewardedAdService';
import { grantTemporaryAccess } from '../services/premiumAccessService';

const FONT = { fontFamily: Platform.OS === 'ios' ? 'System' : 'Roboto' };
const COLORS = {
  cardBg: '#1A1A1A',
  accent: '#D4AF37',
  accentLight: '#F5D76E',
  text: '#FFFFFF',
  textMuted: '#888888',
  secondaryBg: '#2A2A2A',
  border: 'rgba(212, 175, 55, 0.4)',
};

const ADS_REQUIRED = 3;

export default function SubscribeOrWatchAdModal({
  visible,
  onClose,
  onSubscribe,
  onAccessGranted,
  title = 'Premium Feature',
  subtitle = 'Subscribe for full access or watch 3 ads for 30 minutes of access.',
}) {
  const [adLoading, setAdLoading] = useState(false);
  const [adsWatched, setAdsWatched] = useState(0);

  useEffect(() => {
    if (visible) setAdsWatched(0);
  }, [visible]);

  const handleClose = () => {
    setAdsWatched(0);
    onClose?.();
  };

  const handleSubscribe = () => {
    handleClose();
    onSubscribe?.();
  };

  const handleWatchAd = async () => {
    setAdLoading(true);
    try {
      await showRewardedAd();
      const newCount = adsWatched + 1;
      setAdsWatched(newCount);
      if (newCount >= ADS_REQUIRED) {
        await grantTemporaryAccess();
        handleClose();
        onAccessGranted?.();
      }
    } catch (error) {
      Alert.alert(
        'Ad Not Available',
        error?.message || 'The ad could not be shown. Please try again or subscribe for full access.',
        [{ text: 'OK' }]
      );
    } finally {
      setAdLoading(false);
    }
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={handleClose}
    >
      <View style={styles.overlay}>
        <View style={styles.card}>
          <Text style={styles.title}>{title}</Text>
          <Text style={styles.subtitle}>{subtitle}</Text>

          <TouchableOpacity
            style={styles.subscribeButton}
            onPress={handleSubscribe}
            disabled={adLoading}
            activeOpacity={0.85}
          >
            <LinearGradient
              colors={['#F5D76E', '#D4AF37', '#C9A227']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.subscribeButtonGradient}
            >
              <Ionicons name="star" size={20} color="#000" />
              <Text style={styles.subscribeButtonText}>Subscribe</Text>
            </LinearGradient>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.watchAdButton, adLoading && styles.watchAdButtonDisabled]}
            onPress={handleWatchAd}
            disabled={adLoading}
            activeOpacity={0.8}
          >
            {adLoading ? (
              <ActivityIndicator size="small" color={COLORS.accent} />
            ) : (
              <Ionicons name="play-circle" size={20} color={COLORS.accent} />
            )}
            <Text style={styles.watchAdButtonText}>
              {adLoading ? 'Loading ad...' : adsWatched > 0
                ? `Watch Ad (${adsWatched}/${ADS_REQUIRED} complete)`
                : `Watch Ad (${ADS_REQUIRED} for 30 min access)`}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.cancelButton} onPress={handleClose}>
            <Text style={styles.cancelText}>Cancel</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  card: {
    backgroundColor: COLORS.cardBg,
    borderRadius: 20,
    padding: 24,
    width: '100%',
    maxWidth: 340,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  title: {
    fontSize: 20,
    fontWeight: '800',
    color: COLORS.text,
    textAlign: 'center',
    marginBottom: 8,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    ...FONT,
  },
  subtitle: {
    fontSize: 15,
    color: COLORS.textMuted,
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 22,
    ...FONT,
  },
  subscribeButton: {
    borderRadius: 16,
    overflow: 'hidden',
    marginBottom: 12,
    shadowColor: COLORS.accent,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 8,
  },
  subscribeButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 18,
    paddingHorizontal: 24,
    borderRadius: 16,
  },
  subscribeButtonText: {
    fontSize: 16,
    fontWeight: '800',
    color: '#000000',
    letterSpacing: 1,
    textTransform: 'uppercase',
    ...FONT,
  },
  watchAdButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 16,
    borderRadius: 12,
    marginBottom: 12,
    backgroundColor: COLORS.secondaryBg,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  watchAdButtonDisabled: {
    opacity: 0.7,
  },
  watchAdButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: COLORS.text,
    ...FONT,
  },
  cancelButton: {
    paddingVertical: 12,
    alignItems: 'center',
  },
  cancelText: {
    fontSize: 15,
    color: COLORS.textMuted,
    ...FONT,
  },
});
