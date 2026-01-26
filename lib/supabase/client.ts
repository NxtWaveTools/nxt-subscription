import { createBrowserClient } from '@supabase/ssr'
import { Database } from './database.types'

/**
 * Create a Supabase client for use in browser/client components
 * This client is for Client Components only
 */
export function createClient() {
  return createBrowserClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!
  )
}
