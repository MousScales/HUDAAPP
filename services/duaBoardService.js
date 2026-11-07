import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  collection,
  addDoc,
  doc,
  getDoc,
  updateDoc,
  serverTimestamp,
  Timestamp,
} from 'firebase/firestore';
import { firestore } from '../firebase';

export async function toggleDuaRequestSupport(duaId, currentUserId) {
  if (!currentUserId) {
    throw new Error('SIGN_IN_REQUIRED');
  }

  const duaRef = doc(firestore, 'duaBoard', duaId);
  const duaSnap = await getDoc(duaRef);
  if (!duaSnap.exists()) {
    throw new Error('NOT_FOUND');
  }

  const data = duaSnap.data();
  const supporters = data.supporters || [];
  const wasLiked = supporters.includes(currentUserId);
  const newSupporters = wasLiked
    ? supporters.filter((uid) => uid !== currentUserId)
    : [...supporters, currentUserId];

  if (!wasLiked && data.authorId && data.authorId !== currentUserId) {
    try {
      const currentUserProfile = await AsyncStorage.getItem('userProfile');
      let likerName = 'Someone';
      if (currentUserProfile) {
        const profile = JSON.parse(currentUserProfile);
        likerName = profile.firstName
          || profile.name
          || profile.displayName
          || profile.userName
          || profile.fullName
          || profile.givenName
          || 'Someone';
      }

      await addDoc(collection(firestore, 'duaLikeNotifications'), {
        duaId,
        authorId: data.authorId,
        likerId: currentUserId,
        likerName,
        createdAt: serverTimestamp(),
        notificationSent: false,
        scheduledFor: Timestamp.fromMillis(Date.now() + 30 * 60 * 1000),
      });
    } catch (notificationError) {
      console.error('Error storing dua like notification:', notificationError);
    }
  }

  await updateDoc(duaRef, { supporters: newSupporters });

  return {
    liked: !wasLiked,
    supportCount: newSupporters.length,
  };
}
