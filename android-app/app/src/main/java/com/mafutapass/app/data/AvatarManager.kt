package com.mafutapass.app.data

import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import javax.inject.Inject
import javax.inject.Singleton

/**
 * Single source of truth for the current user's avatar emoji.
 *
 * Hilt-scoped as @Singleton so every screen, the navbar, and all
 * ProfileViewModel instances share the same reactive state.
 *
 * Write: call [update] after a successful profile load or avatar change.
 * Read:  collect [emoji] in any Composable or ViewModel.
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

    companion object {
        const val DEFAULT_AVATAR = "\uD83D\uDC3B" // 🐻
    }
}
