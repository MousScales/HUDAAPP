# Check Deployed Cloud Functions

## How to Check Firebase Functions Logs

### Option 1: Firebase Console (Easiest)

1. **Open Firebase Console:**
   ```
   https://console.firebase.google.com/project/locked-dd553/functions
   ```

2. **Look at the list of deployed functions**

3. **Check for these TWO prayer notification functions:**
   - ✅ `sendPrayerNotifications` (should be running)
   - ⚠️ `checkPrayerTimesAndNotify` (causes duplicates!)

4. **Click on each function** to see:
   - How many times it executed
   - Recent logs
   - Error rates

---

### Option 2: Check Logs for Duplicates

1. **Open Logs Explorer:**
   ```
   https://console.firebase.google.com/project/locked-dd553/logs
   ```

2. **Filter by time** (e.g., last hour)

3. **Search for:**
   - `"Checking prayer times for blocker activation"`
   - `"Prayer notification"`
   - Your user email or UID

4. **Look for patterns:**
   - Do you see TWO log entries for the same prayer time?
   - Are both functions sending notifications?

---

### Option 3: Check Using Firebase CLI

```bash
# Install Firebase CLI
npm install -g firebase-tools

# Login
firebase login

# View logs
firebase functions:log --project locked-dd553

# Filter by function
firebase functions:log --only sendPrayerNotifications --project locked-dd553
firebase functions:log --only checkPrayerTimesAndNotify --project locked-dd553
```

---

## Expected Behavior

### What SHOULD be deployed:

1. **`sendPrayerNotifications`** ✅
   - Purpose: Send prayer time notifications
   - Frequency: Every minute
   - Sends to: ALL users with enabled prayer notifications

### What should NOT send regular notifications:

2. **`checkPrayerTimesAndNotify`** ⚠️
   - Purpose: ONLY activate prayer blocker (device blocking)
   - Should: Trigger device blocking silently OR via data-only notification
   - Should NOT: Send visible notifications (that's `sendPrayerNotifications`'s job)

---

## The Fix

We need to either:

### Option A: Remove Notification from `checkPrayerTimesAndNotify`
- Keep the function for prayer blocker activation
- Remove the notification sending part
- Only trigger device blocking silently

### Option B: Merge Functions
- Have `sendPrayerNotifications` also handle prayer blocker activation
- Remove `checkPrayerTimesAndNotify` entirely

### Option C: Add Deduplication Logic
- Check if notification was already sent by the other function
- Skip if already sent

---

## Quick Check Commands

```bash
# See all deployed functions
firebase functions:list --project locked-dd553

# Check function execution count
# (Do this in Firebase Console - easier to visualize)
```

---

## What to Look For

When checking logs, look for:

1. **Duplicate sends:**
   ```
   ✅ sendPrayerNotifications sent notification to user123 for Fajr
   ⚠️ checkPrayerTimesAndNotify sent notification to user123 for Fajr
   ```

2. **Timing:**
   - Are both running at the same time?
   - Both trigger within seconds of each other?

3. **User overlap:**
   - Do users with prayer blocker enabled get 2 notifications?
   - Do users without prayer blocker get 1 notification?

---

## Solution

I'll create a fix that:
1. Makes `checkPrayerTimesAndNotify` NOT send visible notifications
2. Only use it for silent prayer blocker activation
3. All visible notifications come from `sendPrayerNotifications` only


