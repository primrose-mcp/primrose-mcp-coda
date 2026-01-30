# Coda MCP Server

[![Primrose MCP](https://img.shields.io/badge/Primrose-MCP-blue)](https://primrose.dev/mcp/coda)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

A Model Context Protocol (MCP) server for Coda document automation. Access documents, pages, tables, rows, formulas, and more through a standardized interface.

## Features

- **Document Management** - List, access, and manage Coda documents
- **Page Operations** - Navigate and manipulate document pages
- **Table Management** - Work with Coda tables and their structure
- **Row Operations** - Create, read, update, and delete table rows
- **Formula Evaluation** - Execute and evaluate Coda formulas
- **Controls** - Interact with document controls
- **Automations** - Manage document automations
- **Permissions** - Handle document sharing and permissions
- **Publishing** - Manage document publishing settings
- **Utility Functions** - Additional helper operations

## Quick Start

The recommended way to use this MCP server is through the [Primrose SDK](https://www.npmjs.com/package/primrose-mcp):

```bash
npm install primrose-mcp
```

```typescript
import { PrimroseClient } from 'primrose-mcp';

const client = new PrimroseClient({
  service: 'coda',
  headers: {
    'X-Coda-API-Key': 'your-coda-api-key'
  }
});

// List all documents
const docs = await client.call('coda_list_docs', {});
```

## Manual Installation

If you prefer to run the MCP server directly:

```bash
# Clone the repository
git clone https://github.com/primrose-ai/primrose-mcp-coda.git
cd primrose-mcp-coda

# Install dependencies
npm install

# Build the project
npm run build

# Start the server
npm start
```

## Configuration

### Required Headers

| Header | Description |
|--------|-------------|
| `X-Coda-API-Key` | Your Coda API token |

### Optional Headers

| Header | Description |
|--------|-------------|
| `X-Coda-Base-URL` | Override the default Coda API base URL |

### Getting Your API Key

1. Go to [Coda Account Settings](https://coda.io/account)
2. Scroll to "API Settings"
3. Click "Generate API Token"
4. Copy the token and use it as your `X-Coda-API-Key`

## Available Tools

### Document Tools
- `coda_list_docs` - List all documents
- `coda_get_doc` - Get document details
- `coda_create_doc` - Create a new document

### Page Tools
- `coda_list_pages` - List pages in a document
- `coda_get_page` - Get page content
- `coda_create_page` - Create a new page
- `coda_update_page` - Update page content

### Table Tools
- `coda_list_tables` - List tables in a document
- `coda_get_table` - Get table schema and metadata

### Row Tools
- `coda_list_rows` - List rows in a table
- `coda_get_row` - Get a specific row
- `coda_insert_rows` - Insert new rows
- `coda_update_row` - Update an existing row
- `coda_delete_row` - Delete a row

### Formula Tools
- `coda_resolve_formula` - Evaluate a Coda formula

### Control Tools
- `coda_list_controls` - List document controls
- `coda_get_control` - Get control value

### Automation Tools
- `coda_list_automations` - List document automations
- `coda_trigger_automation` - Trigger an automation

### Permission Tools
- `coda_list_permissions` - List document permissions
- `coda_add_permission` - Share document with users

### Publishing Tools
- `coda_get_publishing_info` - Get publishing status
- `coda_update_publishing` - Update publishing settings

## Development

```bash
# Run in development mode with hot reload
npm run dev

# Run tests
npm test

# Lint code
npm run lint

# Type check
npm run typecheck
```

## Related Resources

- [Primrose SDK Documentation](https://primrose.dev/docs)
- [Coda API Documentation](https://coda.io/developers/apis/v1)
- [Model Context Protocol](https://modelcontextprotocol.io)
