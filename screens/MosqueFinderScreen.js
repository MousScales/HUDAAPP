import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  StatusBar,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  ActivityIndicator,
  Image,
  Dimensions,
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
const { width } = Dimensions.get('window');

// Distance options will be created dynamically based on language

// Fallback API_CONFIG if import fails
const DEFAULT_API_CONFIG = {
  RADIUS_OPTIONS: [1, 2, 5, 10, 15, 20, 25, 50],
  DEFAULT_RADIUS: 5,
  MAX_PHOTOS: 3,
  PHOTO_MAX_WIDTH: 400,
};

const safeApiConfig = API_CONFIG || DEFAULT_API_CONFIG;

export default function MosqueFinderScreen({ navigation }) {
  // Language support
  const { currentLanguage } = useLanguage();
  
  const [searchQuery, setSearchQuery] = useState('');
  const [location, setLocation] = useState(null);
  const [mosques, setMosques] = useState([]);
  const [loading, setLoading] = useState(false);
  const [locationName, setLocationName] = useState(t('findingLocation', currentLanguage));
  const [searchingMosques, setSearchingMosques] = useState(false);
  const [selectedDistance, setSelectedDistance] = useState(safeApiConfig.DEFAULT_RADIUS);
  const [showDistanceModal, setShowDistanceModal] = useState(false);
  // Pagination state
  const PAGE_SIZE = 25;
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
  
  // Full-screen image modal state
  const [showFullScreenImage, setShowFullScreenImage] = useState(false);
  const [fullScreenImageSource, setFullScreenImageSource] = useState(null);
  const [fullScreenImageIndex, setFullScreenImageIndex] = useState(0);
  const [fullScreenImageSources, setFullScreenImageSources] = useState([]);
  
  // Animation values
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(50)).current;
  const scaleAnim = useRef(new Animated.Value(0.9)).current;
  const modalAnim = useRef(new Animated.Value(0)).current;
  
  // Individual mosque card animations
  const mosqueAnimations = useRef(new Map()).current;

  // Create distance options based on current language
  const getDistanceOptions = () => 
    safeApiConfig.RADIUS_OPTIONS.map(radius => ({
      label: `${radius} ${t('miles', currentLanguage)}`,
      value: radius
    }));

  // Get or create animation for a specific mosque
  const getMosqueAnimation = (mosqueId) => {
    if (!mosqueAnimations.has(mosqueId)) {
      mosqueAnimations.set(mosqueId, new Animated.Value(1));
    }
    return mosqueAnimations.get(mosqueId);
  };

  // Bounce animation for mosque press
  const animateMosquePress = (mosqueId, onPress) => {
    const animation = getMosqueAnimation(mosqueId);
    Animated.sequence([
      Animated.timing(animation, {
        toValue: 0.95,
        duration: 100,
        useNativeDriver: true,
      }),
      Animated.timing(animation, {
        toValue: 1,
        duration: 100,
        useNativeDriver: true,
      }),
    ]).start(() => {
      if (onPress) onPress();
    });
  };

  useEffect(() => {
    requestLocationPermission();
  }, []);

  // Monitor distance changes and trigger new search
  useEffect(() => {
    if (location && selectedDistance) {
      console.log(`Distance effect triggered: ${selectedDistance} miles`);
      findNearbyMosques(location.coords);
    }
  }, [selectedDistance]);

  // Animate mosque cards when they load
  useEffect(() => {
    if (mosques.length > 0) {
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
  }, [mosques]);

  // Reset visibleCount when mosques or search changes
  useEffect(() => {
    setVisibleCount(PAGE_SIZE);
  }, [mosques, searchQuery]);

  const requestLocationPermission = async () => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status === 'granted') {
        const currentLocation = await Location.getCurrentPositionAsync({});
        setLocation(currentLocation);
        
        // Get city name using reverse geocoding
        const [placemark] = await Location.reverseGeocodeAsync(currentLocation.coords);
        setLocationName(placemark.city || placemark.name || t('unknownLocation', currentLanguage));
        
        // Find mosques near the location
        await findNearbyMosques(currentLocation.coords);
      } else {
        setLocationName(t('permissionDenied', currentLanguage));
        Alert.alert(t('permissionDenied', currentLanguage), t('locationAccessNeeded', currentLanguage));
      }
    } catch (error) {
      console.error('Error getting location:', error);
      setLocationName('Location Error');
              Alert.alert(t('error', currentLanguage), t('unableToGetLocation', currentLanguage));
    }
  };

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
              
              // If moved more than 5km, update location and search for mosques
              if (distance > 5) {
                console.log('📍 MosqueFinderScreen: Location changed significantly, updating mosque search...');
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
                
                // Find mosques near the new location
                await findNearbyMosques(newLocation.coords);
              }
            } else {
              // First time getting location
              setLocation(newLocation);
              await findNearbyMosques(newLocation.coords);
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

  const findNearbyMosques = async (coords) => {
    setSearchingMosques(true);
    try {
      const { latitude, longitude } = coords;
      const radiusInMeters = selectedDistance * 1609.34; // Convert miles to meters
      
      console.log(`Searching for mosques within ${selectedDistance} miles (${radiusInMeters.toFixed(0)} meters) of ${latitude}, ${longitude}`);
      
      const url = `https://maps.googleapis.com/maps/api/place/nearbysearch/json?location=${latitude},${longitude}&radius=${radiusInMeters}&type=mosque&keyword=mosque&key=${GOOGLE_PLACES_API_KEY}`;
      
      const response = await fetch(url);
      const data = await response.json();
      
      console.log(`Found ${data.results?.length || 0} mosques in search results`);
      
      if (data.status === 'OK' || data.status === 'ZERO_RESULTS') {
        const mosqueData = data.status === 'OK' ? await Promise.all(
          data.results.map(async (place) => {
            // Get detailed information for each mosque
            const detailsUrl = `https://maps.googleapis.com/maps/api/place/details/json?place_id=${place.place_id}&fields=formatted_phone_number,website,opening_hours,rating,user_ratings_total,photos&key=${GOOGLE_PLACES_API_KEY}`;
            const detailsResponse = await fetch(detailsUrl);
            const detailsData = await detailsResponse.json();
            
            // Calculate distance
            const distance = calculateDistance(latitude, longitude, place.geometry.location.lat, place.geometry.location.lng);
            
            // Get photo URLs
            const photos = [];
            if (detailsData.result?.photos) {
              detailsData.result.photos.forEach((photo, index) => {
                if (index < safeApiConfig.MAX_PHOTOS) { // Limit photos per mosque
                  const photoUrl = `https://maps.googleapis.com/maps/api/place/photo?maxwidth=${safeApiConfig.PHOTO_MAX_WIDTH}&photoreference=${photo.photo_reference}&key=${GOOGLE_PLACES_API_KEY}`;
                  photos.push(photoUrl);
                }
              });
            }
            
            return {
              id: place.place_id,
              name: place.name,
              address: place.vicinity,
              distance: distance, // Raw distance for sorting
              rating: place.rating,
              userRatingsTotal: place.user_ratings_total,
              phone: detailsData.result?.formatted_phone_number || 'Not available',
              website: detailsData.result?.website || 'Not available',
              openingHours: detailsData.result?.opening_hours?.weekday_text || [],
              photos: photos,
              location: place.geometry.location
            };
          })
        ) : [];
        
        // Sort by distance (closest first)
        mosqueData.sort((a, b) => a.distance - b.distance);
        console.log(`Processed ${mosqueData.length} mosques, sorted by distance (closest: ${mosqueData.length > 0 ? formatDistance(mosqueData[0].distance) : 'none'})`);
        setMosques(mosqueData);
      } else {
        console.error('Google Places API error:', data.status);
        Alert.alert(t('error', currentLanguage), t('unableToFindMosques', currentLanguage));
      }
    } catch (error) {
      console.error('Error fetching mosques:', error);
      Alert.alert(t('error', currentLanguage), t('failedToLoadMosqueData', currentLanguage));
    } finally {
      setSearchingMosques(false);
    }
  };

  const calculateDistance = (lat1, lon1, lat2, lon2) => {
    const R = 3959; // Earth's radius in miles
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
              Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
              Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    const distance = R * c;
    return distance; // Return raw distance for sorting
  };

  const formatDistance = (distance) => {
    if (distance < 1) {
      return `${(distance * 5280).toFixed(0)}${t('ft', currentLanguage)}`;
    } else {
      return `${distance.toFixed(1)}${t('mi', currentLanguage)}`;
    }
  };

  const handleDistanceChange = (distance) => {
    console.log(`Distance changed from ${selectedDistance} to ${distance} miles`);
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

  const handleMosquePress = (mosque) => {
    const actions = [];
    
    // Add call action only if phone number is available and not "Not available"
    if (mosque.phone && mosque.phone !== 'Not available') {
      actions.push({ 
        text: `Call ${mosque.phone}`, 
        onPress: () => {
          Linking.openURL(`tel:${mosque.phone.replace(/\s+/g, '')}`);
        }
      });
    }
    
    // Add website action only if website is available and not "Not available"
    if (mosque.website && mosque.website !== 'Not available') {
      actions.push({ 
        text: 'Visit Website', 
        onPress: () => {
          Linking.openURL(mosque.website);
        }
      });
    }
    
    // Add directions action
    actions.push({ 
      text: 'Directions', 
      onPress: () => {
        const { lat, lng } = mosque.location;
        const url = `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`;
        Linking.openURL(url);
      }
    });
    
    // Add cancel action
    actions.push({ text: t('cancel', currentLanguage), style: 'cancel' });
    
    Alert.alert(
      mosque.name,
      '',
      actions
    );
  };

  const ImageCarousel = ({ photos, mosqueName }) => {
    const [currentIndex, setCurrentIndex] = useState(0);
    
    // Use fallback mosque image if no photos available
    const imageSources = photos.length > 0 ? photos : [require('../assets/Mosque.png')];
    
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
            style={styles.mosqueImage}
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

  const filteredMosques = mosques.filter(mosque =>
    mosque.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    mosque.address.toLowerCase().includes(searchQuery.toLowerCase())
  );
  const visibleMosques = filteredMosques.slice(0, visibleCount);

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
          <Text style={styles.headerTitle}>{t('mosqueFinder', currentLanguage)}</Text>
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
            <Text style={styles.distanceButtonText}>{selectedDistance} {t('mi', currentLanguage)}</Text>
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

        {/* Search Bar */}
        <View style={styles.searchContainer}>
          <View style={styles.searchBar}>
            <Ionicons name="search" size={20} color="#b0b0b0" style={styles.searchIcon} />
            <TextInput
              style={styles.searchInput}
              placeholder={t('searchMosques', currentLanguage)}
              placeholderTextColor="#b0b0b0"
              value={searchQuery}
              onChangeText={setSearchQuery}
            />
          </View>
        </View>

        {/* Loading Indicator */}
        {searchingMosques && (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#FFD700" />
            <Text style={styles.loadingText}>{t('findingMosquesWithin', currentLanguage).replace('{distance}', selectedDistance).replace('{unit}', t('miles', currentLanguage))}</Text>
          </View>
        )}

        {/* Mosque List */}
        <ScrollView 
          style={styles.mosqueList} 
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{
            paddingBottom: Platform.OS === 'android' ? 180 : 20
          }}
        >
          {filteredMosques.length > 0 ? (
            <>
              {/* Results Count */}
              <View style={styles.resultsCountContainer}>
                <Text style={styles.resultsCountText}>
                  {t('foundMosques', currentLanguage).replace('{count}', filteredMosques.length).replace('{plural}', filteredMosques.length !== 1 ? t('mosques', currentLanguage) : t('mosque', currentLanguage)).replace('{distance}', selectedDistance).replace('{unit}', t('miles', currentLanguage))}
                </Text>
              </View>
              {visibleMosques.map((mosque, index) => (
                <Animated.View
                  key={mosque.id}
                  style={[
                    styles.mosqueCard,
                    {
                      opacity: fadeAnim,
                      transform: [
                        { translateY: slideAnim },
                        { scale: scaleAnim },
                        { scale: getMosqueAnimation(mosque.id) }
                      ]
                    }
                  ]}
                >
                  <TouchableOpacity
                    style={styles.mosqueCardTouchable}
                    onPress={() => animateMosquePress(mosque.id, () => handleMosquePress(mosque))}
                    activeOpacity={0.8}
                  >
                  <View style={styles.mosqueCardContent}>
                    {/* Image Carousel */}
                    <View style={styles.imageContainer}>
                      <ImageCarousel photos={mosque.photos} mosqueName={mosque.name} />
                    </View>
                    {/* Mosque Info */}
                    <View style={styles.mosqueInfoContainer}>
                      <Text style={styles.mosqueName} numberOfLines={2}>{mosque.name}</Text>
                      <Text style={styles.mosqueAddress} numberOfLines={2}>{mosque.address}</Text>
                      <View style={styles.mosqueDetails}>
                        <Text style={styles.mosqueDistance}>{formatDistance(mosque.distance)}</Text>
                        {mosque.rating && (
                          <View style={styles.ratingContainer}>
                            <Ionicons name="star" size={14} color="#FFD700" />
                            <Text style={styles.ratingText}>{mosque.rating}</Text>
                          </View>
                        )}
                      </View>
                    </View>
                  </View>
                  </TouchableOpacity>
                </Animated.View>
              ))}
              {/* Load More Button */}
              {visibleCount < filteredMosques.length && (
                <TouchableOpacity
                  style={{
                    backgroundColor: '#FFD700',
                    borderRadius: 12,
                    paddingVertical: 12,
                    marginVertical: 16,
                    alignItems: 'center',
                  }}
                  onPress={() => setVisibleCount(v => Math.min(v + PAGE_SIZE, filteredMosques.length))}
                >
                  <Text style={{ color: '#232323', fontWeight: 'bold', fontSize: 16 }}>{t('loadMore', currentLanguage)}</Text>
                </TouchableOpacity>
              )}
            </>
          ) : !searchingMosques ? (
            <View style={styles.noResultsContainer}>
              <Ionicons name="search-outline" size={48} color="#b0b0b0" />
              <Text style={styles.noResultsText}>{t('sorryNoMosques', currentLanguage)}</Text>
              <Text style={styles.noResultsSubtext}>{t('noMosquesFoundWithin', currentLanguage).replace('{distance}', selectedDistance).replace('{unit}', t('miles', currentLanguage))}</Text>
            </View>
          ) : null}
        </ScrollView>

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
  loadingContainer: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  loadingText: {
    color: '#b0b0b0',
    fontSize: 16,
    marginTop: 12,
  },
  mosqueList: {
    flex: 1,
    paddingHorizontal: 20,
  },
  mosqueCard: {
    backgroundColor: '#232323',
    borderRadius: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#333',
    overflow: 'hidden',
  },
  mosqueCardTouchable: {
    flex: 1,
  },
  mosqueCardContent: {
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
  mosqueImage: {
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

  mosqueInfoContainer: {
    flex: 1,
    padding: 16,
    justifyContent: 'space-between',
  },
  mosqueName: {
    fontSize: 15, // was 18
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 4,
  },
  mosqueAddress: {
    fontSize: 11, // was 13
    color: '#b0b0b0',
    marginBottom: 8,
  },
  mosqueDetails: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  mosqueDistance: {
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
  ratingCount: {
    fontSize: 12,
    color: '#b0b0b0',
    marginLeft: 4,
  },
  openingHoursContainer: {
    borderTopWidth: 1,
    borderTopColor: '#333',
    paddingTop: 8,
  },
  openingHoursTitle: {
    fontSize: 12,
    fontWeight: '600',
    color: '#fff',
    marginBottom: 4,
  },
  openingHoursText: {
    fontSize: 11,
    color: '#b0b0b0',
    marginBottom: 2,
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