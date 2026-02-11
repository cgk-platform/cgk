'use client'

import { cn } from '@cgk/ui'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { useState, useMemo } from 'react'

import type { PipelineProject, ProjectStatus } from '@/lib/pipeline/types'
import { getStageColor } from '@/lib/pipeline/types'

interface CalendarViewProps {
  projects: PipelineProject[]
  onProjectClick: (project: PipelineProject) => void
  onDueDateChange: (projectId: string, newDate: string) => void
}

type ViewMode = 'month' | 'week'

function formatCurrency(cents: number): string {
  if (cents >= 100000) {
    return `$${(cents / 100000).toFixed(0)}k`
  }
  return `$${(cents / 100).toFixed(0)}`
}

function getDaysInMonth(year: number, month: number): number {
  return new Date(year, month + 1, 0).getDate()
}

function getFirstDayOfMonth(year: number, month: number): number {
  return new Date(year, month, 1).getDay()
}

function isSameDay(date1: Date, date2: Date): boolean {
  return (
    date1.getFullYear() === date2.getFullYear() &&
    date1.getMonth() === date2.getMonth() &&
    date1.getDate() === date2.getDate()
  )
}

function isToday(date: Date): boolean {
  return isSameDay(date, new Date())
}

interface ProjectEventProps {
  project: PipelineProject
  onClick: () => void
}

function ProjectEvent({ project, onClick }: ProjectEventProps) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'group flex w-full items-center gap-1 truncate rounded px-1.5 py-0.5 text-left text-[10px] font-medium transition-colors hover:opacity-80',
        project.riskLevel === 'critical' && 'animate-pulse'
      )}
      style={{
        backgroundColor: `${getStageColor(project.status)}20`,
        color: getStageColor(project.status),
        borderLeft: `2px solid ${getStageColor(project.status)}`,
      }}
    >
      <span className="truncate">{project.title}</span>
      {project.valueCents > 0 && (
        <span className="shrink-0 text-[9px] opacity-70">
          {formatCurrency(project.valueCents)}
        </span>
      )}
    </button>
  )
}

export function CalendarView({
  projects,
  onProjectClick,
  onDueDateChange,
}: CalendarViewProps) {
  const [currentDate, setCurrentDate] = useState(new Date())
  const [viewMode, setViewMode] = useState<ViewMode>('month')

  // Filter to only projects with due dates
  const projectsWithDates = useMemo(
    () => projects.filter((p) => p.dueDate),
    [projects]
  )

  // Group projects by date
  const projectsByDate = useMemo(() => {
    const map = new Map<string, PipelineProject[]>()
    for (const project of projectsWithDates) {
      const dateKey = project.dueDate!.split('T')[0]
      if (!map.has(dateKey)) {
        map.set(dateKey, [])
      }
      map.get(dateKey)!.push(project)
    }
    return map
  }, [projectsWithDates])

  const year = currentDate.getFullYear()
  const month = currentDate.getMonth()

  const daysInMonth = getDaysInMonth(year, month)
  const firstDay = getFirstDayOfMonth(year, month)

  // Generate calendar days
  const calendarDays = useMemo(() => {
    const days: Array<{ date: Date; isCurrentMonth: boolean }> = []

    // Previous month days
    const prevMonth = month === 0 ? 11 : month - 1
    const prevYear = month === 0 ? year - 1 : year
    const daysInPrevMonth = getDaysInMonth(prevYear, prevMonth)

    for (let i = firstDay - 1; i >= 0; i--) {
      days.push({
        date: new Date(prevYear, prevMonth, daysInPrevMonth - i),
        isCurrentMonth: false,
      })
    }

    // Current month days
    for (let i = 1; i <= daysInMonth; i++) {
      days.push({
        date: new Date(year, month, i),
        isCurrentMonth: true,
      })
    }

    // Next month days to fill grid
    const remainingDays = 42 - days.length
    const nextMonth = month === 11 ? 0 : month + 1
    const nextYear = month === 11 ? year + 1 : year

    for (let i = 1; i <= remainingDays; i++) {
      days.push({
        date: new Date(nextYear, nextMonth, i),
        isCurrentMonth: false,
      })
    }

    return days
  }, [year, month, daysInMonth, firstDay])

  const navigateMonth = (direction: -1 | 1) => {
    setCurrentDate((prev) => {
      const newDate = new Date(prev)
      newDate.setMonth(prev.getMonth() + direction)
      return newDate
    })
  }

  const goToToday = () => {
    setCurrentDate(new Date())
  }

  const monthName = currentDate.toLocaleDateString('en-US', {
    month: 'long',
    year: 'numeric',
  })

  const weekDays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

  return (
    <div className="rounded-lg border border-slate-700/30 bg-slate-900/30 backdrop-blur-sm">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-slate-700/30 px-4 py-3">
        <div className="flex items-center gap-4">
          <h2 className="font-mono text-lg font-semibold text-slate-200">
            {monthName}
          </h2>
          <div className="flex items-center gap-1 rounded-lg border border-slate-700/50 p-0.5">
            <button
              onClick={() => setViewMode('month')}
              className={cn(
                'rounded px-2 py-1 font-mono text-xs transition-colors',
                viewMode === 'month'
                  ? 'bg-slate-700 text-slate-200'
                  : 'text-slate-500 hover:text-slate-300'
              )}
            >
              Month
            </button>
            <button
              onClick={() => setViewMode('week')}
              className={cn(
                'rounded px-2 py-1 font-mono text-xs transition-colors',
                viewMode === 'week'
                  ? 'bg-slate-700 text-slate-200'
                  : 'text-slate-500 hover:text-slate-300'
              )}
            >
              Week
            </button>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={goToToday}
            className="rounded border border-slate-700/50 px-3 py-1.5 font-mono text-xs text-slate-400 transition-colors hover:border-slate-600 hover:text-slate-300"
          >
            Today
          </button>
          <button
            onClick={() => navigateMonth(-1)}
            className="rounded p-1.5 text-slate-400 transition-colors hover:bg-slate-700/50 hover:text-slate-300"
          >
            <ChevronLeft className="h-5 w-5" />
          </button>
          <button
            onClick={() => navigateMonth(1)}
            className="rounded p-1.5 text-slate-400 transition-colors hover:bg-slate-700/50 hover:text-slate-300"
          >
            <ChevronRight className="h-5 w-5" />
          </button>
        </div>
      </div>

      {/* Week day headers */}
      <div className="grid grid-cols-7 border-b border-slate-700/30">
        {weekDays.map((day) => (
          <div
            key={day}
            className="px-2 py-2 text-center font-mono text-xs font-medium uppercase tracking-wider text-slate-500"
          >
            {day}
          </div>
        ))}
      </div>

      {/* Calendar grid */}
      <div className="grid grid-cols-7">
        {calendarDays.map(({ date, isCurrentMonth }, index) => {
          const dateKey = date.toISOString().split('T')[0]
          const dayProjects = projectsByDate.get(dateKey) || []
          const isCurrentDay = isToday(date)

          return (
            <div
              key={index}
              className={cn(
                'min-h-[100px] border-b border-r border-slate-700/20 p-1',
                !isCurrentMonth && 'bg-slate-900/50',
                index % 7 === 6 && 'border-r-0'
              )}
            >
              <div className="mb-1 flex items-center justify-between">
                <span
                  className={cn(
                    'flex h-6 w-6 items-center justify-center rounded-full font-mono text-xs',
                    isCurrentDay && 'bg-blue-500 font-semibold text-white',
                    !isCurrentDay && isCurrentMonth && 'text-slate-300',
                    !isCurrentDay && !isCurrentMonth && 'text-slate-600'
                  )}
                >
                  {date.getDate()}
                </span>
                {dayProjects.length > 0 && (
                  <span className="font-mono text-[10px] text-slate-500">
                    {dayProjects.length}
                  </span>
                )}
              </div>
              <div className="space-y-0.5">
                {dayProjects.slice(0, 3).map((project) => (
                  <ProjectEvent
                    key={project.id}
                    project={project}
                    onClick={() => onProjectClick(project)}
                  />
                ))}
                {dayProjects.length > 3 && (
                  <div className="px-1.5 font-mono text-[10px] text-slate-500">
                    +{dayProjects.length - 3} more
                  </div>
                )}
              </div>
            </div>
          )
        })}
      </div>

      {/* Legend */}
      <div className="flex items-center gap-4 border-t border-slate-700/30 px-4 py-2">
        <span className="font-mono text-xs text-slate-500">Status:</span>
        {[
          { id: 'in_progress', label: 'In Progress' },
          { id: 'submitted', label: 'Submitted' },
          { id: 'revision_requested', label: 'Revisions' },
          { id: 'approved', label: 'Approved' },
        ].map((stage) => (
          <div key={stage.id} className="flex items-center gap-1.5">
            <span
              className="h-2 w-2 rounded-full"
              style={{ backgroundColor: getStageColor(stage.id as ProjectStatus) }}
            />
            <span className="font-mono text-xs text-slate-400">{stage.label}</span>
          </div>
        ))}
      </div>
    </div>
  )
}
