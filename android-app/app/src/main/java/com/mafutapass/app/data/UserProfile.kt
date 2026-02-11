
package com.mafutapass.app.data

import com.google.gson.annotations.SerializedName

data class UserProfile(
    val id: String,
    @SerializedName("user_id")
    val userId: String,
    @SerializedName("user_email")
    val userEmail: String,
    @SerializedName("display_name")
    val displayName: String?,
    @SerializedName("first_name")
    val firstName: String?,
    @SerializedName("last_name")
    val lastName: String?,
    @SerializedName("avatar_emoji")
    val avatarEmoji: String,
    @SerializedName("avatar_color")
    val avatarColor: String,
    @SerializedName("avatar_image_url")
    val avatarImageUrl: String?,
    @SerializedName("phone_number")
    val phoneNumber: String?,
    @SerializedName("legal_first_name")
    val legalFirstName: String?,
    @SerializedName("legal_last_name")
    val legalLastName: String?,
    @SerializedName("date_of_birth")
    val dateOfBirth: String?,
    @SerializedName("address_line1")
    val addressLine1: String?,
    @SerializedName("address_line2")
    val addressLine2: String?,
    val city: String?,
    val state: String?,
    @SerializedName("zip_code")
    val zipCode: String?,
    val country: String,
    @SerializedName("created_at")
    val createdAt: String,
    @SerializedName("updated_at")
    val updatedAt: String
)
