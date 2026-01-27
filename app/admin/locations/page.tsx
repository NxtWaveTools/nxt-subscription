// ============================================================================
// Locations Page
// Admin page for managing locations (offices, NIAT centers, etc.)
// ============================================================================

import { Suspense } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { LocationsTable } from './components/locations-table'
import { LocationsFilters } from './components/locations-filters'
import { CreateLocationButton } from './components/create-location-button'
import { fetchLocations } from '@/lib/data-access'
import { validatePageParams, calculateTotalPages, clampPage } from '@/lib/utils/pagination'
import type { LocationType } from '@/lib/constants'

interface LocationsPageProps {
  searchParams: Promise<{
    search?: string
    is_active?: string
    location_type?: string
    page?: string
    limit?: string
  }>
}

export default async function LocationsPage({ searchParams }: LocationsPageProps) {
  const params = await searchParams

  // Validate and normalize pagination params (handles negative/invalid values)
  const { page, limit, offset } = validatePageParams({
    page: params.page,
    limit: params.limit,
  })

  // Parse filter params
  const search = params.search?.trim().slice(0, 100) || '' // Max 100 chars for search
  const isActive = params.is_active === 'true' ? true : params.is_active === 'false' ? false : undefined
  const locationType = params.location_type as LocationType | undefined

  // Fetch locations using centralized data access layer
  const { locations, totalCount } = await fetchLocations(
    { search, isActive, locationType },
    { page, limit, offset }
  )

  const totalPages = calculateTotalPages(totalCount, limit)
  const currentPage = clampPage(page, totalPages)

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Locations</h1>
          <p className="text-muted-foreground">
            Manage office locations and NIAT centers for subscription assignments
          </p>
        </div>
        <CreateLocationButton />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>All Locations</CardTitle>
          <CardDescription>
            {totalCount} total location{totalCount !== 1 ? 's' : ''}
            {totalPages > 1 && ` • Page ${currentPage} of ${totalPages}`}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Suspense fallback={<Skeleton className="h-96" />}>
            <LocationsFilters />
            <div className="mt-4">
              {locations.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <p className="text-muted-foreground">No locations found</p>
                  {search && (
                    <p className="text-sm text-muted-foreground mt-1">
                      Try adjusting your search or filters
                    </p>
                  )}
                </div>
              ) : (
                <LocationsTable
                  locations={locations}
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
