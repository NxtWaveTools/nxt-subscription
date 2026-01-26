// ============================================================================
// Application Constants
// ============================================================================

// Role UUIDs (from database seed)
export const ROLE_IDS = {
  ADMIN: '00000000-0000-0000-0000-000000000001',
  FINANCE: '00000000-0000-0000-0000-000000000002',
  HOD: '00000000-0000-0000-0000-000000000003',
  POC: '00000000-0000-0000-0000-000000000004',
} as const

// Role names
export const ROLES = {
  ADMIN: 'ADMIN',
  FINANCE: 'FINANCE',
  HOD: 'HOD',
  POC: 'POC',
} as const

// OAuth providers
export const OAUTH_PROVIDERS = {
  GOOGLE: 'google',
  MICROSOFT: 'azure',
} as const

// Routes
export const ROUTES = {
  HOME: '/',
  LOGIN: '/login',
  AUTH_CALLBACK: '/auth/callback',
} as const

// Admin routes
export const ADMIN_ROUTES = {
  ADMIN: '/admin',
  DASHBOARD: '/admin/dashboard',
  USERS: '/admin/users',
  DEPARTMENTS: '/admin/departments',
  ANALYTICS: '/admin/analytics',
} as const

// Bulk operation limits
export const MAX_BULK_OPERATIONS = 100 as const // Hard limit for bulk operations
export const BULK_BATCH_SIZE = 50 as const // Processing chunk size

// Export types
export const EXPORT_TYPES = {
  USERS: 'users',
  DEPARTMENTS: 'departments',
} as const

// Polling interval for auto-refresh (milliseconds)
export const POLLING_INTERVAL = 60000 as const // 60 seconds

// Error codes
export const AUTH_ERRORS = {
  AUTH_FAILED: 'auth_failed',
  USER_NOT_FOUND: 'user_not_found',
  ACCOUNT_INACTIVE: 'account_inactive',
  INVALID_CREDENTIALS: 'invalid_credentials',
} as const

// Error messages
export const ERROR_MESSAGES = {
  [AUTH_ERRORS.AUTH_FAILED]: 'Authentication failed. Please try again.',
  [AUTH_ERRORS.USER_NOT_FOUND]: 'User account not found.',
  [AUTH_ERRORS.ACCOUNT_INACTIVE]: 'Your account is inactive. Please contact an administrator.',
  [AUTH_ERRORS.INVALID_CREDENTIALS]: 'Invalid credentials provided.',
  DEFAULT: 'An unexpected error occurred. Please try again.',
} as const
