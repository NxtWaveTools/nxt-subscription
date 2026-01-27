// ============================================================================
// Format Utilities
// Centralized formatting functions for currency, dates, and badge variants
// ============================================================================

import { SUBSCRIPTION_STATUS } from '@/lib/constants'

// ============================================================================
// Currency Formatting
// ============================================================================

/**
 * Formats a number as currency with the specified currency code
 * @param amount - The amount to format
 * @param currency - The ISO 4217 currency code (e.g., 'USD', 'INR')
 * @returns Formatted currency string
 */
export function formatCurrency(amount: number, currency: string = 'INR'): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: currency,
  }).format(amount)
}

// ============================================================================
// Date Formatting
// ============================================================================

/**
 * Formats a date string in long format (e.g., "January 27, 2025")
 * @param dateStr - The date string to format
 * @returns Formatted date string or "—" if null/undefined
 */
export function formatDate(dateStr: string | null | undefined): string {
  if (!dateStr) return '—'
  return new Date(dateStr).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })
}

/**
 * Formats a date string in short format (e.g., "Jan 27, 2025")
 * @param dateStr - The date string to format
 * @returns Formatted date string or "—" if null/undefined
 */
export function formatDateShort(dateStr: string | null | undefined): string {
  if (!dateStr) return '—'
  return new Date(dateStr).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  })
}

/**
 * Formats a date string with time (e.g., "Jan 27, 2025, 02:30 PM")
 * @param dateStr - The date string to format
 * @returns Formatted datetime string or "—" if null/undefined
 */
export function formatDateTime(dateStr: string | null | undefined): string {
  if (!dateStr) return '—'
  return new Date(dateStr).toLocaleString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

/**
 * Formats a date as relative time (e.g., "2 days ago", "in 3 hours")
 * @param dateStr - The date string to format
 * @returns Relative time string or "—" if null/undefined
 */
export function formatRelativeTime(dateStr: string | null | undefined): string {
  if (!dateStr) return '—'
  
  const date = new Date(dateStr)
  const now = new Date()
  const diffMs = date.getTime() - now.getTime()
  const diffDays = Math.round(diffMs / (1000 * 60 * 60 * 24))
  
  const rtf = new Intl.RelativeTimeFormat('en', { numeric: 'auto' })
  
  if (Math.abs(diffDays) < 1) {
    const diffHours = Math.round(diffMs / (1000 * 60 * 60))
    if (Math.abs(diffHours) < 1) {
      const diffMinutes = Math.round(diffMs / (1000 * 60))
      return rtf.format(diffMinutes, 'minutes')
    }
    return rtf.format(diffHours, 'hours')
  }
  
  if (Math.abs(diffDays) < 30) {
    return rtf.format(diffDays, 'days')
  }
  
  const diffMonths = Math.round(diffDays / 30)
  if (Math.abs(diffMonths) < 12) {
    return rtf.format(diffMonths, 'months')
  }
  
  const diffYears = Math.round(diffDays / 365)
  return rtf.format(diffYears, 'years')
}

// ============================================================================
// Badge Variant Helpers
// ============================================================================

export type BadgeVariant = 'default' | 'secondary' | 'destructive' | 'outline'

/**
 * Returns the appropriate badge variant for a subscription status
 * @param status - The subscription status
 * @returns The badge variant
 */
export function getStatusBadgeVariant(status: string): BadgeVariant {
  switch (status) {
    case SUBSCRIPTION_STATUS.ACTIVE:
      return 'default'
    case SUBSCRIPTION_STATUS.PENDING:
      return 'secondary'
    case SUBSCRIPTION_STATUS.REJECTED:
    case SUBSCRIPTION_STATUS.CANCELLED:
      return 'destructive'
    case SUBSCRIPTION_STATUS.EXPIRED:
      return 'outline'
    default:
      return 'secondary'
  }
}

/**
 * Returns the appropriate badge variant for a payment status
 * Note: These are the display statuses used in UI, which may differ from DB enum
 * @param status - The payment status
 * @returns The badge variant
 */
export function getPaymentStatusBadgeVariant(status: string): BadgeVariant {
  switch (status) {
    case 'PAID':
      return 'default'
    case 'PENDING':
      return 'outline'
    case 'OVERDUE':
      return 'destructive'
    case 'CANCELLED':
    case 'DECLINED':
      return 'secondary'
    case 'IN_PROGRESS':
      return 'secondary'
    default:
      return 'outline'
  }
}

// ============================================================================
// Label Maps (for display)
// ============================================================================

export const STATUS_LABELS: Record<string, string> = {
  [SUBSCRIPTION_STATUS.PENDING]: 'Pending Approval',
  [SUBSCRIPTION_STATUS.ACTIVE]: 'Active',
  [SUBSCRIPTION_STATUS.REJECTED]: 'Rejected',
  [SUBSCRIPTION_STATUS.EXPIRED]: 'Expired',
  [SUBSCRIPTION_STATUS.CANCELLED]: 'Cancelled',
}

/**
 * Payment status labels for display
 * Note: These cover both DB enum values and UI display values
 */
export const PAYMENT_STATUS_LABELS: Record<string, string> = {
  PENDING: 'Pending',
  PAID: 'Paid',
  OVERDUE: 'Overdue',
  CANCELLED: 'Cancelled',
  IN_PROGRESS: 'In Progress',
  DECLINED: 'Declined',
}

export const ACCOUNTING_STATUS_LABELS: Record<string, string> = {
  PENDING: 'Pending',
  DONE: 'Done',
}

export const BILLING_FREQUENCY_LABELS: Record<string, string> = {
  MONTHLY: 'Monthly',
  QUARTERLY: 'Quarterly',
  YEARLY: 'Yearly',
  USAGE_BASED: 'Usage Based',
}

// ============================================================================
// Number Formatting
// ============================================================================

/**
 * Formats a number with thousand separators
 * @param value - The number to format
 * @returns Formatted number string
 */
export function formatNumber(value: number): string {
  return new Intl.NumberFormat('en-US').format(value)
}

/**
 * Formats a number as a percentage
 * @param value - The decimal value (e.g., 0.15 for 15%)
 * @param decimals - Number of decimal places
 * @returns Formatted percentage string
 */
export function formatPercent(value: number, decimals: number = 0): string {
  return new Intl.NumberFormat('en-US', {
    style: 'percent',
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(value)
}

// ============================================================================
// File Size Formatting
// ============================================================================

/**
 * Formats bytes into human-readable file size
 * @param bytes - The number of bytes
 * @returns Formatted file size string (e.g., "1.5 MB")
 */
export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 Bytes'
  
  const k = 1024
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
}
