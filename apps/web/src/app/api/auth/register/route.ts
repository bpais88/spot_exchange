import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

// Use service role for server-side operations
const supabase = createClient(supabaseUrl, supabaseServiceKey)

export async function POST(request: NextRequest) {
  try {
    const { email, password, companyName, userRole = 'carrier' } = await request.json()
    
    if (!email || !password || !companyName) {
      return NextResponse.json(
        { error: 'Missing required fields: email, password, companyName' },
        { status: 400 }
      )
    }

    // Step 1: Create the auth user
    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true, // Auto-confirm for development
      user_metadata: {
        company_name: companyName,
        user_role: userRole
      }
    })

    if (authError || !authData.user) {
      console.error('Auth user creation failed:', authError)
      return NextResponse.json(
        { error: authError?.message || 'Failed to create user account' },
        { status: 400 }
      )
    }

    const userId = authData.user.id

    // Step 2: Create tenant record
    const tenantId = crypto.randomUUID()
    const { error: tenantError } = await supabase
      .from('tenants')
      .insert({
        id: tenantId,
        name: companyName,
        subscription_tier: 'free',
        settings: {
          company_name: companyName,
          created_via: 'registration'
        },
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })

    if (tenantError) {
      console.error('Tenant creation failed:', tenantError)
      
      // Cleanup: Delete the auth user if tenant creation fails
      await supabase.auth.admin.deleteUser(userId)
      
      return NextResponse.json(
        { error: 'Failed to create company profile' },
        { status: 500 }
      )
    }

    // Step 3: Create user record
    const { error: userError } = await supabase
      .from('users')
      .insert({
        id: userId,
        email,
        tenant_id: tenantId,
        role: userRole,
        profile: {
          name: email.split('@')[0], // Default name from email
          company_name: companyName,
          status: 'active'
        },
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })

    if (userError) {
      console.error('User profile creation failed:', userError)
      
      // Cleanup: Delete tenant and auth user if user creation fails
      await supabase.from('tenants').delete().eq('id', tenantId)
      await supabase.auth.admin.deleteUser(userId)
      
      return NextResponse.json(
        { error: 'Failed to create user profile' },
        { status: 500 }
      )
    }

    // Step 4: Sign in the user and return session
    const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
      email,
      password
    })

    if (signInError) {
      console.error('Auto sign-in failed:', signInError)
      // User is created but couldn't auto sign-in
      return NextResponse.json({
        success: true,
        message: 'Account created successfully. Please sign in.',
        requiresSignIn: true
      })
    }

    return NextResponse.json({
      success: true,
      message: 'Account created successfully!',
      user: {
        id: userId,
        email,
        tenantId,
        role: userRole,
        companyName
      },
      session: signInData.session
    })

  } catch (error) {
    console.error('Registration API error:', error)
    return NextResponse.json(
      { error: 'Internal server error during registration' },
      { status: 500 }
    )
  }
}