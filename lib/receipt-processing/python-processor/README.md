# Python Receipt Processor

Production-grade receipt processing using OpenCV, Tesseract OCR, and pyzbar.

## Features

- **QR Code Detection**: Uses pyzbar (based on zbar C library) - highly reliable
- **OCR**: Tesseract with receipt-optimized configuration
- **Image Segmentation**: Splits receipt into regions (header, items, footer, QR area)
- **Table Detection**: Finds structured table data using morphological operations
- **Field Extraction**: Parses merchant name, total amount, date, line items
- **Multiple Preprocessing**: Tries different strategies for robust detection

## Setup

### Install System Dependencies

#### macOS
```bash
brew install tesseract
brew install zbar
```

#### Linux (Ubuntu/Debian)
```bash
sudo apt-get update
sudo apt-get install -y tesseract-ocr libzbar0
```

### Install Python Dependencies
```bash
cd lib/receipt-processing/python-processor
pip3 install -r requirements.txt
```

## Usage

### CLI
```bash
python3 processor.py "data:image/jpeg;base64,/9j/4AAQ..."
```

### API
```bash
POST /api/receipts/process-python
Content-Type: application/json

{
  "imageData": "data:image/jpeg;base64,/9j/4AAQ..."
}
```

## Response Format

```json
{
  "success": true,
  "image": {
    "width": 720,
    "height": 1280
  },
  "qr_codes": [
    {
      "data": "https://itax.kra.go.ke/...",
      "type": "QRCODE",
      "strategy": "preprocessed",
      "rect": { "x": 100, "y": 900, "width": 200, "height": 200 },
      "url": "https://itax.kra.go.ke/...",
      "is_kra": true
    }
  ],
  "ocr": {
    "full_text": "MERCHANT NAME\nITEM 1: 100.00\nTOTAL: 100.00",
    "lines": ["MERCHANT NAME", "ITEM 1: 100.00", "TOTAL: 100.00"],
    "confidence": 87.5,
    "word_count": 15
  },
  "extracted_fields": {
    "merchant_name": "MERCHANT NAME",
    "total_amount": 100.0,
    "date": "22/12/2025",
    "items": [
      { "name": "ITEM 1", "amount": 100.0 }
    ]
  },
  "tables": [
    { "x": 50, "y": 300, "width": 620, "height": 400 }
  ],
  "processing_notes": {
    "qr_found": true,
    "ocr_confidence": "87.5%",
    "tables_detected": 1
  }
}
```

## Why Python?

Browser-based libraries (jsQR, Tesseract.js) are limited:
- **jsQR**: Pure JS, slower, less robust for real-world QR codes
- **Tesseract.js**: WASM port, 3-5x slower than native

Python with native libraries:
- **pyzbar**: Uses zbar C library (industry standard)
- **OpenCV**: Full computer vision pipeline
- **pytesseract**: Native Tesseract integration (fast)
- **Better preprocessing**: Adaptive thresholding, denoising, morphological ops

## Native Mobile Migration

When converting to React Native:
- iOS: Use `Vision` framework for QR detection
- Android: Use `ML Kit` Barcode Scanner
- OCR: `react-native-tesseract-ocr` (wraps native Tesseract)
- Keep Python processor as fallback/backend option

## Performance

- QR Detection: <100ms
- OCR: 1-3 seconds (depending on image size)
- Total: ~3-4 seconds for full receipt processing

Much faster and more accurate than browser libraries!
