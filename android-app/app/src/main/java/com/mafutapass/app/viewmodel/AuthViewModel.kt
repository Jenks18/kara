package com.mafutapass.app.viewmodel

import android.util.Log
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.mafutapass.app.auth.TokenRepository
import com.mafutapass.app.data.AppDataCache
import com.mafutapass.app.data.AvatarManager
import com.mafutapass.app.data.UserSession
import com.mafutapass.app.data.network.NetworkResult
import com.mafutapass.app.data.repository.UserRepository
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch
import javax.inject.Inject

/**
 * Manages authentication state and coordinates sign-in/sign-out.
 *
 * ## How data isolation works (production-grade, zero manual clear() calls)
 *
 * 1. On sign-in (tokenState → Valid):
 *    a. [UserSession.onSignIn] is called with the new userId.
 *       [WorkspaceRepository] observes userId via [UserSession] and immediately
 *       seeds its StateFlows from the userId-namespaced [AppDataCache], then
 *       network-refreshes in the background.
 *    b. [AvatarManager] is seeded synchronously from cached profile data
 *       BEFORE [AuthState.SignedIn] is emitted — BottomNavBar's first
 *       composition renders the correct emoji, zero briefcase flash.
 *    c. [sessionKey] increments so key(sessionKey) in MainActivity forces
 *       Compose to fully discard and recreate the NavController + all
 *       hiltViewModel() instances for the new session.
 *
 * 2. On sign-out (tokenState → Invalid or [signOut] called):
 *    [UserSession.onSignOut] is called, which triggers [WorkspaceRepository]
 *    to reset its in-memory StateFlows to empty immediately. No manual
 *    clearData() calls needed anywhere.
 *
 * ## Cross-account security
 * [AppDataCache] keys all data as "{userId}:{dataKey}". A different userId
 * automatically produces cache misses — no stale data from a previous account
 * can ever appear, regardless of race conditions or missed clear() calls.
 */
@HiltViewModel
class AuthViewModel @Inject constructor(
    private val tokenRepository: TokenRepository,
    private val avatarManager: AvatarManager,
    private val appDataCache: AppDataCache,
    private val userSession: UserSession,
    private val userRepository: UserRepository
) : ViewModel() {

    private val _authState = MutableStateFlow<AuthState>(AuthState.Loading)
    val authState = _authState.asStateFlow()

    /**
     * Increments each time we transition TO SignedIn.
     * Consumed as key(sessionKey) in MainActivity so Compose recreates the
     * entire NavController + ViewModels for every new login session.
     */
    private val _sessionKey = MutableStateFlow(0)
    val sessionKey = _sessionKey.asStateFlow()

    init {
        Log.d("AuthViewModel", "Initializing AuthViewModel...")

        viewModelScope.launch {
            var previousUserId: String? = null

            tokenRepository.tokenState.collect { tokenState ->
                when (tokenState) {
                    is TokenRepository.TokenState.Valid -> {
                        val userId = tokenState.userId
                        val isNewSession = userId != previousUserId
                        previousUserId = userId

                        if (isNewSession) {
                            Log.d("AuthViewModel", "New session for userId=$userId")

                            // ── Step 1: Set UserSession ──────────────────────────────────
                            // WorkspaceRepository observes this and immediately seeds its
                            // StateFlows from AppDataCache, then network-refreshes.
                            userSession.onSignIn(userId)

                            // ── Step 2: Seed avatar synchronously ────────────────────────
                            // MUST happen before _authState = SignedIn so BottomNavBar's
                            // first composition reads the correct emoji — zero flash.
                            appDataCache.loadProfile(userId)
                                ?.avatarEmoji
                                ?.takeIf { it.isNotEmpty() }
                                ?.let { avatarManager.update(it) }

                            // ── Step 3: Force UI recreation ──────────────────────────────
                            _sessionKey.value++

                            // ── Step 4: Eager async profile refresh ──────────────────────
                            // Runs concurrently — updates AvatarManager when network data
                            // arrives regardless of which screen the user is on.
                            viewModelScope.launch {
                                userRepository.getUserProfile(userId).collect { result ->
                                    if (result is NetworkResult.Success) {
                                        result.data.avatarEmoji
                                            ?.takeIf { it.isNotEmpty() }
                                            ?.let { avatarManager.update(it) }
                                    }
                                }
                            }
                        }

                        _authState.value = AuthState.SignedIn
                    }

                    is TokenRepository.TokenState.Invalid -> {
                        Log.d("AuthViewModel", "Token invalid — signing out")
                        previousUserId = null
                        // onSignOut triggers WorkspaceRepository to reset its StateFlows
                        userSession.onSignOut()
                        avatarManager.reset()
                        _authState.value = AuthState.SignedOut
                    }

                    is TokenRepository.TokenState.Loading -> {
                        _authState.value = AuthState.Loading
                    }
                }
            }
        }
    }

    fun checkAuthState() {
        Log.d("AuthViewModel", "Auth state managed by TokenRepository")
    }

    fun refreshAuthState() {
        checkAuthState()
    }

    /**
     * Sign out the current user.
     *
     * Order matters:
     *  1. Set AuthState.SignedOut FIRST — Compose immediately tears down the
     *     signed-in UI (BottomNavBar, NavHost, etc.) so no intermediate state
     *     (e.g. default 💼 avatar) is ever rendered during the transition.
     *  2. Reset avatar / session — invisible because the signed-in UI is gone.
     *  3. clearTokens() — emits TokenState.Invalid (handled idempotently above).
     */
    fun signOut() {
        Log.d("AuthViewModel", "Sign out initiated")

        // ── Immediately hide the signed-in UI ────────────────────────────
        // This runs synchronously on the main thread, so Compose will
        // switch to the SignedOut branch before any recomposition can
        // render a default-avatar flash in the bottom nav bar.
        _authState.value = AuthState.SignedOut

        viewModelScope.launch {
            avatarManager.reset()
            userSession.onSignOut()
            tokenRepository.clearTokens()
            Log.d("AuthViewModel", "✅ Sign out complete")
        }
    }
}

sealed interface AuthState {
    data object Loading : AuthState
    data object SignedIn : AuthState
    data object SignedOut : AuthState
}
