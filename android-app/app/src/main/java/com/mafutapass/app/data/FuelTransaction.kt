
package com.mafutapass.app.data

import com.google.gson.annotations.SerializedName
import java.util.Date

data class FuelTransaction(
    val id: String,
    val merchant: String,
    val merchantPIN: String,
    val location: String?,
    val date: Date,
    val time: String,
    val totalAmount: Double,
    val litres: Double,
    val pricePerLitre: Double,
    val fuelType: String, // "PETROL", "DIESEL", "SUPER", "GAS", "KEROSENE"
    val vehicleNumber: String?,
    val odometer: Int?,
    val pumpNumber: String?,
    val kraInvoiceNumber: String,
    val kraReceiptNumber: String,
    val tillNumber: String?,
    val validated: Boolean,
    val confidence: Int,
    val receiptImageUrl: String
)
