-- ============================================
-- MIGRATION 010: Add Enhanced Receipt Tables
-- ============================================
-- Safe migration that works with existing raw_receipts table
-- Only creates NEW tables and adds missing columns

BEGIN;

-- ============================================
-- 1. UPDATE EXISTING raw_receipts TABLE
-- Add any missing columns
-- ============================================

-- Add recognized_store_id if missing
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'raw_receipts' AND column_name = 'recognized_store_id'
  ) THEN
    ALTER TABLE raw_receipts ADD COLUMN recognized_store_id UUID;
    CREATE INDEX IF NOT EXISTS idx_raw_receipts_store ON raw_receipts(recognized_store_id);
  END IF;
END $$;

-- Add recognition_confidence if missing
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'raw_receipts' AND column_name = 'recognition_confidence'
  ) THEN
    ALTER TABLE raw_receipts ADD COLUMN recognition_confidence NUMERIC(3, 2);
  END IF;
END $$;

-- ============================================
-- 2. CREATE STORES TABLE
-- ============================================

CREATE TABLE IF NOT EXISTS stores (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
  
  -- Store Identity
  name TEXT NOT NULL,
  chain_name TEXT,
  category TEXT NOT NULL,
  
  -- Tax Identifiers
  kra_pin TEXT UNIQUE,
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
  business_type TEXT[],
  currencies TEXT[] DEFAULT ARRAY['KES'],
  
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

CREATE INDEX IF NOT EXISTS idx_stores_chain ON stores(chain_name);
CREATE INDEX IF NOT EXISTS idx_stores_category ON stores(category);
CREATE INDEX IF NOT EXISTS idx_stores_kra_pin ON stores(kra_pin);

-- ============================================
-- 3. CREATE RECEIPT_TEMPLATES TABLE
-- ============================================

CREATE TABLE IF NOT EXISTS receipt_templates (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
  
  -- Association
  store_id UUID REFERENCES stores(id) ON DELETE CASCADE,
  chain_name TEXT,
  
  -- Template Identity
  name TEXT NOT NULL,
  version INTEGER DEFAULT 1,
  active BOOLEAN DEFAULT TRUE,
  
  -- Receipt Format
  receipt_type TEXT NOT NULL,
  format_type TEXT NOT NULL,
  
  -- Parsing Strategy
  parser_type TEXT NOT NULL,
  parser_config JSONB,
  
  -- Field Extraction Rules
  field_mappings JSONB NOT NULL,
  
  -- Validation Rules
  validation_rules JSONB,
  
  -- Performance Tracking
  success_rate NUMERIC(5, 2) DEFAULT 0.00,
  avg_confidence NUMERIC(5, 2) DEFAULT 0.00,
  total_uses INTEGER DEFAULT 0,
  
  -- Examples
  example_receipt_ids UUID[]
);

CREATE INDEX IF NOT EXISTS idx_templates_store ON receipt_templates(store_id);
CREATE INDEX IF NOT EXISTS idx_templates_chain ON receipt_templates(chain_name);
CREATE INDEX IF NOT EXISTS idx_templates_type ON receipt_templates(receipt_type);
CREATE INDEX IF NOT EXISTS idx_templates_active ON receipt_templates(active);

-- ============================================
-- 4. CREATE PARSED_RECEIPTS TABLE
-- ============================================

CREATE TABLE IF NOT EXISTS parsed_receipts (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
  
  -- References
  raw_receipt_id UUID REFERENCES raw_receipts(id) ON DELETE CASCADE,
  store_id UUID REFERENCES stores(id),
  template_id UUID REFERENCES receipt_templates(id),
  
  -- Standard Fields
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
  payment_method TEXT,
  payment_reference TEXT,
  
  -- Category-Specific Data
  fuel_data JSONB,
  grocery_data JSONB,
  restaurant_data JSONB,
  additional_data JSONB,
  
  -- Confidence & Validation
  confidence_score NUMERIC(5, 2) NOT NULL,
  validation_status TEXT DEFAULT 'pending',
  validation_issues TEXT[],
  
  -- KRA Verification
  kra_verified BOOLEAN DEFAULT FALSE,
  kra_verification_date TIMESTAMP WITH TIME ZONE,
  kra_verification_method TEXT,
  
  -- Quality Metrics
  data_completeness NUMERIC(5, 2),
  ocr_quality_score NUMERIC(5, 2),
  
  CONSTRAINT valid_confidence CHECK (confidence_score >= 0 AND confidence_score <= 100)
);

CREATE INDEX IF NOT EXISTS idx_parsed_receipts_raw ON parsed_receipts(raw_receipt_id);
CREATE INDEX IF NOT EXISTS idx_parsed_receipts_store ON parsed_receipts(store_id);
CREATE INDEX IF NOT EXISTS idx_parsed_receipts_template ON parsed_receipts(template_id);
CREATE INDEX IF NOT EXISTS idx_parsed_receipts_invoice ON parsed_receipts(invoice_number);
CREATE INDEX IF NOT EXISTS idx_parsed_receipts_date ON parsed_receipts(transaction_date);
CREATE INDEX IF NOT EXISTS idx_parsed_receipts_validation ON parsed_receipts(validation_status);

-- ============================================
-- 5. CREATE RECEIPT_ANNOTATIONS TABLE
-- ============================================

CREATE TABLE IF NOT EXISTS receipt_annotations (
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

CREATE INDEX IF NOT EXISTS idx_annotations_receipt ON receipt_annotations(raw_receipt_id);
CREATE INDEX IF NOT EXISTS idx_annotations_store ON receipt_annotations(store_id);
CREATE INDEX IF NOT EXISTS idx_annotations_annotator ON receipt_annotations(annotator_email);

-- ============================================
-- 6. CREATE STORE_GEOFENCES TABLE
-- ============================================

CREATE TABLE IF NOT EXISTS store_geofences (
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

CREATE INDEX IF NOT EXISTS idx_geofences_store ON store_geofences(store_id);
CREATE INDEX IF NOT EXISTS idx_geofences_active ON store_geofences(active);

-- ============================================
-- 7. CREATE RECEIPT_PROCESSING_LOGS TABLE
-- ============================================

CREATE TABLE IF NOT EXISTS receipt_processing_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
  
  raw_receipt_id UUID REFERENCES raw_receipts(id) ON DELETE CASCADE,
  
  stage TEXT NOT NULL,
  status TEXT NOT NULL,
  duration_ms INTEGER,
  
  input_data JSONB,
  output_data JSONB,
  error_message TEXT,
  
  cost_usd NUMERIC(10, 6),
  
  metadata JSONB
);

CREATE INDEX IF NOT EXISTS idx_logs_receipt ON receipt_processing_logs(raw_receipt_id);
CREATE INDEX IF NOT EXISTS idx_logs_stage ON receipt_processing_logs(stage);
CREATE INDEX IF NOT EXISTS idx_logs_created ON receipt_processing_logs(created_at DESC);

-- ============================================
-- 8. ADD FOREIGN KEY TO raw_receipts
-- (Now that stores table exists)
-- ============================================

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'raw_receipts_recognized_store_id_fkey'
  ) THEN
    ALTER TABLE raw_receipts 
    ADD CONSTRAINT raw_receipts_recognized_store_id_fkey 
    FOREIGN KEY (recognized_store_id) REFERENCES stores(id) ON DELETE SET NULL;
  END IF;
END $$;

-- ============================================
-- 9. CREATE VIEWS
-- ============================================

CREATE OR REPLACE VIEW receipt_complete AS
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

CREATE OR REPLACE VIEW store_metrics AS
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
-- 10. ENABLE RLS
-- ============================================

ALTER TABLE stores ENABLE ROW LEVEL SECURITY;
ALTER TABLE receipt_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE parsed_receipts ENABLE ROW LEVEL SECURITY;
ALTER TABLE receipt_annotations ENABLE ROW LEVEL SECURITY;
ALTER TABLE store_geofences ENABLE ROW LEVEL SECURITY;
ALTER TABLE receipt_processing_logs ENABLE ROW LEVEL SECURITY;

-- ============================================
-- 11. RLS POLICIES
-- ============================================

-- Stores: Public read
CREATE POLICY "Anyone can read stores" ON stores
  FOR SELECT USING (true);

-- Templates: Public read
CREATE POLICY "Anyone can read templates" ON receipt_templates
  FOR SELECT USING (true);

-- Parsed receipts: User owns via raw_receipt
CREATE POLICY "Users can access their parsed receipts" ON parsed_receipts
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM raw_receipts
      WHERE raw_receipts.id = parsed_receipts.raw_receipt_id
      AND raw_receipts.user_email = (auth.jwt()->>'email')
    )
  );

-- Annotations: User owns via raw_receipt
CREATE POLICY "Users can access their annotations" ON receipt_annotations
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM raw_receipts
      WHERE raw_receipts.id = receipt_annotations.raw_receipt_id
      AND raw_receipts.user_email = (auth.jwt()->>'email')
    )
  );

-- Geofences: Public read
CREATE POLICY "Anyone can read geofences" ON store_geofences
  FOR SELECT USING (true);

-- Processing logs: User owns via raw_receipt
CREATE POLICY "Users can access their processing logs" ON receipt_processing_logs
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM raw_receipts
      WHERE raw_receipts.id = receipt_processing_logs.raw_receipt_id
      AND raw_receipts.user_email = (auth.jwt()->>'email')
    )
  );

-- ============================================
-- 12. TRIGGERS
-- ============================================

-- Auto-update store statistics
CREATE OR REPLACE FUNCTION update_store_statistics()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.recognized_store_id IS NOT NULL THEN
    UPDATE stores SET
      receipt_count = (
        SELECT COUNT(*) FROM raw_receipts 
        WHERE recognized_store_id = NEW.recognized_store_id
      ),
      last_seen_at = NEW.created_at
    WHERE id = NEW.recognized_store_id;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_store_stats ON raw_receipts;
CREATE TRIGGER trigger_update_store_stats
  AFTER INSERT OR UPDATE ON raw_receipts
  FOR EACH ROW
  EXECUTE FUNCTION update_store_statistics();

-- Auto-update template performance
CREATE OR REPLACE FUNCTION update_template_performance()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.template_id IS NOT NULL THEN
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
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_template_perf ON parsed_receipts;
CREATE TRIGGER trigger_update_template_perf
  AFTER INSERT ON parsed_receipts
  FOR EACH ROW
  EXECUTE FUNCTION update_template_performance();

-- Updated timestamp triggers
DROP TRIGGER IF EXISTS update_stores_updated_at ON stores;
CREATE TRIGGER update_stores_updated_at
  BEFORE UPDATE ON stores
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_templates_updated_at ON receipt_templates;
CREATE TRIGGER update_templates_updated_at
  BEFORE UPDATE ON receipt_templates
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

COMMIT;

-- Success message
SELECT 'Enhanced receipt tables created successfully!' as status;
SELECT 'Next: Run lib/supabase/seed-stores.sql to add default merchants' as next_step;
