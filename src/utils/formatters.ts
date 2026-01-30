/**
 * Response Formatting Utilities
 *
 * Helpers for formatting tool responses in JSON or Markdown.
 */

import type {
  Column,
  Control,
  Doc,
  Formula,
  Page,
  PaginatedResponse,
  ResponseFormat,
  Row,
  Table,
} from '../types/entities.js';
import { CodaApiError, formatErrorForLogging } from './errors.js';

/**
 * MCP tool response type
 * Note: Index signature required for MCP SDK 1.25+ compatibility
 */
export interface ToolResponse {
  [key: string]: unknown;
  content: Array<{ type: 'text'; text: string }>;
  isError?: boolean;
}

/**
 * Format a successful response
 */
export function formatResponse(
  data: unknown,
  format: ResponseFormat,
  entityType: string
): ToolResponse {
  if (format === 'markdown') {
    return {
      content: [{ type: 'text', text: formatAsMarkdown(data, entityType) }],
    };
  }
  return {
    content: [{ type: 'text', text: JSON.stringify(data, null, 2) }],
  };
}

/**
 * Format an error response
 */
export function formatError(error: unknown): ToolResponse {
  const errorInfo = formatErrorForLogging(error);

  let message: string;
  if (error instanceof CodaApiError) {
    message = `Error: ${error.message}`;
    if (error.retryable) {
      message += ' (retryable)';
    }
  } else if (error instanceof Error) {
    message = `Error: ${error.message}`;
  } else {
    message = `Error: ${String(error)}`;
  }

  return {
    content: [
      {
        type: 'text',
        text: JSON.stringify({ error: message, details: errorInfo }, null, 2),
      },
    ],
    isError: true,
  };
}

/**
 * Format data as Markdown
 */
function formatAsMarkdown(data: unknown, entityType: string): string {
  if (isPaginatedResponse(data)) {
    return formatPaginatedAsMarkdown(data, entityType);
  }

  if (Array.isArray(data)) {
    return formatArrayAsMarkdown(data, entityType);
  }

  if (typeof data === 'object' && data !== null) {
    return formatObjectAsMarkdown(data as Record<string, unknown>, entityType);
  }

  return String(data);
}

/**
 * Type guard for paginated response
 */
function isPaginatedResponse(data: unknown): data is PaginatedResponse<unknown> {
  return (
    typeof data === 'object' &&
    data !== null &&
    'items' in data &&
    Array.isArray((data as PaginatedResponse<unknown>).items)
  );
}

/**
 * Format paginated response as Markdown
 */
function formatPaginatedAsMarkdown(data: PaginatedResponse<unknown>, entityType: string): string {
  const lines: string[] = [];

  lines.push(`## ${capitalize(entityType)}`);
  lines.push('');

  if (data.total !== undefined) {
    lines.push(`**Total:** ${data.total} | **Showing:** ${data.items.length}`);
  } else {
    lines.push(`**Showing:** ${data.items.length}`);
  }

  if (data.hasMore) {
    lines.push(`**More available:** Yes (pageToken: \`${data.nextPageToken}\`)`);
  }
  lines.push('');

  if (data.items.length === 0) {
    lines.push('_No items found._');
    return lines.join('\n');
  }

  // Format items based on entity type
  switch (entityType) {
    case 'docs':
      lines.push(formatDocsTable(data.items as Doc[]));
      break;
    case 'pages':
      lines.push(formatPagesTable(data.items as Page[]));
      break;
    case 'tables':
      lines.push(formatTablesTable(data.items as Table[]));
      break;
    case 'columns':
      lines.push(formatColumnsTable(data.items as Column[]));
      break;
    case 'rows':
      lines.push(formatRowsTable(data.items as Row[]));
      break;
    case 'formulas':
      lines.push(formatFormulasTable(data.items as Formula[]));
      break;
    case 'controls':
      lines.push(formatControlsTable(data.items as Control[]));
      break;
    default:
      lines.push(formatGenericTable(data.items));
  }

  return lines.join('\n');
}

/**
 * Format docs as Markdown table
 */
function formatDocsTable(docs: Doc[]): string {
  const lines: string[] = [];
  lines.push('| ID | Name | Owner | Updated |');
  lines.push('|---|---|---|---|');

  for (const doc of docs) {
    lines.push(
      `| ${doc.id} | ${doc.name} | ${doc.ownerName || doc.owner} | ${doc.updatedAt.split('T')[0]} |`
    );
  }

  return lines.join('\n');
}

/**
 * Format pages as Markdown table
 */
function formatPagesTable(pages: Page[]): string {
  const lines: string[] = [];
  lines.push('| ID | Name | Subtitle | Type |');
  lines.push('|---|---|---|---|');

  for (const page of pages) {
    lines.push(
      `| ${page.id} | ${page.name} | ${page.subtitle || '-'} | ${page.contentType || 'canvas'} |`
    );
  }

  return lines.join('\n');
}

/**
 * Format tables as Markdown table
 */
function formatTablesTable(tables: Table[]): string {
  const lines: string[] = [];
  lines.push('| ID | Name | Type | Rows | Layout |');
  lines.push('|---|---|---|---|---|');

  for (const table of tables) {
    lines.push(
      `| ${table.id} | ${table.name} | ${table.tableType} | ${table.rowCount} | ${table.layout} |`
    );
  }

  return lines.join('\n');
}

/**
 * Format columns as Markdown table
 */
function formatColumnsTable(columns: Column[]): string {
  const lines: string[] = [];
  lines.push('| ID | Name | Type | Calculated |');
  lines.push('|---|---|---|---|');

  for (const column of columns) {
    lines.push(
      `| ${column.id} | ${column.name} | ${column.format?.type || '-'} | ${column.calculated ? 'Yes' : 'No'} |`
    );
  }

  return lines.join('\n');
}

/**
 * Format rows as Markdown table
 */
function formatRowsTable(rows: Row[]): string {
  if (rows.length === 0) return '_No rows_';

  // Get column names from first row
  const firstRow = rows[0];
  const columnKeys = Object.keys(firstRow.values).slice(0, 5); // Limit to 5 columns

  const lines: string[] = [];
  lines.push(`| ID | ${columnKeys.join(' | ')} |`);
  lines.push(`|---|${columnKeys.map(() => '---').join('|')}|`);

  for (const row of rows) {
    const values = columnKeys.map((k) => formatCellValue(row.values[k]));
    lines.push(`| ${row.id} | ${values.join(' | ')} |`);
  }

  return lines.join('\n');
}

/**
 * Format a cell value for display
 */
function formatCellValue(value: unknown): string {
  if (value === null || value === undefined) return '-';
  if (typeof value === 'object') {
    if ('@type' in (value as Record<string, unknown>)) {
      const typed = value as { '@type': string; name?: string; email?: string; amount?: number };
      if (typed['@type'] === 'LinkedRow') return typed.name || '-';
      if (typed['@type'] === 'Person') return typed.email || typed.name || '-';
      if (typed['@type'] === 'Currency') return `$${typed.amount}`;
    }
    if (Array.isArray(value)) {
      return value.map(formatCellValue).join(', ');
    }
    return JSON.stringify(value);
  }
  return String(value);
}

/**
 * Format formulas as Markdown table
 */
function formatFormulasTable(formulas: Formula[]): string {
  const lines: string[] = [];
  lines.push('| ID | Name | Value |');
  lines.push('|---|---|---|');

  for (const formula of formulas) {
    const value = formatCellValue(formula.value);
    lines.push(`| ${formula.id} | ${formula.name} | ${value} |`);
  }

  return lines.join('\n');
}

/**
 * Format controls as Markdown table
 */
function formatControlsTable(controls: Control[]): string {
  const lines: string[] = [];
  lines.push('| ID | Name | Type | Value |');
  lines.push('|---|---|---|---|');

  for (const control of controls) {
    const value = formatCellValue(control.value);
    lines.push(`| ${control.id} | ${control.name} | ${control.controlType} | ${value} |`);
  }

  return lines.join('\n');
}

/**
 * Format a generic array as Markdown table
 */
function formatGenericTable(items: unknown[]): string {
  if (items.length === 0) return '_No items_';

  const first = items[0] as Record<string, unknown>;
  const keys = Object.keys(first).slice(0, 5); // Limit columns

  const lines: string[] = [];
  lines.push(`| ${keys.join(' | ')} |`);
  lines.push(`|${keys.map(() => '---').join('|')}|`);

  for (const item of items) {
    const record = item as Record<string, unknown>;
    const values = keys.map((k) => String(record[k] ?? '-'));
    lines.push(`| ${values.join(' | ')} |`);
  }

  return lines.join('\n');
}

/**
 * Format an array as Markdown
 */
function formatArrayAsMarkdown(data: unknown[], entityType: string): string {
  return formatGenericTable(data);
}

/**
 * Format a single object as Markdown
 */
function formatObjectAsMarkdown(data: Record<string, unknown>, entityType: string): string {
  const lines: string[] = [];
  lines.push(`## ${capitalize(entityType.replace(/s$/, ''))}`);
  lines.push('');

  for (const [key, value] of Object.entries(data)) {
    if (value === null || value === undefined) continue;

    if (typeof value === 'object') {
      lines.push(`**${formatKey(key)}:**`);
      lines.push('```json');
      lines.push(JSON.stringify(value, null, 2));
      lines.push('```');
    } else {
      lines.push(`**${formatKey(key)}:** ${value}`);
    }
  }

  return lines.join('\n');
}

/**
 * Capitalize first letter
 */
function capitalize(str: string): string {
  return str.charAt(0).toUpperCase() + str.slice(1);
}

/**
 * Format a key for display (camelCase to Title Case)
 */
function formatKey(key: string): string {
  return key
    .replace(/([A-Z])/g, ' $1')
    .replace(/^./, (str) => str.toUpperCase())
    .trim();
}
