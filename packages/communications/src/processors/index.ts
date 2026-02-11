/**
 * Email Queue Processors
 *
 * @ai-pattern queue-processors
 * @ai-note Use with background job system
 *
 * @example
 * ```ts
 * import { createReviewProcessor } from '@cgk/communications/processors'
 *
 * const runProcessor = createReviewProcessor({
 *   tenantId: 'rawdog',
 *   sendEmail: async (entry) => {
 *     // Send email via Resend
 *     return { success: true, messageId: 'msg_123' }
 *   }
 * })
 *
 * // Run every 5 minutes
 * const result = await runProcessor()
 * console.log(`Processed: ${result.processed}, Sent: ${result.sent}`)
 * ```
 */

// Base processor
export {
  BaseEmailProcessor,
  createProcessor,
  type EntryProcessor,
  type ProcessorConfig,
  type ProcessorResult,
} from './base-processor.js'

// Review processor
export {
  ReviewEmailProcessor,
  createReviewProcessor,
  createReviewProcessorJob,
  type ReviewProcessorConfig,
} from './review-processor.js'

// Retry processor
export {
  RetryProcessor,
  createRetryProcessor,
  createRetryProcessorJob,
  type RetryProcessorConfig,
  type RetryProcessorResult,
} from './retry-processor.js'
