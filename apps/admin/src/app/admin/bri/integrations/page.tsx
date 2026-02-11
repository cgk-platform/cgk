import { headers } from 'next/headers'
import Link from 'next/link'
import { Card, CardContent, CardHeader, Badge, Button } from '@cgk/ui'
import { Slack, Mail, Phone, CheckCircle2, XCircle, ExternalLink, Settings } from 'lucide-react'

import { getIntegrationStatus } from '@/lib/bri/db'

export const metadata = {
  title: 'Integrations - Bri',
  description: 'Manage Bri communication integrations',
}

export default async function IntegrationsPage() {
  const headerList = await headers()
  const tenantSlug = headerList.get('x-tenant-slug')

  if (!tenantSlug) {
    return (
      <div className="p-6">
        <div className="text-center py-12">
          <h2 className="text-lg font-medium">Tenant not found</h2>
          <p className="text-muted-foreground mt-2">Please select a tenant to continue.</p>
        </div>
      </div>
    )
  }

  const integrations = await getIntegrationStatus(tenantSlug)

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Integrations</h1>
        <p className="text-sm text-muted-foreground">Manage Bri's communication channels</p>
      </div>

      {/* Integration Cards */}
      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
        {/* Slack */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-lg bg-[#4A154B] flex items-center justify-center">
                  <Slack className="h-5 w-5 text-white" />
                </div>
                <div>
                  <h3 className="font-medium">Slack</h3>
                  <p className="text-xs text-muted-foreground">Team messaging</p>
                </div>
              </div>
              <StatusBadge
                connected={integrations.slack.connected}
                source={integrations.slack.source}
              />
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {integrations.slack.connected ? (
              <>
                {integrations.slack.teamName && (
                  <p className="text-sm">
                    Connected to <strong>{integrations.slack.teamName}</strong>
                  </p>
                )}
                <div className="flex gap-2">
                  <Link href="/admin/bri/slack-users">
                    <Button variant="outline" size="sm">
                      Manage Users
                    </Button>
                  </Link>
                  <Button variant="outline" size="sm" className="text-destructive">
                    Disconnect
                  </Button>
                </div>
              </>
            ) : (
              <>
                <p className="text-sm text-muted-foreground">
                  Connect Slack to enable team messaging, notifications, and approvals.
                </p>
                <Button>
                  <Slack className="h-4 w-4 mr-2" />
                  Connect Slack
                </Button>
              </>
            )}
          </CardContent>
        </Card>

        {/* Google */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-lg bg-white border flex items-center justify-center">
                  <svg className="h-5 w-5" viewBox="0 0 24 24">
                    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                  </svg>
                </div>
                <div>
                  <h3 className="font-medium">Google</h3>
                  <p className="text-xs text-muted-foreground">Calendar & Meet</p>
                </div>
              </div>
              <StatusBadge
                connected={integrations.google.connected}
                source={integrations.google.source}
              />
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {integrations.google.connected ? (
              <>
                {integrations.google.email && (
                  <p className="text-sm">
                    Connected as <strong>{integrations.google.email}</strong>
                  </p>
                )}
                <Button variant="outline" size="sm" className="text-destructive">
                  Disconnect
                </Button>
              </>
            ) : (
              <>
                <p className="text-sm text-muted-foreground">
                  Connect Google to enable calendar access and Google Meet integration.
                </p>
                <Button>
                  Connect Google
                </Button>
              </>
            )}
          </CardContent>
        </Card>

        {/* SMS */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-lg bg-green-500 flex items-center justify-center">
                  <Phone className="h-5 w-5 text-white" />
                </div>
                <div>
                  <h3 className="font-medium">SMS (Retell.ai)</h3>
                  <p className="text-xs text-muted-foreground">Text messaging</p>
                </div>
              </div>
              <StatusBadge
                connected={integrations.sms.configured}
                source={integrations.sms.source}
                label={integrations.sms.configured ? 'Configured' : 'Not Configured'}
              />
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {integrations.sms.configured ? (
              <>
                {integrations.sms.phoneNumber && (
                  <p className="text-sm">
                    Phone: <strong>{integrations.sms.phoneNumber}</strong>
                  </p>
                )}
                <Link href="/admin/bri/integrations/sms">
                  <Button variant="outline" size="sm">
                    <Settings className="h-4 w-4 mr-2" />
                    Configure
                  </Button>
                </Link>
              </>
            ) : (
              <>
                <p className="text-sm text-muted-foreground">
                  Configure Retell.ai for SMS outreach and creator communication.
                </p>
                <Link href="/admin/bri/integrations/sms">
                  <Button>
                    <Settings className="h-4 w-4 mr-2" />
                    Configure
                  </Button>
                </Link>
              </>
            )}
          </CardContent>
        </Card>

        {/* Email */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-lg bg-blue-500 flex items-center justify-center">
                  <Mail className="h-5 w-5 text-white" />
                </div>
                <div>
                  <h3 className="font-medium">Email (Resend)</h3>
                  <p className="text-xs text-muted-foreground">Email messaging</p>
                </div>
              </div>
              <StatusBadge
                connected={integrations.email.configured}
                source={integrations.email.source}
                label={integrations.email.configured ? 'Configured' : 'Not Configured'}
              />
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {integrations.email.configured ? (
              <>
                {integrations.email.fromEmail && (
                  <p className="text-sm">
                    From: <strong>{integrations.email.fromEmail}</strong>
                  </p>
                )}
                <Link href="/admin/bri/integrations/email">
                  <Button variant="outline" size="sm">
                    <Settings className="h-4 w-4 mr-2" />
                    Configure
                  </Button>
                </Link>
              </>
            ) : (
              <>
                <p className="text-sm text-muted-foreground">
                  Configure Resend for email outreach and notifications.
                </p>
                <Link href="/admin/bri/integrations/email">
                  <Button>
                    <Settings className="h-4 w-4 mr-2" />
                    Configure
                  </Button>
                </Link>
              </>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Info Section */}
      <Card>
        <CardHeader>
          <h3 className="text-sm font-medium">How Integrations Work</h3>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 text-sm">
            <div>
              <h4 className="font-medium mb-1">Slack</h4>
              <p className="text-muted-foreground">
                Bri uses Slack for team communication, receiving commands, sending notifications,
                and requesting approvals for high-stakes actions.
              </p>
            </div>
            <div>
              <h4 className="font-medium mb-1">Google</h4>
              <p className="text-muted-foreground">
                Google integration enables calendar access for scheduling and Google Meet
                for joining meetings and taking notes.
              </p>
            </div>
            <div>
              <h4 className="font-medium mb-1">SMS</h4>
              <p className="text-muted-foreground">
                SMS through Retell.ai allows Bri to send automated messages to creators
                for follow-ups and reminders.
              </p>
            </div>
            <div>
              <h4 className="font-medium mb-1">Email</h4>
              <p className="text-muted-foreground">
                Email through Resend enables automated email communication with creators
                and stakeholders.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

function StatusBadge({
  connected,
  source,
  label,
}: {
  connected: boolean
  source: 'database' | 'env' | null
  label?: string
}) {
  if (!connected) {
    return (
      <Badge variant="secondary" className="flex items-center gap-1">
        <XCircle className="h-3 w-3" />
        {label ?? 'Not Connected'}
      </Badge>
    )
  }

  return (
    <Badge variant="success" className="flex items-center gap-1">
      <CheckCircle2 className="h-3 w-3" />
      {label ?? 'Connected'}
      {source === 'env' && <span className="text-[10px] ml-1">(env)</span>}
    </Badge>
  )
}
