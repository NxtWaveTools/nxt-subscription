'use client'

import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { ShieldX } from 'lucide-react'
import { SUPPORT_EMAIL } from '@/lib/constants'

export default function UnauthorizedPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-zinc-50 to-zinc-100 dark:from-zinc-950 dark:to-zinc-900 p-4">
      <Card className="w-full max-w-md text-center">
        <CardHeader className="space-y-4">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-destructive/10">
            <ShieldX className="h-8 w-8 text-destructive" />
          </div>
          <CardTitle className="text-2xl font-bold">Access Denied</CardTitle>
          <CardDescription>
            You don&apos;t have permission to access this resource. 
            Please contact your administrator if you believe this is an error.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Use proper form submission instead of DOM manipulation */}
          <form action="/api/auth/signout" method="POST">
            <Button type="submit" variant="outline" className="w-full">
              Sign Out
            </Button>
          </form>
          <p className="text-sm text-muted-foreground">
            Need access?{' '}
            <a href={`mailto:${SUPPORT_EMAIL}`} className="text-primary underline">
              Contact Support
            </a>
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
