import { headers } from 'next/headers'
import { notFound } from 'next/navigation'

import { getContractorById } from '@/lib/contractors/db'
import { ContractorEditForm } from './contractor-edit-form'

interface PageProps {
  params: Promise<{ id: string }>
}

export default async function EditContractorPage({ params }: PageProps) {
  const { id } = await params
  const headerList = await headers()
  const tenantSlug = headerList.get('x-tenant-slug')

  if (!tenantSlug) {
    return <p className="text-muted-foreground">No tenant configured.</p>
  }

  const contractor = await getContractorById(tenantSlug, id)
  if (!contractor) {
    notFound()
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Edit Contractor</h1>
        <p className="text-muted-foreground">Update contractor profile and settings</p>
      </div>

      <ContractorEditForm contractor={contractor} />
    </div>
  )
}
