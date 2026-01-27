#!/bin/bash

# Build and Install iOS App
# Syncs from Kara, builds with Xcode, and installs on device

set -e

DEVICE_ID="00008030-000E50AC3CC0202E"
XCODE_PROJECT="/Users/iannjenga/Desktop/MafutaPass"

echo "🚀 MafutaPass iOS Build & Install"
echo "=================================="
echo ""

# Step 1: Sync files
echo "1️⃣  Syncing files from Kara..."
bash "$(dirname "$0")/sync-to-xcode.sh"

echo ""
echo "2️⃣  Building and installing on device..."
cd "$XCODE_PROJECT"

xcodebuild \
    -scheme MafutaPass \
    -destination "platform=iOS,id=$DEVICE_ID" \
    -configuration Debug \
    clean build install \
    ENABLE_USER_SCRIPT_SANDBOXING=NO \
    INFOPLIST_KEY_NSCameraUsageDescription="We need access to your camera to scan receipts" \
    INFOPLIST_KEY_NSPhotoLibraryUsageDescription="We need access to your photo library to select receipt images" \
    2>&1 | grep -E "(error:|warning:|BUILD SUCCEEDED|INSTALL SUCCEEDED|INSTALL FAILED)" | head -30

echo ""
echo "✅ Done! Check your iPhone."
