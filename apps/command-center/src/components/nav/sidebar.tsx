'use client'

import { Button, cn } from '@cgk-platform/ui'
import {
  BarChart3,
  ChevronDown,
  ChevronRight,
  Clock,
  Cpu,
  FolderOpen,
  GitCompare,
  Image,
  LayoutDashboard,
  LogOut,
  Menu,
  MessageSquare,
  Puzzle,
  Radio,
  Settings,
  Terminal,
  X,
} from 'lucide-react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useCallback, useEffect, useState } from 'react'

import { NotificationBell } from './notification-bell'

interface NavItem {
  label: string
  href: string
  icon: string
  children?: NavItem[]
}

const PROFILE_NAV: NavItem[] = [
  { label: 'CGK Linens', href: '/cgk', icon: 'Radio' },
  { label: 'RAWDOG', href: '/rawdog', icon: 'Radio' },
  { label: 'VitaHustle', href: '/vitahustle', icon: 'Radio' },
]

const PROFILE_TABS: NavItem[] = [
  { label: 'Overview', href: '', icon: 'LayoutDashboard' },
  { label: 'Cron Jobs', href: '/cron', icon: 'Clock' },
  { label: 'Sessions', href: '/sessions', icon: 'Terminal' },
  { label: 'Logs', href: '/logs', icon: 'Terminal' },
  { label: 'Models', href: '/models', icon: 'Cpu' },
  { label: 'Channels', href: '/channels', icon: 'MessageSquare' },
  { label: 'Skills', href: '/skills', icon: 'Puzzle' },
  { label: 'Media', href: '/media', icon: 'Image' },
  { label: 'Workspace', href: '/workspace', icon: 'FolderOpen' },
  { label: 'Config', href: '/config', icon: 'Settings' },
]

const ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  LayoutDashboard,
  Radio,
  Clock,
  Terminal,
  Puzzle,
  BarChart3,
  GitCompare,
  MessageSquare,
  Cpu,
  Image,
  FolderOpen,
  Settings,
}

const STORAGE_KEY = 'cc-sidebar-expanded'

function loadExpandedProfiles(pathname: string): Set<string> {
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (stored) {
      const arr = JSON.parse(stored) as string[]
      const set = new Set(arr)
      // Also include the active profile
      const active = PROFILE_NAV.find((p) => pathname.startsWith(p.href))
      if (active) set.add(active.href)
      return set
    }
  } catch {
    // ignore
  }
  const active = PROFILE_NAV.find((p) => pathname.startsWith(p.href))
  return active ? new Set([active.href]) : new Set<string>()
}

interface SidebarProps {
  userName?: string
  userEmail?: string
}

export function Sidebar({ userName, userEmail }: SidebarProps) {
  const pathname = usePathname()
  const router = useRouter()
  const [isMobileOpen, setIsMobileOpen] = useState(false)
  const [expandedProfiles, setExpandedProfiles] = useState<Set<string>>(() =>
    loadExpandedProfiles(pathname)
  )

  // Auto-expand active profile via useEffect (not in render body)
  useEffect(() => {
    const activeProfile = PROFILE_NAV.find((p) => pathname.startsWith(p.href))
    if (activeProfile && !expandedProfiles.has(activeProfile.href)) {
      setExpandedProfiles((prev) => new Set([...prev, activeProfile.href]))
    }
  }, [pathname]) // eslint-disable-line react-hooks/exhaustive-deps

  // Persist to localStorage on change
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify([...expandedProfiles]))
    } catch {
      // ignore
    }
  }, [expandedProfiles])

  const toggleProfile = useCallback((href: string) => {
    setExpandedProfiles((prev) => {
      const next = new Set(prev)
      if (next.has(href)) {
        next.delete(href)
      } else {
        next.add(href)
      }
      return next
    })
  }, [])

  const isActive = useCallback(
    (href: string) => {
      if (href === '/') return pathname === '/'
      return pathname === href || pathname.startsWith(href + '/')
    },
    [pathname]
  )

  const handleLogout = useCallback(async () => {
    try {
      await fetch('/api/platform/auth/logout', { method: 'POST' })
      router.push('/login')
    } catch {
      // ignore
    }
  }, [router])

  return (
    <>
      <button
        onClick={() => setIsMobileOpen(true)}
        className="fixed left-4 top-4 z-50 rounded-md bg-card p-2 shadow-md lg:hidden"
        aria-label="Open menu"
      >
        <Menu className="h-5 w-5" />
      </button>

      {isMobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 lg:hidden"
          onClick={() => setIsMobileOpen(false)}
        />
      )}

      <aside
        className={cn(
          'fixed inset-y-0 left-0 z-50 flex w-64 flex-col border-r bg-card transition-transform lg:translate-x-0',
          isMobileOpen ? 'translate-x-0' : '-translate-x-full'
        )}
      >
        {/* Header */}
        <div className="flex h-14 items-center justify-between border-b px-4">
          <Link href="/" className="flex items-center gap-2">
            <Radio className="h-5 w-5 text-gold" />
            <span className="font-bold">Command Center</span>
          </Link>
          <div className="flex items-center gap-1">
            <NotificationBell />
            <button
              onClick={() => setIsMobileOpen(false)}
              className="rounded-md p-1 hover:bg-accent lg:hidden"
              aria-label="Close menu"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto p-3">
          <ul className="space-y-1">
            {/* Overview */}
            <li>
              <Link
                href="/"
                className={cn(
                  'flex items-center gap-2 rounded-lg px-3 py-2 text-sm transition-colors',
                  pathname === '/'
                    ? 'bg-primary text-primary-foreground'
                    : 'text-muted-foreground hover:bg-accent hover:text-foreground'
                )}
              >
                <LayoutDashboard className="h-4 w-4" />
                <span>Overview</span>
              </Link>
            </li>

            {/* Profile sections */}
            <li className="pt-4">
              <span className="px-3 text-xs font-medium uppercase tracking-wider text-muted-foreground">
                Profiles
              </span>
            </li>

            {PROFILE_NAV.map((profile) => {
              const ProfileIcon = ICONS[profile.icon]
              const isExpanded = expandedProfiles.has(profile.href)
              const profileActive = isActive(profile.href)

              return (
                <li key={profile.href}>
                  <button
                    onClick={() => toggleProfile(profile.href)}
                    className={cn(
                      'flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm transition-colors',
                      profileActive
                        ? 'bg-accent text-foreground'
                        : 'text-muted-foreground hover:bg-accent hover:text-foreground'
                    )}
                  >
                    {ProfileIcon && <ProfileIcon className="h-4 w-4" />}
                    <span>{profile.label}</span>
                    {isExpanded ? (
                      <ChevronDown className="ml-auto h-4 w-4" />
                    ) : (
                      <ChevronRight className="ml-auto h-4 w-4" />
                    )}
                  </button>

                  {isExpanded && (
                    <ul className="ml-6 mt-1 space-y-1 border-l pl-2">
                      {PROFILE_TABS.map((tab) => {
                        const TabIcon = ICONS[tab.icon]
                        const tabHref = `${profile.href}${tab.href}`
                        const tabActive = tab.href === ''
                          ? pathname === profile.href
                          : pathname === tabHref || pathname.startsWith(tabHref + '/')
                        return (
                          <li key={tabHref}>
                            <Link
                              href={tabHref}
                              className={cn(
                                'flex items-center gap-2 rounded-lg px-3 py-1.5 text-sm transition-colors',
                                tabActive
                                  ? 'bg-primary text-primary-foreground'
                                  : 'text-muted-foreground hover:bg-accent hover:text-foreground'
                              )}
                            >
                              {TabIcon && <TabIcon className="h-3.5 w-3.5" />}
                              <span>{tab.label}</span>
                            </Link>
                          </li>
                        )
                      })}
                    </ul>
                  )}
                </li>
              )
            })}

            {/* Cross-profile */}
            <li className="pt-4">
              <span className="px-3 text-xs font-medium uppercase tracking-wider text-muted-foreground">
                Cross-Profile
              </span>
            </li>

            <li>
              <Link
                href="/analytics"
                className={cn(
                  'flex items-center gap-2 rounded-lg px-3 py-2 text-sm transition-colors',
                  isActive('/analytics')
                    ? 'bg-primary text-primary-foreground'
                    : 'text-muted-foreground hover:bg-accent hover:text-foreground'
                )}
              >
                <BarChart3 className="h-4 w-4" />
                <span>Analytics</span>
              </Link>
            </li>

            <li>
              <Link
                href="/parity"
                className={cn(
                  'flex items-center gap-2 rounded-lg px-3 py-2 text-sm transition-colors',
                  isActive('/parity')
                    ? 'bg-primary text-primary-foreground'
                    : 'text-muted-foreground hover:bg-accent hover:text-foreground'
                )}
              >
                <GitCompare className="h-4 w-4" />
                <span>Parity</span>
              </Link>
            </li>
          </ul>
        </nav>

        {/* User section */}
        <div className="border-t p-3">
          <div className="mb-2 px-2">
            <p className="truncate text-sm font-medium">{userName || 'Super Admin'}</p>
            <p className="truncate text-xs text-muted-foreground">{userEmail || ''}</p>
          </div>
          <Button
            variant="ghost"
            size="sm"
            className="w-full justify-start text-muted-foreground"
            onClick={handleLogout}
          >
            <LogOut className="mr-2 h-4 w-4" />
            Sign out
          </Button>
        </div>
      </aside>
    </>
  )
}
