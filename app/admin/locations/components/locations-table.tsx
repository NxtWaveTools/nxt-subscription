// ============================================================================
// Locations Table Component
// Client component for displaying locations with bulk operations
// ============================================================================

'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { DataTable, type Column } from '@/components/admin/data-table'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Switch } from '@/components/ui/switch'
import { MoreHorizontal, MapPin, Trash2 } from 'lucide-react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { ConfirmDialog } from '@/components/ui/confirm-dialog'
import { BulkProgress } from '@/components/admin/bulk-progress'
import { EditLocationDialog } from './edit-location-dialog'
import { toast } from 'sonner'
import {
  toggleLocationActive,
  bulkToggleLocationsActive,
  deleteLocation,
} from '../../actions/locations'
import type { Location } from '@/lib/types'

interface LocationsTableProps {
  locations: Location[]
  totalCount: number
  pageSize: number
  currentPage: number
}

export function LocationsTable({
  locations,
  totalCount,
  pageSize,
  currentPage,
}: LocationsTableProps) {
  const router = useRouter()
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [selectedLocation, setSelectedLocation] = useState<Location | null>(null)
  const [editDialogOpen, setEditDialogOpen] = useState(false)
  const [locationToDelete, setLocationToDelete] = useState<Location | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)
  const [confirmDialog, setConfirmDialog] = useState<{
    open: boolean
    title: string
    description: string
    action: () => Promise<void>
  }>({
    open: false,
    title: '',
    description: '',
    action: async () => {},
  })
  const [bulkProgress, setBulkProgress] = useState<{
    show: boolean
    total: number
    processed: number
    successful: number
    failed: number
    isProcessing: boolean
    operationName: string
    errors: Array<{ id: string; message: string }>
  }>({
    show: false,
    total: 0,
    processed: 0,
    successful: 0,
    failed: 0,
    isProcessing: false,
    operationName: '',
    errors: [],
  })

  const handleToggleActive = async (location: Location) => {
    const newStatus = !location.is_active

    const result = await toggleLocationActive(location.id, newStatus)

    if (result.success) {
      toast.success(
        `Location ${newStatus ? 'activated' : 'deactivated'} successfully`
      )
      router.refresh()
    } else {
      toast.error(result.error || 'Failed to update location')
    }
  }

  const handleDeleteLocation = async () => {
    if (!locationToDelete) return

    setIsDeleting(true)
    const result = await deleteLocation(locationToDelete.id)

    if (result.success) {
      toast.success('Location deleted successfully')
      router.refresh()
    } else {
      toast.error(result.error || 'Failed to delete location')
    }

    setIsDeleting(false)
    setLocationToDelete(null)
  }

  const handleBulkToggle = async (active: boolean) => {
    const ids = Array.from(selectedIds)

    setBulkProgress({
      show: true,
      total: ids.length,
      processed: 0,
      successful: 0,
      failed: 0,
      isProcessing: true,
      operationName: active ? 'Activate' : 'Deactivate',
      errors: [],
    })

    const result = await bulkToggleLocationsActive(ids, active)

    if (result.success && result.data) {
      setBulkProgress((prev) => ({
        ...prev,
        processed: ids.length,
        successful: result.data!.successful,
        failed: result.data!.failed,
        isProcessing: false,
        errors: result.data!.errors || [],
      }))

      toast.success(
        `Bulk ${active ? 'activation' : 'deactivation'} completed: ${result.data.successful} successful, ${result.data.failed} failed`
      )
      setSelectedIds(new Set())
      router.refresh()
    } else {
      setBulkProgress((prev) => ({ ...prev, isProcessing: false }))
      toast.error(result.error || 'Bulk operation failed')
    }
  }

  const getLocationTypeBadgeVariant = (type: string) => {
    switch (type) {
      case 'OFFICE':
        return 'default'
      case 'NIAT':
        return 'secondary'
      case 'OTHER':
        return 'outline'
      default:
        return 'default'
    }
  }

  const columns: Column<Location>[] = [
    {
      key: 'name',
      label: 'Location Name',
      sortable: true,
      render: (location) => (
        <div>
          <div className="font-medium flex items-center gap-2">
            <MapPin className="h-4 w-4 text-muted-foreground" />
            {location.name}
          </div>
          {location.address && (
            <div className="text-xs text-muted-foreground mt-1 line-clamp-1">
              {location.address}
            </div>
          )}
        </div>
      ),
    },
    {
      key: 'location_type',
      label: 'Type',
      render: (location) => (
        <Badge variant={getLocationTypeBadgeVariant(location.location_type)}>
          {location.location_type}
        </Badge>
      ),
    },
    {
      key: 'is_active',
      label: 'Status',
      render: (location) => (
        <Badge variant={location.is_active ? 'default' : 'secondary'}>
          {location.is_active ? 'Active' : 'Inactive'}
        </Badge>
      ),
    },
    {
      key: 'created_at',
      label: 'Created',
      render: (location) => (
        <span className="text-sm text-muted-foreground">
          {new Date(location.created_at).toLocaleDateString()}
        </span>
      ),
    },
    {
      key: 'toggle',
      label: 'Active',
      render: (location) => (
        <Switch
          checked={location.is_active}
          onCheckedChange={() => handleToggleActive(location)}
        />
      ),
    },
  ]

  return (
    <>
      <DataTable
        data={locations}
        columns={columns}
        totalCount={totalCount}
        pageSize={pageSize}
        currentPage={currentPage}
        onPageChange={(page) => {
          const params = new URLSearchParams(window.location.search)
          params.set('page', page.toString())
          router.push(`?${params.toString()}`)
        }}
        enableBulkSelection
        bulkSelectionLimit={100}
        selectedIds={selectedIds}
        onSelectionChange={setSelectedIds}
        getRowId={(location) => location.id}
        bulkActions={(selected) => (
          <>
            <Button
              size="sm"
              variant="outline"
              onClick={() => {
                setConfirmDialog({
                  open: true,
                  title: 'Activate Locations',
                  description: `Are you sure you want to activate ${selected.size} location${selected.size !== 1 ? 's' : ''}?`,
                  action: async () => {
                    await handleBulkToggle(true)
                    setConfirmDialog((prev) => ({ ...prev, open: false }))
                  },
                })
              }}
            >
              Activate Selected
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => {
                setConfirmDialog({
                  open: true,
                  title: 'Deactivate Locations',
                  description: `Are you sure you want to deactivate ${selected.size} location${selected.size !== 1 ? 's' : ''}?`,
                  action: async () => {
                    await handleBulkToggle(false)
                    setConfirmDialog((prev) => ({ ...prev, open: false }))
                  },
                })
              }}
            >
              Deactivate Selected
            </Button>
          </>
        )}
        actions={(location) => (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuLabel>Actions</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={() => {
                  setSelectedLocation(location)
                  setEditDialogOpen(true)
                }}
              >
                Edit Location
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                className="text-destructive focus:text-destructive"
                onClick={() => setLocationToDelete(location)}
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Delete Location
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )}
        emptyMessage="No locations found"
      />

      <ConfirmDialog
        open={confirmDialog.open}
        onOpenChange={(open) =>
          setConfirmDialog((prev) => ({ ...prev, open }))
        }
        title={confirmDialog.title}
        description={confirmDialog.description}
        onConfirm={confirmDialog.action}
        variant="default"
      />

      <ConfirmDialog
        open={!!locationToDelete}
        onOpenChange={(open) => !open && setLocationToDelete(null)}
        title="Delete Location"
        description={`Are you sure you want to delete "${locationToDelete?.name}"? This action cannot be undone. Locations that are used in subscriptions cannot be deleted.`}
        onConfirm={handleDeleteLocation}
        variant="destructive"
        loading={isDeleting}
      />

      {bulkProgress.show && (
        <div className="mt-4">
          <BulkProgress {...bulkProgress} />
        </div>
      )}

      {selectedLocation && (
        <EditLocationDialog
          open={editDialogOpen}
          onOpenChange={setEditDialogOpen}
          location={selectedLocation}
        />
      )}
    </>
  )
}
