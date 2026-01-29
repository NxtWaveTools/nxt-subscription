// ============================================================================
// Subscriptions Data Access Layer
// ============================================================================
// Centralizes all subscription-related database queries

import { createClient } from '@/lib/supabase/server'
import type {
  Subscription,
  SubscriptionWithRelations,
  SubscriptionFile,
  SubscriptionApproval,
  SubscriptionApprovalWithApprover,
} from '@/lib/types'
import type {
  SubscriptionStatus,
  PaymentStatus,
  AccountingStatus,
  BillingFrequency,
  RequestType,
} from '@/lib/constants'

// ============================================================================
// Types
// ============================================================================

export interface SubscriptionFilters {
  search?: string
  status?: SubscriptionStatus
  paymentStatus?: PaymentStatus
  accountingStatus?: AccountingStatus
  billingFrequency?: BillingFrequency
  requestType?: RequestType
  departmentId?: string
  createdBy?: string
  startDateFrom?: string
  startDateTo?: string
  endDateFrom?: string
  endDateTo?: string
}

export interface SubscriptionPaginationOptions {
  page: number
  limit: number
  offset: number
}

export interface SubscriptionListResponse {
  subscriptions: SubscriptionWithRelations[]
  totalCount: number
}

// ============================================================================
// Fetch Functions
// ============================================================================

/**
 * Fetch subscriptions with filters and pagination
 * All filtering happens at database level - no in-memory filtering
 */
export async function fetchSubscriptions(
  filters: SubscriptionFilters,
  pagination: SubscriptionPaginationOptions,
  userDepartmentIds?: string[] // For POC/HOD filtering
): Promise<SubscriptionListResponse> {
  const supabase = await createClient()
  const { limit, offset } = pagination

  // Build query with joins
  let query = supabase
    .from('subscriptions')
    .select(
      `
      id,
      subscription_id,
      request_type,
      tool_name,
      vendor_name,
      product_id,
      department_id,
      amount,
      equivalent_inr_amount,
      currency,
      billing_frequency,
      payment_status,
      status,
      accounting_status,
      start_date,
      end_date,
      login_url,
      subscription_email,
      poc_email,
      mandate_id,
      budget_period,
      payment_utr,
      requester_remarks,
      version,
      created_by,
      created_at,
      updated_at,
      departments:department_id (
        id,
        name
      ),
      products:product_id (
        id,
        name
      ),
      creator:created_by (
        id,
        name,
        email
      )
    `,
      { count: 'exact' }
    )

  // Apply department filter for POC/HOD access
  if (userDepartmentIds && userDepartmentIds.length > 0) {
    query = query.in('department_id', userDepartmentIds)
  }

  // Apply search filter
  if (filters.search) {
    query = query.or(
      `tool_name.ilike.%${filters.search}%,vendor_name.ilike.%${filters.search}%,subscription_id.ilike.%${filters.search}%`
    )
  }

  // Apply status filters
  if (filters.status) {
    query = query.eq('status', filters.status)
  }
  if (filters.paymentStatus) {
    query = query.eq('payment_status', filters.paymentStatus)
  }
  if (filters.accountingStatus) {
    query = query.eq('accounting_status', filters.accountingStatus)
  }
  if (filters.billingFrequency) {
    query = query.eq('billing_frequency', filters.billingFrequency)
  }
  if (filters.requestType) {
    query = query.eq('request_type', filters.requestType)
  }

  // Apply relationship filters
  if (filters.departmentId) {
    query = query.eq('department_id', filters.departmentId)
  }
  if (filters.createdBy) {
    query = query.eq('created_by', filters.createdBy)
  }

  // Apply date range filters
  if (filters.startDateFrom) {
    query = query.gte('start_date', filters.startDateFrom)
  }
  if (filters.startDateTo) {
    query = query.lte('start_date', filters.startDateTo)
  }
  if (filters.endDateFrom) {
    query = query.gte('end_date', filters.endDateFrom)
  }
  if (filters.endDateTo) {
    query = query.lte('end_date', filters.endDateTo)
  }

  // Apply pagination and ordering
  query = query
    .range(offset, offset + limit - 1)
    .order('created_at', { ascending: false })

  const { data, error, count } = await query

  if (error) {
    throw new Error(`Failed to fetch subscriptions: ${error.message}`)
  }

  return {
    subscriptions: (data || []) as SubscriptionWithRelations[],
    totalCount: count || 0,
  }
}

/**
 * Fetch a single subscription by ID with all relations
 */
export async function fetchSubscriptionById(
  id: string
): Promise<SubscriptionWithRelations | null> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('subscriptions')
    .select(
      `
      id,
      subscription_id,
      request_type,
      tool_name,
      vendor_name,
      product_id,
      department_id,
      amount,
      equivalent_inr_amount,
      currency,
      billing_frequency,
      payment_status,
      status,
      accounting_status,
      start_date,
      end_date,
      login_url,
      subscription_email,
      poc_email,
      mandate_id,
      budget_period,
      payment_utr,
      requester_remarks,
      version,
      created_by,
      created_at,
      updated_at,
      departments:department_id (
        id,
        name
      ),
      creator:created_by (
        id,
        name,
        email
      )
    `
    )
    .eq('id', id)
    .single()

  if (error) {
    if (error.code === 'PGRST116') {
      return null // Not found
    }
    throw new Error(`Failed to fetch subscription: ${error.message}`)
  }

  return data as SubscriptionWithRelations
}

/**
 * Fetch files for a subscription
 */
export async function fetchSubscriptionFiles(
  subscriptionId: string
): Promise<SubscriptionFile[]> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('subscription_files')
    .select(
      `
      id,
      subscription_id,
      file_type,
      storage_path,
      original_filename,
      file_size,
      mime_type,
      uploaded_by,
      created_at
    `
    )
    .eq('subscription_id', subscriptionId)
    .order('created_at', { ascending: false })

  if (error) {
    throw new Error(`Failed to fetch subscription files: ${error.message}`)
  }

  return (data || []) as SubscriptionFile[]
}

/**
 * Fetch approval history for a subscription
 */
export async function fetchSubscriptionApprovals(
  subscriptionId: string
): Promise<SubscriptionApprovalWithApprover[]> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('subscription_approvals')
    .select(
      `
      id,
      subscription_id,
      approver_id,
      action,
      comments,
      created_at,
      approver:approver_id (
        id,
        name,
        email
      )
    `
    )
    .eq('subscription_id', subscriptionId)
    .order('created_at', { ascending: false })

  if (error) {
    throw new Error(`Failed to fetch approval history: ${error.message}`)
  }

  return (data || []) as SubscriptionApprovalWithApprover[]
}

/**
 * Fetch pending subscriptions for a POC's departments
 */
export async function fetchPendingSubscriptionsForPOC(
  pocId: string
): Promise<SubscriptionWithRelations[]> {
  const supabase = await createClient()

  // First get the POC's department IDs
  const { data: pocDepts, error: deptError } = await supabase
    .from('poc_department_access')
    .select('department_id')
    .eq('poc_id', pocId)

  if (deptError) {
    throw new Error(`Failed to fetch POC departments: ${deptError.message}`)
  }

  const departmentIds = pocDepts?.map((d) => d.department_id) || []

  if (departmentIds.length === 0) {
    return []
  }

  // Fetch pending subscriptions for those departments
  const { data, error } = await supabase
    .from('subscriptions')
    .select(
      `
      id,
      subscription_id,
      request_type,
      tool_name,
      vendor_name,
      product_id,
      department_id,
      amount,
      equivalent_inr_amount,
      currency,
      billing_frequency,
      payment_status,
      status,
      accounting_status,
      start_date,
      end_date,
      login_url,
      subscription_email,
      poc_email,
      mandate_id,
      budget_period,
      payment_utr,
      requester_remarks,
      version,
      created_by,
      created_at,
      updated_at,
      departments:department_id (
        id,
        name
      ),
      products:product_id (
        id,
        name
      ),
      creator:created_by (
        id,
        name,
        email
      )
    `
    )
    .in('department_id', departmentIds)
    .eq('status', 'PENDING')
    .order('created_at', { ascending: false })

  if (error) {
    throw new Error(`Failed to fetch pending subscriptions: ${error.message}`)
  }

  return (data || []) as SubscriptionWithRelations[]
}

/**
 * Get subscription counts by status
 */
export async function getSubscriptionCountsByStatus(
  departmentIds?: string[]
): Promise<Record<string, number>> {
  const supabase = await createClient()

  let query = supabase
    .from('subscriptions')
    .select('status', { count: 'exact', head: false })

  if (departmentIds && departmentIds.length > 0) {
    query = query.in('department_id', departmentIds)
  }

  const { data, error } = await query

  if (error) {
    throw new Error(`Failed to fetch subscription counts: ${error.message}`)
  }

  // Count by status
  const counts: Record<string, number> = {
    PENDING: 0,
    ACTIVE: 0,
    REJECTED: 0,
    EXPIRED: 0,
    CANCELLED: 0,
  }

  data?.forEach((row: { status: string }) => {
    if (row.status in counts) {
      counts[row.status]++
    }
  })

  return counts
}

/**
 * Fetch subscriptions for export (no pagination, filtered)
 */
export async function fetchSubscriptionsForExport(
  filters: SubscriptionFilters,
  departmentIds?: string[]
): Promise<SubscriptionWithRelations[]> {
  const supabase = await createClient()

  let query = supabase
    .from('subscriptions')
    .select(
      `
      id,
      subscription_id,
      request_type,
      tool_name,
      vendor_name,
      product_id,
      department_id,
      amount,
      equivalent_inr_amount,
      currency,
      billing_frequency,
      payment_status,
      status,
      accounting_status,
      start_date,
      end_date,
      login_url,
      subscription_email,
      poc_email,
      mandate_id,
      budget_period,
      payment_utr,
      requester_remarks,
      version,
      created_by,
      created_at,
      updated_at,
      departments:department_id (
        id,
        name
      ),
      creator:created_by (
        id,
        name,
        email
      )
    `
    )

  // Apply department filter
  if (departmentIds && departmentIds.length > 0) {
    query = query.in('department_id', departmentIds)
  }

  // Apply filters
  if (filters.status) {
    query = query.eq('status', filters.status)
  }
  if (filters.paymentStatus) {
    query = query.eq('payment_status', filters.paymentStatus)
  }
  if (filters.departmentId) {
    query = query.eq('department_id', filters.departmentId)
  }

  query = query.order('created_at', { ascending: false })

  const { data, error } = await query

  if (error) {
    throw new Error(`Failed to fetch subscriptions for export: ${error.message}`)
  }

  return (data || []) as SubscriptionWithRelations[]
}

/**
 * Check if a subscription exists and get its current status
 */
export async function getSubscriptionStatus(
  id: string
): Promise<{ exists: boolean; status?: string; version?: number }> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('subscriptions')
    .select('id, status, version')
    .eq('id', id)
    .maybeSingle()

  if (error) {
    throw new Error(`Failed to check subscription: ${error.message}`)
  }

  if (!data) {
    return { exists: false }
  }

  return {
    exists: true,
    status: data.status,
    version: data.version,
  }
}
