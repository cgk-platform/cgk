/**
 * MCP types
 */

export interface Tool {
  name: string
  description: string
  inputSchema: JSONSchema
}

export interface Resource {
  uri: string
  name: string
  description?: string
  mimeType?: string
}

export interface Prompt {
  name: string
  description?: string
  arguments?: PromptArgument[]
}

export interface PromptArgument {
  name: string
  description?: string
  required?: boolean
}

export interface ToolResult {
  content: ContentBlock[]
  isError?: boolean
}

export interface ContentBlock {
  type: 'text' | 'image' | 'resource'
  text?: string
  data?: string
  mimeType?: string
  uri?: string
}

export interface ResourceContent {
  uri: string
  mimeType?: string
  text?: string
  blob?: string
}

export interface PromptMessage {
  role: 'user' | 'assistant'
  content: ContentBlock
}

export interface JSONSchema {
  type: 'object' | 'array' | 'string' | 'number' | 'boolean' | 'null'
  properties?: Record<string, JSONSchema>
  items?: JSONSchema
  required?: string[]
  description?: string
  enum?: unknown[]
  default?: unknown
}

export interface MCPRequest {
  method: string
  params?: Record<string, unknown>
}

export interface MCPResponse<T = unknown> {
  result?: T
  error?: MCPError
}

export interface MCPError {
  code: number
  message: string
  data?: unknown
}
