// ============================================================================
// Departments Page
// Admin page for managing departments with HOD/POC assignments
// ============================================================================

import { Suspense } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { DepartmentsTable } from './components/departments-table'
import { DepartmentsFilters } from './components/departments-filters'
import { CreateDepartmentButton } from './components/create-department-button'
import { fetchDepartments } from '@/lib/data-access'
import { validatePageParams, calculateTotalPages, clampPage } from '@/lib/utils/pagination'

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

  // Validate and normalize pagination params (handles negative/invalid values)
  const { page, limit, offset } = validatePageParams({
    page: params.page,
    limit: params.limit,
  })

  // Parse filter params
  const search = params.search?.trim().slice(0, 100) || '' // Max 100 chars for search
  const isActive = params.is_active === 'true' ? true : params.is_active === 'false' ? false : undefined

  // Fetch departments using centralized data access layer
  const { departments, totalCount } = await fetchDepartments(
    { search, isActive },
    { page, limit, offset }
  )

  const totalPages = calculateTotalPages(totalCount, limit)
  const currentPage = clampPage(page, totalPages)

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
            {totalCount} total department{totalCount !== 1 ? 's' : ''}
            {totalPages > 1 && ` • Page ${currentPage} of ${totalPages}`}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Suspense fallback={<Skeleton className="h-96" />}>
            <DepartmentsFilters />
            <div className="mt-4">
              {departments.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <p className="text-muted-foreground">No departments found</p>
                  {search && (
                    <p className="text-sm text-muted-foreground mt-1">
                      Try adjusting your search or filters
                    </p>
                  )}
                </div>
              ) : (
                <DepartmentsTable
                  departments={departments}
                  totalCount={totalCount}
                  pageSize={limit}
                  currentPage={currentPage}
                />
              )}
            </div>
          </Suspense>
        </CardContent>
      </Card>
    </div>
  )
}
