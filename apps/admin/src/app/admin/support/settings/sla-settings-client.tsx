'use client'

import { useState } from 'react'
import { Button, Input } from '@cgk/ui'
import { Loader2, Save } from 'lucide-react'
import type { SLAConfig, TicketPriority } from '@cgk/support'

interface SLASettingsClientProps {
  initialConfigs: SLAConfig[]
}

const PRIORITIES: TicketPriority[] = ['urgent', 'high', 'normal', 'low']

const PRIORITY_LABELS: Record<TicketPriority, string> = {
  urgent: 'Urgent',
  high: 'High',
  normal: 'Normal',
  low: 'Low',
}

const PRIORITY_COLORS: Record<TicketPriority, string> = {
  urgent: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
  high: 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200',
  normal: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
  low: 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200',
}

function minutesToHumanReadable(minutes: number): string {
  if (minutes < 60) return `${minutes} minutes`
  if (minutes < 1440) return `${Math.round(minutes / 60)} hours`
  return `${Math.round(minutes / 1440)} days`
}

export function SLASettingsClient({ initialConfigs }: SLASettingsClientProps) {
  const [configs, setConfigs] = useState<Record<TicketPriority, { firstResponse: number; resolution: number }>>(() => {
    const result: Record<TicketPriority, { firstResponse: number; resolution: number }> = {
      urgent: { firstResponse: 60, resolution: 240 },
      high: { firstResponse: 240, resolution: 1440 },
      normal: { firstResponse: 1440, resolution: 4320 },
      low: { firstResponse: 4320, resolution: 10080 },
    }

    for (const config of initialConfigs) {
      result[config.priority] = {
        firstResponse: config.firstResponseMinutes,
        resolution: config.resolutionMinutes,
      }
    }

    return result
  })

  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  const handleChange = (
    priority: TicketPriority,
    field: 'firstResponse' | 'resolution',
    value: number
  ) => {
    setConfigs((prev) => ({
      ...prev,
      [priority]: {
        ...prev[priority],
        [field]: value,
      },
    }))
    setSaved(false)
  }

  const handleSave = async () => {
    setSaving(true)
    try {
      // Save each priority config
      for (const priority of PRIORITIES) {
        const config = configs[priority]
        await fetch('/api/admin/support/sla', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            priority,
            firstResponseMinutes: config.firstResponse,
            resolutionMinutes: config.resolution,
          }),
        })
      }
      setSaved(true)
    } catch (error) {
      console.error('Failed to save SLA configs:', error)
      alert('Failed to save settings')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-6">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b">
              <th className="py-3 text-left font-medium text-muted-foreground">Priority</th>
              <th className="py-3 text-left font-medium text-muted-foreground">First Response</th>
              <th className="py-3 text-left font-medium text-muted-foreground">Resolution</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {PRIORITIES.map((priority) => (
              <tr key={priority}>
                <td className="py-4">
                  <span
                    className={`inline-flex items-center rounded-md px-2 py-1 text-xs font-medium ${PRIORITY_COLORS[priority]}`}
                  >
                    {PRIORITY_LABELS[priority]}
                  </span>
                </td>
                <td className="py-4">
                  <div className="flex items-center gap-2">
                    <Input
                      type="number"
                      min={1}
                      value={configs[priority].firstResponse}
                      onChange={(e) =>
                        handleChange(priority, 'firstResponse', parseInt(e.target.value, 10) || 0)
                      }
                      className="w-24"
                    />
                    <span className="text-sm text-muted-foreground">
                      min ({minutesToHumanReadable(configs[priority].firstResponse)})
                    </span>
                  </div>
                </td>
                <td className="py-4">
                  <div className="flex items-center gap-2">
                    <Input
                      type="number"
                      min={1}
                      value={configs[priority].resolution}
                      onChange={(e) =>
                        handleChange(priority, 'resolution', parseInt(e.target.value, 10) || 0)
                      }
                      className="w-24"
                    />
                    <span className="text-sm text-muted-foreground">
                      min ({minutesToHumanReadable(configs[priority].resolution)})
                    </span>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="flex items-center gap-4">
        <Button onClick={handleSave} disabled={saving}>
          {saving ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Saving...
            </>
          ) : (
            <>
              <Save className="h-4 w-4 mr-2" />
              Save Changes
            </>
          )}
        </Button>
        {saved && (
          <span className="text-sm text-emerald-600 dark:text-emerald-400">
            Settings saved successfully
          </span>
        )}
      </div>
    </div>
  )
}
