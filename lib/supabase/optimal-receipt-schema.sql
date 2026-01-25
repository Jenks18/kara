-- ============================================
-- OPTIMIZED RECEIPT PROCESSING SCHEMA
-- Combines template-based + store-specific regex patterns
-- Handles conventional AND non-conventional receipts
-- ============================================

-- ============================================
-- CORE TABLES (Enhanced)
-- ============================================

-- STORES: Merchant registry with metadata
CREATE TABLE IF NOT EXISTS stores (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
  
  -- Identity
  name TEXT NOT NULL, -- "Total Westlands", "Naivas Junction"
  chain_name TEXT, -- "Total", "Naivas"
  category TEXT NOT NULL, -- fuel, grocery, restaurant, pharmacy, etc.
  
  -- Tax IDs
  kra_pin TEXT UNIQUE,
  till_number TEXT,
  vat_number TEXT,
  
  -- Location
  latitude NUMERIC(10, 7),
  longitude NUMERIC(10, 7),
  address TEXT,
  
  -- Statistics
  receipt_count INTEGER DEFAULT 0,
  parsing_success_rate NUMERIC(5, 2) DEFAULT 0.00,
  
  -- Metadata
  verified BOOLEAN DEFAULT FALSE,
  active BOOLEAN DEFAULT TRUE
);

-- RECEIPT TEMPLATES: Format definitions per store/chain
-- ONE STORE CAN HAVE MULTIPLE TEMPLATES (your requirement!)
CREATE TABLE IF NOT EXISTS receipt_templates (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
  
  -- ============================================
  -- ASSOCIATION (Multiple templates per store!)
  -- ============================================
  store_id UUID REFERENCES stores(id) ON DELETE CASCADE,
  chain_name TEXT, -- If null, uses store_id; if set, applies to all stores in chain
  
  -- Template Info
  name TEXT NOT NULL, -- "Total Thermal Receipt v2", "Total A4 Receipt", "Total Handwritten"
  description TEXT, -- "Used at pump, thermal printer, 80mm width"
  version INTEGER DEFAULT 1,
  priority INTEGER DEFAULT 100, -- Higher priority templates tried first (100, 90, 80...)
  active BOOLEAN DEFAULT TRUE,
  
  -- ============================================
  -- RECEIPT FORMAT IDENTIFICATION
  -- Multiple receipt types per store possible!
  -- ============================================
  receipt_type TEXT NOT NULL, -- fuel, grocery, restaurant, pharmacy, retail, service
  format_type TEXT NOT NULL, -- thermal, a4, digital_kra, handwritten, mobile_app
  
  -- How to identify this specific template?
  identification_rules JSONB NOT NULL,
  /* Example for Total - they might have 3 different templates:
  Template 1 (KRA-compliant thermal):
  {
    "has_qr_code": true,
    "has_kra_pin": true,
    "ocr_keywords": ["Total Kenya", "CU Invoice"],
    "width_range": {"min": 70, "max": 85}, // mm
    "typical_height": {"min": 150, "max": 300}
  }
  
  Template 2 (Old non-KRA thermal):
  {
    "has_qr_code": false,
    "has_kra_pin": false,
    "ocr_keywords": ["Total", "Thank You"],
    "format_markers": ["Receipt No", "Pump"]
  }
  
  Template 3 (A4 corporate invoice):
  {
    "has_qr_code": true,
    "format_type": "a4",
    "ocr_keywords": ["TAX INVOICE", "Total Kenya Limited"]
  }
  */
  
  -- ============================================
  -- DATA SOURCES (what data is available)
  -- ============================================
  has_qr_code BOOLEAN DEFAULT FALSE,
  has_kra_compliance BOOLEAN DEFAULT FALSE,
  has_structured_ocr BOOLEAN DEFAULT TRUE,
  
  -- PARSING STRATEGY (prioritized)
  parsing_strategy JSONB NOT NULL,
  /* Example:
  {
    "primary": "kra_scraper", // Try KRA first
    "secondary": "qr_parser", // Then QR code
    "tertiary": "store_regex_qr", // QR-specific regex
    "fallback": "store_regex_ocr", // OCR-specific regex
    "last_resort": "ai_vision"
  }
  */
  
  -- ============================================
  -- REGEX PATTERNS (Separated: QR vs OCR!)
  -- ============================================
  
  -- QR CODE REGEX (your requirement - separate!)
  qr_regex_patterns JSONB,
  /* Example for parsing QR code text:
  {
    "invoice_number": {
      "patterns": ["invoiceNo=([A-Z0-9]+)", "inv:([0-9]+)"],
      "required": true,
      "extraction_method": "qr_text"
    },
    "amount": {
      "patterns": ["amt=([0-9.]+)", "total:([0-9.]+)"],
      "data_type": "currency"
    }
  }
  */
  
  -- OCR TEXT REGEX (your requirement - separate!)
  ocr_regex_patterns JSONB NOT NULL,
  /* Example for parsing OCR text:
  {
    "invoice_number": {
      "patterns": [
        "Invoice\\s*No\\.?[:\\s]*([A-Z0-9\\-]+)",
        "CU\\s*Invoice[:\\s]*([0-9]+)"
      ],
      "required": true,
      "typical_format": "TKL-2025-0001234",
      "line_position": "top_third" // where to look
    },
    "total_amount": {
      "patterns": [
        "TOTAL[:\\s]*KES[\\s]*([0-9,]+\\.?[0-9]{0,2})",
        "Amount\\s*Paid[:\\s]*([0-9,]+)"
      ],
      "required": true,
      "data_type": "currency",
      "validation": {"min": 1, "max": 100000},
      "line_position": "bottom_third"
    },
    "litres": {
      "patterns": [
        "([0-9]+\\.?[0-9]*)\\s*[Ll](itres?|trs?)",
        "Volume[:\\s]*([0-9.]+)\\s*L"
      ],
      "required_for": ["fuel"],
      "data_type": "decimal",
      "typical_range": {"min": 1, "max": 200}
    },
    "fuel_type": {
      "patterns": [
        "(SUPER|DIESEL|VPOWER|UNLEADED)",
        "Product[:\\s]*(\\w+)"
      ],
      "required_for": ["fuel"],
      "enum": ["SUPER", "DIESEL", "VPOWER", "UNLEADED", "KEROSENE"]
    },
    "merchant_name": {
      "patterns": [
        "^([A-Z][A-Z\\s&]+)(?:\\n|$)",
        "Supplier\\s*Name[:\\s]*(.+)"
      ],
      "required": true,
      "line_position": "top"
    },
    "date": {
      "patterns": [
        "(\\d{1,2}[/-]\\d{1,2}[/-]\\d{2,4})",
        "Date[:\\s]*(\\d{1,2}/\\d{1,2}/\\d{4})"
      ],
      "required": true,
      "validation": "date"
    }
  }
  */
  
  -- QR CODE MAPPINGS (for stores with QR)
  qr_field_mappings JSONB,
  /* Example:
  {
    "invoice": "invoice_number",
    "amt": "total_amount",
    "date": "transaction_date",
    "merchant": "merchant_name"
  }
  */
  
  -- KRA FIELD MAPPINGS (for KRA-compliant receipts)
  kra_field_mappings JSONB,
  /* Example:
  {
    "Control Unit Invoice Number": "invoice_number",
    "Supplier Name": "merchant_name",
    "Total Invoice Amount": "total_amount",
    "Total Tax Amount": "vat_amount",
    "Invoice Date": "transaction_date"
  }
  */
  
  -- AI VISION PROMPTS (for complex receipts)
  ai_vision_prompt TEXT,
  /* Example for handwritten receipt:
  "Extract the following from this handwritten receipt: merchant name, date, items with quantities and prices, total amount. The receipt may be in Swahili."
  */
  
  -- VALIDATION RULES
  validation_rules JSONB,
  /* Example:
  {
    "fuel_price_per_litre": {"min": 160, "max": 250},
    "grocery_item_price": {"min": 1, "max": 50000},
    "require_kra_for_amounts_over": 1000,
    "amount_precision": 2
  }
  */
  
  -- PERFORMANCE
  success_rate NUMERIC(5, 2) DEFAULT 0.00,
  avg_confidence NUMERIC(5, 2) DEFAULT 0.00,
  total_uses INTEGER DEFAULT 0,
  last_used_at TIMESTAMP WITH TIME ZONE
);

-- RAW RECEIPTS: Complete data preservation with CLEAR SEPARATION
CREATE TABLE IF NOT EXISTS raw_receipts (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
  
  -- USER OWNERSHIP (tied to person)
  user_id UUID NOT NULL, -- Clerk user ID or similar
  user_email TEXT NOT NULL,
  workspace_id UUID,
  
  -- Image
  image_url TEXT NOT NULL,
  image_hash TEXT UNIQUE, -- SHA256 for duplicate detection
  
  -- ============================================
  -- SEPARATED DATA SOURCES (your requirement!)
  -- ============================================
  
  -- 1. QR CODE DATA (completely separate)
  qr_code_found BOOLEAN DEFAULT FALSE,
  qr_code_type TEXT, -- QR_CODE, AZTEC, DATA_MATRIX, etc.
  qr_code_raw_text TEXT, -- Exact raw string from QR
  qr_code_parsed JSONB, -- Structured data extracted from QR
  /* Example qr_code_parsed:
  {
    "format": "url",
    "url": "https://itax.kra.go.ke/...",
    "is_kra": true,
    "fields": {
      "invoice": "0431598170000030659",
      "merchant": "DANKA AFRICA"
    }
  }
  */
  qr_code_confidence NUMERIC(5, 2), -- 0-100
  qr_code_position JSONB, -- Bounding box where QR was found
  
  -- 2. OCR TEXT DATA (completely separate)
  ocr_full_text TEXT, -- Complete text extraction from image
  ocr_lines JSONB, -- Array of lines with positions
  /* Example ocr_lines:
  [
    {"text": "TOTAL KENYA", "confidence": 98.5, "bbox": {...}},
    {"text": "Invoice No: TKL-2025-001", "confidence": 95.2, "bbox": {...}}
  ]
  */
  ocr_confidence NUMERIC(5, 2), -- 0-100 average confidence
  ocr_language TEXT DEFAULT 'en', -- en, sw, mix
  ocr_source TEXT, -- google_vision, tesseract, etc.
  
  -- 3. KRA SCRAPED DATA (completely separate)
  kra_data_available BOOLEAN DEFAULT FALSE,
  kra_scraped_at TIMESTAMP WITH TIME ZONE,
  kra_data JSONB, -- Official data from KRA website
  /* Example kra_data:
  {
    "invoiceNumber": "0431598170000030659",
    "merchantName": "DANKA AFRICA (K) LIMITED",
    "totalAmount": 1000,
    "vatAmount": 137,
    "taxableAmount": 862.07,
    "invoiceDate": "22/12/2025",
    "verified": true
  }
  */
  kra_verification_status TEXT, -- success, failed, not_applicable
  
  -- 4. AI VISION DATA (completely separate) 
  ai_vision_data JSONB, -- Google Vision full response
  ai_extracted_fields JSONB, -- Structured data from AI
  ai_confidence NUMERIC(5, 2),
  
  -- ============================================
  -- METADATA
  -- ============================================
  file_size_bytes INTEGER,
  image_dimensions JSONB, -- {"width": 1920, "height": 1080}
  mime_type TEXT,
  
  -- GPS/Location
  location JSONB, -- {"lat": -1.286389, "lng": 36.817223, "accuracy": 10}
  captured_at TIMESTAMP WITH TIME ZONE,
  
  -- PROCESSING
  processing_status TEXT DEFAULT 'pending', -- pending, processing, parsed, failed, manual_review
  processing_attempts INTEGER DEFAULT 0,
  last_error TEXT,
  
  -- STORE DETECTION
  detected_store_id UUID REFERENCES stores(id),
  detected_template_id UUID REFERENCES receipt_templates(id),
  detection_confidence NUMERIC(3, 2), -- 0.00 to 1.00
  detection_method TEXT, -- qr_match, ocr_pattern, ai_vision, manual
  
  -- CONSTRAINTS
  CONSTRAINT raw_receipts_user_check CHECK (user_email IS NOT NULL AND user_email != '')
);

-- PARSED RECEIPTS: Structured, validated data
CREATE TABLE IF NOT EXISTS parsed_receipts (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
  
  -- References
  raw_receipt_id UUID REFERENCES raw_receipts(id) ON DELETE CASCADE UNIQUE,
  store_id UUID REFERENCES stores(id),
  template_id UUID REFERENCES receipt_templates(id),
  
  -- USER OWNERSHIP (tied to person)
  user_id UUID NOT NULL,
  user_email TEXT NOT NULL,
  workspace_id UUID,
  
  -- ============================================
  -- DATA SOURCE TRACKING (your requirement!)
  -- Show which field came from which source
  -- ============================================
  field_sources JSONB NOT NULL,
  /* Example:
  {
    "invoice_number": {
      "value": "0431598170000030659",
      "source": "kra",
      "confidence": 100,
      "qr_value": "0431598170000030659",
      "ocr_value": null,
      "kra_value": "0431598170000030659"
    },
    "total_amount": {
      "value": 1000.00,
      "source": "kra",
      "confidence": 100,
      "qr_value": null,
      "ocr_value": 1000,
      "kra_value": 1000.00
    },
    "merchant_name": {
      "value": "DANKA AFRICA (K) LIMITED",
      "source": "kra",
      "confidence": 100,
      "qr_value": "DANKA",
      "ocr_value": "DANKA AFRICA",
      "kra_value": "DANKA AFRICA (K) LIMITED"
    }
  }
  */
  
  -- ============================================
  -- STANDARD FIELDS (normalized)
  -- ============================================
  merchant_name TEXT NOT NULL,
  merchant_pin TEXT,
  invoice_number TEXT,
  till_number TEXT,
  
  -- TRANSACTION
  transaction_date DATE NOT NULL,
  transaction_time TIME,
  transaction_datetime TIMESTAMP WITH TIME ZONE,
  
  -- FINANCIAL
  subtotal NUMERIC(12, 2),
  tax_amount NUMERIC(12, 2),
  discount_amount NUMERIC(12, 2),
  total_amount NUMERIC(12, 2) NOT NULL,
  currency TEXT DEFAULT 'KES',
  
  -- PAYMENT
  payment_method TEXT, -- cash, card, mpesa, bank_transfer
  payment_reference TEXT,
  
  -- CATEGORY-SPECIFIC DATA (flexible JSON)
  category_data JSONB,
  /* Example for fuel:
  {
    "fuel_type": "SUPER",
    "litres": 45.32,
    "price_per_litre": 180.50,
    "pump_number": "3",
    "attendant": "John"
  }
  
  Example for grocery:
  {
    "items": [
      {"name": "Milk", "qty": 2, "unit_price": 120, "total": 240},
      {"name": "Bread", "qty": 1, "unit_price": 60, "total": 60}
    ],
    "loyalty_card": "1234567890",
    "points_earned": 30
  }
  */
  
  -- DATA QUALITY
  confidence_score NUMERIC(5, 2), -- Overall confidence 0-100
  field_confidence JSONB, -- Per-field confidence scores
  data_source TEXT, -- kra_verified, qr_parsed, ocr_parsed, ai_extracted, manual_entry
  kra_verified BOOLEAN DEFAULT FALSE,
  
  -- VALIDATION
  validation_status TEXT DEFAULT 'pending', -- pending, passed, failed, needs_review
  validation_errors JSONB, -- Array of validation issues
  manually_corrected BOOLEAN DEFAULT FALSE,
  corrected_by TEXT,
  corrected_at TIMESTAMP WITH TIME ZONE,
  
  -- CONSTRAINTS
  CONSTRAINT parsed_receipts_user_check CHECK (user_email IS NOT NULL AND user_email != ''),
  CONSTRAINT parsed_receipts_amount_check CHECK (total_amount > 0)
);

-- NON-CONVENTIONAL RECEIPTS (catch-all for unusual formats)
CREATE TABLE IF NOT EXISTS non_conventional_receipts (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
  
  raw_receipt_id UUID REFERENCES raw_receipts(id) ON DELETE CASCADE UNIQUE,
  
  -- Why was it flagged as non-conventional?
  reason TEXT NOT NULL, -- no_template_match, handwritten, damaged, foreign_language, custom_format
  
  -- AI-extracted data (best effort)
  ai_extracted_data JSONB,
  ai_confidence NUMERIC(5, 2),
  
  -- Manual review
  requires_manual_review BOOLEAN DEFAULT TRUE,
  reviewed BOOLEAN DEFAULT FALSE,
  reviewed_by TEXT,
  reviewed_at TIMESTAMP WITH TIME ZONE,
  
  -- Learning: Create template from this?
  create_template_suggested BOOLEAN DEFAULT FALSE,
  template_created UUID REFERENCES receipt_templates(id)
);

-- ============================================
-- LEARNING & IMPROVEMENT
-- ============================================

-- Track which regex patterns work best per store
CREATE TABLE IF NOT EXISTS pattern_performance (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
  
  template_id UUID REFERENCES receipt_templates(id) ON DELETE CASCADE,
  field_name TEXT NOT NULL,
  pattern TEXT NOT NULL,
  
  -- Performance metrics
  success_count INTEGER DEFAULT 0,
  failure_count INTEGER DEFAULT 0,
  avg_confidence NUMERIC(5, 2),
  last_success_at TIMESTAMP WITH TIME ZONE,
  
  UNIQUE(template_id, field_name, pattern)
);

-- Store user corrections to improve templates
CREATE TABLE IF NOT EXISTS parsing_corrections (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
  
  parsed_receipt_id UUID REFERENCES parsed_receipts(id) ON DELETE CASCADE,
  template_id UUID REFERENCES receipt_templates(id),
  
  field_name TEXT NOT NULL,
  incorrect_value TEXT,
  correct_value TEXT NOT NULL,
  corrected_by TEXT NOT NULL,
  
  -- Use this to improve regex patterns
  applied_to_template BOOLEAN DEFAULT FALSE
);

-- ============================================
-- INDEXES
-- ============================================

CREATE INDEX idx_raw_receipts_user_id ON raw_receipts(user_id);
CREATE INDEX idx_raw_receipts_user_email ON raw_receipts(user_email);
CREATE INDEX idx_raw_receipts_status ON raw_receipts(processing_status);
CREATE INDEX idx_raw_receipts_store ON raw_receipts(detected_store_id);
CREATE INDEX idx_raw_receipts_hash ON raw_receipts(image_hash);
CREATE INDEX idx_raw_receipts_workspace ON raw_receipts(workspace_id);

CREATE INDEX idx_parsed_receipts_user_id ON parsed_receipts(user_id);
CREATE INDEX idx_parsed_receipts_user_email ON parsed_receipts(user_email);
CREATE INDEX idx_parsed_receipts_raw ON parsed_receipts(raw_receipt_id);
CREATE INDEX idx_parsed_receipts_store ON parsed_receipts(store_id);
CREATE INDEX idx_parsed_receipts_date ON parsed_receipts(transaction_date);
CREATE INDEX idx_parsed_receipts_merchant ON parsed_receipts(merchant_name);
CREATE INDEX idx_parsed_receipts_invoice ON parsed_receipts(invoice_number);
CREATE INDEX idx_parsed_receipts_workspace ON parsed_receipts(workspace_id);

CREATE INDEX idx_stores_chain ON stores(chain_name);
CREATE INDEX idx_stores_category ON stores(category);
CREATE INDEX idx_stores_pin ON stores(kra_pin);

CREATE INDEX idx_templates_store ON receipt_templates(store_id);
CREATE INDEX idx_templates_chain ON receipt_templates(chain_name);
CREATE INDEX idx_templates_active ON receipt_templates(active) WHERE active = TRUE;
CREATE INDEX idx_templates_priority ON receipt_templates(priority DESC); -- Get highest priority first
CREATE INDEX idx_templates_store_active ON receipt_templates(store_id, active, priority) WHERE active = TRUE; -- For efficient multi-template lookup

-- ============================================
-- FUNCTIONS
-- ============================================

-- Get all active templates for a store (sorted by priority)
-- Handles multiple templates per store!
CREATE OR REPLACE FUNCTION get_store_templates(p_store_id UUID, p_chain_name TEXT DEFAULT NULL)
RETURNS TABLE (
  template_id UUID,
  template_name TEXT,
  priority INTEGER,
  receipt_type TEXT,
  format_type TEXT,
  has_qr BOOLEAN,
  has_kra BOOLEAN
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    id,
    name,
    priority,
    receipt_type,
    format_type,
    has_qr_code,
    has_kra_compliance
  FROM receipt_templates
  WHERE active = TRUE
    AND (
      store_id = p_store_id 
      OR (chain_name = p_chain_name AND p_chain_name IS NOT NULL)
    )
  ORDER BY priority DESC, version DESC;
END;
$$ LANGUAGE plpgsql;

-- Update store statistics when receipt is parsed
CREATE OR REPLACE FUNCTION update_store_stats()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE stores 
  SET 
    receipt_count = receipt_count + 1,
    parsing_success_rate = (
      SELECT (COUNT(*) FILTER (WHERE validation_status = 'passed')::NUMERIC / COUNT(*) * 100)
      FROM parsed_receipts 
      WHERE store_id = NEW.store_id
    )
  WHERE id = NEW.store_id;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_store_stats
  AFTER INSERT ON parsed_receipts
  FOR EACH ROW
  EXECUTE FUNCTION update_store_stats();

-- Update template performance
CREATE OR REPLACE FUNCTION update_template_performance()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE receipt_templates
  SET
    total_uses = total_uses + 1,
    success_rate = (
      SELECT (COUNT(*) FILTER (WHERE validation_status = 'passed')::NUMERIC / COUNT(*) * 100)
      FROM parsed_receipts
      WHERE template_id = NEW.template_id
    ),
    last_used_at = NOW()
  WHERE id = NEW.template_id;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_template_performance
  AFTER INSERT ON parsed_receipts
  FOR EACH ROW
  EXECUTE FUNCTION update_template_performance();
