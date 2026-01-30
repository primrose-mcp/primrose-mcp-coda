/**
 * Permission Tools
 *
 * MCP tools for Coda document sharing and permissions.
 */

import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import type { CodaClient } from '../client.js';
import type { AccessType, Principal } from '../types/entities.js';
import { formatError, formatResponse } from '../utils/formatters.js';

/**
 * Register all permission-related tools
 */
export function registerPermissionTools(server: McpServer, client: CodaClient): void {
  // ===========================================================================
  // Get ACL Metadata
  // ===========================================================================
  server.tool(
    'coda_get_sharing_metadata',
    `Get sharing metadata for a document.

Returns information about what sharing actions are allowed for this doc.

Args:
  - docId: Document ID (required)

Returns:
  Metadata about sharing capabilities (canShare, canCopy, etc.).`,
    {
      docId: z.string().describe('Document ID'),
    },
    async ({ docId }) => {
      try {
        const metadata = await client.getAclMetadata(docId);
        return formatResponse(metadata, 'json', 'metadata');
      } catch (error) {
        return formatError(error);
      }
    }
  );

  // ===========================================================================
  // List Permissions
  // ===========================================================================
  server.tool(
    'coda_list_permissions',
    `List permissions for a document.

Shows who has access to the document and their access levels.

Args:
  - docId: Document ID (required)
  - limit: Number of permissions to return
  - pageToken: Pagination token

Returns:
  Paginated list of permissions with principals and access levels.`,
    {
      docId: z.string().describe('Document ID'),
      limit: z.number().int().min(1).max(100).default(50),
      pageToken: z.string().optional(),
      format: z.enum(['json', 'markdown']).default('json'),
    },
    async ({ docId, limit, pageToken, format }) => {
      try {
        const result = await client.listPermissions(docId, { limit, pageToken });
        return formatResponse(result, format, 'permissions');
      } catch (error) {
        return formatError(error);
      }
    }
  );

  // ===========================================================================
  // Add Permission
  // ===========================================================================
  server.tool(
    'coda_add_permission',
    `Add a permission to a document.

Grants access to a user, domain, or anyone.

Args:
  - docId: Document ID (required)
  - access: Access level ('readonly', 'write', 'comment', 'none')
  - principalType: Type of principal ('email', 'domain', 'anyone')
  - email: Email address (required if principalType is 'email')
  - domain: Domain name (required if principalType is 'domain')
  - suppressEmail: Don't send notification email

Returns:
  The created permission.`,
    {
      docId: z.string().describe('Document ID'),
      access: z.enum(['readonly', 'write', 'comment', 'none']).describe('Access level'),
      principalType: z.enum(['email', 'domain', 'anyone']).describe('Principal type'),
      email: z.string().email().optional().describe('Email address'),
      domain: z.string().optional().describe('Domain name'),
      suppressEmail: z.boolean().optional().default(false).describe('Suppress notification email'),
    },
    async ({ docId, access, principalType, email, domain, suppressEmail }) => {
      try {
        const principal: Principal = { type: principalType };
        if (principalType === 'email' && email) {
          principal.email = email;
        } else if (principalType === 'domain' && domain) {
          principal.domain = domain;
        }

        const permission = await client.addPermission(docId, {
          access: access as AccessType,
          principal,
          suppressEmail,
        });
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(
                { success: true, message: 'Permission added', permission },
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
  // Delete Permission
  // ===========================================================================
  server.tool(
    'coda_delete_permission',
    `Remove a permission from a document.

Args:
  - docId: Document ID
  - permissionId: Permission ID to remove

Returns:
  Confirmation of deletion.`,
    {
      docId: z.string().describe('Document ID'),
      permissionId: z.string().describe('Permission ID to remove'),
    },
    async ({ docId, permissionId }) => {
      try {
        await client.deletePermission(docId, permissionId);
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(
                { success: true, message: `Permission ${permissionId} removed` },
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
  // Get ACL Settings
  // ===========================================================================
  server.tool(
    'coda_get_acl_settings',
    `Get ACL settings for a document.

Returns sharing configuration options for the document.

Args:
  - docId: Document ID

Returns:
  ACL settings including editor permissions and copying settings.`,
    {
      docId: z.string().describe('Document ID'),
    },
    async ({ docId }) => {
      try {
        const settings = await client.getAclSettings(docId);
        return formatResponse(settings, 'json', 'settings');
      } catch (error) {
        return formatError(error);
      }
    }
  );

  // ===========================================================================
  // Update ACL Settings
  // ===========================================================================
  server.tool(
    'coda_update_acl_settings',
    `Update ACL settings for a document.

Args:
  - docId: Document ID
  - allowEditorsToChangePermissions: Allow editors to manage permissions
  - allowCopying: Allow users to copy the doc
  - allowViewersToRequestEditing: Allow viewers to request edit access

Returns:
  The updated ACL settings.`,
    {
      docId: z.string().describe('Document ID'),
      allowEditorsToChangePermissions: z.boolean().optional(),
      allowCopying: z.boolean().optional(),
      allowViewersToRequestEditing: z.boolean().optional(),
    },
    async ({ docId, ...settings }) => {
      try {
        const updated = await client.updateAclSettings(docId, settings);
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(
                { success: true, message: 'ACL settings updated', settings: updated },
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
