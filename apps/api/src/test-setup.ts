// Test script to verify API setup
import express from 'express';
import { getSupabaseClient } from '@spot-exchange/database';

async function testSetup() {
  console.log('🧪 Testing Spot Exchange API Setup...\n');

  // Test 1: Express server
  try {
    const app = express();
    console.log('✅ Express.js imported successfully');
  } catch (error) {
    console.log('❌ Express.js import failed:', error);
    return;
  }

  // Test 2: Shared package imports
  try {
    const { SpotExchangeAPI } = await import('@spot-exchange/shared');
    console.log('✅ Shared package imported successfully');
  } catch (error) {
    console.log('❌ Shared package import failed:', error);
  }

  // Test 3: Database package
  try {
    // This will only work if environment variables are set
    if (process.env.SUPABASE_URL && process.env.SUPABASE_ANON_KEY) {
      const supabase = getSupabaseClient();
      console.log('✅ Supabase client created successfully');
      
      // Test connection
      const { data, error } = await supabase.from('tenants').select('count').limit(1);
      if (error) {
        console.log('⚠️  Supabase connection failed (expected if not configured):', error.message);
      } else {
        console.log('✅ Supabase connection successful');
      }
    } else {
      console.log('⚠️  Supabase environment variables not set (expected for initial setup)');
    }
  } catch (error) {
    console.log('❌ Database package test failed:', error);
  }

  console.log('\n🎉 Setup verification complete!');
  console.log('\nNext steps:');
  console.log('1. Set up your Supabase project');
  console.log('2. Run the database migrations');
  console.log('3. Configure environment variables');
  console.log('4. Run: pnpm dev');
}

testSetup();