// ============================================================================
// Pagination Utilities
// ============================================================================

/**
 * Pagination configuration for cursor-based pagination
 */
export interface PaginationOptions {
  /** Number of items per page (default: 20, max: 100) */
  limit?: number
  /** Cursor for next page (from previous response) */
  cursor?: string
  /** Sort column (default: 'created_at') */
  sortBy?: string
  /** Sort direction (default: 'desc') */
  sortOrder?: 'asc' | 'desc'
}

/**
 * Paginated response structure
 */
export interface PaginatedResponse<T> {
  /** Array of items for current page */
  data: T[]
  /** Pagination metadata */
  pagination: {
    /** Current cursor (for next page) */
    cursor: string | null
    /** Number of items in current page */
    count: number
    /** Items per page limit */
    limit: number
    /** Whether more pages exist */
    hasMore: boolean
    /** Total count (optional, expensive for large datasets) */
    total?: number
  }
}

/**
 * Default pagination settings
 */
export const PAGINATION_DEFAULTS = {
  LIMIT: 20,
  MAX_LIMIT: 100,
  MIN_LIMIT: 1,
  SORT_BY: 'created_at',
  SORT_ORDER: 'desc' as const,
} as const

/**
 * Validates and normalizes pagination options
 */
export function normalizePaginationOptions(
  options?: PaginationOptions
): Required<Omit<PaginationOptions, 'cursor'>> & { cursor?: string } {
  const limit = Math.min(
    Math.max(options?.limit ?? PAGINATION_DEFAULTS.LIMIT, PAGINATION_DEFAULTS.MIN_LIMIT),
    PAGINATION_DEFAULTS.MAX_LIMIT
  )

  return {
    limit,
    cursor: options?.cursor,
    sortBy: options?.sortBy ?? PAGINATION_DEFAULTS.SORT_BY,
    sortOrder: options?.sortOrder ?? PAGINATION_DEFAULTS.SORT_ORDER,
  }
}

/**
 * Creates a cursor from a record's sort field value
 */
export function createCursor(value: string | number | Date): string {
  const cursorValue = value instanceof Date ? value.toISOString() : String(value)
  return Buffer.from(cursorValue).toString('base64')
}

/**
 * Decodes a cursor to get the sort field value
 */
export function decodeCursor(cursor: string): string {
  try {
    return Buffer.from(cursor, 'base64').toString('utf-8')
  } catch {
    throw new Error('Invalid cursor format')
  }
}

/**
 * Builds a paginated response from query results
 */
export function buildPaginatedResponse<T extends Record<string, unknown>>(
  data: T[],
  options: Required<Omit<PaginationOptions, 'cursor'>>,
  sortField: keyof T = 'created_at' as keyof T,
  total?: number
): PaginatedResponse<T> {
  const hasMore = data.length > options.limit
  const items = hasMore ? data.slice(0, options.limit) : data
  
  const lastItem = items[items.length - 1]
  const sortValue = lastItem?.[sortField]
  // Create cursor only if the value is a valid cursor type
  const cursor = lastItem && hasMore && (typeof sortValue === 'string' || typeof sortValue === 'number' || sortValue instanceof Date)
    ? createCursor(sortValue)
    : null

  return {
    data: items,
    pagination: {
      cursor,
      count: items.length,
      limit: options.limit,
      hasMore,
      ...(total !== undefined && { total }),
    },
  }
}

/**
 * Helper to get range for Supabase queries
 * Note: Fetch limit + 1 to determine if more pages exist
 */
export function getPaginationRange(limit: number, page: number = 0): { from: number; to: number } {
  return {
    from: page * limit,
    to: (page + 1) * limit, // Fetch one extra to check hasMore
  }
}

/**
 * Validates pagination parameters from API requests
 */
export function validatePaginationParams(params: {
  limit?: string | number
  cursor?: string
}): PaginationOptions {
  const limit = params.limit ? parseInt(String(params.limit), 10) : undefined

  if (limit !== undefined && (isNaN(limit) || limit < PAGINATION_DEFAULTS.MIN_LIMIT)) {
    throw new Error(
      `Invalid limit: must be a number >= ${PAGINATION_DEFAULTS.MIN_LIMIT} and <= ${PAGINATION_DEFAULTS.MAX_LIMIT}`
    )
  }

  if (limit !== undefined && limit > PAGINATION_DEFAULTS.MAX_LIMIT) {
    throw new Error(`Invalid limit: maximum is ${PAGINATION_DEFAULTS.MAX_LIMIT}`)
  }

  return {
    limit,
    cursor: params.cursor,
  }
}
