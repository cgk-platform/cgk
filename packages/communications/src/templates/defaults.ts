/**
 * Default Email Templates
 *
 * System-provided default templates for all notification types.
 * These are used as fallbacks when tenants haven't customized their templates.
 *
 * CRITICAL: No hardcoded brand names or URLs - use variables only.
 *
 * @ai-pattern email-templates
 */

import type { DefaultTemplate, TemplateCategory } from './types.js'

/**
 * All default templates
 */
export const DEFAULT_TEMPLATES: DefaultTemplate[] = [
  // =====================
  // REVIEW TEMPLATES
  // =====================
  {
    notificationType: 'review_request',
    templateKey: 'review_request',
    category: 'transactional' as TemplateCategory,
    name: 'Review Request',
    description: 'Sent to customers asking them to review their purchase',
    subject: 'How are you enjoying your {{productTitle}}?',
    bodyHtml: `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
  <h2 style="color: #111; margin-bottom: 20px;">Hi {{customerName}},</h2>
  <p>We hope you're loving your {{productTitle}}!</p>
  <p>We'd really appreciate if you could take a moment to share your experience. Your feedback helps us improve and helps other customers make informed decisions.</p>
  <p style="margin: 30px 0;">
    <a href="{{reviewUrl}}" style="display: inline-block; background-color: #000; color: #fff; padding: 12px 30px; text-decoration: none; border-radius: 6px; font-weight: 500;">Leave a Review</a>
  </p>
  <p>Thanks for being a {{brandName}} customer!</p>
  <p style="margin-top: 40px; padding-top: 20px; border-top: 1px solid #eee; font-size: 12px; color: #666;">
    {{brandName}} | <a href="{{websiteUrl}}" style="color: #666;">{{websiteUrl}}</a>
  </p>
</body>
</html>`,
  },

  {
    notificationType: 'review_request',
    templateKey: 'review_request_incentive',
    category: 'transactional' as TemplateCategory,
    name: 'Review Request (with Incentive)',
    description: 'Review request with a discount incentive',
    subject: 'Share your thoughts & get {{incentiveText}}',
    bodyHtml: `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
  <h2 style="color: #111; margin-bottom: 20px;">Hi {{customerName}},</h2>
  <p>We hope you're loving your {{productTitle}}!</p>
  <p>As a thank you for your feedback, we'll send you <strong>{{incentiveText}}</strong> when you leave a review.</p>
  <p style="margin: 30px 0;">
    <a href="{{reviewUrl}}" style="display: inline-block; background-color: #000; color: #fff; padding: 12px 30px; text-decoration: none; border-radius: 6px; font-weight: 500;">Leave a Review</a>
  </p>
  <p>After submitting your review, use code <strong style="background: #f5f5f5; padding: 4px 8px; border-radius: 4px;">{{incentiveCode}}</strong> at checkout!</p>
  <p>Thanks for being a {{brandName}} customer!</p>
  <p style="margin-top: 40px; padding-top: 20px; border-top: 1px solid #eee; font-size: 12px; color: #666;">
    {{brandName}} | <a href="{{websiteUrl}}" style="color: #666;">{{websiteUrl}}</a>
  </p>
</body>
</html>`,
  },

  {
    notificationType: 'review_reminder',
    templateKey: 'review_reminder',
    category: 'transactional' as TemplateCategory,
    name: 'Review Reminder',
    description: 'Reminder to leave a review',
    subject: 'A gentle reminder to share your thoughts on {{productTitle}}',
    bodyHtml: `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
  <h2 style="color: #111; margin-bottom: 20px;">Hi {{customerName}},</h2>
  <p>We noticed you haven't had a chance to review your {{productTitle}} yet.</p>
  <p>Your feedback would mean a lot to us and helps other customers make informed decisions.</p>
  <p style="margin: 30px 0;">
    <a href="{{reviewUrl}}" style="display: inline-block; background-color: #000; color: #fff; padding: 12px 30px; text-decoration: none; border-radius: 6px; font-weight: 500;">Leave a Review</a>
  </p>
  <p>Thank you for your time!</p>
  <p style="margin-top: 40px; padding-top: 20px; border-top: 1px solid #eee; font-size: 12px; color: #666;">
    {{brandName}} | <a href="{{websiteUrl}}" style="color: #666;">{{websiteUrl}}</a>
  </p>
</body>
</html>`,
  },

  {
    notificationType: 'review_thank_you',
    templateKey: 'review_thank_you',
    category: 'transactional' as TemplateCategory,
    name: 'Review Thank You',
    description: 'Thank you message after a review is submitted',
    subject: 'Thank you for your review!',
    bodyHtml: `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
  <h2 style="color: #111; margin-bottom: 20px;">Thank you, {{customerName}}!</h2>
  <p>We really appreciate you taking the time to review your {{productTitle}}.</p>
  <p>Your feedback helps us improve and helps other customers find the right products.</p>
  <p>Thanks for being part of the {{brandName}} community!</p>
  <p style="margin-top: 40px; padding-top: 20px; border-top: 1px solid #eee; font-size: 12px; color: #666;">
    {{brandName}} | <a href="{{websiteUrl}}" style="color: #666;">{{websiteUrl}}</a>
  </p>
</body>
</html>`,
  },

  // =====================
  // CREATOR TEMPLATES
  // =====================
  {
    notificationType: 'creator_application_approved',
    templateKey: 'creator_application_approved',
    category: 'transactional' as TemplateCategory,
    name: 'Creator Application Approved',
    description: 'Sent when a creator application is approved',
    subject: 'Welcome to the {{brandName}} Creator Program!',
    bodyHtml: `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
  <h2 style="color: #111; margin-bottom: 20px;">Congratulations, {{creatorName}}!</h2>
  <p>Your application to the {{brandName}} Creator Program has been <strong>approved</strong>.</p>
  <p>Here's what happens next:</p>
  <ol style="margin: 20px 0; padding-left: 20px;">
    <li style="margin-bottom: 10px;">Complete your profile setup</li>
    <li style="margin-bottom: 10px;">Set up your payout method</li>
    <li style="margin-bottom: 10px;">Browse available projects</li>
  </ol>
  <p style="margin: 30px 0;">
    <a href="{{dashboardUrl}}" style="display: inline-block; background-color: #000; color: #fff; padding: 12px 30px; text-decoration: none; border-radius: 6px; font-weight: 500;">Go to Your Dashboard</a>
  </p>
  <p>We're excited to have you on board!</p>
  <p style="margin-top: 40px; padding-top: 20px; border-top: 1px solid #eee; font-size: 12px; color: #666;">
    {{brandName}} Creator Program | <a href="{{websiteUrl}}" style="color: #666;">{{websiteUrl}}</a>
  </p>
</body>
</html>`,
  },

  {
    notificationType: 'creator_application_rejected',
    templateKey: 'creator_application_rejected',
    category: 'transactional' as TemplateCategory,
    name: 'Creator Application Rejected',
    description: 'Sent when a creator application is rejected',
    subject: 'Update on your {{brandName}} Creator Application',
    bodyHtml: `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
  <h2 style="color: #111; margin-bottom: 20px;">Hi {{creatorName}},</h2>
  <p>Thank you for your interest in the {{brandName}} Creator Program.</p>
  <p>After careful review, we're unable to accept your application at this time.</p>
  <p>We encourage you to continue growing your content and reapply in the future. We'd love to work with you once you're ready!</p>
  <p>If you have any questions, please don't hesitate to reach out to us at {{supportEmail}}.</p>
  <p style="margin-top: 40px; padding-top: 20px; border-top: 1px solid #eee; font-size: 12px; color: #666;">
    {{brandName}} | <a href="{{websiteUrl}}" style="color: #666;">{{websiteUrl}}</a>
  </p>
</body>
</html>`,
  },

  {
    notificationType: 'creator_onboarding_reminder',
    templateKey: 'creator_onboarding_reminder',
    category: 'transactional' as TemplateCategory,
    name: 'Creator Onboarding Reminder',
    description: 'Reminder to complete onboarding',
    subject: 'Complete your {{brandName}} Creator setup',
    bodyHtml: `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
  <h2 style="color: #111; margin-bottom: 20px;">Hi {{creatorName}},</h2>
  <p>We noticed you haven't finished setting up your {{brandName}} Creator account yet.</p>
  <p>Complete your setup to start receiving project opportunities!</p>
  <p style="margin: 30px 0;">
    <a href="{{onboardingUrl}}" style="display: inline-block; background-color: #000; color: #fff; padding: 12px 30px; text-decoration: none; border-radius: 6px; font-weight: 500;">Continue Setup</a>
  </p>
  <p>Need help? Reply to this email and we'll assist you.</p>
  <p style="margin-top: 40px; padding-top: 20px; border-top: 1px solid #eee; font-size: 12px; color: #666;">
    {{brandName}} Creator Program | <a href="{{websiteUrl}}" style="color: #666;">{{websiteUrl}}</a>
  </p>
</body>
</html>`,
  },

  {
    notificationType: 'creator_project_assigned',
    templateKey: 'creator_project_assigned',
    category: 'transactional' as TemplateCategory,
    name: 'Creator Project Assigned',
    description: 'Notification when a project is assigned',
    subject: 'New project: {{projectTitle}}',
    bodyHtml: `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
  <h2 style="color: #111; margin-bottom: 20px;">Hi {{creatorName}},</h2>
  <p>Great news! You've been assigned a new project:</p>
  <div style="background: #f5f5f5; padding: 20px; border-radius: 8px; margin: 20px 0;">
    <p style="margin: 0 0 10px 0;"><strong>Project:</strong> {{projectTitle}}</p>
    <p style="margin: 0 0 10px 0;"><strong>Deadline:</strong> {{deadline}}</p>
    <p style="margin: 0;"><strong>Compensation:</strong> {{compensation}}</p>
  </div>
  <p style="margin: 30px 0;">
    <a href="{{projectUrl}}" style="display: inline-block; background-color: #000; color: #fff; padding: 12px 30px; text-decoration: none; border-radius: 6px; font-weight: 500;">View Project Details</a>
  </p>
  <p>We're excited to see what you create!</p>
  <p style="margin-top: 40px; padding-top: 20px; border-top: 1px solid #eee; font-size: 12px; color: #666;">
    {{brandName}} Creator Program | <a href="{{websiteUrl}}" style="color: #666;">{{websiteUrl}}</a>
  </p>
</body>
</html>`,
  },

  {
    notificationType: 'creator_revision_requested',
    templateKey: 'creator_revision_requested',
    category: 'transactional' as TemplateCategory,
    name: 'Creator Revision Requested',
    description: 'Sent when a revision is requested on a project',
    subject: 'Revision requested: {{projectTitle}}',
    bodyHtml: `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
  <h2 style="color: #111; margin-bottom: 20px;">Hi {{creatorName}},</h2>
  <p>We've reviewed your submission for <strong>{{projectTitle}}</strong> and have some feedback.</p>
  <div style="background: #fff3cd; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #ffc107;">
    <p style="margin: 0;"><strong>Revision Notes:</strong></p>
    <p style="margin: 10px 0 0 0;">{{revisionNotes}}</p>
  </div>
  <p style="margin: 30px 0;">
    <a href="{{projectUrl}}" style="display: inline-block; background-color: #000; color: #fff; padding: 12px 30px; text-decoration: none; border-radius: 6px; font-weight: 500;">View Project</a>
  </p>
  <p>Questions? Reply to this email.</p>
  <p style="margin-top: 40px; padding-top: 20px; border-top: 1px solid #eee; font-size: 12px; color: #666;">
    {{brandName}} Creator Program | <a href="{{websiteUrl}}" style="color: #666;">{{websiteUrl}}</a>
  </p>
</body>
</html>`,
  },

  {
    notificationType: 'creator_payment_available',
    templateKey: 'creator_payment_available',
    category: 'transactional' as TemplateCategory,
    name: 'Creator Payment Available',
    description: 'Notification when a payment is ready',
    subject: '{{amount}} is ready for payout!',
    bodyHtml: `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
  <h2 style="color: #111; margin-bottom: 20px;">Hi {{creatorName}},</h2>
  <p>Great news! You have <strong>{{amount}}</strong> available for payout.</p>
  <p style="margin: 30px 0;">
    <a href="{{payoutUrl}}" style="display: inline-block; background-color: #000; color: #fff; padding: 12px 30px; text-decoration: none; border-radius: 6px; font-weight: 500;">Request Payout</a>
  </p>
  <p>Thank you for your amazing work!</p>
  <p style="margin-top: 40px; padding-top: 20px; border-top: 1px solid #eee; font-size: 12px; color: #666;">
    {{brandName}} Creator Program | <a href="{{websiteUrl}}" style="color: #666;">{{websiteUrl}}</a>
  </p>
</body>
</html>`,
  },

  {
    notificationType: 'creator_monthly_summary',
    templateKey: 'creator_monthly_summary',
    category: 'transactional' as TemplateCategory,
    name: 'Creator Monthly Summary',
    description: 'Monthly summary of creator activity',
    subject: 'Your {{month}} Summary',
    bodyHtml: `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
  <h2 style="color: #111; margin-bottom: 20px;">Hi {{creatorName}},</h2>
  <p>Here's your {{month}} summary:</p>
  <div style="background: #f5f5f5; padding: 20px; border-radius: 8px; margin: 20px 0;">
    <p style="margin: 0 0 10px 0;"><strong>Total Earnings:</strong> {{totalEarnings}}</p>
    <p style="margin: 0;"><strong>Projects Completed:</strong> {{projectsCompleted}}</p>
  </div>
  <p style="margin: 30px 0;">
    <a href="{{dashboardUrl}}" style="display: inline-block; background-color: #000; color: #fff; padding: 12px 30px; text-decoration: none; border-radius: 6px; font-weight: 500;">View Dashboard</a>
  </p>
  <p>Keep up the great work!</p>
  <p style="margin-top: 40px; padding-top: 20px; border-top: 1px solid #eee; font-size: 12px; color: #666;">
    {{brandName}} Creator Program | <a href="{{websiteUrl}}" style="color: #666;">{{websiteUrl}}</a>
  </p>
</body>
</html>`,
  },

  // =====================
  // E-SIGN TEMPLATES
  // =====================
  {
    notificationType: 'esign_signing_request',
    templateKey: 'esign_signing_request',
    category: 'transactional' as TemplateCategory,
    name: 'E-Sign Signing Request',
    description: 'Request to sign a document',
    subject: '{{requestorName}} has requested your signature',
    bodyHtml: `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
  <h2 style="color: #111; margin-bottom: 20px;">Hi {{signerName}},</h2>
  <p>{{requestorName}} has sent you a document to sign:</p>
  <div style="background: #f5f5f5; padding: 20px; border-radius: 8px; margin: 20px 0;">
    <p style="margin: 0 0 10px 0;"><strong>Document:</strong> {{documentTitle}}</p>
    <p style="margin: 0;"><strong>Expires:</strong> {{expiresAt}}</p>
  </div>
  <p style="margin: 30px 0;">
    <a href="{{signingUrl}}" style="display: inline-block; background-color: #000; color: #fff; padding: 12px 30px; text-decoration: none; border-radius: 6px; font-weight: 500;">Review & Sign</a>
  </p>
  <p style="margin-top: 40px; padding-top: 20px; border-top: 1px solid #eee; font-size: 12px; color: #666;">
    {{brandName}} | <a href="{{websiteUrl}}" style="color: #666;">{{websiteUrl}}</a>
  </p>
</body>
</html>`,
  },

  {
    notificationType: 'esign_reminder',
    templateKey: 'esign_reminder',
    category: 'transactional' as TemplateCategory,
    name: 'E-Sign Reminder',
    description: 'Reminder to sign a document',
    subject: 'Reminder: Please sign {{documentTitle}}',
    bodyHtml: `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
  <h2 style="color: #111; margin-bottom: 20px;">Hi {{signerName}},</h2>
  <p>This is a friendly reminder that you have a document waiting for your signature:</p>
  <div style="background: #fff3cd; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #ffc107;">
    <p style="margin: 0 0 10px 0;"><strong>Document:</strong> {{documentTitle}}</p>
    <p style="margin: 0;"><strong>Expires:</strong> {{expiresAt}}</p>
  </div>
  <p style="margin: 30px 0;">
    <a href="{{signingUrl}}" style="display: inline-block; background-color: #000; color: #fff; padding: 12px 30px; text-decoration: none; border-radius: 6px; font-weight: 500;">Review & Sign</a>
  </p>
  <p style="margin-top: 40px; padding-top: 20px; border-top: 1px solid #eee; font-size: 12px; color: #666;">
    {{brandName}} | <a href="{{websiteUrl}}" style="color: #666;">{{websiteUrl}}</a>
  </p>
</body>
</html>`,
  },

  {
    notificationType: 'esign_completed',
    templateKey: 'esign_completed',
    category: 'transactional' as TemplateCategory,
    name: 'E-Sign Completed',
    description: 'Notification when document is signed by all parties',
    subject: '{{documentTitle}} has been signed',
    bodyHtml: `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
  <h2 style="color: #111; margin-bottom: 20px;">Hi {{recipientName}},</h2>
  <p>Great news! <strong>{{documentTitle}}</strong> has been signed by all parties.</p>
  <p>You can download a copy for your records:</p>
  <p style="margin: 30px 0;">
    <a href="{{downloadUrl}}" style="display: inline-block; background-color: #000; color: #fff; padding: 12px 30px; text-decoration: none; border-radius: 6px; font-weight: 500;">Download Document</a>
  </p>
  <p style="margin-top: 40px; padding-top: 20px; border-top: 1px solid #eee; font-size: 12px; color: #666;">
    {{brandName}} | <a href="{{websiteUrl}}" style="color: #666;">{{websiteUrl}}</a>
  </p>
</body>
</html>`,
  },

  {
    notificationType: 'esign_void_notification',
    templateKey: 'esign_void_notification',
    category: 'transactional' as TemplateCategory,
    name: 'E-Sign Void Notification',
    description: 'Notification when a document is voided',
    subject: '{{documentTitle}} has been voided',
    bodyHtml: `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
  <h2 style="color: #111; margin-bottom: 20px;">Hi {{recipientName}},</h2>
  <p>The document <strong>{{documentTitle}}</strong> has been voided and is no longer valid.</p>
  <p>If you have any questions, please contact us at {{supportEmail}}.</p>
  <p style="margin-top: 40px; padding-top: 20px; border-top: 1px solid #eee; font-size: 12px; color: #666;">
    {{brandName}} | <a href="{{websiteUrl}}" style="color: #666;">{{websiteUrl}}</a>
  </p>
</body>
</html>`,
  },

  // =====================
  // SUBSCRIPTION TEMPLATES
  // =====================
  {
    notificationType: 'subscription_welcome',
    templateKey: 'subscription_welcome',
    category: 'transactional' as TemplateCategory,
    name: 'Subscription Welcome',
    description: 'Welcome email for new subscribers',
    subject: 'Welcome to {{subscriptionName}}!',
    bodyHtml: `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
  <h2 style="color: #111; margin-bottom: 20px;">Welcome, {{customerName}}!</h2>
  <p>Thank you for subscribing to <strong>{{subscriptionName}}</strong>.</p>
  <p>You now have access to all the benefits included in your subscription.</p>
  <p style="margin: 30px 0;">
    <a href="{{manageUrl}}" style="display: inline-block; background-color: #000; color: #fff; padding: 12px 30px; text-decoration: none; border-radius: 6px; font-weight: 500;">Manage Subscription</a>
  </p>
  <p>Thanks for being a {{brandName}} customer!</p>
  <p style="margin-top: 40px; padding-top: 20px; border-top: 1px solid #eee; font-size: 12px; color: #666;">
    {{brandName}} | <a href="{{websiteUrl}}" style="color: #666;">{{websiteUrl}}</a>
  </p>
</body>
</html>`,
  },

  {
    notificationType: 'subscription_payment_failed',
    templateKey: 'subscription_payment_failed',
    category: 'transactional' as TemplateCategory,
    name: 'Subscription Payment Failed',
    description: 'Notification when payment fails',
    subject: 'Action needed: Payment failed for {{subscriptionName}}',
    bodyHtml: `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
  <h2 style="color: #111; margin-bottom: 20px;">Hi {{customerName}},</h2>
  <p>We were unable to process your payment of <strong>{{amount}}</strong> for <strong>{{subscriptionName}}</strong>.</p>
  <p>Please update your payment method to avoid any interruption to your subscription.</p>
  <p style="margin: 30px 0;">
    <a href="{{updatePaymentUrl}}" style="display: inline-block; background-color: #dc3545; color: #fff; padding: 12px 30px; text-decoration: none; border-radius: 6px; font-weight: 500;">Update Payment Method</a>
  </p>
  <p>We'll retry the payment on {{retryDate}}.</p>
  <p>Questions? Contact us at {{supportEmail}}.</p>
  <p style="margin-top: 40px; padding-top: 20px; border-top: 1px solid #eee; font-size: 12px; color: #666;">
    {{brandName}} | <a href="{{websiteUrl}}" style="color: #666;">{{websiteUrl}}</a>
  </p>
</body>
</html>`,
  },

  // =====================
  // TREASURY TEMPLATES
  // =====================
  {
    notificationType: 'treasury_approval_request',
    templateKey: 'treasury_approval_request',
    category: 'transactional' as TemplateCategory,
    name: 'Treasury Approval Request',
    description: 'Request for treasury approval',
    subject: '[Action Required] Approve {{requestId}}: {{amount}}',
    bodyHtml: `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
  <h2 style="color: #111; margin-bottom: 20px;">Approval Request {{requestId}}</h2>
  <div style="background: #f5f5f5; padding: 20px; border-radius: 8px; margin: 20px 0;">
    <p style="margin: 0 0 10px 0;"><strong>Amount:</strong> {{amount}}</p>
    <p style="margin: 0 0 10px 0;"><strong>Description:</strong> {{description}}</p>
    <p style="margin: 0;"><strong>Requested by:</strong> {{requestorName}}</p>
  </div>
  <p>To approve this request, simply reply to this email with "Approved" or click the link below:</p>
  <p style="margin: 30px 0;">
    <a href="{{approvalUrl}}" style="display: inline-block; background-color: #000; color: #fff; padding: 12px 30px; text-decoration: none; border-radius: 6px; font-weight: 500;">View in Dashboard</a>
  </p>
  <p>To reject, reply with "Rejected" and your reason.</p>
  <p style="margin-top: 40px; padding-top: 20px; border-top: 1px solid #eee; font-size: 12px; color: #666;">
    {{brandName}} Treasury | <a href="{{websiteUrl}}" style="color: #666;">{{websiteUrl}}</a>
  </p>
</body>
</html>`,
  },

  // =====================
  // TEAM TEMPLATES
  // =====================
  {
    notificationType: 'team_invitation',
    templateKey: 'team_invitation',
    category: 'transactional' as TemplateCategory,
    name: 'Team Invitation',
    description: 'Invitation to join the team',
    subject: '{{inviterName}} invited you to {{brandName}}',
    bodyHtml: `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
  <h2 style="color: #111; margin-bottom: 20px;">You're Invited!</h2>
  <p><strong>{{inviterName}}</strong> has invited you to join {{brandName}} as a <strong>{{roleName}}</strong>.</p>
  <p>This invitation expires on {{expiresAt}}.</p>
  <p style="margin: 30px 0;">
    <a href="{{acceptUrl}}" style="display: inline-block; background-color: #000; color: #fff; padding: 12px 30px; text-decoration: none; border-radius: 6px; font-weight: 500;">Accept Invitation</a>
  </p>
  <p style="margin-top: 40px; padding-top: 20px; border-top: 1px solid #eee; font-size: 12px; color: #666;">
    {{brandName}} | <a href="{{websiteUrl}}" style="color: #666;">{{websiteUrl}}</a>
  </p>
</body>
</html>`,
  },

  {
    notificationType: 'team_invitation_reminder',
    templateKey: 'team_invitation_reminder',
    category: 'transactional' as TemplateCategory,
    name: 'Team Invitation Reminder',
    description: 'Reminder about pending invitation',
    subject: 'Reminder: {{inviterName}} invited you to {{brandName}}',
    bodyHtml: `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
  <h2 style="color: #111; margin-bottom: 20px;">Your Invitation is Waiting</h2>
  <p>This is a friendly reminder that <strong>{{inviterName}}</strong> invited you to join {{brandName}} as a <strong>{{roleName}}</strong>.</p>
  <p>This invitation expires on {{expiresAt}}.</p>
  <p style="margin: 30px 0;">
    <a href="{{acceptUrl}}" style="display: inline-block; background-color: #000; color: #fff; padding: 12px 30px; text-decoration: none; border-radius: 6px; font-weight: 500;">Accept Invitation</a>
  </p>
  <p style="margin-top: 40px; padding-top: 20px; border-top: 1px solid #eee; font-size: 12px; color: #666;">
    {{brandName}} | <a href="{{websiteUrl}}" style="color: #666;">{{websiteUrl}}</a>
  </p>
</body>
</html>`,
  },

  // =====================
  // AUTH TEMPLATES
  // =====================
  {
    notificationType: 'password_reset',
    templateKey: 'password_reset',
    category: 'transactional' as TemplateCategory,
    name: 'Password Reset',
    description: 'Password reset link',
    subject: 'Reset your {{brandName}} password',
    bodyHtml: `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
  <h2 style="color: #111; margin-bottom: 20px;">Reset Your Password</h2>
  <p>We received a request to reset your password. Click the button below to create a new password:</p>
  <p style="margin: 30px 0;">
    <a href="{{resetUrl}}" style="display: inline-block; background-color: #000; color: #fff; padding: 12px 30px; text-decoration: none; border-radius: 6px; font-weight: 500;">Reset Password</a>
  </p>
  <p>This link expires in {{expiresIn}}.</p>
  <p>If you didn't request this, you can safely ignore this email.</p>
  <p style="margin-top: 40px; padding-top: 20px; border-top: 1px solid #eee; font-size: 12px; color: #666;">
    {{brandName}} | <a href="{{websiteUrl}}" style="color: #666;">{{websiteUrl}}</a>
  </p>
</body>
</html>`,
  },

  {
    notificationType: 'magic_link',
    templateKey: 'magic_link',
    category: 'transactional' as TemplateCategory,
    name: 'Magic Link',
    description: 'Passwordless login link',
    subject: 'Sign in to {{brandName}}',
    bodyHtml: `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
  <h2 style="color: #111; margin-bottom: 20px;">Sign In to {{brandName}}</h2>
  <p>Click the button below to sign in:</p>
  <p style="margin: 30px 0;">
    <a href="{{loginUrl}}" style="display: inline-block; background-color: #000; color: #fff; padding: 12px 30px; text-decoration: none; border-radius: 6px; font-weight: 500;">Sign In</a>
  </p>
  <p>This link expires in {{expiresIn}}.</p>
  <p>If you didn't request this, you can safely ignore this email.</p>
  <p style="margin-top: 40px; padding-top: 20px; border-top: 1px solid #eee; font-size: 12px; color: #666;">
    {{brandName}} | <a href="{{websiteUrl}}" style="color: #666;">{{websiteUrl}}</a>
  </p>
</body>
</html>`,
  },
]

/**
 * Get default template by notification type and key
 */
export function getDefaultTemplate(
  notificationType: string,
  templateKey?: string
): DefaultTemplate | undefined {
  const key = templateKey || notificationType
  return DEFAULT_TEMPLATES.find(
    (t) => t.notificationType === notificationType && t.templateKey === key
  )
}

/**
 * Get all default templates for a notification type
 */
export function getDefaultTemplatesForType(
  notificationType: string
): DefaultTemplate[] {
  return DEFAULT_TEMPLATES.filter((t) => t.notificationType === notificationType)
}

/**
 * Get all default templates
 */
export function getAllDefaultTemplates(): DefaultTemplate[] {
  return DEFAULT_TEMPLATES
}
