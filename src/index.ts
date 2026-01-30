/**
 * Coda MCP Server - Main Entry Point
 *
 * This file sets up the MCP server using Cloudflare's Agents SDK.
 * It supports both stateless (McpServer) and stateful (McpAgent) modes.
 *
 * MULTI-TENANT ARCHITECTURE:
 * Tenant credentials (API keys) are parsed from request headers,
 * allowing a single server deployment to serve multiple customers.
 *
 * Required Headers:
 * - X-Coda-API-Key: API token for Coda authentication
 *
 * Optional Headers:
 * - X-Coda-Base-URL: Override the default Coda API base URL
 */

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { McpAgent } from 'agents/mcp';
import { createCodaClient } from './client.js';
import {
  registerAutomationTools,
  registerControlTools,
  registerDocTools,
  registerFormulaTools,
  registerPageTools,
  registerPermissionTools,
  registerPublishingTools,
  registerRowTools,
  registerTableTools,
  registerUtilityTools,
} from './tools/index.js';
import {
  type Env,
  type TenantCredentials,
  parseTenantCredentials,
  validateCredentials,
} from './types/env.js';

// =============================================================================
// MCP Server Configuration
// =============================================================================

const SERVER_NAME = 'primrose-mcp-coda';
const SERVER_VERSION = '1.0.0';

// =============================================================================
// MCP Agent (Stateful - uses Durable Objects)
// =============================================================================

/**
 * McpAgent provides stateful MCP sessions backed by Durable Objects.
 *
 * NOTE: For multi-tenant deployments, use the stateless mode instead.
 * The stateful McpAgent is better suited for single-tenant deployments.
 *
 * @deprecated For multi-tenant support, use stateless mode with per-request credentials
 */
export class CodaMcpAgent extends McpAgent<Env> {
  server = new McpServer({
    name: SERVER_NAME,
    version: SERVER_VERSION,
  });

  async init() {
    throw new Error(
      'Stateful mode (McpAgent) is not supported for multi-tenant deployments. ' +
        'Use the stateless /mcp endpoint with X-Coda-API-Key header instead.'
    );
  }
}

// =============================================================================
// Stateless MCP Server (Recommended - no Durable Objects needed)
// =============================================================================

/**
 * Creates a stateless MCP server instance with tenant-specific credentials.
 *
 * MULTI-TENANT: Each request provides credentials via headers, allowing
 * a single server deployment to serve multiple tenants.
 *
 * @param credentials - Tenant credentials parsed from request headers
 */
function createStatelessServer(credentials: TenantCredentials): McpServer {
  const server = new McpServer({
    name: SERVER_NAME,
    version: SERVER_VERSION,
  });

  // Create client with tenant-specific credentials
  const client = createCodaClient(credentials);

  // Register all tool groups
  registerDocTools(server, client);
  registerPageTools(server, client);
  registerTableTools(server, client);
  registerRowTools(server, client);
  registerFormulaTools(server, client);
  registerControlTools(server, client);
  registerAutomationTools(server, client);
  registerPermissionTools(server, client);
  registerPublishingTools(server, client);
  registerUtilityTools(server, client);

  // Test connection tool
  server.tool('coda_test_connection', 'Test the connection to the Coda API', {}, async () => {
    try {
      const result = await client.testConnection();
      return {
        content: [{ type: 'text', text: JSON.stringify(result, null, 2) }],
      };
    } catch (error) {
      return {
        content: [
          {
            type: 'text',
            text: `Connection failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
          },
        ],
        isError: true,
      };
    }
  });

  return server;
}

// =============================================================================
// Worker Export
// =============================================================================

export default {
  /**
   * Main fetch handler for the Worker
   */
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    const url = new URL(request.url);

    // Health check endpoint
    if (url.pathname === '/health') {
      return new Response(JSON.stringify({ status: 'ok', server: SERVER_NAME }), {
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // ==========================================================================
    // Stateless MCP with Streamable HTTP (Recommended for multi-tenant)
    // ==========================================================================
    if (url.pathname === '/mcp' && request.method === 'POST') {
      // Parse tenant credentials from request headers
      const credentials = parseTenantCredentials(request);

      // Validate credentials are present
      try {
        validateCredentials(credentials);
      } catch (error) {
        return new Response(
          JSON.stringify({
            error: 'Unauthorized',
            message: error instanceof Error ? error.message : 'Invalid credentials',
            required_headers: ['X-Coda-API-Key'],
          }),
          {
            status: 401,
            headers: { 'Content-Type': 'application/json' },
          }
        );
      }

      // Create server with tenant-specific credentials
      const server = createStatelessServer(credentials);

      // Import and use createMcpHandler for streamable HTTP
      const { createMcpHandler } = await import('agents/mcp');
      const handler = createMcpHandler(server);
      return handler(request, env, ctx);
    }

    // SSE endpoint for legacy clients
    if (url.pathname === '/sse') {
      return new Response('SSE endpoint requires Durable Objects. Enable in wrangler.jsonc.', {
        status: 501,
      });
    }

    // Default response
    return new Response(
      JSON.stringify({
        name: SERVER_NAME,
        version: SERVER_VERSION,
        description: 'Coda MCP Server - Multi-tenant API for Coda documents',
        endpoints: {
          mcp: '/mcp (POST) - Streamable HTTP MCP endpoint',
          health: '/health - Health check',
        },
        authentication: {
          description: 'Pass tenant credentials via request headers',
          required_headers: {
            'X-Coda-API-Key': 'Your Coda API token (Bearer token)',
          },
          optional_headers: {
            'X-Coda-Base-URL': 'Override the default Coda API base URL',
          },
        },
        tools: [
          // Docs
          'coda_list_docs',
          'coda_get_doc',
          'coda_create_doc',
          'coda_delete_doc',
          // Pages
          'coda_list_pages',
          'coda_get_page',
          'coda_create_page',
          'coda_update_page',
          // Tables
          'coda_list_tables',
          'coda_get_table',
          'coda_list_columns',
          'coda_get_column',
          // Rows
          'coda_list_rows',
          'coda_get_row',
          'coda_upsert_rows',
          'coda_update_row',
          'coda_delete_row',
          'coda_delete_rows',
          'coda_push_button',
          // Formulas
          'coda_list_formulas',
          'coda_get_formula',
          // Controls
          'coda_list_controls',
          'coda_get_control',
          // Automations
          'coda_list_automations',
          'coda_trigger_automation',
          // Permissions
          'coda_get_sharing_metadata',
          'coda_list_permissions',
          'coda_add_permission',
          'coda_delete_permission',
          'coda_get_acl_settings',
          'coda_update_acl_settings',
          // Publishing
          'coda_list_categories',
          'coda_publish_doc',
          'coda_unpublish_doc',
          // Utilities
          'coda_whoami',
          'coda_resolve_browser_link',
          'coda_get_mutation_status',
          'coda_test_connection',
        ],
      }),
      {
        headers: { 'Content-Type': 'application/json' },
      }
    );
  },
};
