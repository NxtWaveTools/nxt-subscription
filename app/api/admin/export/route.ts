// ============================================================================
// CSV Export API Route
// Streaming export for users and departments
// ============================================================================

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { requireAdmin } from '@/lib/auth/user'
import Papa from 'papaparse'

export async function GET(request: NextRequest) {
  try {
    // Require admin
    await requireAdmin()

    const searchParams = request.nextUrl.searchParams
    const type = searchParams.get('type') || 'users'

    const supabase = await createClient()

    if (type === 'users') {
      // Export users with roles
      const { data: users, error } = await supabase
        .from('users')
        .select(`
          id,
          email,
          name,
          is_active,
          created_at,
          user_roles (
            roles (
              name
            )
          )
        `)
        .order('created_at', { ascending: false })

      if (error) {
        return NextResponse.json({ error: 'Failed to fetch users' }, { status: 500 })
      }

      // Transform data for CSV
      const csvData = users.map((user: any) => ({
        ID: user.id,
        Email: user.email,
        Name: user.name || '',
        Status: user.is_active ? 'Active' : 'Inactive',
        Roles: user.user_roles?.map((ur: any) => ur.roles.name).join(', ') || 'No roles',
        'Created At': new Date(user.created_at).toISOString(),
      }))

      const csv = Papa.unparse(csvData)

      return new NextResponse(csv, {
        headers: {
          'Content-Type': 'text/csv',
          'Content-Disposition': `attachment; filename="users-${new Date().toISOString()}.csv"`,
        },
      })
    } else if (type === 'departments') {
      // Export departments with HODs
      const { data: departments, error } = await supabase
        .from('departments')
        .select(`
          id,
          name,
          is_active,
          created_at,
          hod_departments (
            users (
              name,
              email
            )
          )
        `)
        .order('created_at', { ascending: false })

      if (error) {
        return NextResponse.json({ error: 'Failed to fetch departments' }, { status: 500 })
      }

      // Transform data for CSV
      const csvData = departments.map((dept: any) => ({
        ID: dept.id,
        Name: dept.name,
        Status: dept.is_active ? 'Active' : 'Inactive',
        HODs: dept.hod_departments
          ?.map((hd: any) => `${hd.users.name || hd.users.email}`)
          .join(', ') || 'No HODs',
        'Created At': new Date(dept.created_at).toISOString(),
      }))

      const csv = Papa.unparse(csvData)

      return new NextResponse(csv, {
        headers: {
          'Content-Type': 'text/csv',
          'Content-Disposition': `attachment; filename="departments-${new Date().toISOString()}.csv"`,
        },
      })
    } else if (type === 'analytics') {
      // Export department analytics using direct query
      const { data: departments, error: deptError } = await supabase
        .from('departments')
        .select('id, name, is_active')

      if (deptError) {
        return NextResponse.json({ error: 'Failed to fetch analytics' }, { status: 500 })
      }

      // Fetch counts for each department
      const csvData = await Promise.all(
        (departments || []).map(async (dept: any) => {
          const { count: totalUsers } = await supabase
            .from('hod_departments')
            .select('*', { count: 'exact', head: true })
            .eq('department_id', dept.id)

          return {
            Department: dept.name,
            Status: dept.is_active ? 'Active' : 'Inactive',
            'Total HODs': totalUsers || 0,
          }
        })
      )

      const csv = Papa.unparse(csvData)

      return new NextResponse(csv, {
        headers: {
          'Content-Type': 'text/csv',
          'Content-Disposition': `attachment; filename="analytics-${new Date().toISOString()}.csv"`,
        },
      })
    } else {
      return NextResponse.json({ error: 'Invalid export type' }, { status: 400 })
    }
  } catch (error) {
    console.error('Export error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Export failed' },
      { status: 500 }
    )
  }
}
