const { onCall, HttpsError } = require('firebase-functions/v2/https');
const { defineSecret } = require('firebase-functions/params');
const axios = require('axios');

// Define the Apple shared secret as a secret parameter
const appleSharedSecret = defineSecret('APPLE_SHARED_SECRET');

// Apple's receipt validation endpoints
const APPLE_SANDBOX_URL = 'https://sandbox.itunes.apple.com/verifyReceipt';
const APPLE_PRODUCTION_URL = 'https://buy.itunes.apple.com/verifyReceipt';

/**
 * Validates Apple receipt with Apple's servers
 * @param {string} receiptData - Base64 encoded receipt data
 * @param {string} password - App-specific shared secret (from App Store Connect)
 * @returns {Object} Validation result from Apple
 */
async function validateReceiptWithApple(receiptData, password) {
  try {
    // Try production first
    const productionResponse = await axios.post(APPLE_PRODUCTION_URL, {
      'receipt-data': receiptData,
      'password': password,
      'exclude-old-transactions': true
    });

    // If production returns 21007, it's a sandbox receipt
    if (productionResponse.data.status === 21007) {
      console.log('📱 Receipt is from sandbox, trying sandbox validation');
      const sandboxResponse = await axios.post(APPLE_SANDBOX_URL, {
        'receipt-data': receiptData,
        'password': password,
        'exclude-old-transactions': true
      });
      return sandboxResponse.data;
    }

    return productionResponse.data;
  } catch (error) {
    console.error('❌ Error validating receipt with Apple:', error);
    throw error;
  }
}

/**
 * Checks if subscription is active based on Apple's validation response
 * @param {Object} validationResult - Response from Apple's validation API
 * @param {string} productId - The subscription product ID to check
 * @returns {Object} Subscription status
 */
function checkSubscriptionStatus(validationResult, productId) {
  try {
    const { status, receipt } = validationResult;
    
    // Check if validation was successful
    if (status !== 0) {
      console.log('❌ Receipt validation failed with status:', status);
      return {
        isActive: false,
        error: `Receipt validation failed: ${status}`,
        status
      };
    }

    // Get the latest receipt info
    const latestReceiptInfo = receipt.latest_receipt_info;
    if (!latestReceiptInfo || latestReceiptInfo.length === 0) {
      console.log('❌ No receipt info found');
      return {
        isActive: false,
        error: 'No receipt info found'
      };
    }

    // Find our subscription in the receipt
    const subscription = latestReceiptInfo.find(item => 
      item.product_id === productId
    );

    if (!subscription) {
      console.log('❌ Subscription not found in receipt');
      return {
        isActive: false,
        error: 'Subscription not found in receipt'
      };
    }

    // Check if subscription is active
    const now = Math.floor(Date.now() / 1000);
    const expiresDate = parseInt(subscription.expires_date_ms) / 1000;
    const isActive = expiresDate > now;

    console.log('🔍 Subscription check:', {
      productId: subscription.product_id,
      purchaseDate: new Date(parseInt(subscription.purchase_date_ms)),
      expiresDate: new Date(expiresDate * 1000),
      isActive,
      now: new Date(now * 1000)
    });

    return {
      isActive,
      subscription,
      expiresDate: new Date(expiresDate * 1000),
      purchaseDate: new Date(parseInt(subscription.purchase_date_ms))
    };

  } catch (error) {
    console.error('❌ Error checking subscription status:', error);
    return {
      isActive: false,
      error: error.message
    };
  }
}

/**
 * Firebase function to validate Apple receipt
 */
exports.validateAppleReceipt = onCall(
  { secrets: [appleSharedSecret] },
  async (request) => {
    try {
      // Check if user is authenticated
      if (!request.auth) {
        throw new HttpsError('unauthenticated', 'User must be authenticated');
      }

      const { receiptData, productId } = request.data;
      
      if (!receiptData || !productId) {
        throw new HttpsError('invalid-argument', 'receiptData and productId are required');
      }

      // Get app-specific shared secret from Firebase secrets
      const sharedSecret = appleSharedSecret.value();
      if (!sharedSecret) {
        throw new HttpsError('internal', 'Apple shared secret not configured');
      }

    console.log('🔍 Validating receipt for user:', request.auth.uid);
    console.log('📦 Product ID:', productId);

    // Validate receipt with Apple
    const validationResult = await validateReceiptWithApple(receiptData, sharedSecret);
    
    // Check subscription status
    const subscriptionStatus = checkSubscriptionStatus(validationResult, productId);

    // If subscription is active, save to Firestore
    if (subscriptionStatus.isActive) {
      const admin = require('firebase-admin');
      const db = admin.firestore();
      
      await db.collection('users').doc(request.auth.uid)
        .collection('subscription').doc('apple').set({
          productId: subscriptionStatus.subscription.product_id,
          purchaseDate: subscriptionStatus.purchaseDate,
          expiresDate: subscriptionStatus.expiresDate,
          isActive: true,
          lastVerified: admin.firestore.FieldValue.serverTimestamp(),
          platform: 'apple',
          transactionId: subscriptionStatus.subscription.transaction_id,
          originalTransactionId: subscriptionStatus.subscription.original_transaction_id
        });
      
      console.log('✅ Subscription saved to Firestore for user:', request.auth.uid);
    }

    return {
      success: true,
      isActive: subscriptionStatus.isActive,
      subscription: subscriptionStatus.subscription,
      expiresDate: subscriptionStatus.expiresDate,
      purchaseDate: subscriptionStatus.purchaseDate,
      error: subscriptionStatus.error
    };

  } catch (error) {
    console.error('❌ Error in validateAppleReceipt function:', error);
    throw new HttpsError('internal', error.message);
  }
});

module.exports = {
  validateAppleReceipt: exports.validateAppleReceipt,
  validateReceiptWithApple,
  checkSubscriptionStatus
}; 