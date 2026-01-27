#!/bin/bash

# iOS App Sync Script
# Syncs SwiftUI files from Kara repo to Xcode project

set -e

KARA_IOS="/Users/iannjenga/Documents/GitHub/Kara/ios-app"
XCODE_PROJECT="/Users/iannjenga/Desktop/MafutaPass/MafutaPass"

echo "🔄 Syncing iOS app from Kara to Xcode..."

# Sync Models
echo "📦 Syncing Models..."
cp -f "$KARA_IOS/Models/Models.swift" "$XCODE_PROJECT/Models/"

# Sync Services
echo "🔌 Syncing Services..."
cp -f "$KARA_IOS/Services/API.swift" "$XCODE_PROJECT/Services/"

# Sync Components
echo "🧩 Syncing Components..."
mkdir -p "$XCODE_PROJECT/Components"
cp -f "$KARA_IOS/Components/"*.swift "$XCODE_PROJECT/Components/" 2>/dev/null || true

# Sync Views
echo "📱 Syncing Views..."
cp -f "$KARA_IOS/Views/"*.swift "$XCODE_PROJECT/Views/"

# Copy HomePage to Views if it exists
if [ -f "$XCODE_PROJECT/Views/HomePage.swift" ]; then
    echo "✅ HomePage.swift already in Views"
else
    echo "⚠️  HomePage.swift not found in Views"
fi

echo ""
echo "✅ Sync complete!"
echo ""
echo "📋 Next steps:"
echo "1. Open Xcode project: open ~/Desktop/MafutaPass/MafutaPass.xcodeproj"
echo "2. Add new files to project if needed (Components folder)"
echo "3. Update MafutaPassApp.swift to use MainAppView"
echo "4. Build and run!"
echo ""
echo "🔨 Or run auto-build:"
echo "./ios-app/build-and-install.sh"
