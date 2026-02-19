/**
 * @cgk-platform/mcp - MCP (Model Context Protocol) server utilities
 *
 * Provides Streamable HTTP transport for MCP servers with:
 * - Per-request authentication
 * - Tenant isolation
 * - Streaming responses for long-running tools
 * - Token usage logging
 *
 * @ai-pattern mcp-server
 * @ai-note Tools for building MCP servers for AI assistants
 */

// =============================================================================
// Handler - Main MCP request handler
// =============================================================================

export {
  MCPHandler,
  MCPProtocolError,
  createMCPHandlerFactory,
  type MCPServerInfo,
  type MCPHandlerConfig,
} from './handler'

// =============================================================================
// Session Management
// =============================================================================

export {
  createMCPSession,
  getSession,
  touchSession,
  incrementUsage,
  deleteSession,
  getTenantSessions,
  getTenantSessionCount,
  cleanupExpiredSessions,
  logTokenUsage,
  startUsageTracking,
  getTokenUsageLogs,
  getUsageStats,
  clearTokenUsageLogs,
  isValidProtocolVersion,
  negotiateProtocolVersion,
  startSessionCleanup,
  stopSessionCleanup,
  getSessionStoreSize,
} from './session'

// =============================================================================
// Streaming Utilities
// =============================================================================

export {
  STREAMING_TOOLS,
  requiresStreaming,
  createStreamingResponse,
  createStreamingToolHandler,
  progressChunk,
  partialChunk,
  textPartialChunk,
  completeChunk,
  textCompleteChunk,
  errorChunk,
  aggregateStreamingResult,
  batchProcess,
  type StreamingToolName,
  type StreamingChunkType,
  type ProgressChunk,
  type PartialChunk,
  type CompleteChunk,
  type ErrorChunk,
  type StreamingChunk,
  type StreamingResponseOptions,
  type StreamingContext,
  type BatchStreamingOptions,
} from './streaming'

// =============================================================================
// Server Factory (Legacy API)
// =============================================================================

export { createMCPServer, type MCPServer, type MCPServerConfig } from './server'

// =============================================================================
// Tool Definition
// =============================================================================

export {
  defineTool,
  textResult,
  errorResult,
  jsonResult,
  type ToolDefinition,
  type ToolHandler,
} from './tools'

// =============================================================================
// Resource Definition
// =============================================================================

export {
  defineResource,
  platformResources,
  exampleResources,
  type ResourceDefinition,
  type ResourceHandler,
  type ResourceContext,
} from './resources'

// =============================================================================
// Prompt Definition
// =============================================================================

export {
  definePrompt,
  type PromptDefinition,
  type PromptHandler,
  type PromptHandlerMessage,
} from './prompts'

// =============================================================================
// Context Helpers
// =============================================================================

export {
  createContext,
  getContext,
  requireContext,
  updateContext,
  clearContext,
  withContext,
  withContextSync,
  type MCPContext,
} from './context'

// =============================================================================
// Protocol Types
// =============================================================================

export type {
  // Protocol versions
  MCPProtocolVersion,
  // JSON-RPC 2.0 types
  JSONRPCID,
  JSONRPCRequest,
  JSONRPCNotification,
  JSONRPCResponse,
  JSONRPCError,
  // MCP message types
  MCPRequest,
  MCPNotification,
  MCPResponse,
  MCPMethod,
  // Initialize types
  MCPClientCapabilities,
  MCPServerCapabilities,
  InitializeParams,
  InitializeResult,
  // Tool types
  Tool,
  JSONSchema,
  ListToolsResult,
  CallToolParams,
  CallToolResult,
  ToolResult,
  ContentBlock,
  TextContent,
  ImageContent,
  ResourceContent,
  // Resource types
  Resource,
  EmbeddedResource,
  ListResourcesResult,
  ReadResourceParams,
  ReadResourceResult,
  ResourceContents,
  // Prompt types
  Prompt,
  PromptArgument,
  PromptRole,
  PromptMessage,
  ListPromptsResult,
  GetPromptParams,
  GetPromptResult,
  // Session types
  MCPSession,
  CreateSessionOptions,
  TokenUsageEntry,
} from './types'

// =============================================================================
// Protocol Constants
// =============================================================================

export {
  MIN_PROTOCOL_VERSION,
  CURRENT_PROTOCOL_VERSION,
  SUPPORTED_PROTOCOL_VERSIONS,
  JSONRPCErrorCodes,
} from './types'

// =============================================================================
// Rate Limiting
// =============================================================================

export {
  // Core rate limiter
  getRateLimiter,
  createRateLimiter,
  checkRateLimit,
  RateLimitError,
  // Response helpers
  addRateLimitHeaders,
  createRateLimitResponse,
  // Constants
  DEFAULT_RATE_LIMIT_CONFIG,
  DEFAULT_TOOL_COSTS,
  EXPENSIVE_TOOLS,
  // Types
  type RateLimitConfig,
  type ToolRateLimit,
  type RateLimitResult,
  type RateLimiter,
} from './rate-limit'

// =============================================================================
// Commerce Tools
// =============================================================================

export {
  commerceTools,
  // Order tools
  listOrdersTool,
  getOrderTool,
  searchOrdersTool,
  updateOrderStatusTool,
  cancelOrderTool,
  // Customer tools
  listCustomersTool,
  getCustomerTool,
  searchCustomersTool,
  getCustomerOrdersTool,
  // Product tools
  listProductsTool,
  getProductTool,
  updateProductTool,
  syncProductTool,
  // Inventory tools
  getInventoryTool,
  updateInventoryTool,
} from './tools/commerce'

// =============================================================================
// All Tools Registry
// =============================================================================

export {
  getAllTools,
  getToolsByCategory,
  getToolByName,
  getToolsForTenant,
  isToolEnabledForTenant,
  toolAnnotations,
  getToolAnnotations,
  toolCategories,
  type TenantToolConfig,
  type ToolAnnotations,
} from './tools/index'
