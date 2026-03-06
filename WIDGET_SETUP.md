# Widget Setup Guide

This app now includes iOS widgets for displaying prayer times on the home screen.

## Setup Instructions

### 1. Prebuild the iOS Project

After making changes to the widget configuration, you need to run prebuild:

```bash
npx expo prebuild -p ios --clean
```

This will generate the Xcode project with the widget target properly configured.

### 2. Open in Xcode

```bash
xed ios
```

### 3. Build and Run

1. Select the main app target in Xcode
2. Build and run the app on a device or simulator
3. The widget extension will be built automatically

### 4. Add Widget to Home Screen

1. Long press on the home screen
2. Tap the "+" button in the top left
3. Search for "Hudā" or "Prayer Times"
4. Select the widget size (Small, Medium, or Large)
5. Tap "Add Widget"

## Widget Features

### Prayer Times Widget

- **Small Widget**: Shows next prayer with countdown
- **Medium Widget**: Shows 4 prayer times in a grid with next prayer info
- **Large Widget**: Shows all 5 daily prayers with next prayer countdown

The widget automatically updates:
- Every 5 minutes for accurate countdown
- When prayer times are updated in the app
- When the app saves new prayer times data

## Data Sharing

The widget uses App Groups to share data between the app and widget:

- **App Group**: `group.com.digaifounder.huda`
- **Storage Key**: `prayer_times_widget`

The app automatically saves prayer times data whenever:
- Prayer times are calculated
- Current/next prayer is updated
- Location changes

## Widget Files

- `targets/widget/expo-target.config.js` - Widget configuration
- `targets/widget/PrayerTimesWidget.swift` - Widget Swift code
- `targets/widget/index.swift` - Widget bundle entry point
- `services/widgetService.js` - Service for sharing data with widget

## Troubleshooting

### Widget Not Showing Data

1. Make sure the app has location permissions
2. Open the app and let it calculate prayer times
3. The widget should update automatically within a few seconds

### Widget Not Appearing in Widget Gallery

1. Make sure you've run `npx expo prebuild -p ios --clean`
2. Build the app in Xcode
3. The widget extension must be built successfully

### Data Not Updating

1. Check that the app group is properly configured in both app.json and expo-target.config.js
2. Verify the app group identifier matches: `group.com.digaifounder.huda`
3. Check console logs for widget service errors

## Development Notes

- Widget updates are triggered automatically when prayer times change
- The widget uses a timeline that updates every 5 minutes
- Sample data is shown if no shared data is available
- The widget supports all three sizes: Small, Medium, and Large

