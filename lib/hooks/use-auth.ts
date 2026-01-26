'use client'

import { useCallback, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { ROUTES } from '@/lib/constants'
import type { OAuthProvider } from '@/lib/types'

interface UseAuthReturn {
  signInWithOAuth: (provider: OAuthProvider) => Promise<void>
  signOut: () => Promise<void>
  loading: boolean
  error: string | null
}

export function useAuth(): UseAuthReturn {
  const router = useRouter()
  const supabase = createClient()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const signInWithOAuth = useCallback(
    async (provider: OAuthProvider) => {
      try {
        setLoading(true)
        setError(null)

        const { error: authError } = await supabase.auth.signInWithOAuth({
          provider,
          options: {
            redirectTo: `${window.location.origin}${ROUTES.AUTH_CALLBACK}`,
            queryParams: provider === 'azure' ? { prompt: 'select_account' } : undefined,
          },
        })

        if (authError) {
          setError(authError.message)
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'An unexpected error occurred')
      } finally {
        setLoading(false)
      }
    },
    [supabase]
  )

  const signOut = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)

      await supabase.auth.signOut()
      router.push(ROUTES.LOGIN)
      router.refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to sign out')
    } finally {
      setLoading(false)
    }
  }, [supabase, router])

  return {
    signInWithOAuth,
    signOut,
    loading,
    error,
  }
}
