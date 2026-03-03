'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { Badge, Button } from '@cgk-platform/ui'
import {
  Activity,
  ArrowLeft,
  Bot,
  Captions,
  ChevronRight,
  Clapperboard,
  Film,
  GripVertical,
  Loader2,
  Mic,
  Pencil,
  Play,
  RefreshCw,
  Save,
  Send,
  User,
  X,
} from 'lucide-react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core'
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'

import type {
  ActivityRecord,
  CaptionRecord,
  ProjectRecord,
  RenderRecord,
  SceneRecord,
} from './page'

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const STATUS_STYLES: Record<string, string> = {
  draft: 'bg-slate-700 text-slate-300',
  storyboarding: 'bg-blue-500/20 text-blue-400',
  producing: 'bg-amber-500/20 text-amber-400',
  rendering: 'bg-purple-500/20 text-purple-400',
  rendered: 'bg-emerald-500/20 text-emerald-400',
  delivered: 'bg-green-500/20 text-green-400',
  archived: 'bg-slate-600/20 text-slate-400',
}

const SCENE_COLORS = [
  'bg-blue-500',
  'bg-emerald-500',
  'bg-amber-500',
  'bg-purple-500',
  'bg-rose-500',
  'bg-cyan-500',
  'bg-orange-500',
  'bg-teal-500',
]

const ACTION_LABELS: Record<string, string> = {
  project_synced: 'Project updated',
  render_completed: 'Render completed',
  scene_reordered: 'Scenes reordered',
  caption_edited: 'Captions edited',
  scene_clip_changed: 'Clip swapped',
  render_requested: 'Render requested',
}

// ---------------------------------------------------------------------------
// Main Component
// ---------------------------------------------------------------------------

interface ProjectEditorClientProps {
  project: ProjectRecord
  scenes: SceneRecord[]
  captions: CaptionRecord[]
  activity: ActivityRecord[]
  renders: RenderRecord[]
  projectId: string
}

export function ProjectEditorClient({
  project,
  scenes,
  captions,
  activity: initialActivity,
  renders,
  projectId,
}: ProjectEditorClientProps) {
  const router = useRouter()
  const [activityLog, setActivityLog] = useState<ActivityRecord[]>(initialActivity)
  const [orderedScenes, setOrderedScenes] = useState<SceneRecord[]>(scenes)
  const [isRequesting, setIsRequesting] = useState(false)
  const [requestFeedback, setRequestFeedback] = useState<{
    type: 'success' | 'error'
    message: string
  } | null>(null)
  const activityRef = useRef<HTMLDivElement>(null)
  const latestRender = renders[0] ?? null

  const statusClass = STATUS_STYLES[project.status] ?? STATUS_STYLES.draft

  // Sync scenes from server props when they change (e.g., after router.refresh)
  useEffect(() => {
    setOrderedScenes(scenes)
  }, [scenes])

  // SSE with reconnection and auto-refresh
  useEffect(() => {
    let retryDelay = 1000
    let source: EventSource | null = null
    let retryTimeout: ReturnType<typeof setTimeout> | null = null

    const connectSSE = () => {
      source = new EventSource(`/api/admin/video-editor/projects/${projectId}/events`)

      source.onopen = () => {
        retryDelay = 1000
      }

      source.onmessage = (event) => {
        try {
          const entry = JSON.parse(event.data) as ActivityRecord
          setActivityLog((prev) => [entry, ...prev].slice(0, 100))
          if (entry.action === 'project_synced' || entry.action === 'render_completed') {
            router.refresh()
          }
        } catch {
          // Ignore malformed events
        }
      }

      source.onerror = () => {
        source?.close()
        retryDelay = Math.min(retryDelay * 2, 30000)
        retryTimeout = setTimeout(connectSSE, retryDelay)
      }
    }

    connectSSE()

    return () => {
      source?.close()
      if (retryTimeout) clearTimeout(retryTimeout)
    }
  }, [projectId, router])

  // Auto-scroll activity log to top when new entries arrive
  useEffect(() => {
    if (activityRef.current) {
      activityRef.current.scrollTop = 0
    }
  }, [activityLog.length])

  const totalDuration = orderedScenes.reduce(
    (sum, s) => sum + (s.duration ? Number(s.duration) : 0),
    0
  )

  // Button handlers
  const handleRenderRequest = async (command: 'render' | 'deliver') => {
    setIsRequesting(true)
    setRequestFeedback(null)
    try {
      const res = await fetch(`/api/admin/video-editor/projects/${projectId}/render-request`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ command }),
      })
      if (res.ok) {
        setRequestFeedback({
          type: 'success',
          message: command === 'render' ? 'Re-render requested' : 'Delivery requested',
        })
      } else {
        const data = await res.json().catch(() => ({ error: 'Request failed' }))
        setRequestFeedback({ type: 'error', message: data.error ?? 'Request failed' })
      }
    } catch (err) {
      setRequestFeedback({
        type: 'error',
        message: err instanceof Error ? err.message : 'Network error',
      })
    } finally {
      setIsRequesting(false)
      setTimeout(() => setRequestFeedback(null), 4000)
    }
  }

  // Scene reorder handler
  const handleSceneReorder = useCallback(
    async (newScenes: SceneRecord[]) => {
      setOrderedScenes(newScenes)
      const sceneIds = newScenes.map((s) => s.id)
      try {
        const res = await fetch(`/api/admin/video-editor/projects/${projectId}/scenes/reorder`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ sceneIds }),
        })
        if (!res.ok) {
          setOrderedScenes(scenes)
        }
      } catch {
        // Revert on failure
        setOrderedScenes(scenes)
      }
    },
    [projectId, scenes]
  )

  return (
    <div className="flex h-[calc(100vh-4rem)] flex-col bg-slate-950">
      {/* Top bar */}
      <div className="flex items-center justify-between border-b border-slate-800 px-6 py-3">
        <div className="flex items-center gap-3">
          <Link
            href="/admin/creative-studio"
            className="flex items-center gap-1.5 text-sm text-slate-400 transition-colors hover:text-slate-200"
          >
            <ArrowLeft className="h-4 w-4" />
            Projects
          </Link>
          <ChevronRight className="h-4 w-4 text-slate-600" />
          <h1 className="max-w-xs truncate text-base font-semibold text-slate-100">
            {project.title}
          </h1>
          <span
            className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${statusClass}`}
          >
            {project.status}
          </span>
        </div>

        <div className="flex items-center gap-2">
          {requestFeedback && (
            <span
              className={`rounded px-2 py-1 text-xs ${
                requestFeedback.type === 'success'
                  ? 'bg-emerald-500/20 text-emerald-400'
                  : 'bg-red-500/20 text-red-400'
              }`}
            >
              {requestFeedback.message}
            </span>
          )}
          {project.aspect_ratio && (
            <span className="rounded border border-slate-700 px-2 py-1 text-xs text-slate-500">
              {project.aspect_ratio}
            </span>
          )}
          <Button
            variant="outline"
            size="sm"
            className="border-slate-700 text-slate-300 hover:text-slate-100"
            disabled={project.status === 'rendering' || isRequesting}
            onClick={() => handleRenderRequest('render')}
          >
            {isRequesting ? (
              <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
            ) : (
              <RefreshCw className="mr-1.5 h-3.5 w-3.5" />
            )}
            Re-render
          </Button>
          <Button
            size="sm"
            disabled={project.status !== 'rendered' || isRequesting}
            className="bg-amber-500 text-slate-900 hover:bg-amber-400 disabled:opacity-40"
            onClick={() => handleRenderRequest('deliver')}
          >
            {isRequesting ? (
              <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
            ) : (
              <Send className="mr-1.5 h-3.5 w-3.5" />
            )}
            Deliver
          </Button>
        </div>
      </div>

      {/* Main layout */}
      <div className="flex flex-1 overflow-hidden">
        {/* Left column - 60% */}
        <div className="flex w-[60%] flex-col gap-0 overflow-y-auto border-r border-slate-800">
          {/* Preview */}
          <section className="border-b border-slate-800 p-5">
            <div className="mb-3 flex items-center gap-2">
              <Play className="h-4 w-4 text-slate-400" />
              <span className="text-sm font-medium text-slate-300">Preview</span>
            </div>
            <PreviewPanel project={project} latestRender={latestRender} />
          </section>

          {/* Timeline */}
          <section className="border-b border-slate-800 p-5">
            <div className="mb-3 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Film className="h-4 w-4 text-slate-400" />
                <span className="text-sm font-medium text-slate-300">Timeline</span>
              </div>
              {totalDuration > 0 && (
                <span className="text-xs text-slate-500">
                  {formatDuration(totalDuration)} total
                </span>
              )}
            </div>
            <TimelineBar scenes={orderedScenes} totalDuration={totalDuration} />
          </section>

          {/* Activity log */}
          <section className="flex-1 p-5">
            <div className="mb-3 flex items-center gap-2">
              <Activity className="h-4 w-4 text-slate-400" />
              <span className="text-sm font-medium text-slate-300">Activity</span>
              <span className="ml-auto text-xs text-slate-600">{activityLog.length} events</span>
            </div>
            <div ref={activityRef} className="max-h-64 space-y-2 overflow-y-auto pr-1">
              {activityLog.length === 0 ? (
                <p className="text-sm text-slate-600">No activity yet.</p>
              ) : (
                activityLog.map((entry) => <ActivityEntry key={entry.id} entry={entry} />)
              )}
            </div>
          </section>
        </div>

        {/* Right column - 40% */}
        <div className="flex w-[40%] flex-col gap-0 overflow-y-auto">
          {/* Scenes list */}
          <section className="border-b border-slate-800 p-5">
            <div className="mb-3 flex items-center gap-2">
              <Clapperboard className="h-4 w-4 text-slate-400" />
              <span className="text-sm font-medium text-slate-300">Scenes</span>
              <span className="ml-auto text-xs text-slate-500">{orderedScenes.length} scenes</span>
            </div>
            <SceneList scenes={orderedScenes} onReorder={handleSceneReorder} />
          </section>

          {/* Voiceover */}
          <section className="border-b border-slate-800 p-5">
            <div className="mb-3 flex items-center gap-2">
              <Mic className="h-4 w-4 text-slate-400" />
              <span className="text-sm font-medium text-slate-300">Voiceover</span>
            </div>
            <VoiceoverPanel project={project} />
          </section>

          {/* Captions */}
          <section className="p-5">
            <div className="mb-3 flex items-center gap-2">
              <Captions className="h-4 w-4 text-slate-400" />
              <span className="text-sm font-medium text-slate-300">Captions</span>
            </div>
            <CaptionsPanel
              captions={captions}
              captionStyle={project.caption_style}
              projectId={projectId}
            />
          </section>
        </div>
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function PreviewPanel({
  project,
  latestRender,
}: {
  project: ProjectRecord
  latestRender: RenderRecord | null
}) {
  const hasValidUrl = latestRender?.render_url?.startsWith('http')

  if (hasValidUrl) {
    return (
      <div className="relative aspect-video overflow-hidden rounded-lg bg-black">
        <video
          src={latestRender!.render_url}
          controls
          className="h-full w-full"
          poster={latestRender!.thumbnail_url ?? undefined}
        />
        <div className="absolute bottom-2 left-2 rounded bg-black/60 px-2 py-0.5 text-xs text-white">
          {latestRender!.rendered_at ? new Date(latestRender!.rendered_at).toLocaleString() : ''}
        </div>
      </div>
    )
  }

  return (
    <div className="flex aspect-video flex-col items-center justify-center gap-3 rounded-lg border border-slate-800 bg-slate-900">
      <Film className="h-10 w-10 text-slate-600" />
      <p className="text-sm text-slate-500">
        {project.status === 'rendering' ? 'Rendering in progress...' : 'No render available yet'}
      </p>
      {project.status === 'rendering' && (
        <div className="h-1 w-48 overflow-hidden rounded-full bg-slate-700">
          <div className="h-full w-1/2 animate-pulse rounded-full bg-purple-500" />
        </div>
      )}
    </div>
  )
}

function TimelineBar({ scenes, totalDuration }: { scenes: SceneRecord[]; totalDuration: number }) {
  if (scenes.length === 0) {
    return (
      <div className="flex h-8 items-center justify-center rounded-md bg-slate-800">
        <span className="text-xs text-slate-600">No scenes</span>
      </div>
    )
  }

  const effectiveTotal = totalDuration > 0 ? totalDuration : scenes.length

  return (
    <div className="space-y-2">
      <div className="flex h-8 overflow-hidden rounded-md">
        {scenes.map((scene, i) => {
          const width =
            totalDuration > 0 && scene.duration
              ? (Number(scene.duration) / effectiveTotal) * 100
              : 100 / scenes.length
          const color = SCENE_COLORS[i % SCENE_COLORS.length]
          return (
            <div
              key={scene.id}
              className={`${color} relative flex items-center justify-center overflow-hidden`}
              style={{ width: `${width}%` }}
              title={`Scene ${scene.scene_number}${scene.role ? ` - ${scene.role}` : ''}${scene.duration ? ` (${scene.duration}s)` : ''}`}
            >
              {width > 8 && (
                <span className="text-[10px] font-medium text-white/90 drop-shadow">
                  {scene.scene_number}
                </span>
              )}
            </div>
          )
        })}
      </div>
      <div className="flex flex-wrap items-center gap-3">
        {scenes.map((scene, i) => (
          <div key={scene.id} className="flex items-center gap-1.5">
            <div className={`h-2 w-2 rounded-full ${SCENE_COLORS[i % SCENE_COLORS.length]}`} />
            <span className="text-[11px] text-slate-400">
              {scene.role ?? `Scene ${scene.scene_number}`}
              {scene.duration ? ` (${scene.duration}s)` : ''}
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}

function ActivityEntry({ entry }: { entry: ActivityRecord }) {
  const isAgent = entry.source === 'agent'
  const label = ACTION_LABELS[entry.action] ?? entry.action

  return (
    <div className="flex items-start gap-2.5 rounded-md border border-slate-800 bg-slate-900 p-2.5">
      <div
        className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full ${
          isAgent ? 'bg-amber-500/20 text-amber-400' : 'bg-blue-500/20 text-blue-400'
        }`}
      >
        {isAgent ? <Bot className="h-3 w-3" /> : <User className="h-3 w-3" />}
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-xs text-slate-300">{label}</p>
        <p className="mt-0.5 text-[10px] text-slate-600">
          {new Date(entry.created_at).toLocaleTimeString()}
        </p>
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Sortable Scene List (DnD)
// ---------------------------------------------------------------------------

function SortableSceneItem({ scene, index }: { scene: SceneRecord; index: number }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: scene.id,
  })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="flex items-center gap-3 rounded-md border border-slate-800 bg-slate-900/50 px-3 py-2"
    >
      <button
        type="button"
        className="cursor-grab touch-none text-slate-600 hover:text-slate-400"
        {...attributes}
        {...listeners}
      >
        <GripVertical className="h-4 w-4" />
      </button>
      <div
        className={`flex h-5 w-5 shrink-0 items-center justify-center rounded ${
          SCENE_COLORS[index % SCENE_COLORS.length]
        }`}
      >
        <span className="text-[10px] font-bold text-white">{scene.scene_number}</span>
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm text-slate-300">
          {scene.role ?? `Scene ${scene.scene_number}`}
        </p>
        {scene.footage_hint && (
          <p className="truncate text-[10px] text-slate-500">{scene.footage_hint}</p>
        )}
      </div>
      {scene.duration != null && (
        <span className="shrink-0 text-[11px] text-slate-500">{scene.duration}s</span>
      )}
    </div>
  )
}

function SceneList({
  scenes,
  onReorder,
}: {
  scenes: SceneRecord[]
  onReorder: (newScenes: SceneRecord[]) => void
}) {
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  )

  if (scenes.length === 0) {
    return <p className="text-sm text-slate-600">No scenes yet.</p>
  }

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event
    if (!over || active.id === over.id) return

    const oldIndex = scenes.findIndex((s) => s.id === active.id)
    const newIndex = scenes.findIndex((s) => s.id === over.id)
    if (oldIndex === -1 || newIndex === -1) return

    const reordered = arrayMove(scenes, oldIndex, newIndex)
    onReorder(reordered)
  }

  return (
    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
      <SortableContext items={scenes.map((s) => s.id)} strategy={verticalListSortingStrategy}>
        <div className="space-y-1.5">
          {scenes.map((scene, i) => (
            <SortableSceneItem key={scene.id} scene={scene} index={i} />
          ))}
        </div>
      </SortableContext>
    </DndContext>
  )
}

// ---------------------------------------------------------------------------
// Voiceover Panel (with audio player)
// ---------------------------------------------------------------------------

function VoiceoverPanel({ project }: { project: ProjectRecord }) {
  const wordCount = project.voiceover_script
    ? project.voiceover_script.split(/\s+/).filter(Boolean).length
    : 0

  const hasPlayableUrl = project.voiceover_url?.startsWith('http')

  return (
    <div className="space-y-3">
      {project.voice_name ? (
        <div className="flex items-center gap-2">
          <span className="text-xs text-slate-500">Voice</span>
          <Badge variant="secondary" className="text-xs">
            {project.voice_name}
          </Badge>
        </div>
      ) : (
        <p className="text-sm text-slate-600">No voice selected.</p>
      )}
      {hasPlayableUrl && <audio src={project.voiceover_url!} controls className="w-full" />}
      {project.voiceover_script ? (
        <div className="rounded-md border border-slate-800 bg-slate-900 p-3">
          <p className="line-clamp-4 text-xs leading-relaxed text-slate-400">
            {project.voiceover_script}
          </p>
          <p className="mt-1.5 text-[10px] text-slate-600">{wordCount} words</p>
        </div>
      ) : (
        <p className="text-sm text-slate-600">No script yet.</p>
      )}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Editable Captions Panel
// ---------------------------------------------------------------------------

interface CaptionEdit {
  id?: string
  sortOrder: number
  originalWord: string
  editedWord: string
}

function CaptionsPanel({
  captions,
  captionStyle,
  projectId,
}: {
  captions: CaptionRecord[]
  captionStyle: string | null
  projectId: string
}) {
  const [isEditing, setIsEditing] = useState(false)
  const [edits, setEdits] = useState<Map<number, CaptionEdit>>(new Map())
  const [isSaving, setIsSaving] = useState(false)
  const wordCount = captions.length

  const startEditing = () => {
    setIsEditing(true)
    setEdits(new Map())
  }

  const cancelEditing = () => {
    setIsEditing(false)
    setEdits(new Map())
  }

  const handleWordEdit = (index: number, caption: CaptionRecord, newWord: string) => {
    const newEdits = new Map(edits)
    if (newWord === caption.word) {
      newEdits.delete(index)
    } else {
      newEdits.set(index, {
        id: (caption as CaptionRecord & { id?: string }).id,
        sortOrder: caption.sort_order,
        originalWord: caption.word,
        editedWord: newWord,
      })
    }
    setEdits(newEdits)
  }

  const saveEdits = async () => {
    if (edits.size === 0) {
      setIsEditing(false)
      return
    }
    setIsSaving(true)
    try {
      const updates = Array.from(edits.values())
        .filter((e) => e.id)
        .map((e) => ({ id: e.id, word: e.editedWord }))

      if (updates.length > 0) {
        const res = await fetch(`/api/admin/video-editor/projects/${projectId}/captions`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ updates }),
        })
        if (!res.ok) {
          return // Keep editing mode open on server error
        }
      }
      setIsEditing(false)
      setEdits(new Map())
    } catch {
      // Keep editing mode open on failure
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-3">
        {captionStyle ? (
          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-500">Style</span>
            <Badge variant="secondary" className="text-xs">
              {captionStyle}
            </Badge>
          </div>
        ) : (
          <p className="text-xs text-slate-600">No caption style set.</p>
        )}
        {wordCount > 0 && <span className="ml-auto text-xs text-slate-500">{wordCount} words</span>}
        {captions.length > 0 && !isEditing && (
          <button
            type="button"
            onClick={startEditing}
            className="ml-2 text-slate-500 transition-colors hover:text-slate-300"
            title="Edit captions"
          >
            <Pencil className="h-3.5 w-3.5" />
          </button>
        )}
      </div>
      {captions.length > 0 ? (
        <div className="rounded-md border border-slate-800 bg-slate-900 p-3">
          {isEditing ? (
            <>
              <div className="flex flex-wrap gap-1">
                {captions.map((c, i) => {
                  const edit = edits.get(i)
                  const currentWord = edit ? edit.editedWord : c.word
                  const isModified = !!edit
                  return (
                    <input
                      key={`${c.sort_order}-${i}`}
                      type="text"
                      value={currentWord}
                      onChange={(e) => handleWordEdit(i, c, e.target.value)}
                      className={`inline-block rounded px-1.5 py-0.5 text-xs outline-none transition-colors ${
                        isModified
                          ? 'border border-amber-500/40 bg-amber-500/20 text-amber-300'
                          : 'border border-transparent bg-slate-800 text-slate-400'
                      }`}
                      style={{ width: `${Math.max(currentWord.length + 2, 4)}ch` }}
                    />
                  )
                })}
              </div>
              <div className="mt-3 flex items-center gap-2">
                <Button
                  size="sm"
                  disabled={edits.size === 0 || isSaving}
                  onClick={saveEdits}
                  className="h-7 bg-emerald-600 text-xs text-white hover:bg-emerald-500"
                >
                  {isSaving ? (
                    <Loader2 className="mr-1 h-3 w-3 animate-spin" />
                  ) : (
                    <Save className="mr-1 h-3 w-3" />
                  )}
                  Save {edits.size > 0 ? `(${edits.size})` : ''}
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={cancelEditing}
                  className="h-7 text-xs text-slate-400 hover:text-slate-200"
                >
                  <X className="mr-1 h-3 w-3" />
                  Cancel
                </Button>
              </div>
            </>
          ) : (
            <p className="line-clamp-3 text-xs leading-relaxed text-slate-400">
              {captions.map((c) => c.word).join(' ')}
            </p>
          )}
        </div>
      ) : (
        <p className="text-sm text-slate-600">No captions yet.</p>
      )}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Utilities
// ---------------------------------------------------------------------------

function formatDuration(seconds: number): string {
  const m = Math.floor(seconds / 60)
  const s = Math.floor(seconds % 60)
  return m > 0 ? `${m}:${s.toString().padStart(2, '0')}` : `${s}s`
}
