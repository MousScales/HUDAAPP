/**
 * Quick check for duplicate users using Firebase Web SDK
 * No service account key needed!
 */

const { initializeApp } = require('firebase/app');
const { getFirestore, collection, getDocs } = require('firebase/firestore');
const { getAuth, connectAuthEmulator } = require('firebase/auth');

// Your Firebase config from firebase.js
const firebaseConfig = {
  apiKey: "AIzaSyD1w3gmYPDba1D3xgIN1NbtR2b0_zbBGZE",
  authDomain: "locked-dd553.firebaseapp.com",
  projectId: "locked-dd553",
  storageBucket: "locked-dd553.firebasestorage.app",
  messagingSenderId: "689382239718",
  appId: "1:689382239718:web:cae3ad18e6115187973a27"
};

console.log('🔥 Initializing Firebase...\n');
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);

async function checkDuplicates() {
  try {
    console.log('📊 Fetching all user documents from Firestore...\n');
    
    const usersRef = collection(db, 'users');
    const snapshot = await getDocs(usersRef);
    
    console.log(`✅ Found ${snapshot.size} user documents in Firestore\n`);
    console.log('='.repeat(80));
    
    // Group users by email
    const emailMap = new Map();
    const uidMap = new Map();
    
    snapshot.forEach(doc => {
      const data = doc.data();
      const uid = doc.id;
      
      uidMap.set(uid, data);
      
      if (data.email) {
        const email = data.email.toLowerCase();
        if (!emailMap.has(email)) {
          emailMap.set(email, []);
        }
        emailMap.get(email).push({
          uid: uid,
          ...data
        });
      }
    });
    
    // Find duplicates
    const duplicates = [];
    emailMap.forEach((users, email) => {
      if (users.length > 1) {
        duplicates.push({ email, users });
      }
    });
    
    console.log('\n🔍 DUPLICATE EMAIL CHECK:\n');
    
    if (duplicates.length === 0) {
      console.log('✅ No duplicate emails found in Firestore!\n');
    } else {
      console.log(`⚠️  Found ${duplicates.length} email(s) with multiple Firestore documents:\n`);
      
      duplicates.forEach((dup, index) => {
        console.log(`${index + 1}. Email: ${dup.email}`);
        console.log(`   Documents: ${dup.users.length}\n`);
        
        dup.users.forEach((user, i) => {
          console.log(`   Document ${i + 1}:`);
          console.log(`     UID: ${user.uid}`);
          console.log(`     Name: ${user.firstName || user.name || 'Not set'}`);
          console.log(`     Expo Token: ${user.expoPushToken ? user.expoPushToken.substring(0, 30) + '...' : 'None'}`);
          console.log(`     Created: ${user.createdAt ? new Date(user.createdAt.seconds * 1000).toISOString() : 'Unknown'}`);
          console.log(`     Onboarding: ${user.onboardingCompleted ? 'Complete' : 'Incomplete'}`);
          console.log('');
        });
        console.log('-'.repeat(80) + '\n');
      });
      
      console.log('⚠️  PROBLEM: Multiple Firestore documents with same email!');
      console.log('   Each document may receive notifications, causing duplicates.\n');
    }
    
    // Check for multiple push tokens per user
    console.log('='.repeat(80));
    console.log('\n🔍 PUSH TOKEN CHECK:\n');
    
    const usersWithMultipleTokens = [];
    
    snapshot.forEach(doc => {
      const data = doc.data();
      const uid = doc.id;
      
      const tokens = [];
      if (data.pushToken) tokens.push(data.pushToken);
      if (data.expoPushToken) tokens.push(data.expoPushToken);
      if (data.fcmToken) tokens.push(data.fcmToken);
      if (data.deviceTokens && Array.isArray(data.deviceTokens)) {
        tokens.push(...data.deviceTokens);
      }
      
      // Get unique tokens
      const uniqueTokens = [...new Set(tokens)];
      
      if (uniqueTokens.length > 1) {
        usersWithMultipleTokens.push({
          uid: uid,
          email: data.email || 'No email',
          name: data.firstName || data.name || 'No name',
          tokenCount: uniqueTokens.length,
          tokens: uniqueTokens
        });
      }
    });
    
    if (usersWithMultipleTokens.length === 0) {
      console.log('✅ No users with multiple push tokens found!\n');
    } else {
      console.log(`⚠️  Found ${usersWithMultipleTokens.length} user(s) with multiple push tokens:\n`);
      
      usersWithMultipleTokens.forEach((user, index) => {
        console.log(`${index + 1}. User: ${user.email}`);
        console.log(`   UID: ${user.uid}`);
        console.log(`   Name: ${user.name}`);
        console.log(`   Total tokens: ${user.tokenCount}\n`);
        user.tokens.forEach((token, i) => {
          console.log(`   Token ${i + 1}: ${token.substring(0, 40)}...`);
        });
        console.log('');
      });
      
      console.log('⚠️  PROBLEM: Users have multiple push tokens registered!');
      console.log('   Notifications are sent to each token, causing duplicates.\n');
    }
    
    // Summary
    console.log('='.repeat(80));
    console.log('\n📊 SUMMARY:\n');
    console.log(`Total Firestore documents: ${snapshot.size}`);
    console.log(`Emails with duplicate documents: ${duplicates.length}`);
    console.log(`Users with multiple tokens: ${usersWithMultipleTokens.length}`);
    
    console.log('\n🎯 LIKELY CAUSE OF DUPLICATE NOTIFICATIONS:\n');
    
    if (duplicates.length > 0) {
      console.log('⚠️  DUPLICATE FIRESTORE DOCUMENTS!');
      console.log('   Multiple documents exist for the same email.');
      console.log('   Your Cloud Functions send notifications to ALL documents.');
      console.log('   This is why you get duplicate notifications!\n');
      console.log('   👉 Solution: Delete the duplicate Firestore documents.');
    } else if (usersWithMultipleTokens.length > 0) {
      console.log('⚠️  MULTIPLE PUSH TOKENS!');
      console.log('   Users have multiple device tokens registered.');
      console.log('   Notifications are sent to each token.\n');
      console.log('   👉 Solution: Clean up old push tokens.');
    } else {
      console.log('✅ No obvious duplicates detected in Firestore!');
      console.log('   The issue might be in your Cloud Functions logic.');
      console.log('   Check if functions are triggering multiple times.\n');
    }
    
    console.log('='.repeat(80));
    console.log('\n✅ Check complete!\n');
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error);
    console.error('\nFull error details:', error.message);
    process.exit(1);
  }
}

checkDuplicates();


