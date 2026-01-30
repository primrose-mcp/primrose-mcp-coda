/**
 * Publishing Tools
 *
 * MCP tools for Coda document publishing and categories.
 */

import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import type { CodaClient } from '../client.js';
import { formatError, formatResponse } from '../utils/formatters.js';

/**
 * Register all publishing-related tools
 */
export function registerPublishingTools(server: McpServer, client: CodaClient): void {
  // ===========================================================================
  // List Categories
  // ===========================================================================
  server.tool(
    'coda_list_categories',
    `List available publishing categories.

Categories are used when publishing docs to the Coda gallery.

Returns:
  List of category names.`,
    {},
    async () => {
      try {
        const categories = await client.listCategories();
        return formatResponse(categories, 'json', 'categories');
      } catch (error) {
        return formatError(error);
      }
    }
  );

  // ===========================================================================
  // Publish Doc
  // ===========================================================================
  server.tool(
    'coda_publish_doc',
    `Publish a document to make it publicly accessible.

Args:
  - docId: Document ID (required)
  - slug: Custom URL slug for the published doc
  - discoverable: Make the doc discoverable in the gallery
  - earnCredit: Earn Coda credits when others copy the doc
  - categoryNames: Categories for the published doc
  - mode: Publishing mode ('view', 'play', 'edit')

Returns:
  Confirmation of publication.`,
    {
      docId: z.string().describe('Document ID'),
      slug: z.string().optional().describe('Custom URL slug'),
      discoverable: z.boolean().optional().default(false).describe('Discoverable in gallery'),
      earnCredit: z.boolean().optional().default(false).describe('Earn credits on copies'),
      categoryNames: z.array(z.string()).optional().describe('Category names'),
      mode: z.enum(['view', 'play', 'edit']).optional().default('view').describe('Publishing mode'),
    },
    async ({ docId, ...input }) => {
      try {
        await client.publishDoc(docId, input);
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(
                { success: true, message: `Document ${docId} published` },
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
  // Unpublish Doc
  // ===========================================================================
  server.tool(
    'coda_unpublish_doc',
    `Unpublish a document.

Makes a previously published document private again.

Args:
  - docId: Document ID

Returns:
  Confirmation of unpublication.`,
    {
      docId: z.string().describe('Document ID'),
    },
    async ({ docId }) => {
      try {
        await client.unpublishDoc(docId);
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(
                { success: true, message: `Document ${docId} unpublished` },
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
