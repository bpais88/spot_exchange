'use client'

import { useState, useEffect } from 'react'
import { 
  Search, 
  Filter, 
  X, 
  MapPin, 
  Calendar, 
  Truck, 
  DollarSign, 
  Weight,
  Save,
  BookmarkPlus,
  ChevronDown,
  ChevronUp
} from 'lucide-react'
import { 
  SearchFilters, 
  EquipmentType, 
  CargoType,
  EQUIPMENT_TYPE_LABELS,
  CARGO_TYPE_LABELS,
  DEFAULT_FILTER_PRESETS,
  SavedSearch 
} from '@/lib/types/search'
import { validateSearchFilters, normalizeSearchFilters, getFiltersDescription } from '@/lib/searchUtils'

interface AdvancedSearchFiltersProps {
  filters: SearchFilters
  onFiltersChange: (filters: SearchFilters) => void
  onSearch: () => void
  savedSearches?: SavedSearch[]
  onSaveSearch?: (name: string, filters: SearchFilters, isDefault?: boolean) => void
  onLoadSearch?: (savedSearch: SavedSearch) => void
  onDeleteSearch?: (searchId: string) => void
  loading?: boolean
}

export default function AdvancedSearchFilters({
  filters,
  onFiltersChange,
  onSearch,
  savedSearches = [],
  onSaveSearch,
  onLoadSearch,
  onDeleteSearch,
  loading = false
}: AdvancedSearchFiltersProps) {
  const [isExpanded, setIsExpanded] = useState(false)
  const [showSaveModal, setShowSaveModal] = useState(false)
  const [saveSearchName, setSaveSearchName] = useState('')
  const [saveAsDefault, setSaveAsDefault] = useState(false)

  // Update filters with validation
  const updateFilters = (updates: Partial<SearchFilters>) => {
    const newFilters = normalizeSearchFilters({ ...filters, ...updates })
    const errors = validateSearchFilters(newFilters)
    
    if (errors.length === 0) {
      onFiltersChange(newFilters)
    } else {
      // Show validation errors
      console.warn('Filter validation errors:', errors)
    }
  }

  // Clear all filters
  const clearAllFilters = () => {
    onFiltersChange({})
  }

  // Apply preset filters
  const applyPreset = (presetFilters: Partial<SearchFilters>) => {
    updateFilters(presetFilters)
    onSearch()
  }

  // Save current search
  const handleSaveSearch = () => {
    if (!onSaveSearch || !saveSearchName.trim()) return
    
    onSaveSearch(saveSearchName.trim(), filters, saveAsDefault)
    setShowSaveModal(false)
    setSaveSearchName('')
    setSaveAsDefault(false)
  }

  // Count active filters
  const activeFilterCount = Object.keys(normalizeSearchFilters(filters)).length

  return (
    <div className="bg-white border border-gray-200 rounded-lg shadow-sm">
      {/* Search Header */}
      <div className="p-4 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4 flex-1">
            {/* Quick Text Search */}
            <div className="flex-1 max-w-md relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
              <input
                type="text"
                placeholder="Search cargo, notes, or company..."
                value={filters.search_text || ''}
                onChange={(e) => updateFilters({ search_text: e.target.value })}
                className="pl-10 pr-4 py-2 w-full border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                onKeyPress={(e) => e.key === 'Enter' && onSearch()}
              />
            </div>

            {/* Search Button */}
            <button
              onClick={onSearch}
              disabled={loading}
              className="bg-blue-600 text-white px-6 py-2 rounded-md hover:bg-blue-700 disabled:opacity-50 flex items-center space-x-2"
            >
              <Search className="h-4 w-4" />
              <span>{loading ? 'Searching...' : 'Search'}</span>
            </button>
          </div>

          {/* Filter Toggle */}
          <div className="flex items-center space-x-2 ml-4">
            {activeFilterCount > 0 && (
              <span className="text-sm text-gray-600 bg-blue-100 px-2 py-1 rounded-full">
                {activeFilterCount} filter{activeFilterCount !== 1 ? 's' : ''}
              </span>
            )}
            
            <button
              onClick={() => setIsExpanded(!isExpanded)}
              className="flex items-center space-x-2 text-gray-600 hover:text-gray-900 px-3 py-2 rounded-md hover:bg-gray-100"
            >
              <Filter className="h-4 w-4" />
              <span>Filters</span>
              {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
            </button>
          </div>
        </div>

        {/* Active Filters Summary */}
        {activeFilterCount > 0 && (
          <div className="mt-3 flex items-center justify-between">
            <p className="text-sm text-gray-600">
              {getFiltersDescription(filters)}
            </p>
            <button
              onClick={clearAllFilters}
              className="text-sm text-red-600 hover:text-red-800 flex items-center space-x-1"
            >
              <X className="h-3 w-3" />
              <span>Clear all</span>
            </button>
          </div>
        )}
      </div>

      {/* Filter Presets */}
      {!isExpanded && (
        <div className="p-4 border-b border-gray-200">
          <div className="flex flex-wrap gap-2">
            {DEFAULT_FILTER_PRESETS.map((preset) => (
              <button
                key={preset.name}
                onClick={() => applyPreset(preset.filters)}
                className="inline-flex items-center space-x-1 px-3 py-1 bg-gray-100 hover:bg-gray-200 rounded-full text-sm text-gray-700 transition-colors"
              >
                <span>{preset.icon}</span>
                <span>{preset.name}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Saved Searches */}
      {savedSearches.length > 0 && !isExpanded && (
        <div className="p-4 border-b border-gray-200">
          <h3 className="text-sm font-medium text-gray-900 mb-2">Saved Searches</h3>
          <div className="flex flex-wrap gap-2">
            {savedSearches.map((savedSearch) => (
              <div key={savedSearch.id} className="flex items-center">
                <button
                  onClick={() => onLoadSearch?.(savedSearch)}
                  className={`px-3 py-1 rounded-l-full text-sm border transition-colors ${
                    savedSearch.is_default
                      ? 'bg-blue-100 border-blue-200 text-blue-800'
                      : 'bg-gray-100 border-gray-200 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  {savedSearch.is_default && '⭐ '}
                  {savedSearch.name}
                </button>
                <button
                  onClick={() => onDeleteSearch?.(savedSearch.id)}
                  className="px-2 py-1 bg-gray-100 hover:bg-red-100 border border-l-0 border-gray-200 rounded-r-full text-gray-500 hover:text-red-600 transition-colors"
                >
                  <X className="h-3 w-3" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Advanced Filters Panel */}
      {isExpanded && (
        <div className="p-6 bg-gray-50">
          <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
            
            {/* Location Filters */}
            <div className="space-y-4">
              <h3 className="flex items-center text-sm font-medium text-gray-900">
                <MapPin className="h-4 w-4 mr-2" />
                Location
              </h3>
              
              {/* Origin */}
              <div>
                <label className="block text-sm text-gray-700 mb-2">Origin</label>
                <div className="grid grid-cols-2 gap-2">
                  <input
                    type="text"
                    placeholder="City"
                    value={filters.origin?.city || ''}
                    onChange={(e) => updateFilters({
                      origin: { ...filters.origin, city: e.target.value }
                    })}
                    className="px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-1 focus:ring-blue-500"
                  />
                  <input
                    type="text"
                    placeholder="State"
                    value={filters.origin?.state || ''}
                    onChange={(e) => updateFilters({
                      origin: { ...filters.origin, state: e.target.value }
                    })}
                    className="px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-1 focus:ring-blue-500"
                  />
                </div>
                <input
                  type="number"
                  placeholder="Radius (miles)"
                  value={filters.origin?.radius || ''}
                  onChange={(e) => updateFilters({
                    origin: { ...filters.origin, radius: parseInt(e.target.value) || undefined }
                  })}
                  className="mt-2 w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-1 focus:ring-blue-500"
                />
              </div>

              {/* Destination */}
              <div>
                <label className="block text-sm text-gray-700 mb-2">Destination</label>
                <div className="grid grid-cols-2 gap-2">
                  <input
                    type="text"
                    placeholder="City"
                    value={filters.destination?.city || ''}
                    onChange={(e) => updateFilters({
                      destination: { ...filters.destination, city: e.target.value }
                    })}
                    className="px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-1 focus:ring-blue-500"
                  />
                  <input
                    type="text"
                    placeholder="State"
                    value={filters.destination?.state || ''}
                    onChange={(e) => updateFilters({
                      destination: { ...filters.destination, state: e.target.value }
                    })}
                    className="px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-1 focus:ring-blue-500"
                  />
                </div>
                <input
                  type="number"
                  placeholder="Radius (miles)"
                  value={filters.destination?.radius || ''}
                  onChange={(e) => updateFilters({
                    destination: { ...filters.destination, radius: parseInt(e.target.value) || undefined }
                  })}
                  className="mt-2 w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-1 focus:ring-blue-500"
                />
              </div>
            </div>

            {/* Date & Equipment Filters */}
            <div className="space-y-4">
              <h3 className="flex items-center text-sm font-medium text-gray-900">
                <Calendar className="h-4 w-4 mr-2" />
                Dates & Equipment
              </h3>

              {/* Pickup Date */}
              <div>
                <label className="block text-sm text-gray-700 mb-2">Pickup Date</label>
                <div className="grid grid-cols-2 gap-2">
                  <input
                    type="date"
                    value={filters.pickup_date_range?.from || ''}
                    onChange={(e) => updateFilters({
                      pickup_date_range: { ...filters.pickup_date_range, from: e.target.value }
                    })}
                    className="px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-1 focus:ring-blue-500"
                  />
                  <input
                    type="date"
                    value={filters.pickup_date_range?.to || ''}
                    onChange={(e) => updateFilters({
                      pickup_date_range: { ...filters.pickup_date_range, to: e.target.value }
                    })}
                    className="px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-1 focus:ring-blue-500"
                  />
                </div>
              </div>

              {/* Equipment Types */}
              <div>
                <label className="block text-sm text-gray-700 mb-2">Equipment Types</label>
                <div className="grid grid-cols-2 gap-2 max-h-32 overflow-y-auto">
                  {Object.entries(EQUIPMENT_TYPE_LABELS).map(([type, label]) => (
                    <label key={type} className="flex items-center">
                      <input
                        type="checkbox"
                        checked={filters.equipment_types?.includes(type as EquipmentType) || false}
                        onChange={(e) => {
                          const current = filters.equipment_types || []
                          const updated = e.target.checked
                            ? [...current, type as EquipmentType]
                            : current.filter(t => t !== type)
                          updateFilters({ equipment_types: updated })
                        }}
                        className="mr-2 text-blue-600 focus:ring-blue-500"
                      />
                      <span className="text-sm">{label}</span>
                    </label>
                  ))}
                </div>
              </div>
            </div>

            {/* Rate & Financial Filters */}
            <div className="space-y-4">
              <h3 className="flex items-center text-sm font-medium text-gray-900">
                <DollarSign className="h-4 w-4 mr-2" />
                Rates & Specs
              </h3>

              {/* Rate Range */}
              <div>
                <label className="block text-sm text-gray-700 mb-2">Rate Range ($)</label>
                <div className="grid grid-cols-2 gap-2">
                  <input
                    type="number"
                    placeholder="Min"
                    value={filters.rate_range?.min || ''}
                    onChange={(e) => updateFilters({
                      rate_range: { ...filters.rate_range, min: parseInt(e.target.value) || undefined }
                    })}
                    className="px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-1 focus:ring-blue-500"
                  />
                  <input
                    type="number"
                    placeholder="Max"
                    value={filters.rate_range?.max || ''}
                    onChange={(e) => updateFilters({
                      rate_range: { ...filters.rate_range, max: parseInt(e.target.value) || undefined }
                    })}
                    className="px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-1 focus:ring-blue-500"
                  />
                </div>
              </div>

              {/* Weight Range */}
              <div>
                <label className="block text-sm text-gray-700 mb-2">Weight Range (lbs)</label>
                <div className="grid grid-cols-2 gap-2">
                  <input
                    type="number"
                    placeholder="Min"
                    value={filters.weight_range?.min || ''}
                    onChange={(e) => updateFilters({
                      weight_range: { ...filters.weight_range, min: parseInt(e.target.value) || undefined }
                    })}
                    className="px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-1 focus:ring-blue-500"
                  />
                  <input
                    type="number"
                    placeholder="Max"
                    value={filters.weight_range?.max || ''}
                    onChange={(e) => updateFilters({
                      weight_range: { ...filters.weight_range, max: parseInt(e.target.value) || undefined }
                    })}
                    className="px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-1 focus:ring-blue-500"
                  />
                </div>
              </div>

              {/* Special Filters */}
              <div className="space-y-2">
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={filters.only_no_bids || false}
                    onChange={(e) => updateFilters({ only_no_bids: e.target.checked })}
                    className="mr-2 text-blue-600 focus:ring-blue-500"
                  />
                  <span className="text-sm">Only loads with no bids</span>
                </label>
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={filters.exclude_locked || false}
                    onChange={(e) => updateFilters({ exclude_locked: e.target.checked })}
                    className="mr-2 text-blue-600 focus:ring-blue-500"
                  />
                  <span className="text-sm">Exclude locked opportunities</span>
                </label>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-between mt-6 pt-4 border-t border-gray-200">
            <div className="flex space-x-2">
              <button
                onClick={clearAllFilters}
                className="px-4 py-2 text-gray-600 hover:text-gray-900 border border-gray-300 rounded-md hover:bg-gray-50"
              >
                Clear All
              </button>
              
              {onSaveSearch && (
                <button
                  onClick={() => setShowSaveModal(true)}
                  className="px-4 py-2 text-blue-600 hover:text-blue-800 border border-blue-300 rounded-md hover:bg-blue-50 flex items-center space-x-2"
                >
                  <Save className="h-4 w-4" />
                  <span>Save Search</span>
                </button>
              )}
            </div>

            <div className="flex space-x-2">
              <button
                onClick={() => setIsExpanded(false)}
                className="px-4 py-2 text-gray-600 hover:text-gray-900 border border-gray-300 rounded-md hover:bg-gray-50"
              >
                Close
              </button>
              <button
                onClick={onSearch}
                disabled={loading}
                className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
              >
                Apply Filters
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Save Search Modal */}
      {showSaveModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center">
          <div className="bg-white rounded-lg p-6 w-96 mx-4">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Save Search</h3>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Search Name
                </label>
                <input
                  type="text"
                  value={saveSearchName}
                  onChange={(e) => setSaveSearchName(e.target.value)}
                  placeholder="e.g., Daily California Routes"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
                />
              </div>
              
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={saveAsDefault}
                  onChange={(e) => setSaveAsDefault(e.target.checked)}
                  className="mr-2 text-blue-600 focus:ring-blue-500"
                />
                <span className="text-sm text-gray-700">
                  Make this my default search (auto-applied on login)
                </span>
              </label>
            </div>
            
            <div className="flex space-x-3 mt-6">
              <button
                onClick={handleSaveSearch}
                disabled={!saveSearchName.trim()}
                className="flex-1 bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 disabled:opacity-50"
              >
                Save Search
              </button>
              <button
                onClick={() => {
                  setShowSaveModal(false)
                  setSaveSearchName('')
                  setSaveAsDefault(false)
                }}
                className="flex-1 bg-gray-200 text-gray-800 py-2 px-4 rounded-md hover:bg-gray-300"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}