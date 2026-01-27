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
  UNAUTHORIZED: '/unauthorized',
} as const

// Admin routes (ADMIN role only)
export const ADMIN_ROUTES = {
  ADMIN: '/admin',
  DASHBOARD: '/admin/dashboard',
  USERS: '/admin/users',
  DEPARTMENTS: '/admin/departments',
  LOCATIONS: '/admin/locations',
  SUBSCRIPTIONS: '/admin/subscriptions',
  ANALYTICS: '/admin/analytics',
} as const

// Finance routes (FINANCE role)
export const FINANCE_ROUTES = {
  DASHBOARD: '/finance',
  SUBSCRIPTIONS: '/finance/subscriptions',
} as const

// POC routes (POC role)
export const POC_ROUTES = {
  DASHBOARD: '/poc',
  APPROVALS: '/poc/approvals',
} as const

// HOD routes (HOD role)
export const HOD_ROUTES = {
  DASHBOARD: '/hod',
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

// Support contact
export const SUPPORT_EMAIL = 'support@nxtsubscription.com' as const

// Pagination defaults
export const PAGINATION = {
  DEFAULT_PAGE: 1,
  DEFAULT_LIMIT: 20,
  MAX_LIMIT: 100,
  MIN_LIMIT: 1,
} as const

// Export batch size for streaming
export const EXPORT_BATCH_SIZE = 1000 as const

// Rate limiting
export const RATE_LIMITS = {
  LOGIN_ATTEMPTS_PER_MINUTE: 5,
  EXPORT_REQUESTS_PER_HOUR: 10,
  BULK_OPERATIONS_PER_MINUTE: 3,
} as const

// ============================================================================
// Subscription Management Constants
// ============================================================================

// Request types
export const REQUEST_TYPES = {
  INVOICE: 'INVOICE',
  QUOTATION: 'QUOTATION',
} as const

export type RequestType = typeof REQUEST_TYPES[keyof typeof REQUEST_TYPES]

// Subscription status (workflow states)
export const SUBSCRIPTION_STATUS = {
  PENDING: 'PENDING',       // Awaiting POC approval
  ACTIVE: 'ACTIVE',         // Approved by POC
  REJECTED: 'REJECTED',     // Rejected by POC
  EXPIRED: 'EXPIRED',       // Past end_date
  CANCELLED: 'CANCELLED',   // Manually cancelled
} as const

export type SubscriptionStatus = typeof SUBSCRIPTION_STATUS[keyof typeof SUBSCRIPTION_STATUS]

// Payment status - matches database enum
export const PAYMENT_STATUS = {
  PAID: 'PAID',
  IN_PROGRESS: 'IN_PROGRESS',
  DECLINED: 'DECLINED',
} as const

export type PaymentStatus = typeof PAYMENT_STATUS[keyof typeof PAYMENT_STATUS]

// Accounting status
export const ACCOUNTING_STATUS = {
  PENDING: 'PENDING',
  DONE: 'DONE',
} as const

export type AccountingStatus = typeof ACCOUNTING_STATUS[keyof typeof ACCOUNTING_STATUS]

// Billing frequency
export const BILLING_FREQUENCY = {
  MONTHLY: 'MONTHLY',
  QUARTERLY: 'QUARTERLY',
  YEARLY: 'YEARLY',
  USAGE_BASED: 'USAGE_BASED',
} as const

export type BillingFrequency = typeof BILLING_FREQUENCY[keyof typeof BILLING_FREQUENCY]

// Supported currencies
export const CURRENCIES = {
  INR: 'INR',
  CHF: 'CHF',
  USD: 'USD',
} as const

export type Currency = typeof CURRENCIES[keyof typeof CURRENCIES]

// Location types
export const LOCATION_TYPES = {
  OFFICE: 'OFFICE',
  NIAT: 'NIAT',
  OTHER: 'OTHER',
} as const

export type LocationType = typeof LOCATION_TYPES[keyof typeof LOCATION_TYPES]

// File types for subscription attachments
export const FILE_TYPES = {
  PROOF_OF_PAYMENT: 'PROOF_OF_PAYMENT',
  INVOICE: 'INVOICE',
} as const

export type FileType = typeof FILE_TYPES[keyof typeof FILE_TYPES]

// File size limits (in bytes)
export const FILE_SIZE_LIMITS = {
  PROOF_OF_PAYMENT: 10 * 1024 * 1024, // 10MB
  INVOICE: 50 * 1024 * 1024,          // 50MB
} as const

// Notification types
export const NOTIFICATION_TYPES = {
  APPROVAL_REQUEST: 'APPROVAL_REQUEST',
  APPROVAL_DECISION: 'APPROVAL_DECISION',
  PAYMENT_UPDATE: 'PAYMENT_UPDATE',
  GENERAL: 'GENERAL',
} as const

export type NotificationType = typeof NOTIFICATION_TYPES[keyof typeof NOTIFICATION_TYPES]

// Approval actions
export const APPROVAL_ACTIONS = {
  APPROVED: 'APPROVED',
  REJECTED: 'REJECTED',
} as const

export type ApprovalAction = typeof APPROVAL_ACTIONS[keyof typeof APPROVAL_ACTIONS]

// Notification retention period
export const NOTIFICATION_RETENTION_DAYS = 10 as const

// Subscription routes
export const SUBSCRIPTION_ROUTES = {
  SUBSCRIPTIONS: '/admin/subscriptions',
  APPROVALS: '/admin/approvals',
  LOCATIONS: '/admin/locations',
  ANALYTICS: '/admin/subscriptions/analytics',
} as const
