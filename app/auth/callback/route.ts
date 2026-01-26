import { createClient, createAdminClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { AUTH_ERRORS, ROUTES, ADMIN_ROUTES } from '@/lib/constants'
import { isUserActive } from '@/lib/auth/user'

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
    .select(`
      roles (
        name
      )
    `)
    .eq('user_id', user.id)
    .single()

  // Redirect admins and finance users to admin panel
  if (roleData?.roles?.name === 'ADMIN' || roleData?.roles?.name === 'FINANCE') {
    return NextResponse.redirect(`${origin}${ADMIN_ROUTES.ADMIN}`)
  }

  // All other users go to admin dashboard (they'll be redirected if not authorized)
  return NextResponse.redirect(`${origin}${ADMIN_ROUTES.ADMIN}`)
}
