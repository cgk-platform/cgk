/**
 * MCP Streaming Response Utilities
 *
 * Handles streaming responses for long-running MCP tools.
 * Uses ReadableStream for Edge runtime compatibility.
 *
 * AI Discretion Decision: Streaming chunks use newline-delimited JSON (NDJSON)
 * format for easy parsing. Each line is a complete JSON object.
 */

import type { ContentBlock, ToolResult, TextContent } from './types'

// =============================================================================
// Streaming Tool Configuration
// =============================================================================

/**
 * Tools that require streaming responses due to potentially long execution times
 */
export const STREAMING_TOOLS = [
  'search_orders',      // Can return many results
  'export_analytics',   // Large data export
  'bulk_update',        // Batch operations
  'generate_report',    // Report generation
  'sync_inventory',     // Inventory sync
  'import_data',        // Data import
  'analyze_trends',     // Analytics computation
] as const

/**
 * Type for streaming tool names
 */
export type StreamingToolName = (typeof STREAMING_TOOLS)[number]

/**
 * Check if a tool requires streaming
 *
 * @param toolName - The name of the tool
 * @returns True if the tool should use streaming
 */
export function requiresStreaming(toolName: string): boolean {
  return (STREAMING_TOOLS as readonly string[]).includes(toolName)
}

// =============================================================================
// Streaming Chunk Types
// =============================================================================

/**
 * Streaming chunk types
 */
export type StreamingChunkType =
  | 'progress'   // Progress update
  | 'partial'    // Partial result
  | 'complete'   // Final result
  | 'error'      // Error occurred

/**
 * Progress chunk
 */
export interface ProgressChunk {
  type: 'progress'
  progress: number      // 0-100
  message?: string
  itemsProcessed?: number
  totalItems?: number
}

/**
 * Partial result chunk
 */
export interface PartialChunk {
  type: 'partial'
  content: ContentBlock[]
  index: number
}

/**
 * Complete result chunk
 */
export interface CompleteChunk {
  type: 'complete'
  result: ToolResult
}

/**
 * Error chunk
 */
export interface ErrorChunk {
  type: 'error'
  code: number
  message: string
  data?: unknown
}

/**
 * Union type for all streaming chunks
 */
export type StreamingChunk =
  | ProgressChunk
  | PartialChunk
  | CompleteChunk
  | ErrorChunk

// =============================================================================
// Streaming Response Builder
// =============================================================================

/**
 * Options for creating a streaming response
 */
export interface StreamingResponseOptions {
  /** ID from the JSON-RPC request */
  requestId: string | number
  /** CORS headers to include */
  corsHeaders?: Record<string, string>
}

/**
 * Create a streaming response from an async generator
 *
 * @param generator - Async generator yielding streaming chunks
 * @param options - Streaming response options
 * @returns A Response object with streaming body
 */
export function createStreamingResponse(
  generator: AsyncGenerator<StreamingChunk, void, unknown>,
  options: StreamingResponseOptions
): Response {
  const encoder = new TextEncoder()

  const stream = new ReadableStream({
    async start(controller) {
      try {
        for await (const chunk of generator) {
          // Wrap chunk in JSON-RPC response format
          const responseChunk = {
            jsonrpc: '2.0' as const,
            id: options.requestId,
            result: chunk,
          }
          // Send as NDJSON (newline-delimited JSON)
          const line = JSON.stringify(responseChunk) + '\n'
          controller.enqueue(encoder.encode(line))
        }
        controller.close()
      } catch (error) {
        // Send error chunk before closing
        const errorChunk: ErrorChunk = {
          type: 'error',
          code: -32603,
          message: error instanceof Error ? error.message : 'Unknown streaming error',
        }
        const errorResponse = {
          jsonrpc: '2.0' as const,
          id: options.requestId,
          result: errorChunk,
        }
        controller.enqueue(encoder.encode(JSON.stringify(errorResponse) + '\n'))
        controller.close()
      }
    },
  })

  const headers: Record<string, string> = {
    'Content-Type': 'application/x-ndjson',
    'Transfer-Encoding': 'chunked',
    'Cache-Control': 'no-cache',
    'Connection': 'keep-alive',
    ...options.corsHeaders,
  }

  return new Response(stream, {
    status: 200,
    headers,
  })
}

// =============================================================================
// Streaming Tool Handler Helpers
// =============================================================================

/**
 * Context for streaming tool execution
 */
export interface StreamingContext {
  /** Send a progress update */
  progress: (percent: number, message?: string) => Promise<void>
  /** Send a partial result */
  partial: (content: ContentBlock[], index: number) => Promise<void>
  /** Check if client is still connected */
  isConnected: () => boolean
  /** Abort signal for cancellation */
  signal?: AbortSignal
}

/**
 * Create a streaming tool handler wrapper
 *
 * @param toolFn - The async generator function to wrap
 * @returns Async generator that handles progress and results
 */
export function createStreamingToolHandler<TArgs>(
  toolFn: (
    args: TArgs,
    context: StreamingContext
  ) => AsyncGenerator<StreamingChunk, void, unknown>
): (args: TArgs, signal?: AbortSignal) => AsyncGenerator<StreamingChunk, void, unknown> {
  return async function* (args: TArgs, signal?: AbortSignal) {
    let connected = true

    // Create abort listener
    const onAbort = () => {
      connected = false
    }
    signal?.addEventListener('abort', onAbort)

    try {
      const context: StreamingContext = {
        progress: async (_percent, _message) => {
          // This is handled by the generator yield
          // Parameters intentionally unused - they exist to document the signature
        },
        partial: async (_content, _index) => {
          // This is handled by the generator yield
          // Parameters intentionally unused - they exist to document the signature
        },
        isConnected: () => connected,
        signal,
      }

      yield* toolFn(args, context)
    } finally {
      signal?.removeEventListener('abort', onAbort)
    }
  }
}

// =============================================================================
// Convenience Chunk Creators
// =============================================================================

/**
 * Create a progress chunk
 */
export function progressChunk(
  progress: number,
  message?: string,
  itemsProcessed?: number,
  totalItems?: number
): ProgressChunk {
  return {
    type: 'progress',
    progress: Math.min(100, Math.max(0, progress)),
    message,
    itemsProcessed,
    totalItems,
  }
}

/**
 * Create a partial result chunk
 */
export function partialChunk(content: ContentBlock[], index: number): PartialChunk {
  return {
    type: 'partial',
    content,
    index,
  }
}

/**
 * Create a text partial chunk
 */
export function textPartialChunk(text: string, index: number): PartialChunk {
  return partialChunk([{ type: 'text', text }], index)
}

/**
 * Create a complete result chunk
 */
export function completeChunk(result: ToolResult): CompleteChunk {
  return {
    type: 'complete',
    result,
  }
}

/**
 * Create a text complete chunk
 */
export function textCompleteChunk(text: string, isError = false): CompleteChunk {
  return completeChunk({
    content: [{ type: 'text', text }],
    isError,
  })
}

/**
 * Create an error chunk
 */
export function errorChunk(
  code: number,
  message: string,
  data?: unknown
): ErrorChunk {
  return {
    type: 'error',
    code,
    message,
    data,
  }
}

// =============================================================================
// Streaming Result Aggregator
// =============================================================================

/**
 * Aggregate streaming chunks into a final ToolResult
 *
 * Useful for testing or when you need to collect all streaming output.
 *
 * @param generator - The streaming chunk generator
 * @returns Promise resolving to the final ToolResult
 */
export async function aggregateStreamingResult(
  generator: AsyncGenerator<StreamingChunk, void, unknown>
): Promise<ToolResult> {
  const partialContents: ContentBlock[] = []
  let finalResult: ToolResult | null = null
  let error: ErrorChunk | null = null

  for await (const chunk of generator) {
    switch (chunk.type) {
      case 'partial':
        partialContents.push(...chunk.content)
        break
      case 'complete':
        finalResult = chunk.result
        break
      case 'error':
        error = chunk
        break
      case 'progress':
        // Progress chunks are informational only
        break
    }
  }

  // If there was an error, return error result
  if (error) {
    return {
      content: [{ type: 'text', text: `Error (${error.code}): ${error.message}` }],
      isError: true,
    }
  }

  // If we got a complete result, return it
  if (finalResult) {
    return finalResult
  }

  // If we have partial contents, aggregate them
  if (partialContents.length > 0) {
    return {
      content: partialContents,
      isError: false,
    }
  }

  // No results at all - shouldn't happen but handle gracefully
  return {
    content: [{ type: 'text', text: 'No results' }],
    isError: false,
  }
}

// =============================================================================
// Batch Processing Helpers
// =============================================================================

/**
 * Options for batch streaming
 */
export interface BatchStreamingOptions {
  /** Batch size for processing */
  batchSize?: number
  /** Delay between batches in ms */
  batchDelay?: number
  /** Whether to yield progress updates */
  yieldProgress?: boolean
}

/**
 * Process items in batches with streaming output
 *
 * @param items - Array of items to process
 * @param processor - Function to process each item
 * @param options - Batch processing options
 * @returns Async generator yielding streaming chunks
 */
export async function* batchProcess<TItem, TResult>(
  items: TItem[],
  processor: (item: TItem, index: number) => Promise<TResult>,
  options: BatchStreamingOptions = {}
): AsyncGenerator<StreamingChunk, void, unknown> {
  const {
    batchSize = 10,
    batchDelay = 0,
    yieldProgress = true,
  } = options

  const totalItems = items.length
  let processedCount = 0
  const results: ContentBlock[] = []

  // Yield initial progress
  if (yieldProgress) {
    yield progressChunk(0, 'Starting batch processing', 0, totalItems)
  }

  // Process in batches
  for (let i = 0; i < items.length; i += batchSize) {
    const batch = items.slice(i, i + batchSize)
    const batchResults = await Promise.all(
      batch.map(async (item, batchIndex) => {
        const globalIndex = i + batchIndex
        return processor(item, globalIndex)
      })
    )

    // Convert batch results to content blocks
    const batchContent: TextContent[] = batchResults.map((result) => ({
      type: 'text' as const,
      text: typeof result === 'string' ? result : JSON.stringify(result),
    }))

    processedCount += batch.length
    results.push(...batchContent)

    // Yield partial results
    yield partialChunk(batchContent, Math.floor(i / batchSize))

    // Yield progress
    if (yieldProgress) {
      const progress = Math.round((processedCount / totalItems) * 100)
      yield progressChunk(
        progress,
        `Processed ${processedCount} of ${totalItems} items`,
        processedCount,
        totalItems
      )
    }

    // Delay between batches if specified
    if (batchDelay > 0 && i + batchSize < items.length) {
      await new Promise((resolve) => setTimeout(resolve, batchDelay))
    }
  }

  // Yield complete result
  yield completeChunk({
    content: results,
    isError: false,
  })
}
