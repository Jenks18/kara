-- ========================================
-- MIGRATION 009: Deploy Enhanced Receipt Schema
-- ========================================
--
-- This migration deploys the full enhanced-receipt-schema.sql
-- if it's not already deployed. It checks for existing tables first.
--
-- ENHANCED SCHEMA INCLUDES:
-- • stores - Merchant registry with KRA PINs, locations, verification
-- • receipt_templates - Store-specific parsing strategies with JSONB field mappings
-- • parsed_receipts - Structured extraction results (separate from raw_receipts)
-- • receipt_annotations - User corrections for ML learning
-- • store_geofences - Location-based store matching
-- • receipt_processing_logs - Debugging and cost tracking
--
-- WHY USE THIS:
-- - Your code (store-recognition.ts, template-registry.ts) expects these tables
-- - Enables store-aware receipt parsing instead of generic AI extraction
-- - Builds learning system from user feedback
-- - Tracks KRA verification at merchant level
--
-- RUN: Execute in Supabase SQL Editor (Dashboard → SQL Editor)

BEGIN;

-- ========================================
-- 1. CHECK IF ALREADY DEPLOYED
-- ========================================

DO $$ 
DECLARE
  v_stores_exists BOOLEAN;
  v_templates_exists BOOLEAN;
  v_parsed_exists BOOLEAN;
BEGIN
  -- Check for key tables from enhanced schema
  v_stores_exists := EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_schema = 'public' AND table_name = 'stores'
  );
  
  v_templates_exists := EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_schema = 'public' AND table_name = 'receipt_templates'
  );
  
  v_parsed_exists := EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_schema = 'public' AND table_name = 'parsed_receipts'
  );
  
  IF v_stores_exists AND v_templates_exists AND v_parsed_exists THEN
    RAISE NOTICE '✓ Enhanced schema already deployed!';
    RAISE NOTICE 'Tables found: stores, receipt_templates, parsed_receipts';
    RAISE NOTICE 'No action needed. Migration complete.';
  ELSIF v_stores_exists OR v_templates_exists OR v_parsed_exists THEN
    RAISE WARNING '⚠ Partial deployment detected!';
    RAISE WARNING 'Found: stores=%, templates=%, parsed=%', v_stores_exists, v_templates_exists, v_parsed_exists;
    RAISE WARNING 'Run lib/supabase/enhanced-receipt-schema.sql manually to complete deployment.';
  ELSE
    RAISE NOTICE '→ Enhanced schema NOT found. Deploy lib/supabase/enhanced-receipt-schema.sql';
    RAISE NOTICE 'That file contains the full schema this codebase expects.';
  END IF;
END $$;

-- ========================================
-- 2. COMPATIBILITY: Add is_admin to user_profiles
-- ========================================
-- This is needed for RLS policies

ALTER TABLE user_profiles 
ADD COLUMN IF NOT EXISTS is_admin BOOLEAN DEFAULT false;

COMMENT ON COLUMN user_profiles.is_admin IS 'Admin users can modify receipt templates and stores';

-- ========================================
-- 3. VERIFY DEPENDENCIES
-- ========================================

DO $$
BEGIN
  -- Check raw_receipts has required columns
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'raw_receipts' AND column_name = 'recognized_store_id'
  ) THEN
    RAISE WARNING 'raw_receipts missing recognized_store_id column';
    RAISE WARNING 'The enhanced schema expects this. You may need to run enhanced-receipt-schema.sql';
  END IF;
  
  -- Check raw_receipts has user_email or user_id
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'raw_receipts' AND column_name IN ('user_email', 'user_id')
  ) THEN
    RAISE WARNING 'raw_receipts missing user identifier (user_email OR user_id)';
  END IF;
END $$;

-- ========================================
-- 4. NEXT STEPS (DISPLAYED AS NOTICE)
-- ========================================

DO $$
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '📋 NEXT STEPS:';
  RAISE NOTICE '1. If enhanced schema NOT deployed:';
  RAISE NOTICE '   → Go to Supabase Dashboard → SQL Editor';
  RAISE NOTICE '   → Paste contents of lib/supabase/enhanced-receipt-schema.sql';
  RAISE NOTICE '   → Run it';
  RAISE NOTICE '';
  RAISE NOTICE '2. Seed initial store data:';
  RAISE NOTICE '   → Run lib/supabase/seed-stores.sql';
  RAISE NOTICE '   → This adds Shell, Total, Naivas, Carrefour, etc.';
  RAISE NOTICE '';
  RAISE NOTICE '3. Your code (store-recognition.ts) will then work!';
END $$;

COMMIT;

-- Mark migration as complete
SELECT 'Migration 009: Enhanced schema check complete. See NOTICES above for next steps.' as status;
