To build and run on Android:

  - Prereqs: Node 18+, Android Studio + SDK/Platform Tools installed, USB debugging enabled on your device, and a connected device or emulator.

  Steps:

  1. Install deps and build web bundle:
      - npm install
      - npm run build
  2. Sync to Android (from project root):
      - npx cap sync android
  3. Open the Android project:
      - npx cap open android
        This opens Android Studio in android/.
  4. In Android Studio:
      - Let Gradle sync finish.
      - Select your device/emulator from the run target.
      - Click Run ▶ (or Shift+F10). This will build and install the app on the device.

  If you prefer CLI install:

  - After npx cap sync android, run cd android && ./gradlew assembleDebug
  - Install the APK: adb install -r app/build/outputs/apk/debug/app-debug.apk