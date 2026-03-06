#!/bin/bash

echo "🚀 Deploying Prayer Blocker Cloud Function..."
echo ""

# Navigate to project directory
cd "$(dirname "$0")"

# Use npx to avoid needing global firebase-tools installation
echo "🔐 Checking Firebase authentication..."
npx --yes firebase-tools login

# Deploy the specific function
echo "📤 Deploying checkPrayerTimesAndNotify function..."
npx --yes firebase-tools deploy --only functions:checkPrayerTimesAndNotify

# Check deployment status
if [ $? -eq 0 ]; then
    echo ""
    echo "✅ Prayer Blocker Cloud Function deployed successfully!"
    echo ""
    echo "📊 Next steps:"
    echo "1. The function will run every minute automatically"
    echo "2. It checks all users with prayerBlockerEnabled = true"
    echo "3. Sends push notifications when prayer times arrive"
    echo "4. The app receives notifications and activates blocking"
    echo ""
    echo "🧪 To test:"
    echo "- Enable Prayer Blocker in your app settings"
    echo "- Wait for the next prayer time"
    echo "- Check Firebase Functions logs: npx firebase-tools functions:log"
else
    echo ""
    echo "❌ Deployment failed. Please check the error message above."
    echo ""
    echo "Common fixes:"
    echo "1. Run: npx firebase-tools login"
    echo "2. Check your Firebase project configuration"
    echo "3. Ensure you have the correct permissions"
fi

