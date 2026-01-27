#!/bin/bash

# Clerk Production Key Updater
# Run this after getting your production keys from dashboard.clerk.com

set -e

echo "🔐 Clerk Production Key Setup"
echo "=============================="
echo ""
echo "This script will update your Clerk keys to production."
echo ""
echo "⚠️  Before running this, get your production keys from:"
echo "   https://dashboard.clerk.com/ → Your App → API Keys → Production"
echo ""

# Check if we're in the right directory
if [ ! -f ".env.local" ]; then
    echo "❌ Error: .env.local not found"
    echo "   Please run this from: /Users/iannjenga/Documents/GitHub/Kara"
    exit 1
fi

# Prompt for production keys
echo "Enter your PRODUCTION Clerk keys:"
echo ""
read -p "Publishable Key (pk_live_...): " CLERK_PUB_KEY
read -p "Secret Key (sk_live_...): " CLERK_SECRET_KEY

# Validate keys
if [[ ! $CLERK_PUB_KEY =~ ^pk_live_ ]]; then
    echo "⚠️  Warning: Publishable key doesn't start with 'pk_live_'"
    echo "   Are you sure this is a production key? (y/n)"
    read -p "> " confirm
    if [ "$confirm" != "y" ]; then
        echo "Cancelled."
        exit 1
    fi
fi

if [[ ! $CLERK_SECRET_KEY =~ ^sk_live_ ]]; then
    echo "⚠️  Warning: Secret key doesn't start with 'sk_live_'"
    echo "   Are you sure this is a production key? (y/n)"
    read -p "> " confirm
    if [ "$confirm" != "y" ]; then
        echo "Cancelled."
        exit 1
    fi
fi

echo ""
echo "📝 Updating configuration files..."
echo ""

# Backup .env.local
cp .env.local .env.local.backup.$(date +%Y%m%d_%H%M%S)
echo "✅ Backed up .env.local"

# Update .env.local
if [[ "$OSTYPE" == "darwin"* ]]; then
    # macOS
    sed -i '' "s/^NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=.*/NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=$CLERK_PUB_KEY/" .env.local
    sed -i '' "s/^CLERK_SECRET_KEY=.*/CLERK_SECRET_KEY=$CLERK_SECRET_KEY/" .env.local
else
    # Linux
    sed -i "s/^NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=.*/NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=$CLERK_PUB_KEY/" .env.local
    sed -i "s/^CLERK_SECRET_KEY=.*/CLERK_SECRET_KEY=$CLERK_SECRET_KEY/" .env.local
fi
echo "✅ Updated .env.local"

# Update iOS AppConfig
IOS_CONFIG="ios-app/Services/AuthManager.swift"
if [ -f "$IOS_CONFIG" ]; then
    if [[ "$OSTYPE" == "darwin"* ]]; then
        sed -i '' "s/static let clerkPublishableKey = \".*\"/static let clerkPublishableKey = \"$CLERK_PUB_KEY\"/" "$IOS_CONFIG"
    else
        sed -i "s/static let clerkPublishableKey = \".*\"/static let clerkPublishableKey = \"$CLERK_PUB_KEY\"/" "$IOS_CONFIG"
    fi
    echo "✅ Updated iOS config"
else
    echo "⚠️  iOS config not found at $IOS_CONFIG"
fi

echo ""
echo "✅ Configuration updated!"
echo ""
echo "📋 Next steps:"
echo ""
echo "1. Web App (Local):"
echo "   cd /Users/iannjenga/Documents/GitHub/Kara"
echo "   npm run dev"
echo "   → Test at http://localhost:3000"
echo ""
echo "2. Web App (Production - Vercel):"
echo "   → Go to: https://vercel.com/your-project/settings/environment-variables"
echo "   → Update NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY = $CLERK_PUB_KEY"
echo "   → Update CLERK_SECRET_KEY = $CLERK_SECRET_KEY"
echo "   → Redeploy"
echo ""
echo "3. iOS App:"
echo "   cd ios-app"
echo "   ./build-and-install.sh"
echo ""
echo "4. Test Sign In:"
echo "   → Sign up on web with test email"
echo "   → Sign in on iOS with same email"
echo "   → Should work! Same account across platforms ✅"
echo ""
echo "💡 To add Clerk iOS SDK (recommended):"
echo "   See: CLERK_PRODUCTION_SETUP.md"
echo ""
