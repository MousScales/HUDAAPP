// Script to fix user profile by adding name fields
// Run this in your Firebase Functions or as a one-time script

const admin = require('firebase-admin');

// Initialize Firebase Admin (you'll need to add your service account key)
// admin.initializeApp({
//   credential: admin.credential.cert(require('./path-to-your-service-account-key.json'))
// });

const db = admin.firestore();

async function fixUserProfile(userId, userName) {
  try {
    console.log(`🔧 Fixing profile for user: ${userId}`);
    
    // Get current user document
    const userRef = db.collection('users').doc(userId);
    const userDoc = await userRef.get();
    
    if (!userDoc.exists) {
      console.log('❌ User document not found');
      return;
    }
    
    const userData = userDoc.data();
    console.log('📋 Current user data:', userData);
    
    // Update with name fields
    await userRef.update({
      firstName: userName,
      name: userName,
      displayName: userName,
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    });
    
    console.log('✅ Profile updated successfully with name:', userName);
    
    // Verify the update
    const updatedDoc = await userRef.get();
    console.log('📋 Updated user data:', updatedDoc.data());
    
  } catch (error) {
    console.error('❌ Error updating profile:', error);
  }
}

// Example usage:
// fixUserProfile('your-user-id-here', 'Your Name');

module.exports = { fixUserProfile };
