package com.mafutapass.app.data

import com.google.gson.annotations.SerializedName

data class ExpenseItem(
    val id: String = "",
    @SerializedName("image_url")
    val imageUrl: String = "",
    val amount: Double = 0.0,
    val category: String = "Uncategorized",
    @SerializedName("merchant_name")
    val merchantName: String? = null,
    @SerializedName("transaction_date")
    val transactionDate: String? = null,
    @SerializedName("created_at")
    val createdAt: String = "",
    @SerializedName("kra_verified")
    val kraVerified: Boolean? = null,
    @SerializedName("workspace_name")
    val workspaceName: String = "",
    @SerializedName("processing_status")
    val processingStatus: String = "processed",
    val description: String? = null
)

data class ExpenseReport(
    val id: String = "",
    val title: String = "",
    val status: String = "draft", // draft, submitted, approved, rejected
    @SerializedName("items_count")
    val itemsCount: Int = 0,
    @SerializedName("total_amount")
    val totalAmount: Double = 0.0,
    @SerializedName("workspace_name")
    val workspaceName: String = "",
    val thumbnails: List<String> = emptyList(),
    @SerializedName("created_at")
    val createdAt: String = ""
)

data class Workspace(
    val id: String = "",
    val name: String = "",
    val currency: String = "KES",
    @SerializedName("currency_symbol")
    val currencySymbol: String = "KSh",
    val avatar: String? = null,
    val description: String? = null,
    @SerializedName("plan_type")
    val planType: String? = null,
    val address: String? = null,
    @SerializedName("is_active")
    val isActive: Boolean = true,
    @SerializedName("created_at")
    val createdAt: String? = null
) {
    val initials: String
        get() = name.split(" ")
            .take(2)
            .mapNotNull { it.firstOrNull()?.uppercaseChar() }
            .joinToString("")
            .ifEmpty { name.take(1).uppercase() }
}

// ============= Profile API Response Types =============

/**
 * GET /api/auth/mobile-profile response.
 * Contains both Clerk user data (camelCase) and Supabase profile (snake_case).
 */
data class MobileProfileResponse(
    val success: Boolean = false,
    val profile: UserProfile? = null,
    val clerk: ClerkUserData? = null
)

/**
 * Supabase user_profiles row (snake_case JSON from database).
 */
data class UserProfile(
    @SerializedName("user_id") val userId: String = "",
    @SerializedName("user_email") val userEmail: String = "",
    @SerializedName("display_name") val displayName: String? = null,
    @SerializedName("first_name") val firstName: String? = null,
    @SerializedName("last_name") val lastName: String? = null,
    @SerializedName("phone_number") val phoneNumber: String? = null,
    @SerializedName("date_of_birth") val dateOfBirth: String? = null,
    @SerializedName("legal_first_name") val legalFirstName: String? = null,
    @SerializedName("legal_last_name") val legalLastName: String? = null,
    @SerializedName("avatar_emoji") val avatarEmoji: String? = null,
    @SerializedName("avatar_color") val avatarColor: String? = null,
    @SerializedName("avatar_image_url") val avatarImageUrl: String? = null,
    @SerializedName("address_line1") val addressLine1: String? = null,
    @SerializedName("address_line2") val addressLine2: String? = null,
    val city: String? = null,
    val state: String? = null,
    @SerializedName("zip_code") val zipCode: String? = null,
    val country: String? = null
)

/**
 * Clerk user data sub-object (camelCase JSON, matches Kotlin property names).
 */
data class ClerkUserData(
    val id: String = "",
    val email: String = "",
    val firstName: String? = null,
    val lastName: String? = null,
    val username: String? = null,
    val imageUrl: String? = null,
    val fullName: String? = null
)

/**
 * Domain model for user data consumed by ViewModels and UI.
 * Merged from Clerk + Supabase profile in UserRepository.
 */
data class User(
    val id: String = "",
    val name: String = "",
    val email: String = "",
    val avatar: String? = null,
    val firstName: String? = null,
    val lastName: String? = null,
    val displayName: String? = null,
    val legalFirstName: String? = null,
    val legalLastName: String? = null,
    val phoneNumber: String? = null,
    val dateOfBirth: String? = null,
    val addressLine1: String? = null,
    val addressLine2: String? = null,
    val city: String? = null,
    val state: String? = null,
    val country: String? = null,
    val postalCode: String? = null,
    val avatarEmoji: String? = null,
    val avatarColor: String? = null
)

/**
 * Request body for PATCH /api/auth/mobile-profile.
 * Backend expects snake_case field names.
 */
data class UpdateProfileRequest(
    @SerializedName("first_name") val firstName: String? = null,
    @SerializedName("last_name") val lastName: String? = null,
    @SerializedName("display_name") val displayName: String? = null,
    @SerializedName("legal_first_name") val legalFirstName: String? = null,
    @SerializedName("legal_last_name") val legalLastName: String? = null,
    @SerializedName("phone_number") val phoneNumber: String? = null,
    @SerializedName("date_of_birth") val dateOfBirth: String? = null,
    @SerializedName("address_line1") val addressLine1: String? = null,
    @SerializedName("address_line2") val addressLine2: String? = null,
    val city: String? = null,
    val state: String? = null,
    val country: String? = null,
    @SerializedName("zip_code") val postalCode: String? = null,
    @SerializedName("avatar_emoji") val avatarEmoji: String? = null
)

/**
 * PATCH /api/auth/mobile-profile response.
 * Returns the updated Supabase profile row.
 */
data class UpdateProfileResponse(
    val success: Boolean = false,
    val profile: UserProfile? = null
)
