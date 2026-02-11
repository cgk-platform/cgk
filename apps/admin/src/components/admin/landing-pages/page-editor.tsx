'use client'

import { Button, cn } from '@cgk/ui'
import { ArrowLeft, Save, Monitor, Smartphone, Eye, Settings } from 'lucide-react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useState, useCallback } from 'react'

import { BlockConfigPanel } from './block-config-panel'
import { BlockEditor } from './block-editor'
import { BlockPalette } from './block-palette'
import { PageSettings } from './page-settings'
import { SEOEditor } from './seo-editor'

import type { LandingPage, Block, BlockType } from '@/lib/landing-pages/types'

interface PageEditorProps {
  page: LandingPage
}

type SidebarTab = 'blocks' | 'settings' | 'seo'
type PreviewMode = 'desktop' | 'mobile'

export function PageEditor({ page: initialPage }: PageEditorProps) {
  const router = useRouter()
  const [page, setPage] = useState(initialPage)
  const [blocks, setBlocks] = useState<Block[]>(initialPage.blocks || [])
  const [selectedBlockId, setSelectedBlockId] = useState<string | null>(null)
  const [sidebarTab, setSidebarTab] = useState<SidebarTab>('blocks')
  const [previewMode, setPreviewMode] = useState<PreviewMode>('desktop')
  const [saving, setSaving] = useState(false)
  const [hasChanges, setHasChanges] = useState(false)

  const selectedBlock = blocks.find((b) => b.id === selectedBlockId)

  const handleAddBlock = useCallback((type: BlockType) => {
    const newBlock: Block = {
      id: `block_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      type,
      config: {},
      order: blocks.length,
    }
    setBlocks((prev) => [...prev, newBlock])
    setSelectedBlockId(newBlock.id)
    setHasChanges(true)
  }, [blocks.length])

  const handleUpdateBlock = useCallback((id: string, config: Block['config']) => {
    setBlocks((prev) =>
      prev.map((b) => (b.id === id ? { ...b, config } : b)),
    )
    setHasChanges(true)
  }, [])

  const handleRemoveBlock = useCallback((id: string) => {
    setBlocks((prev) => prev.filter((b) => b.id !== id))
    if (selectedBlockId === id) {
      setSelectedBlockId(null)
    }
    setHasChanges(true)
  }, [selectedBlockId])

  const handleReorderBlocks = useCallback((reorderedBlocks: Block[]) => {
    setBlocks(reorderedBlocks.map((b, i) => ({ ...b, order: i })))
    setHasChanges(true)
  }, [])

  const handleUpdatePage = useCallback((updates: Partial<LandingPage>) => {
    setPage((prev) => ({ ...prev, ...updates }))
    setHasChanges(true)
  }, [])

  const handleSave = async () => {
    setSaving(true)

    try {
      // Save page settings
      await fetch(`/api/admin/landing-pages/${page.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: page.title,
          slug: page.slug,
          description: page.description,
          status: page.status,
          meta_title: page.meta_title,
          meta_description: page.meta_description,
          og_image_url: page.og_image_url,
          canonical_url: page.canonical_url,
          structured_data: page.structured_data,
        }),
      })

      // Save blocks
      await fetch(`/api/admin/landing-pages/${page.id}/blocks`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ blocks }),
      })

      setHasChanges(false)
      router.refresh()
    } catch (err) {
      console.error('Failed to save:', err)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="flex h-[calc(100vh-4rem)] flex-col">
      {/* Header */}
      <div className="flex items-center justify-between border-b bg-background px-4 py-2">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="sm" asChild>
            <Link href="/admin/landing-pages">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back
            </Link>
          </Button>
          <h1 className="text-lg font-semibold">{page.title}</h1>
          <span className="text-sm text-muted-foreground">/{page.slug}</span>
        </div>

        <div className="flex items-center gap-2">
          <div className="flex rounded-md border">
            <button
              onClick={() => setPreviewMode('desktop')}
              className={cn(
                'p-2',
                previewMode === 'desktop' ? 'bg-muted' : 'hover:bg-muted/50',
              )}
            >
              <Monitor className="h-4 w-4" />
            </button>
            <button
              onClick={() => setPreviewMode('mobile')}
              className={cn(
                'p-2',
                previewMode === 'mobile' ? 'bg-muted' : 'hover:bg-muted/50',
              )}
            >
              <Smartphone className="h-4 w-4" />
            </button>
          </div>

          <Button variant="outline" size="sm" asChild>
            <a href={`/${page.slug}`} target="_blank" rel="noopener noreferrer">
              <Eye className="mr-2 h-4 w-4" />
              Preview
            </a>
          </Button>

          <Button size="sm" onClick={handleSave} disabled={saving || !hasChanges}>
            <Save className="mr-2 h-4 w-4" />
            {saving ? 'Saving...' : hasChanges ? 'Save Changes' : 'Saved'}
          </Button>
        </div>
      </div>

      <div className="flex flex-1 overflow-hidden">
        {/* Left Sidebar - Block Palette */}
        <div className="w-64 shrink-0 overflow-y-auto border-r bg-muted/30">
          <div className="flex border-b">
            <button
              onClick={() => setSidebarTab('blocks')}
              className={cn(
                'flex-1 px-4 py-2 text-sm font-medium',
                sidebarTab === 'blocks' ? 'border-b-2 border-primary' : 'text-muted-foreground',
              )}
            >
              Blocks
            </button>
            <button
              onClick={() => setSidebarTab('settings')}
              className={cn(
                'flex-1 px-4 py-2 text-sm font-medium',
                sidebarTab === 'settings' ? 'border-b-2 border-primary' : 'text-muted-foreground',
              )}
            >
              <Settings className="mr-1 inline h-4 w-4" />
              Settings
            </button>
          </div>

          <div className="p-4">
            {sidebarTab === 'blocks' && (
              <BlockPalette onAddBlock={handleAddBlock} />
            )}
            {sidebarTab === 'settings' && (
              <PageSettings page={page} onUpdate={handleUpdatePage} />
            )}
          </div>
        </div>

        {/* Main Content - Block Editor */}
        <div
          className={cn(
            'flex-1 overflow-y-auto bg-muted/10 p-4',
            previewMode === 'mobile' && 'flex justify-center',
          )}
        >
          <div
            className={cn(
              'mx-auto',
              previewMode === 'mobile' ? 'w-[375px]' : 'w-full max-w-5xl',
            )}
          >
            <BlockEditor
              blocks={blocks}
              selectedBlockId={selectedBlockId}
              onSelect={setSelectedBlockId}
              onRemove={handleRemoveBlock}
              onReorder={handleReorderBlocks}
            />
          </div>
        </div>

        {/* Right Sidebar - Block Config or SEO */}
        <div className="w-80 shrink-0 overflow-y-auto border-l bg-muted/30">
          <div className="flex border-b">
            <button
              onClick={() => setSidebarTab('blocks')}
              className={cn(
                'flex-1 px-4 py-2 text-sm font-medium',
                selectedBlock ? 'border-b-2 border-primary' : 'text-muted-foreground',
              )}
            >
              {selectedBlock ? 'Block Config' : 'No Selection'}
            </button>
            <button
              onClick={() => setSidebarTab('seo')}
              className={cn(
                'flex-1 px-4 py-2 text-sm font-medium',
                sidebarTab === 'seo' ? 'border-b-2 border-primary' : 'text-muted-foreground',
              )}
            >
              SEO
            </button>
          </div>

          <div className="p-4">
            {sidebarTab === 'seo' ? (
              <SEOEditor page={page} onUpdate={handleUpdatePage} />
            ) : selectedBlock ? (
              <BlockConfigPanel
                block={selectedBlock}
                onUpdate={(config) => handleUpdateBlock(selectedBlock.id, config)}
              />
            ) : (
              <p className="text-sm text-muted-foreground">
                Select a block to configure it, or add a new block from the palette.
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
