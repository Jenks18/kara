package com.mafutapass.app.data

import retrofit2.http.*

/**
 * Retrofit API service interface.
 * 
 * All endpoints are authenticated automatically via AuthInterceptor.
 * 401 responses are handled automatically via AuthAuthenticator.
 * 
 * Inject this service via Hilt:
 * ```
 * @Inject lateinit var apiService: ApiService
 * ```
 */
interface ApiService {
    
    // ============= Workspaces =============
    
    @GET("api/mobile/workspaces")
    suspend fun getWorkspaces(): WorkspacesResponse
    
    @GET("api/mobile/workspaces/{id}")
    suspend fun getWorkspace(@Path("id") id: String): Workspace
    
    @DELETE("api/mobile/workspaces/{id}")
    suspend fun deleteWorkspace(@Path("id") id: String): Map<String, Any>
    
    @POST("api/mobile/workspaces")
    suspend fun createWorkspace(@Body body: CreateWorkspaceRequest): CreateWorkspaceResponse
    
    // ============= Expense Reports =============
    
    @GET("api/mobile/expense-reports")
    suspend fun getExpenseReports(@Query("workspaceId") workspaceId: String? = null): List<ExpenseReport>
    
    @POST("api/mobile/expense-reports")
    suspend fun createExpenseReport(@Body body: Map<String, String>): ExpenseReport
    
    // ============= Receipts =============
    
    @GET("api/mobile/receipts")
    suspend fun getReceipts(@Query("workspaceId") workspaceId: String? = null): List<ExpenseItem>
    
    // ============= User Profile =============
    
    @GET("api/auth/mobile-profile")
    suspend fun getUserProfile(): User
    
    @PATCH("api/auth/mobile-profile")
    suspend fun updateUserProfile(@Body request: UpdateProfileRequest): UpdateProfileResponse
}

data class WorkspacesResponse(val workspaces: List<Workspace>)
data class CreateWorkspaceRequest(val name: String, val currency: String = "KES", val currencySymbol: String = "KSh")
data class CreateWorkspaceResponse(val workspace: Workspace)


/**
 * @deprecated Use Hilt-injected ApiService instead.
 * This object is kept for backward compatibility during migration.
 */
@Deprecated("Use Hilt-injected ApiService instead")
object ApiClient {
    private const val BASE_URL = "https://www.mafutapass.com/"
    
    private var applicationContext: android.content.Context? = null
    
    fun initialize(context: android.content.Context) {
        applicationContext = context.applicationContext
    }
    
    private val loggingInterceptor = okhttp3.logging.HttpLoggingInterceptor().apply {
        level = okhttp3.logging.HttpLoggingInterceptor.Level.BODY
    }
    
    private val authInterceptor: (okhttp3.Interceptor.Chain) -> okhttp3.Response = { chain ->
        // Use async TokenRepository for production-grade token management.
        // This is safe in OkHttp interceptors which run on IO threads.
        val token = applicationContext?.let { context ->
            val tokenRepository = com.mafutapass.app.auth.TokenRepository.getInstance(context)
            kotlinx.coroutines.runBlocking { tokenRepository.getValidTokenAsync() }
        }
        
        val request = chain.request().newBuilder()
            .addHeader("Content-Type", "application/json")
            .apply {
                if (token != null) {
                    addHeader("Authorization", "Bearer $token")
                    android.util.Log.d("ApiClient", "Added auth token to request: ${token.take(30)}...")
                } else {
                    android.util.Log.w("ApiClient", "No auth token available for request")
                }
            }
            .build()
        chain.proceed(request)
    }
    
    private val client = okhttp3.OkHttpClient.Builder()
        .addInterceptor(loggingInterceptor)
        .addInterceptor(authInterceptor)
        .connectTimeout(30, java.util.concurrent.TimeUnit.SECONDS)
        .readTimeout(30, java.util.concurrent.TimeUnit.SECONDS)
        .build()
    
    private val retrofit = retrofit2.Retrofit.Builder()
        .baseUrl(BASE_URL)
        .client(client)
        .addConverterFactory(retrofit2.converter.gson.GsonConverterFactory.create())
        .build()
    
    val apiService: ApiService = retrofit.create(ApiService::class.java)
}
