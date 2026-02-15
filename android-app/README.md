# MafutaPass Android App

Android version of MafutaPass expense tracking app built with Jetpack Compose.

## Features

- **Reports Tab**: View expenses and reports with segmented control
- **Create Tab**: Scan receipts, start chat, create reports
- **Workspaces Tab**: Manage multiple workspaces
- **Account Tab**: User profile and settings

## Tech Stack

- Kotlin
- Jetpack Compose
- Material Design 3
- Navigation Component
- Retrofit for API calls
- Coil for image loading

## Design

Matches iOS and Web app design exactly:
- Emerald color scheme (#10B981)
- Clean white cards
- Consistent typography and spacing
- Same navigation structure

## Setup

### Prerequisites

1. **Android Studio** (latest version recommended) or
2. **Android SDK** with Java JDK 17+
3. **ADB** (Android Debug Bridge) for device installation

### Quick Start

1. Open project in Android Studio:
   ```bash
   # From Android Studio: File > Open > Select android-app folder
   ```

2. Or build from command line:
   ```bash
   cd android-app
   ./gradlew assembleDebug
   ```

### Build & Install

Use the automated build script:

```bash
cd android-app
./build-and-install.sh
```

This will:
- Clean previous builds
- Build the debug APK
- Install on connected device/emulator
- Launch the app

### Manual Build

```bash
# Build debug APK
./gradlew assembleDebug

# Install on device
adb install -r app/build/outputs/apk/debug/app-debug.apk

# Launch app
adb shell am start -n com.mafutapass.app/.MainActivity
```

## Project Structure

```
app/src/main/java/com/mafutapass/app/
├── MainActivity.kt
├── data/
│   └── Models.kt
├── ui/
│   ├── components/
│   │   └── BottomNavigation.kt
│   ├── screens/
│   │   ├── ReportsScreen.kt
│   │   ├── CreateScreen.kt
│   │   ├── WorkspacesScreen.kt
│   │   └── AccountScreen.kt
│   └── theme/
│       ├── Color.kt
│       ├── Theme.kt
│       └── Type.kt
```
