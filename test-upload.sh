#!/bin/bash

# Test receipt upload endpoint

echo "Testing receipt upload to Vercel..."

# Check if test image exists
if [ ! -f "test-receipt.jpg" ]; then
  echo "❌ Create a test-receipt.jpg file first"
  exit 1
fi

echo "📤 Uploading receipt..."

curl -v -X POST "https://kara-psi-flame.vercel.app/api/receipts/upload" \
  -F "image=@test-receipt.jpg" \
  -F "userEmail=test@example.com" \
  -F "latitude=-1.2921" \
  -F "longitude=36.8219" \
  2>&1 | tee upload-response.txt

echo ""
echo "✅ Response saved to upload-response.txt"
echo ""
echo "Check for:"
echo "- HTTP 200 OK"
echo "- JSON response with receipt ID"
echo "- Any error messages"
