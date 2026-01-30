/**
 * Utility Tools
 *
 * MCP tools for Coda utility endpoints like user info, URL resolution, and mutation status.
 */

import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import type { CodaClient } from '../client.js';
import { formatError, formatResponse } from '../utils/formatters.js';

/**
 * Register all utility tools
 */
export function registerUtilityTools(server: McpServer, client: CodaClient): void {
  // ===========================================================================
  // Who Am I
  // ===========================================================================
  server.tool(
    'coda_whoami',
    `Get information about the current authenticated user.

Returns:
  User information including name, login ID, and workspace details.`,
    {},
    async () => {
      try {
        const user = await client.whoami();
        return formatResponse(user, 'json', 'user');
      } catch (error) {
        return formatError(error);
      }
    }
  );

  // ===========================================================================
  // Resolve Browser Link
  // ===========================================================================
  server.tool(
    'coda_resolve_browser_link',
    `Resolve a Coda URL to get metadata about the referenced object.

Converts a browser URL to API resource information.

Args:
  - url: The Coda URL to resolve (e.g., https://coda.io/d/...)
  - degradeGracefully: If true, resolves to the next-available parent object if the exact object is deleted

Returns:
  Resource information including type, ID, and href.`,
    {
      url: z.string().url().describe('Coda URL to resolve'),
      degradeGracefully: z.boolean().optional().default(false),
    },
    async ({ url, degradeGracefully }) => {
      try {
        const resource = await client.resolveBrowserLink(url, degradeGracefully);
        return formatResponse(resource, 'json', 'resource');
      } catch (error) {
        return formatError(error);
      }
    }
  );

  // ===========================================================================
  // Get Mutation Status
  // ===========================================================================
  server.tool(
    'coda_get_mutation_status',
    `Check the status of an asynchronous mutation.

Many write operations return a request ID and complete asynchronously.
Use this to check if a mutation has finished processing.

Args:
  - requestId: The request ID from a mutation response

Returns:
  Mutation status including whether it's completed and any warnings.`,
    {
      requestId: z.string().describe('Request ID from a mutation'),
    },
    async ({ requestId }) => {
      try {
        const status = await client.getMutationStatus(requestId);
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(status, null, 2),
            },
          ],
        };
      } catch (error) {
        return formatError(error);
      }
    }
  );
}
