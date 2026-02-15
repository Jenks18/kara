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
class SignInViewModel @Inject constructor(
    private val tokenRepository: TokenRepository,
    @ApplicationContext private val appContext: Context
) : ViewModel() {
    private val _uiState = MutableStateFlow<SignInUiState>(SignInUiState.Idle)
    val uiState = _uiState.asStateFlow()

    private val httpClient = OkHttpClient.Builder()
        .connectTimeout(30, TimeUnit.SECONDS)
        .readTimeout(30, TimeUnit.SECONDS)
        .build()

    fun signIn(email: String, password: String) {
        viewModelScope.launch {
            _uiState.value = SignInUiState.Loading
            Log.d("SignInViewModel", "🔐 Signing in via backend")

            try {
                val result = signInViaBackend(email, password)

                if (result.token != null && result.userId != null) {
                    // Backend always returns a valid session JWT — store it
                    tokenRepository.storeToken(result.token, result.userId, email)

                    Log.d("SignInViewModel", "✅ Sign-in successful")
                    _uiState.value = SignInUiState.Success
                } else {
                    Log.e("SignInViewModel", "❌ Sign-in failed: ${result.error}")
                    _uiState.value = SignInUiState.Error(result.error ?: "Invalid email or password")
                }
            } catch (e: Exception) {
                Log.e("SignInViewModel", "❌ Sign-in error: ${e.message}", e)
                _uiState.value = SignInUiState.Error("Network error: ${e.message}")
            }
        }
    }

    private data class SignInResult(
        val token: String? = null,
        val userId: String? = null,
        val error: String? = null
    )

    private suspend fun signInViaBackend(email: String, password: String): SignInResult = withContext(Dispatchers.IO) {
        val json = JSONObject().apply {
            put("email", email)
            put("password", password)
        }

        val requestBody = json.toString().toRequestBody("application/json".toMediaType())
        val request = Request.Builder()
            .url("https://www.mafutapass.com/api/auth/mobile-signin")
            .post(requestBody)
            .build()

        val response = httpClient.newCall(request).execute()
        val responseBody = response.body.string()

        Log.d("SignInViewModel", "📥 Sign-in response code: ${response.code}")

        if (!response.isSuccessful) {
            val error = try {
                JSONObject(responseBody).optString("error", "Invalid email or password")
            } catch (e: Exception) {
                "Invalid email or password"
            }
            return@withContext SignInResult(error = error)
        }

        val jsonResponse = JSONObject(responseBody)
        val token = jsonResponse.optString("token").takeIf { it.isNotEmpty() && it != "null" }
        val userId = jsonResponse.optString("userId").takeIf { it.isNotEmpty() }

        SignInResult(token = token, userId = userId)
    }

    sealed interface SignInUiState {
        data object Idle : SignInUiState
        data object Loading : SignInUiState
        data class Error(val message: String) : SignInUiState
        data object Success : SignInUiState
    }
}
