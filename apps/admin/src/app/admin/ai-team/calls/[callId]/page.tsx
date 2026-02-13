'use client'

import { useParams, useRouter, useSearchParams } from 'next/navigation'
import { useEffect, useState } from 'react'
import {
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Badge,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@cgk-platform/ui'
import {
  Loader2,
  ArrowLeft,
  Phone,
  PhoneIncoming,
  PhoneOutgoing,
  PlayCircle,
  Download,
  Clock,
  Calendar,
  User,
  Bot,
  TrendingUp,
  TrendingDown,
  Minus,
  CheckCircle2,
  Circle,
} from 'lucide-react'
import { format, formatDuration, intervalToDuration } from 'date-fns'

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
  recordingDurationSeconds: number | null
  summary: string | null
  sentiment: 'positive' | 'neutral' | 'negative' | null
  actionItems: Array<{
    description: string
    completed: boolean
    dueDate?: string
    assignee?: string
  }>
}

interface VoiceTranscript {
  id: string
  callId: string
  speaker: 'agent' | 'caller' | 'system'
  speakerName: string | null
  text: string
  confidence: number | null
  startedAt: string
  endedAt: string | null
  durationMs: number | null
  isFinal: boolean
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

const SENTIMENT_INFO = {
  positive: { icon: TrendingUp, color: 'text-green-600', label: 'Positive' },
  neutral: { icon: Minus, color: 'text-gray-600', label: 'Neutral' },
  negative: { icon: TrendingDown, color: 'text-red-600', label: 'Negative' },
}

export default function CallDetailPage() {
  const params = useParams()
  const router = useRouter()
  const searchParams = useSearchParams()
  const callId = params.callId as string
  const initialTab = searchParams.get('tab') || 'details'

  const [call, setCall] = useState<VoiceCall | null>(null)
  const [transcripts, setTranscripts] = useState<VoiceTranscript[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState(initialTab)

  useEffect(() => {
    async function fetchCallDetails() {
      try {
        const response = await fetch(
          `/api/admin/ai-agents/calls/${callId}?includeTranscript=true&includeResponses=true`
        )
        if (response.ok) {
          const data = await response.json()
          setCall(data.call)
          setTranscripts(data.transcripts || [])
        } else {
          setError('Failed to fetch call details')
        }
      } catch {
        setError('Failed to fetch call details')
      } finally {
        setLoading(false)
      }
    }
    fetchCallDetails()
  }, [callId])

  function formatCallDuration(seconds: number | null): string {
    if (!seconds) return '--'
    const duration = intervalToDuration({ start: 0, end: seconds * 1000 })
    return formatDuration(duration, { format: ['hours', 'minutes', 'seconds'] })
  }

  function formatTime(dateString: string): string {
    return format(new Date(dateString), 'h:mm:ss a')
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (error || !call) {
    return (
      <div className="text-center py-12">
        <p className="text-lg text-muted-foreground">{error || 'Call not found'}</p>
        <Button variant="link" onClick={() => router.back()}>
          Go back
        </Button>
      </div>
    )
  }

  const DirectionIcon = call.direction === 'inbound' ? PhoneIncoming : PhoneOutgoing
  const sentimentInfo = call.sentiment ? SENTIMENT_INFO[call.sentiment] : null
  const SentimentIcon = sentimentInfo?.icon

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => router.back()}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div className="flex-1">
          <div className="flex items-center gap-3">
            <DirectionIcon className="h-6 w-6" />
            <h1 className="text-2xl font-bold">
              {call.direction === 'inbound' ? call.fromNumber : call.toNumber}
            </h1>
            <Badge variant="outline" className={STATUS_COLORS[call.status] || ''}>
              {call.status.replace('_', ' ')}
            </Badge>
            {sentimentInfo && SentimentIcon && (
              <Badge variant="outline" className={sentimentInfo.color}>
                <SentimentIcon className="h-3 w-3 mr-1" />
                {sentimentInfo.label}
              </Badge>
            )}
          </div>
          <p className="text-muted-foreground">
            {call.callerName || 'Unknown Caller'} - {call.direction === 'inbound' ? 'Inbound' : 'Outbound'} call
          </p>
        </div>
        {call.recordingUrl && (
          <div className="flex gap-2">
            <Button variant="outline" asChild>
              <a href={call.recordingUrl} target="_blank" rel="noopener noreferrer">
                <PlayCircle className="h-4 w-4 mr-2" />
                Play Recording
              </a>
            </Button>
            <Button variant="outline" asChild>
              <a href={call.recordingUrl} download>
                <Download className="h-4 w-4 mr-2" />
                Download
              </a>
            </Button>
          </div>
        )}
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="details">Details</TabsTrigger>
          <TabsTrigger value="transcript">Transcript</TabsTrigger>
          <TabsTrigger value="actions">Action Items</TabsTrigger>
        </TabsList>

        {/* Details Tab */}
        <TabsContent value="details" className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Call Information</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center gap-3">
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm text-muted-foreground">Date:</span>
                  <span>{format(new Date(call.startedAt), 'PPP')}</span>
                </div>
                <div className="flex items-center gap-3">
                  <Clock className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm text-muted-foreground">Time:</span>
                  <span>{format(new Date(call.startedAt), 'p')}</span>
                </div>
                <div className="flex items-center gap-3">
                  <Clock className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm text-muted-foreground">Duration:</span>
                  <span>{formatCallDuration(call.durationSeconds)}</span>
                </div>
                <div className="flex items-center gap-3">
                  <Phone className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm text-muted-foreground">From:</span>
                  <span>{call.fromNumber || '--'}</span>
                </div>
                <div className="flex items-center gap-3">
                  <Phone className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm text-muted-foreground">To:</span>
                  <span>{call.toNumber || '--'}</span>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-sm text-muted-foreground">Provider:</span>
                  <Badge variant="outline">{call.provider}</Badge>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Summary</CardTitle>
              </CardHeader>
              <CardContent>
                {call.summary ? (
                  <p className="text-sm">{call.summary}</p>
                ) : (
                  <p className="text-sm text-muted-foreground">
                    No summary available. Summary will be generated after the call is analyzed.
                  </p>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Transcript Tab */}
        <TabsContent value="transcript">
          <Card>
            <CardHeader>
              <CardTitle>Call Transcript</CardTitle>
              <CardDescription>
                Full conversation transcript with timestamps
              </CardDescription>
            </CardHeader>
            <CardContent>
              {transcripts.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">
                  No transcript available for this call.
                </p>
              ) : (
                <div className="space-y-4">
                  {transcripts.map((entry) => {
                    const isAgent = entry.speaker === 'agent'
                    const Icon = isAgent ? Bot : User

                    return (
                      <div
                        key={entry.id}
                        className={`flex gap-3 ${isAgent ? '' : 'flex-row-reverse'}`}
                      >
                        <div
                          className={`p-2 rounded-full ${
                            isAgent ? 'bg-primary/10' : 'bg-muted'
                          }`}
                        >
                          <Icon className="h-4 w-4" />
                        </div>
                        <div
                          className={`flex-1 max-w-[80%] ${
                            isAgent ? '' : 'text-right'
                          }`}
                        >
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-sm font-medium">
                              {entry.speakerName || (isAgent ? 'Agent' : 'Caller')}
                            </span>
                            <span className="text-xs text-muted-foreground">
                              {formatTime(entry.startedAt)}
                            </span>
                            {entry.confidence && (
                              <span className="text-xs text-muted-foreground">
                                ({Math.round(entry.confidence * 100)}%)
                              </span>
                            )}
                          </div>
                          <div
                            className={`p-3 rounded-lg ${
                              isAgent
                                ? 'bg-primary/10 text-left'
                                : 'bg-muted text-left'
                            }`}
                          >
                            <p className="text-sm">{entry.text}</p>
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Action Items Tab */}
        <TabsContent value="actions">
          <Card>
            <CardHeader>
              <CardTitle>Action Items</CardTitle>
              <CardDescription>
                Tasks identified during the call
              </CardDescription>
            </CardHeader>
            <CardContent>
              {call.actionItems.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">
                  No action items identified for this call.
                </p>
              ) : (
                <div className="space-y-3">
                  {call.actionItems.map((item, index) => (
                    <div
                      key={index}
                      className="flex items-start gap-3 p-3 border rounded-lg"
                    >
                      {item.completed ? (
                        <CheckCircle2 className="h-5 w-5 text-green-600 mt-0.5" />
                      ) : (
                        <Circle className="h-5 w-5 text-muted-foreground mt-0.5" />
                      )}
                      <div className="flex-1">
                        <p className={item.completed ? 'line-through text-muted-foreground' : ''}>
                          {item.description}
                        </p>
                        {(item.dueDate || item.assignee) && (
                          <div className="flex gap-4 mt-1 text-sm text-muted-foreground">
                            {item.dueDate && (
                              <span>Due: {format(new Date(item.dueDate), 'PP')}</span>
                            )}
                            {item.assignee && <span>Assigned to: {item.assignee}</span>}
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
