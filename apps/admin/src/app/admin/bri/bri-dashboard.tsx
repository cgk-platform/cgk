'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Badge, Card, CardContent, CardHeader, Switch } from '@cgk-platform/ui'
import {
  Bot,
  MessageSquare,
  Zap,
  Wrench,
  Clock,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Settings,
  MessageCircle,
  Lightbulb,
  Brain,
  Mic,
  Link2,
  Users,
  Bell,
  CalendarClock,
  ArrowRight,
  Slack,
  Mail,
  Phone,
} from 'lucide-react'

import type { BriSettings, BriStats, BriAction, IntegrationStatus } from '@/lib/bri/types'

interface BriDashboardProps {
  tenantSlug: string
  initialSettings: BriSettings | null
  stats: BriStats
  recentActions: BriAction[]
  integrations: IntegrationStatus
}

const DEFAULT_SETTINGS: BriSettings = {
  id: '',
  isEnabled: true,
  respondToAllDms: true,
  requireApprovalForActions: false,
  messagesPerUserPerHour: 10,
  dailyStandupChannel: null,
  creatorOpsChannel: null,
  escalationChannel: null,
  aiModel: 'claude-sonnet-4-20250514',
  aiTemperature: 0.7,
  aiMaxTokens: 4096,
  responseStyle: 'balanced',
  enableSmsOutreach: false,
  enableEmailOutreach: false,
}

const AI_MODELS = [
  { id: 'claude-sonnet-4-20250514', name: 'Claude Sonnet 4' },
  { id: 'claude-opus-4-20250514', name: 'Claude Opus 4' },
  { id: 'claude-3-5-sonnet-20241022', name: 'Claude 3.5 Sonnet' },
]

const QUICK_LINKS = [
  { href: '/admin/bri/conversations', label: 'Conversations', icon: MessageCircle, description: 'View chat history' },
  { href: '/admin/bri/action-log', label: 'Action Log', icon: Zap, description: 'Review all actions' },
  { href: '/admin/bri/creative-ideas', label: 'Creative Ideas', icon: Lightbulb, description: 'Manage content hooks' },
  { href: '/admin/bri/autonomy', label: 'Autonomy', icon: Brain, description: 'Control permissions' },
  { href: '/admin/bri/voice', label: 'Voice', icon: Mic, description: 'TTS/STT settings' },
  { href: '/admin/bri/integrations', label: 'Integrations', icon: Link2, description: 'Connect services' },
  { href: '/admin/bri/team-memories', label: 'Team Memories', icon: Users, description: 'Knowledge base' },
  { href: '/admin/bri/team-defaults', label: 'Team Defaults', icon: Settings, description: 'Default assignments' },
  { href: '/admin/bri/notifications', label: 'Notifications', icon: Bell, description: 'Event alerts' },
  { href: '/admin/bri/followups', label: 'Follow-ups', icon: CalendarClock, description: 'Timing & escalation' },
]

export function BriDashboard({
  initialSettings,
  stats,
  recentActions,
  integrations,
}: BriDashboardProps) {
  const [settings, setSettings] = useState<BriSettings>(initialSettings ?? DEFAULT_SETTINGS)
  const [saving, setSaving] = useState(false)

  const saveSettings = async (newSettings: Partial<BriSettings>) => {
    setSaving(true)
    try {
      const response = await fetch('/api/admin/bri/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...settings, ...newSettings }),
      })
      if (response.ok) {
        const data = await response.json()
        setSettings(data.settings)
      }
    } catch (error) {
      console.error('Failed to save settings:', error)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-violet-500 to-purple-600 text-white shadow-lg">
            <Bot className="h-6 w-6" />
          </div>
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">Bri</h1>
            <p className="text-sm text-muted-foreground">AI Agent Dashboard</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-sm text-muted-foreground">
            {settings.isEnabled ? 'Active' : 'Disabled'}
          </span>
          <Switch
            checked={settings.isEnabled}
            onCheckedChange={(checked) => saveSettings({ isEnabled: checked })}
            disabled={saving}
          />
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Total Conversations"
          value={stats.totalConversations.toLocaleString()}
          icon={<MessageSquare className="h-5 w-5" />}
          trend={`${stats.activeConversations24h} active (24h)`}
          color="blue"
        />
        <StatCard
          title="Active (24h)"
          value={stats.activeConversations24h.toLocaleString()}
          icon={<Clock className="h-5 w-5" />}
          trend="Conversations today"
          color="green"
        />
        <StatCard
          title="Messages (24h)"
          value={stats.messages24h.toLocaleString()}
          icon={<MessageCircle className="h-5 w-5" />}
          trend="Across all conversations"
          color="purple"
        />
        <StatCard
          title="Most Used Tool"
          value={stats.mostUsedTool ?? 'N/A'}
          icon={<Wrench className="h-5 w-5" />}
          trend={stats.toolUsage[0]?.count ? `${stats.toolUsage[0].count} uses` : 'No data'}
          color="orange"
        />
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Left Column - Tools & Actions */}
        <div className="space-y-6 lg:col-span-2">
          {/* Top Tools */}
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-medium">Top Tools (7 days)</h3>
                <Wrench className="h-4 w-4 text-muted-foreground" />
              </div>
            </CardHeader>
            <CardContent>
              {stats.toolUsage.length === 0 ? (
                <p className="text-sm text-muted-foreground">No tool usage data yet</p>
              ) : (
                <div className="space-y-3">
                  {stats.toolUsage.slice(0, 10).map((tool, i) => (
                    <div key={tool.tool} className="flex items-center gap-3">
                      <span className="text-xs font-medium text-muted-foreground w-4">{i + 1}</span>
                      <div className="flex-1">
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-sm font-medium">{tool.tool}</span>
                          <span className="text-xs text-muted-foreground">{tool.count}</span>
                        </div>
                        <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                          <div
                            className="h-full bg-gradient-to-r from-violet-500 to-purple-500 rounded-full transition-all"
                            style={{
                              width: `${(tool.count / (stats.toolUsage[0]?.count ?? 1)) * 100}%`,
                            }}
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Recent Actions */}
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-medium">Recent Actions</h3>
                <Link
                  href="/admin/bri/action-log"
                  className="text-xs text-primary hover:underline flex items-center gap-1"
                >
                  View all <ArrowRight className="h-3 w-3" />
                </Link>
              </div>
            </CardHeader>
            <CardContent>
              {recentActions.length === 0 ? (
                <p className="text-sm text-muted-foreground">No actions recorded yet</p>
              ) : (
                <div className="space-y-3">
                  {recentActions.map((action) => (
                    <div
                      key={action.id}
                      className="flex items-start gap-3 p-3 rounded-lg bg-muted/50 hover:bg-muted transition-colors"
                    >
                      <ActionStatusIcon status={action.success} approvalStatus={action.approvalStatus} />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-sm font-medium truncate">
                            {action.actionDescription}
                          </span>
                          {action.actionCategory && (
                            <CategoryBadge category={action.actionCategory} />
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground">
                          {action.actionType} - {new Date(action.createdAt).toLocaleString()}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Right Column - Config & Integrations */}
        <div className="space-y-6">
          {/* Integration Status */}
          <Card>
            <CardHeader className="pb-3">
              <h3 className="text-sm font-medium">Integrations</h3>
            </CardHeader>
            <CardContent className="space-y-3">
              <IntegrationRow
                name="Slack"
                icon={<Slack className="h-4 w-4" />}
                connected={integrations.slack.connected}
                detail={integrations.slack.teamName}
              />
              <IntegrationRow
                name="Google"
                icon={<Mail className="h-4 w-4" />}
                connected={integrations.google.connected}
                detail={integrations.google.email}
              />
              <IntegrationRow
                name="SMS"
                icon={<Phone className="h-4 w-4" />}
                connected={integrations.sms.configured}
                detail={integrations.sms.phoneNumber}
              />
              <IntegrationRow
                name="Email"
                icon={<Mail className="h-4 w-4" />}
                connected={integrations.email.configured}
                detail={integrations.email.fromEmail}
              />
              <Link
                href="/admin/bri/integrations"
                className="block text-center text-xs text-primary hover:underline pt-2"
              >
                Manage integrations
              </Link>
            </CardContent>
          </Card>

          {/* Outreach Toggles */}
          <Card>
            <CardHeader className="pb-3">
              <h3 className="text-sm font-medium">Automated Outreach</h3>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Phone className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm">SMS Outreach</span>
                </div>
                <Switch
                  checked={settings.enableSmsOutreach}
                  onCheckedChange={(checked) => saveSettings({ enableSmsOutreach: checked })}
                  disabled={saving || !integrations.sms.configured}
                />
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Mail className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm">Email Outreach</span>
                </div>
                <Switch
                  checked={settings.enableEmailOutreach}
                  onCheckedChange={(checked) => saveSettings({ enableEmailOutreach: checked })}
                  disabled={saving || !integrations.email.configured}
                />
              </div>
            </CardContent>
          </Card>

          {/* AI Configuration */}
          <Card>
            <CardHeader className="pb-3">
              <h3 className="text-sm font-medium">AI Configuration</h3>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="text-xs text-muted-foreground">Model</label>
                <select
                  value={settings.aiModel}
                  onChange={(e) => saveSettings({ aiModel: e.target.value })}
                  className="mt-1 w-full rounded-md border bg-background px-3 py-2 text-sm"
                  disabled={saving}
                >
                  {AI_MODELS.map((model) => (
                    <option key={model.id} value={model.id}>
                      {model.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-xs text-muted-foreground">
                  Temperature: {settings.aiTemperature}
                </label>
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.1"
                  value={settings.aiTemperature}
                  onChange={(e) => saveSettings({ aiTemperature: parseFloat(e.target.value) })}
                  className="mt-1 w-full"
                  disabled={saving}
                />
              </div>
              <div>
                <label className="text-xs text-muted-foreground">Max Tokens</label>
                <select
                  value={settings.aiMaxTokens}
                  onChange={(e) => saveSettings({ aiMaxTokens: parseInt(e.target.value) })}
                  className="mt-1 w-full rounded-md border bg-background px-3 py-2 text-sm"
                  disabled={saving}
                >
                  <option value={512}>512</option>
                  <option value={1024}>1024</option>
                  <option value={2048}>2048</option>
                  <option value={4096}>4096</option>
                </select>
              </div>
              <div>
                <label className="text-xs text-muted-foreground">Response Style</label>
                <select
                  value={settings.responseStyle}
                  onChange={(e) =>
                    saveSettings({ responseStyle: e.target.value as BriSettings['responseStyle'] })
                  }
                  className="mt-1 w-full rounded-md border bg-background px-3 py-2 text-sm"
                  disabled={saving}
                >
                  <option value="concise">Concise</option>
                  <option value="balanced">Balanced</option>
                  <option value="detailed">Detailed</option>
                </select>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Quick Links Grid */}
      <div>
        <h3 className="text-sm font-medium mb-4">Quick Links</h3>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-5">
          {QUICK_LINKS.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="group flex flex-col items-center gap-2 rounded-xl border bg-card p-4 text-center transition-all hover:border-primary/50 hover:shadow-md"
            >
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-muted text-muted-foreground group-hover:bg-primary/10 group-hover:text-primary transition-colors">
                <link.icon className="h-5 w-5" />
              </div>
              <span className="text-sm font-medium">{link.label}</span>
              <span className="text-xs text-muted-foreground">{link.description}</span>
            </Link>
          ))}
        </div>
      </div>
    </div>
  )
}

function StatCard({
  title,
  value,
  icon,
  trend,
  color,
}: {
  title: string
  value: string
  icon: React.ReactNode
  trend: string
  color: 'blue' | 'green' | 'purple' | 'orange'
}) {
  const colorClasses = {
    blue: 'text-blue-500 bg-blue-500/10',
    green: 'text-green-500 bg-green-500/10',
    purple: 'text-purple-500 bg-purple-500/10',
    orange: 'text-orange-500 bg-orange-500/10',
  }

  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm text-muted-foreground">{title}</span>
          <div className={`rounded-lg p-2 ${colorClasses[color]}`}>{icon}</div>
        </div>
        <div className="text-2xl font-semibold">{value}</div>
        <div className="text-xs text-muted-foreground mt-1">{trend}</div>
      </CardContent>
    </Card>
  )
}

function ActionStatusIcon({
  status,
  approvalStatus,
}: {
  status: boolean
  approvalStatus: string | null
}) {
  if (approvalStatus === 'pending') {
    return <AlertCircle className="h-5 w-5 text-yellow-500 shrink-0" />
  }
  if (approvalStatus === 'rejected' || !status) {
    return <XCircle className="h-5 w-5 text-red-500 shrink-0" />
  }
  return <CheckCircle2 className="h-5 w-5 text-green-500 shrink-0" />
}

function CategoryBadge({ category }: { category: string }) {
  const colors: Record<string, 'info' | 'secondary' | 'warning' | 'destructive' | 'success'> = {
    communication: 'info',
    lookup: 'secondary',
    modification: 'warning',
    escalation: 'destructive',
    creative: 'success',
  }

  return (
    <Badge variant={colors[category] ?? 'secondary'} className="text-[10px] px-1.5">
      {category}
    </Badge>
  )
}

function IntegrationRow({
  name,
  icon,
  connected,
  detail,
}: {
  name: string
  icon: React.ReactNode
  connected: boolean
  detail?: string
}) {
  return (
    <div className="flex items-center justify-between py-2 border-b last:border-0">
      <div className="flex items-center gap-2">
        <div className="text-muted-foreground">{icon}</div>
        <span className="text-sm">{name}</span>
      </div>
      <div className="flex items-center gap-2">
        {detail && <span className="text-xs text-muted-foreground truncate max-w-[100px]">{detail}</span>}
        <div
          className={`h-2 w-2 rounded-full ${connected ? 'bg-green-500' : 'bg-gray-300'}`}
        />
      </div>
    </div>
  )
}
