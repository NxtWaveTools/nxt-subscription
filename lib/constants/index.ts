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
  DASHBOARD: '/dashboard',
  AUTH_CALLBACK: '/auth/callback',
} as const

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
