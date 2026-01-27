import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { ROUTES, ROLE_IDS } from '@/lib/constants'

// Map role IDs to their dashboard paths
const ROLE_DASHBOARDS: Record<string, string> = {
  [ROLE_IDS.ADMIN]: '/admin',
  [ROLE_IDS.FINANCE]: '/finance',
  [ROLE_IDS.POC]: '/poc',
  [ROLE_IDS.HOD]: '/hod',
}

export default async function Home() {
  const supabase = await createClient()
  
  const {
    data: { user },
  } = await supabase.auth.getUser()

  // If not authenticated, redirect to login
  if (!user) {
    redirect(ROUTES.LOGIN)
  }

  // Get user's role to determine correct dashboard
  const { data: userRole } = await supabase
    .from('user_roles')
    .select('role_id')
    .eq('user_id', user.id)
    .single()

  if (userRole && ROLE_DASHBOARDS[userRole.role_id]) {
    redirect(ROLE_DASHBOARDS[userRole.role_id])
  }

  // Fallback to unauthorized if no valid role
  redirect(ROUTES.UNAUTHORIZED)
}
