/**
 * Table Tools
 *
 * MCP tools for Coda table and column management.
 */

import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import type { CodaClient } from '../client.js';
import { formatError, formatResponse } from '../utils/formatters.js';

/**
 * Register all table-related tools
 */
export function registerTableTools(server: McpServer, client: CodaClient): void {
  // ===========================================================================
  // List Tables
  // ===========================================================================
  server.tool(
    'coda_list_tables',
    `List tables and views in a Coda document.

Args:
  - docId: Document ID (required)
  - tableTypes: Filter by type ('table', 'view', or both)
  - sortBy: Sort by 'name', 'createdAt', or 'updatedAt'
  - limit: Number of tables to return
  - pageToken: Pagination token

Returns:
  Paginated list of tables with their type, row count, layout, and timestamps.`,
    {
      docId: z.string().describe('Document ID'),
      tableTypes: z.array(z.enum(['table', 'view'])).optional().describe('Filter by table type'),
      sortBy: z.enum(['name', 'createdAt', 'updatedAt']).optional().describe('Sort order'),
      limit: z.number().int().min(1).max(100).default(20),
      pageToken: z.string().optional(),
      format: z.enum(['json', 'markdown']).default('json'),
    },
    async ({ docId, tableTypes, sortBy, limit, pageToken, format }) => {
      try {
        const result = await client.listTables(docId, { tableTypes, sortBy, limit, pageToken });
        return formatResponse(result, format, 'tables');
      } catch (error) {
        return formatError(error);
      }
    }
  );

  // ===========================================================================
  // Get Table
  // ===========================================================================
  server.tool(
    'coda_get_table',
    `Get details for a specific table or view.

Args:
  - docId: Document ID
  - tableIdOrName: Table ID or name

Returns:
  Table details including type, row count, columns, layout, sorts, and filters.`,
    {
      docId: z.string().describe('Document ID'),
      tableIdOrName: z.string().describe('Table ID or name'),
      format: z.enum(['json', 'markdown']).default('json'),
    },
    async ({ docId, tableIdOrName, format }) => {
      try {
        const table = await client.getTable(docId, tableIdOrName);
        return formatResponse(table, format, 'table');
      } catch (error) {
        return formatError(error);
      }
    }
  );

  // ===========================================================================
  // List Columns
  // ===========================================================================
  server.tool(
    'coda_list_columns',
    `List columns in a table.

Args:
  - docId: Document ID
  - tableIdOrName: Table ID or name
  - limit: Number of columns to return
  - pageToken: Pagination token

Returns:
  Paginated list of columns with their ID, name, type, and format details.`,
    {
      docId: z.string().describe('Document ID'),
      tableIdOrName: z.string().describe('Table ID or name'),
      limit: z.number().int().min(1).max(100).default(50),
      pageToken: z.string().optional(),
      format: z.enum(['json', 'markdown']).default('json'),
    },
    async ({ docId, tableIdOrName, limit, pageToken, format }) => {
      try {
        const result = await client.listColumns(docId, tableIdOrName, { limit, pageToken });
        return formatResponse(result, format, 'columns');
      } catch (error) {
        return formatError(error);
      }
    }
  );

  // ===========================================================================
  // Get Column
  // ===========================================================================
  server.tool(
    'coda_get_column',
    `Get details for a specific column.

Args:
  - docId: Document ID
  - tableIdOrName: Table ID or name
  - columnIdOrName: Column ID or name

Returns:
  Column details including name, type, format, formula (if calculated), and default value.`,
    {
      docId: z.string().describe('Document ID'),
      tableIdOrName: z.string().describe('Table ID or name'),
      columnIdOrName: z.string().describe('Column ID or name'),
      format: z.enum(['json', 'markdown']).default('json'),
    },
    async ({ docId, tableIdOrName, columnIdOrName, format }) => {
      try {
        const column = await client.getColumn(docId, tableIdOrName, columnIdOrName);
        return formatResponse(column, format, 'column');
      } catch (error) {
        return formatError(error);
      }
    }
  );
}
