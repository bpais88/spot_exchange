// This file is reserved for future API client implementation
// Currently, the app uses Supabase directly for all data operations

import { supabase } from './supabase'

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api'

// API client will be implemented when backend API is deployed
// For now, all operations go through Supabase directly

export const api = {
  // Placeholder for future API implementation
  // Currently using Supabase client directly in components
  getSupabaseClient: () => supabase,
  getApiUrl: () => API_URL,
}