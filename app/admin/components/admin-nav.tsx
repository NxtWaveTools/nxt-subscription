'use client'

// ============================================================================
// Admin Navigation Component
// ============================================================================

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'
import { Users, Building2, BarChart3, LayoutDashboard, LogOut } from 'lucide-react'
import { ADMIN_ROUTES } from '@/lib/constants'
import type { UserWithRoles } from '@/lib/types'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { Button } from '@/components/ui/button'
import { ThemeToggle } from '@/components/ui/theme-toggle'
import { useAuth } from '@/lib/hooks/use-auth'

interface AdminNavProps {
  user: UserWithRoles
}

const navItems = [
  {
    title: 'Admin Dashboard',
    href: ADMIN_ROUTES.DASHBOARD,
    icon: LayoutDashboard,
  },
  {
    title: 'Users',
    href: ADMIN_ROUTES.USERS,
    icon: Users,
  },
  {
    title: 'Departments',
    href: ADMIN_ROUTES.DEPARTMENTS,
    icon: Building2,
  },
  {
    title: 'Analytics',
    href: ADMIN_ROUTES.ANALYTICS,
    icon: BarChart3,
  },
]

export function AdminNav({ user }: AdminNavProps) {
  const pathname = usePathname()
  const { signOut, loading } = useAuth()

  return (
    <div className="w-64 border-r bg-muted/40">
      <div className="flex h-full flex-col gap-2">
        {/* Header */}
        <div className="flex h-14 items-center border-b px-4 lg:h-[60px] lg:px-6">
          <Link href={ADMIN_ROUTES.ADMIN} className="flex items-center gap-2 font-semibold">
            <BarChart3 className="h-6 w-6" />
            <span className="">Admin Panel</span>
          </Link>
        </div>

        {/* User Info */}
        <div className="px-4 py-2">
          <p className="text-sm font-medium">{user.name || user.email}</p>
          <p className="text-xs text-muted-foreground">{user.email}</p>
          <div className="mt-2 flex flex-wrap gap-1">
            {user.user_roles?.roles && (
              <Badge variant="secondary" className="text-xs">
                {user.user_roles.roles.name}
              </Badge>
            )}
          </div>
        </div>

        <Separator />

        {/* Navigation Links */}
        <nav className="flex-1 px-2 py-4">
          <ul className="grid gap-1">
            {navItems.map((item) => {
              const Icon = item.icon
              const isActive = pathname === item.href || pathname?.startsWith(item.href + '/')
              
              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    className={cn(
                      'flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-all hover:bg-accent',
                      isActive
                        ? 'bg-accent text-accent-foreground'
                        : 'text-muted-foreground hover:text-foreground'
                    )}
                  >
                    <Icon className="h-4 w-4" />
                    {item.title}
                  </Link>
                </li>
              )
            })}
          </ul>
        </nav>

        {/* Footer Actions */}
        <div className="mt-auto px-2 pb-4 space-y-2">
          <Separator className="mb-4" />
          
          {/* Theme Toggle */}
          <ThemeToggle />
          
          {/* Logout Button */}
          <Button
            variant="outline"
            size="sm"
            className="w-full justify-start gap-2"
            onClick={signOut}
            disabled={loading}
          >
            <LogOut className="h-4 w-4" />
            {loading ? 'Logging out...' : 'Log out'}
          </Button>
        </div>
      </div>
    </div>
  )
}
