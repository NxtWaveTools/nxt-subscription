// ============================================================================
// POC Subscription Actions Tests
// Comprehensive unit tests for POC subscription approval/rejection
// ============================================================================

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import * as subscriptionActions from './subscriptions'
import * as authModule from '@/lib/auth/user'

// Mock dependencies
vi.mock('@/lib/auth/user')
vi.mock('next/cache', () => ({
  revalidatePath: vi.fn(),
}))

// Test UUIDs
const TEST_SUBSCRIPTION_ID = '00000000-0000-4000-8000-000000000001'
const TEST_DEPARTMENT_ID = '00000000-0000-4000-8000-000000000002'
const POC_USER_ID = '00000000-0000-4000-8000-000000000099'
const FINANCE_USER_ID = '00000000-0000-4000-8000-000000000098'

// Mock Supabase module
vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(),
}))

// Mock audit log
vi.mock('@/lib/utils/audit-log', () => ({
  createAuditLog: vi.fn().mockResolvedValue(undefined),
  AUDIT_ACTIONS: {
    SUBSCRIPTION_APPROVE: 'subscription_approve',
    SUBSCRIPTION_REJECT: 'subscription_reject',
  },
  AUDIT_ENTITY_TYPES: {
    SUBSCRIPTION: 'subscription',
  },
}))

// Create mock Supabase client
const createMockSupabase = () => {
  const mock = {
    from: vi.fn(),
    select: vi.fn(),
    insert: vi.fn(),
    update: vi.fn(),
    eq: vi.fn(),
    single: vi.fn(),
    maybeSingle: vi.fn(),
  }

  // Chain methods
  mock.from.mockReturnValue(mock)
  mock.select.mockReturnValue(mock)
  mock.insert.mockReturnValue(mock)
  mock.update.mockReturnValue(mock)
  mock.eq.mockReturnValue(mock)

  return mock
}

let mockSupabase: ReturnType<typeof createMockSupabase>

describe('POC Subscription Actions', () => {
  beforeEach(async () => {
    mockSupabase = createMockSupabase()

    const supabaseModule = await import('@/lib/supabase/server')
    vi.mocked(supabaseModule.createClient).mockResolvedValue(
      mockSupabase as unknown as Awaited<ReturnType<typeof supabaseModule.createClient>>
    )

    // Mock POC user by default
    vi.mocked(authModule.getCurrentUser).mockResolvedValue({
      id: POC_USER_ID,
      email: 'poc@test.com',
      name: 'POC User',
      roles: ['POC'],
      is_active: true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    } as Awaited<ReturnType<typeof authModule.getCurrentUser>>)

    vi.mocked(authModule.hasRole).mockReturnValue(true)
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  // ============================================================================
  // approveSubscription Tests
  // ============================================================================

  describe('approveSubscription', () => {
    it('should approve pending subscription successfully', async () => {
      const pendingSubscription = {
        id: TEST_SUBSCRIPTION_ID,
        status: 'PENDING',
        department_id: TEST_DEPARTMENT_ID,
        tool_name: 'Test Tool',
        created_by: FINANCE_USER_ID,
        version: 1,
      }

      const approvedSubscription = {
        ...pendingSubscription,
        status: 'ACTIVE',
        version: 2,
      }

      // Mock POC access check
      mockSupabase.maybeSingle.mockResolvedValueOnce({
        data: { department_id: TEST_DEPARTMENT_ID },
        error: null,
      })

      mockSupabase.single
        // Fetch subscription
        .mockResolvedValueOnce({ data: pendingSubscription, error: null })
        // Update subscription
        .mockResolvedValueOnce({ data: approvedSubscription, error: null })

      // Mock approval record insert
      mockSupabase.insert.mockResolvedValueOnce({ error: null })

      const result = await subscriptionActions.approveSubscription(TEST_SUBSCRIPTION_ID)

      expect(result.success).toBe(true)
      expect(result.data?.status).toBe('ACTIVE')
    })

    it('should approve with comments', async () => {
      const pendingSubscription = {
        id: TEST_SUBSCRIPTION_ID,
        status: 'PENDING',
        department_id: TEST_DEPARTMENT_ID,
        tool_name: 'Test Tool',
        created_by: FINANCE_USER_ID,
        version: 1,
      }

      const approvedSubscription = {
        ...pendingSubscription,
        status: 'ACTIVE',
        version: 2,
      }

      mockSupabase.maybeSingle.mockResolvedValueOnce({
        data: { department_id: TEST_DEPARTMENT_ID },
        error: null,
      })

      mockSupabase.single
        .mockResolvedValueOnce({ data: pendingSubscription, error: null })
        .mockResolvedValueOnce({ data: approvedSubscription, error: null })

      mockSupabase.insert.mockResolvedValueOnce({ error: null })

      const result = await subscriptionActions.approveSubscription(
        TEST_SUBSCRIPTION_ID,
        'Approved for budget allocation'
      )

      expect(result.success).toBe(true)
    })

    it('should reject non-POC users', async () => {
      vi.mocked(authModule.getCurrentUser).mockResolvedValue({
        id: FINANCE_USER_ID,
        email: 'finance@test.com',
        name: 'Finance User',
        roles: ['FINANCE'],
        is_active: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      } as Awaited<ReturnType<typeof authModule.getCurrentUser>>)

      vi.mocked(authModule.hasRole).mockReturnValue(false)

      const pendingSubscription = {
        id: TEST_SUBSCRIPTION_ID,
        status: 'PENDING',
        department_id: TEST_DEPARTMENT_ID,
        tool_name: 'Test Tool',
        created_by: FINANCE_USER_ID,
        version: 1,
      }

      mockSupabase.single.mockResolvedValueOnce({ data: pendingSubscription, error: null })

      const result = await subscriptionActions.approveSubscription(TEST_SUBSCRIPTION_ID)

      expect(result.success).toBe(false)
      expect(result.error).toContain('Only POC')
    })

    it('should reject if POC does not have access to department', async () => {
      const pendingSubscription = {
        id: TEST_SUBSCRIPTION_ID,
        status: 'PENDING',
        department_id: TEST_DEPARTMENT_ID,
        tool_name: 'Test Tool',
        created_by: FINANCE_USER_ID,
        version: 1,
      }

      mockSupabase.single.mockResolvedValueOnce({ data: pendingSubscription, error: null })
      
      // POC does not have access to this department
      mockSupabase.maybeSingle.mockResolvedValueOnce({ data: null, error: null })

      const result = await subscriptionActions.approveSubscription(TEST_SUBSCRIPTION_ID)

      expect(result.success).toBe(false)
      expect(result.error).toContain('not the POC')
    })

    it('should not approve non-pending subscriptions', async () => {
      const activeSubscription = {
        id: TEST_SUBSCRIPTION_ID,
        status: 'ACTIVE', // Already active
        department_id: TEST_DEPARTMENT_ID,
        tool_name: 'Test Tool',
        created_by: FINANCE_USER_ID,
        version: 1,
      }

      mockSupabase.maybeSingle.mockResolvedValueOnce({
        data: { department_id: TEST_DEPARTMENT_ID },
        error: null,
      })

      mockSupabase.single.mockResolvedValueOnce({ data: activeSubscription, error: null })

      const result = await subscriptionActions.approveSubscription(TEST_SUBSCRIPTION_ID)

      expect(result.success).toBe(false)
      expect(result.error).toContain('cannot be approved')
      expect(result.error).toContain('ACTIVE')
    })

    it('should handle optimistic locking conflict', async () => {
      const pendingSubscription = {
        id: TEST_SUBSCRIPTION_ID,
        status: 'PENDING',
        department_id: TEST_DEPARTMENT_ID,
        tool_name: 'Test Tool',
        created_by: FINANCE_USER_ID,
        version: 1,
      }

      mockSupabase.maybeSingle.mockResolvedValueOnce({
        data: { department_id: TEST_DEPARTMENT_ID },
        error: null,
      })

      mockSupabase.single
        .mockResolvedValueOnce({ data: pendingSubscription, error: null })
        // Version mismatch
        .mockResolvedValueOnce({ data: null, error: { code: 'PGRST116' } })

      const result = await subscriptionActions.approveSubscription(TEST_SUBSCRIPTION_ID)

      expect(result.success).toBe(false)
      expect(result.error).toContain('modified by another user')
    })

    it('should return not found for non-existent subscription', async () => {
      mockSupabase.single.mockResolvedValueOnce({ data: null, error: { code: 'PGRST116' } })

      const result = await subscriptionActions.approveSubscription(TEST_SUBSCRIPTION_ID)

      expect(result.success).toBe(false)
      expect(result.error).toBe('Subscription not found')
    })
  })

  // ============================================================================
  // rejectSubscription Tests
  // ============================================================================

  describe('rejectSubscription', () => {
    it('should reject pending subscription with comments', async () => {
      const pendingSubscription = {
        id: TEST_SUBSCRIPTION_ID,
        status: 'PENDING',
        department_id: TEST_DEPARTMENT_ID,
        tool_name: 'Test Tool',
        created_by: FINANCE_USER_ID,
        version: 1,
      }

      const rejectedSubscription = {
        ...pendingSubscription,
        status: 'REJECTED',
        version: 2,
      }

      mockSupabase.maybeSingle.mockResolvedValueOnce({
        data: { department_id: TEST_DEPARTMENT_ID },
        error: null,
      })

      mockSupabase.single
        .mockResolvedValueOnce({ data: pendingSubscription, error: null })
        .mockResolvedValueOnce({ data: rejectedSubscription, error: null })

      mockSupabase.insert.mockResolvedValueOnce({ error: null })

      const result = await subscriptionActions.rejectSubscription(
        TEST_SUBSCRIPTION_ID,
        'Budget not available for this tool'
      )

      expect(result.success).toBe(true)
      expect(result.data?.status).toBe('REJECTED')
    })

    it('should require comments for rejection', async () => {
      const result = await subscriptionActions.rejectSubscription(
        TEST_SUBSCRIPTION_ID,
        '' // Empty comments
      )

      expect(result.success).toBe(false)
    })

    it('should not reject non-pending subscriptions', async () => {
      const activeSubscription = {
        id: TEST_SUBSCRIPTION_ID,
        status: 'ACTIVE',
        department_id: TEST_DEPARTMENT_ID,
        tool_name: 'Test Tool',
        created_by: FINANCE_USER_ID,
        version: 1,
      }

      mockSupabase.maybeSingle.mockResolvedValueOnce({
        data: { department_id: TEST_DEPARTMENT_ID },
        error: null,
      })

      mockSupabase.single.mockResolvedValueOnce({ data: activeSubscription, error: null })

      const result = await subscriptionActions.rejectSubscription(
        TEST_SUBSCRIPTION_ID,
        'Some reason'
      )

      expect(result.success).toBe(false)
      expect(result.error).toContain('cannot be rejected')
    })

    it('should handle optimistic locking conflict on reject', async () => {
      const pendingSubscription = {
        id: TEST_SUBSCRIPTION_ID,
        status: 'PENDING',
        department_id: TEST_DEPARTMENT_ID,
        tool_name: 'Test Tool',
        created_by: FINANCE_USER_ID,
        version: 1,
      }

      mockSupabase.maybeSingle.mockResolvedValueOnce({
        data: { department_id: TEST_DEPARTMENT_ID },
        error: null,
      })

      mockSupabase.single
        .mockResolvedValueOnce({ data: pendingSubscription, error: null })
        .mockResolvedValueOnce({ data: null, error: { code: 'PGRST116' } })

      const result = await subscriptionActions.rejectSubscription(
        TEST_SUBSCRIPTION_ID,
        'This is a valid reason for rejection with enough characters'
      )

      expect(result.success).toBe(false)
      expect(result.error).toContain('modified by another user')
    })

    it('should reject if POC does not have department access', async () => {
      const pendingSubscription = {
        id: TEST_SUBSCRIPTION_ID,
        status: 'PENDING',
        department_id: TEST_DEPARTMENT_ID,
        tool_name: 'Test Tool',
        created_by: FINANCE_USER_ID,
        version: 1,
      }

      mockSupabase.single.mockResolvedValueOnce({ data: pendingSubscription, error: null })
      mockSupabase.maybeSingle.mockResolvedValueOnce({ data: null, error: null })

      const result = await subscriptionActions.rejectSubscription(
        TEST_SUBSCRIPTION_ID,
        'This is a valid reason for rejection with enough characters'
      )

      expect(result.success).toBe(false)
      expect(result.error).toContain('not the POC')
    })
  })

  // ============================================================================
  // Input Validation Tests
  // ============================================================================

  describe('Input validation', () => {
    it('should validate subscription ID format for approve', async () => {
      const result = await subscriptionActions.approveSubscription('invalid-uuid')

      expect(result.success).toBe(false)
    })

    it('should validate subscription ID format for reject', async () => {
      const result = await subscriptionActions.rejectSubscription('invalid-uuid', 'Reason')

      expect(result.success).toBe(false)
    })
  })

  // ============================================================================
  // Edge Cases
  // ============================================================================

  describe('Edge cases', () => {
    it('should handle already rejected subscription', async () => {
      const rejectedSubscription = {
        id: TEST_SUBSCRIPTION_ID,
        status: 'REJECTED',
        department_id: TEST_DEPARTMENT_ID,
        tool_name: 'Test Tool',
        created_by: FINANCE_USER_ID,
        version: 1,
      }

      mockSupabase.maybeSingle.mockResolvedValueOnce({
        data: { department_id: TEST_DEPARTMENT_ID },
        error: null,
      })

      mockSupabase.single.mockResolvedValueOnce({ data: rejectedSubscription, error: null })

      const result = await subscriptionActions.approveSubscription(TEST_SUBSCRIPTION_ID)

      expect(result.success).toBe(false)
      expect(result.error).toContain('REJECTED')
    })

    it('should handle cancelled subscription', async () => {
      const cancelledSubscription = {
        id: TEST_SUBSCRIPTION_ID,
        status: 'CANCELLED',
        department_id: TEST_DEPARTMENT_ID,
        tool_name: 'Test Tool',
        created_by: FINANCE_USER_ID,
        version: 1,
      }

      mockSupabase.maybeSingle.mockResolvedValueOnce({
        data: { department_id: TEST_DEPARTMENT_ID },
        error: null,
      })

      mockSupabase.single.mockResolvedValueOnce({ data: cancelledSubscription, error: null })

      const result = await subscriptionActions.rejectSubscription(
        TEST_SUBSCRIPTION_ID,
        'This is a valid reason for rejection with enough characters'
      )

      expect(result.success).toBe(false)
      expect(result.error).toContain('CANCELLED')
    })

    it('should handle database error during approval', async () => {
      const pendingSubscription = {
        id: TEST_SUBSCRIPTION_ID,
        status: 'PENDING',
        department_id: TEST_DEPARTMENT_ID,
        tool_name: 'Test Tool',
        created_by: FINANCE_USER_ID,
        version: 1,
      }

      mockSupabase.maybeSingle.mockResolvedValueOnce({
        data: { department_id: TEST_DEPARTMENT_ID },
        error: null,
      })

      mockSupabase.single
        .mockResolvedValueOnce({ data: pendingSubscription, error: null })
        .mockResolvedValueOnce({ data: null, error: { code: '500', message: 'Database error' } })

      const result = await subscriptionActions.approveSubscription(TEST_SUBSCRIPTION_ID)

      expect(result.success).toBe(false)
      expect(result.error).toBe('Failed to approve subscription')
    })
  })
})
