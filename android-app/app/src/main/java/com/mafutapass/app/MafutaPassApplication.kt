
package com.mafutapass.app

import android.app.Application
import com.clerk.api.Clerk
import com.mafutapass.app.data.ApiClient
import com.mafutapass.app.services.SupabaseDataClient

class MafutaPassApplication : Application() {
    override fun onCreate() {
        super.onCreate()

        // Initialize Clerk - SDK will extract domain from publishable key
        Clerk.initialize(
            this,
            publishableKey = "pk_live_Y2xlcmsubWFmdXRhcGFzcy5jb20k"
        )
        
        // Initialize ApiClient with context for authentication
        ApiClient.initialize(this)
        
        // Initialize Supabase client for direct data access
        SupabaseDataClient.init(this)
    }
}

