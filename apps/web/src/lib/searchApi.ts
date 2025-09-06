/**
 * Client-side API functions for search functionality
 */

import { SearchFilters, SearchResults, SavedSearch } from './types/search'

// Get auth token from Supabase
async function getAuthToken(): Promise<string> {
  const { supabase } = await import('./supabase')
  const { data: { session } } = await supabase.auth.getSession()
  
  if (!session?.access_token) {
    throw new Error('No authentication token available')
  }
  
  return session.access_token
}

// Make authenticated API request
async function authenticatedFetch(url: string, options: RequestInit = {}) {
  const token = await getAuthToken()
  
  return fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
      ...options.headers,
    },
  })
}

/**
 * Search for opportunities with filters
 */
export async function searchOpportunities(filters: SearchFilters): Promise<SearchResults> {
  const response = await authenticatedFetch('/api/search', {
    method: 'POST',
    body: JSON.stringify({ filters }),
  })

  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.error || 'Search failed')
  }

  return response.json()
}

/**
 * Get user's saved searches
 */
export async function getSavedSearches(): Promise<SavedSearch[]> {
  const response = await authenticatedFetch('/api/saved-searches')

  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.error || 'Failed to fetch saved searches')
  }

  const data = await response.json()
  return data.saved_searches
}

/**
 * Create a new saved search
 */
export async function createSavedSearch(
  name: string, 
  filters: SearchFilters, 
  isDefault: boolean = false,
  tenantId?: string
): Promise<SavedSearch> {
  const response = await authenticatedFetch('/api/saved-searches', {
    method: 'POST',
    body: JSON.stringify({
      name,
      filters,
      is_default: isDefault,
      tenant_id: tenantId,
    }),
  })

  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.error || 'Failed to save search')
  }

  const data = await response.json()
  return data.saved_search
}

/**
 * Update a saved search
 */
export async function updateSavedSearch(
  searchId: string,
  updates: {
    name?: string
    filters?: SearchFilters
    is_default?: boolean
  }
): Promise<SavedSearch> {
  const response = await authenticatedFetch(`/api/saved-searches/${searchId}`, {
    method: 'PUT',
    body: JSON.stringify(updates),
  })

  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.error || 'Failed to update saved search')
  }

  const data = await response.json()
  return data.saved_search
}

/**
 * Delete a saved search
 */
export async function deleteSavedSearch(searchId: string): Promise<void> {
  const response = await authenticatedFetch(`/api/saved-searches/${searchId}`, {
    method: 'DELETE',
  })

  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.error || 'Failed to delete saved search')
  }
}

/**
 * Mark a saved search as used (for usage tracking)
 */
export async function useSavedSearch(searchId: string): Promise<SavedSearch> {
  const response = await authenticatedFetch(`/api/saved-searches/${searchId}/use`, {
    method: 'POST',
  })

  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.error || 'Failed to update search usage')
  }

  const data = await response.json()
  return data.saved_search
}

/**
 * Get the default saved search for the current user
 */
export async function getDefaultSavedSearch(): Promise<SavedSearch | null> {
  const savedSearches = await getSavedSearches()
  return savedSearches.find(search => search.is_default) || null
}

/**
 * Load and apply a saved search, updating usage statistics
 */
export async function loadSavedSearch(savedSearch: SavedSearch): Promise<{
  filters: SearchFilters
  updatedSearch: SavedSearch
}> {
  // For now, just return the saved search without usage tracking
  // TODO: Implement proper usage tracking later
  
  return {
    filters: savedSearch.filters,
    updatedSearch: savedSearch
  }
}