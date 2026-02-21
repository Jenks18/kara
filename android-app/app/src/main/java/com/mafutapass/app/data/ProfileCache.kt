package com.mafutapass.app.data

import android.content.Context
import androidx.core.content.edit
import dagger.hilt.android.qualifiers.ApplicationContext
import javax.inject.Inject
import javax.inject.Singleton

/**
 * Lightweight SharedPreferences cache for the current user's profile.
 *
 * Pattern: cache-then-network (stale-while-revalidate).
 * [UserRepository.getUserProfile] emits cached data immediately so the
 * account screen renders real content instantly, then updates silently
 * when the network response arrives — eliminating both the stale-data
 * flash AND the skeleton-loading delay for returning users.
 *
 * Call [clear] on sign-out so the next sign-in (potentially a different
 * account on the same device) never sees a previous user's data.
 */
@Singleton
class ProfileCache @Inject constructor(
    @ApplicationContext private val context: Context
) {
    private val prefs by lazy {
        context.getSharedPreferences("kacha_profile_cache_v1", Context.MODE_PRIVATE)
    }

    fun save(user: User) {
        prefs.edit {
            putString(KEY_ID, user.id)
            putString(KEY_EMAIL, user.email)
            putString(KEY_FIRST_NAME, user.firstName)
            putString(KEY_LAST_NAME, user.lastName)
            putString(KEY_DISPLAY_NAME, user.displayName)
            putString(KEY_AVATAR_EMOJI, user.avatarEmoji)
            putString(KEY_AVATAR_COLOR, user.avatarColor)
        }
    }

    /** Returns a [User] from cache, or null if no data has been persisted yet. */
    fun load(): User? {
        val id = prefs.getString(KEY_ID, null) ?: return null
        return User(
            id = id,
            email = prefs.getString(KEY_EMAIL, "") ?: "",
            firstName = prefs.getString(KEY_FIRST_NAME, null),
            lastName = prefs.getString(KEY_LAST_NAME, null),
            displayName = prefs.getString(KEY_DISPLAY_NAME, null),
            avatarEmoji = prefs.getString(KEY_AVATAR_EMOJI, null),
            avatarColor = prefs.getString(KEY_AVATAR_COLOR, null)
        )
    }

    /** Wipe on sign-out so the next user never sees stale data.
     *  Uses commit=true (synchronous) so the clear is guaranteed to complete
     *  before clearTokens() triggers AuthState.SignedOut — no async race. */
    fun clear() {
        prefs.edit(commit = true) { clear() }
    }

    private companion object {
        const val KEY_ID = "id"
        const val KEY_EMAIL = "email"
        const val KEY_FIRST_NAME = "firstName"
        const val KEY_LAST_NAME = "lastName"
        const val KEY_DISPLAY_NAME = "displayName"
        const val KEY_AVATAR_EMOJI = "avatarEmoji"
        const val KEY_AVATAR_COLOR = "avatarColor"
    }
}
