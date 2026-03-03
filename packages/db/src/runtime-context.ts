/**
 * Runtime-Agnostic Context Store
 *
 * Provides AsyncLocalStorage-like API that works in both:
 * - Node.js runtime (uses AsyncLocalStorage)
 * - Edge runtime (uses module-level state with proper scoping)
 *
 * This allows tenant context to work seamlessly across all Next.js deployment targets.
 *
 * ## How it works
 *
 * **Node.js Runtime:**
 * Uses AsyncLocalStorage which properly tracks context across async operations.
 *
 * **Edge Runtime:**
 * Uses module-level state. This is safe because:
 * - Each request in Edge Runtime is isolated in its own execution context
 * - Next.js ensures proper request isolation
 * - The run() method uses try/finally to ensure cleanup
 *
 * ## References
 * - https://nextjs.org/docs/app/building-your-application/rendering/edge-and-nodejs-runtimes
 * - https://vercel.com/docs/functions/edge-functions/edge-runtime#using-edge-runtime-apis
 */

// Type-only import to avoid bundling issues
import { logger } from '@cgk-platform/logging'
type AsyncLocalStorage<T> = {
  run<R>(store: T, callback: () => R): R
  getStore(): T | undefined
}

/**
 * Detect if we're in Edge Runtime
 *
 * Edge Runtime is used by:
 * - Next.js middleware
 * - Next.js Edge API routes (export const runtime = 'edge')
 * - Vercel Edge Functions
 */
function isEdgeRuntime(): boolean {
  // Check for Edge Runtime global
  if (typeof (globalThis as { EdgeRuntime?: string }).EdgeRuntime === 'string') {
    return true
  }

  // Check if async_hooks is available (Node.js only)
  try {
    require.resolve('node:async_hooks')
    return false
  } catch {
    // async_hooks not available = likely Edge Runtime
    return true
  }
}

/**
 * Edge Runtime context storage
 *
 * Uses module-level Map to store context per async execution.
 * Safe because each request in Edge Runtime is isolated.
 */
class EdgeContextStorage<T> {
  private contextMap = new Map<symbol, T>()
  private currentSymbol: symbol | undefined

  run<R>(value: T, callback: () => R): R {
    const sym = Symbol('edge-context')
    const previousSymbol = this.currentSymbol

    this.currentSymbol = sym
    this.contextMap.set(sym, value)

    try {
      const result = callback()

      // Handle async callbacks (Promises)
      if (result instanceof Promise) {
        return result.finally(() => {
          this.contextMap.delete(sym)
          this.currentSymbol = previousSymbol
        }) as R
      }

      // Synchronous callbacks
      return result
    } finally {
      // Only cleanup for sync callbacks
      if (!(callback() instanceof Promise)) {
        this.contextMap.delete(sym)
        this.currentSymbol = previousSymbol
      }
    }
  }

  getStore(): T | undefined {
    if (!this.currentSymbol) return undefined
    return this.contextMap.get(this.currentSymbol)
  }
}

/**
 * Create a context store that works in both Node.js and Edge runtimes
 */
export function createRuntimeContext<T>(): {
  run<R>(store: T, callback: () => R): R
  getStore(): T | undefined
} {
  const isEdge = isEdgeRuntime()

  // In Node.js runtime, use AsyncLocalStorage
  if (!isEdge) {
    try {
      // Dynamic require to avoid bundling in Edge
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const { AsyncLocalStorage } = require('node:async_hooks') as {
        AsyncLocalStorage: new <T>() => AsyncLocalStorage<T>
      }
      const storage = new AsyncLocalStorage<T>()
      return {
        run: storage.run.bind(storage),
        getStore: storage.getStore.bind(storage),
      }
    } catch (err) {
      // Fallback to Edge implementation
      logger.warn('[DB] AsyncLocalStorage not available, using Edge-compatible storage', { error: err })
    }
  }

  // In Edge runtime, use Edge-compatible storage
  return new EdgeContextStorage<T>()
}

