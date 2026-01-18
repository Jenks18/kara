#!/bin/bash

# ==========================================
# VERCEL DEPLOYMENT SCRIPT
# Automates deployment preparation
# ==========================================

set -e  # Exit on error

echo "🚀 Preparing for Vercel deployment..."
echo ""

# ==========================================
# 1. CHECK DEPENDENCIES
# ==========================================
echo "📦 Checking dependencies..."

if ! command -v node &> /dev/null; then
    echo "❌ Node.js not found. Please install Node.js 18+"
    exit 1
fi

if ! command -v npm &> /dev/null; then
    echo "❌ npm not found. Please install npm"
    exit 1
fi

echo "✅ Node.js $(node -v)"
echo "✅ npm $(npm -v)"
echo ""

# ==========================================
# 2. INSTALL DEPENDENCIES
# ==========================================
echo "📥 Installing dependencies..."
npm install
echo "✅ Dependencies installed"
echo ""

# ==========================================
# 3. CHECK ENVIRONMENT VARIABLES
# ==========================================
echo "🔐 Checking environment variables..."

if [ ! -f .env.local ]; then
    echo "⚠️  .env.local not found"
    echo "Creating from template..."
    cp .env.example .env.local
    echo "❗ Please fill in your API keys in .env.local"
    echo ""
fi

# Check required variables
REQUIRED_VARS=(
    "NEXT_PUBLIC_SUPABASE_URL"
    "NEXT_PUBLIC_SUPABASE_ANON_KEY"
    "SUPABASE_SERVICE_ROLE_KEY"
    "GEMINI_API_KEY"
)

MISSING_VARS=()

for var in "${REQUIRED_VARS[@]}"; do
    if ! grep -q "^${var}=" .env.local 2>/dev/null || grep -q "^${var}=your-" .env.local 2>/dev/null; then
        MISSING_VARS+=("$var")
    fi
done

if [ ${#MISSING_VARS[@]} -gt 0 ]; then
    echo "❌ Missing or incomplete environment variables:"
    for var in "${MISSING_VARS[@]}"; do
        echo "   - $var"
    done
    echo ""
    echo "Please configure these in .env.local before deploying"
    echo "See .env.example for reference"
    exit 1
fi

echo "✅ Environment variables configured"
echo ""

# ==========================================
# 4. BUILD TEST
# ==========================================
echo "🔨 Testing build..."
npm run build

if [ $? -eq 0 ]; then
    echo "✅ Build successful"
else
    echo "❌ Build failed. Please fix errors before deploying"
    exit 1
fi
echo ""

# ==========================================
# 5. VERIFY FILES
# ==========================================
echo "📋 Verifying deployment files..."

REQUIRED_FILES=(
    "vercel.json"
    "package.json"
    "next.config.js"
    "lib/supabase/enhanced-receipt-schema.sql"
    "lib/supabase/seed-stores.sql"
    "lib/supabase/setup-storage.sql"
)

for file in "${REQUIRED_FILES[@]}"; do
    if [ ! -f "$file" ]; then
        echo "❌ Missing required file: $file"
        exit 1
    fi
done

echo "✅ All required files present"
echo ""

# ==========================================
# 6. DATABASE CHECK
# ==========================================
echo "🗄️  Database setup reminder..."
echo ""
echo "Have you completed the following?"
echo "  [ ] Created Supabase project"
echo "  [ ] Applied enhanced-receipt-schema.sql"
echo "  [ ] Applied seed-stores.sql"
echo "  [ ] Applied setup-storage.sql"
echo "  [ ] Configured storage bucket policies"
echo ""
read -p "Press Enter to continue or Ctrl+C to cancel..."
echo ""

# ==========================================
# 7. VERCEL CLI CHECK
# ==========================================
echo "🔧 Checking Vercel CLI..."

if ! command -v vercel &> /dev/null; then
    echo "⚠️  Vercel CLI not found"
    read -p "Install Vercel CLI? (y/n): " -n 1 -r
    echo ""
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        npm install -g vercel
        echo "✅ Vercel CLI installed"
    else
        echo ""
        echo "Please install manually: npm install -g vercel"
        echo "Or deploy via GitHub integration"
        exit 0
    fi
else
    echo "✅ Vercel CLI installed"
fi
echo ""

# ==========================================
# 8. DEPLOYMENT OPTIONS
# ==========================================
echo "🚀 Ready to deploy!"
echo ""
echo "Choose deployment method:"
echo "  1) Deploy to Vercel now (CLI)"
echo "  2) Deploy to production (CLI)"
echo "  3) Show GitHub deployment instructions"
echo "  4) Exit (deploy manually later)"
echo ""
read -p "Enter choice (1-4): " -n 1 -r
echo ""

case $REPLY in
    1)
        echo ""
        echo "📤 Deploying to Vercel..."
        vercel
        echo ""
        echo "✅ Deployed to preview environment"
        echo "Test your deployment, then run: vercel --prod"
        ;;
    2)
        echo ""
        echo "📤 Deploying to production..."
        vercel --prod
        echo ""
        echo "✅ Deployed to production!"
        ;;
    3)
        echo ""
        echo "📖 GitHub Deployment Instructions:"
        echo ""
        echo "1. Push your code to GitHub:"
        echo "   git add ."
        echo "   git commit -m 'Add enhanced receipt processing system'"
        echo "   git push origin main"
        echo ""
        echo "2. Go to https://vercel.com/new"
        echo "3. Import your GitHub repository"
        echo "4. Configure environment variables:"
        echo "   - NEXT_PUBLIC_SUPABASE_URL"
        echo "   - NEXT_PUBLIC_SUPABASE_ANON_KEY"
        echo "   - SUPABASE_SERVICE_ROLE_KEY"
        echo "   - GEMINI_API_KEY"
        echo "5. Click Deploy"
        echo ""
        echo "See VERCEL_DEPLOYMENT.md for detailed instructions"
        ;;
    4)
        echo ""
        echo "✅ Pre-deployment checks complete"
        echo ""
        echo "To deploy later:"
        echo "  - CLI: vercel or vercel --prod"
        echo "  - GitHub: Push to main branch"
        echo "  - Manual: https://vercel.com/new"
        echo ""
        exit 0
        ;;
    *)
        echo "Invalid choice"
        exit 1
        ;;
esac

echo ""
echo "════════════════════════════════════════════════════"
echo "🎉 Deployment Complete!"
echo "════════════════════════════════════════════════════"
echo ""
echo "📚 Next Steps:"
echo "  1. Test your deployment URL"
echo "  2. Configure custom domain (optional)"
echo "  3. Set up monitoring and alerts"
echo "  4. Review VERCEL_DEPLOYMENT.md for optimization tips"
echo ""
echo "📊 Monitor your deployment:"
echo "  - Dashboard: https://vercel.com/dashboard"
echo "  - Analytics: Check function metrics"
echo "  - Logs: View real-time logs"
echo ""
echo "🆘 Need help?"
echo "  - Read VERCEL_DEPLOYMENT.md"
echo "  - Check docs/ folder"
echo "  - Create GitHub issue"
echo ""
echo "Made with ❤️ for Kenyan businesses 🇰🇪"
echo ""
