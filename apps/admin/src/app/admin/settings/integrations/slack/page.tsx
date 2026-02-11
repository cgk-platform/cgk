'use client'

import { useState, useEffect } from 'react'
import { useSearchParams } from 'next/navigation'
import { Card, CardContent, Button, Badge, Alert } from '@cgk/ui'

interface SlackWorkspace {
  workspaceName: string | null
  isConnected: boolean
  connectedAt?: string
}

interface ConnectionTestResult {
  success: boolean
  workspaceName?: string
  botValid: boolean
  userValid: boolean
  canPostToChannel: boolean
  canListChannels: boolean
  error?: string
}

export default function SlackIntegrationPage() {
  const searchParams = useSearchParams()
  const [workspace, setWorkspace] = useState<SlackWorkspace | null>(null)
  const [loading, setLoading] = useState(true)
  const [connecting, setConnecting] = useState(false)
  const [testing, setTesting] = useState(false)
  const [testResult, setTestResult] = useState<ConnectionTestResult | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  // Check for URL params from OAuth callback
  useEffect(() => {
    const slackConnected = searchParams.get('slack_connected')
    const slackError = searchParams.get('slack_error')

    if (slackConnected === 'true') {
      setSuccess('Slack workspace connected successfully!')
    } else if (slackError) {
      setError(`Failed to connect Slack: ${slackError}`)
    }
  }, [searchParams])

  // Fetch current connection status
  useEffect(() => {
    fetchWorkspaceStatus()
  }, [])

  async function fetchWorkspaceStatus() {
    try {
      const res = await fetch('/api/admin/integrations/slack/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      })
      const data = await res.json()

      if (data.success) {
        setWorkspace({
          workspaceName: data.workspaceName,
          isConnected: true,
        })
      } else {
        setWorkspace({ workspaceName: null, isConnected: false })
      }
    } catch {
      setWorkspace({ workspaceName: null, isConnected: false })
    } finally {
      setLoading(false)
    }
  }

  async function handleConnect() {
    setConnecting(true)
    setError(null)

    try {
      const res = await fetch('/api/admin/integrations/slack/connect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      })
      const data = await res.json()

      if (data.authUrl) {
        // Redirect to Slack OAuth
        window.location.href = data.authUrl
      } else {
        setError('Failed to initiate Slack connection')
      }
    } catch {
      setError('Failed to connect to Slack')
    } finally {
      setConnecting(false)
    }
  }

  async function handleDisconnect() {
    if (!confirm('Are you sure you want to disconnect Slack? Scheduled notifications will be paused.')) {
      return
    }

    try {
      const res = await fetch('/api/admin/integrations/slack/disconnect', {
        method: 'DELETE',
      })

      if (res.ok) {
        setWorkspace({ workspaceName: null, isConnected: false })
        setSuccess('Slack disconnected successfully')
        setTestResult(null)
      } else {
        setError('Failed to disconnect Slack')
      }
    } catch {
      setError('Failed to disconnect Slack')
    }
  }

  async function handleTest() {
    setTesting(true)
    setTestResult(null)

    try {
      const res = await fetch('/api/admin/integrations/slack/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      })
      const data = await res.json()
      setTestResult(data)
    } catch {
      setTestResult({
        success: false,
        botValid: false,
        userValid: false,
        canPostToChannel: false,
        canListChannels: false,
        error: 'Connection test failed',
      })
    } finally {
      setTesting(false)
    }
  }

  if (loading) {
    return (
      <div className="space-y-4">
        <h2 className="text-lg font-semibold">Slack Integration</h2>
        <Card>
          <CardContent className="p-6">
            <div className="animate-pulse flex space-x-4">
              <div className="h-12 w-12 rounded-full bg-muted" />
              <div className="flex-1 space-y-2">
                <div className="h-4 w-1/3 bg-muted rounded" />
                <div className="h-4 w-1/2 bg-muted rounded" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">Slack Integration</h2>
        {workspace?.isConnected && (
          <Badge variant="default">Connected</Badge>
        )}
      </div>

      {error && (
        <Alert variant="destructive">
          <p>{error}</p>
        </Alert>
      )}

      {success && (
        <Alert>
          <p>{success}</p>
        </Alert>
      )}

      <Card>
        <CardContent className="p-6">
          {workspace?.isConnected ? (
            <div className="space-y-4">
              <div className="flex items-center gap-4">
                <div className="h-12 w-12 rounded-full bg-[#4A154B] flex items-center justify-center">
                  <svg className="h-6 w-6 text-white" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M5.042 15.165a2.528 2.528 0 0 1-2.52 2.523A2.528 2.528 0 0 1 0 15.165a2.527 2.527 0 0 1 2.522-2.52h2.52v2.52zM6.313 15.165a2.527 2.527 0 0 1 2.521-2.52 2.527 2.527 0 0 1 2.521 2.52v6.313A2.528 2.528 0 0 1 8.834 24a2.528 2.528 0 0 1-2.521-2.522v-6.313zM8.834 5.042a2.528 2.528 0 0 1-2.521-2.52A2.528 2.528 0 0 1 8.834 0a2.528 2.528 0 0 1 2.521 2.522v2.52H8.834zM8.834 6.313a2.528 2.528 0 0 1 2.521 2.521 2.528 2.528 0 0 1-2.521 2.521H2.522A2.528 2.528 0 0 1 0 8.834a2.528 2.528 0 0 1 2.522-2.521h6.312zM18.956 8.834a2.528 2.528 0 0 1 2.522-2.521A2.528 2.528 0 0 1 24 8.834a2.528 2.528 0 0 1-2.522 2.521h-2.522V8.834zM17.688 8.834a2.528 2.528 0 0 1-2.523 2.521 2.527 2.527 0 0 1-2.52-2.521V2.522A2.527 2.527 0 0 1 15.165 0a2.528 2.528 0 0 1 2.523 2.522v6.312zM15.165 18.956a2.528 2.528 0 0 1 2.523 2.522A2.528 2.528 0 0 1 15.165 24a2.527 2.527 0 0 1-2.52-2.522v-2.522h2.52zM15.165 17.688a2.527 2.527 0 0 1-2.52-2.523 2.526 2.526 0 0 1 2.52-2.52h6.313A2.527 2.527 0 0 1 24 15.165a2.528 2.528 0 0 1-2.522 2.523h-6.313z"/>
                  </svg>
                </div>
                <div>
                  <p className="font-medium">{workspace.workspaceName || 'Connected Workspace'}</p>
                  <p className="text-sm text-muted-foreground">Slack workspace is connected</p>
                </div>
              </div>

              <div className="flex gap-2">
                <Button
                  variant="outline"
                  onClick={handleTest}
                  disabled={testing}
                >
                  {testing ? 'Testing...' : 'Test Connection'}
                </Button>
                <Button
                  variant="outline"
                  onClick={handleDisconnect}
                >
                  Disconnect
                </Button>
              </div>

              {testResult && (
                <div className="mt-4 p-4 rounded-lg border space-y-2">
                  <p className="font-medium">Connection Test Results</p>
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div className="flex items-center gap-2">
                      <span className={testResult.botValid ? 'text-green-600' : 'text-red-600'}>
                        {testResult.botValid ? 'Valid' : 'Invalid'}
                      </span>
                      <span className="text-muted-foreground">Bot Token</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={testResult.userValid ? 'text-green-600' : 'text-yellow-600'}>
                        {testResult.userValid ? 'Valid' : 'Not configured'}
                      </span>
                      <span className="text-muted-foreground">User Token</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={testResult.canListChannels ? 'text-green-600' : 'text-red-600'}>
                        {testResult.canListChannels ? 'Yes' : 'No'}
                      </span>
                      <span className="text-muted-foreground">Can List Channels</span>
                    </div>
                  </div>
                  {testResult.error && (
                    <p className="text-sm text-red-600 mt-2">{testResult.error}</p>
                  )}
                </div>
              )}

              <div className="mt-6 pt-6 border-t">
                <p className="text-sm text-muted-foreground">
                  Configure notification channels in{' '}
                  <a href="/admin/settings/notifications/slack" className="text-primary underline">
                    Notification Settings
                  </a>
                </p>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <p className="text-muted-foreground">
                Connect your Slack workspace to receive real-time notifications about orders,
                creators, reviews, and more.
              </p>
              <Button onClick={handleConnect} disabled={connecting}>
                {connecting ? 'Connecting...' : 'Connect Slack Workspace'}
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
