//
//  QRScannerService.swift
//  MafutaPass
//
//  QR code scanning service — thin wrapper around ReceiptProcessor.
//  Kept for backward compatibility with ManualCameraView live QR scanning
//  and ConfirmExpensesView post-capture scanning.
//
//  Two-tier matching (mirrors Android ReceiptProcessor):
//    Tier 1: Known KRA/eTIMS domains (high confidence)
//    Tier 2: Any URL from QR code (fallback)
//

import UIKit
import Vision

class QRScannerService {
    static let shared = QRScannerService()

    // Known eTIMS / KRA domain patterns (Tier 1)
    private let kraPatterns = [
        "itax.kra.go.ke",
        "etims.kra.go.ke",
        "kra.go.ke/verify"
    ]

    /// Scan a single image for QR codes using two-tier matching.
    /// Returns the best QR URL found, or nil.
    func scanImageForQR(image: UIImage) async throws -> String? {
        guard let cgImage = image.cgImage else {
            throw QRScanError.invalidImage
        }

        let orientation = cgImageOrientation(from: image)

        return try await withCheckedThrowingContinuation { continuation in
            let request = VNDetectBarcodesRequest { request, error in
                if let error = error {
                    continuation.resume(throwing: error)
                    return
                }

                guard let results = request.results as? [VNBarcodeObservation] else {
                    continuation.resume(returning: nil)
                    return
                }

                var tier2Url: String?

                for observation in results {
                    guard let payload = observation.payloadStringValue else { continue }

                    // Tier 1: Known KRA/eTIMS domain — return immediately
                    if self.isKRAUrl(payload) {
                        print("✅ QR Tier 1 (KRA): \(payload)")
                        continuation.resume(returning: payload)
                        return
                    }

                    // Tier 2: Any URL — keep first as fallback
                    if tier2Url == nil && self.isAnyUrl(payload) {
                        tier2Url = payload
                    }
                }

                if let url = tier2Url {
                    print("✅ QR Tier 2 (URL): \(url)")
                    continuation.resume(returning: url)
                    return
                }

                continuation.resume(returning: nil)
            }

            // Only scan for QR codes
            request.symbologies = [.qr]

            let handler = VNImageRequestHandler(cgImage: cgImage, orientation: orientation, options: [:])
            do {
                try handler.perform([request])
            } catch {
                continuation.resume(throwing: error)
            }
        }
    }

    /// Scan multiple images and return the first QR URL found.
    /// Prefers Tier 1 (KRA) over Tier 2 (any URL).
    func scanImagesForQR(images: [UIImage]) async throws -> String? {
        var tier2Fallback: String?

        for image in images {
            if let qrUrl = try await scanImageForQR(image: image) {
                // If it's a Tier 1 match, return immediately
                if isKRAUrl(qrUrl) {
                    return qrUrl
                }
                // Otherwise store as Tier 2 fallback
                if tier2Fallback == nil {
                    tier2Fallback = qrUrl
                }
            }
        }

        return tier2Fallback
    }

    /// Check a live-camera QR payload (used by ManualCameraView).
    /// Returns the payload if it's a valid URL (Tier 1 or Tier 2), nil otherwise.
    func filterLiveQR(_ payload: String) -> String? {
        if isKRAUrl(payload) || isAnyUrl(payload) {
            return payload
        }
        return nil
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

    // MARK: - EXIF Orientation

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

enum QRScanError: Error {
    case invalidImage
    case scanFailed
}
