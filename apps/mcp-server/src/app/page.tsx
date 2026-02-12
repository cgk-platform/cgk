import { CURRENT_PROTOCOL_VERSION, SUPPORTED_PROTOCOL_VERSIONS } from '@cgk/mcp'

export const dynamic = 'force-dynamic'

export default function MCPServerStatusPage() {
  return (
    <main>
      <h1>CGK MCP Server</h1>
      <p>Model Context Protocol server for CGK Commerce Platform.</p>

      <section style={{ marginTop: '2rem' }}>
        <h2>Server Status</h2>
        <table
          style={{
            borderCollapse: 'collapse',
            marginTop: '1rem',
          }}
        >
          <tbody>
            <tr>
              <td style={{ padding: '0.5rem', fontWeight: 'bold' }}>Status:</td>
              <td style={{ padding: '0.5rem', color: 'green' }}>Running</td>
            </tr>
            <tr>
              <td style={{ padding: '0.5rem', fontWeight: 'bold' }}>Protocol Version:</td>
              <td style={{ padding: '0.5rem' }}>{CURRENT_PROTOCOL_VERSION}</td>
            </tr>
            <tr>
              <td style={{ padding: '0.5rem', fontWeight: 'bold' }}>Supported Versions:</td>
              <td style={{ padding: '0.5rem' }}>{SUPPORTED_PROTOCOL_VERSIONS.join(', ')}</td>
            </tr>
            <tr>
              <td style={{ padding: '0.5rem', fontWeight: 'bold' }}>Transport:</td>
              <td style={{ padding: '0.5rem' }}>Streamable HTTP (POST)</td>
            </tr>
            <tr>
              <td style={{ padding: '0.5rem', fontWeight: 'bold' }}>Endpoint:</td>
              <td style={{ padding: '0.5rem' }}>
                <code>/api/mcp</code>
              </td>
            </tr>
          </tbody>
        </table>
      </section>

      <section style={{ marginTop: '2rem' }}>
        <h2>Authentication</h2>
        <p>All requests to <code>/api/mcp</code> require authentication:</p>
        <ul>
          <li>
            <strong>Bearer Token:</strong>{' '}
            <code>Authorization: Bearer &lt;jwt&gt;</code>
          </li>
          <li>
            <strong>API Key:</strong>{' '}
            <code>X-API-Key: cgk_&lt;tenant&gt;_&lt;key_id&gt;_&lt;secret&gt;</code>
          </li>
          <li>
            <strong>Session Cookie:</strong>{' '}
            <code>Cookie: cgk-auth=&lt;jwt&gt;</code>
          </li>
        </ul>
      </section>

      <section style={{ marginTop: '2rem' }}>
        <h2>Usage</h2>
        <p>Send JSON-RPC 2.0 requests to the endpoint:</p>
        <pre
          style={{
            background: '#f5f5f5',
            padding: '1rem',
            borderRadius: '4px',
            overflow: 'auto',
          }}
        >
          {`POST /api/mcp HTTP/1.1
Content-Type: application/json
Authorization: Bearer <your-jwt>

{
  "jsonrpc": "2.0",
  "id": 1,
  "method": "initialize",
  "params": {
    "protocolVersion": "${CURRENT_PROTOCOL_VERSION}",
    "capabilities": {},
    "clientInfo": {
      "name": "my-client",
      "version": "1.0.0"
    }
  }
}`}
        </pre>
      </section>

      <section style={{ marginTop: '2rem' }}>
        <h2>Available Methods</h2>
        <ul>
          <li><code>initialize</code> - Initialize the MCP session</li>
          <li><code>initialized</code> - Confirm initialization complete</li>
          <li><code>ping</code> - Check server health</li>
          <li><code>tools/list</code> - List available tools</li>
          <li><code>tools/call</code> - Execute a tool</li>
          <li><code>resources/list</code> - List available resources</li>
          <li><code>resources/read</code> - Read a resource</li>
          <li><code>prompts/list</code> - List available prompts</li>
          <li><code>prompts/get</code> - Get a prompt</li>
        </ul>
      </section>
    </main>
  )
}
