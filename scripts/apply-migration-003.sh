#!/bin/bash

# Apply migration 003 to link raw_receipts and expense_items
# This adds the raw_receipt_id column to expense_items table

echo "🔄 Applying migration 003: Link raw_receipts to expense_items..."

# Check if Supabase CLI is installed
if ! command -v supabase &> /dev/null; then
    echo "❌ Supabase CLI not found. Please install it first:"
    echo "   npm install -g supabase"
    exit 1
fi

# Apply the migration
supabase db push --db-url "${DATABASE_URL}" --file migrations/003-link-raw-receipts-to-expense-items.sql

if [ $? -eq 0 ]; then
    echo "✅ Migration applied successfully!"
    echo ""
    echo "📋 What changed:"
    echo "  • Added raw_receipt_id column to expense_items"
    echo "  • Created foreign key to raw_receipts table"
    echo "  • Added index for faster lookups"
    echo ""
    echo "📊 Multi-table architecture now active:"
    echo "  1. raw_receipts = ALL scraped data (QR, OCR, KRA, Gemini)"
    echo "  2. expense_items = Clean data for app UI"
    echo "  3. expense_items.raw_receipt_id links to raw_receipts.id"
else
    echo "❌ Migration failed. Please check the error above."
    exit 1
fi
