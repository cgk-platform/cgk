/**
 * Root Loading State
 *
 * Displayed during top-level route transitions.
 */

export default function Loading() {
  return (
    <div className="flex min-h-[60vh] items-center justify-center">
      <div className="h-10 w-10 animate-spin rounded-full border-4 border-cgk-navy/20 border-t-cgk-navy" />
    </div>
  )
}
