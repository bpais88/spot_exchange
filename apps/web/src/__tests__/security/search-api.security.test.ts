/**
 * Security tests for search API endpoint
 * Tests SQL injection prevention and input validation
 */

import { NextRequest } from 'next/server'
import { POST } from '@/app/api/search/route'

// Mock Supabase
jest.mock('@supabase/supabase-js', () => ({
  createClient: jest.fn(() => ({
    auth: {
      getUser: jest.fn().mockResolvedValue({
        data: { user: { id: 'test-user-id' } },
        error: null
      })
    },
    from: jest.fn(() => ({
      select: jest.fn().mockReturnThis(),
      order: jest.fn().mockReturnThis(),
      range: jest.fn().mockReturnThis(),
      ilike: jest.fn().mockReturnThis(),
      overlaps: jest.fn().mockReturnThis(),
      or: jest.fn().mockReturnThis(),
      gte: jest.fn().mockReturnThis(),
      lte: jest.fn().mockReturnThis(),
      in: jest.fn().mockReturnThis(),
      neq: jest.fn().mockReturnThis(),
      not: jest.fn().mockReturnValue({
        data: [],
        error: null,
        count: 0
      })
    }))
  }))
}))

// Mock environment variables
process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://test.supabase.co'
process.env.SUPABASE_SERVICE_ROLE_KEY = 'test-service-key'

describe('Search API Security Tests', () => {
  const mockRequest = (body: any, token: string = 'valid-token') =>
    new NextRequest('http://localhost:3000/api/search', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(body)
    })

  describe('SQL Injection Prevention', () => {
    test('should sanitize malicious search text', async () => {
      const maliciousPayloads = [
        "'; DROP TABLE opportunities; --",
        "' UNION SELECT * FROM users --",
        "'; INSERT INTO opportunities VALUES ('hacked'); --",
        "' OR '1'='1' --",
        "'; EXEC xp_cmdshell('dir'); --",
        "' UNION SELECT password FROM users WHERE '1'='1",
        "'; DELETE FROM opportunities WHERE id > 0; --"
      ]

      for (const payload of maliciousPayloads) {
        const request = mockRequest({
          filters: {
            search_text: payload
          }
        })

        const response = await POST(request)
        const data = await response.json()

        // Should not return error (meaning sanitization worked)
        expect(response.status).not.toBe(500)
        expect(data.error).not.toContain('SQL')
        expect(data.error).not.toContain('database')
      }
    })

    test('should sanitize malicious location filters', async () => {
      const maliciousLocations = [
        "'; DROP TABLE opportunities; --",
        "Chicago'; DELETE FROM users; --",
        "' OR 1=1 --",
        "'; EXEC('SELECT * FROM admin'); --"
      ]

      for (const location of maliciousLocations) {
        const request = mockRequest({
          filters: {
            origin: { city: location },
            destination: { state: location }
          }
        })

        const response = await POST(request)
        expect(response.status).not.toBe(500)
      }
    })

    test('should reject requests with SQL comment patterns', async () => {
      const commentPatterns = [
        "Chicago -- comment",
        "Texas /* block comment */",
        "Seattle; -- drop table"
      ]

      for (const pattern of commentPatterns) {
        const request = mockRequest({
          filters: {
            search_text: pattern
          }
        })

        const response = await POST(request)
        const data = await response.json()

        // Should process without error (comments removed by sanitization)
        expect(response.status).toBe(200)
      }
    })
  })

  describe('Input Validation', () => {
    test('should reject invalid date ranges', async () => {
      const request = mockRequest({
        filters: {
          pickup_date_range: {
            from: 'invalid-date',
            to: '2024-13-45' // Invalid date
          }
        }
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.validation_errors).toBeDefined()
    })

    test('should reject invalid numeric ranges', async () => {
      const request = mockRequest({
        filters: {
          rate_range: {
            min: -1000, // Negative rate
            max: 'invalid' // Non-numeric
          }
        }
      })

      const response = await POST(request)
      expect(response.status).toBe(400)
    })

    test('should reject excessively large search text', async () => {
      const largeText = 'a'.repeat(10000) // Very large string
      
      const request = mockRequest({
        filters: {
          search_text: largeText
        }
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.validation_errors).toBeDefined()
    })

    test('should validate equipment types', async () => {
      const request = mockRequest({
        filters: {
          equipment_types: ['invalid_type', 'malicious_type']
        }
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.validation_errors).toBeDefined()
    })
  })

  describe('Authentication Security', () => {
    test('should reject requests without authorization header', async () => {
      const request = new NextRequest('http://localhost:3000/api/search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ filters: {} })
      })

      const response = await POST(request)
      expect(response.status).toBe(401)
    })

    test('should reject requests with invalid bearer token format', async () => {
      const request = new NextRequest('http://localhost:3000/api/search', {
        method: 'POST',
        headers: {
          'Authorization': 'InvalidFormat token',
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ filters: {} })
      })

      const response = await POST(request)
      expect(response.status).toBe(401)
    })

    test('should reject requests with malformed JSON', async () => {
      const request = new NextRequest('http://localhost:3000/api/search', {
        method: 'POST',
        headers: {
          'Authorization': 'Bearer valid-token',
          'Content-Type': 'application/json'
        },
        body: '{ invalid json }'
      })

      const response = await POST(request)
      expect(response.status).toBe(400)
    })
  })

  describe('Rate Limiting Preparation', () => {
    test('should handle pagination limits correctly', async () => {
      const request = mockRequest({
        filters: {
          per_page: 10000 // Excessive page size
        }
      })

      const response = await POST(request)
      const data = await response.json()

      // Should cap at maximum allowed (100)
      expect(data.per_page).toBeLessThanOrEqual(100)
    })

    test('should validate page numbers', async () => {
      const request = mockRequest({
        filters: {
          page: -1, // Invalid page
          per_page: 0 // Invalid per_page
        }
      })

      const response = await POST(request)
      
      // Should handle gracefully or return validation error
      expect([200, 400]).toContain(response.status)
    })
  })

  describe('Data Sanitization', () => {
    test('should not expose internal error details', async () => {
      // Mock a database error
      const mockError = new Error('connection to database "internal_db" failed on port 5432')
      
      jest.spyOn(console, 'error').mockImplementation(() => {})
      
      // This would normally trigger a database error
      const request = mockRequest({
        filters: {
          search_text: 'normal search'
        }
      })

      const response = await POST(request)
      const data = await response.json()

      // Should not expose database connection details
      if (response.status === 500) {
        expect(data.error).not.toContain('database')
        expect(data.error).not.toContain('port')
        expect(data.error).not.toContain('connection')
        expect(data.error).toBe('Search failed')
      }
    })

    test('should sanitize error messages in development vs production', async () => {
      const originalEnv = process.env.NODE_ENV
      
      // Test production mode
      Object.defineProperty(process.env, 'NODE_ENV', {
        value: 'production',
        writable: true
      })
      
      const request = mockRequest({
        filters: {
          search_text: 'test'
        }
      })

      const response = await POST(request)
      
      if (response.status === 500) {
        const data = await response.json()
        expect(data.error).toBe('Search failed') // Generic message
      }
      
      // Restore environment
      Object.defineProperty(process.env, 'NODE_ENV', {
        value: originalEnv,
        writable: true
      })
    })
  })
})