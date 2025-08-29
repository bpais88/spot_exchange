#!/bin/bash

# Build test script for local validation before deploying

echo "🔍 Running build tests..."

# Change to web directory
cd apps/web

# Install dependencies
echo "📦 Installing dependencies..."
npm install

# Run type checking
echo "🔍 Type checking..."
npm run type-check

# Run linting
echo "✨ Linting..."
npm run lint

# Run production build
echo "🏗️ Building for production..."
npm run build

if [ $? -eq 0 ]; then
  echo "✅ Build successful! Ready to deploy."
else
  echo "❌ Build failed. Please fix errors before deploying."
  exit 1
fi