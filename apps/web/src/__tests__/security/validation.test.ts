/**
 * Core security validation tests
 * Tests the most critical security validations
 */

import { validateSearchFilters, normalizeSearchFilters } from '@/lib/searchUtils'
import { SearchFilters } from '@/lib/types/search'

describe('Security Validation Tests', () => {
  describe('SQL Injection Prevention', () => {
    test('should reject malicious search text patterns', () => {
      const maliciousInputs = [
        "'; DROP TABLE opportunities; --",
        "' UNION SELECT * FROM users --",
        "'; INSERT INTO malicious VALUES ('hack'); --",
        "' OR '1'='1' --"
      ]

      maliciousInputs.forEach(input => {
        const filters: SearchFilters = { search_text: input }
        const errors = validateSearchFilters(filters)
        
        // Should have validation errors for dangerous patterns
        expect(errors.length).toBeGreaterThan(0)
      })
    })

    test('should allow safe search text', () => {
      const safeInputs = [
        "Chicago to Los Angeles freight",
        "Electronics shipment needed",
        "Refrigerated transport required"
      ]

      safeInputs.forEach(input => {
        const filters: SearchFilters = { search_text: input }
        const errors = validateSearchFilters(filters)
        
        const searchTextErrors = errors.filter(e => e.field === 'search_text')
        expect(searchTextErrors).toHaveLength(0)
      })
    })

    test('should sanitize location inputs', () => {
      const maliciousLocations = [
        "'; DELETE FROM users; --",
        "Chicago'; DROP TABLE opportunities; --",
        "<script>alert('xss')</script>"
      ]

      maliciousLocations.forEach(location => {
        const filters: SearchFilters = {
          origin: { city: location }
        }
        const errors = validateSearchFilters(filters)
        
        expect(errors.length).toBeGreaterThan(0)
      })
    })
  })

  describe('Input Length Validation', () => {
    test('should reject excessively long inputs', () => {
      const longText = 'a'.repeat(1001) // Over limit
      const filters: SearchFilters = { search_text: longText }
      const errors = validateSearchFilters(filters)
      
      expect(errors.length).toBeGreaterThan(0)
    })
  })

  describe('Data Type Validation', () => {
    test('should validate equipment types', () => {
      const filters: SearchFilters = {
        equipment_types: ['invalid_type'] as any
      }
      const errors = validateSearchFilters(filters)
      
      expect(errors.some(error => 
        error.field === 'equipment_types'
      )).toBe(true)
    })

    test('should accept valid equipment types', () => {
      const filters: SearchFilters = {
        equipment_types: ['dry_van', 'reefer']
      }
      const errors = validateSearchFilters(filters)
      
      const typeErrors = errors.filter(e => e.field === 'equipment_types')
      expect(typeErrors).toHaveLength(0)
    })
  })

  describe('Normalization Security', () => {
    test('should normalize pagination to safe values', () => {
      const filters: SearchFilters = {
        per_page: 10000 // Excessive page size
      }
      const normalized = normalizeSearchFilters(filters)
      
      expect(normalized.per_page).toBeLessThanOrEqual(100)
    })

    test('should trim whitespace from text inputs', () => {
      const filters: SearchFilters = {
        search_text: "  test search  "
      }
      const normalized = normalizeSearchFilters(filters)
      
      expect(normalized.search_text).toBe("test search")
    })
  })
})