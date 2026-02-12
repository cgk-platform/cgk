# @cgk/mcp - AI Development Guide

> **Package Version**: 0.1.0
> **Last Updated**: 2026-02-12

---

## Purpose

MCP (Model Context Protocol) server utilities for the CGK platform. Provides everything needed to build MCP servers that interact with commerce data, orders, and platform functionality.

**Key Features:**
- Streamable HTTP transport (POST-based, not deprecated SSE)
- Per-request authentication with tenant isolation
- Streaming responses for long-running tools
- Token usage logging for analytics
- JSON-RPC 2.0 compliant protocol

---

## Quick Reference

```typescript
// Handler (primary API)
import { MCPHandler, createMCPHandlerFactory } from '@cgk/mcp'

// Tools, Resources, Prompts
import { defineTool, defineResource, definePrompt } from '@cgk/mcp'
import { textResult, jsonResult, errorResult } from '@cgk/mcp'

// Streaming
import { progressChunk, partialChunk, completeChunk, errorChunk } from '@cgk/mcp'
import { requiresStreaming, createStreamingResponse } from '@cgk/mcp'

// Session Management
import { createMCPSession, getSession, getTokenUsageLogs } from '@cgk/mcp'

// Types
import type { MCPHandler, ToolResult, StreamingChunk } from '@cgk/mcp'
```

---

## Key Patterns

### Pattern 1: Creating an MCP Handler (NEW - Primary API)

```typescript
import { MCPHandler, defineTool, textResult } from '@cgk/mcp'

// Create handler with tenant/user context
const handler = new MCPHandler(tenantId, userId, {
  serverInfo: {
    name: 'cgk-commerce',
    version: '1.0.0',
    instructions: 'Commerce platform tools',
  },
  logUsage: true,
})

// Register tools
handler.registerTool(defineTool({
  name: 'get_orders',
  description: 'Get recent orders',
  inputSchema: {
    type: 'object',
    properties: {
      limit: { type: 'number', default: 10 },
    },
  },
  async handler(args) {
    const orders = await fetchOrders(args.limit)
    return textResult(JSON.stringify(orders))
  },
}))

// Handle initialize request
const initResult = handler.initialize({
  protocolVersion: '2025-06-18',
  capabilities: {},
  clientInfo: { name: 'client', version: '1.0' },
})

// Handle tool calls
const result = await handler.callTool({ name: 'get_orders', arguments: { limit: 5 } })
```

### Pattern 2: Defining Tools

```typescript
import { defineTool, textResult, jsonResult, errorResult } from '@cgk/mcp'

// Simple tool
const simpleTool = defineTool({
  name: 'get_tenant_info',
  description: 'Get current tenant information',
  inputSchema: { type: 'object', properties: {} },
  async handler(_args) {
    const info = await getTenantInfo()
    return jsonResult(info)
  },
})

// Tool with validation
const searchTool = defineTool({
  name: 'search_products',
  description: 'Search products in the catalog',
  inputSchema: {
    type: 'object',
    properties: {
      query: { type: 'string', description: 'Search query' },
      limit: { type: 'number', default: 10, minimum: 1, maximum: 100 },
    },
    required: ['query'],
  },
  async handler(args) {
    try {
      const products = await searchProducts(args.query as string, args.limit as number)
      return jsonResult(products)
    } catch (error) {
      return errorResult(`Search failed: ${error.message}`)
    }
  },
})
```

### Pattern 3: Streaming Tools

For long-running operations (search, export, bulk operations):

```typescript
import { defineTool, progressChunk, partialChunk, completeChunk } from '@cgk/mcp'

const exportTool = defineTool({
  name: 'export_analytics',
  description: 'Export analytics data (streaming)',
  inputSchema: { type: 'object', properties: {} },
  streaming: true,
  async *handler(_args) {
    // Yield progress updates
    yield progressChunk(0, 'Starting export...')

    const batches = await getBatchCount()
    for (let i = 0; i < batches; i++) {
      const data = await fetchBatch(i)

      // Yield partial results
      yield partialChunk([{ type: 'text', text: JSON.stringify(data) }], i)

      // Yield progress
      yield progressChunk(Math.round(((i + 1) / batches) * 100), `Batch ${i + 1}/${batches}`)
    }

    // Final result
    yield completeChunk({
      content: [{ type: 'text', text: 'Export complete' }],
      isError: false,
    })
  },
})
```

### Pattern 4: Resources

```typescript
import { defineResource } from '@cgk/mcp'

const configResource = defineResource({
  uri: 'cgk://config/tenant',
  name: 'Tenant Configuration',
  description: 'Current tenant settings',
  mimeType: 'application/json',
  async handler() {
    const config = await getTenantConfig()
    return {
      uri: 'cgk://config/tenant',
      mimeType: 'application/json',
      text: JSON.stringify(config, null, 2),
    }
  },
})

handler.registerResource(configResource)
```

### Pattern 5: Prompts

```typescript
import { definePrompt } from '@cgk/mcp'

const analysisPrompt = definePrompt({
  name: 'analyze_sales',
  description: 'Analyze sales trends',
  arguments: [
    { name: 'period', description: 'Time period (7d, 30d, 90d)', required: false },
  ],
  async handler(args) {
    const period = (args.period as string) ?? '30d'
    return [
      {
        role: 'user' as const,
        content: {
          type: 'text' as const,
          text: `Analyze sales for the last ${period}. Include trends and recommendations.`,
        },
      },
    ]
  },
})

handler.registerPrompt(analysisPrompt)
```

### Pattern 6: Session Management

```typescript
import { createMCPSession, getSession, getTokenUsageLogs, getUsageStats } from '@cgk/mcp'

// Sessions are created automatically by MCPHandler.initialize()
// But you can also manage them manually:

const session = createMCPSession({
  tenantId: 'tenant_123',
  userId: 'user_456',
  protocolVersion: '2025-06-18',
  clientInfo: { name: 'client', version: '1.0' },
})

// Get session
const existingSession = getSession(session.id)

// Get usage logs for a tenant
const logs = getTokenUsageLogs('tenant_123', {
  limit: 100,
  since: new Date(Date.now() - 24 * 60 * 60 * 1000), // Last 24h
})

// Get usage statistics
const stats = getUsageStats('tenant_123')
// { totalCalls: 150, toolCalls: 100, resourceReads: 30, promptGets: 20, errorCount: 5, avgDurationMs: 250 }
```

---

## File Map

| File | Purpose | Key Exports |
|------|---------|-------------|
| `index.ts` | Public exports | All exports |
| `types.ts` | Protocol types | `MCPRequest`, `Tool`, `ToolResult`, etc. |
| `handler.ts` | Request handler | `MCPHandler`, `MCPProtocolError` |
| `session.ts` | Session management | `createMCPSession`, `getTokenUsageLogs` |
| `streaming.ts` | Streaming utilities | `progressChunk`, `createStreamingResponse` |
| `tools.ts` | Tool utilities | `defineTool`, `textResult` |
| `resources.ts` | Resource utilities | `defineResource` |
| `prompts.ts` | Prompt utilities | `definePrompt` |
| `context.ts` | Context management | `createContext`, `withContext` |
| `server.ts` | Legacy server API | `createMCPServer` |

---

## Protocol Versions

| Version | Status | Notes |
|---------|--------|-------|
| `2024-11-05` | Supported | SSE deprecated, Streamable HTTP |
| `2025-03-26` | Supported | Current stable |
| `2025-06-18` | Supported | Latest |

---

## Streaming Tools

These tools use streaming by default:

| Tool Name | Description |
|-----------|-------------|
| `search_orders` | Search with many results |
| `export_analytics` | Large data export |
| `bulk_update` | Batch operations |
| `generate_report` | Report generation |
| `sync_inventory` | Inventory sync |
| `import_data` | Data import |
| `analyze_trends` | Analytics computation |

---

## Error Codes

| Code | Constant | Description |
|------|----------|-------------|
| -32700 | `PARSE_ERROR` | Invalid JSON |
| -32600 | `INVALID_REQUEST` | Invalid request format |
| -32601 | `METHOD_NOT_FOUND` | Unknown method |
| -32602 | `INVALID_PARAMS` | Invalid parameters |
| -32603 | `INTERNAL_ERROR` | Server error |
| -32000 | `PROTOCOL_VERSION_UNSUPPORTED` | Version not supported |
| -32001 | `AUTHENTICATION_REQUIRED` | Auth missing |
| -32002 | `AUTHORIZATION_FAILED` | Access denied |
| -32003 | `RESOURCE_NOT_FOUND` | Resource not found |
| -32004 | `TOOL_EXECUTION_ERROR` | Tool failed |
| -32005 | `SESSION_EXPIRED` | Session expired |

---

## Dependencies

| Dependency | Why |
|------------|-----|
| `@cgk/auth` | Authentication context |
| `@cgk/core` | Shared types |
| `@cgk/db` | Data access |
| `@modelcontextprotocol/sdk` | Protocol reference |

---

## Common Gotchas

### 1. Tool handlers must return ToolResult

```typescript
// WRONG - returning raw data
async handler(args) {
  return await fetchData()
}

// CORRECT - wrap in ToolResult
async handler(args) {
  const data = await fetchData()
  return jsonResult(data)
}
```

### 2. Streaming tools must be async generators

```typescript
// WRONG - regular async function
async handler(args) { ... }

// CORRECT - async generator function
async *handler(args) {
  yield progressChunk(0)
  // ...
}
```

### 3. Protocol version negotiation

```typescript
// WRONG - accepting any version
handler.initialize({ protocolVersion: 'anything' })

// CORRECT - MCPHandler validates versions automatically
// Throws MCPProtocolError if unsupported
```

### 4. Context is per-request in Edge runtime

```typescript
// WRONG - storing context globally
let globalTenantId: string

// CORRECT - pass context to handler
const handler = new MCPHandler(tenantId, userId, config)
```

---

## Testing

```bash
# Run tests
pnpm --filter @cgk/mcp test

# Type check
pnpm --filter @cgk/mcp typecheck

# Build
pnpm --filter @cgk/mcp build
```

---

## Integration Points

### Used by:
- `apps/mcp-server` - MCP HTTP server
- AI assistants (Claude Desktop, etc.)
- Developer tools

### Uses:
- `@cgk/core` - Types
- `@cgk/db` - Data access
- `@cgk/auth` - User context
