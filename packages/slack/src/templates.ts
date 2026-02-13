/**
 * @cgk-platform/slack - Block Kit message templates
 *
 * @ai-pattern templates
 * @ai-note Pre-built Slack message templates using Block Kit
 */

import type { SlackBlock, NotificationType } from './types'

// ============================================================================
// Template Variable Types
// ============================================================================

export interface TemplateVariables {
  // Common
  timestamp?: string
  tenantName?: string

  // Creator
  creatorName?: string
  creatorEmail?: string
  creatorId?: string
  applicationUrl?: string

  // Project
  projectId?: string
  projectTitle?: string
  projectUrl?: string
  projectRate?: string
  projectDueDate?: string

  // Payment
  paymentAmount?: string
  paymentMethod?: string
  paymentStatus?: string
  paymentUrl?: string

  // Withdrawal
  withdrawalAmount?: string
  withdrawalId?: string
  withdrawalUrl?: string

  // Order
  orderNumber?: string
  orderId?: string
  orderAmount?: string
  orderUrl?: string
  customerEmail?: string
  customerName?: string

  // Subscription
  subscriptionId?: string
  subscriptionPlan?: string
  subscriptionUrl?: string

  // Review
  reviewId?: string
  reviewRating?: number
  reviewText?: string
  reviewUrl?: string
  productName?: string

  // Treasury
  topupAmount?: string
  topupId?: string
  balance?: string
  balanceThreshold?: string
  topupUrl?: string

  // Payout
  payoutAmount?: string
  payoutId?: string
  payoutRecipient?: string
  payoutUrl?: string

  // System
  alertTitle?: string
  alertMessage?: string
  errorMessage?: string
  errorStack?: string

  // Asset/DAM
  assetName?: string
  assetUrl?: string
  commentText?: string
  mentionedUser?: string

  // Analytics
  metricName?: string
  metricValue?: string
  taskDescription?: string
}

// ============================================================================
// Template Builders
// ============================================================================

/**
 * Build a header block
 */
function header(text: string, emoji: string = ''): SlackBlock {
  const displayText = emoji ? `${emoji} ${text}` : text
  return {
    type: 'header',
    text: { type: 'plain_text', text: displayText, emoji: true },
  }
}

/**
 * Build a section block with markdown text
 */
function section(text: string): SlackBlock {
  return {
    type: 'section',
    text: { type: 'mrkdwn', text },
  }
}

/**
 * Build a section with fields (two-column layout)
 */
function fields(...fieldTexts: string[]): SlackBlock {
  return {
    type: 'section',
    fields: fieldTexts.map(text => ({ type: 'mrkdwn', text })),
  }
}

/**
 * Build an actions block with buttons
 */
function actions(...buttons: Array<{ text: string; url: string; style?: 'primary' | 'danger' }>): SlackBlock {
  return {
    type: 'actions',
    elements: buttons.map((btn, idx) => ({
      type: 'button' as const,
      text: { type: 'plain_text' as const, text: btn.text, emoji: true },
      url: btn.url,
      action_id: `action_${idx}`,
    })),
  }
}

/**
 * Build a context block (footer text)
 */
function context(...texts: string[]): SlackBlock {
  return {
    type: 'context',
    elements: texts.map(text => ({ type: 'mrkdwn' as const, text })),
  }
}

/**
 * Build a divider block
 */
export function divider(): SlackBlock {
  return { type: 'divider' }
}

// ============================================================================
// Template Definitions
// ============================================================================

export type TemplateBuilder = (vars: TemplateVariables) => {
  blocks: SlackBlock[]
  fallbackText: string
}

const templates: Record<NotificationType, TemplateBuilder> = {
  // ==========================================================================
  // Creator Templates
  // ==========================================================================

  'creator.application.new': (vars) => ({
    blocks: [
      header('New Creator Application', ':clipboard:'),
      section(`*${vars.creatorName || 'Unknown'}* has submitted a new application`),
      fields(
        `*Email:* ${vars.creatorEmail || 'N/A'}`,
        `*Submitted:* ${vars.timestamp || 'Just now'}`,
      ),
      actions({ text: 'Review Application', url: vars.applicationUrl || '#' }),
      context('CGK Creator Management', vars.timestamp || ''),
    ],
    fallbackText: `New creator application from ${vars.creatorName || 'Unknown'}`,
  }),

  'creator.application.approved': (vars) => ({
    blocks: [
      header('Application Approved', ':white_check_mark:'),
      section(`*${vars.creatorName || 'Unknown'}*'s application has been approved!`),
      context('CGK Creator Management', vars.timestamp || ''),
    ],
    fallbackText: `Creator application approved: ${vars.creatorName || 'Unknown'}`,
  }),

  'creator.application.rejected': (vars) => ({
    blocks: [
      header('Application Rejected', ':x:'),
      section(`*${vars.creatorName || 'Unknown'}*'s application has been rejected`),
      context('CGK Creator Management', vars.timestamp || ''),
    ],
    fallbackText: `Creator application rejected: ${vars.creatorName || 'Unknown'}`,
  }),

  'creator.project.update': (vars) => ({
    blocks: [
      header('Project Updated', ':arrows_counterclockwise:'),
      section(`*${vars.projectTitle || 'Unknown Project'}*`),
      section(`Status changed for project assigned to ${vars.creatorName || 'Unknown'}`),
      actions({ text: 'View Project', url: vars.projectUrl || '#' }),
      context('CGK Creator Management', vars.timestamp || ''),
    ],
    fallbackText: `Project updated: ${vars.projectTitle || 'Unknown'}`,
  }),

  'creator.project.submitted': (vars) => ({
    blocks: [
      header('Content Submitted for Review', ':inbox_tray:'),
      section(`*${vars.projectTitle || 'Unknown Project'}*\nSubmitted by ${vars.creatorName || 'Unknown'}`),
      fields(
        `*Rate:* ${vars.projectRate || 'N/A'}`,
        `*Due:* ${vars.projectDueDate || 'N/A'}`,
      ),
      actions({ text: 'Review Content', url: vars.projectUrl || '#' }),
      context('CGK Creator Management', vars.timestamp || ''),
    ],
    fallbackText: `Content submitted: ${vars.projectTitle || 'Unknown'} by ${vars.creatorName || 'Unknown'}`,
  }),

  'creator.project.accepted': (vars) => ({
    blocks: [
      header('Content Approved', ':white_check_mark:'),
      section(`*${vars.projectTitle || 'Unknown Project'}*\nContent from ${vars.creatorName || 'Unknown'} has been approved`),
      actions({ text: 'View Project', url: vars.projectUrl || '#' }),
      context('CGK Creator Management', vars.timestamp || ''),
    ],
    fallbackText: `Content approved: ${vars.projectTitle || 'Unknown'}`,
  }),

  'creator.project.declined': (vars) => ({
    blocks: [
      header('Revision Requested', ':memo:'),
      section(`*${vars.projectTitle || 'Unknown Project'}*\nRevisions needed from ${vars.creatorName || 'Unknown'}`),
      actions({ text: 'View Project', url: vars.projectUrl || '#' }),
      context('CGK Creator Management', vars.timestamp || ''),
    ],
    fallbackText: `Revision requested: ${vars.projectTitle || 'Unknown'}`,
  }),

  'creator.withdrawal.requested': (vars) => ({
    blocks: [
      header('Payout Requested', ':money_with_wings:'),
      section(`*${vars.creatorName || 'Unknown'}* has requested a payout`),
      fields(
        `*Amount:* ${vars.withdrawalAmount || 'N/A'}`,
        `*Request ID:* ${vars.withdrawalId || 'N/A'}`,
      ),
      actions({ text: 'Review Payout', url: vars.withdrawalUrl || '#' }),
      context('CGK Treasury', vars.timestamp || ''),
    ],
    fallbackText: `Payout requested: ${vars.withdrawalAmount || 'N/A'} by ${vars.creatorName || 'Unknown'}`,
  }),

  'creator.withdrawal.approved': (vars) => ({
    blocks: [
      header('Payout Approved', ':white_check_mark:'),
      section(`Payout for *${vars.creatorName || 'Unknown'}* has been approved`),
      fields(
        `*Amount:* ${vars.withdrawalAmount || 'N/A'}`,
        `*Status:* Approved`,
      ),
      context('CGK Treasury', vars.timestamp || ''),
    ],
    fallbackText: `Payout approved: ${vars.withdrawalAmount || 'N/A'} for ${vars.creatorName || 'Unknown'}`,
  }),

  'creator.withdrawal.completed': (vars) => ({
    blocks: [
      header('Payout Sent', ':white_check_mark:'),
      section(`Payout for *${vars.creatorName || 'Unknown'}* has been sent`),
      fields(
        `*Amount:* ${vars.withdrawalAmount || 'N/A'}`,
        `*Method:* ${vars.paymentMethod || 'N/A'}`,
      ),
      context('CGK Treasury', vars.timestamp || ''),
    ],
    fallbackText: `Payout sent: ${vars.withdrawalAmount || 'N/A'} to ${vars.creatorName || 'Unknown'}`,
  }),

  'creator.payment.requested': (vars) => ({
    blocks: [
      header('Payment Pending', ':hourglass_flowing_sand:'),
      section(`Payment for *${vars.creatorName || 'Unknown'}* is pending`),
      fields(
        `*Amount:* ${vars.paymentAmount || 'N/A'}`,
        `*Status:* Pending`,
      ),
      actions({ text: 'View Payment', url: vars.paymentUrl || '#' }),
      context('CGK Treasury', vars.timestamp || ''),
    ],
    fallbackText: `Payment pending: ${vars.paymentAmount || 'N/A'} for ${vars.creatorName || 'Unknown'}`,
  }),

  'creator.payment.failed': (vars) => ({
    blocks: [
      header('Payment Failed', ':warning:'),
      section(`Payment for *${vars.creatorName || 'Unknown'}* has failed`),
      fields(
        `*Amount:* ${vars.paymentAmount || 'N/A'}`,
        `*Reason:* ${vars.errorMessage || 'Unknown error'}`,
      ),
      actions(
        { text: 'View Details', url: vars.paymentUrl || '#' },
        { text: 'Retry', url: vars.paymentUrl || '#' },
      ),
      context('CGK Treasury', vars.timestamp || ''),
    ],
    fallbackText: `Payment failed: ${vars.paymentAmount || 'N/A'} for ${vars.creatorName || 'Unknown'}`,
  }),

  'creator.payment.escalated': (vars) => ({
    blocks: [
      header('Payment Escalated', ':rotating_light:'),
      section(`Payment issue for *${vars.creatorName || 'Unknown'}* has been escalated`),
      fields(
        `*Amount:* ${vars.paymentAmount || 'N/A'}`,
        `*Issue:* ${vars.errorMessage || 'Requires attention'}`,
      ),
      actions({ text: 'Review Issue', url: vars.paymentUrl || '#' }),
      context('CGK Treasury - Escalation', vars.timestamp || ''),
    ],
    fallbackText: `Payment escalated: ${vars.paymentAmount || 'N/A'} for ${vars.creatorName || 'Unknown'}`,
  }),

  'creator.message.new': (vars) => ({
    blocks: [
      header('New Message from Creator', ':speech_balloon:'),
      section(`*${vars.creatorName || 'Unknown'}* sent a message`),
      section(`> ${vars.commentText || 'Message content not available'}`),
      actions({ text: 'View Conversation', url: vars.projectUrl || '#' }),
      context('CGK Creator Inbox', vars.timestamp || ''),
    ],
    fallbackText: `New message from ${vars.creatorName || 'Unknown'}`,
  }),

  // ==========================================================================
  // Commerce Templates
  // ==========================================================================

  'commerce.order.new': (vars) => ({
    blocks: [
      header('New Order', ':shopping_bags:'),
      section(`Order *#${vars.orderNumber || 'Unknown'}*`),
      fields(
        `*Amount:* ${vars.orderAmount || 'N/A'}`,
        `*Customer:* ${vars.customerEmail || 'N/A'}`,
      ),
      actions({ text: 'View Order', url: vars.orderUrl || '#' }),
      context('CGK Commerce', vars.timestamp || ''),
    ],
    fallbackText: `New order #${vars.orderNumber || 'Unknown'} for ${vars.orderAmount || 'N/A'}`,
  }),

  'commerce.order.high_value': (vars) => ({
    blocks: [
      header('High Value Order', ':star2:'),
      section(`Order *#${vars.orderNumber || 'Unknown'}* exceeds threshold!`),
      fields(
        `*Amount:* ${vars.orderAmount || 'N/A'}`,
        `*Customer:* ${vars.customerEmail || 'N/A'}`,
      ),
      actions({ text: 'View Order', url: vars.orderUrl || '#' }),
      context('CGK Commerce - High Priority', vars.timestamp || ''),
    ],
    fallbackText: `High value order #${vars.orderNumber || 'Unknown'} for ${vars.orderAmount || 'N/A'}`,
  }),

  'commerce.order.failed': (vars) => ({
    blocks: [
      header('Order Failed', ':warning:'),
      section(`Order *#${vars.orderNumber || 'Unknown'}* processing failed`),
      fields(
        `*Amount:* ${vars.orderAmount || 'N/A'}`,
        `*Error:* ${vars.errorMessage || 'Unknown error'}`,
      ),
      actions({ text: 'View Order', url: vars.orderUrl || '#' }),
      context('CGK Commerce - Alert', vars.timestamp || ''),
    ],
    fallbackText: `Order failed #${vars.orderNumber || 'Unknown'}`,
  }),

  'commerce.refund.issued': (vars) => ({
    blocks: [
      header('Refund Issued', ':moneybag:'),
      section(`Refund processed for order *#${vars.orderNumber || 'Unknown'}*`),
      fields(
        `*Refund Amount:* ${vars.orderAmount || 'N/A'}`,
        `*Customer:* ${vars.customerEmail || 'N/A'}`,
      ),
      actions({ text: 'View Order', url: vars.orderUrl || '#' }),
      context('CGK Commerce', vars.timestamp || ''),
    ],
    fallbackText: `Refund issued for order #${vars.orderNumber || 'Unknown'}`,
  }),

  'commerce.fulfillment.issue': (vars) => ({
    blocks: [
      header('Fulfillment Issue', ':package:'),
      section(`Fulfillment problem with order *#${vars.orderNumber || 'Unknown'}*`),
      section(`Issue: ${vars.errorMessage || 'Unknown problem'}`),
      actions({ text: 'View Order', url: vars.orderUrl || '#' }),
      context('CGK Commerce - Alert', vars.timestamp || ''),
    ],
    fallbackText: `Fulfillment issue for order #${vars.orderNumber || 'Unknown'}`,
  }),

  'commerce.subscription.new': (vars) => ({
    blocks: [
      header('New Subscription', ':repeat:'),
      section(`*${vars.customerEmail || 'Unknown'}* subscribed to *${vars.subscriptionPlan || 'N/A'}*`),
      actions({ text: 'View Subscription', url: vars.subscriptionUrl || '#' }),
      context('CGK Commerce - Subscriptions', vars.timestamp || ''),
    ],
    fallbackText: `New subscription: ${vars.subscriptionPlan || 'N/A'}`,
  }),

  'commerce.subscription.cancelled': (vars) => ({
    blocks: [
      header('Subscription Cancelled', ':no_entry_sign:'),
      section(`*${vars.customerEmail || 'Unknown'}* cancelled *${vars.subscriptionPlan || 'N/A'}*`),
      actions({ text: 'View Details', url: vars.subscriptionUrl || '#' }),
      context('CGK Commerce - Subscriptions', vars.timestamp || ''),
    ],
    fallbackText: `Subscription cancelled: ${vars.subscriptionPlan || 'N/A'}`,
  }),

  'commerce.subscription.failed': (vars) => ({
    blocks: [
      header('Subscription Payment Failed', ':warning:'),
      section(`Payment failed for *${vars.customerEmail || 'Unknown'}*'s subscription`),
      fields(
        `*Plan:* ${vars.subscriptionPlan || 'N/A'}`,
        `*Error:* ${vars.errorMessage || 'Payment declined'}`,
      ),
      actions({ text: 'View Subscription', url: vars.subscriptionUrl || '#' }),
      context('CGK Commerce - Subscriptions', vars.timestamp || ''),
    ],
    fallbackText: `Subscription payment failed for ${vars.customerEmail || 'Unknown'}`,
  }),

  'commerce.subscription.churn_alert': (vars) => ({
    blocks: [
      header('High Churn Risk Detected', ':chart_with_downwards_trend:'),
      section(`*${vars.customerEmail || 'Unknown'}* shows high churn risk`),
      actions({ text: 'View Customer', url: vars.subscriptionUrl || '#' }),
      context('CGK Commerce - Churn Prevention', vars.timestamp || ''),
    ],
    fallbackText: `Churn risk alert: ${vars.customerEmail || 'Unknown'}`,
  }),

  // ==========================================================================
  // Review Templates
  // ==========================================================================

  'reviews.new': (vars) => ({
    blocks: [
      header('New Review', ':star:'),
      section(`*${vars.productName || 'Product'}* - ${'⭐'.repeat(vars.reviewRating || 0)}`),
      section(`> ${vars.reviewText || 'No text provided'}`),
      actions({ text: 'View Review', url: vars.reviewUrl || '#' }),
      context('CGK Reviews', vars.timestamp || ''),
    ],
    fallbackText: `New ${vars.reviewRating || 0}-star review for ${vars.productName || 'product'}`,
  }),

  'reviews.negative': (vars) => ({
    blocks: [
      header('Negative Review Alert', ':warning:'),
      section(`*${vars.productName || 'Product'}* received a low rating: ${'⭐'.repeat(vars.reviewRating || 0)}`),
      section(`> ${vars.reviewText || 'No text provided'}`),
      actions(
        { text: 'View Review', url: vars.reviewUrl || '#' },
        { text: 'Respond', url: vars.reviewUrl || '#' },
      ),
      context('CGK Reviews - Attention Needed', vars.timestamp || ''),
    ],
    fallbackText: `Negative review (${vars.reviewRating || 0} stars) for ${vars.productName || 'product'}`,
  }),

  'reviews.response_needed': (vars) => ({
    blocks: [
      header('Review Needs Response', ':speech_balloon:'),
      section(`A review for *${vars.productName || 'Product'}* requires attention`),
      section(`> ${vars.reviewText || 'No text provided'}`),
      actions({ text: 'Respond Now', url: vars.reviewUrl || '#' }),
      context('CGK Reviews', vars.timestamp || ''),
    ],
    fallbackText: `Review needs response: ${vars.productName || 'product'}`,
  }),

  'reviews.verified': (vars) => ({
    blocks: [
      header('Verified Purchase Review', ':white_check_mark:'),
      section(`*${vars.productName || 'Product'}* - ${'⭐'.repeat(vars.reviewRating || 0)} (Verified)`),
      section(`> ${vars.reviewText || 'No text provided'}`),
      actions({ text: 'View Review', url: vars.reviewUrl || '#' }),
      context('CGK Reviews', vars.timestamp || ''),
    ],
    fallbackText: `Verified review for ${vars.productName || 'product'}`,
  }),

  // ==========================================================================
  // Treasury Templates
  // ==========================================================================

  'treasury.topup.initiated': (vars) => ({
    blocks: [
      header('Top-Up Initiated', ':bank:'),
      section(`Balance top-up of *${vars.topupAmount || 'N/A'}* has been initiated`),
      fields(
        `*Status:* Processing`,
        `*Expected:* Within 1-2 business days`,
      ),
      context('CGK Treasury', vars.timestamp || ''),
    ],
    fallbackText: `Top-up initiated: ${vars.topupAmount || 'N/A'}`,
  }),

  'treasury.topup.succeeded': (vars) => ({
    blocks: [
      header('Top-Up Completed', ':white_check_mark:'),
      section(`*${vars.topupAmount || 'N/A'}* has been added to your treasury balance`),
      fields(
        `*New Balance:* ${vars.balance || 'N/A'}`,
        `*Status:* Complete`,
      ),
      actions({ text: 'View Treasury', url: vars.topupUrl || '#' }),
      context('CGK Treasury', vars.timestamp || ''),
    ],
    fallbackText: `Top-up completed: ${vars.topupAmount || 'N/A'}`,
  }),

  'treasury.topup.failed': (vars) => ({
    blocks: [
      header('Top-Up Failed', ':x:'),
      section(`Top-up of *${vars.topupAmount || 'N/A'}* has failed`),
      section(`Reason: ${vars.errorMessage || 'Unknown error'}`),
      actions({ text: 'Try Again', url: vars.topupUrl || '#' }),
      context('CGK Treasury - Action Required', vars.timestamp || ''),
    ],
    fallbackText: `Top-up failed: ${vars.topupAmount || 'N/A'}`,
  }),

  'treasury.payout.pending': (vars) => ({
    blocks: [
      header('Payout Awaiting Approval', ':hourglass_flowing_sand:'),
      section(`Payout of *${vars.payoutAmount || 'N/A'}* to *${vars.payoutRecipient || 'Unknown'}* needs approval`),
      actions(
        { text: 'Approve', url: vars.payoutUrl || '#' },
        { text: 'View Details', url: vars.payoutUrl || '#' },
      ),
      context('CGK Treasury', vars.timestamp || ''),
    ],
    fallbackText: `Payout pending approval: ${vars.payoutAmount || 'N/A'}`,
  }),

  'treasury.payout.completed': (vars) => ({
    blocks: [
      header('Payout Sent', ':white_check_mark:'),
      section(`*${vars.payoutAmount || 'N/A'}* has been sent to *${vars.payoutRecipient || 'Unknown'}*`),
      context('CGK Treasury', vars.timestamp || ''),
    ],
    fallbackText: `Payout completed: ${vars.payoutAmount || 'N/A'} to ${vars.payoutRecipient || 'Unknown'}`,
  }),

  'treasury.payout.failed': (vars) => ({
    blocks: [
      header('Payout Failed', ':x:'),
      section(`Payout of *${vars.payoutAmount || 'N/A'}* to *${vars.payoutRecipient || 'Unknown'}* has failed`),
      section(`Reason: ${vars.errorMessage || 'Unknown error'}`),
      actions({ text: 'View Details', url: vars.payoutUrl || '#' }),
      context('CGK Treasury - Action Required', vars.timestamp || ''),
    ],
    fallbackText: `Payout failed: ${vars.payoutAmount || 'N/A'}`,
  }),

  'treasury.balance.low': (vars) => ({
    blocks: [
      header('Low Balance Alert', ':warning:'),
      section(`Treasury balance is below threshold!`),
      fields(
        `*Current Balance:* ${vars.balance || 'N/A'}`,
        `*Threshold:* ${vars.balanceThreshold || 'N/A'}`,
      ),
      actions({ text: 'Top Up Now', url: vars.topupUrl || '#' }),
      context('CGK Treasury - Urgent', vars.timestamp || ''),
    ],
    fallbackText: `Low balance alert: ${vars.balance || 'N/A'}`,
  }),

  // ==========================================================================
  // System Templates
  // ==========================================================================

  'system.alert': (vars) => ({
    blocks: [
      header('System Alert', ':bell:'),
      section(`*${vars.alertTitle || 'Alert'}*`),
      section(vars.alertMessage || 'No additional details'),
      context('CGK System', vars.timestamp || ''),
    ],
    fallbackText: `System alert: ${vars.alertTitle || 'Alert'}`,
  }),

  'system.error.critical': (vars) => ({
    blocks: [
      header('Critical Error', ':rotating_light:'),
      section(`*${vars.alertTitle || 'Error'}*`),
      section(`\`\`\`${vars.errorMessage || 'No error message'}\`\`\``),
      context('CGK System - Critical', vars.timestamp || ''),
    ],
    fallbackText: `Critical error: ${vars.alertTitle || 'Error'}`,
  }),

  'system.security': (vars) => ({
    blocks: [
      header('Security Event', ':lock:'),
      section(`*${vars.alertTitle || 'Security Event'}*`),
      section(vars.alertMessage || 'No additional details'),
      context('CGK Security', vars.timestamp || ''),
    ],
    fallbackText: `Security event: ${vars.alertTitle || 'Event'}`,
  }),

  'system.api.error': (vars) => ({
    blocks: [
      header('API Error', ':warning:'),
      section(`*${vars.alertTitle || 'API Error'}*`),
      section(`\`\`\`${vars.errorMessage || 'No error details'}\`\`\``),
      context('CGK System', vars.timestamp || ''),
    ],
    fallbackText: `API error: ${vars.alertTitle || 'Error'}`,
  }),

  'system.deployment': (vars) => ({
    blocks: [
      header('Deployment', ':rocket:'),
      section(`*${vars.alertTitle || 'Deployment Update'}*`),
      section(vars.alertMessage || 'Deployment completed'),
      context('CGK DevOps', vars.timestamp || ''),
    ],
    fallbackText: `Deployment: ${vars.alertTitle || 'Update'}`,
  }),

  // ==========================================================================
  // Analytics Templates
  // ==========================================================================

  'analytics.ai_task': (vars) => ({
    blocks: [
      header('AI Task Detected', ':robot_face:'),
      section(`AI has detected an action that may need attention`),
      section(vars.taskDescription || 'Review analytics dashboard for details'),
      context('CGK Analytics AI', vars.timestamp || ''),
    ],
    fallbackText: `AI detected task: ${vars.taskDescription || 'Action needed'}`,
  }),

  'analytics.daily_digest': (vars) => ({
    blocks: [
      header('Daily Performance Report', ':chart_with_upwards_trend:'),
      section('Your daily analytics summary is ready'),
      actions({ text: 'View Report', url: '#' }),
      context('CGK Analytics', vars.timestamp || ''),
    ],
    fallbackText: 'Daily performance report is ready',
  }),

  'analytics.task_reminder': (vars) => ({
    blocks: [
      header('Task Reminder', ':alarm_clock:'),
      section(vars.taskDescription || 'You have a pending task'),
      context('CGK Analytics', vars.timestamp || ''),
    ],
    fallbackText: `Reminder: ${vars.taskDescription || 'Pending task'}`,
  }),

  // ==========================================================================
  // Survey Templates
  // ==========================================================================

  'surveys.report': (vars) => ({
    blocks: [
      header('Survey Report', ':bar_chart:'),
      section('Your scheduled survey report is ready'),
      context('CGK Surveys', vars.timestamp || ''),
    ],
    fallbackText: 'Survey report is ready',
  }),

  'surveys.daily_summary': (vars) => ({
    blocks: [
      header('Daily Survey Summary', ':clipboard:'),
      section('Your daily survey summary is ready'),
      context('CGK Surveys', vars.timestamp || ''),
    ],
    fallbackText: 'Daily survey summary is ready',
  }),

  'surveys.weekly_report': (vars) => ({
    blocks: [
      header('Weekly Survey Report', ':calendar:'),
      section('Your weekly survey report is ready'),
      context('CGK Surveys', vars.timestamp || ''),
    ],
    fallbackText: 'Weekly survey report is ready',
  }),

  'surveys.new_channel': (vars) => ({
    blocks: [
      header('New Attribution Channel', ':new:'),
      section(`A new attribution channel has been detected in surveys`),
      context('CGK Surveys', vars.timestamp || ''),
    ],
    fallbackText: 'New attribution channel detected',
  }),

  'surveys.nps_alert': (vars) => ({
    blocks: [
      header('NPS Threshold Alert', ':chart_with_downwards_trend:'),
      section(`NPS score has crossed the configured threshold`),
      context('CGK Surveys - Alert', vars.timestamp || ''),
    ],
    fallbackText: 'NPS threshold alert',
  }),

  'surveys.utm_discrepancy': (vars) => ({
    blocks: [
      header('UTM Discrepancy Detected', ':mag:'),
      section(`Mismatch detected between UTM parameters and survey responses`),
      context('CGK Surveys', vars.timestamp || ''),
    ],
    fallbackText: 'UTM discrepancy detected',
  }),

  'surveys.sync_failure': (vars) => ({
    blocks: [
      header('Survey Sync Failed', ':x:'),
      section(`Survey synchronization has failed`),
      section(`Error: ${vars.errorMessage || 'Unknown error'}`),
      context('CGK Surveys - Critical', vars.timestamp || ''),
    ],
    fallbackText: 'Survey sync failed',
  }),

  // ==========================================================================
  // DAM Templates
  // ==========================================================================

  'dam.mention': (vars) => ({
    blocks: [
      header('You were mentioned', ':mega:'),
      section(`*${vars.mentionedUser || 'Someone'}* mentioned you in a comment on *${vars.assetName || 'an asset'}*`),
      section(`> ${vars.commentText || 'No text'}`),
      actions({ text: 'View Comment', url: vars.assetUrl || '#' }),
      context('CGK Digital Assets', vars.timestamp || ''),
    ],
    fallbackText: `You were mentioned on ${vars.assetName || 'an asset'}`,
  }),

  'dam.reply': (vars) => ({
    blocks: [
      header('New Reply', ':speech_balloon:'),
      section(`Someone replied to your comment on *${vars.assetName || 'an asset'}*`),
      section(`> ${vars.commentText || 'No text'}`),
      actions({ text: 'View Reply', url: vars.assetUrl || '#' }),
      context('CGK Digital Assets', vars.timestamp || ''),
    ],
    fallbackText: `New reply on ${vars.assetName || 'an asset'}`,
  }),

  'dam.review_requested': (vars) => ({
    blocks: [
      header('Asset Review Requested', ':eyes:'),
      section(`Review requested for *${vars.assetName || 'an asset'}*`),
      actions({ text: 'Review Asset', url: vars.assetUrl || '#' }),
      context('CGK Digital Assets', vars.timestamp || ''),
    ],
    fallbackText: `Review requested: ${vars.assetName || 'asset'}`,
  }),

  'dam.review_approved': (vars) => ({
    blocks: [
      header('Asset Approved', ':white_check_mark:'),
      section(`*${vars.assetName || 'Asset'}* has been approved`),
      actions({ text: 'View Asset', url: vars.assetUrl || '#' }),
      context('CGK Digital Assets', vars.timestamp || ''),
    ],
    fallbackText: `Asset approved: ${vars.assetName || 'asset'}`,
  }),

  'dam.review_rejected': (vars) => ({
    blocks: [
      header('Asset Rejected', ':x:'),
      section(`*${vars.assetName || 'Asset'}* has been rejected`),
      section(`Reason: ${vars.errorMessage || 'No reason provided'}`),
      actions({ text: 'View Asset', url: vars.assetUrl || '#' }),
      context('CGK Digital Assets', vars.timestamp || ''),
    ],
    fallbackText: `Asset rejected: ${vars.assetName || 'asset'}`,
  }),
}

/**
 * Get a template builder for a notification type
 */
export function getTemplate(type: NotificationType): TemplateBuilder {
  return templates[type]
}

/**
 * Build a message from a template
 */
export function buildMessage(
  type: NotificationType,
  variables: TemplateVariables,
): { blocks: SlackBlock[]; fallbackText: string } {
  const builder = getTemplate(type)
  return builder(variables)
}

/**
 * Get sample data for a notification type (for testing)
 */
export function getSampleData(type: NotificationType): TemplateVariables {
  const now = new Date().toISOString()

  const base: TemplateVariables = {
    timestamp: now,
    tenantName: 'Sample Brand',
  }

  const samples: Partial<Record<NotificationType, TemplateVariables>> = {
    'creator.application.new': {
      ...base,
      creatorName: 'John Doe',
      creatorEmail: 'john@example.com',
      applicationUrl: 'https://admin.example.com/creators/123',
    },
    'commerce.order.new': {
      ...base,
      orderNumber: '1001',
      orderAmount: '$149.99',
      customerEmail: 'customer@example.com',
      orderUrl: 'https://admin.example.com/orders/1001',
    },
    'commerce.order.high_value': {
      ...base,
      orderNumber: '1002',
      orderAmount: '$2,499.99',
      customerEmail: 'vip@example.com',
      orderUrl: 'https://admin.example.com/orders/1002',
    },
    'treasury.balance.low': {
      ...base,
      balance: '$500.00',
      balanceThreshold: '$1,000.00',
      topupUrl: 'https://admin.example.com/treasury/top-up',
    },
    'reviews.negative': {
      ...base,
      productName: 'Premium Widget',
      reviewRating: 2,
      reviewText: 'Not as expected. Quality could be better.',
      reviewUrl: 'https://admin.example.com/reviews/456',
    },
  }

  return samples[type] || base
}
