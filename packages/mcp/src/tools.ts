/**
 * MCP Tool definition utilities
 */

import type { JSONSchema, ToolResult } from './types'
import type { StreamingChunk } from './streaming'

/**
 * Tool handler function type
 * Can return a Promise<ToolResult> or an AsyncGenerator for streaming
 */
export type ToolHandler = (
  args: Record<string, unknown>
) => Promise<ToolResult> | AsyncGenerator<StreamingChunk, void, unknown>

/**
 * Tool definition
 */
export interface ToolDefinition {
  name: string
  description: string
  inputSchema: JSONSchema
  handler: ToolHandler
  /** Whether this tool supports streaming output */
  streaming?: boolean
}

/**
 * Define an MCP tool
 */
export function defineTool(definition: ToolDefinition): ToolDefinition {
  return definition
}

/**
 * Helper to create a text result
 */
export function textResult(text: string): ToolResult {
  return {
    content: [{ type: 'text', text }],
  }
}

/**
 * Helper to create an error result
 */
export function errorResult(message: string): ToolResult {
  return {
    content: [{ type: 'text', text: message }],
    isError: true,
  }
}

/**
 * Helper to create a JSON result
 */
export function jsonResult(data: unknown): ToolResult {
  return {
    content: [{ type: 'text', text: JSON.stringify(data, null, 2) }],
  }
}

/**
 * @deprecated Use tools from '@cgk-platform/mcp/tools/commerce' instead.
 * These are kept for backwards compatibility but will be removed in a future version.
 *
 * Real implementations:
 * - listOrdersTool, getOrderTool, searchOrdersTool from './tools/commerce'
 * - listProductsTool, getProductTool from './tools/commerce'
 */
export const exampleTools = {
  getOrders: defineTool({
    name: 'get_orders_example',
    description: '[DEPRECATED] Use list_orders from commerce tools instead',
    inputSchema: {
      type: 'object',
      properties: {},
    },
    async handler() {
      return textResult('This tool is deprecated. Use list_orders instead.')
    },
  }),

  getProducts: defineTool({
    name: 'get_products_example',
    description: '[DEPRECATED] Use list_products from commerce tools instead',
    inputSchema: {
      type: 'object',
      properties: {},
    },
    async handler() {
      return textResult('This tool is deprecated. Use list_products instead.')
    },
  }),
}
