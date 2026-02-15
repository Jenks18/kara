package com.mafutapass.app.data

import com.google.gson.annotations.SerializedName
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
    
    // ============= Workspace Members =============
    
    @GET("api/mobile/workspaces/{id}/members")
    suspend fun getWorkspaceMembers(@Path("id") workspaceId: String): WorkspaceMembersResponse
    
    // ============= User Profile =============
    
    @GET("api/auth/mobile-profile")
    suspend fun getUserProfile(): MobileProfileResponse
}

data class WorkspacesResponse(val workspaces: List<Workspace>)
data class CreateWorkspaceRequest(val name: String, val currency: String = "KES", val currencySymbol: String = "KSh")
data class CreateWorkspaceResponse(val workspace: Workspace)
data class WorkspaceMembersResponse(val members: List<WorkspaceMember>)
data class WorkspaceMember(
    val id: String = "",
    @SerializedName("user_id") val userId: String = "",
    val email: String = "",
    val role: String = "member",
    @SerializedName("display_name") val displayName: String? = null,
    @SerializedName("first_name") val firstName: String? = null,
    @SerializedName("last_name") val lastName: String? = null,
    @SerializedName("avatar_emoji") val avatarEmoji: String? = null
)
