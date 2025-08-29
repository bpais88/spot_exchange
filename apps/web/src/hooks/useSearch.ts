/**
 * Custom hook for managing search functionality and saved searches
 */

import { useState, useEffect, useCallback } from 'react'
import { SearchFilters, SearchResults, SavedSearch } from '@/lib/types/search'
import { 
  searchOpportunities,
  getSavedSearches,
  createSavedSearch,
  updateSavedSearch,
  deleteSavedSearch,
  loadSavedSearch,
  getDefaultSavedSearch
} from '@/lib/searchApi'
import { normalizeSearchFilters, filtersToQueryParams, queryParamsToFilters } from '@/lib/searchUtils'

interface UseSearchState {
  // Search state
  filters: SearchFilters
  results: SearchResults | null
  loading: boolean
  error: string | null
  
  // Saved searches state
  savedSearches: SavedSearch[]
  savedSearchesLoading: boolean
  savedSearchesError: string | null
}

interface UseSearchActions {
  // Search actions
  setFilters: (filters: SearchFilters) => void
  updateFilters: (updates: Partial<SearchFilters>) => void
  clearFilters: () => void
  executeSearch: () => Promise<void>
  
  // Saved search actions
  loadSavedSearches: () => Promise<void>
  saveCurrentSearch: (name: string, isDefault?: boolean) => Promise<void>
  loadSavedSearchFilters: (savedSearch: SavedSearch) => Promise<void>
  deleteSavedSearchById: (searchId: string) => Promise<void>
  updateSavedSearchById: (searchId: string, updates: { name?: string; is_default?: boolean }) => Promise<void>
  
  // URL sync actions
  syncFiltersToUrl: () => void
  loadFiltersFromUrl: () => void
}

export function useSearch(initialFilters: SearchFilters = {}): UseSearchState & UseSearchActions {
  const [state, setState] = useState<UseSearchState>({
    filters: normalizeSearchFilters(initialFilters),
    results: null,
    loading: false,
    error: null,
    savedSearches: [],
    savedSearchesLoading: false,
    savedSearchesError: null,
  })

  // Search actions
  const setFilters = useCallback((filters: SearchFilters) => {
    setState(prev => ({
      ...prev,
      filters: normalizeSearchFilters(filters),
      error: null
    }))
  }, [])

  const updateFilters = useCallback((updates: Partial<SearchFilters>) => {
    setState(prev => ({
      ...prev,
      filters: normalizeSearchFilters({ ...prev.filters, ...updates }),
      error: null
    }))
  }, [])

  const clearFilters = useCallback(() => {
    setState(prev => ({
      ...prev,
      filters: {},
      error: null
    }))
  }, [])

  const executeSearch = useCallback(async () => {
    setState(prev => ({ ...prev, loading: true, error: null }))
    
    try {
      const results = await searchOpportunities(state.filters)
      setState(prev => ({
        ...prev,
        results,
        loading: false
      }))
    } catch (error) {
      setState(prev => ({
        ...prev,
        loading: false,
        error: error instanceof Error ? error.message : 'Search failed'
      }))
    }
  }, [state.filters])

  // Saved search actions
  const loadSavedSearches = useCallback(async () => {
    setState(prev => ({ ...prev, savedSearchesLoading: true, savedSearchesError: null }))
    
    try {
      const searches = await getSavedSearches()
      setState(prev => ({
        ...prev,
        savedSearches: searches,
        savedSearchesLoading: false
      }))
    } catch (error) {
      setState(prev => ({
        ...prev,
        savedSearchesLoading: false,
        savedSearchesError: error instanceof Error ? error.message : 'Failed to load saved searches'
      }))
    }
  }, [])

  const saveCurrentSearch = useCallback(async (name: string, isDefault: boolean = false) => {
    try {
      const savedSearch = await createSavedSearch(name, state.filters, isDefault)
      setState(prev => ({
        ...prev,
        savedSearches: [savedSearch, ...prev.savedSearches.map(s => 
          isDefault ? { ...s, is_default: false } : s
        )]
      }))
    } catch (error) {
      setState(prev => ({
        ...prev,
        error: error instanceof Error ? error.message : 'Failed to save search'
      }))
      throw error
    }
  }, [state.filters])

  const loadSavedSearchFilters = useCallback(async (savedSearch: SavedSearch) => {
    setState(prev => ({ ...prev, loading: true, error: null }))
    
    try {
      const { filters, updatedSearch } = await loadSavedSearch(savedSearch)
      setState(prev => ({
        ...prev,
        filters: normalizeSearchFilters(filters),
        loading: false,
        savedSearches: prev.savedSearches.map(s => 
          s.id === updatedSearch.id ? updatedSearch : s
        )
      }))
    } catch (error) {
      setState(prev => ({
        ...prev,
        loading: false,
        error: error instanceof Error ? error.message : 'Failed to load saved search'
      }))
    }
  }, [])

  const deleteSavedSearchById = useCallback(async (searchId: string) => {
    try {
      await deleteSavedSearch(searchId)
      setState(prev => ({
        ...prev,
        savedSearches: prev.savedSearches.filter(s => s.id !== searchId)
      }))
    } catch (error) {
      setState(prev => ({
        ...prev,
        error: error instanceof Error ? error.message : 'Failed to delete saved search'
      }))
      throw error
    }
  }, [])

  const updateSavedSearchById = useCallback(async (
    searchId: string, 
    updates: { name?: string; is_default?: boolean }
  ) => {
    try {
      const updatedSearch = await updateSavedSearch(searchId, updates)
      setState(prev => ({
        ...prev,
        savedSearches: prev.savedSearches.map(s => {
          if (s.id === updatedSearch.id) {
            return updatedSearch
          }
          // If this search is being set as default, unset others
          if (updates.is_default && s.is_default) {
            return { ...s, is_default: false }
          }
          return s
        })
      }))
    } catch (error) {
      setState(prev => ({
        ...prev,
        error: error instanceof Error ? error.message : 'Failed to update saved search'
      }))
      throw error
    }
  }, [])

  // URL sync actions
  const syncFiltersToUrl = useCallback(() => {
    if (typeof window !== 'undefined') {
      const params = filtersToQueryParams(state.filters)
      const newUrl = `${window.location.pathname}?${params.toString()}`
      window.history.replaceState({}, '', newUrl)
    }
  }, [state.filters])

  const loadFiltersFromUrl = useCallback(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search)
      const filters = queryParamsToFilters(params)
      setFilters(filters)
    }
  }, [setFilters])

  // Load saved searches on mount
  useEffect(() => {
    loadSavedSearches()
  }, [loadSavedSearches])

  // Auto-apply default search on mount if no filters are set
  useEffect(() => {
    const applyDefaultSearch = async () => {
      if (Object.keys(state.filters).length === 0 && state.savedSearches.length > 0) {
        const defaultSearch = state.savedSearches.find(s => s.is_default)
        if (defaultSearch) {
          await loadSavedSearchFilters(defaultSearch)
        }
      }
    }

    if (!state.savedSearchesLoading && !state.savedSearchesError) {
      applyDefaultSearch()
    }
  }, [state.savedSearches, state.savedSearchesLoading, state.savedSearchesError, state.filters, loadSavedSearchFilters])

  return {
    // State
    filters: state.filters,
    results: state.results,
    loading: state.loading,
    error: state.error,
    savedSearches: state.savedSearches,
    savedSearchesLoading: state.savedSearchesLoading,
    savedSearchesError: state.savedSearchesError,
    
    // Actions
    setFilters,
    updateFilters,
    clearFilters,
    executeSearch,
    loadSavedSearches,
    saveCurrentSearch,
    loadSavedSearchFilters,
    deleteSavedSearchById,
    updateSavedSearchById,
    syncFiltersToUrl,
    loadFiltersFromUrl,
  }
}