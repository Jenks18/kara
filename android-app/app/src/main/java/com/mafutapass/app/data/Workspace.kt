
package com.mafutapass.app.data

import com.google.gson.annotations.SerializedName

data class Workspace(
    val id: String,
    @SerializedName("created_at")
    val createdAt: String,
    @SerializedName("updated_at")
    val updatedAt: String,
    @SerializedName("user_id")
    val userId: String,
    val name: String,
    val avatar: String,
    val currency: String,
    @SerializedName("currency_symbol")
    val currencySymbol: String,
    val description: String?,
    val address: String?,
    @SerializedName("plan_type")
    val planType: String?,
    @SerializedName("is_active")
    val isActive: Boolean
)
