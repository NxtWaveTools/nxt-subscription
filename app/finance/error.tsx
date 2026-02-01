'use client'

// ============================================================================
// Finance Error Page
// ============================================================================
// Error boundary for all Finance routes

import { useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { AlertTriangle, RefreshCw, Home } from 'lucide-react'
import Link from 'next/link'
import { ROUTES } from '@/lib/constants'

interface FinanceErrorProps {
  error: Error & { digest?: string }
  reset: () => void
}

export default function FinanceError({ error, reset }: FinanceErrorProps) {
  useEffect(() => {
    // Log error to monitoring service (e.g., Sentry)
    console.error('Finance error:', error)
  }, [error])

  // Determine if this is an authorization error
  const isAuthError = error.message.includes('Unauthorized') || 
                      error.message.includes('Forbidden') ||
                      error.message.includes('permission')

  return (
    <div className="flex min-h-[60vh] items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-destructive/10">
            <AlertTriangle className="h-6 w-6 text-destructive" />
          </div>
          <CardTitle className="text-xl">
            {isAuthError ? 'Access Denied' : 'Something went wrong'}
          </CardTitle>
          <CardDescription>
            {isAuthError
              ? "You don't have permission to access this resource."
              : 'An error occurred while loading this page.'}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Error details (only in development) */}
          {process.env.NODE_ENV === 'development' && (
            <div className="rounded-md bg-muted p-3">
              <p className="text-xs font-mono text-muted-foreground break-all">
                {error.message}
              </p>
              {error.digest && (
                <p className="mt-1 text-xs text-muted-foreground">
                  Error ID: {error.digest}
                </p>
              )}
            </div>
          )}

          <div className="flex flex-col gap-2 sm:flex-row">
            <Button
              onClick={reset}
              variant="default"
              className="flex-1"
            >
              <RefreshCw className="mr-2 h-4 w-4" />
              Try again
            </Button>
            <Button
              asChild
              variant="outline"
              className="flex-1"
            >
              <Link href={ROUTES.HOME}>
                <Home className="mr-2 h-4 w-4" />
                Go home
              </Link>
            </Button>
          </div>

          {isAuthError && (
            <p className="text-center text-sm text-muted-foreground">
              If you believe this is an error, please contact your administrator.
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
