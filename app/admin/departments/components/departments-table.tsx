// ============================================================================
// Departments Table Component
// Client component for displaying departments with bulk operations
// ============================================================================

'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { DataTable, type Column } from '@/components/admin/data-table'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Switch } from '@/components/ui/switch'
import { MoreHorizontal, UserCog, UserCheck, Trash2 } from 'lucide-react'
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
import { ManageHODDialog } from './manage-hod-dialog'
import { ManagePOCDialog } from './manage-poc-dialog'
import { EditDepartmentDialog } from './edit-department-dialog'
import { toast } from 'sonner'
import { toggleDepartmentActive, bulkToggleDepartmentsActive, deleteDepartment } from '../../actions/departments'

interface Department {
  id: string
  name: string
  is_active: boolean
  created_at: string
  updated_at: string
  hod_departments: Array<{
    hod_id: string
    users: {
      id: string
      name: string | null
      email: string
    }
  }>
  poc_department_access: Array<{
    poc_id: string
    users: {
      id: string
      name: string | null
      email: string
    }
  }>
}

interface DepartmentsTableProps {
  departments: Department[]
  totalCount: number
  pageSize: number
  currentPage: number
}

export function DepartmentsTable({
  departments,
  totalCount,
  pageSize,
  currentPage,
}: DepartmentsTableProps) {
  const router = useRouter()
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [selectedDepartment, setSelectedDepartment] = useState<Department | null>(null)
  const [editDialogOpen, setEditDialogOpen] = useState(false)
  const [hodDialogOpen, setHodDialogOpen] = useState(false)
  const [pocDialogOpen, setPocDialogOpen] = useState(false)
  const [departmentToDelete, setDepartmentToDelete] = useState<Department | null>(null)
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

  const handleToggleActive = async (department: Department) => {
    const newStatus = !department.is_active

    const result = await toggleDepartmentActive(department.id, newStatus)

    if (result.success) {
      toast.success(`Department ${newStatus ? 'activated' : 'deactivated'} successfully`)
      router.refresh()
    } else {
      toast.error(result.error || 'Failed to update department')
    }
  }

  const handleDeleteDepartment = async () => {
    if (!departmentToDelete) return

    setIsDeleting(true)
    const result = await deleteDepartment(departmentToDelete.id)

    if (result.success) {
      toast.success('Department deleted successfully')
      router.refresh()
    } else {
      toast.error(result.error || 'Failed to delete department')
    }

    setIsDeleting(false)
    setDepartmentToDelete(null)
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

    const result = await bulkToggleDepartmentsActive(ids, active)

    if (result.success && 'successful' in result) {
      setBulkProgress((prev) => ({
        ...prev,
        processed: ids.length,
        successful: result.successful,
        failed: result.failed,
        isProcessing: false,
        errors: result.errors || [],
      }))

      toast.success(
        `Bulk ${active ? 'activation' : 'deactivation'} completed: ${result.successful} successful, ${result.failed} failed`
      )
      setSelectedIds(new Set())
      router.refresh()
    } else {
      setBulkProgress((prev) => ({ ...prev, isProcessing: false }))
      toast.error(result.error || 'Bulk operation failed')
    }
  }

  const columns: Column<Department>[] = [
    {
      key: 'name',
      label: 'Department Name',
      sortable: true,
      render: (dept) => (
        <div>
          <div className="font-medium">{dept.name}</div>
          <div className="text-xs text-muted-foreground">
            Created {new Date(dept.created_at).toLocaleDateString()}
          </div>
        </div>
      ),
    },
    {
      key: 'hods',
      label: 'HODs',
      render: (dept) => (
        <div className="flex items-center gap-2">
          <UserCog className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm">
            {dept.hod_departments?.length || 0} HOD{dept.hod_departments?.length !== 1 ? 's' : ''}
          </span>
        </div>
      ),
    },
    {
      key: 'pocs',
      label: 'POCs',
      render: (dept) => (
        <div className="flex items-center gap-2">
          <UserCheck className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm">
            {dept.poc_department_access?.length || 0} POC{dept.poc_department_access?.length !== 1 ? 's' : ''}
          </span>
        </div>
      ),
    },
    {
      key: 'is_active',
      label: 'Status',
      render: (dept) => (
        <Badge variant={dept.is_active ? 'default' : 'secondary'}>
          {dept.is_active ? 'Active' : 'Inactive'}
        </Badge>
      ),
    },
    {
      key: 'toggle',
      label: 'Active',
      render: (dept) => (
        <Switch
          checked={dept.is_active}
          onCheckedChange={() => handleToggleActive(dept)}
        />
      ),
    },
  ]

  return (
    <>
      <DataTable
        data={departments}
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
        getRowId={(dept) => dept.id}
        bulkActions={(selected) => (
          <>
            <Button
              size="sm"
              variant="outline"
              onClick={() => {
                setConfirmDialog({
                  open: true,
                  title: 'Activate Departments',
                  description: `Are you sure you want to activate ${selected.size} department${selected.size !== 1 ? 's' : ''}?`,
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
                  title: 'Deactivate Departments',
                  description: `Are you sure you want to deactivate ${selected.size} department${selected.size !== 1 ? 's' : ''}?`,
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
        actions={(dept) => (
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
                  setSelectedDepartment(dept)
                  setEditDialogOpen(true)
                }}
              >
                Edit Department
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => {
                  setSelectedDepartment(dept)
                  setHodDialogOpen(true)
                }}
              >
                Manage HODs
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => {
                  setSelectedDepartment(dept)
                  setPocDialogOpen(true)
                }}
              >
                Manage POCs
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                className="text-destructive focus:text-destructive"
                onClick={() => setDepartmentToDelete(dept)}
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Delete Department
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )}
        emptyMessage="No departments found"
      />

      <ConfirmDialog
        open={confirmDialog.open}
        onOpenChange={(open) => setConfirmDialog((prev) => ({ ...prev, open }))}
        title={confirmDialog.title}
        description={confirmDialog.description}
        onConfirm={confirmDialog.action}
        variant="default"
      />

      <ConfirmDialog
        open={!!departmentToDelete}
        onOpenChange={(open) => !open && setDepartmentToDelete(null)}
        title="Delete Department"
        description={`Are you sure you want to delete "${departmentToDelete?.name}"? This action cannot be undone and will remove all HOD and POC assignments.`}
        onConfirm={handleDeleteDepartment}
        variant="destructive"
        loading={isDeleting}
      />

      {bulkProgress.show && (
        <div className="mt-4">
          <BulkProgress {...bulkProgress} />
        </div>
      )}

      {selectedDepartment && (
        <>
          <EditDepartmentDialog
            open={editDialogOpen}
            onOpenChange={setEditDialogOpen}
            department={selectedDepartment}
          />
          <ManageHODDialog
            open={hodDialogOpen}
            onOpenChange={setHodDialogOpen}
            department={selectedDepartment}
          />
          <ManagePOCDialog
            open={pocDialogOpen}
            onOpenChange={setPocDialogOpen}
            department={selectedDepartment}
          />
        </>
      )}
    </>
  )
}
