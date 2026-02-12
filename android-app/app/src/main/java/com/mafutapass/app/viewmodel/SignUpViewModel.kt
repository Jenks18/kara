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
                Log.d("SignUpViewModel", "📤 Signing up: $email, username: $username")
                
                val json = JSONObject().apply {
                    put("email", email)
                    put("password", password)
                    put("username", username)
                    put("firstName", firstName)
                    put("lastName", lastName)
                }
                
                val requestBody = json.toString()
                    .toRequestBody("application/json".toMediaType())
                
                val request = Request.Builder()
                    .url("https://www.mafutapass.com/api/auth/signup")
                    .post(requestBody)
                    .addHeader("Content-Type", "application/json")
                    .build()
                
                val (response, responseBody) = withContext(Dispatchers.IO) {
                    val resp = httpClient.newCall(request).execute()
                    val body = resp.body?.string() ?: ""
                    Pair(resp, body)
                }
                
                Log.d("SignUpViewModel", "📥 Response code: ${response.code}")
                Log.d("SignUpViewModel", "📥 Response body: $responseBody")
                
                if (!response.isSuccessful) {
                    val errorJson = JSONObject(responseBody)
                    val errorMessage = errorJson.optString("error", "Sign up failed")
                    Log.e("SignUpViewModel", "❌ Sign up failed: $errorMessage")
                    _uiState.value = SignUpUiState.Error(errorMessage)
                    return@launch
                }
                
                val jsonResponse = JSONObject(responseBody)
                
                if (!jsonResponse.getBoolean("success")) {
                    val error = jsonResponse.optString("error", "Unknown error")
                    Log.e("SignUpViewModel", "❌ Sign up unsuccessful: $error")
                    _uiState.value = SignUpUiState.Error(error)
                    return@launch
                }
                
                // Store token and mark as signed in
                val token = jsonResponse.getString("token")
                val userId = jsonResponse.getString("userId")
                
                val prefs = getApplication<Application>().getSharedPreferences("clerk_session", android.content.Context.MODE_PRIVATE)
                prefs.edit().apply {
                    putString("session_token", token)
                    putString("user_id", userId)
                    putString("user_email", email)
                    putBoolean("is_new_user", false)
                }.commit()
                
                Log.d("SignUpViewModel", "✅ Sign up successful!")
                _uiState.value = SignUpUiState.Success
                
            } catch (e: Exception) {
                Log.e("SignUpViewModel", "❌ Sign up error: ${e.message}", e)
                _uiState.value = SignUpUiState.Error("Network error: ${e.message}")
            }
        }
    }

    sealed interface SignUpUiState {
        data object SignedOut : SignUpUiState
        data object Loading : SignUpUiState
        data object Success : SignUpUiState
        data class Error(val message: String) : SignUpUiState
    }
}
