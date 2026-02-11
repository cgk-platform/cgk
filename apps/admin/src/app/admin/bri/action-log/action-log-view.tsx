'use client'

import { useState } from 'react'
import { Badge, Button, Card, CardContent, CardHeader } from '@cgk/ui'
import {
  Zap,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Clock,
  ChevronRight,
  Check,
  X,
  Wrench,
  User,
  FolderKanban,
} from 'lucide-react'

import type { BriAction, ActionCategory } from '@/lib/bri/types'

interface ActionLogViewProps {
  tenantSlug: string
  initialActions: BriAction[]
  stats: {
    total7d: number
    successful: number
    failed: number
    pending: number
    successRate: number
  }
}

export function ActionLogView({ tenantSlug, initialActions, stats }: ActionLogViewProps) {
  const [actions, setActions] = useState(initialActions)
  const [filter, setFilter] = useState<'all' | 'pending'>('all')
  const [selectedAction, setSelectedAction] = useState<BriAction | null>(null)
  const [processing, setProcessing] = useState<string | null>(null)

  const filteredActions =
    filter === 'pending'
      ? actions.filter((a) => a.approvalStatus === 'pending')
      : actions

  const handleApprove = async (actionId: string) => {
    setProcessing(actionId)
    try {
      const response = await fetch('/api/admin/bri/action-log', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ actionId, decision: 'approve' }),
      })
      if (response.ok) {
        setActions((prev) =>
          prev.map((a) =>
            a.id === actionId ? { ...a, approvalStatus: 'approved' } : a
          )
        )
        if (selectedAction?.id === actionId) {
          setSelectedAction({ ...selectedAction, approvalStatus: 'approved' })
        }
      }
    } catch (error) {
      console.error('Failed to approve action:', error)
    } finally {
      setProcessing(null)
    }
  }

  const handleReject = async (actionId: string) => {
    setProcessing(actionId)
    try {
      const response = await fetch('/api/admin/bri/action-log', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ actionId, decision: 'reject' }),
      })
      if (response.ok) {
        setActions((prev) =>
          prev.map((a) =>
            a.id === actionId ? { ...a, approvalStatus: 'rejected' } : a
          )
        )
        if (selectedAction?.id === actionId) {
          setSelectedAction({ ...selectedAction, approvalStatus: 'rejected' })
        }
      }
    } catch (error) {
      console.error('Failed to reject action:', error)
    } finally {
      setProcessing(null)
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Action Log</h1>
        <p className="text-sm text-muted-foreground">Monitor and approve Bri's automated actions</p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-5">
        <StatCard title="Total (7d)" value={stats.total7d} icon={<Zap className="h-4 w-4" />} />
        <StatCard
          title="Successful"
          value={stats.successful}
          icon={<CheckCircle2 className="h-4 w-4 text-green-500" />}
        />
        <StatCard
          title="Failed"
          value={stats.failed}
          icon={<XCircle className="h-4 w-4 text-red-500" />}
        />
        <StatCard
          title="Pending"
          value={stats.pending}
          icon={<AlertCircle className="h-4 w-4 text-yellow-500" />}
        />
        <StatCard
          title="Success Rate"
          value={`${stats.successRate}%`}
          icon={<CheckCircle2 className="h-4 w-4 text-blue-500" />}
        />
      </div>

      {/* Filter Tabs */}
      <div className="flex gap-2">
        <button
          onClick={() => setFilter('all')}
          className={`px-4 py-2 text-sm rounded-lg transition-colors ${
            filter === 'all'
              ? 'bg-primary text-primary-foreground'
              : 'bg-muted hover:bg-muted/80'
          }`}
        >
          All Actions
        </button>
        <button
          onClick={() => setFilter('pending')}
          className={`px-4 py-2 text-sm rounded-lg transition-colors flex items-center gap-2 ${
            filter === 'pending'
              ? 'bg-primary text-primary-foreground'
              : 'bg-muted hover:bg-muted/80'
          }`}
        >
          Pending Approval
          {stats.pending > 0 && (
            <span className="bg-yellow-500 text-white text-xs px-1.5 rounded-full">
              {stats.pending}
            </span>
          )}
        </button>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Action List */}
        <div className="lg:col-span-1">
          <Card className="h-[calc(100vh-380px)] overflow-hidden">
            <CardHeader className="pb-3 border-b">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-medium">Actions</h3>
                <span className="text-xs text-muted-foreground">{filteredActions.length} total</span>
              </div>
            </CardHeader>
            <CardContent className="p-0 overflow-y-auto h-[calc(100%-60px)]">
              {filteredActions.length === 0 ? (
                <div className="p-4 text-center text-sm text-muted-foreground">
                  No actions found
                </div>
              ) : (
                <div className="divide-y">
                  {filteredActions.map((action) => (
                    <button
                      key={action.id}
                      onClick={() => setSelectedAction(action)}
                      className={`w-full text-left p-4 hover:bg-muted/50 transition-colors ${
                        selectedAction?.id === action.id ? 'bg-muted' : ''
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <ActionStatusIcon action={action} />
                            {action.actionCategory && (
                              <CategoryBadge category={action.actionCategory} />
                            )}
                          </div>
                          <p className="text-sm font-medium truncate">
                            {action.actionDescription}
                          </p>
                          <p className="text-xs text-muted-foreground mt-1">
                            {action.actionType} - {formatDate(action.createdAt)}
                          </p>
                        </div>
                        <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0 mt-1" />
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Action Detail */}
        <div className="lg:col-span-2">
          {selectedAction ? (
            <Card className="h-[calc(100vh-380px)] overflow-hidden flex flex-col">
              <CardHeader className="pb-3 border-b shrink-0">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <ActionStatusIcon action={selectedAction} size="lg" />
                    <div>
                      <h3 className="text-sm font-medium">{selectedAction.actionDescription}</h3>
                      <p className="text-xs text-muted-foreground">
                        {selectedAction.actionType}
                      </p>
                    </div>
                  </div>
                  {selectedAction.actionCategory && (
                    <CategoryBadge category={selectedAction.actionCategory} />
                  )}
                </div>
              </CardHeader>

              <CardContent className="p-4 overflow-y-auto flex-1 space-y-4">
                {/* Status and Time */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs text-muted-foreground">Status</label>
                    <div className="flex items-center gap-2 mt-1">
                      <StatusBadge action={selectedAction} />
                    </div>
                  </div>
                  <div>
                    <label className="text-xs text-muted-foreground">Created</label>
                    <p className="text-sm mt-1">{new Date(selectedAction.createdAt).toLocaleString()}</p>
                  </div>
                </div>

                {/* Related Entities */}
                {(selectedAction.creatorId || selectedAction.projectId) && (
                  <div className="grid grid-cols-2 gap-4">
                    {selectedAction.creatorId && (
                      <div>
                        <label className="text-xs text-muted-foreground flex items-center gap-1">
                          <User className="h-3 w-3" /> Creator
                        </label>
                        <p className="text-sm mt-1 font-mono">{selectedAction.creatorId}</p>
                      </div>
                    )}
                    {selectedAction.projectId && (
                      <div>
                        <label className="text-xs text-muted-foreground flex items-center gap-1">
                          <FolderKanban className="h-3 w-3" /> Project
                        </label>
                        <p className="text-sm mt-1 font-mono">{selectedAction.projectId}</p>
                      </div>
                    )}
                  </div>
                )}

                {/* Tools Used */}
                {selectedAction.toolsUsed.length > 0 && (
                  <div>
                    <label className="text-xs text-muted-foreground flex items-center gap-1">
                      <Wrench className="h-3 w-3" /> Tools Used
                    </label>
                    <div className="flex flex-wrap gap-2 mt-2">
                      {selectedAction.toolsUsed.map((tool) => (
                        <Badge key={tool} variant="outline" className="text-xs">
                          {tool}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}

                {/* Error Message */}
                {selectedAction.errorMessage && (
                  <div className="p-3 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800">
                    <label className="text-xs font-medium text-red-600 dark:text-red-400">
                      Error
                    </label>
                    <p className="text-sm text-red-700 dark:text-red-300 mt-1">
                      {selectedAction.errorMessage}
                    </p>
                  </div>
                )}

                {/* Input Data */}
                {selectedAction.inputData && Object.keys(selectedAction.inputData).length > 0 && (
                  <div>
                    <label className="text-xs text-muted-foreground">Input Data</label>
                    <pre className="mt-2 p-3 bg-muted rounded-lg text-xs overflow-x-auto">
                      {JSON.stringify(selectedAction.inputData, null, 2)}
                    </pre>
                  </div>
                )}

                {/* Output Data */}
                {selectedAction.outputData && Object.keys(selectedAction.outputData).length > 0 && (
                  <div>
                    <label className="text-xs text-muted-foreground">Output Data</label>
                    <pre className="mt-2 p-3 bg-muted rounded-lg text-xs overflow-x-auto">
                      {JSON.stringify(selectedAction.outputData, null, 2)}
                    </pre>
                  </div>
                )}
              </CardContent>

              {/* Approval Controls */}
              {selectedAction.approvalStatus === 'pending' && (
                <div className="p-4 border-t bg-muted/30 shrink-0">
                  <div className="flex items-center justify-between">
                    <p className="text-sm text-muted-foreground">
                      This action requires your approval
                    </p>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleReject(selectedAction.id)}
                        disabled={processing === selectedAction.id}
                        className="text-red-600 hover:text-red-700"
                      >
                        <X className="h-4 w-4 mr-1" />
                        Reject
                      </Button>
                      <Button
                        size="sm"
                        onClick={() => handleApprove(selectedAction.id)}
                        disabled={processing === selectedAction.id}
                      >
                        <Check className="h-4 w-4 mr-1" />
                        Approve
                      </Button>
                    </div>
                  </div>
                </div>
              )}
            </Card>
          ) : (
            <Card className="h-[calc(100vh-380px)] flex items-center justify-center">
              <div className="text-center text-muted-foreground">
                <Zap className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p className="text-sm">Select an action to view details</p>
              </div>
            </Card>
          )}
        </div>
      </div>
    </div>
  )
}

function StatCard({
  title,
  value,
  icon,
}: {
  title: string
  value: number | string
  icon: React.ReactNode
}) {
  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs text-muted-foreground">{title}</span>
          {icon}
        </div>
        <div className="text-xl font-semibold">{value}</div>
      </CardContent>
    </Card>
  )
}

function ActionStatusIcon({ action, size = 'sm' }: { action: BriAction; size?: 'sm' | 'lg' }) {
  const sizeClass = size === 'lg' ? 'h-6 w-6' : 'h-4 w-4'

  if (action.approvalStatus === 'pending') {
    return <AlertCircle className={`${sizeClass} text-yellow-500`} />
  }
  if (action.approvalStatus === 'rejected' || !action.success) {
    return <XCircle className={`${sizeClass} text-red-500`} />
  }
  return <CheckCircle2 className={`${sizeClass} text-green-500`} />
}

function StatusBadge({ action }: { action: BriAction }) {
  if (action.approvalStatus === 'pending') {
    return <Badge variant="warning">Pending Approval</Badge>
  }
  if (action.approvalStatus === 'rejected') {
    return <Badge variant="destructive">Rejected</Badge>
  }
  if (action.approvalStatus === 'approved') {
    return <Badge variant="success">Approved</Badge>
  }
  if (!action.success) {
    return <Badge variant="destructive">Failed</Badge>
  }
  return <Badge variant="success">Success</Badge>
}

function CategoryBadge({ category }: { category: ActionCategory }) {
  const colors: Record<ActionCategory, 'info' | 'secondary' | 'warning' | 'destructive' | 'success'> = {
    communication: 'info',
    lookup: 'secondary',
    modification: 'warning',
    escalation: 'destructive',
    creative: 'success',
  }

  return (
    <Badge variant={colors[category]} className="text-[10px] px-1.5">
      {category}
    </Badge>
  )
}

function formatDate(dateStr: string): string {
  const date = new Date(dateStr)
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffHours = diffMs / (1000 * 60 * 60)

  if (diffHours < 24) {
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  }
  return date.toLocaleDateString([], { month: 'short', day: 'numeric' })
}
