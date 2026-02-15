package com.mafutapass.app.auth

import android.app.Service
import android.content.Intent
import android.os.IBinder

/**
 * Service that provides the AccountAuthenticator to the Android AccountManager system.
 * 
 * This service is declared in AndroidManifest.xml and is bound by the system
 * when account operations are needed.
 */
class AuthenticatorService : Service() {
    
    private lateinit var authenticator: MafutaAccountAuthenticator
    
    override fun onCreate() {
        super.onCreate()
        authenticator = MafutaAccountAuthenticator(this)
    }
    
    override fun onBind(intent: Intent?): IBinder {
        return authenticator.iBinder
    }
}
