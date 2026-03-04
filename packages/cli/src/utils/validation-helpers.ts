/**
 * Validation helpers for wizard inputs
 */

/**
 * Validate tenant slug format
 * - Must be lowercase
 * - Only letters, numbers, and hyphens
 * - 3-50 characters
 * - Cannot start or end with hyphen
 */
export function validateTenantSlug(slug: string): boolean | string {
  if (!slug || slug.trim().length === 0) {
    return 'Slug is required'
  }

  if (!/^[a-z0-9-]+$/.test(slug)) {
    return 'Slug must contain only lowercase letters, numbers, and hyphens'
  }

  if (slug.length < 3 || slug.length > 50) {
    return 'Slug must be between 3 and 50 characters'
  }

  if (slug.startsWith('-') || slug.endsWith('-')) {
    return 'Slug cannot start or end with a hyphen'
  }

  if (slug.includes('--')) {
    return 'Slug cannot contain consecutive hyphens'
  }

  // Reserved slugs
  const reserved = ['admin', 'api', 'www', 'app', 'dashboard', 'public', 'private', 'system']
  if (reserved.includes(slug)) {
    return `Slug '${slug}' is reserved. Please choose a different name.`
  }

  return true
}

/**
 * Validate domain format
 * - Must be valid domain name
 * - At least 2 parts (domain + TLD)
 * - No protocol (http://, https://)
 */
export function validateDomain(domain: string): boolean | string {
  if (!domain || domain.trim().length === 0) {
    return 'Domain is required'
  }

  // Remove whitespace
  domain = domain.trim()

  // Check for protocol (not allowed)
  if (domain.startsWith('http://') || domain.startsWith('https://')) {
    return 'Domain should not include protocol (http:// or https://). Example: mybrand.com'
  }

  // Domain regex: letters, numbers, hyphens, and dots
  const domainRegex = /^([a-z0-9]+(-[a-z0-9]+)*\.)+[a-z]{2,}$/i
  if (!domainRegex.test(domain)) {
    return 'Invalid domain format. Example: mybrand.com or shop.mybrand.com'
  }

  // Check minimum parts (domain + TLD)
  const parts = domain.split('.')
  if (parts.length < 2) {
    return 'Domain must have at least 2 parts (domain + TLD). Example: mybrand.com'
  }

  // Check TLD length (2-63 characters)
  const tld = parts[parts.length - 1]
  if (tld.length < 2 || tld.length > 63) {
    return 'Invalid TLD (top-level domain). Example: .com, .io, .shop'
  }

  // Check for localhost (not allowed in production)
  if (domain.includes('localhost') || domain.includes('127.0.0.1')) {
    return 'localhost is not a valid production domain. Use a real domain name.'
  }

  return true
}

/**
 * Validate hex color code
 * - Must start with #
 * - Exactly 6 hex characters (0-9, A-F)
 */
export function validateColor(color: string): boolean | string {
  if (!color || color.trim().length === 0) {
    return 'Color is required'
  }

  // Remove whitespace
  color = color.trim()

  // Must start with #
  if (!color.startsWith('#')) {
    return 'Color must start with #. Example: #FF0000'
  }

  // Check hex format (6 characters)
  const hexRegex = /^#[0-9A-Fa-f]{6}$/
  if (!hexRegex.test(color)) {
    return 'Color must be a valid 6-digit hex code. Example: #FF0000, #0268A0'
  }

  return true
}

/**
 * Validate email address
 */
export function validateEmail(email: string): boolean | string {
  if (!email || email.trim().length === 0) {
    return 'Email is required'
  }

  email = email.trim()

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  if (!emailRegex.test(email)) {
    return 'Invalid email format. Example: support@mybrand.com'
  }

  return true
}

/**
 * Validate URL
 */
export function validateUrl(url: string): boolean | string {
  if (!url || url.trim().length === 0) {
    return 'URL is required'
  }

  url = url.trim()

  try {
    const parsedUrl = new URL(url)

    // Must be http or https
    if (!['http:', 'https:'].includes(parsedUrl.protocol)) {
      return 'URL must use http:// or https://'
    }

    return true
  } catch {
    return 'Invalid URL format. Example: https://cdn.mybrand.com'
  }
}

/**
 * Validate phone number (international format)
 */
export function validatePhone(phone: string): boolean | string {
  if (!phone || phone.trim().length === 0) {
    return 'Phone number is required'
  }

  phone = phone.trim()

  // Allow digits, spaces, hyphens, parentheses, and + for country code
  const phoneRegex = /^[\d\s\-\(\)\+]+$/
  if (!phoneRegex.test(phone)) {
    return 'Invalid phone number format. Example: +1 (555) 123-4567'
  }

  // Must have at least 7 digits
  const digits = phone.replace(/\D/g, '')
  if (digits.length < 7) {
    return 'Phone number must have at least 7 digits'
  }

  return true
}
