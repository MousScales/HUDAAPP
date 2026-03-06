import React from 'react';
import { View, StyleSheet } from 'react-native';
import SubscriptionModal from '../components/SubscriptionModal';
import { useNavigation } from '@react-navigation/native';

export default function PromotionalSubscriptionScreen() {
  const navigation = useNavigation();

  const handleClose = () => {
    // Navigate back to SettingsScreen if we can go back, otherwise navigate to Profile tab
    if (navigation.canGoBack()) {
      navigation.goBack();
    } else {
      // If opened from widget/deep link, navigate to SettingsScreen
      navigation.getParent()?.navigate('Profile', {
        screen: 'SettingsScreen',
      });
    }
  };

  const handleSubscribeSuccess = () => {
    // Navigate to Home tab after successful subscription
    navigation.getParent()?.navigate('Home');
  };

  return (
    <View style={styles.container}>
      {/* Full screen subscription modal - always visible since it's a full screen */}
      <SubscriptionModal
        visible={true}
        onClose={handleClose}
        onSubscribeSuccess={handleSubscribeSuccess}
        feature="general"
        isPromotional={true}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
});

