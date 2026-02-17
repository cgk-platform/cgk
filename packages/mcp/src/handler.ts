/**
 * MCP Handler
 *
 * Main handler class for processing MCP requests.
 * Handles protocol initialization, tool/resource/prompt operations,
 * and integrates with session management and token usage tracking.
 */

import type { ToolDefinition } from './tools'
import type { ResourceDefinition } from './resources'
import type { PromptDefinition } from './prompts'
import {
  createMCPSession,
  getSession,
  touchSession,
  incrementUsage,
  startUsageTracking,
  negotiateProtocolVersion,
} from './session'
import {
  requiresStreaming,
  createStreamingResponse,
  textCompleteChunk,
  errorChunk,
  type StreamingChunk,
  type StreamingResponseOptions,
} from './streaming'
import {
  SUPPORTED_PROTOCOL_VERSIONS,
  JSONRPCErrorCodes,
  type MCPSession,
  type MCPServerCapabilities,
  type InitializeParams,
  type InitializeResult,
  type Tool,
  type ListToolsResult,
  type CallToolParams,
  type CallToolResult,
  type Resource,
  type ListResourcesResult,
  type ReadResourceParams,
  type ReadResourceResult,
  type Prompt,
  type ListPromptsResult,
  type GetPromptParams,
  type GetPromptResult,
  type JSONRPCResponse,
  type JSONRPCID,
  type JSONRPCError,
} from './types'

// =============================================================================
// MCPHandler Configuration
// =============================================================================

/**
 * Server information for initialize response
 */
export interface MCPServerInfo {
  name: string
  version: string
  instructions?: string
}

/**
 * Handler configuration options
 */
export interface MCPHandlerConfig {
  /** Server information */
  serverInfo: MCPServerInfo
  /** Server capabilities to advertise */
  capabilities?: MCPServerCapabilities
  /** Enable token usage logging */
  logUsage?: boolean
}

/**
 * Default server capabilities
 */
const DEFAULT_CAPABILITIES: MCPServerCapabilities = {
  tools: {
    listChanged: false,
  },
  resources: {
    subscribe: false,
    listChanged: false,
  },
  prompts: {
    listChanged: false,
  },
}

// =============================================================================
// MCPHandler Class
// =============================================================================

/**
 * MCP request handler
 *
 * Handles all MCP protocol operations with tenant and user context.
 * Supports streaming responses for long-running tools.
 */
export class MCPHandler {
  readonly tenantId: string
  readonly userId: string

  private session: MCPSession | null = null
  private readonly config: Required<MCPHandlerConfig>
  private readonly tools = new Map<string, ToolDefinition>()
  private readonly resources = new Map<string, ResourceDefinition>()
  private readonly prompts = new Map<string, PromptDefinition>()

  /**
   * Create a new MCP handler
   *
   * @param tenantId - The tenant ID for this handler
   * @param userId - The user ID for this handler
   * @param config - Handler configuration
   */
  constructor(tenantId: string, userId: string, config: MCPHandlerConfig) {
    this.tenantId = tenantId
    this.userId = userId
    this.config = {
      serverInfo: config.serverInfo,
      capabilities: config.capabilities ?? DEFAULT_CAPABILITIES,
      logUsage: config.logUsage ?? true,
    }
  }

  // ===========================================================================
  // Tool Registration
  // ===========================================================================

  /**
   * Register a tool
   */
  registerTool(definition: ToolDefinition): void {
    this.tools.set(definition.name, definition)
  }

  /**
   * Register multiple tools
   */
  registerTools(definitions: ToolDefinition[]): void {
    for (const def of definitions) {
      this.registerTool(def)
    }
  }

  // ===========================================================================
  // Resource Registration
  // ===========================================================================

  /**
   * Register a resource
   */
  registerResource(definition: ResourceDefinition): void {
    this.resources.set(definition.uri, definition)
  }

  /**
   * Register multiple resources
   */
  registerResources(definitions: ResourceDefinition[]): void {
    for (const def of definitions) {
      this.registerResource(def)
    }
  }

  // ===========================================================================
  // Prompt Registration
  // ===========================================================================

  /**
   * Register a prompt
   */
  registerPrompt(definition: PromptDefinition): void {
    this.prompts.set(definition.name, definition)
  }

  /**
   * Register multiple prompts
   */
  registerPrompts(definitions: PromptDefinition[]): void {
    for (const def of definitions) {
      this.registerPrompt(def)
    }
  }

  // ===========================================================================
  // Protocol Operations
  // ===========================================================================

  /**
   * Handle initialize request
   *
   * Validates protocol version and creates a session.
   *
   * @param params - Initialize request parameters
   * @returns Initialize response result
   * @throws Error if protocol version is unsupported
   */
  initialize(params: InitializeParams): InitializeResult {
    // Validate protocol version
    const negotiatedVersion = negotiateProtocolVersion(params.protocolVersion)

    if (!negotiatedVersion) {
      throw new MCPProtocolError(
        JSONRPCErrorCodes.PROTOCOL_VERSION_UNSUPPORTED,
        `Unsupported protocol version: ${params.protocolVersion}. ` +
          `Supported versions: ${SUPPORTED_PROTOCOL_VERSIONS.join(', ')}`
      )
    }

    // Create session
    this.session = createMCPSession({
      tenantId: this.tenantId,
      userId: this.userId,
      protocolVersion: negotiatedVersion,
      clientInfo: params.clientInfo,
    })

    // Return server info and capabilities
    return {
      protocolVersion: negotiatedVersion,
      capabilities: this.config.capabilities,
      serverInfo: {
        name: this.config.serverInfo.name,
        version: this.config.serverInfo.version,
      },
      instructions: this.config.serverInfo.instructions,
    }
  }

  /**
   * Handle initialized notification
   *
   * Called by client after receiving initialize response.
   */
  initialized(): void {
    if (this.session) {
      touchSession(this.session.id)
    }
  }

  /**
   * Handle ping request
   *
   * @returns Empty object indicating success
   */
  ping(): Record<string, never> {
    if (this.session) {
      touchSession(this.session.id)
    }
    return {}
  }

  // ===========================================================================
  // Tool Operations
  // ===========================================================================

  /**
   * List all registered tools
   *
   * @returns List of available tools
   */
  listTools(): ListToolsResult {
    this.touchSessionAndLog('tools/list')

    const tools: Tool[] = Array.from(this.tools.values()).map((t) => ({
      name: t.name,
      description: t.description,
      inputSchema: t.inputSchema,
    }))

    return { tools }
  }

  /**
   * Call a tool
   *
   * @param params - Tool call parameters
   * @returns Tool execution result
   */
  async callTool(params: CallToolParams): Promise<CallToolResult> {
    const { name, arguments: args = {} } = params

    // Find the tool
    const tool = this.tools.get(name)
    if (!tool) {
      return {
        content: [{ type: 'text', text: `Tool not found: ${name}` }],
        isError: true,
      }
    }

    // Start usage tracking
    const completeUsage = this.startUsageTracking('tools/call', { toolName: name })
    if (this.session) {
      incrementUsage(this.session.id, 'toolCalls')
    }

    // CRITICAL: Inject tenant context from authenticated session
    // NEVER trust _tenantId or _userId from client args
    const argsWithContext = {
      ...args,
      _tenantId: this.tenantId, // Injected from authenticated session
      _userId: this.userId, // Injected from authenticated session
    }

    // Execute the tool
    try {
      const handlerResult = tool.handler(argsWithContext)

      // Handle async generator (streaming) tools
      if (isAsyncGenerator(handlerResult)) {
        // Collect all chunks from streaming tool
        const contents: Array<{ type: 'text'; text: string }> = []
        for await (const chunk of handlerResult) {
          if (chunk.type === 'partial' || chunk.type === 'complete') {
            const textBlocks = (chunk.type === 'partial' ? chunk.content : chunk.result.content)
              .filter((c): c is { type: 'text'; text: string } => c.type === 'text')
            contents.push(...textBlocks)
          }
        }
        completeUsage(true)
        return {
          content: contents.length > 0 ? contents : [{ type: 'text', text: 'No results' }],
          isError: false,
        }
      }

      // Handle regular Promise-based tools
      const result = await handlerResult
      completeUsage(true)
      return result
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      completeUsage(false, message)
      return {
        content: [{ type: 'text', text: `Tool error: ${message}` }],
        isError: true,
      }
    }
  }

  /**
   * Check if a tool requires streaming
   *
   * @param toolName - Name of the tool
   * @returns True if tool should use streaming
   */
  toolRequiresStreaming(toolName: string): boolean {
    return requiresStreaming(toolName)
  }

  /**
   * Call a tool with streaming response
   *
   * @param params - Tool call parameters
   * @returns Async generator yielding streaming chunks
   */
  async *callToolStreaming(
    params: CallToolParams
  ): AsyncGenerator<StreamingChunk, void, unknown> {
    const { name, arguments: args = {} } = params

    // Find the tool
    const tool = this.tools.get(name)
    if (!tool) {
      yield errorChunk(
        JSONRPCErrorCodes.METHOD_NOT_FOUND,
        `Tool not found: ${name}`
      )
      return
    }

    // Start usage tracking
    const completeUsage = this.startUsageTracking('tools/call', { toolName: name })
    if (this.session) {
      incrementUsage(this.session.id, 'toolCalls')
    }

    // CRITICAL: Inject tenant context from authenticated session
    // NEVER trust _tenantId or _userId from client args
    const argsWithContext = {
      ...args,
      _tenantId: this.tenantId, // Injected from authenticated session
      _userId: this.userId, // Injected from authenticated session
    }

    try {
      // Check if tool handler is an async generator
      const result = tool.handler(argsWithContext)

      if (isAsyncGenerator(result)) {
        // Tool returns an async generator - yield all chunks
        for await (const chunk of result) {
          yield chunk as StreamingChunk
        }
        completeUsage(true)
      } else {
        // Tool returns a promise - convert to streaming
        const toolResult = await result
        yield textCompleteChunk(
          toolResult.content
            .filter((c): c is { type: 'text'; text: string } => c.type === 'text')
            .map((c) => c.text)
            .join('\n'),
          toolResult.isError
        )
        completeUsage(true)
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      completeUsage(false, message)
      yield errorChunk(JSONRPCErrorCodes.TOOL_EXECUTION_ERROR, message)
    }
  }

  // ===========================================================================
  // Resource Operations
  // ===========================================================================

  /**
   * List all registered resources
   *
   * @returns List of available resources
   */
  listResources(): ListResourcesResult {
    this.touchSessionAndLog('resources/list')

    const resources: Resource[] = Array.from(this.resources.values()).map((r) => ({
      uri: r.uri,
      name: r.name,
      description: r.description,
      mimeType: r.mimeType,
    }))

    return { resources }
  }

  /**
   * Read a resource
   *
   * @param params - Read resource parameters
   * @returns Resource contents
   */
  async readResource(params: ReadResourceParams): Promise<ReadResourceResult> {
    const { uri } = params

    // Find the resource
    const resource = this.resources.get(uri)
    if (!resource) {
      throw new MCPProtocolError(
        JSONRPCErrorCodes.RESOURCE_NOT_FOUND,
        `Resource not found: ${uri}`
      )
    }

    // Start usage tracking
    const completeUsage = this.startUsageTracking('resources/read', {
      resourceUri: uri,
    })
    if (this.session) {
      incrementUsage(this.session.id, 'resourceReads')
    }

    try {
      // CRITICAL: Pass tenant context to resource handler (same as tools)
      const content = await resource.handler({
        tenantId: this.tenantId,
        userId: this.userId,
      })
      completeUsage(true)

      return {
        contents: [content],
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      completeUsage(false, message)
      throw new MCPProtocolError(JSONRPCErrorCodes.INTERNAL_ERROR, message)
    }
  }

  // ===========================================================================
  // Prompt Operations
  // ===========================================================================

  /**
   * List all registered prompts
   *
   * @returns List of available prompts
   */
  listPrompts(): ListPromptsResult {
    this.touchSessionAndLog('prompts/list')

    const prompts: Prompt[] = Array.from(this.prompts.values()).map((p) => ({
      name: p.name,
      description: p.description,
      arguments: p.arguments,
    }))

    return { prompts }
  }

  /**
   * Get a prompt
   *
   * @param params - Get prompt parameters
   * @returns Prompt messages
   */
  async getPrompt(params: GetPromptParams): Promise<GetPromptResult> {
    const { name, arguments: args = {} } = params

    // Find the prompt
    const prompt = this.prompts.get(name)
    if (!prompt) {
      throw new MCPProtocolError(
        JSONRPCErrorCodes.RESOURCE_NOT_FOUND,
        `Prompt not found: ${name}`
      )
    }

    // Start usage tracking
    const completeUsage = this.startUsageTracking('prompts/get', {
      promptName: name,
    })
    if (this.session) {
      incrementUsage(this.session.id, 'promptGets')
    }

    try {
      const messages = await prompt.handler(args as Record<string, unknown>)
      completeUsage(true)

      return {
        description: prompt.description,
        messages: messages.map((m) => ({
          role: m.role,
          content: m.content,
        })),
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      completeUsage(false, message)
      throw new MCPProtocolError(JSONRPCErrorCodes.INTERNAL_ERROR, message)
    }
  }

  // ===========================================================================
  // Session Management
  // ===========================================================================

  /**
   * Get the current session
   */
  getSession(): MCPSession | null {
    return this.session
  }

  /**
   * Restore a session by ID
   *
   * @param sessionId - Session ID to restore
   * @returns True if session was restored
   */
  restoreSession(sessionId: string): boolean {
    const session = getSession(sessionId)
    if (session && session.tenantId === this.tenantId && session.userId === this.userId) {
      this.session = session
      touchSession(sessionId)
      return true
    }
    return false
  }

  // ===========================================================================
  // Response Helpers
  // ===========================================================================

  /**
   * Create a JSON-RPC success response
   */
  createResponse<T>(id: JSONRPCID, result: T): JSONRPCResponse<T> {
    return {
      jsonrpc: '2.0',
      id,
      result,
    }
  }

  /**
   * Create a JSON-RPC error response
   */
  createErrorResponse(id: JSONRPCID, error: JSONRPCError): JSONRPCResponse {
    return {
      jsonrpc: '2.0',
      id,
      error,
    }
  }

  /**
   * Create a streaming HTTP response
   */
  createStreamingHttpResponse(
    generator: AsyncGenerator<StreamingChunk, void, unknown>,
    options: StreamingResponseOptions
  ): Response {
    return createStreamingResponse(generator, options)
  }

  // ===========================================================================
  // Private Helpers
  // ===========================================================================

  /**
   * Touch session and start usage tracking
   */
  private touchSessionAndLog(
    method: 'tools/list' | 'resources/list' | 'prompts/list'
  ): void {
    if (this.session) {
      touchSession(this.session.id)
    }

    // For list operations, we only log if usage tracking is enabled
    // but don't increment counters since they're read-only operations
    if (this.config.logUsage && this.session) {
      const complete = startUsageTracking(this.session, method)
      complete(true)
    }
  }

  /**
   * Start usage tracking helper
   */
  private startUsageTracking(
    method: 'tools/call' | 'resources/read' | 'prompts/get',
    details?: {
      toolName?: string
      resourceUri?: string
      promptName?: string
    }
  ): (success: boolean, errorMessage?: string) => void {
    if (!this.config.logUsage || !this.session) {
      return () => {} // No-op if logging disabled
    }
    return startUsageTracking(this.session, method, details)
  }
}

// =============================================================================
// Error Classes
// =============================================================================

/**
 * MCP Protocol error
 */
export class MCPProtocolError extends Error {
  readonly code: number
  readonly data?: unknown

  constructor(code: number, message: string, data?: unknown) {
    super(message)
    this.name = 'MCPProtocolError'
    this.code = code
    this.data = data
  }

  toJSONRPCError(): JSONRPCError {
    return {
      code: this.code,
      message: this.message,
      data: this.data,
    }
  }
}

// =============================================================================
// Utility Functions
// =============================================================================

/**
 * Type guard for async generators
 */
function isAsyncGenerator(
  value: unknown
): value is AsyncGenerator<unknown, unknown, unknown> {
  if (value === null || typeof value !== 'object') {
    return false
  }
  // Check for async iterator symbol
  if (!(Symbol.asyncIterator in value)) {
    return false
  }
  // Check for next method
  const asIterable = value as Record<string, unknown>
  return typeof asIterable.next === 'function'
}

/**
 * Create an MCP handler factory
 *
 * @param config - Handler configuration
 * @returns Factory function to create handlers with tenant/user context
 */
export function createMCPHandlerFactory(config: MCPHandlerConfig) {
  return (tenantId: string, userId: string): MCPHandler => {
    return new MCPHandler(tenantId, userId, config)
  }
}
