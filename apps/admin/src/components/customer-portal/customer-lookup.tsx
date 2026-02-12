'use client'

import { Button, Card, CardContent, Input, Badge, cn } from '@cgk/ui'
import {
  Search,
  User,
  Mail,
  Phone,
  ShoppingCart,
  DollarSign,
  LogIn,
  Eye,
  Calendar,
  Shield,
} from 'lucide-react'
import { useState, useTransition, useCallback } from 'react'

import type { PortalCustomer } from '@/lib/customer-portal/types'
import { formatMoney, formatDate } from '@/lib/format'

interface CustomerLookupProps {
  onSearch: (query: string) => Promise<PortalCustomer[]>
  onViewCustomer: (customer: PortalCustomer) => void
  onImpersonate: (customer: PortalCustomer, reason: string) => Promise<void>
}

export function CustomerLookup({ onSearch, onViewCustomer, onImpersonate }: CustomerLookupProps) {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<PortalCustomer[]>([])
  const [hasSearched, setHasSearched] = useState(false)
  const [isPending, startTransition] = useTransition()
  const [impersonateCustomer, setImpersonateCustomer] = useState<PortalCustomer | null>(null)
  const [impersonateReason, setImpersonateReason] = useState('')

  const handleSearch = useCallback(() => {
    if (!query.trim()) return

    startTransition(async () => {
      const customers = await onSearch(query.trim())
      setResults(customers)
      setHasSearched(true)
    })
  }, [query, onSearch])

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSearch()
    }
  }

  const handleStartImpersonation = async () => {
    if (!impersonateCustomer || !impersonateReason.trim()) return

    await onImpersonate(impersonateCustomer, impersonateReason.trim())
    setImpersonateCustomer(null)
    setImpersonateReason('')
  }

  return (
    <div className="space-y-6">
      {/* Search Input */}
      <div className="flex gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search by email, name, or phone..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            className="pl-10"
          />
        </div>
        <Button onClick={handleSearch} disabled={isPending || !query.trim()}>
          {isPending ? 'Searching...' : 'Search'}
        </Button>
      </div>

      {/* Results */}
      {hasSearched && results.length === 0 && (
        <div className="rounded-lg border border-dashed p-8 text-center">
          <User className="mx-auto h-8 w-8 text-muted-foreground" />
          <p className="mt-2 text-sm text-muted-foreground">
            No customers found matching "{query}"
          </p>
        </div>
      )}

      {results.length > 0 && (
        <div className="space-y-3">
          <p className="text-sm text-muted-foreground">
            Found {results.length} customer{results.length !== 1 ? 's' : ''}
          </p>
          <div className="grid gap-3">
            {results.map((customer) => (
              <CustomerCard
                key={customer.id}
                customer={customer}
                onView={() => onViewCustomer(customer)}
                onImpersonate={() => setImpersonateCustomer(customer)}
              />
            ))}
          </div>
        </div>
      )}

      {/* Impersonation Modal */}
      {impersonateCustomer && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <Card className="w-full max-w-md">
            <CardContent className="p-6">
              <div className="mb-4 flex items-center gap-3 text-amber-600">
                <Shield className="h-6 w-6" />
                <h3 className="text-lg font-semibold">Impersonate Customer</h3>
              </div>

              <p className="mb-4 text-sm text-muted-foreground">
                You are about to view the portal as{' '}
                <strong>
                  {impersonateCustomer.firstName} {impersonateCustomer.lastName}
                </strong>
                {impersonateCustomer.email && ` (${impersonateCustomer.email})`}. All actions will
                be logged for audit purposes.
              </p>

              <div className="mb-4">
                <label className="mb-1.5 block text-sm font-medium">
                  Reason for impersonation <span className="text-destructive">*</span>
                </label>
                <Input
                  placeholder="e.g., Customer support ticket #1234"
                  value={impersonateReason}
                  onChange={(e) => setImpersonateReason(e.target.value)}
                />
                <p className="mt-1 text-xs text-muted-foreground">
                  This will be recorded in the audit log.
                </p>
              </div>

              <div className="flex justify-end gap-3">
                <Button
                  variant="outline"
                  onClick={() => {
                    setImpersonateCustomer(null)
                    setImpersonateReason('')
                  }}
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleStartImpersonation}
                  disabled={!impersonateReason.trim()}
                  className="bg-amber-600 hover:bg-amber-700 text-white"
                >
                  <LogIn className="mr-2 h-4 w-4" />
                  Start Impersonation
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  )
}

interface CustomerCardProps {
  customer: PortalCustomer
  onView: () => void
  onImpersonate: () => void
}

function CustomerCard({ customer, onView, onImpersonate }: CustomerCardProps) {
  const fullName =
    [customer.firstName, customer.lastName].filter(Boolean).join(' ') || 'Unknown Customer'

  return (
    <Card
      className={cn(
        'transition-shadow hover:shadow-md',
        !customer.portalAccessEnabled && 'opacity-70'
      )}
    >
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <h4 className="font-medium truncate">{fullName}</h4>
              {!customer.portalAccessEnabled && (
                <Badge variant="secondary" className="text-xs">
                  Access Disabled
                </Badge>
              )}
            </div>

            <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted-foreground">
              {customer.email && (
                <span className="flex items-center gap-1">
                  <Mail className="h-3.5 w-3.5" />
                  {customer.email}
                </span>
              )}
              {customer.phone && (
                <span className="flex items-center gap-1">
                  <Phone className="h-3.5 w-3.5" />
                  {customer.phone}
                </span>
              )}
            </div>

            <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-sm">
              <span className="flex items-center gap-1 text-muted-foreground">
                <ShoppingCart className="h-3.5 w-3.5" />
                {customer.ordersCount} order{customer.ordersCount !== 1 ? 's' : ''}
              </span>
              <span className="flex items-center gap-1 font-medium">
                <DollarSign className="h-3.5 w-3.5" />
                {formatMoney(customer.totalSpentCents, customer.currency)}
              </span>
              {customer.lastLoginAt && (
                <span className="flex items-center gap-1 text-muted-foreground">
                  <Calendar className="h-3.5 w-3.5" />
                  Last login: {formatDate(customer.lastLoginAt)}
                </span>
              )}
            </div>
          </div>

          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={onView}>
              <Eye className="mr-1.5 h-3.5 w-3.5" />
              View
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={onImpersonate}
              disabled={!customer.portalAccessEnabled}
              title={!customer.portalAccessEnabled ? 'Portal access is disabled for this customer' : undefined}
            >
              <LogIn className="mr-1.5 h-3.5 w-3.5" />
              Login As
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
