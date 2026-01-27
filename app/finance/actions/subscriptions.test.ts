// ============================================================================
// Finance Subscription Actions Tests
// Comprehensive unit tests for finance subscription management
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
const TEST_LOCATION_ID = '00000000-0000-4000-8000-000000000003'
const FINANCE_USER_ID = '00000000-0000-4000-8000-000000000099'
const OTHER_USER_ID = '00000000-0000-4000-8000-000000000098'

// Mock Supabase module
vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(),
}))

// Mock audit log
vi.mock('@/lib/utils/audit-log', () => ({
  createAuditLog: vi.fn().mockResolvedValue(undefined),
  AUDIT_ACTIONS: {
    SUBSCRIPTION_CREATE: 'subscription_create',
    SUBSCRIPTION_UPDATE: 'subscription_update',
    SUBSCRIPTION_CANCEL: 'subscription_cancel',
    SUBSCRIPTION_DELETE: 'subscription_delete',
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
    delete: vi.fn(),
    eq: vi.fn(),
    single: vi.fn(),
    maybeSingle: vi.fn(),
    // Track delete operation for proper mock handling
    _isDeleteOp: false,
  }

  // Chain methods - eq returns mock for continued chaining, but for delete it returns a Promise
  mock.from.mockImplementation(() => {
    mock._isDeleteOp = false
    return mock
  })
  mock.select.mockReturnValue(mock)
  mock.insert.mockReturnValue(mock)
  mock.update.mockReturnValue(mock)
  mock.delete.mockImplementation(() => {
    mock._isDeleteOp = true
    return mock
  })
  mock.eq.mockReturnValue(mock)

  return mock
}

let mockSupabase: ReturnType<typeof createMockSupabase>

describe('Finance Subscription Actions', () => {
  beforeEach(async () => {
    mockSupabase = createMockSupabase()

    const supabaseModule = await import('@/lib/supabase/server')
    vi.mocked(supabaseModule.createClient).mockResolvedValue(
      mockSupabase as unknown as Awaited<ReturnType<typeof supabaseModule.createClient>>
    )

    // Mock finance user by default
    vi.mocked(authModule.getCurrentUser).mockResolvedValue({
      id: FINANCE_USER_ID,
      email: 'finance@test.com',
      name: 'Finance User',
      roles: ['FINANCE'],
      is_active: true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    } as Awaited<ReturnType<typeof authModule.getCurrentUser>>)

    vi.mocked(authModule.hasAnyRole).mockReturnValue(true)
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  // ============================================================================
  // createSubscription Tests
  // ============================================================================

  describe('createSubscription', () => {
    const validSubscriptionData = {
      request_type: 'INVOICE' as const,
      tool_name: 'Test Tool',
      vendor_name: 'Test Vendor',
      department_id: TEST_DEPARTMENT_ID,
      location_id: null, // Explicitly null
      amount: 1000,
      currency: 'INR' as const,
      billing_frequency: 'MONTHLY' as const,
      start_date: '2026-01-01',
    }

    it('should create subscription successfully', async () => {
      const createdSubscription = {
        id: TEST_SUBSCRIPTION_ID,
        ...validSubscriptionData,
        status: 'PENDING',
        payment_status: 'IN_PROGRESS',
        created_by: FINANCE_USER_ID,
      }

      mockSupabase.single.mockResolvedValueOnce({ data: createdSubscription, error: null })

      const result = await subscriptionActions.createSubscription(validSubscriptionData)

      expect(result.success).toBe(true)
      expect(result.data).toBeDefined()
      expect(mockSupabase.from).toHaveBeenCalledWith('subscriptions')
      expect(mockSupabase.insert).toHaveBeenCalled()
    })

    it('should require finance permission', async () => {
      vi.mocked(authModule.getCurrentUser).mockResolvedValue(null)

      const result = await subscriptionActions.createSubscription(validSubscriptionData)

      expect(result.success).toBe(false)
      expect(result.error).toContain('Authentication required')
    })

    it('should reject non-finance users', async () => {
      vi.mocked(authModule.hasAnyRole).mockReturnValue(false)

      const result = await subscriptionActions.createSubscription(validSubscriptionData)

      expect(result.success).toBe(false)
      expect(result.error).toContain('Only FINANCE')
    })

    it('should validate location if provided', async () => {
      const dataWithLocation = {
        ...validSubscriptionData,
        location_id: TEST_LOCATION_ID,
      }

      // Location not found
      mockSupabase.single.mockResolvedValueOnce({ data: null, error: null })

      const result = await subscriptionActions.createSubscription(dataWithLocation)

      expect(result.success).toBe(false)
      expect(result.error).toBe('Invalid location')
    })

    it('should handle database errors', async () => {
      const dataWithLocation = {
        ...validSubscriptionData,
        location_id: TEST_LOCATION_ID,
      }

      // Location exists
      mockSupabase.single
        .mockResolvedValueOnce({ data: { id: TEST_LOCATION_ID }, error: null })
        // DB error on insert
        .mockResolvedValueOnce({
          data: null,
          error: { message: 'Database error', code: '500' },
        })

      const result = await subscriptionActions.createSubscription(dataWithLocation)

      expect(result.success).toBe(false)
      expect(result.error).toBe('Failed to create subscription')
    })
  })

  // ============================================================================
  // updateSubscription Tests
  // ============================================================================

  describe('updateSubscription', () => {
    it('should update subscription successfully', async () => {
      const existingSubscription = {
        id: TEST_SUBSCRIPTION_ID,
        status: 'PENDING',
        created_by: FINANCE_USER_ID,
        version: 1,
      }

      const updatedSubscription = {
        ...existingSubscription,
        tool_name: 'Updated Tool',
        version: 2,
      }

      // Mock fetch existing
      mockSupabase.single
        .mockResolvedValueOnce({ data: existingSubscription, error: null })
        // Mock update result
        .mockResolvedValueOnce({ data: updatedSubscription, error: null })

      const result = await subscriptionActions.updateSubscription(TEST_SUBSCRIPTION_ID, {
        tool_name: 'Updated Tool',
      })

      expect(result.success).toBe(true)
      expect(result.data).toBeDefined()
    })

    it('should not allow editing non-owned active subscriptions', async () => {
      const existingSubscription = {
        id: TEST_SUBSCRIPTION_ID,
        status: 'ACTIVE',
        created_by: OTHER_USER_ID, // Different user
        version: 1,
      }

      mockSupabase.single.mockResolvedValueOnce({ data: existingSubscription, error: null })

      const result = await subscriptionActions.updateSubscription(TEST_SUBSCRIPTION_ID, {
        tool_name: 'Updated Tool',
      })

      expect(result.success).toBe(false)
      expect(result.error).toBe('Cannot edit this subscription')
    })

    it('should allow editing own subscriptions', async () => {
      const existingSubscription = {
        id: TEST_SUBSCRIPTION_ID,
        status: 'ACTIVE',
        created_by: FINANCE_USER_ID, // Same user
        version: 1,
      }

      const updatedSubscription = {
        ...existingSubscription,
        tool_name: 'Updated Tool',
        version: 2,
      }

      mockSupabase.single
        .mockResolvedValueOnce({ data: existingSubscription, error: null })
        .mockResolvedValueOnce({ data: updatedSubscription, error: null })

      const result = await subscriptionActions.updateSubscription(TEST_SUBSCRIPTION_ID, {
        tool_name: 'Updated Tool',
      })

      expect(result.success).toBe(true)
    })

    it('should handle optimistic locking conflict', async () => {
      const existingSubscription = {
        id: TEST_SUBSCRIPTION_ID,
        status: 'PENDING',
        created_by: FINANCE_USER_ID,
        version: 1,
      }

      mockSupabase.single
        .mockResolvedValueOnce({ data: existingSubscription, error: null })
        // Version mismatch - returns PGRST116
        .mockResolvedValueOnce({ data: null, error: { code: 'PGRST116', message: 'No rows returned' } })

      const result = await subscriptionActions.updateSubscription(TEST_SUBSCRIPTION_ID, {
        tool_name: 'Updated Tool',
      })

      expect(result.success).toBe(false)
      expect(result.error).toContain('modified by another user')
    })

    it('should return not found for non-existent subscription', async () => {
      mockSupabase.single.mockResolvedValueOnce({ data: null, error: { code: 'PGRST116' } })

      const result = await subscriptionActions.updateSubscription(TEST_SUBSCRIPTION_ID, {
        tool_name: 'Updated Tool',
      })

      expect(result.success).toBe(false)
      expect(result.error).toBe('Subscription not found')
    })
  })

  // ============================================================================
  // cancelSubscription Tests
  // ============================================================================

  describe('cancelSubscription', () => {
    it('should cancel active subscription successfully', async () => {
      const existingSubscription = {
        id: TEST_SUBSCRIPTION_ID,
        status: 'ACTIVE',
        version: 1,
      }

      const cancelledSubscription = {
        ...existingSubscription,
        status: 'CANCELLED',
        version: 2,
      }

      mockSupabase.single
        .mockResolvedValueOnce({ data: existingSubscription, error: null })
        .mockResolvedValueOnce({ data: cancelledSubscription, error: null })

      const result = await subscriptionActions.cancelSubscription(TEST_SUBSCRIPTION_ID)

      expect(result.success).toBe(true)
      expect(result.data?.status).toBe('CANCELLED')
    })

    it('should not allow cancelling non-active subscriptions', async () => {
      const existingSubscription = {
        id: TEST_SUBSCRIPTION_ID,
        status: 'PENDING', // Not active
        version: 1,
      }

      mockSupabase.single.mockResolvedValueOnce({ data: existingSubscription, error: null })

      const result = await subscriptionActions.cancelSubscription(TEST_SUBSCRIPTION_ID)

      expect(result.success).toBe(false)
      expect(result.error).toBe('Only active subscriptions can be cancelled')
    })

    it('should handle optimistic locking conflict on cancel', async () => {
      const existingSubscription = {
        id: TEST_SUBSCRIPTION_ID,
        status: 'ACTIVE',
        version: 1,
      }

      mockSupabase.single
        .mockResolvedValueOnce({ data: existingSubscription, error: null })
        .mockResolvedValueOnce({ data: null, error: { code: 'PGRST116' } })

      const result = await subscriptionActions.cancelSubscription(TEST_SUBSCRIPTION_ID)

      expect(result.success).toBe(false)
      expect(result.error).toContain('modified by another user')
    })
  })

  // ============================================================================
  // deleteSubscription Tests
  // ============================================================================

  describe('deleteSubscription', () => {
    it('should delete pending subscription successfully', async () => {
      const existingSubscription = {
        id: TEST_SUBSCRIPTION_ID,
        status: 'PENDING',
        tool_name: 'Test Tool',
      }

      // First call: select().eq().single() returns subscription
      mockSupabase.single.mockResolvedValueOnce({ data: existingSubscription, error: null })
      // Second call: delete().eq() is awaited directly - need to mock the final eq() result
      // The delete chain ends with eq(), which is awaited as a promise
      let eqCallCount = 0
      const originalEq = mockSupabase.eq
      mockSupabase.eq = vi.fn().mockImplementation(() => {
        eqCallCount++
        // First eq is for select chain (returns mock for .single())
        // Second eq is for delete chain (returns promise with { error: null })
        if (eqCallCount >= 2) {
          return Promise.resolve({ error: null })
        }
        return mockSupabase
      })

      const result = await subscriptionActions.deleteSubscription(TEST_SUBSCRIPTION_ID)

      expect(result.success).toBe(true)
      expect(mockSupabase.delete).toHaveBeenCalled()
      
      // Restore
      mockSupabase.eq = originalEq
    })

    it('should delete rejected subscription successfully', async () => {
      const existingSubscription = {
        id: TEST_SUBSCRIPTION_ID,
        status: 'REJECTED',
        tool_name: 'Test Tool',
      }

      mockSupabase.single.mockResolvedValueOnce({ data: existingSubscription, error: null })
      let eqCallCount = 0
      mockSupabase.eq = vi.fn().mockImplementation(() => {
        eqCallCount++
        if (eqCallCount >= 2) {
          return Promise.resolve({ error: null })
        }
        return mockSupabase
      })

      const result = await subscriptionActions.deleteSubscription(TEST_SUBSCRIPTION_ID)

      expect(result.success).toBe(true)
    })

    it('should not allow deleting active subscriptions', async () => {
      const existingSubscription = {
        id: TEST_SUBSCRIPTION_ID,
        status: 'ACTIVE',
        tool_name: 'Test Tool',
      }

      mockSupabase.single.mockResolvedValueOnce({ data: existingSubscription, error: null })

      const result = await subscriptionActions.deleteSubscription(TEST_SUBSCRIPTION_ID)

      expect(result.success).toBe(false)
      expect(result.error).toBe('Only pending or rejected subscriptions can be deleted')
    })

    it('should not allow deleting cancelled subscriptions', async () => {
      const existingSubscription = {
        id: TEST_SUBSCRIPTION_ID,
        status: 'CANCELLED',
        tool_name: 'Test Tool',
      }

      mockSupabase.single.mockResolvedValueOnce({ data: existingSubscription, error: null })

      const result = await subscriptionActions.deleteSubscription(TEST_SUBSCRIPTION_ID)

      expect(result.success).toBe(false)
      expect(result.error).toBe('Only pending or rejected subscriptions can be deleted')
    })

    it('should handle database errors on delete', async () => {
      const existingSubscription = {
        id: TEST_SUBSCRIPTION_ID,
        status: 'PENDING',
        tool_name: 'Test Tool',
      }

      mockSupabase.single.mockResolvedValueOnce({ data: existingSubscription, error: null })
      let eqCallCount = 0
      mockSupabase.eq = vi.fn().mockImplementation(() => {
        eqCallCount++
        if (eqCallCount >= 2) {
          return Promise.resolve({ error: { message: 'Delete failed' } })
        }
        return mockSupabase
      })

      const result = await subscriptionActions.deleteSubscription(TEST_SUBSCRIPTION_ID)

      expect(result.success).toBe(false)
      expect(result.error).toBe('Failed to delete subscription')
    })
  })

  // ============================================================================
  // Permission Tests
  // ============================================================================

  describe('Permission checks', () => {
    it('should reject unauthenticated users for all operations', async () => {
      vi.mocked(authModule.getCurrentUser).mockResolvedValue(null)

      const createResult = await subscriptionActions.createSubscription({
        request_type: 'INVOICE',
        tool_name: 'Test',
        vendor_name: 'Test',
        department_id: TEST_DEPARTMENT_ID,
        amount: 100,
        billing_frequency: 'MONTHLY',
        start_date: '2026-01-01',
      })
      expect(createResult.success).toBe(false)
      expect(createResult.error).toContain('Authentication required')

      const updateResult = await subscriptionActions.updateSubscription(TEST_SUBSCRIPTION_ID, {})
      expect(updateResult.success).toBe(false)

      const cancelResult = await subscriptionActions.cancelSubscription(TEST_SUBSCRIPTION_ID)
      expect(cancelResult.success).toBe(false)

      const deleteResult = await subscriptionActions.deleteSubscription(TEST_SUBSCRIPTION_ID)
      expect(deleteResult.success).toBe(false)
    })
  })

  // ============================================================================
  // Validation Tests
  // ============================================================================

  describe('Input validation', () => {
    it('should validate subscription ID format', async () => {
      const result = await subscriptionActions.updateSubscription('invalid-id', {
        tool_name: 'Test',
      })

      expect(result.success).toBe(false)
      expect(result.error).toBeDefined()
    })

    it('should validate required fields on create', async () => {
      const result = await subscriptionActions.createSubscription({
        request_type: 'INVOICE',
        tool_name: '', // Empty
        vendor_name: 'Test',
        department_id: TEST_DEPARTMENT_ID,
        amount: 100,
        billing_frequency: 'MONTHLY',
        start_date: '2026-01-01',
      })

      expect(result.success).toBe(false)
    })
  })
})
