package com.mafutapass.app.viewmodel

import android.content.Context
import android.util.Log
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import dagger.hilt.android.lifecycle.HiltViewModel
import dagger.hilt.android.qualifiers.ApplicationContext
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext
import okhttp3.MediaType.Companion.toMediaType
import okhttp3.OkHttpClient
import okhttp3.Request
import okhttp3.RequestBody.Companion.toRequestBody
import org.json.JSONObject
import com.mafutapass.app.auth.TokenRepository
import java.util.concurrent.TimeUnit
import javax.inject.Inject

@HiltViewModel
class SignUpViewModel @Inject constructor(
    private val tokenRepository: TokenRepository,
    @ApplicationContext private val appContext: Context
) : ViewModel() {
    private val _uiState = MutableStateFlow<SignUpUiState>(SignUpUiState.SignedOut)
    val uiState = _uiState.asStateFlow()

    private val httpClient = OkHttpClient.Builder()
        .connectTimeout(30, TimeUnit.SECONDS)
        .readTimeout(30, TimeUnit.SECONDS)
        .build()

    fun signUp(email: String, password: String, username: String, firstName: String, lastName: String) {
        // Sanitize username: strip whitespace, lowercase
        val cleanUsername = username.trim().replace("\\s+".toRegex(), "").lowercase()
        if (cleanUsername.length < 3) {
            _uiState.value = SignUpUiState.Error("Username must be at least 3 characters")
            return
        }
        if (!cleanUsername.matches("^[a-z0-9_-]+$".toRegex())) {
            _uiState.value = SignUpUiState.Error("Username can only contain letters, numbers, underscores, and hyphens")
            return
        }

        viewModelScope.launch {
            _uiState.value = SignUpUiState.Loading

            try {
                Log.d("SignUpViewModel", "📱 Creating account")

                // Step 1: Create user + get JWT in one call (backend does signup + exchange)
                val result = createUserViaBackend(email, password, cleanUsername, firstName, lastName)

                if (!result.success) {
                    Log.e("SignUpViewModel", "❌ Sign up failed: ${result.error}")
                    _uiState.value = SignUpUiState.Error(result.error ?: "Sign up failed")
                    return@launch
                }

                val jwt = result.token
                val userId = result.userId

                if (userId == null || jwt == null) {
                    Log.e("SignUpViewModel", "❌ Missing userId or token in response")
                    _uiState.value = SignUpUiState.Error(result.error ?: "Sign-up failed")
                    return@launch
                }

                Log.d("SignUpViewModel", "✅ Account created + authenticated")

                // Step 2: Create Supabase profile
                createSupabaseProfile(jwt, email, cleanUsername, firstName, lastName)

                // Step 3: Store session in TokenRepository (primary) - this triggers auth state change
                tokenRepository.storeToken(jwt, userId, email)

                Log.d("SignUpViewModel", "🎉 Sign-up complete!")
                _uiState.value = SignUpUiState.Success

            } catch (e: Exception) {
                Log.e("SignUpViewModel", "❌ Sign up error: ${e.message}", e)
                _uiState.value = SignUpUiState.Error("Network error: ${e.message}")
            }
        }
    }

    private data class SignupResult(
        val success: Boolean,
        val token: String? = null,
        val userId: String? = null,
        val error: String? = null
    )

    private suspend fun createUserViaBackend(
        email: String,
        password: String,
        username: String,
        firstName: String,
        lastName: String
    ): SignupResult = withContext(Dispatchers.IO) {
        val json = JSONObject().apply {
            put("email", email)
            put("password", password)
            put("username", username)
            put("firstName", firstName)
            put("lastName", lastName)
        }

        val requestBody = json.toString().toRequestBody("application/json".toMediaType())
        val request = Request.Builder()
            .url("https://www.mafutapass.com/api/auth/mobile-signup")
            .post(requestBody)
            .build()

        val response = httpClient.newCall(request).execute()
        val responseBody = response.body.string()

        Log.d("SignUpViewModel", "📥 Signup response code: ${response.code}")

        if (!response.isSuccessful) {
            val error = try {
                JSONObject(responseBody).optString("error", "Sign up failed")
            } catch (e: Exception) {
                "Sign up failed"
            }
            return@withContext SignupResult(success = false, error = error)
        }

        val jsonResponse = JSONObject(responseBody)
        val token = jsonResponse.optString("token").takeIf { it.isNotEmpty() && it != "null" }
        val userId = jsonResponse.optString("userId").takeIf { it.isNotEmpty() }

        SignupResult(
            success = true,
            token = token,
            userId = userId
        )
    }

    private suspend fun createSupabaseProfile(
        token: String,
        email: String,
        username: String,
        firstName: String,
        lastName: String
    ) {
        try {
            Log.d("SignUpViewModel", "Creating Supabase profile for: $email")

            val json = JSONObject().apply {
                put("token", token)
                put("email", email)
                put("username", username)
                put("firstName", firstName)
                put("lastName", lastName)
            }

            val requestBody = json.toString()
                .toRequestBody("application/json".toMediaType())

            val request = Request.Builder()
                .url("https://www.mafutapass.com/api/auth/create-profile")
                .post(requestBody)
                .addHeader("Content-Type", "application/json")
                .build()

            val (response, responseBody) = withContext(Dispatchers.IO) {
                val resp = httpClient.newCall(request).execute()
                val body = resp.body?.string() ?: ""
                Pair(resp, body)
            }

            if (response.isSuccessful) {
                Log.d("SignUpViewModel", "Supabase profile created successfully")
            } else {
                Log.e("SignUpViewModel", "Profile creation failed: ${response.code} - $responseBody")
            }
        } catch (e: Exception) {
            Log.e("SignUpViewModel", "Exception creating Supabase profile: ${e.message}", e)
        }
    }

    sealed interface SignUpUiState {
        data object SignedOut : SignUpUiState
        data object Loading : SignUpUiState
        data object Success : SignUpUiState
        data class Error(val message: String) : SignUpUiState
    }
}
