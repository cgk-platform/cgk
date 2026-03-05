'use client'

import { PROFILES } from '@cgk-platform/openclaw/profiles'
import { Card, CardContent, CardHeader, CardTitle } from '@cgk-platform/ui'
import { BookOpen } from 'lucide-react'
import { use, useCallback, useEffect, useState } from 'react'

import { ActiveTasksPanel } from '@/components/memory/active-tasks-panel'
import { MemoryCalendar } from '@/components/memory/memory-calendar'
import { MemoryFileViewer } from '@/components/memory/memory-file-viewer'
import { MemorySearch } from '@/components/memory/memory-search'
import { RefreshButton } from '@/components/ui/refresh-button'

interface DailyFile {
  date: string
  size: number
}

interface ActiveTask {
  name: string
}

export default function MemoryPage({
  params,
}: {
  params: Promise<{ profile: string }>
}) {
  const { profile } = use(params)
  const config = PROFILES[profile as keyof typeof PROFILES]
  const [memoryMd, setMemoryMd] = useState('')
  const [dailyFiles, setDailyFiles] = useState<DailyFile[]>([])
  const [activeTasks, setActiveTasks] = useState<ActiveTask[]>([])
  const [selectedDate, setSelectedDate] = useState<string | null>(null)
  const [dailyContent, setDailyContent] = useState('')
  const [loading, setLoading] = useState(true)
  const [loadingDaily, setLoadingDaily] = useState(false)

  const fetchData = useCallback(async () => {
    try {
      const res = await fetch(`/api/openclaw/${profile}/memory`)
      const data = await res.json()
      setMemoryMd(data.memoryMd || '')
      setDailyFiles(data.dailyFiles || [])
      setActiveTasks(data.activeTasks || [])
    } catch {
      // ignore
    } finally {
      setLoading(false)
    }
  }, [profile])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  const selectDate = useCallback(async (date: string) => {
    setSelectedDate(date)
    setLoadingDaily(true)
    try {
      const res = await fetch(`/api/openclaw/${profile}/memory?date=${date}`)
      const data = await res.json()
      setDailyContent(data.dailyContent || '')
    } catch {
      setDailyContent('')
    } finally {
      setLoadingDaily(false)
    }
  }, [profile])

  const availableDates = new Set(dailyFiles.map((f) => f.date))

  if (loading) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">
            Memory — {config?.label || profile}
          </h1>
        </div>
        <div className="h-64 animate-pulse rounded-lg border bg-card" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">
            Memory — {config?.label || profile}
          </h1>
          <p className="text-muted-foreground">
            {dailyFiles.length} daily files, {activeTasks.length} active tasks
          </p>
        </div>
        <RefreshButton onRefresh={fetchData} />
      </div>

      {/* MEMORY.md summary */}
      {memoryMd && (
        <Card>
          <CardHeader className="pb-2">
            <div className="flex items-center gap-2">
              <BookOpen className="h-4 w-4 text-muted-foreground" />
              <CardTitle className="text-base">MEMORY.md</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <pre className="max-h-48 overflow-auto whitespace-pre-wrap font-mono text-xs text-muted-foreground">
              {memoryMd}
            </pre>
          </CardContent>
        </Card>
      )}

      {/* Search */}
      <MemorySearch profile={profile} onSelectDate={selectDate} />

      {/* Calendar + daily viewer + active tasks */}
      <div className="grid gap-6 lg:grid-cols-[280px_1fr_260px]">
        <div>
          <MemoryCalendar
            availableDates={availableDates}
            selectedDate={selectedDate}
            onSelectDate={selectDate}
          />
        </div>

        <div>
          <MemoryFileViewer
            date={selectedDate}
            content={dailyContent}
            loading={loadingDaily}
          />
        </div>

        <div>
          <ActiveTasksPanel tasks={activeTasks} profile={profile} />
        </div>
      </div>
    </div>
  )
}
