/**
 * Doc Tools
 *
 * MCP tools for Coda document management.
 */

import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import type { CodaClient } from '../client.js';
import { formatError, formatResponse } from '../utils/formatters.js';

/**
 * Register all doc-related tools
 */
export function registerDocTools(server: McpServer, client: CodaClient): void {
  // ===========================================================================
  // List Docs
  // ===========================================================================
  server.tool(
    'coda_list_docs',
    `List Coda documents accessible to the user.

Args:
  - isOwner: Filter to docs owned by the user
  - query: Search query string
  - isPublished: Filter to published docs
  - isStarred: Filter to starred docs
  - workspaceId: Filter by workspace
  - folderId: Filter by folder
  - limit: Number of docs to return (default: 20)
  - pageToken: Pagination token from previous response

Returns:
  Paginated list of documents with ID, name, owner, workspace, and timestamps.`,
    {
      isOwner: z.boolean().optional().describe('Filter to docs owned by the user'),
      query: z.string().optional().describe('Search query string'),
      isPublished: z.boolean().optional().describe('Filter to published docs'),
      isStarred: z.boolean().optional().describe('Filter to starred docs'),
      workspaceId: z.string().optional().describe('Filter by workspace ID'),
      folderId: z.string().optional().describe('Filter by folder ID'),
      limit: z.number().int().min(1).max(100).default(20).describe('Number of docs to return'),
      pageToken: z.string().optional().describe('Pagination token'),
      format: z.enum(['json', 'markdown']).default('json').describe('Response format'),
    },
    async ({ format, ...params }) => {
      try {
        const result = await client.listDocs(params);
        return formatResponse(result, format, 'docs');
      } catch (error) {
        return formatError(error);
      }
    }
  );

  // ===========================================================================
  // Get Doc
  // ===========================================================================
  server.tool(
    'coda_get_doc',
    `Get details for a specific Coda document.

Args:
  - docId: The document ID

Returns:
  Document details including name, owner, workspace, folder, size, and timestamps.`,
    {
      docId: z.string().describe('Document ID'),
      format: z.enum(['json', 'markdown']).default('json'),
    },
    async ({ docId, format }) => {
      try {
        const doc = await client.getDoc(docId);
        return formatResponse(doc, format, 'doc');
      } catch (error) {
        return formatError(error);
      }
    }
  );

  // ===========================================================================
  // Create Doc
  // ===========================================================================
  server.tool(
    'coda_create_doc',
    `Create a new Coda document.

Args:
  - title: Document title (required)
  - sourceDoc: ID of doc to copy from
  - timezone: Timezone for the doc (e.g., 'America/Los_Angeles')
  - folderId: Folder to create the doc in

Returns:
  The created document.`,
    {
      title: z.string().describe('Document title'),
      sourceDoc: z.string().optional().describe('ID of doc to copy from'),
      timezone: z.string().optional().describe('Timezone for the doc'),
      folderId: z.string().optional().describe('Folder ID to create the doc in'),
    },
    async (input) => {
      try {
        const doc = await client.createDoc(input);
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify({ success: true, message: 'Document created', doc }, null, 2),
            },
          ],
        };
      } catch (error) {
        return formatError(error);
      }
    }
  );

  // ===========================================================================
  // Delete Doc
  // ===========================================================================
  server.tool(
    'coda_delete_doc',
    `Delete a Coda document.

Args:
  - docId: Document ID to delete

Returns:
  Confirmation of deletion.`,
    {
      docId: z.string().describe('Document ID to delete'),
    },
    async ({ docId }) => {
      try {
        await client.deleteDoc(docId);
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify({ success: true, message: `Document ${docId} deleted` }, null, 2),
            },
          ],
        };
      } catch (error) {
        return formatError(error);
      }
    }
  );
}
