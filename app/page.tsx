import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { ADMIN_ROUTES, ROUTES } from '@/lib/constants'

export default async function Home() {
  const supabase = await createClient()
  
  const {
    data: { user },
  } = await supabase.auth.getUser()

  // If user is authenticated, redirect to admin dashboard
  if (user) {
    redirect(ADMIN_ROUTES.ADMIN)
  }

  // If not authenticated, redirect to login
  redirect(ROUTES.LOGIN)
}
