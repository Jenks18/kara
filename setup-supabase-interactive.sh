#!/bin/bash

# Kara Supabase Setup Script
# This will guide you through setting up Supabase

echo "🚀 KARA SUPABASE SETUP"
echo "======================"
echo ""
echo "I'll open the Supabase dashboard for you..."
echo ""

# Open Supabase dashboard
open "https://supabase.com/dashboard/projects"

echo "📋 Follow these steps in your browser:"
echo ""
echo "1. Click 'New Project'"
echo "2. Fill in:"
echo "   - Name: Kara"
echo "   - Database Password: Kara2026Secure!"
echo "   - Region: East US (closest to Kenya users)"
echo ""
echo "3. Click 'Create new project'"
echo "4. Wait 2-3 minutes for provisioning..."
echo ""
read -p "Press Enter when project is created..."

echo ""
echo "📊 Now get your API credentials:"
echo ""
echo "1. In your new Kara project, click 'Settings' (⚙️) in sidebar"
echo "2. Click 'API'"
echo "3. You'll see:"
echo "   - Project URL"
echo "   - anon public key"
echo ""
read -p "Press Enter when you're ready to input credentials..."

echo ""
read -p "Paste your Supabase URL: " SUPABASE_URL
read -p "Paste your anon key: " SUPABASE_KEY

# Update .env.local
cat > .env.local << EOF
# Gemini AI API Key (for OCR fallback)
GEMINI_API_KEY=AIzaSyCdQtKGUVXjUPgO2z8-QF4Fv1TEKfCksq0

# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=$SUPABASE_URL
NEXT_PUBLIC_SUPABASE_ANON_KEY=$SUPABASE_KEY
EOF

echo ""
echo "✅ Credentials saved to .env.local"
echo ""
echo "📊 Next: Create database tables"
echo ""
echo "1. In Supabase, click 'SQL Editor' (📊)"
echo "2. Click 'New Query'"
echo "3. Copy the SQL below and paste it"
echo "4. Click 'Run'"
echo ""
echo "========== COPY THIS SQL =========="
cat lib/supabase/schema.sql
echo "==================================="
echo ""
read -p "Press Enter when SQL is executed..."

echo ""
echo "🪣 Finally: Create storage bucket"
echo ""
echo "1. Click 'Storage' (🪣) in sidebar"
echo "2. Click 'New Bucket'"
echo "3. Name: receipts"
echo "4. Toggle 'Public bucket' ON"
echo "5. Click 'Create bucket'"
echo ""
read -p "Press Enter when bucket is created..."

echo ""
echo "✅ SETUP COMPLETE!"
echo ""
echo "Test it:"
echo "  npm run dev"
echo ""
echo "Then capture a receipt and it will save to your database!"
