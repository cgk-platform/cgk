import { notFound } from 'next/navigation'
import { headers } from 'next/headers'

import { WorkflowRuleEditor } from '../_components/workflow-rule-editor'

interface PageProps {
  params: Promise<{ id: string }>
}

async function getRule(id: string, tenantId: string) {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || process.env.APP_URL
  if (!baseUrl) {
    throw new Error('APP_URL or NEXT_PUBLIC_APP_URL environment variable is required')
  }

  const res = await fetch(`${baseUrl}/api/admin/workflows/rules/${id}`, {
    headers: {
      'x-tenant-id': tenantId,
    },
    cache: 'no-store',
  })

  if (!res.ok) {
    return null
  }

  const data = await res.json()
  return data.rule
}

export default async function WorkflowRulePage({ params }: PageProps) {
  const { id } = await params
  const headerList = await headers()
  const tenantId = headerList.get('x-tenant-id') || ''

  const rule = await getRule(id, tenantId)

  if (!rule) {
    notFound()
  }

  return <WorkflowRuleEditor initialRule={rule} />
}
