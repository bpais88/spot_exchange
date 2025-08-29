/**
 * Input sanitization utilities for security and data integrity
 */

// HTML entity encoding map
const htmlEntities: { [key: string]: string } = {
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&#x27;',
  '/': '&#x2F;',
}

/**
 * Escape HTML entities to prevent XSS attacks
 */
export function escapeHtml(str: string): string {
  if (!str || typeof str !== 'string') return ''
  return str.replace(/[&<>"'\/]/g, (s) => htmlEntities[s] || s)
}

/**
 * Sanitize company names - allow letters, numbers, spaces, and common business characters
 */
export function sanitizeCompanyName(name: string): string {
  if (!name || typeof name !== 'string') return ''
  
  // Allow letters, numbers, spaces, periods, hyphens, ampersands, parentheses, commas
  return name
    .replace(/[^a-zA-Z0-9\s\.\-&(),]/g, '')
    .trim()
    .slice(0, 100) // Max 100 characters
}

/**
 * Sanitize user notes and comments - basic text cleaning
 */
export function sanitizeNotes(notes: string): string {
  if (!notes || typeof notes !== 'string') return ''
  
  // Remove potentially dangerous characters but allow basic punctuation
  return notes
    .replace(/[<>]/g, '') // Remove angle brackets
    .replace(/javascript:/gi, '') // Remove javascript: protocol
    .replace(/on\w+\s*=/gi, '') // Remove event handlers like onclick=
    .trim()
    .slice(0, 1000) // Max 1000 characters
}

/**
 * Sanitize email addresses
 */
export function sanitizeEmail(email: string): string {
  if (!email || typeof email !== 'string') return ''
  
  // Basic email sanitization
  return email
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9@.\-_+]/g, '')
    .slice(0, 254) // RFC 5321 maximum
}

/**
 * Sanitize phone numbers
 */
export function sanitizePhoneNumber(phone: string): string {
  if (!phone || typeof phone !== 'string') return ''
  
  // Keep only digits, spaces, hyphens, parentheses, and plus sign
  return phone
    .replace(/[^0-9\s\-()+ ]/g, '')
    .trim()
    .slice(0, 20)
}

/**
 * Sanitize general text input with configurable strictness
 */
export function sanitizeTextInput(
  input: string, 
  options: {
    maxLength?: number
    allowSpecialChars?: boolean
    allowNumbers?: boolean
    allowSpaces?: boolean
  } = {}
): string {
  if (!input || typeof input !== 'string') return ''
  
  const {
    maxLength = 255,
    allowSpecialChars = true,
    allowNumbers = true,
    allowSpaces = true
  } = options
  
  let sanitized = input.trim()
  
  if (!allowSpecialChars) {
    // Keep only letters, numbers, and spaces
    const pattern = allowNumbers 
      ? (allowSpaces ? /[^a-zA-Z0-9\s]/g : /[^a-zA-Z0-9]/g)
      : (allowSpaces ? /[^a-zA-Z\s]/g : /[^a-zA-Z]/g)
    
    sanitized = sanitized.replace(pattern, '')
  } else {
    // Remove only the most dangerous characters
    sanitized = sanitized
      .replace(/[<>]/g, '')
      .replace(/javascript:/gi, '')
      .replace(/on\w+\s*=/gi, '')
  }
  
  return sanitized.slice(0, maxLength)
}

/**
 * Validate and sanitize cargo/freight descriptions
 */
export function sanitizeCargoDescription(description: string): string {
  if (!description || typeof description !== 'string') return ''
  
  return sanitizeTextInput(description, {
    maxLength: 200,
    allowSpecialChars: true,
    allowNumbers: true,
    allowSpaces: true
  })
}

/**
 * Remove potentially dangerous URLs or javascript: protocols
 */
export function sanitizeUrl(url: string): string {
  if (!url || typeof url !== 'string') return ''
  
  // Remove dangerous protocols
  if (url.match(/^(javascript|data|vbscript|file|about):/i)) {
    return ''
  }
  
  // Ensure it starts with http:// or https:// or is a relative URL
  if (!url.match(/^https?:\/\//) && !url.match(/^\/[^\/]/)) {
    return ''
  }
  
  return url.trim().slice(0, 2048)
}

/**
 * Comprehensive input sanitizer that detects input type and applies appropriate sanitization
 */
export function autoSanitize(input: string, inputType: 'email' | 'company' | 'notes' | 'phone' | 'cargo' | 'url' | 'text'): string {
  switch (inputType) {
    case 'email':
      return sanitizeEmail(input)
    case 'company':
      return sanitizeCompanyName(input)
    case 'notes':
      return sanitizeNotes(input)
    case 'phone':
      return sanitizePhoneNumber(input)
    case 'cargo':
      return sanitizeCargoDescription(input)
    case 'url':
      return sanitizeUrl(input)
    case 'text':
    default:
      return sanitizeTextInput(input)
  }
}