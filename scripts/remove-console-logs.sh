#!/bin/bash

# Script to remove all console.log statements from production code
# Keeps console.error for critical error tracking

echo "🧹 Removing console.log statements from codebase..."

# Find all TypeScript and TSX files, excluding node_modules and .next
find . -type f \( -name "*.ts" -o -name "*.tsx" \) \
  ! -path "*/node_modules/*" \
  ! -path "*/.next/*" \
  ! -path "*/dist/*" \
  ! -path "*/scripts/*" \
  -exec sed -i '' '/console\.log(/d' {} +

echo "✅ Removed all console.log statements"
echo "⚠️  console.error and console.warn statements kept for error tracking"
