const { initializeApp } = require('firebase/app');
const { getFirestore, collection, doc, setDoc } = require('firebase/firestore');
const fs = require('fs').promises;
const path = require('path');

// Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyD1w3gmYPDba1D3xgIN1NbtR2b0_zbBGZE",
  authDomain: "locked-dd553.firebaseapp.com",
  projectId: "locked-dd553",
  storageBucket: "locked-dd553.firebasestorage.app",
  messagingSenderId: "689382239718",
  appId: "1:689382239718:web:cae3ad18e6115187973a27"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// Lesson metadata from the current app - all 170 lessons
const lessonTopics = [
  // Theology & Core Beliefs
  {
    id: 1,
    title: 'Tawheed (Oneness of Allah)',
    description: 'Understanding the fundamental concept of Islamic monotheism',
    category: 'theology',
    icon: 'infinite-outline',
    color: '#1abc9c',
    difficulty: 'Essential'
  },
  {
    id: 2,
    title: 'Names and Attributes of Allah',
    description: 'Learning the 99 beautiful names of Allah and their meanings',
    category: 'theology',
    icon: 'text-outline',
    color: '#2ecc71',
    difficulty: 'Essential'
  },
  {
    id: 3,
    title: 'Belief in Angels',
    description: 'Understanding the nature and roles of angels in Islam',
    category: 'theology',
    icon: 'cloud-outline',
    color: '#3498db',
    difficulty: 'Essential'
  },
  {
    id: 4,
    title: 'Divine Books in Islam',
    description: 'Study of the revealed scriptures and their significance',
    category: 'theology',
    icon: 'book-outline',
    color: '#9b59b6',
    difficulty: 'Essential'
  },
  {
    id: 5,
    title: 'The Prophets of Allah',
    description: 'Lives and teachings of the 25 prophets mentioned in the Quran',
    category: 'prophets',
    icon: 'people-outline',
    color: '#34495e',
    difficulty: 'Essential'
  },
  // Qur'an Studies
  {
    id: 6,
    title: 'The Quran as a Miracle',
    description: 'Exploring the miraculous nature of the Quran',
    category: 'quran',
    icon: 'book-outline',
    color: '#16a085',
    difficulty: 'Intermediate'
  },
  {
    id: 7,
    title: 'Major Quranic Themes',
    description: 'Understanding the main topics and messages in the Quran',
    category: 'quran',
    icon: 'list-outline',
    color: '#27ae60',
    difficulty: 'Intermediate'
  },
  {
    id: 8,
    title: 'Stories from the Quran',
    description: 'Lessons from the narratives mentioned in the Quran',
    category: 'quran',
    icon: 'book-outline',
    color: '#2980b9',
    difficulty: 'Intermediate'
  },
  // Prophet Muhammad (SAW)
  {
    id: 9,
    title: 'Life of Prophet Muhammad (SAW)',
    description: 'Complete biography of the final messenger',
    category: 'seerah',
    icon: 'person-outline',
    color: '#8e44ad',
    difficulty: 'Essential'
  },
  {
    id: 10,
    title: 'Character of Prophet Muhammad (SAW)',
    description: 'Study of the Prophet\'s exemplary character and conduct',
    category: 'seerah',
    icon: 'heart-outline',
    color: '#c0392b',
    difficulty: 'Essential'
  },
  // Worship and Rituals
  {
    id: 11,
    title: 'Perfecting Your Prayer',
    description: 'Detailed guide to achieving excellence in Salah',
    category: 'worship',
    icon: 'person-outline',
    color: '#d35400',
    difficulty: 'Essential'
  },
  {
    id: 12,
    title: 'Fasting in Ramadan',
    description: 'Complete guide to fasting and its spiritual benefits',
    category: 'worship',
    icon: 'moon-outline',
    color: '#e67e22',
    difficulty: 'Essential'
  },
  {
    id: 13,
    title: 'Zakat and Charity',
    description: 'Understanding the principles of Islamic charity',
    category: 'worship',
    icon: 'gift-outline',
    color: '#f39c12',
    difficulty: 'Essential'
  },
  // Ethics and Character
  {
    id: 14,
    title: 'Islamic Ethics (Akhlaq)',
    description: 'Building noble character based on Islamic teachings',
    category: 'ethics',
    icon: 'heart-outline',
    color: '#1abc9c',
    difficulty: 'Essential'
  },
  {
    id: 15,
    title: 'Rights and Responsibilities',
    description: 'Understanding our duties towards Allah and creation',
    category: 'ethics',
    icon: 'list-outline',
    color: '#2ecc71',
    difficulty: 'Essential'
  },
  // Family Life
  {
    id: 16,
    title: 'Family in Islam',
    description: 'Islamic guidelines for family life and relationships',
    category: 'family',
    icon: 'people-outline',
    color: '#3498db',
    difficulty: 'Essential'
  },
  {
    id: 17,
    title: 'Marriage Guidance',
    description: 'Islamic perspective on marriage and family life',
    category: 'family',
    icon: 'heart-outline',
    color: '#9b59b6',
    difficulty: 'Essential'
  },
  // Contemporary Issues
  {
    id: 18,
    title: 'Islam in Modern Times',
    description: 'Applying Islamic principles in contemporary life',
    category: 'modern',
    icon: 'globe-outline',
    color: '#34495e',
    difficulty: 'Advanced'
  },
  {
    id: 19,
    title: 'Digital Age Challenges',
    description: 'Islamic guidance for technology and social media use',
    category: 'modern',
    icon: 'phone-portrait-outline',
    color: '#16a085',
    difficulty: 'Advanced'
  },
  // Death and Afterlife
  {
    id: 20,
    title: 'Journey to the Hereafter',
    description: 'Islamic teachings about death and the afterlife',
    category: 'akhirah',
    icon: 'infinite-outline',
    color: '#27ae60',
    difficulty: 'Essential'
  },
  // Prophets in Islam
  {
    id: 21,
    title: 'Prophet Adam (AS)',
    description: 'The story of human creation and the first prophet',
    category: 'prophets',
    icon: 'person-outline',
    color: '#2c3e50',
    difficulty: 'Essential'
  },
  {
    id: 22,
    title: 'Prophet Ibrahim (AS)',
    description: 'Life and legacy of the father of prophets',
    category: 'prophets',
    icon: 'person-outline',
    color: '#34495e',
    difficulty: 'Essential'
  },
  {
    id: 23,
    title: 'Prophet Musa (AS)',
    description: 'The prophet who spoke directly with Allah',
    category: 'prophets',
    icon: 'person-outline',
    color: '#7f8c8d',
    difficulty: 'Essential'
  },
  {
    id: 24,
    title: 'Prophet Isa (AS)',
    description: 'The miraculous birth and message of Jesus in Islam',
    category: 'prophets',
    icon: 'person-outline',
    color: '#95a5a6',
    difficulty: 'Essential'
  },
    // Theology & Core Beliefs
  {
    id: 1,
    title: 'Tawheed (Oneness of Allah)',
    description: 'Understanding the fundamental concept of Islamic monotheism',
    category: 'theology',
    icon: 'infinite-outline',
    color: '#1abc9c',
    difficulty: 'Essential'
  },
  {
    id: 2,
    title: 'Names and Attributes of Allah',
    description: 'Learning the 99 beautiful names of Allah and their meanings',
    category: 'theology',
    icon: 'text-outline',
    color: '#2ecc71',
    difficulty: 'Essential'
  },
  {
    id: 3,
    title: 'Belief in Angels',
    description: 'Understanding the nature and roles of angels in Islam',
    category: 'theology',
    icon: 'cloud-outline',
    color: '#3498db',
    difficulty: 'Essential'
  },
  {
    id: 4,
    title: 'Divine Books in Islam',
    description: 'Study of the revealed scriptures and their significance',
    category: 'theology',
    icon: 'book-outline',
    color: '#9b59b6',
    difficulty: 'Essential'
  },
  {
    id: 5,
    title: 'The Prophets of Allah',
    description: 'Lives and teachings of the 25 prophets mentioned in the Quran',
    category: 'prophets',
    icon: 'people-outline',
    color: '#34495e',
    difficulty: 'Essential'
  },
  // Qur'an Studies
  {
    id: 6,
    title: 'The Quran as a Miracle',
    description: 'Exploring the miraculous nature of the Quran',
    category: 'quran',
    icon: 'book-outline',
    color: '#16a085',
    difficulty: 'Intermediate'
  },
  {
    id: 7,
    title: 'Major Quranic Themes',
    description: 'Understanding the main topics and messages in the Quran',
    category: 'quran',
    icon: 'list-outline',
    color: '#27ae60',
    difficulty: 'Intermediate'
  },
  {
    id: 8,
    title: 'Stories from the Quran',
    description: 'Lessons from the narratives mentioned in the Quran',
    category: 'quran',
    icon: 'book-outline',
    color: '#2980b9',
    difficulty: 'Intermediate'
  },
  // Prophet Muhammad (SAW)
  {
    id: 9,
    title: 'Life of Prophet Muhammad (SAW)',
    description: 'Complete biography of the final messenger',
    category: 'seerah',
    icon: 'person-outline',
    color: '#8e44ad',
    difficulty: 'Essential'
  },
  {
    id: 10,
    title: 'Character of Prophet Muhammad (SAW)',
    description: 'Study of the Prophet\'s exemplary character and conduct',
    category: 'seerah',
    icon: 'heart-outline',
    color: '#c0392b',
    difficulty: 'Essential'
  },
  // Worship and Rituals
  {
    id: 11,
    title: 'Perfecting Your Prayer',
    description: 'Detailed guide to achieving excellence in Salah',
    category: 'worship',
    icon: 'person-outline',
    color: '#d35400',
    difficulty: 'Essential'
  },
  {
    id: 12,
    title: 'Fasting in Ramadan',
    description: 'Complete guide to fasting and its spiritual benefits',
    category: 'worship',
    icon: 'moon-outline',
    color: '#e67e22',
    difficulty: 'Essential'
  },
  {
    id: 13,
    title: 'Zakat and Charity',
    description: 'Understanding the principles of Islamic charity',
    category: 'worship',
    icon: 'gift-outline',
    color: '#f39c12',
    difficulty: 'Essential'
  },
  // Ethics and Character
  {
    id: 14,
    title: 'Islamic Ethics (Akhlaq)',
    description: 'Building noble character based on Islamic teachings',
    category: 'ethics',
    icon: 'heart-outline',
    color: '#1abc9c',
    difficulty: 'Essential'
  },
  {
    id: 15,
    title: 'Rights and Responsibilities',
    description: 'Understanding our duties towards Allah and creation',
    category: 'ethics',
    icon: 'list-outline',
    color: '#2ecc71',
    difficulty: 'Essential'
  },
  // Family Life
  {
    id: 16,
    title: 'Family in Islam',
    description: 'Islamic guidelines for family life and relationships',
    category: 'family',
    icon: 'people-outline',
    color: '#3498db',
    difficulty: 'Essential'
  },
  {
    id: 17,
    title: 'Marriage Guidance',
    description: 'Islamic perspective on marriage and family life',
    category: 'family',
    icon: 'heart-outline',
    color: '#9b59b6',
    difficulty: 'Essential'
  },
  // Contemporary Issues
  {
    id: 18,
    title: 'Islam in Modern Times',
    description: 'Applying Islamic principles in contemporary life',
    category: 'modern',
    icon: 'globe-outline',
    color: '#34495e',
    difficulty: 'Advanced'
  },
  {
    id: 19,
    title: 'Digital Age Challenges',
    description: 'Islamic guidance for technology and social media use',
    category: 'modern',
    icon: 'phone-portrait-outline',
    color: '#16a085',
    difficulty: 'Advanced'
  },
  // Death and Afterlife
  {
    id: 20,
    title: 'Journey to the Hereafter',
    description: 'Islamic teachings about death and the afterlife',
    category: 'akhirah',
    icon: 'infinite-outline',
    color: '#27ae60',
    difficulty: 'Essential'
  },
  // Prophets in Islam
  {
    id: 21,
    title: 'Prophet Adam (AS)',
    description: 'The story of human creation and the first prophet',
    category: 'prophets',
    icon: 'person-outline',
    color: '#2c3e50',
    difficulty: 'Essential'
  },
  {
    id: 22,
    title: 'Prophet Ibrahim (AS)',
    description: 'Life and legacy of the father of prophets',
    category: 'prophets',
    icon: 'person-outline',
    color: '#34495e',
    difficulty: 'Essential'
  },
  {
    id: 23,
    title: 'Prophet Musa (AS)',
    description: 'The prophet who spoke directly with Allah',
    category: 'prophets',
    icon: 'person-outline',
    color: '#7f8c8d',
    difficulty: 'Essential'
  },
  {
    id: 24,
    title: 'Prophet Isa (AS)',
    description: 'The miraculous birth and message of Jesus in Islam',
    category: 'prophets',
    icon: 'person-outline',
    color: '#95a5a6',
    difficulty: 'Essential'
  },
  // Important Figures
  {
    id: 25,
    title: 'The Four Rightly Guided Caliphs',
    description: 'The legacy of Abu Bakr, Umar, Uthman, and Ali',
    category: 'history',
    icon: 'people-outline',
    color: '#1abc9c',
    difficulty: 'Intermediate'
  },
  {
    id: 26,
    title: 'Women in Islamic History',
    description: 'Stories of Khadijah, Aisha, Fatima, and other notable women',
    category: 'history',
    icon: 'people-outline',
    color: '#2ecc71',
    difficulty: 'Intermediate'
  },
  {
    id: 27,
    title: 'Great Islamic Scholars',
    description: 'Lives and works of influential Islamic scholars',
    category: 'history',
    icon: 'school-outline',
    color: '#3498db',
    difficulty: 'Advanced'
  },
  // Islamic Sciences
  {
    id: 28,
    title: 'Introduction to Hadith Sciences',
    description: 'Understanding the preservation of prophetic traditions',
    category: 'knowledge',
    icon: 'book-outline',
    color: '#9b59b6',
    difficulty: 'Advanced'
  },
  {
    id: 29,
    title: 'Basics of Islamic Jurisprudence',
    description: 'Understanding Fiqh and its principles',
    category: 'knowledge',
    icon: 'library-outline',
    color: '#8e44ad',
    difficulty: 'Advanced'
  },
  {
    id: 30,
    title: 'Arabic for Understanding Islam',
    description: 'Essential Arabic terms and their meanings',
    category: 'knowledge',
    icon: 'language-outline',
    color: '#2980b9',
    difficulty: 'Intermediate'
  },
  // Spiritual Development
  {
    id: 31,
    title: 'Purification of the Heart',
    description: 'Understanding and treating spiritual diseases',
    category: 'spirituality',
    icon: 'heart-outline',
    color: '#1abc9c',
    difficulty: 'Advanced'
  },
  {
    id: 32,
    title: 'The Power of Dhikr',
    description: 'Remembrance of Allah and its spiritual benefits',
    category: 'spirituality',
    icon: 'repeat-outline',
    color: '#2ecc71',
    difficulty: 'Intermediate'
  },
  {
    id: 33,
    title: 'Understanding Taqwa',
    description: 'Developing God-consciousness in daily life',
    category: 'spirituality',
    icon: 'shield-outline',
    color: '#3498db',
    difficulty: 'Advanced'
  },
  {
    id: 34,
    title: 'The Art of Dua',
    description: 'Etiquettes and power of supplication',
    category: 'spirituality',
    icon: 'hand-left-outline',
    color: '#9b59b6',
    difficulty: 'Intermediate'
  },
  // Ethics and Character
  {
    id: 35,
    title: 'Islamic Business Ethics',
    description: 'Halal earnings and ethical commerce',
    category: 'ethics',
    icon: 'briefcase-outline',
    color: '#34495e',
    difficulty: 'Intermediate'
  },
  {
    id: 36,
    title: 'Social Media Ethics',
    description: 'Islamic guidelines for digital interaction',
    category: 'modern',
    icon: 'share-social-outline',
    color: '#16a085',
    difficulty: 'Intermediate'
  },
  {
    id: 37,
    title: 'Environmental Stewardship',
    description: 'Islamic perspective on caring for creation',
    category: 'modern',
    icon: 'leaf-outline',
    color: '#27ae60',
    difficulty: 'Intermediate'
  },
  // Contemporary Challenges
  {
    id: 38,
    title: 'Islam and Mental Health',
    description: 'Islamic approach to emotional wellbeing',
    category: 'modern',
    icon: 'fitness-outline',
    color: '#2980b9',
    difficulty: 'Intermediate'
  },
  {
    id: 39,
    title: 'Living as a Muslim Minority',
    description: 'Maintaining faith in secular societies',
    category: 'modern',
    icon: 'people-outline',
    color: '#8e44ad',
    difficulty: 'Advanced'
  },
  {
    id: 40,
    title: 'Responding to Misconceptions',
    description: 'Addressing common questions about Islam',
    category: 'modern',
    icon: 'chatbubbles-outline',
    color: '#c0392b',
    difficulty: 'Advanced'
  },
  // Advanced Quran Studies
  {
    id: 41,
    title: 'Understanding Tafsir',
    description: 'Principles of Quranic interpretation',
    category: 'quran',
    icon: 'book-outline',
    color: '#1abc9c',
    difficulty: 'Advanced'
  },
  {
    id: 42,
    title: 'Sciences of the Quran',
    description: 'Introduction to Ulum al-Quran',
    category: 'quran',
    icon: 'library-outline',
    color: '#2ecc71',
    difficulty: 'Advanced'
  },
  {
    id: 43,
    title: 'Tajweed Rules',
    description: 'Proper Quranic recitation guidelines',
    category: 'quran',
    icon: 'musical-notes-outline',
    color: '#3498db',
    difficulty: 'Intermediate'
  },
  {
    id: 44,
    title: 'Memorization Techniques',
    description: 'Methods for memorizing the Quran',
    category: 'quran',
    icon: 'bulb-outline',
    color: '#9b59b6',
    difficulty: 'Intermediate'
  },
  // Practical Worship
  {
    id: 45,
    title: 'Voluntary Prayers',
    description: 'Understanding Sunnah and Nafl prayers',
    category: 'worship',
    icon: 'person-outline',
    color: '#34495e',
    difficulty: 'Intermediate'
  },
  {
    id: 46,
    title: 'Ramadan Excellence',
    description: 'Maximizing worship in the holy month',
    category: 'worship',
    icon: 'moon-outline',
    color: '#16a085',
    difficulty: 'Intermediate'
  },
  {
    id: 47,
    title: 'Hajj and Umrah Guide',
    description: 'Comprehensive guide to pilgrimage',
    category: 'worship',
    icon: 'map-outline',
    color: '#27ae60',
    difficulty: 'Advanced'
  },
  {
    id: 48,
    title: 'Fasting Throughout the Year',
    description: 'Voluntary fasts and their virtues',
    category: 'worship',
    icon: 'calendar-outline',
    color: '#2980b9',
    difficulty: 'Intermediate'
  },
  {
    id: 49,
    title: 'Night Prayer Guide',
    description: 'Understanding and establishing Tahajjud',
    category: 'worship',
    icon: 'moon-outline',
    color: '#8e44ad',
    difficulty: 'Intermediate'
  },
  {
    id: 50,
    title: 'Etiquettes of the Mosque',
    description: 'Proper conduct in the house of Allah',
    category: 'worship',
    icon: 'home-outline',
    color: '#c0392b',
    difficulty: 'Beginner'
  },
  // Family and Social Life
  {
    id: 51,
    title: 'Rights of Parents',
    description: 'Islamic teachings on honoring parents',
    category: 'family',
    icon: 'people-outline',
    color: '#1abc9c',
    difficulty: 'Essential'
  },
  {
    id: 52,
    title: 'Raising Righteous Children',
    description: 'Islamic principles of parenting',
    category: 'family',
    icon: 'people-circle-outline',
    color: '#2ecc71',
    difficulty: 'Advanced'
  },
  {
    id: 53,
    title: 'Marriage in Islam',
    description: 'Complete guide to Islamic marriage',
    category: 'family',
    icon: 'heart-outline',
    color: '#3498db',
    difficulty: 'Essential'
  },
  {
    id: 54,
    title: 'Maintaining Family Ties',
    description: 'Understanding and fulfilling family rights',
    category: 'family',
    icon: 'git-network-outline',
    color: '#9b59b6',
    difficulty: 'Intermediate'
  },
  // Social Responsibilities
  {
    id: 55,
    title: 'Rights of Neighbors',
    description: 'Islamic teachings on neighborly relations',
    category: 'ethics',
    icon: 'home-outline',
    color: '#34495e',
    difficulty: 'Essential'
  },
  {
    id: 56,
    title: 'Community Service',
    description: 'Islamic perspective on social work',
    category: 'ethics',
    icon: 'people-outline',
    color: '#16a085',
    difficulty: 'Intermediate'
  },
  {
    id: 57,
    title: 'Civic Responsibilities',
    description: 'Being an active Muslim citizen',
    category: 'modern',
    icon: 'business-outline',
    color: '#27ae60',
    difficulty: 'Intermediate'
  },
  {
    id: 58,
    title: 'Interfaith Relations',
    description: 'Islamic guidelines for interfaith interaction',
    category: 'modern',
    icon: 'people-circle-outline',
    color: '#2980b9',
    difficulty: 'Advanced'
  },
  {
    id: 59,
    title: 'Financial Responsibilities',
    description: 'Islamic guidelines on money management',
    category: 'ethics',
    icon: 'cash-outline',
    color: '#8e44ad',
    difficulty: 'Intermediate'
  },
  {
    id: 60,
    title: 'Environmental Care',
    description: 'Islamic teachings on environmental protection',
    category: 'ethics',
    icon: 'leaf-outline',
    color: '#c0392b',
    difficulty: 'Intermediate'
  },
  // More Core Beliefs
  {
    id: 61,
    title: 'The Shahada',
    description: 'Understanding the declaration of faith',
    category: 'theology',
    icon: 'text-outline',
    color: '#1abc9c',
    difficulty: 'Essential'
  },
  {
    id: 62,
    title: 'Ikhlas (Sincerity)',
    description: 'Purifying intentions in worship',
    category: 'theology',
    icon: 'heart-outline',
    color: '#2ecc71',
    difficulty: 'Essential'
  },
  {
    id: 63,
    title: 'Rights of Allah',
    description: 'Understanding our obligations to our Creator',
    category: 'theology',
    icon: 'infinite-outline',
    color: '#3498db',
    difficulty: 'Essential'
  },
  // More Quran Studies
  {
    id: 64,
    title: 'Makki vs Madani Surahs',
    description: 'Understanding the historical context of revelation',
    category: 'quran',
    icon: 'map-outline',
    color: '#9b59b6',
    difficulty: 'Intermediate'
  },
  {
    id: 65,
    title: 'The Human Soul in Quran',
    description: 'Quranic teachings about human nature',
    category: 'quran',
    icon: 'person-outline',
    color: '#34495e',
    difficulty: 'Advanced'
  },
  {
    id: 66,
    title: 'Surah Al-Fatiha Deep Dive',
    description: 'Detailed study of the opening chapter',
    category: 'quran',
    icon: 'book-outline',
    color: '#16a085',
    difficulty: 'Essential'
  },
  {
    id: 67,
    title: 'Last Three Surahs',
    description: 'Understanding Al-Ikhlas, Al-Falaq, and An-Nas',
    category: 'quran',
    icon: 'book-outline',
    color: '#27ae60',
    difficulty: 'Essential'
  },
  // More Prophet Muhammad (SAW)
  {
    id: 68,
    title: 'The Hijrah',
    description: 'The prophetic migration to Madinah',
    category: 'seerah',
    icon: 'airplane-outline',
    color: '#2980b9',
    difficulty: 'Essential'
  },
  {
    id: 69,
    title: 'The Prophet\'s Forgiveness',
    description: 'Examples of mercy and forgiveness',
    category: 'seerah',
    icon: 'heart-outline',
    color: '#8e44ad',
    difficulty: 'Essential'
  },
  {
    id: 70,
    title: 'The Prophet\'s Simplicity',
    description: 'Lessons from the Prophet\'s modest lifestyle',
    category: 'seerah',
    icon: 'leaf-outline',
    color: '#c0392b',
    difficulty: 'Essential'
  },
  {
    id: 71,
    title: 'The Role of Sunnah',
    description: 'Understanding and following prophetic traditions',
    category: 'seerah',
    icon: 'star-outline',
    color: '#d35400',
    difficulty: 'Essential'
  },
  {
    id: 72,
    title: 'Family Life of the Prophet',
    description: 'The Prophet as a family man',
    category: 'seerah',
    icon: 'people-outline',
    color: '#e67e22',
    difficulty: 'Essential'
  },
  {
    id: 73,
    title: 'The Farewell Sermon',
    description: 'Final message to the Ummah',
    category: 'seerah',
    icon: 'megaphone-outline',
    color: '#f39c12',
    difficulty: 'Essential'
  },
  {
    id: 74,
    title: 'Sending Salawat',
    description: 'The importance of sending blessings upon the Prophet',
    category: 'seerah',
    icon: 'heart-circle-outline',
    color: '#1abc9c',
    difficulty: 'Essential'
  },
  // More Prophets
  {
    id: 75,
    title: 'Prophet Nuh (AS)',
    description: 'Story of the great flood',
    category: 'prophets',
    icon: 'boat-outline',
    color: '#2ecc71',
    difficulty: 'Essential'
  },
  {
    id: 76,
    title: 'Prophet Yusuf (AS)',
    description: 'The most beautiful of stories',
    category: 'prophets',
    icon: 'person-outline',
    color: '#3498db',
    difficulty: 'Essential'
  },
  {
    id: 77,
    title: 'Prophet Ayyub (AS)',
    description: 'The story of patience and perseverance',
    category: 'prophets',
    icon: 'person-outline',
    color: '#9b59b6',
    difficulty: 'Essential'
  },
  {
    id: 78,
    title: 'Prophet Yunus (AS)',
    description: 'Lessons from the companion of the fish',
    category: 'prophets',
    icon: 'fish-outline',
    color: '#34495e',
    difficulty: 'Essential'
  },
  {
    id: 79,
    title: 'Prophet Sulayman (AS)',
    description: 'The prophet king and his wisdom',
    category: 'prophets',
    icon: 'star-outline',
    color: '#16a085',
    difficulty: 'Essential'
  },
  {
    id: 80,
    title: 'Prophet Dawud (AS)',
    description: 'The prophet of beautiful recitation',
    category: 'prophets',
    icon: 'musical-notes-outline',
    color: '#27ae60',
    difficulty: 'Essential'
  },
  // More Spiritual Development
  {
    id: 81,
    title: 'Khushu in Salah',
    description: 'Achieving concentration in prayer',
    category: 'spirituality',
    icon: 'person-outline',
    color: '#2980b9',
    difficulty: 'Advanced'
  },
  {
    id: 82,
    title: 'Dealing with Doubts',
    description: 'Strengthening faith in challenging times',
    category: 'spirituality',
    icon: 'help-circle-outline',
    color: '#8e44ad',
    difficulty: 'Advanced'
  },
  {
    id: 83,
    title: 'Patience (Sabr)',
    description: 'Understanding and developing patience',
    category: 'spirituality',
    icon: 'time-outline',
    color: '#c0392b',
    difficulty: 'Essential'
  },
  {
    id: 84,
    title: 'Gratitude (Shukr)',
    description: 'Cultivating thankfulness to Allah',
    category: 'spirituality',
    icon: 'heart-outline',
    color: '#d35400',
    difficulty: 'Essential'
  },
  {
    id: 85,
    title: 'Trust in Allah (Tawakkul)',
    description: 'Building reliance on Allah',
    category: 'spirituality',
    icon: 'shield-outline',
    color: '#e67e22',
    difficulty: 'Essential'
  },
  // More Ethics and Manners
  {
    id: 86,
    title: 'Honesty and Truthfulness',
    description: 'The importance of speaking truth',
    category: 'ethics',
    icon: 'checkmark-circle-outline',
    color: '#f39c12',
    difficulty: 'Essential'
  },
  {
    id: 87,
    title: 'Avoiding Backbiting',
    description: 'Protecting the honor of others',
    category: 'ethics',
    icon: 'warning-outline',
    color: '#1abc9c',
    difficulty: 'Essential'
  },
  {
    id: 88,
    title: 'Keeping Promises',
    description: 'The importance of fulfilling commitments',
    category: 'ethics',
    icon: 'hand-right-outline',
    color: '#2ecc71',
    difficulty: 'Essential'
  },
  {
    id: 89,
    title: 'Controlling Anger',
    description: 'Islamic methods for anger management',
    category: 'ethics',
    icon: 'thermometer-outline',
    color: '#3498db',
    difficulty: 'Essential'
  },
  // Death and Afterlife
  {
    id: 90,
    title: 'Reality of Death',
    description: 'Islamic perspective on death',
    category: 'akhirah',
    icon: 'hourglass-outline',
    color: '#9b59b6',
    difficulty: 'Essential'
  },
  {
    id: 91,
    title: 'Life in the Grave',
    description: 'Understanding the life of Barzakh',
    category: 'akhirah',
    icon: 'moon-outline',
    color: '#34495e',
    difficulty: 'Essential'
  },
  {
    id: 92,
    title: 'The Day of Judgment',
    description: 'Events of the Last Day',
    category: 'akhirah',
    icon: 'calendar-outline',
    color: '#16a085',
    difficulty: 'Essential'
  },
  {
    id: 93,
    title: 'The Book of Deeds',
    description: 'Recording of our actions',
    category: 'akhirah',
    icon: 'book-outline',
    color: '#27ae60',
    difficulty: 'Essential'
  },
  {
    id: 94,
    title: 'Paradise and Hell',
    description: 'Understanding the final destinations',
    category: 'akhirah',
    icon: 'contrast-outline',
    color: '#2980b9',
    difficulty: 'Essential'
  },
  // Knowledge and Learning
  {
    id: 95,
    title: 'Seeking Knowledge',
    description: 'The virtue of learning in Islam',
    category: 'knowledge',
    icon: 'school-outline',
    color: '#8e44ad',
    difficulty: 'Essential'
  },
  {
    id: 96,
    title: 'Knowledge vs Action',
    description: 'Implementing what we learn',
    category: 'knowledge',
    icon: 'git-compare-outline',
    color: '#c0392b',
    difficulty: 'Advanced'
  },
  {
    id: 97,
    title: 'Understanding Aqeedah',
    description: 'Basics of Islamic theology',
    category: 'knowledge',
    icon: 'book-outline',
    color: '#d35400',
    difficulty: 'Advanced'
  },
  {
    id: 98,
    title: 'Classical Texts',
    description: 'Introduction to important Islamic books',
    category: 'knowledge',
    icon: 'library-outline',
    color: '#e67e22',
    difficulty: 'Advanced'
  },
  {
    id: 99,
    title: 'The Power of Tawbah',
    description: 'Understanding repentance in Islam',
    category: 'spirituality',
    icon: 'refresh-outline',
    color: '#f39c12',
    difficulty: 'Essential'
  },
  {
    id: 100,
    title: 'Hope in Allah\'s Mercy',
    description: 'Understanding the vast mercy of Allah',
    category: 'spirituality',
    icon: 'sunny-outline',
    color: '#1abc9c',
    difficulty: 'Essential'
  },
  // Additional Prophets
  {
    id: 101,
    title: 'Prophet Idris (AS)',
    description: 'The prophet known for his wisdom and knowledge',
    category: 'prophets',
    icon: 'person-outline',
    color: '#2ecc71',
    difficulty: 'Essential'
  },
  {
    id: 102,
    title: 'Prophet Hud (AS)',
    description: 'The prophet sent to the people of Ad',
    category: 'prophets',
    icon: 'person-outline',
    color: '#3498db',
    difficulty: 'Essential'
  },
  {
    id: 103,
    title: 'Prophet Salih (AS)',
    description: 'The prophet of Thamud and the miracle of the she-camel',
    category: 'prophets',
    icon: 'person-outline',
    color: '#9b59b6',
    difficulty: 'Essential'
  },
  {
    id: 104,
    title: 'Prophet Lut (AS)',
    description: 'The prophet who confronted moral corruption',
    category: 'prophets',
    icon: 'person-outline',
    color: '#34495e',
    difficulty: 'Essential'
  },
  {
    id: 105,
    title: 'Prophet Ismail (AS)',
    description: 'The son of Ibrahim and builder of the Kaaba',
    category: 'prophets',
    icon: 'person-outline',
    color: '#16a085',
    difficulty: 'Essential'
  },
  {
    id: 106,
    title: 'Prophet Ishaq (AS)',
    description: 'The blessed son promised to Ibrahim in old age',
    category: 'prophets',
    icon: 'person-outline',
    color: '#27ae60',
    difficulty: 'Essential'
  },
  {
    id: 107,
    title: 'Prophet Yaqub (AS)',
    description: 'The prophet also known as Israel',
    category: 'prophets',
    icon: 'person-outline',
    color: '#2980b9',
    difficulty: 'Essential'
  },
  {
    id: 108,
    title: 'Prophet Shuayb (AS)',
    description: 'The prophet who called for just business practices',
    category: 'prophets',
    icon: 'person-outline',
    color: '#8e44ad',
    difficulty: 'Essential'
  },
  {
    id: 109,
    title: 'Prophet Dhul-Kifl (AS)',
    description: 'The prophet known for his patience and dedication',
    category: 'prophets',
    icon: 'person-outline',
    color: '#c0392b',
    difficulty: 'Essential'
  },
  {
    id: 110,
    title: 'Prophet Harun (AS)',
    description: 'The prophet who supported his brother Musa',
    category: 'prophets',
    icon: 'person-outline',
    color: '#d35400',
    difficulty: 'Essential'
  },
  {
    id: 111,
    title: 'Prophet Ilyas (AS)',
    description: 'The prophet who called people back to monotheism',
    category: 'prophets',
    icon: 'person-outline',
    color: '#e67e22',
    difficulty: 'Essential'
  },
  {
    id: 112,
    title: 'Prophet Al-Yasa (AS)',
    description: 'The successor of Prophet Ilyas',
    category: 'prophets',
    icon: 'person-outline',
    color: '#f39c12',
    difficulty: 'Essential'
  },
  {
    id: 113,
    title: 'Prophet Zakariya (AS)',
    description: 'The guardian of Maryam and father of Yahya',
    category: 'prophets',
    icon: 'person-outline',
    color: '#1abc9c',
    difficulty: 'Essential'
  },
  {
    id: 114,
    title: 'Prophet Yahya (AS)',
    description: 'The prophet who supported the message of Isa',
    category: 'prophets',
    icon: 'person-outline',
    color: '#2ecc71',
    difficulty: 'Essential'
  },
  {
    id: 115,
    title: 'Prophet Sheeth (AS)',
    description: 'The son and successor of Prophet Adam',
    category: 'prophets',
    icon: 'person-outline',
    color: '#3498db',
    difficulty: 'Essential'
  },
  {
    id: 116,
    title: 'Al-Khidr (AS)',
    description: 'The mysterious teacher of Prophet Musa',
    category: 'prophets',
    icon: 'person-outline',
    color: '#9b59b6',
    difficulty: 'Essential'
  },
  // Important Figures - Companions
  {
    id: 117,
    title: 'Abu Bakr As-Siddiq (RA)',
    description: 'The first caliph and closest companion',
    category: 'companions',
    icon: 'person-outline',
    color: '#34495e',
    difficulty: 'Essential'
  },
  {
    id: 118,
    title: 'Umar ibn Al-Khattab (RA)',
    description: 'The second caliph known for his justice',
    category: 'companions',
    icon: 'person-outline',
    color: '#16a085',
    difficulty: 'Essential'
  },
  {
    id: 119,
    title: 'Uthman ibn Affan (RA)',
    description: 'The third caliph known for his modesty',
    category: 'companions',
    icon: 'person-outline',
    color: '#27ae60',
    difficulty: 'Essential'
  },
  {
    id: 120,
    title: 'Ali ibn Abi Talib (RA)',
    description: 'The fourth caliph and gateway to knowledge',
    category: 'companions',
    icon: 'person-outline',
    color: '#2980b9',
    difficulty: 'Essential'
  },
  {
    id: 121,
    title: 'Bilal ibn Rabah (RA)',
    description: 'The first muezzin of Islam',
    category: 'companions',
    icon: 'person-outline',
    color: '#8e44ad',
    difficulty: 'Essential'
  },
  {
    id: 122,
    title: 'Khalid ibn Al-Walid (RA)',
    description: 'The Sword of Allah and military genius',
    category: 'companions',
    icon: 'person-outline',
    color: '#c0392b',
    difficulty: 'Essential'
  },
  {
    id: 123,
    title: 'Abu Hurairah (RA)',
    description: 'The greatest narrator of hadith',
    category: 'companions',
    icon: 'person-outline',
    color: '#d35400',
    difficulty: 'Essential'
  },
  {
    id: 124,
    title: 'Abdullah ibn Abbas (RA)',
    description: 'The scholar of the ummah and Quran interpreter',
    category: 'companions',
    icon: 'person-outline',
    color: '#e67e22',
    difficulty: 'Essential'
  },
  {
    id: 125,
    title: 'Muadh ibn Jabal (RA)',
    description: 'The expert in halal and haram',
    category: 'companions',
    icon: 'person-outline',
    color: '#f39c12',
    difficulty: 'Essential'
  },
  {
    id: 126,
    title: 'Salman Al-Farsi (RA)',
    description: 'The seeker of truth from Persia',
    category: 'companions',
    icon: 'person-outline',
    color: '#1abc9c',
    difficulty: 'Essential'
  },
  {
    id: 127,
    title: 'Zayd ibn Harithah (RA)',
    description: 'The adopted son of the Prophet',
    category: 'companions',
    icon: 'person-outline',
    color: '#2ecc71',
    difficulty: 'Essential'
  },
  {
    id: 128,
    title: 'Al-Hasan ibn Ali (RA)',
    description: 'The grandson of the Prophet and peacemaker',
    category: 'companions',
    icon: 'person-outline',
    color: '#3498db',
    difficulty: 'Essential'
  },
  {
    id: 129,
    title: 'Al-Hussein ibn Ali (RA)',
    description: 'The grandson of the Prophet and martyr',
    category: 'companions',
    icon: 'person-outline',
    color: '#9b59b6',
    difficulty: 'Essential'
  },
  // Important Women in Islam
  {
    id: 130,
    title: 'Khadijah bint Khuwaylid (RA)',
    description: 'The first wife of the Prophet and mother of believers',
    category: 'women',
    icon: 'person-outline',
    color: '#34495e',
    difficulty: 'Essential'
  },
  {
    id: 131,
    title: 'Aisha bint Abu Bakr (RA)',
    description: 'The scholar among the mothers of believers',
    category: 'women',
    icon: 'person-outline',
    color: '#16a085',
    difficulty: 'Essential'
  },
  {
    id: 132,
    title: 'Fatimah Az-Zahra (RA)',
    description: 'The beloved daughter of the Prophet',
    category: 'women',
    icon: 'person-outline',
    color: '#27ae60',
    difficulty: 'Essential'
  },
  {
    id: 133,
    title: 'Asma bint Abu Bakr (RA)',
    description: 'The woman of the two belts',
    category: 'women',
    icon: 'person-outline',
    color: '#2980b9',
    difficulty: 'Essential'
  },
  {
    id: 134,
    title: 'Umm Salamah (RA)',
    description: 'The wise counselor among the mothers of believers',
    category: 'women',
    icon: 'person-outline',
    color: '#8e44ad',
    difficulty: 'Essential'
  },
  {
    id: 135,
    title: 'Zaynab bint Ali (RA)',
    description: 'The courageous granddaughter of the Prophet',
    category: 'women',
    icon: 'person-outline',
    color: '#c0392b',
    difficulty: 'Essential'
  },
  {
    id: 136,
    title: 'Maryam (AS)',
    description: 'The mother of Prophet Isa and example of piety',
    category: 'women',
    icon: 'person-outline',
    color: '#d35400',
    difficulty: 'Essential'
  },
  {
    id: 137,
    title: 'Rabia al-Adawiyya',
    description: 'The great female Sufi saint',
    category: 'women',
    icon: 'person-outline',
    color: '#e67e22',
    difficulty: 'Essential'
  },
  // Classical Scholars
  {
    id: 138,
    title: 'Imam Abu Hanifah',
    description: 'The founder of the Hanafi school',
    category: 'scholars',
    icon: 'school-outline',
    color: '#f39c12',
    difficulty: 'Advanced'
  },
  {
    id: 139,
    title: 'Imam Malik',
    description: 'The founder of the Maliki school',
    category: 'scholars',
    icon: 'school-outline',
    color: '#1abc9c',
    difficulty: 'Advanced'
  },
  {
    id: 140,
    title: 'Imam Ash-Shafi\'i',
    description: 'The founder of the Shafi\'i school',
    category: 'scholars',
    icon: 'school-outline',
    color: '#2ecc71',
    difficulty: 'Advanced'
  },
  {
    id: 141,
    title: 'Imam Ahmad ibn Hanbal',
    description: 'The founder of the Hanbali school',
    category: 'scholars',
    icon: 'school-outline',
    color: '#3498db',
    difficulty: 'Advanced'
  },
  {
    id: 142,
    title: 'Imam Al-Bukhari',
    description: 'The compiler of Sahih Al-Bukhari',
    category: 'scholars',
    icon: 'school-outline',
    color: '#9b59b6',
    difficulty: 'Advanced'
  },
  {
    id: 143,
    title: 'Imam Muslim',
    description: 'The compiler of Sahih Muslim',
    category: 'scholars',
    icon: 'school-outline',
    color: '#34495e',
    difficulty: 'Advanced'
  },
  {
    id: 144,
    title: 'Imam An-Nawawi',
    description: 'The author of Riyad as-Salihin',
    category: 'scholars',
    icon: 'school-outline',
    color: '#16a085',
    difficulty: 'Advanced'
  },
  {
    id: 145,
    title: 'Ibn Taymiyyah',
    description: 'The reformer scholar',
    category: 'scholars',
    icon: 'school-outline',
    color: '#27ae60',
    difficulty: 'Advanced'
  },
  {
    id: 146,
    title: 'Ibn Qayyim Al-Jawziyyah',
    description: 'The student of Ibn Taymiyyah',
    category: 'scholars',
    icon: 'school-outline',
    color: '#2980b9',
    difficulty: 'Advanced'
  },
  {
    id: 147,
    title: 'Al-Ghazali',
    description: 'The proof of Islam',
    category: 'scholars',
    icon: 'school-outline',
    color: '#8e44ad',
    difficulty: 'Advanced'
  },
  {
    id: 148,
    title: 'Ibn Kathir',
    description: 'The great Quran commentator',
    category: 'scholars',
    icon: 'school-outline',
    color: '#c0392b',
    difficulty: 'Advanced'
  },
  {
    id: 149,
    title: 'Ibn Hazm',
    description: 'The scholar of Andalusia',
    category: 'scholars',
    icon: 'school-outline',
    color: '#d35400',
    difficulty: 'Advanced'
  },
  {
    id: 150,
    title: 'Al-Tabari',
    description: 'The historian and Quran commentator',
    category: 'scholars',
    icon: 'school-outline',
    color: '#e67e22',
    difficulty: 'Advanced'
  },
  // Historical Leaders and Reformers
  {
    id: 151,
    title: 'Salahuddin Al-Ayyubi',
    description: 'The liberator of Jerusalem',
    category: 'leaders',
    icon: 'shield-outline',
    color: '#f39c12',
    difficulty: 'Intermediate'
  },
  {
    id: 152,
    title: 'Umar ibn Abdul Aziz',
    description: 'The fifth rightly guided caliph',
    category: 'leaders',
    icon: 'person-outline',
    color: '#1abc9c',
    difficulty: 'Intermediate'
  },
  {
    id: 153,
    title: 'Luqman al-Hakim',
    description: 'The wise man mentioned in the Quran',
    category: 'leaders',
    icon: 'person-outline',
    color: '#2ecc71',
    difficulty: 'Intermediate'
  },
  // Contributors to Science and Civilization
  {
    id: 154,
    title: 'Ibn Sina (Avicenna)',
    description: 'The father of modern medicine',
    category: 'scholars',
    icon: 'medical-outline',
    color: '#3498db',
    difficulty: 'Advanced'
  },
  {
    id: 155,
    title: 'Al-Khwarizmi',
    description: 'The father of algebra',
    category: 'scholars',
    icon: 'calculator-outline',
    color: '#9b59b6',
    difficulty: 'Advanced'
  },
  {
    id: 156,
    title: 'Ibn Rushd (Averroes)',
    description: 'The great philosopher and judge',
    category: 'scholars',
    icon: 'school-outline',
    color: '#34495e',
    difficulty: 'Advanced'
  },
  {
    id: 157,
    title: 'Ibn Battuta',
    description: 'The greatest traveler of the medieval world',
    category: 'scholars',
    icon: 'globe-outline',
    color: '#16a085',
    difficulty: 'Advanced'
  },
  // Additional Worship Details
  {
    id: 158,
    title: 'Sunnah Prayers in Detail',
    description: 'Complete guide to all recommended prayers',
    category: 'worship',
    icon: 'person-outline',
    color: '#27ae60',
    difficulty: 'Intermediate'
  },
  {
    id: 159,
    title: 'Witr Prayer Guide',
    description: 'Understanding the night\'s final prayer',
    category: 'worship',
    icon: 'moon-outline',
    color: '#2980b9',
    difficulty: 'Intermediate'
  },
  {
    id: 160,
    title: 'Eid Prayers and Celebrations',
    description: 'Complete guide to both Eid celebrations',
    category: 'worship',
    icon: 'gift-outline',
    color: '#8e44ad',
    difficulty: 'Essential'
  },
  {
    id: 161,
    title: 'Janazah Prayer',
    description: 'Understanding funeral prayers and rights',
    category: 'worship',
    icon: 'people-outline',
    color: '#c0392b',
    difficulty: 'Essential'
  },
  {
    id: 162,
    title: 'Istikharah Prayer',
    description: 'Guidance prayer for decision making',
    category: 'worship',
    icon: 'help-circle-outline',
    color: '#d35400',
    difficulty: 'Intermediate'
  },
  {
    id: 163,
    title: 'Prayer in Special Circumstances',
    description: 'How to pray while traveling or sick',
    category: 'worship',
    icon: 'airplane-outline',
    color: '#e67e22',
    difficulty: 'Essential'
  },
  {
    id: 164,
    title: 'Dhikr After Prayer',
    description: 'Essential remembrances after salah',
    category: 'worship',
    icon: 'text-outline',
    color: '#f39c12',
    difficulty: 'Essential'
  },
  {
    id: 165,
    title: 'Quranic Healing',
    description: 'Using the Quran for spiritual healing',
    category: 'spirituality',
    icon: 'fitness-outline',
    color: '#1abc9c',
    difficulty: 'Intermediate'
  },
  {
    id: 166,
    title: 'Islamic Dream Interpretation',
    description: 'Understanding dreams in Islamic context',
    category: 'spirituality',
    icon: 'moon-outline',
    color: '#2ecc71',
    difficulty: 'Advanced'
  },
  {
    id: 167,
    title: 'Islamic Inheritance Law',
    description: 'Understanding the rules of inheritance',
    category: 'knowledge',
    icon: 'git-network-outline',
    color: '#3498db',
    difficulty: 'Advanced'
  },
  {
    id: 168,
    title: 'Islamic Calendar System',
    description: 'Understanding the Hijri calendar',
    category: 'knowledge',
    icon: 'calendar-outline',
    color: '#9b59b6',
    difficulty: 'Intermediate'
  },
  {
    id: 169,
    title: 'Islamic Architecture',
    description: 'History and significance of Islamic buildings',
    category: 'history',
    icon: 'home-outline',
    color: '#34495e',
    difficulty: 'Intermediate'
  },
  {
    id: 170,
    title: 'Islamic Calligraphy',
    description: 'The art of beautiful writing in Islam',
    category: 'history',
    icon: 'brush-outline',
    color: '#16a085',
    difficulty: 'Intermediate'
  }

];

async function uploadLessons() {
  try {
    console.log('Starting lesson upload to Firebase...');
    
    const lessonsDir = path.join(__dirname, '../lessons');
    const files = await fs.readdir(lessonsDir);
    const jsonFiles = files.filter(file => file.endsWith('.json'));
    
    console.log(`Found ${jsonFiles.length} lesson files`);
    
    for (const file of jsonFiles) {
      try {
        // Extract lesson ID from filename (e.g., "lesson-001.json" -> 1)
        const lessonId = parseInt(file.match(/lesson-(\d+)\.json/)[1]);
        
        // Read the lesson content from JSON file
        const filePath = path.join(lessonsDir, file);
        const fileContent = await fs.readFile(filePath, 'utf8');
        const lessonContent = JSON.parse(fileContent);
        
        // Find corresponding metadata from lessonTopics array
        const metadata = lessonTopics.find(topic => topic.id === lessonId);
        
        if (!metadata) {
          console.warn(`No metadata found for lesson ${lessonId}`);
          continue;
        }
        
        // Combine metadata with content
        const fullLesson = {
          ...metadata,
          ...lessonContent,
          uploadedAt: new Date(),
          lastUpdated: new Date()
        };
        
        // Upload to Firestore
        const docRef = doc(db, 'lessons', lessonId.toString());
        await setDoc(docRef, fullLesson);
        
        console.log(`✓ Uploaded lesson ${lessonId}: ${lessonContent.title}`);
        
      } catch (error) {
        console.error(`Error uploading ${file}:`, error);
      }
    }
    
    console.log('✓ All lessons uploaded successfully!');
    
  } catch (error) {
    console.error('Error uploading lessons:', error);
  }
}

// Run the upload
uploadLessons(); 