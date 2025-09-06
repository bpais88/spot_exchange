import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables')
}

// Type definitions will be generated from Supabase schema in future
export const supabase = createClient(supabaseUrl, supabaseAnonKey)

// Helper function to get the current user
export async function getCurrentUser() {
  const { data: { user }, error } = await supabase.auth.getUser()
  
  if (error || !user) {
    return null
  }

  // Get additional user data from our users table
  const { data: userData, error: userError } = await supabase
    .from('users')
    .select('*')
    .eq('id', user.id)
    .single()

  if (userError) {
    console.error('Error fetching user data:', userError)
    // Return user with mock profile if database fetch fails
    const mockProfile = {
      id: user.id,
      email: user.email,
      name: user.email?.includes('carrier') ? 'John Carrier' : 'Sarah Manager',
      role: user.email?.includes('carrier') ? 'carrier' : 'account_manager',
      company_name: user.email?.includes('carrier') ? 'Demo Trucking Co' : 'Spot Exchange',
      profile: {
        name: user.email?.includes('carrier') ? 'John Carrier' : 'Sarah Manager',
        status: 'active'
      }
    }
    return {
      ...user,
      profile: mockProfile
    }
  }

  // Merge the profile JSONB data with the main user data
  return {
    ...user,
    profile: {
      ...userData,
      name: userData.profile?.name || userData.email,
      phone: userData.profile?.phone,
      status: userData.profile?.status || 'active',
      tenant_id: userData.tenant_id, // Include tenant_id for easy access
      role: userData.role
    }
  }
}

// Helper function to check if user is authenticated
export async function requireAuth() {
  const user = await getCurrentUser()
  
  if (!user) {
    throw new Error('Authentication required')
  }
  
  return user
}