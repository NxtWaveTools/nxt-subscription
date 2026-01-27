import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'
import type { Database } from './database.types'
import { ROLES, ROLE_IDS, ROUTES } from '@/lib/constants'

/**
 * Update user session and enforce route protection for Server Components
 * This ensures auth state is available throughout your app
 */
export async function updateSession(request: NextRequest) {
  const isProduction = process.env.NODE_ENV === 'production'
  let supabaseResponse = NextResponse.next({
    request,
  })

  const supabase = createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
          supabaseResponse = NextResponse.next({
            request,
          })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
      // Allow non-secure cookies locally so the session survives http://localhost
      cookieOptions: {
        secure: isProduction,
      },
    }
  )

  // IMPORTANT: Avoid writing any logic between createServerClient and
  // supabase.auth.getUser(). A simple mistake could make it very hard to debug
  // issues with users being randomly logged out.

  // Refreshing the auth token
  const {
    data: { user },
  } = await supabase.auth.getUser()

  const pathname = request.nextUrl.pathname

  // Protected admin routes - require authentication AND admin/finance role
  if (pathname.startsWith('/admin') || pathname.startsWith('/api/admin')) {
    if (!user) {
      const url = request.nextUrl.clone()
      url.pathname = ROUTES.LOGIN
      return NextResponse.redirect(url)
    }

    // Check if user has admin/finance role and is active
    const { data: userData } = await supabase
      .from('users')
      .select('is_active')
      .eq('id', user.id)
      .single()

    if (!userData || !userData.is_active) {
      const url = request.nextUrl.clone()
      url.pathname = ROUTES.UNAUTHORIZED
      return NextResponse.redirect(url)
    }

    // Check user role - only ADMIN and FINANCE can access admin routes
    const { data: userRole } = await supabase
      .from('user_roles')
      .select('role_id')
      .eq('user_id', user.id)
      .single()

    const adminRoleIds: string[] = [ROLE_IDS.ADMIN, ROLE_IDS.FINANCE]
    if (!userRole || !adminRoleIds.includes(userRole.role_id)) {
      const url = request.nextUrl.clone()
      url.pathname = ROUTES.UNAUTHORIZED
      return NextResponse.redirect(url)
    }
  }

  // Redirect authenticated users away from login page (but not from unauthorized)
  if (pathname === '/login' && user) {
    const url = request.nextUrl.clone()
    url.pathname = '/admin'
    return NextResponse.redirect(url)
  }

  // Allow /unauthorized page to be accessed by anyone (no redirects)

  // IMPORTANT: You *must* return the supabaseResponse object as it is. If you're
  // creating a new response object with NextResponse.next() make sure to:
  // 1. Pass the request in it, like so:
  //    const myNewResponse = NextResponse.next({ request })
  // 2. Copy over the cookies, like so:
  //    myNewResponse.cookies.setAll(supabaseResponse.cookies.getAll())
  // 3. Change the myNewResponse object to fit your needs, but avoid changing
  //    the cookies!
  // 4. Finally:
  //    return myNewResponse
  // If this is not done, you may be causing the browser and server to go out
  // of sync and terminate the user's session prematurely!

  return supabaseResponse
}
