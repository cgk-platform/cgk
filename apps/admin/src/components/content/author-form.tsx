'use client'

import { Button, Input, Label, Textarea } from '@cgk/ui'
import { Plus } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useState } from 'react'

import type { BlogAuthor } from '@/lib/blog/types'

interface AuthorFormProps {
  author?: BlogAuthor
  onComplete?: () => void
}

export function AuthorForm({ author, onComplete }: AuthorFormProps) {
  const router = useRouter()
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [name, setName] = useState(author?.name || '')
  const [email, setEmail] = useState(author?.email || '')
  const [bio, setBio] = useState(author?.bio || '')
  const [avatarUrl, setAvatarUrl] = useState(author?.avatar_url || '')
  const [twitter, setTwitter] = useState(author?.social_links?.twitter || '')
  const [linkedin, setLinkedin] = useState(author?.social_links?.linkedin || '')
  const [website, setWebsite] = useState(author?.social_links?.website || '')

  const isEditing = Boolean(author)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    setError(null)

    const socialLinks: Record<string, string> = {}
    if (twitter) socialLinks.twitter = twitter
    if (linkedin) socialLinks.linkedin = linkedin
    if (website) socialLinks.website = website

    const body = {
      id: author?.id,
      name,
      email: email || undefined,
      bio: bio || undefined,
      avatar_url: avatarUrl || undefined,
      social_links: Object.keys(socialLinks).length > 0 ? socialLinks : undefined,
    }

    try {
      const res = await fetch('/api/admin/blog/authors', {
        method: isEditing ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Failed to save author')
      }

      if (onComplete) {
        onComplete()
      } else {
        router.refresh()
        // Reset form if creating
        if (!isEditing) {
          setName('')
          setEmail('')
          setBio('')
          setAvatarUrl('')
          setTwitter('')
          setLinkedin('')
          setWebsite('')
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save author')
    } finally {
      setSaving(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {error && (
        <div className="rounded-md border border-destructive bg-destructive/10 p-3 text-sm text-destructive">
          {error}
        </div>
      )}

      <div className="space-y-2">
        <Label htmlFor="auth-name">Name</Label>
        <Input
          id="auth-name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Author name"
          required
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="auth-email">Email</Label>
        <Input
          id="auth-email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="author@example.com"
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="auth-bio">Bio</Label>
        <Textarea
          id="auth-bio"
          value={bio}
          onChange={(e) => setBio(e.target.value)}
          placeholder="Brief author bio..."
          rows={3}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="auth-avatar">Avatar URL</Label>
        <Input
          id="auth-avatar"
          value={avatarUrl}
          onChange={(e) => setAvatarUrl(e.target.value)}
          placeholder="https://..."
        />
      </div>

      <div className="space-y-2">
        <Label className="text-sm font-medium">Social Links</Label>
        <div className="grid gap-2">
          <Input
            value={twitter}
            onChange={(e) => setTwitter(e.target.value)}
            placeholder="Twitter handle"
          />
          <Input
            value={linkedin}
            onChange={(e) => setLinkedin(e.target.value)}
            placeholder="LinkedIn URL"
          />
          <Input
            value={website}
            onChange={(e) => setWebsite(e.target.value)}
            placeholder="Website URL"
          />
        </div>
      </div>

      <Button type="submit" disabled={saving || !name}>
        <Plus className="mr-2 h-4 w-4" />
        {saving ? 'Saving...' : isEditing ? 'Update Author' : 'Add Author'}
      </Button>
    </form>
  )
}
