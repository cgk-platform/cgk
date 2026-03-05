'use client'

import { PROFILES } from '@cgk-platform/openclaw/profiles'
import { use, useState } from 'react'

import { FileTree } from '@/components/workspace/file-tree'
import { MarkdownViewer } from '@/components/workspace/markdown-viewer'

export default function WorkspacePage({
  params,
}: {
  params: Promise<{ profile: string }>
}) {
  const { profile } = use(params)
  const config = PROFILES[profile as keyof typeof PROFILES]
  const [selectedFile, setSelectedFile] = useState<string | null>(null)

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">
          Workspace — {config?.label || profile}
        </h1>
        <p className="text-muted-foreground">Read-only workspace file browser</p>
      </div>

      <div className="grid h-[600px] grid-cols-[250px_1fr] gap-0 overflow-hidden rounded-lg border bg-card">
        <div className="overflow-y-auto border-r p-2">
          <FileTree
            profile={profile}
            selectedFile={selectedFile}
            onSelectFile={setSelectedFile}
          />
        </div>
        <MarkdownViewer profile={profile} path={selectedFile} />
      </div>
    </div>
  )
}
