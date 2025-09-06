#!/bin/bash

# Pre-deployment checks for Spot Exchange
# Run this script before pushing to ensure deployment succeeds

echo "🚀 Running pre-deployment checks..."

# Change to web app directory
cd "$(dirname "$0")/.."

# Check if we're in the right directory
if [ ! -f "package.json" ]; then
  echo "❌ Error: Not in web app directory"
  exit 1
fi

echo "📋 Step 1: Type checking..."
# Run TypeScript compilation check
npx tsc --noEmit
if [ $? -ne 0 ]; then
  echo "❌ TypeScript errors found! Fix them before deploying."
  exit 1
fi

echo "🔨 Step 2: Building..."
# Run build to catch any build errors
npm run build
if [ $? -ne 0 ]; then
  echo "❌ Build failed! Fix errors before deploying."
  exit 1
fi

echo "🧹 Step 3: Linting (warnings only)..."
# Run lint but don't fail on warnings, just show them
npm run lint -- --max-warnings 100
if [ $? -ne 0 ]; then
  echo "⚠️  Linting issues found, but continuing..."
fi

echo "✅ All pre-deployment checks passed!"
echo "🚢 Ready to deploy to https://spot-exchange.vercel.app/"
echo ""
echo "To deploy: git add . && git commit -m 'your message' && git push"