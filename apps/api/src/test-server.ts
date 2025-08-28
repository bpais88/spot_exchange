// Simplified test server without workspace dependencies
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import morgan from 'morgan';
import dotenv from 'dotenv';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 4000;

// Security middleware
app.use(helmet());

// CORS configuration
app.use(cors({
  origin: ['http://localhost:3000', 'http://localhost:3001'],
  credentials: true,
}));

// Body parsing and compression
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(compression());

// Logging
app.use(morgan('dev'));

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    timestamp: new Date().toISOString(),
    runtime: process.versions.bun ? 'bun' : 'node',
    version: process.versions.bun || process.versions.node,
    environment: process.env.NODE_ENV || 'development'
  });
});

// Test endpoints
app.get('/api/test', (req, res) => {
  res.json({
    success: true,
    message: 'Spot Exchange API is running!',
    features: [
      'Multi-tenant architecture ready',
      'Real-time bidding system',
      'Collaboration features',
      'Price lock functionality',
      'Mobile-ready API'
    ]
  });
});

// Supabase connection test
app.get('/api/test/supabase', async (req, res) => {
  try {
    const { createClient } = await import('@supabase/supabase-js');
    
    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_ANON_KEY;
    
    if (!supabaseUrl || !supabaseKey) {
      return res.status(500).json({
        success: false,
        error: 'Supabase environment variables not configured'
      });
    }
    
    if (supabaseUrl.includes('your-project-id')) {
      return res.json({
        success: false,
        message: 'Please configure real Supabase credentials in .env file',
        instructions: 'See SUPABASE_SETUP.md for setup instructions'
      });
    }
    
    const supabase = createClient(supabaseUrl, supabaseKey);
    
    // Test connection
    const { error } = await supabase.from('tenants').select('count').limit(1);
    
    if (error) {
      return res.status(500).json({
        success: false,
        error: error.message
      });
    }
    
    res.json({
      success: true,
      message: 'Supabase connection successful!',
      url: supabaseUrl
    });
    
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to test Supabase connection',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    error: 'Endpoint not found',
    availableEndpoints: [
      'GET /health',
      'GET /api/test',
      'GET /api/test/supabase'
    ]
  });
});

// Start server
const server = app.listen(PORT, () => {
  console.log(`\n🚀 Spot Exchange API Server`);
  console.log(`📍 Running on: http://localhost:${PORT}`);
  console.log(`⚡ Runtime: ${process.versions.bun ? 'Bun' : 'Node.js'} ${process.versions.bun || process.versions.node}`);
  console.log(`🌍 Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`\n📋 Test endpoints:`);
  console.log(`   • Health: http://localhost:${PORT}/health`);
  console.log(`   • API Test: http://localhost:${PORT}/api/test`);
  console.log(`   • Supabase: http://localhost:${PORT}/api/test/supabase`);
  console.log(`\n💡 Next steps:`);
  console.log(`   1. Configure Supabase (see SUPABASE_SETUP.md)`);
  console.log(`   2. Run database migrations`);
  console.log(`   3. Start web app: cd apps/web && npm run dev`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('\n🔄 Shutting down gracefully...');
  server.close(() => {
    console.log('✅ Server closed');
    process.exit(0);
  });
});

export default app;