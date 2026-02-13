'use client'

import { Button, Card, CardContent, CardHeader, CardTitle } from '@cgk-platform/ui'
import { ArrowLeft } from 'lucide-react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useState } from 'react'

import type { CreateSurveyInput, SurveyType } from '@/lib/surveys'
import { SURVEY_TYPE_LABELS } from '@/lib/surveys'

export default function NewSurveyPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [formData, setFormData] = useState<CreateSurveyInput>({
    name: '',
    slug: '',
    title: '',
    subtitle: '',
    survey_type: 'post_purchase',
    thank_you_message: 'Thank you for your feedback!',
  })

  const generateSlug = (name: string) => {
    return name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '')
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    try {
      const response = await fetch('/api/admin/surveys', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      })

      const data = await response.json()

      if (!response.ok) {
        setError(data.error || 'Failed to create survey')
        return
      }

      router.push(`/admin/surveys/${data.survey.id}/questions`)
    } catch {
      setError('An unexpected error occurred')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="max-w-2xl space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/admin/surveys">
          <Button variant="ghost" size="sm">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold">Create Survey</h1>
          <p className="text-muted-foreground">Set up a new post-purchase survey</p>
        </div>
      </div>

      <form onSubmit={handleSubmit}>
        <Card>
          <CardHeader>
            <CardTitle>Survey Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {error && (
              <div className="rounded-md bg-red-50 p-3 text-sm text-red-600">
                {error}
              </div>
            )}

            <div className="space-y-2">
              <label className="text-sm font-medium">Internal Name</label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => {
                  const name = e.target.value
                  setFormData({
                    ...formData,
                    name,
                    slug: formData.slug || generateSlug(name),
                  })
                }}
                placeholder="e.g., Post-Purchase Attribution Survey"
                className="w-full rounded-md border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                required
              />
              <p className="text-xs text-muted-foreground">
                This is for internal reference only
              </p>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Survey Slug</label>
              <input
                type="text"
                value={formData.slug}
                onChange={(e) => setFormData({ ...formData, slug: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '') })}
                placeholder="e.g., post-purchase-attribution"
                className="w-full rounded-md border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                required
              />
              <p className="text-xs text-muted-foreground">
                Used in URLs. Only lowercase letters, numbers, and hyphens allowed.
              </p>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Survey Type</label>
              <select
                value={formData.survey_type}
                onChange={(e) => setFormData({ ...formData, survey_type: e.target.value as SurveyType })}
                className="w-full rounded-md border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
              >
                {Object.entries(SURVEY_TYPE_LABELS).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Title</label>
              <input
                type="text"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                placeholder="e.g., How did you hear about us?"
                className="w-full rounded-md border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                required
              />
              <p className="text-xs text-muted-foreground">
                Displayed to customers at the top of the survey
              </p>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Subtitle (Optional)</label>
              <input
                type="text"
                value={formData.subtitle}
                onChange={(e) => setFormData({ ...formData, subtitle: e.target.value })}
                placeholder="e.g., Help us serve you better"
                className="w-full rounded-md border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Thank You Message</label>
              <textarea
                value={formData.thank_you_message}
                onChange={(e) => setFormData({ ...formData, thank_you_message: e.target.value })}
                placeholder="e.g., Thank you for your feedback!"
                rows={2}
                className="w-full rounded-md border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
              />
              <p className="text-xs text-muted-foreground">
                Shown after the customer completes the survey
              </p>
            </div>

            <div className="flex justify-end gap-3 pt-4 border-t">
              <Link href="/admin/surveys">
                <Button type="button" variant="outline">
                  Cancel
                </Button>
              </Link>
              <Button type="submit" disabled={loading}>
                {loading ? 'Creating...' : 'Create & Add Questions'}
              </Button>
            </div>
          </CardContent>
        </Card>
      </form>
    </div>
  )
}
