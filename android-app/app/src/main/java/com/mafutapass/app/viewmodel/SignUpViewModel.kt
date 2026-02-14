package com.mafutapass.app.viewmodel

import android.app.Application
import android.util.Log
import androidx.lifecycle.AndroidViewModel
import androidx.lifecycle.viewModelScope
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
import java.util.concurrent.TimeUnit

class SignUpViewModel(application: Application) : AndroidViewModel(application) {
    private val _uiState = MutableStateFlow<SignUpUiState>(SignUpUiState.SignedOut)
    val uiState = _uiState.asStateFlow()

    private val httpClient = OkHttpClient.Builder()
        .connectTimeout(30, TimeUnit.SECONDS)
        .readTimeout(30, TimeUnit.SECONDS)
        .build()

    fun signUp(email: String, password: String, username: String, firstName: String, lastName: String) {
        viewModelScope.launch {
            _uiState.value = SignUpUiState.Loading

            try {
                Log.d("SignUpViewModel", "📱 Creating account: $email")

                // Step 1: Create user + get JWT in one call (backend does signup + exchange)
                val result = createUserViaBackend(email, password, username, firstName, lastName)

                if (!result.success) {
                    Log.e("SignUpViewModel", "❌ Sign up failed: ${result.error}")
                    _uiState.value = SignUpUiState.Error(result.error ?: "Sign up failed")
                    return@launch
                }

                val jwt = result.token
                val userId = result.userId

                if (jwt == null || userId == null) {
                    Log.e("SignUpViewModel", "❌ No token or userId in response")
                    _uiState.value = SignUpUiState.Error("Authentication failed after sign-up")
                    return@launch
                }

                Log.d("SignUpViewModel", "✅ Account created + authenticated")

                // Step 2: Create Supabase profile
                createSupabaseProfile(jwt, email, username, firstName, lastName)

                // Step 3: Store session
                val prefs = getApplication<Application>()
                    .getSharedPreferences("clerk_session", android.content.Context.MODE_PRIVATE)
                prefs.edit().apply {
                    putString("session_token", jwt)
                    putString("user_id", userId)
                    putString("user_email", email)
                    putBoolean("is_new_user", false)
                }.commit()

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
        val responseBody = response.body?.string() ?: ""

        Log.d("SignUpViewModel", "📥 Signup response: $responseBody")

        if (!response.isSuccessful) {
            val error = try {
                JSONObject(responseBody).optString("error", "Sign up failed")
            } catch (e: Exception) {
                "Sign up failed"
            }
            return@withContext SignupResult(success = false, error = error)
        }

        val jsonResponse = JSONObject(responseBody)
        val token = jsonResponse.optString("token").takeIf { it.isNotEmpty() }
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
