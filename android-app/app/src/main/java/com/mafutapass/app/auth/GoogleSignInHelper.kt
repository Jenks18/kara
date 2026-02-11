package com.mafutapass.app.auth

import android.content.Context
import android.util.Log
import androidx.credentials.CredentialManager
import androidx.credentials.CustomCredential
import androidx.credentials.GetCredentialRequest
import androidx.credentials.GetCredentialResponse
import com.google.android.libraries.identity.googleid.GetGoogleIdOption
import com.google.android.libraries.identity.googleid.GoogleIdTokenCredential
import com.google.android.libraries.identity.googleid.GoogleIdTokenParsingException
import java.security.MessageDigest
import java.util.UUID

class GoogleSignInHelper(private val context: Context) {
    
    private val credentialManager = CredentialManager.create(context)
    
    // Your Google Web Client ID from Clerk Dashboard
    private val webClientId = "509785450495-ltsejjolpsl130pvs179lnqtms0g2uj8.apps.googleusercontent.com"
    
    suspend fun signIn(): GoogleSignInResult {
        return try {
            val googleIdOption = GetGoogleIdOption.Builder()
                .setFilterByAuthorizedAccounts(false)
                .setServerClientId(webClientId)
                .setNonce(generateNonce())
                .build()
            
            val request = GetCredentialRequest.Builder()
                .addCredentialOption(googleIdOption)
                .build()
            
            val result = credentialManager.getCredential(
                request = request,
                context = context,
            )
            
            handleSignIn(result)
        } catch (e: Exception) {
            Log.e("GoogleSignInHelper", "Sign-in failed", e)
            GoogleSignInResult.Error(e.message ?: "Sign-in failed")
        }
    }
    
    private fun handleSignIn(result: GetCredentialResponse): GoogleSignInResult {
        val credential = result.credential
        
        return when {
            credential is CustomCredential && credential.type == GoogleIdTokenCredential.TYPE_GOOGLE_ID_TOKEN_CREDENTIAL -> {
                try {
                    val googleIdTokenCredential = GoogleIdTokenCredential.createFrom(credential.data)
                    GoogleSignInResult.Success(
                        idToken = googleIdTokenCredential.idToken,
                        email = googleIdTokenCredential.id,
                        displayName = googleIdTokenCredential.displayName,
                        profilePictureUri = googleIdTokenCredential.profilePictureUri?.toString()
                    )
                } catch (e: GoogleIdTokenParsingException) {
                    Log.e("GoogleSignInHelper", "Invalid Google ID token", e)
                    GoogleSignInResult.Error("Invalid Google credentials")
                }
            }
            else -> {
                Log.e("GoogleSignInHelper", "Unexpected credential type: ${credential.type}")
                GoogleSignInResult.Error("Unexpected credential type")
            }
        }
    }
    
    private fun generateNonce(): String {
        val ranNonce = UUID.randomUUID().toString()
        val bytes = ranNonce.toByteArray()
        val md = MessageDigest.getInstance("SHA-256")
        val digest = md.digest(bytes)
        return digest.fold("") { str, it -> str + "%02x".format(it) }
    }
}

sealed class GoogleSignInResult {
    data class Success(
        val idToken: String,
        val email: String,
        val displayName: String?,
        val profilePictureUri: String?
    ) : GoogleSignInResult()
    
    data class Error(val message: String) : GoogleSignInResult()
}
