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

    private suspend fun runSpatialOcr(bitmap: Bitmap): ReceiptData {
        val imageHeight = bitmap.height.toFloat()

        // Step 1: ML Kit Text Recognition — wraps Task callback in a coroutine
        data class OcrRaw(
            val fullText: String,
            val lineElements: List<PositionedText>,
            val wordElements: List<PositionedText>
        )

        val raw: OcrRaw = try {
            suspendCoroutine { continuation ->
                val image = InputImage.fromBitmap(bitmap, 0)
                textRecognizer.process(image)
                    .addOnSuccessListener { visionText ->
                        val fullText = visionText.text
                        Log.i(TAG, "[OCR] ${fullText.length} chars, " +
                            "${visionText.textBlocks.size} blocks")

                        if (visionText.textBlocks.isEmpty()) {
                            continuation.resume(OcrRaw(fullText, emptyList(), emptyList()))
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

                        continuation.resume(OcrRaw(fullText, lineElements, wordElements))
                    }
                    .addOnFailureListener { e ->
                        Log.e(TAG, "[OCR] ML Kit failed: ${e.message}")
                        continuation.resume(OcrRaw("", emptyList(), emptyList()))
                    }
            }
        } catch (e: Exception) {
            Log.e(TAG, "[OCR] error: ${e.message}")
            return ReceiptData(rawText = "Error: ${e.message}")
        }

        if (raw.lineElements.isEmpty()) return ReceiptData(rawText = raw.fullText)

        // Step 2: Entity Extraction — awaits model download on first launch
        val (moneyEntities, dateEntities) = extractEntities(raw.fullText)

        Log.i(TAG, "[EntityExtraction] Found ${moneyEntities.size} money, " +
            "${dateEntities.size} date entities")
        moneyEntities.forEach { m ->
            Log.d(TAG, "[EntityExtraction] Money: ${m.amount} " +
                "${m.unnormalizedCurrency} from '${m.sourceText}'")
        }
        dateEntities.forEach { d ->
            Log.d(TAG, "[EntityExtraction] Date: '$d'")
        }

        // Step 3: Spatial field extraction using OCR + entity results
        val merchant = extractMerchantSpatial(raw.lineElements)
        val (totalAmount, currency) = extractTotalSpatial(
            raw.lineElements, raw.wordElements, imageHeight, moneyEntities
        )
        val detectedCurrency = currency ?: detectCurrency(raw.fullText)
        val currentYear = java.util.Calendar.getInstance().get(java.util.Calendar.YEAR)
        val today = java.util.Calendar.getInstance()
        val validDates = dateEntities.filter { d ->
            val yearMatch = Regex("""^(\d{4})-""").find(d)
            val year = yearMatch?.groupValues?.get(1)?.toIntOrNull()
            if (year == null || year !in 2020..currentYear) return@filter false
            // Reject dates in the future
            try {
                val parts = d.split("-")
                if (parts.size == 3) {
                    val cal = java.util.Calendar.getInstance().apply {
                        set(parts[0].toInt(), parts[1].toInt() - 1, parts[2].toInt(), 23, 59, 59)
                    }
                    !cal.after(today)
                } else false
            } catch (_: Exception) { false }
        }
        val date = validDates.firstOrNull()
            ?: extractDateSpatial(raw.lineElements)
        val items = extractItemsSpatial(raw.lineElements)
        val itemTexts = items.joinToString(" ") { it.description }
        val category = guessCategory(merchant, raw.fullText, itemTexts)
        val hasEtims = raw.fullText.contains("eTIMS", ignoreCase = true) ||
            raw.fullText.contains("Tax Invoice", ignoreCase = true) ||
            raw.fullText.contains("KRA", ignoreCase = false) ||
            raw.fullText.contains("PIN:", ignoreCase = true) ||
            raw.fullText.contains("CU Invoice", ignoreCase = true)

        val result = ReceiptData(
            merchantName = merchant,
            totalAmount = totalAmount,
            currency = detectedCurrency,
            date = date,
            category = category,
            items = items,
            rawText = raw.fullText,
            hasEtimsMarkers = hasEtims
        )

        Log.i(TAG, "[Result] merchant='$merchant', " +
            "total=$totalAmount, currency=$detectedCurrency, " +
            "date=$date, items=${items.size}")
        return result
    }

    // -- Entity Extraction (money & dates) ------------------------------------

    /**
     * Awaits [EntityExtractor.downloadModelIfNeeded] before annotating — even on first launch.
     * This means we always use ML Kit, never heuristic regex.
     * [downloadModelIfNeeded] is a no-op (~0 ms) once the model is on-device.
     * Returns empty lists only if the model genuinely cannot be downloaded (no connectivity
     * and no cache) — in that case the spatial keyword approach still finds the total,
     * and the date spatial regex finds the date.
     */
    private suspend fun extractEntities(
        text: String
    ): Pair<List<DetectedMoney>, List<String>> = suspendCoroutine { continuation ->
        entityExtractor.downloadModelIfNeeded()
            .addOnSuccessListener {
                val params = EntityExtractionParams.Builder(text)
                    .setEntityTypesFilter(setOf(Entity.TYPE_MONEY, Entity.TYPE_DATE_TIME))
                    .build()
                entityExtractor.annotate(params)
                    .addOnSuccessListener { annotations ->
                        val moneyEntities = mutableListOf<DetectedMoney>()
                        val dateEntities  = mutableListOf<String>()
                        for (annotation in annotations) {
                            val annotatedText = text.substring(annotation.start, annotation.end)
                            for (entity in annotation.entities) {
                                when (entity) {
                                    is MoneyEntity -> {
                                        moneyEntities.add(DetectedMoney(
                                            integerPart         = entity.integerPart,
                                            fractionalPart      = entity.fractionalPart,
                                            unnormalizedCurrency = entity.unnormalizedCurrency,
                                            sourceText          = annotatedText
                                        ))
                                    }
                                    is com.google.mlkit.nl.entityextraction.DateTimeEntity -> {
                                        val cal = java.util.Calendar.getInstance().also {
                                            it.timeInMillis = entity.timestampMillis
                                        }
                                        dateEntities.add("%04d-%02d-%02d".format(
                                            cal.get(java.util.Calendar.YEAR),
                                            cal.get(java.util.Calendar.MONTH) + 1,
                                            cal.get(java.util.Calendar.DAY_OF_MONTH)
                                        ))
                                    }
                                }
                            }
                        }
                        continuation.resume(Pair(moneyEntities, dateEntities))
                    }
                    .addOnFailureListener { e ->
                        Log.e(TAG, "[EntityExtraction] annotate failed: ${e.message}")
                        continuation.resume(Pair(emptyList(), emptyList()))
                    }
            }
            .addOnFailureListener { e ->
                Log.e(TAG, "[EntityExtraction] model unavailable: ${e.message}")
                continuation.resume(Pair(emptyList(), emptyList()))
            }
    }

    // -- Locale-aware amount parsing ------------------------------------------

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
            // "1.000.00" — multiple dots: last dot is decimal, earlier dots are thousands.
            // Kenyan receipts use comma for thousands, but OCR often reads "1,000.00"
            // as "1.000.00". Treating all dots as thousands gives 100000 — wrong!
            // Correct: "1.000.00" → strip dots before lastDot → "1000.00" → 1000.0
            dotCount > 1 && commaCount == 0 -> {
                val beforeLast = cleaned.substring(0, lastDot).replace(".", "")
                val afterLast = cleaned.substring(lastDot) // includes the dot
                (beforeLast + afterLast).toDoubleOrNull()
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
            // Single dot only — always treat as decimal separator.
            // Kenyan receipts use commas for thousands (1,000) not dots.
            // "1.000" is a quantity (1.000 kg), "2800.00" is a price.
            dotCount == 1 && commaCount == 0 -> {
                cleaned.toDoubleOrNull()
            }
            // No separators: "2800"
            else -> cleaned.toDoubleOrNull()
        }
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
            // Financial / tax lines that are NOT merchant names
            Regex("""(?i)\b(TOTAL|SUB\s*TOTAL|SUBTOTAL|GRAND\s*TOTAL)\b"""),
            Regex("""(?i)\b(TAX|VAT|EXCISE|LEVY|DUTY|EXEMPT|TAXABLE)\b"""),
            Regex("""(?i)\b(CASH|CHANGE|BALANCE|AMOUNT|PAYMENT|PAID|MPESA|M-PESA|DISCOUNT)\b"""),
            Regex("""(?i)\b(GROSS|NET|TENDER|RECEIVED)\b"""),
            // Lines that are just numbers with currency prefix/suffix
            Regex("""^(?:KSh|Ksh|KES)?\s*[\d,]+\.?\d*\s*$"""),
            // PIN numbers (P-prefixed or A-prefixed)
            Regex("""^[PA]\d{9,}"""),
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
     * TOTAL AMOUNT: keyword-first, bottom-to-top approach.
     *
     * Strategy:
     *   1. Find ALL keyword lines (CASH, TOTAL, AMOUNT, etc.), reject noise
     *      (TOTAL TAX, ITEMS NUMBER, CASH BACK, TOTAL A-16%, etc.)
     *   2. For each keyword, find the nearest amount on the same row.
     *   3. Build a list of (keyword, amount, position) pairs.
     *   4. Sort bottom-to-top.  Prefer CASH over TOTAL.
     *   5. Cross-validate: if CASH and TOTAL agree → high confidence.
     *      If they differ, trust CASH (it's the payment line).
     *   6. Return the winning amount.
     */
    private fun extractTotalSpatial(
        lines: List<PositionedText>,
        words: List<PositionedText>,
        imageHeight: Float,
        entityMoney: List<DetectedMoney>
    ): Pair<Double?, String?> {

        Log.d(TAG, "extractTotal: ${entityMoney.size} entity-extracted money amounts")

        // ── 1. Build ALL word-level amounts (for lookup) ──
        data class WordAmount(
            val word: PositionedText,
            val amount: Double,
            val currency: String?,
        )

        val wordAmounts = words.mapNotNull { word ->
            val raw = word.text.trim()
            // Skip phone numbers, account numbers, and other non-monetary digit strings:
            //  - starts with +  (e.g. "+254 794888372")
            //  - 8+ consecutive digits (phone numbers, serial numbers)
            //  - looks like a date (dd/mm/yyyy, dd-mm-yyyy)
            if (raw.startsWith("+")) return@mapNotNull null
            if (Regex("""\d{8,}""").containsMatchIn(raw)) return@mapNotNull null
            if (Regex("""\d{1,2}[/\-]\d{1,2}[/\-]\d{2,4}""").matches(raw)) return@mapNotNull null

            val cleaned = raw.replace(Regex("""(?i)KSh|Ksh|KES|Kes|/=|=-"""), "").trim()
            val amount = parseLocaleAmount(cleaned)
            // Cap at 10 million — anything larger is almost certainly not a receipt total
            if (amount != null && amount > 0 && amount <= 10_000_000.0)
                WordAmount(word, amount, detectCurrencyInWord(word.text))
            else null
        }

        Log.d(TAG, "extractTotal: ${wordAmounts.size} word-level amounts found")
        wordAmounts.forEach { wa ->
            Log.d(TAG, "  WordAmt: '${wa.word.text}' -> ${wa.amount} (${wa.currency}) " +
                "y=${"%.2f".format(wa.word.normalisedY)}, x=${wa.word.centreX}")
        }

        // ── 2. Find keyword lines ──
        // Keywords we look for, with priority tiers:
        //   Tier 1 (strongest): CASH, GRAND TOTAL, TOTAL DUE, TOTAL PAYABLE, AMOUNT DUE/PAID
        //   Tier 2 (medium):    bare TOTAL, AMOUNT, NET AMOUNT, BALANCE
        //   Tier 3 (weakest):   Sum, SUBTOTAL
        val keywordPattern = Regex(
            """(?i)\b(GRAND\s*TOTAL|TOTAL\s*DUE|TOTAL\s*PAYABLE|TOTAL\s*AMOUNT|""" +
            """AMOUNT\s*DUE|AMOUNT\s*PAID|TOTAL|CASH|AMOUNT|Sum|SUBTOTAL|""" +
            """NET\s*AMOUNT|BALANCE)\b"""
        )
        // Reject patterns: tax breakdowns, item counts, change, receipt type headers
        val rejectPattern = Regex(
            """(?i)(TOTAL\s*(TAX|VAT|ITEMS?|QTY|DISC|QUANTITY|NUMBER|""" +
            """SAVINGS|[A-C][\s\-]\s*\d)|ITEMS\s*(NUMBER|QTY|COUNT|NO)|""" +
            """CASH\s*(SALE|BACK|CHANGE|RETURN|RECEIVED|TENDERED)|""" +
            """TAX\s*(AMOUNT|RATE|A\b|B\b|C\b))"""
        )

        fun keywordTier(text: String): Int {
            return when {
                rejectPattern.containsMatchIn(text) -> -1  // rejected
                Regex("""(?i)\b(CASH)\b""").containsMatchIn(text) -> 1
                Regex("""(?i)\b(GRAND\s*TOTAL|TOTAL\s*DUE|TOTAL\s*PAYABLE|TOTAL\s*AMOUNT|AMOUNT\s*DUE|AMOUNT\s*PAID)\b""")
                    .containsMatchIn(text) -> 1
                Regex("""(?i)\b(NET\s*AMOUNT)\b""").containsMatchIn(text) -> 2
                Regex("""(?i)\bTOTAL\b""").containsMatchIn(text) -> 2
                Regex("""(?i)\b(AMOUNT|BALANCE)\b""").containsMatchIn(text) -> 3
                Regex("""(?i)\b(Sum|SUBTOTAL)\b""").containsMatchIn(text) -> 4
                else -> -1
            }
        }

        // ── 3. Pair each keyword with its nearest amount on the same row ──
        data class KeywordAmountPair(
            val keyword: String,
            val tier: Int,
            val amount: Double,
            val currency: String?,
            val normY: Float,     // y-position on receipt (0 = top, 1 = bottom)
            val confidence: Float, // OCR confidence of the amount word
        )

        val pairs = mutableListOf<KeywordAmountPair>()

        // Scan lines for keywords
        val keywordLines = lines.filter { line ->
            keywordPattern.containsMatchIn(line.text) && keywordTier(line.text) > 0
        }

        Log.d(TAG, "extractTotal: ${keywordLines.size} keyword lines found")

        for (kwLine in keywordLines) {
            val tier = keywordTier(kwLine.text)
            val kwBox = kwLine.boundingBox
            val tolerance = (kwBox.height() * 0.6f).toInt().coerceAtLeast(20)

            // Find amounts on the SAME visual row as this keyword
            val sameRowAmounts = wordAmounts.filter { wa ->
                val yOverlap = wa.word.centreY in
                    (kwBox.top - tolerance)..(kwBox.bottom + tolerance)
                yOverlap && wa.amount >= 10.0
            }

            if (sameRowAmounts.isNotEmpty()) {
                // Pick the amount furthest to the right (amounts are usually right-aligned)
                val best = sameRowAmounts.maxByOrNull { it.word.centreX }!!
                Log.d(TAG, "extractTotal: keyword '${kwLine.text}' (tier=$tier, " +
                    "y=${"%.2f".format(kwLine.normalisedY)}) → " +
                    "amount=${best.amount} from '${best.word.text}' " +
                    "(conf=${"%.2f".format(best.word.confidence)})")
                pairs.add(KeywordAmountPair(
                    kwLine.text, tier, best.amount, best.currency,
                    kwLine.normalisedY, best.word.confidence,
                ))
            } else {
                Log.d(TAG, "extractTotal: keyword '${kwLine.text}' (tier=$tier, " +
                    "y=${"%.2f".format(kwLine.normalisedY)}) → no amount on same row")
            }
        }

        Log.d(TAG, "extractTotal: ${pairs.size} keyword–amount pairs built")
        pairs.forEach { p ->
            Log.d(TAG, "  Pair: '${p.keyword}' tier=${p.tier} → ${p.amount} " +
                "y=${"%.2f".format(p.normY)}")
        }

        if (pairs.isEmpty()) {
            // No keyword pairs — fall through to fallbacks
            Log.d(TAG, "extractTotal: no keyword pairs, trying fallbacks")
        } else {
            // ── 4. Pick winner: sort by tier (lower=better), then by Y (bottom first) ──
            val sorted = pairs.sortedWith(
                compareBy<KeywordAmountPair> { it.tier }
                    .thenByDescending { it.normY }  // bottom first within same tier
            )

            val best = sorted.first()

            // ── 5. Cross-validate: do multiple keywords agree on the same amount? ──
            val agreeing = pairs.filter {
                kotlin.math.abs(it.amount - best.amount) < 0.01
            }
            if (agreeing.size > 1) {
                Log.d(TAG, "extractTotal: ${agreeing.size} keywords agree on ${best.amount}")
            }

            // If there's a tier-1 (CASH) match and a tier-2 (TOTAL) match with
            // different amounts, trust CASH — it's the actual payment.
            // But also log it for debugging.
            val cashPairs = pairs.filter {
                it.keyword.contains("CASH", ignoreCase = true) && it.tier == 1
            }
            val totalPairs = pairs.filter {
                it.keyword.contains("TOTAL", ignoreCase = true) && it.tier <= 2
                    && !it.keyword.contains("CASH", ignoreCase = true)
            }
            if (cashPairs.isNotEmpty() && totalPairs.isNotEmpty()) {
                val cashAmt = cashPairs.maxByOrNull { it.normY }!!.amount
                val totalAmt = totalPairs.maxByOrNull { it.normY }!!.amount
                if (kotlin.math.abs(cashAmt - totalAmt) > 0.01) {
                    Log.w(TAG, "extractTotal: CASH (${cashAmt}) ≠ TOTAL (${totalAmt}) " +
                        "— trusting CASH")
                } else {
                    Log.d(TAG, "extractTotal: CASH and TOTAL agree: ${cashAmt}")
                }
            }

            Log.d(TAG, "extractTotal: WINNER amount=${best.amount} " +
                "keyword='${best.keyword}' tier=${best.tier} " +
                "y=${"%.2f".format(best.normY)} " +
                "conf=${"%.2f".format(best.confidence)}")
            return Pair(best.amount, best.currency)
        }

        // ── 6. No keyword-confirmed amount → requires human input ──
        //   Rather than guessing from unconfirmed amounts (which leads to
        //   picking phone numbers, serial numbers, or garbled OCR fragments),
        //   return null so the UI prompts the user to enter the amount.
        Log.w(TAG, "extractTotal: no keyword-confirmed amount found — requires user input")
        return Pair(null, null)
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
                        // Prefer rawValue (full binary payload); fall back to displayValue
                        // (human-readable string) which ML Kit sometimes populates instead.
                        // Both should carry the full KRA eTIMS URL.
                        val urls = barcodes.mapNotNull { bc ->
                            val value = bc.rawValue?.takeIf { it.isNotBlank() }
                                ?: bc.displayValue?.takeIf { it.isNotBlank() }
                            Log.d(TAG, "[QR] format=${bc.format}, " +
                                "type=${bc.valueType}, " +
                                "rawValue=${bc.rawValue?.take(80)}, " +
                                "displayValue=${bc.displayValue?.take(80)}, " +
                                "resolved=${value?.take(80)}")
                            value
                        }
                        Log.i(TAG, "[QR] ${barcodes.size} barcode(s) detected, " +
                            "${urls.size} with usable value")
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
        // Not enough text to classify — likely a blank or unreadable image
        val totalText = "${merchant.orEmpty()} $text $itemTexts".trim()
        if (totalText.length < 20) return "Other"

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
        keywords.any { kw ->
            // Short keywords (< 5 chars) use word-boundary regex to avoid false positives
            // e.g. "wear" matching "hardware", "spa" matching "space", "bar" matching "barcode"
            if (kw.length < 5) {
                Regex("\\b${Regex.escape(kw)}\\b").containsMatchIn(this)
            } else {
                this.contains(kw)
            }
        }
}
