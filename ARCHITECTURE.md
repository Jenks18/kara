# MafutaPass — Architecture & Single Source of Truth

> **Last updated:** 2025-07-13  
> **Audience:** Production-grade Play Store / App Store app targeting 1,000+ users  
> **Maintainer rule:** Every code change MUST be reflected here. This file is the single source of truth.

---

## Table of Contents

1. [Product Overview](#1-product-overview)
2. [System Architecture](#2-system-architecture)
3. [Authentication](#3-authentication)
4. [Database & Storage](#4-database--storage)
5. [API Reference](#5-api-reference)
6. [Android App](#6-android-app)
7. [iOS App](#7-ios-app)
8. [Web App](#8-web-app)
9. [Theming & Design System](#9-theming--design-system)
10. [Infrastructure & Deployment](#10-infrastructure--deployment)
11. [Security](#11-security)
12. [Decision Log](#12-decision-log)

---

## 1. Product Overview

**MafutaPass** is an AI-powered fuel expense tracking platform for businesses in Kenya. It lets users photograph fuel receipts, automatically extracts data (KRA QR codes + OCR), groups expenses into reports, and manages multi-tenant workspaces.

### Platforms

| Platform | Stack | Status |
|----------|-------|--------|
| Web | Next.js 15 + Tailwind + Clerk | Production (mafutapass.com) |
| Android | Kotlin + Jetpack Compose + Material3 + Hilt | In Development |
| iOS | SwiftUI + Clerk SDK | In Development |

### Core Features

- **Receipt capture** — Camera/gallery → QR decode + OCR → structured fuel transaction
- **Expense reports** — Group receipts, draft/submit/approve workflow
- **Workspaces** — Multi-tenant isolation (personal + business)
- **User profiles** — Avatar (emoji system), display name, preferences
- **Theme** — Light/Dark/System with emerald brand palette

---

## 2. System Architecture

```
┌─────────────┐  ┌─────────────┐  ┌─────────────┐
│  Android App │  │   iOS App   │  │   Web App   │
│  (Kotlin)    │  │  (SwiftUI)  │  │  (Next.js)  │
└──────┬───────┘  └──────┬───────┘  └──────┬───────┘
       │                 │                 │
       │    HTTPS (Bearer JWT)             │  Clerk Session
       │                 │                 │
       ▼                 ▼                 ▼
┌──────────────────────────────────────────────────┐
│              Next.js API Routes (Vercel)          │
│  ┌──────────┐  ┌──────────┐  ┌────────────────┐  │
│  │ Auth     │  │ Mobile   │  │ Web (Clerk     │  │
│  │ Endpoints│  │ Endpoints│  │ server-side)   │  │
│  └────┬─────┘  └────┬─────┘  └───────┬────────┘  │
│       │              │                │           │
│       ▼              ▼                ▼           │
│  ┌─────────────────────────────────────────────┐  │
│  │  lib/auth/mobile-jwt.ts  — HS256 JWT mint   │  │
│  │  lib/auth/mobile-auth.ts — verify + extract │  │
│  │  lib/supabase/mobile-client.ts — RLS JWT    │  │
│  └─────────────────────────────────────────────┘  │
└──────────────────────┬───────────────────────────┘
                       │
           ┌───────────┼───────────┐
           ▼           ▼           ▼
      ┌─────────┐ ┌─────────┐ ┌─────────┐
      │  Clerk  │ │Supabase │ │Supabase │
      │ Backend │ │ Postgres│ │ Storage │
      │   SDK   │ │ (+ RLS) │ │ (Images)│
      └─────────┘ └─────────┘ └─────────┘
```

### Key Principles

1. **Backend is the sole authority** — Mobile apps NEVER talk to Clerk or Supabase directly. All auth tokens are minted server-side.
2. **Zero fallbacks** — Single code path per operation. No "try A, fallback to B" patterns.
3. **RLS everywhere** — Every Supabase query runs through Row Level Security. No manual `.eq('user_id', ...)` filters needed.
4. **Stateless API** — Every request is independently authenticated. No server-side sessions.

---

## 3. Authentication

### 3.1 Mobile Auth Flow (Android & iOS)

```
Mobile App                    Backend (/api/auth/*)              Clerk         Supabase
    │                              │                              │              │
    ├── POST /mobile-signin ──────►│                              │              │
    │   {email, password}          ├── verifyPassword() ─────────►│              │
    │                              │◄── OK ───────────────────────┤              │
    │                              ├── mintMobileSessionJwt() ────┤              │
    │◄── {token, userId} ─────────┤                              │              │
    │                              │                              │              │
    ├── GET /mobile/receipts ─────►│                              │              │
    │   Authorization: Bearer JWT  ├── verifyMobileSessionJwt() ──┤              │
    │                              ├── mintSupabaseJwt() ─────────┼─────────────►│
    │                              │◄── RLS-filtered data ────────┼──────────────┤
    │◄── receipts[] ───────────────┤                              │              │
```

### 3.2 Token Architecture

| Token | Signed With | Algorithm | Expiry | Purpose |
|-------|-------------|-----------|--------|---------|
| Mobile Session JWT | `CLERK_SECRET_KEY` | HS256 | 1 hour | Authenticate mobile API requests |
| Supabase RLS JWT | `SUPABASE_JWT_SECRET` | HS256 | 1 hour | Per-request Supabase client with RLS enforcement |
| Clerk Web Session | Clerk JWKS (RS256) | RS256 | Managed by Clerk | Web app authentication |

### 3.3 JWT Claims — Mobile Session

```json
{
  "iss": "mafutapass",
  "sub": "user_2abc...",       // Clerk user ID
  "email": "user@example.com",
  "aud": "mobile",
  "role": "authenticated",
  "sid": "mob_1720000000_abc123",
  "iat": 1720000000,
  "exp": 1720003600
}
```

### 3.4 JWT Claims — Supabase RLS

```json
{
  "iss": "supabase",
  "sub": "user_2abc...",       // Same Clerk user ID
  "email": "user@example.com",
  "aud": "authenticated",
  "role": "authenticated",
  "user_id": "user_2abc...",   // Redundant for RLS compat
  "iat": 1720000000,
  "exp": 1720003600
}
```

### 3.5 Auth Methods

| Method | Endpoint | Flow |
|--------|----------|------|
| Email/password sign-in | `POST /api/auth/mobile-signin` | Verify password via Clerk Backend SDK → mint JWT |
| Email/password sign-up | `POST /api/auth/mobile-signup` | Create Clerk user (auto-verify email) → mint JWT |
| Google OAuth (native) | `POST /api/auth/google-native` | Verify Google ID token → find/create Clerk user → mint JWT (or return `needsUsername` for new users) |
| Google OAuth (complete) | `POST /api/auth/complete-google-signup` | Verify pending token → create user with chosen username → mint JWT |
| Token refresh | `POST /api/auth/mobile-refresh` | Decode expired JWT (no verify) → confirm user exists in Clerk → mint fresh JWT |

### 3.6 Token Lifecycle (Android)

```
App Launch
    │
    ▼
TokenRepository.getValidTokenAsync()
    │
    ├── Token valid? → Return token
    ├── Token expired < 5min? → Background refresh via WorkManager
    └── Token expired? → refreshTokenImmediate() → POST /mobile-refresh
```

**Storage hierarchy** (Android):
1. **AccountManager** (primary) — survives app uninstall on some devices
2. **EncryptedSharedPreferences** (fallback) — AES-256 encrypted
3. **SharedPreferences** (legacy migration only) — migrated up on first read

### 3.7 Why Backend-Only Minting

> **Decision:** The backend is the ONLY entity that mints JWTs. Mobile apps never call Clerk Frontend API.

**Reasons:**
- **Single point of control** — Revoke any user instantly server-side
- **No API key exposure** — Clerk publishable key never ships in APK/IPA
- **Audit trail** — Every auth event logged server-side
- **Consistent claims** — JWT shape is identical regardless of auth method
- **Play Store compliance** — No embedded secrets to extract via APK decompilation

---

## 4. Database & Storage

### 4.1 Supabase Tables

| Table | Key Columns | RLS Policy |
|-------|-------------|------------|
| `user_profiles` | `user_id` (PK, text), `email`, `display_name`, `avatar_emoji`, `avatar_bg_color` | `user_id = auth.jwt()->>'sub'` |
| `workspaces` | `id` (UUID), `user_id`, `name`, `avatar`, `currency`, `is_active` | `user_id = auth.jwt()->>'sub'` |
| `expense_reports` | `id` (UUID), `user_id`, `workspace_id` (FK), `title`, `status`, `date_range_*` | `user_id = auth.jwt()->>'sub'` |
| `expense_items` | `id` (UUID), `report_id` (FK), `merchant_name`, `total_amount`, `fuel_type`, `litres` | Via `report_id` join to `expense_reports.user_id` |
| `raw_receipts` | `id` (UUID), `user_email`, `image_url`, `qr_data`, `ocr_data` | `user_email = auth.jwt()->>'email'` |
| `stores` | `id`, `name`, `pin`, `location` | Service role only |

### 4.2 RLS Strategy

All RLS policies use `auth.jwt()->>'sub'` (Clerk user ID) — **not** `auth.uid()` (which expects UUID format).

Exception: `raw_receipts` uses `auth.jwt()->>'email'` because receipts are uploaded before profile creation.

**Migration history:** 001 → 008. Migration 008 is the definitive RLS fix that standardized all policies to use JWT `sub` claim.

### 4.3 Supabase Storage Buckets

| Bucket | Purpose | Access |
|--------|---------|--------|
| `receipts` | Receipt images (camera captures) | Authenticated users via RLS |
| `avatars` | User profile avatars | Public read, authenticated write |
| `workspace-avatars` | Workspace avatar images | Authenticated write |

### 4.4 Supabase Clients

| Client | File | Used By | Auth Method |
|--------|------|---------|-------------|
| Browser client | `lib/supabase/client.ts` | Web app (client components) | Clerk session → `getToken({template: 'supabase'})` |
| Server client | `lib/supabase/server-client.ts` | Web API routes | Clerk server auth → `auth().getToken({template: 'supabase'})` |
| Mobile client | `lib/supabase/mobile-client.ts` | Mobile API routes | Verify mobile JWT → mint Supabase HS256 JWT |

---

## 5. API Reference

### 5.1 Auth Endpoints (`/api/auth/`)

| Route | Method | Auth | Purpose |
|-------|--------|------|---------|
| `/api/auth/mobile-signin` | POST | None (public) | Email/password sign-in → JWT |
| `/api/auth/mobile-signup` | POST | None (public) | Email/password sign-up → JWT |
| `/api/auth/mobile-refresh` | POST | Expired Bearer | Refresh expired JWT |
| `/api/auth/mobile-profile` | GET | Bearer JWT | Get user profile + Supabase data |
| `/api/auth/mobile-profile` | PATCH | Bearer JWT | Update user profile fields |
| `/api/auth/google-native` | POST | None (Google ID token in body) | Google OAuth → JWT or `needsUsername` |
| `/api/auth/complete-google-signup` | POST | None (pending token in body) | Complete Google signup with username → JWT |
| `/api/auth/create-profile` | POST | Bearer JWT | Create Supabase user_profiles row |
| `/api/auth/android-callback` | GET | Clerk session | OAuth callback → deep link redirect |
| `/api/auth/mobile-redirect` | GET | Clerk session | OAuth callback → deep link redirect |

### 5.2 Mobile Data Endpoints (`/api/mobile/`)

| Route | Method | Auth | Purpose |
|-------|--------|------|---------|
| `/api/mobile/receipts` | GET | Bearer JWT | List expense items (RLS-filtered) |
| `/api/mobile/expense-reports` | GET | Bearer JWT | List expense reports with metadata |
| `/api/mobile/expense-reports` | POST | Bearer JWT | Create new expense report |
| `/api/mobile/workspaces` | GET | Bearer JWT | List active workspaces |
| `/api/mobile/workspaces` | POST | Bearer JWT | Create workspace |
| `/api/mobile/workspaces/[id]` | GET | Bearer JWT | Get single workspace |
| `/api/mobile/workspaces/[id]` | DELETE | Bearer JWT | Soft-delete workspace |
| `/api/mobile/auth` | POST | Bearer JWT | Exchange JWT for Supabase session |

### 5.3 Web Endpoints (`/api/`)

| Route | Method | Auth | Purpose |
|-------|--------|------|---------|
| `/api/receipts/upload` | POST | Clerk session | Upload + process receipt (60s timeout, 2GB memory) |
| `/api/receipts/process-vision` | POST | Clerk session | AI vision processing |
| `/api/receipts/scrape-kra` | POST | Clerk session | KRA QR code data scraping |
| `/api/expense-reports` | GET/POST | Clerk session | Web expense report CRUD |
| `/api/expense-reports/[id]` | GET/PATCH/DELETE | Clerk session | Single report CRUD |
| `/api/workspaces` | GET/POST | Clerk session | Web workspace CRUD |
| `/api/workspaces/[id]` | GET/PATCH/DELETE | Clerk session | Single workspace CRUD |
| `/api/user-profile` | GET/PATCH | Public | User profile (shared web+mobile) |
| `/api/upload-avatar` | POST | Clerk session | Upload avatar image to Supabase |
| `/api/update-username` | POST | Public | Update Clerk username |

### 5.4 Deprecated/Legacy Endpoints

| Route | Status | Notes |
|-------|--------|-------|
| `/api/auth/signup` | **410 Gone** | Replaced by Clerk Frontend API (web) or mobile-signup (mobile) |
| `/api/auth/verify-email` | **410 Gone** | Backend SDK auto-verifies emails |
| `/api/auth/google-mobile` | Legacy | Older Google flow, no JWT minting — superseded by google-native |
| `/api/auth/mobile-verify` | Legacy | Should be deprecated |

---

## 6. Android App

### 6.1 Architecture

```
┌─────────────────────────────────────────────┐
│                 UI Layer                      │
│  ┌──────────┐  ┌──────────┐  ┌───────────┐  │
│  │ Screens  │  │Components│  │ Theme     │  │
│  │ (Compose)│  │(Reusable)│  │(Material3)│  │
│  └────┬─────┘  └──────────┘  └───────────┘  │
│       │                                      │
│  ┌────┴────────────────────────────────────┐ │
│  │          ViewModels (Hilt)              │ │
│  │  AuthVM, ReportsVM, WorkspacesVM, etc.  │ │
│  └────┬────────────────────────────────────┘ │
├───────┼──────────────────────────────────────┤
│       │        Data Layer                    │
│  ┌────┴─────┐  ┌──────────┐  ┌───────────┐  │
│  │ ApiService│  │ Token    │  │ Clerk     │  │
│  │ (Retrofit)│  │Repository│  │AuthManager│  │
│  └────┬─────┘  └────┬─────┘  └───────────┘  │
│       │              │                       │
│  ┌────┴──────────────┴────────────────────┐  │
│  │      AuthInterceptor (OkHttp)          │  │
│  │  Injects Bearer token on every request │  │
│  └────────────────────────────────────────┘  │
└──────────────────────────────────────────────┘
```

### 6.2 Build Configuration

| Property | Value |
|----------|-------|
| Kotlin | 2.2.0 |
| AGP | 8.13.2 |
| Compose BOM | 2023.10.01 |
| Hilt | 2.56.2 |
| KSP | 2.2.0-2.0.2 |
| Min SDK | 26 (Android 8.0) |
| Target SDK | 35 (Android 15) |
| Compile SDK | 36 |
| JVM Target | 17 |
| Namespace | `com.mafutapass.app` |

### 6.3 Dependency Injection (Hilt)

| Module | Provides |
|--------|----------|
| `NetworkModule` | OkHttpClient (with AuthInterceptor + logging), Retrofit, ApiService |
| `AuthModule` | TokenRepository, ClerkAuthManager |
| Application | `@HiltAndroidApp MafutaPassApplication` (also initializes legacy `ApiClient`) |

### 6.4 Navigation

**4-tab bottom navigation:** Reports, Create, Workspaces, Account

| Route | Screen | Description |
|-------|--------|-------------|
| `reports` | ReportsScreen | List expense reports, pull-to-refresh |
| `create` | CreateScreen | Create new expense (camera/gallery) |
| `workspaces` | WorkspacesScreen | List workspaces with avatars |
| `account` | AccountScreen | Profile, preferences, security, about |
| `profile` | ProfileScreen | View/edit profile details |
| `profile/edit-*` | Edit screens | Individual field editors |
| `preferences` | PreferencesScreen | Theme toggle, app settings |
| `security` | SecurityScreen | Password, auth settings |
| `about` | AboutScreen | App info, licenses |
| `workspaces/new` | NewWorkspaceScreen | Create workspace form |
| `workspaces/{id}` | WorkspaceDetailScreen | Workspace details |
| `workspaces/{id}/overview` | WorkspaceOverviewScreen | Stats and summary |
| `workspaces/{id}/members` | WorkspaceMembersScreen | Team members |

### 6.5 Dual API System

> **Technical debt:** Two parallel networking systems exist.

| System | Implementation | Used By |
|--------|---------------|---------|
| **Hilt-injected** (preferred) | `ApiService` interface + `AuthInterceptor` | New ViewModels |
| **Legacy ApiClient** (deprecated) | `ApiClient` object + own OkHttp interceptor | ReportsViewModel, WorkspacesScreen, CreateScreen, older screens |

Both read tokens from `TokenRepository`. The legacy `ApiClient` requires `ApiClient.initialize(applicationContext)` in `MafutaPassApplication.onCreate()`.

**Migration plan:** Gradually move all screens from `ApiClient` to Hilt-injected `ApiService`.

### 6.6 Key Files

| File | Purpose |
|------|---------|
| `MafutaPassApplication.kt` | Hilt app entry + legacy ApiClient init |
| `MainActivity.kt` | Theme setup, auth gating, NavHost |
| `auth/TokenRepository.kt` | Token storage, refresh, WorkManager scheduling |
| `auth/ClerkAuthManager.kt` | Minimal: just signOut() + config |
| `data/network/AuthInterceptor.kt` | OkHttp interceptor, injects Bearer token |
| `data/ApiService.kt` | Retrofit interface + legacy ApiClient object |
| `ui/theme/Theme.kt` | Material3 theme definition |
| `ui/theme/AppColors.kt` | Extended app color system |
| `ui/theme/Color.kt` | Raw color constants |

---

## 7. iOS App

### 7.1 Architecture

SwiftUI-based app using Clerk iOS SDK for authentication.

| Layer | Contents |
|-------|----------|
| Views/ | 20+ SwiftUI views (pages and components) |
| Components/ | Reusable UI (BottomNavView) |
| Services/ | API.swift (networking), ClerkAuthManager.swift (auth) |
| Models/ | Data models (Models.swift) |

### 7.2 Key Files

| File | Purpose |
|------|---------|
| `OfficialClerkApp.swift` | App entry point with Clerk provider |
| `MafutaPassApp.swift` | Alternate entry point |
| `Views/MainAppView.swift` | Tab-based navigation |
| `Views/EmeraldTheme.swift` | Shared color/styling constants |
| `Services/API.swift` | URLSession-based API client |
| `Services/ClerkAuthManager.swift` | Clerk session management |

### 7.3 Status

iOS app has views for all major features but needs alignment with the current backend-only JWT architecture. Currently uses Clerk iOS SDK directly — needs migration to match Android's backend-minted JWT pattern.

---

## 8. Web App

### 8.1 Stack

| Technology | Version | Purpose |
|------------|---------|---------|
| Next.js | 15.1.3 | Framework (App Router) |
| React | 18.2.0 | UI library |
| Clerk | 6.36.6 | Authentication (web) |
| Supabase JS | 2.89.0 | Database client |
| Tailwind CSS | 3.3.0 | Styling |
| Lucide React | 0.294.0 | Icons |
| Sharp | 0.33.5 | Image processing |
| Tesseract.js | 7.0.0 | OCR |
| Gemini AI | 0.24.1 | Receipt vision processing |

### 8.2 Route Structure

```
app/
├── page.tsx               → Landing (redirects to /reports if signed in)
├── sign-in/[[...rest]]/   → Clerk sign-in
├── sign-up/[[...rest]]/   → Clerk sign-up
├── reports/               → Expense reports list
│   └── [id]/              → Single report detail
├── create/                → Create new expense
├── workspaces/            → Workspaces list
│   ├── new/               → Create workspace
│   └── [id]/              → Workspace detail
├── account/               → Account hub
│   ├── profile/           → Profile settings
│   ├── preferences/       → App preferences
│   ├── security/          → Security settings
│   ├── wallet/            → Payment settings
│   └── about/             → App info
└── test-qr/               → QR code testing
```

### 8.3 Middleware

Clerk middleware protects all routes except explicitly public ones:

**Public routes:**
- `/sign-in`, `/sign-up`
- All `/api/auth/*` endpoints (mobile auth)
- All `/api/mobile/*` endpoints (mobile data)
- `/api/user-profile`, `/api/update-username`

**Protected routes:** Everything else (requires Clerk session).

**Special behavior:** `/` (root) redirects authenticated users to `/reports`.

---

## 9. Theming & Design System

### 9.1 Brand Colors

| Name | Hex | Usage |
|------|-----|-------|
| Emerald 50 | `#ecfdf5` | Light backgrounds |
| Emerald 100 | `#d1fae5` | Hover states |
| Emerald 400 | `#34d399` | Dark mode primary |
| Emerald 500 | `#10b981` | **Brand primary** |
| Emerald 600 | `#059669` | Buttons, active states |
| Emerald 700 | `#047857` | Dark accents |
| Emerald 900 | `#064e3b` | Deep backgrounds |

### 9.2 Semantic Colors

| Token | Light | Dark | Usage |
|-------|-------|------|-------|
| Primary | Emerald 600 | Emerald 400 | Buttons, links, active |
| Background | Emerald 50 | `#121212` | Page background |
| Surface | White | `#1E1E1E` | Cards, modals |
| Error | `#EF4444` | `#CF6679` | Errors, destructive |
| Success | Emerald 500 | Emerald 400 | Confirmations |
| Warning | `#F59E0B` | `#F59E0B` | Alerts |
| Danger | `#EF4444` | `#EF4444` | Destructive actions |

### 9.3 Platform Implementation

| Platform | System | Files |
|----------|--------|-------|
| Web | Tailwind CSS custom theme + CSS variables in `:root` | `tailwind.config.ts`, `app/globals.css` |
| Android | Material3 `ColorScheme` + custom `AppColors` CompositionLocal | `ui/theme/Theme.kt`, `ui/theme/AppColors.kt`, `ui/theme/Color.kt` |
| iOS | SwiftUI custom `EmeraldTheme` struct | `Views/EmeraldTheme.swift` |

### 9.4 Theme Modes

All platforms support Light, Dark, and System (follow OS setting).

**Android:** `ThemeViewModel` persists choice to SharedPreferences. `MafutaPassTheme(darkTheme)` sets Material3 scheme + `AppColors`.

**Web:** CSS variables + Tailwind dark mode classes. Body max-width `430px` for mobile-first design.

### 9.5 Typography

| Platform | Primary Font |
|----------|-------------|
| Web | Inter (Google Fonts), SF Pro Display fallback |
| Android | Material3 default (Roboto) |
| iOS | SF Pro (system) |

### 9.6 Gradients

| Name | Value | Usage |
|------|-------|-------|
| Emerald gradient | `135deg, #059669 → #10b981 → #34d399` | Headers, hero sections |
| Emerald dark | `135deg, #064e3b → #065f46 → #047857` | Dark mode headers |
| Background gradient | Light: emerald 50 → white | Page backgrounds |

---

## 10. Infrastructure & Deployment

### 10.1 Hosting

| Component | Platform | Domain |
|-----------|----------|--------|
| Web + API | Vercel | mafutapass.com |
| Database | Supabase (Postgres) | bkypfuyiknytkuhxtduc.supabase.co |
| Auth | Clerk | clerk.mafutapass.com |
| Android | Google Play Store | (pending) |
| iOS | App Store | (pending) |

### 10.2 Environment Variables

| Variable | Used By | Purpose |
|----------|---------|---------|
| `CLERK_SECRET_KEY` | mobile-jwt.ts, all auth routes | JWT signing (HS256) + Clerk Backend SDK |
| `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` | Web client only | Clerk frontend (NOT used by mobile) |
| `SUPABASE_JWT_SECRET` | mobile-client.ts | Mint Supabase RLS-compatible JWTs |
| `NEXT_PUBLIC_SUPABASE_URL` | All Supabase clients | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | All Supabase clients | Supabase anonymous key |
| `SUPABASE_SERVICE_ROLE_KEY` | mobile/auth, create-profile | Admin Supabase operations |
| `GOOGLE_WEB_CLIENT_ID` | google-native | Google OAuth verification |
| `GEMINI_API_KEY` | process-vision | AI receipt processing |

### 10.3 Vercel Configuration

- **Framework:** Next.js
- **Build command:** `npm run build`
- **Receipt upload route:** 60s timeout, 2048MB memory (for OCR + AI processing)
- **Server actions:** 10MB body size limit

### 10.4 Deep Links

| Scheme | Usage |
|--------|-------|
| `mafutapass://auth?jwt=...` | Android OAuth callback (android-callback) |
| `mafutapass://oauth?session=...` | Android OAuth callback (mobile-redirect) |

---

## 11. Security

### 11.1 Principles

1. **No secrets in client code** — All signing keys are server-side only
2. **HS256 for mobile JWTs** — Fast, verified server-side only
3. **AES-256 token storage** — Android uses EncryptedSharedPreferences
4. **RLS on every table** — No data access without valid JWT claims
5. **CORS headers on mobile endpoints** — Proper `Access-Control-Allow-*` headers
6. **No wildcard RLS policies** — Migration 008 removed all `USING (true)` policies
7. **Service role isolation** — `SUPABASE_SERVICE_ROLE_KEY` only used for admin operations (user creation)

### 11.2 Deprecated Patterns (Removed)

| Pattern | Removed In | Replacement |
|---------|-----------|-------------|
| Clerk Frontend API calls from mobile | Commit `5e408bb` | Backend-only JWT minting |
| `signInTokens.createSignInToken()` | Commit `5e408bb` | Direct `mintMobileSessionJwt()` |
| clerk-exchange.ts | Commit `5e408bb` | Deleted entirely |
| Fallback auth (try backend, fallback to Clerk) | Commit `5e408bb` | Single code path |
| `USING (true)` RLS policies | Migration 008 | JWT `sub` claim verification |

---

## 12. Decision Log

### Why backend-only JWT minting?
**Context:** Initially used Clerk Frontend API + `signInTokens` for mobile auth.  
**Decision:** Backend mints all JWTs. Mobile never talks to Clerk.  
**Rationale:** Single point of control, no secrets in APK, audit trail, Play Store compliance.  
**Commit:** `5e408bb`

### Why HS256 (not RS256) for mobile JWTs?
**Context:** RS256 requires key pair management and JWKS endpoint.  
**Decision:** HS256 with `CLERK_SECRET_KEY` as shared secret.  
**Rationale:** Mobile JWTs are only ever verified server-side. HS256 is faster and simpler. No public verification needed.

### Why mint Supabase JWT per-request?
**Context:** Could cache Supabase JWTs or use a single long-lived token.  
**Decision:** Mint fresh Supabase JWT on every mobile API request.  
**Rationale:** Stateless design. No cache invalidation complexity. JWT minting is sub-millisecond. RLS always has fresh claims.

### Why dual API system on Android?
**Context:** Legacy `ApiClient` object predates Hilt DI setup.  
**Decision:** Keep both temporarily, migrate incrementally.  
**Rationale:** Minimizes risk of breaking existing screens. Both systems share `TokenRepository` for auth.  
**Plan:** Migrate all screens to Hilt-injected `ApiService`, then delete `ApiClient`.

### Why Clerk + Supabase (not just one)?
**Context:** Clerk for auth identity, Supabase for data + storage.  
**Decision:** Clerk manages user identity; Supabase manages business data with RLS.  
**Rationale:** Clerk provides production-grade auth (OAuth, MFA, user management). Supabase provides Postgres with RLS and instant APIs. Together they separate concerns cleanly.

### Why max-width 430px on web?
**Context:** Web app is primarily accessed from mobile browsers.  
**Decision:** Mobile-first design with `430px` max width.  
**Rationale:** Consistent with native app experience. Desktop users get a centered mobile layout.

### Why emoji avatars?
**Context:** Users need profile avatars but photo uploads add complexity.  
**Decision:** Emoji avatar system with customizable background colors.  
**Rationale:** Zero bandwidth, instant rendering, fun personalization, no storage costs. Stored as simple text in `user_profiles.avatar_emoji`.

---

*Last modified: 2025-07-13 — After production auth cleanup, bug fixes (401s, email_exists, excessive logging), middleware audit.*
