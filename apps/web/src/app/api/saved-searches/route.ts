import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { SavedSearch, SearchFilters } from '@/lib/types/search'
import { validateSearchFilters, normalizeSearchFilters } from '@/lib/searchUtils'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

const supabase = createClient(supabaseUrl, supabaseServiceKey)

// GET /api/saved-searches - Get user's saved searches
export async function GET(request: NextRequest) {
  try {
    // Get the authorization header
    const authHeader = request.headers.get('Authorization')
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Authorization required' }, { status: 401 })
    }

    const token = authHeader.split(' ')[1]
    
    // Verify the user token
    const { data: { user }, error: authError } = await supabase.auth.getUser(token)
    if (authError || !user) {
      return NextResponse.json({ error: 'Invalid authentication' }, { status: 401 })
    }

    // Get user's saved searches
    const { data: savedSearches, error } = await supabase
      .from('saved_searches')
      .select('*')
      .eq('user_id', user.id)
      .order('is_default', { ascending: false })
      .order('last_used_at', { ascending: false, nullsFirst: false })
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Error fetching saved searches:', error)
      return NextResponse.json({ error: 'Failed to fetch saved searches' }, { status: 500 })
    }

    return NextResponse.json({ saved_searches: savedSearches || [] })

  } catch (error) {
    console.error('Saved searches API error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// POST /api/saved-searches - Create new saved search
export async function POST(request: NextRequest) {
  try {
    // Get the authorization header
    const authHeader = request.headers.get('Authorization')
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Authorization required' }, { status: 401 })
    }

    const token = authHeader.split(' ')[1]
    
    // Verify the user token
    const { data: { user }, error: authError } = await supabase.auth.getUser(token)
    if (authError || !user) {
      return NextResponse.json({ error: 'Invalid authentication' }, { status: 401 })
    }

    // Parse request body
    const body = await request.json()
    const { name, filters, is_default = false, tenant_id } = body

    if (!name?.trim()) {
      return NextResponse.json({ error: 'Search name is required' }, { status: 400 })
    }

    // Validate filters
    const validationErrors = validateSearchFilters(filters || {})
    if (validationErrors.length > 0) {
      return NextResponse.json({ 
        error: 'Invalid filters', 
        validation_errors: validationErrors 
      }, { status: 400 })
    }

    // Normalize filters
    const normalizedFilters = normalizeSearchFilters(filters || {})

    // If setting as default, unset current default first
    if (is_default) {
      await supabase
        .from('saved_searches')
        .update({ is_default: false })
        .eq('user_id', user.id)
        .eq('is_default', true)
    }

    // Create the saved search
    const { data: savedSearch, error } = await supabase
      .from('saved_searches')
      .insert({
        user_id: user.id,
        tenant_id: tenant_id || user.app_metadata?.tenant_id,
        name: name.trim(),
        filters: normalizedFilters,
        is_default
      })
      .select()
      .single()

    if (error) {
      console.error('Error creating saved search:', error)
      return NextResponse.json({ error: 'Failed to save search' }, { status: 500 })
    }

    return NextResponse.json({ saved_search: savedSearch }, { status: 201 })

  } catch (error) {
    console.error('Create saved search API error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}