package com.mafutapass.app.data.repository

import com.mafutapass.app.data.ApiService
import com.mafutapass.app.data.AppDataCache
import com.mafutapass.app.data.MobileProfileResponse
import com.mafutapass.app.data.UpdateProfileRequest
import com.mafutapass.app.data.UpdateProfileResponse
import com.mafutapass.app.data.User
import com.mafutapass.app.data.UserProfile
import com.mafutapass.app.data.UserSession
import com.mafutapass.app.data.network.NetworkResult
import com.mafutapass.app.data.network.safeApiCall
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.flow
import javax.inject.Inject
import javax.inject.Singleton

/**
 * Repository for user profile data.
 *
 * [getUserProfile] uses cache-then-network keyed by userId:
 *  1. Emits cached User instantly (no skeleton flash for returning users).
 *  2. Always fetches fresh from the network and updates cache.
 *
 * All update operations (PATCH) also persist the result to cache so the
 * next launch reflects the latest saved values immediately.
 */
@Singleton
class UserRepository @Inject constructor(
    private val apiService: ApiService,
    private val appDataCache: AppDataCache,
    private val userSession: UserSession
) {

    /**
     * Cache-then-network for the current user's profile.
     * @param userId The authenticated user's id — used as the cache key.
     */
    fun getUserProfile(userId: String): Flow<NetworkResult<User>> = flow {
        val cached = appDataCache.loadProfile(userId)
        emit(if (cached != null) NetworkResult.Success(cached) else NetworkResult.Loading)
        val result = safeApiCall { apiService.getUserProfile() }.map { it.toUser() }
        emit(result)
        if (result is NetworkResult.Success) appDataCache.saveProfile(userId, result.data)
    }
    
    suspend fun getUserProfileOnce(): NetworkResult<User> {
        return safeApiCall { apiService.getUserProfile() }.map { it.toUser() }
    }
    
    /**
     * Update user's legal name (first and last name).
     */
    suspend fun updateLegalName(firstName: String, lastName: String): NetworkResult<User> {
        return updateAndMap(UpdateProfileRequest(legalFirstName = firstName, legalLastName = lastName))
    }
    
    /**
     * Update user's display name.
     */
    suspend fun updateDisplayName(
        firstName: String,
        lastName: String,
        displayName: String
    ): NetworkResult<User> {
        return updateAndMap(
            UpdateProfileRequest(
                firstName = firstName,
                lastName = lastName,
                displayName = displayName
            )
        )
    }
    
    /**
     * Update user's phone number.
     */
    suspend fun updatePhoneNumber(phoneNumber: String): NetworkResult<User> {
        return updateAndMap(UpdateProfileRequest(phoneNumber = phoneNumber))
    }
    
    /**
     * Update user's date of birth.
     */
    suspend fun updateDateOfBirth(dateOfBirth: String): NetworkResult<User> {
        return updateAndMap(UpdateProfileRequest(dateOfBirth = dateOfBirth))
    }
    
    /**
     * Update user's address.
     */
    suspend fun updateAddress(
        addressLine1: String,
        addressLine2: String? = null,
        city: String? = null,
        state: String? = null,
        country: String? = null,
        postalCode: String? = null
    ): NetworkResult<User> {
        return updateAndMap(
            UpdateProfileRequest(
                addressLine1 = addressLine1,
                addressLine2 = addressLine2,
                city = city,
                state = state,
                country = country,
                postalCode = postalCode
            )
        )
    }
    
    /**
     * Update multiple profile fields at once.
     */
    suspend fun updateProfile(request: UpdateProfileRequest): NetworkResult<User> {
        return updateAndMap(request)
    }
    
    // ---- Private helpers ----
    
    private suspend fun updateAndMap(request: UpdateProfileRequest): NetworkResult<User> {
        // UpdateProfileResponse wraps a UserProfile; unwrap and map to domain User.
        val result = safeApiCall { apiService.updateUserProfile(request) }
            .map { it.profile?.toUser() ?: throw IllegalStateException("Server returned null profile") }
        // Persist updated profile to cache so next launch reflects latest values
        if (result is NetworkResult.Success) {
            userSession.userId.value?.let { userId ->
                appDataCache.saveProfile(userId, result.data)
            }
        }
        return result
    }
    
    /**
     * Merge GET response (Clerk + Supabase) into User domain model.
     */
    private fun MobileProfileResponse.toUser(): User {
        val p = profile
        val c = clerk
        return User(
            id = c?.id ?: p?.userId ?: "",
            name = c?.fullName ?: listOfNotNull(p?.firstName, p?.lastName).joinToString(" "),
            email = c?.email ?: p?.userEmail ?: "",
            avatar = c?.imageUrl,
            firstName = p?.firstName ?: c?.firstName,
            lastName = p?.lastName ?: c?.lastName,
            displayName = p?.displayName,
            legalFirstName = p?.legalFirstName,
            legalLastName = p?.legalLastName,
            phoneNumber = p?.phoneNumber,
            dateOfBirth = p?.dateOfBirth,
            addressLine1 = p?.addressLine1,
            addressLine2 = p?.addressLine2,
            city = p?.city,
            state = p?.state,
            country = p?.country,
            postalCode = p?.zipCode,
            avatarEmoji = p?.avatarEmoji,
            avatarColor = p?.avatarColor,
            avatarImageUrl = p?.avatarImageUrl
        )
    }
    
    /**
     * Convert a single Supabase profile row into User (for PATCH responses).
     */
    private fun UserProfile.toUser(): User {
        return User(
            id = userId,
            name = listOfNotNull(firstName, lastName).joinToString(" "),
            email = userEmail,
            firstName = firstName,
            lastName = lastName,
            displayName = displayName,
            legalFirstName = legalFirstName,
            legalLastName = legalLastName,
            phoneNumber = phoneNumber,
            dateOfBirth = dateOfBirth,
            addressLine1 = addressLine1,
            addressLine2 = addressLine2,
            city = city,
            state = state,
            country = country,
            postalCode = zipCode,
            avatarEmoji = avatarEmoji,
            avatarColor = avatarColor,
            avatarImageUrl = avatarImageUrl
        )
    }
}
