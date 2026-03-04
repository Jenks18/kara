//
//  ReceiptProcessor.swift
//  MafutaPass
//
//  On-device receipt processing — OCR text extraction + QR code detection.
//  Mirrors the Android ReceiptProcessor.kt two-pass architecture:
//    Pass 1: VNRecognizeTextRequest  (Apple Vision OCR — iOS 13+)
//    Pass 2: VNDetectBarcodesRequest (QR code scanner)
//
//  Uses Apple's modern Vision framework which natively handles EXIF rotation.
//

import UIKit
import Vision

// MARK: - Result Types

struct ReceiptProcessingResult {
    let ocrText: String
    let parsedData: ParsedReceiptData
    let qrUrl: String?
    let qrTier: Int? // 1 = known KRA domain, 2 = any URL
}

struct ParsedReceiptData {
    let merchantName: String?
    let totalAmount: Double?
    let date: String?
    let items: [String]
}

// MARK: - ReceiptProcessor

class ReceiptProcessor {
    static let shared = ReceiptProcessor()

    // Known eTIMS / KRA domain patterns (Tier 1 — high confidence)
    private let kraPatterns = [
        "itax.kra.go.ke",
        "etims.kra.go.ke",
        "kra.go.ke/verify"
    ]

    // MARK: - Public API

    /// Process a single UIImage: OCR + QR detection (two-pass).
    func processImage(_ image: UIImage) async throws -> ReceiptProcessingResult {
        guard let cgImage = image.cgImage else {
            throw ReceiptProcessorError.invalidImage
        }

        // Apple's VNImageRequestHandler respects CGImage orientation
        let orientation = cgImageOrientation(from: image)
        let handler = VNImageRequestHandler(cgImage: cgImage, orientation: orientation, options: [:])

        // Run both passes concurrently
        async let ocrResult = runOCR(handler: handler)
        async let qrResult  = runQRScan(handler: handler)

        let ocrText = try await ocrResult
        let qrInfo  = try await qrResult

        let parsed = parseReceiptText(ocrText)

        return ReceiptProcessingResult(
            ocrText: ocrText,
            parsedData: parsed,
            qrUrl: qrInfo?.url,
            qrTier: qrInfo?.tier
        )
    }

    /// Process multiple images, returning the best combined result.
    /// Takes the first QR found and concatenates OCR text.
    func processImages(_ images: [UIImage]) async throws -> ReceiptProcessingResult {
        var allText = ""
        var bestQrUrl: String?
        var bestQrTier: Int?

        for image in images {
            let result = try await processImage(image)

            if !result.ocrText.isEmpty {
                if !allText.isEmpty { allText += "\n---\n" }
                allText += result.ocrText
            }

            // Keep first/best QR found (prefer Tier 1 over Tier 2)
            if let url = result.qrUrl {
                if bestQrUrl == nil || (bestQrTier == 2 && result.qrTier == 1) {
                    bestQrUrl = url
                    bestQrTier = result.qrTier
                }
            }
        }

        let parsed = parseReceiptText(allText)

        return ReceiptProcessingResult(
            ocrText: allText,
            parsedData: parsed,
            qrUrl: bestQrUrl,
            qrTier: bestQrTier
        )
    }

    // MARK: - Pass 1: OCR via VNRecognizeTextRequest

    private func runOCR(handler: VNImageRequestHandler) async throws -> String {
        try await withCheckedThrowingContinuation { continuation in
            let request = VNRecognizeTextRequest { request, error in
                if let error = error {
                    continuation.resume(throwing: error)
                    return
                }

                guard let observations = request.results as? [VNRecognizedTextObservation] else {
                    continuation.resume(returning: "")
                    return
                }

                // Collect top candidate from each observation
                let lines = observations.compactMap { obs in
                    obs.topCandidates(1).first?.string
                }

                continuation.resume(returning: lines.joined(separator: "\n"))
            }

            // Use accurate recognition for receipt text
            request.recognitionLevel = .accurate
            // Enable language correction for better accuracy
            request.usesLanguageCorrection = true
            // Support common receipt languages
            request.recognitionLanguages = ["en-US", "en-GB"]

            do {
                try handler.perform([request])
            } catch {
                continuation.resume(throwing: error)
            }
        }
    }

    // MARK: - Pass 2: QR Detection via VNDetectBarcodesRequest

    private struct QRInfo {
        let url: String
        let tier: Int
    }

    private func runQRScan(handler: VNImageRequestHandler) async throws -> QRInfo? {
        try await withCheckedThrowingContinuation { continuation in
            let request = VNDetectBarcodesRequest { request, error in
                if let error = error {
                    continuation.resume(throwing: error)
                    return
                }

                guard let results = request.results as? [VNBarcodeObservation] else {
                    continuation.resume(returning: nil)
                    return
                }

                // Two-tier QR matching (matches Android ReceiptProcessor)
                var tier2Url: String?

                for observation in results {
                    guard let payload = observation.payloadStringValue else { continue }

                    // Tier 1: Known KRA/eTIMS domains
                    if self.isKRAUrl(payload) {
                        continuation.resume(returning: QRInfo(url: payload, tier: 1))
                        return
                    }

                    // Tier 2: Any URL — keep first one as fallback
                    if tier2Url == nil && self.isAnyUrl(payload) {
                        tier2Url = payload
                    }
                }

                // Return Tier 2 if no Tier 1 found
                if let url = tier2Url {
                    continuation.resume(returning: QRInfo(url: url, tier: 2))
                    return
                }

                continuation.resume(returning: nil)
            }

            // Only scan for QR codes
            request.symbologies = [.qr]

            do {
                try handler.perform([request])
            } catch {
                continuation.resume(throwing: error)
            }
        }
    }

    // MARK: - URL Matching

    private func isKRAUrl(_ payload: String) -> Bool {
        let lowered = payload.lowercased()
        return kraPatterns.contains { lowered.contains($0) }
    }

    private func isAnyUrl(_ payload: String) -> Bool {
        let lowered = payload.lowercased()
        return lowered.hasPrefix("http://") || lowered.hasPrefix("https://")
    }

    // MARK: - Receipt Text Parsing (matches Android ReceiptProcessor.parseReceiptText)

    private func parseReceiptText(_ text: String) -> ParsedReceiptData {
        let lines = text.components(separatedBy: .newlines).filter { !$0.trimmingCharacters(in: .whitespaces).isEmpty }

        // Merchant name — usually the first non-empty line
        let merchantName = lines.first

        // Total amount — look for common patterns
        let amountPattern = try? NSRegularExpression(
            pattern: #"(?:TOTAL|Total|Amount|AMOUNT|Grand Total|NET|Payable).*?(\d+[.,]\d{2})"#,
            options: [.caseInsensitive]
        )
        var totalAmount: Double?
        if let regex = amountPattern {
            let nsText = text as NSString
            if let match = regex.firstMatch(in: text, range: NSRange(location: 0, length: nsText.length)) {
                let amountStr = nsText.substring(with: match.range(at: 1)).replacingOccurrences(of: ",", with: "")
                totalAmount = Double(amountStr)
            }
        }

        // Date — look for common date patterns
        let datePattern = try? NSRegularExpression(
            pattern: #"(\d{1,2}[/-]\d{1,2}[/-]\d{2,4})"#,
            options: []
        )
        var date: String?
        if let regex = datePattern {
            let nsText = text as NSString
            if let match = regex.firstMatch(in: text, range: NSRange(location: 0, length: nsText.length)) {
                date = nsText.substring(with: match.range(at: 1))
            }
        }

        // Items — lines with amounts
        let itemPattern = try? NSRegularExpression(
            pattern: #"^(.+?)\s+(\d+[.,]\d{2})$"#,
            options: [.anchorsMatchLines]
        )
        var items: [String] = []
        if let regex = itemPattern {
            let nsText = text as NSString
            let matches = regex.matches(in: text, range: NSRange(location: 0, length: nsText.length))
            items = matches.compactMap { match in
                match.numberOfRanges > 1 ? nsText.substring(with: match.range(at: 1)) : nil
            }
        }

        return ParsedReceiptData(
            merchantName: merchantName,
            totalAmount: totalAmount,
            date: date,
            items: items
        )
    }

    // MARK: - EXIF Orientation

    /// Convert UIImage.Orientation to CGImagePropertyOrientation for Vision framework.
    private func cgImageOrientation(from image: UIImage) -> CGImagePropertyOrientation {
        switch image.imageOrientation {
        case .up:            return .up
        case .down:          return .down
        case .left:          return .left
        case .right:         return .right
        case .upMirrored:    return .upMirrored
        case .downMirrored:  return .downMirrored
        case .leftMirrored:  return .leftMirrored
        case .rightMirrored: return .rightMirrored
        @unknown default:    return .up
        }
    }
}

// MARK: - Errors

enum ReceiptProcessorError: Error, LocalizedError {
    case invalidImage
    case ocrFailed(String)
    case qrScanFailed(String)

    var errorDescription: String? {
        switch self {
        case .invalidImage: return "Could not process the image"
        case .ocrFailed(let msg): return "OCR failed: \(msg)"
        case .qrScanFailed(let msg): return "QR scan failed: \(msg)"
        }
    }
}
