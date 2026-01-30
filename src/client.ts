/**
 * Coda API Client
 *
 * Implements all Coda API v1 endpoints for docs, pages, tables, columns, rows,
 * formulas, controls, automations, permissions, publishing, and utilities.
 *
 * MULTI-TENANT: This client receives credentials per-request via TenantCredentials,
 * allowing a single server to serve multiple tenants with different API keys.
 */

import type {
  AclMetadata,
  AclSettings,
  AutomationRule,
  AutomationTriggerPayload,
  Category,
  Column,
  Control,
  Doc,
  DocCreateInput,
  Formula,
  MutationStatus,
  Page,
  PageCreateInput,
  PageUpdateInput,
  PaginatedResponse,
  PaginationParams,
  Permission,
  PermissionAddInput,
  PublishDocInput,
  ResolvedResource,
  Row,
  RowsUpsertInput,
  RowUpsertInput,
  Table,
  UserInfo,
} from './types/entities.js';
import type { TenantCredentials } from './types/env.js';
import { AuthenticationError, CodaApiError, RateLimitError } from './utils/errors.js';

// =============================================================================
// Configuration
// =============================================================================

const API_BASE_URL = 'https://coda.io/apis/v1';

// =============================================================================
// Coda Client Interface
// =============================================================================

export interface CodaClient {
  // Connection
  testConnection(): Promise<{ connected: boolean; message: string }>;

  // User / Account
  whoami(): Promise<UserInfo>;

  // Docs
  listDocs(params?: ListDocsParams): Promise<PaginatedResponse<Doc>>;
  getDoc(docId: string): Promise<Doc>;
  createDoc(input: DocCreateInput): Promise<Doc>;
  deleteDoc(docId: string): Promise<void>;

  // Pages
  listPages(docId: string, params?: PaginationParams): Promise<PaginatedResponse<Page>>;
  getPage(docId: string, pageIdOrName: string): Promise<Page>;
  createPage(docId: string, input: PageCreateInput): Promise<Page>;
  updatePage(docId: string, pageIdOrName: string, input: PageUpdateInput): Promise<Page>;

  // Tables
  listTables(docId: string, params?: ListTablesParams): Promise<PaginatedResponse<Table>>;
  getTable(docId: string, tableIdOrName: string): Promise<Table>;

  // Columns
  listColumns(docId: string, tableIdOrName: string, params?: PaginationParams): Promise<PaginatedResponse<Column>>;
  getColumn(docId: string, tableIdOrName: string, columnIdOrName: string): Promise<Column>;

  // Rows
  listRows(docId: string, tableIdOrName: string, params?: ListRowsParams): Promise<PaginatedResponse<Row>>;
  getRow(docId: string, tableIdOrName: string, rowIdOrName: string, useColumnNames?: boolean): Promise<Row>;
  upsertRows(docId: string, tableIdOrName: string, input: RowsUpsertInput, disableParsing?: boolean): Promise<UpsertRowsResult>;
  updateRow(docId: string, tableIdOrName: string, rowIdOrName: string, input: RowUpsertInput, disableParsing?: boolean): Promise<UpdateRowResult>;
  deleteRow(docId: string, tableIdOrName: string, rowIdOrName: string): Promise<DeleteRowResult>;
  deleteRows(docId: string, tableIdOrName: string, rowIds: string[]): Promise<DeleteRowsResult>;
  pushButton(docId: string, tableIdOrName: string, rowIdOrName: string, columnIdOrName: string): Promise<PushButtonResult>;

  // Formulas
  listFormulas(docId: string, params?: PaginationParams): Promise<PaginatedResponse<Formula>>;
  getFormula(docId: string, formulaIdOrName: string): Promise<Formula>;

  // Controls
  listControls(docId: string, params?: PaginationParams): Promise<PaginatedResponse<Control>>;
  getControl(docId: string, controlIdOrName: string): Promise<Control>;

  // Automations
  listAutomations(docId: string, params?: PaginationParams): Promise<PaginatedResponse<AutomationRule>>;
  triggerAutomation(docId: string, ruleId: string, payload?: AutomationTriggerPayload): Promise<TriggerAutomationResult>;

  // Permissions
  getAclMetadata(docId: string): Promise<AclMetadata>;
  listPermissions(docId: string, params?: PaginationParams): Promise<PaginatedResponse<Permission>>;
  addPermission(docId: string, input: PermissionAddInput): Promise<Permission>;
  deletePermission(docId: string, permissionId: string): Promise<void>;
  getAclSettings(docId: string): Promise<AclSettings>;
  updateAclSettings(docId: string, settings: Partial<AclSettings>): Promise<AclSettings>;

  // Publishing
  listCategories(): Promise<Category[]>;
  publishDoc(docId: string, input: PublishDocInput): Promise<void>;
  unpublishDoc(docId: string): Promise<void>;

  // Utilities
  resolveBrowserLink(url: string, degradeGracefully?: boolean): Promise<ResolvedResource>;
  getMutationStatus(requestId: string): Promise<MutationStatus>;
}

// =============================================================================
// Extended Parameter Types
// =============================================================================

export interface ListDocsParams extends PaginationParams {
  isOwner?: boolean;
  isPublished?: boolean;
  query?: string;
  sourceDoc?: string;
  isStarred?: boolean;
  inGallery?: boolean;
  workspaceId?: string;
  folderId?: string;
}

export interface ListTablesParams extends PaginationParams {
  tableTypes?: ('table' | 'view')[];
  sortBy?: 'name' | 'createdAt' | 'updatedAt';
}

export interface ListRowsParams extends PaginationParams {
  query?: string;
  sortBy?: string;
  useColumnNames?: boolean;
  valueFormat?: 'simple' | 'simpleWithArrays' | 'rich';
  visibleOnly?: boolean;
}

// =============================================================================
// Result Types
// =============================================================================

export interface UpsertRowsResult {
  requestId: string;
  addedRowIds: string[];
  updatedRowIds?: string[];
}

export interface UpdateRowResult {
  requestId: string;
  id: string;
}

export interface DeleteRowResult {
  requestId: string;
  id: string;
}

export interface DeleteRowsResult {
  requestId: string;
  rowIds: string[];
}

export interface PushButtonResult {
  requestId: string;
  rowId: string;
  columnId: string;
}

export interface TriggerAutomationResult {
  requestId: string;
}

// =============================================================================
// Coda Client Implementation
// =============================================================================

class CodaClientImpl implements CodaClient {
  private credentials: TenantCredentials;
  private baseUrl: string;

  constructor(credentials: TenantCredentials) {
    this.credentials = credentials;
    this.baseUrl = credentials.baseUrl || API_BASE_URL;
  }

  // ===========================================================================
  // HTTP Request Helper
  // ===========================================================================

  private getAuthHeaders(): Record<string, string> {
    if (this.credentials.apiKey) {
      return {
        Authorization: `Bearer ${this.credentials.apiKey}`,
        'Content-Type': 'application/json',
      };
    }

    throw new AuthenticationError(
      'No credentials provided. Include X-Coda-API-Key header.'
    );
  }

  private async request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const url = `${this.baseUrl}${endpoint}`;

    const response = await fetch(url, {
      ...options,
      headers: {
        ...this.getAuthHeaders(),
        ...(options.headers || {}),
      },
    });

    // Handle rate limiting
    if (response.status === 429) {
      const retryAfter = response.headers.get('Retry-After');
      throw new RateLimitError('Rate limit exceeded', retryAfter ? parseInt(retryAfter, 10) : 60);
    }

    // Handle authentication errors
    if (response.status === 401 || response.status === 403) {
      throw new AuthenticationError('Authentication failed. Check your API credentials.');
    }

    // Handle other errors
    if (!response.ok) {
      const errorBody = await response.text();
      let message = `API error: ${response.status}`;
      try {
        const errorJson = JSON.parse(errorBody);
        message = errorJson.message || errorJson.error || message;
      } catch {
        // Use default message
      }
      throw new CodaApiError(message, response.status);
    }

    // Handle 202 Accepted (async operations)
    if (response.status === 202) {
      return response.json() as Promise<T>;
    }

    // Handle 204 No Content
    if (response.status === 204) {
      return undefined as T;
    }

    return response.json() as Promise<T>;
  }

  private buildQueryString(params: object): string {
    const query = new URLSearchParams();
    for (const [key, value] of Object.entries(params)) {
      if (value !== undefined && value !== null) {
        if (Array.isArray(value)) {
          for (const v of value) {
            query.append(key, String(v));
          }
        } else {
          query.set(key, String(value));
        }
      }
    }
    const queryString = query.toString();
    return queryString ? `?${queryString}` : '';
  }

  // ===========================================================================
  // Connection
  // ===========================================================================

  async testConnection(): Promise<{ connected: boolean; message: string }> {
    try {
      const user = await this.whoami();
      return { connected: true, message: `Successfully connected as ${user.name}` };
    } catch (error) {
      return {
        connected: false,
        message: error instanceof Error ? error.message : 'Connection failed',
      };
    }
  }

  // ===========================================================================
  // User / Account
  // ===========================================================================

  async whoami(): Promise<UserInfo> {
    return this.request<UserInfo>('/whoami');
  }

  // ===========================================================================
  // Docs
  // ===========================================================================

  async listDocs(params?: ListDocsParams): Promise<PaginatedResponse<Doc>> {
    const queryString = this.buildQueryString(params || {});
    const response = await this.request<{ items: Doc[]; nextPageToken?: string; nextPageLink?: string }>(`/docs${queryString}`);
    return {
      items: response.items,
      nextPageToken: response.nextPageToken,
      nextPageLink: response.nextPageLink,
      hasMore: !!response.nextPageToken,
    };
  }

  async getDoc(docId: string): Promise<Doc> {
    return this.request<Doc>(`/docs/${encodeURIComponent(docId)}`);
  }

  async createDoc(input: DocCreateInput): Promise<Doc> {
    return this.request<Doc>('/docs', {
      method: 'POST',
      body: JSON.stringify(input),
    });
  }

  async deleteDoc(docId: string): Promise<void> {
    await this.request<void>(`/docs/${encodeURIComponent(docId)}`, {
      method: 'DELETE',
    });
  }

  // ===========================================================================
  // Pages
  // ===========================================================================

  async listPages(docId: string, params?: PaginationParams): Promise<PaginatedResponse<Page>> {
    const queryString = this.buildQueryString(params || {});
    const response = await this.request<{ items: Page[]; nextPageToken?: string; nextPageLink?: string }>(
      `/docs/${encodeURIComponent(docId)}/pages${queryString}`
    );
    return {
      items: response.items,
      nextPageToken: response.nextPageToken,
      nextPageLink: response.nextPageLink,
      hasMore: !!response.nextPageToken,
    };
  }

  async getPage(docId: string, pageIdOrName: string): Promise<Page> {
    return this.request<Page>(
      `/docs/${encodeURIComponent(docId)}/pages/${encodeURIComponent(pageIdOrName)}`
    );
  }

  async createPage(docId: string, input: PageCreateInput): Promise<Page> {
    return this.request<Page>(`/docs/${encodeURIComponent(docId)}/pages`, {
      method: 'POST',
      body: JSON.stringify(input),
    });
  }

  async updatePage(docId: string, pageIdOrName: string, input: PageUpdateInput): Promise<Page> {
    return this.request<Page>(
      `/docs/${encodeURIComponent(docId)}/pages/${encodeURIComponent(pageIdOrName)}`,
      {
        method: 'PUT',
        body: JSON.stringify(input),
      }
    );
  }

  // ===========================================================================
  // Tables
  // ===========================================================================

  async listTables(docId: string, params?: ListTablesParams): Promise<PaginatedResponse<Table>> {
    const queryString = this.buildQueryString(params || {});
    const response = await this.request<{ items: Table[]; nextPageToken?: string; nextPageLink?: string }>(
      `/docs/${encodeURIComponent(docId)}/tables${queryString}`
    );
    return {
      items: response.items,
      nextPageToken: response.nextPageToken,
      nextPageLink: response.nextPageLink,
      hasMore: !!response.nextPageToken,
    };
  }

  async getTable(docId: string, tableIdOrName: string): Promise<Table> {
    return this.request<Table>(
      `/docs/${encodeURIComponent(docId)}/tables/${encodeURIComponent(tableIdOrName)}`
    );
  }

  // ===========================================================================
  // Columns
  // ===========================================================================

  async listColumns(
    docId: string,
    tableIdOrName: string,
    params?: PaginationParams
  ): Promise<PaginatedResponse<Column>> {
    const queryString = this.buildQueryString(params || {});
    const response = await this.request<{ items: Column[]; nextPageToken?: string; nextPageLink?: string }>(
      `/docs/${encodeURIComponent(docId)}/tables/${encodeURIComponent(tableIdOrName)}/columns${queryString}`
    );
    return {
      items: response.items,
      nextPageToken: response.nextPageToken,
      nextPageLink: response.nextPageLink,
      hasMore: !!response.nextPageToken,
    };
  }

  async getColumn(docId: string, tableIdOrName: string, columnIdOrName: string): Promise<Column> {
    return this.request<Column>(
      `/docs/${encodeURIComponent(docId)}/tables/${encodeURIComponent(tableIdOrName)}/columns/${encodeURIComponent(columnIdOrName)}`
    );
  }

  // ===========================================================================
  // Rows
  // ===========================================================================

  async listRows(
    docId: string,
    tableIdOrName: string,
    params?: ListRowsParams
  ): Promise<PaginatedResponse<Row>> {
    const queryString = this.buildQueryString(params || {});
    const response = await this.request<{ items: Row[]; nextPageToken?: string; nextPageLink?: string }>(
      `/docs/${encodeURIComponent(docId)}/tables/${encodeURIComponent(tableIdOrName)}/rows${queryString}`
    );
    return {
      items: response.items,
      nextPageToken: response.nextPageToken,
      nextPageLink: response.nextPageLink,
      hasMore: !!response.nextPageToken,
    };
  }

  async getRow(
    docId: string,
    tableIdOrName: string,
    rowIdOrName: string,
    useColumnNames = false
  ): Promise<Row> {
    const queryString = useColumnNames ? '?useColumnNames=true' : '';
    return this.request<Row>(
      `/docs/${encodeURIComponent(docId)}/tables/${encodeURIComponent(tableIdOrName)}/rows/${encodeURIComponent(rowIdOrName)}${queryString}`
    );
  }

  async upsertRows(
    docId: string,
    tableIdOrName: string,
    input: RowsUpsertInput,
    disableParsing = false
  ): Promise<UpsertRowsResult> {
    const queryString = disableParsing ? '?disableParsing=true' : '';
    return this.request<UpsertRowsResult>(
      `/docs/${encodeURIComponent(docId)}/tables/${encodeURIComponent(tableIdOrName)}/rows${queryString}`,
      {
        method: 'POST',
        body: JSON.stringify(input),
      }
    );
  }

  async updateRow(
    docId: string,
    tableIdOrName: string,
    rowIdOrName: string,
    input: RowUpsertInput,
    disableParsing = false
  ): Promise<UpdateRowResult> {
    const queryString = disableParsing ? '?disableParsing=true' : '';
    return this.request<UpdateRowResult>(
      `/docs/${encodeURIComponent(docId)}/tables/${encodeURIComponent(tableIdOrName)}/rows/${encodeURIComponent(rowIdOrName)}${queryString}`,
      {
        method: 'PUT',
        body: JSON.stringify({ row: input }),
      }
    );
  }

  async deleteRow(docId: string, tableIdOrName: string, rowIdOrName: string): Promise<DeleteRowResult> {
    return this.request<DeleteRowResult>(
      `/docs/${encodeURIComponent(docId)}/tables/${encodeURIComponent(tableIdOrName)}/rows/${encodeURIComponent(rowIdOrName)}`,
      {
        method: 'DELETE',
      }
    );
  }

  async deleteRows(docId: string, tableIdOrName: string, rowIds: string[]): Promise<DeleteRowsResult> {
    return this.request<DeleteRowsResult>(
      `/docs/${encodeURIComponent(docId)}/tables/${encodeURIComponent(tableIdOrName)}/rows`,
      {
        method: 'DELETE',
        body: JSON.stringify({ rowIds }),
      }
    );
  }

  async pushButton(
    docId: string,
    tableIdOrName: string,
    rowIdOrName: string,
    columnIdOrName: string
  ): Promise<PushButtonResult> {
    return this.request<PushButtonResult>(
      `/docs/${encodeURIComponent(docId)}/tables/${encodeURIComponent(tableIdOrName)}/rows/${encodeURIComponent(rowIdOrName)}/buttons/${encodeURIComponent(columnIdOrName)}`,
      {
        method: 'POST',
      }
    );
  }

  // ===========================================================================
  // Formulas
  // ===========================================================================

  async listFormulas(docId: string, params?: PaginationParams): Promise<PaginatedResponse<Formula>> {
    const queryString = this.buildQueryString(params || {});
    const response = await this.request<{ items: Formula[]; nextPageToken?: string; nextPageLink?: string }>(
      `/docs/${encodeURIComponent(docId)}/formulas${queryString}`
    );
    return {
      items: response.items,
      nextPageToken: response.nextPageToken,
      nextPageLink: response.nextPageLink,
      hasMore: !!response.nextPageToken,
    };
  }

  async getFormula(docId: string, formulaIdOrName: string): Promise<Formula> {
    return this.request<Formula>(
      `/docs/${encodeURIComponent(docId)}/formulas/${encodeURIComponent(formulaIdOrName)}`
    );
  }

  // ===========================================================================
  // Controls
  // ===========================================================================

  async listControls(docId: string, params?: PaginationParams): Promise<PaginatedResponse<Control>> {
    const queryString = this.buildQueryString(params || {});
    const response = await this.request<{ items: Control[]; nextPageToken?: string; nextPageLink?: string }>(
      `/docs/${encodeURIComponent(docId)}/controls${queryString}`
    );
    return {
      items: response.items,
      nextPageToken: response.nextPageToken,
      nextPageLink: response.nextPageLink,
      hasMore: !!response.nextPageToken,
    };
  }

  async getControl(docId: string, controlIdOrName: string): Promise<Control> {
    return this.request<Control>(
      `/docs/${encodeURIComponent(docId)}/controls/${encodeURIComponent(controlIdOrName)}`
    );
  }

  // ===========================================================================
  // Automations
  // ===========================================================================

  async listAutomations(docId: string, params?: PaginationParams): Promise<PaginatedResponse<AutomationRule>> {
    const queryString = this.buildQueryString(params || {});
    const response = await this.request<{ items: AutomationRule[]; nextPageToken?: string; nextPageLink?: string }>(
      `/docs/${encodeURIComponent(docId)}/hooks/automation/rules${queryString}`
    );
    return {
      items: response.items,
      nextPageToken: response.nextPageToken,
      nextPageLink: response.nextPageLink,
      hasMore: !!response.nextPageToken,
    };
  }

  async triggerAutomation(
    docId: string,
    ruleId: string,
    payload?: AutomationTriggerPayload
  ): Promise<TriggerAutomationResult> {
    return this.request<TriggerAutomationResult>(
      `/docs/${encodeURIComponent(docId)}/hooks/automation/${encodeURIComponent(ruleId)}`,
      {
        method: 'POST',
        body: JSON.stringify(payload || {}),
      }
    );
  }

  // ===========================================================================
  // Permissions
  // ===========================================================================

  async getAclMetadata(docId: string): Promise<AclMetadata> {
    return this.request<AclMetadata>(`/docs/${encodeURIComponent(docId)}/acl/metadata`);
  }

  async listPermissions(docId: string, params?: PaginationParams): Promise<PaginatedResponse<Permission>> {
    const queryString = this.buildQueryString(params || {});
    const response = await this.request<{ items: Permission[]; nextPageToken?: string; nextPageLink?: string }>(
      `/docs/${encodeURIComponent(docId)}/acl/permissions${queryString}`
    );
    return {
      items: response.items,
      nextPageToken: response.nextPageToken,
      nextPageLink: response.nextPageLink,
      hasMore: !!response.nextPageToken,
    };
  }

  async addPermission(docId: string, input: PermissionAddInput): Promise<Permission> {
    return this.request<Permission>(`/docs/${encodeURIComponent(docId)}/acl/permissions`, {
      method: 'POST',
      body: JSON.stringify(input),
    });
  }

  async deletePermission(docId: string, permissionId: string): Promise<void> {
    await this.request<void>(
      `/docs/${encodeURIComponent(docId)}/acl/permissions/${encodeURIComponent(permissionId)}`,
      {
        method: 'DELETE',
      }
    );
  }

  async getAclSettings(docId: string): Promise<AclSettings> {
    return this.request<AclSettings>(`/docs/${encodeURIComponent(docId)}/acl/settings`);
  }

  async updateAclSettings(docId: string, settings: Partial<AclSettings>): Promise<AclSettings> {
    return this.request<AclSettings>(`/docs/${encodeURIComponent(docId)}/acl/settings`, {
      method: 'PATCH',
      body: JSON.stringify(settings),
    });
  }

  // ===========================================================================
  // Publishing
  // ===========================================================================

  async listCategories(): Promise<Category[]> {
    const response = await this.request<{ items: Category[] }>('/categories');
    return response.items;
  }

  async publishDoc(docId: string, input: PublishDocInput): Promise<void> {
    await this.request<void>(`/docs/${encodeURIComponent(docId)}/publish`, {
      method: 'PUT',
      body: JSON.stringify(input),
    });
  }

  async unpublishDoc(docId: string): Promise<void> {
    await this.request<void>(`/docs/${encodeURIComponent(docId)}/publish`, {
      method: 'DELETE',
    });
  }

  // ===========================================================================
  // Utilities
  // ===========================================================================

  async resolveBrowserLink(url: string, degradeGracefully = false): Promise<ResolvedResource> {
    const queryString = this.buildQueryString({ url, degradeGracefully });
    return this.request<ResolvedResource>(`/resolveBrowserLink${queryString}`);
  }

  async getMutationStatus(requestId: string): Promise<MutationStatus> {
    return this.request<MutationStatus>(`/mutationStatus/${encodeURIComponent(requestId)}`);
  }
}

// =============================================================================
// Factory Function
// =============================================================================

/**
 * Create a Coda client instance with tenant-specific credentials.
 *
 * MULTI-TENANT: Each request provides its own credentials via headers,
 * allowing a single server deployment to serve multiple tenants.
 *
 * @param credentials - Tenant credentials parsed from request headers
 */
export function createCodaClient(credentials: TenantCredentials): CodaClient {
  return new CodaClientImpl(credentials);
}
