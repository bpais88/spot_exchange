/**
 * Search utility functions for validation, serialization, and filtering
 */

import { 
  SearchFilters, 
  FilterValidationError, 
  LocationFilter,
  DateRange,
  NumericRange,
  EquipmentType,
  CargoType,
  OpportunityStatus,
  UrgencyLevel,
  SortBy,
  SortOrder
} from './types/search'

/**
 * Validate search filters
 */
export function validateSearchFilters(filters: SearchFilters): FilterValidationError[] {
  const errors: FilterValidationError[] = []

  // Validate date ranges
  if (filters.pickup_date_range) {
    const dateError = validateDateRange(filters.pickup_date_range, 'pickup_date_range')
    if (dateError) errors.push(dateError)
  }

  if (filters.delivery_date_range) {
    const dateError = validateDateRange(filters.delivery_date_range, 'delivery_date_range')
    if (dateError) errors.push(dateError)
  }

  // Validate numeric ranges
  if (filters.rate_range) {
    const rateError = validateNumericRange(filters.rate_range, 'rate_range', 0, 1000000)
    if (rateError) errors.push(rateError)
  }

  if (filters.rate_per_mile_range) {
    const rpmError = validateNumericRange(filters.rate_per_mile_range, 'rate_per_mile_range', 0, 50)
    if (rpmError) errors.push(rpmError)
  }

  if (filters.weight_range) {
    const weightError = validateNumericRange(filters.weight_range, 'weight_range', 0, 80000)
    if (weightError) errors.push(weightError)
  }

  if (filters.distance_range) {
    const distanceError = validateNumericRange(filters.distance_range, 'distance_range', 0, 5000)
    if (distanceError) errors.push(distanceError)
  }

  // Validate location filters
  if (filters.origin) {
    const originError = validateLocationFilter(filters.origin, 'origin')
    if (originError) errors.push(originError)
  }

  if (filters.destination) {
    const destError = validateLocationFilter(filters.destination, 'destination')
    if (destError) errors.push(destError)
  }

  // Validate arrays
  if (filters.equipment_types && filters.equipment_types.length === 0) {
    errors.push({
      field: 'equipment_types',
      message: 'At least one equipment type must be selected'
    })
  }

  // Validate pagination
  if (filters.page && filters.page < 1) {
    errors.push({
      field: 'page',
      message: 'Page number must be greater than 0'
    })
  }

  if (filters.per_page && (filters.per_page < 1 || filters.per_page > 100)) {
    errors.push({
      field: 'per_page',
      message: 'Results per page must be between 1 and 100'
    })
  }

  return errors
}

/**
 * Validate date range
 */
function validateDateRange(range: DateRange, field: keyof SearchFilters): FilterValidationError | null {
  if (range.from && range.to) {
    const fromDate = new Date(range.from)
    const toDate = new Date(range.to)
    
    if (fromDate > toDate) {
      return {
        field,
        message: 'From date cannot be after To date'
      }
    }
  }
  
  return null
}

/**
 * Validate numeric range
 */
function validateNumericRange(
  range: NumericRange, 
  field: keyof SearchFilters,
  absoluteMin: number = 0,
  absoluteMax: number = Infinity
): FilterValidationError | null {
  if (range.min !== undefined && range.min < absoluteMin) {
    return {
      field,
      message: `Minimum value cannot be less than ${absoluteMin}`
    }
  }

  if (range.max !== undefined && range.max > absoluteMax) {
    return {
      field,
      message: `Maximum value cannot be greater than ${absoluteMax}`
    }
  }

  if (range.min !== undefined && range.max !== undefined && range.min > range.max) {
    return {
      field,
      message: 'Minimum value cannot be greater than maximum value'
    }
  }

  return null
}

/**
 * Validate location filter
 */
function validateLocationFilter(location: LocationFilter, field: keyof SearchFilters): FilterValidationError | null {
  if (location.radius !== undefined && (location.radius < 0 || location.radius > 500)) {
    return {
      field,
      message: 'Radius must be between 0 and 500 miles'
    }
  }

  return null
}

/**
 * Clean and normalize search filters
 */
export function normalizeSearchFilters(filters: SearchFilters): SearchFilters {
  const normalized: SearchFilters = {}

  // Clean location filters
  if (filters.origin) {
    normalized.origin = cleanLocationFilter(filters.origin)
  }
  if (filters.destination) {
    normalized.destination = cleanLocationFilter(filters.destination)
  }

  // Clean date ranges
  if (filters.pickup_date_range) {
    normalized.pickup_date_range = cleanDateRange(filters.pickup_date_range)
  }
  if (filters.delivery_date_range) {
    normalized.delivery_date_range = cleanDateRange(filters.delivery_date_range)
  }

  // Clean numeric ranges
  if (filters.rate_range) {
    normalized.rate_range = cleanNumericRange(filters.rate_range)
  }
  if (filters.rate_per_mile_range) {
    normalized.rate_per_mile_range = cleanNumericRange(filters.rate_per_mile_range)
  }
  if (filters.weight_range) {
    normalized.weight_range = cleanNumericRange(filters.weight_range)
  }
  if (filters.distance_range) {
    normalized.distance_range = cleanNumericRange(filters.distance_range)
  }

  // Clean arrays (remove duplicates, empty values)
  if (filters.equipment_types) {
    normalized.equipment_types = Array.from(new Set(filters.equipment_types.filter(Boolean)))
  }
  if (filters.cargo_types) {
    normalized.cargo_types = Array.from(new Set(filters.cargo_types.filter(Boolean)))
  }
  if (filters.status_filters) {
    normalized.status_filters = Array.from(new Set(filters.status_filters.filter(Boolean)))
  }
  if (filters.urgency) {
    normalized.urgency = Array.from(new Set(filters.urgency.filter(Boolean)))
  }

  // Clean text search
  if (filters.search_text) {
    normalized.search_text = filters.search_text.trim()
    if (!normalized.search_text) {
      delete normalized.search_text
    }
  }

  // Copy boolean filters
  if (filters.exclude_locked !== undefined) {
    normalized.exclude_locked = filters.exclude_locked
  }
  if (filters.only_no_bids !== undefined) {
    normalized.only_no_bids = filters.only_no_bids
  }
  if (filters.only_my_bids !== undefined) {
    normalized.only_my_bids = filters.only_my_bids
  }
  if (filters.exclude_my_bids !== undefined) {
    normalized.exclude_my_bids = filters.exclude_my_bids
  }

  // Copy sorting and pagination
  if (filters.sort_by) {
    normalized.sort_by = filters.sort_by
  }
  if (filters.sort_order) {
    normalized.sort_order = filters.sort_order
  }
  if (filters.page) {
    normalized.page = Math.max(1, filters.page)
  }
  if (filters.per_page) {
    normalized.per_page = Math.min(100, Math.max(1, filters.per_page))
  }

  return normalized
}

/**
 * Helper functions for cleaning filters
 */
function cleanLocationFilter(location: LocationFilter): LocationFilter {
  const clean: LocationFilter = {}
  
  if (location.city && location.city.trim()) {
    clean.city = location.city.trim()
  }
  if (location.state && location.state.trim()) {
    clean.state = location.state.trim().toUpperCase()
  }
  if (location.radius !== undefined && location.radius >= 0) {
    clean.radius = Math.min(500, location.radius)
  }
  
  return clean
}

function cleanDateRange(range: DateRange): DateRange {
  const clean: DateRange = {}
  
  if (range.from) {
    clean.from = range.from
  }
  if (range.to) {
    clean.to = range.to
  }
  
  return clean
}

function cleanNumericRange(range: NumericRange): NumericRange {
  const clean: NumericRange = {}
  
  if (range.min !== undefined && range.min >= 0) {
    clean.min = range.min
  }
  if (range.max !== undefined && range.max >= 0) {
    clean.max = range.max
  }
  
  return clean
}

/**
 * Convert filters to URL query parameters
 */
export function filtersToQueryParams(filters: SearchFilters): URLSearchParams {
  const params = new URLSearchParams()

  // Location filters
  if (filters.origin?.city) params.set('origin_city', filters.origin.city)
  if (filters.origin?.state) params.set('origin_state', filters.origin.state)
  if (filters.origin?.radius) params.set('origin_radius', filters.origin.radius.toString())
  
  if (filters.destination?.city) params.set('dest_city', filters.destination.city)
  if (filters.destination?.state) params.set('dest_state', filters.destination.state)
  if (filters.destination?.radius) params.set('dest_radius', filters.destination.radius.toString())

  // Date ranges
  if (filters.pickup_date_range?.from) params.set('pickup_from', filters.pickup_date_range.from)
  if (filters.pickup_date_range?.to) params.set('pickup_to', filters.pickup_date_range.to)
  if (filters.delivery_date_range?.from) params.set('delivery_from', filters.delivery_date_range.from)
  if (filters.delivery_date_range?.to) params.set('delivery_to', filters.delivery_date_range.to)

  // Numeric ranges
  if (filters.rate_range?.min) params.set('rate_min', filters.rate_range.min.toString())
  if (filters.rate_range?.max) params.set('rate_max', filters.rate_range.max.toString())
  if (filters.weight_range?.min) params.set('weight_min', filters.weight_range.min.toString())
  if (filters.weight_range?.max) params.set('weight_max', filters.weight_range.max.toString())

  // Arrays
  if (filters.equipment_types?.length) {
    params.set('equipment', filters.equipment_types.join(','))
  }
  if (filters.cargo_types?.length) {
    params.set('cargo', filters.cargo_types.join(','))
  }

  // Boolean flags
  if (filters.exclude_locked) params.set('exclude_locked', 'true')
  if (filters.only_no_bids) params.set('only_no_bids', 'true')

  // Text search
  if (filters.search_text) params.set('q', filters.search_text)

  // Sorting
  if (filters.sort_by) params.set('sort', filters.sort_by)
  if (filters.sort_order) params.set('order', filters.sort_order)

  // Pagination
  if (filters.page) params.set('page', filters.page.toString())
  if (filters.per_page) params.set('per_page', filters.per_page.toString())

  return params
}

/**
 * Convert URL query parameters back to filters
 */
export function queryParamsToFilters(params: URLSearchParams): SearchFilters {
  const filters: SearchFilters = {}

  // Location filters
  const originCity = params.get('origin_city')
  const originState = params.get('origin_state')  
  const originRadius = params.get('origin_radius')
  if (originCity || originState || originRadius) {
    filters.origin = {
      ...(originCity && { city: originCity }),
      ...(originState && { state: originState }),
      ...(originRadius && { radius: parseInt(originRadius) })
    }
  }

  const destCity = params.get('dest_city')
  const destState = params.get('dest_state')
  const destRadius = params.get('dest_radius')
  if (destCity || destState || destRadius) {
    filters.destination = {
      ...(destCity && { city: destCity }),
      ...(destState && { state: destState }),
      ...(destRadius && { radius: parseInt(destRadius) })
    }
  }

  // Date ranges
  const pickupFrom = params.get('pickup_from')
  const pickupTo = params.get('pickup_to')
  if (pickupFrom || pickupTo) {
    filters.pickup_date_range = {
      ...(pickupFrom && { from: pickupFrom }),
      ...(pickupTo && { to: pickupTo })
    }
  }

  const deliveryFrom = params.get('delivery_from')
  const deliveryTo = params.get('delivery_to')
  if (deliveryFrom || deliveryTo) {
    filters.delivery_date_range = {
      ...(deliveryFrom && { from: deliveryFrom }),
      ...(deliveryTo && { to: deliveryTo })
    }
  }

  // Numeric ranges
  const rateMin = params.get('rate_min')
  const rateMax = params.get('rate_max')
  if (rateMin || rateMax) {
    filters.rate_range = {
      ...(rateMin && { min: parseFloat(rateMin) }),
      ...(rateMax && { max: parseFloat(rateMax) })
    }
  }

  const weightMin = params.get('weight_min')
  const weightMax = params.get('weight_max')
  if (weightMin || weightMax) {
    filters.weight_range = {
      ...(weightMin && { min: parseFloat(weightMin) }),
      ...(weightMax && { max: parseFloat(weightMax) })
    }
  }

  // Arrays
  const equipment = params.get('equipment')
  if (equipment) {
    filters.equipment_types = equipment.split(',') as EquipmentType[]
  }

  const cargo = params.get('cargo')
  if (cargo) {
    filters.cargo_types = cargo.split(',') as CargoType[]
  }

  // Boolean flags
  if (params.get('exclude_locked') === 'true') {
    filters.exclude_locked = true
  }
  if (params.get('only_no_bids') === 'true') {
    filters.only_no_bids = true
  }

  // Text search
  const searchText = params.get('q')
  if (searchText) {
    filters.search_text = searchText
  }

  // Sorting
  const sortBy = params.get('sort')
  if (sortBy) {
    filters.sort_by = sortBy as SortBy
  }

  const sortOrder = params.get('order')
  if (sortOrder) {
    filters.sort_order = sortOrder as SortOrder
  }

  // Pagination
  const page = params.get('page')
  if (page) {
    filters.page = parseInt(page)
  }

  const perPage = params.get('per_page')
  if (perPage) {
    filters.per_page = parseInt(perPage)
  }

  return filters
}

/**
 * Check if filters are empty (no active filters)
 */
export function areFiltersEmpty(filters: SearchFilters): boolean {
  return Object.keys(normalizeSearchFilters(filters)).length === 0
}

/**
 * Get a human-readable description of active filters
 */
export function getFiltersDescription(filters: SearchFilters): string {
  const parts: string[] = []

  if (filters.origin?.city) {
    parts.push(`from ${filters.origin.city}`)
  }
  if (filters.destination?.city) {
    parts.push(`to ${filters.destination.city}`)
  }
  if (filters.equipment_types?.length) {
    parts.push(`${filters.equipment_types.join(', ')} equipment`)
  }
  if (filters.rate_range) {
    const { min, max } = filters.rate_range
    if (min && max) {
      parts.push(`$${min.toLocaleString()}-$${max.toLocaleString()}`)
    } else if (min) {
      parts.push(`min $${min.toLocaleString()}`)
    } else if (max) {
      parts.push(`max $${max.toLocaleString()}`)
    }
  }

  return parts.length > 0 ? parts.join(', ') : 'All opportunities'
}