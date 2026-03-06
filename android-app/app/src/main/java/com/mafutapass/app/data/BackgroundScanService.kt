package com.mafutapass.app.data

import android.util.Log
import com.mafutapass.app.receipt.ReceiptProcessor
import com.mafutapass.app.viewmodel.ExpenseEditState
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.SupervisorJob
import kotlinx.coroutines.launch
import okhttp3.MediaType.Companion.toMediaType
import okhttp3.MultipartBody
import okhttp3.RequestBody.Companion.toRequestBody
import retrofit2.HttpException
import javax.inject.Inject
import javax.inject.Singleton

private const val TAG = "BackgroundScanService"

/**
 * Application-scoped service that runs OCR + upload entirely in the background.
 *
 * Unlike a ViewModel, this singleton's [CoroutineScope] is NEVER cancelled by navigation
 * events — background work continues even after the Create screen has been popped from
 * the back stack.
 *
 * Pipeline per image:
 *   Pass 1 — ML Kit Text Recognition v2 (OCR) with spatial bounding-box analysis.
 *            Full receipt text fed through ML Kit Entity Extraction to find money
 *            amounts (locale-aware: KSh, 1,000.00, 1.000,00, etc.) and ISO dates.
 *            Merchant from top-of-page spatial heuristic.
 *            Category auto-classified from merchant + item keywords.
 *   Pass 2 — Barcode scan (QR_CODE + DATA_MATRIX) for the KRA eTIMS URL printed
 *            at the bottom of Kenyan tax invoices.
 *   Upload — user-confirmed structured fields sent to backend.
 *            Raw OCR text never leaves the device.
 */
@Singleton
class BackgroundScanService @Inject constructor(
    private val apiService: ApiService,
    private val receiptProcessor: ReceiptProcessor,
    private val pendingExpensesRepository: PendingExpensesRepository
) {
    /** Survives ViewModel lifecycle — never cancelled by navigation. */
    private val scope = CoroutineScope(SupervisorJob() + Dispatchers.IO)

    /**
     * Submit a batch for background OCR + upload.
     *
     * @param states        User-edited expense entries (one per image).
     * @param tempIds       Placeholder IDs already added to [PendingExpensesRepository].
     * @param workspaceId   Selected workspace UUID.
     * @param workspaceName Selected workspace display name.
     * @param qrUrl         eTIMS QR URL detected by the live camera analyser (may be null).
     * @param location      Device GPS coordinates at scan time (may be null).
     */
    fun submit(
        states: List<ExpenseEditState>,
        tempIds: List<String>,
        workspaceId: String?,
        workspaceName: String,
        qrUrl: String?,
        location: Pair<Double, Double>?
    ) {
        scope.launch {
            var sharedReportId: String? = null
            var detectedQrUrl: String? = qrUrl

            val wsIdPart   = workspaceId?.toRequestBody("text/plain".toMediaType())
            val wsNamePart = workspaceName.toRequestBody("text/plain".toMediaType())
            val latPart    = location?.first?.toString()?.toRequestBody("text/plain".toMediaType())
            val lngPart    = location?.second?.toString()?.toRequestBody("text/plain".toMediaType())

            for ((index, state) in states.withIndex()) {
                val tempId     = tempIds[index]
                val imageBytes = state.imageBytes ?: run {
                    Log.w(TAG, "Image $index has no bytes (manual entry) — skipping OCR, no upload")
                    pendingExpensesRepository.remove(tempId)
                    continue
                }

                try {
                    // ── Pass 1 + 2: OCR + Entity Extraction + Barcode ─────────────────
                    Log.i(TAG, "OCR image $index (${imageBytes.size / 1024} KB) — running both passes")

                    // Store local image bytes so the detail screen can display them immediately
                    pendingExpensesRepository.setImageBytes(tempId, imageBytes)

                    val bitmap = android.graphics.BitmapFactory
                        .decodeByteArray(imageBytes, 0, imageBytes.size)
                    val ocr = if (bitmap != null) {
                        val multiPass = receiptProcessor.processAllPasses(
                            bitmap, System.currentTimeMillis()
                        )
                        if (multiPass.qrUrls.isNotEmpty() && detectedQrUrl == null) {
                            detectedQrUrl = multiPass.qrUrls.first()
                            Log.i(TAG, "eTIMS QR from Pass 2: $detectedQrUrl")
                        }
                        Log.i(TAG, "OCR $index: merchant=${multiPass.bestResult.merchantName}, " +
                            "amount=${multiPass.bestResult.totalAmount}, " +
                            "category=${multiPass.bestResult.category}, " +
                            "currency=${multiPass.bestResult.currency}, " +
                            "date=${multiPass.bestResult.date}")
                        multiPass.bestResult
                    } else {
                        Log.e(TAG, "Failed to decode image $index")
                        null
                    }

                    // ── Merge user edits + OCR ────────────────────────────────────────
                    // User-edited fields (description, category, reimbursable) always win.
                    // Description is user-only — never auto-filled from merchant name.
                    val finalDescription = state.description.takeIf { it.isNotBlank() }
                    val finalAmount   = state.amount.toDoubleOrNull() ?: ocr?.totalAmount ?: 0.0
                    val finalCurrency = state.currency.takeIf { it.isNotBlank() } ?: "KES"
                    val finalCategory = state.category.takeIf { it != "Automatic" && it.isNotBlank() }
                        ?: ocr?.category?.takeIf { it != "Other" }
                    val finalMerchant = ocr?.merchantName
                    val finalDate     = ocr?.date

                    // Update placeholder with OCR data (still shows "scanning" border
                    // because processingStatus = "scanning" — upload hasn't finished yet)
                    pendingExpensesRepository.update(tempId, ExpenseItem(
                        id               = tempId,
                        amount           = finalAmount,
                        merchantName     = finalMerchant ?: finalDescription?.takeIf { it.isNotBlank() },
                        description      = finalDescription,
                        category         = finalCategory ?: "Uncategorized",
                        workspaceName    = workspaceName,
                        transactionDate  = finalDate,
                        processingStatus = "scanning"
                    ))

                    // ── Upload ─────────────────────────────────────────────────────────
                    val imagePart = MultipartBody.Part.createFormData(
                        "image", "receipt_$index.jpg",
                        imageBytes.toRequestBody("image/jpeg".toMediaType())
                    )
                    val reportIdPart = sharedReportId?.toRequestBody("text/plain".toMediaType())
                    val qrUrlPart = if (index == 0 && detectedQrUrl != null)
                        detectedQrUrl!!.toRequestBody("text/plain".toMediaType()) else null

                    val response = apiService.uploadReceipt(
                        image           = imagePart,
                        reportId        = reportIdPart,
                        workspaceId     = wsIdPart,
                        workspaceName   = wsNamePart,
                        latitude        = latPart,
                        longitude       = lngPart,
                        qrUrl           = qrUrlPart,
                        description     = finalDescription
                            ?.toRequestBody("text/plain".toMediaType()),
                        category        = finalCategory?.toRequestBody("text/plain".toMediaType()),
                        reimbursable    = state.reimbursable.toString()
                            .toRequestBody("text/plain".toMediaType()),
                        amount          = finalAmount.toString()
                            .toRequestBody("text/plain".toMediaType()),
                        merchant        = finalMerchant?.toRequestBody("text/plain".toMediaType()),
                        transactionDate = finalDate?.toRequestBody("text/plain".toMediaType()),
                        currency        = finalCurrency.toRequestBody("text/plain".toMediaType())
                    )

                    if (response.success) {
                        if (sharedReportId == null) sharedReportId = response.reportId
                        // Replace placeholder with the real uploaded ExpenseItem.
                        // processingStatus = "processed" triggers the halo in ReportsScreen.
                        val realItem = ExpenseItem(
                            id               = response.expenseItemId ?: response.reportId ?: tempId,
                            imageUrl         = response.imageUrl ?: "",
                            amount           = response.amount.takeIf { it > 0 } ?: finalAmount,
                            merchantName     = response.merchant?.takeIf { it.isNotBlank() }
                                ?: finalMerchant,
                            transactionDate  = response.date ?: finalDate,
                            category         = response.category ?: finalCategory ?: "Uncategorized",
                            workspaceName    = workspaceName,
                            kraVerified      = response.kraVerified,
                            description      = finalDescription,
                            reportId         = response.reportId,
                            processingStatus = "processed"
                        )
                        pendingExpensesRepository.update(tempId, realItem)
                        Log.i(TAG, "✅ Upload $index complete: reportId=${response.reportId}, " +
                            "expenseItemId=${response.expenseItemId}, realItem.id=${realItem.id}, " +
                            "kraVerified=${response.kraVerified}, category=${response.category}")
                    } else {
                        pendingExpensesRepository.markFailed(tempId)
                        Log.e(TAG, "❌ Upload $index failed: ${response.error}")
                    }
                } catch (e: HttpException) {
                    val body = runCatching { e.response()?.errorBody()?.string()?.take(300) }.getOrNull()
                    Log.e(TAG, "❌ HTTP ${e.code()} for image $index: $body")
                    pendingExpensesRepository.markFailed(tempId)
                } catch (e: Exception) {
                    Log.e(TAG, "❌ Exception for image $index: ${e.message}")
                    pendingExpensesRepository.markFailed(tempId)
                }
            }
            Log.i(TAG, "Background scan+upload batch complete. sharedReportId=$sharedReportId")
        }
    }
}
