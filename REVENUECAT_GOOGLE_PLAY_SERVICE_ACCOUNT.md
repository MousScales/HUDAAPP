# How to Get Google Play Service Account Credentials for RevenueCat

RevenueCat needs a Google Play service account to validate Android transactions. Here's how to create and download the credentials JSON file.

## Quick Reference: Finding Your Project ID

**Where to find your Google Cloud Project ID:**

1. **Top Bar (Easiest):**
   - Look at the top of Google Cloud Console
   - Click the project dropdown (shows project name)
   - The **Project ID** is shown below the project name in the dropdown

2. **URL:**
   - Check your browser URL: `https://console.cloud.google.com/...?project=YOUR-PROJECT-ID`
   - The part after `project=` is your Project ID

3. **Settings Page:**
   - Go to **IAM & Admin** → **Settings**
   - The Project ID is displayed at the top of the page

4. **From Service Account Email:**
   - If you already have a service account JSON file
   - The email format is: `name@PROJECT-ID.iam.gserviceaccount.com`
   - The Project ID is the part between `@` and `.iam`

**Note:** Project ID is different from Project Name. The ID is what you'll see in service account emails.

## Step-by-Step Guide

### Step 1: Go to Google Cloud Console

1. Visit: https://console.cloud.google.com
2. Sign in with the same Google account that has access to your Google Play Console
3. **Select or create a project:**
   - Look at the **top bar** - you'll see a project dropdown (shows "Select a project" or your current project name)
   - Click on it to see your projects
   - **If you have an existing project:** Select it
   - **If you need to create a new one:** Click "NEW PROJECT", give it a name (e.g., "Huda App"), and click "CREATE"

**How to Find Your Project ID:**
- After selecting a project, look at the **top bar** - the project name is displayed
- Click on the project name dropdown to see the **Project ID** (it's usually different from the project name)
- The Project ID looks like: `huda-app-123456` or `my-project-abc123`
- You can also find it in the URL: `https://console.cloud.google.com/home/dashboard?project=YOUR-PROJECT-ID`
- Or go to **IAM & Admin** → **Settings** - the Project ID is shown at the top

### Step 2: Enable Google Play Android Developer API

1. In Google Cloud Console, go to **APIs & Services** → **Library** (or visit: https://console.cloud.google.com/apis/library)
2. Search for **"Google Play Android Developer API"**
3. Click on it and click **Enable**

### Step 3: Create a Service Account

1. Go to **IAM & Admin** → **Service Accounts** (or visit: https://console.cloud.google.com/iam-admin/serviceaccounts)
2. Click **+ CREATE SERVICE ACCOUNT** (top of the page)
3. Fill in the details:
   - **Service account name**: `revenuecat-play-store` (or any name you prefer)
   - **Service account ID**: Will auto-fill (you can change it)
   - **Description**: "Service account for RevenueCat Google Play validation"
4. Click **CREATE AND CONTINUE**

### Step 4: Grant Permissions (Optional)

You can skip this step for now - we'll grant permissions in Google Play Console instead.

1. Click **CONTINUE** (or skip)
2. Click **DONE**

### Step 5: Create and Download JSON Key

1. Find your newly created service account in the list
2. Click on the service account name
3. Go to the **KEYS** tab
4. Click **ADD KEY** → **Create new key**
5. Select **JSON** as the key type
6. Click **CREATE**
7. The JSON file will automatically download to your computer
8. **Save this file securely** - you'll need it for RevenueCat
9. **Open the JSON file** and note the `client_email` field - this is the email you'll use in Step 6
   - It looks like: `revenuecat-play-store@your-project-id.iam.gserviceaccount.com`

### Step 6: Grant Access in Google Play Console

**⚠️ Important:** Google has updated the process! The "API Access" section no longer exists. Instead, you need to invite the service account as a user.

1. Go to Google Play Console: https://play.google.com/console
2. In the **left sidebar**, click **Users and permissions** (you should see this on the Home page)
3. Click **Invite new user** (or **+ Invite users** button)
4. **Find your service account email:**
   - Open the JSON file you downloaded in Step 5
   - Look for the `"client_email"` field 
   - The email format is: `service-account-name@PROJECT-ID.iam.gserviceaccount.com`
   - Example: `revenuecat-play-store@huda-app-123456.iam.gserviceaccount.com`
   - Copy this entire email address
5. **Paste the service account email** into the "Email address" field
6. **Select permissions:**
   - ✅ **View app information and download bulk reports** (or "View financial data")
   - ✅ **View financial data, orders, and cancellation survey responses** (if you need financial reports)
   - You can also select app-specific permissions if needed
7. Click **Send invitation** (or **Invite**)
8. The service account will receive the invitation and be added to your account

**Note:** The service account doesn't need to "accept" the invitation - it's automatically granted access once you send it.

### Step 7: Upload to RevenueCat

1. Go to your RevenueCat dashboard: https://app.revenuecat.com
2. Navigate to your project
3. Go to **Integrations** → **Google Play Store**
4. Click **Configure** or **Add configuration**
5. Fill in the form:
   - **App name**: "Huda: The App For Muslims (Play Store)" (or your app name)
   - **Google Play package name**: `com.digaifounder.huda` ⚠️ **Use the package name from your `app.json`!**
   - **Service Account Credentials JSON**: Upload the JSON file you downloaded in Step 5
6. Click **Save** or **Create**

## Verify Package Name

To confirm your Google Play package name, check your `app.json`:

```json
{
  "expo": {
    "android": {
      "package": "com.digaifounder.huda"  // This is your actual package name
    }
  }
}
```

**⚠️ Important**: The form in the image shows `com.digfounder.app`, but your actual package name in `app.json` is `com.digaifounder.huda`. **Always use the package name from your `app.json` file!**

## Troubleshooting

### Can't Find "API Access" Section

**This is normal!** Google removed the "API Access" section. Use the new method:

1. Go to **Users and permissions** in the left sidebar (visible on the Home page)
2. Click **Invite new user**
3. Use the service account email from your JSON file

The old "API Access" section no longer exists - you now invite service accounts as users instead.

### "Service account not found" in Google Play Console

- Make sure you're using the same Google account for both Google Cloud Console and Google Play Console
- Wait a few minutes after creating the service account - it may take time to sync
- Make sure you've enabled the Google Play Android Developer API

### "Permission denied" errors

- Make sure you've granted access in Google Play Console (Step 6)
- Check that the service account has the correct permissions
- Try removing and re-adding the service account in Google Play Console

### "Invalid JSON file"

- Make sure you downloaded the JSON file (not just copied the text)
- Verify the file is a valid JSON format
- Try downloading the key again from Google Cloud Console

### Package name mismatch

- Check your `app.json` for the correct package name
- Make sure the package name in RevenueCat matches exactly what's in your app
- The package name is case-sensitive

## Security Notes

⚠️ **Important Security Reminders:**

1. **Never commit the JSON file to Git** - it contains sensitive credentials
2. **Store it securely** - treat it like a password
3. **Only share with trusted services** - RevenueCat is secure, but be careful
4. **Rotate keys periodically** - create new keys and update RevenueCat if needed
5. **Delete unused keys** - remove old keys from Google Cloud Console

## Additional Resources

- [RevenueCat Google Play Integration Docs](https://docs.revenuecat.com/docs/google-play)
- [Google Cloud Service Accounts Guide](https://cloud.google.com/iam/docs/service-accounts)
- [Google Play Console API Access](https://support.google.com/googleplay/android-developer/answer/6112435)

