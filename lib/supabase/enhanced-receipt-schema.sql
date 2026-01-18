-- ============================================
-- ENHANCED RECEIPT PROCESSING SYSTEM
-- Multi-Format, Store-Aware, AI-Powered
-- ============================================

-- ============================================
-- 1. RAW RECEIPT DATA STORAGE
-- Store complete raw data for later analysis
-- ============================================
CREATE TABLE raw_receipts (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
  
  -- User & Workspace
  user_email TEXT NOT NULL,
  workspace_id UUID,
  
  -- Original Receipt
  image_url TEXT NOT NULL,
  image_hash TEXT, -- For duplicate detection
  
  -- Raw Extracted Data (JSON dump of everything we found)
  raw_qr_data JSONB, -- QR code raw text + parsed fields
  raw_ocr_text TEXT, -- Complete OCR text extraction
  raw_kra_data JSONB, -- KRA website scrape results
  raw_gemini_data JSONB, -- AI vision extraction
  
  -- Metadata
  file_size_bytes INTEGER,
  image_width INTEGER,
  image_height INTEGER,
  mime_type TEXT,
  
  -- Location (from GPS/photo metadata)
  latitude NUMERIC(10, 7),
  longitude NUMERIC(10, 7),
  location_accuracy_meters NUMERIC(10, 2),
  captured_at TIMESTAMP WITH TIME ZONE,
  
  -- Processing Status
  processing_status TEXT DEFAULT 'raw', -- raw, parsed, verified, failed
  processing_attempts INTEGER DEFAULT 0,
  last_processed_at TIMESTAMP WITH TIME ZONE,
  
  -- Store Recognition
  recognized_store_id UUID,
  recognition_confidence NUMERIC(3, 2) -- 0.00 to 1.00
);

-- ============================================
-- 2. STORE REGISTRY & RECEIPT TEMPLATES
-- Learn and recognize different stores and their receipt formats
-- ============================================
CREATE TABLE stores (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
  
  -- Store Identity
  name TEXT NOT NULL, -- "Total Kenya", "Shell Westlands", "Carrefour"
  chain_name TEXT, -- "Total", "Shell", "Carrefour"
  category TEXT NOT NULL, -- fuel, grocery, restaurant, retail, etc.
  
  -- Tax Identifiers
  kra_pin TEXT UNIQUE, -- Kenya Revenue Authority PIN
  till_number TEXT,
  paybill_number TEXT,
  
  -- Location
  latitude NUMERIC(10, 7),
  longitude NUMERIC(10, 7),
  address TEXT,
  city TEXT,
  region TEXT,
  country TEXT DEFAULT 'Kenya',
  
  -- Contact
  phone TEXT,
  email TEXT,
  website TEXT,
  
  -- Business Details
  business_type TEXT[], -- ['fuel_station', 'convenience_store']
  currencies TEXT[] DEFAULT ARRAY['KES'], -- Supported currencies
  
  -- Statistics
  receipt_count INTEGER DEFAULT 0,
  total_transactions_amount NUMERIC(12, 2) DEFAULT 0,
  avg_transaction_amount NUMERIC(10, 2),
  first_seen_at TIMESTAMP WITH TIME ZONE,
  last_seen_at TIMESTAMP WITH TIME ZONE,
  
  -- Verification
  verified BOOLEAN DEFAULT FALSE,
  verified_by TEXT,
  verified_at TIMESTAMP WITH TIME ZONE
);

-- ============================================
-- 3. RECEIPT TEMPLATES & PARSERS
-- Store-specific receipt format definitions
-- ============================================
CREATE TABLE receipt_templates (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
  
  -- Association
  store_id UUID REFERENCES stores(id) ON DELETE CASCADE,
  chain_name TEXT, -- Apply to all stores in a chain
  
  -- Template Identity
  name TEXT NOT NULL, -- "Total Fuel Receipt v2", "Carrefour Thermal Receipt"
  version INTEGER DEFAULT 1,
  active BOOLEAN DEFAULT TRUE,
  
  -- Receipt Format
  receipt_type TEXT NOT NULL, -- fuel, grocery, restaurant, retail, service
  format_type TEXT NOT NULL, -- thermal, a4, digital, kra_compliant
  
  -- Parsing Strategy
  parser_type TEXT NOT NULL, -- qr_primary, ocr_structured, ocr_freeform, ai_vision
  parser_config JSONB, -- Custom config for the parser
  
  -- Field Extraction Rules (JSON)
  field_mappings JSONB NOT NULL,
  /* Example field_mappings:
  {
    "invoice_number": {
      "ocr_patterns": ["Invoice No[.:]\\s*([A-Z0-9]+)", "INV[#:]\\s*([0-9]+)"],
      "qr_keys": ["invoice", "inv_no"],
      "kra_field": "Control Unit Invoice Number",
      "required": true,
      "validation": "alphanumeric"
    },
    "total_amount": {
      "ocr_patterns": ["TOTAL[:\\s]*KES?\\s*([0-9,]+\\.?[0-9]*)", "Amount[:\\s]*([0-9,]+)"],
      "qr_keys": ["amount", "total"],
      "kra_field": "Total Invoice Amount",
      "required": true,
      "data_type": "currency",
      "validation": "positive_number"
    },
    "litres": {
      "ocr_patterns": ["([0-9]+\\.?[0-9]*)\\s*[Ll](itres?|trs?)", "QTY[:\\s]*([0-9.]+)"],
      "qr_keys": ["qty", "litres", "volume"],
      "required_for": ["fuel"],
      "data_type": "decimal"
    }
  }
  */
  
  -- Validation Rules
  validation_rules JSONB,
  /* Example validation_rules:
  {
    "fuel_price_range": {"min": 160, "max": 250},
    "require_kra_verification": true,
    "require_qr_code": true,
    "amount_tolerance": 0.01
  }
  */
  
  -- Performance Tracking
  success_rate NUMERIC(5, 2) DEFAULT 0.00, -- % of receipts successfully parsed
  avg_confidence NUMERIC(5, 2) DEFAULT 0.00,
  total_uses INTEGER DEFAULT 0,
  
  -- Examples (for training/testing)
  example_receipt_ids UUID[]
);

-- ============================================
-- 4. PARSED RECEIPT DATA
-- Structured data after template application
-- ============================================
CREATE TABLE parsed_receipts (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
  
  -- References
  raw_receipt_id UUID REFERENCES raw_receipts(id) ON DELETE CASCADE,
  store_id UUID REFERENCES stores(id),
  template_id UUID REFERENCES receipt_templates(id),
  
  -- Standard Fields (normalized)
  merchant_name TEXT,
  merchant_pin TEXT,
  invoice_number TEXT,
  receipt_number TEXT,
  till_number TEXT,
  
  -- Transaction Details
  transaction_date DATE,
  transaction_time TIME,
  transaction_datetime TIMESTAMP WITH TIME ZONE,
  
  -- Financial
  subtotal NUMERIC(10, 2),
  tax_amount NUMERIC(10, 2),
  discount_amount NUMERIC(10, 2),
  total_amount NUMERIC(10, 2) NOT NULL,
  currency TEXT DEFAULT 'KES',
  
  -- Payment
  payment_method TEXT, -- cash, mpesa, card, etc.
  payment_reference TEXT,
  
  -- Category-Specific Data (JSONB for flexibility)
  fuel_data JSONB,
  /* Example fuel_data:
  {
    "litres": 37.62,
    "fuel_type": "DIESEL",
    "price_per_litre": 176.50,
    "pump_number": "03",
    "vehicle_registration": "KBZ 123X",
    "odometer_reading": 45320,
    "attendant": "John M."
  }
  */
  
  grocery_data JSONB,
  /* Example grocery_data:
  {
    "items": [
      {"name": "Milk 1L", "qty": 2, "price": 120, "total": 240},
      {"name": "Bread", "qty": 1, "price": 55, "total": 55}
    ],
    "total_items": 3
  }
  */
  
  restaurant_data JSONB,
  /* Example restaurant_data:
  {
    "table_number": "12",
    "server_name": "Mary",
    "items": [...],
    "service_charge": 150
  }
  */
  
  additional_data JSONB, -- Any other fields
  
  -- Confidence & Validation
  confidence_score NUMERIC(5, 2) NOT NULL, -- 0-100
  validation_status TEXT DEFAULT 'pending', -- pending, validated, flagged, rejected
  validation_issues TEXT[],
  
  -- KRA Verification
  kra_verified BOOLEAN DEFAULT FALSE,
  kra_verification_date TIMESTAMP WITH TIME ZONE,
  kra_verification_method TEXT, -- qr_scrape, api, manual
  
  -- Quality Metrics
  data_completeness NUMERIC(5, 2), -- % of expected fields populated
  ocr_quality_score NUMERIC(5, 2), -- 0-100
  
  CONSTRAINT valid_confidence CHECK (confidence_score >= 0 AND confidence_score <= 100)
);

-- ============================================
-- 5. MANUAL ANNOTATIONS & TRAINING DATA
-- User corrections to improve AI/templates
-- ============================================
CREATE TABLE receipt_annotations (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
  
  -- References
  raw_receipt_id UUID REFERENCES raw_receipts(id) ON DELETE CASCADE,
  parsed_receipt_id UUID REFERENCES parsed_receipts(id),
  store_id UUID REFERENCES stores(id),
  
  -- User who made the correction
  annotator_email TEXT NOT NULL,
  
  -- Corrections
  field_name TEXT NOT NULL,
  original_value TEXT,
  corrected_value TEXT NOT NULL,
  correction_reason TEXT,
  
  -- Learning
  applied_to_template BOOLEAN DEFAULT FALSE,
  confidence_before NUMERIC(5, 2),
  confidence_after NUMERIC(5, 2)
);

-- ============================================
-- 6. STORE GEOFENCES (for automatic recognition)
-- ============================================
CREATE TABLE store_geofences (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  store_id UUID REFERENCES stores(id) ON DELETE CASCADE,
  
  -- Geofence Definition
  center_lat NUMERIC(10, 7) NOT NULL,
  center_lng NUMERIC(10, 7) NOT NULL,
  radius_meters NUMERIC(10, 2) NOT NULL,
  
  -- Metadata
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
  active BOOLEAN DEFAULT TRUE,
  
  -- Performance
  match_count INTEGER DEFAULT 0,
  last_match_at TIMESTAMP WITH TIME ZONE
);

-- ============================================
-- 7. PROCESSING LOGS (for debugging)
-- ============================================
CREATE TABLE receipt_processing_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
  
  raw_receipt_id UUID REFERENCES raw_receipts(id) ON DELETE CASCADE,
  
  stage TEXT NOT NULL, -- qr_decode, kra_scrape, ocr_extract, template_match, ai_enhance
  status TEXT NOT NULL, -- started, completed, failed
  duration_ms INTEGER,
  
  input_data JSONB,
  output_data JSONB,
  error_message TEXT,
  
  cost_usd NUMERIC(10, 6), -- Track API costs (Gemini, etc.)
  
  metadata JSONB
);

-- ============================================
-- INDEXES for Performance
-- ============================================

-- Raw Receipts
CREATE INDEX idx_raw_receipts_user ON raw_receipts(user_email);
CREATE INDEX idx_raw_receipts_workspace ON raw_receipts(workspace_id);
CREATE INDEX idx_raw_receipts_store ON raw_receipts(recognized_store_id);
CREATE INDEX idx_raw_receipts_status ON raw_receipts(processing_status);
CREATE INDEX idx_raw_receipts_hash ON raw_receipts(image_hash);
CREATE INDEX idx_raw_receipts_location ON raw_receipts USING GIST (
  point(longitude, latitude)
);

-- Stores
CREATE INDEX idx_stores_chain ON stores(chain_name);
CREATE INDEX idx_stores_category ON stores(category);
CREATE INDEX idx_stores_kra_pin ON stores(kra_pin);
CREATE INDEX idx_stores_location ON stores USING GIST (
  point(longitude, latitude)
);

-- Receipt Templates
CREATE INDEX idx_templates_store ON receipt_templates(store_id);
CREATE INDEX idx_templates_chain ON receipt_templates(chain_name);
CREATE INDEX idx_templates_type ON receipt_templates(receipt_type);
CREATE INDEX idx_templates_active ON receipt_templates(active);

-- Parsed Receipts
CREATE INDEX idx_parsed_receipts_raw ON parsed_receipts(raw_receipt_id);
CREATE INDEX idx_parsed_receipts_store ON parsed_receipts(store_id);
CREATE INDEX idx_parsed_receipts_template ON parsed_receipts(template_id);
CREATE INDEX idx_parsed_receipts_invoice ON parsed_receipts(invoice_number);
CREATE INDEX idx_parsed_receipts_date ON parsed_receipts(transaction_date);
CREATE INDEX idx_parsed_receipts_validation ON parsed_receipts(validation_status);

-- Annotations
CREATE INDEX idx_annotations_receipt ON receipt_annotations(raw_receipt_id);
CREATE INDEX idx_annotations_store ON receipt_annotations(store_id);
CREATE INDEX idx_annotations_annotator ON receipt_annotations(annotator_email);

-- Geofences
CREATE INDEX idx_geofences_store ON store_geofences(store_id);
CREATE INDEX idx_geofences_active ON store_geofences(active);

-- Processing Logs
CREATE INDEX idx_logs_receipt ON receipt_processing_logs(raw_receipt_id);
CREATE INDEX idx_logs_stage ON receipt_processing_logs(stage);
CREATE INDEX idx_logs_created ON receipt_processing_logs(created_at DESC);

-- ============================================
-- VIEWS for Common Queries
-- ============================================

-- Complete receipt view (joins all data)
CREATE VIEW receipt_complete AS
SELECT 
  rr.id,
  rr.created_at,
  rr.user_email,
  rr.image_url,
  rr.processing_status,
  
  s.name as store_name,
  s.chain_name,
  s.category as store_category,
  s.kra_pin,
  
  pr.invoice_number,
  pr.transaction_datetime,
  pr.total_amount,
  pr.confidence_score,
  pr.validation_status,
  pr.kra_verified,
  
  pr.fuel_data,
  pr.grocery_data,
  pr.restaurant_data,
  
  rt.name as template_name,
  rt.parser_type,
  
  rr.latitude,
  rr.longitude
FROM raw_receipts rr
LEFT JOIN parsed_receipts pr ON pr.raw_receipt_id = rr.id
LEFT JOIN stores s ON s.id = rr.recognized_store_id
LEFT JOIN receipt_templates rt ON rt.id = pr.template_id;

-- Store performance metrics
CREATE VIEW store_metrics AS
SELECT 
  s.id,
  s.name,
  s.category,
  COUNT(DISTINCT rr.id) as total_receipts,
  COUNT(DISTINCT pr.id) as successfully_parsed,
  ROUND(COUNT(DISTINCT pr.id)::NUMERIC / NULLIF(COUNT(DISTINCT rr.id), 0) * 100, 2) as parse_success_rate,
  AVG(pr.confidence_score) as avg_confidence,
  SUM(pr.total_amount) as total_revenue,
  AVG(pr.total_amount) as avg_transaction,
  MAX(rr.created_at) as last_receipt_date
FROM stores s
LEFT JOIN raw_receipts rr ON rr.recognized_store_id = s.id
LEFT JOIN parsed_receipts pr ON pr.raw_receipt_id = rr.id
GROUP BY s.id, s.name, s.category;

-- ============================================
-- ROW LEVEL SECURITY
-- ============================================

ALTER TABLE raw_receipts ENABLE ROW LEVEL SECURITY;
ALTER TABLE stores ENABLE ROW LEVEL SECURITY;
ALTER TABLE receipt_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE parsed_receipts ENABLE ROW LEVEL SECURITY;
ALTER TABLE receipt_annotations ENABLE ROW LEVEL SECURITY;
ALTER TABLE store_geofences ENABLE ROW LEVEL SECURITY;
ALTER TABLE receipt_processing_logs ENABLE ROW LEVEL SECURITY;

-- Basic policies (update based on your auth system)
CREATE POLICY "Users can access their own receipts" ON raw_receipts
  FOR ALL USING (auth.email() = user_email);

CREATE POLICY "All users can read stores" ON stores
  FOR SELECT USING (true);

CREATE POLICY "All users can read templates" ON receipt_templates
  FOR SELECT USING (true);

-- ============================================
-- FUNCTIONS & TRIGGERS
-- ============================================

-- Auto-update store statistics
CREATE OR REPLACE FUNCTION update_store_statistics()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE stores SET
    receipt_count = (
      SELECT COUNT(*) FROM raw_receipts WHERE recognized_store_id = NEW.recognized_store_id
    ),
    last_seen_at = NEW.created_at
  WHERE id = NEW.recognized_store_id;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_store_stats
  AFTER INSERT ON raw_receipts
  FOR EACH ROW
  WHEN (NEW.recognized_store_id IS NOT NULL)
  EXECUTE FUNCTION update_store_statistics();

-- Auto-update template performance
CREATE OR REPLACE FUNCTION update_template_performance()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE receipt_templates SET
    total_uses = total_uses + 1,
    avg_confidence = (
      SELECT AVG(confidence_score)
      FROM parsed_receipts
      WHERE template_id = NEW.template_id
    ),
    success_rate = (
      SELECT COUNT(*)::NUMERIC / NULLIF(total_uses + 1, 0) * 100
      FROM parsed_receipts
      WHERE template_id = NEW.template_id
        AND validation_status = 'validated'
    )
  WHERE id = NEW.template_id;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_template_perf
  AFTER INSERT ON parsed_receipts
  FOR EACH ROW
  WHEN (NEW.template_id IS NOT NULL)
  EXECUTE FUNCTION update_template_performance();

-- Updated timestamp triggers
CREATE TRIGGER update_stores_updated_at
  BEFORE UPDATE ON stores
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_templates_updated_at
  BEFORE UPDATE ON receipt_templates
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
