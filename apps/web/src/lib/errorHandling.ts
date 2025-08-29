/**
 * Secure error handling utilities that prevent information leakage in production
 */

export interface SafeError {
  message: string
  code?: string
  timestamp: string
}

/**
 * Map of sensitive error patterns to user-friendly messages
 */
const errorMessageMap: { [key: string]: string } = {
  // Authentication errors
  'Invalid login credentials': 'Invalid email or password',
  'Email not confirmed': 'Please verify your email address before signing in',
  'User already registered': 'An account with this email already exists',
  'Password is too short': 'Password does not meet requirements',
  
  // Database/API errors  
  'Connection refused': 'Service temporarily unavailable. Please try again later',
  'timeout': 'Request timeout. Please try again',
  'ECONNREFUSED': 'Service temporarily unavailable. Please try again later',
  'Network error': 'Network error. Please check your connection',
  
  // Permission errors
  'Unauthorized': 'You do not have permission to perform this action',
  'Forbidden': 'Access denied',
  'Token expired': 'Your session has expired. Please sign in again',
  
  // Validation errors
  'duplicate key': 'This record already exists',
  'foreign key': 'Invalid reference to related data',
  'not null': 'Required field is missing',
  
  // Rate limiting
  'Too many requests': 'Too many requests. Please wait before trying again',
  'Rate limit': 'Rate limit exceeded. Please try again later',
}

/**
 * Patterns that should never be exposed to users (contain sensitive info)
 */
const sensitivePatterns = [
  /password/i,
  /token/i,
  /key/i,
  /secret/i,
  /database/i,
  /server/i,
  /internal/i,
  /stack trace/i,
  /file not found/i,
  /permission denied/i,
  /access denied/i,
]

/**
 * Convert technical errors to user-friendly messages
 */
export function sanitizeError(error: any): SafeError {
  const timestamp = new Date().toISOString()
  
  // Handle null/undefined
  if (!error) {
    return {
      message: 'An unexpected error occurred. Please try again.',
      timestamp
    }
  }
  
  // Extract error message
  let errorMessage = ''
  if (typeof error === 'string') {
    errorMessage = error
  } else if (error.message) {
    errorMessage = error.message
  } else if (error.error_description) {
    errorMessage = error.error_description
  } else if (error.details) {
    errorMessage = error.details
  } else {
    errorMessage = String(error)
  }
  
  // Check for sensitive patterns
  const isSensitive = sensitivePatterns.some(pattern => 
    pattern.test(errorMessage)
  )
  
  if (isSensitive) {
    console.error('Sensitive error intercepted:', errorMessage)
    return {
      message: 'An error occurred while processing your request. Please try again.',
      timestamp
    }
  }
  
  // Map known error patterns to user-friendly messages
  for (const [pattern, userMessage] of Object.entries(errorMessageMap)) {
    if (errorMessage.toLowerCase().includes(pattern.toLowerCase())) {
      return {
        message: userMessage,
        code: error.code,
        timestamp
      }
    }
  }
  
  // For development, show more details
  if (process.env.NODE_ENV === 'development') {
    return {
      message: errorMessage || 'Unknown error occurred',
      code: error.code,
      timestamp
    }
  }
  
  // Default safe message for production
  return {
    message: 'An unexpected error occurred. Please try again later.',
    code: error.code,
    timestamp
  }
}

/**
 * Safe alert function that sanitizes error messages
 */
export function showError(error: any, fallbackMessage?: string): void {
  const safeError = sanitizeError(error)
  alert(fallbackMessage || safeError.message)
}

/**
 * Log errors securely (avoid logging sensitive data)
 */
export function logError(error: any, context?: string): void {
  const safeError = sanitizeError(error)
  const logEntry = {
    timestamp: safeError.timestamp,
    message: safeError.message,
    code: safeError.code,
    context,
    // In production, avoid logging the full error object
    ...(process.env.NODE_ENV === 'development' && { originalError: error })
  }
  
  console.error('Application Error:', logEntry)
  
  // In production, you might want to send this to an error tracking service
  // Example: Sentry, LogRocket, etc.
}

/**
 * Wrapper for async operations with standardized error handling
 */
export async function safeAsync<T>(
  operation: () => Promise<T>,
  context?: string,
  customErrorMessage?: string
): Promise<T | null> {
  try {
    return await operation()
  } catch (error) {
    logError(error, context)
    if (customErrorMessage) {
      showError(error, customErrorMessage)
    }
    return null
  }
}

/**
 * Check if an error is a network/connectivity issue
 */
export function isNetworkError(error: any): boolean {
  if (!error) return false
  
  const errorMessage = error.message || error.toString()
  const networkPatterns = [
    'network error',
    'failed to fetch',
    'connection refused',
    'timeout',
    'offline',
    'no internet'
  ]
  
  return networkPatterns.some(pattern => 
    errorMessage.toLowerCase().includes(pattern)
  )
}

/**
 * Check if an error is an authentication issue
 */
export function isAuthError(error: any): boolean {
  if (!error) return false
  
  const errorMessage = error.message || error.toString()
  const authPatterns = [
    'unauthorized',
    'invalid login',
    'authentication',
    'token expired',
    'session expired'
  ]
  
  return authPatterns.some(pattern => 
    errorMessage.toLowerCase().includes(pattern)
  )
}