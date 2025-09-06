/**
 * Security monitoring system tests
 */

import { logDatabaseQuery, checkRateLimit, getSecurityMetrics } from '@/lib/security/queryMonitoring'

describe('Security Monitoring Tests', () => {
  beforeEach(() => {
    // Clear any existing history for clean tests
    // In a real system, you'd want to use a test instance
  })

  describe('Query Pattern Detection', () => {
    test('should detect SQL injection attempts', () => {
      const maliciousQueries = [
        "'; DROP TABLE opportunities; --",
        "' UNION SELECT * FROM users --",
        "'; INSERT INTO malicious VALUES ('hack'); --"
      ]

      maliciousQueries.forEach(query => {
        logDatabaseQuery(
          query,
          [],
          'test-user-id',
          'test-tenant-id',
          '/api/search',
          '192.168.1.100',
          'test-agent'
        )
      })

      // The monitoring system should have detected these patterns
      const metrics = getSecurityMetrics()
      expect(metrics.suspiciousActivities).toBeGreaterThan(0)
    })

    test('should detect rapid query patterns', () => {
      const userId = 'rapid-user-id'
      
      // Simulate rapid queries
      for (let i = 0; i < 150; i++) {
        logDatabaseQuery(
          'SELECT * FROM opportunities',
          [],
          userId,
          'test-tenant-id',
          '/api/search',
          '192.168.1.101',
          'test-agent'
        )
      }

      // Should detect rate limiting condition
      const shouldLimit = checkRateLimit(userId)
      expect(shouldLimit).toBe(true)
    })

    test('should allow normal query patterns', () => {
      const normalQueries = [
        'SELECT * FROM opportunities WHERE status = $1',
        'SELECT * FROM opportunities WHERE pickup_date >= $1',
        'SELECT * FROM opportunities WHERE equipment = $1'
      ]

      normalQueries.forEach(query => {
        logDatabaseQuery(
          query,
          ['active'],
          'normal-user-id',
          'test-tenant-id',
          '/api/search',
          '192.168.1.102',
          'test-agent'
        )
      })

      // Should not trigger rate limiting for normal usage
      const shouldLimit = checkRateLimit('normal-user-id')
      expect(shouldLimit).toBe(false)
    })
  })

  describe('Security Metrics', () => {
    test('should provide comprehensive security metrics', () => {
      const metrics = getSecurityMetrics()
      
      expect(metrics).toHaveProperty('totalQueries')
      expect(metrics).toHaveProperty('suspiciousActivities')
      expect(metrics).toHaveProperty('criticalAlerts')
      expect(metrics).toHaveProperty('topSuspiciousUsers')
      expect(metrics).toHaveProperty('recentAlerts')
      
      expect(typeof metrics.totalQueries).toBe('number')
      expect(typeof metrics.suspiciousActivities).toBe('number')
      expect(typeof metrics.criticalAlerts).toBe('number')
      expect(Array.isArray(metrics.topSuspiciousUsers)).toBe(true)
      expect(Array.isArray(metrics.recentAlerts)).toBe(true)
    })
  })

  describe('Rate Limiting', () => {
    test('should rate limit based on user ID', () => {
      const userId = 'rate-limited-user'
      
      // Should not be rate limited initially
      expect(checkRateLimit(userId)).toBe(false)
      
      // Log multiple SQL injection attempts
      for (let i = 0; i < 5; i++) {
        logDatabaseQuery(
          "'; DROP TABLE test; --",
          [],
          userId,
          'test-tenant-id',
          '/api/search',
          '192.168.1.103',
          'test-agent'
        )
      }
      
      // Should now be rate limited
      expect(checkRateLimit(userId)).toBe(true)
    })

    test('should rate limit based on IP address', () => {
      const ipAddress = '192.168.1.104'
      
      // Should not be rate limited initially
      expect(checkRateLimit(undefined, ipAddress)).toBe(false)
      
      // Log multiple SQL injection attempts from same IP
      for (let i = 0; i < 5; i++) {
        logDatabaseQuery(
          "'; DROP TABLE test; --",
          [],
          `user-${i}`, // Different users, same IP
          'test-tenant-id',
          '/api/search',
          ipAddress,
          'test-agent'
        )
      }
      
      // Should now be rate limited by IP
      expect(checkRateLimit(undefined, ipAddress)).toBe(true)
    })
  })
})