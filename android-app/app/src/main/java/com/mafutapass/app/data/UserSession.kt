package com.mafutapass.app.data

import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import javax.inject.Inject
import javax.inject.Singleton

/**
 * Single source of truth for the currently authenticated user's identity.
 *
 * Set by [AuthViewModel] when auth state transitions occur:
 *   - [onSignIn]  — called synchronously before [AuthState.SignedIn] is emitted
 *   - [onSignOut] — called synchronously before [AuthState.SignedOut] is emitted
 *
 * [WorkspaceRepository], [AvatarManager], and any other singleton that holds
 * per-user data observes [userId] and reacts to changes automatically —
 * no manual `clear()` calls required.
 */
@Singleton
class UserSession @Inject constructor() {

    private val _userId = MutableStateFlow<String?>(null)

    /** The currently signed-in userId, or null when signed out. */
    val userId: StateFlow<String?> = _userId.asStateFlow()

    /** Call before emitting [AuthState.SignedIn]. */
    fun onSignIn(userId: String) {
        _userId.value = userId
    }

    /** Call before emitting [AuthState.SignedOut]. */
    fun onSignOut() {
        _userId.value = null
    }
}
