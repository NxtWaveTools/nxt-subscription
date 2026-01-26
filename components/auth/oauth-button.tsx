'use client'

import { Button } from '@/components/ui/button'
import { Spinner } from '@/components/ui/spinner'
import { Chrome, Building2, type LucideIcon } from 'lucide-react'
import { useAuth } from '@/lib/hooks/use-auth'
import { OAUTH_PROVIDERS } from '@/lib/constants'
import type { OAuthProvider } from '@/lib/types'

interface OAuthButtonProps {
  provider: OAuthProvider
  icon: LucideIcon
  label: string
  loadingLabel?: string
}

export function OAuthButton({ provider, icon: Icon, label, loadingLabel = 'Connecting...' }: OAuthButtonProps) {
  const { signInWithOAuth, loading } = useAuth()
  const isLoading = loading

  return (
    <Button
      variant="outline"
      className="w-full h-12 text-base"
      onClick={() => signInWithOAuth(provider)}
      disabled={isLoading}
    >
      {isLoading ? (
        <div className="flex items-center gap-2">
          <Spinner size="sm" />
          <span>{loadingLabel}</span>
        </div>
      ) : (
        <div className="flex items-center gap-3">
          <Icon className="h-5 w-5" />
          <span>{label}</span>
        </div>
      )}
    </Button>
  )
}

export function GoogleOAuthButton() {
  return (
    <OAuthButton
      provider={OAUTH_PROVIDERS.GOOGLE as OAuthProvider}
      icon={Chrome}
      label="Continue with Google"
    />
  )
}

export function MicrosoftOAuthButton() {
  return (
    <OAuthButton
      provider={OAUTH_PROVIDERS.MICROSOFT as OAuthProvider}
      icon={Building2}
      label="Continue with Microsoft"
    />
  )
}
