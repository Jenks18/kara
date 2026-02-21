package com.mafutapass.app.data

import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import javax.inject.Inject
import javax.inject.Singleton

/**
 * Single source of truth for the current user's avatar emoji.
 *
 * Hilt @Singleton — shared by BottomNavBar, AccountScreen, and all ViewModels.
 *
 * ## How it is seeded (zero-flash guarantee)
 * [AuthViewModel] calls [update] with the cached emoji BEFORE setting
 * AuthState.SignedIn on the StateFlow. Because both updates happen in the same
 * coroutine execution block, Compose reads the correct emoji value in the
 * very first recomposition that renders the SignedIn branch — no 💼 flash.
 *
 * Write: [update] after a profile load or avatar change; [reset] on sign-out.
 * Read:  `avatarManager.emoji.collectAsState()` in any Composable.
 */
@Singleton
class AvatarManager @Inject constructor() {

    private val _emoji = MutableStateFlow(DEFAULT_AVATAR)
    val emoji: StateFlow<String> = _emoji.asStateFlow()

    fun update(emoji: String) {
        if (emoji.isNotEmpty()) {
            _emoji.value = emoji
        }
    }

    /** Reset to default on sign-out so the next user never sees stale data. */
    fun reset() {
        _emoji.value = DEFAULT_AVATAR
    }

    companion object {
        const val DEFAULT_AVATAR = "\uD83D\uDCBC" // 💼 (matches webapp + iOS)
    }
}
