import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { ROUTES } from '@/lib/constants'

export async function POST(request: Request) {
  const requestUrl = new URL(request.url)
  const supabase = await createClient()

  await supabase.auth.signOut()

  return NextResponse.redirect(`${requestUrl.origin}${ROUTES.LOGIN}`, {
    status: 302,
  })
}
