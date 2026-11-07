import React, { useState, useEffect, useRef, useCallback } from 'react';
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
  ActivityIndicator,
  ScrollView,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { firestore, auth } from '../firebase';
import { onAuthStateChanged } from 'firebase/auth';
import { collection, addDoc, onSnapshot, serverTimestamp, query, orderBy, doc, updateDoc, deleteDoc, getDoc, Timestamp, increment } from 'firebase/firestore';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useLanguage } from '../utils/useLanguage';
import { t } from '../utils/translations';
import { getAndroidTopPadding } from '../utils/languageResponsiveSizing';
import { useFocusEffect, useRoute } from '@react-navigation/native';
import { getAuthEmail, isCreatorUser, isCreatorAuthor } from '../config/donateConfig';
import { toggleDuaRequestSupport } from '../services/duaBoardService';

const GOLD_GRADIENT = ['#FFE566', '#F5D76E', '#D4AF37'];

const formatRequestDate = (timestamp) => {
  if (!timestamp) return '';
  const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
  const diffDays = Math.floor((Date.now() - date.getTime()) / (1000 * 60 * 60 * 24));
  if (diffDays === 0) return 'Today';
  if (diffDays === 1) return 'Yesterday';
  if (diffDays < 7) return `${diffDays}d ago`;
  return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
};

const getTimestampMs = (timestamp) => {
  if (!timestamp) return 0;
  if (timestamp.toDate) return timestamp.toDate().getTime();
  return new Date(timestamp).getTime();
};

const SORT_FILTERS = [
  { id: 'recent', labelKey: 'duaSortRecent', icon: 'time-outline' },
  { id: 'mostLiked', labelKey: 'duaSortMostLiked', icon: 'heart-outline' },
  { id: 'mostComments', labelKey: 'duaSortMostComments', icon: 'chatbubble-outline' },
];

const DuaBoardScreen = ({ navigation }) => {
  const route = useRoute();
  // Language support
  const { currentLanguage } = useLanguage();
  
  const [prayerRequests, setPrayerRequests] = useState([]);
  const [isLoadingRequests, setIsLoadingRequests] = useState(true);
  const [loadError, setLoadError] = useState(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showReportModal, setShowReportModal] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [selectedComment, setSelectedComment] = useState(null);
  const [newRequest, setNewRequest] = useState({
    title: '',
    description: '',
  });
  const [userFirstName, setUserFirstName] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [sortFilter, setSortFilter] = useState('recent');
  const [showSortModal, setShowSortModal] = useState(false);
  const [detailRequest, setDetailRequest] = useState(null);
  const [comments, setComments] = useState([]);
  const [commentsLoading, setCommentsLoading] = useState(false);
  const [newComment, setNewComment] = useState('');
  const [postingComment, setPostingComment] = useState(false);
  const [authUser, setAuthUser] = useState(auth.currentUser);
  const [resolvedEmail, setResolvedEmail] = useState(getAuthEmail(auth.currentUser));
  const patchedRequestIds = useRef(new Set());
  const patchedCommentIds = useRef(new Set());
  // Pagination state
  const PAGE_SIZE = 25;
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);

  const searchFilteredRequests = prayerRequests.filter((req) =>
    req.title && req.title.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredRequests = [...searchFilteredRequests].sort((a, b) => {
    if (sortFilter === 'mostLiked') {
      return (b.supporters?.length || 0) - (a.supporters?.length || 0);
    }
    if (sortFilter === 'mostComments') {
      return (b.commentCount || 0) - (a.commentCount || 0);
    }
    return getTimestampMs(b.timestamp) - getTimestampMs(a.timestamp);
  });

  const visibleRequests = filteredRequests.slice(0, visibleCount);

  // Reset visibleCount when requests, search, or sort changes
  useEffect(() => {
    setVisibleCount(PAGE_SIZE);
  }, [prayerRequests, searchQuery, sortFilter]);

  const currentUserId = authUser?.uid || null;
  const creatorEmail = resolvedEmail || getAuthEmail(authUser);
  const isCreatorAccount = isCreatorUser(authUser);
  const showCreatorAuthorBadge = (data) => isCreatorAuthor(data);

  const CreatorBadge = () => (
    <View style={styles.creatorBadge}>
      <Text style={styles.creatorBadgeText}>{t('creator', currentLanguage)}</Text>
    </View>
  );

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setAuthUser(user);
      setResolvedEmail(getAuthEmail(user));
    });
    return unsubscribe;
  }, []);

  useEffect(() => {
    const loadStoredEmail = async () => {
      if (resolvedEmail) return;
      try {
        const storedProfile = await AsyncStorage.getItem('userProfile');
        if (!storedProfile) return;
        const profile = JSON.parse(storedProfile);
        if (profile.email) {
          setResolvedEmail(profile.email);
        }
      } catch (error) {
        console.warn('Could not load stored profile email:', error);
      }
    };
    loadStoredEmail();
  }, [resolvedEmail]);

  const backfillCreatorMetadata = useCallback(async (requests) => {
    if (!isCreatorAccount || !currentUserId) return;

    const email = resolvedEmail || getAuthEmail(authUser);
    const requestsToPatch = requests.filter(
      (request) => request.authorId === currentUserId
        && !patchedRequestIds.current.has(request.id)
        && !request.isCreator
    );

    for (const request of requestsToPatch.slice(0, 8)) {
      try {
        await updateDoc(doc(firestore, 'duaBoard', request.id), {
          isCreator: true,
          ...(email ? { authorEmail: email } : {}),
        });
        patchedRequestIds.current.add(request.id);
      } catch (error) {
        console.warn('Could not backfill creator metadata for request:', request.id, error);
      }
    }
  }, [authUser, currentUserId, isCreatorAccount, resolvedEmail]);

  useEffect(() => {
    if (!isCreatorAccount || prayerRequests.length === 0) return;
    backfillCreatorMetadata(prayerRequests);
  }, [backfillCreatorMetadata, isCreatorAccount, prayerRequests]);

  useEffect(() => {
    if (!isCreatorAccount || !currentUserId || !detailRequest?.id || comments.length === 0) {
      return undefined;
    }

    const email = resolvedEmail || getAuthEmail(authUser);
    let cancelled = false;

    const backfillComments = async () => {
      const commentsToPatch = comments.filter(
        (comment) => comment.authorId === currentUserId
          && !patchedCommentIds.current.has(comment.id)
          && !comment.isCreator
      );

      for (const comment of commentsToPatch.slice(0, 8)) {
        if (cancelled) return;
        try {
          await updateDoc(doc(firestore, 'duaBoard', detailRequest.id, 'comments', comment.id), {
            isCreator: true,
            ...(email ? { authorEmail: email } : {}),
          });
          patchedCommentIds.current.add(comment.id);
        } catch (error) {
          console.warn('Could not backfill creator metadata for comment:', comment.id, error);
        }
      }
    };

    backfillComments();
    return () => {
      cancelled = true;
    };
  }, [authUser, comments, currentUserId, detailRequest?.id, isCreatorAccount, resolvedEmail]);

  useEffect(() => {
    setIsLoadingRequests(true);
    setLoadError(null);

    const q = query(collection(firestore, 'duaBoard'), orderBy('timestamp', 'desc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const requests = snapshot.docs.map((docSnap) => ({ id: docSnap.id, ...docSnap.data() }));
      setPrayerRequests(requests);
      setIsLoadingRequests(false);
      setLoadError(null);
    }, (error) => {
      console.error('Error in dua board listener:', error);
      setIsLoadingRequests(false);
      if (error.code === 'permission-denied') {
        setPrayerRequests([]);
        setLoadError('permission-denied');
        return;
      }
      setLoadError('unknown');
    });
    return unsubscribe;
  }, []);

  useEffect(() => {
    if (!detailRequest?.id) {
      setComments([]);
      return undefined;
    }

    setCommentsLoading(true);
    const commentsQuery = query(
      collection(firestore, 'duaBoard', detailRequest.id, 'comments'),
      orderBy('timestamp', 'asc')
    );

    const unsubscribe = onSnapshot(commentsQuery, (snapshot) => {
      setComments(snapshot.docs.map((docSnap) => ({ id: docSnap.id, ...docSnap.data() })));
      setCommentsLoading(false);
    }, (error) => {
      console.error('Error loading comments:', error);
      setCommentsLoading(false);
    });

    return unsubscribe;
  }, [detailRequest?.id]);

  useEffect(() => {
    if (!detailRequest?.id) return;
    const updated = prayerRequests.find((r) => r.id === detailRequest.id);
    if (updated) {
      setDetailRequest(updated);
    }
  }, [prayerRequests, detailRequest?.id]);

  useEffect(() => {
    const openRequestId = route.params?.openRequestId;
    if (!openRequestId || prayerRequests.length === 0) return;

    const request = prayerRequests.find((item) => item.id === openRequestId);
    if (request) {
      setDetailRequest(request);
      setNewComment('');
      navigation.setParams({ openRequestId: undefined });
    }
  }, [navigation, prayerRequests, route.params?.openRequestId]);

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
        authorId: currentUserId,
        authorEmail: creatorEmail,
        isCreator: isCreatorAccount,
        timestamp: new Date(),
        supporters: [],
        reportCount: 0,
        reportedBy: [],
        commentCount: 0,
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
      await toggleDuaRequestSupport(id, currentUserId);
    } catch (e) {
      if (e?.message === 'SIGN_IN_REQUIRED') {
        Alert.alert(t('authenticationRequired', currentLanguage), t('signInToSupport', currentLanguage));
        return;
      }
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

  const closeReportModal = () => {
    setShowReportModal(false);
    setSelectedRequest(null);
    setSelectedComment(null);
  };

  const handleReportComment = async (comment) => {
    if (!currentUserId) {
      Alert.alert(t('authenticationRequired', currentLanguage), t('signInToReportComment', currentLanguage));
      return;
    }
    if (!detailRequest?.id || !comment?.id) return;

    if (comment.reportedBy && comment.reportedBy.includes(currentUserId)) {
      Alert.alert(t('alreadyReported', currentLanguage), t('alreadyReportedCommentMessage', currentLanguage));
      return;
    }

    try {
      const newReportedBy = [...(comment.reportedBy || []), currentUserId];
      const newReportCount = (comment.reportCount || 0) + 1;
      const commentRef = doc(firestore, 'duaBoard', detailRequest.id, 'comments', comment.id);

      if (newReportCount >= 3) {
        await deleteDoc(commentRef);
        await updateDoc(doc(firestore, 'duaBoard', detailRequest.id), {
          commentCount: increment(-1),
        });
        Alert.alert(t('commentRemoved', currentLanguage), t('commentRemovedMessage', currentLanguage));
      } else {
        await updateDoc(commentRef, {
          reportCount: newReportCount,
          reportedBy: newReportedBy,
        });
        Alert.alert(t('reportSubmitted', currentLanguage), t('commentReportSubmittedMessage', currentLanguage));
      }
    } catch (e) {
      console.error('Error reporting comment:', e);
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

  const openRequestDetail = (request) => {
    setDetailRequest(request);
    setNewComment('');
  };

  const closeRequestDetail = () => {
    setDetailRequest(null);
    setNewComment('');
    setComments([]);
  };

  const handleAddComment = async () => {
    if (!currentUserId) {
      Alert.alert(t('authenticationRequired', currentLanguage), t('signInToComment', currentLanguage));
      return;
    }
    if (!detailRequest?.id) return;

    const text = newComment.trim();
    if (!text) return;

    try {
      setPostingComment(true);
      await addDoc(collection(firestore, 'duaBoard', detailRequest.id, 'comments'), {
        text,
        author: userFirstName,
        authorId: currentUserId,
        authorEmail: creatorEmail,
        isCreator: isCreatorAccount,
        timestamp: serverTimestamp(),
        supporters: [],
        reportCount: 0,
        reportedBy: [],
      });
      await updateDoc(doc(firestore, 'duaBoard', detailRequest.id), {
        commentCount: increment(1),
      });
      setNewComment('');
    } catch (e) {
      console.error('Error adding comment:', e);
      Alert.alert(t('error', currentLanguage), t('couldNotAddComment', currentLanguage));
    } finally {
      setPostingComment(false);
    }
  };

  const handleCommentLike = async (comment) => {
    if (!currentUserId) {
      Alert.alert(t('authenticationRequired', currentLanguage), t('signInToLikeComment', currentLanguage));
      return;
    }
    if (!detailRequest?.id || !comment?.id) return;

    try {
      const commentRef = doc(firestore, 'duaBoard', detailRequest.id, 'comments', comment.id);
      const commentSnap = await getDoc(commentRef);
      if (!commentSnap.exists()) return;

      const data = commentSnap.data();
      const supporters = data.supporters || [];
      const wasLiked = supporters.includes(currentUserId);
      const newSupporters = wasLiked
        ? supporters.filter((uid) => uid !== currentUserId)
        : [...supporters, currentUserId];

      await updateDoc(commentRef, { supporters: newSupporters });
    } catch (e) {
      console.error('Error liking comment:', e);
      Alert.alert(t('error', currentLanguage), t('couldNotUpdateLike', currentLanguage));
    }
  };

  const handleDeleteComment = (comment) => {
    if (!currentUserId) {
      Alert.alert(t('authenticationRequired', currentLanguage), t('signInToDeleteComment', currentLanguage));
      return;
    }
    if (comment.authorId !== currentUserId) {
      Alert.alert(t('unauthorized', currentLanguage), t('canOnlyDeleteOwnComment', currentLanguage));
      return;
    }
    if (!detailRequest?.id) return;

    Alert.alert(
      t('deleteComment', currentLanguage),
      t('deleteCommentConfirm', currentLanguage),
      [
        { text: t('cancel', currentLanguage), style: 'cancel' },
        {
          text: t('delete', currentLanguage),
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteDoc(doc(firestore, 'duaBoard', detailRequest.id, 'comments', comment.id));
              await updateDoc(doc(firestore, 'duaBoard', detailRequest.id), {
                commentCount: increment(-1),
              });
            } catch (e) {
              console.error('Error deleting comment:', e);
              Alert.alert(t('error', currentLanguage), t('couldNotDeleteComment', currentLanguage));
            }
          },
        },
      ]
    );
  };

  const renderTopBar = () => (
    <View style={styles.topSection}>
      <View style={styles.topBar}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={20} color="#D4AF37" />
        </TouchableOpacity>
        <View style={styles.searchBar}>
          <Ionicons name="search" size={18} color="#888" />
          <TextInput
            style={styles.searchInput}
            placeholder={t('searchDuaRequests', currentLanguage)}
            placeholderTextColor="#666"
            value={searchQuery}
            onChangeText={setSearchQuery}
            returnKeyType="search"
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery('')} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <Ionicons name="close-circle" size={18} color="#666" />
            </TouchableOpacity>
          )}
        </View>
        <TouchableOpacity
          style={[styles.filterButton, sortFilter !== 'recent' && styles.filterButtonActive]}
          onPress={() => setShowSortModal(true)}
          activeOpacity={0.75}
        >
          <Ionicons
            name="options-outline"
            size={18}
            color={sortFilter !== 'recent' ? '#D4AF37' : '#AAA'}
          />
        </TouchableOpacity>
      </View>
      <View style={styles.instructionsContainer}>
        <Ionicons name="information-circle-outline" size={15} color="#D4AF37" />
        <Text style={styles.instructionsText}>{t('longPressToReport', currentLanguage)}</Text>
      </View>
    </View>
  );

  const renderRequestCard = ({ item }) => {
    const isSupported = item.supporters?.includes(currentUserId);
    const supportCount = item.supporters?.length || 0;
    const isOwn = item.authorId === currentUserId;
    const commentCount = item.commentCount || 0;

    return (
      <View style={styles.requestCard}>
        <View style={styles.requestHeader}>
          <TouchableOpacity
            style={styles.requestTitlePress}
            activeOpacity={0.85}
            onPress={() => openRequestDetail(item)}
            onLongPress={() => {
              setSelectedComment(null);
              setSelectedRequest(item);
              setShowReportModal(true);
            }}
          >
            <Text style={styles.requestTitle} numberOfLines={2}>{item.title}</Text>
          </TouchableOpacity>
          <View style={styles.cardActions}>
            <TouchableOpacity
              style={styles.supportPill}
              onPress={() => handleSupport(item.id)}
              activeOpacity={0.6}
            >
              <Ionicons
                name={isSupported ? 'heart' : 'heart-outline'}
                size={15}
                color={isSupported ? '#FF6B6B' : '#888'}
              />
              <Text style={[styles.supportCount, isSupported && styles.supportCountActive]}>
                {supportCount}
              </Text>
            </TouchableOpacity>
            {isOwn && (
              <TouchableOpacity
                style={styles.deleteBtn}
                onPress={() => handleDelete(item)}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <Ionicons name="trash-outline" size={16} color="#777" />
              </TouchableOpacity>
            )}
          </View>
        </View>

        <TouchableOpacity
          activeOpacity={0.85}
          onPress={() => openRequestDetail(item)}
          onLongPress={() => {
            setSelectedComment(null);
            setSelectedRequest(item);
            setShowReportModal(true);
          }}
        >
          <Text style={styles.requestDescription} numberOfLines={4}>{item.description}</Text>

          <View style={styles.requestFooter}>
            <View style={styles.authorNameRow}>
              <Text style={styles.authorText}>{item.author || t('anonymous', currentLanguage)}</Text>
              {showCreatorAuthorBadge(item) && <CreatorBadge />}
            </View>
            <Text style={styles.timestamp}>{formatRequestDate(item.timestamp)}</Text>
          </View>

          <View style={styles.commentPreviewRow}>
            <Ionicons name="chatbubble-outline" size={14} color="#888" />
            <Text style={styles.commentPreviewText}>
              {commentCount} {commentCount === 1 ? t('comment', currentLanguage) : t('commentsCount', currentLanguage)}
            </Text>
            <Ionicons name="chevron-forward" size={14} color="#666" />
          </View>
        </TouchableOpacity>
      </View>
    );
  };

  const renderCommentItem = (comment) => {
    const isOwnComment = comment.authorId === currentUserId;
    const isLiked = comment.supporters?.includes(currentUserId);
    const likeCount = comment.supporters?.length || 0;
    return (
      <View key={comment.id} style={styles.commentItem}>
        <View style={styles.commentHeader}>
          <View style={styles.commentAuthorBlock}>
            <Text style={styles.commentAuthor} numberOfLines={1}>
              {comment.author || t('anonymous', currentLanguage)}
            </Text>
            {showCreatorAuthorBadge(comment) && <CreatorBadge />}
          </View>
          <View style={styles.commentHeaderRight}>
            <Text style={styles.commentDate}>{formatRequestDate(comment.timestamp)}</Text>
            <TouchableOpacity
              style={styles.commentLikeButton}
              onPress={() => handleCommentLike(comment)}
              activeOpacity={0.6}
            >
              <Ionicons
                name={isLiked ? 'heart' : 'heart-outline'}
                size={14}
                color={isLiked ? '#FF6B6B' : '#888'}
              />
              {likeCount > 0 && (
                <Text style={[styles.commentLikeCount, isLiked && styles.supportCountActive]}>
                  {likeCount}
                </Text>
              )}
            </TouchableOpacity>
          </View>
        </View>

        <TouchableOpacity
          activeOpacity={0.9}
          onLongPress={() => {
            setSelectedRequest(null);
            setSelectedComment(comment);
            setShowReportModal(true);
          }}
        >
          <Text style={styles.commentText}>{comment.text}</Text>
        </TouchableOpacity>

        {isOwnComment && (
          <TouchableOpacity
            onPress={() => handleDeleteComment(comment)}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            style={styles.commentRemoveButton}
          >
            <Text style={styles.commentRemoveText}>{t('remove', currentLanguage)}</Text>
          </TouchableOpacity>
        )}
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#0D0D0D" />

      <SafeAreaView style={styles.safeArea}>
        {renderTopBar()}

        {isLoadingRequests ? (
          <View style={styles.emptyContainer}>
            <ActivityIndicator size="large" color="#D4AF37" />
            <Text style={styles.emptySubtext}>{t('loading', currentLanguage) || 'Loading...'}</Text>
          </View>
        ) : loadError === 'permission-denied' ? (
          <View style={styles.emptyContainer}>
            <Ionicons name="lock-closed-outline" size={36} color="#D4AF37" />
            <Text style={styles.emptyText}>{t('signInRequiredTitle', currentLanguage)}</Text>
            <Text style={styles.emptySubtext}>{t('signInViaSettingsMessage', currentLanguage)}</Text>
            <TouchableOpacity
              style={styles.signInButton}
              onPress={() => navigation.getParent()?.navigate('Profile', { screen: 'LoginPreview' })}
            >
              <LinearGradient colors={GOLD_GRADIENT} style={styles.signInButtonGradient}>
                <Text style={styles.signInButtonText}>{t('goToSettings', currentLanguage)}</Text>
              </LinearGradient>
            </TouchableOpacity>
          </View>
        ) : (
          <FlatList
            data={visibleRequests}
            renderItem={renderRequestCard}
            keyExtractor={(item) => item.id}
            contentContainerStyle={[
              styles.requestList,
              { paddingBottom: Platform.OS === 'android' ? 180 : 100 },
            ]}
            showsVerticalScrollIndicator={false}
            ListEmptyComponent={
              filteredRequests.length === 0 ? (
                <View style={styles.emptyContainer}>
                  <View style={styles.emptyIconRing}>
                    <Ionicons name="heart-outline" size={40} color="#D4AF37" />
                  </View>
                  <Text style={styles.emptyText}>{t('noPrayerRequests', currentLanguage)}</Text>
                  <Text style={styles.emptySubtext}>{t('beFirstToShare', currentLanguage)}</Text>
                </View>
              ) : null
            }
            ListFooterComponent={
              visibleCount < filteredRequests.length ? (
                <TouchableOpacity
                  style={styles.loadMoreButton}
                  onPress={() => setVisibleCount((v) => Math.min(v + PAGE_SIZE, filteredRequests.length))}
                  activeOpacity={0.8}
                >
                  <Text style={styles.loadMoreButtonText}>{t('loadMore', currentLanguage)}</Text>
                  <Ionicons name="chevron-down" size={16} color="#D4AF37" />
                </TouchableOpacity>
              ) : null
            }
          />
        )}

        <TouchableOpacity
          style={styles.fabWrap}
          activeOpacity={0.9}
          onPress={() => {
            if (!currentUserId) {
              Alert.alert(t('authenticationRequired', currentLanguage), t('signInToAdd', currentLanguage));
              return;
            }
            setShowAddModal(true);
          }}
        >
          <LinearGradient
            colors={currentUserId ? GOLD_GRADIENT : ['#2A2A2A', '#1A1A1A']}
            style={[styles.fab, !currentUserId && styles.fabDisabled]}
          >
            <Ionicons name="add" size={28} color={currentUserId ? '#1A1A1A' : '#555'} />
          </LinearGradient>
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
              <View style={styles.modalHandle} />
              <View style={styles.modalHeader}>
                <View>
                  <Text style={styles.modalEyebrow}>{t('duaBoard', currentLanguage).toUpperCase()}</Text>
                  <Text style={styles.modalTitle}>{t('newPrayerRequest', currentLanguage)}</Text>
                </View>
                <TouchableOpacity onPress={() => setShowAddModal(false)} style={styles.modalCloseBtn}>
                  <Ionicons name="close" size={22} color="#888" />
                </TouchableOpacity>
              </View>

              <Text style={styles.fieldLabel}>{t('title', currentLanguage)}</Text>
              <TextInput
                style={styles.input}
                placeholder={t('title', currentLanguage)}
                placeholderTextColor="#555"
                value={newRequest.title}
                onChangeText={(text) => setNewRequest((prev) => ({ ...prev, title: text }))}
                maxLength={50}
              />
              <Text style={styles.charCount}>{newRequest.title.length}/50</Text>

              <Text style={styles.fieldLabel}>{t('description', currentLanguage)}</Text>
              <TextInput
                style={[styles.input, styles.textArea]}
                placeholder={t('description', currentLanguage)}
                placeholderTextColor="#555"
                value={newRequest.description}
                onChangeText={(text) => setNewRequest((prev) => ({ ...prev, description: text }))}
                multiline
                numberOfLines={4}
                maxLength={200}
              />
              <Text style={styles.charCount}>{newRequest.description.length}/200</Text>

              <TouchableOpacity style={styles.submitButtonWrap} onPress={handleAddRequest} activeOpacity={0.85}>
                <LinearGradient colors={GOLD_GRADIENT} style={styles.submitButton}>
                  <Ionicons name="paper-plane" size={18} color="#1A1A1A" />
                  <Text style={styles.submitButtonText}>{t('shareRequest', currentLanguage)}</Text>
                </LinearGradient>
              </TouchableOpacity>
            </View>
          </KeyboardAvoidingView>
        </Modal>

        {/* Request Detail + Comments Modal */}
        <Modal
          visible={!!detailRequest}
          animationType="slide"
          onRequestClose={closeRequestDetail}
        >
          <View style={styles.detailContainer}>
            <SafeAreaView style={styles.detailSafeArea}>
              <View style={styles.detailHeader}>
                <TouchableOpacity onPress={closeRequestDetail} style={styles.backButton}>
                  <Ionicons name="arrow-back" size={20} color="#D4AF37" />
                </TouchableOpacity>
                <Text style={styles.detailHeaderTitle} numberOfLines={1}>
                  {detailRequest?.title}
                </Text>
                {detailRequest && (
                  <View style={styles.detailHeaderActions}>
                    <TouchableOpacity
                      style={styles.detailHeaderLike}
                      onPress={() => handleSupport(detailRequest.id)}
                      activeOpacity={0.6}
                    >
                      <Ionicons
                        name={detailRequest.supporters?.includes(currentUserId) ? 'heart' : 'heart-outline'}
                        size={16}
                        color={detailRequest.supporters?.includes(currentUserId) ? '#FF6B6B' : '#888'}
                      />
                      <Text
                        style={[
                          styles.detailHeaderLikeCount,
                          detailRequest.supporters?.includes(currentUserId) && styles.supportCountActive,
                        ]}
                      >
                        {detailRequest.supporters?.length || 0}
                      </Text>
                    </TouchableOpacity>
                  </View>
                )}
              </View>

              <KeyboardAvoidingView
                style={styles.detailBody}
                behavior={Platform.OS === 'ios' ? 'padding' : undefined}
                keyboardVerticalOffset={Platform.OS === 'ios' ? 8 : 0}
              >
                <ScrollView
                  style={styles.detailScroll}
                  contentContainerStyle={styles.detailScrollContent}
                  showsVerticalScrollIndicator={false}
                  keyboardShouldPersistTaps="handled"
                >
                  {detailRequest && (
                    <View style={styles.detailRequestBlock}>
                      <View style={styles.detailAuthorRow}>
                        <Text style={styles.detailAuthorName}>
                          {detailRequest.author || t('anonymous', currentLanguage)}
                        </Text>
                        {showCreatorAuthorBadge(detailRequest) && <CreatorBadge />}
                      </View>
                      <Text style={styles.detailDescription}>{detailRequest.description}</Text>
                      <Text style={styles.detailTimestamp}>
                        {formatRequestDate(detailRequest.timestamp)}
                      </Text>
                    </View>
                  )}

                  <Text style={styles.commentsSectionTitle}>{t('comments', currentLanguage)}</Text>
                  <View style={styles.commentReportHint}>
                    <Ionicons name="information-circle-outline" size={14} color="#D4AF37" />
                    <Text style={styles.commentReportHintText}>{t('longPressCommentToReport', currentLanguage)}</Text>
                  </View>

                  {commentsLoading ? (
                    <ActivityIndicator size="small" color="#D4AF37" style={{ marginVertical: 16 }} />
                  ) : comments.length === 0 ? (
                    <Text style={styles.noCommentsText}>{t('noCommentsYet', currentLanguage)}</Text>
                  ) : (
                    comments.map(renderCommentItem)
                  )}
                </ScrollView>

                <View style={styles.commentInputRow}>
                  <TextInput
                    style={styles.commentInput}
                    placeholder={t('addComment', currentLanguage)}
                    placeholderTextColor="#666"
                    value={newComment}
                    onChangeText={setNewComment}
                    multiline
                    maxLength={300}
                  />
                  <TouchableOpacity
                    style={[styles.postCommentBtn, (!newComment.trim() || postingComment) && styles.postCommentBtnDisabled]}
                    onPress={handleAddComment}
                    disabled={!newComment.trim() || postingComment}
                    activeOpacity={0.8}
                  >
                    {postingComment ? (
                      <ActivityIndicator size="small" color="#1A1A1A" />
                    ) : (
                      <Text style={styles.postCommentText}>{t('postComment', currentLanguage)}</Text>
                    )}
                  </TouchableOpacity>
                </View>
              </KeyboardAvoidingView>
            </SafeAreaView>
          </View>
        </Modal>

        {/* Sort Filter Modal */}
        <Modal
          visible={showSortModal}
          animationType="fade"
          transparent
          onRequestClose={() => setShowSortModal(false)}
        >
          <TouchableOpacity
            style={styles.sortModalOverlay}
            activeOpacity={1}
            onPress={() => setShowSortModal(false)}
          >
            <TouchableOpacity activeOpacity={1} onPress={() => {}}>
              <View style={styles.sortModalContent}>
              <Text style={styles.sortModalTitle}>{t('duaSortBy', currentLanguage)}</Text>
              {SORT_FILTERS.map((option) => {
                const isActive = sortFilter === option.id;
                return (
                  <TouchableOpacity
                    key={option.id}
                    style={[styles.sortOption, isActive && styles.sortOptionActive]}
                    onPress={() => {
                      setSortFilter(option.id);
                      setShowSortModal(false);
                    }}
                    activeOpacity={0.75}
                  >
                    <Ionicons
                      name={option.icon}
                      size={18}
                      color={isActive ? '#D4AF37' : '#AAA'}
                    />
                    <Text style={[styles.sortOptionText, isActive && styles.sortOptionTextActive]}>
                      {t(option.labelKey, currentLanguage)}
                    </Text>
                    {isActive && <Ionicons name="checkmark" size={18} color="#D4AF37" />}
                  </TouchableOpacity>
                );
              })}
              <TouchableOpacity
                style={styles.cancelButton}
                onPress={() => setShowSortModal(false)}
              >
                <Text style={styles.cancelButtonText}>{t('cancel', currentLanguage)}</Text>
              </TouchableOpacity>
              </View>
            </TouchableOpacity>
          </TouchableOpacity>
        </Modal>

        {/* Report Modal */}
        <Modal
          visible={showReportModal}
          animationType="fade"
          transparent={true}
          onRequestClose={closeReportModal}
        >
          <TouchableOpacity
            style={styles.modalContainer}
            activeOpacity={1}
            onPress={closeReportModal}
          >
            <View style={styles.reportModalContent}>
              <TouchableOpacity
                style={styles.reportButton}
                onPress={() => {
                  setShowReportModal(false);
                  if (selectedComment) {
                    handleReportComment(selectedComment);
                  } else {
                    handleReport(selectedRequest);
                  }
                  setSelectedRequest(null);
                  setSelectedComment(null);
                }}
              >
                <Ionicons name="flag-outline" size={20} color="#e74c3c" />
                <Text style={styles.reportButtonText}>{t('reportInappropriate', currentLanguage)}</Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={styles.cancelButton}
                onPress={closeReportModal}
              >
                <Text style={styles.cancelButtonText}>{t('cancel', currentLanguage)}</Text>
              </TouchableOpacity>
            </View>
          </TouchableOpacity>
        </Modal>

      </SafeAreaView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0D0D0D',
  },
  safeArea: {
    flex: 1,
  },
  topSection: {
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.06)',
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: getAndroidTopPadding(8),
    paddingHorizontal: 16,
    paddingBottom: 10,
    gap: 10,
  },
  instructionsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginHorizontal: 16,
    marginBottom: 10,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 10,
    backgroundColor: 'rgba(212, 175, 55, 0.06)',
    borderWidth: 1,
    borderColor: 'rgba(212, 175, 55, 0.12)',
  },
  instructionsText: {
    flex: 1,
    color: '#AAA',
    fontSize: 12,
    lineHeight: 17,
  },
  backButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  searchBar: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    gap: 8,
  },
  searchInput: {
    flex: 1,
    color: '#FFFFFF',
    fontSize: 15,
  },
  filterButton: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.06)',
  },
  filterButtonActive: {
    backgroundColor: 'rgba(212, 175, 55, 0.12)',
    borderColor: 'rgba(212, 175, 55, 0.35)',
  },
  sortModalOverlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
    paddingHorizontal: 28,
  },
  sortModalContent: {
    backgroundColor: '#1A1A1A',
    borderRadius: 16,
    padding: 16,
    width: 320,
    maxWidth: '100%',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.35,
    shadowRadius: 16,
    elevation: 10,
  },
  sortModalTitle: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 12,
    textAlign: 'center',
  },
  sortOption: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderRadius: 10,
    marginBottom: 6,
  },
  sortOptionActive: {
    backgroundColor: 'rgba(212, 175, 55, 0.1)',
  },
  sortOptionText: {
    flex: 1,
    color: '#CCC',
    fontSize: 15,
    fontWeight: '500',
  },
  sortOptionTextActive: {
    color: '#D4AF37',
    fontWeight: '600',
  },
  requestList: {
    padding: 16,
    gap: 14,
  },
  requestCard: {
    backgroundColor: '#161616',
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.06)',
  },
  requestHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: 8,
    gap: 8,
  },
  requestTitlePress: {
    flex: 1,
  },
  commentPreviewRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.06)',
  },
  commentPreviewText: {
    flex: 1,
    fontSize: 13,
    color: '#888',
    fontWeight: '500',
  },
  cardActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  supportPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 4,
    paddingVertical: 4,
  },
  supportCount: {
    fontSize: 13,
    color: '#888',
    fontWeight: '600',
  },
  supportCountActive: {
    color: '#FF6B6B',
  },
  deleteBtn: {
    padding: 4,
  },
  requestTitle: {
    flex: 1,
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
    lineHeight: 21,
  },
  requestDescription: {
    fontSize: 14,
    color: '#AAA',
    lineHeight: 20,
    marginBottom: 12,
  },
  requestFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.06)',
  },
  authorNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flexShrink: 1,
  },
  authorText: {
    fontSize: 12,
    color: '#888',
    fontWeight: '500',
  },
  creatorBadge: {
    backgroundColor: 'rgba(212, 175, 55, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(212, 175, 55, 0.45)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  creatorBadgeText: {
    color: '#D4AF37',
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.3,
    textTransform: 'uppercase',
  },
  timestamp: {
    fontSize: 12,
    color: '#666',
  },
  detailContainer: {
    flex: 1,
    backgroundColor: '#0D0D0D',
  },
  detailSafeArea: {
    flex: 1,
  },
  detailHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.06)',
    gap: 10,
  },
  detailHeaderTitle: {
    flex: 1,
    fontSize: 17,
    fontWeight: '700',
    color: '#FFFFFF',
    textAlign: 'center',
    marginHorizontal: 4,
  },
  detailHeaderActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    minWidth: 38,
    justifyContent: 'flex-end',
  },
  detailHeaderLike: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 4,
    paddingLeft: 4,
  },
  detailHeaderLikeCount: {
    fontSize: 13,
    color: '#888',
    fontWeight: '600',
    minWidth: 12,
  },
  detailBody: {
    flex: 1,
  },
  detailScroll: {
    flex: 1,
  },
  detailScrollContent: {
    padding: 16,
    paddingBottom: 24,
  },
  detailRequestBlock: {
    backgroundColor: '#161616',
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.06)',
    marginBottom: 20,
  },
  detailAuthorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: 10,
  },
  detailAuthorName: {
    fontSize: 14,
    color: '#DDD',
    fontWeight: '600',
  },
  detailDescription: {
    fontSize: 15,
    color: '#CCC',
    lineHeight: 22,
    marginBottom: 12,
  },
  detailTimestamp: {
    fontSize: 12,
    color: '#666',
    alignSelf: 'flex-end',
  },
  commentReportHint: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 12,
    paddingHorizontal: 2,
  },
  commentReportHintText: {
    flex: 1,
    fontSize: 12,
    color: '#888',
    lineHeight: 16,
  },
  commentsSectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 12,
  },
  noCommentsText: {
    fontSize: 14,
    color: '#888',
    lineHeight: 20,
    marginBottom: 8,
  },
  commentItem: {
    backgroundColor: '#161616',
    borderRadius: 12,
    padding: 12,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.05)',
  },
  commentHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 12,
    marginBottom: 8,
  },
  commentAuthorBlock: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 6,
  },
  commentAuthor: {
    fontSize: 13,
    fontWeight: '600',
    color: '#DDD',
    flexShrink: 1,
  },
  commentHeaderRight: {
    alignItems: 'flex-end',
    gap: 4,
    flexShrink: 0,
  },
  commentDate: {
    fontSize: 11,
    color: '#666',
  },
  commentText: {
    fontSize: 14,
    color: '#AAA',
    lineHeight: 20,
    marginBottom: 4,
  },
  commentLikeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 2,
  },
  commentLikeCount: {
    fontSize: 11,
    color: '#888',
    fontWeight: '600',
  },
  commentRemoveButton: {
    alignSelf: 'flex-start',
    marginTop: 8,
    paddingVertical: 2,
  },
  commentRemoveText: {
    fontSize: 13,
    color: '#E74C3C',
    fontWeight: '600',
  },
  commentInputRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.06)',
    backgroundColor: '#0D0D0D',
  },
  commentInput: {
    flex: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    color: '#FFFFFF',
    fontSize: 15,
    maxHeight: 100,
  },
  postCommentBtn: {
    backgroundColor: '#D4AF37',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    minWidth: 64,
    alignItems: 'center',
    justifyContent: 'center',
  },
  postCommentBtnDisabled: {
    opacity: 0.45,
  },
  postCommentText: {
    color: '#1A1A1A',
    fontSize: 14,
    fontWeight: '700',
  },
  fabWrap: {
    position: 'absolute',
    right: 20,
    bottom: Platform.OS === 'android' ? 100 : 28,
    shadowColor: '#D4AF37',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.45,
    shadowRadius: 10,
    elevation: 10,
  },
  fab: {
    width: 60,
    height: 60,
    borderRadius: 30,
    justifyContent: 'center',
    alignItems: 'center',
  },
  fabDisabled: {
    shadowOpacity: 0,
    elevation: 0,
  },
  modalContainer: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
  },
  modalContent: {
    backgroundColor: '#141414',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    paddingBottom: Platform.OS === 'ios' ? 36 : 24,
    maxHeight: '85%',
    borderWidth: 1,
    borderColor: 'rgba(212, 175, 55, 0.15)',
    borderBottomWidth: 0,
  },
  modalHandle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    alignSelf: 'center',
    marginBottom: 20,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 20,
  },
  modalEyebrow: {
    fontSize: 11,
    fontWeight: '700',
    color: '#D4AF37',
    letterSpacing: 1.2,
    marginBottom: 4,
  },
  modalTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  modalCloseBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  fieldLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#888',
    marginBottom: 8,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  input: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 14,
    padding: 14,
    fontSize: 16,
    color: '#FFFFFF',
    borderWidth: 1,
    borderColor: 'rgba(212, 175, 55, 0.15)',
  },
  textArea: {
    height: 110,
    textAlignVertical: 'top',
  },
  charCount: {
    fontSize: 11,
    color: '#555',
    textAlign: 'right',
    marginTop: 4,
    marginBottom: 14,
  },
  submitButtonWrap: {
    marginTop: 8,
    borderRadius: 14,
    overflow: 'hidden',
  },
  submitButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 16,
    borderRadius: 14,
  },
  submitButtonText: {
    color: '#1A1A1A',
    fontSize: 16,
    fontWeight: '800',
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 48,
    flex: 1,
  },
  emptyIconRing: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(212, 175, 55, 0.08)',
    borderWidth: 1,
    borderColor: 'rgba(212, 175, 55, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 20,
    fontWeight: '700',
    color: '#FFFFFF',
    marginTop: 16,
    textAlign: 'center',
  },
  emptySubtext: {
    fontSize: 14,
    color: '#888',
    marginTop: 8,
    textAlign: 'center',
    lineHeight: 21,
    paddingHorizontal: 20,
  },
  signInButton: {
    marginTop: 24,
    borderRadius: 14,
    overflow: 'hidden',
  },
  signInButtonGradient: {
    paddingHorizontal: 28,
    paddingVertical: 14,
    borderRadius: 14,
  },
  signInButtonText: {
    color: '#1A1A1A',
    fontSize: 15,
    fontWeight: '800',
    textAlign: 'center',
  },
  reportModalContent: {
    backgroundColor: '#1A1A1A',
    marginHorizontal: 32,
    padding: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    overflow: 'hidden',
  },
  reportButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    gap: 12,
    backgroundColor: 'rgba(231, 76, 60, 0.1)',
    borderRadius: 14,
    marginBottom: 4,
  },
  reportButtonText: {
    color: '#FF6B6B',
    fontSize: 16,
    fontWeight: '600',
  },
  cancelButton: {
    padding: 14,
    alignItems: 'center',
  },
  cancelButtonText: {
    color: '#888',
    fontSize: 15,
    fontWeight: '600',
  },
  loadMoreButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    padding: 14,
    backgroundColor: 'rgba(212, 175, 55, 0.08)',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(212, 175, 55, 0.2)',
    marginTop: 8,
    marginBottom: 12,
  },
  loadMoreButtonText: {
    color: '#D4AF37',
    fontSize: 15,
    fontWeight: '700',
  },
});

export default DuaBoardScreen; 