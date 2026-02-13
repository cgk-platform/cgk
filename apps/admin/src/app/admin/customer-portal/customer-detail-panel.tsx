'use client'

import { Button, Card, CardContent, Badge } from '@cgk-platform/ui'
import {
  X,
  Mail,
  Phone,
  ShoppingCart,
  DollarSign,
  Calendar,
  Shield,
  ExternalLink,
} from 'lucide-react'

import { CommunicationPrefs } from '@/components/customer-portal'
import type { PortalCustomer, CommunicationPreference } from '@/lib/customer-portal/types'
import { formatMoney, formatDate } from '@/lib/format'

interface CustomerDetailPanelProps {
  customer: PortalCustomer
  preferences: CommunicationPreference | null
  onClose: () => void
  onUpdatePrefs: (
    prefs: Partial<Omit<CommunicationPreference, 'id' | 'customerId' | 'createdAt' | 'updatedAt'>>
  ) => Promise<void>
}

export function CustomerDetailPanel({
  customer,
  preferences,
  onClose,
  onUpdatePrefs,
}: CustomerDetailPanelProps) {
  const fullName =
    [customer.firstName, customer.lastName].filter(Boolean).join(' ') || 'Unknown Customer'

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/50">
      <div
        className="h-full w-full max-w-2xl overflow-y-auto bg-background shadow-xl animate-in slide-in-from-right"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="sticky top-0 z-10 flex items-center justify-between border-b bg-background px-6 py-4">
          <div>
            <h2 className="text-lg font-semibold">{fullName}</h2>
            <p className="text-sm text-muted-foreground">{customer.email}</p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" asChild>
              <a
                href={`/admin/commerce/customers/${customer.id}`}
                target="_blank"
                rel="noopener noreferrer"
              >
                <ExternalLink className="mr-1.5 h-3.5 w-3.5" />
                Full Profile
              </a>
            </Button>
            <Button variant="ghost" size="sm" onClick={onClose}>
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>

        <div className="space-y-6 p-6">
          {/* Customer Info Card */}
          <Card>
            <CardContent className="p-6">
              <h3 className="mb-4 font-semibold">Customer Information</h3>

              <div className="grid gap-4 sm:grid-cols-2">
                {/* Contact Info */}
                <div className="space-y-3">
                  <div className="flex items-center gap-2 text-sm">
                    <Mail className="h-4 w-4 text-muted-foreground" />
                    <span>{customer.email || 'No email'}</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <Phone className="h-4 w-4 text-muted-foreground" />
                    <span>{customer.phone || 'No phone'}</span>
                  </div>
                </div>

                {/* Portal Status */}
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <Shield className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm">Portal Access:</span>
                    <Badge variant={customer.portalAccessEnabled ? 'default' : 'secondary'}>
                      {customer.portalAccessEnabled ? 'Enabled' : 'Disabled'}
                    </Badge>
                  </div>
                  {customer.lastLoginAt && (
                    <div className="flex items-center gap-2 text-sm">
                      <Calendar className="h-4 w-4 text-muted-foreground" />
                      <span>Last login: {formatDate(customer.lastLoginAt)}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Stats */}
              <div className="mt-6 grid grid-cols-3 gap-4 border-t pt-6">
                <div>
                  <div className="flex items-center gap-1 text-sm text-muted-foreground">
                    <ShoppingCart className="h-4 w-4" />
                    Orders
                  </div>
                  <p className="mt-1 text-xl font-bold">{customer.ordersCount}</p>
                </div>
                <div>
                  <div className="flex items-center gap-1 text-sm text-muted-foreground">
                    <DollarSign className="h-4 w-4" />
                    Lifetime Value
                  </div>
                  <p className="mt-1 text-xl font-bold">
                    {formatMoney(customer.totalSpentCents, customer.currency)}
                  </p>
                </div>
                <div>
                  <div className="flex items-center gap-1 text-sm text-muted-foreground">
                    <Calendar className="h-4 w-4" />
                    Customer Since
                  </div>
                  <p className="mt-1 text-xl font-bold">{formatDate(customer.createdAt)}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Communication Preferences */}
          <CommunicationPrefs
            customerId={customer.id}
            customerName={fullName}
            preferences={preferences}
            onUpdate={onUpdatePrefs}
          />
        </div>
      </div>

      {/* Click outside to close */}
      <div className="fixed inset-0 -z-10" onClick={onClose} />
    </div>
  )
}
