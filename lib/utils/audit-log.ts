// ============================================================================
// Audit Logging Utility
// ============================================================================
// Centralizes audit log creation for all admin operations

import { createAdminClient } from '@/lib/supabase/server'
import type { Json } from '@/lib/supabase/database.types'

/**
 * Audit log action types
 */
export const AUDIT_ACTIONS = {
  // User actions
  USER_CREATE: 'user.create',
  USER_UPDATE: 'user.update',
  USER_DELETE: 'user.delete',
  USER_ACTIVATE: 'user.activate',
  USER_DEACTIVATE: 'user.deactivate',
  USER_ROLE_ASSIGN: 'user.role.assign',
  USER_ROLE_REMOVE: 'user.role.remove',
  
  // Department actions
  DEPARTMENT_CREATE: 'department.create',
  DEPARTMENT_UPDATE: 'department.update',
  DEPARTMENT_DELETE: 'department.delete',
  DEPARTMENT_ACTIVATE: 'department.activate',
  DEPARTMENT_DEACTIVATE: 'department.deactivate',
  
  // HOD/POC actions
  HOD_ASSIGN: 'hod.assign',
  HOD_REMOVE: 'hod.remove',
  POC_ASSIGN: 'poc.assign',
  POC_REMOVE: 'poc.remove',
  
  // Bulk actions
  BULK_USER_ACTIVATE: 'bulk.user.activate',
  BULK_USER_DEACTIVATE: 'bulk.user.deactivate',
  BULK_DEPARTMENT_ACTIVATE: 'bulk.department.activate',
  BULK_DEPARTMENT_DEACTIVATE: 'bulk.department.deactivate',
  
  // Export actions
  EXPORT_USERS: 'export.users',
  EXPORT_DEPARTMENTS: 'export.departments',
  
  // Subscription actions
  SUBSCRIPTION_CREATE: 'subscription.create',
  SUBSCRIPTION_UPDATE: 'subscription.update',
  SUBSCRIPTION_DELETE: 'subscription.delete',
  SUBSCRIPTION_APPROVE: 'subscription.approve',
  SUBSCRIPTION_REJECT: 'subscription.reject',
  SUBSCRIPTION_CANCEL: 'subscription.cancel',
  SUBSCRIPTION_PAYMENT_UPDATE: 'subscription.payment.update',
  SUBSCRIPTION_ACCOUNTING_UPDATE: 'subscription.accounting.update',
  BULK_SUBSCRIPTION_APPROVE: 'bulk.subscription.approve',
  EXPORT_SUBSCRIPTIONS: 'export.subscriptions',
  
  // File actions
  FILE_UPLOAD: 'file.upload',
  FILE_DELETE: 'file.delete',
  
  // Payment cycle actions
  PAYMENT_CYCLE_CREATE: 'payment_cycle.create',
  PAYMENT_RECORD: 'payment_cycle.payment.record',
  PAYMENT_UPDATE: 'payment_cycle.payment.update',
  PAYMENT_CYCLE_CANCEL: 'payment_cycle.cancel',
  RENEWAL_APPROVE: 'payment_cycle.renewal.approve',
  RENEWAL_REJECT: 'payment_cycle.renewal.reject',
  INVOICE_UPLOAD: 'payment_cycle.invoice.upload',
  PAYMENT_CYCLE_AUTO_CANCEL: 'payment_cycle.auto_cancel',
  
  // System actions
  SYSTEM_AUTO_CANCEL_TRIGGER: 'system.auto_cancel.trigger',
} as const

export type AuditAction = typeof AUDIT_ACTIONS[keyof typeof AUDIT_ACTIONS]

/**
 * Entity types for audit logs
 */
export const AUDIT_ENTITY_TYPES = {
  USER: 'user',
  DEPARTMENT: 'department',
  ROLE: 'role',
  HOD_DEPARTMENT: 'hod_department',
  POC_DEPARTMENT: 'poc_department',
  EXPORT: 'export',
  SUBSCRIPTION: 'subscription',
  SUBSCRIPTION_FILE: 'subscription_file',
  SUBSCRIPTION_APPROVAL: 'subscription_approval',
  PAYMENT_CYCLE: 'payment_cycle',
  SYSTEM: 'system',
} as const

export type AuditEntityType = typeof AUDIT_ENTITY_TYPES[keyof typeof AUDIT_ENTITY_TYPES]

/**
 * Audit log entry input
 */
export interface AuditLogInput {
  userId: string
  action: AuditAction
  entityType: AuditEntityType
  entityId?: string
  changes?: Record<string, unknown>
  ipAddress?: string
  userAgent?: string
}

/**
 * Create an audit log entry
 * Uses admin client to bypass RLS (audit logs are system-generated)
 */
export async function createAuditLog(input: AuditLogInput): Promise<string | null> {
  try {
    const adminClient = createAdminClient()

    const { data, error } = await adminClient
      .from('audit_log')
      .insert({
        user_id: input.userId,
        action: input.action,
        entity_type: input.entityType,
        entity_id: input.entityId,
        changes: input.changes as Json | undefined,
        ip_address: input.ipAddress,
        user_agent: input.userAgent,
      })
      .select('id')
      .single()

    if (error) {
      console.error('Failed to create audit log:', error)
      return null
    }

    return data?.id || null
  } catch (error) {
    console.error('Audit log error:', error)
    return null
  }
}

/**
 * Create audit log for user action
 */
export async function auditUserAction(
  performedByUserId: string,
  action: AuditAction,
  targetUserId: string,
  changes?: Record<string, unknown>
): Promise<void> {
  await createAuditLog({
    userId: performedByUserId,
    action,
    entityType: AUDIT_ENTITY_TYPES.USER,
    entityId: targetUserId,
    changes,
  })
}

/**
 * Create audit log for department action
 */
export async function auditDepartmentAction(
  performedByUserId: string,
  action: AuditAction,
  departmentId: string,
  changes?: Record<string, unknown>
): Promise<void> {
  await createAuditLog({
    userId: performedByUserId,
    action,
    entityType: AUDIT_ENTITY_TYPES.DEPARTMENT,
    entityId: departmentId,
    changes,
  })
}

/**
 * Create audit log for bulk action
 */
export async function auditBulkAction(
  performedByUserId: string,
  action: AuditAction,
  entityType: AuditEntityType,
  entityIds: string[],
  changes?: Record<string, unknown>
): Promise<void> {
  await createAuditLog({
    userId: performedByUserId,
    action,
    entityType,
    changes: {
      ...changes,
      affected_ids: entityIds,
      count: entityIds.length,
    },
  })
}
