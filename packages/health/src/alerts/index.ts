/**
 * Alert system exports
 */

export {
  getDefaultChannels,
  getEnabledChannels,
  hasAlertChannels,
  validateChannel,
  type SlackConfig,
  type EmailConfig,
  type PagerDutyConfig,
  type WebhookConfig,
} from './channels.js'

export {
  createAlert,
  dispatchAlert,
  createAndDispatchAlert,
} from './dispatch.js'

export {
  getOpenAlerts,
  getAlert,
  acknowledgeAlert,
  resolveAlert,
  getAlertCounts,
  getRecentAlerts,
} from './manage.js'
