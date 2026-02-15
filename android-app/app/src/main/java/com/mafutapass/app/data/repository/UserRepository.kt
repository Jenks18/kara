package com.mafutapass.app.data.repository

import com.mafutapass.app.data.ApiService
import com.mafutapass.app.data.MobileProfileResponse
import com.mafutapass.app.data.UpdateProfileRequest
import com.mafutapass.app.data.UpdateProfileResponse
import com.mafutapass.app.data.User
import com.mafutapass.app.data.UserProfile
import com.mafutapass.app.data.network.NetworkResult
import com.mafutapass.app.data.network.safeApiCall
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.flow
import javax.inject.Inject
import javax.inject.Singleton

/**
 * Repository for user-related data operations.
 * 
 * Merges Clerk user data + Supabase profile into a unified User domain model.
 * The GET response has:
 *   { success, profile: {snake_case Supabase row}, clerk: {camelCase Clerk data} }
 * The PATCH response has:
 *   { success, profile: {snake_case Supabase row} }
 */
@Singleton
class UserRepository @Inject constructor(
    private val apiService: ApiService
) {
    
    /**
     * Get the current user's profile.
     * Merges Clerk + Supabase data into a User domain model.
     */
    fun getUserProfile(): Flow<NetworkResult<User>> = flow {
        emit(NetworkResult.Loading)
        val result = safeApiCall { apiService.getUserProfile() }
        emit(result.map { it.toUser() })
    }
    
    /**
     * Get user profile as a single result (not Flow).
     */
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
        val result = safeApiCall { apiService.updateUserProfile(request) }
        return result.map { response ->
            response.profile?.toUser() ?: User()
        }
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
            avatarColor = p?.avatarColor
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
            avatarColor = avatarColor
        )
    }
}
