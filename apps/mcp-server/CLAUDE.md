# CGK MCP Server - AI Development Guide

> **App Version**: 0.1.0
> **Last Updated**: 2026-02-12
> **Port**: 3500

---

## Purpose

MCP (Model Context Protocol) server for the CGK Commerce Platform. Provides AI assistants (like Claude) with access to commerce data, order management, and platform functionality through a standardized protocol.

**Key Features:**
- Streamable HTTP transport (POST-based)
- Per-request authentication
- Tenant isolation
- Streaming responses for long-running tools
- Token usage logging

---

## Quick Start

```bash
# Development
pnpm --filter cgk-mcp-server dev

# Type check
pnpm --filter cgk-mcp-server typecheck

# Build
pnpm --filter cgk-mcp-server build
```

---

## Architecture

```
apps/mcp-server/
├── src/
│   ├── app/
│   │   ├── api/
│   │   │   └── mcp/
│   │   │       └── route.ts    # Main MCP endpoint
│   │   ├── layout.tsx          # Root layout
│   │   └── page.tsx            # Status page
│   └── lib/
│       └── auth.ts             # Authentication utilities
├── package.json
├── next.config.js
└── tsconfig.json
```

---

## Key Patterns

### Pattern 1: MCP Request Flow

```
1. Request arrives at POST /api/mcp
2. authenticateRequest() extracts tenant/user from JWT/API key
3. MCPHandler created with tenant/user context
4. Method routed (initialize, tools/call, etc.)
5. Response returned as JSON-RPC 2.0
```

### Pattern 2: Authentication

```typescript
// Bearer token (JWT)
Authorization: Bearer <jwt>

// API key
X-API-Key: cgk_<tenant>_<key_id>_<secret>

// Session cookie
Cookie: cgk-auth=<jwt>
```

All methods require authentication. The handler receives `tenantId` and `userId` from the auth result.

### Pattern 3: Adding New Tools

```typescript
// In route.ts, add to exampleTools array:
import { defineTool, textResult, jsonResult } from '@cgk-platform/mcp'

const newTool = defineTool({
  name: 'get_orders',
  description: 'Get recent orders for the tenant',
  inputSchema: {
    type: 'object',
    properties: {
      limit: { type: 'number', default: 10 },
      status: { type: 'string', enum: ['pending', 'shipped', 'delivered'] },
    },
  },
  async handler(args) {
    // Use tenant context from handler
    const orders = await getOrders(args.limit, args.status)
    return jsonResult(orders)
  },
})

// Register with handler
handler.registerTool(newTool)
```

### Pattern 4: Streaming Tools

For long-running operations, return an async generator:

```typescript
const streamingTool = defineTool({
  name: 'export_analytics',
  description: 'Export large analytics dataset',
  inputSchema: { type: 'object', properties: {} },
  streaming: true,
  async *handler(args) {
    // Yield progress updates
    yield progressChunk(0, 'Starting export...')

    for (let i = 0; i < 100; i++) {
      const data = await fetchBatch(i)
      yield partialChunk([{ type: 'text', text: JSON.stringify(data) }], i)
      yield progressChunk(i + 1, `Processed batch ${i + 1}`)
    }

    yield completeChunk({
      content: [{ type: 'text', text: 'Export complete' }],
      isError: false,
    })
  },
})
```

---

## File Map

| File | Purpose | Key Exports |
|------|---------|-------------|
| `route.ts` | MCP endpoint handler | `POST`, `OPTIONS` |
| `auth.ts` | Request authentication | `authenticateRequest`, `MCPAuthError` |
| `page.tsx` | Status page | Server info display |

---

## API Reference

### POST /api/mcp

Main MCP endpoint. Accepts JSON-RPC 2.0 requests.

**Request:**
```json
{
  "jsonrpc": "2.0",
  "id": 1,
  "method": "tools/list",
  "params": {}
}
```

**Response:**
```json
{
  "jsonrpc": "2.0",
  "id": 1,
  "result": {
    "tools": [
      {
        "name": "get_tenant_info",
        "description": "Get information about the current tenant",
        "inputSchema": { "type": "object", "properties": {} }
      }
    ]
  }
}
```

### Methods

| Method | Description | Params |
|--------|-------------|--------|
| `initialize` | Initialize session | `protocolVersion`, `capabilities`, `clientInfo` |
| `initialized` | Confirm init complete | None |
| `ping` | Health check | None |
| `tools/list` | List available tools | None |
| `tools/call` | Execute a tool | `name`, `arguments` |
| `resources/list` | List resources | None |
| `resources/read` | Read a resource | `uri` |
| `prompts/list` | List prompts | None |
| `prompts/get` | Get a prompt | `name`, `arguments` |

---

## Error Codes

| Code | Name | HTTP Status |
|------|------|-------------|
| -32700 | Parse Error | 400 |
| -32600 | Invalid Request | 400 |
| -32601 | Method Not Found | 404 |
| -32602 | Invalid Params | 400 |
| -32603 | Internal Error | 500 |
| -32000 | Protocol Version Unsupported | 400 |
| -32001 | Authentication Required | 401 |
| -32002 | Authorization Failed | 403 |
| -32003 | Resource Not Found | 404 |
| -32004 | Tool Execution Error | 500 |
| -32005 | Session Expired | 401 |

---

## Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `JWT_SECRET` | Yes | JWT signing secret |
| `DATABASE_URL` | No | For API key validation (future) |

---

## Testing

### Manual Testing with curl

```bash
# Initialize session
curl -X POST http://localhost:3500/api/mcp \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <jwt>" \
  -d '{
    "jsonrpc": "2.0",
    "id": 1,
    "method": "initialize",
    "params": {
      "protocolVersion": "2025-06-18",
      "capabilities": {},
      "clientInfo": { "name": "test", "version": "1.0" }
    }
  }'

# List tools
curl -X POST http://localhost:3500/api/mcp \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <jwt>" \
  -d '{
    "jsonrpc": "2.0",
    "id": 2,
    "method": "tools/list"
  }'
```

### Integration with Claude Desktop

Add to Claude Desktop's MCP configuration:

```json
{
  "mcpServers": {
    "cgk": {
      "url": "https://mcp.your-domain.com/api/mcp",
      "headers": {
        "Authorization": "Bearer <jwt>"
      }
    }
  }
}
```

---

## Deployment

### Edge Runtime

This app uses Edge runtime for global deployment:

```typescript
export const runtime = 'edge'
```

**Constraints:**
- No Node.js-only APIs (use Web Crypto, not `crypto` module)
- No file system access
- Sessions are in-memory (stateless per request)

### Vercel Configuration

The app is deployed to Vercel. Ensure these settings:
- Region: Auto (Edge)
- Framework: Next.js
- Node.js Version: 22.x

---

## Common Gotchas

### 1. Authentication Required

All MCP requests require authentication. Without it:
```json
{
  "jsonrpc": "2.0",
  "id": null,
  "error": {
    "code": -32001,
    "message": "Authentication required"
  }
}
```

### 2. Tenant Context Required

JWTs must include `orgId` claim for tenant context:
```typescript
// In JWT payload
{
  "sub": "user_123",
  "orgId": "tenant_abc",  // Required!
  // ...
}
```

### 3. Edge Runtime Limitations

No Node.js `crypto` module - use Web Crypto API:
```typescript
// WRONG
import { createHash } from 'crypto'

// CORRECT
await crypto.subtle.digest('SHA-256', data)
```

### 4. Streaming Response Format

Streaming responses use NDJSON (newline-delimited JSON):
```
{"jsonrpc":"2.0","id":1,"result":{"type":"progress","progress":0}}
{"jsonrpc":"2.0","id":1,"result":{"type":"partial","content":[...],"index":0}}
{"jsonrpc":"2.0","id":1,"result":{"type":"complete","result":{...}}}
```

---

## Dependencies

| Package | Why |
|---------|-----|
| `@cgk-platform/mcp` | MCP protocol handling |
| `@cgk-platform/auth` | JWT verification |
| `@cgk-platform/core` | Shared types |
| `@cgk-platform/db` | Database access (future) |
| `next` | Framework |
| `react` | Required by Next.js |

---

## Related Documentation

- `packages/mcp/CLAUDE.md` - MCP package guide
- `MULTI-TENANT-PLATFORM-PLAN/phases/PHASE-6A-MCP-TRANSPORT.md` - Phase spec
- `MULTI-TENANT-PLATFORM-PLAN/phases/PHASE-6B-MCP-TOOLS.md` - Tools phase

---

## Future Enhancements (Phase 6B+)

- [ ] Real tool implementations (orders, products, analytics)
- [ ] API key management in database
- [ ] Rate limiting per tenant
- [ ] Tool-level permissions
- [ ] Resource subscriptions
- [ ] Prompt templates from database
