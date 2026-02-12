
package com.mafutapass.app

import android.app.Application
import android.util.Log
import com.clerk.api.Clerk
import com.mafutapass.app.data.ApiClient

class MafutaPassApplication : Application() {
    override fun onCreate() {
        super.onCreate()

        try {
            // Initialize Clerk - SDK will extract domain from publishable key
            Clerk.initialize(
                this,
                publishableKey = "pk_live_Y2xlcmsubWFmdXRhcGFzcy5jb20k"
            )
            
            // Initialize ApiClient with context for authentication
            ApiClient.initialize(this)
            
            Log.d("MafutaPassApplication", "✅ Application initialized successfully")
        } catch (e: Exception) {
            Log.e("MafutaPassApplication", "❌ Error during initialization", e)
        }
    }
}

