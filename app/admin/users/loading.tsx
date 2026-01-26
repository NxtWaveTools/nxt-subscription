// ============================================================================
// Users Page Loading Skeleton
// ============================================================================

import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'

export default function UsersLoading() {
  return (
    <div className="space-y-6">
      {/* Header Skeleton */}
      <div>
        <Skeleton className="h-9 w-48" />
        <Skeleton className="mt-2 h-4 w-96" />
      </div>

      {/* Filters Skeleton */}
      <div className="flex flex-col gap-4 rounded-lg border p-4">
        <div className="grid gap-4 md:grid-cols-4">
          <Skeleton className="h-10" />
          <Skeleton className="h-10" />
          <Skeleton className="h-10" />
          <Skeleton className="h-10" />
        </div>
      </div>

      {/* Table Skeleton */}
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-32" />
          <Skeleton className="mt-2 h-4 w-48" />
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="flex items-center gap-4">
                <Skeleton className="h-5 w-5" />
                <Skeleton className="h-12 flex-1" />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
