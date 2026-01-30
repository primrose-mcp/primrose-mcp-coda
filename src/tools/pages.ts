/**
 * Page Tools
 *
 * MCP tools for Coda page management.
 */

import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import type { CodaClient } from '../client.js';
import { formatError, formatResponse } from '../utils/formatters.js';

/**
 * Register all page-related tools
 */
export function registerPageTools(server: McpServer, client: CodaClient): void {
  // ===========================================================================
  // List Pages
  // ===========================================================================
  server.tool(
    'coda_list_pages',
    `List pages in a Coda document.

Args:
  - docId: Document ID (required)
  - limit: Number of pages to return
  - pageToken: Pagination token

Returns:
  Paginated list of pages with their hierarchy, names, and subtitles.`,
    {
      docId: z.string().describe('Document ID'),
      limit: z.number().int().min(1).max(100).default(20),
      pageToken: z.string().optional(),
      format: z.enum(['json', 'markdown']).default('json'),
    },
    async ({ docId, limit, pageToken, format }) => {
      try {
        const result = await client.listPages(docId, { limit, pageToken });
        return formatResponse(result, format, 'pages');
      } catch (error) {
        return formatError(error);
      }
    }
  );

  // ===========================================================================
  // Get Page
  // ===========================================================================
  server.tool(
    'coda_get_page',
    `Get details for a specific page.

Args:
  - docId: Document ID
  - pageIdOrName: Page ID or name

Returns:
  Page details including name, subtitle, icon, parent, and children.`,
    {
      docId: z.string().describe('Document ID'),
      pageIdOrName: z.string().describe('Page ID or name'),
      format: z.enum(['json', 'markdown']).default('json'),
    },
    async ({ docId, pageIdOrName, format }) => {
      try {
        const page = await client.getPage(docId, pageIdOrName);
        return formatResponse(page, format, 'page');
      } catch (error) {
        return formatError(error);
      }
    }
  );

  // ===========================================================================
  // Create Page
  // ===========================================================================
  server.tool(
    'coda_create_page',
    `Create a new page in a Coda document.

Args:
  - docId: Document ID (required)
  - name: Page name (required)
  - subtitle: Page subtitle
  - iconName: Icon name for the page
  - imageUrl: Cover image URL
  - parentPageIdOrName: Parent page ID or name
  - pageContent: Initial content (markdown or HTML)
  - contentFormat: Format of pageContent ('markdown' or 'html')

Returns:
  The created page.`,
    {
      docId: z.string().describe('Document ID'),
      name: z.string().describe('Page name'),
      subtitle: z.string().optional().describe('Page subtitle'),
      iconName: z.string().optional().describe('Icon name'),
      imageUrl: z.string().optional().describe('Cover image URL'),
      parentPageIdOrName: z.string().optional().describe('Parent page ID or name'),
      pageContent: z.string().optional().describe('Initial page content'),
      contentFormat: z.enum(['markdown', 'html']).optional().default('markdown').describe('Content format'),
    },
    async ({ docId, name, subtitle, iconName, imageUrl, parentPageIdOrName, pageContent, contentFormat }) => {
      try {
        const input: Parameters<typeof client.createPage>[1] = {
          name,
          subtitle,
          iconName,
          imageUrl,
          parentPageIdOrName,
        };

        if (pageContent) {
          input.pageContent = {
            type: 'canvas',
            canvasContent: {
              format: contentFormat || 'markdown',
              content: pageContent,
            },
          };
        }

        const page = await client.createPage(docId, input);
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify({ success: true, message: 'Page created', page }, null, 2),
            },
          ],
        };
      } catch (error) {
        return formatError(error);
      }
    }
  );

  // ===========================================================================
  // Update Page
  // ===========================================================================
  server.tool(
    'coda_update_page',
    `Update an existing page.

Args:
  - docId: Document ID
  - pageIdOrName: Page ID or name to update
  - name: New page name
  - subtitle: New subtitle
  - iconName: New icon name
  - imageUrl: New cover image URL
  - isHidden: Whether the page should be hidden
  - contentUpdate: New content to append or replace
  - contentFormat: Format of content ('markdown' or 'html')
  - insertionMode: How to insert content ('append' or 'replace')

Returns:
  The updated page.`,
    {
      docId: z.string().describe('Document ID'),
      pageIdOrName: z.string().describe('Page ID or name to update'),
      name: z.string().optional().describe('New page name'),
      subtitle: z.string().optional().describe('New subtitle'),
      iconName: z.string().optional().describe('New icon name'),
      imageUrl: z.string().optional().describe('New cover image URL'),
      isHidden: z.boolean().optional().describe('Hide the page'),
      contentUpdate: z.string().optional().describe('Content to update'),
      contentFormat: z.enum(['markdown', 'html']).optional().default('markdown'),
      insertionMode: z.enum(['append', 'replace']).optional().default('append'),
    },
    async ({ docId, pageIdOrName, contentUpdate, contentFormat, insertionMode, ...input }) => {
      try {
        const updateInput: Parameters<typeof client.updatePage>[2] = { ...input };

        if (contentUpdate) {
          updateInput.contentUpdate = {
            insertionMode: insertionMode || 'append',
            canvasContent: {
              format: contentFormat || 'markdown',
              content: contentUpdate,
            },
          };
        }

        const page = await client.updatePage(docId, pageIdOrName, updateInput);
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify({ success: true, message: 'Page updated', page }, null, 2),
            },
          ],
        };
      } catch (error) {
        return formatError(error);
      }
    }
  );
}
