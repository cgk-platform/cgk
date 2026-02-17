'use client'

import {
  Alert,
  AlertDescription,
  Badge,
  Button,
  Card,
  CardContent,
  CardHeader,
  Input,
  Label,
  Switch,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
  Textarea,
} from '@cgk-platform/ui'
import {
  AlertTriangle,
  Bell,
  Clock,
  Globe,
  Loader2,
  Plus,
  Save,
  Shield,
  Sliders,
  Trash2,
  X,
} from 'lucide-react'
import { useCallback, useEffect, useState } from 'react'

// =============================================================================
// Types
// =============================================================================

interface IpAllowlistEntry {
  id: string
  ipAddress: string
  description: string | null
  addedBy: string | null
  addedByEmail: string | null
  isActive: boolean
  createdAt: string
}

interface SecuritySettings {
  sessionTimeoutMinutes: number
  inactivityTimeoutMinutes: number
  mfaRequired: boolean
  maxSessionsPerUser: number
  ipAllowlistEnabled: boolean
  enforceStrongPasswords: boolean
  passwordMinLength: number
  passwordRequireSpecialChars: boolean
  passwordRequireNumbers: boolean
  maxLoginAttempts: number
  lockoutDurationMinutes: number
}

interface PlatformConfig {
  defaultFeatureFlags: Record<string, boolean>
  maxTenantsPerUser: number
  maxUsersPerTenant: number
  maxApiKeysPerTenant: number
  maintenanceMode: boolean
  maintenanceMessage: string
  allowNewRegistrations: boolean
  defaultPlan: string
}

interface RateLimitConfig {
  apiRequestsPerMinute: number
  sensitiveRequestsPerMinute: number
  loginAttemptsPerHour: number
  webhookCallsPerMinute: number
  fileUploadsPerDay: number
  enableBurstMode: boolean
  burstMultiplier: number
}

interface NotificationSettings {
  slackWebhookUrl: string
  slackChannelAlerts: string
  slackChannelErrors: string
  emailAlertsEnabled: boolean
  emailAlertsRecipients: string[]
  alertOnP1: boolean
  alertOnP2: boolean
  alertOnP3: boolean
  alertOnNewTenant: boolean
  alertOnHealthDegraded: boolean
  dailyDigestEnabled: boolean
  dailyDigestTime: string
}

interface PlatformSettings {
  security: SecuritySettings
  platform: PlatformConfig
  rateLimits: RateLimitConfig
  notifications: NotificationSettings
}

// =============================================================================
// Default Values
// =============================================================================

const DEFAULT_SECURITY_SETTINGS: SecuritySettings = {
  sessionTimeoutMinutes: 240,
  inactivityTimeoutMinutes: 30,
  mfaRequired: true,
  maxSessionsPerUser: 1,
  ipAllowlistEnabled: false,
  enforceStrongPasswords: true,
  passwordMinLength: 12,
  passwordRequireSpecialChars: true,
  passwordRequireNumbers: true,
  maxLoginAttempts: 5,
  lockoutDurationMinutes: 15,
}

const DEFAULT_PLATFORM_CONFIG: PlatformConfig = {
  defaultFeatureFlags: {},
  maxTenantsPerUser: 10,
  maxUsersPerTenant: 100,
  maxApiKeysPerTenant: 20,
  maintenanceMode: false,
  maintenanceMessage: '',
  allowNewRegistrations: true,
  defaultPlan: 'starter',
}

const DEFAULT_RATE_LIMITS: RateLimitConfig = {
  apiRequestsPerMinute: 100,
  sensitiveRequestsPerMinute: 10,
  loginAttemptsPerHour: 10,
  webhookCallsPerMinute: 50,
  fileUploadsPerDay: 100,
  enableBurstMode: true,
  burstMultiplier: 2,
}

const DEFAULT_NOTIFICATIONS: NotificationSettings = {
  slackWebhookUrl: '',
  slackChannelAlerts: '#alerts',
  slackChannelErrors: '#errors',
  emailAlertsEnabled: false,
  emailAlertsRecipients: [],
  alertOnP1: true,
  alertOnP2: true,
  alertOnP3: false,
  alertOnNewTenant: true,
  alertOnHealthDegraded: true,
  dailyDigestEnabled: false,
  dailyDigestTime: '09:00',
}

// =============================================================================
// Main Component
// =============================================================================

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState('security')
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)

  // Settings state
  const [security, setSecurity] = useState<SecuritySettings>(DEFAULT_SECURITY_SETTINGS)
  const [platform, setPlatform] = useState<PlatformConfig>(DEFAULT_PLATFORM_CONFIG)
  const [rateLimits, setRateLimits] = useState<RateLimitConfig>(DEFAULT_RATE_LIMITS)
  const [notifications, setNotifications] = useState<NotificationSettings>(DEFAULT_NOTIFICATIONS)

  // IP Allowlist state
  const [ipAllowlist, setIpAllowlist] = useState<IpAllowlistEntry[]>([])
  const [newIpAddress, setNewIpAddress] = useState('')
  const [newIpDescription, setNewIpDescription] = useState('')
  const [addingIp, setAddingIp] = useState(false)

  // Fetch settings
  const fetchSettings = useCallback(async () => {
    setIsLoading(true)
    setError(null)

    try {
      const response = await fetch('/api/platform/settings')
      if (!response.ok) {
        throw new Error('Failed to fetch settings')
      }

      const data = (await response.json()) as {
        settings: PlatformSettings
        ipAllowlist: IpAllowlistEntry[]
      }

      setSecurity(data.settings.security || DEFAULT_SECURITY_SETTINGS)
      setPlatform(data.settings.platform || DEFAULT_PLATFORM_CONFIG)
      setRateLimits(data.settings.rateLimits || DEFAULT_RATE_LIMITS)
      setNotifications(data.settings.notifications || DEFAULT_NOTIFICATIONS)
      setIpAllowlist(data.ipAllowlist || [])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch settings')
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchSettings()
  }, [fetchSettings])

  // Save settings
  const handleSave = async () => {
    setIsSaving(true)
    setError(null)
    setSuccessMessage(null)

    try {
      const response = await fetch('/api/platform/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          security,
          platform,
          rateLimits,
          notifications,
        }),
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Failed to save settings')
      }

      setSuccessMessage('Settings saved successfully')
      setTimeout(() => setSuccessMessage(null), 3000)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save settings')
    } finally {
      setIsSaving(false)
    }
  }

  // Add IP to allowlist
  const handleAddIp = async () => {
    if (!newIpAddress.trim()) return

    setAddingIp(true)
    setError(null)

    try {
      const response = await fetch('/api/platform/settings/ip-allowlist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ipAddress: newIpAddress.trim(),
          description: newIpDescription.trim() || null,
        }),
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Failed to add IP')
      }

      const data = await response.json()
      setIpAllowlist([data.entry, ...ipAllowlist])
      setNewIpAddress('')
      setNewIpDescription('')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to add IP')
    } finally {
      setAddingIp(false)
    }
  }

  // Remove IP from allowlist
  const handleRemoveIp = async (id: string) => {
    try {
      const response = await fetch(`/api/platform/settings/ip-allowlist/${id}`, {
        method: 'DELETE',
      })

      if (!response.ok) {
        throw new Error('Failed to remove IP')
      }

      setIpAllowlist(ipAllowlist.filter((ip) => ip.id !== id))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to remove IP')
    }
  }

  // Toggle IP active status
  const handleToggleIp = async (id: string, isActive: boolean) => {
    try {
      const response = await fetch(`/api/platform/settings/ip-allowlist/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isActive }),
      })

      if (!response.ok) {
        throw new Error('Failed to update IP')
      }

      setIpAllowlist(
        ipAllowlist.map((ip) => (ip.id === id ? { ...ip, isActive } : ip))
      )
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update IP')
    }
  }

  // Add email recipient
  const handleAddEmailRecipient = () => {
    const email = prompt('Enter email address:')
    if (email && email.includes('@')) {
      setNotifications({
        ...notifications,
        emailAlertsRecipients: [...notifications.emailAlertsRecipients, email],
      })
    }
  }

  // Remove email recipient
  const handleRemoveEmailRecipient = (email: string) => {
    setNotifications({
      ...notifications,
      emailAlertsRecipients: notifications.emailAlertsRecipients.filter(
        (e) => e !== email
      ),
    })
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Platform Settings</h1>
          <p className="text-muted-foreground">
            Configure security, rate limits, and platform-wide settings.
          </p>
        </div>
        <Button onClick={handleSave} disabled={isSaving}>
          {isSaving ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <Save className="mr-2 h-4 w-4" />
          )}
          {isSaving ? 'Saving...' : 'Save Changes'}
        </Button>
      </div>

      {/* Alerts */}
      {error && (
        <Alert variant="error">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {successMessage && (
        <Alert variant="success">
          <AlertDescription>{successMessage}</AlertDescription>
        </Alert>
      )}

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="security" className="flex items-center gap-2">
            <Shield className="h-4 w-4" />
            Security
          </TabsTrigger>
          <TabsTrigger value="ip-allowlist" className="flex items-center gap-2">
            <Globe className="h-4 w-4" />
            IP Allowlist
          </TabsTrigger>
          <TabsTrigger value="platform" className="flex items-center gap-2">
            <Sliders className="h-4 w-4" />
            Platform
          </TabsTrigger>
          <TabsTrigger value="rate-limits" className="flex items-center gap-2">
            <Clock className="h-4 w-4" />
            Rate Limits
          </TabsTrigger>
          <TabsTrigger value="notifications" className="flex items-center gap-2">
            <Bell className="h-4 w-4" />
            Notifications
          </TabsTrigger>
        </TabsList>

        {/* Security Tab */}
        <TabsContent value="security" className="space-y-6 pt-4">
          <SecuritySettingsPanel
            settings={security}
            onChange={setSecurity}
          />
        </TabsContent>

        {/* IP Allowlist Tab */}
        <TabsContent value="ip-allowlist" className="space-y-6 pt-4">
          <IpAllowlistPanel
            entries={ipAllowlist}
            newIpAddress={newIpAddress}
            newIpDescription={newIpDescription}
            addingIp={addingIp}
            ipAllowlistEnabled={security.ipAllowlistEnabled}
            onIpAddressChange={setNewIpAddress}
            onDescriptionChange={setNewIpDescription}
            onAdd={handleAddIp}
            onRemove={handleRemoveIp}
            onToggle={handleToggleIp}
            onToggleEnabled={(enabled) =>
              setSecurity({ ...security, ipAllowlistEnabled: enabled })
            }
          />
        </TabsContent>

        {/* Platform Tab */}
        <TabsContent value="platform" className="space-y-6 pt-4">
          <PlatformConfigPanel
            config={platform}
            onChange={setPlatform}
          />
        </TabsContent>

        {/* Rate Limits Tab */}
        <TabsContent value="rate-limits" className="space-y-6 pt-4">
          <RateLimitsPanel
            config={rateLimits}
            onChange={setRateLimits}
          />
        </TabsContent>

        {/* Notifications Tab */}
        <TabsContent value="notifications" className="space-y-6 pt-4">
          <NotificationsPanel
            settings={notifications}
            onChange={setNotifications}
            onAddRecipient={handleAddEmailRecipient}
            onRemoveRecipient={handleRemoveEmailRecipient}
          />
        </TabsContent>
      </Tabs>
    </div>
  )
}

// =============================================================================
// Security Settings Panel
// =============================================================================

interface SecuritySettingsPanelProps {
  settings: SecuritySettings
  onChange: (settings: SecuritySettings) => void
}

function SecuritySettingsPanel({ settings, onChange }: SecuritySettingsPanelProps) {
  return (
    <>
      {/* Session Settings */}
      <Card>
        <CardHeader>
          <h2 className="font-semibold">Session Settings</h2>
          <p className="text-sm text-muted-foreground">
            Control session duration and limits for super admin users.
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="sessionTimeout">Session Timeout (minutes)</Label>
              <Input
                id="sessionTimeout"
                type="number"
                min="15"
                max="1440"
                value={settings.sessionTimeoutMinutes}
                onChange={(e) =>
                  onChange({ ...settings, sessionTimeoutMinutes: parseInt(e.target.value) || 240 })
                }
              />
              <p className="text-xs text-muted-foreground">
                Maximum session duration (15-1440 minutes)
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="inactivityTimeout">Inactivity Timeout (minutes)</Label>
              <Input
                id="inactivityTimeout"
                type="number"
                min="5"
                max="120"
                value={settings.inactivityTimeoutMinutes}
                onChange={(e) =>
                  onChange({ ...settings, inactivityTimeoutMinutes: parseInt(e.target.value) || 30 })
                }
              />
              <p className="text-xs text-muted-foreground">
                Auto-logout after inactivity (5-120 minutes)
              </p>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="maxSessions">Max Sessions Per User</Label>
            <Input
              id="maxSessions"
              type="number"
              min="1"
              max="10"
              value={settings.maxSessionsPerUser}
              onChange={(e) =>
                onChange({ ...settings, maxSessionsPerUser: parseInt(e.target.value) || 1 })
              }
              className="w-32"
            />
            <p className="text-xs text-muted-foreground">
              Number of concurrent sessions allowed per user
            </p>
          </div>
        </CardContent>
      </Card>

      {/* MFA Settings */}
      <Card>
        <CardHeader>
          <h2 className="font-semibold">Multi-Factor Authentication</h2>
          <p className="text-sm text-muted-foreground">
            Enforce MFA for super admin access.
          </p>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between rounded-lg border p-4">
            <div>
              <p className="font-medium">Require MFA for All Super Admins</p>
              <p className="text-sm text-muted-foreground">
                Users without MFA enabled will be prompted to set it up on next login.
              </p>
            </div>
            <Switch
              checked={settings.mfaRequired}
              onCheckedChange={(checked) => onChange({ ...settings, mfaRequired: checked })}
            />
          </div>
        </CardContent>
      </Card>

      {/* Password Policy */}
      <Card>
        <CardHeader>
          <h2 className="font-semibold">Password Policy</h2>
          <p className="text-sm text-muted-foreground">
            Configure password requirements for platform users.
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between rounded-lg border p-4">
            <div>
              <p className="font-medium">Enforce Strong Passwords</p>
              <p className="text-sm text-muted-foreground">
                Require passwords to meet complexity requirements.
              </p>
            </div>
            <Switch
              checked={settings.enforceStrongPasswords}
              onCheckedChange={(checked) =>
                onChange({ ...settings, enforceStrongPasswords: checked })
              }
            />
          </div>

          {settings.enforceStrongPasswords && (
            <div className="space-y-4 rounded-lg border p-4">
              <div className="space-y-2">
                <Label htmlFor="passwordMinLength">Minimum Password Length</Label>
                <Input
                  id="passwordMinLength"
                  type="number"
                  min="8"
                  max="64"
                  value={settings.passwordMinLength}
                  onChange={(e) =>
                    onChange({ ...settings, passwordMinLength: parseInt(e.target.value) || 12 })
                  }
                  className="w-32"
                />
              </div>

              <div className="flex items-center gap-2">
                <Switch
                  id="requireSpecialChars"
                  checked={settings.passwordRequireSpecialChars}
                  onCheckedChange={(checked) =>
                    onChange({ ...settings, passwordRequireSpecialChars: checked })
                  }
                />
                <Label htmlFor="requireSpecialChars">Require special characters</Label>
              </div>

              <div className="flex items-center gap-2">
                <Switch
                  id="requireNumbers"
                  checked={settings.passwordRequireNumbers}
                  onCheckedChange={(checked) =>
                    onChange({ ...settings, passwordRequireNumbers: checked })
                  }
                />
                <Label htmlFor="requireNumbers">Require numbers</Label>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Login Protection */}
      <Card>
        <CardHeader>
          <h2 className="font-semibold">Login Protection</h2>
          <p className="text-sm text-muted-foreground">
            Protect against brute force attacks.
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="maxLoginAttempts">Max Login Attempts</Label>
              <Input
                id="maxLoginAttempts"
                type="number"
                min="3"
                max="20"
                value={settings.maxLoginAttempts}
                onChange={(e) =>
                  onChange({ ...settings, maxLoginAttempts: parseInt(e.target.value) || 5 })
                }
              />
              <p className="text-xs text-muted-foreground">
                Failed attempts before lockout
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="lockoutDuration">Lockout Duration (minutes)</Label>
              <Input
                id="lockoutDuration"
                type="number"
                min="1"
                max="1440"
                value={settings.lockoutDurationMinutes}
                onChange={(e) =>
                  onChange({ ...settings, lockoutDurationMinutes: parseInt(e.target.value) || 15 })
                }
              />
              <p className="text-xs text-muted-foreground">
                How long accounts stay locked
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </>
  )
}

// =============================================================================
// IP Allowlist Panel
// =============================================================================

interface IpAllowlistPanelProps {
  entries: IpAllowlistEntry[]
  newIpAddress: string
  newIpDescription: string
  addingIp: boolean
  ipAllowlistEnabled: boolean
  onIpAddressChange: (value: string) => void
  onDescriptionChange: (value: string) => void
  onAdd: () => void
  onRemove: (id: string) => void
  onToggle: (id: string, isActive: boolean) => void
  onToggleEnabled: (enabled: boolean) => void
}

function IpAllowlistPanel({
  entries,
  newIpAddress,
  newIpDescription,
  addingIp,
  ipAllowlistEnabled,
  onIpAddressChange,
  onDescriptionChange,
  onAdd,
  onRemove,
  onToggle,
  onToggleEnabled,
}: IpAllowlistPanelProps) {
  return (
    <>
      {/* Enable/Disable */}
      <Card>
        <CardHeader>
          <h2 className="font-semibold">IP Allowlist</h2>
          <p className="text-sm text-muted-foreground">
            Restrict super admin access to specific IP addresses.
          </p>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between rounded-lg border p-4">
            <div>
              <p className="font-medium">Enable IP Allowlist</p>
              <p className="text-sm text-muted-foreground">
                When enabled, only listed IPs can access the orchestrator.
              </p>
            </div>
            <Switch
              checked={ipAllowlistEnabled}
              onCheckedChange={onToggleEnabled}
            />
          </div>

          {ipAllowlistEnabled && entries.length === 0 && (
            <Alert variant="warning" className="mt-4">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                IP allowlist is enabled but no IPs are listed. Add at least one IP address
                or you may lock yourself out.
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>

      {/* Add New IP */}
      <Card>
        <CardHeader>
          <h2 className="font-semibold">Add IP Address</h2>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4">
            <div className="flex-1 space-y-2">
              <Label htmlFor="ipAddress">IP Address or CIDR Block</Label>
              <Input
                id="ipAddress"
                placeholder="192.168.1.1 or 10.0.0.0/24"
                value={newIpAddress}
                onChange={(e) => onIpAddressChange(e.target.value)}
              />
            </div>
            <div className="flex-1 space-y-2">
              <Label htmlFor="ipDescription">Description (optional)</Label>
              <Input
                id="ipDescription"
                placeholder="Office network"
                value={newIpDescription}
                onChange={(e) => onDescriptionChange(e.target.value)}
              />
            </div>
            <div className="flex items-end">
              <Button onClick={onAdd} disabled={addingIp || !newIpAddress.trim()}>
                {addingIp ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Plus className="mr-2 h-4 w-4" />
                )}
                Add
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* IP List */}
      <Card>
        <CardHeader>
          <h2 className="font-semibold">Allowed IPs ({entries.length})</h2>
        </CardHeader>
        <CardContent>
          {entries.length === 0 ? (
            <p className="text-center text-muted-foreground py-4">
              No IP addresses in allowlist.
            </p>
          ) : (
            <div className="space-y-2">
              {entries.map((entry) => (
                <div
                  key={entry.id}
                  className="flex items-center justify-between rounded-lg border p-4"
                >
                  <div className="flex items-center gap-4">
                    <Switch
                      checked={entry.isActive}
                      onCheckedChange={(checked) => onToggle(entry.id, checked)}
                    />
                    <div>
                      <p className="font-mono font-medium">{entry.ipAddress}</p>
                      {entry.description && (
                        <p className="text-sm text-muted-foreground">{entry.description}</p>
                      )}
                      <p className="text-xs text-muted-foreground">
                        Added {new Date(entry.createdAt).toLocaleDateString()}
                        {entry.addedByEmail && ` by ${entry.addedByEmail}`}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant={entry.isActive ? 'default' : 'secondary'}>
                      {entry.isActive ? 'Active' : 'Inactive'}
                    </Badge>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => onRemove(entry.id)}
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </>
  )
}

// =============================================================================
// Platform Config Panel
// =============================================================================

interface PlatformConfigPanelProps {
  config: PlatformConfig
  onChange: (config: PlatformConfig) => void
}

function PlatformConfigPanel({ config, onChange }: PlatformConfigPanelProps) {
  return (
    <>
      {/* Maintenance Mode */}
      <Card>
        <CardHeader>
          <h2 className="font-semibold">Maintenance Mode</h2>
          <p className="text-sm text-muted-foreground">
            Display a maintenance message to all users.
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between rounded-lg border p-4">
            <div>
              <p className="font-medium">Enable Maintenance Mode</p>
              <p className="text-sm text-muted-foreground">
                Users will see a maintenance message instead of the normal interface.
              </p>
            </div>
            <Switch
              checked={config.maintenanceMode}
              onCheckedChange={(checked) =>
                onChange({ ...config, maintenanceMode: checked })
              }
            />
          </div>

          {config.maintenanceMode && (
            <div className="space-y-2">
              <Label htmlFor="maintenanceMessage">Maintenance Message</Label>
              <Textarea
                id="maintenanceMessage"
                placeholder="We're currently performing scheduled maintenance. Please check back soon."
                value={config.maintenanceMessage}
                onChange={(e) =>
                  onChange({ ...config, maintenanceMessage: e.target.value })
                }
                rows={3}
              />
            </div>
          )}
        </CardContent>
      </Card>

      {/* Registration */}
      <Card>
        <CardHeader>
          <h2 className="font-semibold">Registration</h2>
          <p className="text-sm text-muted-foreground">
            Control new user and tenant registration.
          </p>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between rounded-lg border p-4">
            <div>
              <p className="font-medium">Allow New Registrations</p>
              <p className="text-sm text-muted-foreground">
                When disabled, new users and tenants cannot be created.
              </p>
            </div>
            <Switch
              checked={config.allowNewRegistrations}
              onCheckedChange={(checked) =>
                onChange({ ...config, allowNewRegistrations: checked })
              }
            />
          </div>
        </CardContent>
      </Card>

      {/* Limits */}
      <Card>
        <CardHeader>
          <h2 className="font-semibold">Platform Limits</h2>
          <p className="text-sm text-muted-foreground">
            Default limits for tenants and users.
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-3">
            <div className="space-y-2">
              <Label htmlFor="maxTenantsPerUser">Max Tenants Per User</Label>
              <Input
                id="maxTenantsPerUser"
                type="number"
                min="1"
                max="100"
                value={config.maxTenantsPerUser}
                onChange={(e) =>
                  onChange({ ...config, maxTenantsPerUser: parseInt(e.target.value) || 10 })
                }
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="maxUsersPerTenant">Max Users Per Tenant</Label>
              <Input
                id="maxUsersPerTenant"
                type="number"
                min="1"
                max="10000"
                value={config.maxUsersPerTenant}
                onChange={(e) =>
                  onChange({ ...config, maxUsersPerTenant: parseInt(e.target.value) || 100 })
                }
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="maxApiKeysPerTenant">Max API Keys Per Tenant</Label>
              <Input
                id="maxApiKeysPerTenant"
                type="number"
                min="1"
                max="100"
                value={config.maxApiKeysPerTenant}
                onChange={(e) =>
                  onChange({ ...config, maxApiKeysPerTenant: parseInt(e.target.value) || 20 })
                }
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Default Plan */}
      <Card>
        <CardHeader>
          <h2 className="font-semibold">Default Settings</h2>
          <p className="text-sm text-muted-foreground">
            Default values for new tenants.
          </p>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <Label htmlFor="defaultPlan">Default Plan</Label>
            <Input
              id="defaultPlan"
              placeholder="starter"
              value={config.defaultPlan}
              onChange={(e) =>
                onChange({ ...config, defaultPlan: e.target.value })
              }
              className="max-w-xs"
            />
            <p className="text-xs text-muted-foreground">
              Plan assigned to new tenants during onboarding.
            </p>
          </div>
        </CardContent>
      </Card>
    </>
  )
}

// =============================================================================
// Rate Limits Panel
// =============================================================================

interface RateLimitsPanelProps {
  config: RateLimitConfig
  onChange: (config: RateLimitConfig) => void
}

function RateLimitsPanel({ config, onChange }: RateLimitsPanelProps) {
  return (
    <>
      {/* API Rate Limits */}
      <Card>
        <CardHeader>
          <h2 className="font-semibold">API Rate Limits</h2>
          <p className="text-sm text-muted-foreground">
            Control request rates to prevent abuse.
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="apiRequestsPerMinute">API Requests Per Minute</Label>
              <Input
                id="apiRequestsPerMinute"
                type="number"
                min="10"
                max="10000"
                value={config.apiRequestsPerMinute}
                onChange={(e) =>
                  onChange({ ...config, apiRequestsPerMinute: parseInt(e.target.value) || 100 })
                }
              />
              <p className="text-xs text-muted-foreground">
                General API request limit per user
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="sensitiveRequestsPerMinute">Sensitive Requests Per Minute</Label>
              <Input
                id="sensitiveRequestsPerMinute"
                type="number"
                min="1"
                max="100"
                value={config.sensitiveRequestsPerMinute}
                onChange={(e) =>
                  onChange({ ...config, sensitiveRequestsPerMinute: parseInt(e.target.value) || 10 })
                }
              />
              <p className="text-xs text-muted-foreground">
                For operations like impersonation, config changes
              </p>
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="loginAttemptsPerHour">Login Attempts Per Hour</Label>
              <Input
                id="loginAttemptsPerHour"
                type="number"
                min="3"
                max="100"
                value={config.loginAttemptsPerHour}
                onChange={(e) =>
                  onChange({ ...config, loginAttemptsPerHour: parseInt(e.target.value) || 10 })
                }
              />
              <p className="text-xs text-muted-foreground">
                Per IP address
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="webhookCallsPerMinute">Webhook Calls Per Minute</Label>
              <Input
                id="webhookCallsPerMinute"
                type="number"
                min="10"
                max="1000"
                value={config.webhookCallsPerMinute}
                onChange={(e) =>
                  onChange({ ...config, webhookCallsPerMinute: parseInt(e.target.value) || 50 })
                }
              />
              <p className="text-xs text-muted-foreground">
                Outgoing webhook delivery rate
              </p>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="fileUploadsPerDay">File Uploads Per Day</Label>
            <Input
              id="fileUploadsPerDay"
              type="number"
              min="10"
              max="10000"
              value={config.fileUploadsPerDay}
              onChange={(e) =>
                onChange({ ...config, fileUploadsPerDay: parseInt(e.target.value) || 100 })
              }
              className="max-w-xs"
            />
            <p className="text-xs text-muted-foreground">
              Per tenant per day
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Burst Mode */}
      <Card>
        <CardHeader>
          <h2 className="font-semibold">Burst Mode</h2>
          <p className="text-sm text-muted-foreground">
            Allow temporary exceeding of rate limits.
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between rounded-lg border p-4">
            <div>
              <p className="font-medium">Enable Burst Mode</p>
              <p className="text-sm text-muted-foreground">
                Allow short bursts of traffic above normal limits.
              </p>
            </div>
            <Switch
              checked={config.enableBurstMode}
              onCheckedChange={(checked) =>
                onChange({ ...config, enableBurstMode: checked })
              }
            />
          </div>

          {config.enableBurstMode && (
            <div className="space-y-2">
              <Label htmlFor="burstMultiplier">Burst Multiplier</Label>
              <Input
                id="burstMultiplier"
                type="number"
                min="1.5"
                max="10"
                step="0.5"
                value={config.burstMultiplier}
                onChange={(e) =>
                  onChange({ ...config, burstMultiplier: parseFloat(e.target.value) || 2 })
                }
                className="max-w-xs"
              />
              <p className="text-xs text-muted-foreground">
                Multiplier applied during burst period (e.g., 2x = 200 req/min burst)
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </>
  )
}

// =============================================================================
// Notifications Panel
// =============================================================================

interface NotificationsPanelProps {
  settings: NotificationSettings
  onChange: (settings: NotificationSettings) => void
  onAddRecipient: () => void
  onRemoveRecipient: (email: string) => void
}

function NotificationsPanel({
  settings,
  onChange,
  onAddRecipient,
  onRemoveRecipient,
}: NotificationsPanelProps) {
  return (
    <>
      {/* Slack Integration */}
      <Card>
        <CardHeader>
          <h2 className="font-semibold">Slack Integration</h2>
          <p className="text-sm text-muted-foreground">
            Send alerts and notifications to Slack channels.
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="slackWebhookUrl">Slack Webhook URL</Label>
            <Input
              id="slackWebhookUrl"
              type="url"
              placeholder="https://hooks.slack.com/services/..."
              value={settings.slackWebhookUrl}
              onChange={(e) =>
                onChange({ ...settings, slackWebhookUrl: e.target.value })
              }
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="slackChannelAlerts">Alerts Channel</Label>
              <Input
                id="slackChannelAlerts"
                placeholder="#alerts"
                value={settings.slackChannelAlerts}
                onChange={(e) =>
                  onChange({ ...settings, slackChannelAlerts: e.target.value })
                }
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="slackChannelErrors">Errors Channel</Label>
              <Input
                id="slackChannelErrors"
                placeholder="#errors"
                value={settings.slackChannelErrors}
                onChange={(e) =>
                  onChange({ ...settings, slackChannelErrors: e.target.value })
                }
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Email Alerts */}
      <Card>
        <CardHeader>
          <h2 className="font-semibold">Email Alerts</h2>
          <p className="text-sm text-muted-foreground">
            Send alerts via email to specified recipients.
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between rounded-lg border p-4">
            <div>
              <p className="font-medium">Enable Email Alerts</p>
              <p className="text-sm text-muted-foreground">
                Send critical alerts to email recipients.
              </p>
            </div>
            <Switch
              checked={settings.emailAlertsEnabled}
              onCheckedChange={(checked) =>
                onChange({ ...settings, emailAlertsEnabled: checked })
              }
            />
          </div>

          {settings.emailAlertsEnabled && (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>Email Recipients</Label>
                <Button variant="outline" size="sm" onClick={onAddRecipient}>
                  <Plus className="mr-2 h-3 w-3" />
                  Add Recipient
                </Button>
              </div>
              {settings.emailAlertsRecipients.length === 0 ? (
                <p className="text-sm text-muted-foreground">No recipients configured.</p>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {settings.emailAlertsRecipients.map((email) => (
                    <Badge key={email} variant="secondary" className="gap-1">
                      {email}
                      <button
                        onClick={() => onRemoveRecipient(email)}
                        className="ml-1 hover:text-destructive"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </Badge>
                  ))}
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Alert Triggers */}
      <Card>
        <CardHeader>
          <h2 className="font-semibold">Alert Triggers</h2>
          <p className="text-sm text-muted-foreground">
            Configure which events trigger notifications.
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-3">
            <div className="flex items-center gap-2">
              <Switch
                id="alertOnP1"
                checked={settings.alertOnP1}
                onCheckedChange={(checked) =>
                  onChange({ ...settings, alertOnP1: checked })
                }
              />
              <Label htmlFor="alertOnP1">P1 (Critical) Alerts</Label>
            </div>

            <div className="flex items-center gap-2">
              <Switch
                id="alertOnP2"
                checked={settings.alertOnP2}
                onCheckedChange={(checked) =>
                  onChange({ ...settings, alertOnP2: checked })
                }
              />
              <Label htmlFor="alertOnP2">P2 (High) Alerts</Label>
            </div>

            <div className="flex items-center gap-2">
              <Switch
                id="alertOnP3"
                checked={settings.alertOnP3}
                onCheckedChange={(checked) =>
                  onChange({ ...settings, alertOnP3: checked })
                }
              />
              <Label htmlFor="alertOnP3">P3 (Medium) Alerts</Label>
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="flex items-center gap-2">
              <Switch
                id="alertOnNewTenant"
                checked={settings.alertOnNewTenant}
                onCheckedChange={(checked) =>
                  onChange({ ...settings, alertOnNewTenant: checked })
                }
              />
              <Label htmlFor="alertOnNewTenant">New Tenant Created</Label>
            </div>

            <div className="flex items-center gap-2">
              <Switch
                id="alertOnHealthDegraded"
                checked={settings.alertOnHealthDegraded}
                onCheckedChange={(checked) =>
                  onChange({ ...settings, alertOnHealthDegraded: checked })
                }
              />
              <Label htmlFor="alertOnHealthDegraded">Health Degraded</Label>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Daily Digest */}
      <Card>
        <CardHeader>
          <h2 className="font-semibold">Daily Digest</h2>
          <p className="text-sm text-muted-foreground">
            Receive a daily summary of platform activity.
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between rounded-lg border p-4">
            <div>
              <p className="font-medium">Enable Daily Digest</p>
              <p className="text-sm text-muted-foreground">
                Receive a daily summary email with key metrics.
              </p>
            </div>
            <Switch
              checked={settings.dailyDigestEnabled}
              onCheckedChange={(checked) =>
                onChange({ ...settings, dailyDigestEnabled: checked })
              }
            />
          </div>

          {settings.dailyDigestEnabled && (
            <div className="space-y-2">
              <Label htmlFor="dailyDigestTime">Delivery Time (UTC)</Label>
              <Input
                id="dailyDigestTime"
                type="time"
                value={settings.dailyDigestTime}
                onChange={(e) =>
                  onChange({ ...settings, dailyDigestTime: e.target.value })
                }
                className="max-w-xs"
              />
            </div>
          )}
        </CardContent>
      </Card>
    </>
  )
}
