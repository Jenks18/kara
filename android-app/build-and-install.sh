#!/bin/bash

# MafutaPass Android App - Build and Install Script
# This script builds the Android app and installs it on a connected device or emulator

set -e

echo "🚀 MafutaPass Android Build Script"
echo "=================================="

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Check if we're in the right directory
if [ ! -f "build.gradle.kts" ]; then
    echo -e "${RED}❌ Error: Must run from android-app directory${NC}"
    exit 1
fi

# Clean previous builds
echo -e "\n${BLUE}🧹 Cleaning previous builds...${NC}"
./gradlew clean

# Build the debug APK
echo -e "\n${BLUE}🔨 Building debug APK...${NC}"
./gradlew assembleDebug

if [ $? -eq 0 ]; then
    echo -e "${GREEN}✅ Build successful!${NC}"
    
    # Find the APK
    APK_PATH="app/build/outputs/apk/debug/app-debug.apk"
    
    if [ -f "$APK_PATH" ]; then
        echo -e "\n${GREEN}📦 APK created at: $APK_PATH${NC}"
        
        # Check for connected devices
        DEVICES=$(adb devices | grep -v "List" | grep "device$" | wc -l)
        
        if [ $DEVICES -gt 0 ]; then
            echo -e "\n${BLUE}📱 Installing on device...${NC}"
            adb install -r "$APK_PATH"
            
            if [ $? -eq 0 ]; then
                echo -e "${GREEN}✅ Installation successful!${NC}"
                echo -e "\n${BLUE}🚀 Launching app...${NC}"
                adb shell am start -n com.mafutapass.app/.MainActivity
            else
                echo -e "${RED}❌ Installation failed${NC}"
                exit 1
            fi
        else
            echo -e "\n${RED}⚠️  No devices connected${NC}"
            echo "Connect a device or start an emulator, then run:"
            echo "  adb install -r $APK_PATH"
        fi
    else
        echo -e "${RED}❌ APK not found at expected location${NC}"
        exit 1
    fi
else
    echo -e "${RED}❌ Build failed${NC}"
    exit 1
fi

echo -e "\n${GREEN}✨ Done!${NC}"
