import { Dimensions, Platform, StatusBar } from 'react-native';

const { width, height } = Dimensions.get('window');

// Language-specific text characteristics
const LANGUAGE_CONFIGS = {
  english: {
    avgCharWidth: 0.6,
    lineHeightMultiplier: 1.4,
    paddingMultiplier: 1.0,
    fontSizeMultiplier: 1.0,
  },
  spanish: {
    avgCharWidth: 0.7, // Spanish text tends to be longer
    lineHeightMultiplier: 1.5,
    paddingMultiplier: 0.9,
    fontSizeMultiplier: 0.9,
  },
  french: {
    avgCharWidth: 0.75, // French text can be very long
    lineHeightMultiplier: 1.6,
    paddingMultiplier: 0.85,
    fontSizeMultiplier: 0.85,
  },
  italian: {
    avgCharWidth: 0.65, // Italian text is moderate
    lineHeightMultiplier: 1.45,
    paddingMultiplier: 0.95,
    fontSizeMultiplier: 0.95,
  },
};

// Get language configuration
export const getLanguageConfig = (language) => {
  return LANGUAGE_CONFIGS[language] || LANGUAGE_CONFIGS.english;
};

// Calculate responsive font size based on text length and language
export const getResponsiveFontSize = (text, baseFontSize, language = 'english', maxWidth = null) => {
  const config = getLanguageConfig(language);
  const availableWidth = maxWidth || (width * 0.85); // Default to 85% of screen width
  const estimatedWidth = text.length * (baseFontSize * config.avgCharWidth);
  
  if (estimatedWidth <= availableWidth) {
    return baseFontSize * config.fontSizeMultiplier;
  }
  
  const scaleFactor = availableWidth / estimatedWidth;
  const newFontSize = Math.max(baseFontSize * scaleFactor * config.fontSizeMultiplier, baseFontSize * 0.7);
  
  return Math.floor(newFontSize);
};

// Get responsive line height based on language
export const getResponsiveLineHeight = (fontSize, language = 'english') => {
  const config = getLanguageConfig(language);
  return Math.floor(fontSize * config.lineHeightMultiplier);
};

// Get responsive padding based on language
export const getResponsivePadding = (basePadding, language = 'english') => {
  const config = getLanguageConfig(language);
  return Math.floor(basePadding * config.paddingMultiplier);
};

// Get responsive container width based on language
export const getResponsiveContainerWidth = (language = 'english') => {
  const config = getLanguageConfig(language);
  
  // For longer text languages, use more width
  if (language === 'spanish' || language === 'french') {
    return '98%';
  } else if (language === 'italian') {
    return '95%';
  } else {
    return '90%';
  }
};

// Get responsive margin based on language
export const getResponsiveMargin = (baseMargin, language = 'english') => {
  const config = getLanguageConfig(language);
  return Math.floor(baseMargin * config.paddingMultiplier);
};

// Get responsive spacing for flex layouts
export const getResponsiveSpacing = (baseSpacing, language = 'english') => {
  const config = getLanguageConfig(language);
  return Math.floor(baseSpacing * config.paddingMultiplier);
};

// Get responsive text style object
export const getResponsiveTextStyle = (text, baseFontSize, language = 'english', maxWidth = null) => {
  const fontSize = getResponsiveFontSize(text, baseFontSize, language, maxWidth);
  const lineHeight = getResponsiveLineHeight(fontSize, language);
  
  return {
    fontSize,
    lineHeight,
    paddingHorizontal: getResponsivePadding(10, language),
  };
};

// Get responsive button style
export const getResponsiveButtonStyle = (text, baseFontSize, language = 'english') => {
  const fontSize = getResponsiveFontSize(text, baseFontSize, language);
  const padding = getResponsivePadding(15, language);
  
  return {
    fontSize,
    paddingHorizontal: padding,
    paddingVertical: getResponsivePadding(8, language),
  };
};

// Get responsive card style
export const getResponsiveCardStyle = (language = 'english') => {
  const padding = getResponsivePadding(20, language);
  const margin = getResponsiveMargin(15, language);
  
  return {
    padding,
    marginHorizontal: margin,
    marginVertical: getResponsiveMargin(8, language),
  };
};

// Get responsive header style
export const getResponsiveHeaderStyle = (title, baseFontSize, language = 'english') => {
  const fontSize = getResponsiveFontSize(title, baseFontSize, language);
  const padding = getResponsivePadding(20, language);
  
  return {
    fontSize,
    paddingHorizontal: padding,
    paddingVertical: getResponsivePadding(15, language),
  };
};

// Get responsive modal style
export const getResponsiveModalStyle = (language = 'english') => {
  const padding = getResponsivePadding(24, language);
  
  return {
    padding,
    width: getResponsiveContainerWidth(language),
    maxWidth: 400,
  };
};

// Get responsive list item style
export const getResponsiveListItemStyle = (language = 'english') => {
  const padding = getResponsivePadding(16, language);
  const margin = getResponsiveMargin(8, language);
  
  return {
    padding,
    marginVertical: margin,
  };
};

// Get responsive input style
export const getResponsiveInputStyle = (language = 'english') => {
  const padding = getResponsivePadding(16, language);
  const fontSize = 16 * getLanguageConfig(language).fontSizeMultiplier;
  
  return {
    padding,
    fontSize,
  };
};

// Get responsive alert style
export const getResponsiveAlertStyle = (language = 'english') => {
  const padding = getResponsivePadding(20, language);
  
  return {
    padding,
    marginHorizontal: getResponsiveMargin(20, language),
  };
};

// Get responsive navigation style
export const getResponsiveNavigationStyle = (language = 'english') => {
  const padding = getResponsivePadding(16, language);
  
  return {
    paddingHorizontal: padding,
    paddingVertical: getResponsivePadding(12, language),
  };
};

// Get responsive tab style
export const getResponsiveTabStyle = (language = 'english') => {
  const padding = getResponsivePadding(12, language);
  
  return {
    paddingHorizontal: padding,
    paddingVertical: getResponsivePadding(8, language),
  };
};

// Get responsive badge style
export const getResponsiveBadgeStyle = (text, language = 'english') => {
  const fontSize = getResponsiveFontSize(text, 12, language, 80);
  const padding = getResponsivePadding(8, language);
  
  return {
    fontSize,
    paddingHorizontal: padding,
    paddingVertical: getResponsivePadding(4, language),
  };
};

// Get responsive icon size based on language
export const getResponsiveIconSize = (baseSize, language = 'english') => {
  const config = getLanguageConfig(language);
  return Math.floor(baseSize * config.fontSizeMultiplier);
};

// Get responsive container size based on language
export const getResponsiveContainerSize = (baseSize, language = 'english') => {
  const config = getLanguageConfig(language);
  return Math.floor(baseSize * config.paddingMultiplier);
};

// Check if text will overflow
export const willTextOverflow = (text, fontSize, maxWidth, language = 'english') => {
  const config = getLanguageConfig(language);
  const estimatedWidth = text.length * (fontSize * config.avgCharWidth);
  return estimatedWidth > maxWidth;
};

// Get optimal font size to prevent overflow
export const getOptimalFontSize = (text, maxWidth, language = 'english', minFontSize = 12) => {
  const config = getLanguageConfig(language);
  const estimatedWidth = text.length * (minFontSize * config.avgCharWidth);
  
  if (estimatedWidth <= maxWidth) {
    return minFontSize;
  }
  
  const scaleFactor = maxWidth / estimatedWidth;
  return Math.max(minFontSize * scaleFactor, minFontSize * 0.7);
};

// Get responsive grid columns based on language
export const getResponsiveGridColumns = (language = 'english') => {
  // For longer text languages, use fewer columns to prevent overflow
  if (language === 'spanish' || language === 'french') {
    return 2;
  } else if (language === 'italian') {
    return 2.5;
  } else {
    return 3;
  }
};

// Get responsive aspect ratio based on language
export const getResponsiveAspectRatio = (language = 'english') => {
  // For longer text languages, use taller aspect ratios
  if (language === 'spanish' || language === 'french') {
    return 1.2;
  } else if (language === 'italian') {
    return 1.1;
  } else {
    return 1.0;
  }
};

// Get Android-specific top padding to account for status bar
// Android SafeAreaView doesn't work the same as iOS, so we need extra padding
export const getAndroidTopPadding = (basePadding = 0) => {
  if (Platform.OS === 'android') {
    // Add status bar height + extra padding for Android
    const statusBarHeight = StatusBar.currentHeight || 0;
    return basePadding + statusBarHeight + 10; // Extra 10px for better spacing
  }
  return basePadding;
};

// Get Android-specific bottom padding to account for navigation bar
// Android nav bar is higher up, so we need extra bottom padding for scrollable content
export const getAndroidBottomPadding = (basePadding = 0) => {
  if (Platform.OS === 'android') {
    // Add extra padding for Android nav bar (typically 70-90px for tab bar + safe area)
    return basePadding + 100; // Extra 100px for nav bar clearance
  }
  return basePadding;
}; 