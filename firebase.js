import { initializeApp } from 'firebase/app';
import { initializeAuth, getReactNativePersistence, connectAuthEmulator, getAuth } from 'firebase/auth';
import { getFirestore, connectFirestoreEmulator, doc, getDoc, enableIndexedDbPersistence } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';
import ReactNativeAsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';

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

// Initialize Firestore with enhanced error handling
const firestore = getFirestore(app);

// Initialize Firebase Storage
const storage = getStorage(app);

// Enable offline persistence (safe for React Native)
const enableFirestorePersistence = async () => {
  try {
    // For web environments
    if (Platform.OS === 'web') {
      await enableIndexedDbPersistence(firestore);
      console.log('✅ Firestore offline persistence enabled');
    } else {
      // React Native has persistence enabled by default
      console.log('✅ Firestore persistence (React Native default)');
    }
  } catch (error) {
    console.warn('⚠️ Firestore persistence setup warning:', error.message);
    // Continue without persistence - not critical
  }
};

// Initialize Firebase Auth with enhanced error handling
let auth;
let initializationRetries = 0;
const MAX_RETRIES = 3;

const initializeFirebaseAuth = async () => {
  while (initializationRetries < MAX_RETRIES) {
    try {
      auth = initializeAuth(app, {
        persistence: getReactNativePersistence(ReactNativeAsyncStorage)
      });
      
      // Test auth connection with shorter timeout
      await new Promise((resolve, reject) => {
        const timeout = setTimeout(() => reject(new Error('Auth initialization timeout')), 5000);
        
        const unsubscribe = auth.onAuthStateChanged((user) => {
          clearTimeout(timeout);
          unsubscribe();
          resolve(user);
        });
      });
      
      console.log('✅ Firebase Auth initialized successfully');
      return true;
    } catch (error) {
      initializationRetries++;
      console.warn(`⚠️ Auth initialization attempt ${initializationRetries} failed:`, error.message);
      
      if (initializationRetries >= MAX_RETRIES) {
        console.error('❌ Max retries reached. Using fallback auth instance');
        try {
          auth = getAuth(app);
          console.log('✅ Fallback auth instance created');
        } catch (fallbackError) {
          console.error('❌ Fallback auth failed:', fallbackError.message);
        }
        return false;
      }
      
      // Wait before retry
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
  }
};

// Enhanced network connectivity checker with timeout
const checkFirebaseConnection = async () => {
  try {
    console.log('🔍 Testing Firebase connection...');
    
    // Simple timeout for faster feedback
    const connectionPromise = getDoc(doc(firestore, 'connectivity-test', 'ping'));
    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(() => reject(new Error('Connection timeout')), 5000);
    });
    
    await Promise.race([connectionPromise, timeoutPromise]);
    console.log('✅ Firebase connection test successful');
    return true;
  } catch (error) {
    console.warn('⚠️ Firebase connection test failed:', error.message);
    
    // Don't try to restart network - just return false
    // The aggressive network restart was causing "client offline" issues
    return false;
  }
};

// Network status monitoring - DISABLED to prevent offline issues
let networkCheckInterval;

const startNetworkMonitoring = () => {
  // Disabled: Automatic monitoring was causing "client offline" issues
  // The periodic connectivity checks were triggering network restarts
  console.log('📶 Network monitoring disabled to prevent offline issues');
  return;
  
  // Previous implementation commented out:
  // if (networkCheckInterval) {
  //   clearInterval(networkCheckInterval);
  // }
  // 
  // networkCheckInterval = setInterval(async () => {
  //   const isConnected = await checkFirebaseConnection();
  //   if (!isConnected) {
  //     console.log('🔄 Connection lost, attempting automatic restore...');
  //   }
  // }, 60000); // Check every minute instead of 30 seconds
};

const stopNetworkMonitoring = () => {
  if (networkCheckInterval) {
    clearInterval(networkCheckInterval);
    networkCheckInterval = null;
  }
};

// Enhanced diagnostics function
const runFirebaseDiagnostics = async () => {
  const results = {
    authInitialized: false,
    firestoreInitialized: false,
    networkConnectivity: false,
    authServiceEnabled: false,
    recommendations: []
  };

  console.log('🔍 Running comprehensive Firebase diagnostics...');

  // Check Auth initialization
  try {
    if (auth && auth.app) {
      results.authInitialized = true;
      console.log('✅ Auth Initialized: true');
    } else {
      console.log('❌ Auth Initialized: false');
      results.recommendations.push('Firebase Auth failed to initialize properly');
    }
  } catch (error) {
    console.log('❌ Auth Initialized: false -', error.message);
    results.recommendations.push('Firebase Auth initialization error: ' + error.message);
  }

  // Check Firestore initialization
  try {
    if (firestore && firestore.app) {
      results.firestoreInitialized = true;
      console.log('✅ Firestore Initialized: true');
    } else {
      console.log('❌ Firestore Initialized: false');
      results.recommendations.push('Firebase Firestore failed to initialize');
    }
  } catch (error) {
    console.log('❌ Firestore Initialized: false -', error.message);
    results.recommendations.push('Firestore initialization error: ' + error.message);
  }

  // Check Network Connectivity with graceful degradation
  try {
    const networkTest = await checkFirebaseConnection();
    results.networkConnectivity = networkTest;
    console.log(`${networkTest ? '✅' : '❌'} Network Connectivity: ${networkTest}`);
    
    if (!networkTest) {
      results.recommendations.push('Network connectivity issue - Firebase backend unreachable');
      results.recommendations.push('Enable Email/Password authentication in Firebase Console');
      results.recommendations.push('Check internet connection and restart app');
    }
  } catch (error) {
    console.log('❌ Network test failed:', error.message);
    results.networkConnectivity = false;
    results.recommendations.push('Critical network error: ' + error.message);
  }

  // Check Auth Service with fallback
  try {
    if (auth && auth.app && auth.config) {
      results.authServiceEnabled = true;
      console.log('✅ Auth Service Enabled: true');
    } else {
      console.log('❌ Auth Service Enabled: false');
      results.recommendations.push('CRITICAL: Enable Email/Password authentication in Firebase Console');
      results.recommendations.push('Go to: https://console.firebase.google.com/project/locked-dd553/authentication/providers');
    }
  } catch (error) {
    console.log('❌ Auth Service Enabled: false -', error.message);
    results.recommendations.push('Auth service error: Enable Email/Password authentication in Firebase Console');
  }

  console.log('📊 Diagnostics complete');
  return results;
};

// Initialize services with proper sequencing
const initializeFirebaseServices = async () => {
  try {
    // Initialize persistence first
    await enableFirestorePersistence();
    
    // Then initialize auth
    await initializeFirebaseAuth();
    
    console.log('🚀 Firebase services initialization complete');
  } catch (error) {
    console.error('❌ Firebase services initialization failed:', error);
  }
};

// Initialize services on import
initializeFirebaseServices();

// Export Firebase services
export { 
  auth, 
  firestore, 
  storage,
  checkFirebaseConnection, 
  runFirebaseDiagnostics,
  startNetworkMonitoring,
  stopNetworkMonitoring
};
export default app; 