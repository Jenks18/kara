package com.mafutapass.app.di

import android.content.Context
import com.mafutapass.app.auth.AccountHelper
import com.mafutapass.app.auth.TokenRepository
import dagger.Module
import dagger.Provides
import dagger.hilt.InstallIn
import dagger.hilt.android.qualifiers.ApplicationContext
import dagger.hilt.components.SingletonComponent
import javax.inject.Singleton

/**
 * Hilt module that provides application-level dependencies.
 */
@Module
@InstallIn(SingletonComponent::class)
object AppModule {
    
    /**
     * Provides the TokenRepository singleton.
     * This is the primary token management class.
     */
    @Provides
    @Singleton
    fun provideTokenRepository(
        @ApplicationContext context: Context
    ): TokenRepository {
        return TokenRepository.getInstance(context)
    }
    
    /**
     * Provides the AccountHelper singleton.
     * This manages Android AccountManager integration.
     */
    @Provides
    @Singleton
    fun provideAccountHelper(
        @ApplicationContext context: Context
    ): AccountHelper {
        return AccountHelper.getInstance(context)
    }
}
