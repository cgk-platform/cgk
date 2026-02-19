'use client'

import { useCallback, useEffect, useState } from 'react'
import {
  Badge,
  Button,
  Card,
  CardContent,
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  Input,
  Label,
  Select,
  SelectOption,
  Spinner,
  StatusBadge,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  Textarea,
} from '@cgk-platform/ui'
import { Bot, Plus, Trash2 } from 'lucide-react'

type AgentStatus = 'active' | 'paused' | 'disabled'

interface AiAgent {
  id: string
  name: string
  model: string
  systemPrompt: string
  tools: string[]
  status: AgentStatus
  lastActiveAt: string | null
  createdAt: string
}

const MOCK_AGENTS: AiAgent[] = [
  {
    id: '1',
    name: 'Bri – Sales Coach',
    model: 'claude-sonnet-4-6',
    systemPrompt: 'You are Bri, a sales coaching AI for DTC brands...',
    tools: ['email', 'slack', 'crm'],
    status: 'active',
    lastActiveAt: '2026-02-19T08:30:00Z',
    createdAt: '2025-09-01',
  },
  {
    id: '2',
    name: 'Content Strategist',
    model: 'claude-opus-4-6',
    systemPrompt: 'You are a content strategy expert...',
    tools: ['blog', 'seo'],
    status: 'paused',
    lastActiveAt: '2026-02-10T12:00:00Z',
    createdAt: '2026-01-10',
  },
]

interface AgentForm {
  name: string
  model: string
  systemPrompt: string
  tools: string
}

const EMPTY_FORM: AgentForm = {
  name: '',
  model: 'claude-sonnet-4-6',
  systemPrompt: '',
  tools: '',
}

export default function AiAgentsPage() {
  const [agents, setAgents] = useState<AiAgent[]>([])
  const [loading, setLoading] = useState(true)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [form, setForm] = useState<AgentForm>(EMPTY_FORM)
  const [saving, setSaving] = useState(false)

  const fetchAgents = useCallback(async () => {
    setLoading(true)
    await new Promise((r) => setTimeout(r, 300))
    setAgents(MOCK_AGENTS)
    setLoading(false)
  }, [])

  useEffect(() => {
    void fetchAgents()
  }, [fetchAgents])

  async function handleCreate() {
    if (!form.name.trim()) return
    setSaving(true)
    await new Promise((r) => setTimeout(r, 600))
    const newAgent: AiAgent = {
      id: String(Date.now()),
      name: form.name,
      model: form.model,
      systemPrompt: form.systemPrompt,
      tools: form.tools
        .split(',')
        .map((t) => t.trim())
        .filter(Boolean),
      status: 'paused',
      lastActiveAt: null,
      createdAt: new Date().toISOString().split('T')[0] ?? '',
    }
    setAgents((prev) => [newAgent, ...prev])
    setForm(EMPTY_FORM)
    setDialogOpen(false)
    setSaving(false)
  }

  async function toggleStatus(id: string) {
    setAgents((prev) =>
      prev.map((a) => {
        if (a.id !== id) return a
        const next: AgentStatus = a.status === 'active' ? 'paused' : 'active'
        return { ...a, status: next }
      })
    )
  }

  function handleDelete(id: string) {
    setAgents((prev) => prev.filter((a) => a.id !== id))
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">AI Agents</h1>
          <p className="text-muted-foreground">
            Configure and monitor multi-agent AI workers for your brand.
          </p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              New Agent
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create AI Agent</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-2">
              <div className="space-y-1.5">
                <Label htmlFor="agent-name">Agent Name</Label>
                <Input
                  id="agent-name"
                  placeholder="e.g. Email Nurture Bot"
                  value={form.name}
                  onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="agent-model">Model</Label>
                <Select
                  id="agent-model"
                  value={form.model}
                  onChange={(e) => setForm((f) => ({ ...f, model: e.target.value }))}
                >
                  <SelectOption value="claude-sonnet-4-6">Claude Sonnet 4.6</SelectOption>
                  <SelectOption value="claude-opus-4-6">Claude Opus 4.6</SelectOption>
                  <SelectOption value="claude-haiku-4-5-20251001">Claude Haiku 4.5</SelectOption>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="agent-prompt">System Prompt</Label>
                <Textarea
                  id="agent-prompt"
                  placeholder="You are an AI agent that…"
                  rows={4}
                  value={form.systemPrompt}
                  onChange={(e) => setForm((f) => ({ ...f, systemPrompt: e.target.value }))}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="agent-tools">Tools (comma-separated)</Label>
                <Input
                  id="agent-tools"
                  placeholder="email, slack, crm"
                  value={form.tools}
                  onChange={(e) => setForm((f) => ({ ...f, tools: e.target.value }))}
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setDialogOpen(false)}>
                Cancel
              </Button>
              <Button onClick={() => void handleCreate()} disabled={saving}>
                {saving ? 'Creating…' : 'Create Agent'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardContent className="p-0">
          {loading ? (
            <div className="flex items-center justify-center py-16">
              <Spinner className="h-6 w-6 text-muted-foreground" />
            </div>
          ) : agents.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <Bot className="mb-4 h-8 w-8 text-muted-foreground" />
              <h3 className="text-lg font-semibold">No agents configured</h3>
              <p className="mt-1 max-w-sm text-sm text-muted-foreground">
                Create your first AI agent to get started.
              </p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Agent</TableHead>
                  <TableHead>Model</TableHead>
                  <TableHead>Tools</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Last Active</TableHead>
                  <TableHead className="w-24" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {agents.map((agent) => (
                  <TableRow key={agent.id}>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Bot className="h-4 w-4 text-muted-foreground" />
                        <span className="font-medium">{agent.name}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="font-mono text-xs">
                        {agent.model}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1">
                        {agent.tools.map((tool) => (
                          <Badge key={tool} variant="outline" className="text-xs">
                            {tool}
                          </Badge>
                        ))}
                      </div>
                    </TableCell>
                    <TableCell>
                      <StatusBadge status={agent.status} showDot />
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {agent.lastActiveAt
                        ? new Date(agent.lastActiveAt).toLocaleDateString()
                        : 'Never'}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center justify-end gap-1">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => void toggleStatus(agent.id)}
                          className="h-7 text-xs"
                        >
                          {agent.status === 'active' ? 'Pause' : 'Activate'}
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDelete(agent.id)}
                          className="h-7 w-7 p-0 text-muted-foreground hover:text-destructive"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
