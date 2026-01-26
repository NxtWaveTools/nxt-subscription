// ============================================================================
// Validation Schemas
// ============================================================================

import { z } from 'zod'

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
   * Role name validation
   */
  roleName: z.enum(['ADMIN', 'FINANCE', 'HOD', 'POC'], {
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
