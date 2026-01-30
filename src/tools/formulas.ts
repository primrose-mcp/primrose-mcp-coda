/**
 * Formula Tools
 *
 * MCP tools for Coda named formulas.
 */

import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import type { CodaClient } from '../client.js';
import { formatError, formatResponse } from '../utils/formatters.js';

/**
 * Register all formula-related tools
 */
export function registerFormulaTools(server: McpServer, client: CodaClient): void {
  // ===========================================================================
  // List Formulas
  // ===========================================================================
  server.tool(
    'coda_list_formulas',
    `List named formulas in a Coda document.

Named formulas are reusable formulas defined in a doc that can be referenced elsewhere.

Args:
  - docId: Document ID (required)
  - limit: Number of formulas to return
  - pageToken: Pagination token

Returns:
  Paginated list of formulas with their names and current values.`,
    {
      docId: z.string().describe('Document ID'),
      limit: z.number().int().min(1).max(100).default(50),
      pageToken: z.string().optional(),
      format: z.enum(['json', 'markdown']).default('json'),
    },
    async ({ docId, limit, pageToken, format }) => {
      try {
        const result = await client.listFormulas(docId, { limit, pageToken });
        return formatResponse(result, format, 'formulas');
      } catch (error) {
        return formatError(error);
      }
    }
  );

  // ===========================================================================
  // Get Formula
  // ===========================================================================
  server.tool(
    'coda_get_formula',
    `Get the current value of a named formula.

Args:
  - docId: Document ID
  - formulaIdOrName: Formula ID or name

Returns:
  Formula details including name and current computed value.`,
    {
      docId: z.string().describe('Document ID'),
      formulaIdOrName: z.string().describe('Formula ID or name'),
      format: z.enum(['json', 'markdown']).default('json'),
    },
    async ({ docId, formulaIdOrName, format }) => {
      try {
        const formula = await client.getFormula(docId, formulaIdOrName);
        return formatResponse(formula, format, 'formula');
      } catch (error) {
        return formatError(error);
      }
    }
  );
}
