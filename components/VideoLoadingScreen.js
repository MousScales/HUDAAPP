import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Dimensions,
  Animated,
  StatusBar,
} from 'react-native';
import { Video } from 'expo-av';
import { LinearGradient } from 'expo-linear-gradient';

const { width, height } = Dimensions.get('window');

export default function VideoLoadingScreen({ onComplete }) {
  const [displayText, setDisplayText] = useState('');
  const [currentIndex, setCurrentIndex] = useState(0);
  const [videoFinished, setVideoFinished] = useState(false);
  const [showTypewriter, setShowTypewriter] = useState(false);
  const [showSubtitle, setShowSubtitle] = useState(false);
  
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const textAnim = useRef(new Animated.Value(0)).current;
  const subtitleAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // Start fade in animation
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 500,
      useNativeDriver: true,
    }).start();

    // Show typewriter after 1 second
    setTimeout(() => {
      setShowTypewriter(true);
      // Start text animation
      Animated.timing(textAnim, {
        toValue: 1,
        duration: 400,
        useNativeDriver: true,
      }).start();
    }, 1000);
  }, []);

  // Typewriter effect for "Hudā"
  useEffect(() => {
    if (!showTypewriter) return;
    
    const targetText = "Hudā";
    
    if (currentIndex < targetText.length) {
      const timer = setTimeout(() => {
        setDisplayText(targetText.substring(0, currentIndex + 1));
        setCurrentIndex(currentIndex + 1);
      }, 200); // Speed of typing

      return () => clearTimeout(timer);
    } else {
      // Typewriter completed - show subtitle after a delay
      console.log('Typewriter effect completed');
      setTimeout(() => {
        setShowSubtitle(true);
        Animated.timing(subtitleAnim, {
          toValue: 1,
          duration: 600,
          useNativeDriver: true,
        }).start(() => {
          // Navigate to next page after subtitle animation completes
          setTimeout(() => {
            onComplete();
          }, 800); // Wait 800ms after subtitle appears
        });
      }, 500); // Wait 500ms after typing completes
    }
  }, [currentIndex, showTypewriter]);

  // Handle video completion
  const handleVideoFinish = () => {
    setVideoFinished(true);
    // Navigation is now handled by subtitle animation completion
  };

  // Handle video error
  const handleVideoError = (error) => {
    console.error('Video loading error:', error);
    // Fallback to just showing the typewriter effect
    setVideoFinished(true);
    setTimeout(() => {
      onComplete();
    }, 2000);
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />
      
      {/* Video Background */}
      <View style={styles.videoContainer}>
        <Video
          source={require('../assets/icon.mp4')}
          style={styles.video}
          shouldPlay
          isLooping={false}
          resizeMode="cover"
          muted={true}
          volume={0}
          onPlaybackStatusUpdate={(status) => {
            if (status.didJustFinish) {
              handleVideoFinish();
            }
          }}
          onError={handleVideoError}
        />
      </View>

      {/* Overlay Gradient */}
      <LinearGradient
        colors={['rgba(255, 255, 255, 0.3)', 'rgba(255, 255, 255, 0.1)']}
        style={styles.overlay}
      />

      {/* Content */}
      <Animated.View 
        style={[
          styles.content,
          {
            opacity: fadeAnim,
          }
        ]}
      >
        {/* Typewriter Text */}
        {showTypewriter && (
          <Animated.View 
            style={[
              styles.textContainer,
              {
                opacity: textAnim,
                transform: [
                  {
                    translateY: textAnim.interpolate({
                      inputRange: [0, 1],
                      outputRange: [20, 0],
                    }),
                  },
                ],
              }
            ]}
          >
            <Animated.Text style={styles.appName}>
              {displayText}
            </Animated.Text>
          </Animated.View>
        )}

        {/* Subtitle */}
        {showSubtitle && (
          <Animated.Text 
            style={[
              styles.subtitle,
              {
                opacity: subtitleAnim,
                transform: [
                  {
                    translateY: subtitleAnim.interpolate({
                      inputRange: [0, 1],
                      outputRange: [20, 0],
                    }),
                  },
                ],
              }
            ]}
          >
            The App For Muslims
          </Animated.Text>
        )}
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  videoContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  video: {
    width: width,
    height: height,
  },
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  content: {
    flex: 1,
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 150,
    paddingBottom: 100,
  },
  textContainer: {
    marginBottom: 15,
  },
  appName: {
    fontSize: 56,
    fontWeight: '600',
    color: '#333333',
    textAlign: 'center',
    letterSpacing: 3,
    fontFamily: 'System',
    textShadowColor: '#000',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 1,
  },
  subtitle: {
    fontSize: 18,
    color: '#333333',
    textAlign: 'center',
    fontWeight: '500',
    letterSpacing: 0.5,
    fontStyle: 'italic',
  },
}); 