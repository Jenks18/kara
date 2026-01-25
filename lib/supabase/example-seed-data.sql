-- ============================================
-- EXAMPLE SEED DATA
-- Shows how one store can have multiple receipt templates
-- ============================================

-- Example Store: Total Kenya (has 3 different receipt formats!)
INSERT INTO stores (id, name, chain_name, category, kra_pin, verified) VALUES
('550e8400-e29b-41d4-a716-446655440000', 'Total Westlands', 'Total', 'fuel', 'P051234567A', TRUE);

-- ============================================
-- TEMPLATE 1: Total - KRA-Compliant Thermal Receipt (Most common)
-- ============================================
INSERT INTO receipt_templates (
  id,
  store_id,
  chain_name,
  name,
  description,
  version,
  priority,
  receipt_type,
  format_type,
  identification_rules,
  has_qr_code,
  has_kra_compliance,
  parsing_strategy,
  qr_regex_patterns,
  ocr_regex_patterns,
  kra_field_mappings,
  validation_rules
) VALUES (
  '660e8400-e29b-41d4-a716-446655440001',
  '550e8400-e29b-41d4-a716-446655440000',
  'Total',
  'Total KRA Thermal Receipt 2025',
  'Modern KRA-compliant receipt with QR code, used at pumps',
  1,
  100, -- Highest priority - try this first!
  'fuel',
  'thermal',
  '{
    "has_qr_code": true,
    "has_kra_pin": true,
    "ocr_keywords": ["Total Kenya", "CU Invoice", "itax.kra.go.ke"],
    "paper_width_mm": {"min": 75, "max": 82}
  }',
  TRUE,
  TRUE,
  '{
    "primary": "kra_scraper",
    "secondary": "qr_parser",
    "tertiary": "ocr_regex",
    "last_resort": "ai_vision"
  }',
  '{
    "invoice": {
      "patterns": ["invoiceNo=([0-9]+)", "inv:([0-9]+)"],
      "required": true
    }
  }',
  '{
    "invoice_number": {
      "patterns": [
        "CU\\\\s*Invoice\\\\s*No\\\\.?[:\\\\s]*([0-9]+)",
        "Invoice\\\\s*No[:\\\\s]*([A-Z0-9\\\\-]+)"
      ],
      "required": true,
      "line_position": "top_third"
    },
    "total_amount": {
      "patterns": [
        "TOTAL[:\\\\s]*KES[\\\\s]*([0-9,]+\\\\.?[0-9]{0,2})",
        "Amount[:\\\\s]*([0-9,]+\\\\.?[0-9]{2})"
      ],
      "required": true,
      "data_type": "currency"
    },
    "litres": {
      "patterns": [
        "([0-9]+\\\\.[0-9]+)\\\\s*[Ll](itres?|trs?)",
        "Volume[:\\\\s]*([0-9.]+)"
      ],
      "required": true,
      "data_type": "decimal"
    },
    "fuel_type": {
      "patterns": ["(SUPER|DIESEL|VPOWER)", "Product[:\\\\s]*(\\\\w+)"],
      "enum": ["SUPER", "DIESEL", "VPOWER"]
    }
  }',
  '{
    "Control Unit Invoice Number": "invoice_number",
    "Supplier Name": "merchant_name",
    "Total Invoice Amount": "total_amount",
    "Total Tax Amount": "vat_amount",
    "Invoice Date": "transaction_date"
  }',
  '{
    "fuel_price_per_litre": {"min": 160, "max": 250},
    "require_kra_verification": true
  }'
);

-- ============================================
-- TEMPLATE 2: Total - Old Non-KRA Thermal Receipt
-- ============================================
INSERT INTO receipt_templates (
  id,
  store_id,
  chain_name,
  name,
  description,
  version,
  priority,
  receipt_type,
  format_type,
  identification_rules,
  has_qr_code,
  has_kra_compliance,
  parsing_strategy,
  qr_regex_patterns,
  ocr_regex_patterns,
  validation_rules
) VALUES (
  '660e8400-e29b-41d4-a716-446655440002',
  '550e8400-e29b-41d4-a716-446655440000',
  'Total',
  'Total Legacy Thermal Receipt',
  'Old format without QR code or KRA compliance, still in use at some stations',
  1,
  90, -- Lower priority - try after KRA format
  'fuel',
  'thermal',
  '{
    "has_qr_code": false,
    "has_kra_pin": false,
    "ocr_keywords": ["Total", "Receipt No", "Pump"],
    "ocr_exclusions": ["CU Invoice", "kra.go.ke"]
  }',
  FALSE,
  FALSE,
  '{
    "primary": "ocr_regex",
    "fallback": "ai_vision"
  }',
  NULL,
  '{
    "receipt_number": {
      "patterns": [
        "Receipt\\\\s*No[:\\\\s]*([A-Z0-9]+)",
        "Txn[:\\\\s]*([0-9]+)"
      ],
      "required": true
    },
    "total_amount": {
      "patterns": [
        "Total[:\\\\s]*([0-9,]+\\\\.?[0-9]{2})",
        "Amount[:\\\\s]*KES[\\\\s]*([0-9,]+)"
      ],
      "required": true,
      "data_type": "currency"
    },
    "litres": {
      "patterns": [
        "([0-9]+\\\\.[0-9]+)\\\\s*Litres",
        "Qty[:\\\\s]*([0-9.]+)"
      ],
      "required": true
    },
    "pump_number": {
      "patterns": ["Pump[:\\\\s]*([0-9]+)", "P([0-9]+)"],
      "required": false
    }
  }',
  '{
    "fuel_price_per_litre": {"min": 160, "max": 250}
  }'
);

-- ============================================
-- TEMPLATE 3: Total - A4 Corporate Invoice
-- ============================================
INSERT INTO receipt_templates (
  id,
  store_id,
  chain_name,
  name,
  description,
  version,
  priority,
  receipt_type,
  format_type,
  identification_rules,
  has_qr_code,
  has_kra_compliance,
  parsing_strategy,
  qr_regex_patterns,
  ocr_regex_patterns,
  kra_field_mappings,
  validation_rules
) VALUES (
  '660e8400-e29b-41d4-a716-446655440003',
  '550e8400-e29b-41d4-a716-446655440000',
  'Total',
  'Total A4 Tax Invoice',
  'Full A4 invoice for corporate/fleet customers',
  1,
  95, -- Medium priority
  'fuel',
  'a4',
  '{
    "has_qr_code": true,
    "format_type": "a4",
    "ocr_keywords": ["TAX INVOICE", "Total Kenya Limited", "P.O. Box"],
    "page_height_mm": {"min": 290, "max": 300}
  }',
  TRUE,
  TRUE,
  '{
    "primary": "kra_scraper",
    "secondary": "qr_parser",
    "tertiary": "ocr_regex",
    "last_resort": "ai_vision"
  }',
  '{
    "invoice": {
      "patterns": ["invoiceNo=([0-9]+)"],
      "required": true
    }
  }',
  '{
    "invoice_number": {
      "patterns": [
        "INVOICE\\\\s*NO\\\\.?[:\\\\s]*([A-Z0-9\\\\/\\\\-]+)",
        "Control\\\\s*Unit.*?([0-9]+)"
      ],
      "required": true
    },
    "customer_name": {
      "patterns": [
        "Bill\\\\s*To[:\\\\s]*([\\\\w\\\\s&]+?)(?:\\\\n|PIN)",
        "Customer[:\\\\s]*(.+)"
      ],
      "required": false
    },
    "total_amount": {
      "patterns": [
        "TOTAL\\\\s*AMOUNT[:\\\\s]*KES[\\\\s]*([0-9,]+\\\\.?[0-9]{2})",
        "Grand\\\\s*Total[:\\\\s]*([0-9,]+)"
      ],
      "required": true,
      "data_type": "currency"
    },
    "litres": {
      "patterns": [
        "Quantity[:\\\\s]*([0-9,]+\\\\.[0-9]+)\\\\s*[Ll]",
        "([0-9,]+\\\\.[0-9]+)\\\\s*Litres"
      ],
      "required": true
    }
  }',
  '{
    "Control Unit Invoice Number": "invoice_number",
    "Supplier Name": "merchant_name",
    "Total Invoice Amount": "total_amount",
    "Total Tax Amount": "vat_amount",
    "Invoice Date": "transaction_date"
  }',
  '{
    "fuel_price_per_litre": {"min": 160, "max": 250},
    "require_kra_verification": true,
    "min_amount": 1000
  }'
);

-- ============================================
-- Example: How the system would process a receipt
-- ============================================
COMMENT ON TABLE receipt_templates IS 
'Processing flow:
1. User uploads Total receipt
2. System detects store = "Total Westlands"
3. Query: SELECT * FROM receipt_templates WHERE store_id = ... ORDER BY priority DESC
4. Returns 3 templates: [KRA Thermal (100), A4 Invoice (95), Legacy (90)]
5. Try KRA Thermal first:
   - Check identification_rules: has QR? Check. Has "CU Invoice"? Check. ✅
   - Parse using: KRA scraper → QR parser → OCR regex
   - Success! Return parsed data
6. If KRA Thermal fails, try A4 Invoice next, then Legacy
7. If all fail, flag as non_conventional_receipt';
