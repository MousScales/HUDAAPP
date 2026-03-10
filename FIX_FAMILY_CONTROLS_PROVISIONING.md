# Fix Family Controls Provisioning Profiles for Distribution

## Problem
EAS is using cached provisioning profiles that were created with **Family Controls (Development)** capability instead of **Family Controls (Distribution)**. This causes build failures for App Store distribution.

## Solution: Regenerate Provisioning Profiles

You need to delete the existing provisioning profiles and let EAS regenerate them with the correct Distribution capability.

### Step 1: Delete Existing iOS Credentials

Run this command and follow the prompts:

```bash
npx eas credentials
```

1. Select **iOS**
2. Select **production** (or the profile you're using)
3. For each target, select **Remove credentials**:
   - `com.digaifounder.huda` (Hud)
   - `com.digaifounder.huda.device-activity-monitor` (PrayerBlocker)
   - `com.digaifounder.huda.widget` (Prayer Times Widget)
   - `com.digaifounder.huda.PrayerShieldAction`
   - `com.digaifounder.huda.PrayerShieldConfig`
4. Confirm deletion

### Step 2: Regenerate Credentials

After deleting, EAS will automatically regenerate the credentials when you run the build. Make sure:

1. You're logged into your Apple Developer account (EAS will prompt you)
2. Your Apple Developer account has **Family Controls** capability enabled for Distribution (not just Development)
3. The `eas.json` has `"distribution": "store"` set (already configured)

### Step 3: Verify Apple Developer Portal

**IMPORTANT:** Family Controls requires special approval from Apple. Make sure:

1. Go to [Apple Developer Portal](https://developer.apple.com/account/resources/identifiers/list)
2. Check that your App ID has **Family Controls** capability enabled
3. For Distribution profiles, Family Controls must be approved for **Distribution**, not just Development
4. If you only see Development Family Controls, you may need to:
   - Request Distribution access from Apple
   - Or wait for approval if you recently requested it

### Step 4: Rebuild

After credentials are regenerated, run:

```bash
npx eas build --platform ios --profile production
```

## Alternative: Manual Provisioning Profile Setup

If EAS continues to have issues, you can manually create provisioning profiles:

1. Go to [Apple Developer Portal → Certificates, Identifiers & Profiles](https://developer.apple.com/account/resources/profiles/list)
2. Create **App Store Distribution** provisioning profiles for each target
3. Make sure each profile includes:
   - **Family Controls** capability (Distribution)
   - Correct App ID
   - Distribution certificate
4. Upload via `npx eas credentials`

## Current Configuration

- ✅ `eas.json` has `"distribution": "store"` for production
- ✅ `app.json` has `"com.apple.developer.family-controls": true` in entitlements
- ⚠️ Need to regenerate provisioning profiles with Distribution Family Controls
