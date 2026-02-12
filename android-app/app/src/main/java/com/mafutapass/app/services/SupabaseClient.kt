package com.mafutapass.app.services

import android.content.Context
import android.util.Log
import io.github.jan.supabase.SupabaseClient
import io.github.jan.supabase.createSupabaseClient
import io.github.jan.supabase.gotrue.Auth
import io.github.jan.supabase.postgrest.Postgrest
import io.github.jan.supabase.postgrest.from

/**
 * Singleton Supabase client for direct database access
 * Uses Supabase JWT obtained from mobile auth endpoint
 */
object SupabaseDataClient {
    private const val TAG = "SupabaseDataClient"
    
    // Supabase configuration
    private const val SUPABASE_URL = "https://bkypfuyiknytkuhxtduc.supabase.co"
    private const val SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJreXBmdXlpa255dGt1aHh0ZHVjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njc0ODkxNjAsImV4cCI6MjA4MzA2NTE2MH0.7OqBp3VbfffoYt2xOYUuzYy_dOvDchvGftE4gqCfVKo"
    
    private var client: SupabaseClient? = null
    private var currentToken: String? = null
    
    /**
     * Initialize or update the Supabase client with auth token
     */
    fun init(context: Context) {
        try {
            val prefs = context.getSharedPreferences("clerk_session", Context.MODE_PRIVATE)
            val token = prefs.getString("supabase_token", null)
            
            // Only reinitialize if token changed
            if (token != currentToken) {
                currentToken = token
                Log.d(TAG, "Initializing Supabase client with ${if (token != null) "auth token" else "no token"}")
                
                client = createSupabaseClient(
                    supabaseUrl = SUPABASE_URL,
                    supabaseKey = SUPABASE_ANON_KEY
                ) {
                    install(Postgrest)
                    install(Auth) {
                        // Set the access token from SharedPreferences
                        token?.let {
                            autoSaveToStorage = false
                            autoLoadFromStorage = false
                        }
                    }
                }
            }
        } catch (e: Exception) {
            Log.e(TAG, "Failed to initialize Supabase client: ${e.message}", e)
            client = null
            currentToken = null
        }
    }
    
    /**
     * Get the Supabase client instance
     * Make sure to call init() first
     */
    fun getClient(): SupabaseClient? {
        if (client == null) {
            Log.w(TAG, "SupabaseDataClient not initialized yet")
        }
        return client
    }
    
    /**
     * Check if client is initialized and ready
     */
    fun isReady(): Boolean {
        return client != null && currentToken != null
    }
}
