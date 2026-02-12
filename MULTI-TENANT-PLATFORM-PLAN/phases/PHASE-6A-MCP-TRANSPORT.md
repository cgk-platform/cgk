# PHASE-6A: MCP Transport Layer

> **STATUS**: COMPLETE (2026-02-12)

**Duration**: 1 week (Week 22)
**Depends On**: PHASE-5E (Jobs scheduled tasks complete)
**Parallel With**: None
**Blocks**: PHASE-6B (MCP Tools)

---

## Goal

Implement Streamable HTTP transport for the MCP server, replacing the deprecated SSE transport. This enables per-request authentication, stateless scaling, and bidirectional communication required by protocol version 2025-03-26+.

---

## Success Criteria

- [x] POST `/api/mcp` endpoint handles all MCP message types
- [x] Per-request authentication validates tenant and user on every call
- [x] Protocol version validation rejects unsupported versions
- [x] Streaming responses work for long-running tools
- [x] Session management tracks active MCP sessions
- [x] Token usage logging captures all tool invocations
- [x] Edge runtime compatible (no Node.js-only APIs)

---

## Deliverables

### API Route
- `apps/mcp-server/src/app/api/mcp/route.ts` - Main POST handler

### Core Package
- `packages/mcp/src/handler.ts` - MCPHandler class
- `packages/mcp/src/session.ts` - Session management (createMCPSession)
- `packages/mcp/src/streaming.ts` - Streaming response utilities
- `packages/mcp/src/types.ts` - MCP protocol types

### Authentication
- `apps/mcp-server/src/lib/auth.ts` - authenticateRequest function

---

## Constraints

- MUST use Streamable HTTP transport (NOT SSE - deprecated in protocol 2024-11-05)
- MUST authenticate every request (no session-based auth)
- MUST support protocol versions: 2024-11-05, 2025-03-26, 2025-06-18
- MUST use Edge runtime for global deployment
- MUST NOT block on streaming tools (use async generators)

---

## Pattern References

**Skills to invoke:**
- `/mcp-builder` - REQUIRED before any MCP work; contains transport patterns, tool naming conventions, response formats

**MCPs to consult:**
- Context7 MCP: "MCP TypeScript SDK streamable HTTP transport"
- Context7 MCP: "MCP protocol version 2025-03-26 specification"

**RAWDOG code to reference:**
- `src/app/api/mcp/route.ts` - Current MCP implementation patterns
- `src/lib/auth/debug.ts` - Authentication wrapper pattern (getAuthUserId)

**Spec documents:**
- `ARCHITECTURE.md` - Multi-tenant context injection patterns

---

## AI Discretion Areas

The implementing agent determined the following approaches:

1. **Session storage strategy**: In-memory storage with TTL (30 min) for Edge runtime compatibility. Sessions are ephemeral per-request in Streamable HTTP transport.

2. **Token usage log schema**: In-memory storage per-tenant with FIFO cleanup (max 1000 entries). Schema includes: sessionId, tenantId, userId, method, tool/resource/prompt name, timestamps, duration, success/error.

3. **Error response formatting**: JSON-RPC 2.0 compliant with standard error codes (-32700 to -32603) plus MCP-specific codes (-32000 to -32005).

4. **Streaming chunk format**: NDJSON (newline-delimited JSON) with chunk types: progress, partial, complete, error. Each line is a complete JSON-RPC response.

5. **Protocol version negotiation**: Exact match required. Supported versions: 2024-11-05, 2025-03-26, 2025-06-18. Returns error -32000 for unsupported versions.

---

## Tasks

### [PARALLEL] Foundation Setup
- [x] Create `packages/mcp/` package structure with package.json
- [x] Define MCP protocol types (MCPMessage, MCPResponse, MCPError)
- [x] Create session types and createMCPSession function
- [x] Implement authenticateRequest with tenant/user extraction

### [SEQUENTIAL after Foundation] Handler Implementation
- [x] Implement MCPHandler class with constructor (tenantId, userId)
- [x] Add `initialize()` method with protocol version validation
- [x] Add `listTools()` method with token usage logging
- [x] Add `callTool()` method with timing and error handling
- [x] Add `listResources()` method
- [x] Add `readResource()` method

### [SEQUENTIAL after Handler] Streaming Support
- [x] Define STREAMING_TOOLS list (search_orders, export_analytics, bulk_update)
- [x] Implement `requiresStreaming()` method
- [x] Implement `callToolStreaming()` async generator
- [x] Create `streamingResponse()` helper for ReadableStream construction

### [SEQUENTIAL after Streaming] Route Assembly
- [x] Create POST handler at `/api/mcp/route.ts`
- [x] Wire up message routing (switch on message.method)
- [x] Add streaming response branching for applicable tools
- [x] Add error handling for unknown methods (code: -32601)
- [x] Configure Edge runtime

---

## Definition of Done

- [x] All MCP message types handled correctly (initialize, tools/list, tools/call, resources/list, resources/read)
- [x] Authentication fails gracefully with 401 for invalid requests
- [x] Streaming responses deliver chunks without blocking
- [x] Session IDs generated and tracked per client connection
- [x] Token usage logged for analytics
- [x] `npx tsc --noEmit` passes
- [ ] Manual testing confirms protocol compliance (requires deployment)

---

## Implementation Summary

### Files Created/Updated

**packages/mcp/src/types.ts** - Complete JSON-RPC 2.0 and MCP protocol types including:
- Protocol version types and constants
- JSON-RPC request/response types
- MCP message types (initialize, tools, resources, prompts)
- Session and token usage types
- Error codes

**packages/mcp/src/handler.ts** - MCPHandler class:
- Constructor with tenantId/userId for tenant isolation
- initialize() with protocol version validation
- Tool, resource, and prompt registration
- callTool() and callToolStreaming() methods
- Token usage tracking integration

**packages/mcp/src/session.ts** - Session management:
- createMCPSession() for session creation
- In-memory storage with 30-min TTL
- Token usage logging and statistics
- Protocol version validation helpers

**packages/mcp/src/streaming.ts** - Streaming utilities:
- STREAMING_TOOLS constant with long-running tool names
- Progress, partial, complete, and error chunk creators
- createStreamingResponse() for ReadableStream construction
- Batch processing helper for large data operations

**apps/mcp-server/** - Next.js MCP server app:
- Edge runtime configuration
- POST /api/mcp route with method routing
- authenticateRequest() supporting JWT, API key, and cookie auth
- Status page at /
- CLAUDE.md documentation

### Key Design Decisions

1. **Edge Runtime First**: All code uses Web Crypto API instead of Node.js crypto. Sessions are in-memory per-request.

2. **Per-Request Handler**: Each request creates a new MCPHandler with tenant/user context. No global state.

3. **Streaming via NDJSON**: Long-running tools stream results as newline-delimited JSON for easy client parsing.

4. **Triple Auth Support**: Supports Bearer JWT, API key (X-API-Key header), and session cookie authentication.
