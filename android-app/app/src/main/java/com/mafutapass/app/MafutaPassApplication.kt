
package com.mafutapass.app

import android.app.Application
import android.util.Log
import com.mafutapass.app.data.ApiClient

class MafutaPassApplication : Application() {
    override fun onCreate() {
        super.onCreate()

        try {
            // Initialize ApiClient with context for authentication
            // Note: Clerk SDK is NOT used - auth is handled via backend proxy
            ApiClient.initialize(this)
            
            Log.d("MafutaPassApplication", "✅ Application initialized successfully")
        } catch (e: Exception) {
            Log.e("MafutaPassApplication", "❌ Error during initialization", e)
        }
    }
}
