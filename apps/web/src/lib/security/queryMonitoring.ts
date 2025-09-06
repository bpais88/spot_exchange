/**
 * Query pattern monitoring and security logging
 * Monitors for suspicious database queries and API usage patterns
 */

import { logError, logWarning, logInfo } from '@/lib/monitoring'

interface QueryPattern {
  userId?: string
  tenantId?: string
  query: string
  params?: any[]
  timestamp: Date
  endpoint: string
  ipAddress?: string
  userAgent?: string
}

interface SuspiciousActivity {
  type: 'sql_injection_attempt' | 'rate_limit_exceeded' | 'unusual_query_pattern' | 'unauthorized_access'
  severity: 'low' | 'medium' | 'high' | 'critical'
  userId?: string
  tenantId?: string
  ipAddress?: string
  details: string
  timestamp: Date
}

class QueryMonitor {
  private static instance: QueryMonitor
  private queryHistory: QueryPattern[] = []
  private suspiciousActivities: SuspiciousActivity[] = []
  private maxHistorySize = 1000
  private alertThreshold = {
    sqlInjectionAttempts: 3, // per 10 minutes
    rapidQueries: 100, // per minute
    failedAuth: 5 // per 5 minutes
  }

  static getInstance(): QueryMonitor {
    if (!QueryMonitor.instance) {
      QueryMonitor.instance = new QueryMonitor()
    }
    return QueryMonitor.instance
  }

  /**
   * Log a database query for monitoring
   */
  logQuery(pattern: QueryPattern): void {
    this.queryHistory.push(pattern)
    
    // Keep history size manageable
    if (this.queryHistory.length > this.maxHistorySize) {
      this.queryHistory.shift()
    }

    // Check for suspicious patterns
    this.analyzeQuery(pattern)
  }

  /**
   * Analyze query for suspicious patterns
   */
  private analyzeQuery(pattern: QueryPattern): void {
    const suspiciousPatterns = [
      /union\s+select/i,
      /insert\s+into/i,
      /delete\s+from/i,
      /drop\s+table/i,
      /alter\s+table/i,
      /exec\s*\(/i,
      /xp_/i,
      /sp_/i,
      /'.*'.*or.*'.*'/i,
      /;\s*--/,
      /\/\*.*\*\//,
      /script\s*>/i
    ]

    // Check for SQL injection attempts
    for (const suspiciousPattern of suspiciousPatterns) {
      if (suspiciousPattern.test(pattern.query)) {
        this.recordSuspiciousActivity({
          type: 'sql_injection_attempt',
          severity: 'critical',
          userId: pattern.userId,
          tenantId: pattern.tenantId,
          ipAddress: pattern.ipAddress,
          details: `Potential SQL injection detected in query: ${pattern.query.substring(0, 100)}...`,
          timestamp: new Date()
        })
        
        logError(new Error('SQL injection attempt detected'), {
          userId: pattern.userId,
          tenantId: pattern.tenantId,
          action: 'query_monitoring',
          additionalData: {
            query: pattern.query,
            endpoint: pattern.endpoint,
            ipAddress: pattern.ipAddress
          }
        })
        break
      }
    }

    // Check for rapid query patterns (possible DoS)
    const recentQueries = this.getRecentQueries(pattern.userId, 60000) // Last minute
    if (recentQueries.length > this.alertThreshold.rapidQueries) {
      this.recordSuspiciousActivity({
        type: 'rate_limit_exceeded',
        severity: 'high',
        userId: pattern.userId,
        tenantId: pattern.tenantId,
        ipAddress: pattern.ipAddress,
        details: `User exceeded query rate limit: ${recentQueries.length} queries in 1 minute`,
        timestamp: new Date()
      })

      logWarning('Rate limit exceeded', {
        userId: pattern.userId,
        tenantId: pattern.tenantId,
        action: 'rate_limit_monitoring',
        additionalData: {
          queryCount: recentQueries.length,
          endpoint: pattern.endpoint
        }
      })
    }

    // Check for unusual query patterns
    if (this.isUnusualQueryPattern(pattern)) {
      this.recordSuspiciousActivity({
        type: 'unusual_query_pattern',
        severity: 'medium',
        userId: pattern.userId,
        tenantId: pattern.tenantId,
        ipAddress: pattern.ipAddress,
        details: `Unusual query pattern detected for user`,
        timestamp: new Date()
      })

      logInfo('Unusual query pattern detected', {
        userId: pattern.userId,
        tenantId: pattern.tenantId,
        action: 'pattern_analysis',
        additionalData: {
          endpoint: pattern.endpoint,
          queryLength: pattern.query.length
        }
      })
    }
  }

  /**
   * Get recent queries for a user
   */
  private getRecentQueries(userId?: string, timeWindowMs: number = 600000): QueryPattern[] {
    const cutoff = new Date(Date.now() - timeWindowMs)
    return this.queryHistory.filter(q => 
      q.timestamp >= cutoff && 
      q.userId === userId
    )
  }

  /**
   * Check if query pattern is unusual for the user
   */
  private isUnusualQueryPattern(pattern: QueryPattern): boolean {
    if (!pattern.userId) return false

    const userHistory = this.queryHistory
      .filter(q => q.userId === pattern.userId)
      .slice(-50) // Last 50 queries

    if (userHistory.length < 10) return false // Not enough data

    // Check for unusual query complexity
    const avgQueryLength = userHistory.reduce((sum, q) => sum + q.query.length, 0) / userHistory.length
    if (pattern.query.length > avgQueryLength * 3) {
      return true
    }

    // Check for unusual endpoint access
    const commonEndpoints = userHistory
      .map(q => q.endpoint)
      .reduce((acc, endpoint) => {
        acc[endpoint] = (acc[endpoint] || 0) + 1
        return acc
      }, {} as Record<string, number>)

    const isUncommonEndpoint = !commonEndpoints[pattern.endpoint] || 
                               commonEndpoints[pattern.endpoint] === 1

    return isUncommonEndpoint && Object.keys(commonEndpoints).length > 5
  }

  /**
   * Record suspicious activity
   */
  private recordSuspiciousActivity(activity: SuspiciousActivity): void {
    this.suspiciousActivities.push(activity)
    
    // Keep history manageable
    if (this.suspiciousActivities.length > this.maxHistorySize) {
      this.suspiciousActivities.shift()
    }

    // In production, this would trigger alerts to security team
    if (process.env.NODE_ENV === 'production') {
      this.triggerSecurityAlert(activity)
    }
  }

  /**
   * Trigger security alert for critical issues
   */
  private triggerSecurityAlert(activity: SuspiciousActivity): void {
    if (activity.severity === 'critical') {
      // In a real system, this would:
      // 1. Send alert to security team
      // 2. Potentially block the user/IP
      // 3. Log to external security system (SIEM)
      
      console.error('SECURITY ALERT:', activity)
      
      // For now, just log the alert
      logError(new Error(`Security Alert: ${activity.type}`), {
        userId: activity.userId,
        tenantId: activity.tenantId,
        action: 'security_alert',
        additionalData: {
          severity: activity.severity,
          details: activity.details,
          ipAddress: activity.ipAddress
        }
      })
    }
  }

  /**
   * Get security metrics for monitoring dashboard
   */
  getSecurityMetrics(): {
    totalQueries: number
    suspiciousActivities: number
    criticalAlerts: number
    topSuspiciousUsers: Array<{userId: string, count: number}>
    recentAlerts: SuspiciousActivity[]
  } {
    const last24Hours = new Date(Date.now() - 24 * 60 * 60 * 1000)
    const recentActivities = this.suspiciousActivities.filter(a => a.timestamp >= last24Hours)
    
    const userActivityCount = recentActivities.reduce((acc, activity) => {
      if (activity.userId) {
        acc[activity.userId] = (acc[activity.userId] || 0) + 1
      }
      return acc
    }, {} as Record<string, number>)

    const topSuspiciousUsers = Object.entries(userActivityCount)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 10)
      .map(([userId, count]) => ({ userId, count }))

    return {
      totalQueries: this.queryHistory.length,
      suspiciousActivities: recentActivities.length,
      criticalAlerts: recentActivities.filter(a => a.severity === 'critical').length,
      topSuspiciousUsers,
      recentAlerts: recentActivities.slice(-10)
    }
  }

  /**
   * Check if user should be rate limited
   */
  shouldRateLimit(userId?: string, ipAddress?: string): boolean {
    const now = new Date()
    const recentWindow = new Date(now.getTime() - 10 * 60 * 1000) // 10 minutes

    // Check for repeated SQL injection attempts
    const sqlAttempts = this.suspiciousActivities.filter(activity => 
      activity.timestamp >= recentWindow &&
      activity.type === 'sql_injection_attempt' &&
      (activity.userId === userId || activity.ipAddress === ipAddress)
    )

    if (sqlAttempts.length >= this.alertThreshold.sqlInjectionAttempts) {
      return true
    }

    // Check for excessive queries
    const recentQueries = this.queryHistory.filter(q => 
      q.timestamp >= recentWindow &&
      (q.userId === userId || q.ipAddress === ipAddress)
    )

    return recentQueries.length > this.alertThreshold.rapidQueries * 10 // 10 minute threshold
  }
}

export const queryMonitor = QueryMonitor.getInstance()

/**
 * Middleware function to log queries automatically
 */
export function logDatabaseQuery(
  query: string,
  params: any[] = [],
  userId?: string,
  tenantId?: string,
  endpoint: string = 'unknown',
  ipAddress?: string,
  userAgent?: string
): void {
  queryMonitor.logQuery({
    userId,
    tenantId,
    query,
    params,
    timestamp: new Date(),
    endpoint,
    ipAddress,
    userAgent
  })
}

/**
 * Check if request should be rate limited
 */
export function checkRateLimit(userId?: string, ipAddress?: string): boolean {
  return queryMonitor.shouldRateLimit(userId, ipAddress)
}

/**
 * Get current security metrics
 */
export function getSecurityMetrics() {
  return queryMonitor.getSecurityMetrics()
}

export default queryMonitor