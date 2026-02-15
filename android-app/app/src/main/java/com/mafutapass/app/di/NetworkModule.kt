package com.mafutapass.app.di

import com.mafutapass.app.data.ApiService
import com.mafutapass.app.data.network.AuthAuthenticator
import com.mafutapass.app.data.network.AuthInterceptor
import dagger.Module
import dagger.Provides
import dagger.hilt.InstallIn
import dagger.hilt.components.SingletonComponent
import okhttp3.OkHttpClient
import okhttp3.logging.HttpLoggingInterceptor
import retrofit2.Retrofit
import retrofit2.converter.gson.GsonConverterFactory
import java.util.concurrent.TimeUnit
import javax.inject.Singleton

/**
 * Hilt module that provides networking dependencies.
 * 
 * This centralizes all network configuration:
 * - Single OkHttpClient with auth interceptor and authenticator
 * - Retrofit instance configured with the client
 * - ApiService interface implementation
 */
@Module
@InstallIn(SingletonComponent::class)
object NetworkModule {
    
    private const val BASE_URL = "https://www.mafutapass.com/"
    private const val CONNECT_TIMEOUT = 30L
    private const val READ_TIMEOUT = 30L
    private const val WRITE_TIMEOUT = 30L
    
    /**
     * Provides logging interceptor for debugging.
     * In production, you might want to reduce logging level.
     */
    @Provides
    @Singleton
    fun provideLoggingInterceptor(): HttpLoggingInterceptor {
        return HttpLoggingInterceptor().apply {
            level = HttpLoggingInterceptor.Level.BODY
        }
    }
    
    /**
     * Provides the single OkHttpClient for the entire app.
     * 
     * Configured with:
     * - AuthInterceptor: Adds Authorization header to all requests
     * - AuthAuthenticator: Handles 401 by refreshing token and retrying
     * - Logging: For debugging network requests
     * - Timeouts: Reasonable timeouts for mobile networks
     */
    @Provides
    @Singleton
    fun provideOkHttpClient(
        authInterceptor: AuthInterceptor,
        authAuthenticator: AuthAuthenticator,
        loggingInterceptor: HttpLoggingInterceptor
    ): OkHttpClient {
        return OkHttpClient.Builder()
            .addInterceptor(loggingInterceptor)
            .addInterceptor(authInterceptor)
            .authenticator(authAuthenticator)  // Handles 401 automatically
            .connectTimeout(CONNECT_TIMEOUT, TimeUnit.SECONDS)
            .readTimeout(READ_TIMEOUT, TimeUnit.SECONDS)
            .writeTimeout(WRITE_TIMEOUT, TimeUnit.SECONDS)
            .retryOnConnectionFailure(true)
            .build()
    }
    
    /**
     * Provides Retrofit instance configured with the OkHttpClient.
     */
    @Provides
    @Singleton
    fun provideRetrofit(okHttpClient: OkHttpClient): Retrofit {
        return Retrofit.Builder()
            .baseUrl(BASE_URL)
            .client(okHttpClient)
            .addConverterFactory(GsonConverterFactory.create())
            .build()
    }
    
    /**
     * Provides the ApiService implementation.
     */
    @Provides
    @Singleton
    fun provideApiService(retrofit: Retrofit): ApiService {
        return retrofit.create(ApiService::class.java)
    }
}
