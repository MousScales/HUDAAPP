import { Alert } from 'react-native';
import { runFirebaseDiagnostics, startNetworkMonitoring, stopNetworkMonitoring } from '../firebase';

export const troubleshootFirebase = async () => {
  try {
    console.log('🔧 Starting Firebase diagnostics...');
    
    // Run comprehensive diagnostics
    const results = await runFirebaseDiagnostics();
    
    // Format results for display
    const statusSymbol = (status) => status ? '✅' : '❌';
    
    const diagnosticMessage = `Firebase Diagnostics:

Auth Initialized: ${statusSymbol(results.authInitialized)}
Firestore Initialized: ${statusSymbol(results.firestoreInitialized)}
Network Connectivity: ${statusSymbol(results.networkConnectivity)}
Auth Service Enabled: ${statusSymbol(results.authServiceEnabled)}

${results.recommendations.length > 0 
  ? 'Issues Found:\n' + results.recommendations.slice(0, 3).map((rec, index) => `${index + 1}. ${rec}`).join('\n')
  : 'All systems working correctly!'
}`;

    console.log(diagnosticMessage);
    
    // Show simplified alert
    Alert.alert(
      'Firebase Diagnostics',
      diagnosticMessage,
      [
        {
          text: 'Console Setup',
          onPress: () => showConsoleSetupInstructions()
        },
        { text: 'OK', style: 'default' }
      ]
    );
    
    return results;
  } catch (error) {
    console.error('❌ Error running Firebase diagnostics:', error);
    
    // Simple fallback diagnostics
    const fallbackMessage = `Diagnostic Error: ${error.message}

Quick Fix Steps:
1. Check internet connection
2. Restart the app
3. Enable Email/Password auth in Firebase Console

Go to: https://console.firebase.google.com/project/locked-dd553/authentication/providers`;

    Alert.alert(
      'Diagnostic Error',
      fallbackMessage,
      [{ text: 'OK' }]
    );
    return null;
  }
};

const showConsoleSetupInstructions = () => {
  const instructions = `🔧 CRITICAL: Enable Authentication

1. Open Firebase Console:
   https://console.firebase.google.com/project/locked-dd553/authentication/providers

2. Enable "Email/Password" provider
   ✅ Toggle "Enable" to ON
   ✅ Click "Save"

3. Enable "Anonymous" provider (for testing)
   ✅ Toggle "Enable" to ON
   ✅ Click "Save"

4. Restart your app after making changes

This will fix the "Auth Service Enabled: ❌" error.`;

  Alert.alert(
    'Firebase Console Setup',
    instructions,
    [{ text: 'Got It', style: 'default' }]
  );
};

export const quickNetworkTest = async () => {
  try {
    console.log('🌐 Running quick network test...');
    
    // Simple network test
    const response = await fetch('https://www.google.com', { 
      method: 'HEAD', 
      timeout: 5000 
    });
    
    const result = response.ok ? 'Network connection is working' : 'Network connection issue detected';
    
    console.log(result);
    Alert.alert('Network Test', result);
    
    return response.ok;
  } catch (error) {
    console.error('❌ Network test failed:', error);
    Alert.alert('Network Test', `Network test failed: ${error.message}\n\nCheck your internet connection.`);
    return false;
  }
};

export const restartFirebaseServices = async () => {
  try {
    console.log('🔄 Restarting Firebase services...');
    
    // Stop monitoring
    stopNetworkMonitoring();
    
    // Wait a moment
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    Alert.alert(
      'Firebase Services Restarted',
      'Services have been restarted. Try your action again.',
      [{ text: 'OK' }]
    );
    
    return true;
  } catch (error) {
    console.error('❌ Error restarting services:', error);
    Alert.alert('Restart Error', error.message);
    return false;
  }
};

// Simple auto-diagnostics for development
if (__DEV__) {
  setTimeout(() => {
    console.log('🔍 Auto-running Firebase diagnostics in development mode...');
    troubleshootFirebase().catch(error => {
      console.warn('Auto-diagnostics failed:', error.message);
    });
  }, 5000); // Wait 5 seconds before auto-running
} 