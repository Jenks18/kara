# Kacha Android App

Android version of the Kacha expense tracking platform, built with Jetpack Compose + Hilt DI.

> **Package:** `com.mafutapass.app`  
> **Min SDK:** 26 (Android 8.0) | **Target SDK:** 35 (Android 15)  
> **Architecture:** MVVM with Hilt DI, backend-only JWT auth  
> **Brand:** Kacha by Kacha Labs | kachalabs.com | Blue (#0066FF)

## Features

### Receipt Capture (2 methods)
- **Scan Receipt** — ML Kit Document Scanner: boundary detection, auto-crop, perspective correction, multi-page (up to 5). Falls back to CameraX multi-capture if Document Scanner unavailable.
- **Choose from Gallery** — Multi-select from device photos

### Background Scan Architecture
OCR runs **after** the user taps "Create expense" — never before. The user is navigated immediately to the Reports tab while processing continues in the background.

1. User confirms expenses → `ScanReceiptViewModel.processOnDevice()` creates blank states (no OCR)
2. `submitAndScanInBackground()` adds scanning placeholders to `PendingExpensesRepository`
3. Navigates to Reports tab immediately — user sees amber "Scanning…" cards
4. `BackgroundScanService` (singleton, `SupervisorJob + Dispatchers.IO`) runs Pass 1 + Pass 2 per image
5. Placeholder cards update in real-time as OCR completes, then again after upload succeeds
6. Completed cards transition with a highlight halo animation

### On-Device ML Kit Processing (Pass 1)
- **Text Recognition v2** — OCR with spatial bounding boxes and confidence scores
- **Entity Extraction** — ML Kit model for money amounts and dates. Always awaits `downloadModelIfNeeded()` synchronously — no heuristic regex fallback.
- **Spatial field extraction** — Keyword-tier total detection, merchant from top-of-receipt, date patterns, category classification
- **Privacy-first** — No receipt images or financial data leave the device

### eTIMS QR Scanning (Pass 2)
- ML Kit Barcode Scanner (QR_CODE + DATA_MATRIX) on each captured image
- Uses `rawValue ?: displayValue` to handle both QR payload formats
- Filters for KRA/eTIMS/iTax URLs
- QR URL sent as separate text field alongside receipt image on upload

### Editable Receipts
- Inline edit mode on receipt detail screen
- Editable fields: merchant, amount, category (13 options), date, notes
- "Needs Review" banner → tap to enter edit mode
- Save → PATCH API → auto-marks as processed

### Core Features
- **Reports Tab** — View expenses and reports with segmented control
- **Create Tab** — Receipt capture with Scan Receipt / Gallery / Manual Entry
- **Workspaces** — Multi-tenant: personal + business workspaces with member roles
- **Account Tab** — User profile (avatar emoji/image), preferences, security, about
- **Theme** — Light/Dark/System with blue brand palette (#0066FF)
- **Auth** — Google OAuth via Credential Manager + email/password, backend-only JWT

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
| ML Kit | Entity Extraction | 16.0.0-beta5 |
| ML Kit | Barcode Scanning | 17.3.0 |
| ML Kit | Document Scanner | 16.0.0 |
| Images | Coil Compose | 2.7.0 |
| Security | EncryptedSharedPreferences | 1.1.0-alpha06 |
| Background | WorkManager | 2.10.0 |

## Design

Matches iOS and Web app design exactly:
- Blue color scheme (#0066FF)
- Clean white cards with contextual status colors
- Consistent typography and spacing
- 5-tab bottom navigation (Home, Reports, Create FAB, Workspaces, Account)
- Scanning cards: amber background with pulsing border animation

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
├── MainActivity.kt             Theme, auth gating, NavHost, 5-tab nav
├── auth/
│   ├── TokenRepository.kt      Token storage + refresh + WorkManager
│   ├── ClerkAuthManager.kt     Minimal: signOut() + config
│   └── AccountHelper.kt        Android AccountManager integration
├── data/
│   ├── ApiService.kt           Retrofit: uploadReceipt, updateReceipt (PATCH), profile, reports
│   ├── BackgroundScanService.kt @Singleton — background OCR + upload (SupervisorJob scope)
│   ├── PendingExpensesRepository.kt @Singleton — StateFlow of scanning placeholders
│   ├── AppDataCache.kt         Per-user disk cache (SharedPreferences + Gson)
│   ├── Models.kt               Domain models + request/response types
│   ├── network/
│   │   ├── NetworkModule.kt    Hilt: OkHttpClient, Retrofit, Gson, ApiService
│   │   ├── AuthInterceptor.kt  Bearer token injection
│   │   └── AuthAuthenticator.kt  401 → refresh → retry
│   └── repository/
│       └── UserRepository.kt   Profile CRUD, API → domain mapping
├── di/
│   └── AppModule.kt            Hilt: TokenRepository, AccountHelper
├── receipt/
│   └── ReceiptProcessor.kt     @Singleton — ML Kit OCR + Entity Extraction + Barcode (on-device)
├── ui/
│   ├── components/
│   │   └── BottomNavigation.kt 5-tab nav with avatar
│   ├── screens/
│   │   ├── AddReceiptScreen.kt Camera, gallery, manual entry, confirm details
│   │   ├── ExpenseDetailScreen.kt  View + edit mode with form fields
│   │   ├── ReportsScreen.kt    Reports list + scanning placeholder cards
│   │   ├── HomeScreen.kt       Dashboard: stats, recent expenses, active reports
│   │   ├── WorkspacesScreen.kt Workspace list
│   │   ├── AccountScreen.kt    Profile hub
│   │   └── ...                 Profile, preferences, security, about
│   └── theme/
│       ├── Theme.kt            Material3 theme
│       ├── AppColors.kt        Extended color system
│       └── Color.kt            Color definitions
└── viewmodel/
    ├── ScanReceiptViewModel.kt processOnDevice() + submitAndScanInBackground()
    ├── ExpenseDetailViewModel.kt  updateExpense() → PATCH, isSaving/saveSuccess
    ├── ReportsViewModel.kt     Merges pending + fetched items via combine()
    ├── ProfileViewModel.kt     Profile CRUD + AvatarManager
    └── ...                     Auth, theme, report detail, workspace ViewModels
```
