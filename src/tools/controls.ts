/**
 * Control Tools
 *
 * MCP tools for Coda controls (buttons, sliders, checkboxes, etc.).
 */

import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import type { CodaClient } from '../client.js';
import { formatError, formatResponse } from '../utils/formatters.js';

/**
 * Register all control-related tools
 */
export function registerControlTools(server: McpServer, client: CodaClient): void {
  // ===========================================================================
  // List Controls
  // ===========================================================================
  server.tool(
    'coda_list_controls',
    `List controls in a Coda document.

Controls are interactive elements like buttons, sliders, checkboxes, date pickers, etc.

Args:
  - docId: Document ID (required)
  - limit: Number of controls to return
  - pageToken: Pagination token

Returns:
  Paginated list of controls with their types and current values.`,
    {
      docId: z.string().describe('Document ID'),
      limit: z.number().int().min(1).max(100).default(50),
      pageToken: z.string().optional(),
      format: z.enum(['json', 'markdown']).default('json'),
    },
    async ({ docId, limit, pageToken, format }) => {
      try {
        const result = await client.listControls(docId, { limit, pageToken });
        return formatResponse(result, format, 'controls');
      } catch (error) {
        return formatError(error);
      }
    }
  );

  // ===========================================================================
  // Get Control
  // ===========================================================================
  server.tool(
    'coda_get_control',
    `Get the current value of a control.

Args:
  - docId: Document ID
  - controlIdOrName: Control ID or name

Returns:
  Control details including name, type, and current value.`,
    {
      docId: z.string().describe('Document ID'),
      controlIdOrName: z.string().describe('Control ID or name'),
      format: z.enum(['json', 'markdown']).default('json'),
    },
    async ({ docId, controlIdOrName, format }) => {
      try {
        const control = await client.getControl(docId, controlIdOrName);
        return formatResponse(control, format, 'control');
      } catch (error) {
        return formatError(error);
      }
    }
  );
}
