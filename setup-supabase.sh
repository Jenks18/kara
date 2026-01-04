#!/bin/bash

# Supabase Quick Setup Script
# This script will guide you through setting up Supabase for Kara

echo "🚀 Kara Supabase Setup"
echo "====================="
echo ""

# Check if .env.local exists
if [ -f .env.local ]; then
    echo "✓ Found .env.local file"
    
    # Check if credentials are set
    if grep -q "NEXT_PUBLIC_SUPABASE_URL=your-project-url" .env.local || grep -q "NEXT_PUBLIC_SUPABASE_URL=$" .env.local; then
        echo "⚠️  Supabase credentials not configured"
        echo ""
        NEED_SETUP=true
    else
        echo "✓ Supabase credentials found"
        NEED_SETUP=false
    fi
else
    echo "⚠️  .env.local file not found"
    NEED_SETUP=true
fi

if [ "$NEED_SETUP" = true ]; then
    echo ""
    echo "📋 Follow these steps:"
    echo ""
    echo "1. Go to https://supabase.com and sign in"
    echo "2. Click 'New Project'"
    echo "3. Fill in:"
    echo "   - Name: Kara Expense Tracker"
    echo "   - Database Password: (save this!)"
    echo "   - Region: Choose closest to you"
    echo ""
    echo "4. Wait 2 minutes for project to provision"
    echo ""
    echo "5. Get your credentials:"
    echo "   - Go to Settings → API"
    echo "   - Copy 'Project URL'"
    echo "   - Copy 'anon public' key"
    echo ""
    
    read -p "Press Enter when you have your Supabase credentials..."
    echo ""
    
    read -p "Paste your Supabase URL: " SUPABASE_URL
    read -p "Paste your anon key: " SUPABASE_KEY
    
    # Create .env.local file
    cat > .env.local << EOF
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=$SUPABASE_URL
NEXT_PUBLIC_SUPABASE_ANON_KEY=$SUPABASE_KEY

# Google Gemini API (for OCR - optional)
GEMINI_API_KEY=your-gemini-api-key
EOF
    
    echo ""
    echo "✓ Created .env.local with your credentials"
fi

echo ""
echo "📊 Next: Create database tables"
echo ""
echo "1. Go to your Supabase project"
echo "2. Click 'SQL Editor' in the left sidebar"
echo "3. Click 'New Query'"
echo "4. Copy the contents of: lib/supabase/schema.sql"
echo "5. Paste and click 'Run'"
echo ""
echo "🪣 Then: Create storage bucket"
echo ""
echo "1. Go to 'Storage' in the left sidebar"
echo "2. Click 'New Bucket'"
echo "3. Name: receipts"
echo "4. Set to: Public"
echo "5. Click 'Create bucket'"
echo ""

read -p "Press Enter when you've completed these steps..."

echo ""
echo "✅ Setup complete!"
echo ""
echo "To start the dev server:"
echo "  npm run dev"
echo ""
