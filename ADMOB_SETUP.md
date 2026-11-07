# Google AdMob Setup

Ads are integrated using `react-native-google-mobile-ads`. iOS banner ID is configured.

## Fix app-ads.txt verification (required for AdMob)

**`public/app-ads.txt`** is created with the correct line. You need to publish it so it's reachable at your app's domain.

### Option A: Firebase Hosting (if mouslifejournal.com is on Firebase)

1. Connect your custom domain (mouslifejournal.com) to Firebase Hosting if not already.
2. Run:
   ```bash
   firebase deploy --only hosting
   ```
3. The file will be at `https://mouslifejournal.com/app-ads.txt`.

### Option B: Your existing web host (mouslifejournal.com)

1. Upload `public/app-ads.txt` to the **root** of your website.
2. Ensure it's accessible at `https://www.mouslifejournal.com/app-ads.txt` or `https://mouslifejournal.com/app-ads.txt` (match exactly what's in App Store Connect).

### After publishing

1. In **AdMob** → Verify app → Click **"Check for updates"**.
2. See [AdMob app-ads.txt help](https://support.google.com/admob/answer/9363762) if it still fails.

## Update app.json with your App IDs

The AdMob plugin currently uses **test App IDs**. For production ads:

1. In **AdMob** → **Apps** → **Huda** → **App settings**
2. Copy the **App ID** (format: `ca-app-pub-5223494624052252~XXXXXXXXXX`)
3. Update `app.json` – replace in the `react-native-google-mobile-ads` plugin:
   ```json
   "iosAppId": "ca-app-pub-5223494624052252~YOUR_IOS_APP_ID"
   ```
4. When you add Android, also set `androidAppId`.
5. Rebuild: `npx expo prebuild --clean` then `npx expo run:ios`

## Add Android banner (when ready)

1. Create a Banner ad unit for Android in AdMob.
2. Update `config/adMobConfig.js` with the Android banner ad unit ID.

## Current behavior

- **Banner ads** show at the bottom of the Home screen for **non-subscribers only**
- Premium subscribers see no ads (per the "No ads" feature)
- Test ads are used in development – replace with production IDs before release

## Rebuild required

After changing App IDs in `app.json`, run a native rebuild:
```bash
npx expo prebuild --clean
npx expo run:ios
# or
npx expo run:android
```
