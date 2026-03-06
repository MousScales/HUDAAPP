# Hudā App Authentication & Onboarding UI Demo

This document showcases the comprehensive login and onboarding flow created for Hudā, the Islamic spiritual tracking app. The UI features a warm dark theme that's both accessible and spiritually meaningful.

## Flow Overview

### 1. Authentication Screen (`AuthScreen.js`)
**Beautiful dark-themed login interface with:**
- App branding with moon icon and "Hudā" title
- Warm dark slate gradient background (#0F172A → #334155)
- Toggle between Login and Create Account modes
- Email and Password fields with golden accent icons
- Password visibility toggle
- Forgot Password option
- Inspirational Quranic verse at the bottom
- Elegant glass-morphism design with golden borders

### 2. Onboarding Flow (`OnboardingScreen.js`)
**Multi-step guided setup based on user background:**

#### Step 1: User Information & Type Selection
- Name and Email collection
- Choice between "Muslim" and "New Muslim"
- Clean card-based selection UI
- Progress tracking

#### For Existing Muslims (Steps 2-3):
**Step 2: Madhab Selection**
- Four Islamic schools of thought (Hanafi, Shafi'i, Maliki, Hanbali)
- Educational modal explaining each madhab
- Regional information for context
- Respectful tone emphasizing all are valid

**Step 3: Gender Selection**
- Simple Male/Female selection
- Explains purpose for appropriate guidance

#### For New Muslims (Steps 4-5):
**Step 4: Islamic Education**
- Beautiful card-based learning sections:
  - Five Pillars of Islam
  - Importance of Prayer
  - Cleanliness & Etiquette
  - About Madhhabs
- Color-coded icons for each topic
- Scrollable educational content

**Step 5: Shahada (Declaration of Faith)**
- Arabic text with English translation
- Explanation of meaning and significance
- Warm welcome message to the Ummah
- Heart icon with encouraging note

#### Final Step: Reflection Verse
**Different verses based on user type:**
- **New Muslims**: Quran 31:22 about grasping the trustworthy handhold
- **Existing Muslims**: Quran 5:7 about remembering Allah's favor
- Large Arabic text with beautiful typography
- "Enter Hudā" completion button

## Design Features

### Visual Design
- **Warm Dark Theme**: Slate gradient (#0F172A → #1E293B → #334155)
- **Golden Accents**: #FFD700 highlights for warmth and elegance
- **Glass Morphism**: Semi-transparent dark cards with golden borders
- **Consistent Iconography**: Golden-tinted Ionicons throughout
- **Typography Hierarchy**: White text with clear heading/body distinction
- **Islamic Aesthetics**: Crescent moon logo, beautiful Arabic typography
- **Welcoming Feel**: Dark backgrounds with warm golden touches

### User Experience
- **Progressive Disclosure**: Information revealed step-by-step
- **Clear Navigation**: Back buttons, progress indicators
- **Accessible Colors**: High contrast, readable text
- **Responsive Layout**: Keyboard-aware, scrollable content
- **Educational Approach**: Teaching moments for new Muslims

### Technical Implementation
- **State Management**: useState for form data and flow control
- **Data Persistence**: AsyncStorage for onboarding completion
- **Navigation Integration**: React Navigation stack/tab structure
- **Input Validation**: Form validation with disabled states
- **Modal Interface**: Bottom sheet for additional information

## User Flows

### New User Journey
1. **AuthScreen** → Create Account
2. **OnboardingScreen Step 1** → Select "New Muslim" + enter details
3. **Step 4** → Learn Islamic foundations
4. **Step 5** → Read about Shahada
5. **Step 6** → Reflection verse → Enter main app

### Existing Muslim Journey
1. **AuthScreen** → Create Account
2. **OnboardingScreen Step 1** → Select "Muslim" + enter details
3. **Step 2** → Choose Madhab
4. **Step 3** → Select Gender
5. **Step 6** → Reflection verse → Enter main app

### Returning User
1. **AuthScreen** → Login → Enter main app directly

## Cultural Sensitivity Features

### For New Muslims
- **No Assumptions**: Gentle introduction to concepts
- **Educational First**: Teaching before asking for preferences
- **Welcoming Tone**: Emphasis on community and support
- **Shahada Significance**: Proper explanation of declaration of faith

### For All Users
- **Madhab Respect**: All schools presented as equally valid
- **Gender Appropriate**: Guidance tailored to Islamic considerations
- **Quranic Integration**: Relevant verses for spiritual reflection
- **Inclusive Language**: Brother/sister terminology

## Technical Notes

The UI is fully implemented but non-functional (as requested). To make it functional:
1. Connect authentication to backend service
2. Implement actual navigation state changes
3. Add form validation and error handling
4. Connect madhab selection to prayer calculations
5. Store user preferences for app personalization

The design prioritizes clarity, warmth, and accessibility while maintaining Islamic authenticity and respect for all levels of religious knowledge.

# Lessons Content Structure

## Folder: `lessons/`
- Each lesson is stored as a separate JSON file: `lesson-<id>.json`
- Example: `lesson-001.json`, `lesson-002.json`, etc.

## JSON Template for Each Lesson
```json
{
  "id": 1,
  "title": "Tawheed (Oneness of Allah)",
  "introduction": "Understanding the fundamental concept of Islamic monotheism.",
  "sections": [
    {
      "heading": "What is Tawheed?",
      "content": "Tawheed means believing in the oneness of Allah..."
    },
    {
      "heading": "Types of Tawheed",
      "content": "1. Tawheed ar-Rububiyyah...\n2. Tawheed al-Uluhiyyah..."
    }
  ],
  "conclusion": "Tawheed is the foundation of faith...",
  "references": [
    "Quran 112:1-4",
    "Sahih Bukhari 7373"
  ]
}
```

## How to Add or Edit Lessons
1. Create or edit a JSON file in the `lessons/` folder using the template above.
2. Use clear, accessible language and cite sources where possible.
3. For batch editing, you can use a spreadsheet and export to JSON. 