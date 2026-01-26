// ============================================================================
// Departments Page
// Admin page for managing departments with HOD/POC assignments
// ============================================================================

import { Suspense } from 'react'
import { createClient } from '@/lib/supabase/server'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { DepartmentsTable } from './components/departments-table'
import { DepartmentsFilters } from './components/departments-filters'
import { CreateDepartmentButton } from './components/create-department-button'

interface DepartmentsPageProps {
  searchParams: Promise<{
    search?: string
    is_active?: string
    page?: string
    limit?: string
  }>
}

export default async function DepartmentsPage({ searchParams }: DepartmentsPageProps) {
  const params = await searchParams
  const search = params.search || ''
  const isActive = params.is_active === 'true' ? true : params.is_active === 'false' ? false : undefined
  const page = parseInt(params.page || '1', 10)
  const limit = parseInt(params.limit || '20', 10)

  const supabase = await createClient()

  // Build departments query
  let query = supabase
    .from('departments')
    .select(`
      id,
      name,
      is_active,
      created_at,
      updated_at,
      hod_departments (
        hod_id,
        users!hod_id (
          id,
          name,
          email
        )
      ),
      poc_department_access (
        poc_id,
        users!poc_id (
          id,
          name,
          email
        )
      )
    `, { count: 'exact' })

  // Apply filters
  if (search) {
    // Fuzzy search using pg_trgm extension
    query = query.or(`name.ilike.%${search}%`)
  }

  if (isActive !== undefined) {
    query = query.eq('is_active', isActive)
  }

  // Pagination
  const startIndex = (page - 1) * limit
  query = query.range(startIndex, startIndex + limit - 1)

  // Sort
  query = query.order('created_at', { ascending: false })

  const { data: departments, count, error } = await query

  if (error) {
    console.error('Fetch departments error:', error)
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Departments</h1>
          <p className="text-muted-foreground">
            Manage departments, assign HODs and POCs
          </p>
        </div>
        <CreateDepartmentButton />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>All Departments</CardTitle>
          <CardDescription>
            {count !== null ? `${count} total department${count !== 1 ? 's' : ''}` : 'Loading...'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Suspense fallback={<Skeleton className="h-96" />}>
            <DepartmentsFilters />
            <div className="mt-4">
              <DepartmentsTable
                departments={departments || []}
                totalCount={count || 0}
                pageSize={limit}
                currentPage={page}
              />
            </div>
          </Suspense>
        </CardContent>
      </Card>
    </div>
  )
}
