/**
 * Review email queue processor
 *
 * @ai-pattern review-processor
 * @ai-note Processes review request and reminder emails
 */

import type { ReviewQueueEntry, SendResult } from '../queue/types.js'
import { BaseEmailProcessor, type ProcessorConfig, type ProcessorResult } from './base-processor.js'
import { hasReviewBeenSubmitted } from '../queue/review-queue.js'
import { createReviewFollowUp, skipPendingEntriesForOrder } from '../queue/sequence.js'

/**
 * Review processor configuration
 */
export interface ReviewProcessorConfig extends ProcessorConfig {
  /** Maximum sequence emails per order (default 2) */
  maxSequenceEmails?: number
  /** Days between follow-ups (default 3) */
  followUpDelayDays?: number
  /** Email sender function */
  sendEmail: (entry: ReviewQueueEntry) => Promise<SendResult>
  /** Check if review exists (optional, uses default if not provided) */
  checkReviewExists?: (tenantId: string, orderId: string) => Promise<boolean>
}

/**
 * Review email queue processor
 *
 * @ai-pattern review-processor
 * @ai-note Handles review request emails with follow-up sequences
 */
export class ReviewEmailProcessor extends BaseEmailProcessor<ReviewQueueEntry> {
  private reviewConfig: ReviewProcessorConfig

  constructor(config: ReviewProcessorConfig) {
    super({
      ...config,
      queueType: 'review',
    })
    this.reviewConfig = {
      ...config,
      maxSequenceEmails: config.maxSequenceEmails ?? 2,
      followUpDelayDays: config.followUpDelayDays ?? 3,
    }
  }

  protected async processEntry(entry: ReviewQueueEntry): Promise<{
    action: 'send' | 'skip'
    result?: SendResult
    skipReason?: string
  }> {
    // Check if review has already been submitted
    const checkFn = this.reviewConfig.checkReviewExists || hasReviewBeenSubmitted
    const reviewExists = await checkFn(this.config.tenantId, entry.orderId)

    if (reviewExists) {
      // Skip this entry and all other pending entries for the order
      await skipPendingEntriesForOrder(
        this.config.tenantId,
        'review',
        entry.orderId,
        'review_already_submitted'
      )
      return {
        action: 'skip',
        skipReason: 'review_already_submitted',
      }
    }

    // Send the email
    const result = await this.reviewConfig.sendEmail(entry)

    if (result.success) {
      // Schedule follow-up if not at max sequence
      if (
        entry.sequenceNumber < (this.reviewConfig.maxSequenceEmails ?? 2)
      ) {
        const followUpDate = new Date()
        followUpDate.setDate(
          followUpDate.getDate() + (this.reviewConfig.followUpDelayDays ?? 3)
        )

        await createReviewFollowUp(
          this.config.tenantId,
          entry,
          followUpDate,
          entry.sequenceNumber === 1 ? 'reviewReminder' : 'reviewFinalReminder'
        )
      }
    }

    return {
      action: 'send',
      result,
    }
  }
}

/**
 * Create a review email processor
 *
 * @param config - Processor configuration
 * @returns Run function
 */
export function createReviewProcessor(
  config: ReviewProcessorConfig
): () => Promise<ProcessorResult> {
  const processor = new ReviewEmailProcessor(config)
  return () => processor.run()
}

/**
 * Review processor job handler for background jobs
 *
 * @ai-pattern job-handler
 * @ai-note Use with @cgk/jobs
 */
export function createReviewProcessorJob(
  getSendEmail: () => (entry: ReviewQueueEntry) => Promise<SendResult>
) {
  return async (payload: {
    tenantId: string
    batchSize?: number
    maxSequenceEmails?: number
    followUpDelayDays?: number
  }): Promise<ProcessorResult> => {
    const processor = new ReviewEmailProcessor({
      tenantId: payload.tenantId,
      queueType: 'review',
      batchSize: payload.batchSize,
      maxSequenceEmails: payload.maxSequenceEmails,
      followUpDelayDays: payload.followUpDelayDays,
      sendEmail: getSendEmail(),
    })

    return processor.run()
  }
}
