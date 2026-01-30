/**
 * Coda Entity Types
 *
 * Type definitions for Coda API responses and entities.
 */

// =============================================================================
// Pagination
// =============================================================================

export interface PaginationParams {
  /** Number of items to return */
  limit?: number;
  /** Page token for pagination */
  pageToken?: string;
}

export interface PaginatedResponse<T> {
  /** Array of items */
  items: T[];
  /** Link to next page (contains pageToken) */
  nextPageLink?: string;
  /** Token for next page */
  nextPageToken?: string;
  /** Total count (if available) */
  total?: number;
  /** Whether more items are available */
  hasMore: boolean;
}

// =============================================================================
// Doc
// =============================================================================

export interface Doc {
  id: string;
  type: 'doc';
  href: string;
  browserLink: string;
  name: string;
  owner: string;
  ownerName?: string;
  createdAt: string;
  updatedAt: string;
  workspace: WorkspaceRef;
  folder: FolderRef;
  icon?: Icon;
  docSize?: DocSize;
  sourceDoc?: SourceDoc;
  published?: PublishedInfo;
}

export interface WorkspaceRef {
  id: string;
  type: 'workspace';
  organizationId?: string;
  browserLink: string;
  name?: string;
}

export interface FolderRef {
  id: string;
  type: 'folder';
  browserLink: string;
  name?: string;
}

export interface Icon {
  name: string;
  type: 'image' | 'emoji';
  browserLink?: string;
}

export interface DocSize {
  totalRowCount: number;
  tableAndViewCount: number;
  pageCount: number;
  overApiSizeLimit: boolean;
}

export interface SourceDoc {
  id: string;
  type: 'doc';
  href: string;
  browserLink: string;
}

export interface PublishedInfo {
  description?: string;
  browserLink?: string;
  imageLink?: string;
  discoverable?: boolean;
  earnCredit?: boolean;
  mode?: 'view' | 'play' | 'edit';
  categories?: string[];
}

export interface DocCreateInput {
  title: string;
  sourceDoc?: string;
  timezone?: string;
  folderId?: string;
}

// =============================================================================
// Page
// =============================================================================

export interface Page {
  id: string;
  type: 'page';
  href: string;
  browserLink: string;
  name: string;
  subtitle?: string;
  icon?: Icon;
  image?: PageImage;
  parent?: PageRef;
  children?: PageRef[];
  contentType?: 'canvas' | 'embed';
  isHidden?: boolean;
  isEffectivelyHidden?: boolean;
}

export interface PageRef {
  id: string;
  type: 'page';
  href: string;
  browserLink: string;
  name: string;
}

export interface PageImage {
  browserLink: string;
  type: string;
  width: number;
  height: number;
}

export interface PageCreateInput {
  name: string;
  subtitle?: string;
  iconName?: string;
  imageUrl?: string;
  parentPageIdOrName?: string;
  pageContent?: PageContent;
}

export interface PageUpdateInput {
  name?: string;
  subtitle?: string;
  iconName?: string;
  imageUrl?: string;
  isHidden?: boolean;
  contentUpdate?: PageContentUpdate;
}

export interface PageContent {
  type: 'canvas';
  canvasContent: CanvasContent;
}

export interface CanvasContent {
  format: 'html' | 'markdown';
  content: string;
}

export interface PageContentUpdate {
  insertionMode: 'append' | 'replace';
  canvasContent: CanvasContent;
}

// =============================================================================
// Table
// =============================================================================

export interface Table {
  id: string;
  type: 'table' | 'view';
  tableType: 'table' | 'view';
  href: string;
  browserLink: string;
  name: string;
  parent?: TableParent;
  parentTable?: TableRef;
  displayColumn?: ColumnRef;
  rowCount: number;
  sorts: Sort[];
  layout: 'default' | 'areaChart' | 'barChart' | 'bubbleChart' | 'calendar' | 'card' | 'detail' | 'form' | 'ganttChart' | 'lineChart' | 'masterDetail' | 'pieChart' | 'scatterChart' | 'slide' | 'wordCloud';
  filter?: Filter;
  createdAt: string;
  updatedAt: string;
}

export interface TableRef {
  id: string;
  type: 'table';
  href: string;
  browserLink: string;
  name: string;
}

export interface TableParent {
  id: string;
  type: 'page';
  href: string;
  browserLink: string;
  name: string;
}

export interface ColumnRef {
  id: string;
  type: 'column';
  href: string;
}

export interface Sort {
  column: ColumnRef;
  direction: 'ascending' | 'descending';
}

export interface Filter {
  valid: boolean;
  isVolatile: boolean;
  hasUserFormula: boolean;
  hasTodayFormula: boolean;
  hasNowFormula: boolean;
}

// =============================================================================
// Column
// =============================================================================

export interface Column {
  id: string;
  type: 'column';
  href: string;
  name: string;
  display?: boolean;
  calculated?: boolean;
  formula?: string;
  defaultValue?: string;
  format?: ColumnFormat;
  parent?: TableRef;
}

export interface ColumnFormat {
  type: 'text' | 'person' | 'lookup' | 'number' | 'percent' | 'currency' | 'date' | 'dateTime' | 'time' | 'duration' | 'slider' | 'scale' | 'checkbox' | 'select' | 'reaction' | 'button' | 'email' | 'link' | 'image' | 'attachments' | 'canvas';
  isArray?: boolean;
  precision?: number;
  useThousandsSeparator?: boolean;
  currencyCode?: string;
  icon?: string;
  maximum?: number;
  format?: string;
  table?: TableRef;
  display?: string;
  options?: SelectOption[];
  disableIf?: string;
}

export interface SelectOption {
  name: string;
  color?: string;
}

// =============================================================================
// Row
// =============================================================================

export interface Row {
  id: string;
  type: 'row';
  href: string;
  name: string;
  index: number;
  browserLink: string;
  createdAt: string;
  updatedAt: string;
  values: Record<string, CellValue>;
  parent?: TableRef;
}

export type CellValue =
  | string
  | number
  | boolean
  | null
  | CellValue[]
  | LinkedRow
  | PersonValue
  | CurrencyValue
  | ImageValue
  | DateValue;

export interface LinkedRow {
  '@type': 'LinkedRow';
  rowId: string;
  tableId: string;
  name: string;
}

export interface PersonValue {
  '@type': 'Person';
  email: string;
  name?: string;
}

export interface CurrencyValue {
  '@type': 'Currency';
  amount: number;
  currencyCode: string;
}

export interface ImageValue {
  '@type': 'ImageAttachment';
  url: string;
  name?: string;
  mimeType?: string;
  width?: number;
  height?: number;
}

export interface DateValue {
  '@type': 'Date';
  date: string;
}

export interface RowUpsertInput {
  cells: CellInput[];
}

export interface CellInput {
  column: string;
  value: CellValue;
}

export interface RowsUpsertInput {
  rows: RowUpsertInput[];
  keyColumns?: string[];
}

// =============================================================================
// Formula
// =============================================================================

export interface Formula {
  id: string;
  type: 'formula';
  href: string;
  name: string;
  parent?: PageRef;
  value: CellValue;
}

// =============================================================================
// Control
// =============================================================================

export interface Control {
  id: string;
  type: 'control';
  href: string;
  name: string;
  controlType: 'button' | 'checkbox' | 'datePicker' | 'dateRangePicker' | 'dateTimePicker' | 'lookup' | 'multiselect' | 'reaction' | 'scale' | 'select' | 'slider' | 'textbox' | 'timePicker';
  parent?: PageRef;
  value: CellValue;
}

// =============================================================================
// Automation
// =============================================================================

export interface AutomationRule {
  id: string;
  type: 'rule';
  href: string;
  name: string;
  enabled: boolean;
  trigger?: AutomationTrigger;
}

export interface AutomationTrigger {
  type: 'documentCreated' | 'documentShared' | 'rowCreated' | 'rowChanged' | 'rowDeleted' | 'timeInterval' | 'webhook' | 'button';
  tableId?: string;
  columnId?: string;
}

export interface AutomationTriggerPayload {
  message?: string;
}

// =============================================================================
// Permissions / ACL
// =============================================================================

export interface AclMetadata {
  canShare: boolean;
  canShareWithWorkspace: boolean;
  canShareWithOrg: boolean;
  canCopy: boolean;
}

export interface Permission {
  id: string;
  type: 'permission';
  principal: Principal;
  access: AccessType;
}

export interface Principal {
  type: 'email' | 'domain' | 'anyone';
  email?: string;
  domain?: string;
}

export type AccessType = 'readonly' | 'write' | 'comment' | 'none';

export interface PermissionAddInput {
  access: AccessType;
  principal: Principal;
  suppressEmail?: boolean;
}

export interface AclSettings {
  allowEditorsToChangePermissions: boolean;
  allowCopying: boolean;
  allowViewersToRequestEditing: boolean;
}

// =============================================================================
// Publishing
// =============================================================================

export interface Category {
  name: string;
}

export interface PublishDocInput {
  slug?: string;
  discoverable?: boolean;
  earnCredit?: boolean;
  categoryNames?: string[];
  mode?: 'view' | 'play' | 'edit';
}

// =============================================================================
// User / Account
// =============================================================================

export interface UserInfo {
  name: string;
  loginId: string;
  type: 'user';
  scoped: boolean;
  tokenName?: string;
  href: string;
  workspace?: WorkspaceRef;
}

// =============================================================================
// Misc
// =============================================================================

export interface ResolvedResource {
  type: 'doc' | 'page' | 'table' | 'view' | 'row' | 'column' | 'formula' | 'control';
  id: string;
  name?: string;
  href: string;
  browserLink?: string;
  resource?: Doc | Page | Table | Row | Column | Formula | Control;
}

export interface MutationStatus {
  completed: boolean;
  warning?: string;
}

// =============================================================================
// Response Format
// =============================================================================

export type ResponseFormat = 'json' | 'markdown';
