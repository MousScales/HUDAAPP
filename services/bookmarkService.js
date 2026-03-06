import { firestore, auth } from '../firebase';
import { 
  doc, 
  getDoc, 
  setDoc, 
  deleteDoc, 
  collection, 
  getDocs, 
  query, 
  orderBy,
  serverTimestamp 
} from 'firebase/firestore';

class BookmarkService {
  constructor() {
    this.currentUser = null;
  }

  // Get current user
  getCurrentUser() {
    return auth.currentUser;
  }

  // Save a verse as bookmark
  async saveBookmark(verse) {
    try {
      const user = this.getCurrentUser();
      if (!user) {
        console.log('❌ BookmarkService: No authenticated user');
        return false;
      }

      const bookmarkData = {
        id: `${verse.surah}_${verse.ayah}`,
        surah: verse.surah,
        ayah: verse.ayah,
        surahName: verse.surahName,
        text: verse.text,
        translation: verse.translation,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      };

      const bookmarkRef = doc(firestore, 'users', user.uid, 'bookmarks', bookmarkData.id);
      await setDoc(bookmarkRef, bookmarkData);

      console.log('✅ BookmarkService: Verse bookmarked successfully', bookmarkData.id);
      return true;
    } catch (error) {
      console.error('❌ BookmarkService: Error saving bookmark:', error);
      return false;
    }
  }

  // Remove a verse from bookmarks
  async removeBookmark(verseId) {
    try {
      const user = this.getCurrentUser();
      if (!user) {
        console.log('❌ BookmarkService: No authenticated user');
        return false;
      }

      const bookmarkRef = doc(firestore, 'users', user.uid, 'bookmarks', verseId);
      await deleteDoc(bookmarkRef);

      console.log('✅ BookmarkService: Bookmark removed successfully', verseId);
      return true;
    } catch (error) {
      console.error('❌ BookmarkService: Error removing bookmark:', error);
      return false;
    }
  }

  // Check if a verse is bookmarked
  async isBookmarked(verseId) {
    try {
      const user = this.getCurrentUser();
      if (!user) {
        return false;
      }

      const bookmarkRef = doc(firestore, 'users', user.uid, 'bookmarks', verseId);
      const bookmarkDoc = await getDoc(bookmarkRef);
      
      return bookmarkDoc.exists();
    } catch (error) {
      console.error('❌ BookmarkService: Error checking bookmark status:', error);
      return false;
    }
  }

  // Get all bookmarked verses for current user
  async getBookmarks() {
    try {
      const user = this.getCurrentUser();
      if (!user) {
        console.log('❌ BookmarkService: No authenticated user');
        return [];
      }

      const bookmarksRef = collection(firestore, 'users', user.uid, 'bookmarks');
      const q = query(bookmarksRef, orderBy('createdAt', 'desc'));
      const querySnapshot = await getDocs(q);

      const bookmarks = [];
      querySnapshot.forEach((doc) => {
        bookmarks.push({
          id: doc.id,
          ...doc.data()
        });
      });

      console.log('✅ BookmarkService: Loaded bookmarks', bookmarks.length);
      return bookmarks;
    } catch (error) {
      console.error('❌ BookmarkService: Error loading bookmarks:', error);
      return [];
    }
  }

  // Get bookmarks for a specific surah
  async getBookmarksForSurah(surahNumber) {
    try {
      const allBookmarks = await this.getBookmarks();
      return allBookmarks.filter(bookmark => bookmark.surah === surahNumber);
    } catch (error) {
      console.error('❌ BookmarkService: Error loading surah bookmarks:', error);
      return [];
    }
  }

  // Clear all bookmarks for current user
  async clearAllBookmarks() {
    try {
      const user = this.getCurrentUser();
      if (!user) {
        console.log('❌ BookmarkService: No authenticated user');
        return false;
      }

      const bookmarks = await this.getBookmarks();
      const deletePromises = bookmarks.map(bookmark => 
        deleteDoc(doc(firestore, 'users', user.uid, 'bookmarks', bookmark.id))
      );

      await Promise.all(deletePromises);
      console.log('✅ BookmarkService: All bookmarks cleared');
      return true;
    } catch (error) {
      console.error('❌ BookmarkService: Error clearing bookmarks:', error);
      return false;
    }
  }
}

export default new BookmarkService(); 
 
 