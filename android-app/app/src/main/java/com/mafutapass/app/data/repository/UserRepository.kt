package com.mafutapass.app.data.repository

import com.mafutapass.app.data.ApiService
import com.mafutapass.app.data.UpdateProfileRequest
import com.mafutapass.app.data.User
import com.mafutapass.app.data.network.NetworkResult
import com.mafutapass.app.data.network.safeApiCall
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.flow
import javax.inject.Inject
import javax.inject.Singleton

/**
 * Repository for user-related data operations.
 * 
 * This follows the Repository pattern for clean architecture:
 * - Single source of truth for user data
 * - Abstracts data sources (network, cache, etc.)
 * - Returns NetworkResult for consistent error handling
 * 
 * Usage:
 * ```
 * @Inject lateinit var userRepository: UserRepository
 * 
 * viewModelScope.launch {
 *     userRepository.getUserProfile().collect { result ->
 *         when (result) {
 *             is NetworkResult.Success -> // handle user data
 *             is NetworkResult.Error -> // handle error
 *             is NetworkResult.Loading -> // show loading
 *         }
 *     }
 * }
 * ```
 */
@Singleton
class UserRepository @Inject constructor(
    private val apiService: ApiService
) {
    
    /**
     * Get the current user's profile.
     * Emits Loading, then Success or Error.
     */
    fun getUserProfile(): Flow<NetworkResult<User>> = flow {
        emit(NetworkResult.Loading)
        emit(safeApiCall { apiService.getUserProfile() })
    }
    
    /**
     * Get user profile as a single result (not Flow).
     * Useful for one-shot operations.
     */
    suspend fun getUserProfileOnce(): NetworkResult<User> {
        return safeApiCall { apiService.getUserProfile() }
    }
    
    /**
     * Update user's legal name (first and last name).
     */
    suspend fun updateLegalName(firstName: String, lastName: String): NetworkResult<User> {
        val result = safeApiCall {
            apiService.updateUserProfile(
                UpdateProfileRequest(firstName = firstName, lastName = lastName)
            )
        }
        return result.map { it.user ?: User() }
    }
    
    /**
     * Update user's display name.
     */
    suspend fun updateDisplayName(displayName: String): NetworkResult<User> {
        val result = safeApiCall {
            apiService.updateUserProfile(
                UpdateProfileRequest(displayName = displayName)
            )
        }
        return result.map { it.user ?: User() }
    }
    
    /**
     * Update user's phone number.
     */
    suspend fun updatePhoneNumber(phoneNumber: String): NetworkResult<User> {
        val result = safeApiCall {
            apiService.updateUserProfile(
                UpdateProfileRequest(phoneNumber = phoneNumber)
            )
        }
        return result.map { it.user ?: User() }
    }
    
    /**
     * Update user's date of birth.
     */
    suspend fun updateDateOfBirth(dateOfBirth: String): NetworkResult<User> {
        val result = safeApiCall {
            apiService.updateUserProfile(
                UpdateProfileRequest(dateOfBirth = dateOfBirth)
            )
        }
        return result.map { it.user ?: User() }
    }
    
    /**
     * Update user's address.
     */
    suspend fun updateAddress(
        address: String,
        city: String? = null,
        country: String? = null,
        postalCode: String? = null
    ): NetworkResult<User> {
        val result = safeApiCall {
            apiService.updateUserProfile(
                UpdateProfileRequest(
                    address = address,
                    city = city,
                    country = country,
                    postalCode = postalCode
                )
            )
        }
        return result.map { it.user ?: User() }
    }
    
    /**
     * Update multiple profile fields at once.
     */
    suspend fun updateProfile(request: UpdateProfileRequest): NetworkResult<User> {
        val result = safeApiCall {
            apiService.updateUserProfile(request)
        }
        return result.map { it.user ?: User() }
    }
}
