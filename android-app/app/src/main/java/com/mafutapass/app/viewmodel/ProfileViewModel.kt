package com.mafutapass.app.viewmodel

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.mafutapass.app.data.AvatarManager
import com.mafutapass.app.data.UpdateProfileRequest
import com.mafutapass.app.data.UserSession
import com.mafutapass.app.data.User
import com.mafutapass.app.data.network.NetworkResult
import com.mafutapass.app.data.repository.UserRepository
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch
import javax.inject.Inject

/**
 * ViewModel for user profile operations.
 * 
 * Injected via Hilt - use in Composables:
 * ```
 * val viewModel: ProfileViewModel = hiltViewModel()
 * ```
 */
@HiltViewModel
class ProfileViewModel @Inject constructor(
    private val userRepository: UserRepository,
    private val avatarManager: AvatarManager,
    private val userSession: UserSession
) : ViewModel() {
    
    // Profile state
    private val _profileState = MutableStateFlow<NetworkResult<User>>(NetworkResult.Loading)
    val profileState: StateFlow<NetworkResult<User>> = _profileState.asStateFlow()
    
    // Update operation state
    private val _updateState = MutableStateFlow<UpdateState>(UpdateState.Idle)
    val updateState: StateFlow<UpdateState> = _updateState.asStateFlow()
    
    sealed class UpdateState {
        data object Idle : UpdateState()
        data object Loading : UpdateState()
        data class Success(val message: String = "Profile updated") : UpdateState()
        data class Error(val message: String) : UpdateState()
    }
    
    init {
        loadProfile()
    }

    fun loadProfile() {
        val userId = userSession.userId.value ?: return
        viewModelScope.launch {
            _profileState.value = NetworkResult.Loading
            userRepository.getUserProfile(userId).collect { result ->
                _profileState.value = result
                if (result is NetworkResult.Success) {
                    result.data.avatarEmoji?.let { avatarManager.update(it) }
                }
            }
        }
    }
    
    /**
     * Update legal name (first and last name).
     */
    fun updateLegalName(firstName: String, lastName: String, onSuccess: () -> Unit = {}) {
        viewModelScope.launch {
            _updateState.value = UpdateState.Loading
            
            when (val result = userRepository.updateLegalName(firstName, lastName)) {
                is NetworkResult.Success -> {
                    _updateState.value = UpdateState.Success("Name updated successfully")
                    _profileState.value = NetworkResult.Success(result.data)
                    onSuccess()
                }
                is NetworkResult.Error -> {
                    _updateState.value = UpdateState.Error(result.message)
                }
                is NetworkResult.Loading -> {
                    // Shouldn't happen for one-shot calls
                }
            }
        }
    }
    
    /**
     * Update display name.
     */
    fun updateDisplayName(
        firstName: String,
        lastName: String,
        displayName: String,
        onSuccess: () -> Unit = {}
    ) {
        viewModelScope.launch {
            _updateState.value = UpdateState.Loading
            
            when (val result = userRepository.updateDisplayName(firstName, lastName, displayName)) {
                is NetworkResult.Success -> {
                    _updateState.value = UpdateState.Success("Display name updated")
                    _profileState.value = NetworkResult.Success(result.data)
                    onSuccess()
                }
                is NetworkResult.Error -> {
                    _updateState.value = UpdateState.Error(result.message)
                }
                is NetworkResult.Loading -> {}
            }
        }
    }
    
    /**
     * Update phone number.
     */
    fun updatePhoneNumber(phoneNumber: String, onSuccess: () -> Unit = {}) {
        viewModelScope.launch {
            _updateState.value = UpdateState.Loading
            
            when (val result = userRepository.updatePhoneNumber(phoneNumber)) {
                is NetworkResult.Success -> {
                    _updateState.value = UpdateState.Success("Phone number updated")
                    _profileState.value = NetworkResult.Success(result.data)
                    onSuccess()
                }
                is NetworkResult.Error -> {
                    _updateState.value = UpdateState.Error(result.message)
                }
                is NetworkResult.Loading -> {}
            }
        }
    }
    
    /**
     * Update date of birth.
     */
    fun updateDateOfBirth(dateOfBirth: String, onSuccess: () -> Unit = {}) {
        viewModelScope.launch {
            _updateState.value = UpdateState.Loading
            
            when (val result = userRepository.updateDateOfBirth(dateOfBirth)) {
                is NetworkResult.Success -> {
                    _updateState.value = UpdateState.Success("Date of birth updated")
                    _profileState.value = NetworkResult.Success(result.data)
                    onSuccess()
                }
                is NetworkResult.Error -> {
                    _updateState.value = UpdateState.Error(result.message)
                }
                is NetworkResult.Loading -> {}
            }
        }
    }
    
    /**
     * Update address.
     */
    fun updateAddress(
        addressLine1: String,
        addressLine2: String? = null,
        city: String? = null,
        state: String? = null,
        country: String? = null,
        postalCode: String? = null,
        onSuccess: () -> Unit = {}
    ) {
        viewModelScope.launch {
            _updateState.value = UpdateState.Loading
            
            when (val result = userRepository.updateAddress(addressLine1, addressLine2, city, state, country, postalCode)) {
                is NetworkResult.Success -> {
                    _updateState.value = UpdateState.Success("Address updated")
                    _profileState.value = NetworkResult.Success(result.data)
                    onSuccess()
                }
                is NetworkResult.Error -> {
                    _updateState.value = UpdateState.Error(result.message)
                }
                is NetworkResult.Loading -> {}
            }
        }
    }
    
    /**
     * Update multiple profile fields.
     */
    fun updateProfile(request: UpdateProfileRequest, onSuccess: () -> Unit = {}) {
        viewModelScope.launch {
            _updateState.value = UpdateState.Loading
            
            when (val result = userRepository.updateProfile(request)) {
                is NetworkResult.Success -> {
                    _updateState.value = UpdateState.Success("Profile updated")
                    _profileState.value = NetworkResult.Success(result.data)
                    onSuccess()
                }
                is NetworkResult.Error -> {
                    _updateState.value = UpdateState.Error(result.message)
                }
                is NetworkResult.Loading -> {}
            }
        }
    }
    
    /**
     * Update avatar emoji.
     */
    fun updateAvatar(emoji: String, onSuccess: () -> Unit = {}) {
        // Optimistic: update cache immediately so navbar reflects change
        avatarManager.update(emoji)
        viewModelScope.launch {
            _updateState.value = UpdateState.Loading
            
            when (val result = userRepository.updateProfile(UpdateProfileRequest(avatarEmoji = emoji))) {
                is NetworkResult.Success -> {
                    _updateState.value = UpdateState.Success("Avatar updated")
                    _profileState.value = NetworkResult.Success(result.data)
                    // Confirm from server response
                    result.data.avatarEmoji?.let { avatarManager.update(it) }
                    onSuccess()
                }
                is NetworkResult.Error -> {
                    _updateState.value = UpdateState.Error(result.message)
                }
                is NetworkResult.Loading -> {}
            }
        }
    }
    
    /**
     * Reset update state to idle.
     */
    fun resetUpdateState() {
        _updateState.value = UpdateState.Idle
    }
}
