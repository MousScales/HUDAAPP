import { auth, firestore } from '../firebase';
import { doc, setDoc, getDoc, collection, query, where, getDocs, updateDoc } from 'firebase/firestore';

/**
 * Save reading count for an ayah
 */
export const saveReadingCount = async (surahNumber, ayahNumber, count) => {
  try {
    const user = auth.currentUser;
    if (!user) return;

    const docRef = doc(firestore, 'userMemorization', `${user.uid}_${surahNumber}_${ayahNumber}`);
    await setDoc(docRef, {
      userId: user.uid,
      surahNumber,
      ayahNumber,
      readingCount: count,
      updatedAt: new Date().toISOString()
    }, { merge: true });
  } catch (error) {
    console.error('Error saving reading count to Firebase:', error);
    throw error;
  }
};

/**
 * Save listening count for an ayah
 */
export const saveListeningCount = async (surahNumber, ayahNumber, count) => {
  try {
    const user = auth.currentUser;
    if (!user) return;

    const docRef = doc(firestore, 'userMemorization', `${user.uid}_${surahNumber}_${ayahNumber}`);
    await setDoc(docRef, {
      userId: user.uid,
      surahNumber,
      ayahNumber,
      listeningCount: count,
      updatedAt: new Date().toISOString()
    }, { merge: true });
  } catch (error) {
    console.error('Error saving listening count to Firebase:', error);
    throw error;
  }
};

/**
 * Save quiz passed status for an ayah
 */
export const saveQuizPassed = async (surahNumber, ayahNumber, passed) => {
  try {
    const user = auth.currentUser;
    if (!user) return;

    const docRef = doc(firestore, 'userMemorization', `${user.uid}_${surahNumber}_${ayahNumber}`);
    await setDoc(docRef, {
      userId: user.uid,
      surahNumber,
      ayahNumber,
      quizPassed: passed,
      updatedAt: new Date().toISOString()
    }, { merge: true });
  } catch (error) {
    console.error('Error saving quiz passed to Firebase:', error);
    throw error;
  }
};

/**
 * Get memorization data for an ayah
 */
export const getAyahMemorization = async (surahNumber, ayahNumber) => {
  try {
    const user = auth.currentUser;
    if (!user) return null;

    const docRef = doc(firestore, 'userMemorization', `${user.uid}_${surahNumber}_${ayahNumber}`);
    const docSnap = await getDoc(docRef);
    
    if (docSnap.exists()) {
      return docSnap.data();
    }
    return null;
  } catch (error) {
    console.error('Error getting ayah memorization from Firebase:', error);
    return null;
  }
};

/**
 * Get all memorization data for a surah
 */
export const getSurahMemorization = async (surahNumber) => {
  try {
    const user = auth.currentUser;
    if (!user) return {};

    const q = query(
      collection(firestore, 'userMemorization'),
      where('userId', '==', user.uid),
      where('surahNumber', '==', surahNumber)
    );
    
    const querySnapshot = await getDocs(q);
    const memorization = {};
    
    querySnapshot.forEach((doc) => {
      const data = doc.data();
      memorization[data.ayahNumber] = data;
    });
    
    return memorization;
  } catch (error) {
    console.error('Error getting surah memorization from Firebase:', error);
    return {};
  }
};

/**
 * Get all memorization data for user
 */
export const getAllMemorization = async () => {
  try {
    const user = auth.currentUser;
    if (!user) return {};

    const q = query(
      collection(firestore, 'userMemorization'),
      where('userId', '==', user.uid)
    );
    
    const querySnapshot = await getDocs(q);
    const memorization = {};
    
    querySnapshot.forEach((doc) => {
      const data = doc.data();
      const key = `${data.surahNumber}_${data.ayahNumber}`;
      memorization[key] = data;
    });
    
    return memorization;
  } catch (error) {
    console.error('Error getting all memorization from Firebase:', error);
    return {};
  }
};

/**
 * Save memorized surahs
 */
export const saveMemorizedSurahs = async (surahNumbers) => {
  try {
    const user = auth.currentUser;
    if (!user) return;

    const docRef = doc(firestore, 'userSettings', user.uid);
    await setDoc(docRef, {
      userId: user.uid,
      memorizedSurahs: Array.from(surahNumbers),
      updatedAt: new Date().toISOString()
    }, { merge: true });
  } catch (error) {
    console.error('Error saving memorized surahs to Firebase:', error);
    throw error;
  }
};

/**
 * Get memorized surahs
 */
export const getMemorizedSurahs = async () => {
  try {
    const user = auth.currentUser;
    if (!user) return new Set();

    const docRef = doc(firestore, 'userSettings', user.uid);
    const docSnap = await getDoc(docRef);
    
    if (docSnap.exists()) {
      const data = docSnap.data();
      return new Set(data.memorizedSurahs || []);
    }
    return new Set();
  } catch (error) {
    console.error('Error getting memorized surahs from Firebase:', error);
    return new Set();
  }
};

/**
 * Save user settings (read target, listen target, quiz required, memorize30thJuzFirst)
 */
export const saveUserSettings = async (readTarget, listenTarget, quizRequired, memorize30thJuzFirst = false) => {
  try {
    const user = auth.currentUser;
    if (!user) return;

    const docRef = doc(firestore, 'userSettings', user.uid);
    await setDoc(docRef, {
      userId: user.uid,
      readTrackerTarget: readTarget,
      listenTrackerTarget: listenTarget,
      quizRequired: quizRequired,
      memorize30thJuzFirst: memorize30thJuzFirst,
      updatedAt: new Date().toISOString()
    }, { merge: true });
  } catch (error) {
    console.error('Error saving user settings to Firebase:', error);
    throw error;
  }
};

/**
 * Get user settings
 */
export const getUserSettings = async () => {
  try {
    const user = auth.currentUser;
    if (!user) return { readTarget: 10, listenTarget: 10, quizRequired: true, memorize30thJuzFirst: false };

    const docRef = doc(firestore, 'userSettings', user.uid);
    const docSnap = await getDoc(docRef);
    
    if (docSnap.exists()) {
      const data = docSnap.data();
      return {
        readTarget: data.readTrackerTarget || 10,
        listenTarget: data.listenTrackerTarget || 10,
        quizRequired: data.quizRequired !== undefined ? data.quizRequired : true,
        memorize30thJuzFirst: data.memorize30thJuzFirst === true
      };
    }
    return { readTarget: 10, listenTarget: 10, quizRequired: true, memorize30thJuzFirst: false };
  } catch (error) {
    console.error('Error getting user settings from Firebase:', error);
    return { readTarget: 10, listenTarget: 10, quizRequired: true, memorize30thJuzFirst: false };
  }
};

