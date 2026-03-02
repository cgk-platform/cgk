/**
 * Demo Mode Badge
 *
 * Displays a visual indicator when the storefront is running in demo/mock mode
 * (i.e., when Shopify connection is not available and fallback data is being used).
 */

'use client'

import { useEffect, useState } from 'react'

export function DemoModeBadge() {
  const [isDemoMode, setIsDemoMode] = useState(false)

  useEffect(() => {
    async function checkDemoMode() {
      try {
        const response = await fetch('/api/products?first=1')
        const data = await response.json()
        if (data.mock === true) {
          setIsDemoMode(true)
        }
      } catch (error) {
        console.error('Failed to check demo mode:', error)
      }
    }

    checkDemoMode()
  }, [])

  if (!isDemoMode) {
    return null
  }

  return (
    <div className="fixed bottom-4 left-4 z-50 rounded-lg border border-yellow-200 bg-yellow-50 px-4 py-2 shadow-lg">
      <div className="flex items-center gap-2">
        <span className="text-xl">🎨</span>
        <div className="text-sm">
          <p className="font-semibold text-yellow-900">Demo Mode</p>
          <p className="text-xs text-yellow-700">Using mock product data</p>
        </div>
      </div>
    </div>
  )
}
