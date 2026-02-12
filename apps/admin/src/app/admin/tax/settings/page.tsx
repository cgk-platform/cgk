import { Button, Card, CardContent, CardHeader, Input, Label } from '@cgk/ui'
import { headers } from 'next/headers'
import { Suspense } from 'react'

// Tax Settings Page

export default async function TaxSettingsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold">Tax Settings</h2>
        <p className="text-sm text-muted-foreground">
          Configure payer information and tax compliance settings
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <h3 className="font-semibold">Payer Information</h3>
            <p className="text-sm text-muted-foreground">
              This information appears on all 1099 forms as the payer
            </p>
          </CardHeader>
          <CardContent>
            <Suspense fallback={<FormSkeleton />}>
              <PayerInfoForm />
            </Suspense>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <h3 className="font-semibold">Delivery Preferences</h3>
            <p className="text-sm text-muted-foreground">
              Configure how 1099 forms are delivered to recipients
            </p>
          </CardHeader>
          <CardContent>
            <Suspense fallback={<FormSkeleton />}>
              <DeliveryPreferencesForm />
            </Suspense>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <h3 className="font-semibold">W-9 Reminder Settings</h3>
            <p className="text-sm text-muted-foreground">
              Configure automated W-9 collection reminders
            </p>
          </CardHeader>
          <CardContent>
            <Suspense fallback={<FormSkeleton />}>
              <W9ReminderForm />
            </Suspense>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <h3 className="font-semibold">Tax Year Deadlines</h3>
            <p className="text-sm text-muted-foreground">
              Key tax compliance deadlines and reminders
            </p>
          </CardHeader>
          <CardContent>
            <Suspense fallback={<FormSkeleton />}>
              <DeadlinesSection />
            </Suspense>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

async function PayerInfoForm() {
  // Headers available for future tenant context
  void (await headers())

  // Mock payer info - would come from tenant settings or env
  const payerInfo = {
    name: process.env.TAX_PAYER_NAME || '',
    ein: process.env.TAX_PAYER_EIN || '',
    addressLine1: process.env.TAX_PAYER_ADDRESS_LINE1 || '',
    addressLine2: process.env.TAX_PAYER_ADDRESS_LINE2 || '',
    city: process.env.TAX_PAYER_CITY || '',
    state: process.env.TAX_PAYER_STATE || '',
    zip: process.env.TAX_PAYER_ZIP || '',
  }

  return (
    <form className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="payerName">Business Name</Label>
        <Input
          id="payerName"
          name="payerName"
          defaultValue={payerInfo.name}
          placeholder="Your Business Name, Inc."
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="payerEin">EIN</Label>
        <Input
          id="payerEin"
          name="payerEin"
          defaultValue={payerInfo.ein ? '**-***' + payerInfo.ein.slice(-4) : ''}
          placeholder="XX-XXXXXXX"
        />
        <p className="text-xs text-muted-foreground">
          Your Employer Identification Number
        </p>
      </div>

      <div className="space-y-2">
        <Label htmlFor="addressLine1">Address Line 1</Label>
        <Input
          id="addressLine1"
          name="addressLine1"
          defaultValue={payerInfo.addressLine1}
          placeholder="123 Main St"
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="addressLine2">Address Line 2</Label>
        <Input
          id="addressLine2"
          name="addressLine2"
          defaultValue={payerInfo.addressLine2}
          placeholder="Suite 100"
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <div className="space-y-2">
          <Label htmlFor="city">City</Label>
          <Input
            id="city"
            name="city"
            defaultValue={payerInfo.city}
            placeholder="New York"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="state">State</Label>
          <Input
            id="state"
            name="state"
            defaultValue={payerInfo.state}
            placeholder="NY"
            maxLength={2}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="zip">ZIP Code</Label>
          <Input
            id="zip"
            name="zip"
            defaultValue={payerInfo.zip}
            placeholder="10001"
          />
        </div>
      </div>

      <Button type="submit">Save Payer Info</Button>
    </form>
  )
}

async function DeliveryPreferencesForm() {
  return (
    <form className="space-y-4">
      <div className="space-y-3">
        <div className="flex items-center justify-between rounded-md border p-3">
          <div>
            <div className="font-medium">Email Delivery</div>
            <div className="text-sm text-muted-foreground">
              Send 1099 forms via email to recipients
            </div>
          </div>
          <input type="checkbox" defaultChecked className="rounded" />
        </div>

        <div className="flex items-center justify-between rounded-md border p-3">
          <div>
            <div className="font-medium">Portal Access</div>
            <div className="text-sm text-muted-foreground">
              Make 1099 forms available in creator portal
            </div>
          </div>
          <input type="checkbox" defaultChecked className="rounded" />
        </div>

        <div className="flex items-center justify-between rounded-md border p-3">
          <div>
            <div className="font-medium">Physical Mail</div>
            <div className="text-sm text-muted-foreground">
              Send paper copies via USPS (additional cost)
            </div>
          </div>
          <input type="checkbox" className="rounded" />
        </div>
      </div>

      <div className="space-y-2">
        <Label>E-Delivery Consent Required</Label>
        <p className="text-xs text-muted-foreground">
          Require recipients to consent to electronic delivery before
          sending 1099 forms via email or portal
        </p>
        <div className="flex items-center gap-2">
          <input type="checkbox" defaultChecked className="rounded" />
          <span className="text-sm">Require e-delivery consent</span>
        </div>
      </div>

      <Button type="submit">Save Preferences</Button>
    </form>
  )
}

async function W9ReminderForm() {
  return (
    <form className="space-y-4">
      <div className="flex items-center justify-between rounded-md border p-3">
        <div>
          <div className="font-medium">Automated Reminders</div>
          <div className="text-sm text-muted-foreground">
            Automatically send W-9 request reminders
          </div>
        </div>
        <input type="checkbox" defaultChecked className="rounded" />
      </div>

      <div className="space-y-3">
        <Label>Reminder Schedule</Label>
        <div className="space-y-2 text-sm">
          <div className="flex items-center justify-between rounded-md border p-2">
            <span>Initial Request</span>
            <span className="text-muted-foreground">Day 0</span>
          </div>
          <div className="flex items-center justify-between rounded-md border p-2">
            <span>First Reminder</span>
            <span className="text-muted-foreground">Day 7</span>
          </div>
          <div className="flex items-center justify-between rounded-md border p-2">
            <span>Second Reminder</span>
            <span className="text-muted-foreground">Day 14</span>
          </div>
          <div className="flex items-center justify-between rounded-md border p-2">
            <span>Final Notice</span>
            <span className="text-muted-foreground">Day 21</span>
          </div>
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="thresholdTrigger">Payment Threshold Trigger</Label>
        <div className="flex items-center gap-2">
          <span className="text-sm">$</span>
          <Input
            id="thresholdTrigger"
            name="thresholdTrigger"
            type="number"
            defaultValue={300}
            className="w-24"
          />
          <span className="text-sm text-muted-foreground">
            (50% of $600 threshold)
          </span>
        </div>
        <p className="text-xs text-muted-foreground">
          Start requesting W-9 when payments reach this amount
        </p>
      </div>

      <Button type="submit">Save Settings</Button>
    </form>
  )
}

async function DeadlinesSection() {
  const currentYear = new Date().getFullYear()

  const deadlines = [
    {
      date: `January 31, ${currentYear + 1}`,
      title: '1099 Forms Due to Recipients',
      description: 'All 1099 forms must be sent to payees',
      priority: 'high',
    },
    {
      date: `January 31, ${currentYear + 1}`,
      title: '1099-NEC Filing Deadline',
      description: 'File 1099-NEC forms with IRS',
      priority: 'high',
    },
    {
      date: `February 28, ${currentYear + 1}`,
      title: '1099-MISC Filing (Paper)',
      description: 'Paper filing deadline for 1099-MISC',
      priority: 'medium',
    },
    {
      date: `March 31, ${currentYear + 1}`,
      title: '1099-MISC Filing (Electronic)',
      description: 'Electronic filing deadline for 1099-MISC',
      priority: 'medium',
    },
  ]

  return (
    <div className="space-y-3">
      {deadlines.map((deadline, i) => (
        <div
          key={i}
          className={`rounded-md border p-3 ${
            deadline.priority === 'high' ? 'border-red-200 bg-red-50' : ''
          }`}
        >
          <div className="flex items-start justify-between">
            <div>
              <div className="font-medium">{deadline.title}</div>
              <div className="text-sm text-muted-foreground">
                {deadline.description}
              </div>
            </div>
            <div className="text-right">
              <div className="text-sm font-medium">{deadline.date}</div>
              {deadline.priority === 'high' && (
                <div className="text-xs text-red-600">Critical</div>
              )}
            </div>
          </div>
        </div>
      ))}

      <Button variant="outline" className="w-full">
        Add Custom Reminder
      </Button>
    </div>
  )
}

function FormSkeleton() {
  return (
    <div className="space-y-4">
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i}>
          <div className="mb-2 h-4 w-24 animate-pulse rounded bg-muted" />
          <div className="h-10 w-full animate-pulse rounded bg-muted" />
        </div>
      ))}
    </div>
  )
}
