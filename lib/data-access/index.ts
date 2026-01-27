// ============================================================================
// Data Access Layer - Public API
// ============================================================================
// This module exposes the public API for data access
// Import from '@/lib/data-access' for all data fetching needs

export {
  fetchUsers,
  fetchUserById,
  fetchRoles,
  fetchActiveDepartments,
  fetchUsersForExport,
  type UserFilters,
  type UserPaginationOptions,
  type UserListResponse,
} from './users'

export {
  fetchDepartments,
  fetchDepartmentById,
  fetchDepartmentsForExport,
  fetchDepartmentAnalytics,
  type DepartmentFilters,
  type DepartmentPaginationOptions,
  type DepartmentListResponse,
} from './departments'

export {
  fetchRoleDistribution,
  fetchUserActivityStats,
  fetchActiveDepartmentCount,
  type UserActivityStats,
} from './analytics'
