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
CREATE TABLE IF NOT EXISTS receipt_templates (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
  
  -- Association (can be store-specific OR chain-wide)
  store_id UUID REFERENCES stores(id) ON DELETE CASCADE,
  chain_name TEXT, -- If null, uses store_id; if set, applies to all stores in chain
  
  -- Template Info
  name TEXT NOT NULL, -- "Total Thermal Receipt v2"
  version INTEGER DEFAULT 1,
  priority INTEGER DEFAULT 100, -- Higher priority templates tried first
  active BOOLEAN DEFAULT TRUE,
  
  -- Receipt Type
  receipt_type TEXT NOT NULL, -- fuel, grocery, restaurant, pharmacy, retail
  format_type TEXT NOT NULL, -- thermal, a4, digital_kra, handwritten
  
  -- DATA SOURCES (what data is available)
  has_qr_code BOOLEAN DEFAULT FALSE,
  has_kra_compliance BOOLEAN DEFAULT FALSE, -- Can scrape from KRA website
  has_structured_ocr BOOLEAN DEFAULT TRUE, -- OCR is reliable
  
  -- PARSING STRATEGY (prioritized)
  parsing_strategy JSONB NOT NULL,
  /* Example:
  {
    "primary": "kra_scraper", // Try KRA first
    "secondary": "qr_parser", // Then QR code
    "fallback": "store_regex", // Then store-specific regex
    "last_resort": "ai_vision" // Finally use AI
  }
  */
  
  -- STORE-SPECIFIC REGEX PATTERNS (Your idea!)
  regex_patterns JSONB NOT NULL,
  /* Example for Total fuel receipt:
  {
    "invoice_number": {
      "patterns": [
        "Invoice\\s*No\\.?[:\\s]*([A-Z0-9\\-]+)",
        "CU\\s*Invoice[:\\s]*([0-9]+)"
      ],
      "required": true,
      "validation": "alphanumeric",
      "typical_format": "TKL-2025-0001234"
    },
    "total_amount": {
      "patterns": [
        "TOTAL[:\\s]*KES[\\s]*([0-9,]+\\.?[0-9]{0,2})",
        "Amount\\s*Paid[:\\s]*([0-9,]+\\.?[0-9]{0,2})"
      ],
      "required": true,
      "data_type": "currency",
      "validation": {"min": 1, "max": 100000}
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
      "required": true
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

-- RAW RECEIPTS: Complete data preservation
CREATE TABLE IF NOT EXISTS raw_receipts (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
  
  -- User
  user_email TEXT NOT NULL,
  workspace_id UUID,
  
  -- Image
  image_url TEXT NOT NULL,
  image_hash TEXT UNIQUE, -- SHA256 for duplicate detection
  
  -- RAW DATA FROM ALL SOURCES
  raw_google_vision JSONB, -- Google Vision API response
  raw_qr_data JSONB, -- QR code raw data
  raw_kra_data JSONB, -- KRA website scrape
  raw_ocr_text TEXT, -- Full OCR text
  
  -- METADATA
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
  detection_method TEXT -- qr_match, ocr_pattern, ai_vision, manual
);

-- PARSED RECEIPTS: Structured, validated data
CREATE TABLE IF NOT EXISTS parsed_receipts (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
  
  -- References
  raw_receipt_id UUID REFERENCES raw_receipts(id) ON DELETE CASCADE UNIQUE,
  store_id UUID REFERENCES stores(id),
  template_id UUID REFERENCES receipt_templates(id),
  
  -- STANDARD FIELDS (normalized)
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
  corrected_at TIMESTAMP WITH TIME ZONE
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

CREATE INDEX idx_raw_receipts_user ON raw_receipts(user_email);
CREATE INDEX idx_raw_receipts_status ON raw_receipts(processing_status);
CREATE INDEX idx_raw_receipts_store ON raw_receipts(detected_store_id);
CREATE INDEX idx_raw_receipts_hash ON raw_receipts(image_hash);

CREATE INDEX idx_parsed_receipts_raw ON parsed_receipts(raw_receipt_id);
CREATE INDEX idx_parsed_receipts_store ON parsed_receipts(store_id);
CREATE INDEX idx_parsed_receipts_date ON parsed_receipts(transaction_date);
CREATE INDEX idx_parsed_receipts_merchant ON parsed_receipts(merchant_name);
CREATE INDEX idx_parsed_receipts_invoice ON parsed_receipts(invoice_number);

CREATE INDEX idx_stores_chain ON stores(chain_name);
CREATE INDEX idx_stores_category ON stores(category);
CREATE INDEX idx_stores_pin ON stores(kra_pin);

CREATE INDEX idx_templates_store ON receipt_templates(store_id);
CREATE INDEX idx_templates_chain ON receipt_templates(chain_name);
CREATE INDEX idx_templates_active ON receipt_templates(active) WHERE active = TRUE;

-- ============================================
-- FUNCTIONS
-- ============================================

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
