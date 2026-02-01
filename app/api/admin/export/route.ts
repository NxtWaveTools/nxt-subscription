// ============================================================================
// CSV Export API Route
// Streaming export for users and departments with batched fetching
// ============================================================================

import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/auth/user'
import { fetchUsersForExport, fetchDepartmentsForExport } from '@/lib/data-access'
import { EXPORT_BATCH_SIZE, EXPORT_TYPES } from '@/lib/constants'
import Papa from 'papaparse'

export async function GET(request: NextRequest) {
  try {
    // Require admin role - this throws if unauthorized
    const currentUser = await requireAdmin()

    const searchParams = request.nextUrl.searchParams
    const type = searchParams.get('type') || EXPORT_TYPES.USERS

    if (type === EXPORT_TYPES.USERS) {
      // Stream users export using batched fetching (prevents OOM)
      const csvRows: Array<Record<string, string | number>> = []

      for await (const batch of fetchUsersForExport(EXPORT_BATCH_SIZE)) {
        for (const user of batch) {
          csvRows.push({
            ID: user.id,
            Email: user.email,
            Name: user.name || '',
            Status: user.is_active ? 'Active' : 'Inactive',
            Role: Array.isArray(user.user_roles) && user.user_roles[0]?.roles?.name 
              ? user.user_roles[0].roles.name 
              : 'No role',
            'Created At': new Date(user.created_at).toISOString(),
          })
        }
      }

      const csv = Papa.unparse(csvRows)

      return new NextResponse(csv, {
        headers: {
          'Content-Type': 'text/csv; charset=utf-8',
          'Content-Disposition': `attachment; filename="users-${new Date().toISOString().split('T')[0]}.csv"`,
        },
      })
    } else if (type === EXPORT_TYPES.DEPARTMENTS) {
      // Stream departments export using batched fetching
      const csvRows: Array<Record<string, string | number>> = []

      for await (const batch of fetchDepartmentsForExport(EXPORT_BATCH_SIZE)) {
        for (const dept of batch) {
          csvRows.push({
            ID: dept.id,
            Name: dept.name,
            Status: dept.is_active ? 'Active' : 'Inactive',
            HODs: Array.isArray(dept.hod_departments) 
              ? dept.hod_departments.map(hd => hd.users?.name || hd.users?.email || 'Unknown').join(', ')
              : 'No HODs',
            'Created At': new Date(dept.created_at).toISOString(),
          })
        }
      }

      const csv = Papa.unparse(csvRows)

      return new NextResponse(csv, {
        headers: {
          'Content-Type': 'text/csv; charset=utf-8',
          'Content-Disposition': `attachment; filename="departments-${new Date().toISOString().split('T')[0]}.csv"`,
        },
      })
    } else {
      return NextResponse.json({ error: 'Invalid export type' }, { status: 400 })
    }
  } catch (error) {
    console.error('Export error:', error)
    
    // Don't expose internal errors to client
    const isAuthError = error instanceof Error && 
      (error.message.includes('Unauthorized') || error.message.includes('Forbidden'))
    
    return NextResponse.json(
      { error: isAuthError ? error.message : 'Export failed' },
      { status: isAuthError ? 403 : 500 }
    )
  }
}
