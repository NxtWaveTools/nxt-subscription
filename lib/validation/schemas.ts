// ============================================================================
// Validation Schemas
// ============================================================================

import { z } from 'zod'
import {
  ROLES,
  PAGINATION,
  REQUEST_TYPES,
  SUBSCRIPTION_STATUS,
  PAYMENT_STATUS,
  ACCOUNTING_STATUS,
  BILLING_FREQUENCY,
  CURRENCIES,
  FILE_TYPES,
  APPROVAL_ACTIONS,
  PAYMENT_CYCLE_STATUS,
  POC_APPROVAL_STATUS,
} from '@/lib/constants'

// Extract role names from ROLES constant for type-safe enum
const roleNames = [ROLES.ADMIN, ROLES.FINANCE, ROLES.HOD, ROLES.POC] as const

/**
 * User validation schemas
 */
export const userSchemas = {
  /**
   * User profile update schema
   */
  updateProfile: z.object({
    name: z.string().min(1, 'Name is required').max(100, 'Name is too long').optional(),
    email: z.string().email('Invalid email address').optional(),
  }),

  /**
   * User ID validation
   */
  userId: z.string().uuid('Invalid user ID'),
}

/**
 * Department validation schemas
 */
export const departmentSchemas = {
  /**
   * Create department schema
   */
  create: z.object({
    name: z.string().min(1, 'Department name is required').max(100, 'Name is too long'),
    is_active: z.boolean().optional().default(true),
  }),

  /**
   * Update department schema
   */
  update: z.object({
    name: z.string().min(1, 'Department name is required').max(100, 'Name is too long').optional(),
    is_active: z.boolean().optional(),
  }),

  /**
   * Department ID validation
   */
  departmentId: z.string().uuid('Invalid department ID'),
}

/**
 * Role validation schemas
 */
export const roleSchemas = {
  /**
   * Role name validation - uses ROLES constant for single source of truth
   */
  roleName: z.enum(roleNames, {
    message: 'Invalid role name',
  }),

  /**
   * Role assignment schema
   */
  assign: z.object({
    user_id: z.string().uuid('Invalid user ID'),
    role_id: z.string().uuid('Invalid role ID'),
  }),
}

/**
 * Pagination validation schema
 */
export const paginationSchema = z.object({
  page: z.coerce.number().int().min(1).default(PAGINATION.DEFAULT_PAGE),
  limit: z.coerce.number().int().min(PAGINATION.MIN_LIMIT).max(PAGINATION.MAX_LIMIT).default(PAGINATION.DEFAULT_LIMIT),
})

/**
 * Admin operation validation schemas
 */
export const adminSchemas = {
  /**
   * Activate/deactivate user schema
   */
  activateUser: z.object({
    user_id: z.string().uuid('Invalid user ID'),
    is_active: z.boolean(),
  }),

  /**
   * Bulk activate/deactivate users schema
   */
  bulkActivateUsers: z.object({
    user_ids: z.array(z.string().uuid('Invalid user ID')).min(1).max(100, 'Cannot exceed 100 users'),
    is_active: z.boolean(),
  }),

  /**
   * Assign role to user schema
   */
  assignRole: z.object({
    user_id: z.string().uuid('Invalid user ID'),
    role_id: z.string().regex(/^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/, 'Invalid role ID'),
  }),

  /**
   * Bulk assign role schema
   */
  bulkAssignRole: z.object({
    user_ids: z.array(z.string().uuid('Invalid user ID')).min(1).max(100, 'Cannot exceed 100 users'),
    role_id: z.string().regex(/^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/, 'Invalid role ID'),
  }),

  /**
   * Remove role from user schema
   */
  removeRole: z.object({
    user_id: z.string().uuid('Invalid user ID'),
    role_id: z.string().regex(/^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/, 'Invalid role ID'),
  }),

  /**
   * Assign HOD to department schema
   */
  assignHODtoDepartment: z.object({
    hod_id: z.string().uuid('Invalid HOD user ID'),
    department_id: z.string().uuid('Invalid department ID'),
  }),

  /**
   * Assign POC to department schema
   */
  assignPOCtoDepartment: z.object({
    poc_id: z.string().uuid('Invalid POC user ID'),
    department_id: z.string().uuid('Invalid department ID'),
  }),

  /**
   * Map POC to HOD schema
   */
  mapPOCtoHOD: z.object({
    hod_id: z.string().uuid('Invalid HOD user ID'),
    poc_id: z.string().uuid('Invalid POC user ID'),
  }),

  /**
   * Search and filter schema
   */
  searchFilter: z.object({
    search: z.string().optional(),
    role_id: z.string().uuid('Invalid role ID').optional(),
    department_id: z.string().uuid('Invalid department ID').optional(),
    is_active: z.boolean().optional(),
    date_from: z.coerce.date().optional(),
    date_to: z.coerce.date().optional(),
  }),

  /**
   * Delete department schema (hard delete)
   */
  deleteDepartment: z.object({
    department_id: z.string().uuid('Invalid department ID'),
  }),

  /**
   * Create department schema
   */
  createDepartment: z.object({
    name: z.string().min(1, 'Department name is required').max(100, 'Name is too long'),
  }),

  /**
   * Update department schema
   */
  updateDepartment: z.object({
    department_id: z.string().uuid('Invalid department ID'),
    name: z.string().min(1, 'Department name is required').max(100, 'Name is too long').optional(),
    is_active: z.boolean().optional(),
  }),

  /**
   * Bulk delete departments (soft delete)
   */
  bulkDeleteDepartments: z.object({
    department_ids: z.array(z.string().uuid('Invalid department ID')).min(1).max(100, 'Cannot exceed 100 departments'),
  }),

  /**
   * Bulk activate/deactivate departments
   */
  bulkToggleDepartments: z.object({
    department_ids: z.array(z.string().uuid('Invalid department ID')).min(1).max(100, 'Cannot exceed 100 departments'),
    is_active: z.boolean(),
  }),

  /**
   * Assign HOD to department
   */
  assignHOD: z.object({
    department_id: z.string().uuid('Invalid department ID'),
    hod_id: z.string().uuid('Invalid HOD user ID'),
  }),

  /**
   * Remove HOD from department
   */
  removeHOD: z.object({
    department_id: z.string().uuid('Invalid department ID'),
    hod_id: z.string().uuid('Invalid HOD user ID'),
  }),

  /**
   * Assign POC to HOD
   */
  assignPOC: z.object({
    hod_id: z.string().uuid('Invalid HOD user ID'),
    poc_id: z.string().uuid('Invalid POC user ID'),
  }),

  /**
   * Remove POC from HOD
   */
  removePOC: z.object({
    hod_id: z.string().uuid('Invalid HOD user ID'),
  }),

  /**
   * Grant POC access to department
   */
  grantPOCAccess: z.object({
    poc_id: z.string().uuid('Invalid POC user ID'),
    department_id: z.string().uuid('Invalid department ID'),
  }),

  /**
   * Revoke POC access from department
   */
  revokePOCAccess: z.object({
    poc_id: z.string().uuid('Invalid POC user ID'),
    department_id: z.string().uuid('Invalid department ID'),
  }),
}

/**
 * Pagination validation schemas
 */
export const paginationSchemas = {
  /**
   * Pagination params schema
   */
  params: z.object({
    limit: z
      .number()
      .int('Limit must be an integer')
      .min(1, 'Limit must be at least 1')
      .max(100, 'Limit cannot exceed 100')
      .optional()
      .default(20),
    cursor: z.string().optional(),
    sortBy: z.string().optional().default('created_at'),
    sortOrder: z.enum(['asc', 'desc']).optional().default('desc'),
  }),
}

/**
 * Common validation schemas
 */
export const commonSchemas = {
  /**
   * UUID validation
   */
  uuid: z.string().uuid('Invalid UUID'),

  /**
   * Email validation
   */
  email: z.string().email('Invalid email address'),

  /**
   * Date validation
   */
  date: z.coerce.date({
    message: 'Invalid date format',
  }),

  /**
   * Boolean validation
   */
  boolean: z.boolean({
    message: 'Invalid boolean value',
  }),

  /**
   * Non-empty string
   */
  nonEmptyString: z.string().min(1, 'Value cannot be empty'),
}

/**
 * API request validation schemas
 */
export const apiSchemas = {
  /**
   * Generic list request
   */
  listRequest: z.object({
    limit: z.number().int().min(1).max(100).optional(),
    cursor: z.string().optional(),
    sortBy: z.string().optional(),
    sortOrder: z.enum(['asc', 'desc']).optional(),
  }),

  /**
   * Generic ID param
   */
  idParam: z.object({
    id: z.string().uuid('Invalid ID'),
  }),
}

// ============================================================================
// Subscription Validation Schemas
// ============================================================================

const requestTypeValues = [REQUEST_TYPES.INVOICE, REQUEST_TYPES.QUOTATION] as const
const subscriptionStatusValues = [
  SUBSCRIPTION_STATUS.PENDING,
  SUBSCRIPTION_STATUS.ACTIVE,
  SUBSCRIPTION_STATUS.REJECTED,
  SUBSCRIPTION_STATUS.EXPIRED,
  SUBSCRIPTION_STATUS.CANCELLED,
] as const
const paymentStatusValues = [
  PAYMENT_STATUS.PAID,
  PAYMENT_STATUS.IN_PROGRESS,
  PAYMENT_STATUS.DECLINED,
] as const
const accountingStatusValues = [ACCOUNTING_STATUS.PENDING, ACCOUNTING_STATUS.DONE] as const
const billingFrequencyValues = [
  BILLING_FREQUENCY.MONTHLY,
  BILLING_FREQUENCY.QUARTERLY,
  BILLING_FREQUENCY.YEARLY,
  BILLING_FREQUENCY.USAGE_BASED,
] as const
const currencyValues = [
  CURRENCIES.INR,
  CURRENCIES.CHF,
  CURRENCIES.USD,
] as const
const fileTypeValues = [FILE_TYPES.PROOF_OF_PAYMENT, FILE_TYPES.INVOICE] as const
const approvalActionValues = [APPROVAL_ACTIONS.APPROVED, APPROVAL_ACTIONS.REJECTED] as const

export const subscriptionSchemas = {
  /**
   * Create subscription schema
   */
  create: z.object({
    request_type: z.enum(requestTypeValues, {
      message: 'Invalid request type',
    }),
    tool_name: z.string().min(1, 'Tool name is required').max(200, 'Tool name is too long'),
    vendor_name: z.string().min(1, 'Vendor name is required').max(200, 'Vendor name is too long'),
    pr_id: z.string().min(1, 'PR ID is required').max(100, 'PR ID is too long'),
    department_id: z.string().uuid('Invalid department ID'),
    amount: z.number().positive('Amount must be positive'),
    equivalent_inr_amount: z.number().positive('Equivalent INR amount must be positive').optional().nullable(),
    currency: z.enum(currencyValues, {
      message: 'Invalid currency',
    }).default('INR'),
    billing_frequency: z.enum(billingFrequencyValues, {
      message: 'Invalid billing frequency',
    }),
    login_url: z.string().url('Invalid URL').optional().nullable().or(z.literal('')),
    subscription_email: z.string().email('Invalid subscription email').optional().nullable().or(z.literal('')),
    poc_email: z.string().email('Invalid POC email').optional().nullable().or(z.literal('')),
    mandate_id: z.string().max(100, 'Mandate ID is too long').optional().nullable(),
    budget_period: z.string().max(50, 'Budget period is too long').optional().nullable(),
    requester_remarks: z.string().max(1000, 'Requester remarks too long').optional().nullable(),
    start_date: z.coerce.date({
      message: 'Invalid start date',
    }),
    end_date: z.coerce.date({
      message: 'Invalid end date',
    }),
  }).refine(
    (data) => data.end_date > data.start_date,
    {
      message: 'End date must be after start date',
      path: ['end_date'],
    }
  ),

  /**
   * Update subscription schema
   */
  update: z.object({
    request_type: z.enum(requestTypeValues).optional(),
    tool_name: z.string().min(1).max(200).optional(),
    vendor_name: z.string().min(1).max(200).optional(),
    pr_id: z.string().min(1).max(100).optional(),
    department_id: z.string().uuid().optional(),
    amount: z.number().positive().optional(),
    equivalent_inr_amount: z.number().positive().optional().nullable(),
    currency: z.enum(currencyValues).optional(),
    billing_frequency: z.enum(billingFrequencyValues).optional(),
    login_url: z.string().url().optional().nullable().or(z.literal('')),
    subscription_email: z.string().email().optional().nullable().or(z.literal('')),
    poc_email: z.string().email().optional().nullable().or(z.literal('')),
    mandate_id: z.string().max(100).optional().nullable(),
    budget_period: z.string().max(50).optional().nullable(),
    requester_remarks: z.string().max(1000).optional().nullable(),
    start_date: z.coerce.date().optional(),
    end_date: z.coerce.date().optional(),
    payment_status: z.enum(paymentStatusValues).optional(),
    accounting_status: z.enum(accountingStatusValues).optional(),
  }),

  /**
   * Approve subscription schema
   */
  approve: z.object({
    comments: z.string().max(500, 'Comments too long').optional().nullable(),
  }),

  /**
   * Reject subscription schema (comments required)
   */
  reject: z.object({
    comments: z.string().min(10, 'Please provide a reason for rejection (min 10 characters)').max(500, 'Comments too long'),
  }),

  /**
   * Bulk approve subscriptions schema
   */
  bulkApprove: z.object({
    subscription_ids: z.array(z.string().uuid()).min(1).max(100, 'Cannot exceed 100 subscriptions'),
    comments: z.string().max(500).optional().nullable(),
  }),

  /**
   * Update payment status schema
   */
  updatePayment: z.object({
    payment_status: z.enum(paymentStatusValues, {
      message: 'Invalid payment status',
    }),
  }),

  /**
   * Update accounting status schema
   */
  updateAccounting: z.object({
    accounting_status: z.enum(accountingStatusValues, {
      message: 'Invalid accounting status',
    }),
  }),

  /**
   * Subscription ID validation
   */
  subscriptionId: z.string().uuid('Invalid subscription ID'),

  /**
   * Search/filter subscriptions schema
   */
  filter: z.object({
    search: z.string().optional(),
    department_id: z.string().uuid().optional(),
    product_id: z.string().uuid().optional(),
    status: z.enum(subscriptionStatusValues).optional(),
    payment_status: z.enum(paymentStatusValues).optional(),
    accounting_status: z.enum(accountingStatusValues).optional(),
    request_type: z.enum(requestTypeValues).optional(),
    billing_frequency: z.enum(billingFrequencyValues).optional(),
    start_date_from: z.coerce.date().optional(),
    start_date_to: z.coerce.date().optional(),
  }),
}

// ============================================================================
// File Upload Validation Schemas
// ============================================================================

export const fileSchemas = {
  /**
   * File upload metadata schema
   */
  upload: z.object({
    subscription_id: z.string().uuid('Invalid subscription ID'),
    file_type: z.enum(fileTypeValues, {
      message: 'Invalid file type',
    }),
    original_filename: z.string().min(1, 'File name is required').max(255, 'File name too long'),
    file_size: z.number().positive('File size must be positive'),
  }),

  /**
   * File ID validation
   */
  fileId: z.string().uuid('Invalid file ID'),
}

// ============================================================================
// Notification Schemas
// ============================================================================

export const notificationSchemas = {
  /**
   * Notification ID validation
   */
  notificationId: z.string().uuid('Invalid notification ID'),

  /**
   * Mark notifications as read
   */
  markRead: z.object({
    notification_ids: z.array(z.string().uuid()).min(1).max(100),
  }),
}

// ============================================================================
// Payment Cycle Validation Schemas
// ============================================================================

const paymentCycleStatusValues = [
  PAYMENT_CYCLE_STATUS.PENDING_PAYMENT,
  PAYMENT_CYCLE_STATUS.PAYMENT_RECORDED,
  PAYMENT_CYCLE_STATUS.PENDING_APPROVAL,
  PAYMENT_CYCLE_STATUS.APPROVED,
  PAYMENT_CYCLE_STATUS.REJECTED,
  PAYMENT_CYCLE_STATUS.INVOICE_UPLOADED,
  PAYMENT_CYCLE_STATUS.COMPLETED,
  PAYMENT_CYCLE_STATUS.CANCELLED,
] as const

const pocApprovalStatusValues = [
  POC_APPROVAL_STATUS.PENDING,
  POC_APPROVAL_STATUS.APPROVED,
  POC_APPROVAL_STATUS.REJECTED,
] as const

export const paymentCycleSchemas = {
  /**
   * Record payment schema (Finance team)
   */
  recordPayment: z.object({
    payment_utr: z.string().min(1, 'Payment UTR is required').max(100, 'Payment UTR is too long'),
    payment_status: z.enum(paymentStatusValues, {
      message: 'Invalid payment status',
    }),
    accounting_status: z.enum(accountingStatusValues, {
      message: 'Invalid accounting status',
    }),
    mandate_id: z.string().max(100, 'Mandate ID is too long').optional().nullable(),
    remarks: z.string().max(500, 'Remarks too long').optional().nullable(),
  }),

  /**
   * Create payment cycle schema (Finance team)
   */
  createCycle: z.object({
    subscription_id: z.string().uuid('Invalid subscription ID'),
    cycle_start_date: z.coerce.date({
      message: 'Invalid cycle start date',
    }),
    cycle_end_date: z.coerce.date({
      message: 'Invalid cycle end date',
    }),
  }).refine(
    (data) => data.cycle_end_date > data.cycle_start_date,
    {
      message: 'Cycle end date must be after start date',
      path: ['cycle_end_date'],
    }
  ),

  /**
   * Approve renewal schema (POC)
   */
  approveRenewal: z.object({
    comments: z.string().max(500, 'Comments too long').optional().nullable(),
  }),

  /**
   * Reject renewal schema (POC - reason required)
   */
  rejectRenewal: z.object({
    reason: z.string()
      .min(10, 'Please provide a reason for rejection (min 10 characters)')
      .max(500, 'Reason is too long'),
  }),

  /**
   * Upload invoice schema (POC)
   */
  uploadInvoice: z.object({
    file_id: z.string().uuid('Invalid file ID'),
  }),

  /**
   * Update payment status schema (Finance)
   */
  updatePaymentStatus: z.object({
    payment_status: z.enum(paymentStatusValues, {
      message: 'Invalid payment status',
    }),
    accounting_status: z.enum(accountingStatusValues, {
      message: 'Invalid accounting status',
    }).optional(),
  }),

  /**
   * Payment cycle ID validation
   */
  paymentCycleId: z.string().uuid('Invalid payment cycle ID'),

  /**
   * Filter payment cycles schema
   */
  filter: z.object({
    subscription_id: z.string().uuid().optional(),
    cycle_status: z.enum(paymentCycleStatusValues).optional(),
    payment_status: z.enum(paymentStatusValues).optional(),
    poc_approval_status: z.enum(pocApprovalStatusValues).optional(),
    accounting_status: z.enum(accountingStatusValues).optional(),
    invoice_deadline_before: z.coerce.date().optional(),
    invoice_deadline_after: z.coerce.date().optional(),
  }),
}

/**
 * Helper function to validate data against a schema
 */
export function validate<T>(schema: z.ZodSchema<T>, data: unknown): T {
  return schema.parse(data)
}

/**
 * Helper function to safely validate data (returns result object)
 */
export function safeValidate<T>(
  schema: z.ZodSchema<T>,
  data: unknown
): { success: true; data: T } | { success: false; errors: z.ZodError } {
  const result = schema.safeParse(data)

  if (result.success) {
    return { success: true, data: result.data }
  }

  return { success: false, errors: result.error }
}

/**
 * Helper to format Zod errors for API responses
 */
export function formatValidationErrors(error: z.ZodError): Record<string, string[]> {
  const formatted: Record<string, string[]> = {}

  error.issues.forEach((err) => {
    const path = err.path.join('.')
    if (!formatted[path]) {
      formatted[path] = []
    }
    formatted[path].push(err.message)
  })

  return formatted
}

/**
 * Middleware helper to validate request body
 */
export async function validateRequestBody<T>(
  schema: z.ZodSchema<T>,
  body: unknown
): Promise<{ valid: true; data: T } | { valid: false; errors: Record<string, string[]> }> {
  const result = safeValidate(schema, body)

  if (!result.success) {
    return {
      valid: false,
      errors: formatValidationErrors(result.errors),
    }
  }

  return {
    valid: true,
    data: result.data,
  }
}
