-- Expense Reports Table
CREATE TABLE expense_reports (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
  
  -- User & Workspace
  user_email TEXT NOT NULL,
  workspace_name TEXT NOT NULL,
  workspace_avatar TEXT,
  
  -- Report Details
  title TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'draft', -- draft, submitted, approved, rejected
  total_amount NUMERIC(10, 2) DEFAULT 0.00,
  
  -- Metadata
  submitted_at TIMESTAMP WITH TIME ZONE,
  approved_at TIMESTAMP WITH TIME ZONE,
  approved_by TEXT
);

-- Expense Items Table (individual receipts in a report)
CREATE TABLE expense_items (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
  
  -- Foreign Key
  report_id UUID REFERENCES expense_reports(id) ON DELETE CASCADE,
  
  -- Receipt Data
  image_url TEXT NOT NULL,
  description TEXT,
  category TEXT DEFAULT 'Fuel',
  amount NUMERIC(10, 2) DEFAULT 0.00,
  reimbursable BOOLEAN DEFAULT FALSE,
  
  -- Location
  latitude NUMERIC(10, 7),
  longitude NUMERIC(10, 7),
  location_name TEXT,
  
  -- OCR/Processing Status
  processing_status TEXT DEFAULT 'scanning', -- scanning, processed, error
  merchant_name TEXT,
  transaction_date DATE,
  
  -- KRA Data (if available)
  kra_invoice_number TEXT,
  kra_verified BOOLEAN DEFAULT FALSE
);

-- Indexes
CREATE INDEX idx_expense_reports_user ON expense_reports(user_email);
CREATE INDEX idx_expense_reports_workspace ON expense_reports(workspace_name);
CREATE INDEX idx_expense_reports_status ON expense_reports(status);
CREATE INDEX idx_expense_items_report ON expense_items(report_id);

-- RLS Policies (Row Level Security)
ALTER TABLE expense_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE expense_items ENABLE ROW LEVEL SECURITY;

-- SECURITY: Do NOT use these insecure policies in production!
-- Use rls-policies.sql instead which has proper user filtering
-- CREATE POLICY "Enable all access for expense_reports" ON expense_reports
--   FOR ALL USING (true) WITH CHECK (true);

-- CREATE POLICY "Enable all access for expense_items" ON expense_items
--   FOR ALL USING (true) WITH CHECK (true);

-- NOTE: Apply rls-policies.sql after running this schema

-- Updated timestamp trigger
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = TIMEZONE('utc', NOW());
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_expense_reports_updated_at
  BEFORE UPDATE ON expense_reports
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
