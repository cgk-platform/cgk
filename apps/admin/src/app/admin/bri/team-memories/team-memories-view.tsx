'use client'

import { useState } from 'react'
import { Badge, Button, Card, CardContent, CardHeader, Textarea } from '@cgk-platform/ui'
import { Users, Brain, Plus, Trash2, User } from 'lucide-react'

import type { TeamMember, MemoryType, MemorySource } from '@/lib/bri/types'

interface TeamMemoriesViewProps {
  tenantSlug: string
  initialTeamMembers: TeamMember[]
}

const MEMORY_TYPES: { value: MemoryType; label: string; emoji: string }[] = [
  { value: 'role_pattern', label: 'Role Pattern', emoji: '🎯' },
  { value: 'response_style', label: 'Response Style', emoji: '💬' },
  { value: 'availability', label: 'Availability', emoji: '🕐' },
  { value: 'preference', label: 'Preference', emoji: '⭐' },
  { value: 'special_consideration', label: 'Special Consideration', emoji: '⚠️' },
  { value: 'interaction_note', label: 'Interaction Note', emoji: '📝' },
  { value: 'expertise', label: 'Expertise', emoji: '🧠' },
]

const MEMORY_SOURCES: { value: MemorySource; label: string; variant: 'info' | 'success' | 'secondary' }[] = [
  { value: 'told', label: 'Explicit', variant: 'info' },
  { value: 'observed', label: 'Observed', variant: 'success' },
  { value: 'inferred', label: 'Inferred', variant: 'secondary' },
]

export function TeamMemoriesView({ initialTeamMembers }: TeamMemoriesViewProps) {
  const [teamMembers, setTeamMembers] = useState(initialTeamMembers)
  const [selectedMember, setSelectedMember] = useState<TeamMember | null>(
    teamMembers[0] ?? null
  )
  const [showAddForm, setShowAddForm] = useState(false)
  const [newMemory, setNewMemory] = useState<{
    memoryType: MemoryType
    source: MemorySource
    content: string
    confidence: number
  }>({
    memoryType: 'preference',
    source: 'told',
    content: '',
    confidence: 1.0,
  })
  const [saving, setSaving] = useState(false)

  const handleAddMemory = async () => {
    if (!selectedMember || !newMemory.content.trim()) return

    setSaving(true)
    try {
      const response = await fetch('/api/admin/bri/team-memories', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: selectedMember.id,
          ...newMemory,
        }),
      })

      if (response.ok) {
        const data = await response.json()
        setTeamMembers(
          teamMembers.map((m) =>
            m.id === selectedMember.id
              ? { ...m, memories: [...m.memories, data.memory] }
              : m
          )
        )
        setSelectedMember({
          ...selectedMember,
          memories: [...selectedMember.memories, data.memory],
        })
        setNewMemory({ memoryType: 'preference', source: 'told', content: '', confidence: 1.0 })
        setShowAddForm(false)
      }
    } catch (error) {
      console.error('Failed to add memory:', error)
    } finally {
      setSaving(false)
    }
  }

  const handleDeleteMemory = async (memoryId: string) => {
    if (!selectedMember) return

    try {
      const response = await fetch(`/api/admin/bri/team-memories?id=${memoryId}`, {
        method: 'DELETE',
      })

      if (response.ok) {
        const updatedMemories = selectedMember.memories.filter((m) => m.id !== memoryId)
        setTeamMembers(
          teamMembers.map((m) =>
            m.id === selectedMember.id ? { ...m, memories: updatedMemories } : m
          )
        )
        setSelectedMember({ ...selectedMember, memories: updatedMemories })
      }
    } catch (error) {
      console.error('Failed to delete memory:', error)
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Team Memories</h1>
        <p className="text-sm text-muted-foreground">Manage knowledge Bri has about team members</p>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Team Member List */}
        <div className="lg:col-span-1">
          <Card className="h-[calc(100vh-220px)] overflow-hidden">
            <CardHeader className="pb-3 border-b">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-medium flex items-center gap-2">
                  <Users className="h-4 w-4" />
                  Team Members
                </h3>
                <span className="text-xs text-muted-foreground">{teamMembers.length}</span>
              </div>
            </CardHeader>
            <CardContent className="p-0 overflow-y-auto h-[calc(100%-60px)]">
              {teamMembers.length === 0 ? (
                <div className="p-4 text-center text-sm text-muted-foreground">
                  No team members found
                </div>
              ) : (
                <div className="divide-y">
                  {teamMembers.map((member) => (
                    <button
                      key={member.id}
                      onClick={() => {
                        setSelectedMember(member)
                        setShowAddForm(false)
                      }}
                      className={`w-full text-left p-4 hover:bg-muted/50 transition-colors ${
                        selectedMember?.id === member.id ? 'bg-muted' : ''
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-full bg-muted flex items-center justify-center text-xs font-medium">
                          {member.name?.slice(0, 2).toUpperCase() ?? member.email.slice(0, 2).toUpperCase()}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">
                            {member.name ?? member.email}
                          </p>
                          <p className="text-xs text-muted-foreground truncate">{member.email}</p>
                        </div>
                        <Badge variant="secondary" className="text-[10px]">
                          {member.memories.length}
                        </Badge>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Memories */}
        <div className="lg:col-span-2">
          {selectedMember ? (
            <Card className="h-[calc(100vh-220px)] overflow-hidden flex flex-col">
              <CardHeader className="pb-3 border-b shrink-0">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-full bg-muted flex items-center justify-center text-sm font-medium">
                      {selectedMember.name?.slice(0, 2).toUpperCase() ?? selectedMember.email.slice(0, 2).toUpperCase()}
                    </div>
                    <div>
                      <h3 className="text-sm font-medium">{selectedMember.name ?? selectedMember.email}</h3>
                      <p className="text-xs text-muted-foreground">{selectedMember.email}</p>
                    </div>
                  </div>
                  <Button size="sm" onClick={() => setShowAddForm(true)}>
                    <Plus className="h-4 w-4 mr-1" />
                    Add Memory
                  </Button>
                </div>
              </CardHeader>

              <CardContent className="p-4 overflow-y-auto flex-1">
                {/* Add Form */}
                {showAddForm && (
                  <div className="mb-6 p-4 border rounded-lg bg-muted/30">
                    <h4 className="text-sm font-medium mb-4">Add New Memory</h4>
                    <div className="space-y-4">
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="text-xs text-muted-foreground">Type</label>
                          <select
                            value={newMemory.memoryType}
                            onChange={(e) =>
                              setNewMemory({ ...newMemory, memoryType: e.target.value as MemoryType })
                            }
                            className="mt-1 w-full px-3 py-2 border rounded-md bg-background text-sm"
                          >
                            {MEMORY_TYPES.map((type) => (
                              <option key={type.value} value={type.value}>
                                {type.emoji} {type.label}
                              </option>
                            ))}
                          </select>
                        </div>
                        <div>
                          <label className="text-xs text-muted-foreground">Source</label>
                          <select
                            value={newMemory.source}
                            onChange={(e) =>
                              setNewMemory({ ...newMemory, source: e.target.value as MemorySource })
                            }
                            className="mt-1 w-full px-3 py-2 border rounded-md bg-background text-sm"
                          >
                            {MEMORY_SOURCES.map((source) => (
                              <option key={source.value} value={source.value}>
                                {source.label}
                              </option>
                            ))}
                          </select>
                        </div>
                      </div>
                      <div>
                        <label className="text-xs text-muted-foreground">Content</label>
                        <Textarea
                          value={newMemory.content}
                          onChange={(e) => setNewMemory({ ...newMemory, content: e.target.value })}
                          placeholder="What should Bri know about this team member?"
                          rows={3}
                          className="mt-1"
                        />
                      </div>
                      <div>
                        <label className="text-xs text-muted-foreground">
                          Confidence: {Math.round(newMemory.confidence * 100)}%
                        </label>
                        <input
                          type="range"
                          min="0"
                          max="1"
                          step="0.05"
                          value={newMemory.confidence}
                          onChange={(e) =>
                            setNewMemory({ ...newMemory, confidence: parseFloat(e.target.value) })
                          }
                          className="mt-1 w-full"
                        />
                      </div>
                      <div className="flex gap-2">
                        <Button onClick={handleAddMemory} disabled={saving || !newMemory.content.trim()}>
                          Add Memory
                        </Button>
                        <Button variant="outline" onClick={() => setShowAddForm(false)}>
                          Cancel
                        </Button>
                      </div>
                    </div>
                  </div>
                )}

                {/* Memories List */}
                {selectedMember.memories.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <Brain className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p className="text-sm">No memories yet</p>
                    <p className="text-xs mt-1">Add knowledge about this team member</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {selectedMember.memories.map((memory) => {
                      const typeInfo = MEMORY_TYPES.find((t) => t.value === memory.memoryType)
                      const sourceInfo = MEMORY_SOURCES.find((s) => s.value === memory.source)

                      return (
                        <div
                          key={memory.id}
                          className="p-4 border rounded-lg hover:bg-muted/30 transition-colors group"
                        >
                          <div className="flex items-start justify-between gap-4">
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-2">
                                <span className="text-lg">{typeInfo?.emoji}</span>
                                <Badge variant="outline" className="text-[10px]">
                                  {typeInfo?.label}
                                </Badge>
                                <Badge variant={sourceInfo?.variant ?? 'secondary'} className="text-[10px]">
                                  {sourceInfo?.label}
                                </Badge>
                                <span className="text-[10px] text-muted-foreground">
                                  {Math.round(memory.confidence * 100)}% confident
                                </span>
                              </div>
                              <p className="text-sm">{memory.content}</p>
                              <p className="text-[10px] text-muted-foreground mt-2">
                                Added {new Date(memory.createdAt).toLocaleDateString()}
                              </p>
                            </div>
                            <button
                              onClick={() => handleDeleteMemory(memory.id)}
                              className="opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-destructive transition-all"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )}
              </CardContent>
            </Card>
          ) : (
            <Card className="h-[calc(100vh-220px)] flex items-center justify-center">
              <div className="text-center text-muted-foreground">
                <User className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p className="text-sm">Select a team member</p>
              </div>
            </Card>
          )}
        </div>
      </div>
    </div>
  )
}
