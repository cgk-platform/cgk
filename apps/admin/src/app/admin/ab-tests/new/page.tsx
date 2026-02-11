import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'

import { CreateWizard } from '@/components/ab-tests/CreateWizard'

export default function NewABTestPage() {
  return (
    <div className="space-y-6">
      {/* Back Link */}
      <Link
        href="/admin/ab-tests"
        className="inline-flex items-center text-sm text-slate-500 hover:text-slate-900"
      >
        <ArrowLeft className="mr-1 h-4 w-4" />
        Back to tests
      </Link>

      {/* Page Header */}
      <div className="text-center">
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">
          Create A/B Test
        </h1>
        <p className="mt-1 text-sm text-slate-500">
          Set up a new experiment in just a few steps
        </p>
      </div>

      {/* Wizard */}
      <CreateWizard />
    </div>
  )
}
