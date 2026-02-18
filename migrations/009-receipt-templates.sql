-- ========================================
-- DEPRECATED: Use enhanced-receipt-schema.sql instead
-- ========================================
--
-- This migration was replaced by the comprehensive enhanced receipt schema.
-- Your codebase expects the full schema with stores, templates, and learning.
--
-- 🚨 DO NOT RUN THIS FILE
--
-- Instead, follow these steps:
--
-- STEP 1: Check current state
--   Run: migrations/009-deploy-enhanced-receipt-schema.sql
--   (This checks what's already deployed)
--
-- STEP 2: Deploy full schema (if needed)
--   File: lib/supabase/enhanced-receipt-schema.sql
--   Creates: stores, receipt_templates, parsed_receipts, receipt_annotations, etc.
--
-- STEP 3: Seed initial data
--   File: lib/supabase/seed-stores.sql
--   Adds: Shell, Total, Naivas, Carrefour, Java House, etc.
--
-- The enhanced schema is what store-recognition.ts and template-registry.ts expect.

SELECT 'This file is deprecated - see comments for instructions' as status;

