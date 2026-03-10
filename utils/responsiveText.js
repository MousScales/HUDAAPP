import { Dimensions } from 'react-native';

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

// Language-specific text characteristics
const languageCharacteristics = {
  english: {
    avgCharWidth: 0.6,
    lineHeightMultiplier: 1.2,
    paddingMultiplier: 1.0,
  },
  spanish: {
    avgCharWidth: 0.7, // Spanish text is typically longer
    lineHeightMultiplier: 1.3,
    paddingMultiplier: 1.2,
  },
  french: {
    avgCharWidth: 0.75, // French text can be quite long
    lineHeightMultiplier: 1.25,
    paddingMultiplier: 1.15,
  },
  italian: {
    avgCharWidth: 0.7, // Italian text is moderate
    lineHeightMultiplier: 1.25,
    paddingMultiplier: 1.1,
  }
};

// Get dynamic font size based on text length and language
export const getDynamicFontSize = (text, baseFontSize, minFontSize, maxFontSize, language = 'english') => {
  const lang = languageCharacteristics[language] || languageCharacteristics.english;
  const maxWidth = screenWidth - 40; // Account for padding
  const estimatedWidth = text.length * (baseFontSize * lang.avgCharWidth);
  
  if (estimatedWidth <= maxWidth) {
    return Math.min(baseFontSize, maxFontSize);
  }
  
  const scaleFactor = maxWidth / estimatedWidth;
  const newFontSize = Math.max(baseFontSize * scaleFactor, minFontSize);
  
  return Math.min(Math.floor(newFontSize), maxFontSize);
};

// Get dynamic line height based on language
export const getDynamicLineHeight = (fontSize, language = 'english') => {
  const lang = languageCharacteristics[language] || languageCharacteristics.english;
  return Math.round(fontSize * lang.lineHeightMultiplier);
};

// Get dynamic padding based on language
export const getDynamicPadding = (basePadding, language = 'english') => {
  const lang = languageCharacteristics[language] || languageCharacteristics.english;
  return Math.round(basePadding * lang.paddingMultiplier);
};

// Get dynamic margin based on language
export const getDynamicMargin = (baseMargin, language = 'english') => {
  const lang = languageCharacteristics[language] || languageCharacteristics.english;
  return Math.round(baseMargin * lang.paddingMultiplier);
};

// Get responsive container height
export const getResponsiveContainerHeight = (text, baseHeight, language = 'english') => {
  const lang = languageCharacteristics[language] || languageCharacteristics.english;
  const estimatedLines = Math.ceil(text.length / 50); // Rough estimate of lines
  return Math.max(baseHeight, estimatedLines * 20 * lang.lineHeightMultiplier);
};

// Get text style with dynamic sizing
export const getResponsiveTextStyle = (text, baseStyle, language = 'english') => {
  const dynamicFontSize = getDynamicFontSize(
    text, 
    baseStyle.fontSize || 16, 
    baseStyle.minFontSize || 12, 
    baseStyle.maxFontSize || 24, 
    language
  );
  
  const dynamicLineHeight = getDynamicLineHeight(dynamicFontSize, language);
  
  return {
    ...baseStyle,
    fontSize: dynamicFontSize,
    lineHeight: dynamicLineHeight,
    paddingHorizontal: getDynamicPadding(baseStyle.paddingHorizontal || 0, language),
    paddingVertical: getDynamicPadding(baseStyle.paddingVertical || 0, language),
  };
};

// Get responsive container style
export const getResponsiveContainerStyle = (text, baseStyle, language = 'english') => {
  return {
    ...baseStyle,
    paddingHorizontal: getDynamicPadding(baseStyle.paddingHorizontal || 0, language),
    paddingVertical: getDynamicPadding(baseStyle.paddingVertical || 0, language),
    marginHorizontal: getDynamicMargin(baseStyle.marginHorizontal || 0, language),
    marginVertical: getDynamicMargin(baseStyle.marginVertical || 0, language),
    minHeight: getResponsiveContainerHeight(text, baseStyle.minHeight || 0, language),
  };
};

// Check if text will overflow
export const willTextOverflow = (text, containerWidth, fontSize, language = 'english') => {
  const lang = languageCharacteristics[language] || languageCharacteristics.english;
  const estimatedWidth = text.length * (fontSize * lang.avgCharWidth);
  return estimatedWidth > containerWidth;
};

// Get optimal font size to fit text
export const getOptimalFontSize = (text, containerWidth, maxFontSize, language = 'english') => {
  const lang = languageCharacteristics[language] || languageCharacteristics.english;
  const estimatedWidth = text.length * (maxFontSize * lang.avgCharWidth);
  
  if (estimatedWidth <= containerWidth) {
    return maxFontSize;
  }
  
  const scaleFactor = containerWidth / estimatedWidth;
  return Math.floor(maxFontSize * scaleFactor);
}; 