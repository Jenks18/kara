#!/bin/bash

# Kara Fuel Tracker - Quick Deploy to Vercel

echo "🚗 Kara Fuel Expense Tracker - Vercel Deployment"
echo "================================================="
echo ""

# Check if git is initialized
if [ ! -d .git ]; then
    echo "📦 Initializing git repository..."
    git init
    git add .
    git commit -m "Initial commit: Kara fuel expense tracker"
    git branch -M main
    echo "✅ Git repository initialized"
    echo ""
else
    echo "✅ Git repository already exists"
    echo ""
fi

# Check if Vercel CLI is installed
if ! command -v vercel &> /dev/null; then
    echo "❌ Vercel CLI not found. Installing..."
    npm i -g vercel
    echo "✅ Vercel CLI installed"
    echo ""
else
    echo "✅ Vercel CLI is installed"
    echo ""
fi

echo "🚀 Deploying to Vercel..."
echo ""
vercel --prod

echo ""
echo "✨ Deployment complete!"
echo ""
echo "Next steps:"
echo "1. Test your app on mobile devices"
echo "2. Share the URL with your team"
echo "3. Set up a custom domain (optional)"
echo ""
echo "Happy tracking! 🎉"
