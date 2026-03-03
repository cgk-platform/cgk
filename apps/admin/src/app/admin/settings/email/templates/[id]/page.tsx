'use client'

import { Badge, Button, Card, CardContent, CardHeader, Input, Label, Textarea } from '@cgk-platform/ui'
import { cn } from '@cgk-platform/ui'
import Link from 'next/link'
import { useParams, useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'

interface EmailTemplate {
  id: string
  notificationType: string
  templateKey: string
  category: 'transactional' | 'marketing'
  name: string
  description: string | null
  subject: string
  bodyHtml: string
  bodyText: string | null
  senderEmail: string | null
  senderName: string | null
  replyToEmail: string | null
  isActive: boolean
  isDefault: boolean
  version: number
  lastEditedAt: string | null
  createdAt: string
  updatedAt: string
}

interface TemplateVariable {
  key: string
  description: string
  example: string
  type: string
  required?: boolean
}

interface TemplateVersion {
  id: string
  version: number
  subject: string
  changeNote: string | null
  createdAt: string
}

type PreviewMode = 'html' | 'text'
type ViewportMode = 'desktop' | 'mobile'

export default function TemplateEditorPage() {
  const params = useParams()
  const router = useRouter()
  void router // Router available for future navigation needs
  const templateId = params.id as string

  const [template, setTemplate] = useState<EmailTemplate | null>(null)
  const [variables, setVariables] = useState<TemplateVariable[]>([])
  const [versions, setVersions] = useState<TemplateVersion[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)

  // Editor state
  const [subject, setSubject] = useState('')
  const [bodyHtml, setBodyHtml] = useState('')
  const [isActive, setIsActive] = useState(true)
  const [changeNote, setChangeNote] = useState('')

  // Preview state
  const [preview, setPreview] = useState<{ subject: string; bodyHtml: string; bodyText: string } | null>(null)
  const [previewMode, setPreviewMode] = useState<PreviewMode>('html')
  const [viewportMode, setViewportMode] = useState<ViewportMode>('desktop')
  const [showVersions, setShowVersions] = useState(false)

  // Test send state
  const [showTestModal, setShowTestModal] = useState(false)
  const [testEmail, setTestEmail] = useState('')
  const [sendingTest, setSendingTest] = useState(false)

  const fetchVariables = async (notificationType: string) => {
    try {
      const response = await fetch(`/api/admin/settings/email/templates/variables?notificationType=${notificationType}`)
      const data = await response.json()

      if (response.ok) {
        setVariables(data.variables || [])
      }
    } catch (err) {
      console.error('Failed to fetch variables:', err)
    }
  }

  const fetchVersions = async (id: string) => {
    try {
      const response = await fetch(`/api/admin/settings/email/templates/${id}/versions`)
      const data = await response.json()

      if (response.ok) {
        setVersions(data.versions || [])
      }
    } catch (err) {
      console.error('Failed to fetch versions:', err)
    }
  }

  const fetchPreview = async (id: string) => {
    try {
      const response = await fetch(`/api/admin/settings/email/templates/${id}/preview`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ useSampleData: true }),
      })
      const data = await response.json()

      if (response.ok) {
        setPreview(data.preview)
      }
    } catch (err) {
      console.error('Failed to fetch preview:', err)
    }
  }

  useEffect(() => {
    const fetchTemplate = async () => {
      setLoading(true)
      try {
        const response = await fetch(`/api/admin/settings/email/templates/${templateId}`)
        const data = await response.json()

        if (!response.ok) {
          throw new Error(data.error || 'Failed to fetch template')
        }

        setTemplate(data.template)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to fetch template')
      } finally {
        setLoading(false)
      }
    }

    fetchTemplate()
    fetchVariables('')
    fetchVersions(templateId)
  }, [templateId])

  useEffect(() => {
    if (template) {
      setSubject(template.subject)
      setBodyHtml(template.bodyHtml)
      setIsActive(template.isActive)
      fetchPreview(templateId)
    }
  }, [template, templateId])

  const handleSave = async () => {
    setSaving(true)
    setError(null)
    setSuccessMessage(null)

    try {
      const response = await fetch(`/api/admin/settings/email/templates/${templateId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          subject,
          bodyHtml,
          isActive,
          changeNote: changeNote || undefined,
        }),
      })
      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to save template')
      }

      setTemplate(data.template)
      setChangeNote('')
      setSuccessMessage('Template saved successfully')
      fetchVersions(templateId)
      fetchPreview(templateId)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save template')
    } finally {
      setSaving(false)
    }
  }

  const handleReset = async () => {
    if (!confirm('Are you sure you want to reset this template to its default content? This cannot be undone.')) {
      return
    }

    setSaving(true)
    setError(null)

    try {
      const response = await fetch(`/api/admin/settings/email/templates/${templateId}/reset`, {
        method: 'POST',
      })
      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to reset template')
      }

      setTemplate(data.template)
      setSuccessMessage('Template reset to default')
      fetchVersions(templateId)
      fetchPreview(templateId)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to reset template')
    } finally {
      setSaving(false)
    }
  }

  const handleRestoreVersion = async (version: number) => {
    if (!confirm(`Restore template to version ${version}?`)) {
      return
    }

    setSaving(true)
    setError(null)

    try {
      const response = await fetch(`/api/admin/settings/email/templates/${templateId}/versions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ version }),
      })
      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to restore version')
      }

      setTemplate(data.template)
      setSuccessMessage(`Restored to version ${version}`)
      fetchVersions(templateId)
      fetchPreview(templateId)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to restore version')
    } finally {
      setSaving(false)
    }
  }

  const handleTestSend = async () => {
    if (!testEmail) return

    setSendingTest(true)
    setError(null)

    try {
      const response = await fetch(`/api/admin/settings/email/templates/${templateId}/test`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ recipientEmail: testEmail }),
      })
      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to send test email')
      }

      setSuccessMessage(`Test email sent to ${testEmail}`)
      setShowTestModal(false)
      setTestEmail('')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to send test email')
    } finally {
      setSendingTest(false)
    }
  }

  const insertVariable = (key: string) => {
    const variable = `{{${key}}}`
    // Insert at cursor position in bodyHtml textarea
    const textarea = document.getElementById('bodyHtml') as HTMLTextAreaElement
    if (textarea) {
      const start = textarea.selectionStart
      const end = textarea.selectionEnd
      const newValue = bodyHtml.substring(0, start) + variable + bodyHtml.substring(end)
      setBodyHtml(newValue)
      // Focus back and set cursor after inserted variable
      setTimeout(() => {
        textarea.focus()
        textarea.setSelectionRange(start + variable.length, start + variable.length)
      }, 0)
    } else {
      setBodyHtml(bodyHtml + variable)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    )
  }

  if (!template) {
    return (
      <div className="py-12 text-center">
        <p className="text-muted-foreground">Template not found</p>
        <Link href="/admin/settings/email/templates" className="text-primary hover:underline">
          Back to templates
        </Link>
      </div>
    )
  }

  const hasChanges = subject !== template.subject || bodyHtml !== template.bodyHtml || isActive !== template.isActive

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <Link
              href="/admin/settings/email/templates"
              className="text-muted-foreground hover:text-foreground"
            >
              <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </Link>
            <h2 className="text-xl font-semibold">{template.name}</h2>
            {template.isDefault && (
              <Badge variant="secondary">Default</Badge>
            )}
          </div>
          <p className="text-sm text-muted-foreground">
            {template.description || `${template.notificationType} template`}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            onClick={() => setShowTestModal(true)}
          >
            Send Test
          </Button>
          <Button
            variant="outline"
            onClick={handleReset}
            disabled={saving || template.isDefault}
          >
            Reset to Default
          </Button>
          <Button
            onClick={handleSave}
            disabled={saving || !hasChanges}
          >
            {saving ? 'Saving...' : 'Save Changes'}
          </Button>
        </div>
      </div>

      {/* Messages */}
      {error && (
        <div className="rounded-lg border border-destructive bg-destructive/10 p-4 text-destructive">
          {error}
        </div>
      )}
      {successMessage && (
        <div className="rounded-lg border border-green-500 bg-green-500/10 p-4 text-green-700">
          {successMessage}
        </div>
      )}

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Editor Panel */}
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <h3 className="font-medium">Template Content</h3>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Subject */}
              <div className="space-y-2">
                <Label htmlFor="subject">Subject Line</Label>
                <Input
                  id="subject"
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  placeholder="Email subject..."
                />
              </div>

              {/* Body HTML */}
              <div className="space-y-2">
                <Label htmlFor="bodyHtml">Email Body (HTML)</Label>
                <Textarea
                  id="bodyHtml"
                  value={bodyHtml}
                  onChange={(e) => setBodyHtml(e.target.value)}
                  placeholder="Email content..."
                  className="min-h-[400px] font-mono text-sm"
                />
              </div>

              {/* Active toggle */}
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="isActive"
                  checked={isActive}
                  onChange={(e) => setIsActive(e.target.checked)}
                  className="h-4 w-4 rounded border-gray-300"
                />
                <Label htmlFor="isActive">Template is active</Label>
              </div>

              {/* Change note */}
              <div className="space-y-2">
                <Label htmlFor="changeNote">Change Note (optional)</Label>
                <Input
                  id="changeNote"
                  value={changeNote}
                  onChange={(e) => setChangeNote(e.target.value)}
                  placeholder="Describe what changed..."
                />
              </div>
            </CardContent>
          </Card>

          {/* Variables Panel */}
          <Card>
            <CardHeader>
              <h3 className="font-medium">Available Variables</h3>
              <p className="text-sm text-muted-foreground">
                Click to insert into email body
              </p>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-2">
                {variables.map((variable) => (
                  <button
                    key={variable.key}
                    onClick={() => insertVariable(variable.key)}
                    className={cn(
                      'rounded-full border px-3 py-1 text-sm transition-colors',
                      'hover:bg-primary hover:text-primary-foreground',
                      variable.required && 'border-primary'
                    )}
                    title={`${variable.description} (Example: ${variable.example})`}
                  >
                    {'{{' + variable.key + '}}'}
                  </button>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Preview Panel */}
        <div className="space-y-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <h3 className="font-medium">Preview</h3>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setPreviewMode('html')}
                  className={cn(
                    'px-3 py-1 text-sm rounded-md transition-colors',
                    previewMode === 'html' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground'
                  )}
                >
                  HTML
                </button>
                <button
                  onClick={() => setPreviewMode('text')}
                  className={cn(
                    'px-3 py-1 text-sm rounded-md transition-colors',
                    previewMode === 'text' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground'
                  )}
                >
                  Plain Text
                </button>
                <div className="mx-2 h-4 w-px bg-border" />
                <button
                  onClick={() => setViewportMode('desktop')}
                  className={cn(
                    'p-1 rounded transition-colors',
                    viewportMode === 'desktop' ? 'text-primary' : 'text-muted-foreground hover:text-foreground'
                  )}
                  title="Desktop view"
                >
                  <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                  </svg>
                </button>
                <button
                  onClick={() => setViewportMode('mobile')}
                  className={cn(
                    'p-1 rounded transition-colors',
                    viewportMode === 'mobile' ? 'text-primary' : 'text-muted-foreground hover:text-foreground'
                  )}
                  title="Mobile view"
                >
                  <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" />
                  </svg>
                </button>
              </div>
            </CardHeader>
            <CardContent>
              {preview && (
                <div className="space-y-4">
                  <div className="rounded border bg-muted/50 p-3">
                    <p className="text-xs text-muted-foreground">Subject</p>
                    <p className="font-medium">{preview.subject}</p>
                  </div>
                  <div
                    className={cn(
                      'overflow-hidden rounded border bg-white mx-auto transition-all',
                      viewportMode === 'mobile' ? 'max-w-[375px]' : 'w-full'
                    )}
                  >
                    {previewMode === 'html' ? (
                      <iframe
                        srcDoc={preview.bodyHtml}
                        className="h-[500px] w-full"
                        title="Email preview"
                      />
                    ) : (
                      <pre className="h-[500px] overflow-auto whitespace-pre-wrap p-4 text-sm">
                        {preview.bodyText}
                      </pre>
                    )}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Version History */}
          <Card>
            <CardHeader
              className="cursor-pointer"
              onClick={() => setShowVersions(!showVersions)}
            >
              <div className="flex items-center justify-between">
                <h3 className="font-medium">Version History</h3>
                <svg
                  className={cn('h-5 w-5 transition-transform', showVersions && 'rotate-180')}
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </div>
            </CardHeader>
            {showVersions && (
              <CardContent>
                {versions.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No version history</p>
                ) : (
                  <div className="divide-y">
                    {versions.map((version) => (
                      <div key={version.id} className="flex items-center justify-between py-3">
                        <div>
                          <p className="text-sm font-medium">Version {version.version}</p>
                          <p className="text-xs text-muted-foreground">
                            {new Date(version.createdAt).toLocaleString()}
                          </p>
                          {version.changeNote && (
                            <p className="mt-1 text-sm text-muted-foreground">
                              {version.changeNote}
                            </p>
                          )}
                        </div>
                        {version.version !== template.version && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleRestoreVersion(version.version)}
                            disabled={saving}
                          >
                            Restore
                          </Button>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            )}
          </Card>
        </div>
      </div>

      {/* Test Send Modal */}
      {showTestModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="w-full max-w-md rounded-lg bg-background p-6 shadow-xl">
            <h3 className="mb-4 text-lg font-semibold">Send Test Email</h3>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="testEmail">Recipient Email</Label>
                <Input
                  id="testEmail"
                  type="email"
                  value={testEmail}
                  onChange={(e) => setTestEmail(e.target.value)}
                  placeholder="your@email.com"
                />
              </div>
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setShowTestModal(false)}>
                  Cancel
                </Button>
                <Button onClick={handleTestSend} disabled={sendingTest || !testEmail}>
                  {sendingTest ? 'Sending...' : 'Send Test'}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
