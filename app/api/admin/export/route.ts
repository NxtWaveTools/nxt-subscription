// ============================================================================
// CSV Export API Route
// Streaming export for users and departments with batched fetching
// ============================================================================

import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin, getCurrentUser } from '@/lib/auth/user'
import { fetchUsersForExport, fetchDepartmentsForExport } from '@/lib/data-access'
import { createClient } from '@/lib/supabase/server'
import { EXPORT_BATCH_SIZE, EXPORT_TYPES } from '@/lib/constants'
import { auditBulkAction, AUDIT_ACTIONS, AUDIT_ENTITY_TYPES } from '@/lib/utils/audit-log'
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

      // Log the export action
      await auditBulkAction(
        currentUser.id,
        AUDIT_ACTIONS.EXPORT_USERS,
        AUDIT_ENTITY_TYPES.EXPORT,
        [],
        { count: csvRows.length, type: 'users' }
      )

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

      // Log the export action
      await auditBulkAction(
        currentUser.id,
        AUDIT_ACTIONS.EXPORT_DEPARTMENTS,
        AUDIT_ENTITY_TYPES.EXPORT,
        [],
        { count: csvRows.length, type: 'departments' }
      )

      const csv = Papa.unparse(csvRows)

      return new NextResponse(csv, {
        headers: {
          'Content-Type': 'text/csv; charset=utf-8',
          'Content-Disposition': `attachment; filename="departments-${new Date().toISOString().split('T')[0]}.csv"`,
        },
      })
    } else if (type === 'analytics') {
      // Analytics export (small dataset, no batching needed)
      const supabase = await createClient()
      const { data: analytics, error: analyticsError } = await supabase
        .from('department_analytics')
        .select('name, is_active, hod_count, poc_count')

      if (analyticsError) {
        return NextResponse.json({ error: 'Failed to fetch analytics' }, { status: 500 })
      }

      const csvData = (analytics || []).map((dept) => ({
        Department: dept.name,
        Status: dept.is_active ? 'Active' : 'Inactive',
        'Total HODs': dept.hod_count || 0,
        'Total POCs': dept.poc_count || 0,
      }))

      const csv = Papa.unparse(csvData)

      return new NextResponse(csv, {
        headers: {
          'Content-Type': 'text/csv; charset=utf-8',
          'Content-Disposition': `attachment; filename="analytics-${new Date().toISOString().split('T')[0]}.csv"`,
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
