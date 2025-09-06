/**
 * Production monitoring and error tracking utilities
 */

interface ErrorContext {
  userId?: string
  tenantId?: string
  action?: string
  component?: string
  timestamp?: string
  userAgent?: string
  url?: string
  additionalData?: Record<string, any>
}

interface MonitoringEvent {
  type: 'error' | 'warning' | 'info' | 'performance'
  message: string
  context?: ErrorContext
  stack?: string
  level: 'critical' | 'high' | 'medium' | 'low'
}

class ProductionMonitoring {
  private static instance: ProductionMonitoring
  private isProduction: boolean
  private errorQueue: MonitoringEvent[] = []
  private maxQueueSize = 100

  constructor() {
    this.isProduction = process.env.NODE_ENV === 'production'
    
    // Set up global error handlers
    if (typeof window !== 'undefined') {
      this.setupGlobalErrorHandlers()
    }
  }

  static getInstance(): ProductionMonitoring {
    if (!ProductionMonitoring.instance) {
      ProductionMonitoring.instance = new ProductionMonitoring()
    }
    return ProductionMonitoring.instance
  }

  private setupGlobalErrorHandlers() {
    // Handle uncaught errors
    window.addEventListener('error', (event) => {
      this.logError(event.error || new Error(event.message), {
        component: 'Global Error Handler',
        action: 'uncaught_error',
        url: window.location.href
      })
    })

    // Handle unhandled promise rejections
    window.addEventListener('unhandledrejection', (event) => {
      this.logError(new Error(event.reason), {
        component: 'Global Promise Handler',
        action: 'unhandled_rejection',
        url: window.location.href
      })
    })
  }

  logError(error: Error, context?: ErrorContext): void {
    const event: MonitoringEvent = {
      type: 'error',
      message: error.message,
      stack: error.stack,
      level: 'high',
      context: {
        ...context,
        timestamp: new Date().toISOString(),
        userAgent: typeof window !== 'undefined' ? window.navigator.userAgent : undefined,
        url: typeof window !== 'undefined' ? window.location.href : undefined
      }
    }

    this.addToQueue(event)
    
    // In development, also log to console
    if (!this.isProduction) {
      console.error('Monitoring Error:', error, context)
    }
  }

  logWarning(message: string, context?: ErrorContext): void {
    const event: MonitoringEvent = {
      type: 'warning',
      message,
      level: 'medium',
      context: {
        ...context,
        timestamp: new Date().toISOString()
      }
    }

    this.addToQueue(event)
    
    if (!this.isProduction) {
      console.warn('Monitoring Warning:', message, context)
    }
  }

  logInfo(message: string, context?: ErrorContext): void {
    const event: MonitoringEvent = {
      type: 'info',
      message,
      level: 'low',
      context: {
        ...context,
        timestamp: new Date().toISOString()
      }
    }

    this.addToQueue(event)
    
    if (!this.isProduction) {
      console.info('Monitoring Info:', message, context)
    }
  }

  logPerformance(metric: string, value: number, context?: ErrorContext): void {
    const event: MonitoringEvent = {
      type: 'performance',
      message: `${metric}: ${value}ms`,
      level: value > 5000 ? 'high' : value > 2000 ? 'medium' : 'low',
      context: {
        ...context,
        timestamp: new Date().toISOString(),
        additionalData: { metric, value }
      }
    }

    this.addToQueue(event)
    
    if (!this.isProduction) {
      console.log('Performance Metric:', metric, value, context)
    }
  }

  private addToQueue(event: MonitoringEvent): void {
    this.errorQueue.push(event)
    
    // Keep queue size manageable
    if (this.errorQueue.length > this.maxQueueSize) {
      this.errorQueue.shift()
    }

    // In production, you would send to an external service here
    if (this.isProduction) {
      this.sendToExternalService(event)
    }
  }

  private async sendToExternalService(event: MonitoringEvent): Promise<void> {
    try {
      // This is where you would integrate with services like:
      // - Sentry
      // - LogRocket  
      // - Datadog
      // - Custom logging endpoint
      
      // For now, we'll send to our own endpoint
      await fetch('/api/monitoring/events', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(event),
      }).catch((error) => {
        // Silent fail - don't want monitoring to break the app
        console.warn('Failed to send monitoring event:', error)
      })
    } catch (error) {
      // Silent fail
      console.warn('Monitoring service error:', error)
    }
  }

  // Get monitoring data (for debugging/admin purposes)
  getQueuedEvents(): MonitoringEvent[] {
    return [...this.errorQueue]
  }

  // Clear the queue
  clearQueue(): void {
    this.errorQueue = []
  }

  // Get basic health metrics
  getHealthMetrics(): {
    queueSize: number
    errorCount: number
    warningCount: number
    isProduction: boolean
  } {
    return {
      queueSize: this.errorQueue.length,
      errorCount: this.errorQueue.filter(e => e.type === 'error').length,
      warningCount: this.errorQueue.filter(e => e.type === 'warning').length,
      isProduction: this.isProduction
    }
  }
}

// Export singleton instance
export const monitoring = ProductionMonitoring.getInstance()

// Convenience functions for common use cases
export function logError(error: Error, context?: ErrorContext): void {
  monitoring.logError(error, context)
}

export function logWarning(message: string, context?: ErrorContext): void {
  monitoring.logWarning(message, context)
}

export function logInfo(message: string, context?: ErrorContext): void {
  monitoring.logInfo(message, context)
}

export function logPerformance(metric: string, value: number, context?: ErrorContext): void {
  monitoring.logPerformance(metric, value, context)
}

// Performance timing utilities
export function measurePerformance<T>(
  operation: () => Promise<T>,
  operationName: string,
  context?: ErrorContext
): Promise<T> {
  const start = performance.now()
  
  return operation()
    .then((result) => {
      const duration = performance.now() - start
      logPerformance(operationName, duration, context)
      return result
    })
    .catch((error) => {
      const duration = performance.now() - start
      logPerformance(`${operationName}_failed`, duration, context)
      logError(error, { ...context, action: operationName })
      throw error
    })
}

export default monitoring