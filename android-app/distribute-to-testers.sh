#!/bin/bash
# Quick distribution script for test users

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}🚀 MafutaPass - Quick Distribution Setup${NC}\n"

# 1. Build fresh APK
echo -e "${GREEN}1. Building fresh debug APK...${NC}"
cd /Users/iannjenga/Documents/GitHub/Kara/android-app
./gradlew assembleDebug

if [ $? -eq 0 ]; then
    echo -e "${GREEN}✅ Build successful!${NC}\n"
else
    echo "❌ Build failed. Please fix errors and try again."
    exit 1
fi

# 2. Locate APK
APK_PATH="app/build/outputs/apk/debug/app-debug.apk"
APK_SIZE=$(du -h "$APK_PATH" | cut -f1)

echo -e "${GREEN}2. APK Ready!${NC}"
echo "   Location: $APK_PATH"
echo "   Size: $APK_SIZE"
echo ""

# 3. Generate QR code for easy mobile download (if qrencode installed)
if command -v qrencode &> /dev/null; then
    echo -e "${GREEN}3. Generating QR code...${NC}"
    # You'll need to host this somewhere first
    echo "   (Upload APK first, then generate QR)"
else
    echo -e "${BLUE}3. Install QR code generator (optional):${NC}"
    echo "   brew install qrencode"
fi

echo ""
echo -e "${BLUE}📱 Next Steps for Distribution:${NC}"
echo ""
echo "OPTION A - Quick & Simple (Today):"
echo "  1. Upload $APK_PATH to:"
echo "     • Google Drive (share link)"
echo "     • Your web server"
echo "     • GitHub Release"
echo "  2. Send link to testers"
echo "  3. Testers enable 'Install from Unknown Sources' and install"
echo ""
echo "OPTION B - Professional (30 minutes):"
echo "  1. Read: FIREBASE_DISTRIBUTION_SETUP.md"
echo "  2. Setup Firebase App Distribution"
echo "  3. Invite testers via email"
echo "  4. Get crash reports automatically"
echo ""
echo "OPTION C - Play Store Testing (2-3 hours, \$25):"
echo "  1. Read: PLAY_STORE_TESTING_SETUP.md"
echo "  2. Create Play Console account"
echo "  3. Upload to Internal Testing"
echo "  4. Testers install from Play Store"
echo ""
echo -e "${GREEN}✨ Your APK is ready at:${NC}"
echo "   $APK_PATH"
echo ""
