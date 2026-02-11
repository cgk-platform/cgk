import { headers } from 'next/headers'
import { notFound } from 'next/navigation'

import { getTemplateById, getTemplateVersions } from '@/lib/creator-communications/db'

import { TemplateEditor } from './template-editor'

interface PageProps {
  params: Promise<{ id: string }>
}

export default async function EditTemplatePage({ params }: PageProps) {
  const { id } = await params
  const headerList = await headers()
  const tenantSlug = headerList.get('x-tenant-slug')

  if (!tenantSlug) {
    return <p className="text-muted-foreground">No tenant configured.</p>
  }

  const [template, versions] = await Promise.all([
    getTemplateById(tenantSlug, id),
    getTemplateVersions(tenantSlug, id),
  ])

  if (!template) {
    notFound()
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Edit Template</h1>
        <p className="text-sm text-muted-foreground">{template.name}</p>
      </div>

      <TemplateEditor template={template} versions={versions} />
    </div>
  )
}
