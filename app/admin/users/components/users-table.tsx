'use client'

import { useState } from 'react'
import type { UserWithRoles } from '@/lib/types'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { DataTable } from '@/components/ui/data-table'
import { ManageRolesDialog } from './manage-roles-dialog'
import { EditUserDialog } from './edit-user-dialog'
import { deleteUser, toggleUserActive } from '../../actions/users'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { ConfirmDialog } from '@/components/ui/confirm-dialog'
import type { Row } from '@tanstack/react-table'

interface UsersTableProps {
  users: UserWithRoles[]
  roles: Array<{ id: string; name: string }>
  currentPage: number
  totalPages: number
  totalCount: number
}

export function UsersTable({ users, roles }: UsersTableProps) {
  const router = useRouter()
  const [selectedUser, setSelectedUser] = useState<UserWithRoles | null>(null)
  const [userToEdit, setUserToEdit] = useState<UserWithRoles | null>(null)
  const [userToDelete, setUserToDelete] = useState<UserWithRoles | null>(null)
  const [userToToggle, setUserToToggle] = useState<UserWithRoles | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)
  const [isToggling, setIsToggling] = useState(false)
  const [manageRolesOpen, setManageRolesOpen] = useState(false)
  const [editUserOpen, setEditUserOpen] = useState(false)

  const handleDelete = async () => {
    if (!userToDelete) return

    setIsDeleting(true)
    const result = await deleteUser(userToDelete.id)

    if (result.error) {
      toast.error(result.error)
    } else {
      toast.success('User deleted successfully')
      router.refresh()
    }

    setIsDeleting(false)
    setUserToDelete(null)
  }

  const handleToggleActive = async () => {
    if (!userToToggle) return

    setIsToggling(true)
    const newStatus = !userToToggle.is_active
    const result = await toggleUserActive(userToToggle.id, newStatus)

    if (result.error) {
      toast.error(result.error)
    } else {
      toast.success(`User ${newStatus ? 'activated' : 'deactivated'} successfully`)
      router.refresh()
    }

    setIsToggling(false)
    setUserToToggle(null)
  }

  const columns = [
    {
      accessorKey: 'email',
      header: 'Email',
    },
    {
      accessorKey: 'name',
      header: 'Name',
      cell: ({ row }: { row: Row<UserWithRoles> }) => row.original.name || '-',
    },
    {
      id: 'roles',
      header: 'Role',
      cell: ({ row }: { row: Row<UserWithRoles> }) => {
        const userRole = row.original.user_roles
        return (
          <div className="flex gap-1 flex-wrap">
            {userRole ? (
              <Badge variant={getBadgeVariant(userRole.roles.name)}>
                {userRole.roles.name}
              </Badge>
            ) : (
              <span className="text-sm text-muted-foreground">No role</span>
            )}
          </div>
        )
      },
    },
    {
      accessorKey: 'is_active',
      header: 'Status',
      cell: ({ row }: { row: Row<UserWithRoles> }) => (
        <Badge variant={row.original.is_active ? 'default' : 'secondary'}>
          {row.original.is_active ? 'Active' : 'Inactive'}
        </Badge>
      ),
    },
    {
      id: 'actions',
      header: 'Actions',
      cell: ({ row }: { row: Row<UserWithRoles> }) => {
        const user = row.original
        return (
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setUserToEdit(user)
                setEditUserOpen(true)
              }}
            >
              Edit
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setSelectedUser(user)
                setManageRolesOpen(true)
              }}
            >
              Manage Role
            </Button>
            <Button
              variant={user.is_active ? 'secondary' : 'default'}
              size="sm"
              onClick={() => setUserToToggle(user)}
            >
              {user.is_active ? 'Deactivate' : 'Activate'}
            </Button>
            <Button
              variant="destructive"
              size="sm"
              onClick={() => setUserToDelete(user)}
            >
              Delete
            </Button>
          </div>
        )
      },
    },
  ]

  return (
    <>
      <DataTable columns={columns} data={users} />

      {userToEdit && (
        <EditUserDialog
          open={editUserOpen}
          onOpenChange={(open) => {
            setEditUserOpen(open)
            if (!open) setUserToEdit(null)
          }}
          user={userToEdit}
        />
      )}

      {selectedUser && (
        <ManageRolesDialog
          open={manageRolesOpen}
          onOpenChange={(open) => {
            setManageRolesOpen(open)
            if (!open) setSelectedUser(null)
          }}
          user={selectedUser}
          allRoles={roles}
        />
      )}

      <ConfirmDialog
        open={!!userToDelete}
        onOpenChange={(open) => !open && setUserToDelete(null)}
        title="Delete User"
        description={`Are you sure you want to delete ${userToDelete?.email}? This action cannot be undone.`}
        onConfirm={handleDelete}
        loading={isDeleting}
      />

      <ConfirmDialog
        open={!!userToToggle}
        onOpenChange={(open) => !open && setUserToToggle(null)}
        title={userToToggle?.is_active ? 'Deactivate User' : 'Activate User'}
        description={
          userToToggle?.is_active
            ? `Are you sure you want to deactivate ${userToToggle?.email}? They will no longer be able to access the system.`
            : `Are you sure you want to activate ${userToToggle?.email}? They will be able to access the system.`
        }
        onConfirm={handleToggleActive}
        loading={isToggling}
      />
    </>
  )
}

function getBadgeVariant(_role: string): 'outline' {
  // Use consistent styling for all roles
  return 'outline'
}
