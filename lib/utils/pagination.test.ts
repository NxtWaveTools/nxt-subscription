import { describe, it, expect } from 'vitest'
import {
  normalizePaginationOptions,
  createCursor,
  decodeCursor,
  buildPaginatedResponse,
  getPaginationRange,
  validatePaginationParams,
  PAGINATION_DEFAULTS,
} from './pagination'

describe('Pagination Utilities', () => {
  describe('normalizePaginationOptions', () => {
    it('should return default values when no options provided', () => {
      const result = normalizePaginationOptions()
      expect(result).toEqual({
        limit: PAGINATION_DEFAULTS.LIMIT,
        sortBy: PAGINATION_DEFAULTS.SORT_BY,
        sortOrder: PAGINATION_DEFAULTS.SORT_ORDER,
        cursor: undefined,
      })
    })

    it('should clamp limit to maximum', () => {
      const result = normalizePaginationOptions({ limit: 200 })
      expect(result.limit).toBe(PAGINATION_DEFAULTS.MAX_LIMIT)
    })

    it('should clamp limit to minimum', () => {
      const result = normalizePaginationOptions({ limit: -5 })
      expect(result.limit).toBe(PAGINATION_DEFAULTS.MIN_LIMIT)
    })

    it('should preserve valid custom options', () => {
      const result = normalizePaginationOptions({
        limit: 50,
        sortBy: 'name',
        sortOrder: 'asc',
        cursor: 'test-cursor',
      })
      expect(result).toEqual({
        limit: 50,
        sortBy: 'name',
        sortOrder: 'asc',
        cursor: 'test-cursor',
      })
    })
  })

  describe('createCursor and decodeCursor', () => {
    it('should encode and decode string values', () => {
      const value = 'test-value-123'
      const cursor = createCursor(value)
      const decoded = decodeCursor(cursor)
      expect(decoded).toBe(value)
    })

    it('should encode and decode numeric values', () => {
      const value = 12345
      const cursor = createCursor(value)
      const decoded = decodeCursor(cursor)
      expect(decoded).toBe(String(value))
    })

    it('should encode and decode date values', () => {
      const value = new Date('2024-01-01T00:00:00Z')
      const cursor = createCursor(value)
      const decoded = decodeCursor(cursor)
      expect(decoded).toBe(value.toISOString())
    })
  })

  describe('buildPaginatedResponse', () => {
    it('should build response with hasMore true when data exceeds limit', () => {
      const data = [
        { id: '1', created_at: '2024-01-01' },
        { id: '2', created_at: '2024-01-02' },
        { id: '3', created_at: '2024-01-03' },
      ]
      const options = { limit: 2, sortBy: 'created_at', sortOrder: 'desc' as const }

      const result = buildPaginatedResponse(data, options)

      expect(result.data).toHaveLength(2)
      expect(result.pagination.hasMore).toBe(true)
      expect(result.pagination.cursor).toBeTruthy()
      expect(result.pagination.count).toBe(2)
    })

    it('should build response with hasMore false when data does not exceed limit', () => {
      const data = [
        { id: '1', created_at: '2024-01-01' },
        { id: '2', created_at: '2024-01-02' },
      ]
      const options = { limit: 5, sortBy: 'created_at', sortOrder: 'desc' as const }

      const result = buildPaginatedResponse(data, options)

      expect(result.data).toHaveLength(2)
      expect(result.pagination.hasMore).toBe(false)
      expect(result.pagination.cursor).toBeNull()
      expect(result.pagination.count).toBe(2)
    })

    it('should include total when provided', () => {
      const data = [{ id: '1', created_at: '2024-01-01' }]
      const options = { limit: 10, sortBy: 'created_at', sortOrder: 'desc' as const }

      const result = buildPaginatedResponse(data, options, 'created_at', 100)

      expect(result.pagination.total).toBe(100)
    })

    it('should handle empty data', () => {
      const data: Record<string, unknown>[] = []
      const options = { limit: 10, sortBy: 'created_at', sortOrder: 'desc' as const }

      const result = buildPaginatedResponse(data, options)

      expect(result.data).toHaveLength(0)
      expect(result.pagination.hasMore).toBe(false)
      expect(result.pagination.cursor).toBeNull()
    })
  })

  describe('getPaginationRange', () => {
    it('should calculate correct range for first page', () => {
      const range = getPaginationRange(20, 0)
      expect(range).toEqual({ from: 0, to: 20 })
    })

    it('should calculate correct range for second page', () => {
      const range = getPaginationRange(20, 1)
      expect(range).toEqual({ from: 20, to: 40 })
    })

    it('should default to page 0', () => {
      const range = getPaginationRange(10)
      expect(range).toEqual({ from: 0, to: 10 })
    })
  })

  describe('validatePaginationParams', () => {
    it('should validate and parse valid limit', () => {
      const result = validatePaginationParams({ limit: '50' })
      expect(result.limit).toBe(50)
    })

    it('should accept numeric limit', () => {
      const result = validatePaginationParams({ limit: 30 })
      expect(result.limit).toBe(30)
    })

    it('should throw error for limit below minimum', () => {
      expect(() => validatePaginationParams({ limit: '0' })).toThrow('Invalid limit')
    })

    it('should throw error for limit above maximum', () => {
      expect(() => validatePaginationParams({ limit: '200' })).toThrow('Invalid limit')
    })

    it('should throw error for non-numeric limit', () => {
      expect(() => validatePaginationParams({ limit: 'invalid' })).toThrow('Invalid limit')
    })

    it('should accept valid cursor', () => {
      const result = validatePaginationParams({ cursor: 'abc123' })
      expect(result.cursor).toBe('abc123')
    })

    it('should handle empty params', () => {
      const result = validatePaginationParams({})
      expect(result).toEqual({ limit: undefined, cursor: undefined })
    })
  })
})
