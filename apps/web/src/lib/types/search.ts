/**
 * Advanced Search Types and Interfaces
 */

// Location filter type
export interface LocationFilter {
  city?: string
  state?: string
  radius?: number // miles
}

// Date range filter
export interface DateRange {
  from?: string // ISO date string
  to?: string   // ISO date string
}

// Numeric range filter
export interface NumericRange {
  min?: number
  max?: number
}

// Equipment types available in the system
export type EquipmentType = 
  | 'dry_van' 
  | 'reefer' 
  | 'flatbed' 
  | 'step_deck' 
  | 'lowboy' 
  | 'tanker' 
  | 'container' 
  | 'box_truck'
  | 'straight_truck'
  | 'hotshot'

// Cargo types
export type CargoType = 
  | 'general' 
  | 'electronics' 
  | 'food' 
  | 'hazmat' 
  | 'automotive' 
  | 'machinery' 
  | 'textiles' 
  | 'chemicals'
  | 'furniture'
  | 'paper'

// Opportunity status filters
export type OpportunityStatus = 
  | 'active' 
  | 'pending' 
  | 'locked' 
  | 'awarded' 
  | 'completed'
  | 'cancelled'

// Urgency levels
export type UrgencyLevel = 'immediate' | 'urgent' | 'flexible'

// Sort options
export type SortBy = 
  | 'pickup_date' 
  | 'delivery_date' 
  | 'rate' 
  | 'rate_per_mile' 
  | 'distance' 
  | 'created_at'
  | 'bids_count'

export type SortOrder = 'asc' | 'desc'

// Main search filters interface
export interface SearchFilters {
  // Location filters
  origin?: LocationFilter
  destination?: LocationFilter
  
  // Equipment and cargo
  equipment_types?: EquipmentType[]
  cargo_types?: CargoType[]
  
  // Date filters
  pickup_date_range?: DateRange
  delivery_date_range?: DateRange
  
  // Rate and financial filters
  rate_range?: NumericRange
  rate_per_mile_range?: NumericRange
  
  // Physical specifications
  weight_range?: NumericRange // lbs
  distance_range?: NumericRange // miles
  
  // Status and availability
  status_filters?: OpportunityStatus[]
  urgency?: UrgencyLevel[]
  
  // Special filters
  exclude_locked?: boolean
  only_no_bids?: boolean
  only_my_bids?: boolean
  exclude_my_bids?: boolean
  
  // Text search
  search_text?: string // Full text search in cargo description
  
  // Sorting
  sort_by?: SortBy
  sort_order?: SortOrder
  
  // Pagination
  page?: number
  per_page?: number
}

// Saved search interface
export interface SavedSearch {
  id: string
  tenant_id: string
  user_id: string
  name: string
  is_default: boolean
  filters: SearchFilters
  created_at: string
  updated_at: string
  last_used_at?: string
  use_count: number
}

// User search preferences
export interface UserSearchPreferences {
  id: string
  user_id: string
  tenant_id: string
  auto_apply_default_filter: boolean
  show_advanced_filters: boolean
  default_sort_by: SortBy
  default_sort_order: SortOrder
  results_per_page: number
  notify_on_new_matches: boolean
  notification_frequency: 'instant' | 'hourly' | 'daily'
  created_at: string
  updated_at: string
}

// Search result interface
export interface SearchResults {
  opportunities: any[] // Will use existing Opportunity interface
  total_count: number
  page: number
  per_page: number
  total_pages: number
  filters_applied: SearchFilters
}

// Filter validation errors
export interface FilterValidationError {
  field: keyof SearchFilters
  message: string
}

// Filter presets for common searches
export interface FilterPreset {
  name: string
  description: string
  filters: Partial<SearchFilters>
  icon?: string
}

// Default filter presets
export const DEFAULT_FILTER_PRESETS: FilterPreset[] = [
  {
    name: "Today's Pickups",
    description: "Opportunities picking up today",
    filters: {
      pickup_date_range: {
        from: new Date().toISOString().split('T')[0],
        to: new Date().toISOString().split('T')[0]
      }
    },
    icon: "📅"
  },
  {
    name: "High Value Loads",
    description: "Loads over $3,000",
    filters: {
      rate_range: { min: 3000 }
    },
    icon: "💰"
  },
  {
    name: "Short Haul",
    description: "Under 250 miles",
    filters: {
      distance_range: { max: 250 }
    },
    icon: "🚛"
  },
  {
    name: "Long Haul",
    description: "Over 1,000 miles",
    filters: {
      distance_range: { min: 1000 }
    },
    icon: "🛣️"
  },
  {
    name: "Refrigerated Only",
    description: "Reefer equipment only",
    filters: {
      equipment_types: ['reefer']
    },
    icon: "❄️"
  },
  {
    name: "No Bids Yet",
    description: "Opportunities with no bids",
    filters: {
      only_no_bids: true
    },
    icon: "🎯"
  }
]

// Equipment type display names
export const EQUIPMENT_TYPE_LABELS: Record<EquipmentType, string> = {
  dry_van: 'Dry Van',
  reefer: 'Refrigerated',
  flatbed: 'Flatbed',
  step_deck: 'Step Deck',
  lowboy: 'Lowboy',
  tanker: 'Tanker',
  container: 'Container',
  box_truck: 'Box Truck',
  straight_truck: 'Straight Truck',
  hotshot: 'Hotshot'
}

// Cargo type display names  
export const CARGO_TYPE_LABELS: Record<CargoType, string> = {
  general: 'General Freight',
  electronics: 'Electronics',
  food: 'Food & Beverage',
  hazmat: 'Hazmat',
  automotive: 'Automotive',
  machinery: 'Machinery',
  textiles: 'Textiles',
  chemicals: 'Chemicals',
  furniture: 'Furniture',
  paper: 'Paper Products'
}