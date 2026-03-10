/**
 * Script to check for various types of duplicate issues in Firebase
 * 
 * This checks:
 * 1. Duplicate user accounts (same email, different UID)
 * 2. Duplicate user documents in Firestore
 * 3. Multiple push tokens for the same user
 * 4. Orphaned user documents (in Firestore but not in Auth)
 * 
 * USAGE:
 * 1. Install Firebase Admin SDK: npm install firebase-admin
 * 2. Download your service account key from Firebase Console
 * 3. Save it as scripts/serviceAccountKey.json
 * 4. Run: node scripts/checkDuplicates.js
 */

const admin = require('firebase-admin');

// Initialize Firebase Admin
try {
  const serviceAccount = require('./serviceAccountKey.json');
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
  });
  console.log('✅ Firebase Admin initialized\n');
} catch (error) {
  console.error('❌ Error initializing Firebase Admin:', error.message);
  console.error('\n⚠️  Make sure you have downloaded the service account key from:');
  console.error('   https://console.firebase.google.com/project/locked-dd553/settings/serviceaccounts/adminsdk');
  console.error('   And saved it as: scripts/serviceAccountKey.json\n');
  process.exit(1);
}

const auth = admin.auth();
const db = admin.firestore();

// Function to get all users from Firebase Auth
async function getAllAuthUsers() {
  const users = [];
  let nextPageToken;
  
  do {
    const listUsersResult = await auth.listUsers(1000, nextPageToken);
    users.push(...listUsersResult.users);
    nextPageToken = listUsersResult.pageToken;
  } while (nextPageToken);
  
  return users;
}

// Function to get all user documents from Firestore
async function getAllFirestoreUsers() {
  const snapshot = await db.collection('users').get();
  return snapshot.docs.map(doc => ({
    uid: doc.id,
    ...doc.data()
  }));
}

// Function to check for duplicate emails in Auth
function checkDuplicateAuthEmails(authUsers) {
  const emailMap = new Map();
  const duplicates = [];
  
  authUsers.forEach(user => {
    if (user.email) {
      const email = user.email.toLowerCase();
      if (!emailMap.has(email)) {
        emailMap.set(email, []);
      }
      emailMap.get(email).push(user);
    }
  });
  
  emailMap.forEach((usersList, email) => {
    if (usersList.length > 1) {
      duplicates.push({ email, users: usersList });
    }
  });
  
  return duplicates;
}

// Function to check for duplicate emails in Firestore
function checkDuplicateFirestoreEmails(firestoreUsers) {
  const emailMap = new Map();
  const duplicates = [];
  
  firestoreUsers.forEach(user => {
    if (user.email) {
      const email = user.email.toLowerCase();
      if (!emailMap.has(email)) {
        emailMap.set(email, []);
      }
      emailMap.get(email).push(user);
    }
  });
  
  emailMap.forEach((usersList, email) => {
    if (usersList.length > 1) {
      duplicates.push({ email, users: usersList });
    }
  });
  
  return duplicates;
}

// Function to check for multiple push tokens per user
async function checkMultiplePushTokens() {
  const usersWithMultipleTokens = [];
  
  const snapshot = await db.collection('users').get();
  
  for (const doc of snapshot.docs) {
    const userData = doc.data();
    
    // Check for multiple token fields
    const tokens = [];
    if (userData.pushToken) tokens.push({ type: 'pushToken', value: userData.pushToken });
    if (userData.expoPushToken) tokens.push({ type: 'expoPushToken', value: userData.expoPushToken });
    if (userData.fcmToken) tokens.push({ type: 'fcmToken', value: userData.fcmToken });
    if (userData.deviceTokens && Array.isArray(userData.deviceTokens)) {
      userData.deviceTokens.forEach(token => {
        tokens.push({ type: 'deviceTokens', value: token });
      });
    }
    
    // Remove duplicates
    const uniqueTokens = Array.from(new Set(tokens.map(t => t.value)));
    
    if (uniqueTokens.length > 1) {
      usersWithMultipleTokens.push({
        uid: doc.id,
        email: userData.email,
        tokens: uniqueTokens,
        tokenCount: uniqueTokens.length
      });
    }
  }
  
  return usersWithMultipleTokens;
}

// Function to check for orphaned Firestore documents
function checkOrphanedDocuments(authUsers, firestoreUsers) {
  const authUids = new Set(authUsers.map(u => u.uid));
  const orphaned = firestoreUsers.filter(u => !authUids.has(u.uid));
  return orphaned;
}

// Function to check for missing Firestore documents
function checkMissingDocuments(authUsers, firestoreUsers) {
  const firestoreUids = new Set(firestoreUsers.map(u => u.uid));
  const missing = authUsers.filter(u => !firestoreUids.has(u.uid));
  return missing;
}

// Main function
async function main() {
  console.log('🔍 Starting comprehensive duplicate check...\n');
  console.log('=' .repeat(80));
  
  // 1. Get all data
  console.log('\n📊 Fetching data from Firebase...\n');
  
  const authUsers = await getAllAuthUsers();
  console.log(`✅ Firebase Auth users: ${authUsers.length}`);
  
  const firestoreUsers = await getAllFirestoreUsers();
  console.log(`✅ Firestore user documents: ${firestoreUsers.length}`);
  
  // 2. Check for duplicate emails in Auth
  console.log('\n' + '=' .repeat(80));
  console.log('\n🔍 Checking for duplicate emails in Firebase Auth...\n');
  
  const authDuplicates = checkDuplicateAuthEmails(authUsers);
  
  if (authDuplicates.length === 0) {
    console.log('✅ No duplicate emails found in Firebase Auth');
  } else {
    console.log(`⚠️  Found ${authDuplicates.length} email(s) with duplicate accounts:\n`);
    
    authDuplicates.forEach((dup, index) => {
      console.log(`${index + 1}. Email: ${dup.email}`);
      dup.users.forEach((user, i) => {
        console.log(`   Account ${i + 1}:`);
        console.log(`     UID: ${user.uid}`);
        console.log(`     Provider: ${user.providerData.map(p => p.providerId).join(', ')}`);
        console.log(`     Created: ${user.metadata.creationTime}`);
        console.log(`     Last Sign In: ${user.metadata.lastSignInTime}`);
      });
      console.log('');
    });
  }
  
  // 3. Check for duplicate emails in Firestore
  console.log('=' .repeat(80));
  console.log('\n🔍 Checking for duplicate emails in Firestore...\n');
  
  const firestoreDuplicates = checkDuplicateFirestoreEmails(firestoreUsers);
  
  if (firestoreDuplicates.length === 0) {
    console.log('✅ No duplicate emails found in Firestore');
  } else {
    console.log(`⚠️  Found ${firestoreDuplicates.length} email(s) with duplicate documents:\n`);
    
    firestoreDuplicates.forEach((dup, index) => {
      console.log(`${index + 1}. Email: ${dup.email}`);
      dup.users.forEach((user, i) => {
        console.log(`   Document ${i + 1}:`);
        console.log(`     UID: ${user.uid}`);
        console.log(`     Name: ${user.firstName || user.name || 'Not set'}`);
        console.log(`     Push Token: ${user.pushToken ? user.pushToken.substring(0, 20) + '...' : 'None'}`);
        console.log(`     Expo Token: ${user.expoPushToken ? user.expoPushToken.substring(0, 20) + '...' : 'None'}`);
      });
      console.log('');
    });
  }
  
  // 4. Check for multiple push tokens per user
  console.log('=' .repeat(80));
  console.log('\n🔍 Checking for users with multiple push tokens...\n');
  
  const multipleTokenUsers = await checkMultiplePushTokens();
  
  if (multipleTokenUsers.length === 0) {
    console.log('✅ No users with multiple push tokens found');
  } else {
    console.log(`⚠️  Found ${multipleTokenUsers.length} user(s) with multiple push tokens:\n`);
    
    multipleTokenUsers.forEach((user, index) => {
      console.log(`${index + 1}. User: ${user.email || 'No email'}`);
      console.log(`   UID: ${user.uid}`);
      console.log(`   Total unique tokens: ${user.tokenCount}`);
      user.tokens.forEach((token, i) => {
        console.log(`   Token ${i + 1}: ${token.substring(0, 30)}...`);
      });
      console.log('');
    });
    
    console.log('💡 TIP: Multiple tokens mean notifications are being sent multiple times!');
    console.log('   This is likely the cause of duplicate notifications.\n');
  }
  
  // 5. Check for orphaned Firestore documents
  console.log('=' .repeat(80));
  console.log('\n🔍 Checking for orphaned Firestore documents...\n');
  
  const orphaned = checkOrphanedDocuments(authUsers, firestoreUsers);
  
  if (orphaned.length === 0) {
    console.log('✅ No orphaned Firestore documents found');
  } else {
    console.log(`⚠️  Found ${orphaned.length} Firestore document(s) without Auth account:\n`);
    
    orphaned.forEach((user, index) => {
      console.log(`${index + 1}. UID: ${user.uid}`);
      console.log(`   Email: ${user.email || 'No email'}`);
      console.log(`   Name: ${user.firstName || user.name || 'Not set'}`);
      console.log('');
    });
    
    console.log('💡 TIP: These documents exist in Firestore but the user was deleted from Auth.');
    console.log('   They should be cleaned up.\n');
  }
  
  // 6. Check for missing Firestore documents
  console.log('=' .repeat(80));
  console.log('\n🔍 Checking for Auth users without Firestore documents...\n');
  
  const missing = checkMissingDocuments(authUsers, firestoreUsers);
  
  if (missing.length === 0) {
    console.log('✅ All Auth users have Firestore documents');
  } else {
    console.log(`⚠️  Found ${missing.length} Auth user(s) without Firestore document:\n`);
    
    missing.forEach((user, index) => {
      console.log(`${index + 1}. UID: ${user.uid}`);
      console.log(`   Email: ${user.email || 'No email'}`);
      console.log(`   Provider: ${user.providerData.map(p => p.providerId).join(', ')}`);
      console.log('');
    });
    
    console.log('💡 TIP: These users exist in Auth but don\'t have a Firestore profile.');
    console.log('   They may not have completed onboarding.\n');
  }
  
  // Summary
  console.log('=' .repeat(80));
  console.log('\n📊 SUMMARY\n');
  console.log(`Total Auth users: ${authUsers.length}`);
  console.log(`Total Firestore documents: ${firestoreUsers.length}`);
  console.log(`Duplicate emails in Auth: ${authDuplicates.length}`);
  console.log(`Duplicate emails in Firestore: ${firestoreDuplicates.length}`);
  console.log(`Users with multiple tokens: ${multipleTokenUsers.length}`);
  console.log(`Orphaned Firestore documents: ${orphaned.length}`);
  console.log(`Auth users without Firestore: ${missing.length}`);
  
  // Determine the likely cause
  console.log('\n=' .repeat(80));
  console.log('\n🎯 LIKELY CAUSE OF DUPLICATE NOTIFICATIONS:\n');
  
  if (multipleTokenUsers.length > 0) {
    console.log('⚠️  MULTIPLE PUSH TOKENS DETECTED!');
    console.log('   Your users have multiple device tokens registered.');
    console.log('   This is the most likely cause of duplicate notifications.');
    console.log('\n   Solution: Clean up old push tokens when user logs in/out.');
  } else if (firestoreDuplicates.length > 0) {
    console.log('⚠️  DUPLICATE FIRESTORE DOCUMENTS DETECTED!');
    console.log('   Multiple Firestore documents exist for the same email.');
    console.log('   Each document may have a push token, causing duplicate notifications.');
    console.log('\n   Solution: Merge duplicate Firestore documents.');
  } else if (authDuplicates.length > 0) {
    console.log('⚠️  DUPLICATE AUTH ACCOUNTS DETECTED!');
    console.log('   Multiple Firebase Auth accounts exist for the same email.');
    console.log('\n   Solution: Merge duplicate auth accounts.');
  } else {
    console.log('✅ No obvious duplicates detected!');
    console.log('   The issue might be in your notification sending logic.');
    console.log('   Check your Cloud Functions logs for duplicate sends.');
  }
  
  console.log('\n' + '=' .repeat(80));
  console.log('\n✅ Check complete!\n');
  
  process.exit(0);
}

// Run the script
main().catch(error => {
  console.error('❌ Fatal error:', error);
  process.exit(1);
});


