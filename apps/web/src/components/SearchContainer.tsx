'use client'

import { useEffect } from 'react'
import { SearchFilters } from '@/lib/types/search'
import { useSearch } from '@/hooks/useSearch'
import AdvancedSearchFilters from './AdvancedSearchFilters'

interface SearchContainerProps {
  onResultsChange?: (results: any) => void
  initialFilters?: SearchFilters
  autoSearch?: boolean
}

export default function SearchContainer({ 
  onResultsChange,
  initialFilters = {},
  autoSearch = false 
}: SearchContainerProps) {
  const {
    // State
    filters,
    results,
    loading,
    error,
    savedSearches,
    savedSearchesLoading,
    
    // Actions
    setFilters,
    executeSearch,
    saveCurrentSearch,
    loadSavedSearchFilters,
    deleteSavedSearchById,
    syncFiltersToUrl,
    loadFiltersFromUrl
  } = useSearch(initialFilters)

  // Load filters from URL on mount
  useEffect(() => {
    loadFiltersFromUrl()
  }, [loadFiltersFromUrl])

  // Sync filters to URL when they change
  useEffect(() => {
    syncFiltersToUrl()
  }, [filters, syncFiltersToUrl])

  // Pass results to parent component
  useEffect(() => {
    if (onResultsChange && results) {
      onResultsChange(results)
    }
  }, [results, onResultsChange])

  // Auto-search when filters change if enabled
  useEffect(() => {
    if (autoSearch && Object.keys(filters).length > 0) {
      const timeoutId = setTimeout(() => {
        executeSearch()
      }, 300) // Debounce search

      return () => clearTimeout(timeoutId)
    }
  }, [filters, autoSearch, executeSearch])

  const handleSaveSearch = async (name: string, searchFilters: SearchFilters, isDefault?: boolean) => {
    try {
      await saveCurrentSearch(name, isDefault)
    } catch (error) {
      // Error handling is managed by the hook
      console.error('Failed to save search:', error)
    }
  }

  const handleLoadSearch = async (savedSearch: any) => {
    try {
      await loadSavedSearchFilters(savedSearch)
      // Auto-execute search after loading
      setTimeout(() => executeSearch(), 100)
    } catch (error) {
      console.error('Failed to load saved search:', error)
    }
  }

  const handleDeleteSearch = async (searchId: string) => {
    try {
      await deleteSavedSearchById(searchId)
    } catch (error) {
      console.error('Failed to delete saved search:', error)
    }
  }

  return (
    <div className="space-y-6">
      {/* Search Filters Component */}
      <AdvancedSearchFilters
        filters={filters}
        onFiltersChange={setFilters}
        onSearch={executeSearch}
        savedSearches={savedSearches}
        onSaveSearch={handleSaveSearch}
        onLoadSearch={handleLoadSearch}
        onDeleteSearch={handleDeleteSearch}
        loading={loading}
      />

      {/* Error Display */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-md p-4">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <p className="text-sm text-red-800">{error}</p>
            </div>
          </div>
        </div>
      )}

      {/* Loading State */}
      {loading && (
        <div className="bg-blue-50 border border-blue-200 rounded-md p-4">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <svg className="animate-spin h-5 w-5 text-blue-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
            </div>
            <div className="ml-3">
              <p className="text-sm text-blue-800">Searching opportunities...</p>
            </div>
          </div>
        </div>
      )}

      {/* Results Summary */}
      {results && !loading && (
        <div className="bg-gray-50 border border-gray-200 rounded-md p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <p className="text-sm text-gray-900">
                <span className="font-medium">{results.total_count.toLocaleString()}</span> opportunities found
              </p>
              {results.page > 1 && (
                <p className="text-sm text-gray-600">
                  Page {results.page} of {results.total_pages}
                </p>
              )}
            </div>
            
            {Object.keys(filters).length > 0 && (
              <button
                onClick={executeSearch}
                disabled={loading}
                className="inline-flex items-center px-3 py-1 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
              >
                <svg className="h-4 w-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
                Refresh
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  )
}