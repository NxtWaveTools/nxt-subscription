'use client'

import { useState } from 'react'
import type { UserWithRoles } from '@/lib/types'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { DataTable } from '@/components/ui/data-table'
import { ManageRolesDialog } from './manage-roles-dialog'
import { deleteUser } from '../../actions/users'
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
  const [userToDelete, setUserToDelete] = useState<UserWithRoles | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)
  const [manageRolesOpen, setManageRolesOpen] = useState(false)

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
                setSelectedUser(user)
                setManageRolesOpen(true)
              }}
            >
              Manage Role
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
    </>
  )
}

function getBadgeVariant(_role: string): 'outline' {
  // Use consistent styling for all roles
  return 'outline'
}
