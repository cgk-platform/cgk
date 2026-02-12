'use client'

import { useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import {
  Button,
  Card,
  CardContent,
  RadixSelect,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Badge,
} from '@cgk/ui'
import {
  Loader2,
  Phone,
  PhoneIncoming,
  PhoneOutgoing,
  PlayCircle,
  FileText,
  Clock,
  TrendingUp,
  TrendingDown,
  Minus,
} from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'

interface VoiceCall {
  id: string
  agentId: string
  callSid: string
  provider: string
  direction: 'inbound' | 'outbound'
  fromNumber: string | null
  toNumber: string | null
  callerName: string | null
  status: string
  startedAt: string
  answeredAt: string | null
  endedAt: string | null
  durationSeconds: number | null
  creatorId: string | null
  recordingUrl: string | null
  summary: string | null
  sentiment: 'positive' | 'neutral' | 'negative' | null
}

interface CallStats {
  totalCalls: number
  completedCalls: number
  missedCalls: number
  avgDurationSeconds: number
  totalDurationSeconds: number
  inboundCalls: number
  outboundCalls: number
  positiveCallPercent: number
  negativeCallPercent: number
}

const STATUS_COLORS: Record<string, string> = {
  initiated: 'bg-yellow-100 text-yellow-800',
  ringing: 'bg-blue-100 text-blue-800',
  in_progress: 'bg-green-100 text-green-800',
  completed: 'bg-gray-100 text-gray-800',
  failed: 'bg-red-100 text-red-800',
  voicemail: 'bg-purple-100 text-purple-800',
  missed: 'bg-orange-100 text-orange-800',
  cancelled: 'bg-gray-100 text-gray-500',
}

const SENTIMENT_ICONS = {
  positive: TrendingUp,
  neutral: Minus,
  negative: TrendingDown,
}

const SENTIMENT_COLORS = {
  positive: 'text-green-600',
  neutral: 'text-gray-600',
  negative: 'text-red-600',
}

export default function CallHistoryPage() {
  const router = useRouter()
  const searchParams = useSearchParams()

  const [calls, setCalls] = useState<VoiceCall[]>([])
  const [stats, setStats] = useState<CallStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [, setError] = useState<string | null>(null)

  // Filters
  const [agentId, setAgentId] = useState(searchParams.get('agentId') || '')
  const [direction, setDirection] = useState(searchParams.get('direction') || '')
  const [status, setStatus] = useState(searchParams.get('status') || '')
  const [dateRange, setDateRange] = useState('7days')

  useEffect(() => {
    async function fetchCalls() {
      setLoading(true)
      try {
        const params = new URLSearchParams()
        if (agentId) params.set('agentId', agentId)
        if (direction) params.set('direction', direction)
        if (status) params.set('status', status)
        params.set('includeStats', 'true')

        // Calculate date range
        const endDate = new Date()
        let startDate = new Date()
        switch (dateRange) {
          case '24hours':
            startDate.setHours(startDate.getHours() - 24)
            break
          case '7days':
            startDate.setDate(startDate.getDate() - 7)
            break
          case '30days':
            startDate.setDate(startDate.getDate() - 30)
            break
          case '90days':
            startDate.setDate(startDate.getDate() - 90)
            break
        }
        params.set('startDate', startDate.toISOString())
        params.set('endDate', endDate.toISOString())

        const response = await fetch(`/api/admin/ai-agents/calls?${params}`)
        if (response.ok) {
          const data = await response.json()
          setCalls(data.calls || [])
          setStats(data.stats)
        } else {
          setError('Failed to fetch calls')
        }
      } catch {
        setError('Failed to fetch calls')
      } finally {
        setLoading(false)
      }
    }
    fetchCalls()
  }, [agentId, direction, status, dateRange])

  function formatDuration(seconds: number | null): string {
    if (!seconds) return '--'
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Voice Calls</h1>
        <p className="text-muted-foreground">
          View and manage voice call history across all AI agents.
        </p>
      </div>

      {/* Stats Cards */}
      {stats && (
        <div className="grid grid-cols-4 gap-4">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Total Calls</p>
                  <p className="text-2xl font-bold">{stats.totalCalls}</p>
                </div>
                <Phone className="h-8 w-8 text-muted-foreground" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Completed</p>
                  <p className="text-2xl font-bold">{stats.completedCalls}</p>
                </div>
                <div className="text-right">
                  <p className="text-sm text-muted-foreground">Missed</p>
                  <p className="text-lg font-semibold text-orange-600">{stats.missedCalls}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Avg Duration</p>
                  <p className="text-2xl font-bold">{formatDuration(stats.avgDurationSeconds)}</p>
                </div>
                <Clock className="h-8 w-8 text-muted-foreground" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Sentiment</p>
                  <div className="flex gap-2">
                    <span className="text-green-600">{stats.positiveCallPercent}%</span>
                    <span className="text-muted-foreground">/</span>
                    <span className="text-red-600">{stats.negativeCallPercent}%</span>
                  </div>
                </div>
                <TrendingUp className="h-8 w-8 text-green-600" />
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex gap-4 items-end">
            <div className="space-y-2">
              <label className="text-sm font-medium">Agent</label>
              <RadixSelect value={agentId} onValueChange={setAgentId}>
                <SelectTrigger className="w-40">
                  <SelectValue placeholder="All agents" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">All agents</SelectItem>
                </SelectContent>
              </RadixSelect>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Direction</label>
              <RadixSelect value={direction} onValueChange={setDirection}>
                <SelectTrigger className="w-40">
                  <SelectValue placeholder="All" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">All</SelectItem>
                  <SelectItem value="inbound">Inbound</SelectItem>
                  <SelectItem value="outbound">Outbound</SelectItem>
                </SelectContent>
              </RadixSelect>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Status</label>
              <RadixSelect value={status} onValueChange={setStatus}>
                <SelectTrigger className="w-40">
                  <SelectValue placeholder="All" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">All</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                  <SelectItem value="missed">Missed</SelectItem>
                  <SelectItem value="failed">Failed</SelectItem>
                  <SelectItem value="voicemail">Voicemail</SelectItem>
                </SelectContent>
              </RadixSelect>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Date Range</label>
              <RadixSelect value={dateRange} onValueChange={setDateRange}>
                <SelectTrigger className="w-40">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="24hours">Last 24 hours</SelectItem>
                  <SelectItem value="7days">Last 7 days</SelectItem>
                  <SelectItem value="30days">Last 30 days</SelectItem>
                  <SelectItem value="90days">Last 90 days</SelectItem>
                </SelectContent>
              </RadixSelect>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Call List */}
      {loading ? (
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : calls.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Phone className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <p className="text-lg font-medium">No calls found</p>
            <p className="text-sm text-muted-foreground">
              Calls will appear here when agents make or receive voice calls.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {calls.map((call) => {
            const DirectionIcon = call.direction === 'inbound' ? PhoneIncoming : PhoneOutgoing
            const SentimentIcon = call.sentiment ? SENTIMENT_ICONS[call.sentiment] : null

            return (
              <Card
                key={call.id}
                className="cursor-pointer hover:border-primary transition-colors"
                onClick={() => router.push(`/admin/ai-team/calls/${call.id}`)}
              >
                <CardContent className="py-4">
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-4">
                      <div className="p-2 bg-muted rounded-lg">
                        <DirectionIcon className="h-5 w-5" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-medium">
                            {call.direction === 'inbound' ? call.fromNumber : call.toNumber}
                          </span>
                          {call.callerName && (
                            <span className="text-muted-foreground">({call.callerName})</span>
                          )}
                        </div>
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <span>
                            {call.direction === 'inbound' ? 'Inbound' : 'Outbound'}
                          </span>
                          <span>-</span>
                          <span>{formatDuration(call.durationSeconds)}</span>
                        </div>
                        {call.summary && (
                          <p className="mt-2 text-sm text-muted-foreground line-clamp-2">
                            {call.summary}
                          </p>
                        )}
                      </div>
                    </div>
                    <div className="flex flex-col items-end gap-2">
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className={STATUS_COLORS[call.status] || ''}>
                          {call.status.replace('_', ' ')}
                        </Badge>
                        {SentimentIcon && (
                          <SentimentIcon
                            className={`h-4 w-4 ${SENTIMENT_COLORS[call.sentiment!]}`}
                          />
                        )}
                      </div>
                      <span className="text-sm text-muted-foreground">
                        {formatDistanceToNow(new Date(call.startedAt), { addSuffix: true })}
                      </span>
                      <div className="flex gap-2">
                        {call.recordingUrl && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation()
                              window.open(call.recordingUrl!, '_blank')
                            }}
                          >
                            <PlayCircle className="h-4 w-4 mr-1" />
                            Play
                          </Button>
                        )}
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation()
                            router.push(`/admin/ai-team/calls/${call.id}?tab=transcript`)
                          }}
                        >
                          <FileText className="h-4 w-4 mr-1" />
                          Transcript
                        </Button>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}
    </div>
  )
}
