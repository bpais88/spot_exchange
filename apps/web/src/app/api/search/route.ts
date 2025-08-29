import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { SearchFilters, SearchResults } from '@/lib/types/search'
import { validateSearchFilters, normalizeSearchFilters } from '@/lib/searchUtils'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

// Use service role for server-side operations (fallback to anon key for build)
const supabase = createClient(supabaseUrl, supabaseServiceKey)

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
    const filters: SearchFilters = body.filters || {}
    
    // Validate filters
    const validationErrors = validateSearchFilters(filters)
    if (validationErrors.length > 0) {
      return NextResponse.json({ 
        error: 'Invalid filters', 
        validation_errors: validationErrors 
      }, { status: 400 })
    }

    // Normalize filters
    const normalizedFilters = normalizeSearchFilters(filters)
    
    // Build the query
    let query = supabase
      .from('opportunities')
      .select(`
        *,
        shipper:shippers!inner(name, contact_info),
        bids(id, amount, status, carrier_id)
      `)

    // Apply filters
    query = applyFilters(query, normalizedFilters, user.id)

    // Apply sorting
    if (normalizedFilters.sort_by) {
      const sortOrder = normalizedFilters.sort_order || 'asc'
      query = query.order(normalizedFilters.sort_by, { ascending: sortOrder === 'asc' })
    } else {
      // Default sort by pickup date ascending
      query = query.order('pickup_date', { ascending: true })
    }

    // Apply pagination
    const page = normalizedFilters.page || 1
    const perPage = Math.min(normalizedFilters.per_page || 20, 100)
    const from = (page - 1) * perPage
    const to = from + perPage - 1

    query = query.range(from, to)

    // Execute query
    const { data: opportunities, error, count } = await query

    if (error) {
      console.error('Search query error:', error)
      return NextResponse.json({ error: 'Search failed' }, { status: 500 })
    }

    // Calculate total pages
    const totalCount = count || 0
    const totalPages = Math.ceil(totalCount / perPage)

    const results: SearchResults = {
      opportunities: opportunities || [],
      total_count: totalCount,
      page,
      per_page: perPage,
      total_pages: totalPages,
      filters_applied: normalizedFilters
    }

    return NextResponse.json(results)

  } catch (error) {
    console.error('Search API error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// Helper function to apply filters to the query
function applyFilters(query: any, filters: SearchFilters, userId: string) {
  // Location filters
  if (filters.origin?.city) {
    query = query.ilike('origin_city', `%${filters.origin.city}%`)
  }
  if (filters.origin?.state) {
    query = query.ilike('origin_state', `%${filters.origin.state}%`)
  }
  if (filters.destination?.city) {
    query = query.ilike('destination_city', `%${filters.destination.city}%`)
  }
  if (filters.destination?.state) {
    query = query.ilike('destination_state', `%${filters.destination.state}%`)
  }

  // Equipment type filter
  if (filters.equipment_types?.length) {
    query = query.in('equipment_type', filters.equipment_types)
  }

  // Cargo type filter
  if (filters.cargo_types?.length) {
    query = query.in('cargo_type', filters.cargo_types)
  }

  // Date range filters
  if (filters.pickup_date_range?.from) {
    query = query.gte('pickup_date', filters.pickup_date_range.from)
  }
  if (filters.pickup_date_range?.to) {
    query = query.lte('pickup_date', filters.pickup_date_range.to)
  }
  if (filters.delivery_date_range?.from) {
    query = query.gte('delivery_date', filters.delivery_date_range.from)
  }
  if (filters.delivery_date_range?.to) {
    query = query.lte('delivery_date', filters.delivery_date_range.to)
  }

  // Rate filters
  if (filters.rate_range?.min) {
    query = query.gte('rate', filters.rate_range.min)
  }
  if (filters.rate_range?.max) {
    query = query.lte('rate', filters.rate_range.max)
  }

  // Rate per mile filters
  if (filters.rate_per_mile_range?.min) {
    query = query.gte('rate_per_mile', filters.rate_per_mile_range.min)
  }
  if (filters.rate_per_mile_range?.max) {
    query = query.lte('rate_per_mile', filters.rate_per_mile_range.max)
  }

  // Weight filters
  if (filters.weight_range?.min) {
    query = query.gte('weight', filters.weight_range.min)
  }
  if (filters.weight_range?.max) {
    query = query.lte('weight', filters.weight_range.max)
  }

  // Distance filters
  if (filters.distance_range?.min) {
    query = query.gte('distance', filters.distance_range.min)
  }
  if (filters.distance_range?.max) {
    query = query.lte('distance', filters.distance_range.max)
  }

  // Status filters
  if (filters.status_filters?.length) {
    query = query.in('status', filters.status_filters)
  }

  // Special filters
  if (filters.exclude_locked) {
    query = query.neq('status', 'locked')
  }

  if (filters.only_no_bids) {
    // This requires a more complex query - opportunities with no bids
    // We'll use a NOT EXISTS subquery approach
    query = query.not('id', 'in', 
      supabase.from('bids').select('opportunity_id').neq('status', 'cancelled')
    )
  }

  if (filters.only_my_bids) {
    // Only opportunities where the user has bids
    query = query.in('id', 
      supabase.from('bids').select('opportunity_id').eq('carrier_id', userId)
    )
  }

  if (filters.exclude_my_bids) {
    // Exclude opportunities where the user has bids
    query = query.not('id', 'in', 
      supabase.from('bids').select('opportunity_id').eq('carrier_id', userId)
    )
  }

  // Text search
  if (filters.search_text) {
    const searchTerm = `%${filters.search_text}%`
    query = query.or(`
      cargo_description.ilike.${searchTerm},
      notes.ilike.${searchTerm},
      origin_city.ilike.${searchTerm},
      destination_city.ilike.${searchTerm}
    `)
  }

  return query
}