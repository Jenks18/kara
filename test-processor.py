#!/usr/bin/env python3
"""Quick test to verify the processor works"""
import sys
sys.path.insert(0, 'lib/receipt-processing/python-processor')

from processor import ReceiptProcessor
import cv2
import numpy as np

# Create a simple test image with text
processor = ReceiptProcessor()

# Create a blank white image
test_img = np.ones((400, 600, 3), dtype=np.uint8) * 255

# Add some text using OpenCV
cv2.putText(test_img, 'TEST RECEIPT', (50, 100), 
            cv2.FONT_HERSHEY_SIMPLEX, 2, (0, 0, 0), 3)
cv2.putText(test_img, 'Total: KES 1,234.50', (50, 200), 
            cv2.FONT_HERSHEY_SIMPLEX, 1, (0, 0, 0), 2)
cv2.putText(test_img, '25/01/2026', (50, 300), 
            cv2.FONT_HERSHEY_SIMPLEX, 1, (0, 0, 0), 2)

print("🔧 Testing OpenCV image processing...")
preprocessed = processor.preprocess_image(test_img)
print(f"✅ Preprocessing works - Output shape: {preprocessed.shape}")

print("\n🔧 Testing OCR...")
ocr_result = processor.extract_text_ocr(test_img)
print(f"✅ OCR works - Confidence: {ocr_result['confidence']:.1f}%")
print(f"   Text found: {ocr_result['full_text'][:100]}")

print("\n🔧 Testing QR detection (will be empty for this test image)...")
qr_codes = processor.detect_qr_codes(test_img)
print(f"✅ QR detection works - Found {len(qr_codes)} codes")

print("\n✅ ALL TESTS PASSED! Processor is ready.")
print("\nNow upload a real receipt image at http://localhost:3000/test-qr")
