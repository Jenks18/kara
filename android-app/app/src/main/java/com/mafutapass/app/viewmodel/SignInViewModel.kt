package com.mafutapass.app.viewmodel

import android.util.Log
import androidx.lifecycle.ViewModel
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

class SignInViewModel : ViewModel() {
    private val _uiState = MutableStateFlow<SignInUiState>(SignInUiState.Idle)
    val uiState = _uiState.asStateFlow()

    private val httpClient = OkHttpClient.Builder()
        .connectTimeout(30, TimeUnit.SECONDS)
        .readTimeout(30, TimeUnit.SECONDS)
        .build()

    fun signIn(email: String, password: String) {
        viewModelScope.launch {
            _uiState.value = SignInUiState.Loading
            Log.d("SignInViewModel", "🔐 Signing in: $email")

            try {
                val jwt = signInViaBackend(email, password)
                
                if (jwt != null) {
                    Log.d("SignInViewModel", "✅ Sign-in successful")
                    _uiState.value = SignInUiState.Success
                } else {
                    Log.e("SignInViewModel", "❌ Sign-in failed")
                    _uiState.value = SignInUiState.Error("Invalid email or password")
                }
            } catch (e: Exception) {
                Log.e("SignInViewModel", "❌ Sign-in error: ${e.message}", e)
                _uiState.value = SignInUiState.Error("Network error: ${e.message}")
            }
        }
    }

    private suspend fun signInViaBackend(email: String, password: String): String? = withContext(Dispatchers.IO) {
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
        val responseBody = response.body?.string() ?: ""

        Log.d("SignInViewModel", "📥 Sign-in response: ${responseBody.take(200)}")

        if (!response.isSuccessful) {
            Log.e("SignInViewModel", "❌ Sign-in failed: ${response.code}")
            return@withContext null
        }

        val jsonResponse = JSONObject(responseBody)
        val token = jsonResponse.optString("token")
        return@withContext if (token.isNotEmpty()) token else null
    }

    sealed interface SignInUiState {
        data object Idle : SignInUiState
        data object Loading : SignInUiState
        data class Error(val message: String) : SignInUiState
        data object Success : SignInUiState
    }
}
