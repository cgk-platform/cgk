/**
 * MCP Server factory (Legacy API)
 *
 * This module provides the legacy server factory API for backward compatibility.
 * For new code, prefer using MCPHandler directly for better control over
 * authentication and streaming.
 */

import type { PromptDefinition, PromptHandlerMessage } from './prompts'
import type { ResourceDefinition } from './resources'
import type { ToolDefinition } from './tools'
import type {
  Tool,
  Resource,
  Prompt,
  ToolResult,
  ResourceContents,
  TextContent,
} from './types'
import type { StreamingChunk } from './streaming'

/**
 * MCP server configuration
 */
export interface MCPServerConfig {
  name: string
  version: string
  description?: string
}

/**
 * MCP server interface
 */
export interface MCPServer {
  readonly name: string
  readonly version: string

  // Registration
  registerTool(definition: ToolDefinition): void
  registerResource(definition: ResourceDefinition): void
  registerPrompt(definition: PromptDefinition): void

  // Handlers
  listTools(): Tool[]
  listResources(): Resource[]
  listPrompts(): Prompt[]

  callTool(name: string, args: Record<string, unknown>): Promise<ToolResult>
  readResource(uri: string): Promise<ResourceContents>
  getPrompt(name: string, args?: Record<string, unknown>): Promise<PromptHandlerMessage[]>

  // Lifecycle
  start(): Promise<void>
  stop(): Promise<void>
}

/**
 * Type guard to check if a value is an async generator
 */
function isAsyncGenerator(
  value: unknown
): value is AsyncGenerator<StreamingChunk, void, unknown> {
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
 * Create an MCP server
 *
 * @param config - Server configuration
 * @returns MCP server instance
 */
export function createMCPServer(config: MCPServerConfig): MCPServer {
  const tools = new Map<string, ToolDefinition>()
  const resources = new Map<string, ResourceDefinition>()
  const prompts = new Map<string, PromptDefinition>()

  return {
    name: config.name,
    version: config.version,

    registerTool(definition) {
      tools.set(definition.name, definition)
    },

    registerResource(definition) {
      resources.set(definition.uri, definition)
    },

    registerPrompt(definition) {
      prompts.set(definition.name, definition)
    },

    listTools() {
      return Array.from(tools.values()).map((t) => ({
        name: t.name,
        description: t.description,
        inputSchema: t.inputSchema,
      }))
    },

    listResources() {
      return Array.from(resources.values()).map((r) => ({
        uri: r.uri,
        name: r.name,
        description: r.description,
        mimeType: r.mimeType,
      }))
    },

    listPrompts() {
      return Array.from(prompts.values()).map((p) => ({
        name: p.name,
        description: p.description,
        arguments: p.arguments,
      }))
    },

    async callTool(name, args) {
      const tool = tools.get(name)
      if (!tool) {
        return {
          content: [{ type: 'text' as const, text: `Tool not found: ${name}` }],
          isError: true,
        }
      }

      try {
        const result = tool.handler(args)

        // Handle streaming tools by collecting all chunks
        if (isAsyncGenerator(result)) {
          const contents: TextContent[] = []
          for await (const chunk of result) {
            if (chunk.type === 'partial' || chunk.type === 'complete') {
              const textContents = (chunk.type === 'partial' ? chunk.content : chunk.result.content)
                .filter((c): c is TextContent => c.type === 'text')
              contents.push(...textContents)
            }
          }
          return {
            content: contents.length > 0 ? contents : [{ type: 'text' as const, text: 'No results' }],
            isError: false,
          }
        }

        // Handle regular promise-based tools
        return await result
      } catch (error) {
        return {
          content: [{ type: 'text' as const, text: `Tool error: ${error instanceof Error ? error.message : String(error)}` }],
          isError: true,
        }
      }
    },

    async readResource(uri) {
      const resource = resources.get(uri)
      if (!resource) {
        throw new Error(`Resource not found: ${uri}`)
      }

      // LEGACY: This server doesn't have tenant context.
      // Use MCPHandler instead for proper tenant-isolated resource access.
      // Pass empty context - resources should handle missing context gracefully.
      return resource.handler({
        tenantId: '',
        userId: '',
      })
    },

    async getPrompt(name, args) {
      const prompt = prompts.get(name)
      if (!prompt) {
        throw new Error(`Prompt not found: ${name}`)
      }

      return prompt.handler(args ?? {})
    },

    async start() {
      console.log(`MCP Server ${config.name} v${config.version} starting...`)
    },

    async stop() {
      console.log(`MCP Server ${config.name} stopping...`)
    },
  }
}
