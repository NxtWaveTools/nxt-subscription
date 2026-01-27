// ============================================================================
// Subscription Payments Data Access Layer
// ============================================================================
// Centralizes all subscription payment cycle database queries

import { createClient } from '@/lib/supabase/server'
import type {
  SubscriptionPayment,
  SubscriptionPaymentInsert,
  SubscriptionPaymentUpdate,
  SubscriptionPaymentWithRelations,
  PaymentCycleStatus,
  PocApprovalStatus,
} from '@/lib/types'
import { RENEWAL_REMINDER_DAYS } from '@/lib/constants'

// ============================================================================
// Types
// ============================================================================

export interface PaymentFilters {
  subscriptionId?: string
  cycleStatus?: PaymentCycleStatus
  paymentStatus?: 'PAID' | 'IN_PROGRESS' | 'DECLINED'
  pocApprovalStatus?: PocApprovalStatus
  accountingStatus?: 'PENDING' | 'DONE'
  invoiceDeadlineBefore?: string
  invoiceDeadlineAfter?: string
}

export interface PaymentPaginationOptions {
  page: number
  limit: number
  offset: number
}

export interface PaymentListResponse {
  payments: SubscriptionPaymentWithRelations[]
  totalCount: number
}

// ============================================================================
// Fetch Functions
// ============================================================================

/**
 * Fetch payment cycles for a subscription
 */
export async function fetchSubscriptionPayments(
  subscriptionId: string
): Promise<SubscriptionPaymentWithRelations[]> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('subscription_payments')
    .select(`
      *,
      invoice_file:subscription_files!invoice_file_id(*),
      payment_recorder:users!payment_recorded_by(id, name, email),
      poc_approver:users!poc_approved_by(id, name, email)
    `)
    .eq('subscription_id', subscriptionId)
    .order('cycle_number', { ascending: false })

  if (error) {
    console.error('Error fetching subscription payments:', error)
    throw new Error(`Failed to fetch subscription payments: ${error.message}`)
  }

  return data as SubscriptionPaymentWithRelations[]
}

/**
 * Fetch a single payment cycle by ID
 */
export async function fetchPaymentById(
  paymentId: string
): Promise<SubscriptionPaymentWithRelations | null> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('subscription_payments')
    .select(`
      *,
      invoice_file:subscription_files!invoice_file_id(*),
      payment_recorder:users!payment_recorded_by(id, name, email),
      poc_approver:users!poc_approved_by(id, name, email)
    `)
    .eq('id', paymentId)
    .single()

  if (error) {
    if (error.code === 'PGRST116') return null
    console.error('Error fetching payment:', error)
    throw new Error(`Failed to fetch payment: ${error.message}`)
  }

  return data as SubscriptionPaymentWithRelations
}

/**
 * Get the latest payment cycle for a subscription
 */
export async function fetchLatestPaymentCycle(
  subscriptionId: string
): Promise<SubscriptionPayment | null> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('subscription_payments')
    .select('*')
    .eq('subscription_id', subscriptionId)
    .order('cycle_number', { ascending: false })
    .limit(1)
    .single()

  if (error) {
    if (error.code === 'PGRST116') return null
    console.error('Error fetching latest payment cycle:', error)
    throw new Error(`Failed to fetch latest payment cycle: ${error.message}`)
  }

  return data as SubscriptionPayment
}

/**
 * Fetch pending approvals for POC (subscriptions needing approval within RENEWAL_REMINDER_DAYS)
 */
export async function fetchPendingApprovalsForPOC(
  departmentIds: string[]
): Promise<SubscriptionPaymentWithRelations[]> {
  const supabase = await createClient()

  // Calculate the date range for pending approvals
  const today = new Date()
  const reminderDate = new Date()
  reminderDate.setDate(today.getDate() + RENEWAL_REMINDER_DAYS)

  const { data, error } = await supabase
    .from('subscription_payments')
    .select(`
      *,
      invoice_file:subscription_files!invoice_file_id(*),
      payment_recorder:users!payment_recorded_by(id, name, email),
      poc_approver:users!poc_approved_by(id, name, email),
      subscriptions!inner(
        id,
        subscription_id,
        tool_name,
        vendor_name,
        department_id,
        amount,
        currency,
        billing_frequency
      )
    `)
    .eq('poc_approval_status', 'PENDING')
    .lte('cycle_end_date', reminderDate.toISOString().split('T')[0])
    .in('subscriptions.department_id', departmentIds)
    .order('cycle_end_date', { ascending: true })

  if (error) {
    console.error('Error fetching pending approvals:', error)
    throw new Error(`Failed to fetch pending approvals: ${error.message}`)
  }

  return data as SubscriptionPaymentWithRelations[]
}

/**
 * Fetch payments pending invoice upload for POC
 */
export async function fetchPendingInvoiceUploadsForPOC(
  departmentIds: string[]
): Promise<SubscriptionPaymentWithRelations[]> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('subscription_payments')
    .select(`
      *,
      invoice_file:subscription_files!invoice_file_id(*),
      payment_recorder:users!payment_recorded_by(id, name, email),
      poc_approver:users!poc_approved_by(id, name, email),
      subscriptions!inner(
        id,
        subscription_id,
        tool_name,
        vendor_name,
        department_id,
        amount,
        currency,
        billing_frequency
      )
    `)
    .eq('cycle_status', 'PAYMENT_RECORDED')
    .is('invoice_file_id', null)
    .in('subscriptions.department_id', departmentIds)
    .order('invoice_deadline', { ascending: true })

  if (error) {
    console.error('Error fetching pending invoice uploads:', error)
    throw new Error(`Failed to fetch pending invoice uploads: ${error.message}`)
  }

  return data as SubscriptionPaymentWithRelations[]
}

/**
 * Fetch overdue invoices (past deadline, not uploaded)
 */
export async function fetchOverdueInvoices(
  departmentIds: string[]
): Promise<SubscriptionPaymentWithRelations[]> {
  const supabase = await createClient()
  const today = new Date().toISOString().split('T')[0]

  const { data, error } = await supabase
    .from('subscription_payments')
    .select(`
      *,
      invoice_file:subscription_files!invoice_file_id(*),
      payment_recorder:users!payment_recorded_by(id, name, email),
      poc_approver:users!poc_approved_by(id, name, email),
      subscriptions!inner(
        id,
        subscription_id,
        tool_name,
        vendor_name,
        department_id,
        poc_email
      )
    `)
    .eq('cycle_status', 'PAYMENT_RECORDED')
    .is('invoice_file_id', null)
    .lt('invoice_deadline', today)
    .in('subscriptions.department_id', departmentIds)
    .order('invoice_deadline', { ascending: true })

  if (error) {
    console.error('Error fetching overdue invoices:', error)
    throw new Error(`Failed to fetch overdue invoices: ${error.message}`)
  }

  return data as SubscriptionPaymentWithRelations[]
}

// ============================================================================
// Create Functions
// ============================================================================

/**
 * Create a new payment cycle for a subscription
 */
export async function createPaymentCycle(
  payment: SubscriptionPaymentInsert
): Promise<SubscriptionPayment> {
  const supabase = await createClient()

  // Get the next cycle number
  const latestCycle = await fetchLatestPaymentCycle(payment.subscription_id)
  const nextCycleNumber = latestCycle ? latestCycle.cycle_number + 1 : 1

  const { data, error } = await supabase
    .from('subscription_payments')
    .insert({
      ...payment,
      cycle_number: nextCycleNumber,
    })
    .select()
    .single()

  if (error) {
    console.error('Error creating payment cycle:', error)
    throw new Error(`Failed to create payment cycle: ${error.message}`)
  }

  return data as SubscriptionPayment
}

// ============================================================================
// Update Functions
// ============================================================================

/**
 * Record payment by Finance team
 */
export async function recordPayment(
  paymentId: string,
  data: SubscriptionPaymentUpdate
): Promise<SubscriptionPayment> {
  const supabase = await createClient()

  const { data: payment, error } = await supabase
    .from('subscription_payments')
    .update({
      ...data,
      updated_at: new Date().toISOString(),
    })
    .eq('id', paymentId)
    .select()
    .single()

  if (error) {
    console.error('Error recording payment:', error)
    throw new Error(`Failed to record payment: ${error.message}`)
  }

  return payment as SubscriptionPayment
}

/**
 * POC approves renewal
 */
export async function approveRenewal(
  paymentId: string,
  data: SubscriptionPaymentUpdate
): Promise<SubscriptionPayment> {
  const supabase = await createClient()

  const { data: payment, error } = await supabase
    .from('subscription_payments')
    .update({
      ...data,
      updated_at: new Date().toISOString(),
    })
    .eq('id', paymentId)
    .select()
    .single()

  if (error) {
    console.error('Error approving renewal:', error)
    throw new Error(`Failed to approve renewal: ${error.message}`)
  }

  return payment as SubscriptionPayment
}

/**
 * POC rejects renewal
 */
export async function rejectRenewal(
  paymentId: string,
  data: SubscriptionPaymentUpdate
): Promise<SubscriptionPayment> {
  const supabase = await createClient()

  const { data: payment, error } = await supabase
    .from('subscription_payments')
    .update({
      ...data,
      updated_at: new Date().toISOString(),
    })
    .eq('id', paymentId)
    .select()
    .single()

  if (error) {
    console.error('Error rejecting renewal:', error)
    throw new Error(`Failed to reject renewal: ${error.message}`)
  }

  return payment as SubscriptionPayment
}

/**
 * POC uploads invoice
 */
export async function uploadInvoice(
  paymentId: string,
  data: SubscriptionPaymentUpdate
): Promise<SubscriptionPayment> {
  const supabase = await createClient()

  const { data: payment, error } = await supabase
    .from('subscription_payments')
    .update({
      ...data,
      updated_at: new Date().toISOString(),
    })
    .eq('id', paymentId)
    .select()
    .single()

  if (error) {
    console.error('Error uploading invoice:', error)
    throw new Error(`Failed to upload invoice: ${error.message}`)
  }

  return payment as SubscriptionPayment
}

/**
 * Cancel payment cycle (due to missing invoice)
 */
export async function cancelPaymentCycle(
  paymentId: string
): Promise<SubscriptionPayment> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('subscription_payments')
    .update({
      cycle_status: 'CANCELLED',
    })
    .eq('id', paymentId)
    .select()
    .single()

  if (error) {
    console.error('Error cancelling payment cycle:', error)
    throw new Error(`Failed to cancel payment cycle: ${error.message}`)
  }

  return data as SubscriptionPayment
}

/**
 * Update payment status (Finance)
 */
export async function updatePaymentStatus(
  paymentId: string,
  update: SubscriptionPaymentUpdate
): Promise<SubscriptionPayment> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('subscription_payments')
    .update(update)
    .eq('id', paymentId)
    .select()
    .single()

  if (error) {
    console.error('Error updating payment status:', error)
    throw new Error(`Failed to update payment status: ${error.message}`)
  }

  return data as SubscriptionPayment
}

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Calculate invoice deadline (end of month of cycle end date)
 */
export function calculateInvoiceDeadline(cycleEndDate: Date): string {
  const date = new Date(cycleEndDate)
  // Get the last day of the month
  const lastDay = new Date(date.getFullYear(), date.getMonth() + 1, 0)
  return lastDay.toISOString().split('T')[0]
}

/**
 * Calculate the next cycle dates based on billing frequency
 */
export function calculateNextCycleDates(
  currentEndDate: Date,
  billingFrequency: 'MONTHLY' | 'QUARTERLY' | 'YEARLY' | 'USAGE_BASED'
): { startDate: Date; endDate: Date } {
  const startDate = new Date(currentEndDate)
  startDate.setDate(startDate.getDate() + 1)

  const endDate = new Date(startDate)

  switch (billingFrequency) {
    case 'MONTHLY':
      endDate.setMonth(endDate.getMonth() + 1)
      break
    case 'QUARTERLY':
      endDate.setMonth(endDate.getMonth() + 3)
      break
    case 'YEARLY':
      endDate.setFullYear(endDate.getFullYear() + 1)
      break
    case 'USAGE_BASED':
      // For usage-based, default to monthly cycle
      endDate.setMonth(endDate.getMonth() + 1)
      break
  }

  // Subtract 1 day to get the last day of the cycle
  endDate.setDate(endDate.getDate() - 1)

  return { startDate, endDate }
}

/**
 * Check if renewal reminder should be sent
 */
export function shouldSendRenewalReminder(cycleEndDate: Date): boolean {
  const today = new Date()
  today.setHours(0, 0, 0, 0)

  const reminderDate = new Date(cycleEndDate)
  reminderDate.setDate(reminderDate.getDate() - RENEWAL_REMINDER_DAYS)
  reminderDate.setHours(0, 0, 0, 0)

  return today >= reminderDate
}

/**
 * Check if invoice is overdue
 */
export function isInvoiceOverdue(invoiceDeadline: Date): boolean {
  const today = new Date()
  today.setHours(0, 0, 0, 0)

  const deadline = new Date(invoiceDeadline)
  deadline.setHours(0, 0, 0, 0)

  return today > deadline
}

// ============================================================================
// Analytics/Counts Functions
// ============================================================================

export interface PaymentCycleCounts {
  PENDING_PAYMENT: number
  PAYMENT_RECORDED: number
  PENDING_APPROVAL: number
  APPROVED: number
  REJECTED: number
  INVOICE_UPLOADED: number
  COMPLETED: number
  CANCELLED: number
}

/**
 * Get counts of payment cycles by status for Finance dashboard
 */
export async function getPaymentCycleCountsByStatus(): Promise<PaymentCycleCounts> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('subscription_payments')
    .select('cycle_status')

  if (error) {
    console.error('Error fetching payment cycle counts:', error)
    throw new Error(`Failed to fetch payment cycle counts: ${error.message}`)
  }

  // Initialize counts
  const counts: PaymentCycleCounts = {
    PENDING_PAYMENT: 0,
    PAYMENT_RECORDED: 0,
    PENDING_APPROVAL: 0,
    APPROVED: 0,
    REJECTED: 0,
    INVOICE_UPLOADED: 0,
    COMPLETED: 0,
    CANCELLED: 0,
  }

  // Count by status
  for (const row of data || []) {
    const status = row.cycle_status as keyof PaymentCycleCounts
    if (status in counts) {
      counts[status]++
    }
  }

  return counts
}

/**
 * Get count of payment cycles requiring Finance action (pending payment)
 */
export async function getPaymentsPendingFinanceAction(): Promise<number> {
  const supabase = await createClient()

  const { count, error } = await supabase
    .from('subscription_payments')
    .select('*', { count: 'exact', head: true })
    .eq('cycle_status', 'PENDING_PAYMENT')

  if (error) {
    console.error('Error fetching pending payments count:', error)
    return 0
  }

  return count || 0
}

/**
 * Get recent payment cycles for Finance dashboard
 */
export async function getRecentPaymentCycles(
  limit: number = 5
): Promise<SubscriptionPaymentWithRelations[]> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('subscription_payments')
    .select(`
      *,
      invoice_file:subscription_files!invoice_file_id(*),
      payment_recorder:users!payment_recorded_by(id, name, email),
      poc_approver:users!poc_approved_by(id, name, email)
    `)
    .order('created_at', { ascending: false })
    .limit(limit)

  if (error) {
    console.error('Error fetching recent payment cycles:', error)
    throw new Error(`Failed to fetch recent payment cycles: ${error.message}`)
  }

  return data as SubscriptionPaymentWithRelations[]
}

/**
 * Fetch payment cycles for HOD's departments (view-only)
 */
export async function fetchPaymentCyclesForDepartments(
  departmentIds: string[],
  limit: number = 10
): Promise<SubscriptionPaymentWithRelations[]> {
  const supabase = await createClient()

  if (departmentIds.length === 0) {
    return []
  }

  const { data, error } = await supabase
    .from('subscription_payments')
    .select(`
      *,
      invoice_file:subscription_files!invoice_file_id(*),
      payment_recorder:users!payment_recorded_by(id, name, email),
      poc_approver:users!poc_approved_by(id, name, email),
      subscriptions!inner(
        id,
        subscription_id,
        tool_name,
        vendor_name,
        department_id,
        amount,
        currency,
        billing_frequency,
        departments(id, name)
      )
    `)
    .in('subscriptions.department_id', departmentIds)
    .order('created_at', { ascending: false })
    .limit(limit)

  if (error) {
    console.error('Error fetching payment cycles for departments:', error)
    throw new Error(`Failed to fetch payment cycles for departments: ${error.message}`)
  }

  return data as SubscriptionPaymentWithRelations[]
}

/**
 * Get payment cycle counts for specific departments (HOD dashboard)
 */
export async function getPaymentCycleCountsForDepartments(
  departmentIds: string[]
): Promise<PaymentCycleCounts> {
  const supabase = await createClient()

  if (departmentIds.length === 0) {
    return {
      PENDING_PAYMENT: 0,
      PAYMENT_RECORDED: 0,
      PENDING_APPROVAL: 0,
      APPROVED: 0,
      REJECTED: 0,
      INVOICE_UPLOADED: 0,
      COMPLETED: 0,
      CANCELLED: 0,
    }
  }

  const { data, error } = await supabase
    .from('subscription_payments')
    .select(`
      cycle_status,
      subscriptions!inner(department_id)
    `)
    .in('subscriptions.department_id', departmentIds)

  if (error) {
    console.error('Error fetching payment cycle counts for departments:', error)
    throw new Error(`Failed to fetch payment cycle counts: ${error.message}`)
  }

  // Initialize counts
  const counts: PaymentCycleCounts = {
    PENDING_PAYMENT: 0,
    PAYMENT_RECORDED: 0,
    PENDING_APPROVAL: 0,
    APPROVED: 0,
    REJECTED: 0,
    INVOICE_UPLOADED: 0,
    COMPLETED: 0,
    CANCELLED: 0,
  }

  // Count by status
  for (const row of data || []) {
    const status = row.cycle_status as keyof PaymentCycleCounts
    if (status in counts) {
      counts[status]++
    }
  }

  return counts
}

