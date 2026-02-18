//
//  QRScannerService.swift
//  MafutaPass
//
//  QR code scanning service using VisionKit
//  Detects eTIMS/KRA QR codes on receipts post-capture
//

import UIKit
import Vision

class QRScannerService {
    static let shared = QRScannerService()
    
    // eTIMS/KRA URL patterns
    private let etimsPatterns = [
        "itax.kra.go.ke",
        "etims.kra.go.ke",
        "kra.go.ke/verify"
    ]
    
    /// Scan image for QR codes and filter for eTIMS URLs
    func scanImageForQR(image: UIImage) async throws -> String? {
        guard let cgImage = image.cgImage else {
            throw QRScanError.invalidImage
        }
        
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
                
                // Find first eTIMS QR code
                for observation in results {
                    if let payload = observation.payloadStringValue {
                        // Check if it's an eTIMS URL
                        if self.isEtimsQR(payload) {
                            continuation.resume(returning: payload)
                            return
                        }
                    }
                }
                
                continuation.resume(returning: nil)
            }
            
            // Configure for QR codes
            request.symbologies = [.qr]
            
            let handler = VNImageRequestHandler(cgImage: cgImage, options: [:])
            do {
                try handler.perform([request])
            } catch {
                continuation.resume(throwing: error)
            }
        }
    }
    
    /// Check if QR payload is an eTIMS/KRA URL
    private func isEtimsQR(_ payload: String) -> Bool {
        return etimsPatterns.contains(where: { payload.contains($0) })
    }
    
    /// Scan multiple images and return first eTIMS QR found
    func scanImagesForQR(images: [UIImage]) async throws -> String? {
        for image in images {
            if let qrUrl = try await scanImageForQR(image: image) {
                return qrUrl
            }
        }
        return nil
    }
}

enum QRScanError: Error {
    case invalidImage
    case scanFailed
}
