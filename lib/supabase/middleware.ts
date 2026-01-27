import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'
import type { Database } from './database.types'
import { ROLE_IDS, ROUTES } from '@/lib/constants'

// Map role IDs to their allowed routes and dashboard paths
const ROLE_ROUTE_CONFIG: Record<string, { allowedPaths: string[], dashboard: string }> = {
  [ROLE_IDS.ADMIN]: { allowedPaths: ['/admin', '/api/admin'], dashboard: '/admin' },
  [ROLE_IDS.FINANCE]: { allowedPaths: ['/finance'], dashboard: '/finance' },
  [ROLE_IDS.POC]: { allowedPaths: ['/poc'], dashboard: '/poc' },
  [ROLE_IDS.HOD]: { allowedPaths: ['/hod'], dashboard: '/hod' },
}

// All protected route prefixes
const PROTECTED_ROUTES = ['/admin', '/finance', '/poc', '/hod', '/api/admin']

/**
 * Update user session and enforce strict role-based route protection
 * Each role can ONLY access their designated routes
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

  // Check if current path is a protected route
  const isProtectedRoute = PROTECTED_ROUTES.some(route => pathname.startsWith(route))

  if (isProtectedRoute) {
    // Must be authenticated
    if (!user) {
      const url = request.nextUrl.clone()
      url.pathname = ROUTES.LOGIN
      return NextResponse.redirect(url)
    }

    // Check if user exists and is active
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

    // Get user's role
    const { data: userRole } = await supabase
      .from('user_roles')
      .select('role_id')
      .eq('user_id', user.id)
      .single()

    if (!userRole) {
      const url = request.nextUrl.clone()
      url.pathname = ROUTES.UNAUTHORIZED
      return NextResponse.redirect(url)
    }

    // Get the role's allowed paths
    const roleConfig = ROLE_ROUTE_CONFIG[userRole.role_id]
    if (!roleConfig) {
      const url = request.nextUrl.clone()
      url.pathname = ROUTES.UNAUTHORIZED
      return NextResponse.redirect(url)
    }

    // Check if user's role allows access to this path
    const hasAccess = roleConfig.allowedPaths.some(path => pathname.startsWith(path))
    if (!hasAccess) {
      // Redirect to user's authorized dashboard instead of unauthorized
      const url = request.nextUrl.clone()
      url.pathname = roleConfig.dashboard
      return NextResponse.redirect(url)
    }
  }

  // Redirect authenticated users from login to their role-specific dashboard
  if (pathname === '/login' && user) {
    // Get user's role to determine correct dashboard
    const { data: userRole } = await supabase
      .from('user_roles')
      .select('role_id')
      .eq('user_id', user.id)
      .single()

    const url = request.nextUrl.clone()
    
    if (userRole && ROLE_ROUTE_CONFIG[userRole.role_id]) {
      url.pathname = ROLE_ROUTE_CONFIG[userRole.role_id].dashboard
    } else {
      url.pathname = ROUTES.UNAUTHORIZED
    }
    
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
