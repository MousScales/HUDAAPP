# Shield Image Setup Guide

## Where to Place Your Logo Image

To use your custom Huda logo instead of the system moon/sun icons on the blocking screen, you need to place your logo image in the **App Group directory**.

### Image Requirements:
- **Filename**: `logo-rounded.png`
- **Format**: PNG (recommended) or any format supported by UIImage
- **Recommended size**: 200x200 pixels or larger (will be scaled automatically)
- **Background**: Transparent or solid (will be tinted to match dark/light mode)

### How to Place the Image:

#### Option 1: Programmatically (Recommended)
Add code to your main app to copy the image to the App Group directory when the app starts:

```javascript
// In your App.js or a service file
import { ExtensionStorage } from '@bacons/apple-targets';
import * as FileSystem from 'expo-file-system';
import { Asset } from 'expo-asset';

async function setupShieldImage() {
  try {
    const storage = new ExtensionStorage('group.com.digaifounder.huda');
    const appGroupPath = FileSystem.documentDirectory + '../Shared/AppGroup/group.com.digaifounder.huda/';
    
    // Load your logo image
    const logoAsset = Asset.fromModule(require('./assets/logo-rounded.png'));
    await logoAsset.downloadAsync();
    
    // Copy to App Group directory
    const destinationPath = appGroupPath + 'logo-rounded.png';
    await FileSystem.copyAsync({
      from: logoAsset.localUri,
      to: destinationPath
    });
    
    console.log('✅ Shield logo copied to App Group directory');
  } catch (error) {
    console.error('❌ Error setting up shield image:', error);
  }
}
```

#### Option 2: Manual Placement (For Testing)
1. Build and run your app on a device
2. Use Xcode's Device Manager or a file manager app to access the App Group directory
3. Navigate to: `App Group Container/group.com.digaifounder.huda/`
4. Copy your `logo-rounded.png` file there

#### Option 3: Add to Extension Bundle
You can also add the image directly to the `PrayerShieldConfig` extension target:
1. In Xcode, select the `logo-rounded.png` file
2. In the File Inspector, check the "PrayerShieldConfig" target
3. The image will be available in the extension bundle

### Current Image Loading Order:
The code tries to load the image in this order:
1. **App Group directory** (`group.com.digaifounder.huda/logo-rounded.png`) ← **BEST OPTION**
2. Widget bundle (if available)
3. Main app bundle
4. Extension bundle
5. App icon
6. System icon (moon/sun) ← **FALLBACK**

### Testing:
After placing the image, wait for an active prayer block (the blocker now runs automatically at each prayer time). Open any blocked app after prayer time has started and you should see your custom logo instead of the moon/sun icon.

### Notes:
- The image will be automatically tinted to match the current appearance (black in light mode, white in dark mode)
- If the image has transparency, it will be preserved
- The image will be scaled to fit the shield display area

