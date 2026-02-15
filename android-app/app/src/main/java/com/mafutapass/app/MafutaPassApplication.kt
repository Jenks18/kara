
package com.mafutapass.app

import android.app.Application
import android.util.Log
import dagger.hilt.android.HiltAndroidApp

/**
 * Application class annotated with Hilt for dependency injection.
 * This is the entry point for Hilt's generated code.
 */
@HiltAndroidApp
class MafutaPassApplication : Application() {
    override fun onCreate() {
        super.onCreate()

        try {
            // Initialize legacy ApiClient with app context for auth interceptor
            @Suppress("DEPRECATION")
            com.mafutapass.app.data.ApiClient.initialize(this)

            Log.d("MafutaPassApplication", "✅ Application initialized with Hilt DI")
        } catch (e: Exception) {
            Log.e("MafutaPassApplication", "❌ Error during initialization", e)
        }
    }
}
