# Fix Android Signing Key Issue

## Problem
Your Android App Bundle is signed with the wrong key. Google Play Console expects:
- **Expected SHA1**: `1F:C7:C4:E7:C8:39:A1:A0:A2:79:7E:D4:5F:AB:BA:FB:93:4D:94:3F`
- **Your Bundle SHA1**: `B1:5F:34:53:1E:9C:DC:39:68:17:C5:B0:5E:71:14:F4:98:16:8D:BA`

## Solution Steps

### Step 1: Check Your EAS Credentials

Run this command to see your current Android signing credentials:

```bash
eas credentials
```

Then select:
- **Platform**: Android
- **Project**: Your project (should auto-select)
- **Action**: View credentials

This will show you:
- Whether you have credentials set up
- The SHA1 fingerprint of your current signing key
- Whether it matches what Google Play expects

### Step 2: Determine Your Situation

#### Scenario A: First Time Uploading to Google Play
If this is your first upload (app has never been published):
1. Build with production profile (Step 3)
2. EAS will create a new signing key
3. Get the SHA1 from the build output or EAS dashboard
4. **Before uploading**, go to Google Play Console → App Signing → Upload key certificate
5. Add/register the SHA1 fingerprint from your EAS build
6. Then upload your `.aab` file

**Important**: If you see an error about the wrong key, it means Google Play already has a registered key. In that case, you're in Scenario B.

#### Scenario B: App Already Exists in Google Play
If you've uploaded before:
1. You need to use the SAME signing key as before
2. Check if you have the original keystore file
3. If you have it, upload it to EAS (see Step 4)
4. If you don't have it, you may need to contact Google Play support

### Step 3: Build with Production Profile

**IMPORTANT**: Always use `production` profile for Google Play uploads, NOT `development` or `preview`.

```bash
eas build --profile production --platform android
```

This will:
- Create a production build
- Sign it with the correct key (if configured)
- Generate an `.aab` file ready for Google Play

### Step 4: Upload Existing Keystore to EAS (If Needed)

If you have the original keystore file that matches Google Play's expected SHA1:

```bash
eas credentials
```

Then:
1. Select **Android** platform
2. Select **Set up credentials**
3. Choose **Upload existing keystore**
4. Provide:
   - Keystore file path
   - Keystore password
   - Key alias
   - Key password

### Step 5: Verify the Signing Key

After building, verify the SHA1 matches:

1. **From EAS Dashboard**:
   - Go to https://expo.dev
   - Navigate to your project → Builds
   - Click on the latest Android build
   - Check the "Signing Certificate" section

2. **From Build Output**:
   - The build output will show the SHA1 fingerprint
   - Compare it with Google Play Console's expected SHA1

3. **Using Keytool** (if you have the keystore):
   ```bash
   keytool -list -v -keystore your-keystore.jks -alias your-key-alias
   ```

### Step 6: Update Google Play Console (If First Upload)

If this is your first upload and EAS created a new key:

**How to Navigate to App Signing in Google Play Console:**

1. **Go to Google Play Console**
   - Visit: https://play.google.com/console
   - Sign in with your Google account

2. **Select Your App**
   - Click on your app from the dashboard (e.g., "Hudā" or "Huda App")

3. **Navigate to App Signing**
   - In the left sidebar, click **Release** (under "Production" or "Testing")
   - Then click **Setup** (or "Configuration")
   - Click **App signing** (or "App integrity")

4. **Add Upload Key Certificate**
   - Look for a section called **"Upload key certificate"** or **"App signing key certificate"**
   - You should see the expected SHA1 fingerprint displayed: `1F:C7:C4:E7:C8:39:A1:A0:A2:79:7E:D4:5F:AB:BA:FB:93:4D:94:3F`
   - If you see an option to "Add upload key" or "Register upload key", click it
   - Enter the SHA1 fingerprint from your EAS build
   - Save the changes

**Alternative Path (if the above doesn't work):**
- Go to: **Release** → **Production** (or **Testing**) → **App signing**
- Or: **Setup** → **App integrity** → **App signing**

**Note**: If your app already exists and has been uploaded before, you typically **cannot** change the upload key. In that case, you must use the existing key that matches the expected SHA1.

## Common Issues

### Issue: "I don't have the original keystore"
**Solution**: 
- Check if EAS has it stored (run `eas credentials`)
- Check your backups or password managers
- If truly lost, contact Google Play support - they may allow you to reset (this is rare)

### Issue: "EAS created a different key"
**Solution**:
- This happens if credentials weren't set up before
- For first upload: Use the new key's SHA1 in Google Play Console
- For existing app: You MUST use the original key

### Issue: "Build still uses wrong key"
**Solution**:
1. Make sure you're using `--profile production`
2. Clear EAS credentials and re-upload your keystore:
   ```bash
   eas credentials
   # Select Android → Remove credentials → Set up new → Upload keystore
   ```

## Quick Checklist

- [ ] Run `eas credentials` to check current setup
- [ ] Determine if this is first upload or existing app
- [ ] Build with `eas build --profile production --platform android`
- [ ] Verify SHA1 matches Google Play Console
- [ ] Upload `.aab` to Google Play Console
- [ ] If first upload, add SHA1 to Google Play Console

## Need Help?

If you're stuck:
1. Check EAS documentation: https://docs.expo.dev/build/signing/
2. Check Google Play Console → App Signing section for your app's expected key
3. Contact EAS support if credentials are lost

