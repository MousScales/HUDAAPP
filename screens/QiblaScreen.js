import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  StatusBar,
  TouchableOpacity,
  Animated,
  Image,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Location from 'expo-location';
import { useLanguage } from '../utils/useLanguage';
import { t } from '../utils/translations';
import widgetService from '../services/widgetService';
import { getAndroidTopPadding } from '../utils/languageResponsiveSizing';

export default function QiblaScreen({ navigation }) {
  // Language support
  const { currentLanguage } = useLanguage();
  
  const [heading, setHeading] = useState(0);
  const [qiblaDirection, setQiblaDirection] = useState(0);
  const [locationName, setLocationName] = useState(t('findingLocation', currentLanguage));
  const [errorMsg, setErrorMsg] = useState(null);
  const rotation = useRef(new Animated.Value(0)).current;
  const [isFacingQibla, setIsFacingQibla] = useState(false);
  const headingSubscription = useRef(null);
  const lastUpdateTime = useRef(Date.now());

  useEffect(() => {
    (async () => {
      let { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        setErrorMsg('Permission to access location was denied');
        setLocationName(t('permissionDenied', currentLanguage));
        return;
      }

      let location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.BestForNavigation,
        timeInterval: 1000,
        distanceInterval: 1,
      });
      const { latitude, longitude } = location.coords;
      
      const [placemark] = await Location.reverseGeocodeAsync(location.coords);
      setLocationName(placemark.city || placemark.name || t('unknownLocation', currentLanguage));

      // Qibla formula
      const kaabaLat = 21.4225;
      const kaabaLng = 39.8262;
      const y = Math.sin(Math.PI / 180 * (kaabaLng - longitude));
      const x = Math.cos(Math.PI / 180 * latitude) * Math.tan(Math.PI / 180 * kaabaLat) - Math.sin(Math.PI / 180 * latitude) * Math.cos(Math.PI / 180 * (kaabaLng - longitude));
      let angle = Math.atan2(y, x);
      angle = angle * (180 / Math.PI);
      angle = (angle + 360) % 360;
      setQiblaDirection(angle);
    })();
    
    // Start watching heading with maximum frequency updates
    const startHeadingWatch = async () => {
      headingSubscription.current = await Location.watchHeadingAsync(
        (h) => {
          const now = Date.now();
          // Throttle updates to prevent excessive re-renders while maintaining responsiveness
          if (now - lastUpdateTime.current > 16) { // ~60fps
            setHeading(h.trueHeading);
            lastUpdateTime.current = now;
          }
        },
        {
          accuracy: Location.Accuracy.BestForNavigation,
          timeInterval: 16, // Update every 16ms for maximum smoothness
          distanceInterval: 0, // Update on any movement
        }
      );
    };
    
    startHeadingWatch();
    
    // Cleanup function
    return () => {
      if (headingSubscription.current) {
        headingSubscription.current.remove();
      }
    };
  }, []);

  // Add location watching for automatic updates when user moves
  useEffect(() => {
    let locationSubscription = null;
    
    const startLocationWatching = async () => {
      try {
        let { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== 'granted') {
          return;
        }

        // Watch for location changes with significant distance threshold
        locationSubscription = await Location.watchPositionAsync(
          {
            accuracy: Location.Accuracy.Balanced,
            timeInterval: 30000, // Check every 30 seconds
            distanceInterval: 1000, // Update when moved 1km or more
          },
          async (newLocation) => {
            const { latitude, longitude } = newLocation.coords;
            
            // Update location name
            try {
              const [placemark] = await Location.reverseGeocodeAsync(newLocation.coords);
              const newLocationName = placemark.city || placemark.name || t('unknownLocation', currentLanguage);
              if (newLocationName !== locationName) {
                setLocationName(newLocationName);
                console.log('📍 QiblaScreen: New location:', newLocationName);
              }
            } catch (error) {
              console.error('Error getting new location name:', error);
            }

            // Recalculate qibla direction for new location
            const kaabaLat = 21.4225;
            const kaabaLng = 39.8262;
            const y = Math.sin(Math.PI / 180 * (kaabaLng - longitude));
            const x = Math.cos(Math.PI / 180 * latitude) * Math.tan(Math.PI / 180 * kaabaLat) - Math.sin(Math.PI / 180 * latitude) * Math.cos(Math.PI / 180 * (kaabaLng - longitude));
            let angle = Math.atan2(y, x);
            angle = angle * (180 / Math.PI);
            angle = (angle + 360) % 360;
            setQiblaDirection(angle);
          }
        );
      } catch (error) {
        console.error('Error setting up location watching:', error);
      }
    };

    startLocationWatching();

    return () => {
      if (locationSubscription) {
        locationSubscription.remove();
      }
    };
  }, [locationName]);
  
  useEffect(() => {
    // Instant animation with no delay for immediate response
    const targetRotation = (360 - heading) + qiblaDirection;
    
    // Use direct value setting for instant response
    rotation.setValue(targetRotation);
    
    // Also run a quick animation for smooth visual transition
    Animated.timing(rotation, {
      toValue: targetRotation,
      duration: 0, // Instant response
      useNativeDriver: true,
    }).start();
    
    let diff = qiblaDirection - heading;
    if (diff > 180) {
      diff -= 360;
    } else if (diff < -180) {
      diff += 360;
    }
    const facingQibla = Math.abs(diff) < 5;
    setIsFacingQibla(facingQibla);
    
    // Calculate instruction
    let instructionDiff = qiblaDirection - heading;
    if (instructionDiff > 180) {
      instructionDiff -= 360;
    } else if (instructionDiff < -180) {
      instructionDiff += 360;
    }
    
    let instruction = '';
    const absoluteDiff = Math.abs(instructionDiff);
    if (absoluteDiff < 5) {
      instruction = t('facingQibla', currentLanguage);
    } else {
      const direction = instructionDiff < 0 ? t('left', currentLanguage) : t('right', currentLanguage);
      if (absoluteDiff < 22.5) {
        instruction = t('slightTurn', currentLanguage).replace('{direction}', direction);
      } else if (absoluteDiff < 90) {
        instruction = t('turnTo', currentLanguage).replace('{direction}', direction);
      } else {
        instruction = t('sharpTurn', currentLanguage).replace('{direction}', direction);
      }
    }
    
    // Save Qibla data to widget
    try {
      widgetService.saveQiblaData({
        qiblaDirection,
        heading,
        locationName,
        isFacingQibla: facingQibla,
        instruction: instruction
      });
    } catch (error) {
      console.error('Error saving Qibla data to widget:', error);
    }
  }, [heading, qiblaDirection, locationName, currentLanguage]);

  const getInstruction = () => {
    let diff = qiblaDirection - heading;

    // Normalize the angle to be between -180 and 180 for the shortest turn
    if (diff > 180) {
      diff -= 360;
    } else if (diff < -180) {
      diff += 360;
    }

    const absoluteDiff = Math.abs(diff);

    if (absoluteDiff < 5) {
      return t('facingQibla', currentLanguage);
    }

    const direction = diff < 0 ? t('left', currentLanguage) : t('right', currentLanguage);

    if (absoluteDiff < 22.5) {
      return t('slightTurn', currentLanguage).replace('{direction}', direction);
    } else if (absoluteDiff < 90) {
      return t('turnTo', currentLanguage).replace('{direction}', direction);
    } else {
      return t('sharpTurn', currentLanguage).replace('{direction}', direction);
    }
  };

  const rotationStyle = {
    transform: [{
      rotate: rotation.interpolate({
        inputRange: [0, 360],
        outputRange: ['0deg', '360deg']
      })
    }]
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#0D1B2A" />

      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#E0E1DD" />
        </TouchableOpacity>
        <View style={styles.locationContainer}>
          <Text style={styles.locationLabel}>{t('location', currentLanguage).toUpperCase()}</Text>
          <Text style={styles.locationName}>{locationName}</Text>
        </View>
        <View style={{ width: 36 }} />
      </View>

      <View style={styles.compassContainer}>
        <View style={[styles.compassCircle, { borderColor: isFacingQibla ? '#FFFFFF' : '#415A77' }]} />
        <Animated.View style={[styles.kaabaPointer, rotationStyle]}>
          <Image
            source={require('../assets/kaaba.png')}
            style={[styles.kaabaImage, { opacity: isFacingQibla ? 1 : 0.6 }]}
          />
        </Animated.View>
        <View style={[styles.compassPointer, { backgroundColor: isFacingQibla ? '#FFFFFF' : '#415A77' }]} />
      </View>

      <Text style={styles.instructionText}>{getInstruction()}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000000',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingBottom: 50,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: getAndroidTopPadding(60),
    paddingHorizontal: 20,
    width: '100%',
  },
  backButton: {
    padding: 5,
  },
  locationContainer: {
    alignItems: 'center',
  },
  locationLabel: {
    color: '#778DA9',
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 1,
  },
  locationName: {
    color: '#E0E1DD',
    fontSize: 24,
    fontWeight: 'bold',
  },
  compassContainer: {
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
  },
  compassCircle: {
    width: 250,
    height: 250,
    borderRadius: 125,
    borderWidth: 10,
    borderColor: '#415A77',
  },
  compassPointer: {
    position: 'absolute',
    width: 8,
    height: 100,
    backgroundColor: '#415A77',
    top: 75,
    left: 121,
  },
  kaabaPointer: {
    position: 'absolute',
    width: 250,
    height: 250,
    alignItems: 'center',
  },
  kaabaImage: {
    width: 60,
    height: 60,
    resizeMode: 'contain',
    marginTop: -15,
  },
  instructionText: {
    color: '#E0E1DD',
    fontSize: 22,
    fontWeight: '500',
    textAlign: 'center',
    paddingHorizontal: 20,
  },
}); 