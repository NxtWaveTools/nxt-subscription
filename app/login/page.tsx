'use client'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { GoogleOAuthButton, MicrosoftOAuthButton } from '@/components/auth/oauth-button'
import { ThemeToggle } from '@/components/ui/theme-toggle'

export default function LoginPage() {
  return (
    <div className="relative flex min-h-screen items-center justify-center bg-gradient-to-br from-zinc-50 to-zinc-100 dark:from-zinc-950 dark:to-zinc-900 p-4">
      {/* Theme Toggle - Top Right */}
      <div className="absolute top-4 right-4">
        <ThemeToggle />
      </div>

      <Card className="w-full max-w-md">
        <CardHeader className="space-y-2 text-center">
          <CardTitle className="text-3xl font-bold">NxtSubscription</CardTitle>
          <p className="text-sm text-muted-foreground">
            Manage subscriptions effortlessly
          </p>
          <CardDescription className="pt-2">
            Sign in to your account using Google or Microsoft
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <GoogleOAuthButton />
          <MicrosoftOAuthButton />
        </CardContent>
      </Card>
    </div>
  )
}
