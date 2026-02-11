#!/bin/bash

# Remove duplicate old files from Xcode project
# These are old versions that conflict with the new synced files

XCODE_PROJECT="/Users/iannjenga/Desktop/MafutaPass/MafutaPass"

echo "🗑️  Removing duplicate old files from Xcode project..."

# Remove old duplicate files
OLD_FILES=(
    "ClerkAuthViews.swift"
    "ClerkMainApp.swift"
    "ImprovedAccountPage.swift"
    "ImprovedHomePage.swift"
    "ImprovedMainApp.swift"
)

# Check Views folder
for file in "${OLD_FILES[@]}"; do
    if [ -f "$XCODE_PROJECT/Views/$file" ]; then
        echo "❌ Removing: Views/$file"
        rm "$XCODE_PROJECT/Views/$file"
    fi
    
    # Also check root folder
    if [ -f "$XCODE_PROJECT/$file" ]; then
        echo "❌ Removing: $file"
        rm "$XCODE_PROJECT/$file"
    fi
done

# List remaining files
echo ""
echo "✅ Remaining View files:"
ls -1 "$XCODE_PROJECT/Views/" 2>/dev/null || echo "No Views folder"

echo ""
echo "✅ Done! Now:"
echo "1. Open Xcode: open ~/Desktop/MafutaPass/MafutaPass.xcodeproj"
echo "2. Clean Build Folder (Shift+Cmd+K)"
echo "3. Build (Cmd+B)"
