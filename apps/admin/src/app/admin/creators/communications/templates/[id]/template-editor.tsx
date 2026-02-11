'use client'

import { Button, Card, CardContent, cn, Input, Label, Tabs, TabsContent, TabsList, TabsTrigger, Textarea } from '@cgk/ui'
import { ArrowLeft, Code, Eye, History, Save, Send, Variable } from 'lucide-react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useState, useTransition } from 'react'

import {
  type CreatorEmailTemplate,
  type TemplateVersion,
  TEMPLATE_VARIABLES,
} from '@/lib/creator-communications/types'

interface TemplateEditorProps {
  template: CreatorEmailTemplate
  versions: TemplateVersion[]
}

export function TemplateEditor({ template, versions }: TemplateEditorProps) {
  const router = useRouter()
  const [, startTransition] = useTransition()
  const [isSaving, setIsSaving] = useState(false)
  const [activeTab, setActiveTab] = useState<'edit' | 'preview' | 'history'>('edit')

  const [formData, setFormData] = useState({
    name: template.name,
    subject: template.subject,
    content_html: template.content_html,
    content_text: template.content_text || '',
    from_address: template.from_address || '',
    reply_to: template.reply_to || '',
    is_enabled: template.is_enabled,
  })

  const handleSave = async () => {
    setIsSaving(true)
    try {
      const response = await fetch(
        `/api/admin/creators/communications/templates/${template.id}`,
        {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(formData),
        },
      )

      if (response.ok) {
        startTransition(() => {
          router.refresh()
        })
      }
    } finally {
      setIsSaving(false)
    }
  }

  const insertVariable = (varKey: string) => {
    const variable = `{{${varKey}}}`
    setFormData((prev) => ({
      ...prev,
      content_html: prev.content_html + variable,
    }))
  }

  const renderPreview = () => {
    let preview = formData.content_html
    // Replace variables with sample data
    Object.entries(TEMPLATE_VARIABLES).forEach(([_, vars]) => {
      vars.forEach((v) => {
        preview = preview.replace(new RegExp(`{{${v.key}}}`, 'g'), v.example)
      })
    })
    return preview
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr,320px]">
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <Button variant="ghost" size="sm" asChild>
            <Link href="/admin/creators/communications/templates">
              <ArrowLeft className="mr-1.5 h-4 w-4" />
              Back to Templates
            </Link>
          </Button>

          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm">
              <Send className="mr-1.5 h-4 w-4" />
              Test Send
            </Button>
            <Button
              size="sm"
              onClick={handleSave}
              disabled={isSaving}
            >
              <Save className="mr-1.5 h-4 w-4" />
              {isSaving ? 'Saving...' : 'Save Changes'}
            </Button>
          </div>
        </div>

        <Card>
          <CardContent className="p-4">
            <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as typeof activeTab)}>
              <TabsList className="mb-4">
                <TabsTrigger value="edit" className="gap-1.5">
                  <Code className="h-4 w-4" />
                  Edit
                </TabsTrigger>
                <TabsTrigger value="preview" className="gap-1.5">
                  <Eye className="h-4 w-4" />
                  Preview
                </TabsTrigger>
                <TabsTrigger value="history" className="gap-1.5">
                  <History className="h-4 w-4" />
                  History
                </TabsTrigger>
              </TabsList>

              <TabsContent value="edit" className="space-y-4">
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="name">Template Name</Label>
                    <Input
                      id="name"
                      value={formData.name}
                      onChange={(e) =>
                        setFormData((prev) => ({ ...prev, name: e.target.value }))
                      }
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="subject">Subject Line</Label>
                    <Input
                      id="subject"
                      value={formData.subject}
                      onChange={(e) =>
                        setFormData((prev) => ({ ...prev, subject: e.target.value }))
                      }
                      placeholder="Email subject with {{variables}}"
                    />
                  </div>
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="from">From Address</Label>
                    <Input
                      id="from"
                      value={formData.from_address}
                      onChange={(e) =>
                        setFormData((prev) => ({ ...prev, from_address: e.target.value }))
                      }
                      placeholder="creators@{{domain}}"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="reply_to">Reply-To Address</Label>
                    <Input
                      id="reply_to"
                      value={formData.reply_to}
                      onChange={(e) =>
                        setFormData((prev) => ({ ...prev, reply_to: e.target.value }))
                      }
                      placeholder="support@{{domain}}"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="content">Email Content (HTML)</Label>
                  <Textarea
                    id="content"
                    value={formData.content_html}
                    onChange={(e) =>
                      setFormData((prev) => ({ ...prev, content_html: e.target.value }))
                    }
                    placeholder="Enter email HTML content..."
                    className="min-h-[400px] font-mono text-sm"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="content_text">Plain Text Version</Label>
                  <Textarea
                    id="content_text"
                    value={formData.content_text}
                    onChange={(e) =>
                      setFormData((prev) => ({ ...prev, content_text: e.target.value }))
                    }
                    placeholder="Plain text fallback..."
                    className="min-h-[150px] font-mono text-sm"
                  />
                </div>
              </TabsContent>

              <TabsContent value="preview">
                <div className="rounded-lg border bg-white p-4">
                  <div className="mb-4 border-b pb-4">
                    <p className="text-sm text-muted-foreground">Subject:</p>
                    <p className="font-medium">
                      {formData.subject.replace(
                        /{{(\w+)}}/g,
                        (_, key) =>
                          Object.values(TEMPLATE_VARIABLES)
                            .flat()
                            .find((v) => v.key === key)?.example || `{{${key}}}`,
                      )}
                    </p>
                  </div>
                  <div
                    className="prose prose-sm max-w-none"
                    dangerouslySetInnerHTML={{ __html: renderPreview() }}
                  />
                </div>
              </TabsContent>

              <TabsContent value="history">
                {versions.length === 0 ? (
                  <div className="py-8 text-center text-muted-foreground">
                    No version history yet
                  </div>
                ) : (
                  <div className="space-y-3">
                    {versions.map((version) => (
                      <div
                        key={version.id}
                        className="flex items-center justify-between rounded-lg border p-3"
                      >
                        <div className="flex items-center gap-3">
                          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-muted text-sm font-medium">
                            v{version.version}
                          </div>
                          <div>
                            <p className="text-sm font-medium">
                              {version.change_note || 'No description'}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {new Date(version.created_at).toLocaleString()}
                            </p>
                          </div>
                        </div>
                        <Button variant="outline" size="sm">
                          Restore
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </div>

      {/* Variables sidebar */}
      <div className="space-y-4">
        <Card>
          <CardContent className="p-4">
            <h3 className="mb-3 flex items-center gap-2 font-medium">
              <Variable className="h-4 w-4" />
              Template Variables
            </h3>
            <p className="mb-4 text-xs text-muted-foreground">
              Click a variable to insert it into your template
            </p>

            <div className="space-y-4">
              {Object.entries(TEMPLATE_VARIABLES).map(([category, vars]) => (
                <div key={category}>
                  <h4 className="mb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                    {category}
                  </h4>
                  <div className="space-y-1">
                    {vars.map((variable) => (
                      <button
                        key={variable.key}
                        type="button"
                        onClick={() => insertVariable(variable.key)}
                        className="flex w-full items-start gap-2 rounded-md px-2 py-1.5 text-left text-sm transition-colors hover:bg-muted"
                      >
                        <code className="shrink-0 rounded bg-slate-100 px-1.5 py-0.5 font-mono text-xs text-slate-700">
                          {`{{${variable.key}}}`}
                        </code>
                        <span className="text-xs text-muted-foreground">
                          {variable.description}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <h3 className="mb-3 font-medium">Template Info</h3>
            <dl className="space-y-2 text-sm">
              <div className="flex justify-between">
                <dt className="text-muted-foreground">Category</dt>
                <dd className="font-medium capitalize">{template.category}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-muted-foreground">Version</dt>
                <dd className="font-medium">{template.version}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-muted-foreground">Status</dt>
                <dd>
                  <span
                    className={cn(
                      'rounded-full px-2 py-0.5 text-xs font-medium',
                      template.is_enabled
                        ? 'bg-emerald-100 text-emerald-700'
                        : 'bg-slate-100 text-slate-600',
                    )}
                  >
                    {template.is_enabled ? 'Active' : 'Disabled'}
                  </span>
                </dd>
              </div>
              {template.is_default && (
                <div className="flex justify-between">
                  <dt className="text-muted-foreground">Type</dt>
                  <dd className="font-medium">System Default</dd>
                </div>
              )}
            </dl>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
