/**
 * MCP API Route
 *
 * Main endpoint for Model Context Protocol requests.
 * Uses Streamable HTTP transport (POST-based).
 *
 * @route POST /api/mcp
 */

// Environment validation - must be imported first
import { ensureEnvValidated } from '@/lib/env-validation'

import {
  MCPHandler,
  MCPProtocolError,
  JSONRPCErrorCodes,
  defineTool,
  textResult,
  defineResource,
  definePrompt,
  requiresStreaming,
  type JSONRPCRequest,
  type JSONRPCResponse,
  type InitializeParams,
  type CallToolParams,
  type ReadResourceParams,
  type GetPromptParams,
} from '@cgk-platform/mcp'
import {
  authenticateRequest,
  createAuthErrorResponse,
  createCORSHeaders,
  MCPAuthError,
} from '@/lib/auth'

// =============================================================================
// Edge Runtime Configuration
// =============================================================================

export const runtime = 'edge'
export const dynamic = 'force-dynamic'

// =============================================================================
// Server Configuration
// =============================================================================

const SERVER_NAME = 'cgk-mcp-server'
const SERVER_VERSION = '0.1.0'

// =============================================================================
// Example Tools (will be replaced with real implementations in Phase 6B)
// =============================================================================

const exampleTools = [
  defineTool({
    name: 'get_tenant_info',
    description: 'Get information about the current tenant',
    inputSchema: {
      type: 'object',
      properties: {},
    },
    async handler(_args) {
      // Placeholder - will be implemented with real tenant data
      return textResult('Tenant info would be returned here')
    },
  }),
  defineTool({
    name: 'search_orders',
    description: 'Search orders for the current tenant',
    inputSchema: {
      type: 'object',
      properties: {
        query: { type: 'string', description: 'Search query' },
        status: {
          type: 'string',
          enum: ['pending', 'processing', 'shipped', 'delivered', 'cancelled'],
        },
        limit: { type: 'number', description: 'Maximum results', default: 10 },
      },
    },
    async handler(args) {
      // Placeholder - streaming tool
      return textResult(
        `Would search orders with query: ${args.query}, status: ${args.status}, limit: ${args.limit}`
      )
    },
  }),
]

const exampleResources = [
  defineResource({
    uri: 'cgk://tenant/config',
    name: 'Tenant Configuration',
    description: 'Current tenant configuration',
    mimeType: 'application/json',
    async handler() {
      return {
        uri: 'cgk://tenant/config',
        mimeType: 'application/json',
        text: JSON.stringify({ placeholder: true }, null, 2),
      }
    },
  }),
]

const examplePrompts = [
  definePrompt({
    name: 'analyze_sales',
    description: 'Analyze sales data for the tenant',
    arguments: [
      { name: 'period', description: 'Time period (e.g., 7d, 30d)', required: false },
    ],
    async handler(args) {
      const period = (args.period as string) ?? '7d'
      return [
        {
          role: 'user' as const,
          content: {
            type: 'text' as const,
            text: `Analyze sales data for the last ${period}. Provide insights on trends, top products, and recommendations.`,
          },
        },
      ]
    },
  }),
]

// =============================================================================
// Request Handler
// =============================================================================

/**
 * Handle POST requests to /api/mcp
 */
export async function POST(request: Request): Promise<Response> {
  const corsHeaders = createCORSHeaders(request)

  try {
    // Validate environment variables (only runs once)
    ensureEnvValidated()

    // Authenticate the request
    const auth = await authenticateRequest(request)

    // Parse the JSON-RPC request
    const body = await request.json()

    if (!isValidJSONRPCRequest(body)) {
      return createErrorResponse(
        null,
        JSONRPCErrorCodes.INVALID_REQUEST,
        'Invalid JSON-RPC request',
        corsHeaders
      )
    }

    const jsonrpcRequest = body as JSONRPCRequest

    // Create handler with tenant/user context
    const handler = new MCPHandler(auth.tenantId, auth.userId, {
      serverInfo: {
        name: SERVER_NAME,
        version: SERVER_VERSION,
        instructions:
          'CGK Commerce Platform MCP Server. Use tools to interact with commerce data.',
      },
      logUsage: true,
    })

    // Register tools, resources, prompts
    handler.registerTools(exampleTools)
    handler.registerResources(exampleResources)
    handler.registerPrompts(examplePrompts)

    // Route the request to the appropriate handler method
    const response = await handleMethod(handler, jsonrpcRequest, corsHeaders)
    return response
  } catch (error) {
    // Handle authentication errors
    if (error instanceof MCPAuthError) {
      return createAuthErrorResponse(error)
    }

    // Handle protocol errors
    if (error instanceof MCPProtocolError) {
      return createErrorResponse(null, error.code, error.message, corsHeaders)
    }

    // Handle unexpected errors
    console.error('MCP request error:', error)
    return createErrorResponse(
      null,
      JSONRPCErrorCodes.INTERNAL_ERROR,
      error instanceof Error ? error.message : 'Internal server error',
      corsHeaders
    )
  }
}

/**
 * Handle OPTIONS requests for CORS preflight
 */
export async function OPTIONS(request: Request): Promise<Response> {
  return new Response(null, {
    status: 204,
    headers: createCORSHeaders(request),
  })
}

// =============================================================================
// Method Router
// =============================================================================

async function handleMethod(
  handler: MCPHandler,
  request: JSONRPCRequest,
  corsHeaders: Record<string, string>
): Promise<Response> {
  const { id, method, params = {} } = request

  try {
    switch (method) {
      case 'initialize': {
        const result = handler.initialize(params as unknown as InitializeParams)
        return createSuccessResponse(id, result, corsHeaders)
      }

      case 'initialized': {
        handler.initialized()
        return createSuccessResponse(id, {}, corsHeaders)
      }

      case 'ping': {
        const result = handler.ping()
        return createSuccessResponse(id, result, corsHeaders)
      }

      case 'tools/list': {
        const result = handler.listTools()
        return createSuccessResponse(id, result, corsHeaders)
      }

      case 'tools/call': {
        const toolParams = params as unknown as CallToolParams
        const toolName = toolParams.name

        // Check if tool requires streaming
        if (requiresStreaming(toolName) && handler.toolRequiresStreaming(toolName)) {
          // Use streaming response
          const generator = handler.callToolStreaming(toolParams)
          return handler.createStreamingHttpResponse(generator, {
            requestId: id,
            corsHeaders,
          })
        }

        // Regular tool call
        const result = await handler.callTool(toolParams)
        return createSuccessResponse(id, result, corsHeaders)
      }

      case 'resources/list': {
        const result = handler.listResources()
        return createSuccessResponse(id, result, corsHeaders)
      }

      case 'resources/read': {
        const result = await handler.readResource(params as unknown as ReadResourceParams)
        return createSuccessResponse(id, result, corsHeaders)
      }

      case 'prompts/list': {
        const result = handler.listPrompts()
        return createSuccessResponse(id, result, corsHeaders)
      }

      case 'prompts/get': {
        const result = await handler.getPrompt(params as unknown as GetPromptParams)
        return createSuccessResponse(id, result, corsHeaders)
      }

      default:
        return createErrorResponse(
          id,
          JSONRPCErrorCodes.METHOD_NOT_FOUND,
          `Method not found: ${method}`,
          corsHeaders
        )
    }
  } catch (error) {
    if (error instanceof MCPProtocolError) {
      return createErrorResponse(id, error.code, error.message, corsHeaders)
    }
    throw error
  }
}

// =============================================================================
// Response Helpers
// =============================================================================

function createSuccessResponse(
  id: string | number,
  result: unknown,
  corsHeaders: Record<string, string>
): Response {
  const response: JSONRPCResponse = {
    jsonrpc: '2.0',
    id,
    result,
  }

  return new Response(JSON.stringify(response), {
    status: 200,
    headers: {
      'Content-Type': 'application/json',
      ...corsHeaders,
    },
  })
}

function createErrorResponse(
  id: string | number | null,
  code: number,
  message: string,
  corsHeaders: Record<string, string>
): Response {
  const response: JSONRPCResponse = {
    jsonrpc: '2.0',
    id: id ?? 0,
    error: { code, message },
  }

  // Determine HTTP status based on error code
  let status = 500
  if (code === JSONRPCErrorCodes.INVALID_REQUEST || code === JSONRPCErrorCodes.PARSE_ERROR) {
    status = 400
  } else if (code === JSONRPCErrorCodes.METHOD_NOT_FOUND) {
    status = 404
  } else if (code === JSONRPCErrorCodes.AUTHENTICATION_REQUIRED) {
    status = 401
  } else if (code === JSONRPCErrorCodes.AUTHORIZATION_FAILED) {
    status = 403
  }

  return new Response(JSON.stringify(response), {
    status,
    headers: {
      'Content-Type': 'application/json',
      ...corsHeaders,
    },
  })
}

// =============================================================================
// Validation Helpers
// =============================================================================

function isValidJSONRPCRequest(body: unknown): body is JSONRPCRequest {
  if (typeof body !== 'object' || body === null) {
    return false
  }

  const obj = body as Record<string, unknown>

  return (
    obj.jsonrpc === '2.0' &&
    (typeof obj.id === 'string' || typeof obj.id === 'number') &&
    typeof obj.method === 'string'
  )
}
