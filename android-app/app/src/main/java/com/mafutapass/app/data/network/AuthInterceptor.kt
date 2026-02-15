package com.mafutapass.app.data.network

import android.util.Log
import com.mafutapass.app.auth.TokenRepository
import kotlinx.coroutines.runBlocking
import okhttp3.Interceptor
import okhttp3.Response
import javax.inject.Inject
import javax.inject.Singleton

/**
 * OkHttp Interceptor that automatically adds the Authorization header to all requests.
 * 
 * This centralizes authentication so individual API calls don't need to handle tokens.
 * Token retrieval is async-safe via TokenRepository.
 */
@Singleton
class AuthInterceptor @Inject constructor(
    private val tokenRepository: TokenRepository
) : Interceptor {
    
    companion object {
        private const val TAG = "AuthInterceptor"
        private const val HEADER_AUTHORIZATION = "Authorization"
        private const val HEADER_CONTENT_TYPE = "Content-Type"
    }
    
    override fun intercept(chain: Interceptor.Chain): Response {
        val originalRequest = chain.request()
        
        // Skip auth for requests that already have Authorization header
        if (originalRequest.header(HEADER_AUTHORIZATION) != null) {
            return chain.proceed(originalRequest)
        }
        
        // Get valid token (this handles refresh if needed)
        val token = runBlocking {
            tokenRepository.getValidTokenAsync()
        }
        
        val newRequest = originalRequest.newBuilder()
            .addHeader(HEADER_CONTENT_TYPE, "application/json")
            .apply {
                if (token != null) {
                    addHeader(HEADER_AUTHORIZATION, "Bearer $token")
                    Log.d(TAG, "Added auth token to: ${originalRequest.url.encodedPath}")
                } else {
                    Log.w(TAG, "No auth token available for: ${originalRequest.url.encodedPath}")
                }
            }
            .build()
        
        return chain.proceed(newRequest)
    }
}
