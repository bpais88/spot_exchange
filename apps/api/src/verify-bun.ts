// Quick verification that Bun setup works correctly
console.log('🧪 Verifying Bun + Express + TypeScript setup...\n')

// Test 1: Bun runtime
console.log(`✅ Runtime: ${process.versions.bun ? 'Bun' : 'Node.js'} ${process.versions.bun || process.versions.node}`)

// Test 2: TypeScript imports
try {
  const express = require('express')
  console.log('✅ Express.js imported successfully')
} catch (error) {
  console.log('❌ Express.js import failed:', error)
}

// Test 3: Shared package imports  
try {
  const shared = require('@spot-exchange/shared')
  console.log('✅ Shared package imported successfully')
} catch (error) {
  console.log('⚠️  Shared package import failed (expected if not built):', error)
}

// Test 4: Environment variables
console.log(`✅ NODE_ENV: ${process.env.NODE_ENV || 'not set'}`)
console.log(`✅ PORT: ${process.env.PORT || '4000 (default)'}`)

// Test 5: Simple Express app
try {
  const express = require('express')
  const app = express()
  
  app.get('/health', (req: any, res: any) => {
    res.json({ 
      status: 'ok',
      runtime: process.versions.bun ? 'bun' : 'node',
      timestamp: new Date().toISOString()
    })
  })
  
  console.log('✅ Express app created successfully')
  console.log('✅ Health endpoint configured')
  
} catch (error) {
  console.log('❌ Express app creation failed:', error)
}

console.log('\n🎉 Bun + Express + TypeScript verification complete!')
console.log('\nNext steps:')
console.log('1. Configure Supabase environment variables')
console.log('2. Run: bun run dev')
console.log('3. API will be available at http://localhost:4000')