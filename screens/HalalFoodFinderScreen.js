import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  StatusBar,
  TouchableOpacity,
  ScrollView,
  Dimensions,
  Alert,
  ActivityIndicator,
  TextInput,
  Image,
  Linking,
  Modal,
  Animated
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import * as Location from 'expo-location';
import { useLanguage } from '../utils/useLanguage';
import { t } from '../utils/translations';
import { GOOGLE_PLACES_API_KEY, API_CONFIG } from '../constants/apiKeys';

const { width, height } = Dimensions.get('window');

// Fallback API_CONFIG if import fails
const DEFAULT_API_CONFIG = {
  RADIUS_OPTIONS: [1, 2, 5, 10, 15, 20, 25, 50],
  DEFAULT_RADIUS: 5,
  MAX_PHOTOS: 3,
  PHOTO_MAX_WIDTH: 400,
};

const safeApiConfig = API_CONFIG || DEFAULT_API_CONFIG;

export default function HalalFoodFinderScreen({ navigation }) {
  const { currentLanguage } = useLanguage();
  const [location, setLocation] = useState(null);
  const [restaurants, setRestaurants] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [permissionGranted, setPermissionGranted] = useState(false);
  const [searchRadius, setSearchRadius] = useState(safeApiConfig.DEFAULT_RADIUS); // in kilometers
  const [showRadiusModal, setShowRadiusModal] = useState(false);
  const [locationName, setLocationName] = useState(t('findingLocation', currentLanguage));
  const [selectedDistance, setSelectedDistance] = useState(safeApiConfig.DEFAULT_RADIUS);
  const [showDistanceModal, setShowDistanceModal] = useState(false);
  
  // Full-screen image modal state
  const [showFullScreenImage, setShowFullScreenImage] = useState(false);
  const [fullScreenImageSource, setFullScreenImageSource] = useState(null);
  const [fullScreenImageIndex, setFullScreenImageIndex] = useState(0);
  const [fullScreenImageSources, setFullScreenImageSources] = useState([]);

  // Animation values
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(50)).current;
  const scaleAnim = useRef(new Animated.Value(0.9)).current;
  const headerAnim = useRef(new Animated.Value(0)).current;
  const searchAnim = useRef(new Animated.Value(0)).current;
  const modalAnim = useRef(new Animated.Value(0)).current;

  // Create distance options based on current language
  const getDistanceOptions = () => 
    safeApiConfig.RADIUS_OPTIONS.map(radius => ({
      label: `${radius} ${t('km', currentLanguage)}`,
      value: radius
    }));

  useEffect(() => {
    requestLocationPermission();
    
    // Animate header and search on mount
    Animated.parallel([
      Animated.timing(headerAnim, {
        toValue: 1,
        duration: 800,
        useNativeDriver: true,
      }),
      Animated.timing(searchAnim, {
        toValue: 1,
        duration: 1000,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  // Monitor distance changes and trigger new search
  useEffect(() => {
    if (location && selectedDistance) {
      console.log(`Distance effect triggered: ${selectedDistance} km`);
      searchHalalRestaurants(location);
    }
  }, [selectedDistance]);

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
            // Check if location has changed significantly
            if (location?.coords) {
              const distance = calculateDistance(
                location.coords.latitude,
                location.coords.longitude,
                newLocation.coords.latitude,
                newLocation.coords.longitude
              );
              
              // If moved more than 5km, update location and search for restaurants
              if (distance > 5) {
                console.log('📍 HalalFoodFinderScreen: Location changed significantly, updating restaurant search...');
                setLocation(newLocation);
                
                // Update location name
                try {
                  const [placemark] = await Location.reverseGeocodeAsync(newLocation.coords);
                  const newLocationName = placemark.city || placemark.name || t('unknownLocation', currentLanguage);
                  if (newLocationName !== locationName) {
                    setLocationName(newLocationName);
                    console.log('📍 New location:', newLocationName);
                  }
                } catch (error) {
                  console.error('Error getting new location name:', error);
                }
                
                // Search for restaurants near the new location
                await searchHalalRestaurants(newLocation);
              }
            } else {
              // First time getting location
              setLocation(newLocation);
              await searchHalalRestaurants(newLocation);
            }
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
  }, [location, locationName]);

  // Animate restaurant cards when they load
  useEffect(() => {
    if (restaurants.length > 0) {
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 600,
          useNativeDriver: true,
        }),
        Animated.timing(slideAnim, {
          toValue: 0,
          duration: 600,
          useNativeDriver: true,
        }),
        Animated.timing(scaleAnim, {
          toValue: 1,
          duration: 600,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      fadeAnim.setValue(0);
      slideAnim.setValue(50);
      scaleAnim.setValue(0.9);
    }
  }, [restaurants]);

  // Calculate distance between two coordinates using Haversine formula
  const calculateDistance = (lat1, lon1, lat2, lon2) => {
    const R = 6371; // Earth's radius in kilometers
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = 
      Math.sin(dLat/2) * Math.sin(dLat/2) +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
      Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
  };

  // Search for halal restaurants using Google Places API
  const searchHalalRestaurants = async (userLocation) => {
    try {
      setLoading(true);
      const { latitude, longitude } = userLocation.coords;
      
      // Use Google Places API to search for restaurants
      const apiKey = GOOGLE_PLACES_API_KEY;
      const radius = selectedDistance * 1000; // Convert km to meters
      const type = 'restaurant';
      const keyword = 'halal';
      
      const url = `https://maps.googleapis.com/maps/api/place/nearbysearch/json?location=${latitude},${longitude}&radius=${radius}&type=${type}&keyword=${keyword}&key=${apiKey}`;
      
      const response = await fetch(url);
      const data = await response.json();
      
      if (data.status === 'OK' && data.results && data.results.length > 0) {
        const restaurantsWithDistance = await Promise.all(data.results.map(async (place) => {
          const distance = calculateDistance(
            latitude, 
            longitude, 
            place.geometry.location.lat, 
            place.geometry.location.lng
          );
          
          // Get detailed information for each restaurant
          const detailsUrl = `https://maps.googleapis.com/maps/api/place/details/json?place_id=${place.place_id}&fields=formatted_phone_number,website,opening_hours,rating,user_ratings_total,photos&key=${apiKey}`;
          const detailsResponse = await fetch(detailsUrl);
          const detailsData = await detailsResponse.json();
          
          // Get photo URLs
          const photos = [];
          if (detailsData.result?.photos) {
            detailsData.result.photos.forEach((photo, index) => {
              if (index < safeApiConfig.MAX_PHOTOS) { // Limit photos per restaurant
                const photoUrl = `https://maps.googleapis.com/maps/api/place/photo?maxwidth=${safeApiConfig.PHOTO_MAX_WIDTH}&photoreference=${photo.photo_reference}&key=${apiKey}`;
                photos.push(photoUrl);
              }
            });
          }
          
          return {
            id: place.place_id,
            name: place.name,
            cuisine: place.types.includes('meal_takeaway') ? 'Takeaway' : 
                    place.types.includes('meal_delivery') ? 'Delivery' : 'Restaurant',
            rating: place.rating || 0,
            userRatingsTotal: place.user_ratings_total,
            distance: distance,
            distanceText: distance < 1 ? `${(distance * 1000).toFixed(0)}m` : `${distance.toFixed(1)}km`,
            address: place.vicinity,
            phone: detailsData.result?.formatted_phone_number || 'Not available',
            website: detailsData.result?.website || 'Not available',
            openingHours: detailsData.result?.opening_hours?.weekday_text || [],
            halalCertified: true, // Assuming all results are halal due to keyword search
            priceRange: place.price_level ? '$'.repeat(place.price_level) : '$$',
            photos: photos,
            image: photos.length > 0 ? photos[0] : 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=400',
            coordinates: { 
              latitude: place.geometry.location.lat, 
              longitude: place.geometry.location.lng 
            },
            placeId: place.place_id
          };
        }));
        
        // Sort by distance by default
        restaurantsWithDistance.sort((a, b) => a.distance - b.distance);
        setRestaurants(restaurantsWithDistance);
      } else {
        // No restaurants found or API error
        console.log('No halal restaurants found or API error:', data.status);
        setRestaurants([]);
        Alert.alert(
          t('noRestaurantsFound', currentLanguage) || 'No restaurants found',
          t('noHalalRestaurantsNearby', currentLanguage) || 'No halal restaurants found nearby. Please try a different location or check your internet connection.'
        );
      }
    } catch (error) {
      console.error('Error searching restaurants:', error);
      setRestaurants([]);
      Alert.alert(
        t('error', currentLanguage) || 'Error',
        t('failedToSearchRestaurants', currentLanguage) || 'Failed to search for restaurants. Please check your internet connection and try again.'
      );
    } finally {
      setLoading(false);
    }
  };


  const requestLocationPermission = async () => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status === 'granted') {
        setPermissionGranted(true);
        getCurrentLocation();
      } else {
        setLocationName(t('permissionDenied', currentLanguage));
        Alert.alert(
          t('permissionDenied', currentLanguage) || 'Permission Denied',
          t('locationAccessNeeded', currentLanguage) || 'Location access is needed to find nearby halal restaurants.',
          [
            { text: t('cancel', currentLanguage) || 'Cancel', style: 'cancel' },
            { 
              text: t('tryAgain', currentLanguage) || 'Try Again', 
              onPress: () => requestLocationPermission() 
            }
          ]
        );
        setRestaurants([]);
      }
    } catch (error) {
      console.error('Error requesting location permission:', error);
      setLocationName('Location Error');
      setRestaurants([]);
    }
  };

  const getCurrentLocation = async () => {
    try {
      setLoading(true);
      const location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High
      });
      setLocation(location);
      
      // Get city name using reverse geocoding
      const [placemark] = await Location.reverseGeocodeAsync(location.coords);
      setLocationName(placemark.city || placemark.name || t('unknownLocation', currentLanguage));
      
      // Search for restaurants once we have location
      await searchHalalRestaurants(location);
    } catch (error) {
      console.error('Error getting location:', error);
      setLocationName('Location Error');
      Alert.alert(
        t('error', currentLanguage) || 'Error',
        t('failedToGetLocation', currentLanguage) || 'Failed to get your location. Please try again.',
        [
          { text: t('cancel', currentLanguage) || 'Cancel', style: 'cancel' },
          { 
            text: t('tryAgain', currentLanguage) || 'Try Again', 
            onPress: () => getCurrentLocation() 
          }
        ]
      );
      setRestaurants([]);
    } finally {
      setLoading(false);
    }
  };

  const searchRestaurants = (query) => {
    setSearchQuery(query);
    if (query.trim() === '') {
      // Reset to all restaurants (already sorted by distance)
      // No need to re-sort since restaurants are already sorted by distance
    } else {
      const filtered = restaurants.filter(restaurant =>
        restaurant.name.toLowerCase().includes(query.toLowerCase()) ||
        restaurant.cuisine.toLowerCase().includes(query.toLowerCase()) ||
        restaurant.address.toLowerCase().includes(query.toLowerCase())
      );
      setRestaurants(filtered);
    }
  };


  const handleRadiusChange = (newRadius) => {
    setSearchRadius(newRadius);
    setShowRadiusModal(false);
    // Re-search with new radius if we have location
    if (location) {
      searchHalalRestaurants(location);
    }
  };

  const handleDistanceChange = (distance) => {
    console.log(`Distance changed from ${selectedDistance} to ${distance} km`);
    setSelectedDistance(distance);
    setShowDistanceModal(false);
  };

  const openDistanceModal = () => {
    setShowDistanceModal(true);
    Animated.timing(modalAnim, {
      toValue: 1,
      duration: 300,
      useNativeDriver: true,
    }).start();
  };

  const closeDistanceModal = () => {
    Animated.timing(modalAnim, {
      toValue: 0,
      duration: 200,
      useNativeDriver: true,
    }).start(() => setShowDistanceModal(false));
  };

  const openFullScreenImage = (imageSources, currentIndex) => {
    setFullScreenImageSources(imageSources);
    setFullScreenImageIndex(currentIndex);
    setFullScreenImageSource(imageSources[currentIndex]);
    setShowFullScreenImage(true);
  };

  const closeFullScreenImage = () => {
    setShowFullScreenImage(false);
    setFullScreenImageSource(null);
    setFullScreenImageIndex(0);
    setFullScreenImageSources([]);
  };

  const nextFullScreenImage = () => {
    const nextIndex = (fullScreenImageIndex + 1) % fullScreenImageSources.length;
    setFullScreenImageIndex(nextIndex);
    setFullScreenImageSource(fullScreenImageSources[nextIndex]);
  };

  const prevFullScreenImage = () => {
    const prevIndex = fullScreenImageIndex === 0 ? fullScreenImageSources.length - 1 : fullScreenImageIndex - 1;
    setFullScreenImageIndex(prevIndex);
    setFullScreenImageSource(fullScreenImageSources[prevIndex]);
  };

  const openDirections = (restaurant) => {
    const { latitude, longitude } = restaurant.coordinates;
    const url = `https://maps.google.com/maps?daddr=${latitude},${longitude}`;
    Linking.openURL(url);
  };

  const callRestaurant = (phone) => {
    Linking.openURL(`tel:${phone}`);
  };

  const handleRestaurantPress = (restaurant) => {
    const actions = [];
    
    // Add call action only if phone number is available and not "Not available"
    if (restaurant.phone && restaurant.phone !== 'Not available') {
      actions.push({ 
        text: `Call ${restaurant.phone}`, 
        onPress: () => {
          Linking.openURL(`tel:${restaurant.phone.replace(/\s+/g, '')}`);
        }
      });
    }
    
    // Add website action only if website is available and not "Not available"
    if (restaurant.website && restaurant.website !== 'Not available') {
      actions.push({ 
        text: 'Visit Website', 
        onPress: () => {
          Linking.openURL(restaurant.website);
        }
      });
    }
    
    // Add directions action
    actions.push({ 
      text: 'Directions', 
      onPress: () => {
        const { latitude, longitude } = restaurant.coordinates;
        const url = `https://www.google.com/maps/dir/?api=1&destination=${latitude},${longitude}`;
        Linking.openURL(url);
      }
    });
    
    // Add cancel action
    actions.push({ text: t('cancel', currentLanguage), style: 'cancel' });
    
    Alert.alert(
      restaurant.name,
      '',
      actions
    );
  };

  const ImageCarousel = ({ photos, restaurantName }) => {
    const [currentIndex, setCurrentIndex] = useState(0);
    
    // Use fallback restaurant image if no photos available
    const imageSources = photos.length > 0 ? photos : [require('../assets/logo.png')];
    
    const nextImage = () => {
      setCurrentIndex((prevIndex) => 
        prevIndex === imageSources.length - 1 ? 0 : prevIndex + 1
      );
    };

    const handleLongPress = () => {
      openFullScreenImage(imageSources, currentIndex);
    };

    return (
      <View style={styles.carouselContainer}>
        <TouchableOpacity 
          onPress={nextImage} 
          onLongPress={handleLongPress}
          activeOpacity={0.9} 
          style={styles.imageTouchable}
          delayLongPress={500}
        >
          <Image
            source={typeof imageSources[currentIndex] === 'string' ? { uri: imageSources[currentIndex] } : imageSources[currentIndex]}
            style={styles.restaurantImage}
            resizeMode="cover"
            onError={() => console.log('Image failed to load')}
          />
        </TouchableOpacity>
        
        {/* Carousel Indicators */}
        {imageSources.length > 1 && (
          <View style={styles.carouselIndicators}>
            {imageSources.map((_, index) => (
              <View
                key={index}
                style={[
                  styles.indicator,
                  index === currentIndex && styles.activeIndicator
                ]}
              />
            ))}
          </View>
        )}
      </View>
    );
  };

  const renderRestaurant = (restaurant, index) => (
    <Animated.View
      key={restaurant.id}
      style={[
        styles.restaurantCard,
        {
          opacity: fadeAnim,
          transform: [
            { translateY: slideAnim },
            { scale: scaleAnim }
          ]
        }
      ]}
    >
      <TouchableOpacity
        style={styles.restaurantCardTouchable}
        onPress={() => handleRestaurantPress(restaurant)}
        activeOpacity={0.8}
      >
        <View style={styles.restaurantCardContent}>
          {/* Image Carousel */}
          <View style={styles.imageContainer}>
            <ImageCarousel photos={restaurant.photos} restaurantName={restaurant.name} />
            {restaurant.halalCertified && (
              <View style={styles.halalBadge}>
                <Ionicons name="checkmark-circle" size={16} color="#4CAF50" />
                <Text style={styles.halalText}>HALAL</Text>
              </View>
            )}
          </View>
          
          {/* Restaurant Info */}
          <View style={styles.restaurantInfoContainer}>
            <Text style={styles.restaurantName} numberOfLines={2}>{restaurant.name}</Text>
            <Text style={styles.restaurantAddress} numberOfLines={2}>{restaurant.address}</Text>
            <View style={styles.restaurantDetails}>
              <Text style={styles.restaurantDistance}>{restaurant.distanceText || restaurant.distance}</Text>
              {restaurant.rating && (
                <View style={styles.ratingContainer}>
                  <Ionicons name="star" size={14} color="#FFD700" />
                  <Text style={styles.ratingText}>{restaurant.rating}</Text>
                </View>
              )}
            </View>
            <Text style={styles.cuisine}>{restaurant.cuisine} • {restaurant.priceRange}</Text>
          </View>
        </View>
      </TouchableOpacity>
    </Animated.View>
  );

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
          <Text style={styles.headerTitle}>{t('halalFoodFinder', currentLanguage)}</Text>
          <View style={styles.headerSpacer} />
        </View>

        {/* Location and Distance Display */}
        <View style={styles.locationContainer}>
          <View style={styles.locationInfo}>
            <Ionicons name="location" size={16} color="#FFD700" style={styles.locationIcon} />
            <Text style={styles.locationText}>{locationName}</Text>
          </View>
          <TouchableOpacity
            style={styles.distanceButton}
            onPress={openDistanceModal}
          >
            <Text style={styles.distanceButtonText}>{selectedDistance} {t('km', currentLanguage)}</Text>
            <Ionicons name="chevron-down" size={16} color="#FFD700" />
          </TouchableOpacity>
        </View>

        {/* Distance Modal */}
        <Modal
          visible={showDistanceModal}
          transparent={true}
          animationType="fade"
          onRequestClose={closeDistanceModal}
        >
          <TouchableOpacity
            style={styles.modalOverlay}
            activeOpacity={1}
            onPress={closeDistanceModal}
          >
            <View style={styles.modalContent}>
              <Text style={styles.modalTitle}>{t('searchRadius', currentLanguage)}</Text>
              {getDistanceOptions().map((option) => (
                <TouchableOpacity
                  key={option.value}
                  style={[
                    styles.modalOption,
                    selectedDistance === option.value && styles.selectedOption
                  ]}
                  onPress={() => handleDistanceChange(option.value)}
                >
                  <Text style={[
                    styles.modalOptionText,
                    selectedDistance === option.value && styles.selectedOptionText
                  ]}>
                    {option.label}
                  </Text>
                  {selectedDistance === option.value && (
                    <Ionicons name="checkmark" size={20} color="#FFD700" />
                  )}
                </TouchableOpacity>
              ))}
            </View>
          </TouchableOpacity>
        </Modal>

        {/* Full-Screen Image Modal */}
        <Modal
          visible={showFullScreenImage}
          transparent={true}
          animationType="fade"
          onRequestClose={closeFullScreenImage}
        >
          <View style={styles.fullScreenModalOverlay}>
            {/* Close Button */}
            <TouchableOpacity
              style={styles.fullScreenCloseButton}
              onPress={closeFullScreenImage}
            >
              <Ionicons name="close" size={28} color="#fff" />
            </TouchableOpacity>

            {/* Image */}
            <TouchableOpacity
              style={styles.fullScreenImageContainer}
              onPress={nextFullScreenImage}
              activeOpacity={1}
            >
              <Image
                source={typeof fullScreenImageSource === 'string' ? { uri: fullScreenImageSource } : fullScreenImageSource}
                style={styles.fullScreenImage}
                resizeMode="contain"
              />
            </TouchableOpacity>

            {/* Navigation Buttons */}
            {fullScreenImageSources.length > 1 && (
              <>
                <TouchableOpacity
                  style={styles.fullScreenNavButton}
                  onPress={prevFullScreenImage}
                >
                  <Ionicons name="chevron-back" size={32} color="#fff" />
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.fullScreenNavButton, styles.fullScreenNavButtonRight]}
                  onPress={nextFullScreenImage}
                >
                  <Ionicons name="chevron-forward" size={32} color="#fff" />
                </TouchableOpacity>
              </>
            )}

            {/* Image Counter */}
            {fullScreenImageSources.length > 1 && (
              <View style={styles.fullScreenImageCounter}>
                <Text style={styles.fullScreenImageCounterText}>
                  {fullScreenImageIndex + 1} / {fullScreenImageSources.length}
                </Text>
              </View>
            )}
          </View>
        </Modal>

        {/* Search Bar */}
        <View style={styles.searchContainer}>
          <View style={styles.searchBar}>
            <Ionicons name="search" size={20} color="#b0b0b0" style={styles.searchIcon} />
            <TextInput
              style={styles.searchInput}
              placeholder={t('searchRestaurants', currentLanguage)}
              placeholderTextColor="#b0b0b0"
              value={searchQuery}
              onChangeText={searchRestaurants}
            />
            {searchQuery.length > 0 && (
              <TouchableOpacity
                onPress={() => searchRestaurants('')}
                style={styles.clearButton}
              >
                <Ionicons name="close-circle" size={20} color="#b0b0b0" />
              </TouchableOpacity>
            )}
          </View>
        </View>

        {/* Loading Indicator */}
        {loading && (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#FFD700" />
            <Text style={styles.loadingText}>
              {t('findingLocation', currentLanguage) || 'Finding your location...'}
            </Text>
          </View>
        )}

        {/* Results */}
        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          {restaurants.length > 0 ? (
            <>
              {/* Results Count */}
              <View style={styles.resultsCountContainer}>
                <Text style={styles.resultsCountText}>
                  {t('foundRestaurants', currentLanguage)
                    .replace('{count}', restaurants.length)
                    .replace('{plural}', restaurants.length !== 1 ? t('restaurants', currentLanguage) : t('restaurant', currentLanguage))
                    .replace('{distance}', selectedDistance)
                    .replace('{unit}', t('km', currentLanguage))}
                </Text>
              </View>
              
              {restaurants.map((restaurant, index) => renderRestaurant(restaurant, index))}
            </>
          ) : !loading ? (
            <View style={styles.noResultsContainer}>
              <Ionicons name="restaurant-outline" size={48} color="#b0b0b0" />
              <Text style={styles.noResultsText}>{t('noRestaurantsFound', currentLanguage)}</Text>
              <Text style={styles.noResultsSubtext}>{t('tryDifferentSearch', currentLanguage)}</Text>
            </View>
          ) : null}
        </ScrollView>


        {/* Radius Modal */}
        {showRadiusModal && (
          <View style={styles.modalOverlay}>
            <View style={styles.sortModal}>
              <Text style={styles.sortModalTitle}>
                {t('searchRadius', currentLanguage) || 'Search Radius'}
              </Text>
              
              {safeApiConfig.RADIUS_OPTIONS.map((radius) => (
                <TouchableOpacity
                  key={radius}
                  style={[styles.sortOption, searchRadius === radius && styles.sortOptionSelected]}
                  onPress={() => handleRadiusChange(radius)}
                >
                  <Ionicons 
                    name="location" 
                    size={20} 
                    color={searchRadius === radius ? '#3498db' : '#CCCCCC'} 
                  />
                  <Text style={[styles.sortOptionText, searchRadius === radius && styles.sortOptionTextSelected]}>
                    {radius} km
                  </Text>
                  {searchRadius === radius && <Ionicons name="checkmark" size={20} color="#3498db" />}
                </TouchableOpacity>
              ))}
              
              <TouchableOpacity
                style={styles.sortCancelButton}
                onPress={() => setShowRadiusModal(false)}
              >
                <Text style={styles.sortCancelText}>
                  {t('cancel', currentLanguage) || 'Cancel'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
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
  locationContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingBottom: 10,
  },
  locationInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  locationIcon: {
    marginRight: 8,
  },
  locationText: {
    fontSize: 14,
    color: '#b0b0b0',
  },
  distanceButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#232323',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: '#333',
  },
  distanceButtonText: {
    fontSize: 14,
    color: '#fff',
    fontWeight: '600',
    marginRight: 8,
  },
  searchContainer: {
    paddingHorizontal: 20,
    marginBottom: 20,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#232323',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: '#333',
  },
  searchIcon: {
    marginRight: 12,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: '#fff',
  },
  clearButton: {
    marginLeft: 8,
  },
  loadingContainer: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  loadingText: {
    color: '#b0b0b0',
    fontSize: 16,
    marginTop: 12,
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
  },
  resultsCountContainer: {
    paddingHorizontal: 0,
    paddingVertical: 12,
    marginBottom: 8,
  },
  resultsCountText: {
    fontSize: 14,
    color: '#b0b0b0',
    textAlign: 'center',
    fontWeight: '500',
  },
  restaurantCard: {
    backgroundColor: '#232323',
    borderRadius: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#333',
    overflow: 'hidden',
  },
  restaurantCardTouchable: {
    flex: 1,
  },
  restaurantCardContent: {
    flexDirection: 'row',
  },
  imageContainer: {
    width: 120,
    height: 120,
    overflow: 'hidden',
    borderTopLeftRadius: 16,
    borderBottomLeftRadius: 16,
    aspectRatio: 1,
  },
  carouselContainer: {
    width: 120,
    height: 120,
    position: 'relative',
    backgroundColor: '#1a1a1a',
    overflow: 'hidden',
    borderTopLeftRadius: 16,
    borderBottomLeftRadius: 16,
    aspectRatio: 1,
  },
  imageTouchable: {
    width: '100%',
    height: '100%',
  },
  restaurantImage: {
    width: '100%',
    height: '100%',
    borderRadius: 0,
    borderTopLeftRadius: 16,
    borderBottomLeftRadius: 16,
    backgroundColor: '#1a1a1a',
    aspectRatio: 1,
  },
  carouselIndicators: {
    position: 'absolute',
    bottom: 8,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  indicator: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: 'rgba(255, 255, 255, 0.4)',
    marginHorizontal: 2,
  },
  activeIndicator: {
    backgroundColor: '#FFD700',
  },
  halalBadge: {
    position: 'absolute',
    bottom: 6,
    left: 6,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(76, 175, 80, 0.9)',
    paddingHorizontal: 4,
    paddingVertical: 2,
    borderRadius: 6,
  },
  halalText: {
    color: '#FFFFFF',
    fontSize: 8,
    fontWeight: 'bold',
    marginLeft: 2,
  },
  restaurantInfoContainer: {
    flex: 1,
    padding: 16,
    justifyContent: 'space-between',
  },
  restaurantName: {
    fontSize: 15,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 4,
  },
  restaurantAddress: {
    fontSize: 11,
    color: '#b0b0b0',
    marginBottom: 8,
  },
  restaurantDetails: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  restaurantDistance: {
    fontSize: 12,
    color: '#FFD700',
    fontWeight: '600',
  },
  ratingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  ratingText: {
    fontSize: 12,
    color: '#FFD700',
    fontWeight: '600',
    marginLeft: 4,
  },
  cuisine: {
    fontSize: 12,
    color: '#b0b0b0',
    marginBottom: 4,
  },
  noResultsContainer: {
    alignItems: 'center',
    paddingVertical: 60,
  },
  noResultsText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
    marginTop: 16,
    textAlign: 'center',
  },
  noResultsSubtext: {
    color: '#b0b0b0',
    fontSize: 14,
    marginTop: 8,
    textAlign: 'center',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  sortModal: {
    backgroundColor: '#232323',
    borderRadius: 12,
    padding: 20,
    width: '80%',
    alignItems: 'center',
  },
  sortModalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 20,
  },
  modalContent: {
    backgroundColor: '#232323',
    borderRadius: 12,
    padding: 20,
    width: '80%',
    alignItems: 'center',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 20,
  },
  modalOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
    paddingVertical: 12,
    paddingHorizontal: 10,
    borderRadius: 8,
    marginBottom: 8,
  },
  modalOptionText: {
    fontSize: 16,
    color: '#fff',
  },
  selectedOption: {
    backgroundColor: '#333',
    borderColor: '#FFD700',
    borderWidth: 1,
  },
  selectedOptionText: {
    color: '#FFD700',
  },
  fullScreenModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.95)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  fullScreenCloseButton: {
    position: 'absolute',
    top: 40,
    right: 20,
    zIndex: 10,
  },
  fullScreenImageContainer: {
    width: '90%',
    height: '90%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  fullScreenImage: {
    width: '100%',
    height: '100%',
    borderRadius: 12,
  },
  fullScreenNavButton: {
    position: 'absolute',
    top: '50%',
    transform: [{ translateY: -20 }],
    zIndex: 10,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    borderRadius: 25,
    width: 50,
    height: 50,
    justifyContent: 'center',
    alignItems: 'center',
    left: 20,
  },
  fullScreenNavButtonRight: {
    left: 'auto',
    right: 20,
  },
  fullScreenImageCounter: {
    position: 'absolute',
    bottom: 20,
    zIndex: 10,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  fullScreenImageCounterText: {
    color: '#fff',
    fontSize: 14,
  },
});
