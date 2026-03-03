'use client'

import {
  Button,
  Card,
  CardContent,
  Badge,
  Alert,
  AlertDescription,
  RadixSelect as Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Input,
  Label,
  Switch,
} from '@cgk-platform/ui'
import { cn } from '@cgk-platform/ui'
import {
  Search,
  Plus,
  Edit2,
  Trash2,
  User,
  DollarSign,
  X,
  Loader2,
  Link,
  Tag,
} from 'lucide-react'
import { useEffect, useState, useCallback } from 'react'

import type {
  Influencer,
  InfluencerCreate,
} from '@/lib/attribution'

export default function InfluencersPage() {
  const [influencers, setInfluencers] = useState<Influencer[]>([])
  const [total, setTotal] = useState(0)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Filters
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [sortBy, setSortBy] = useState<string>('name')
  const [sortOrder] = useState<string>('asc')
  const [currentPage, setCurrentPage] = useState(0)
  const pageSize = 20

  // Modal state
  const [showModal, setShowModal] = useState(false)
  const [editingInfluencer, setEditingInfluencer] = useState<Influencer | null>(null)
  const [isSaving, setIsSaving] = useState(false)

  // Form state
  const [formData, setFormData] = useState<InfluencerCreate>({
    name: '',
    status: 'active',
    discountCodes: [],
    creatorLinks: [],
    utmPatterns: [],
    landingPage: '',
    commissionRate: undefined,
  })

  const fetchInfluencers = useCallback(async () => {
    setIsLoading(true)
    try {
      const params = new URLSearchParams({
        ...(statusFilter !== 'all' ? { status: statusFilter } : {}),
        ...(searchQuery ? { search: searchQuery } : {}),
        sortBy,
        sortOrder,
        limit: String(pageSize),
        offset: String(currentPage * pageSize),
      })

      const response = await fetch(`/api/admin/attribution/influencers?${params}`)
      const data = await response.json()
      setInfluencers(data.influencers)
      setTotal(data.total)
    } catch (err) {
      setError('Failed to load influencers')
      console.error(err)
    } finally {
      setIsLoading(false)
    }
  }, [statusFilter, searchQuery, sortBy, sortOrder, currentPage])

  useEffect(() => {
    fetchInfluencers()
  }, [fetchInfluencers])

  const openCreateModal = () => {
    setEditingInfluencer(null)
    setFormData({
      name: '',
      status: 'active',
      discountCodes: [],
      creatorLinks: [],
      utmPatterns: [],
      landingPage: '',
      commissionRate: undefined,
    })
    setShowModal(true)
  }

  const openEditModal = (influencer: Influencer) => {
    setEditingInfluencer(influencer)
    setFormData({
      name: influencer.name,
      profileImageUrl: influencer.profileImageUrl ?? undefined,
      status: influencer.status,
      discountCodes: influencer.discountCodes,
      creatorLinks: influencer.creatorLinks,
      utmPatterns: influencer.utmPatterns,
      landingPage: influencer.landingPage ?? '',
      commissionRate: influencer.commissionRate ?? undefined,
    })
    setShowModal(true)
  }

  const handleSave = async () => {
    setIsSaving(true)
    try {
      const url = editingInfluencer
        ? `/api/admin/attribution/influencers/${editingInfluencer.id}`
        : '/api/admin/attribution/influencers'

      const response = await fetch(url, {
        method: editingInfluencer ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Failed to save influencer')
      }

      setShowModal(false)
      await fetchInfluencers()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save influencer')
    } finally {
      setIsSaving(false)
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this influencer?')) return

    try {
      const response = await fetch(`/api/admin/attribution/influencers/${id}`, {
        method: 'DELETE',
      })

      if (!response.ok) {
        throw new Error('Failed to delete influencer')
      }

      await fetchInfluencers()
    } catch {
      setError('Failed to delete influencer')
    }
  }

  const addArrayItem = (field: 'discountCodes' | 'creatorLinks' | 'utmPatterns', value: string) => {
    if (!value.trim()) return
    setFormData((prev) => ({
      ...prev,
      [field]: [...(prev[field] ?? []), value.trim()],
    }))
  }

  const removeArrayItem = (field: 'discountCodes' | 'creatorLinks' | 'utmPatterns', index: number) => {
    setFormData((prev) => ({
      ...prev,
      [field]: (prev[field] ?? []).filter((_, i) => i !== index),
    }))
  }

  if (isLoading && influencers.length === 0) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="h-8 w-48 animate-pulse rounded bg-muted" />
          <div className="h-9 w-32 animate-pulse rounded bg-muted" />
        </div>
        <Card>
          <CardContent className="p-6">
            <div className="h-64 animate-pulse rounded bg-muted" />
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {error && (
        <Alert variant="error">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-lg font-semibold">Influencer Attribution</h2>
          <p className="text-sm text-muted-foreground">
            Track and manage influencer/creator attribution
          </p>
        </div>
        <Button onClick={openCreateModal}>
          <Plus className="mr-2 h-4 w-4" />
          Add Influencer
        </Button>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search influencers..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>

        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[130px]">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="active">Active</SelectItem>
            <SelectItem value="inactive">Inactive</SelectItem>
          </SelectContent>
        </Select>

        <Select value={sortBy} onValueChange={setSortBy}>
          <SelectTrigger className="w-[130px]">
            <SelectValue placeholder="Sort By" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="name">Name</SelectItem>
            <SelectItem value="revenue">Revenue</SelectItem>
            <SelectItem value="conversions">Conversions</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Influencer List */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {influencers.map((influencer) => (
          <Card key={influencer.id}>
            <CardContent className="p-6">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-muted">
                    {influencer.profileImageUrl ? (
                      <img
                        src={influencer.profileImageUrl}
                        alt={influencer.name}
                        className="h-10 w-10 rounded-full object-cover"
                      />
                    ) : (
                      <User className="h-5 w-5 text-muted-foreground" />
                    )}
                  </div>
                  <div>
                    <h3 className="font-medium">{influencer.name}</h3>
                    <Badge
                      className={cn(
                        influencer.status === 'active'
                          ? 'bg-green-100 text-green-800'
                          : 'bg-gray-100 text-gray-800'
                      )}
                    >
                      {influencer.status}
                    </Badge>
                  </div>
                </div>
                <div className="flex gap-1">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => openEditModal(influencer)}
                  >
                    <Edit2 className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleDelete(influencer.id)}
                  >
                    <Trash2 className="h-4 w-4 text-red-500" />
                  </Button>
                </div>
              </div>

              {/* Discount Codes */}
              {influencer.discountCodes.length > 0 && (
                <div className="mt-4">
                  <span className="text-xs font-medium text-muted-foreground">
                    Discount Codes
                  </span>
                  <div className="mt-1 flex flex-wrap gap-1">
                    {influencer.discountCodes.map((code) => (
                      <Badge key={code} variant="outline" className="text-xs">
                        <Tag className="mr-1 h-3 w-3" />
                        {code}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}

              {/* Creator Links */}
              {influencer.creatorLinks.length > 0 && (
                <div className="mt-3">
                  <span className="text-xs font-medium text-muted-foreground">
                    Creator Links
                  </span>
                  <div className="mt-1 flex flex-wrap gap-1">
                    {influencer.creatorLinks.slice(0, 2).map((link) => (
                      <Badge key={link} variant="outline" className="text-xs">
                        <Link className="mr-1 h-3 w-3" />
                        {link}
                      </Badge>
                    ))}
                    {influencer.creatorLinks.length > 2 && (
                      <Badge variant="outline" className="text-xs">
                        +{influencer.creatorLinks.length - 2} more
                      </Badge>
                    )}
                  </div>
                </div>
              )}

              {/* Metrics (placeholder) */}
              <div className="mt-4 grid grid-cols-3 gap-2 border-t pt-4">
                <div className="text-center">
                  <div className="flex items-center justify-center text-sm font-medium">
                    <DollarSign className="h-3 w-3" />
                    {influencer.metrics?.revenue?.toLocaleString() ?? '0'}
                  </div>
                  <div className="text-xs text-muted-foreground">Revenue</div>
                </div>
                <div className="text-center">
                  <div className="text-sm font-medium">
                    {influencer.metrics?.conversions ?? 0}
                  </div>
                  <div className="text-xs text-muted-foreground">Orders</div>
                </div>
                <div className="text-center">
                  <div className="text-sm font-medium">
                    ${influencer.metrics?.aov?.toFixed(0) ?? '0'}
                  </div>
                  <div className="text-xs text-muted-foreground">AOV</div>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {influencers.length === 0 && (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <User className="h-12 w-12 text-muted-foreground" />
            <h3 className="mt-4 font-medium">No Influencers</h3>
            <p className="mt-1 text-sm text-muted-foreground">
              Add your first influencer to start tracking attribution
            </p>
            <Button className="mt-4" onClick={openCreateModal}>
              <Plus className="mr-2 h-4 w-4" />
              Add Influencer
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Pagination */}
      {total > pageSize && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            Showing {currentPage * pageSize + 1} to{' '}
            {Math.min((currentPage + 1) * pageSize, total)} of {total}
          </p>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage((p) => Math.max(0, p - 1))}
              disabled={currentPage === 0}
            >
              Previous
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage((p) => p + 1)}
              disabled={(currentPage + 1) * pageSize >= total}
            >
              Next
            </Button>
          </div>
        </div>
      )}

      {/* Create/Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-lg bg-background p-6">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-semibold">
                {editingInfluencer ? 'Edit Influencer' : 'Add Influencer'}
              </h2>
              <Button variant="ghost" size="sm" onClick={() => setShowModal(false)}>
                <X className="h-4 w-4" />
              </Button>
            </div>

            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Name *</Label>
                <Input
                  value={formData.name}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, name: e.target.value }))
                  }
                  placeholder="Influencer name"
                />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <Label>Active</Label>
                  <p className="text-xs text-muted-foreground">
                    Enable attribution tracking
                  </p>
                </div>
                <Switch
                  checked={formData.status === 'active'}
                  onCheckedChange={(checked) =>
                    setFormData((prev) => ({
                      ...prev,
                      status: checked ? 'active' : 'inactive',
                    }))
                  }
                />
              </div>

              {/* Discount Codes */}
              <div className="space-y-2">
                <Label>Discount Codes</Label>
                <div className="flex gap-2">
                  <Input
                    id="discount-code-input"
                    placeholder="Add discount code"
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault()
                        addArrayItem('discountCodes', e.currentTarget.value)
                        e.currentTarget.value = ''
                      }
                    }}
                  />
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      const input = document.getElementById('discount-code-input') as HTMLInputElement
                      addArrayItem('discountCodes', input.value)
                      input.value = ''
                    }}
                  >
                    Add
                  </Button>
                </div>
                <div className="flex flex-wrap gap-1">
                  {formData.discountCodes?.map((code, i) => (
                    <Badge key={i} variant="outline" className="gap-1">
                      {code}
                      <button onClick={() => removeArrayItem('discountCodes', i)}>
                        <X className="h-3 w-3" />
                      </button>
                    </Badge>
                  ))}
                </div>
              </div>

              {/* Creator Links */}
              <div className="space-y-2">
                <Label>Creator Links</Label>
                <div className="flex gap-2">
                  <Input
                    id="creator-link-input"
                    placeholder="Add creator link (e.g., JOHN20)"
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault()
                        addArrayItem('creatorLinks', e.currentTarget.value)
                        e.currentTarget.value = ''
                      }
                    }}
                  />
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      const input = document.getElementById('creator-link-input') as HTMLInputElement
                      addArrayItem('creatorLinks', input.value)
                      input.value = ''
                    }}
                  >
                    Add
                  </Button>
                </div>
                <div className="flex flex-wrap gap-1">
                  {formData.creatorLinks?.map((link, i) => (
                    <Badge key={i} variant="outline" className="gap-1">
                      {link}
                      <button onClick={() => removeArrayItem('creatorLinks', i)}>
                        <X className="h-3 w-3" />
                      </button>
                    </Badge>
                  ))}
                </div>
              </div>

              {/* UTM Patterns */}
              <div className="space-y-2">
                <Label>UTM Patterns</Label>
                <div className="flex gap-2">
                  <Input
                    id="utm-pattern-input"
                    placeholder="Add UTM pattern (e.g., utm_campaign=john)"
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault()
                        addArrayItem('utmPatterns', e.currentTarget.value)
                        e.currentTarget.value = ''
                      }
                    }}
                  />
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      const input = document.getElementById('utm-pattern-input') as HTMLInputElement
                      addArrayItem('utmPatterns', input.value)
                      input.value = ''
                    }}
                  >
                    Add
                  </Button>
                </div>
                <div className="flex flex-wrap gap-1">
                  {formData.utmPatterns?.map((pattern, i) => (
                    <Badge key={i} variant="outline" className="gap-1">
                      {pattern}
                      <button onClick={() => removeArrayItem('utmPatterns', i)}>
                        <X className="h-3 w-3" />
                      </button>
                    </Badge>
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                <Label>Landing Page URL</Label>
                <Input
                  value={formData.landingPage ?? ''}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, landingPage: e.target.value }))
                  }
                  placeholder="https://example.com/influencer"
                />
              </div>

              <div className="space-y-2">
                <Label>Commission Rate (%)</Label>
                <Input
                  type="number"
                  min="0"
                  max="100"
                  step="0.1"
                  value={formData.commissionRate ?? ''}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      commissionRate: e.target.value ? parseFloat(e.target.value) : undefined,
                    }))
                  }
                  placeholder="10"
                />
              </div>
            </div>

            <div className="mt-6 flex justify-end gap-2">
              <Button variant="outline" onClick={() => setShowModal(false)}>
                Cancel
              </Button>
              <Button onClick={handleSave} disabled={isSaving || !formData.name}>
                {isSaving ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : null}
                {editingInfluencer ? 'Save Changes' : 'Add Influencer'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
