/**
 * MCP Protocol Types
 *
 * JSON-RPC 2.0 compliant types for the Model Context Protocol.
 * Supports protocol versions: 2024-11-05, 2025-03-26, 2025-06-18
 */

// =============================================================================
// Protocol Version Types
// =============================================================================

/**
 * Supported MCP protocol versions
 */
export type MCPProtocolVersion = '2024-11-05' | '2025-03-26' | '2025-06-18'

/**
 * Minimum protocol version for Streamable HTTP transport
 */
export const MIN_PROTOCOL_VERSION: MCPProtocolVersion = '2024-11-05'

/**
 * Current protocol version
 */
export const CURRENT_PROTOCOL_VERSION: MCPProtocolVersion = '2025-06-18'

/**
 * All supported protocol versions
 */
export const SUPPORTED_PROTOCOL_VERSIONS: MCPProtocolVersion[] = [
  '2024-11-05',
  '2025-03-26',
  '2025-06-18',
]

// =============================================================================
// JSON-RPC 2.0 Types
// =============================================================================

/**
 * JSON-RPC 2.0 request ID
 */
export type JSONRPCID = string | number

/**
 * JSON-RPC 2.0 request
 */
export interface JSONRPCRequest {
  jsonrpc: '2.0'
  id: JSONRPCID
  method: string
  params?: Record<string, unknown>
}

/**
 * JSON-RPC 2.0 notification (no id = no response expected)
 */
export interface JSONRPCNotification {
  jsonrpc: '2.0'
  method: string
  params?: Record<string, unknown>
}

/**
 * JSON-RPC 2.0 response
 */
export interface JSONRPCResponse<T = unknown> {
  jsonrpc: '2.0'
  id: JSONRPCID
  result?: T
  error?: JSONRPCError
}

/**
 * JSON-RPC 2.0 error object
 */
export interface JSONRPCError {
  code: number
  message: string
  data?: unknown
}

/**
 * Standard JSON-RPC 2.0 error codes
 */
export const JSONRPCErrorCodes = {
  PARSE_ERROR: -32700,
  INVALID_REQUEST: -32600,
  METHOD_NOT_FOUND: -32601,
  INVALID_PARAMS: -32602,
  INTERNAL_ERROR: -32603,
  // MCP-specific error codes (reserved range: -32000 to -32099)
  PROTOCOL_VERSION_UNSUPPORTED: -32000,
  AUTHENTICATION_REQUIRED: -32001,
  AUTHORIZATION_FAILED: -32002,
  RESOURCE_NOT_FOUND: -32003,
  TOOL_EXECUTION_ERROR: -32004,
  SESSION_EXPIRED: -32005,
} as const

// =============================================================================
// MCP Message Types
// =============================================================================

/**
 * MCP request message (JSON-RPC 2.0 wrapper)
 */
export interface MCPRequest extends JSONRPCRequest {
  method: MCPMethod
}

/**
 * MCP notification message (JSON-RPC 2.0 wrapper)
 */
export interface MCPNotification extends JSONRPCNotification {
  method: string
}

/**
 * MCP response message (JSON-RPC 2.0 wrapper)
 */
export interface MCPResponse<T = unknown> extends JSONRPCResponse<T> {}

/**
 * All valid MCP methods
 */
export type MCPMethod =
  | 'initialize'
  | 'initialized'
  | 'ping'
  | 'tools/list'
  | 'tools/call'
  | 'resources/list'
  | 'resources/read'
  | 'prompts/list'
  | 'prompts/get'
  | 'logging/setLevel'
  | 'completion/complete'

// =============================================================================
// MCP Initialize Types
// =============================================================================

/**
 * Client capabilities for initialize request
 */
export interface MCPClientCapabilities {
  experimental?: Record<string, unknown>
  sampling?: Record<string, unknown>
  roots?: {
    listChanged?: boolean
  }
}

/**
 * Server capabilities for initialize response
 */
export interface MCPServerCapabilities {
  experimental?: Record<string, unknown>
  logging?: Record<string, unknown>
  prompts?: {
    listChanged?: boolean
  }
  resources?: {
    subscribe?: boolean
    listChanged?: boolean
  }
  tools?: {
    listChanged?: boolean
  }
}

/**
 * Initialize request params
 */
export interface InitializeParams {
  protocolVersion: string
  capabilities: MCPClientCapabilities
  clientInfo: {
    name: string
    version: string
  }
}

/**
 * Initialize response result
 */
export interface InitializeResult {
  protocolVersion: MCPProtocolVersion
  capabilities: MCPServerCapabilities
  serverInfo: {
    name: string
    version: string
  }
  instructions?: string
}

// =============================================================================
// MCP Tool Types
// =============================================================================

/**
 * JSON Schema for tool input validation
 */
export interface JSONSchema {
  type: 'object' | 'array' | 'string' | 'number' | 'boolean' | 'null'
  properties?: Record<string, JSONSchema>
  items?: JSONSchema
  required?: string[]
  description?: string
  enum?: unknown[]
  default?: unknown
  additionalProperties?: boolean | JSONSchema
  minimum?: number
  maximum?: number
  minLength?: number
  maxLength?: number
  pattern?: string
}

/**
 * Tool definition
 */
export interface Tool {
  name: string
  description: string
  inputSchema: JSONSchema
}

/**
 * Tool list response
 */
export interface ListToolsResult {
  tools: Tool[]
}

/**
 * Tool call request params
 */
export interface CallToolParams {
  name: string
  arguments?: Record<string, unknown>
}

/**
 * Content block types for tool results
 */
export interface TextContent {
  type: 'text'
  text: string
}

export interface ImageContent {
  type: 'image'
  data: string
  mimeType: string
}

export interface ResourceContent {
  type: 'resource'
  resource: EmbeddedResource
}

export type ContentBlock = TextContent | ImageContent | ResourceContent

/**
 * Tool result
 */
export interface ToolResult {
  content: ContentBlock[]
  isError?: boolean
}

/**
 * Tool call response
 */
export interface CallToolResult extends ToolResult {}

// =============================================================================
// MCP Resource Types
// =============================================================================

/**
 * Resource definition
 */
export interface Resource {
  uri: string
  name: string
  description?: string
  mimeType?: string
}

/**
 * Embedded resource in content blocks
 */
export interface EmbeddedResource {
  uri: string
  mimeType?: string
  text?: string
  blob?: string
}

/**
 * Resource list response
 */
export interface ListResourcesResult {
  resources: Resource[]
}

/**
 * Read resource request params
 */
export interface ReadResourceParams {
  uri: string
}

/**
 * Resource contents returned from read
 */
export interface ResourceContents {
  uri: string
  mimeType?: string
  text?: string
  blob?: string
}

/**
 * Read resource response
 */
export interface ReadResourceResult {
  contents: ResourceContents[]
}

// =============================================================================
// MCP Prompt Types
// =============================================================================

/**
 * Prompt argument definition
 */
export interface PromptArgument {
  name: string
  description?: string
  required?: boolean
}

/**
 * Prompt definition
 */
export interface Prompt {
  name: string
  description?: string
  arguments?: PromptArgument[]
}

/**
 * Prompt list response
 */
export interface ListPromptsResult {
  prompts: Prompt[]
}

/**
 * Get prompt request params
 */
export interface GetPromptParams {
  name: string
  arguments?: Record<string, string>
}

/**
 * Prompt message role
 */
export type PromptRole = 'user' | 'assistant'

/**
 * Prompt message
 */
export interface PromptMessage {
  role: PromptRole
  content: TextContent | ImageContent | EmbeddedResource
}

/**
 * Get prompt response
 */
export interface GetPromptResult {
  description?: string
  messages: PromptMessage[]
}

// =============================================================================
// MCP Session Types
// =============================================================================

/**
 * MCP session state
 */
export interface MCPSession {
  id: string
  tenantId: string
  userId: string
  protocolVersion: MCPProtocolVersion
  clientInfo: {
    name: string
    version: string
  }
  createdAt: Date
  lastActivityAt: Date
  tokenUsage: {
    toolCalls: number
    resourceReads: number
    promptGets: number
  }
}

/**
 * Session creation options
 */
export interface CreateSessionOptions {
  tenantId: string
  userId: string
  protocolVersion: MCPProtocolVersion
  clientInfo: {
    name: string
    version: string
  }
}

// =============================================================================
// MCP Token Usage Types
// =============================================================================

/**
 * Token usage log entry
 */
export interface TokenUsageEntry {
  sessionId: string
  tenantId: string
  userId: string
  method: MCPMethod
  toolName?: string
  resourceUri?: string
  promptName?: string
  startedAt: Date
  completedAt: Date
  durationMs: number
  success: boolean
  errorMessage?: string
}

// =============================================================================
// Legacy Exports (for backward compatibility)
// =============================================================================

/**
 * @deprecated Use MCPRequest instead
 */
export interface MCPRequestLegacy {
  method: string
  params?: Record<string, unknown>
}

/**
 * @deprecated Use MCPResponse instead
 */
export interface MCPResponseLegacy<T = unknown> {
  result?: T
  error?: MCPError
}

/**
 * @deprecated Use JSONRPCError instead
 */
export interface MCPError {
  code: number
  message: string
  data?: unknown
}
