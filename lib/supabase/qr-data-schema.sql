-- ========================================
-- QR CODE DATA STORAGE
-- ========================================
-- Dedicated table for QR code processor results
-- Decoupled from other receipt processing data

CREATE TABLE IF NOT EXISTS qr_code_data (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- User context
  user_id TEXT NOT NULL,
  user_email TEXT NOT NULL,
  
  -- Source receipt
  receipt_image_url TEXT NOT NULL,
  receipt_id UUID REFERENCES raw_receipts(id) ON DELETE CASCADE,
  
  -- QR code content
  raw_text TEXT NOT NULL,
  data_type TEXT NOT NULL CHECK (data_type IN ('url', 'structured', 'plain')),
  
  -- URL data (if QR contains a URL)
  url TEXT,
  is_kra_url BOOLEAN DEFAULT FALSE,
  
  -- KRA scraped data (if URL was KRA invoice)
  kra_invoice_number TEXT,
  kra_trader_invoice_no TEXT,
  kra_invoice_date TEXT,
  kra_merchant_name TEXT,
  kra_total_amount NUMERIC(10, 2),
  kra_taxable_amount NUMERIC(10, 2),
  kra_vat_amount NUMERIC(10, 2),
  kra_verified BOOLEAN DEFAULT FALSE,
  kra_scraped_at TIMESTAMPTZ,
  
  -- Structured data (if QR contains key-value pairs)
  parsed_fields JSONB,
  
  -- Metadata
  processed_at TIMESTAMPTZ DEFAULT NOW(),
  processing_time_ms INTEGER
);

-- Enable RLS
ALTER TABLE qr_code_data ENABLE ROW LEVEL SECURITY;

-- RLS Policies - Users can only access their own QR data
CREATE POLICY "Users can view own qr_code_data"
  ON qr_code_data
  FOR SELECT
  TO authenticated
  USING (user_email = (auth.jwt()->>'email')::text);

CREATE POLICY "Users can insert own qr_code_data"
  ON qr_code_data
  FOR INSERT
  TO authenticated
  WITH CHECK (user_email = (auth.jwt()->>'email')::text);

CREATE POLICY "Users can update own qr_code_data"
  ON qr_code_data
  FOR UPDATE
  TO authenticated
  USING (user_email = (auth.jwt()->>'email')::text);

CREATE POLICY "Users can delete own qr_code_data"
  ON qr_code_data
  FOR DELETE
  TO authenticated
  USING (user_email = (auth.jwt()->>'email')::text);

-- Indexes for performance
CREATE INDEX idx_qr_code_data_user_email ON qr_code_data(user_email);
CREATE INDEX idx_qr_code_data_receipt_id ON qr_code_data(receipt_id);
CREATE INDEX idx_qr_code_data_kra_invoice ON qr_code_data(kra_invoice_number) WHERE kra_invoice_number IS NOT NULL;
CREATE INDEX idx_qr_code_data_created_at ON qr_code_data(created_at DESC);
