import { Dimensions, PixelRatio } from 'react-native';

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

// Base sizes for different screen sizes
const baseSizes = {
  small: 320,    // iPhone SE, small Android phones
  medium: 375,   // iPhone 12, 13, 14
  large: 414,    // iPhone 12 Pro Max, 13 Pro Max, 14 Pro Max
  xlarge: 428,   // iPhone 14 Plus
  tablet: 768,   // iPad Mini, iPad (9th gen)
  tabletLarge: 834, // iPad Air, iPad Pro 11"
  tabletXLarge: 1024, // iPad Pro 12.9"
};

// Icon size multipliers for different screen sizes
const iconMultipliers = {
  small: 0.7,    // 30% smaller on small screens
  medium: 0.85,  // 15% smaller on medium screens
  large: 0.95,   // 5% smaller on large screens
  xlarge: 1.05,  // 5% larger on very large screens
  tablet: 1.2,   // 20% larger on tablets
  tabletLarge: 1.4, // 40% larger on large tablets
  tabletXLarge: 1.6, // 60% larger on very large tablets
};

// Get screen size category
const getScreenSize = () => {
  if (screenWidth <= baseSizes.small) return 'small';
  if (screenWidth <= baseSizes.medium) return 'medium';
  if (screenWidth <= baseSizes.large) return 'large';
  if (screenWidth <= baseSizes.xlarge) return 'xlarge';
  if (screenWidth <= baseSizes.tablet) return 'tablet';
  if (screenWidth <= baseSizes.tabletLarge) return 'tabletLarge';
  if (screenWidth <= baseSizes.tabletXLarge) return 'tabletXLarge';
  return 'tabletXLarge'; // For even larger screens
};

// Get responsive icon size
export const getResponsiveIconSize = (baseSize) => {
  const screenSize = getScreenSize();
  const multiplier = iconMultipliers[screenSize];
  return Math.round(baseSize * multiplier);
};

// Get responsive font size
export const getResponsiveFontSize = (baseSize) => {
  const screenSize = getScreenSize();
  const multiplier = iconMultipliers[screenSize];
  return Math.round(baseSize * multiplier);
};

// Get responsive spacing
export const getResponsiveSpacing = (baseSpacing) => {
  const screenSize = getScreenSize();
  const multiplier = iconMultipliers[screenSize];
  return Math.round(baseSpacing * multiplier);
};

// Get responsive container size
export const getResponsiveContainerSize = (baseSize) => {
  const screenSize = getScreenSize();
  const multiplier = iconMultipliers[screenSize];
  return Math.round(baseSize * multiplier);
};

// Check if screen is small
export const isSmallScreen = () => {
  return screenWidth <= baseSizes.small;
};

// Check if screen is large
export const isLargeScreen = () => {
  return screenWidth >= baseSizes.large;
};

// Check if screen is tablet
export const isTablet = () => {
  return screenWidth >= baseSizes.tablet;
};

// Check if screen is large tablet
export const isLargeTablet = () => {
  return screenWidth >= baseSizes.tabletLarge;
};

// Get screen dimensions
export const getScreenDimensions = () => {
  return { width: screenWidth, height: screenHeight };
};

// Get responsive padding
export const getResponsivePadding = (basePadding) => {
  const screenSize = getScreenSize();
  const multiplier = iconMultipliers[screenSize];
  return Math.round(basePadding * multiplier);
};

// Get responsive margin
export const getResponsiveMargin = (baseMargin) => {
  const screenSize = getScreenSize();
  const multiplier = iconMultipliers[screenSize];
  return Math.round(baseMargin * multiplier);
};

// Get responsive border radius
export const getResponsiveBorderRadius = (baseRadius) => {
  const screenSize = getScreenSize();
  const multiplier = iconMultipliers[screenSize];
  return Math.round(baseRadius * multiplier);
};

// Get tablet-specific spacing (larger gaps for tablets)
export const getTabletSpacing = (baseSpacing) => {
  if (isTablet()) {
    return Math.round(baseSpacing * 1.3);
  }
  return baseSpacing;
};

// Get tablet-specific padding (more padding for tablets)
export const getTabletPadding = (basePadding) => {
  if (isTablet()) {
    return Math.round(basePadding * 1.1);
  }
  return basePadding;
};

// Get responsive grid columns for tablets
export const getResponsiveGridColumns = () => {
  if (isLargeTablet()) return 3; // 3 columns on large tablets
  if (isTablet()) return 2; // 2 columns on regular tablets
  return 1; // 1 column on phones
};

// Get responsive card width for tablets
export const getResponsiveCardWidth = (baseWidth) => {
  if (isLargeTablet()) {
    return Math.round(baseWidth * 0.8); // 80% of base width on large tablets
  }
  if (isTablet()) {
    return Math.round(baseWidth * 0.9); // 90% of base width on regular tablets
  }
  return baseWidth; // Full width on phones
}; 