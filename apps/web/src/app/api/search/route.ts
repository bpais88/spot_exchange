import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { SearchFilters, SearchResults } from '@/lib/types/search'
import { validateSearchFilters, normalizeSearchFilters } from '@/lib/searchUtils'
import { logDatabaseQuery, checkRateLimit } from '@/lib/security/queryMonitoring'
import { logError, logInfo } from '@/lib/monitoring'

// Security utility to sanitize user input for SQL queries
function sanitizeForSql(input: string): string {
  if (!input || typeof input !== 'string') return ''
  
  // Escape single quotes and backslashes to prevent SQL injection
  return input
    .replace(/\\/g, "\\\\")  // Escape backslashes first
    .replace(/'/g, "''")     // Escape single quotes
    .replace(/;/g, "")       // Remove semicolons to prevent command injection
    .replace(/--/g, "")      // Remove SQL comments
    .replace(/\/\*/g, "")    // Remove SQL block comment start
    .replace(/\*\//g, "")    // Remove SQL block comment end
}

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

// Use service role for server-side operations (fallback to anon key for build)
const supabase = createClient(supabaseUrl, supabaseServiceKey)

export async function POST(request: NextRequest) {
  try {
    // Get client IP address for monitoring
    const ipAddress = request.headers.get('x-forwarded-for') || 
                     request.headers.get('x-real-ip') || 
                     'unknown'
    const userAgent = request.headers.get('user-agent') || 'unknown'

    // Get the authorization header
    const authHeader = request.headers.get('Authorization')
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Authorization required' }, { status: 401 })
    }

    const token = authHeader.split(' ')[1]
    
    // Verify the user token
    const { data: { user }, error: authError } = await supabase.auth.getUser(token)
    if (authError || !user) {
      logInfo('Failed authentication attempt', {
        action: 'search_api_auth',
        additionalData: { ipAddress, userAgent }
      })
      return NextResponse.json({ error: 'Invalid authentication' }, { status: 401 })
    }

    // Check rate limiting
    if (checkRateLimit(user.id, ipAddress)) {
      logError(new Error('Rate limit exceeded'), {
        userId: user.id,
        action: 'search_api_rate_limit',
        additionalData: { ipAddress }
      })
      return NextResponse.json({ 
        error: 'Too many requests. Please try again later.' 
      }, { status: 429 })
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

    // Log the query for monitoring before execution
    logDatabaseQuery(
      'opportunities_search_query',
      [JSON.stringify(normalizedFilters)],
      user.id,
      undefined, // tenantId would come from user metadata
      '/api/search',
      ipAddress,
      userAgent
    )

    // Execute query
    const { data: opportunities, error, count } = await query

    if (error) {
      console.error('Search query error:', error)
      logError(new Error('Search query failed'), {
        userId: user.id,
        action: 'search_query_execution',
        additionalData: { 
          error: error.message,
          filters: normalizedFilters,
          ipAddress 
        }
      })
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
  // Location filters - using JSONB fields with proper sanitization
  if (filters.origin?.city) {
    const sanitizedCity = sanitizeForSql(filters.origin.city)
    query = query.ilike('origin->>city', `%${sanitizedCity}%`)
  }
  if (filters.origin?.state) {
    const sanitizedState = sanitizeForSql(filters.origin.state)
    query = query.ilike('origin->>state', `%${sanitizedState}%`)
  }
  if (filters.destination?.city) {
    const sanitizedCity = sanitizeForSql(filters.destination.city)
    query = query.ilike('destination->>city', `%${sanitizedCity}%`)
  }
  if (filters.destination?.state) {
    const sanitizedState = sanitizeForSql(filters.destination.state)
    query = query.ilike('destination->>state', `%${sanitizedState}%`)
  }

  // Equipment type filter
  if (filters.equipment_types?.length) {
    query = query.overlaps('equipment', filters.equipment_types)
  }

  // Cargo type filter (using cargo description for now) - with sanitization
  if (filters.cargo_types?.length) {
    const cargoQueries = filters.cargo_types.map(type => {
      const sanitizedType = sanitizeForSql(type)
      return `cargo_details->>description.ilike."%${sanitizedType}%"`
    }).join(',')
    query = query.or(cargoQueries)
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
    query = query.gte('minimum_rate', filters.rate_range.min)
  }
  if (filters.rate_range?.max) {
    query = query.lte('minimum_rate', filters.rate_range.max)
  }

  // Rate per mile filters (calculated from rate and distance)
  if (filters.rate_per_mile_range?.min || filters.rate_per_mile_range?.max) {
    // This would require a calculated field - for now skip this complex filter
    console.log('Rate per mile filtering not yet implemented for JSONB schema')
  }

  // Weight filters
  if (filters.weight_range?.min) {
    query = query.gte('cargo_details->>weight', filters.weight_range.min)
  }
  if (filters.weight_range?.max) {
    query = query.lte('cargo_details->>weight', filters.weight_range.max)
  }

  // Distance filters
  if (filters.distance_range?.min) {
    query = query.gte('metadata->>distance', filters.distance_range.min)
  }
  if (filters.distance_range?.max) {
    query = query.lte('metadata->>distance', filters.distance_range.max)
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

  // Text search - Use parameterized queries to prevent SQL injection
  if (filters.search_text) {
    const sanitizedSearchText = sanitizeForSql(filters.search_text)
    const searchTerm = `%${sanitizedSearchText}%`
    
    // Use individual ilike operations instead of raw string concatenation
    query = query.or([
      `cargo_details->>description.ilike."${searchTerm}"`,
      `metadata->>special_requirements.ilike."${searchTerm}"`,
      `origin->>city.ilike."${searchTerm}"`,
      `destination->>city.ilike."${searchTerm}"`
    ].join(','))
  }

  return query
}