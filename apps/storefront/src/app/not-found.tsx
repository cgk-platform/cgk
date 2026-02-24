/**
 * 404 Not Found Page
 *
 * Branded 404 page with CGK styling.
 */

import Link from 'next/link'

export default function NotFound() {
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center px-4 text-center">
      <h1 className="text-6xl font-bold text-cgk-navy">404</h1>
      <h2 className="mt-4 text-2xl font-semibold tracking-tight text-cgk-navy">
        Page Not Found
      </h2>
      <p className="mt-3 max-w-md text-gray-600">
        The page you are looking for does not exist or has been moved.
      </p>
      <Link
        href="/"
        className="mt-8 inline-flex items-center justify-center rounded-btn bg-cgk-navy px-6 py-3 font-medium text-white transition-all hover:bg-cgk-navy/90"
      >
        Back to Home
      </Link>
    </div>
  )
}
