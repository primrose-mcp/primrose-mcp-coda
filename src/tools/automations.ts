/**
 * Automation Tools
 *
 * MCP tools for Coda automations (rules and triggers).
 */

import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import type { CodaClient } from '../client.js';
import { formatError, formatResponse } from '../utils/formatters.js';

/**
 * Register all automation-related tools
 */
export function registerAutomationTools(server: McpServer, client: CodaClient): void {
  // ===========================================================================
  // List Automations
  // ===========================================================================
  server.tool(
    'coda_list_automations',
    `List automation rules in a Coda document.

Automations are rules that automatically perform actions based on triggers.

Args:
  - docId: Document ID (required)
  - limit: Number of automations to return
  - pageToken: Pagination token

Returns:
  Paginated list of automation rules with their names, triggers, and enabled status.`,
    {
      docId: z.string().describe('Document ID'),
      limit: z.number().int().min(1).max(100).default(50),
      pageToken: z.string().optional(),
      format: z.enum(['json', 'markdown']).default('json'),
    },
    async ({ docId, limit, pageToken, format }) => {
      try {
        const result = await client.listAutomations(docId, { limit, pageToken });
        return formatResponse(result, format, 'automations');
      } catch (error) {
        return formatError(error);
      }
    }
  );

  // ===========================================================================
  // Trigger Automation
  // ===========================================================================
  server.tool(
    'coda_trigger_automation',
    `Trigger a webhook-enabled automation rule.

Only automations with webhook triggers can be triggered via API.

Args:
  - docId: Document ID (required)
  - ruleId: Automation rule ID (required)
  - message: Optional message payload to pass to the automation

Returns:
  Request ID for tracking the automation execution.`,
    {
      docId: z.string().describe('Document ID'),
      ruleId: z.string().describe('Automation rule ID'),
      message: z.string().optional().describe('Message payload'),
    },
    async ({ docId, ruleId, message }) => {
      try {
        const payload = message ? { message } : undefined;
        const result = await client.triggerAutomation(docId, ruleId, payload);
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(
                { success: true, message: 'Automation triggered', ...result },
                null,
                2
              ),
            },
          ],
        };
      } catch (error) {
        return formatError(error);
      }
    }
  );
}
