/**
 * Review provider abstraction layer
 *
 * Allows switching between internal review system and external providers like Yotpo
 */

import type {
  Review,
  ReviewFilters,
  ProductQuestion,
  QuestionFilters,
  CreateReviewInput,
  ReviewProviderInterface,
} from '../types'
import * as db from '../db'

// =============================================================================
// INTERNAL PROVIDER
// =============================================================================

export class InternalReviewProvider implements ReviewProviderInterface {
  constructor(private tenantSlug: string) {}

  async getReviews(filters: ReviewFilters): Promise<{ rows: Review[]; totalCount: number }> {
    return db.getReviews(this.tenantSlug, filters)
  }

  async getReview(id: string): Promise<Review | null> {
    return db.getReview(this.tenantSlug, id)
  }

  async createReview(data: CreateReviewInput): Promise<Review> {
    return db.createReview(this.tenantSlug, data)
  }

  async moderateReview(id: string, action: 'approve' | 'reject' | 'spam'): Promise<void> {
    await db.moderateReview(this.tenantSlug, id, action)
  }

  async respondToReview(reviewId: string, response: string, author: string): Promise<void> {
    await db.respondToReview(this.tenantSlug, reviewId, response, author)
  }

  async deleteResponse(reviewId: string): Promise<void> {
    await db.deleteReviewResponse(this.tenantSlug, reviewId)
  }

  async getQuestions(filters: QuestionFilters): Promise<{ rows: ProductQuestion[]; totalCount: number }> {
    return db.getQuestions(this.tenantSlug, filters)
  }

  async answerQuestion(questionId: string, answer: string, answeredBy: string): Promise<void> {
    await db.answerQuestion(this.tenantSlug, questionId, { answer, answered_by: answeredBy })
  }
}

// =============================================================================
// YOTPO PROVIDER (Placeholder for external integration)
// =============================================================================

export interface YotpoCredentials {
  app_key: string
  secret_key: string
  store_id?: string
}

export class YotpoReviewProvider implements ReviewProviderInterface {
  private credentials: YotpoCredentials

  constructor(
    private tenantSlug: string,
    credentials: YotpoCredentials,
  ) {
    this.credentials = credentials
  }

  async getReviews(filters: ReviewFilters): Promise<{ rows: Review[]; totalCount: number }> {
    // In production, this would call the Yotpo API
    // For now, fall back to internal database (synced data)
    return db.getReviews(this.tenantSlug, filters)
  }

  async getReview(id: string): Promise<Review | null> {
    return db.getReview(this.tenantSlug, id)
  }

  async createReview(data: CreateReviewInput): Promise<Review> {
    // Yotpo reviews are typically created through their widget/API
    // This is for internal use
    return db.createReview(this.tenantSlug, data)
  }

  async moderateReview(id: string, action: 'approve' | 'reject' | 'spam'): Promise<void> {
    // Would call Yotpo API to moderate
    // Also update local cache
    await db.moderateReview(this.tenantSlug, id, action)
  }

  async respondToReview(reviewId: string, response: string, author: string): Promise<void> {
    // Would call Yotpo API to respond
    await db.respondToReview(this.tenantSlug, reviewId, response, author)
  }

  async deleteResponse(reviewId: string): Promise<void> {
    await db.deleteReviewResponse(this.tenantSlug, reviewId)
  }

  async getQuestions(filters: QuestionFilters): Promise<{ rows: ProductQuestion[]; totalCount: number }> {
    return db.getQuestions(this.tenantSlug, filters)
  }

  async answerQuestion(questionId: string, answer: string, answeredBy: string): Promise<void> {
    await db.answerQuestion(this.tenantSlug, questionId, { answer, answered_by: answeredBy })
  }

  async syncFromProvider(): Promise<{ imported: number; updated: number; errors: number }> {
    // Would fetch all reviews from Yotpo and sync to local database
    // Implementation would use Yotpo's Reviews API
    console.log('Syncing from Yotpo...', this.credentials.app_key)
    return { imported: 0, updated: 0, errors: 0 }
  }

  async pushToProvider(review: Review): Promise<void> {
    // Would push a review to Yotpo
    console.log('Pushing review to Yotpo...', review.id)
  }
}

// =============================================================================
// PROVIDER FACTORY
// =============================================================================

export type ReviewProviderType = 'internal' | 'yotpo'

export async function getReviewProvider(
  tenantSlug: string,
): Promise<ReviewProviderInterface> {
  const settings = await db.getSettings(tenantSlug)

  if (settings.provider === 'yotpo' && settings.provider_credentials) {
    const credentials = settings.provider_credentials as unknown as YotpoCredentials
    if (credentials.app_key && credentials.secret_key) {
      return new YotpoReviewProvider(tenantSlug, credentials)
    }
  }

  return new InternalReviewProvider(tenantSlug)
}

// =============================================================================
// WIDGET CONFIGURATION
// =============================================================================

export interface WidgetConfig {
  provider: ReviewProviderType
  display: {
    showVerifiedBadge: boolean
    allowMedia: boolean
    maxMediaCount: number
    allowRatingOnly: boolean
    minReviewLength: number
  }
  incentive: {
    enabled: boolean
    discountType: 'percentage' | 'fixed' | null
    discountValue: number | null
    requirePhoto: boolean
    minRating: number | null
  }
}

export async function getWidgetConfig(tenantSlug: string): Promise<WidgetConfig> {
  const settings = await db.getSettings(tenantSlug)

  return {
    provider: settings.provider,
    display: {
      showVerifiedBadge: settings.show_verified_badge,
      allowMedia: settings.allow_media,
      maxMediaCount: settings.max_media_count,
      allowRatingOnly: settings.allow_rating_only,
      minReviewLength: settings.min_review_length,
    },
    incentive: {
      enabled: settings.incentive_enabled,
      discountType: settings.incentive_discount_type,
      discountValue: settings.incentive_discount_value,
      requirePhoto: settings.incentive_require_photo,
      minRating: settings.incentive_min_rating,
    },
  }
}
