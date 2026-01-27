// ============================================================================
// Database Type Definitions
// ============================================================================

import { Database } from '../supabase/database.types'

// Table row types
export type User = Database['public']['Tables']['users']['Row']
export type Role = Database['public']['Tables']['roles']['Row']
export type Department = Database['public']['Tables']['departments']['Row']
export type UserRole = Database['public']['Tables']['user_roles']['Row']
export type HodDepartment = Database['public']['Tables']['hod_departments']['Row']
export type HodPocMapping = Database['public']['Tables']['hod_poc_mapping']['Row']
export type PocDepartmentAccess = Database['public']['Tables']['poc_department_access']['Row']

// Insert types
export type UserInsert = Database['public']['Tables']['users']['Insert']
export type RoleInsert = Database['public']['Tables']['roles']['Insert']
export type DepartmentInsert = Database['public']['Tables']['departments']['Insert']

// Update types
export type UserUpdate = Database['public']['Tables']['users']['Update']
export type DepartmentUpdate = Database['public']['Tables']['departments']['Update']

// ============================================================================
// Role Types
// ============================================================================

export type RoleName = 'ADMIN' | 'FINANCE' | 'HOD' | 'POC'

// User role from Supabase join (can be array or single object depending on query)
export interface UserRoleData {
  role_id: string
  roles: Pick<Role, 'name' | 'id'>
}

// Single role per user (normalized to single object)
export interface UserWithRoles extends User {
  user_roles?: UserRoleData | null
}

// Raw response from Supabase query (returns array for joins)
export interface UserWithRolesRaw extends User {
  user_roles: UserRoleData[]
}

// ============================================================================
// Auth Types
// ============================================================================

export type OAuthProvider = 'google' | 'azure'

export interface AuthError {
  message: string
  code?: string
}

export type AuthState = 'idle' | 'loading' | 'authenticated' | 'unauthenticated'

// ============================================================================
// API Response Types
// ============================================================================

export interface ApiResponse<T = unknown> {
  data?: T
  error?: AuthError
  success: boolean
}

// ============================================================================
// Query Result Types
// ============================================================================

/**
 * User role query result for searching HOD/POC users
 */
export interface UserRoleQueryResult {
  user_id: string
  users: {
    id: string
    name: string | null
    email: string
    is_active: boolean
  } | null
}

/**
 * Simple user info for dropdowns and selections
 */
export interface SimpleUser {
  id: string
  name: string | null
  email: string
}

/**
 * Department with related HODs and POCs
 */
export interface DepartmentWithRelations extends Department {
  hod_departments: Array<{
    hod_id: string
    users: SimpleUser
  }>
  poc_department_access: Array<{
    poc_id: string
    users: SimpleUser
  }>
}

/**
 * Role count aggregation for analytics
 */
export interface RoleCounts {
  [roleName: string]: number
}

// ============================================================================
// Location Types
// ============================================================================

export interface Location {
  id: string
  name: string
  location_type: 'OFFICE' | 'NIAT' | 'OTHER'
  address: string | null
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface LocationInsert {
  name: string
  location_type: 'OFFICE' | 'NIAT' | 'OTHER'
  address?: string | null
  is_active?: boolean
}

export interface LocationUpdate {
  name?: string
  location_type?: 'OFFICE' | 'NIAT' | 'OTHER'
  address?: string | null
  is_active?: boolean
}

// ============================================================================
// Vendor Types
// ============================================================================

export interface Vendor {
  id: string
  name: string
  is_active: boolean | null
  created_at: string | null
  updated_at: string | null
}

export interface VendorInsert {
  name: string
  is_active?: boolean | null
}

export interface VendorUpdate {
  name?: string
  is_active?: boolean | null
}

// ============================================================================
// Product Types
// ============================================================================

export interface Product {
  id: string
  name: string
  is_active: boolean | null
  created_at: string | null
  updated_at: string | null
}

export interface ProductInsert {
  name: string
  is_active?: boolean | null
}

export interface ProductUpdate {
  name?: string
  is_active?: boolean | null
}

// ============================================================================
// Subscription Types
// ============================================================================

export interface Subscription {
  id: string
  subscription_id: string // Auto-generated: DEPT/FY26/001
  request_type: 'INVOICE' | 'QUOTATION'
  tool_name: string
  vendor_name: string
  product_id: string | null // Foreign key to products table
  department_id: string
  location_id: string | null
  amount: number
  equivalent_inr_amount: number | null // Equivalent amount in INR
  currency: 'INR' | 'CHF' | 'USD' // Updated currency options
  billing_frequency: 'MONTHLY' | 'QUARTERLY' | 'YEARLY' | 'USAGE_BASED'
  payment_status: 'PAID' | 'IN_PROGRESS' | 'DECLINED' // Updated payment status
  status: 'PENDING' | 'ACTIVE' | 'REJECTED' | 'EXPIRED' | 'CANCELLED'
  accounting_status: 'PENDING' | 'DONE'
  start_date: string | null
  end_date: string | null
  login_url: string | null
  subscription_email: string | null // Mail ID/Username used for subscription
  poc_email: string | null // POC email for subscription (auto-filled from department)
  mandate_id: string | null // Mandate ID
  budget_period: string | null // Budget period
  payment_utr: string | null // Payment UTR
  requester_remarks: string | null // Requester remarks
  version: number
  created_by: string
  created_at: string
  updated_at: string
}

export interface SubscriptionInsert {
  request_type: 'INVOICE' | 'QUOTATION'
  tool_name: string
  vendor_name: string
  product_id?: string | null // Foreign key to products table
  department_id: string
  location_id?: string | null
  amount: number
  equivalent_inr_amount?: number | null // Equivalent amount in INR
  currency?: 'INR' | 'CHF' | 'USD' // Updated currency options
  billing_frequency: 'MONTHLY' | 'QUARTERLY' | 'YEARLY' | 'USAGE_BASED'
  start_date: string
  end_date?: string | null
  login_url?: string | null
  subscription_email?: string | null // Mail ID/Username used for subscription
  poc_email?: string | null // POC email for subscription (auto-filled from department)
  mandate_id?: string | null // Mandate ID
  budget_period?: string | null // Budget period
  payment_utr?: string | null // Payment UTR
  requester_remarks?: string | null // Requester remarks
  payment_status?: 'PAID' | 'IN_PROGRESS' | 'DECLINED' // Updated payment status
  accounting_status?: 'PENDING' | 'DONE'
}

export interface SubscriptionUpdate {
  request_type?: 'INVOICE' | 'QUOTATION'
  tool_name?: string
  vendor_name?: string
  product_id?: string | null // Foreign key to products table
  department_id?: string
  location_id?: string | null
  amount?: number
  equivalent_inr_amount?: number | null // Equivalent amount in INR
  currency?: 'INR' | 'CHF' | 'USD' // Updated currency options
  billing_frequency?: 'MONTHLY' | 'QUARTERLY' | 'YEARLY' | 'USAGE_BASED'
  start_date?: string
  end_date?: string | null
  login_url?: string | null
  subscription_email?: string | null // Mail ID/Username used for subscription
  poc_email?: string | null // POC email for subscription (auto-filled from department)
  mandate_id?: string | null // Mandate ID
  budget_period?: string | null // Budget period
  payment_utr?: string | null // Payment UTR
  requester_remarks?: string | null // Requester remarks
  payment_status?: 'PAID' | 'IN_PROGRESS' | 'DECLINED' // Updated payment status
  accounting_status?: 'PENDING' | 'DONE'
}

/**
 * Subscription with all related data (from list queries)
 * Note: subscription_approvals and subscription_files are fetched separately
 */
export interface SubscriptionWithRelations extends Subscription {
  departments: {
    id: string
    name: string
  }
  locations: {
    id: string
    name: string
    location_type: string
  } | null
  vendors: {
    id: string
    name: string
  } | null
  products: {
    id: string
    name: string
  } | null
  creator: SimpleUser
}

/**
 * Full subscription details including approvals and files
 * Used when viewing a single subscription
 */
export interface SubscriptionFullDetails extends SubscriptionWithRelations {
  subscription_approvals: SubscriptionApprovalWithApprover[]
  subscription_files: SubscriptionFile[]
}

/**
 * Subscription file metadata
 */
export interface SubscriptionFile {
  id: string
  subscription_id: string
  file_type: 'PROOF_OF_PAYMENT' | 'INVOICE'
  storage_path: string
  original_filename: string
  file_size: number | null
  mime_type: string | null
  uploaded_by: string
  created_at: string
}

/**
 * Subscription approval record
 */
export interface SubscriptionApproval {
  id: string
  subscription_id: string
  approver_id: string
  action: 'APPROVED' | 'REJECTED'
  comments: string | null
  created_at: string
}

/**
 * Subscription approval with approver details
 */
export interface SubscriptionApprovalWithApprover extends SubscriptionApproval {
  approver: SimpleUser
}

// ============================================================================
// Subscription Payment Types (Payment Cycles)
// ============================================================================

export type PaymentCycleStatus =
  | 'PENDING_PAYMENT'     // Waiting for Finance to record payment
  | 'PAYMENT_RECORDED'    // Finance has recorded payment, waiting for POC invoice
  | 'PENDING_APPROVAL'    // Awaiting POC approval for next renewal
  | 'APPROVED'            // POC approved renewal
  | 'REJECTED'            // POC rejected renewal
  | 'INVOICE_UPLOADED'    // POC uploaded invoice
  | 'COMPLETED'           // Cycle complete
  | 'CANCELLED'           // Cancelled due to missing invoice

export type PocApprovalStatus = 'PENDING' | 'APPROVED' | 'REJECTED'

/**
 * Subscription payment cycle record
 */
export interface SubscriptionPayment {
  id: string
  subscription_id: string

  // Payment cycle period
  cycle_number: number
  cycle_start_date: string
  cycle_end_date: string

  // Finance records payment
  payment_utr: string | null
  payment_status: 'PAID' | 'IN_PROGRESS' | 'DECLINED'
  accounting_status: 'PENDING' | 'DONE'
  mandate_id: string | null
  payment_recorded_by: string | null
  payment_recorded_at: string | null

  // POC approval for renewal
  poc_approval_status: PocApprovalStatus
  poc_approved_by: string | null
  poc_approved_at: string | null
  poc_rejection_reason: string | null

  // POC invoice upload
  invoice_file_id: string | null
  invoice_uploaded_at: string | null
  invoice_deadline: string

  // Cycle status
  cycle_status: PaymentCycleStatus

  // Timestamps
  created_at: string
  updated_at: string
}

/**
 * Subscription payment insert type
 */
export interface SubscriptionPaymentInsert {
  subscription_id: string
  cycle_number?: number
  cycle_start_date: string
  cycle_end_date: string
  payment_utr?: string | null
  payment_status?: 'PAID' | 'IN_PROGRESS' | 'DECLINED'
  accounting_status?: 'PENDING' | 'DONE'
  mandate_id?: string | null
  payment_recorded_by?: string | null
  payment_recorded_at?: string | null
  poc_approval_status?: PocApprovalStatus
  invoice_deadline: string
  cycle_status?: PaymentCycleStatus
}

/**
 * Subscription payment update type
 */
export interface SubscriptionPaymentUpdate {
  payment_utr?: string | null
  payment_status?: 'PAID' | 'IN_PROGRESS' | 'DECLINED'
  accounting_status?: 'PENDING' | 'DONE'
  mandate_id?: string | null
  payment_recorded_by?: string | null
  payment_recorded_at?: string | null
  poc_approval_status?: PocApprovalStatus
  poc_approved_by?: string | null
  poc_approved_at?: string | null
  poc_rejection_reason?: string | null
  invoice_file_id?: string | null
  invoice_uploaded_at?: string | null
  cycle_status?: PaymentCycleStatus
}

/**
 * Subscription payment with related data
 */
export interface SubscriptionPaymentWithRelations extends SubscriptionPayment {
  invoice_file: SubscriptionFile | null
  payment_recorder: SimpleUser | null
  poc_approver: SimpleUser | null
}

/**
 * Subscription with payments for detail view
 */
export interface SubscriptionWithPayments extends SubscriptionFullDetails {
  subscription_payments: SubscriptionPaymentWithRelations[]
}

// ============================================================================
// Notification Types
// ============================================================================

export interface Notification {
  id: string
  user_id: string
  type: 'APPROVAL_REQUEST' | 'APPROVAL_DECISION' | 'PAYMENT_UPDATE' | 'GENERAL'
  title: string
  message: string
  subscription_id: string | null
  is_read: boolean
  created_at: string
}

export interface NotificationWithSubscription extends Notification {
  subscriptions: {
    id: string
    subscription_name: string
  } | null
}
