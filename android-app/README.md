# MafutaPass Android App

Android version of the MafutaPass AI-powered fuel expense tracker, built with Jetpack Compose + Hilt DI.

> **Package:** `com.mafutapass.app`  
> **Min SDK:** 26 (Android 8.0) | **Target SDK:** 35 (Android 15)  
> **Architecture:** MVVM with Hilt DI, backend-only JWT auth

## Features

### Receipt Capture (2 methods)
- **Scan Receipt** — ML Kit Document Scanner: boundary detection, auto-crop, perspective correction, multi-page (up to 5). Falls back to CameraX multi-capture if Document Scanner unavailable.
- **Choose from Gallery** — Multi-select from device photos

### eTIMS QR Scanning
- ML Kit Barcode Scanner runs on each captured image (post-capture)
- Filters for KRA/eTIMS/iTax URLs
- QR URL sent as separate text field alongside receipt image
- Works on images from both capture methods

### AI-Powered Extraction
- Gemini 2.5 Flash with Kenyan receipt patterns
- Auto-detects: merchant, amount, date, fuel type, litres, category
- Field-level confidence scoring (0.0–1.0)
- Low-confidence receipts auto-tagged as "Needs Review"

### Editable Receipts
- Inline edit mode on receipt detail screen
- Editable fields: merchant, amount, category (8 options), date, notes
- "Needs Review" banner → tap to enter edit mode
- Save → PATCH API → auto-marks as processed

### Core Features
- **Reports Tab** — View expenses and reports with segmented control
- **Create Tab** — Receipt capture with Scan Receipt / Gallery
- **Account Tab** — User profile, preferences, security, about
- **Theme** — Light/Dark/System with emerald brand palette
- **Auth** — Backend-only JWT (no Clerk/Supabase SDK in mobile)

## Tech Stack

| Category | Library | Version |
|----------|---------|---------|
| Language | Kotlin | 2.2.0 |
| UI | Jetpack Compose + Material3 | BOM 2024.12.01 |
| DI | Hilt | 2.56.2 |
| Navigation | Navigation Compose | 2.8.5 |
| Networking | Retrofit + OkHttp | 2.11.0 / 4.12.0 |
| Camera | CameraX | 1.4.1 |
| ML Kit | Text Recognition | 16.0.1 |
| ML Kit | Barcode Scanning | 17.3.0 |
| ML Kit | Document Scanner | 16.0.0 |
| Images | Coil Compose | 2.7.0 |
| Security | EncryptedSharedPreferences | 1.1.0-alpha06 |
| Background | WorkManager | 2.10.0 |

## Design

Matches iOS and Web app design exactly:
- Emerald color scheme (#10B981)
- Clean white cards
- Consistent typography and spacing
- 3-tab bottom navigation (Reports, Create, Account)

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
├── MafutaPassApplication.kt    @HiltAndroidApp entry point
├── MainActivity.kt             Theme, auth gating, NavHost
├── auth/
│   ├── TokenRepository.kt      Token storage + refresh + WorkManager
│   ├── ClerkAuthManager.kt     Minimal: signOut() + config
│   └── AccountHelper.kt        Android AccountManager integration
├── data/
│   ├── ApiService.kt           Retrofit: uploadReceipt, updateReceipt (PATCH), profile, reports
│   ├── Models.kt               Domain models + UpdateReceiptRequest/Response
│   ├── network/
│   │   ├── NetworkModule.kt    Hilt: OkHttpClient, Retrofit, Gson, ApiService
│   │   ├── AuthInterceptor.kt  Bearer token injection
│   │   └── AuthAuthenticator.kt  401 → refresh → retry
│   └── repository/
│       └── UserRepository.kt   Profile CRUD, API → domain mapping
├── di/
│   └── AppModule.kt            Hilt: TokenRepository, AccountHelper
├── ui/
│   ├── components/
│   │   └── BottomNavigation.kt 3-tab nav with avatar emoji
│   ├── screens/
    │   ├── AddReceiptScreen.kt Scan Receipt (Document Scanner) + Gallery, post-capture QR
│   │   ├── ExpenseDetailScreen.kt  View + edit mode with form fields
│   │   ├── ReportsScreen.kt    Reports list with segmented control
│   │   ├── AccountScreen.kt    Profile hub
│   │   └── ...                 Profile, preferences, security, about
│   └── theme/
│       ├── Theme.kt            Material3 theme
│       ├── AppColors.kt        Extended color system
│       └── Color.kt            Color definitions
└── viewmodel/
    ├── ScanReceiptViewModel.kt Upload flow + _detectedQrUrl for QR
    ├── ExpenseDetailViewModel.kt  updateExpense() → PATCH, isSaving/saveSuccess
    ├── ReportsViewModel.kt     Reports list
    ├── ProfileViewModel.kt     Profile CRUD + AvatarManager
    └── ...                     Auth, theme, report detail ViewModels
```
