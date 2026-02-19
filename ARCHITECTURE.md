# Kacha — Architecture & Single Source of Truth

> **Last updated:** 2025-01-20
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
| Home | `/` | Dashboard with stats, recent expenses, category breakdown |
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

- `receipt-images` bucket — raw receipt photos
- `workspace-avatars` bucket — workspace avatar images

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
| Auth | Google OAuth → `/api/auth/google-native` |
| Receipt scan | ML Kit Document Scanner |
| QR scan | ML Kit Barcode Scanner |
| API base | `https://kachalabs.com/api/mobile/` |

### iOS (`ios-app/`)

| Aspect | Detail |
|--------|--------|
| Language | Swift |
| UI | SwiftUI |
| Auth | Clerk iOS SDK |
| API base | `https://kachalabs.com/api/mobile/` |

Both mobile apps use `/api/mobile/*` endpoints with Bearer token authentication.

---

## 10. Receipt Processing Pipeline

Located in `lib/receipt-processing/`:

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
| `010-fix-workspace-rls-recursion.sql` | Fix infinite recursion in workspace_members RLS using SECURITY DEFINER functions |
| `011-workspace-collaboration.sql` | workspace_members table, roles, triggers |
| `013-remove-unused-tables.sql` | Clean up unused tables/triggers |

### Important: Migration 010 must be applied AFTER 011

Migration 011 creates `workspace_members` and its (recursive) policies. Migration 010 replaces those policies with non-recursive versions using `is_workspace_member()` and `is_workspace_admin()` security definer functions.

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
