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
  fetchPOCsForDepartment,
  type DepartmentFilters,
  type DepartmentPaginationOptions,
  type DepartmentListResponse,
} from './departments'



export {
  fetchSubscriptions,
  fetchSubscriptionById,
  fetchSubscriptionFiles,
  fetchSubscriptionApprovals,
  fetchPendingSubscriptionsForPOC,
  getSubscriptionCountsByStatus,
  fetchSubscriptionsForExport,
  getSubscriptionStatus,
  type SubscriptionFilters,
  type SubscriptionPaginationOptions,
  type SubscriptionListResponse,
} from './subscriptions'

export {
  fetchSubscriptionPayments,
  fetchPaymentById,
  fetchLatestPaymentCycle,
  fetchPendingApprovalsForPOC,
  fetchPendingInvoiceUploadsForPOC,
  fetchOverdueInvoices,
  createPaymentCycle,
  recordPayment,
  approveRenewal,
  rejectRenewal,
  uploadInvoice,
  cancelPaymentCycle,
  updatePaymentStatus,
  calculateInvoiceDeadline,
  calculateNextCycleDates,
  isInvoiceOverdue,
  type PaymentFilters,
  type PaymentPaginationOptions,
  type PaymentListResponse,
  type PaymentCycleCounts,
  getPaymentCycleCountsByStatus,
  getPaymentsPendingFinanceAction,
  getRecentPaymentCycles,
  fetchPaymentCyclesForDepartments,
  getPaymentCycleCountsForDepartments,
} from './subscription-payments'


