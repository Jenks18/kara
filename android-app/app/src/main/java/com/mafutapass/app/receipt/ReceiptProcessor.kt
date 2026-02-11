package com.mafutapass.app.receipt

import android.graphics.Bitmap
import android.graphics.BitmapFactory
import android.net.Uri
import com.google.mlkit.vision.common.InputImage
import com.google.mlkit.vision.text.TextRecognition
import com.google.mlkit.vision.text.latin.TextRecognizerOptions
import java.io.InputStream
import kotlin.coroutines.resume
import kotlin.coroutines.suspendCoroutine

data class ReceiptData(
    val merchantName: String? = null,
    val totalAmount: Double? = null,
    val date: String? = null,
    val items: List<String> = emptyList(),
    val rawText: String = ""
)

class ReceiptProcessor {
    private val textRecognizer = TextRecognition.getClient(TextRecognizerOptions.DEFAULT_OPTIONS)
    
    suspend fun processImage(imageUri: Uri, inputStream: InputStream): ReceiptData = suspendCoroutine { continuation ->
        try {
            val bitmap = BitmapFactory.decodeStream(inputStream)
            val image = InputImage.fromBitmap(bitmap, 0)
            
            textRecognizer.process(image)
                .addOnSuccessListener { visionText ->
                    val text = visionText.text
                    val receiptData = parseReceiptText(text)
                    continuation.resume(receiptData)
                }
                .addOnFailureListener { e ->
                    continuation.resume(ReceiptData(rawText = "Error processing image: ${e.message}"))
                }
        } catch (e: Exception) {
            continuation.resume(ReceiptData(rawText = "Error: ${e.message}"))
        }
    }
    
    private fun parseReceiptText(text: String): ReceiptData {
        val lines = text.lines().filter { it.isNotBlank() }
        
        // Extract merchant name (usually first few lines)
        val merchantName = lines.firstOrNull()
        
        // Extract total amount (look for common patterns)
        val amountRegex = """(?:TOTAL|Total|Amount|AMOUNT).*?(\d+[.,]\d{2})""".toRegex(RegexOption.IGNORE_CASE)
        val amountMatch = amountRegex.find(text)
        val totalAmount = amountMatch?.groupValues?.get(1)?.replace(",", "")?.toDoubleOrNull()
        
        // Extract date (look for common date patterns)
        val dateRegex = """(\d{1,2}[/-]\d{1,2}[/-]\d{2,4})""".toRegex()
        val dateMatch = dateRegex.find(text)
        val date = dateMatch?.groupValues?.get(1)
        
        // Extract items (lines with amounts)
        val itemRegex = """^(.+?)\s+(\d+[.,]\d{2})$""".toRegex()
        val items = lines.mapNotNull { line ->
            itemRegex.find(line)?.groupValues?.get(1)
        }
        
        return ReceiptData(
            merchantName = merchantName,
            totalAmount = totalAmount,
            date = date,
            items = items,
            rawText = text
        )
    }
}
