Basic Flutter mobile app for AstroQuizzer

## ⚠️ Important: iCloud Drive and Flutter

**If you're working with this project in iCloud Drive**, Flutter builds can be slow and may timeout due to iCloud Drive synchronization. 

**Recommended solutions:**
1. **Move the project out of iCloud Drive** to a local directory (e.g., `~/projects/AstroQuizzer`)
2. **Or** run Flutter builds with iCloud Drive paused/synced
3. **Or** exclude build directories from iCloud Drive sync

Requirements:
- Flutter SDK installed
- Android SDK and an Android emulator (or real device) for Android builds
- Xcode for macOS/iOS builds

## Installation

### 1. Install Flutter SDK

Visit https://docs.flutter.dev/get-started/install/macos and follow the installation instructions for macOS.

After installation, verify it works:
```bash
flutter doctor
```

Install any missing dependencies that `flutter doctor` reports.

### 2. Set up Android (for Android builds)

Install Android Studio and set up an Android emulator:
- Download Android Studio from https://developer.android.com/studio
- Open Android Studio and go through the setup wizard
- Create an Android Virtual Device (AVD) through Tools → Device Manager

### 3. Set up macOS/iOS (for macOS builds)

Install Xcode from the App Store:
```bash
# Install Xcode Command Line Tools
xcode-select --install
```

## Building and Running

### For Android

1. Open a terminal and go to the mobile folder:
   ```bash
   cd mobile
   ```

2. Install dependencies:
   ```bash
   flutter pub get
   ```

3. Run on an Android emulator or connected device:
   ```bash
   flutter run
   ```

### For macOS

1. Open a terminal and go to the mobile folder:
   ```bash
   cd mobile
   ```

2. Install dependencies:
   ```bash
   flutter pub get
   ```

3. Run on macOS desktop:
   ```bash
   flutter run -d macos
   ```

Or open the project in Xcode and run from there:
```bash
open macos/Runner.xcworkspace
```

### Build Modes

- **Debug** (development): `flutter run`
- **Release** (production): `flutter build macos` (for macOS) or `flutter build apk` (for Android)

## Project Structure

The main app file is at `lib/main.dart` and shows a simple home page with a welcome text and a "Start Quiz" button.
