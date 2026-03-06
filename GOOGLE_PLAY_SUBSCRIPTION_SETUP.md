# Google Play Console Subscription Setup Checklist

The `ITEM_UNAVAILABLE` error means your subscription products aren't properly configured or published in Google Play Console. Follow this checklist:

## ✅ Required Setup Steps

### 1. **Google Play Developer Account**
- [ ] You have an active Google Play Developer account ($25 one-time fee)
- [ ] Your account is in good standing (no suspensions)

### 2. **Merchant Account Setup** ⚠️ CRITICAL
- [ ] **Set up Google Merchant Account** (required for payments)
  - Go to Google Play Console → **Settings** → **Account details**
  - Under **Payments**, set up your merchant account
  - Add payment method (credit card)
  - Complete merchant account verification
  - **This is REQUIRED** - subscriptions won't work without it!

### 3. **App Must Be Published** ⚠️ CRITICAL
- [ ] Your app is uploaded to Google Play Console (at least to Internal Testing track)
- [ ] App is in **Production**, **Closed Testing**, or **Open Testing** track
- [ ] **Subscriptions won't work if the app is only in draft/unpublished state**

### 4. **Create Subscription Products**

Go to Google Play Console → Your App → **Monetize** → **Subscriptions**:

#### Monthly Subscription (`huda-monthly`):
- [ ] Click **Create subscription**
- [ ] **Product ID**: `huda-monthly` (must match exactly what's in RevenueCat)
- [ ] **Name**: "Huda Monthly" (or your preferred name)
- [ ] **Description**: Subscription description
- [ ] **Base plan**:
  - **Base plan ID**: `huda-monthly` (must match exactly)
  - **Billing period**: Monthly
  - **Price**: Set your monthly price
  - **Status**: **Active** (not Draft)
- [ ] **Save** and **Activate** the subscription

#### Yearly Subscription (`huda-yearly`):
- [ ] Click **Create subscription**
- [ ] **Product ID**: `huda-yearly` (must match exactly)
- [ ] **Name**: "Huda Yearly" (or your preferred name)
- [ ] **Description**: Subscription description
- [ ] **Base plan**:
  - **Base plan ID**: `huda-yearly` (must match exactly)
  - **Billing period**: Yearly
  - **Price**: Set your yearly price
  - **Status**: **Active** (not Draft)
- [ ] **Save** and **Activate** the subscription

#### Promotional Offers (Optional):
- [ ] If using promotional offers, create them under the base plans
- [ ] **Offer ID**: `huda-monthly-offer` (must match RevenueCat)
- [ ] Set discount/pricing for the offer
- [ ] **Status**: **Active**

### 5. **Verify Product IDs Match RevenueCat** ⚠️ CRITICAL

In RevenueCat Dashboard → **Products**:

- [ ] **Product ID** in RevenueCat = **Base Plan ID** in Google Play Console
  - RevenueCat: `huda-monthly` → Google Play: Base plan ID `huda-monthly` ✅
  - RevenueCat: `huda-yearly` → Google Play: Base plan ID `huda-yearly` ✅

- [ ] For promotional offers:
  - RevenueCat: `huda-monthly-offer` → Google Play: Offer ID `huda-monthly-offer` ✅

### 6. **App Package Name Must Match**

- [ ] **Google Play Console**: App package name = `com.digaifounder.huda`
- [ ] **RevenueCat Dashboard**: Android app package name = `com.digaifounder.huda`
- [ ] **google-services.json**: `package_name` = `com.digaifounder.huda`
- [ ] **app.json**: `android.package` = `com.digaifounder.huda`

All must match exactly!

### 7. **Testing Requirements**

For testing subscriptions:

- [ ] Add test accounts in Google Play Console → **Settings** → **License testing**
- [ ] Add your test Gmail accounts to the license testers list
- [ ] Test purchases won't be charged (they're free for testers)

### 8. **RevenueCat Service Account** (For Production)

- [ ] Google Play Service Account is set up (see `REVENUECAT_GOOGLE_PLAY_SERVICE_ACCOUNT.md`)
- [ ] Service account JSON is uploaded to RevenueCat Dashboard
- [ ] Service account has access in Google Play Console → **Users and permissions**

## 🔍 Common Issues & Solutions

### Issue: `ITEM_UNAVAILABLE` Error

**Possible causes:**
1. ❌ Subscription product is in **Draft** status (not **Active**)
2. ❌ App is not published (not in any testing track)
3. ❌ Product ID in RevenueCat doesn't match Base Plan ID in Google Play Console
4. ❌ Merchant account is not set up
5. ❌ Package name mismatch between Google Play, RevenueCat, and app

**Solutions:**
1. Go to Google Play Console → **Monetize** → **Subscriptions**
2. Find your subscription (`huda-monthly`)
3. Click on it → Check **Status** → Must be **Active** (not Draft)
4. If Draft, click **Activate**
5. Verify the **Base Plan ID** matches exactly what's in RevenueCat

### Issue: Product ID Mismatch

**Check:**
- Google Play Console → Subscription → **Base Plan ID** = `huda-monthly`
- RevenueCat Dashboard → Product → **Product ID** = `huda-monthly`
- They must match **exactly** (case-sensitive, no spaces)

### Issue: App Not Published

**Solution:**
- Upload your app to at least **Internal Testing** track
- Subscriptions won't work if the app is only in draft/unpublished state
- Go to **Release** → **Testing** → **Internal testing** → Upload a build

## 📋 Quick Verification Checklist

Before testing, verify:

- [ ] Merchant account is set up and verified
- [ ] App is published to at least Internal Testing track
- [ ] Subscription products are **Active** (not Draft)
- [ ] Base Plan IDs match exactly between Google Play and RevenueCat
- [ ] Package name matches everywhere (`com.digaifounder.huda`)
- [ ] Test accounts are added to license testers list

## 🚀 Next Steps

1. **Set up Merchant Account** (if not done)
2. **Publish app to Internal Testing** (if not done)
3. **Create/Activate subscriptions** in Google Play Console
4. **Verify Product IDs match** between Google Play and RevenueCat
5. **Test with a license tester account**

Once all these are done, the `ITEM_UNAVAILABLE` error should be resolved!

