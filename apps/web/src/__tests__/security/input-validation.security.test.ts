/**
 * Security tests for input validation utilities
 * Tests searchUtils validation functions
 */

import {
  validateSearchFilters,
  normalizeSearchFilters
} from '@/lib/searchUtils'
import { SearchFilters } from '@/lib/types/search'

describe('Input Validation Security Tests', () => {
  describe('Search Text Validation', () => {
    test('should detect SQL injection patterns', () => {
      const maliciousInputs = [
        "'; DROP TABLE opportunities; --",
        "' UNION SELECT * FROM users --",
        "'; INSERT INTO malicious VALUES ('hack'); --",
        "' OR '1'='1' --",
        "'; EXEC xp_cmdshell('dir'); --",
        "admin'/**/UNION/**/SELECT/**/password/**/FROM/**/users--"
      ]

      maliciousInputs.forEach(input => {
        const filters: SearchFilters = { search_text: input }
        const errors = validateSearchFilters(filters)
        
        expect(errors.length).toBeGreaterThan(0)
        expect(errors.some(error => 
          error.message.includes('dangerous patterns') || 
          error.message.includes('invalid characters')
        )).toBe(true)
      })
    })

    test('should allow safe search text', () => {
      const safeInputs = [
        "Chicago to Los Angeles freight",
        "Electronics shipment needed",
        "Refrigerated transport required",
        "Heavy machinery - special handling"
      ]

      safeInputs.forEach(input => {
        const filters: SearchFilters = { search_text: input }
        const errors = validateSearchFilters(filters)
        
        const searchTextErrors = errors.filter(e => e.field === 'search_text')
        expect(searchTextErrors).toHaveLength(0)
      })
    })

    test('should reject excessively long search text', () => {
      const longText = 'a'.repeat(1001) // Over 1000 character limit
      const filters: SearchFilters = { search_text: longText }
      const errors = validateSearchFilters(filters)
      
      expect(errors.some(error => 
        error.field === 'search_text' && 
        error.message.includes('too long')
      )).toBe(true)
    })
  })

  describe('Location Validation', () => {
    test('should detect malicious location inputs', () => {
      const maliciousLocations = [
        "'; DELETE FROM users; --",
        "Chicago'; DROP TABLE opportunities; --",
        "' OR 1=1 --",
        "<script>alert('xss')</script>",
        "'; EXEC('malicious code'); --"
      ]

      maliciousLocations.forEach(location => {
        const filters: SearchFilters = {
          origin: { city: location },
          destination: { state: location }
        }
        const errors = validateSearchFilters(filters)
        
        expect(errors.length).toBeGreaterThan(0)
      })
    })

    test('should allow valid location names', () => {
      const validLocations = [
        "New York",
        "Los Angeles",
        "Chicago",
        "Houston",
        "St. Louis",
        "Salt Lake City"
      ]

      validLocations.forEach(location => {
        const filters: SearchFilters = {
          origin: { city: location },
          destination: { state: location }
        }
        const errors = validateSearchFilters(filters)
        
        const locationErrors = errors.filter(e => 
          e.field === 'origin' || e.field === 'destination'
        )
        expect(locationErrors).toHaveLength(0)
      })
    })
  })

  describe('Date Range Validation', () => {
    test('should validate date format', () => {
      const invalidDates = [
        "'; DROP TABLE dates; --",
        "2024-13-45", // Invalid date
        "not-a-date",
        "2024/12/31", // Wrong format
        "<script>alert('xss')</script>"
      ]

      invalidDates.forEach(date => {
        const filters: SearchFilters = {
          pickup_date_range: { from: date, to: date }
        }
        const errors = validateSearchFilters(filters)
        expect(errors.length).toBeGreaterThan(0)
      })
    })

    test('should accept valid ISO dates', () => {
      const validDates = [
        "2024-01-01",
        "2024-12-31",
        "2025-06-15"
      ]

      validDates.forEach(date => {
        const filters: SearchFilters = {
          pickup_date_range: { from: date, to: date }
        }
        const errors = validateSearchFilters(filters)
        const dateErrors = errors.filter(e => e.field === 'pickup_date_range')
        expect(dateErrors).toHaveLength(0)
      })
    })

    test('should reject date ranges where from > to', () => {
      const filters: SearchFilters = {
        pickup_date_range: { from: "2024-12-31", to: "2024-01-01" }
      }
      const errors = validateSearchFilters(filters)
      expect(errors.some(error => 
        error.field === 'pickup_date_range' && 
        error.message.includes('from date must be before')
      )).toBe(true)
    })
  })

  describe('Numeric Range Validation', () => {
    test('should reject non-numeric values', () => {
      const invalidNumbers = [
        "'; DROP TABLE numbers; --",
        "not-a-number",
        "<script>alert('xss')</script>",
        "Infinity",
        "NaN"
      ]

      invalidNumbers.forEach(value => {
        const filters: SearchFilters = {
          rate_range: { min: value as any, max: value as any }
        }
        const errors = validateSearchFilters(filters)
        expect(errors.length).toBeGreaterThan(0)
      })
    })

    test('should reject negative rates and weights', () => {
      const filters: SearchFilters = {
        rate_range: { min: -1000, max: -500 },
        weight_range: { min: -100, max: -50 }
      }
      const errors = validateSearchFilters(filters)
      
      expect(errors.some(error => 
        error.message.includes('cannot be negative') || 
        error.message.includes('must be positive')
      )).toBe(true)
    })

    test('should reject ranges where min > max', () => {
      const filters: SearchFilters = {
        rate_range: { min: 1000, max: 500 }
      }
      const errors = validateSearchFilters(filters)
      expect(errors.some(error => 
        error.message.includes('min') && error.message.includes('max')
      )).toBe(true)
    })

    test('should accept valid numeric ranges', () => {
      const filters: SearchFilters = {
        rate_range: { min: 500, max: 1000 },
        weight_range: { min: 0, max: 100 }
      }
      const errors = validateSearchFilters(filters)
      const numericErrors = errors.filter(e => 
        e.field === 'rate_range' || e.field === 'weight_range'
      )
      expect(numericErrors).toHaveLength(0)
    })
  })

  describe('Equipment and Cargo Type Validation', () => {
    test('should reject invalid equipment types', () => {
      const filters: SearchFilters = {
        equipment_types: ['invalid_type', 'malicious_type', "'; DROP TABLE equipment; --"] as any
      }
      const errors = validateSearchFilters(filters)
      
      expect(errors.some(error => 
        error.field === 'equipment_types' && 
        error.message.includes('Invalid equipment type')
      )).toBe(true)
    })

    test('should reject invalid cargo types', () => {
      const filters: SearchFilters = {
        cargo_types: ['invalid_cargo', '<script>alert("xss")</script>'] as any
      }
      const errors = validateSearchFilters(filters)
      
      expect(errors.some(error => 
        error.field === 'cargo_types' && 
        error.message.includes('Invalid cargo type')
      )).toBe(true)
    })

    test('should accept valid equipment and cargo types', () => {
      const filters: SearchFilters = {
        equipment_types: ['dry_van', 'reefer', 'flatbed'],
        cargo_types: ['general', 'food', 'electronics']
      }
      const errors = validateSearchFilters(filters)
      
      const typeErrors = errors.filter(e => 
        e.field === 'equipment_types' || e.field === 'cargo_types'
      )
      expect(typeErrors).toHaveLength(0)
    })
  })

  describe('Pagination Security', () => {
    test('should limit maximum page size', () => {
      const filters: SearchFilters = {
        per_page: 10000 // Excessive page size
      }
      const normalized = normalizeSearchFilters(filters)
      
      expect(normalized.per_page).toBeLessThanOrEqual(100)
    })

    test('should handle negative page numbers', () => {
      const filters: SearchFilters = {
        page: -1,
        per_page: -10
      }
      const normalized = normalizeSearchFilters(filters)
      
      expect(normalized.page).toBeGreaterThanOrEqual(1)
      expect(normalized.per_page).toBeGreaterThanOrEqual(1)
    })

    test('should reject malicious pagination values', () => {
      const filters: SearchFilters = {
        page: "'; DROP TABLE pagination; --" as any,
        per_page: "<script>alert('xss')</script>" as any
      }
      const errors = validateSearchFilters(filters)
      
      expect(errors.length).toBeGreaterThan(0)
    })
  })

  describe('Filter Normalization', () => {
    test('should trim whitespace from text inputs', () => {
      const filters: SearchFilters = {
        search_text: "  test search  ",
        origin: { city: "  Chicago  " },
        destination: { state: "  Illinois  " }
      }
      const normalized = normalizeSearchFilters(filters)
      
      expect(normalized.search_text).toBe("test search")
      expect(normalized.origin?.city).toBe("Chicago")
      expect(normalized.destination?.state).toBe("Illinois")
    })

    test('should handle null and undefined values safely', () => {
      const filters: SearchFilters = {
        search_text: undefined,
        origin: undefined,
        rate_range: null as any
      }
      const normalized = normalizeSearchFilters(filters)
      
      // Should not crash and should handle gracefully
      expect(normalized).toBeDefined()
    })

    test('should convert string numbers to actual numbers', () => {
      const filters: SearchFilters = {
        rate_range: { min: "1000" as any, max: "5000" as any },
        page: "2" as any,
        per_page: "50" as any
      }
      const normalized = normalizeSearchFilters(filters)
      
      expect(typeof normalized.rate_range?.min).toBe('number')
      expect(typeof normalized.rate_range?.max).toBe('number')
      expect(typeof normalized.page).toBe('number')
      expect(typeof normalized.per_page).toBe('number')
    })
  })
})