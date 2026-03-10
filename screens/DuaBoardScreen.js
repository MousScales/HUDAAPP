import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  TextInput,
  Modal,
  SafeAreaView,
  StatusBar,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Animated,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { firestore, auth } from '../firebase';
import { collection, addDoc, onSnapshot, serverTimestamp, query, orderBy, doc, updateDoc, deleteDoc, getDoc, Timestamp } from 'firebase/firestore';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useLanguage } from '../utils/useLanguage';
import { t } from '../utils/translations';
import { getAndroidTopPadding } from '../utils/languageResponsiveSizing';
import { useFocusEffect } from '@react-navigation/native';

const DuaBoardScreen = ({ navigation }) => {
  // Language support
  const { currentLanguage } = useLanguage();
  
  const [prayerRequests, setPrayerRequests] = useState([]);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showReportModal, setShowReportModal] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [newRequest, setNewRequest] = useState({
    title: '',
    description: '',
  });
  const [userFirstName, setUserFirstName] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [showInstructionPopup, setShowInstructionPopup] = useState(false);
  // Animation for accept button
  const bounceAnim = useRef(new Animated.Value(1)).current;
  // Pagination state
  const PAGE_SIZE = 25;
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);

  // Filtered requests based on search
  const filteredRequests = prayerRequests.filter(req =>
    req.title && req.title.toLowerCase().includes(searchQuery.toLowerCase())
  );
  
  const visibleRequests = filteredRequests.slice(0, visibleCount);

  // Reset visibleCount when requests or search changes
  useEffect(() => {
    setVisibleCount(PAGE_SIZE);
  }, [prayerRequests, searchQuery]);

  // Get current user ID from Firebase Auth
  const currentUserId = auth.currentUser?.uid || null;

  useEffect(() => {
    // Listen for real-time updates from Firestore
    const q = query(collection(firestore, 'duaBoard'), orderBy('timestamp', 'desc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const requests = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setPrayerRequests(requests);
    }, (error) => {
      console.error('Error in dua board listener:', error);
      if (error.code === 'permission-denied') {
        console.log('Permission denied - user likely logged out, clearing prayer requests');
        setPrayerRequests([]);
      }
    });
    return unsubscribe;
  }, []);

  useEffect(() => {
    // Load user's first name from AsyncStorage, then Firebase if needed
    const refreshNameFromFirebase = async () => {
      try {
        const { doc, getDoc } = await import('firebase/firestore');
        const user = auth.currentUser;
        
        if (!user) {
          setUserFirstName(t('anonymous', currentLanguage));
          return;
        }
        
        const userDoc = await getDoc(doc(firestore, 'users', user.uid));
        if (userDoc.exists()) {
          const profile = userDoc.data();
          const firstName = profile.firstName || profile.name || profile.displayName || '';
          if (firstName && firstName.trim() !== '') {
            setUserFirstName(firstName);
            // Update AsyncStorage
            const currentProfile = await AsyncStorage.getItem('userProfile');
            const updatedProfile = currentProfile ? JSON.parse(currentProfile) : {};
            updatedProfile.firstName = profile.firstName || updatedProfile.firstName;
            updatedProfile.name = profile.name || updatedProfile.name;
            updatedProfile.displayName = profile.displayName || updatedProfile.displayName;
            await AsyncStorage.setItem('userProfile', JSON.stringify(updatedProfile));
          } else {
            setUserFirstName(t('anonymous', currentLanguage));
          }
        } else {
          setUserFirstName(t('anonymous', currentLanguage));
        }
      } catch (e) {
        console.error('Error refreshing name from Firebase:', e);
        setUserFirstName(t('anonymous', currentLanguage));
      }
    };
    
    const loadUserName = async () => {
      try {
        const userProfile = await AsyncStorage.getItem('userProfile');
        if (userProfile) {
          const profile = JSON.parse(userProfile);
          const firstName = profile.firstName || profile.name || profile.displayName || '';
          if (firstName && firstName.trim() !== '') {
            setUserFirstName(firstName);
            // Still refresh from Firebase in background to ensure we have latest data
            refreshNameFromFirebase();
            return;
          }
        }
        
        // If no name found, try Firebase
        await refreshNameFromFirebase();
      } catch (e) {
        console.error('Error loading user name:', e);
        await refreshNameFromFirebase();
      }
    };
    
    loadUserName();
  }, [currentLanguage]);

  useEffect(() => {
    // Check if user has seen the instruction popup before
    const checkInstructionSeen = async () => {
      try {
        const hasSeenInstruction = await AsyncStorage.getItem('duaBoardInstructionSeen');
        if (!hasSeenInstruction) {
          // Show popup after a short delay to ensure screen is loaded
          setTimeout(() => {
            setShowInstructionPopup(true);
          }, 1000);
        }
      } catch (e) {
        // If there's an error, show the popup anyway
        setTimeout(() => {
          setShowInstructionPopup(true);
        }, 1000);
      }
    };
    checkInstructionSeen();
  }, []);

  // Save timestamp when screen is viewed
  useFocusEffect(
    React.useCallback(() => {
      const saveViewTimestamp = async () => {
        try {
          const now = Date.now();
          await AsyncStorage.setItem('duaBoardLastViewed', now.toString());
          console.log('📅 Dua Board view timestamp saved:', now);
        } catch (error) {
          console.error('Error saving dua board view timestamp:', error);
        }
      };
      saveViewTimestamp();
    }, [])
  );

  // Bouncing animation for accept button
  useEffect(() => {
    if (showInstructionPopup) {
      const bounceAnimation = Animated.loop(
        Animated.sequence([
          Animated.timing(bounceAnim, {
            toValue: 1.1,
            duration: 800,
            useNativeDriver: true,
          }),
          Animated.timing(bounceAnim, {
            toValue: 1,
            duration: 800,
            useNativeDriver: true,
          }),
        ])
      );
      bounceAnimation.start();
      return () => bounceAnimation.stop();
    }
  }, [showInstructionPopup, bounceAnim]);

  const handleAddRequest = async () => {
    if (!currentUserId) {
              Alert.alert(t('authenticationRequired', currentLanguage), t('signInToAddPrayerRequest', currentLanguage));
      return;
    }
    
    if (!newRequest.title.trim() || !newRequest.description.trim()) {
      Alert.alert(t('missingInformation', currentLanguage), t('fillTitleAndDescription', currentLanguage));
      return;
    }
    try {
      await addDoc(collection(firestore, 'duaBoard'), {
        title: newRequest.title,
        description: newRequest.description,
        author: userFirstName,
        authorId: currentUserId, // Save user ID
        timestamp: new Date(), // Save as JS Date, Firestore will convert to Timestamp
        supporters: [], // Initialize supporters
        reportCount: 0,
        reportedBy: [],
      });
      setNewRequest({ title: '', description: '' });
      setShowAddModal(false);
    } catch (e) {
              Alert.alert(t('error', currentLanguage), t('couldNotAddDuaRequest', currentLanguage));
    }
  };

  const handleSupport = async (id) => {
    if (!currentUserId) {
      Alert.alert(t('authenticationRequired', currentLanguage), t('signInToSupport', currentLanguage));
      return;
    }
    
    try {
      const duaRef = doc(firestore, 'duaBoard', id);
      const duaSnap = await getDoc(duaRef);
      if (!duaSnap.exists()) return;
      const data = duaSnap.data();
      const supporters = data.supporters || [];
      const wasLiked = supporters.includes(currentUserId);
      let newSupporters;
      
      if (wasLiked) {
        // Unlike: remove user
        newSupporters = supporters.filter(uid => uid !== currentUserId);
      } else {
        // Like: add user
        newSupporters = [...supporters, currentUserId];
        
        // Send notification to the author if they exist and it's not the current user liking their own request
        if (data.authorId && data.authorId !== currentUserId) {
          try {
            // Get current user's name
            const currentUserProfile = await AsyncStorage.getItem('userProfile');
            let likerName = 'Someone';
            if (currentUserProfile) {
              const profile = JSON.parse(currentUserProfile);
              likerName = profile.firstName || 
                          profile.name || 
                          profile.displayName || 
                          profile.userName ||
                          profile.fullName ||
                          profile.givenName ||
                          'Someone';
            }
            
            // Store like event in Firestore for delayed notification processing (30 minutes)
            await addDoc(collection(firestore, 'duaLikeNotifications'), {
              duaId: id,
              authorId: data.authorId,
              likerId: currentUserId,
              likerName: likerName,
              createdAt: serverTimestamp(),
              notificationSent: false,
              scheduledFor: Timestamp.fromMillis(Date.now() + 30 * 60 * 1000), // 30 minutes from now
            });
            
            console.log('✅ Dua like event stored for delayed notification');
          } catch (notificationError) {
            console.error('❌ Error sending dua like notification:', notificationError);
            // Don't block the like action if notification fails
          }
        }
      }
      
      await updateDoc(duaRef, { supporters: newSupporters });
    } catch (e) {
              Alert.alert(t('error', currentLanguage), t('couldNotUpdateLike', currentLanguage));
    }
  };

  const handleReport = async (request) => {
    if (!currentUserId) {
      Alert.alert(t('authenticationRequired', currentLanguage), t('signInToReport', currentLanguage));
      return;
    }
    
    if (request.reportedBy && request.reportedBy.includes(currentUserId)) {
              Alert.alert(t('alreadyReported', currentLanguage), t('alreadyReportedMessage', currentLanguage));
      return;
    }
    try {
      const newReportedBy = [...(request.reportedBy || []), currentUserId];
      const newReportCount = (request.reportCount || 0) + 1;
      if (newReportCount >= 3) {
        // Delete from Firestore
        await deleteDoc(doc(firestore, 'duaBoard', request.id));
        Alert.alert(t('requestRemoved', currentLanguage), t('requestRemovedMessage', currentLanguage));
      } else {
        // Update report count and reportedBy in Firestore
        await updateDoc(doc(firestore, 'duaBoard', request.id), {
          reportCount: newReportCount,
          reportedBy: newReportedBy,
        });
        Alert.alert(t('reportSubmitted', currentLanguage), t('reportSubmittedMessage', currentLanguage));
      }
    } catch (e) {
              Alert.alert(t('error', currentLanguage), t('couldNotReport', currentLanguage));
    }
  };

  const handleDelete = async (request) => {
    if (!currentUserId) {
      Alert.alert(t('authenticationRequired', currentLanguage), t('signInToDelete', currentLanguage));
      return;
    }
    
    // Security check: Only the author can delete their own request
    if (request.authorId !== currentUserId) {
              Alert.alert(t('unauthorized', currentLanguage), t('canOnlyDeleteOwn', currentLanguage));
      return;
    }

    try {
      await deleteDoc(doc(firestore, 'duaBoard', request.id));
              Alert.alert(t('deleted', currentLanguage), t('duaDeleted', currentLanguage));
    } catch (e) {
              Alert.alert(t('error', currentLanguage), t('couldNotDelete', currentLanguage));
    }
  };

  const handleDismissInstruction = async () => {
    try {
      await AsyncStorage.setItem('duaBoardInstructionSeen', 'true');
      setShowInstructionPopup(false);
    } catch (e) {
      setShowInstructionPopup(false);
    }
  };

  const renderRequestCard = ({ item }) => (
    <TouchableOpacity 
      style={styles.requestCard}
      onLongPress={() => {
        setSelectedRequest(item);
        setShowReportModal(true);
      }}
    >
      <View style={styles.requestHeader}>
        <Text style={styles.requestTitle}>{item.title}</Text>
        <TouchableOpacity
          style={styles.supportButton}
          onPress={() => handleSupport(item.id)}
        >
          <Ionicons
            name={item.supporters && item.supporters.includes(currentUserId) ? 'heart' : 'heart-outline'}
            size={16}
            color={item.supporters && item.supporters.includes(currentUserId) ? '#e74c3c' : '#2196F3'}
          />
          <Text style={styles.supportCount}>{item.supporters ? item.supporters.length : 0}</Text>
        </TouchableOpacity>
        {/* Delete button for own submissions */}
        {item.authorId === currentUserId && (
          <TouchableOpacity
            style={{ marginLeft: 10 }}
            onPress={() => handleDelete(item)}
          >
            <Ionicons name="trash-outline" size={18} color="#e74c3c" />
          </TouchableOpacity>
        )}
      </View>
      
      <Text style={styles.requestDescription}>{item.description}</Text>
      
      <View style={styles.requestFooter}>
        <View style={styles.authorInfo}>
          <Ionicons name="person-outline" size={14} color="#7f8c8d" />
                          <Text style={styles.authorText}>{item.author || t('anonymous', currentLanguage)}</Text>
        </View>
        <Text style={styles.timestamp}>
          {item.timestamp && item.timestamp.toDate ? item.timestamp.toDate().toLocaleDateString() : (new Date(item.timestamp)).toLocaleDateString()}
        </Text>
      </View>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#ffffff" />
      
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.header}>
          <TouchableOpacity
            onPress={() => navigation.goBack()}
            style={styles.backButton}
          >
            <Ionicons name="arrow-back" size={20} color="#2c3e50" />
          </TouchableOpacity>
          <View style={styles.headerTitleContainer}> 
            <Text style={styles.headerTitle}>{t('duaBoard', currentLanguage)}</Text>
            <Text style={styles.headerSubtitle}>{t('communityPrayerRequests', currentLanguage)}</Text>
          </View>
        </View>

        {/* Search Bar */}
        <View style={{ paddingHorizontal: 16, paddingTop: 10, paddingBottom: 6 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: '#1E1E1E', borderRadius: 10, paddingHorizontal: 12, paddingVertical: 8, borderWidth: 1, borderColor: '#2A2A2A' }}>
            <Ionicons name="search" size={18} color="#888" />
            <TextInput
              style={{ flex: 1, marginLeft: 8, color: '#fff', fontSize: 16 }}
              placeholder={t('searchDuaRequests', currentLanguage)}
              placeholderTextColor="#888"
              value={searchQuery}
              onChangeText={setSearchQuery}
              returnKeyType="search"
            />
            {searchQuery.length > 0 && (
              <TouchableOpacity onPress={() => setSearchQuery('')}>
                <Ionicons name="close-circle" size={18} color="#888" />
              </TouchableOpacity>
            )}
          </View>
        </View>

        <View style={styles.instructionsContainer}>
          <Text style={styles.instructionsText}>
            {t('longPressToReport', currentLanguage)}
          </Text>
        </View>

        <FlatList
          data={visibleRequests}
          renderItem={renderRequestCard}
          keyExtractor={(item) => item.id}
          contentContainerStyle={[
            styles.requestList,
            { paddingBottom: Platform.OS === 'android' ? 180 : 20 }
          ]}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            filteredRequests.length === 0 ? (
              <View style={styles.emptyContainer}>
                <Ionicons name="heart-outline" size={48} color="#bdc3c7" />
                <Text style={styles.emptyText}>{t('noPrayerRequests', currentLanguage)}</Text>
                <Text style={styles.emptySubtext}>{t('beFirstToShare', currentLanguage)}</Text>
              </View>
            ) : null
          }
          ListFooterComponent={
            visibleCount < filteredRequests.length ? (
              <TouchableOpacity
                style={styles.loadMoreButton}
                onPress={() => setVisibleCount(v => Math.min(v + PAGE_SIZE, filteredRequests.length))}
              >
                <Text style={styles.loadMoreButtonText}>{t('loadMore', currentLanguage)}</Text>
              </TouchableOpacity>
            ) : null
          }
        />

        <TouchableOpacity
          style={[styles.fab, !currentUserId && styles.fabDisabled]}
          onPress={() => {
            if (!currentUserId) {
              Alert.alert(t('authenticationRequired', currentLanguage), t('signInToAdd', currentLanguage));
              return;
            }
            setShowAddModal(true);
          }}
        >
          <Ionicons name="add" size={24} color={currentUserId ? "white" : "#666"} />
        </TouchableOpacity>

        {/* Add Request Modal */}
        <Modal
          visible={showAddModal}
          animationType="slide"
          transparent={true}
          onRequestClose={() => setShowAddModal(false)}
        >
          <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            style={styles.modalContainer}
          >
            <View style={styles.modalContent}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>{t('newPrayerRequest', currentLanguage)}</Text>
                <TouchableOpacity
                  onPress={() => setShowAddModal(false)}
                  style={styles.closeButton}
                >
                  <Ionicons name="close" size={24} color="#2c3e50" />
                </TouchableOpacity>
              </View>

              <TextInput
                style={styles.input}
                placeholder={t('title', currentLanguage)}
                value={newRequest.title}
                onChangeText={(text) => setNewRequest(prev => ({ ...prev, title: text }))}
                maxLength={50}
              />

              <TextInput
                style={[styles.input, styles.textArea]}
                placeholder={t('description', currentLanguage)}
                value={newRequest.description}
                onChangeText={(text) => setNewRequest(prev => ({ ...prev, description: text }))}
                multiline
                numberOfLines={4}
                maxLength={200}
              />

              <TouchableOpacity
                style={styles.submitButton}
                onPress={handleAddRequest}
              >
                <Text style={styles.submitButtonText}>{t('shareRequest', currentLanguage)}</Text>
              </TouchableOpacity>
            </View>
          </KeyboardAvoidingView>
        </Modal>

        {/* Report Modal */}
        <Modal
          visible={showReportModal}
          animationType="fade"
          transparent={true}
          onRequestClose={() => {
            setShowReportModal(false);
            setSelectedRequest(null);
          }}
        >
          <TouchableOpacity
            style={styles.modalContainer}
            activeOpacity={1}
            onPress={() => {
              setShowReportModal(false);
              setSelectedRequest(null);
            }}
          >
            <View style={styles.reportModalContent}>
              <TouchableOpacity
                style={styles.reportButton}
                onPress={() => {
                  setShowReportModal(false);
                  handleReport(selectedRequest);
                  setSelectedRequest(null);
                }}
              >
                <Ionicons name="flag-outline" size={20} color="#e74c3c" />
                <Text style={styles.reportButtonText}>{t('reportInappropriate', currentLanguage)}</Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={styles.cancelButton}
                onPress={() => {
                  setShowReportModal(false);
                  setSelectedRequest(null);
                }}
              >
                <Text style={styles.cancelButtonText}>{t('cancel', currentLanguage)}</Text>
              </TouchableOpacity>
            </View>
          </TouchableOpacity>
        </Modal>

        {/* Instruction Popup Modal */}
        <Modal
          visible={showInstructionPopup}
          animationType="slide"
          transparent={true}
          onRequestClose={() => {}} // Prevent back button from closing modal
        >
          <View style={styles.instructionModalContainer}>
            <View style={styles.instructionModalContent}>
              <View style={styles.instructionModalHeader}>
                <Text style={styles.instructionModalTitle}>{t('welcomeToDuaBoard', currentLanguage)}</Text>
              </View>
              
              <Text style={styles.instructionModalText}>
                {t('duaBoardWelcomeMessage', currentLanguage)}
              </Text>
              
              <View style={styles.instructionFeatures}>
                <View style={styles.instructionFeature}>
                  <Ionicons name="add-circle" size={20} color="#A3B1CC" />
                  <Text style={styles.instructionFeatureText}>{t('tapPlusToAdd', currentLanguage)}</Text>
                </View>
                <View style={styles.instructionFeature}>
                  <Ionicons name="heart" size={20} color="#A3B1CC" />
                  <Text style={styles.instructionFeatureText}>{t('tapHeartToSupport', currentLanguage)}</Text>
                </View>
                <View style={styles.instructionFeature}>
                  <Ionicons name="flag" size={20} color="#A3B1CC" />
                  <Text style={styles.instructionFeatureText}>{t('longPressToReportInstruction', currentLanguage)}</Text>
                </View>
              </View>
              
              <Animated.View style={{ transform: [{ scale: bounceAnim }] }}>
                <TouchableOpacity
                  style={styles.instructionGotItButton}
                  onPress={handleDismissInstruction}
                >
                  <Text style={styles.instructionGotItButtonText}>{t('accept', currentLanguage)}</Text>
                </TouchableOpacity>
              </Animated.View>
            </View>
          </View>
        </Modal>
      </SafeAreaView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#121212',
  },
  safeArea: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: getAndroidTopPadding(50),
    paddingHorizontal: 16,
    paddingBottom: 12,
    backgroundColor: '#121212',
    borderBottomWidth: 1,
    borderBottomColor: '#2A2A2A',
  },
  backButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#1E1E1E',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#2A2A2A',
    marginRight: 12,
  },
  headerTitleContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: -36, // Move title to the left to account for back button
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#ffffff',
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#B0B0B0',
    marginTop: 2,
  },
  requestList: {
    padding: 16,
    gap: 16,
  },
  requestCard: {
    backgroundColor: '#1E1E1E',
    borderRadius: 16,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 3,
  },
  requestHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  requestTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#ffffff',
    flex: 1,
  },
  supportButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1A2942',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    gap: 4,
  },
  supportCount: {
    fontSize: 14,
    color: '#2196F3',
    fontWeight: '600',
  },
  requestDescription: {
    fontSize: 14,
    color: '#B0B0B0',
    lineHeight: 20,
    marginBottom: 12,
  },
  requestFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#2A2A2A',
  },
  authorInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  authorText: {
    fontSize: 12,
    color: '#B0B0B0',
    fontWeight: '500',
  },
  timestamp: {
    fontSize: 12,
    color: '#B0B0B0',
  },
  fab: {
    position: 'absolute',
    right: 20,
    bottom: 20,
    backgroundColor: '#2A2A1A',
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.30,
    shadowRadius: 4.65,
    borderWidth: 1,
    borderColor: '#3A3A2A',
  },
  fabDisabled: {
    backgroundColor: '#1A1A1A',
    borderColor: '#2A2A2A',
  },
  modalContainer: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
  },
  modalContent: {
    backgroundColor: '#1E1E1E',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    maxHeight: '80%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#ffffff',
  },
  closeButton: {
    padding: 4,
  },
  input: {
    backgroundColor: '#2A2A2A',
    borderRadius: 12,
    padding: 12,
    fontSize: 16,
    color: '#ffffff',
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#3A3A3A',
  },
  textArea: {
    height: 100,
    textAlignVertical: 'top',
  },
  submitButton: {
    backgroundColor: '#2A2A1A',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    marginTop: 8,
    borderWidth: 1,
    borderColor: '#3A3A2A',
  },
  submitButtonText: {
    color: '#D4A574',
    fontSize: 16,
    fontWeight: '600',
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 40,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#ffffff',
    marginTop: 16,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#B0B0B0',
    marginTop: 8,
  },
  instructionsContainer: {
    backgroundColor: '#2A2A1A',
    padding: 12,
    marginHorizontal: 16,
    marginTop: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#3A3A2A',
  },
  instructionsText: {
    color: '#D4A574',
    fontSize: 13,
    textAlign: 'center',
  },
  pinnedInstructionContainer: {
    backgroundColor: '#1A2A3A',
    padding: 16,
    marginHorizontal: 16,
    marginTop: 12,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#3498db',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  pinnedInstructionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  pinnedInstructionTitle: {
    color: '#3498db',
    fontSize: 16,
    fontWeight: 'bold',
    marginLeft: 8,
  },
  pinnedInstructionText: {
    color: '#ffffff',
    fontSize: 14,
    lineHeight: 20,
    textAlign: 'left',
  },
  reportModalContent: {
    backgroundColor: '#1E1E1E',
    marginHorizontal: 32,
    padding: 16,
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  reportButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    gap: 12,
    backgroundColor: '#2A1A1A',
    borderRadius: 8,
    marginBottom: 8,
  },
  reportButtonText: {
    color: '#e74c3c',
    fontSize: 16,
    fontWeight: '600',
  },
  cancelButton: {
    padding: 16,
    alignItems: 'center',
  },
  cancelButtonText: {
    color: '#B0B0B0',
    fontSize: 16,
    fontWeight: '600',
  },
  loadMoreButton: {
    padding: 16,
    alignItems: 'center',
    backgroundColor: '#2A2A1A',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#3A3A2A',
    marginTop: 16,
    marginBottom: 20,
  },
  loadMoreButtonText: {
    color: '#D4A574',
    fontSize: 16,
    fontWeight: '600',
  },
  instructionModalContainer: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  instructionModalContent: {
    backgroundColor: '#181818',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    paddingBottom: 24,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: -4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 10,
  },
  instructionModalHeader: {
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },

  instructionModalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#FFFFFF',
    textAlign: 'center',
  },

  instructionModalText: {
    fontSize: 16,
    color: '#A3B1CC',
    lineHeight: 24,
    textAlign: 'center',
    marginBottom: 24,
  },
  instructionFeatures: {
    marginBottom: 20,
  },
  instructionFeature: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    paddingHorizontal: 8,
  },
  instructionFeatureText: {
    fontSize: 14,
    color: '#fff',
    marginLeft: 12,
    flex: 1,
    lineHeight: 20,
  },
  instructionGotItButton: {
    backgroundColor: 'transparent',
    borderRadius: 20,
    padding: 20,
    alignItems: 'center',
    minHeight: 60,
  },
  instructionGotItButtonText: {
    color: '#fff',
    fontSize: 24,
    fontWeight: '600',
    letterSpacing: 0.3,
    textAlign: 'center',
    fontStyle: 'italic',
    fontFamily: 'System',
    textShadowColor: '#fff',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 10,
  },
});

export default DuaBoardScreen; 