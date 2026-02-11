import { Card, CardContent, CardHeader } from '@cgk/ui'
import { getAllSLAConfigs } from '@cgk/support'
import { headers } from 'next/headers'
import { Clock, AlertTriangle, Timer } from 'lucide-react'

import { SLASettingsClient } from './sla-settings-client'

export default async function SupportSettingsPage() {
  const headersList = await headers()
  const tenantId = headersList.get('x-tenant-id')

  if (!tenantId) {
    return <div className="p-8 text-center text-muted-foreground">Tenant not found</div>
  }

  const slaConfigs = await getAllSLAConfigs(tenantId)

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-semibold">Support Settings</h1>
        <p className="text-sm text-muted-foreground">
          Configure SLA rules and support behavior
        </p>
      </div>

      {/* SLA Configuration */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Clock className="h-5 w-5 text-muted-foreground" />
            <h2 className="text-lg font-semibold">SLA Configuration</h2>
          </div>
          <p className="text-sm text-muted-foreground">
            Set response and resolution time targets for each priority level
          </p>
        </CardHeader>
        <CardContent>
          <SLASettingsClient initialConfigs={slaConfigs} />
        </CardContent>
      </Card>

      {/* Auto-Assignment Rules */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Timer className="h-5 w-5 text-muted-foreground" />
            <h2 className="text-lg font-semibold">Auto-Assignment</h2>
          </div>
          <p className="text-sm text-muted-foreground">
            Configure how tickets are automatically assigned to agents
          </p>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">Enable Auto-Assignment</p>
                <p className="text-sm text-muted-foreground">
                  Automatically assign new tickets to available agents
                </p>
              </div>
              <label className="relative inline-flex cursor-pointer items-center">
                <input type="checkbox" className="peer sr-only" defaultChecked />
                <div className="peer h-6 w-11 rounded-full bg-gray-200 after:absolute after:start-[2px] after:top-0.5 after:h-5 after:w-5 after:rounded-full after:border after:border-gray-300 after:bg-white after:transition-all after:content-[''] peer-checked:bg-primary peer-checked:after:translate-x-full peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-ring dark:bg-gray-700" />
              </label>
            </div>

            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">Round Robin Assignment</p>
                <p className="text-sm text-muted-foreground">
                  Distribute tickets evenly among available agents
                </p>
              </div>
              <label className="relative inline-flex cursor-pointer items-center">
                <input type="checkbox" className="peer sr-only" defaultChecked />
                <div className="peer h-6 w-11 rounded-full bg-gray-200 after:absolute after:start-[2px] after:top-0.5 after:h-5 after:w-5 after:rounded-full after:border after:border-gray-300 after:bg-white after:transition-all after:content-[''] peer-checked:bg-primary peer-checked:after:translate-x-full peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-ring dark:bg-gray-700" />
              </label>
            </div>

            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">Respect Agent Capacity</p>
                <p className="text-sm text-muted-foreground">
                  Don't assign to agents who have reached their max ticket limit
                </p>
              </div>
              <label className="relative inline-flex cursor-pointer items-center">
                <input type="checkbox" className="peer sr-only" defaultChecked />
                <div className="peer h-6 w-11 rounded-full bg-gray-200 after:absolute after:start-[2px] after:top-0.5 after:h-5 after:w-5 after:rounded-full after:border after:border-gray-300 after:bg-white after:transition-all after:content-[''] peer-checked:bg-primary peer-checked:after:translate-x-full peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-ring dark:bg-gray-700" />
              </label>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Sentiment Analysis */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-muted-foreground" />
            <h2 className="text-lg font-semibold">Sentiment Analysis</h2>
          </div>
          <p className="text-sm text-muted-foreground">
            Configure AI-powered sentiment detection and escalation rules
          </p>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">Enable AI Sentiment Analysis</p>
                <p className="text-sm text-muted-foreground">
                  Use Claude AI to analyze ticket sentiment
                </p>
              </div>
              <label className="relative inline-flex cursor-pointer items-center">
                <input type="checkbox" className="peer sr-only" defaultChecked />
                <div className="peer h-6 w-11 rounded-full bg-gray-200 after:absolute after:start-[2px] after:top-0.5 after:h-5 after:w-5 after:rounded-full after:border after:border-gray-300 after:bg-white after:transition-all after:content-[''] peer-checked:bg-primary peer-checked:after:translate-x-full peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-ring dark:bg-gray-700" />
              </label>
            </div>

            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">Auto-Escalate Negative Sentiment</p>
                <p className="text-sm text-muted-foreground">
                  Automatically escalate tickets with highly negative sentiment to HIGH priority
                </p>
              </div>
              <label className="relative inline-flex cursor-pointer items-center">
                <input type="checkbox" className="peer sr-only" defaultChecked />
                <div className="peer h-6 w-11 rounded-full bg-gray-200 after:absolute after:start-[2px] after:top-0.5 after:h-5 after:w-5 after:rounded-full after:border after:border-gray-300 after:bg-white after:transition-all after:content-[''] peer-checked:bg-primary peer-checked:after:translate-x-full peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-ring dark:bg-gray-700" />
              </label>
            </div>

            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">Create Sentiment Alerts</p>
                <p className="text-sm text-muted-foreground">
                  Create alerts for moderately negative sentiment requiring attention
                </p>
              </div>
              <label className="relative inline-flex cursor-pointer items-center">
                <input type="checkbox" className="peer sr-only" defaultChecked />
                <div className="peer h-6 w-11 rounded-full bg-gray-200 after:absolute after:start-[2px] after:top-0.5 after:h-5 after:w-5 after:rounded-full after:border after:border-gray-300 after:bg-white after:transition-all after:content-[''] peer-checked:bg-primary peer-checked:after:translate-x-full peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-ring dark:bg-gray-700" />
              </label>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
