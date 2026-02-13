'use client'

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { Plus, Search, User } from 'lucide-react'

import { Button } from '@cgk-platform/ui'
import { cn } from '@cgk-platform/ui'

interface Contact {
  id: string
  name: string
  email: string | null
  phone: string | null
  contactType: string
  companyName: string | null
  tags: string[]
  createdAt: string
}

export default function ContactsPage() {
  const [contacts, setContacts] = useState<Contact[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [typeFilter, setTypeFilter] = useState('')

  const fetchContacts = useCallback(async () => {
    try {
      const params = new URLSearchParams()
      if (search) params.set('search', search)
      if (typeFilter) params.set('contactType', typeFilter)

      const res = await fetch(`/api/admin/inbox/contacts?${params}`)
      const data = await res.json()
      setContacts(data.contacts || [])
    } catch (error) {
      console.error('Failed to fetch contacts:', error)
    } finally {
      setLoading(false)
    }
  }, [search, typeFilter])

  useEffect(() => {
    const timeout = setTimeout(fetchContacts, 300)
    return () => clearTimeout(timeout)
  }, [fetchContacts])

  const contactTypes = ['creator', 'customer', 'vendor', 'partner', 'team_member', 'other']

  return (
    <div className="container max-w-4xl py-8">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Contacts</h1>
          <p className="text-sm text-muted-foreground">
            Manage your contact directory
          </p>
        </div>
        <Button>
          <Plus className="mr-2 h-4 w-4" />
          Add Contact
        </Button>
      </div>

      {/* Filters */}
      <div className="mb-6 flex gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search contacts..."
            className={cn(
              'block w-full rounded-md border bg-background pl-10 pr-4 py-2 text-sm',
              'focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary'
            )}
          />
        </div>
        <select
          value={typeFilter}
          onChange={(e) => setTypeFilter(e.target.value)}
          className="rounded-md border bg-background px-3 py-2 text-sm"
        >
          <option value="">All Types</option>
          {contactTypes.map((type) => (
            <option key={type} value={type}>
              {type.replace('_', ' ')}
            </option>
          ))}
        </select>
      </div>

      {/* Contacts List */}
      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="h-16 animate-pulse rounded-lg border bg-muted/20" />
          ))}
        </div>
      ) : contacts.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-lg border-2 border-dashed py-16">
          <div className="rounded-full bg-muted/50 p-4">
            <User className="h-8 w-8 text-muted-foreground" />
          </div>
          <h3 className="mt-4 font-medium">No contacts found</h3>
          <p className="mt-1 text-sm text-muted-foreground">
            {search ? 'Try a different search term' : 'Add your first contact'}
          </p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-lg border">
          <table className="w-full">
            <thead className="bg-muted/50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground">
                  Name
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground">
                  Contact Info
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground">
                  Type
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground">
                  Tags
                </th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {contacts.map((contact) => (
                <tr key={contact.id} className="bg-card hover:bg-muted/30">
                  <td className="px-4 py-3">
                    <Link
                      href={`/admin/inbox/contacts/${contact.id}`}
                      className="font-medium text-primary hover:underline"
                    >
                      {contact.name}
                    </Link>
                    {contact.companyName && (
                      <div className="text-sm text-muted-foreground">
                        {contact.companyName}
                      </div>
                    )}
                  </td>
                  <td className="px-4 py-3 text-sm text-muted-foreground">
                    {contact.email && <div>{contact.email}</div>}
                    {contact.phone && <div>{contact.phone}</div>}
                  </td>
                  <td className="px-4 py-3">
                    <span className="rounded-full bg-muted px-2 py-0.5 text-xs font-medium">
                      {contact.contactType.replace('_', ' ')}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap gap-1">
                      {contact.tags.slice(0, 3).map((tag) => (
                        <span
                          key={tag}
                          className="rounded bg-primary/10 px-1.5 py-0.5 text-xs text-primary"
                        >
                          {tag}
                        </span>
                      ))}
                      {contact.tags.length > 3 && (
                        <span className="text-xs text-muted-foreground">
                          +{contact.tags.length - 3}
                        </span>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
