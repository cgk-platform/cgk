/**
 * Template Variables Registry
 *
 * Defines all available variables for each notification type.
 * These are used for variable insertion UI and validation.
 *
 * @ai-pattern email-templates
 */

import type { TemplateVariable } from './types.js'

/**
 * Common variables available in all templates
 */
export const COMMON_VARIABLES: TemplateVariable[] = [
  {
    key: 'brandName',
    description: 'Your brand name',
    example: 'RAWDOG',
    type: 'string',
    required: true,
  },
  {
    key: 'supportEmail',
    description: 'Support email address',
    example: 'support@rawdog.com',
    type: 'string',
  },
  {
    key: 'websiteUrl',
    description: 'Your website URL',
    example: 'https://rawdog.com',
    type: 'url',
  },
  {
    key: 'unsubscribeUrl',
    description: 'Unsubscribe link',
    example: 'https://rawdog.com/unsubscribe?token=...',
    type: 'url',
  },
  {
    key: 'currentYear',
    description: 'Current year',
    example: '2026',
    type: 'string',
  },
]

/**
 * Variables per notification type
 */
export const NOTIFICATION_VARIABLES: Record<string, TemplateVariable[]> = {
  // Review request variables
  review_request: [
    {
      key: 'customerName',
      description: 'Customer first name',
      example: 'John',
      type: 'string',
      required: true,
    },
    {
      key: 'customerEmail',
      description: 'Customer email',
      example: 'john@example.com',
      type: 'string',
    },
    {
      key: 'orderNumber',
      description: 'Order number',
      example: 'ORD-12345',
      type: 'string',
      required: true,
    },
    {
      key: 'productTitle',
      description: 'Product purchased',
      example: 'Premium Moisturizer',
      type: 'string',
    },
    {
      key: 'reviewUrl',
      description: 'Link to leave review',
      example: 'https://rawdog.com/review?token=...',
      type: 'url',
      required: true,
    },
    {
      key: 'incentiveText',
      description: 'Incentive offer text',
      example: '10% off your next order',
      type: 'string',
    },
    {
      key: 'incentiveCode',
      description: 'Discount code',
      example: 'THANKS10',
      type: 'string',
    },
  ],

  // Review reminder (same as review_request)
  review_reminder: [
    {
      key: 'customerName',
      description: 'Customer first name',
      example: 'John',
      type: 'string',
      required: true,
    },
    {
      key: 'orderNumber',
      description: 'Order number',
      example: 'ORD-12345',
      type: 'string',
      required: true,
    },
    {
      key: 'productTitle',
      description: 'Product purchased',
      example: 'Premium Moisturizer',
      type: 'string',
    },
    {
      key: 'reviewUrl',
      description: 'Link to leave review',
      example: 'https://rawdog.com/review?token=...',
      type: 'url',
      required: true,
    },
  ],

  // Review thank you
  review_thank_you: [
    {
      key: 'customerName',
      description: 'Customer first name',
      example: 'John',
      type: 'string',
      required: true,
    },
    {
      key: 'productTitle',
      description: 'Product reviewed',
      example: 'Premium Moisturizer',
      type: 'string',
    },
    {
      key: 'discountCode',
      description: 'Thank you discount code',
      example: 'THANKYOU15',
      type: 'string',
    },
  ],

  // Creator application approved
  creator_application_approved: [
    {
      key: 'creatorName',
      description: 'Creator name',
      example: 'Jane Smith',
      type: 'string',
      required: true,
    },
    {
      key: 'dashboardUrl',
      description: 'Creator dashboard link',
      example: 'https://creators.rawdog.com/dashboard',
      type: 'url',
      required: true,
    },
    {
      key: 'onboardingUrl',
      description: 'Onboarding link',
      example: 'https://creators.rawdog.com/onboarding',
      type: 'url',
    },
  ],

  // Creator application rejected
  creator_application_rejected: [
    {
      key: 'creatorName',
      description: 'Creator name',
      example: 'Jane Smith',
      type: 'string',
      required: true,
    },
    {
      key: 'rejectionReason',
      description: 'Reason for rejection',
      example: 'Content quality requirements not met',
      type: 'string',
    },
    {
      key: 'reapplyUrl',
      description: 'Link to reapply',
      example: 'https://rawdog.com/creators/apply',
      type: 'url',
    },
  ],

  // Creator onboarding reminder
  creator_onboarding_reminder: [
    {
      key: 'creatorName',
      description: 'Creator name',
      example: 'Jane Smith',
      type: 'string',
      required: true,
    },
    {
      key: 'onboardingUrl',
      description: 'Onboarding link',
      example: 'https://creators.rawdog.com/onboarding',
      type: 'url',
      required: true,
    },
    {
      key: 'stepsRemaining',
      description: 'Steps remaining text',
      example: '2 steps remaining',
      type: 'string',
    },
  ],

  // Creator project assigned
  creator_project_assigned: [
    {
      key: 'creatorName',
      description: 'Creator name',
      example: 'Jane Smith',
      type: 'string',
      required: true,
    },
    {
      key: 'projectTitle',
      description: 'Project title',
      example: 'Summer Campaign Video',
      type: 'string',
      required: true,
    },
    {
      key: 'projectUrl',
      description: 'Link to project',
      example: 'https://creators.rawdog.com/projects/123',
      type: 'url',
      required: true,
    },
    {
      key: 'deadline',
      description: 'Project deadline',
      example: 'March 15, 2026',
      type: 'date',
    },
    {
      key: 'compensation',
      description: 'Project compensation',
      example: '$500',
      type: 'currency',
    },
  ],

  // Creator revision requested
  creator_revision_requested: [
    {
      key: 'creatorName',
      description: 'Creator name',
      example: 'Jane Smith',
      type: 'string',
      required: true,
    },
    {
      key: 'projectTitle',
      description: 'Project title',
      example: 'Summer Campaign Video',
      type: 'string',
      required: true,
    },
    {
      key: 'projectUrl',
      description: 'Link to project',
      example: 'https://creators.rawdog.com/projects/123',
      type: 'url',
      required: true,
    },
    {
      key: 'revisionNotes',
      description: 'Revision notes',
      example: 'Please adjust the lighting in the intro',
      type: 'string',
    },
  ],

  // Creator payment available
  creator_payment_available: [
    {
      key: 'creatorName',
      description: 'Creator name',
      example: 'Jane Smith',
      type: 'string',
      required: true,
    },
    {
      key: 'amount',
      description: 'Payment amount',
      example: '$150.00',
      type: 'currency',
      required: true,
    },
    {
      key: 'payoutUrl',
      description: 'Payout settings link',
      example: 'https://creators.rawdog.com/payouts',
      type: 'url',
      required: true,
    },
  ],

  // Creator monthly summary
  creator_monthly_summary: [
    {
      key: 'creatorName',
      description: 'Creator name',
      example: 'Jane Smith',
      type: 'string',
      required: true,
    },
    {
      key: 'month',
      description: 'Summary month',
      example: 'January 2026',
      type: 'string',
      required: true,
    },
    {
      key: 'totalEarnings',
      description: 'Total earnings',
      example: '$1,250.00',
      type: 'currency',
    },
    {
      key: 'projectsCompleted',
      description: 'Projects completed',
      example: '5',
      type: 'number',
    },
    {
      key: 'dashboardUrl',
      description: 'Dashboard link',
      example: 'https://creators.rawdog.com/dashboard',
      type: 'url',
      required: true,
    },
  ],

  // E-sign signing request
  esign_signing_request: [
    {
      key: 'signerName',
      description: 'Signer name',
      example: 'John Doe',
      type: 'string',
      required: true,
    },
    {
      key: 'documentTitle',
      description: 'Document name',
      example: 'Creator Agreement',
      type: 'string',
      required: true,
    },
    {
      key: 'signingUrl',
      description: 'Link to sign',
      example: 'https://sign.rawdog.com/doc/abc123',
      type: 'url',
      required: true,
    },
    {
      key: 'expiresAt',
      description: 'Expiration date',
      example: 'January 15, 2026',
      type: 'date',
    },
    {
      key: 'requestorName',
      description: 'Who requested',
      example: 'RAWDOG Team',
      type: 'string',
    },
  ],

  // E-sign reminder
  esign_reminder: [
    {
      key: 'signerName',
      description: 'Signer name',
      example: 'John Doe',
      type: 'string',
      required: true,
    },
    {
      key: 'documentTitle',
      description: 'Document name',
      example: 'Creator Agreement',
      type: 'string',
      required: true,
    },
    {
      key: 'signingUrl',
      description: 'Link to sign',
      example: 'https://sign.rawdog.com/doc/abc123',
      type: 'url',
      required: true,
    },
    {
      key: 'expiresAt',
      description: 'Expiration date',
      example: 'January 15, 2026',
      type: 'date',
    },
  ],

  // E-sign completed
  esign_completed: [
    {
      key: 'recipientName',
      description: 'Recipient name',
      example: 'John Doe',
      type: 'string',
      required: true,
    },
    {
      key: 'documentTitle',
      description: 'Document name',
      example: 'Creator Agreement',
      type: 'string',
      required: true,
    },
    {
      key: 'downloadUrl',
      description: 'Download link',
      example: 'https://sign.rawdog.com/download/abc123',
      type: 'url',
      required: true,
    },
  ],

  // E-sign void notification
  esign_void_notification: [
    {
      key: 'recipientName',
      description: 'Recipient name',
      example: 'John Doe',
      type: 'string',
      required: true,
    },
    {
      key: 'documentTitle',
      description: 'Document name',
      example: 'Creator Agreement',
      type: 'string',
      required: true,
    },
    {
      key: 'voidReason',
      description: 'Reason for voiding',
      example: 'Document superseded by new version',
      type: 'string',
    },
  ],

  // Subscription welcome
  subscription_welcome: [
    {
      key: 'customerName',
      description: 'Customer name',
      example: 'John',
      type: 'string',
      required: true,
    },
    {
      key: 'subscriptionName',
      description: 'Subscription name',
      example: 'Monthly Bundle',
      type: 'string',
      required: true,
    },
    {
      key: 'manageUrl',
      description: 'Manage subscription link',
      example: 'https://rawdog.com/account/subscriptions',
      type: 'url',
    },
  ],

  // Subscription renewal reminder
  subscription_renewal_reminder: [
    {
      key: 'customerName',
      description: 'Customer name',
      example: 'John',
      type: 'string',
      required: true,
    },
    {
      key: 'subscriptionName',
      description: 'Subscription name',
      example: 'Monthly Bundle',
      type: 'string',
      required: true,
    },
    {
      key: 'amount',
      description: 'Renewal amount',
      example: '$59.99',
      type: 'currency',
    },
    {
      key: 'renewalDate',
      description: 'Next renewal date',
      example: 'February 1, 2026',
      type: 'date',
    },
    {
      key: 'manageUrl',
      description: 'Manage subscription link',
      example: 'https://rawdog.com/account/subscriptions',
      type: 'url',
    },
  ],

  // Subscription payment failed
  subscription_payment_failed: [
    {
      key: 'customerName',
      description: 'Customer name',
      example: 'John',
      type: 'string',
      required: true,
    },
    {
      key: 'subscriptionName',
      description: 'Subscription name',
      example: 'Monthly Bundle',
      type: 'string',
      required: true,
    },
    {
      key: 'amount',
      description: 'Payment amount',
      example: '$59.99',
      type: 'currency',
    },
    {
      key: 'updatePaymentUrl',
      description: 'Update payment link',
      example: 'https://rawdog.com/account/payment',
      type: 'url',
      required: true,
    },
    {
      key: 'retryDate',
      description: 'Next retry date',
      example: 'January 10, 2026',
      type: 'date',
    },
  ],

  // Subscription cancelled
  subscription_cancelled: [
    {
      key: 'customerName',
      description: 'Customer name',
      example: 'John',
      type: 'string',
      required: true,
    },
    {
      key: 'subscriptionName',
      description: 'Subscription name',
      example: 'Monthly Bundle',
      type: 'string',
      required: true,
    },
    {
      key: 'endDate',
      description: 'Access end date',
      example: 'February 1, 2026',
      type: 'date',
    },
    {
      key: 'reactivateUrl',
      description: 'Reactivate link',
      example: 'https://rawdog.com/account/subscriptions/reactivate',
      type: 'url',
    },
  ],

  // Subscription reactivated
  subscription_reactivated: [
    {
      key: 'customerName',
      description: 'Customer name',
      example: 'John',
      type: 'string',
      required: true,
    },
    {
      key: 'subscriptionName',
      description: 'Subscription name',
      example: 'Monthly Bundle',
      type: 'string',
      required: true,
    },
    {
      key: 'nextBillingDate',
      description: 'Next billing date',
      example: 'March 1, 2026',
      type: 'date',
    },
  ],

  // Treasury approval request
  treasury_approval_request: [
    {
      key: 'approverName',
      description: 'Approver name',
      example: 'Finance Team',
      type: 'string',
      required: true,
    },
    {
      key: 'requestId',
      description: 'Request ID',
      example: '#SBA-202412-001',
      type: 'string',
      required: true,
    },
    {
      key: 'amount',
      description: 'Requested amount',
      example: '$5,000.00',
      type: 'currency',
      required: true,
    },
    {
      key: 'description',
      description: 'Request description',
      example: 'Q1 Marketing Budget',
      type: 'string',
    },
    {
      key: 'requestorName',
      description: 'Who requested',
      example: 'Marketing Team',
      type: 'string',
    },
    {
      key: 'approvalUrl',
      description: 'Approval dashboard link',
      example: 'https://admin.rawdog.com/treasury/requests/123',
      type: 'url',
      required: true,
    },
  ],

  // Treasury approved
  treasury_approved: [
    {
      key: 'requestorName',
      description: 'Requestor name',
      example: 'Marketing Team',
      type: 'string',
      required: true,
    },
    {
      key: 'requestId',
      description: 'Request ID',
      example: '#SBA-202412-001',
      type: 'string',
      required: true,
    },
    {
      key: 'amount',
      description: 'Approved amount',
      example: '$5,000.00',
      type: 'currency',
      required: true,
    },
    {
      key: 'approverName',
      description: 'Who approved',
      example: 'John Smith',
      type: 'string',
    },
  ],

  // Treasury rejected
  treasury_rejected: [
    {
      key: 'requestorName',
      description: 'Requestor name',
      example: 'Marketing Team',
      type: 'string',
      required: true,
    },
    {
      key: 'requestId',
      description: 'Request ID',
      example: '#SBA-202412-001',
      type: 'string',
      required: true,
    },
    {
      key: 'amount',
      description: 'Requested amount',
      example: '$5,000.00',
      type: 'currency',
    },
    {
      key: 'rejectionReason',
      description: 'Rejection reason',
      example: 'Budget exceeded for this quarter',
      type: 'string',
    },
  ],

  // Team invitation
  team_invitation: [
    {
      key: 'inviteeName',
      description: 'Invitee name',
      example: 'New User',
      type: 'string',
    },
    {
      key: 'inviterName',
      description: 'Who invited',
      example: 'Admin User',
      type: 'string',
      required: true,
    },
    {
      key: 'roleName',
      description: 'Assigned role',
      example: 'Content Manager',
      type: 'string',
      required: true,
    },
    {
      key: 'acceptUrl',
      description: 'Accept invitation link',
      example: 'https://admin.rawdog.com/join?token=...',
      type: 'url',
      required: true,
    },
    {
      key: 'expiresAt',
      description: 'Invitation expires',
      example: 'January 20, 2026',
      type: 'date',
    },
  ],

  // Team invitation reminder
  team_invitation_reminder: [
    {
      key: 'inviteeName',
      description: 'Invitee name',
      example: 'New User',
      type: 'string',
    },
    {
      key: 'inviterName',
      description: 'Who invited',
      example: 'Admin User',
      type: 'string',
      required: true,
    },
    {
      key: 'roleName',
      description: 'Assigned role',
      example: 'Content Manager',
      type: 'string',
      required: true,
    },
    {
      key: 'acceptUrl',
      description: 'Accept invitation link',
      example: 'https://admin.rawdog.com/join?token=...',
      type: 'url',
      required: true,
    },
    {
      key: 'expiresAt',
      description: 'Invitation expires',
      example: 'January 20, 2026',
      type: 'date',
    },
  ],

  // Password reset
  password_reset: [
    {
      key: 'userName',
      description: 'User name',
      example: 'John',
      type: 'string',
    },
    {
      key: 'resetUrl',
      description: 'Reset password link',
      example: 'https://admin.rawdog.com/reset-password?token=...',
      type: 'url',
      required: true,
    },
    {
      key: 'expiresIn',
      description: 'Link expires in',
      example: '1 hour',
      type: 'string',
    },
  ],

  // Magic link
  magic_link: [
    {
      key: 'userName',
      description: 'User name',
      example: 'John',
      type: 'string',
    },
    {
      key: 'loginUrl',
      description: 'Magic login link',
      example: 'https://admin.rawdog.com/auth/magic?token=...',
      type: 'url',
      required: true,
    },
    {
      key: 'expiresIn',
      description: 'Link expires in',
      example: '15 minutes',
      type: 'string',
    },
  ],
}

/**
 * Get all variables available for a notification type
 * Merges common variables with type-specific variables
 */
export function getVariablesForType(notificationType: string): TemplateVariable[] {
  const typeVars = NOTIFICATION_VARIABLES[notificationType] || []
  return [...COMMON_VARIABLES, ...typeVars]
}

/**
 * Get sample data for a notification type (using examples from variable definitions)
 */
export function getSampleDataForType(
  notificationType: string
): Record<string, string> {
  const variables = getVariablesForType(notificationType)
  const sampleData: Record<string, string> = {}

  for (const variable of variables) {
    sampleData[variable.key] = variable.example
  }

  return sampleData
}

/**
 * Validate that all required variables are present in the provided data
 */
export function validateRequiredVariables(
  notificationType: string,
  data: Record<string, unknown>
): { valid: boolean; missing: string[] } {
  const variables = getVariablesForType(notificationType)
  const missing: string[] = []

  for (const variable of variables) {
    if (variable.required && (data[variable.key] === undefined || data[variable.key] === '')) {
      missing.push(variable.key)
    }
  }

  return {
    valid: missing.length === 0,
    missing,
  }
}
