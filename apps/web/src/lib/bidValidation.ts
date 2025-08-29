export interface BidValidationResult {
  isValid: boolean
  errors: string[]
  warnings: string[]
}

export interface BidValidationOptions {
  minimumRate?: number
  currentBestBid?: number
  maxBidAmount?: number
  allowZeroBids?: boolean
}

export function validateBidAmount(
  amount: number | string, 
  options: BidValidationOptions = {}
): BidValidationResult {
  const errors: string[] = []
  const warnings: string[] = []
  
  const {
    minimumRate = 0,
    currentBestBid,
    maxBidAmount = 1000000, // $1M max
    allowZeroBids = false
  } = options

  // Convert to number if string
  const numAmount = typeof amount === 'string' ? parseFloat(amount) : amount
  
  // Basic validation
  if (isNaN(numAmount)) {
    errors.push('Please enter a valid number')
    return { isValid: false, errors, warnings }
  }

  // Negative amount check
  if (numAmount < 0) {
    errors.push('Bid amount cannot be negative')
  }

  // Zero bid check
  if (numAmount === 0 && !allowZeroBids) {
    errors.push('Bid amount must be greater than $0')
  }

  // Minimum rate check
  if (minimumRate > 0 && numAmount < minimumRate) {
    errors.push(`Bid amount must be at least $${minimumRate.toLocaleString()} (minimum rate)`)
  }

  // Maximum amount check
  if (numAmount > maxBidAmount) {
    errors.push(`Bid amount cannot exceed $${maxBidAmount.toLocaleString()}`)
  }

  // Decimal places check (no more than 2 decimal places)
  if (numAmount % 0.01 !== 0) {
    errors.push('Bid amount cannot have more than 2 decimal places')
  }

  // Competitive bidding warnings
  if (currentBestBid && numAmount > currentBestBid) {
    warnings.push(`Your bid is higher than the current best bid of $${currentBestBid.toLocaleString()}`)
  }

  // High bid warning
  if (minimumRate > 0 && numAmount > minimumRate * 2) {
    warnings.push('Your bid is significantly higher than the minimum rate. Consider if this is competitive.')
  }

  // Very low bid warning
  if (minimumRate > 0 && numAmount < minimumRate * 0.9) {
    warnings.push('Your bid is below 90% of the minimum rate and may be rejected.')
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings
  }
}

export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(amount)
}

export function sanitizeBidAmount(amount: string): string {
  // Remove any non-numeric characters except decimal point
  return amount.replace(/[^0-9.]/g, '')
}

export function parseBidAmount(amount: string): number {
  const sanitized = sanitizeBidAmount(amount)
  const parsed = parseFloat(sanitized)
  return isNaN(parsed) ? 0 : Math.round(parsed * 100) / 100 // Round to 2 decimal places
}