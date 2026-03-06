# Kacha — Architecture & Single Source of Truth

> **Last updated:** 2026-03-05
> **Product name:** Kacha (by Kacha Labs)
> **Domain:** kachalabs.com
> **Brand color:** Blue (#0066FF)
> **Support email:** support@kachalabs.com
> **Audience:** Production-grade Play Store / App Store app
> **Maintainer rule:** Every code change MUST be reflected here. This file is the single source of truth.

---

## Table of Contents

1. [Product Overview](#1-product-overview)
2. [System Architecture](#2-system-architecture)
3. [Authentication](#3-authentication)
4. [Database & Storage](#4-database--storage)
5. [API Reference](#5-api-reference)
6. [Web App — Pages](#6-web-app--pages)
7. [Web App — Components](#7-web-app--components)
8. [Theming & Design System](#8-theming--design-system)
9. [Mobile Apps](#9-mobile-apps)
10. [Receipt Processing Pipeline](#10-receipt-processing-pipeline)
11. [Infrastructure & Deployment](#11-infrastructure--deployment)
12. [Security](#12-security)
13. [Migrations](#13-migrations)
14. [Planned Features](#14-planned-features)

---

## 1. Product Overview

**Kacha** is a receipt capture and expense tracking platform for individuals and teams. Users photograph receipts, Kacha extracts data (OCR + Gemini Vision), groups expenses into reports, and manages workspaces for team collaboration.

### Platforms

| Platform | Stack | Status |
|----------|-------|--------|
| Web | Next.js 15.5.9 + Tailwind 3 + Clerk | Production (kachalabs.com) |
| Android | Kotlin + Jetpack Compose + Material3 + Hilt | In Development |
| iOS | SwiftUI + Clerk SDK | In Development |

### Core Features

- **Receipt capture** — Camera scan or gallery upload → OCR/vision extraction → structured expense data
- **eTIMS QR scanning** — Detect KRA/eTIMS QR codes on Kenyan receipts for tax compliance
- **Expense reports** — Group receipts into reports, draft/submit/approve workflow
- **Workspaces** — Multi-tenant isolation (personal + business), member roles (admin/member/viewer)
- **User profiles** — Avatar (emoji/image), display name, personal info management
- **Theme** — Light/Dark/System with blue brand palette (#0066FF)
- **Support** — Report suspicious activity, report bugs (Supabase-backed tickets)

### Navigation (5-tab bottom nav)

| Tab | Route | Description |
|-----|-------|-------------|
| Home | `/` | Dashboard with stats, recent expenses (tap → detail), active reports (tap → detail), category breakdown |
| Reports | `/reports` | Expense reports list + detail view |
| Scan (FAB) | `/create` | Elevated center button — receipt capture |
| Workspaces | `/workspaces` | Workspace list + management |
| Account | `/account` | Profile, preferences, security, about |

---

## 2. System Architecture

```
┌─────────────────────────────────────────────────────┐
│                    Clients                           │
│  Web (Next.js)  │  Android (Kotlin)  │  iOS (Swift) │
└────────┬────────┴─────────┬──────────┴──────┬───────┘
         │                  │                 │
         ▼                  ▼                 ▼
┌─────────────────────────────────────────────────────┐
│              Next.js API Routes (Vercel)             │
│  /api/auth/*  │  /api/receipts/*  │  /api/mobile/*  │
│  /api/workspaces/*  │  /api/account/*               │
└────────┬────────────────────┬───────────────────────┘
         │                    │
    ┌────▼────┐          ┌────▼─────┐
    │  Clerk  │          │ Supabase │
    │  Auth   │          │ Postgres │
    │         │          │ Storage  │
    └─────────┘          └──────────┘
```

### Key dependencies (package.json)

| Package | Version | Purpose |
|---------|---------|---------|
| `next` | ^15.1.3 | Web framework |
| `react` / `react-dom` | ^18.2.0 | UI rendering |
| `@clerk/nextjs` | ^6.36.6 | Authentication |
| `@supabase/supabase-js` | ^2.89.0 | Database client |
| `@google/generative-ai` | ^0.24.1 | Gemini Vision for receipt OCR |
| `tailwindcss` | ^3.3.0 | Styling |
| `lucide-react` | ^0.294.0 | Icons |
| `sharp` | ^0.33.5 | Server-side image processing |
| `tesseract.js` | ^7.0.0 | Free OCR fallback |
| `jimp` | ^1.6.0 | Image preprocessing |
| `jsonwebtoken` | ^9.0.3 | Mobile JWT handling |
| `cheerio` | ^1.2.0 | KRA receipt scraping |
| `jsqr` | ^1.4.0 | QR code decoding |

---

## 3. Authentication

### Architecture

- **Provider:** Clerk (clerk.com)
- **Web:** `@clerk/nextjs` middleware protects all non-public routes
- **Mobile:** Bearer token via Clerk session → forwarded to `/api/mobile/*` endpoints
- **Supabase:** Clerk JWT template "supabase" → access token in Authorization header → RLS uses `auth.jwt()->>'sub'` for user_id matching

### Middleware (middleware.ts)

Public routes (no auth required):
- `/`, `/welcome`, `/privacy-policy`, `/terms-of-service`, `/help/*`
- `/sign-in`, `/sign-up`
- `/api/auth/*` (mobile auth endpoints)
- `/api/mobile/*` (auth'd via Bearer token, not Clerk session)
- `/api/user-profile`, `/api/update-username`

All other routes call `auth.protect()`.

### Server-side Supabase client (lib/supabase/server-client.ts)

```typescript
const { getToken } = await auth()
const token = await getToken({ template: 'supabase' })
return createClient(url, anonKey, {
  global: { headers: { Authorization: `Bearer ${token}` } }
})
```

### Mobile auth endpoints

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/api/auth/mobile-signin` | POST | Email/password sign-in |
| `/api/auth/mobile-signup` | POST | Email/password registration |
| `/api/auth/mobile-verify` | POST | Email verification |
| `/api/auth/mobile-refresh` | POST | Token refresh |
| `/api/auth/mobile-profile` | GET/PUT | Profile fetch/update |
| `/api/auth/google-native` | POST | Google OAuth for native apps |
| `/api/auth/google-mobile` | POST | Google OAuth mobile flow |
| `/api/auth/complete-google-signup` | POST | Username completion after Google OAuth |
| `/api/auth/android-callback` | GET | Android OAuth callback |
| `/api/auth/create-profile` | POST | Profile creation after verification |
| `/api/auth/signup` | POST | Email/password sign-up |
| `/api/auth/verify-email` | POST | Email verification |

---

## 4. Database & Storage

### Database: Supabase (PostgreSQL)

All tables use RLS. User identification via `auth.jwt()->>'sub'` (Clerk user ID).

### Tables

| Table | Purpose | Key columns |
|-------|---------|-------------|
| `user_profiles` | User profile data | user_id, display_name, first_name, last_name, avatar_emoji, avatar_image_url |
| `raw_receipts` | Scanned receipt data | user_id, merchant, amount, currency, receipt_date, image_url, qr_data |
| `expense_reports` | Grouped expense reports | user_id, workspace_id, title, status (draft/submitted/approved) |
| `expense_items` | Individual items in a report | report_id, receipt_id, amount, category |
| `workspaces` | Multi-tenant workspaces | user_id, name, avatar, currency, is_active |
| `workspace_members` | Workspace membership | workspace_id, user_id, role (admin/member/viewer), status |
| `support_tickets` | Bug reports + security reports | user_id, ticket_type, title, description, status |

### RLS patterns

- **user_profiles:** owner read/write via `user_id = auth.jwt()->>'sub'`
- **raw_receipts:** owner CRUD via `user_id = auth.jwt()->>'sub'`
- **workspaces:** owner OR member via `is_workspace_member()` security definer function
- **workspace_members:** membership check via `is_workspace_member()` (non-recursive), admin check via `is_workspace_admin()`
- **support_tickets:** users insert own, read own; service role full access

### Storage: Supabase Storage

| Bucket | Purpose | Public | Notes |
|--------|---------|--------|-------|
| `receipt-images` | Raw receipt photos | No | Folder-scoped RLS: `{userId}/*` matches email OR Clerk sub |
| `workspace-avatars` | Workspace avatar images | Yes | |
| `profile-pictures` | User profile photos | Yes | Folder-scoped RLS: `{userId}/*` via `auth.jwt()->>'sub'` (migration 031) |

---

## 5. API Reference

### Web data endpoints

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/api/receipts/upload` | POST | Upload receipt image + process |
| `/api/receipts/process-vision` | POST | Gemini Vision OCR processing |
| `/api/receipts/process-python` | POST | Python-based OCR processing |
| `/api/receipts/scrape-kra` | POST | Scrape KRA eTIMS QR URL |
| `/api/expense-reports` | GET/POST | List/create expense reports |
| `/api/expense-reports/[id]` | GET/PUT/DELETE | Read/update/delete a report |
| `/api/workspaces` | GET/POST | List/create workspaces |
| `/api/workspaces/[id]` | GET/PUT/DELETE | Read/update/delete workspace |
| `/api/workspaces/[id]/members` | GET/POST | List/add workspace members |
| `/api/workspaces/[id]/invites` | POST | Send workspace invitation |
| `/api/invites/accept/[token]` | POST | Accept a workspace invite |
| `/api/user-profile` | GET/PUT | Read/update user profile |
| `/api/user-profile/init` | POST | Initialize profile for new user + create default workspace |
| `/api/upload-avatar` | POST | Upload avatar image to storage |
| `/api/update-username` | PUT | Update Clerk username |

### Account endpoints

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/api/account/delete-request` | POST | Request account deletion |
| `/api/account/suspicious-activity` | POST | Submit suspicious activity report |
| `/api/account/report-bug` | POST | Submit bug report |

### Mobile-specific endpoints (`/api/mobile/`)

Mirror the web endpoints but authenticate via Bearer token:

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/api/mobile/receipts` | GET | List receipts |
| `/api/mobile/receipts/upload` | POST | Upload receipt |
| `/api/mobile/receipts/[id]` | GET/PATCH/DELETE | Receipt CRUD |
| `/api/mobile/expense-reports` | GET/POST | List/create reports |
| `/api/mobile/expense-reports/[id]` | GET/PUT/DELETE | Report CRUD |
| `/api/mobile/workspaces` | GET/POST | List/create workspaces |
| `/api/mobile/workspaces/[id]` | GET/PUT/DELETE | Workspace CRUD |
| `/api/mobile/workspaces/[id]/members` | GET/POST | Manage members |

---

## 6. Web App — Pages

### Public pages (no auth)

| Route | File | Description |
|-------|------|-------------|
| `/sign-in` | `app/sign-in/[[...rest]]/page.tsx` | Clerk sign-in |
| `/sign-up` | `app/sign-up/[[...rest]]/page.tsx` | Clerk sign-up |
| `/welcome` | `app/(public)/welcome/page.tsx` | Welcome/landing |
| `/privacy-policy` | `app/(public)/privacy-policy/page.tsx` | Privacy policy |
| `/terms-of-service` | `app/(public)/terms-of-service/page.tsx` | Terms of service |
| `/help/delete-account` | `app/help/delete-account/page.tsx` | Account deletion instructions (Google Play compliance) |

### Authenticated pages

| Route | File | Description |
|-------|------|-------------|
| `/` | `app/page.tsx` → `HomeClient` | Dashboard (server-side data fetch) |
| `/create` | `app/create/page.tsx` | Receipt capture + processing |
| `/reports` | `app/reports/page.tsx` | Expense reports list |
| `/reports/[id]` | `app/reports/[id]/page.tsx` | Report detail view |
| `/workspaces` | `app/workspaces/page.tsx` | Workspace list |
| `/workspaces/new` | `app/workspaces/new/page.tsx` | Create workspace |
| `/workspaces/[id]` | `app/workspaces/[id]/page.tsx` | Workspace dashboard |
| `/workspaces/[id]/overview` | `.../overview/page.tsx` | Workspace settings overview |
| `/workspaces/[id]/overview/edit-name` | `.../edit-name/page.tsx` | Edit workspace name |
| `/workspaces/[id]/overview/edit-description` | `.../edit-description/page.tsx` | Edit workspace description |
| `/workspaces/[id]/overview/edit-currency` | `.../edit-currency/page.tsx` | Edit workspace currency |
| `/workspaces/[id]/overview/edit-address` | `.../edit-address/page.tsx` | Edit workspace address |
| `/workspaces/[id]/members` | `.../members/page.tsx` | Manage workspace members |
| `/workspaces/[id]/reports` | `.../reports/page.tsx` | Workspace expense reports |
| `/workspaces/[id]/categories` | `.../categories/page.tsx` | Expense categories |
| `/workspaces/[id]/workflows` | `.../workflows/page.tsx` | Approval workflows |
| `/workspaces/[id]/features` | `.../features/page.tsx` | Workspace feature toggles |
| `/workspaces/[id]/cards` | `.../cards/page.tsx` | Corporate cards |

### Account pages

| Route | File | Description |
|-------|------|-------------|
| `/account` | `app/account/page.tsx` | Account hub (avatar, nav cards) |
| `/account/profile` | `app/account/profile/page.tsx` | Profile information |
| `/account/profile/display-name` | `.../display-name/page.tsx` | Edit display name |
| `/account/profile/legal-name` | `.../legal-name/page.tsx` | Edit legal name |
| `/account/profile/address` | `.../address/page.tsx` | Edit address |
| `/account/profile/date-of-birth` | `.../date-of-birth/page.tsx` | Edit DOB |
| `/account/profile/phone-number` | `.../phone-number/page.tsx` | Edit phone |
| `/account/preferences` | `app/account/preferences/page.tsx` | Theme picker (light/dark/system) |
| `/account/security` | `app/account/security/page.tsx` | Report suspicious activity, close account |
| `/account/security/suspicious-activity` | `.../suspicious-activity/page.tsx` | Suspicious activity report form |
| `/account/wallet` | `app/account/wallet/page.tsx` | Wallet / payment methods |
| `/account/about` | `app/account/about/page.tsx` | About Kacha, report bug link |
| `/account/about/report-bug` | `.../report-bug/page.tsx` | Bug report form |
| `/account/delete` | `app/account/delete/page.tsx` | Account deletion |

---

## 7. Web App — Components

### Root components

| Component | File | Purpose |
|-----------|------|---------|
| `Providers` | `components/Providers.tsx` | Client providers wrapper |
| `AutoProfileSetup` | `components/AutoProfileSetup.tsx` | Auto-upsert user_profiles on Clerk auth |
| `UserProfileInit` | `components/UserProfileInit.tsx` | Calls `/api/user-profile/init` on mount |

### Navigation

| Component | File | Purpose |
|-----------|------|---------|
| `BottomNav` | `components/navigation/BottomNav.tsx` | 5-tab bottom navigation with elevated scan FAB |
| `Header` | `components/navigation/Header.tsx` | Page header component |

### Receipt

| Component | File | Purpose |
|-----------|------|---------|
| `ReceiptCapture` | `components/receipt/ReceiptCapture.tsx` | Camera/gallery receipt capture UI |
| `ConfirmExpenses` | `components/receipt/ConfirmExpenses.tsx` | Review extracted expense data |
| `ExpenseReportView` | `components/receipt/ExpenseReportView.tsx` | Report detail viewer |
| `ReceiptProcessingStatus` | `components/receipt/ReceiptProcessingStatus.tsx` | Processing progress indicator |
| `ReceiptReviewModal` | `components/receipt/ReceiptReviewModal.tsx` | Modal for reviewing receipt data |

### UI primitives

| Component | File | Purpose |
|-----------|------|---------|
| `Badge` | `components/ui/Badge.tsx` | Status badge |
| `Button` | `components/ui/Button.tsx` | Reusable button |
| `Card` | `components/ui/Card.tsx` | Card container |
| `CategoryPill` | `components/ui/CategoryPill.tsx` | Category tag |
| `EmptyState` | `components/ui/EmptyState.tsx` | Empty state with icon + text |
| `FAB` | `components/ui/FAB.tsx` | Floating action button |

### Expense

| Component | File | Purpose |
|-----------|------|---------|
| `ExpenseCard` | `components/expense/ExpenseCard.tsx` | Expense summary card |
| `ExpenseItemCard` | `components/expense/ExpenseItemCard.tsx` | Individual expense item |
| `StatsCard` | `components/expense/StatsCard.tsx` | Dashboard statistics card |

---

## 8. Theming & Design System

### Brand colors

| Token | Value | Usage |
|-------|-------|-------|
| Blue 500 (primary) | `#0066FF` | Buttons, links, active states |
| Blue 600 | `#0052cc` | Hover states, headers |
| Blue 50 | `#eff6ff` | Page backgrounds, gradients |
| Blue 100 | `#dbeafe` | Light accents |

### Dark mode

- **Tailwind config:** `darkMode: 'class'`
- **Toggle:** Preferences page → Light/Dark/System
- **Storage:** `localStorage.getItem('kacha_theme')` → `'light'` | `'dark'` | `'system'`
- **Init script:** Inline `<script>` in `<head>` reads localStorage before paint to prevent FOUC
- **CSS:** Global dark mode overrides in `globals.css` using `html.dark` selectors
- **System mode:** Listens to `prefers-color-scheme` media query changes

### Typography

- Font: Inter (Google Fonts)
- Fallback: `-apple-system, BlinkMacSystemFont, SF Pro Display, Segoe UI, sans-serif`

### Layout

- Mobile-first: `max-width: 430px` centered
- Safe area insets for notch devices
- Bottom nav clearance: `padding-bottom: calc(80px + env(safe-area-inset-bottom))`

### Icon system

- Library: Lucide React (v0.294.0)
- Custom SVG icons used inline where Lucide doesn't have the right glyph

---

## 9. Mobile Apps

### Android (`android-app/`)

| Aspect | Detail |
|--------|--------|
| Language | Kotlin |
| UI | Jetpack Compose + Material3 |
| DI | Hilt |
| Auth | Google OAuth via Credential Manager → `/api/auth/google-native` |
| Receipt scan | ML Kit Text Recognition v2 (on-device spatial OCR) |
| Entity extraction | ML Kit Entity Extraction (money/date detection, on-device) |
| QR / Barcode | ML Kit Barcode Scanner |
| API base | `https://kachalabs.com/api/mobile/` |

### iOS (`ios-app/`)

| Aspect | Detail |
|--------|--------|
| Language | Swift |
| UI | SwiftUI |
| Auth | Clerk iOS SDK |
| API base | `https://kachalabs.com/api/mobile/` |

Both mobile apps use `/api/mobile/*` endpoints with Bearer token authentication.

### Android Navigation (`MainActivity.kt` — Jetpack Navigation Compose)

| Route | Screen | Navigated From |
|-------|--------|----------------|
| `Screen.Home` | `HomeScreen` | Bottom nav |
| `Screen.Reports?initialTab={0\|1}` | `ReportsScreen` | Bottom nav / "View All" links on Home |
| `Screen.Create` | `AddReceiptScreen` | Bottom nav (center FAB) |
| `Screen.Workspaces` | `WorkspacesScreen` | Bottom nav |
| `Screen.Account` | `AccountScreen` | Bottom nav |
| `expenses/{expenseId}` | `ExpenseDetailScreen` | HomeScreen item tap / ReportsScreen row tap (including scanning items) |
| `reports/{reportId}` | `ReportDetailScreen` | HomeScreen report tap / ReportsScreen row tap |
| `workspaces/{id}` | `WorkspaceDetailScreen` | WorkspacesScreen row tap |
| `workspaces/new` | `CreateWorkspaceScreen` | WorkspacesScreen create button |
| `profile` | `ProfileScreen` | AccountScreen |
| `profile/edit-*` | Edit field screens | ProfileScreen |
| `preferences` | `PreferencesScreen` | AccountScreen |
| `preferences/theme` | `ThemeScreen` | PreferencesScreen |
| `security` | `SecurityScreen` | AccountScreen |
| `about` | `AboutScreen` | AccountScreen |

HomeScreen passes four navigation callbacks: `onViewAllExpenses`, `onViewAllReports`, `onExpenseClick(id)`, and `onReportClick(id)`. Tapping any individual expense or report card navigates directly to its detail screen.

### Android Scan UI (`AddReceiptScreen` — `ui/screens/AddReceiptScreen.kt`)

The scan screen opens the camera immediately on launch (auto-requests permission via `LaunchedEffect`). It is structured as an immersive full-screen camera experience.

**Top bar (overlaid on viewfinder)**
- Floating X button (top-left, circular, `Icons.Filled.Close`) — closes camera, returns to previous state
- `[ ✏️ Manual ] [ 🧾 Scan ]` pill toggle (top-center) — tapping Manual switches to `ManualEntrySection`

**Flash toggle** — circular button, top-left below the X. Toggles `flashEnabled` flag. Flash fires only at the moment of capture (`imageCapture.flashMode = FLASH_MODE_ON/OFF`) — no persistent torch.

**Full-screen / hide bottom nav** — `AddReceiptScreen` accepts `onFullscreenChanged: (Boolean) -> Unit`. `SideEffect` fires it whenever `showCamera` or `showManual` is true. `MainActivity` holds `var cameraFullscreen` and conditionally renders `bottomBar = {}` and `Modifier.fillMaxSize()` (no scaffold padding) when true.

**Swipeable mode selector** — above the shutter button, horizontally swipeable with `detectHorizontalDragGestures`:

| Mode | Behavior |
|------|----------|
| `SINGLE` | One shot → auto-advances to Review. Left slot shows Gallery icon. Right slot hidden. |
| `BATCH` | Multiple separate receipts. Each shutter tap adds a new filmstrip thumbnail. Right slot shows green `>` when ≥1 capture. |
| `STITCH` | One long receipt across multiple frames. Each shutter tap increments frameCount on the single thumbnail (no new entry). Right slot shows green `>` when ≥1 capture. |

**Bottom control panel (3 slots)**

| Slot | SINGLE mode | BATCH / STITCH mode |
|------|-------------|---------------------|
| Left | Gallery icon → opens photo picker | Filmstrip thumbnail (stacked squares with count badge) |
| Center | Shutter (always) | Shutter (always) |
| Right | Hidden | Green `>` arrow → triggers `onDone()` to advance to Review |

**Filmstrip logic** (UI state only — no stitching yet):
- `FilmstripEntry(thumbnailBytes, frameCount)` — one entry per receipt in BATCH, one shared entry in STITCH
- BATCH: `filmstrip = filmstrip + FilmstripEntry(bytes)`
- STITCH: `filmstrip[0].frameCount++` (no new entry, visually communicates "same receipt")

**State management** — all scan mode / filmstrip / torch state is local to `ReceiptCamera`. Images are forwarded to `ScanReceiptViewModel.addImageBytes()` as before. The full ViewModel state machine (`ChooseMethod → ReviewImages → Processing → OcrResults → Uploading → Results`) is unchanged.

### Manual Entry Flow (`ManualEntrySection`)

Full-screen composable (triggered when user taps "Manual" from the camera view). Hides bottom nav via the same `onFullscreenChanged` mechanism.

- **X button** (top-left) — returns to camera
- **`[ ✏️ Manual ] [ 🧾 Scan ]` toggle** — Manual highlighted; tapping Scan re-launches camera permissoin request
- **Large amount display** — `KES 0` style, updates live as digits are entered
- **Currency pill** — cycles through KES → USD → EUR → GBP on tap
- **Flip +/- pill** — prepends/removes `-` sign
- **Custom numpad** — 3×4 grid: 1–9, `.`, `0`, `⌫ (Backspace)`. Each key is a `Surface(onClick)` at 64dp height.
- **"Next" button** — enabled only when amount is non-zero. Calls `viewModel.beginManualFlow(amount)` which sets `editedAmount`, clears images/OCR, and advances state to `OcrResults` → shows `ConfirmDetailsSection` (same confirm screen as scan flow).

### Confirm Details Flow (`ConfirmDetailsSection`)

Redesigned per-expense confirmation screen (all flows: scan, batch, stitch, gallery, manual). Hidden bottom nav via `onFullscreenChanged` since `OcrResults` is now included in the fullscreen check in `SideEffect`.

**Architecture:**
- `ScanReceiptViewModel` now holds `expenseStates: StateFlow<List<ExpenseEditState>>` — one entry per image/receipt
- `ExpenseEditState(imageBytes, description, amount, currency, category, reimbursable, ocrResult)`
- `currentExpenseIndex: StateFlow<Int>` — which expense is being reviewed
- `uploadAll()` now iterates `expenseStates` instead of a flat `selectedImages` list — fully per-expense

**Screen layout (matches UI spec):**
- **Top bar** — back arrow + "Confirm details" title + "X of Y" subtitle (multi-receipt) + `<` `>` circle chevrons (multi-receipt navigation)
- **"To" row** — workspace avatar + name + description + right chevron → taps to open `WorkspacePickerView`
- **Receipt image box** — 200–340dp height, `ContentScale.Fit`, tappable → opens `ReceiptFullscreenView`; shows KRA badge if QR detected; shows "No image — manual entry" placeholder for manual flow
- **Concierge hint** — sparkle (✨) icon + "Concierge will automatically enter the expense details for you, or you can add them manually."
- **Amount row** — tappable row → opens `AmountEditorView`; shows `currency + amount` or "Add amount"
- **Description row** — tappable row → opens `DescriptionEditorView`
- **Category row** — tappable row → dropdown with sparkle icon for "Automatic" option
- **Reimbursable** — `Switch` toggle
- **"Remove this expense"** — muted pill button, only shown when `total > 1`; calls `viewModel.removeExpenseAtIndex(currentIndex)`
- **"Create N expenses" / "Create expense"** — primary green pill button; calls `viewModel.uploadAll()` then `onDone()` (navigates to Expenses tab immediately, upload continues in background)

**Gallery skip:** `galleryLauncher` callback now calls `viewModel.processOnDevice()` immediately after adding images → skips `ReviewImages` state entirely.

**Camera skip:** Camera's `onDone` callback now calls `viewModel.processOnDevice()` → same skip.

### Background Scan Architecture (`data/BackgroundScanService.kt` + `data/PendingExpensesRepository.kt`)

OCR happens **after** the user taps "Create expense" — never before. The user sees instant navigation to the Reports tab while scanning continues in the background.

```
User taps "Create expense"
    │
    ├─ ScanReceiptViewModel.processOnDevice()
    │   └─ Creates BLANK ExpenseEditState per image (ocrResult = null)
    │
    ├─ ScanReceiptViewModel.submitAndScanInBackground()
    │   ├─ Creates scanning placeholders in PendingExpensesRepository
    │   ├─ Navigates to Reports tab immediately
    │   └─ Hands off to BackgroundScanService.submit()
    │
    └─ BackgroundScanService (singleton, SupervisorJob + Dispatchers.IO)
        └─ For each image:
            ├─ Pass 1: ML Kit OCR + Entity Extraction (on-device)
            ├─ Pass 2: Barcode scan (eTIMS QR)
            ├─ Update placeholder with OCR data (still "scanning" status)
            ├─ Upload to /api/mobile/receipts/upload
            └─ Replace placeholder with real ExpenseItem ("processed" status)
```

**Key singletons:**

| Class | Purpose |
|-------|--------|
| `BackgroundScanService` | `@Singleton` with `CoroutineScope(SupervisorJob() + Dispatchers.IO)`. Outlives ViewModel — never cancelled by navigation. Runs OCR + upload per image. |
| `PendingExpensesRepository` | `@Singleton` `StateFlow<List<ExpenseItem>>` holding scanning placeholders. Includes a local image bytes cache (`Map<String, ByteArray>`) so the detail screen can display camera images before upload completes. `ReportsViewModel` merges these with fetched items via `combine()`. |

**ReportsScreen behavior:**
- Scanning items show dark blue card (`Color(0xFF0D1F2D)`) with blue border (`Color(0xFF1A3A5C)`) and "Scanning…" placeholders for empty fields only
- When `processingStatus` changes to `"processed"`, the card transitions to normal style with a 1.5s highlight halo
- `ReportsViewModel` auto-switches to Expenses tab when a newly completed expense arrives
- Scanning cards are tappable — navigate to detail with live-updating scanning state (no 404)

### Workspace Picker (`WorkspacePickerView`)

Full-screen overlay composable. Triggered by tapping the "To" row in `ConfirmDetailsSection`; returned to via back button or selection.

- Dark background (`AppTheme.colors.backgroundGradient`)
- Back arrow + "Choose recipient" title
- Workspaces grouped: **Personal** (entries where `planType == null` or name contains "personal") → **Workspaces** (all others)
- Each row: square-rounded avatar (emoji / initials) + name + description/currency symbol + checkmark when selected
- Tapping a row → calls `viewModel.setWorkspaceId(id)` + closes picker

### Receipt Full-Screen Viewer (`ReceiptFullscreenView`)

Full-screen overlay composable. Triggered by tapping the image box in `ConfirmDetailsSection`.

- Deep dark green background (`Color(0xFF0C1F14)`)
- Top: back arrow + "Receipt" title + 3-dot overflow menu (Replace option)
- Image fills screen with padding for top/bottom bars (`ContentScale.Fit`)
- Bottom bar: **Rotate** / **Crop** / **Replace** pill buttons — Replace calls `onReplace()` which re-launches gallery picker

### ExpenseCard Scanning / Error States (`ReportsScreen.kt`)

`ExpenseCard` updated to fully reflect server-side `processing_status`:

| Status | Visual |
|--------|--------|
| `scanning` | Dark blue card (`Color(0xFF0D1F2D)`) + blue border (`Color(0xFF1A3A5C)`) + "Scanning…" placeholders only for fields not yet filled by OCR |
| `error` / `needs_review` | Normal card + red-dot + inline error message: "Missing merchant. Receipt scanning failed. Enter details manually." |
| `processed` | Normal card with full merchant, amount, KRA badge |

Each card now: **workspace name + avatar** in top-left; **"View" chip** in top-right; **date · Cash** meta row; larger **52dp image thumbnail**.

### ExpenseDetailScreen — Per-Field Edit + Scanning-Aware Flow (`ui/screens/ExpenseDetailScreen.kt`)

`ExpenseDetailScreen` uses an `editingField` state variable to switch between the read-only detail view and per-field edit sub-screens (Amount, Description, Merchant, Date, Category). Each edit sub-screen has a field-specific UI (number pad for amount, search list for categories, date picker calendar, etc.).

**System back button** is intercepted via `BackHandler` when `editingField != null` — returns to the detail view instead of popping the navigation stack.

**Scanning-aware detail flow:**

```
User taps scanning card in ReportsScreen
    │
    ├─ ExpenseDetailViewModel.loadExpense(tempId)
    │   ├─ Checks PendingExpensesRepository FIRST (no API call)
    │   ├─ Shows pending item immediately with local camera image
    │   └─ Starts observePendingUpdates(tempId) Flow collector
    │
    ├─ While scanning (Flow emits updates):
    │   ├─ OCR fills in merchant/amount/category → UI updates live
    │   ├─ Only truly empty fields show "Scanning..." placeholder
    │   └─ Local camera image displayed via PendingExpensesRepository.getImageBytes()
    │
    └─ Upload completes (tempId replaced with real server ID):
        ├─ Flow detects tempId gone, reads newlyCompletedId
        ├─ Sets resolvedId for future API calls
        ├─ Fetches fresh data from API using real server ID
        └─ Cancels observation Job
```

**Key design decisions:**
- `PendingExpensesRepository` stores local image bytes (`ByteArray`) keyed by temp ID — detail screen uses Coil’s `ByteArray` data support to display them before upload
- Description is **user-only** — never auto-filled from merchant name (prevents duplicate data)
- `resolvedId` used by `updateExpense()` so edits after scanning completes target the real server ID
- Per-field edit sub-screens: `AmountEditContent` (custom number pad), `DescriptionEditContent` (text field), `MerchantEditContent` (text field), `DateEditContent` (Material3 DatePicker), `CategoryEditContent` (searchable list of 13 categories)

### Android Token Storage (`auth/TokenRepository.kt`)

Three-tier token storage with automatic failover:

| Priority | Storage | Purpose |
|----------|---------|---------|
| 1 (Primary) | Android AccountManager | System-level account, survives app updates |
| 2 (Fallback) | EncryptedSharedPreferences | AES-256-GCM via AndroidKeystore MasterKey |
| 3 (Legacy) | Plain SharedPreferences | Old app versions, auto-migrated to tier 1 |

**Keystore corruption recovery:** `EncryptedSharedPreferences` can throw `AEADBadTagException` when Android Keystore keys become corrupted (reinstall, OS update, backup restore). Recovery flow:

1. Catch exception on `EncryptedSharedPreferences.create()`
2. Delete corrupted prefs XML file from `shared_prefs/`
3. Delete corrupted MasterKey alias from Android Keystore (`_androidx_security_master_key_`)
4. Recreate both from scratch — user must re-authenticate
5. If still failing, fall back to plain SharedPreferences (crash prevention)
6. On next successful encrypted init, stale plaintext fallback prefs are auto-cleared

### Android Disk Cache (`data/AppDataCache.kt`)

Unified per-user disk cache using SharedPreferences + Gson serialization. Keys are namespaced: `"<userId>:<dataKey>"`.

| Data | Key | Cached on |
|------|-----|-----------|
| User profile | `profile` | Login, profile update |
| Workspaces | `workspaces` | Workspace list fetch |
| Expense items (page 1) | `expense_items` | Dashboard load |
| Expense reports (page 1) | `expense_reports` | Dashboard load |
| Monthly stats | `mobile_stats` | Dashboard load |

Every write records a `<key>_ts` staleness timestamp. `isStale(userId, key, maxAgeMs)` available for TTL-based cache invalidation.

**Cache-first pattern:** On ViewModel init, cached data is loaded synchronously into StateFlows (instant UI). Network fetch runs in parallel behind it. UI updates atomically when fresh data arrives — no zero-flash.

### Android Dashboard Data Flow (`HomeScreen` + `ReportsViewModel`)

```
App Launch
│
├─ ReportsViewModel.init()
│   ├─ Synchronous: Load cached expenses, reports, stats from AppDataCache
│   │   └─ StateFlows emit immediately → UI shows last-known values
│   │
│   └─ Async: fetchExpenseData() fires 3 parallel API calls:
│       ├─ async { apiService.getExpenseReports() }
│       ├─ async { apiService.getReceipts() }
│       └─ async { apiService.getStats() }
│       └─ supervisorScope: each call independent, one failure ≠ all fail
│       └─ Results update StateFlows + save to AppDataCache
│
├─ HomeScreen collects StateFlows:
│   ├─ serverStats?.totalThisMonth  (preferred)
│   └─ ?: clientTotalThisMonth      (fallback: sum from page-1 expenses)
│
├─ HeroSpendingCard renders "This Month" balance
│
└─ Item tap navigation:
    ├─ Recent Expenses: onExpenseClick(id) → navController.navigate("expenses/$id")
    └─ Active Reports:  onReportClick(id) → navController.navigate("reports/$id")
```

### Android On-Device Receipt Processing (`receipt/ReceiptProcessor.kt`)

**Privacy-first:** No receipt image or financial data leaves the device. All OCR and extraction run on-device via ML Kit.

**No heuristic fallbacks.** Entity Extraction always awaits `downloadModelIfNeeded()` synchronously before annotating — even on first launch. The user sees a "scanning" placeholder card in Reports, so blocking on the model download is acceptable UX. Returns empty lists only if the model genuinely cannot be downloaded (no connectivity and no cache).

```
BackgroundScanService hands off bitmap
    │
    ▼
Pass 1: runSpatialOcr(bitmap) — 3-step suspend function
    │
    ├─ Step 1: ML Kit Text Recognition v2 (suspendCoroutine wrapper)
    │   └─ Returns: fullText + lineElements + wordElements with bounding boxes
    │
    ├─ Step 2: extractEntities(fullText) — proper suspend call
    │   └─ downloadModelIfNeeded() → annotate() → money + date entities
    │   └─ No heuristic regex fallback. Empty lists if model unavailable.
    │
    └─ Step 3: Spatial field extraction using OCR + entity results
        ├──► extractMerchantSpatial() — Top 30%, skip noise lines
        ├──► extractTotalSpatial() — Keyword-first, bottom-to-top
        │     Tier 1: CASH, GRAND TOTAL, TOTAL DUE, AMOUNT PAID
        │     Tier 2: bare TOTAL, NET AMOUNT
        │     Tier 3: AMOUNT, BALANCE
        │     Tier 4: Sum, SUBTOTAL
        │     Cross-validates: CASH vs TOTAL agreement
        │     No keyword match → returns null → user enters amount
        ├──► extractDateSpatial() — DD/MM/YYYY patterns, 2020..current+1
        │     (fallback when Entity Extraction returns no valid dates)
        └──► guessCategory() — 13 Kenyan categories, keyword scoring
    │
    ▼
Pass 2: runBarcodeScan(bitmap) — ML Kit Barcode Scanner
    └─ eTIMS QR code detection (QR_CODE + DATA_MATRIX)
    └─ rawValue ?: displayValue (handles both QR payload formats)
    │
    ▼
Returns MultiPassResult → BackgroundScanService merges with user edits → uploads
```

**Amount parsing (`parseLocaleAmount`):** Handles Kenyan locale (comma = thousands, dot = decimal). Multi-dot strings treat last dot as decimal (`"1.000.00"` → 1000.0). Phone numbers (8+ digits, `+` prefix) are filtered. Cap at 10M.

---

## 10. Receipt Processing Pipeline

### Web (server-side) — `lib/receipt-processing/`

Used by the web app. Image uploaded → server processes with Gemini Vision + Tesseract.js.

```
Image Upload
    │
    ▼
Image Preprocessing (jimp)
    │  ├─ Resize, contrast, sharpen
    │  └─ Convert to base64
    │
    ├──────► QR Decode (jsqr)
    │         └─ KRA eTIMS URL extraction
    │
    ├──────► Gemini Vision (process-vision)
    │         └─ Structured data extraction
    │
    └──────► Tesseract.js (ocr-free)
              └─ Free OCR fallback
    │
    ▼
Data Normalization + Vendor Matching
    │
    ▼
Store in raw_receipts table
```

### Mobile (on-device) — `android-app/.../receipt/ReceiptProcessor.kt`

Used by Android/iOS. All processing runs on-device via ML Kit. No financial data leaves the phone. Server-side pipeline is **disabled** for mobile uploads (`route.ts` skips orchestrator). See Section 9 for the full on-device flow.
```

### Key modules

| Module | Purpose |
|--------|---------|
| `orchestrator.ts` | Coordinates the processing pipeline |
| `ai-enhancement.ts` | Gemini Vision processing |
| `image-preprocessor.ts` | Image resize/enhance before OCR |
| `ocr-ai.ts` | AI-powered OCR |
| `ocr-free.ts` | Tesseract.js free fallback |
| `qr-decoder.ts` | QR code detection + decode |
| `raw-storage.ts` | Supabase storage for receipt images |
| `store-recognition.ts` | Vendor/store pattern matching |
| `vendor-parsers.ts` | Store-specific receipt parsing |
| `template-registry.ts` | Receipt template patterns |
| `kra-scraper.ts` | KRA/eTIMS receipt data scraper |
| `comprehensive-processor.ts` | Full pipeline processing |

---

## 11. Infrastructure & Deployment

| Service | Purpose | Config |
|---------|---------|--------|
| Vercel | Web hosting + serverless functions | `vercel.json`, auto-deploy from main |
| Supabase | Database (PostgreSQL) + Storage | RLS enabled, Clerk JWT integration |
| Clerk | Authentication | Middleware + JWT templates |
| Google Cloud | Gemini Vision API | API key in env |

### Environment variables

| Variable | Purpose |
|----------|---------|
| `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` | Clerk frontend key |
| `CLERK_SECRET_KEY` | Clerk backend key |
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase anonymous key |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase admin key (server only) |
| `GOOGLE_GENERATIVE_AI_API_KEY` | Gemini Vision API key |

---

## 12. Security

### Auth

- Clerk middleware protects all non-public routes
- API routes verify `auth()` before processing
- Mobile endpoints verify Bearer tokens
- Service role key used only in server-side API routes (never exposed to client)

### Database

- All tables have RLS enabled
- `workspace_members` uses `SECURITY DEFINER` functions to prevent infinite recursion
- User ID from Clerk JWT (`auth.jwt()->>'sub'`) — never trust client-submitted user_id

### Storage RLS (Supabase `receipts` bucket)

Upload path: `<userId>/timestamp.jpg`. RLS policy (migration 023) allows access when `foldername[1]` matches EITHER the user's email (`auth.jwt()->>'email'`) OR their Clerk sub (`auth.jwt()->>'sub'`). Web uses email-based folders; mobile uses userId-based folders.

### Android Token Security

Three-tier storage: AccountManager (primary) → EncryptedSharedPreferences (AES-256-GCM via AndroidKeystore) → legacy SharedPreferences (auto-migrated). Keystore corruption handled with full cleanup + graceful fallback (see Section 9).

### On-Device Receipt Privacy

Mobile receipt processing runs entirely on-device via ML Kit. No receipt images or extracted financial data are sent to any AI/cloud service. Only the final user-confirmed structured data (merchant, amount, date, category) is uploaded to the server.

### Report submission

- Suspicious activity and bug reports stored in `support_tickets` table
- Fallback to legacy tables if `support_tickets` doesn't exist
- Server-side console logging as last resort
- API endpoints always return success to user (reports are captured either way)

### Public pages

- `/help/delete-account` — public page for Google Play/App Store compliance
- No user data exposed on public pages

---

## 13. Migrations

Applied in order. Located in `migrations/`.

| Migration | Purpose |
|-----------|---------|
| `001-add-multi-tenant.sql` | Initial multi-tenant schema |
| `002-add-workspaces.sql` | Workspaces table + RLS |
| `003-link-raw-receipts-to-expense-items.sql` | Link receipts to expense items |
| `004-fix-rls-for-clerk.sql` | Fix RLS for Clerk auth |
| `005-add-workspace-details.sql` | Add description, address, plan_type to workspaces |
| `006-unify-rls-to-user-id.sql` | Unify RLS to use user_id |
| `007-user-profiles-rls.sql` | User profiles RLS policies |
| `008-fix-rls-clerk-user-id.sql` | Fix RLS for Clerk non-UUID user IDs |
| `009-create-support-tickets.sql` | Support tickets table for bugs + security reports |
| `010-deploy-enhanced-receipt-schema.sql` | Enhanced receipt schema with structured fields |
| `011-receipt-templates.sql` | Receipt template patterns for vendor matching |
| `012-add-enhanced-receipt-tables.sql` | Additional enhanced receipt tables |
| `013-fix-workspace-rls-recursion.sql` | Fix infinite recursion in workspace_members RLS using SECURITY DEFINER functions |
| `014-workspace-collaboration.sql` | workspace_members table, roles, triggers |
| `015-add-etims-qr-fields.sql` | eTIMS QR URL and data fields on receipts |
| `016-add-etims-tracking.sql` | eTIMS verification tracking |
| `017-create-storage-buckets.sql` | Storage bucket policies (profile-avatars — superseded by 031) |
| `018-remove-unused-tables.sql` | Clean up unused tables/triggers |
| `019-support-tickets-updated-at-trigger.sql` | Auto-update `updated_at` on support_tickets |
| `020-fix-workspace-member-rls.sql` | Fix workspace_members RLS policies |
| `021-backfill-workspace-members-and-link-receipts.sql` | Backfill workspace_members + link receipts |
| `022-consolidate-workspace-rls.sql` | Consolidate workspace RLS to single policy set |
| `023-fix-receipts-storage-policy.sql` | Fix Storage RLS for mobile — folder[1] matches email OR Clerk sub |
| `024-stats-rpc-functions.sql` | RPC functions for dashboard statistics |
| `025-atomic-report-total.sql` | Atomic report total recalculation |
| `026-workspace-member-data-access.sql` | Workspace members can read shared data |
| `027-stores-rls-and-nearby-rpc.sql` | Stores table RLS + nearby store lookup RPC |
| `028-fix-bucket-mime-types.sql` | Fix allowed MIME types on storage buckets |
| `029-stats-rpc-security-invoker.sql` | Stats RPC functions use SECURITY INVOKER |
| `030-add-is-default-workspace.sql` | `is_default` flag on workspaces |
| `031-profile-pictures-storage-policies.sql` | Storage RLS for `profile-pictures` bucket (folder-scoped, replaces 017) |

### Important: Migration 013 must be applied AFTER 014

Migration 014 creates `workspace_members` and its (recursive) policies. Migration 013 replaces those policies with non-recursive versions using `is_workspace_member()` and `is_workspace_admin()` security definer functions.

---

## 14. Planned Features

These features are in the roadmap but NOT on the website. They should NOT appear as "coming soon" UI on any deployed page.

- **Two-factor authentication** — Additional account security
- **Merge accounts** — Combine multiple sign-in providers
- **Currency conversion** — Automatic conversion between currencies across workspaces
- **Help center** — In-app help and FAQ
- **Approval workflows** — Multi-step expense approval chains
- **Corporate cards** — Virtual/physical card management
- **Offline mode** — Receipt capture without internet

> **Rule:** Nothing goes on the website unless it works. No placeholders, no "coming soon" badges, no grayed-out features. Features are released when ready.
