/**
 * Row Tools
 *
 * MCP tools for Coda row operations including CRUD and button pushing.
 */

import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import type { CodaClient } from '../client.js';
import type { CellInput } from '../types/entities.js';
import { formatError, formatResponse } from '../utils/formatters.js';

/**
 * Register all row-related tools
 */
export function registerRowTools(server: McpServer, client: CodaClient): void {
  // ===========================================================================
  // List Rows
  // ===========================================================================
  server.tool(
    'coda_list_rows',
    `List rows in a table.

Args:
  - docId: Document ID (required)
  - tableIdOrName: Table ID or name (required)
  - query: Filter rows using a query (e.g., "Status:Active")
  - sortBy: Column ID or name to sort by (prefix with '-' for descending)
  - useColumnNames: Use column names instead of IDs in response
  - valueFormat: Value format ('simple', 'simpleWithArrays', 'rich')
  - visibleOnly: Only return visible rows
  - limit: Number of rows to return
  - pageToken: Pagination token

Returns:
  Paginated list of rows with their values.`,
    {
      docId: z.string().describe('Document ID'),
      tableIdOrName: z.string().describe('Table ID or name'),
      query: z.string().optional().describe('Filter query (e.g., "Status:Active")'),
      sortBy: z.string().optional().describe('Column to sort by'),
      useColumnNames: z.boolean().optional().default(true).describe('Use column names in response'),
      valueFormat: z.enum(['simple', 'simpleWithArrays', 'rich']).optional().describe('Value format'),
      visibleOnly: z.boolean().optional().describe('Only visible rows'),
      limit: z.number().int().min(1).max(500).default(100),
      pageToken: z.string().optional(),
      format: z.enum(['json', 'markdown']).default('json'),
    },
    async ({ docId, tableIdOrName, format, ...params }) => {
      try {
        const result = await client.listRows(docId, tableIdOrName, params);
        return formatResponse(result, format, 'rows');
      } catch (error) {
        return formatError(error);
      }
    }
  );

  // ===========================================================================
  // Get Row
  // ===========================================================================
  server.tool(
    'coda_get_row',
    `Get a single row from a table.

Args:
  - docId: Document ID
  - tableIdOrName: Table ID or name
  - rowIdOrName: Row ID or name (display column value)
  - useColumnNames: Use column names instead of IDs

Returns:
  Row details with all column values.`,
    {
      docId: z.string().describe('Document ID'),
      tableIdOrName: z.string().describe('Table ID or name'),
      rowIdOrName: z.string().describe('Row ID or name'),
      useColumnNames: z.boolean().optional().default(true),
      format: z.enum(['json', 'markdown']).default('json'),
    },
    async ({ docId, tableIdOrName, rowIdOrName, useColumnNames, format }) => {
      try {
        const row = await client.getRow(docId, tableIdOrName, rowIdOrName, useColumnNames);
        return formatResponse(row, format, 'row');
      } catch (error) {
        return formatError(error);
      }
    }
  );

  // ===========================================================================
  // Insert/Upsert Rows
  // ===========================================================================
  server.tool(
    'coda_upsert_rows',
    `Insert or upsert rows into a table.

When keyColumns is provided, rows matching the key columns will be updated instead of inserted.

Args:
  - docId: Document ID (required)
  - tableIdOrName: Table ID or name (required)
  - rows: Array of rows to insert/upsert. Each row has cells: [{ column: 'ColName', value: 'Value' }]
  - keyColumns: Column names/IDs to use for upsert matching
  - disableParsing: Disable Coda's value parsing

Returns:
  The request ID and list of added/updated row IDs.`,
    {
      docId: z.string().describe('Document ID'),
      tableIdOrName: z.string().describe('Table ID or name'),
      rows: z.array(
        z.object({
          cells: z.array(
            z.object({
              column: z.string().describe('Column ID or name'),
              value: z.any().describe('Cell value'),
            })
          ),
        })
      ).describe('Rows to insert/upsert'),
      keyColumns: z.array(z.string()).optional().describe('Key columns for upsert'),
      disableParsing: z.boolean().optional().default(false),
    },
    async ({ docId, tableIdOrName, rows, keyColumns, disableParsing }) => {
      try {
        const result = await client.upsertRows(
          docId,
          tableIdOrName,
          { rows, keyColumns },
          disableParsing
        );
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(
                {
                  success: true,
                  message: `Upserted ${result.addedRowIds?.length || 0} rows`,
                  ...result,
                },
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

  // ===========================================================================
  // Update Row
  // ===========================================================================
  server.tool(
    'coda_update_row',
    `Update a single row in a table.

Args:
  - docId: Document ID (required)
  - tableIdOrName: Table ID or name (required)
  - rowIdOrName: Row ID or name to update (required)
  - cells: Array of cells to update: [{ column: 'ColName', value: 'NewValue' }]
  - disableParsing: Disable Coda's value parsing

Returns:
  The request ID and row ID.`,
    {
      docId: z.string().describe('Document ID'),
      tableIdOrName: z.string().describe('Table ID or name'),
      rowIdOrName: z.string().describe('Row ID or name to update'),
      cells: z.array(
        z.object({
          column: z.string().describe('Column ID or name'),
          value: z.any().describe('New cell value'),
        })
      ).describe('Cells to update'),
      disableParsing: z.boolean().optional().default(false),
    },
    async ({ docId, tableIdOrName, rowIdOrName, cells, disableParsing }) => {
      try {
        const result = await client.updateRow(
          docId,
          tableIdOrName,
          rowIdOrName,
          { cells: cells as CellInput[] },
          disableParsing
        );
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(
                { success: true, message: `Row ${result.id} updated`, ...result },
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

  // ===========================================================================
  // Delete Row
  // ===========================================================================
  server.tool(
    'coda_delete_row',
    `Delete a single row from a table.

Args:
  - docId: Document ID
  - tableIdOrName: Table ID or name
  - rowIdOrName: Row ID or name to delete

Returns:
  The request ID and deleted row ID.`,
    {
      docId: z.string().describe('Document ID'),
      tableIdOrName: z.string().describe('Table ID or name'),
      rowIdOrName: z.string().describe('Row ID or name to delete'),
    },
    async ({ docId, tableIdOrName, rowIdOrName }) => {
      try {
        const result = await client.deleteRow(docId, tableIdOrName, rowIdOrName);
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(
                { success: true, message: `Row ${result.id} deleted`, ...result },
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

  // ===========================================================================
  // Delete Multiple Rows
  // ===========================================================================
  server.tool(
    'coda_delete_rows',
    `Delete multiple rows from a table.

Args:
  - docId: Document ID
  - tableIdOrName: Table ID or name
  - rowIds: Array of row IDs to delete

Returns:
  The request ID and list of deleted row IDs.`,
    {
      docId: z.string().describe('Document ID'),
      tableIdOrName: z.string().describe('Table ID or name'),
      rowIds: z.array(z.string()).describe('Row IDs to delete'),
    },
    async ({ docId, tableIdOrName, rowIds }) => {
      try {
        const result = await client.deleteRows(docId, tableIdOrName, rowIds);
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(
                { success: true, message: `Deleted ${result.rowIds.length} rows`, ...result },
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

  // ===========================================================================
  // Push Button
  // ===========================================================================
  server.tool(
    'coda_push_button',
    `Push a button in a table row.

Args:
  - docId: Document ID
  - tableIdOrName: Table ID or name
  - rowIdOrName: Row ID or name
  - columnIdOrName: Button column ID or name

Returns:
  The request ID and confirmation.`,
    {
      docId: z.string().describe('Document ID'),
      tableIdOrName: z.string().describe('Table ID or name'),
      rowIdOrName: z.string().describe('Row ID or name'),
      columnIdOrName: z.string().describe('Button column ID or name'),
    },
    async ({ docId, tableIdOrName, rowIdOrName, columnIdOrName }) => {
      try {
        const result = await client.pushButton(docId, tableIdOrName, rowIdOrName, columnIdOrName);
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(
                { success: true, message: 'Button pushed', ...result },
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
