// ============================================================================
// Users Management Page
// ============================================================================

import { Suspense } from 'react'
import { createClient } from '@/lib/supabase/server'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { UsersTable } from './components/users-table'
import { UsersFilters } from './components/users-filters'
import { CreateUserButton } from './components/create-user-button'

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
  const supabase = await createClient()
  const params = await searchParams

  // Parse search params
  const search = params.search || ''
  const roleId = params.role_id
  const departmentId = params.department_id
  const isActiveFilter = params.is_active
  const page = parseInt(params.page || '1')
  const limit = Math.min(parseInt(params.limit || '20'), 100)
  const offset = (page - 1) * limit

  // Build query
  let query = supabase
    .from('users')
    .select(
      `
      *,
      user_roles(
        role_id,
        roles(id, name)
      )
    `,
      { count: 'exact' }
    )

  // Apply fuzzy search if search term provided
  if (search) {
    // Use similarity search with pg_trgm
    query = query.or(`name.ilike.%${search}%,email.ilike.%${search}%`)
  }

  // Apply filters
  if (isActiveFilter !== undefined) {
    query = query.eq('is_active', isActiveFilter === 'true')
  }

  // Apply pagination
  query = query.range(offset, offset + limit - 1).order('created_at', { ascending: false })

  const { data: users, error, count } = await query

  // Fetch all roles for filter dropdown
  const { data: roles } = await supabase.from('roles').select('id, name').order('name')

  // Fetch all departments for filter dropdown  
  const { data: departments } = await supabase
    .from('departments')
    .select('id, name')
    .eq('is_active', true)
    .order('name')

  if (error) {
    return (
      <div className="space-y-4">
        <h1 className="text-3xl font-bold">Users</h1>
        <Card>
          <CardContent className="p-6">
            <p className="text-destructive">Error loading users: {error.message}</p>
          </CardContent>
        </Card>
      </div>
    )
  }

  // Filter by role if needed (client-side for now, can optimize with view later)
  let filteredUsers = users || []
  if (roleId) {
    filteredUsers = filteredUsers.filter((user: any) =>
      // user_roles is a single object (not array) due to one-to-one relationship
      user.user_roles?.role_id === roleId
    )
  }

  // user_roles is already a single object from Supabase (one-to-one relationship)
  // No normalization needed - just ensure null safety
  const normalizedUsers = filteredUsers.map((user: any) => ({
    ...user,
    user_roles: user.user_roles || null,
  }))

  const totalCount = count || 0
  const totalPages = Math.ceil(totalCount / limit)

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Users</h1>
          <p className="text-muted-foreground">Manage user accounts and permissions</p>
        </div>
        <CreateUserButton roles={roles || []} />
      </div>

      {/* Filters */}
      <UsersFilters
        roles={roles || []}
        departments={departments || []}
        defaultValues={{
          search,
          role_id: roleId,
          department_id: departmentId,
          is_active: isActiveFilter,
        }}
      />

      {/* Users Table */}
      <Card>
        <CardHeader>
          <CardTitle>All Users ({totalCount})</CardTitle>
          <CardDescription>
            {page > 1 && `Page ${page} of ${totalPages} • `}
            {normalizedUsers.length} users displayed
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Suspense fallback={<Skeleton className="h-[400px] w-full" />}>
            <UsersTable
              users={normalizedUsers}
              roles={roles || []}
              currentPage={page}
              totalPages={totalPages}
              totalCount={totalCount}
            />
          </Suspense>
        </CardContent>
      </Card>
    </div>
  )
}
