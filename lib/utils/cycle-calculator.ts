// ============================================================================
// Payment Cycle Date Calculator Utility
// Helper functions to calculate cycle dates based on billing frequency
// ============================================================================

import type { BillingFrequency } from '@/lib/constants'

/**
 * Add days to a date
 */
function addDays(date: Date, days: number): Date {
  const result = new Date(date)
  result.setDate(result.getDate() + days)
  return result
}

/**
 * Add months to a date
 */
function addMonths(date: Date, months: number): Date {
  const result = new Date(date)
  result.setMonth(result.getMonth() + months)
  return result
}

/**
 * Get the number of days for a billing frequency
 * Using standard durations:
 * - MONTHLY: 30 days
 * - QUARTERLY: 90 days (3 months)
 * - YEARLY: 365 days
 * - USAGE_BASED: 30 days (default to monthly)
 */
export function getDaysForBillingFrequency(frequency: BillingFrequency): number {
  switch (frequency) {
    case 'MONTHLY':
      return 30
    case 'QUARTERLY':
      return 90
    case 'YEARLY':
      return 365
    case 'USAGE_BASED':
      return 30 // Default to monthly
    default:
      return 30
  }
}

/**
 * Calculate the end date for a cycle based on start date and billing frequency
 * End date is inclusive (e.g., Jan 1 - Jan 30 for monthly)
 */
export function calculateCycleEndDate(
  cycleStartDate: Date | string,
  billingFrequency: BillingFrequency
): Date {
  const startDate = typeof cycleStartDate === 'string' ? new Date(cycleStartDate) : cycleStartDate
  const days = getDaysForBillingFrequency(billingFrequency)
  
  // End date is start date + days - 1 (to make it inclusive)
  // e.g., Jan 1 + 30 days - 1 = Jan 30
  return addDays(startDate, days - 1)
}

/**
 * Calculate the start date for the next cycle
 * Next cycle starts the day after the previous cycle ends
 */
export function calculateNextCycleStartDate(
  previousCycleEndDate: Date | string
): Date {
  const endDate = typeof previousCycleEndDate === 'string' 
    ? new Date(previousCycleEndDate) 
    : previousCycleEndDate
  
  return addDays(endDate, 1)
}

/**
 * Calculate the first cycle dates based on subscription start date
 * Returns { startDate, endDate } for the first payment cycle
 */
export function calculateFirstCycleDates(
  subscriptionStartDate: Date | string,
  billingFrequency: BillingFrequency
): { startDate: Date; endDate: Date } {
  const startDate = typeof subscriptionStartDate === 'string' 
    ? new Date(subscriptionStartDate) 
    : subscriptionStartDate
  
  const endDate = calculateCycleEndDate(startDate, billingFrequency)
  
  return { startDate, endDate }
}

/**
 * Calculate the next cycle dates based on previous cycle end date
 * Returns { startDate, endDate } for the next payment cycle
 */
export function calculateNextCycleDates(
  previousCycleEndDate: Date | string,
  billingFrequency: BillingFrequency
): { startDate: Date; endDate: Date } {
  const startDate = calculateNextCycleStartDate(previousCycleEndDate)
  const endDate = calculateCycleEndDate(startDate, billingFrequency)
  
  return { startDate, endDate }
}

/**
 * Calculate the invoice deadline (same as cycle end date)
 */
export function calculateInvoiceDeadline(cycleEndDate: Date | string): Date {
  return typeof cycleEndDate === 'string' ? new Date(cycleEndDate) : cycleEndDate
}

/**
 * Check if a cycle should be created (10 days before next billing)
 * Returns true if today is 10 days before the next cycle start date
 */
export function shouldCreateNextCycle(
  lastCycleEndDate: Date | string,
  billingFrequency: BillingFrequency
): boolean {
  const today = new Date()
  today.setHours(0, 0, 0, 0) // Normalize to start of day
  
  const nextCycleStartDate = calculateNextCycleStartDate(lastCycleEndDate)
  const daysUntilNextCycle = Math.floor(
    (nextCycleStartDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)
  )
  
  return daysUntilNextCycle <= 10 && daysUntilNextCycle >= 0
}

/**
 * Check if a cycle is approaching its billing date without approval
 * Returns the number of days until billing
 * Note: Auto-cancellation is NOT implemented - Finance/Admin manually cancel
 */
export function getDaysUntilBilling(
  cycleEndDate: Date | string
): number {
  const today = new Date()
  today.setHours(0, 0, 0, 0) // Normalize to start of day
  
  const endDate = typeof cycleEndDate === 'string' ? new Date(cycleEndDate) : cycleEndDate
  endDate.setHours(0, 0, 0, 0)
  
  return Math.floor(
    (endDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)
  )
}

/**
 * Format date to YYYY-MM-DD string
 */
export function formatDateForDB(date: Date): string {
  return date.toISOString().split('T')[0]
}
