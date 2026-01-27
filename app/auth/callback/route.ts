import { createClient, createAdminClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { AUTH_ERRORS, ROUTES, ROLE_IDS } from '@/lib/constants'
import { isUserActive } from '@/lib/auth/user'

// Map role IDs to their dashboard paths
const ROLE_DASHBOARDS: Record<string, string> = {
  [ROLE_IDS.ADMIN]: '/admin',
  [ROLE_IDS.FINANCE]: '/finance',
  [ROLE_IDS.POC]: '/poc',
  [ROLE_IDS.HOD]: '/hod',
}

export async function GET(request: Request) {
  const requestUrl = new URL(request.url)
  const code = requestUrl.searchParams.get('code')
  const origin = requestUrl.origin

  if (!code) {
    return NextResponse.redirect(`${origin}${ROUTES.LOGIN}?error=${AUTH_ERRORS.AUTH_FAILED}`)
  }

  const supabase = await createClient()

  // Exchange code for session
  const { error: sessionError } = await supabase.auth.exchangeCodeForSession(code)

  if (sessionError) {
    console.error('Error exchanging code for session:', sessionError)
    return NextResponse.redirect(`${origin}${ROUTES.LOGIN}?error=${AUTH_ERRORS.AUTH_FAILED}`)
  }

  // Get authenticated user
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.redirect(`${origin}${ROUTES.LOGIN}?error=${AUTH_ERRORS.USER_NOT_FOUND}`)
  }

  // Use admin client to bypass RLS for checking user status during login
  const adminClient = createAdminClient()

  // Check if user exists and is active in our database
  const { data: userData, error: userError } = await adminClient
    .from('users')
    .select('is_active')
    .eq('id', user.id)
    .single()

  if (userError || !userData) {
    console.error('Error fetching user data:', userError)
    return NextResponse.redirect(`${origin}${ROUTES.LOGIN}?error=${AUTH_ERRORS.USER_NOT_FOUND}`)
  }

  // Verify user is active
  if (!isUserActive(userData)) {
    await supabase.auth.signOut()
    return NextResponse.redirect(`${origin}${ROUTES.LOGIN}?error=${AUTH_ERRORS.ACCOUNT_INACTIVE}`)
  }

  // Check user role and redirect accordingly
  const { data: roleData } = await adminClient
    .from('user_roles')
    .select('role_id')
    .eq('user_id', user.id)
    .single()

  // Redirect to role-specific dashboard
  if (roleData && ROLE_DASHBOARDS[roleData.role_id]) {
    return NextResponse.redirect(`${origin}${ROLE_DASHBOARDS[roleData.role_id]}`)
  }

  // Users without a valid role go to unauthorized page
  return NextResponse.redirect(`${origin}${ROUTES.UNAUTHORIZED}`)
}
