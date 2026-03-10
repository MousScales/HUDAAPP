# Lesson Migration to Firebase Firestore

This guide explains how to migrate lesson files from local storage to Firebase Firestore.

## Overview

The app has been updated to fetch lessons from Firebase Firestore instead of using local JSON files. This provides:

- Remote content management
- Real-time updates
- Better scalability
- Offline caching

## Migration Steps

### 1. Firebase Setup

Make sure your Firebase project is configured with Firestore enabled:

1. Go to [Firebase Console](https://console.firebase.google.com)
2. Select your project
3. Navigate to Firestore Database
4. Create a database (start in test mode for development)

### 2. Configure Upload Script

1. Open `scripts/uploadLessons.js`
2. Replace the `firebaseConfig` object with your actual Firebase configuration:

```javascript
const firebaseConfig = {
  apiKey: "your-actual-api-key",
  authDomain: "your-project.firebaseapp.com", 
  projectId: "your-actual-project-id",
  storageBucket: "your-project.appspot.com",
  messagingSenderId: "123456789",
  appId: "your-actual-app-id"
};
```

3. Copy all lesson topics from `screens/LessonsScreen.js` to the `lessonTopics` array in the upload script (currently only first 5 are included).

### 3. Install Dependencies

The upload script requires Node.js dependencies:

```bash
npm install firebase
```

### 4. Run Upload Script

Execute the upload script to migrate all lessons:

```bash
node scripts/uploadLessons.js
```

This will:
- Read all JSON files from the `lessons/` folder
- Combine lesson content with metadata
- Upload each lesson to Firestore with the document ID matching the lesson ID

### 5. Verify Upload

Check your Firestore console to ensure all lessons were uploaded correctly:

1. Go to Firebase Console → Firestore Database
2. You should see a `lessons` collection
3. Each document should have an ID (1, 2, 3, etc.) with the full lesson data

## App Changes

The following components have been updated to use Firebase:

### LessonsScreen.js
- Now fetches lessons from Firestore using `lessonService`
- Includes caching for offline access
- Shows loading and error states
- Maintains the same UI and functionality

### HomeScreen.js  
- Loads daily random lessons from Firebase
- Falls back to default lessons if Firebase fails

### LessonDetailScreen.js
- Fetches full lesson content from Firestore
- Shows loading spinner while content loads
- Handles errors gracefully with retry functionality

### Services

**lessonService.js** - New service that handles:
- Fetching all lessons with caching
- Getting lessons by category
- Loading individual lesson details
- Search functionality
- Offline storage

## Data Structure

Each lesson document in Firestore contains:

```javascript
{
  // Metadata (from lessonTopics)
  id: 1,
  title: "Lesson Title",
  description: "Brief description",
  category: "theology",
  icon: "infinite-outline", 
  color: "#1abc9c",
  difficulty: "Essential",
  
  // Content (from JSON files)
  introduction: "Lesson introduction...",
  sections: [
    {
      heading: "Section Title",
      content: "Section content..."
    }
  ],
  conclusion: "Lesson conclusion...",
  references: ["Quran 2:255", "Sahih Bukhari 123"],
  
  // Timestamps
  uploadedAt: Date,
  lastUpdated: Date
}
```

## Caching Strategy

The app implements a 24-hour cache to minimize Firebase reads:

- Lessons are cached locally using AsyncStorage
- Cache expires after 24 hours
- Falls back to cached data if Firebase is unavailable
- Cache is automatically cleared when expired

## Firestore Security Rules

Consider adding security rules to protect your lesson data:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /lessons/{lessonId} {
      allow read: if true; // Public read access
      allow write: if false; // Prevent unauthorized writes
    }
  }
}
```

## Troubleshooting

### Upload Issues
- Ensure Firebase config is correct
- Check that all lesson files are valid JSON
- Verify Firestore is enabled in your Firebase project

### App Issues  
- Check network connectivity
- Verify Firebase config in `firebase.js`
- Clear app cache/data if seeing stale content

### Performance
- Monitor Firestore usage in console
- Consider implementing pagination for large lesson sets
- Use offline persistence for better performance

## Cost Optimization

To minimize Firebase costs:
- Use caching effectively (already implemented)
- Consider batch reads instead of individual queries
- Monitor read/write operations in Firebase console
- Implement pagination if you add more lessons

## Future Enhancements

Possible improvements:
- Admin panel for lesson management
- Lesson progress tracking in Firestore
- Push notifications for new lessons
- Multi-language support
- Video/audio content support 
 
 
 