import { ErrorAggregatesView } from '@/components/operations'

export const metadata = {
  title: 'Error Tracking',
  description: 'View and analyze platform errors',
}

export default function ErrorsPage() {
  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Error Tracking</h1>
        <p className="text-gray-500 mt-1">
          View aggregated errors grouped by type and pattern
        </p>
      </div>

      <ErrorAggregatesView />
    </div>
  )
}
