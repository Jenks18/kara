package com.mafutapass.app.receipt

import android.graphics.Bitmap
import android.graphics.BitmapFactory
import android.graphics.Rect
import android.util.Log
import com.google.mlkit.nl.entityextraction.Entity
import com.google.mlkit.nl.entityextraction.EntityExtraction
import com.google.mlkit.nl.entityextraction.EntityExtractionParams
import com.google.mlkit.nl.entityextraction.EntityExtractor
import com.google.mlkit.nl.entityextraction.EntityExtractorOptions
import com.google.mlkit.nl.entityextraction.MoneyEntity
import com.google.mlkit.vision.barcode.BarcodeScannerOptions
import com.google.mlkit.vision.barcode.BarcodeScanning
import com.google.mlkit.vision.barcode.common.Barcode
import com.google.mlkit.vision.common.InputImage
import com.google.mlkit.vision.text.TextRecognition
import com.google.mlkit.vision.text.latin.TextRecognizerOptions
import javax.inject.Inject
import javax.inject.Singleton
import kotlin.coroutines.resume
import kotlin.coroutines.suspendCoroutine

private const val TAG = "ReceiptProcessor"

/**
 * On-device receipt data extracted by ML Kit.
 * No financial data leaves the device.
 */
data class ReceiptData(
    val merchantName: String? = null,
    val totalAmount: Double? = null,
    val currency: String? = null,
    val date: String? = null,
    val category: String? = null,
    val items: List<ReceiptLineItem> = emptyList(),
    val rawText: String = "",
    val processingTimeMs: Long = 0,
    val hasEtimsMarkers: Boolean = false
)

data class ReceiptLineItem(
    val description: String,
    val amount: Double? = null,
    val quantity: Int? = null
)

/**
 * Result from the scanning passes on a single receipt image.
 */
data class MultiPassResult(
    val ocrResult: ReceiptData,
    val qrUrls: List<String>,
    val bestResult: ReceiptData
)

/**
 * A text element with its spatial position on the receipt image.
 */
private data class PositionedText(
    val text: String,
    val boundingBox: Rect,
    val confidence: Float,
    val centreY: Int = boundingBox.centerY(),
    val centreX: Int = boundingBox.centerX(),
    val normalisedY: Float = 0f
)

/**
 * Detected money amount from ML Kit Entity Extraction.
 */
private data class DetectedMoney(
    val integerPart: Int,
    val fractionalPart: Int,
    val unnormalizedCurrency: String,
    val sourceText: String,
    val amount: Double = integerPart + fractionalPart / 100.0
)

/**
 * Processes receipt images entirely on-device using Google ML Kit:
 *   1. Text Recognition v2   — OCR with bounding boxes
 *   2. Entity Extraction      — parse money amounts & dates from OCR text
 *   3. Barcode Scanning       — QR codes for eTIMS URLs
 *
 * Entity Extraction handles locale-aware money parsing ("1.000,00",
 * "1,000.00", "KSh 2800") so we never need currency-parsing regex.
 *
 * Optimised for Kenyan receipts (KSh, eTIMS, KRA).
 */
@Singleton
class ReceiptProcessor @Inject constructor() {
    private val textRecognizer = TextRecognition.getClient(TextRecognizerOptions.DEFAULT_OPTIONS)
    private val barcodeScanner = BarcodeScanning.getClient(
        BarcodeScannerOptions.Builder()
            .setBarcodeFormats(Barcode.FORMAT_QR_CODE, Barcode.FORMAT_DATA_MATRIX)
            .build()
    )
    private val entityExtractor: EntityExtractor = EntityExtraction.getClient(
        EntityExtractorOptions.Builder(EntityExtractorOptions.ENGLISH).build()
    )

    // Track whether the Entity Extraction model has been downloaded
    @Volatile
    private var entityModelReady = false

    init {
        // Eagerly download the Entity Extraction model in background
        entityExtractor.downloadModelIfNeeded()
            .addOnSuccessListener {
                entityModelReady = true
                Log.i(TAG, "Entity Extraction model ready")
            }
            .addOnFailureListener { e ->
                Log.w(TAG, "Entity Extraction model download failed: ${e.message}")
            }
    }

    // -- Public API -----------------------------------------------------------

    suspend fun processBytes(imageBytes: ByteArray): ReceiptData {
        val bitmap = BitmapFactory.decodeByteArray(imageBytes, 0, imageBytes.size)
            ?: return ReceiptData(rawText = "Failed to decode image")
        return processAllPasses(bitmap).bestResult
    }

    suspend fun processAllPasses(
        bitmap: Bitmap,
        startTime: Long = System.currentTimeMillis()
    ): MultiPassResult {
        Log.i(TAG, "=== PASS 1: Text Recognition + Entity Extraction ===")
        val ocrResult = runSpatialOcr(bitmap)

        Log.i(TAG, "=== PASS 2: QR / Barcode scan ===")
        val qrUrls = runBarcodeScan(bitmap)

        val elapsed = System.currentTimeMillis() - startTime
        val result = ocrResult.copy(processingTimeMs = elapsed)

        Log.i(TAG, "=== RESULTS ===")
        Log.i(TAG, "Merchant=${result.merchantName}, Total=${result.totalAmount}, " +
            "Currency=${result.currency}, Date=${result.date}")
        Log.i(TAG, "Category=${result.category}, Items=${result.items.size}, " +
            "eTIMS=${result.hasEtimsMarkers}")
        Log.i(TAG, "QR URLs: ${qrUrls.size} -> ${qrUrls.take(3)}")
        Log.i(TAG, "Total processing time: ${elapsed}ms")

        return MultiPassResult(ocrResult = result, qrUrls = qrUrls, bestResult = result)
    }

    // -- Pass 1: Spatial OCR + Entity Extraction ------------------------------

    private suspend fun runSpatialOcr(bitmap: Bitmap): ReceiptData =
        suspendCoroutine { continuation ->
            try {
                val image = InputImage.fromBitmap(bitmap, 0)
                val imageHeight = bitmap.height.toFloat()

                textRecognizer.process(image)
                    .addOnSuccessListener { visionText ->
                        val fullText = visionText.text
                        Log.i(TAG, "[OCR] ${fullText.length} chars, " +
                            "${visionText.textBlocks.size} blocks")

                        if (visionText.textBlocks.isEmpty()) {
                            continuation.resume(ReceiptData(rawText = fullText))
                            return@addOnSuccessListener
                        }

                        // Build positioned elements from ML Kit hierarchy
                        val lineElements = mutableListOf<PositionedText>()
                        val wordElements = mutableListOf<PositionedText>()

                        for (block in visionText.textBlocks) {
                            for (line in block.lines) {
                                line.boundingBox?.let { box ->
                                    lineElements.add(PositionedText(
                                        text = line.text,
                                        boundingBox = box,
                                        confidence = line.confidence ?: 0f,
                                        normalisedY = box.centerY() / imageHeight
                                    ))
                                }
                                for (element in line.elements) {
                                    element.boundingBox?.let { box ->
                                        wordElements.add(PositionedText(
                                            text = element.text,
                                            boundingBox = box,
                                            confidence = element.confidence ?: 0f,
                                            normalisedY = box.centerY() / imageHeight
                                        ))
                                    }
                                }
                            }
                        }

                        // Log every line with position
                        lineElements.forEachIndexed { i, el ->
                            Log.d(TAG, "[OCR] Line $i " +
                                "(y=${"%.2f".format(el.normalisedY)}, " +
                                "conf=${"%.2f".format(el.confidence)}): " +
                                "\"${el.text.take(100)}\"")
                        }

                        // Run entity extraction on the full text to find money & dates
                        extractEntities(fullText) { moneyEntities, dateEntities ->
                            Log.i(TAG, "[EntityExtraction] Found ${moneyEntities.size} money, " +
                                "${dateEntities.size} date entities")
                            moneyEntities.forEach { m ->
                                Log.d(TAG, "[EntityExtraction] Money: ${m.amount} " +
                                    "${m.unnormalizedCurrency} from '${m.sourceText}'")
                            }
                            dateEntities.forEach { d ->
                                Log.d(TAG, "[EntityExtraction] Date: '$d'")
                            }

                            // Extract fields using spatial analysis + entity extraction
                            val merchant = extractMerchantSpatial(lineElements)
                            val (totalAmount, currency) = extractTotalSpatial(
                                lineElements, wordElements, imageHeight, moneyEntities
                            )
                            val detectedCurrency = currency ?: detectCurrency(fullText)
                            val currentYear = java.util.Calendar.getInstance().get(java.util.Calendar.YEAR)
                            val validDates = dateEntities.filter { d ->
                                val yearMatch = Regex("""^(\d{4})-""").find(d)
                                val year = yearMatch?.groupValues?.get(1)?.toIntOrNull()
                                year != null && year in 2020..(currentYear + 1)
                            }
                            val date = validDates.firstOrNull()
                                ?: extractDateSpatial(lineElements)
                            val items = extractItemsSpatial(lineElements)
                            val itemTexts = items.joinToString(" ") { it.description }
                            val category = guessCategory(merchant, fullText, itemTexts)
                            val hasEtims = fullText.contains("eTIMS", ignoreCase = true) ||
                                fullText.contains("Tax Invoice", ignoreCase = true) ||
                                fullText.contains("KRA", ignoreCase = false) ||
                                fullText.contains("PIN:", ignoreCase = true) ||
                                fullText.contains("CU Invoice", ignoreCase = true)

                            val result = ReceiptData(
                                merchantName = merchant,
                                totalAmount = totalAmount,
                                currency = detectedCurrency,
                                date = date,
                                category = category,
                                items = items,
                                rawText = fullText,
                                hasEtimsMarkers = hasEtims
                            )

                            Log.i(TAG, "[Result] merchant='$merchant', " +
                                "total=$totalAmount, currency=$detectedCurrency, " +
                                "date=$date, items=${items.size}")
                            continuation.resume(result)
                        }
                    }
                    .addOnFailureListener { e ->
                        Log.e(TAG, "[OCR] ML Kit failed: ${e.message}")
                        continuation.resume(ReceiptData(rawText = "OCR error: ${e.message}"))
                    }
            } catch (e: Exception) {
                Log.e(TAG, "[OCR] error: ${e.message}")
                continuation.resume(ReceiptData(rawText = "Error: ${e.message}"))
            }
        }

    // -- Entity Extraction (money & dates) ------------------------------------

    /**
     * Use ML Kit Entity Extraction to find money amounts and dates in text.
     * This handles locale-aware formats ("1.000,00", "1,000.00", "KSh 2800")
     * without any regex.
     */
    private fun extractEntities(
        text: String,
        callback: (money: List<DetectedMoney>, dates: List<String>) -> Unit
    ) {
        if (!entityModelReady) {
            Log.w(TAG, "[EntityExtraction] Model not ready, falling back to heuristic parsing")
            val money = heuristicMoneyExtract(text)
            val dates = heuristicDateExtract(text)
            callback(money, dates)
            return
        }

        val params = EntityExtractionParams.Builder(text)
            .setEntityTypesFilter(setOf(Entity.TYPE_MONEY, Entity.TYPE_DATE_TIME))
            .build()

        entityExtractor.annotate(params)
            .addOnSuccessListener { annotations ->
                val moneyEntities = mutableListOf<DetectedMoney>()
                val dateEntities = mutableListOf<String>()

                for (annotation in annotations) {
                    val annotatedText = text.substring(annotation.start, annotation.end)
                    for (entity in annotation.entities) {
                        when (entity) {
                            is MoneyEntity -> {
                                moneyEntities.add(DetectedMoney(
                                    integerPart = entity.integerPart,
                                    fractionalPart = entity.fractionalPart,
                                    unnormalizedCurrency = entity.unnormalizedCurrency,
                                    sourceText = annotatedText
                                ))
                            }
                            is com.google.mlkit.nl.entityextraction.DateTimeEntity -> {
                                // Convert to ISO date
                                val ts = entity.timestampMillis
                                val cal = java.util.Calendar.getInstance()
                                cal.timeInMillis = ts
                                val y = cal.get(java.util.Calendar.YEAR)
                                val m = cal.get(java.util.Calendar.MONTH) + 1
                                val d = cal.get(java.util.Calendar.DAY_OF_MONTH)
                                dateEntities.add("%04d-%02d-%02d".format(y, m, d))
                            }
                        }
                    }
                }

                callback(moneyEntities, dateEntities)
            }
            .addOnFailureListener { e ->
                Log.w(TAG, "[EntityExtraction] Failed: ${e.message}, using heuristic fallback")
                val money = heuristicMoneyExtract(text)
                val dates = heuristicDateExtract(text)
                callback(money, dates)
            }
    }

    // -- Heuristic fallbacks (used when Entity Extraction model not downloaded) --

    /**
     * Locale-aware money parser. Handles:
     *   "1.000.00" (dot as thousands, 3-group pattern with final decimal)
     *   "1,000.00" (US format)
     *   "1.000,00" (European format)
     *   "2800"     (plain integer)
     *   "KSh 2,800" (with currency prefix)
     */
    private fun heuristicMoneyExtract(text: String): List<DetectedMoney> {
        val results = mutableListOf<DetectedMoney>()
        // Match patterns that look like money amounts in text
        val moneyPattern = Regex(
            """(?:KSh|Ksh|KES|Kes|USD|\$|UGX|TZS)?\s*""" +
            """(\d{1,3}(?:[.,\s]\d{3})*(?:[.,]\d{1,2})?)""" +
            """|(\d{4,7}(?:\.\d{1,2})?)""",
            RegexOption.IGNORE_CASE
        )
        for (match in moneyPattern.findAll(text)) {
            val raw = (match.groupValues[1].ifBlank { match.groupValues[2] }).trim()
            if (raw.isBlank()) continue
            val amount = parseLocaleAmount(raw) ?: continue
            if (amount < 1 || amount > 9_999_999) continue
            val cur = detectCurrencyInWord(match.value) ?: ""
            val intPart = amount.toInt()
            val fracPart = ((amount - intPart) * 100).toInt()
            results.add(DetectedMoney(intPart, fracPart, cur, match.value, amount))
        }
        return results
    }

    /**
     * Parse a locale-ambiguous number string like "1.000.00", "1,000.00",
     * "1.000,00", "2800", "2,800".
     */
    private fun parseLocaleAmount(raw: String): Double? {
        val cleaned = raw.replace(" ", "")
        if (cleaned.isEmpty()) return null

        val lastDot = cleaned.lastIndexOf('.')
        val lastComma = cleaned.lastIndexOf(',')

        // Multiple dots: "1.000.00" — dots are thousands separators, no decimal
        val dotCount = cleaned.count { it == '.' }
        val commaCount = cleaned.count { it == ',' }

        return when {
            // "1.000.00" — multiple dots, all are thousands separators
            dotCount > 1 && commaCount == 0 -> {
                cleaned.replace(".", "").toDoubleOrNull()
            }
            // "1,000,000" — multiple commas, all are thousands separators
            commaCount > 1 && dotCount == 0 -> {
                cleaned.replace(",", "").toDoubleOrNull()
            }
            // Both exist: last one is decimal separator
            lastDot > -1 && lastComma > -1 -> {
                if (lastComma > lastDot) {
                    // "1.000,00" — comma is decimal
                    cleaned.replace(".", "").replace(",", ".").toDoubleOrNull()
                } else {
                    // "1,000.00" — dot is decimal
                    cleaned.replace(",", "").toDoubleOrNull()
                }
            }
            // Single comma only
            commaCount == 1 && dotCount == 0 -> {
                val afterComma = cleaned.length - 1 - lastComma
                if (afterComma <= 2) {
                    // "10,00" or "1000,5" — comma is decimal
                    cleaned.replace(",", ".").toDoubleOrNull()
                } else {
                    // "1,000" — comma is thousands
                    cleaned.replace(",", "").toDoubleOrNull()
                }
            }
            // Single dot only
            dotCount == 1 && commaCount == 0 -> {
                val afterDot = cleaned.length - 1 - lastDot
                val beforeDot = cleaned.substring(0, lastDot)
                if (afterDot == 3 && beforeDot.length <= 3) {
                    // "1.000" — European thousands (ambiguous, but common on Kenyan receipts)
                    cleaned.replace(".", "").toDoubleOrNull()
                } else {
                    // "2800.00" or "10.5" — dot is decimal
                    cleaned.toDoubleOrNull()
                }
            }
            // No separators: "2800"
            else -> cleaned.toDoubleOrNull()
        }
    }

    private fun heuristicDateExtract(text: String): List<String> {
        val dates = mutableListOf<String>()
        // DD/MM/YYYY or DD-MM-YYYY or DD.MM.YYYY
        val datePattern = Regex("""(\d{1,2})[/\-.](\d{1,2})[/\-.](\d{4})""")
        for (match in datePattern.findAll(text)) {
            val a = match.groupValues[1].toIntOrNull() ?: continue
            val b = match.groupValues[2].toIntOrNull() ?: continue
            val y = match.groupValues[3].toIntOrNull() ?: continue
            if (y < 2020 || y > 2030) continue
            // Kenyan format is DD/MM/YYYY
            val day = if (a > 12) a else if (b > 12) b else a
            val month = if (a > 12) b else if (b > 12) a else b
            dates.add("%04d-%02d-%02d".format(y, month, day))
        }
        // YYYY-MM-DD
        Regex("""(\d{4})-(\d{2})-(\d{2})""").findAll(text).forEach { m ->
            dates.add(m.value)
        }
        return dates
    }

    // -- Spatial field extraction ----------------------------------------------

    /**
     * MERCHANT: First non-trivial text near the top of the receipt (top 30%).
     */
    private fun extractMerchantSpatial(lines: List<PositionedText>): String? {
        val topLines = lines.filter { it.normalisedY < 0.30f }
            .sortedBy { it.boundingBox.top }

        val skipPatterns = listOf(
            Regex("""\d{1,2}[/\-]\d{1,2}[/\-]\d{2,4}"""),
            Regex("""^\d{10,}$"""),
            Regex("""^P\.?O\.?\s*Box""", RegexOption.IGNORE_CASE),
            Regex("""^Tel|^Phone|^Mob""", RegexOption.IGNORE_CASE),
            Regex("""^-{3,}|^={3,}|^\*{3,}"""),
            Regex("""^\*+.*(?:RECEIPT|receipt)""", RegexOption.IGNORE_CASE),
            Regex("""^Receipt|^Invoice|^Tax Invoice""", RegexOption.IGNORE_CASE),
            Regex("""^Date|^Time""", RegexOption.IGNORE_CASE),
            Regex("""^KRA\s*PIN""", RegexOption.IGNORE_CASE),
            Regex("""^eTIMS""", RegexOption.IGNORE_CASE),
            Regex("""(?:START|END)\s+OF\s+LEGAL""", RegexOption.IGNORE_CASE),
            Regex("""^KE\s"""),
        )

        for (line in topLines) {
            val trimmed = line.text.trim()
            if (trimmed.length < 2) continue
            if (skipPatterns.any { it.containsMatchIn(trimmed) }) continue
            if (trimmed.all { it.isDigit() || it == ' ' }) continue
            Log.d(TAG, "extractMerchant: picked '$trimmed' at " +
                "normY=${"%.2f".format(line.normalisedY)}")
            return trimmed
        }

        return lines.minByOrNull { it.boundingBox.top }?.text?.trim()
    }

    /**
     * TOTAL AMOUNT: Combines spatial proximity (bounding box overlap near
     * "TOTAL" keyword) with Entity Extraction money results.
     *
     * Strategy:
     * BOTTOM-UP approach: on any receipt the real total (CASH / GRAND TOTAL /
     * TOTAL) is the LAST monetary keyword line before the footer.  We:
     *   1. Find every keyword line that could indicate a total.
     *   2. Pair each with its associated amount (inline, same-line right, or
     *      next-line below).
     *   3. Sort by Y descending (bottom-first).
     *   4. The bottom-most keyword line with an amount wins.
     *      Tie-breaker: largest amount (handles OCR re-ordering).
     *   5. Fallback: largest amount in the bottom 60% of the receipt.
     */
    private fun extractTotalSpatial(
        lines: List<PositionedText>,
        words: List<PositionedText>,
        imageHeight: Float,
        entityMoney: List<DetectedMoney>
    ): Pair<Double?, String?> {

        Log.d(TAG, "extractTotal: ${entityMoney.size} entity-extracted money amounts")

        // Build word-level amounts from locale-aware parsing
        val wordAmounts = words.mapNotNull { word ->
            val amount = parseLocaleAmount(
                word.text.replace(Regex("""(?i)KSh|Ksh|KES|Kes|/=|=-"""), "").trim()
            )
            if (amount != null && amount > 0) Triple(word, amount, detectCurrencyInWord(word.text))
            else null
        }

        Log.d(TAG, "extractTotal: ${wordAmounts.size} word-level amounts found")
        wordAmounts.forEach { (w, amt, cur) ->
            Log.d(TAG, "  WordAmt: '${w.text}' -> $amt ($cur) " +
                "y=${"%.2f".format(w.normalisedY)}, x=${w.centreX}")
        }

        // ── Identify ALL keyword lines that could indicate a total ──
        // Accept: TOTAL, GRAND TOTAL, TOTAL DUE, TOTAL PAYABLE, TOTAL AMOUNT,
        //         CASH, AMOUNT DUE, AMOUNT PAID, Sum
        // Reject: TOTAL TAX, TOTAL VAT, TOTAL ITEMS, TOTAL QTY, TOTAL DISC,
        //         TOTAL A-xx%, TOTAL B-xx%, TOTAL C-xx% (tax-category subtotals)
        val rejectPattern = Regex(
            """TOTAL\s*(TAX|VAT|ITEMS?|QTY|DISC|QUANTITY|NUMBER|[A-C][\s\-]\d)""",
            RegexOption.IGNORE_CASE
        )
        val acceptPattern = Regex(
            """(?i)\b(GRAND\s*TOTAL|TOTAL\s*DUE|TOTAL\s*PAYABLE|TOTAL\s*AMOUNT|""" +
            """AMOUNT\s*DUE|AMOUNT\s*PAID|TOTAL|CASH|Sum)\b"""
        )

        data class KeywordMatch(
            val line: PositionedText,
            val amount: Double,
            val currency: String?
        )

        val keywordMatches = mutableListOf<KeywordMatch>()

        val candidateLines = lines.filter { line ->
            acceptPattern.containsMatchIn(line.text) &&
                !rejectPattern.containsMatchIn(line.text) &&
                // Skip CASH BACK / CASH CHANGE / CASH RETURN
                !Regex("""CASH\s*(BACK|CHANGE|RETURN)""", RegexOption.IGNORE_CASE)
                    .containsMatchIn(line.text)
        }

        for (keywordLine in candidateLines) {
            // Try 1: inline amount in the keyword line itself
            val inlineAmt = extractInlineAmount(keywordLine.text)
            if (inlineAmt != null && inlineAmt > 0) {
                Log.d(TAG, "extractTotal: keyword '${keywordLine.text}' " +
                    "y=${"%.2f".format(keywordLine.normalisedY)} → inline $inlineAmt")
                keywordMatches.add(KeywordMatch(
                    keywordLine, inlineAmt, detectCurrencyInWord(keywordLine.text)))
                continue
            }

            // Try 2: word-level amount on the SAME visual row, to the RIGHT
            val lineBox = keywordLine.boundingBox
            val tolerance = (lineBox.height() * 0.5f).toInt().coerceAtLeast(15)
            val sameLineAmounts = wordAmounts.filter { (w, _, _) ->
                val yOverlap = w.centreY in
                    (lineBox.top - tolerance)..(lineBox.bottom + tolerance)
                val isToRight = w.centreX > lineBox.centerX()
                yOverlap && isToRight
            }
            if (sameLineAmounts.isNotEmpty()) {
                val best = sameLineAmounts.maxByOrNull { it.first.centreX }!!
                Log.d(TAG, "extractTotal: keyword '${keywordLine.text}' " +
                    "y=${"%.2f".format(keywordLine.normalisedY)} → same-line ${best.second}")
                keywordMatches.add(KeywordMatch(keywordLine, best.second, best.third))
                continue
            }

            // Try 3: amount on the NEXT line below
            val nextLine = lines
                .filter { it.boundingBox.top > lineBox.bottom }
                .minByOrNull { it.boundingBox.top }
            if (nextLine != null) {
                val nextAmt = extractInlineAmount(nextLine.text)
                if (nextAmt != null && nextAmt > 0) {
                    Log.d(TAG, "extractTotal: keyword '${keywordLine.text}' " +
                        "y=${"%.2f".format(keywordLine.normalisedY)} → next-line $nextAmt")
                    keywordMatches.add(KeywordMatch(
                        keywordLine, nextAmt, detectCurrencyInWord(nextLine.text)))
                    continue
                }
            }

            Log.d(TAG, "extractTotal: keyword '${keywordLine.text}' " +
                "y=${"%.2f".format(keywordLine.normalisedY)} → NO amount found")
        }

        // ── Pick the winner: bottom-most keyword, tie-break by largest amount ──
        if (keywordMatches.isNotEmpty()) {
            // Sort: bottom first (highest Y), then largest amount
            val winner = keywordMatches.sortedWith(
                compareByDescending<KeywordMatch> { it.line.normalisedY }
                    .thenByDescending { it.amount }
            ).first()

            Log.d(TAG, "extractTotal: WINNER '${winner.line.text}' " +
                "y=${"%.2f".format(winner.line.normalisedY)} → ${winner.amount}")
            return Pair(winner.amount, winner.currency)
        }

        // ── Fallback: largest entity-extracted amount in bottom 60% ──
        if (entityMoney.isNotEmpty()) {
            val bottomEntities = entityMoney.filter { money ->
                val sourceLine = lines.firstOrNull { it.text.contains(money.sourceText) }
                sourceLine == null || sourceLine.normalisedY > 0.30f
            }
            if (bottomEntities.isNotEmpty()) {
                val largest = bottomEntities.maxByOrNull { it.amount }!!
                Log.d(TAG, "extractTotal: ENTITY-FALLBACK ${largest.amount} " +
                    "from '${largest.sourceText}'")
                return Pair(largest.amount,
                    largest.unnormalizedCurrency.ifBlank { null })
            }
        }

        // ── Fallback: largest word-amount in bottom 60% ──
        Log.d(TAG, "extractTotal: no keyword match, fallback to largest in bottom 60%")
        val bottomAmounts = wordAmounts.filter { (w, _, _) -> w.normalisedY > 0.40f }
        if (bottomAmounts.isNotEmpty()) {
            val largest = bottomAmounts.maxByOrNull { it.second }!!
            Log.d(TAG, "extractTotal: FALLBACK ${largest.second} from '${largest.first.text}'")
            return Pair(largest.second, largest.third)
        }

        // ── Fallback: largest anywhere ──
        if (wordAmounts.isNotEmpty()) {
            val largest = wordAmounts.maxByOrNull { it.second }!!
            Log.d(TAG, "extractTotal: FALLBACK-ANY ${largest.second}")
            return Pair(largest.second, largest.third)
        }

        Log.w(TAG, "extractTotal: no amounts found")
        return Pair(null, null)
    }

    /**
     * Extract the first money amount from a line of mixed text using
     * locale-aware parsing.
     */
    private fun extractInlineAmount(text: String): Double? {
        // Strip keyword noise
        val cleaned = text
            .replace(Regex("""(?i)(GRAND\s*)?TOTAL\s*(DUE|PAYABLE|AMOUNT)?"""), "")
            .replace(Regex("""(?i)KSh|Ksh|KES|Kes"""), "")
            .trim()

        // Try parsing the remaining text as a number
        return parseLocaleAmount(cleaned.replace(Regex("""[^0-9.,]"""), ""))
    }

    /**
     * DATE: from Entity Extraction results, or spatial fallback.
     */
    private fun extractDateSpatial(lines: List<PositionedText>): String? {
        val sortedLines = lines.sortedBy { it.normalisedY }
        for (line in sortedLines) {
            val text = line.text
            // DD/MM/YYYY or DD-MM-YYYY
            Regex("""(\d{1,2})[/\-.](\d{1,2})[/\-.](\d{4})""").find(text)?.let { m ->
                val a = m.groupValues[1].toIntOrNull() ?: return@let
                val b = m.groupValues[2].toIntOrNull() ?: return@let
                val y = m.groupValues[3].toIntOrNull() ?: return@let
                if (y < 2020 || y > 2030) return@let
                val day = if (a > 12) a else if (b > 12) b else a
                val month = if (a > 12) b else if (b > 12) a else b
                return "%04d-%02d-%02d".format(y, month, day)
            }
            // YYYY-MM-DD
            Regex("""(\d{4})-(\d{2})-(\d{2})""").find(text)?.let { return it.value }
            // DD/MM/YY
            Regex("""(\d{1,2})[/\-.](\d{1,2})[/\-.](\d{2})(?!\d)""").find(text)?.let { m ->
                val d = m.groupValues[1].padStart(2, '0')
                val month = m.groupValues[2].padStart(2, '0')
                val y = "20${m.groupValues[3]}"
                return "$y-$month-$d"
            }
        }
        return null
    }

    /**
     * ITEMS: Lines in the middle region with description + amount layout.
     */
    private fun extractItemsSpatial(lines: List<PositionedText>): List<ReceiptLineItem> {
        val skipWords = setOf(
            "total", "subtotal", "sub-total", "vat", "tax", "change",
            "cash", "mpesa", "discount", "balance", "grand total", "amount due",
            "total due", "total payable", "net total", "total amount"
        )
        val middleLines = lines.filter { it.normalisedY in 0.15f..0.85f }

        return middleLines.mapNotNull { line ->
            val text = line.text.trim()
            if (text.length < 3) return@mapNotNull null
            if (skipWords.any { text.contains(it, ignoreCase = true) }) return@mapNotNull null

            val qtyPattern = Regex(
                """^(\d+)\s*[xX@]\s*(.+?)\s{2,}(?:KSh|Ksh|KES)?\s*""" +
                """([0-9]{1,3}(?:,[0-9]{3})*(?:\.[0-9]{1,2})?)\s*$""",
                RegexOption.IGNORE_CASE
            )
            val itemPattern = Regex(
                """^(.+?)\s{2,}(?:KSh|Ksh|KES)?\s*""" +
                """([0-9]{1,3}(?:,[0-9]{3})*(?:\.[0-9]{1,2})?)\s*$""",
                RegexOption.IGNORE_CASE
            )

            qtyPattern.find(text)?.let { match ->
                val qty = match.groupValues[1].toIntOrNull()
                val desc = match.groupValues[2].trim()
                val amt = parseLocaleAmount(match.groupValues[3])
                if (desc.isNotBlank()) return@mapNotNull ReceiptLineItem(desc, amt, qty)
            }

            itemPattern.find(text)?.let { match ->
                val desc = match.groupValues[1].trim()
                val amt = parseLocaleAmount(match.groupValues[2])
                if (desc.length > 1) return@mapNotNull ReceiptLineItem(desc, amt)
            }

            null
        }
    }

    // -- Pass 2: Barcode / QR scan --------------------------------------------

    private suspend fun runBarcodeScan(bitmap: Bitmap): List<String> =
        suspendCoroutine { continuation ->
            try {
                val image = InputImage.fromBitmap(bitmap, 0)
                barcodeScanner.process(image)
                    .addOnSuccessListener { barcodes ->
                        val urls = barcodes.mapNotNull { bc ->
                            val raw = bc.rawValue
                            Log.d(TAG, "[QR] format=${bc.format}, " +
                                "type=${bc.valueType}, raw=${raw?.take(120)}")
                            raw
                        }
                        Log.i(TAG, "[QR] Found ${urls.size} barcodes/QR codes")
                        continuation.resume(urls)
                    }
                    .addOnFailureListener { e ->
                        Log.e(TAG, "[QR] Barcode scan failed: ${e.message}")
                        continuation.resume(emptyList())
                    }
            } catch (e: Exception) {
                Log.e(TAG, "[QR] error: ${e.message}")
                continuation.resume(emptyList())
            }
        }

    // -- Helpers ---------------------------------------------------------------

    private fun detectCurrency(text: String): String = when {
        text.contains("KSh", ignoreCase = true) ||
            text.contains("KES", ignoreCase = true) -> "KES"
        text.contains("USh", ignoreCase = true) ||
            text.contains("UGX", ignoreCase = true) -> "UGX"
        text.contains("TSh", ignoreCase = true) ||
            text.contains("TZS", ignoreCase = true) -> "TZS"
        text.contains("USD", ignoreCase = false) ||
            text.contains("$") -> "USD"
        else -> "KES"
    }

    private fun detectCurrencyInWord(text: String): String? = when {
        text.contains("KSh", ignoreCase = true) ||
            text.contains("KES", ignoreCase = true) -> "KES"
        text.contains("UGX", ignoreCase = true) -> "UGX"
        text.contains("TZS", ignoreCase = true) -> "TZS"
        text.contains("USD", ignoreCase = false) -> "USD"
        else -> null
    }

    /**
     * CATEGORY: keyword-based classification using merchant name, full OCR text,
     * and extracted line-item descriptions. Items get double weight because
     * "GAS" in an item list is a stronger signal than "GAS" buried in a long
     * receipt footer. Covers 20+ common Kenyan merchant categories.
     */
    private fun guessCategory(merchant: String?, text: String, itemTexts: String = ""): String {
        // Items get mentioned twice for stronger signal
        val combined = "${merchant.orEmpty()} $text $itemTexts $itemTexts".lowercase()
        return when {
            // Groceries / Supermarkets
            combined.containsAny("supermarket", "naivas", "carrefour", "quickmart",
                "tuskys", "chandarana", "cleanshelf", "grocery", "groceries",
                "foodplus", "food plus", "miniso", "game stores",
                "bakery", "butcher", "butchery", "greengrocer",
                "fresh produce", "vegetables", "fruits") -> "Groceries"
            // Food & Dining
            combined.containsAny("restaurant", "cafe", "coffee", "hotel",
                "java house", "artcaffe", "kfc", "chicken inn", "pizza",
                "burger", "mcdonalds", "subway", "dominos", "big square",
                "about thyme", "mama oliech", "nyama choma", "fish & chips",
                "mandazi", "chapati", "meals", "breakfast", "lunch", "dinner",
                "bar", "pub", "lounge", "cocktail", "beer") -> "Food & Dining"
            // Transport & Fuel
            combined.containsAny("uber", "bolt", "taxi", "matatu", "bus",
                "fuel", "petrol", "diesel", "petroleum", "shell", "total energies",
                "kenol", "rubis", "galana", "hass petroleum", "oil libya",
                "gulf energy", "vivo energy", "gas", "lpg", "cooking gas",
                "parking", "ntsa", "toll", "sgr", "train",
                "jomo kenyatta", "airport", "flight") -> "Transport"
            // Healthcare
            combined.containsAny("pharmacy", "chemist", "hospital", "clinic",
                "medical", "doctor", "dental", "dentist", "optician",
                "lab", "laboratory", "x-ray", "scan", "diagnosis",
                "medicine", "drugs", "prescription", "aga khan",
                "nairobi hospital", "mp shah", "gertrude") -> "Healthcare"
            // Communication
            combined.containsAny("safaricom", "airtel", "telkom", "wifi",
                "internet", "data bundle", "airtime", "mpesa",
                "fibre", "faiba", "zuku", "starlink") -> "Communication"
            // Utilities
            combined.containsAny("kplc", "kenya power", "electricity",
                "water", "nairobi water", "sewerage", "trash",
                "waste", "county", "rates") -> "Utilities"
            // Education
            combined.containsAny("stationery", "book", "school", "university",
                "college", "tuition", "fees", "academy", "institute",
                "printing", "photocopy", "lamination") -> "Education"
            // Home & Repair
            combined.containsAny("hardware", "tool", "paint", "plumber",
                "electric", "timber", "cement", "building", "construction",
                "renovation", "furniture", "decor", "curtain") -> "Home & Repair"
            // Clothing & Personal
            combined.containsAny("clothing", "shoes", "fashion", "wear",
                "boutique", "salon", "barber", "spa", "beauty",
                "cosmetics", "perfume", "laundry", "dry clean") -> "Personal & Clothing"
            // Entertainment
            combined.containsAny("cinema", "movie", "theatre", "concert",
                "event", "ticket", "netflix", "dstv", "showmax",
                "gym", "fitness", "sport", "swim") -> "Entertainment"
            // Electronics & Tech
            combined.containsAny("electronics", "phone", "laptop", "computer",
                "samsung", "apple", "fone", "gadget", "charger",
                "cable", "adapter", "battery", "repair") -> "Electronics"
            // Insurance & Finance
            combined.containsAny("insurance", "cover", "premium", "policy",
                "nic", "jubilee", "britam", "sanlam", "cic",
                "bank charge", "atm", "visa") -> "Finance & Insurance"
            else -> "Other"
        }
    }

    private fun String.containsAny(vararg keywords: String): Boolean =
        keywords.any { this.contains(it) }
}
