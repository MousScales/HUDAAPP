# Apple Receipt Validation Setup Guide

## Overview
This guide explains how to set up Apple's server-side receipt validation using Firebase Functions for secure subscription verification.

## What This Implements

### ✅ **Server-Side Validation**
- Validates receipts with Apple's official servers
- Handles both production and sandbox environments
- More secure than client-side verification
- Handles edge cases properly (refunds, chargebacks, etc.)

### ✅ **Real Subscription Status**
- Checks actual expiration dates from Apple
- Handles auto-renewal status
- Validates against Apple's servers, not local assumptions

## Setup Steps

### 1. **Get Apple Shared Secret**

1. Go to [App Store Connect](https://appstoreconnect.apple.com)
2. Navigate to **My Apps** → Your App → **App Information**
3. Scroll down to **App-Specific Shared Secret**
4. Generate a new secret or copy existing one
5. **Save this secret** - you'll need it for Firebase Functions

### 2. **Set Firebase Environment Variable**

```bash
# Set the Apple shared secret in Firebase Functions
firebase functions:config:set apple.shared_secret="YOUR_SHARED_SECRET_HERE"
```

### 3. **Deploy Firebase Functions**

```bash
# Install dependencies
cd functions
npm install

# Deploy functions
firebase deploy --only functions
```

### 4. **Update App Configuration**

The app will now use server-side validation automatically. The `appleSubscriptionService.js` has been updated to:

- Call Firebase Function `validateAppleReceipt`
- Pass receipt data and product ID
- Handle validation results securely

## How It Works

### **Client Side (App)**
```javascript
// In appleSubscriptionService.js
const validateReceipt = httpsCallable(functions, 'validateAppleReceipt');
const result = await validateReceipt({
  receiptData: purchase.transactionReceipt,
  productId: purchase.productId
});
```

### **Server Side (Firebase Functions)**
```javascript
// In validateAppleReceipt.js
const validationResult = await validateReceiptWithApple(receiptData, sharedSecret);
const subscriptionStatus = checkSubscriptionStatus(validationResult, productId);
```

### **Apple's Servers**
- Validates receipt authenticity
- Returns subscription status
- Handles expiration dates
- Manages auto-renewal status

## Benefits

### **Security**
- ✅ Receipt validation happens server-side
- ✅ Can't be bypassed by client manipulation
- ✅ Handles Apple's security requirements

### **Accuracy**
- ✅ Real expiration dates from Apple
- ✅ Handles auto-renewal properly
- ✅ Accounts for refunds and chargebacks

### **Reliability**
- ✅ Apple's official validation API
- ✅ Handles both production and sandbox
- ✅ Proper error handling

## Testing

### **Sandbox Testing**
1. Use sandbox Apple ID for testing
2. Make test purchases
3. Receipts will be validated against sandbox environment

### **Production Testing**
1. Use real Apple ID
2. Make actual purchases
3. Receipts will be validated against production environment

## Error Handling

The system handles various Apple validation status codes:

- `0`: Success
- `21007`: Sandbox receipt sent to production
- `21008`: Production receipt sent to sandbox
- Other codes: Various validation errors

## Monitoring

Check Firebase Functions logs for validation results:

```bash
firebase functions:log
```

Look for logs like:
- `🔍 Validating receipt for user: [userId]`
- `✅ Server-side validation result: [data]`
- `✅ Subscription saved to Firestore for user: [userId]`

## Troubleshooting

### **Common Issues**

1. **Shared Secret Not Set**
   - Error: "Apple shared secret not configured"
   - Solution: Set Firebase environment variable

2. **Receipt Validation Fails**
   - Check Apple App Store Connect configuration
   - Verify product ID matches exactly

3. **Function Not Deployed**
   - Deploy functions: `firebase deploy --only functions`
   - Check function logs for errors

### **Debug Mode**

Enable debug logging in `appleSubscriptionService.js`:

```javascript
console.log('🔍 Debug: Receipt data:', purchase.transactionReceipt);
console.log('🔍 Debug: Product ID:', purchase.productId);
```

## Security Notes

- ✅ Shared secret is stored securely in Firebase Functions
- ✅ Receipt validation happens server-side
- ✅ No sensitive data exposed to client
- ✅ Proper authentication required for function calls

This implementation provides enterprise-grade subscription validation that meets Apple's security requirements and handles all edge cases properly. 