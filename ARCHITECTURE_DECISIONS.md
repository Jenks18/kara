# Architecture Decisions & Rules

> **Purpose:** Persistent record of every architecture/engineering decision and the reasoning behind it.  
> **Rule:** Before changing ANY config, dependency, or pattern — CHECK this file first.  
> **Last updated:** 2026-02-15

---

## Table of Contents

1. [Android SDK Targets](#1-android-sdk-targets)
2. [Dependency Policy](#2-dependency-policy)
3. [Authentication Architecture](#3-authentication-architecture)
4. [Data Layer Patterns](#4-data-layer-patterns)
5. [DI & ViewModel Rules](#5-di--viewmodel-rules)
6. [Serialization Rules](#6-serialization-rules)
7. [Networking Rules](#7-networking-rules)
8. [Security Rules](#8-security-rules)
9. [Dead Code & Removed Items](#9-dead-code--removed-items)
10. [Version Pinning Log](#10-version-pinning-log)

---

## 1. Android SDK Targets

| Property | Value | Reason | Date Set |
|----------|-------|--------|----------|
| `compileSdk` | **35** | Current stable SDK recommended by Google. Do NOT bump to 36+ until Google officially recommends it for production. | 2026-02-15 |
| `targetSdk` | **35** | Must match compileSdk for Play Store compliance. | 2026-02-15 |
| `minSdk` | **26** | Android 8.0 — covers 95%+ of active devices. Allows EncryptedSharedPreferences. | 2025-07-15 |
| `jvmTarget` | **17** | Required by AGP 8.x and Kotlin 2.x. | 2025-07-15 |

**RULE:** When bumping compileSdk, you MUST verify every dependency's AAR metadata compatibility. Run `./gradlew :app:checkDebugAarMetadata` and fix any failures before committing.

---

## 2. Dependency Policy

### Rules

1. **Zero unused dependencies.** If nothing imports it, delete it.
2. **Pin to latest stable compatible with current compileSdk.** No alpha/beta unless no stable exists (e.g. security-crypto).
3. **One library per concern.** No competing libraries (e.g. don't have both DataStore and SharedPreferences for the same purpose).
4. **AAR metadata check before merging.** Run `./gradlew :app:checkDebugAarMetadata` after any dependency change.

### Current Dependencies (2026-02-15)

| Category | Library | Version | Why This Version |
|----------|---------|---------|-----------------|
| Compose BOM | `compose-bom` | 2024.12.01 | Latest stable BOM compatible with compileSdk 35 |
| Core | `core-ktx` | 1.15.0 | Latest stable for compileSdk 35 |
| Lifecycle | `lifecycle-*` | 2.8.7 | Latest stable for compileSdk 35 |
| Activity | `activity-compose` | 1.9.3 | Latest stable for compileSdk 35 |
| Navigation | `navigation-compose` | 2.8.5 | Latest stable for compileSdk 35 |
| Retrofit | `retrofit` | 2.11.0 | Latest stable |
| OkHttp | `okhttp` | 4.12.0 | Latest 4.x stable |
| Coroutines | `kotlinx-coroutines` | 1.9.0 | Latest stable |
| WorkManager | `work-runtime-ktx` | 2.10.0 | Latest stable for compileSdk 35 |
| Security | `security-crypto` | 1.1.0-alpha06 | No stable release exists — alpha is the only option |
| Image loading | `coil-compose` | 2.7.0 | Latest 2.x stable (3.x is Kotlin Multiplatform rewrite, evaluate later) |
| Credentials | `credentials` | 1.3.0 | Latest stable for compileSdk 35 |
| Google ID | `googleid` | 1.1.1 | Latest stable |
| CameraX | `camera-*` | 1.4.1 | Latest stable for compileSdk 35 |
| ML Kit | `text-recognition` | 16.0.1 | Latest stable |
| Hilt | `hilt-android` | 2.56.2 | Latest stable |
| Hilt Nav | `hilt-navigation-compose` | 1.2.0 | Latest stable |
| Hilt Work | `hilt-work` | 1.2.0 | Latest stable |
| AGP | Android Gradle Plugin | 8.13.2 | Latest stable |
| Kotlin | Kotlin compiler | 2.2.0 | Latest stable with Compose compiler plugin |
| KSP | KSP | 2.2.0-2.0.2 | Must match Kotlin version |

### Removed Dependencies (do NOT re-add)

| Library | Removed | Reason |
|---------|---------|--------|
| `com.clerk:clerk-android-api` | 2026-02-15 | App uses backend-only JWT. Clerk SDK is never imported — dead weight. Was causing AAR metadata failures. |
| `com.clerk:clerk-android-ui` | 2026-02-15 | Same as above. |
| `androidx.browser:browser` | 2026-02-15 | Was for OAuth browser redirect. App uses native Credential Manager instead. Zero imports. |
| `com.google.accompanist:accompanist-permissions` | 2026-02-15 | Never imported. Dead weight. |
| `androidx.datastore:datastore-preferences` | 2026-02-15 | Never imported. App uses SharedPreferences + AccountManager for storage. |
| Supabase SDK (Ktor, postgrest, etc.) | 2025-07-15 | App accesses Supabase via backend API only. Mobile never talks to Supabase directly. |
| Clerk Maven repository (`s01.oss.sonatype.org`) | 2026-02-15 | No Clerk deps remain. |

---

## 3. Authentication Architecture

### Rules

1. **Backend is the SOLE authority for JWT minting.** Mobile apps NEVER call Clerk or Supabase directly.
2. **No Clerk SDK in mobile apps.** All auth goes through `/api/auth/*` backend endpoints.
3. **No Supabase SDK in mobile apps.** All data goes through `/api/mobile/*` backend endpoints.
4. **Single token storage: TokenRepository.** No duplicate writes to SharedPreferences. TokenRepository manages AccountManager + EncryptedSharedPreferences + legacy migration.
5. **JWT TTL: 1 hour** (set in `lib/auth/mobile-jwt.ts`). Background refresh via WorkManager 5 minutes before expiry.

### Auth Endpoints (public, no Bearer token)

| Endpoint | Purpose |
|----------|---------|
| `POST /api/auth/mobile-signin` | Email/password → JWT |
| `POST /api/auth/mobile-signup` | Create account → JWT |
| `POST /api/auth/google-native` | Google ID token → JWT or `needsUsername` |
| `POST /api/auth/complete-google-signup` | Pending token + username → JWT |
| `POST /api/auth/mobile-refresh` | Expired Bearer → fresh JWT |
| `POST /api/auth/create-profile` | Bearer → create Supabase user_profiles row |

### Why auth ViewModels use raw OkHttp (not Retrofit)

Auth endpoints are public (no Bearer token needed). The Retrofit pipeline has AuthInterceptor (adds Bearer) and AuthAuthenticator (refreshes on 401). Using Retrofit for auth would:
- Add unnecessary Bearer token to public endpoints
- Trigger infinite refresh loops on 401 during sign-in/sign-up

**Decision:** SignInViewModel, SignUpViewModel, NativeOAuthViewModel create their own `OkHttpClient` without interceptors. This is correct by design.

### Why TokenRepository/TokenRefreshWorker/AuthAuthenticator use raw OkHttp

These are the auth infrastructure itself. They cannot use the Retrofit pipeline (which depends on them) without creating circular dependencies or infinite loops.

---

## 4. Data Layer Patterns

### Rules

1. **Repository pattern** for any domain logic. Screen → ViewModel → Repository → ApiService.
2. **ApiService (Retrofit)** for all authenticated API calls.
3. **DTO → Domain model mapping** happens in Repositories, not in ViewModels or Screens.
4. **NetworkResult sealed class** for async state: Loading, Success, Error.

### Domain Models

| Model | Purpose | File |
|-------|---------|------|
| `User` | Domain model (merged from Clerk + Supabase data) | Models.kt |
| `MobileProfileResponse` | DTO wrapper for GET /mobile-profile response | Models.kt |
| `UserProfile` | DTO for Supabase `user_profiles` row (snake_case via @SerializedName) | Models.kt |
| `ClerkUserData` | DTO for Clerk user sub-object (camelCase naturally) | Models.kt |
| `UpdateProfileRequest` | Request body for PATCH /mobile-profile (snake_case via @SerializedName) | Models.kt |
| `UpdateProfileResponse` | Response for PATCH /mobile-profile | Models.kt |

---

## 5. DI & ViewModel Rules

### Rules

1. **Every ViewModel MUST be `@HiltViewModel` with `@Inject constructor`.** No `AndroidViewModel`. No `ViewModelProvider.Factory`.
2. **Every Screen obtains ViewModels via `hiltViewModel()`.** No `viewModel()` with factory.
3. **Dependencies are injected, not constructed.** No `TokenRepository.getInstance(context)` in ViewModels. Use `@Inject constructor(private val tokenRepository: TokenRepository)`.
4. **Exception:** SignInScreen uses `remember { TokenRepository.getInstance(context) }` for OAuth success handling because it's a Composable, not a ViewModel. This is acceptable.

### Hilt Modules

| Module | Provides |
|--------|----------|
| `AppModule` | TokenRepository, AccountHelper |
| `NetworkModule` | OkHttpClient (with AuthInterceptor + AuthAuthenticator), Retrofit, Gson, ApiService |

---

## 6. Serialization Rules

### Rules

1. **Every model field that maps to a snake_case JSON key MUST have `@SerializedName("snake_case")`.** Kotlin property name is camelCase.
2. **Without @SerializedName, Gson silently maps nothing** — fields stay null/default. This is a silent data loss bug.
3. **Backend returns snake_case** for all Supabase-sourced data. Clerk data is naturally camelCase.

---

## 7. Networking Rules

### Rules

1. **Single OkHttpClient** for the Retrofit pipeline, provided by Hilt's NetworkModule.
2. **AuthInterceptor** injects `Bearer <token>` on every Retrofit request.
3. **AuthAuthenticator** handles 401 → refreshes token → retries. Max 2 retries, then clears tokens.
4. **Auth endpoints use standalone OkHttpClient** (see section 3 for why).
5. **Base URL:** `https://www.mafutapass.com/`

---

## 8. Security Rules

### Rules

1. **No secrets in client code.** Zero API keys, signing keys, or Clerk keys in the APK.
2. **Token storage hierarchy:** AccountManager (primary) → EncryptedSharedPreferences (fallback) → SharedPreferences (legacy migration only).
3. **AES-256-GCM encryption** for EncryptedSharedPreferences via AndroidX Security.
4. **ProGuard enabled for release builds.** `isMinifyEnabled = true`, `isShrinkResources = true`.
5. **ProGuard must keep @SerializedName fields.** Without this, release builds silently break JSON deserialization.
6. **No `.debug` applicationIdSuffix.** It breaks Google Sign-In unless a separate OAuth client is registered.

---

## 9. Dead Code & Removed Items

These have been intentionally deleted. Do NOT recreate them.

| Item | Type | Removed | Reason |
|------|------|---------|--------|
| `Repository.kt` | File | 2025-07-15 | Replaced by domain-specific repositories (UserRepository) |
| `TokenManager.kt` | File | 2025-07-15 | Replaced by TokenRepository |
| `OAuthViewModel.kt` | File | 2026-02-15 | Superseded by NativeOAuthViewModel |
| `MainViewModel.kt` | File | 2025-07-15 | Split into domain-specific ViewModels |
| `SupabaseAuthManager.kt` | File | 2025-07-15 | App doesn't use Supabase SDK |
| `SupabaseClient.kt` | File | 2025-07-15 | App doesn't use Supabase SDK |
| `ExpenseDataService.kt` | File | 2025-07-15 | Replaced by ApiService + Retrofit |
| `ApiClient` object | Code | 2025-07-15 | Bridge pattern deleted during Hilt migration |
| `/api/mobile/auth` | Endpoint | 2025-07-15 | Was Supabase session exchange. Dead after backend-only JWT. |
| `debug-avatar.js` | File | 2025-07-15 | Debug tool, no longer needed |

---

## 10. Version Pinning Log

Record of every version change with reasoning.

| Date | Change | From | To | Reason |
|------|--------|------|----|--------|
| 2026-02-15 | Compose BOM | 2023.10.01 | 2024.12.01 | 2+ years outdated, latest stable for compileSdk 35 |
| 2026-02-15 | core-ktx | 1.12.0 | 1.15.0 | Latest stable for compileSdk 35 |
| 2026-02-15 | lifecycle-* | 2.7.0 | 2.8.7 | Latest stable for compileSdk 35 |
| 2026-02-15 | activity-compose | 1.8.2 | 1.9.3 | Latest stable for compileSdk 35 |
| 2026-02-15 | navigation-compose | 2.7.7 | 2.8.5 | Latest stable for compileSdk 35 |
| 2026-02-15 | retrofit | 2.9.0 | 2.11.0 | Latest stable |
| 2026-02-15 | coroutines | 1.7.3 | 1.9.0 | Latest stable |
| 2026-02-15 | work-runtime-ktx | 2.9.0 | 2.10.0 | Latest stable for compileSdk 35 |
| 2026-02-15 | coil-compose | 2.5.0 | 2.7.0 | Latest 2.x stable |
| 2026-02-15 | credentials | 1.2.2 | 1.3.0 | Latest stable for compileSdk 35 |
| 2026-02-15 | googleid | 1.1.0 | 1.1.1 | Latest stable |
| 2026-02-15 | camera-* | 1.3.3 | 1.4.1 | Latest stable for compileSdk 35 |
| 2026-02-15 | text-recognition | 16.0.0 | 16.0.1 | Latest stable |
| 2026-02-15 | Removed clerk-android-api | 1.0.1 | — | Zero imports, dead weight, caused AAR failures |
| 2026-02-15 | Removed clerk-android-ui | 1.0.1 | — | Zero imports, dead weight |
| 2026-02-15 | Removed browser | 1.8.0 | — | Zero imports |
| 2026-02-15 | Removed accompanist-permissions | 0.32.0 | — | Zero imports |
| 2026-02-15 | Removed datastore-preferences | 1.0.0 | — | Zero imports |
