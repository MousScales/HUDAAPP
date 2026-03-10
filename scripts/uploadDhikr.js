const { initializeApp } = require('firebase/app');
const { getFirestore, collection, doc, setDoc, getDocs } = require('firebase/firestore');
const fs = require('fs');
const path = require('path');

// Firebase configuration
const firebaseConfig = {
  // Add your Firebase config here
  apiKey: "your-api-key",
  authDomain: "your-auth-domain",
  projectId: "your-project-id",
  storageBucket: "your-storage-bucket",
  messagingSenderId: "your-messaging-sender-id",
  appId: "your-app-id"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// Dhikr data directory
const dhikrDataDir = path.join(__dirname, '..', 'data', 'dhikr');

async function uploadDhikrToFirebase() {
  try {
    console.log('🚀 Starting dhikr upload to Firebase...');
    
    // Check if dhikr data directory exists
    if (!fs.existsSync(dhikrDataDir)) {
      console.error('❌ Dhikr data directory not found:', dhikrDataDir);
      return;
    }

    // Get all JSON files in the dhikr data directory
    const dhikrFiles = fs.readdirSync(dhikrDataDir).filter(file => file.endsWith('.json'));
    
    if (dhikrFiles.length === 0) {
      console.error('❌ No dhikr JSON files found in:', dhikrDataDir);
      return;
    }

    console.log(`📁 Found ${dhikrFiles.length} dhikr category files:`, dhikrFiles);

    let totalUploaded = 0;
    let currentId = 1;

    // Process each dhikr category file
    for (const file of dhikrFiles) {
      const filePath = path.join(dhikrDataDir, file);
      const categoryName = path.basename(file, '.json');
      
      console.log(`📖 Processing ${categoryName} dhikr...`);
      
      try {
        // Read and parse the JSON file
        const fileContent = fs.readFileSync(filePath, 'utf8');
        const categoryData = JSON.parse(fileContent);
        
        if (!categoryData.dhikrs || !Array.isArray(categoryData.dhikrs)) {
          console.warn(`⚠️ Invalid format in ${file} - expected dhikrs array`);
          continue;
        }

        // Upload each dhikr in the category
        for (const dhikr of categoryData.dhikrs) {
          const dhikrDoc = {
            ...dhikr,
            id: currentId,
            category: categoryData.category,
            categoryName: categoryData.name,
            categoryDescription: categoryData.description,
            uploadedAt: new Date(),
            source: dhikr.source || 'Authentic Islamic Sources',
            apiSource: 'Local JSON Upload'
          };

          // Create document reference
          const docRef = doc(db, 'dhikr', `dhikr_${categoryData.category}_${dhikr.id}`);
          
          // Upload to Firebase
          await setDoc(docRef, dhikrDoc);
          
          console.log(`✅ Uploaded: ${dhikr.title} (${categoryData.category})`);
          totalUploaded++;
          currentId++;
        }
        
        console.log(`✅ Completed ${categoryName}: ${categoryData.dhikrs.length} dhikr uploaded`);
        
      } catch (error) {
        console.error(`❌ Error processing ${file}:`, error.message);
      }
    }

    console.log(`🎉 Upload complete! ${totalUploaded} dhikr uploaded to Firebase`);
    
    // Verify upload by checking collection
    const dhikrCollection = collection(db, 'dhikr');
    const snapshot = await getDocs(dhikrCollection);
    console.log(`📊 Firebase verification: ${snapshot.size} dhikr documents in database`);
    
  } catch (error) {
    console.error('❌ Upload failed:', error);
  }
}

async function checkExistingDhikr() {
  try {
    console.log('🔍 Checking existing dhikr in Firebase...');
    const dhikrCollection = collection(db, 'dhikr');
    const snapshot = await getDocs(dhikrCollection);
    
    if (snapshot.empty) {
      console.log('📭 No existing dhikr found in Firebase');
      return false;
    }
    
    console.log(`📊 Found ${snapshot.size} existing dhikr documents`);
    
    // Show some examples
    let count = 0;
    snapshot.forEach((doc) => {
      if (count < 3) {
        const data = doc.data();
        console.log(`   - ${data.title} (${data.category})`);
        count++;
      }
    });
    
    if (snapshot.size > 3) {
      console.log(`   ... and ${snapshot.size - 3} more`);
    }
    
    return true;
  } catch (error) {
    console.error('❌ Error checking existing dhikr:', error);
    return false;
  }
}

async function main() {
  console.log('🕌 Dhikr Firebase Upload Tool');
  console.log('=' .repeat(40));
  
  // Check for existing data
  const hasExisting = await checkExistingDhikr();
  
  if (hasExisting) {
    console.log('\n⚠️  WARNING: Existing dhikr data found in Firebase!');
    console.log('This will add new documents alongside existing ones.');
    console.log('To proceed anyway, run: npm run upload-dhikr-force');
    console.log('To clear existing data first, run: npm run clear-dhikr');
    return;
  }
  
  await uploadDhikrToFirebase();
}

// Check command line arguments
const args = process.argv.slice(2);
if (args.includes('--force')) {
  console.log('🔄 Force upload mode - proceeding with upload...');
  uploadDhikrToFirebase();
} else {
  main();
}

module.exports = { uploadDhikrToFirebase, checkExistingDhikr }; 