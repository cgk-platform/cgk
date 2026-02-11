/**
 * Workflow Engine Exports
 * PHASE-2H-WORKFLOWS
 */

// Core Engine
export { WorkflowEngine } from './engine'

// Condition Evaluator
export {
  computeDaysSince,
  computeDaysSinceLastUpdate,
  computeFields,
  computeHoursInStatus,
  computeIsOverdue,
  computeRemindersSent,
  evaluateConditions,
  getFieldValue,
} from './evaluator'

// Action Executor
export {
  escapeHtml,
  executeAction,
  executeActions,
  interpolateTemplate,
} from './actions'

// Rule CRUD
export {
  createWorkflowRule,
  deleteWorkflowRule,
  getScheduledActions,
  getWorkflowExecution,
  getWorkflowExecutions,
  getWorkflowRule,
  getWorkflowRules,
  updateWorkflowRule,
} from './rules'

// Built-in Rules
export {
  BUILT_IN_RULES,
  getBuiltInRuleTemplate,
  getBuiltInRulesForTenant,
} from './built-in-rules'

// Types
export type {
  Action,
  ActionConfig,
  ActionResult,
  ActionType,
  AssignToConfig,
  Condition,
  ConditionOperator,
  ConditionResult,
  CreateTaskConfig,
  CreateWorkflowRuleInput,
  EntityWorkflowState,
  EvaluationContext,
  EventTriggerConfig,
  EventTriggerParams,
  ExecutionContext,
  ExecutionResult,
  GenerateReportConfig,
  ManualTriggerConfig,
  ManualTriggerParams,
  ScheduleFollowupConfig,
  ScheduledAction,
  ScheduledActionStatus,
  ScheduledTriggerConfig,
  SendMessageActionConfig,
  SendNotificationActionConfig,
  SlackNotifyActionConfig,
  StatusChangeParams,
  StatusChangeTriggerConfig,
  SuggestActionConfig,
  TimeElapsedEntity,
  TimeElapsedTriggerConfig,
  TriggerConfig,
  TriggerType,
  UpdateFieldConfig,
  UpdateStatusConfig,
  UpdateWorkflowRuleInput,
  WebhookActionConfig,
  WorkflowExecution,
  WorkflowRule,
} from './types'
