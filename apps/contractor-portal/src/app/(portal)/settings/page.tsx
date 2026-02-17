'use client'

/**
 * Contractor Settings Index Page
 *
 * Links to profile, notifications, and security settings.
 */

import Link from 'next/link'
import { Card, CardContent, CardHeader, cn } from '@cgk-platform/ui'
import {
  User,
  Bell,
  Shield,
  ChevronRight,
  Settings,
} from 'lucide-react'

const settingsSections = [
  {
    title: 'Profile',
    description: 'Update your personal information and profile details',
    href: '/settings/profile',
    icon: User,
  },
  {
    title: 'Notifications',
    description: 'Manage email and push notification preferences',
    href: '/settings/notifications',
    icon: Bell,
  },
  {
    title: 'Security',
    description: 'Change password and manage security settings',
    href: '/settings/security',
    icon: Shield,
  },
]

export default function SettingsPage() {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Settings</h1>
        <p className="text-muted-foreground">
          Manage your account settings and preferences
        </p>
      </div>

      {/* Settings Grid */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {settingsSections.map((section) => {
          const Icon = section.icon
          return (
            <Link key={section.href} href={section.href}>
              <Card
                className={cn(
                  'h-full transition-all duration-normal',
                  'hover:shadow-md hover:-translate-y-0.5 cursor-pointer'
                )}
              >
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                      <Icon className="h-5 w-5 text-primary" />
                    </div>
                    <ChevronRight className="h-5 w-5 text-muted-foreground" />
                  </div>
                </CardHeader>
                <CardContent>
                  <h2 className="font-semibold">{section.title}</h2>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {section.description}
                  </p>
                </CardContent>
              </Card>
            </Link>
          )
        })}
      </div>

      {/* Account Info */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Settings className="h-5 w-5 text-muted-foreground" />
            <h2 className="font-semibold">Account</h2>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between py-2 border-b">
            <div>
              <p className="font-medium">Account Type</p>
              <p className="text-sm text-muted-foreground">Contractor</p>
            </div>
          </div>
          <div className="flex items-center justify-between py-2 border-b">
            <div>
              <p className="font-medium">Member Since</p>
              <p className="text-sm text-muted-foreground">
                {new Date().toLocaleDateString('en-US', {
                  month: 'long',
                  year: 'numeric',
                })}
              </p>
            </div>
          </div>
          <div className="flex items-center justify-between py-2">
            <div>
              <p className="font-medium">Delete Account</p>
              <p className="text-sm text-muted-foreground">
                Permanently delete your account and all data
              </p>
            </div>
            <Link
              href="/settings/delete-account"
              className="text-sm text-destructive hover:underline"
            >
              Delete
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
