# Kara Receipt Processing - Backend API Documentation

## Architecture: Store & Forward Model

The receipt processing happens **asynchronously** on the server after the user captures and uploads the image. This allows for heavy OCR/ML processing without slowing down the mobile app.

---

## API Endpoints

### 1. Upload Receipt

**POST** `/api/receipts/upload`

Uploads the receipt image and queues it for processing.

**Request:**
```json
{
  "image": "base64_encoded_image_data",
  "userId": "user_123",
  "capturedAt": "2025-12-29T13:26:00Z"
}
```

**Response:**
```json
{
  "receiptId": "rcpt_abc123",
  "status": "uploading",
  "imageUrl": "https://cdn.kara.app/receipts/rcpt_abc123.jpg",
  "estimatedProcessingTime": 120
}
```

---

### 2. Get Receipt Status

**GET** `/api/receipts/{receiptId}/status`

Check the current processing status of a receipt.

**Response:**
```json
{
  "receiptId": "rcpt_abc123",
  "status": "processing",
  "progress": 65,
  "currentStep": "extracting_fuel_data",
  "steps": [
    { "name": "qr_decode", "status": "complete", "confidence": 100 },
    { "name": "ocr_extraction", "status": "in_progress", "confidence": null },
    { "name": "validation", "status": "pending", "confidence": null }
  ]
}
```

---

### 3. Complete Review

**POST** `/api/receipts/{receiptId}/review`

User submits missing information for manual review.

**Request:**
```json
{
  "litres": 25.5,
  "fuelType": "DIESEL",
  "vehicleNumber": "KBX 123A",
  "odometer": 45000
}
```

**Response:**
```json
{
  "receiptId": "rcpt_abc123",
  "status": "verified",
  "transaction": {
    "id": "txn_xyz789",
    "merchant": "Mascot Petroleum",
    "amount": 5700.00,
    "litres": 25.5,
    "pricePerLitre": 223.53,
    "fuelType": "DIESEL"
  }
}
```

---

## Processing Workflow (Server-Side)

### Step 1: QR Code Extraction

**Goal:** Extract KRA fiscal data (high confidence)

```python
def extract_qr_code(image_path):
    """
    Decode the KRA QR code from the receipt image.
    Returns: KRA fiscal data with 100% confidence
    """
    import cv2
    from pyzbar.pyzbar import decode
    
    image = cv2.imread(image_path)
    qr_codes = decode(image)
    
    if not qr_codes:
        return None
    
    # KRA QR format: Contains fiscal URL
    qr_data = qr_codes[0].data.decode('utf-8')
    
    # Parse KRA fiscal URL
    # Example: https://itax.kra.go.ke/KRA-Portal/verify.htm?... 
    fiscal_data = parse_kra_url(qr_data)
    
    return {
        'merchantPIN': fiscal_data['pin'],
        'merchantName': fiscal_data['name'],
        'dateTime': fiscal_data['datetime'],
        'totalAmount': fiscal_data['total'],
        'invoiceNumber': fiscal_data['invoice'],
        'receiptNumber': fiscal_data['receipt'],
        'confidence': 100
    }
```

**KRA QR Data Format:**
The QR code contains a URL that can be queried to get:
- Merchant PIN (e.g., P051199483R)
- Business Name
- Invoice Number
- Date/Time
- Total Amount
- Tax breakdown

---

### Step 2: OCR Text Extraction

**Goal:** Extract fuel volume and type from receipt text

```python
def extract_fuel_data(image_path, qr_total_amount):
    """
    Use Google Cloud Vision API to extract text,
    then find the litres value by correlating with the total amount.
    """
    from google.cloud import vision
    
    client = vision.ImageAnnotatorClient()
    
    with open(image_path, 'rb') as image_file:
        content = image_file.read()
    
    image = vision.Image(content=content)
    response = client.text_detection(image=image)
    text = response.text_annotations[0].description
    
    # Parse the text for fuel data
    fuel_data = parse_receipt_text(text, qr_total_amount)
    
    return fuel_data
```

**Text Parsing Logic:**

```python
def parse_receipt_text(text, total_amount):
    """
    Waterfall logic to find litres:
    1. Find the total amount in the text (anchor point)
    2. Search nearby for volume indicators (L, Litres, Vol)
    3. Validate by calculating price per litre
    """
    import re
    
    # Find all numbers in text
    numbers = re.findall(r'\d+\.?\d*', text)
    
    # Find fuel type keywords
    fuel_types = {
        'PETROL': r'\bPETROL\b|\bPMS\b',
        'DIESEL': r'\bDIESEL\b|\bAGO\b',
        'SUPER': r'\bSUPER\b',
        'GAS': r'\bGAS\b|\bLPG\b',
        'KEROSENE': r'\bKEROSENE\b|\bILO\b'
    }
    
    detected_fuel_type = None
    for fuel_type, pattern in fuel_types.items():
        if re.search(pattern, text, re.IGNORECASE):
            detected_fuel_type = fuel_type
            break
    
    # Find litres by validation
    litres_candidates = []
    for num_str in numbers:
        try:
            litres = float(num_str)
            if 1 <= litres <= 100:  # Reasonable fuel tank size
                price_per_litre = total_amount / litres
                
                # Check if price is reasonable
                if 160 <= price_per_litre <= 250:
                    confidence = calculate_confidence(
                        price_per_litre, 
                        detected_fuel_type
                    )
                    litres_candidates.append({
                        'litres': litres,
                        'pricePerLitre': price_per_litre,
                        'confidence': confidence
                    })
        except:
            continue
    
    # Return best match
    if litres_candidates:
        best_match = max(litres_candidates, key=lambda x: x['confidence'])
        return {
            'litres': best_match['litres'],
            'pricePerLitre': best_match['pricePerLitre'],
            'fuelType': detected_fuel_type,
            'confidence': best_match['confidence']
        }
    
    return {
        'litres': None,
        'fuelType': detected_fuel_type,
        'confidence': 0
    }
```

---

### Step 3: Data Validation & Merging

**Goal:** Create the "truth" transaction record

```python
def create_transaction(qr_data, ocr_data):
    """
    Merge QR (high confidence) and OCR (variable confidence)
    """
    transaction = {
        # From QR (100% confidence)
        'merchant': qr_data['merchantName'],
        'merchantPIN': qr_data['merchantPIN'],
        'date': qr_data['dateTime'],
        'totalAmount': qr_data['totalAmount'],
        'invoiceNumber': qr_data['invoiceNumber'],
        'receiptNumber': qr_data['receiptNumber'],
        
        # From OCR (variable confidence)
        'litres': ocr_data.get('litres'),
        'pricePerLitre': ocr_data.get('pricePerLitre'),
        'fuelType': ocr_data.get('fuelType'),
        
        # Validation
        'validated': False,
        'confidence': 0,
        'issues': []
    }
    
    # Check what's missing
    if not transaction['litres']:
        transaction['issues'].append({
            'field': 'litres',
            'severity': 'critical',
            'message': 'Could not read fuel volume from receipt'
        })
    
    if not transaction['fuelType']:
        transaction['issues'].append({
            'field': 'fuelType',
            'severity': 'warning',
            'message': 'Fuel type not detected'
        })
    
    # Calculate overall confidence
    if transaction['litres'] and transaction['pricePerLitre']:
        transaction['validated'] = True
        transaction['confidence'] = ocr_data['confidence']
    
    return transaction
```

---

## Processing States

| State | Description | Duration | User Action |
|-------|-------------|----------|-------------|
| `uploading` | Image being uploaded to server | 2-5s | Wait |
| `processing` | Server extracting QR + OCR data | 30-120s | Wait (or close app) |
| `verified` | All data extracted successfully | N/A | View transaction |
| `needs_review` | Missing litres or fuel type | N/A | Fill missing fields |
| `failed` | No QR code found or invalid receipt | N/A | Retry or manual entry |

---

## Confidence Scoring

```python
def calculate_confidence(price_per_litre, fuel_type):
    """
    Calculate OCR confidence based on price validation
    """
    if not fuel_type:
        # No fuel type - general validation
        if 160 <= price_per_litre <= 250:
            return 85
        return 30
    
    # Fuel-specific validation
    price_ranges = {
        'PETROL': (170, 230),
        'DIESEL': (160, 220),
        'SUPER': (180, 240),
        'GAS': (100, 150),
        'KEROSENE': (140, 180)
    }
    
    min_price, max_price = price_ranges.get(fuel_type, (160, 250))
    
    if min_price <= price_per_litre <= max_price:
        return 99  # High confidence
    elif min_price - 20 <= price_per_litre <= max_price + 20:
        return 70  # Medium confidence
    else:
        return 20  # Low confidence
```

---

## Notifications

When processing completes, send push notification:

**Success:**
```json
{
  "title": "Receipt Verified ✓",
  "body": "5,700 KES • 25.5L Diesel @ Mascot Petroleum",
  "action": "open_transaction",
  "transactionId": "txn_xyz789"
}
```

**Needs Review:**
```json
{
  "title": "Action Required",
  "body": "We captured 5,700 KES but need the litres amount",
  "action": "review_receipt",
  "receiptId": "rcpt_abc123"
}
```

---

## Data Storage Schema

### receipts table
```sql
CREATE TABLE receipts (
  id VARCHAR(50) PRIMARY KEY,
  user_id VARCHAR(50) NOT NULL,
  image_url TEXT NOT NULL,
  uploaded_at TIMESTAMP NOT NULL,
  processed_at TIMESTAMP,
  status VARCHAR(20),
  qr_data JSONB,
  ocr_data JSONB,
  issues JSONB,
  INDEX(user_id, uploaded_at)
);
```

### transactions table
```sql
CREATE TABLE transactions (
  id VARCHAR(50) PRIMARY KEY,
  receipt_id VARCHAR(50) REFERENCES receipts(id),
  user_id VARCHAR(50) NOT NULL,
  
  -- Merchant
  merchant_name VARCHAR(255),
  merchant_pin VARCHAR(50),
  location VARCHAR(255),
  
  -- Financial
  date TIMESTAMP NOT NULL,
  total_amount DECIMAL(10, 2) NOT NULL,
  litres DECIMAL(6, 2),
  price_per_litre DECIMAL(6, 2),
  
  -- Fuel
  fuel_type VARCHAR(20),
  
  -- KRA
  invoice_number VARCHAR(100),
  receipt_number VARCHAR(100),
  till_number VARCHAR(50),
  
  -- Validation
  validated BOOLEAN DEFAULT FALSE,
  confidence INT,
  
  INDEX(user_id, date),
  INDEX(merchant_pin)
);
```

---

## Testing the Algorithm

**Test Cases:**

1. **Perfect Receipt (Rubis)** - Has QR + Clear text
   - Expected: 100% extraction, verified
   
2. **Handwritten Receipt (Mascot)** - Has QR + Handwritten litres
   - Expected: QR extracted, OCR may fail → needs_review
   
3. **PDQ Slip (KCB Payment)** - Has payment details only
   - Expected: Amount extracted, no litres → needs_review
   
4. **No QR Receipt** - Old style receipt
   - Expected: Full OCR fallback, lower confidence

---

## Error Handling

```python
def process_receipt_with_fallback(image_path):
    """
    Robust processing with fallback strategies
    """
    try:
        # Try QR extraction first
        qr_data = extract_qr_code(image_path)
        if not qr_data:
            # Fallback: Full OCR extraction
            qr_data = extract_total_from_ocr(image_path)
        
        # Extract fuel data
        ocr_data = extract_fuel_data(image_path, qr_data['totalAmount'])
        
        # Create transaction
        transaction = create_transaction(qr_data, ocr_data)
        
        return {
            'status': 'verified' if transaction['validated'] else 'needs_review',
            'transaction': transaction
        }
    
    except Exception as e:
        log_error(e)
        return {
            'status': 'failed',
            'error': str(e)
        }
```

---

**Summary:**

This backend processes receipts by:
1. **QR Code → High Confidence Data** (Merchant, Amount, Date)
2. **OCR → Fuel Data** (Litres, Type) validated by price math
3. **Merge → Transaction** with confidence scoring
4. **Notify User → Success or Review Required**
