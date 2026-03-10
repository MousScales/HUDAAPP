import React, { useEffect, useState, useRef } from 'react';
import { View, Text, StyleSheet, Alert, SafeAreaView, Image, TouchableOpacity, Dimensions, ActivityIndicator, ScrollView, Linking, Platform, Animated } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import InvertLantern from '../assets/invert.png';
// import * as InAppPurchases from 'expo-in-app-purchases'; // Removed - incompatible with current Expo SDK, using RevenueCat instead
import AsyncStorage from '@react-native-async-storage/async-storage';
import { auth, firestore } from '../firebase';
import { doc, setDoc, getDoc, serverTimestamp } from 'firebase/firestore';
import { getFunctions, httpsCallable } from 'firebase/functions';
import subscriptionGuard from '../services/subscriptionGuard';

const { width } = Dimensions.get('window');
const SUBSCRIPTION_ID = 'premium_monthly_999';

export default function SubscriptionScreen({ onSubscribe, enableIAP, navigation }) {
  const [loading, setLoading] = useState(enableIAP);
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [purchaseSuccessful, setPurchaseSuccessful] = useState(false);
  const [products, setProducts] = useState([]);
  const [hasExistingSubscription, setHasExistingSubscription] = useState(false);
  
  // Bounce animation for three dots
  const bounceAnim = useRef(new Animated.Value(0)).current;
  // Pulse animation for subscribe button
  const pulseAnim = useRef(new Animated.Value(1)).current;

  // Handle opening Terms of Service
  const openTermsOfService = () => {
    Linking.openURL('https://www.apple.com/legal/internet-services/itunes/dev/stdeula/');
  };

  // Handle opening Privacy Policy
  const openPrivacyPolicy = () => {
    Linking.openURL('https://www.mouslifejournal.com/privacy.html');
  };

  // Handle restore purchases
  const handleRestorePurchases = async () => {
    try {
      console.log('🔄 Starting restore purchases...');
      
      // Ensure we're connected to App Store
      try {
        await InAppPurchases.connectAsync();
      } catch (connectError) {
        if (!connectError.message.includes('Already connected')) {
          throw connectError;
        }
      }
      
      // Get purchase history
      const purchaseHistoryResponse = await InAppPurchases.getPurchaseHistoryAsync();
      console.log('🔄 Purchase history:', purchaseHistoryResponse);
      
      if (purchaseHistoryResponse && purchaseHistoryResponse.results && purchaseHistoryResponse.results.length > 0) {
        // Check if any of the purchases are active subscriptions
        const activePurchases = purchaseHistoryResponse.results.filter(purchase => 
          purchase.productId === SUBSCRIPTION_ID && 
          purchase.transactionReceipt
        );
        
        if (activePurchases.length > 0) {
          console.log('🔄 Found active purchases, validating with Firebase...');
          
          // Validate with Firebase
          const functions = getFunctions();
          const handleSubscriptionPurchase = httpsCallable(functions, 'handleSubscriptionPurchase');
          
          for (const purchase of activePurchases) {
            try {
              const result = await handleSubscriptionPurchase({
                receipt: purchase.transactionReceipt,
                productId: purchase.productId,
                transactionId: purchase.transactionId,
                userId: auth.currentUser?.uid
              });
              
              console.log('🔄 Firebase validation result:', result);
            } catch (error) {
              console.error('❌ Error validating purchase with Firebase:', error);
            }
          }
          
          // Recheck subscription status using RevenueCat
          const isSubscribed = await subscriptionGuard.forceCheckSubscriptionStatus();
          setIsSubscribed(isSubscribed);
          
          if (isSubscribed) {
            Alert.alert(
              'Purchases Restored! ✅',
              'Your subscription has been successfully restored.',
              [{ text: 'OK', onPress: () => navigation.replace('Home') }]
            );
          } else {
            Alert.alert(
              'No Active Subscription Found',
              'We couldn\'t find any active subscriptions to restore.',
              [{ text: 'OK' }]
            );
          }
        } else {
          Alert.alert(
            'No Active Subscription Found',
            'We couldn\'t find any active subscriptions to restore.',
            [{ text: 'OK' }]
          );
        }
      } else {
        Alert.alert(
          'No Purchase History Found',
          'We couldn\'t find any previous purchases to restore.',
          [{ text: 'OK' }]
        );
      }
    } catch (error) {
      console.error('❌ Error restoring purchases:', error);
      Alert.alert(
        'Restore Failed',
        'There was an error restoring your purchases. Please try again.',
        [{ text: 'OK' }]
      );
    }
  };





  // Step 1: Initialize IAP connection (once, at app start)
  useEffect(() => {
    if (!enableIAP) return;
    
    const initIAP = async () => {
      setLoading(true);
      
      try {
        // Check if already connected first
        try {
          await InAppPurchases.connectAsync();
          console.log('✅ IAP connection established');
        } catch (connectError) {
          if (connectError.message.includes('Already connected')) {
            console.log('✅ Already connected to App Store');
          } else {
            throw connectError;
          }
        }
        
        // Finish any pending transactions
        try {
          const purchaseHistory = await InAppPurchases.getPurchaseHistoryAsync();
          if (purchaseHistory && purchaseHistory.results) {
            for (const purchase of purchaseHistory.results) {
              if (purchase.transactionId) {
                await InAppPurchases.finishTransactionAsync(purchase, true);
              }
            }
          }
          console.log('✅ Finished pending transactions');
        } catch (finishError) {
          console.log('⚠️ Finish error (non-critical):', finishError.message);
        }
        
        // Quick subscription check in background using RevenueCat
        subscriptionGuard.forceCheckSubscriptionStatus().then(isUserSubscribed => {
          setIsSubscribed(isUserSubscribed);
          console.log('⚡ Quick subscription check:', { isUserSubscribed });
        }).catch(error => {
          console.log('⚠️ Background subscription check error:', error);
        });
        
        setLoading(false);
      } catch (error) {
        console.error('❌ Error initializing IAP:', error);
        // Don't fail completely - just log the error and continue
        setLoading(false);
      }
    };
    
    initIAP();
    
    // Don't disconnect on cleanup to avoid conflicts with global listener
    return () => {
      // Cleanup handled by global listener in App.js
    };
  }, [enableIAP]);

  // Step 2: Get product details (before showing popup)
  useEffect(() => {
    if (!enableIAP || loading) return;
    
    const getProducts = async () => {
      try {
        // Ensure we're connected before getting products
        try {
          await InAppPurchases.connectAsync();
        } catch (connectError) {
          if (!connectError.message.includes('Already connected')) {
            throw connectError;
          }
        }
        
        const { responseCode, results } = await InAppPurchases.getProductsAsync([SUBSCRIPTION_ID]);
        if (responseCode === InAppPurchases.IAPResponseCode.OK && results.length > 0) {
          setProducts(results);
          console.log('✅ Products loaded:', results.map(p => ({ title: p.title, price: p.price })));
        } else {
          console.log('❌ Product not found or error loading product');
          // Set empty products array to show fallback UI
          setProducts([]);
        }
      } catch (error) {
        console.error('❌ Error loading products:', error);
        // Set empty products array to show fallback UI
        setProducts([]);
      }
    };
    
    getProducts();
  }, [enableIAP, loading]);

    // Note: Purchase listener is now handled globally in App.js
  // to avoid conflicts and ensure proper handling when app returns from background

  // Step 5: Unlock the app & navigate
  const unlockAppAccess = async () => {
    try {
      // Save subscription status in async storage
      await AsyncStorage.setItem('isSubscribed', 'true');
      
      // Call the onSubscribe callback to trigger navigation
      if (onSubscribe) {
        onSubscribe();
      }
      
      console.log('✅ Navigation to main app triggered');
    } catch (error) {
      console.error('❌ Error unlocking app access:', error);
    }
  };

  // Set up global callback for purchase success
  useEffect(() => {
    // Make the unlock function available globally so App.js can call it
    window.handlePurchaseSuccess = () => {
      console.log('🎯 Global purchase success callback triggered');
      setProcessing(false);
      setPurchaseSuccessful(true);
      
      // Show success message and auto-navigate
              Alert.alert(t('success', currentLanguage), t('subscriptionActivated', currentLanguage), [
        {
          text: 'OK',
          onPress: () => {
            // Auto-navigate to main app
            unlockAppAccess();
          }
        }
      ]);
    };

    return () => {
      // Clean up global callback
      delete window.handlePurchaseSuccess;
    };
  }, []);

  // Bounce animation for processing state
  useEffect(() => {
    if (processing) {
      const startBounce = () => {
        Animated.sequence([
          Animated.timing(bounceAnim, {
            toValue: 1,
            duration: 600,
            useNativeDriver: true,
          }),
          Animated.timing(bounceAnim, {
            toValue: 0,
            duration: 600,
            useNativeDriver: true,
          })
        ]).start(() => {
          if (processing) {
            startBounce();
          }
        });
      };
      startBounce();
    } else {
      bounceAnim.setValue(0);
    }
  }, [processing]);

  // Pulse animation for subscribe button
  useEffect(() => {
    const startPulse = () => {
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.1,
          duration: 1000,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 1000,
          useNativeDriver: true,
        })
      ]).start(() => {
        startPulse();
      });
    };
    startPulse();
  }, []);

  // Step 3: On "Subscribe" button click – request purchase
  const handleSubscribe = async () => {
    if (!enableIAP) {
      Alert.alert(t('subscribePressed', currentLanguage));
      return;
    }
    
    if (processing) {
      console.log('⏳ Purchase already in progress...');
      return;
    }
    
    setProcessing(true);
    
    try {
      // First, ensure we're connected to the App Store
      console.log('🔌 Ensuring connection to App Store...');
      try {
        await InAppPurchases.connectAsync();
        console.log('✅ Connected to App Store');
      } catch (connectError) {
        if (connectError.message.includes('Already connected')) {
          console.log('✅ Already connected to App Store');
        } else {
          throw connectError;
        }
      }
      
      // Then, ensure we have the product loaded from the store
      console.log('🔄 Querying product from store...');
      const { responseCode, results } = await InAppPurchases.getProductsAsync([SUBSCRIPTION_ID]);
      
      if (responseCode !== InAppPurchases.IAPResponseCode.OK || !results.length) {
        throw new Error('Failed to load product from store');
      }
      
      const product = results[0];
      console.log('✅ Product loaded from store:', product.title);
      
      // Now we can safely purchase the item
      console.log('🛒 Requesting subscription for:', product.productId);
      
      try {
        // Use the correct purchase API that returns the result directly
        const purchaseResult = await InAppPurchases.purchaseItemAsync(product.productId);
        console.log('✅ Purchase result received:', purchaseResult);
        
        if (purchaseResult && purchaseResult.responseCode === InAppPurchases.IAPResponseCode.OK) {
          console.log('✅ Purchase successful!');
          setProcessing(false);
          
          // Handle successful purchase
          await unlockAppAccess();
        } else {
          console.log('❌ Purchase failed:', purchaseResult);
          setProcessing(false);
          Alert.alert(t('purchaseFailed', currentLanguage), t('purchaseNotCompleted', currentLanguage));
        }
      } catch (purchaseError) {
        console.error('❌ Purchase error:', purchaseError);
        setProcessing(false);
                  Alert.alert(t('purchaseError', currentLanguage), purchaseError.message || t('couldNotCompletePurchase', currentLanguage));
      }
      
    } catch (err) {
      console.warn('❌ Purchase error:', err);
      setProcessing(false);
              Alert.alert(t('error', currentLanguage), err.message || t('couldNotStartPurchase', currentLanguage));
    }
  };

  // Show loading state if still initializing
  if (loading) {
    return (
      <LinearGradient colors={["#000", "#181818"]} style={styles.gradient}>
        <SafeAreaView style={styles.container}>
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#fff" />
            <Text style={styles.loadingText}>Loading subscription options...</Text>
          </View>
        </SafeAreaView>
      </LinearGradient>
    );
  }

  return (
    <LinearGradient colors={["#000", "#181818"]} style={styles.gradient}>
      <SafeAreaView style={styles.container}>
        {/* Fixed Header */}
        <View style={styles.header}>
          <Text style={styles.welcomeText}>Subscribe to Continue</Text>
          <View style={styles.logoContainer}>
            <Image source={InvertLantern} style={styles.lanternIcon} />
            <Text style={styles.appName}>Hudā</Text>
            <Text style={styles.subtitle}>
              "A subscription is required to use this app"
            </Text>
          </View>
        </View>

        {/* Scrollable Content */}
        <ScrollView 
          style={styles.scrollContent}
          contentContainerStyle={styles.scrollContentContainer}
          showsVerticalScrollIndicator={false}
        >
          <Text style={styles.sectionTitle}>Your Subscription Includes</Text>
          <View style={styles.featureListContainer}>
            <View style={styles.featureRow}><Text style={styles.emoji}>✅</Text><Text style={styles.featureText}>Access to all app features</Text></View>
            <View style={styles.featureRow}><Text style={styles.emoji}>🕑</Text><Text style={styles.featureText}>Accurate prayer times & notifications</Text></View>
            <View style={styles.featureRow}><Text style={styles.emoji}>🧭</Text><Text style={styles.featureText}>Qibla direction finder</Text></View>
            <View style={styles.featureRow}><Text style={styles.emoji}>📖</Text><Text style={styles.featureText}>Quran reading with audio</Text></View>
            <View style={styles.featureRow}><Text style={styles.emoji}>📚</Text><Text style={styles.featureText}>Islamic lessons and hadith</Text></View>
            <View style={styles.featureRow}><Text style={styles.emoji}>🕌</Text><Text style={styles.featureText}>Mosque finder and more</Text></View>
            <View style={styles.featureRow}><Text style={styles.emoji}>💰</Text><Text style={styles.featureText}>$9.99/month after trial</Text></View>
          </View>
        </ScrollView>

        {/* Fixed Footer */}
        <View style={styles.footer}>
          {/* Subscribe Button */}
          {processing ? (
            <View style={styles.processingContainer}>
              <View style={styles.processingRow}>
                <Text style={styles.processingText}>Processing</Text>
                <View style={styles.dotsContainer}>
                  <Animated.Text 
                    style={[
                      styles.dot,
                      {
                        opacity: bounceAnim.interpolate({
                          inputRange: [0, 0.5, 1],
                          outputRange: [0.3, 1, 0.3]
                        })
                      }
                    ]}
                  >
                    .
                  </Animated.Text>
                  <Animated.Text 
                    style={[
                      styles.dot,
                      {
                        opacity: bounceAnim.interpolate({
                          inputRange: [0, 0.5, 1],
                          outputRange: [0.3, 1, 0.3]
                        })
                      }
                    ]}
                  >
                    .
                  </Animated.Text>
                  <Animated.Text 
                    style={[
                      styles.dot,
                      {
                        opacity: bounceAnim.interpolate({
                          inputRange: [0, 0.5, 1],
                          outputRange: [0.3, 1, 0.3]
                        })
                      }
                    ]}
                  >
                    .
                  </Animated.Text>
                </View>
              </View>
            </View>
          ) : (
            <TouchableOpacity 
              style={[
                styles.subscribeButton, 
                loading && styles.disabledButton
              ]}
              onPress={handleSubscribe}
              disabled={loading}
              activeOpacity={0.7}
                        >
              <Animated.View
                style={{
                  transform: [
                    {
                      scale: pulseAnim.interpolate({
                        inputRange: [1, 1.1],
                        outputRange: [1, 1.1]
                      })
                    }
                  ]
                }}
              >
                <Text style={styles.subscribeButtonText}>
                  Subscribe
                </Text>
              </Animated.View>
                        </TouchableOpacity>
          )}
          
          {/* Restore Purchases Button */}
          <TouchableOpacity 
            style={styles.restoreButton}
            onPress={handleRestorePurchases}
            activeOpacity={0.7}
          >
            <Text style={styles.restoreButtonText}>Restore Purchases</Text>
          </TouchableOpacity>
          
          <Text style={styles.trustedText}>By subscribing you agree to our Terms of Service and Privacy Policy</Text>
          <View style={styles.legalLinksContainer}>
            <TouchableOpacity onPress={openTermsOfService}>
              <Text style={styles.legalLink}>Terms of Service</Text>
            </TouchableOpacity>
            <Text style={styles.legalText}> • </Text>
            <TouchableOpacity onPress={openPrivacyPolicy}>
              <Text style={styles.legalLink}>Privacy Policy</Text>
            </TouchableOpacity>
          </View>
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
    backgroundColor: 'transparent',
  },
  header: {
    paddingTop: 20,
    paddingBottom: 30,
    alignItems: 'center',
  },
  welcomeText: {
    color: '#A3B1CC',
    fontSize: 20,
    textAlign: 'center',
    marginBottom: 8,
    fontWeight: '400',
    letterSpacing: 0.1,
  },
  logoContainer: {
    alignItems: 'center',
    marginTop: 24,
  },
  appName: {
    fontSize: 36,
    fontWeight: 'bold',
    color: '#fff',
    textAlign: 'center',
    marginBottom: 4,
    letterSpacing: 0.5,
  },
  subtitle: {
    color: '#A3B1CC',
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 12,
    fontWeight: '600',
    letterSpacing: 0.1,
    fontStyle: 'italic',
  },
  scrollContent: {
    flex: 1,
  },
  scrollContentContainer: {
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  sectionTitle: {
    color: '#fff',
    fontSize: 22,
    fontWeight: '600',
    textAlign: 'center',
    marginTop: 20,
    marginBottom: 30,
  },
  featureRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 22,
  },
  emoji: {
    fontSize: 22,
    marginRight: 16,
    width: 38,
    textAlign: 'center',
  },
  featureText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '400',
    flex: 1,
  },
  footer: {
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  subscribeButton: {
    width: '90%',
    maxWidth: 340,
    height: 70,
    backgroundColor: 'transparent',
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 12,
    marginBottom: 8,
    alignSelf: 'center',
  },
  disabledButton: {
    backgroundColor: '#666',
    opacity: 0.6,
  },
  subscribeButtonText: {
    color: '#fff',
    fontSize: 28,
    fontWeight: '600',
    letterSpacing: 0.3,
    textAlign: 'center',
    fontStyle: 'italic',
    fontFamily: 'System',
    textShadowColor: '#fff',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 8,
  },
  restoreButton: {
    alignSelf: 'center',
    marginTop: 8,
    marginBottom: 8,
    paddingVertical: 8,
    paddingHorizontal: 16,
  },
  restoreButtonText: {
    color: '#A3B1CC',
    fontSize: 14,
    fontWeight: '500',
    textAlign: 'center',
    textDecorationLine: 'underline',
  },
  processingContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    height: 70,
  },
  processingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  processingText: {
    color: '#fff',
    fontSize: 24,
    fontWeight: '600',
    letterSpacing: 0.3,
    textAlign: 'center',
    fontStyle: 'italic',
    fontFamily: 'System',
    textShadowColor: '#fff',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 8,
  },
  dotsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: 3,
    marginTop: -9,
  },
  dot: {
    color: '#fff',
    fontSize: 32,
    fontWeight: 'bold',
    marginHorizontal: 2,
    textShadowColor: '#fff',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 4,
  },
  trustedText: {
    color: '#b0b0b0',
    fontSize: 15,
    textAlign: 'center',
    marginTop: 8,
    fontWeight: '500',
  },
  lanternIcon: {
    width: 100,
    height: 100,
    resizeMode: 'contain',
    marginBottom: 12,
  },
  featureListContainer: {
    width: '100%',
    paddingLeft: 12,
  },
  legalLinksContainer: {
    marginTop: 16,
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
  },
  legalText: {
    color: '#888',
    fontSize: 12,
    textAlign: 'center',
    lineHeight: 16,
    paddingHorizontal: 20,
  },
  legalLink: {
    color: '#A3B1CC',
    textDecorationLine: 'underline',
    fontWeight: '500',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  loadingText: {
    color: '#fff',
    fontSize: 18,
    textAlign: 'center',
    marginTop: 20,
    fontWeight: '500',
  },
  buttonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
}); 