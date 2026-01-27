// ============================================================================
// Users Management Page
// ============================================================================

import { Suspense } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { UsersTable } from './components/users-table'
import { UsersFilters } from './components/users-filters'
import { CreateUserButton } from './components/create-user-button'
import { fetchUsers, fetchRoles, fetchActiveDepartments } from '@/lib/data-access'
import { validatePageParams, calculateTotalPages, clampPage } from '@/lib/utils/pagination'

interface UsersPageProps {
  searchParams: Promise<{
    search?: string
    role_id?: string
    department_id?: string
    is_active?: string
    page?: string
    limit?: string
  }>
}

export default async function UsersPage({ searchParams }: UsersPageProps) {
  const params = await searchParams

  // Validate and normalize pagination params (handles negative/invalid values)
  const { page, limit, offset } = validatePageParams({
    page: params.page,
    limit: params.limit,
  })

  // Parse filter params
  const search = params.search?.trim().slice(0, 100) || '' // Max 100 chars for search
  const roleId = params.role_id
  const departmentId = params.department_id
  const isActiveFilter = params.is_active === 'true' ? true : params.is_active === 'false' ? false : undefined

  // Fetch data using centralized data access layer
  const [usersResult, roles, departments] = await Promise.all([
    fetchUsers(
      { search, roleId, isActive: isActiveFilter },
      { page, limit, offset }
    ),
    fetchRoles(),
    fetchActiveDepartments(),
  ])

  const { users, totalCount } = usersResult
  const totalPages = calculateTotalPages(totalCount, limit)
  
  // Clamp page to valid range (in case user manually entered invalid page number)
  const currentPage = clampPage(page, totalPages)

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Users</h1>
          <p className="text-muted-foreground">Manage user accounts and permissions</p>
        </div>
        <CreateUserButton roles={roles} />
      </div>

      {/* Filters */}
      <UsersFilters
        roles={roles}
        departments={departments}
        defaultValues={{
          search,
          role_id: roleId,
          department_id: departmentId,
          is_active: params.is_active,
        }}
      />

      {/* Users Table */}
      <Card>
        <CardHeader>
          <CardTitle>All Users ({totalCount})</CardTitle>
          <CardDescription>
            {totalPages > 1 && `Page ${currentPage} of ${totalPages} • `}
            {users.length} users displayed
            {totalCount === 0 && ' • No users found'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Suspense fallback={<Skeleton className="h-[400px] w-full" />}>
            {users.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <p className="text-muted-foreground">No users found</p>
                {search && (
                  <p className="text-sm text-muted-foreground mt-1">
                    Try adjusting your search or filters
                  </p>
                )}
              </div>
            ) : (
              <UsersTable
                users={users}
                roles={roles}
                currentPage={currentPage}
                totalPages={totalPages}
                totalCount={totalCount}
              />
            )}
          </Suspense>
        </CardContent>
      </Card>
    </div>
  )
}
