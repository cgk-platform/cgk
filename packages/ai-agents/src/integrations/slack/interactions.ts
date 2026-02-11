/**
 * Slack interaction handler for AI Agent integrations
 * Handles button clicks, modal submissions, shortcuts, etc.
 */

import { getSlackConfig } from '../db/queries.js'
import { SlackClient } from './client.js'
import { logAction } from '../../actions/logger.js'
import { approve, reject, getRequest } from '../../actions/approval.js'
import type {
  SlackInteractionPayload,
  SlackInteractionResponse,
  SlackBlockAction,
  SlackView,
  TenantSlackConfig,
} from '../types.js'

export interface InteractionContext {
  tenantId: string
  config: TenantSlackConfig
  client: SlackClient
}

/**
 * Handle Slack interaction payloads
 */
export async function handleSlackInteraction(
  tenantId: string,
  payload: SlackInteractionPayload
): Promise<SlackInteractionResponse> {
  // Get tenant's Slack config
  const config = await getSlackConfig()
  if (!config?.enabled) {
    return { ok: false }
  }

  const client = SlackClient.fromTenantConfig(config)
  if (!client) {
    return { ok: false }
  }

  const ctx: InteractionContext = { tenantId, config, client }

  switch (payload.type) {
    case 'block_actions':
      return handleBlockActions(ctx, payload)

    case 'view_submission':
      return handleViewSubmission(ctx, payload)

    case 'shortcut':
      return handleShortcut(ctx, payload)

    case 'message_action':
      return handleMessageAction(ctx, payload)

    default:
      return { ok: true }
  }
}

/**
 * Handle block action interactions (button clicks, select menus, etc.)
 */
async function handleBlockActions(
  ctx: InteractionContext,
  payload: SlackInteractionPayload
): Promise<SlackInteractionResponse> {
  const actions = payload.actions || []

  for (const action of actions) {
    const result = await handleSingleAction(ctx, action, payload)
    if (result) return result
  }

  return { ok: true }
}

/**
 * Handle a single block action
 */
async function handleSingleAction(
  ctx: InteractionContext,
  action: SlackBlockAction,
  payload: SlackInteractionPayload
): Promise<SlackInteractionResponse | null> {
  const actionId = action.action_id
  const value = action.value || action.selected_option?.value

  switch (actionId) {
    // Approval actions
    case 'approve_action':
      return handleApprovalAction(ctx, value!, 'approved', payload)

    case 'reject_action':
      return handleApprovalAction(ctx, value!, 'rejected', payload)

    case 'request_more_info':
      return {
        response_action: 'push',
        view: buildMoreInfoModal(value!),
      }

    // Feedback actions
    case 'feedback_positive':
      await recordFeedback(ctx, value!, 'positive', payload.user.id)
      return null

    case 'feedback_negative':
      return {
        response_action: 'push',
        view: buildFeedbackModal(value!),
      }

    // Start conversation action (from app home)
    case 'start_conversation':
      // Open DM with user
      return null

    default:
      console.log(`[slack] Unknown action: ${actionId}`)
      return null
  }
}

/**
 * Handle approval/rejection of agent actions
 */
async function handleApprovalAction(
  ctx: InteractionContext,
  requestId: string,
  status: 'approved' | 'rejected',
  payload: SlackInteractionPayload
): Promise<SlackInteractionResponse | null> {
  const request = await getRequest(requestId)
  if (!request) {
    console.error(`[slack] Approval request not found: ${requestId}`)
    return null
  }

  // Process approval/rejection
  if (status === 'approved') {
    await approve(requestId, 'Approved via Slack')
  } else {
    await reject(requestId, 'Rejected via Slack')
  }

  // Update the original message to show the result
  if (payload.channel && payload.message) {
    const statusEmoji = status === 'approved' ? ':white_check_mark:' : ':x:'
    const statusText = status === 'approved' ? 'Approved' : 'Rejected'

    await ctx.client.updateMessage(
      payload.channel.id,
      payload.message.ts,
      `${statusEmoji} *${statusText}* by <@${payload.user.id}>`,
      [
        {
          type: 'section',
          text: {
            type: 'mrkdwn',
            text: `${statusEmoji} *${statusText}* by <@${payload.user.id}>\n\n_Original request:_ ${request.actionType}`,
          },
        },
      ]
    )
  }

  // Log action
  await logAction({
    agentId: request.agentId,
    actionType: `approval_${status}`,
    actionCategory: 'system',
    actionDescription: `Action ${status} via Slack by user`,
    inputData: { requestId, userId: payload.user.id },
    outputData: { status },
  })

  return null
}

/**
 * Record feedback on agent response
 */
async function recordFeedback(
  ctx: InteractionContext,
  messageId: string,
  feedback: 'positive' | 'negative',
  slackUserId: string
): Promise<void> {
  // Log the feedback
  await logAction({
    agentId: ctx.config.defaultAgentId || '',
    actionType: 'feedback_received',
    actionCategory: 'system',
    actionDescription: `Received ${feedback} feedback`,
    inputData: { messageId, feedback, slackUserId },
    visibleInDashboard: true,
  })

  console.log(`[slack] Feedback recorded: ${feedback} for message ${messageId}`)
}

/**
 * Handle view submission (modal form submissions)
 */
async function handleViewSubmission(
  ctx: InteractionContext,
  payload: SlackInteractionPayload
): Promise<SlackInteractionResponse> {
  const view = payload.view
  if (!view) return { ok: true }

  const callbackId = view.callback_id

  switch (callbackId) {
    case 'more_info_modal':
      return handleMoreInfoSubmission(ctx, view, payload)

    case 'feedback_modal':
      return handleFeedbackSubmission(ctx, view, payload)

    default:
      console.log(`[slack] Unknown view callback: ${callbackId}`)
      return { ok: true }
  }
}

/**
 * Handle more info request submission
 */
async function handleMoreInfoSubmission(
  ctx: InteractionContext,
  view: SlackView,
  payload: SlackInteractionPayload
): Promise<SlackInteractionResponse> {
  const values = view.state?.values || {}
  const moreInfoText = values['more_info_input']?.['more_info_text']?.value

  const metadata = view.private_metadata ? JSON.parse(view.private_metadata) : {}
  const requestId = metadata.requestId

  if (requestId && moreInfoText) {
    // Update the approval request with more info
    await logAction({
      agentId: ctx.config.defaultAgentId || '',
      actionType: 'more_info_requested',
      actionCategory: 'system',
      actionDescription: 'Additional information requested for approval',
      inputData: { requestId, moreInfo: moreInfoText, userId: payload.user.id },
    })
  }

  return { response_action: 'clear' }
}

/**
 * Handle feedback form submission
 */
async function handleFeedbackSubmission(
  ctx: InteractionContext,
  view: SlackView,
  payload: SlackInteractionPayload
): Promise<SlackInteractionResponse> {
  const values = view.state?.values || {}
  const feedbackText = values['feedback_input']?.['feedback_text']?.value
  const feedbackCategory = values['feedback_category']?.['category_select']?.selected_option?.value

  const metadata = view.private_metadata ? JSON.parse(view.private_metadata) : {}
  const messageId = metadata.messageId

  // Record detailed feedback
  await logAction({
    agentId: ctx.config.defaultAgentId || '',
    actionType: 'feedback_detailed',
    actionCategory: 'system',
    actionDescription: 'Detailed feedback received',
    inputData: {
      messageId,
      feedback: 'negative',
      category: feedbackCategory,
      details: feedbackText,
      userId: payload.user.id,
    },
    visibleInDashboard: true,
  })

  return { response_action: 'clear' }
}

/**
 * Handle global shortcuts
 */
async function handleShortcut(
  _ctx: InteractionContext,
  payload: SlackInteractionPayload
): Promise<SlackInteractionResponse> {
  // Handle any global shortcuts here
  console.log(`[slack] Shortcut triggered: ${payload.type}`)
  return { ok: true }
}

/**
 * Handle message shortcuts (actions on specific messages)
 */
async function handleMessageAction(
  _ctx: InteractionContext,
  _payload: SlackInteractionPayload
): Promise<SlackInteractionResponse> {
  // Handle message-level shortcuts here
  console.log(`[slack] Message action triggered`)
  return { ok: true }
}

/**
 * Build modal for requesting more info
 */
function buildMoreInfoModal(requestId: string): SlackView {
  return {
    id: '',
    type: 'modal',
    callback_id: 'more_info_modal',
    private_metadata: JSON.stringify({ requestId }),
    title: { type: 'plain_text', text: 'Request More Info' },
    submit: { type: 'plain_text', text: 'Submit' },
    close: { type: 'plain_text', text: 'Cancel' },
    blocks: [
      {
        type: 'input',
        block_id: 'more_info_input',
        element: {
          type: 'plain_text_input',
          action_id: 'more_info_text',
          multiline: true,
          placeholder: {
            type: 'plain_text',
            text: 'What additional information do you need?',
          },
        },
        label: { type: 'plain_text', text: 'Your question' },
      },
    ],
  } as SlackView
}

/**
 * Build modal for detailed feedback
 */
function buildFeedbackModal(messageId: string): SlackView {
  return {
    id: '',
    type: 'modal',
    callback_id: 'feedback_modal',
    private_metadata: JSON.stringify({ messageId }),
    title: { type: 'plain_text', text: 'Provide Feedback' },
    submit: { type: 'plain_text', text: 'Submit' },
    close: { type: 'plain_text', text: 'Cancel' },
    blocks: [
      {
        type: 'input',
        block_id: 'feedback_category',
        element: {
          type: 'static_select',
          action_id: 'category_select',
          placeholder: { type: 'plain_text', text: 'Select a category' },
          options: [
            {
              text: { type: 'plain_text', text: 'Incorrect information' },
              value: 'incorrect',
            },
            {
              text: { type: 'plain_text', text: 'Not helpful' },
              value: 'not_helpful',
            },
            {
              text: { type: 'plain_text', text: 'Too slow' },
              value: 'too_slow',
            },
            {
              text: { type: 'plain_text', text: 'Other' },
              value: 'other',
            },
          ],
        },
        label: { type: 'plain_text', text: 'Category' },
      },
      {
        type: 'input',
        block_id: 'feedback_input',
        optional: true,
        element: {
          type: 'plain_text_input',
          action_id: 'feedback_text',
          multiline: true,
          placeholder: {
            type: 'plain_text',
            text: 'Tell us more about what went wrong...',
          },
        },
        label: { type: 'plain_text', text: 'Details (optional)' },
      },
    ],
  } as SlackView
}

/**
 * Send an approval request to Slack
 */
export async function sendApprovalRequestToSlack(
  _tenantId: string,
  request: {
    id: string
    agentId: string
    agentName: string
    actionType: string
    actionPayload: Record<string, unknown>
    reason?: string
  },
  channelId: string
): Promise<{ ts: string; channelId: string } | null> {
  const config = await getSlackConfig()
  if (!config?.enabled) return null

  const client = SlackClient.fromTenantConfig(config)
  if (!client) return null

  const message = await client.postMessage({
    channel: channelId,
    text: `Approval needed: ${request.actionType}`,
    blocks: [
      {
        type: 'header',
        text: {
          type: 'plain_text',
          text: ':raising_hand: Approval Needed',
          emoji: true,
        },
      },
      {
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: `*${request.agentName}* wants to perform: *${request.actionType}*`,
        },
      },
      ...(request.reason
        ? [
            {
              type: 'section',
              text: {
                type: 'mrkdwn',
                text: `_Reason:_ ${request.reason}`,
              },
            },
          ]
        : []),
      {
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: `\`\`\`${JSON.stringify(request.actionPayload, null, 2)}\`\`\``,
        },
      },
      { type: 'divider' },
      {
        type: 'actions',
        elements: [
          {
            type: 'button',
            action_id: 'approve_action',
            text: { type: 'plain_text', text: 'Approve', emoji: true },
            value: request.id,
            style: 'primary',
          },
          {
            type: 'button',
            action_id: 'reject_action',
            text: { type: 'plain_text', text: 'Reject', emoji: true },
            value: request.id,
            style: 'danger',
          },
          {
            type: 'button',
            action_id: 'request_more_info',
            text: { type: 'plain_text', text: 'More Info', emoji: true },
            value: request.id,
          },
        ],
      },
    ],
  })

  return { ts: message.ts, channelId: message.channel }
}
