/**
 * Script to identify and fix duplicate user accounts in Firebase
 * 
 * This script finds users with the same email but different UIDs
 * (typically happens when users sign up with email/password and later with Apple Sign-In)
 * 
 * USAGE:
 * 1. Install Firebase Admin SDK: npm install firebase-admin
 * 2. Download your service account key from Firebase Console
 * 3. Update the path to your service account key below
 * 4. Run: node scripts/fixDuplicateUsers.js
 */

const admin = require('firebase-admin');
const readline = require('readline');

// Initialize Firebase Admin
// Download your service account key from:
// https://console.firebase.google.com/project/locked-dd553/settings/serviceaccounts/adminsdk
const serviceAccount = require('./serviceAccountKey.json'); // You need to download this

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const auth = admin.auth();
const db = admin.firestore();

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

// Helper function to ask yes/no questions
function askQuestion(question) {
  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      resolve(answer.toLowerCase() === 'y' || answer.toLowerCase() === 'yes');
    });
  });
}

// Function to get all users from Firebase Auth
async function getAllUsers() {
  const users = [];
  let nextPageToken;
  
  do {
    const listUsersResult = await auth.listUsers(1000, nextPageToken);
    users.push(...listUsersResult.users);
    nextPageToken = listUsersResult.pageToken;
  } while (nextPageToken);
  
  return users;
}

// Function to find duplicate users (same email, different UID)
function findDuplicateUsers(users) {
  const emailMap = new Map();
  const duplicates = [];
  
  users.forEach(user => {
    if (user.email) {
      const email = user.email.toLowerCase();
      if (!emailMap.has(email)) {
        emailMap.set(email, []);
      }
      emailMap.get(email).push(user);
    }
  });
  
  // Find emails with multiple users
  emailMap.forEach((usersList, email) => {
    if (usersList.length > 1) {
      duplicates.push({
        email,
        users: usersList
      });
    }
  });
  
  return duplicates;
}

// Function to get user data from Firestore
async function getUserFirestoreData(uid) {
  try {
    const userDoc = await db.collection('users').doc(uid).get();
    if (userDoc.exists) {
      return userDoc.data();
    }
    return null;
  } catch (error) {
    console.error(`Error fetching Firestore data for ${uid}:`, error);
    return null;
  }
}

// Function to merge user data
async function mergeUserData(keepUid, deleteUid, keepData, deleteData) {
  // Merge the data - keeping the most complete data
  const mergedData = { ...keepData };
  
  // If delete account has data that keep account doesn't, copy it over
  if (deleteData) {
    Object.keys(deleteData).forEach(key => {
      if (!mergedData[key] && deleteData[key]) {
        mergedData[key] = deleteData[key];
      }
    });
    
    // Always keep the older createdAt date
    if (deleteData.createdAt && (!mergedData.createdAt || deleteData.createdAt < mergedData.createdAt)) {
      mergedData.createdAt = deleteData.createdAt;
    }
  }
  
  // Update the keep account with merged data
  await db.collection('users').doc(keepUid).set(mergedData, { merge: true });
  
  return mergedData;
}

// Function to migrate user data from one account to another
async function migrateUserData(fromUid, toUid) {
  console.log(`📦 Migrating data from ${fromUid} to ${toUid}...`);
  
  // Collections to migrate
  const collections = ['bookmarks', 'progress', 'streaks', 'lessons'];
  
  for (const collectionName of collections) {
    try {
      const snapshot = await db.collection(collectionName)
        .where('userId', '==', fromUid)
        .get();
      
      if (!snapshot.empty) {
        console.log(`  📄 Migrating ${snapshot.size} documents from ${collectionName}...`);
        
        const batch = db.batch();
        snapshot.docs.forEach(doc => {
          const newDocRef = db.collection(collectionName).doc();
          batch.set(newDocRef, {
            ...doc.data(),
            userId: toUid,
            migratedFrom: fromUid,
            migratedAt: admin.firestore.FieldValue.serverTimestamp()
          });
        });
        
        await batch.commit();
        console.log(`  ✅ Migrated ${snapshot.size} documents from ${collectionName}`);
      }
    } catch (error) {
      console.error(`  ❌ Error migrating ${collectionName}:`, error);
    }
  }
}

// Function to delete a user account
async function deleteUser(uid) {
  try {
    // Delete from Auth
    await auth.deleteUser(uid);
    console.log(`  ✅ Deleted user from Firebase Auth: ${uid}`);
    
    // Delete from Firestore
    await db.collection('users').doc(uid).delete();
    console.log(`  ✅ Deleted user document from Firestore: ${uid}`);
    
    return true;
  } catch (error) {
    console.error(`  ❌ Error deleting user ${uid}:`, error);
    return false;
  }
}

// Main function
async function main() {
  console.log('🔍 Fetching all users from Firebase Auth...\n');
  
  const allUsers = await getAllUsers();
  console.log(`📊 Total users found: ${allUsers.length}\n`);
  
  console.log('🔍 Looking for duplicate accounts (same email, different UID)...\n');
  
  const duplicates = findDuplicateUsers(allUsers);
  
  if (duplicates.length === 0) {
    console.log('✅ No duplicate users found! All emails are unique.\n');
    rl.close();
    process.exit(0);
  }
  
  console.log(`⚠️  Found ${duplicates.length} email(s) with duplicate accounts:\n`);
  
  // Process each duplicate
  for (let i = 0; i < duplicates.length; i++) {
    const duplicate = duplicates[i];
    console.log(`\n${'='.repeat(80)}`);
    console.log(`📧 Email: ${duplicate.email} (${i + 1}/${duplicates.length})`);
    console.log(`${'='.repeat(80)}\n`);
    
    // Fetch Firestore data for each user
    for (let j = 0; j < duplicate.users.length; j++) {
      const user = duplicate.users[j];
      const firestoreData = await getUserFirestoreData(user.uid);
      
      console.log(`Account ${j + 1}:`);
      console.log(`  UID: ${user.uid}`);
      console.log(`  Provider: ${user.providerData.map(p => p.providerId).join(', ')}`);
      console.log(`  Created: ${user.metadata.creationTime}`);
      console.log(`  Last Sign In: ${user.metadata.lastSignInTime}`);
      console.log(`  Has Firestore Data: ${firestoreData ? 'Yes' : 'No'}`);
      
      if (firestoreData) {
        console.log(`  Profile Complete: ${firestoreData.onboardingCompleted ? 'Yes' : 'No'}`);
        console.log(`  Name: ${firestoreData.firstName || firestoreData.name || 'Not set'}`);
        console.log(`  Madhab: ${firestoreData.madhab || 'Not set'}`);
        console.log(`  Language: ${firestoreData.language || 'Not set'}`);
      }
      console.log('');
      
      // Store firestore data on user object for later use
      user.firestoreData = firestoreData;
    }
    
    // Ask user which account to keep
    console.log('\n🤔 Which account would you like to KEEP?');
    console.log('   (The other account(s) will be deleted after migrating data)\n');
    
    for (let j = 0; j < duplicate.users.length; j++) {
      console.log(`   ${j + 1}) Account ${j + 1} (${duplicate.users[j].providerData.map(p => p.providerId).join(', ')})`);
    }
    console.log(`   ${duplicate.users.length + 1}) Skip this duplicate (don't merge)\n`);
    
    const choice = await new Promise((resolve) => {
      rl.question(`Enter your choice (1-${duplicate.users.length + 1}): `, resolve);
    });
    
    const choiceNum = parseInt(choice);
    
    if (choiceNum === duplicate.users.length + 1) {
      console.log('⏭️  Skipping this duplicate...\n');
      continue;
    }
    
    if (isNaN(choiceNum) || choiceNum < 1 || choiceNum > duplicate.users.length) {
      console.log('❌ Invalid choice. Skipping this duplicate...\n');
      continue;
    }
    
    const keepIndex = choiceNum - 1;
    const keepUser = duplicate.users[keepIndex];
    const deleteUsers = duplicate.users.filter((_, index) => index !== keepIndex);
    
    console.log(`\n✅ Keeping account: ${keepUser.uid}`);
    console.log(`❌ Will delete: ${deleteUsers.map(u => u.uid).join(', ')}\n`);
    
    const confirm = await askQuestion('Are you sure you want to proceed? (y/n): ');
    
    if (!confirm) {
      console.log('⏭️  Skipping this duplicate...\n');
      continue;
    }
    
    // Merge and migrate data
    for (const deleteUser of deleteUsers) {
      console.log(`\n🔄 Processing deletion of ${deleteUser.uid}...`);
      
      // Migrate Firestore data
      await migrateUserData(deleteUser.uid, keepUser.uid);
      
      // Merge user profile data
      if (deleteUser.firestoreData || keepUser.firestoreData) {
        console.log(`  📝 Merging user profile data...`);
        await mergeUserData(
          keepUser.uid,
          deleteUser.uid,
          keepUser.firestoreData || {},
          deleteUser.firestoreData || {}
        );
        console.log(`  ✅ Profile data merged`);
      }
      
      // Delete the user
      const deleted = await deleteUser(deleteUser.uid);
      
      if (deleted) {
        console.log(`  ✅ Successfully deleted account ${deleteUser.uid}`);
      }
    }
    
    console.log(`\n✅ Finished processing ${duplicate.email}\n`);
  }
  
  console.log('\n✅ All duplicates processed!\n');
  rl.close();
  process.exit(0);
}

// Run the script
main().catch(error => {
  console.error('❌ Fatal error:', error);
  rl.close();
  process.exit(1);
});


