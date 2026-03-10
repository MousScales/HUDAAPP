# Dhikr System Setup Guide

This guide explains how to use the new JSON-based dhikr system that replaces the old API-based approach.

## Overview

The dhikr system now uses:
- **Local JSON files** in `data/dhikr/` for reliable, authentic dhikr content
- **DhikrService** for data management and Firebase integration
- **Offline-first approach** with Firebase sync capabilities

## Dhikr Categories

The system includes 8 categories of authentic dhikr:

1. **Morning** (`morning.json`) - Start the day with Allah's blessings
2. **Evening** (`evening.json`) - End the day with protection
3. **General** (`general.json`) - Everyday remembrances
4. **After Prayer** (`afterPrayer.json`) - Post-salah dhikr
5. **Istighfar** (`istighfar.json`) - Seeking forgiveness
6. **Sleep** (`sleep.json`) - Bedtime protection
7. **Travel** (`travel.json`) - Journey safety
8. **Protection** (`protection.json`) - Comprehensive protection

## File Structure

```
data/dhikr/
├── morning.json
├── evening.json
├── general.json
├── afterPrayer.json
├── istighfar.json
├── sleep.json
├── travel.json
└── protection.json

services/
├── dhikrService.js

scripts/
├── uploadDhikr.js
```

## JSON File Format

Each dhikr category file follows this structure:

```json
{
  "category": "morning",
  "name": "Morning Dhikr",
  "description": "Authentic morning remembrances to start the day with Allah's blessings",
  "dhikrs": [
    {
      "id": 1,
      "title": "Morning Declaration of Faith",
      "arabic": "أَصْبَحْنَا وَأَصْبَحَ الْمُلْكُ لِلَّهِ...",
      "transliteration": "Asbahna wa asbahal-mulku lillah...",
      "translation": "We have reached the morning and at this very time...",
      "benefits": "Protection and blessings for the day",
      "source": "Abu Dawud",
      "repetitions": "1 time",
      "color": "#FFB347"
    }
  ]
}
```

## Using the Dhikr Service

### Basic Usage

```javascript
import dhikrService from '../services/dhikrService';

// Get all dhikr
const allDhikr = await dhikrService.getAllDhikr();

// Get dhikr by category
const morningDhikr = await dhikrService.getDhikrByCategory('morning');

// Search dhikr
const searchResults = await dhikrService.searchDhikr('protection');

// Get dhikr stats
const stats = await dhikrService.getDhikrStats();
```

### Cache Management

```javascript
// Force refresh (clears cache)
await dhikrService.forceRefresh();

// Clear cache manually
await dhikrService.clearCache();
```

## Firebase Upload

### Prerequisites

1. Configure Firebase in `scripts/uploadDhikr.js`:
   ```javascript
   const firebaseConfig = {
     apiKey: "your-api-key",
     authDomain: "your-auth-domain",
     projectId: "your-project-id",
     // ... other config
   };
   ```

### Upload Commands

```bash
# Check existing data and upload if none exists
node scripts/uploadDhikr.js

# Force upload (adds to existing data)
node scripts/uploadDhikr.js --force

# Upload via service method
const result = await dhikrService.uploadLocalDhikrToFirebase();
```

### Upload Process

1. **Checks existing data** - Warns if Firebase already has dhikr
2. **Processes JSON files** - Reads all files in `data/dhikr/`
3. **Validates format** - Ensures proper JSON structure
4. **Uploads to Firebase** - Creates documents in `dhikr` collection
5. **Verifies upload** - Confirms successful upload

## Data Flow

```
JSON Files → DhikrService → Cache → Firebase
     ↓           ↓           ↓         ↓
   Local      Memory     AsyncStorage  Cloud
  Storage     Cache        Cache      Database
```

## Features

### Offline Support
- Works without internet connection
- Uses local JSON files as primary source
- Falls back gracefully if Firebase unavailable

### Caching
- Memory caching for fast access
- AsyncStorage caching for persistence
- 24-hour cache expiry

### Search & Filter
- Full-text search across all fields
- Category filtering
- Multiple sorting options

### Error Handling
- Graceful API failures
- Fallback to local data
- User-friendly error messages

## Adding New Dhikr

### Method 1: Edit JSON Files

1. Open the appropriate category file in `data/dhikr/`
2. Add new dhikr object to the `dhikrs` array
3. Ensure unique `id` within the category
4. Upload to Firebase using upload script

### Method 2: Firebase Direct

1. Add document to `dhikr` collection
2. Use proper structure with all required fields
3. Clear app cache to fetch new data

## Benefits of New System

### ✅ Reliability
- No dependency on external APIs
- Guaranteed content availability
- Consistent data structure

### ✅ Performance
- Faster loading times
- Offline functionality
- Efficient caching

### ✅ Authenticity
- Curated authentic dhikr
- Proper Arabic text
- Verified sources and benefits

### ✅ Maintainability
- Easy to add new dhikr
- Version controlled content
- Clear data structure

### ✅ User Experience
- Instant loading
- No network delays
- Reliable functionality

## Troubleshooting

### Common Issues

**"No dhikr data available"**
- Check if JSON files exist in `data/dhikr/`
- Verify JSON file format
- Clear cache and retry

**Upload fails**
- Check Firebase configuration
- Verify Firebase permissions
- Check network connection

**Cache issues**
- Clear AsyncStorage cache
- Force refresh dhikr service
- Restart the app

### Debug Commands

```javascript
// Check dhikr stats
const stats = await dhikrService.getDhikrStats();
console.log('Dhikr stats:', stats);

// Clear cache
await dhikrService.clearCache();

// Force refresh
await dhikrService.forceRefresh();
```

## Migration Complete

The dhikr system has been successfully migrated from:
- ❌ Multiple unreliable APIs
- ❌ Network-dependent loading
- ❌ Inconsistent data formats

To:
- ✅ Local JSON files
- ✅ Offline-first approach
- ✅ Consistent, authentic content
- ✅ Firebase cloud sync
- ✅ Reliable user experience

The app now provides a faster, more reliable dhikr experience with authentic Islamic content. 