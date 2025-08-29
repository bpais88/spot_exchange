import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { validateSearchFilters, normalizeSearchFilters } from '@/lib/searchUtils'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

const supabase = createClient(supabaseUrl, supabaseServiceKey)

interface RouteParams {
  params: {
    id: string
  }
}

// PUT /api/saved-searches/[id] - Update saved search
export async function PUT(request: NextRequest, { params }: RouteParams) {
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
    const { name, filters, is_default } = body

    // Validate filters if provided
    if (filters) {
      const validationErrors = validateSearchFilters(filters)
      if (validationErrors.length > 0) {
        return NextResponse.json({ 
          error: 'Invalid filters', 
          validation_errors: validationErrors 
        }, { status: 400 })
      }
    }

    // Check if saved search exists and belongs to user
    const { data: existingSearch, error: fetchError } = await supabase
      .from('saved_searches')
      .select('*')
      .eq('id', params.id)
      .eq('user_id', user.id)
      .single()

    if (fetchError || !existingSearch) {
      return NextResponse.json({ error: 'Saved search not found' }, { status: 404 })
    }

    // If setting as default, unset current default first
    if (is_default && !existingSearch.is_default) {
      await supabase
        .from('saved_searches')
        .update({ is_default: false })
        .eq('user_id', user.id)
        .eq('is_default', true)
    }

    // Prepare update data
    const updateData: any = {}
    if (name !== undefined) updateData.name = name.trim()
    if (filters !== undefined) updateData.filters = normalizeSearchFilters(filters)
    if (is_default !== undefined) updateData.is_default = is_default

    // Update the saved search
    const { data: updatedSearch, error } = await supabase
      .from('saved_searches')
      .update(updateData)
      .eq('id', params.id)
      .eq('user_id', user.id)
      .select()
      .single()

    if (error) {
      console.error('Error updating saved search:', error)
      return NextResponse.json({ error: 'Failed to update saved search' }, { status: 500 })
    }

    return NextResponse.json({ saved_search: updatedSearch })

  } catch (error) {
    console.error('Update saved search API error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// DELETE /api/saved-searches/[id] - Delete saved search
export async function DELETE(request: NextRequest, { params }: RouteParams) {
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

    // Check if saved search exists and belongs to user
    const { data: existingSearch, error: fetchError } = await supabase
      .from('saved_searches')
      .select('*')
      .eq('id', params.id)
      .eq('user_id', user.id)
      .single()

    if (fetchError || !existingSearch) {
      return NextResponse.json({ error: 'Saved search not found' }, { status: 404 })
    }

    // Delete the saved search
    const { error } = await supabase
      .from('saved_searches')
      .delete()
      .eq('id', params.id)
      .eq('user_id', user.id)

    if (error) {
      console.error('Error deleting saved search:', error)
      return NextResponse.json({ error: 'Failed to delete saved search' }, { status: 500 })
    }

    return NextResponse.json({ message: 'Saved search deleted successfully' })

  } catch (error) {
    console.error('Delete saved search API error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// POST /api/saved-searches/[id]/use - Mark saved search as used (update usage stats)
export async function POST(request: NextRequest, { params }: RouteParams) {
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

    // First get the current use_count
    const { data: currentSearch } = await supabase
      .from('saved_searches')
      .select('use_count')
      .eq('id', params.id)
      .eq('user_id', user.id)
      .single()

    // Update usage statistics
    const { data: updatedSearch, error } = await supabase
      .from('saved_searches')
      .update({
        use_count: (currentSearch?.use_count || 0) + 1,
        last_used_at: new Date().toISOString()
      })
      .eq('id', params.id)
      .eq('user_id', user.id)
      .select()
      .single()

    if (error) {
      console.error('Error updating search usage:', error)
      return NextResponse.json({ error: 'Failed to update search usage' }, { status: 500 })
    }

    if (!updatedSearch) {
      return NextResponse.json({ error: 'Saved search not found' }, { status: 404 })
    }

    return NextResponse.json({ saved_search: updatedSearch })

  } catch (error) {
    console.error('Update search usage API error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}