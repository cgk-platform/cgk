/**
 * Type definitions for AI Memory & RAG System
 */

// Memory type classification
export type MemoryType =
  | 'team_member'
  | 'creator'
  | 'project_pattern'
  | 'policy'
  | 'preference'
  | 'procedure'
  | 'fact'

// Memory source tracking
export type MemorySource =
  | 'observed'
  | 'told'
  | 'inferred'
  | 'corrected'
  | 'trained'
  | 'imported'

// Training session types
export type TrainingType =
  | 'correction'
  | 'new_knowledge'
  | 'personality'
  | 'procedure'
  | 'policy'
  | 'feedback'
  | 'example'

// Failure classification
export type FailureType =
  | 'wrong_answer'
  | 'misunderstood'
  | 'wrong_action'
  | 'over_escalated'
  | 'under_escalated'
  | 'poor_timing'
  | 'tone_mismatch'

// Feedback types
export type FeedbackType = 'positive' | 'negative' | 'correction'

/**
 * Agent memory record
 */
export interface AgentMemory {
  id: string
  agentId: string
  memoryType: MemoryType
  subjectType: string | null
  subjectId: string | null
  title: string
  content: string
  confidence: number
  importance: number
  embedding: number[] | null
  timesUsed: number
  timesReinforced: number
  timesContradicted: number
  lastUsedAt: Date | null
  source: MemorySource
  sourceContext: string | null
  sourceConversationId: string | null
  isActive: boolean
  supersededBy: string | null
  expiresAt: Date | null
  createdAt: Date
  updatedAt: Date
}

/**
 * Create memory input
 */
export interface CreateMemoryInput {
  agentId: string
  memoryType: MemoryType
  title: string
  content: string
  subjectType?: string
  subjectId?: string
  source: MemorySource
  sourceContext?: string
  sourceConversationId?: string
  importance?: number
  confidence?: number
  expiresAt?: Date
}

/**
 * Update memory input
 */
export interface UpdateMemoryInput {
  title?: string
  content?: string
  confidence?: number
  importance?: number
  isActive?: boolean
  supersededBy?: string
  expiresAt?: Date | null
}

/**
 * Memory search result with similarity score
 */
export interface MemorySearchResult extends AgentMemory {
  similarity: number
}

/**
 * Memory search filters
 */
export interface MemorySearchFilters {
  agentId: string
  query: string
  limit?: number
  memoryTypes?: MemoryType[]
  subjectType?: string
  subjectId?: string
  minConfidence?: number
  minSimilarity?: number
  includeInactive?: boolean
}

/**
 * Memory list filters
 */
export interface MemoryListFilters {
  agentId?: string
  memoryType?: MemoryType
  subjectType?: string
  subjectId?: string
  minConfidence?: number
  isActive?: boolean
  search?: string
  limit?: number
  offset?: number
}

/**
 * Training session record
 */
export interface TrainingSession {
  id: string
  agentId: string
  trainingType: TrainingType
  title: string
  instruction: string
  context: string | null
  examples: TrainingExample[]
  memoriesCreated: string[]
  acknowledged: boolean
  agentResponse: string | null
  trainerUserId: string | null
  trainerName: string | null
  createdAt: Date
}

/**
 * Training example pair
 */
export interface TrainingExample {
  input: string
  output: string
}

/**
 * Create training session input
 */
export interface CreateTrainingSessionInput {
  agentId: string
  trainingType: TrainingType
  title: string
  instruction: string
  context?: string
  examples?: TrainingExample[]
  trainerUserId?: string
  trainerName?: string
}

/**
 * Failure learning record
 */
export interface FailureLearning {
  id: string
  agentId: string
  failureType: FailureType
  conversationId: string | null
  triggerMessage: string | null
  agentResponse: string | null
  whatWentWrong: string
  correctApproach: string
  patternToAvoid: string | null
  confidence: number
  source: string
  correctedBy: string | null
  acknowledged: boolean
  appliedToBehavior: boolean
  createdAt: Date
}

/**
 * Create failure learning input
 */
export interface CreateFailureLearningInput {
  agentId: string
  failureType: FailureType
  conversationId?: string
  triggerMessage?: string
  agentResponse?: string
  whatWentWrong: string
  correctApproach: string
  patternToAvoid?: string
  source: string
  correctedBy?: string
  confidence?: number
}

/**
 * Agent feedback record
 */
export interface AgentFeedback {
  id: string
  agentId: string
  messageId: string | null
  conversationId: string | null
  feedbackType: FeedbackType
  rating: number | null
  originalResponse: string | null
  reason: string | null
  correction: string | null
  userId: string
  userName: string | null
  processed: boolean
  learningCreated: string | null
  createdAt: Date
}

/**
 * Create feedback input
 */
export interface CreateFeedbackInput {
  agentId: string
  feedbackType: FeedbackType
  userId: string
  messageId?: string
  conversationId?: string
  rating?: number
  originalResponse?: string
  reason?: string
  correction?: string
  userName?: string
}

/**
 * Agent pattern record
 */
export interface AgentPattern {
  id: string
  agentId: string
  queryPattern: string
  responsePattern: string
  toolsUsed: string[]
  timesUsed: number
  successRate: number
  avgFeedbackScore: number | null
  feedbackId: string | null
  category: string | null
  createdAt: Date
  updatedAt: Date
}

/**
 * Create pattern input
 */
export interface CreatePatternInput {
  agentId: string
  queryPattern: string
  responsePattern: string
  toolsUsed?: string[]
  feedbackId?: string
  category?: string
}

/**
 * RAG context options
 */
export interface RAGContextOptions {
  agentId: string
  query: string
  conversationContext?: string
  maxTokens?: number
  memoryTypes?: MemoryType[]
  minConfidence?: number
  includeFailures?: boolean
  includePatterns?: boolean
}

/**
 * RAG context result
 */
export interface RAGContextResult {
  context: string
  memoriesUsed: string[]
  tokenEstimate: number
}

/**
 * Confidence calculation factors
 */
export interface ConfidenceFactors {
  sourceWeight: number
  reinforcementBonus: number
  contradictionPenalty: number
  ageDecay: number
  finalConfidence: number
}

/**
 * Memory consolidation result
 */
export interface ConsolidationResult {
  merged: number
  deactivated: number
  kept: number
}

/**
 * Source confidence weights
 */
export const SOURCE_WEIGHTS: Record<MemorySource, number> = {
  trained: 1.0,
  told: 0.9,
  corrected: 0.85,
  observed: 0.7,
  imported: 0.6,
  inferred: 0.5,
}

/**
 * Training type to memory type mapping
 */
export const TRAINING_TO_MEMORY_TYPE: Record<TrainingType, MemoryType> = {
  correction: 'policy',
  new_knowledge: 'fact',
  personality: 'preference',
  procedure: 'procedure',
  policy: 'policy',
  feedback: 'preference',
  example: 'project_pattern',
}
