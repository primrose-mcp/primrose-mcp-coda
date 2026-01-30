/**
 * Environment Bindings
 *
 * Type definitions for Cloudflare Worker environment variables and bindings.
 *
 * MULTI-TENANT ARCHITECTURE:
 * This server supports multiple tenants. Tenant-specific credentials (API keys)
 * are passed via request headers, NOT stored in wrangler secrets. This allows
 * a single server instance to serve multiple customers.
 *
 * Request Headers:
 * - X-Coda-API-Key: API token for Coda authentication
 * - X-Coda-Base-URL: (Optional) Override the default Coda API base URL
 */

// =============================================================================
// Tenant Credentials (parsed from request headers)
// =============================================================================

export interface TenantCredentials {
  /** API Key for Coda authentication (from X-Coda-API-Key header) */
  apiKey?: string;

  /** Override Coda API base URL (from X-Coda-Base-URL header) */
  baseUrl?: string;
}

/**
 * Parse tenant credentials from request headers
 */
export function parseTenantCredentials(request: Request): TenantCredentials {
  const headers = request.headers;

  return {
    apiKey: headers.get('X-Coda-API-Key') || undefined,
    baseUrl: headers.get('X-Coda-Base-URL') || undefined,
  };
}

/**
 * Validate that required credentials are present
 */
export function validateCredentials(credentials: TenantCredentials): void {
  if (!credentials.apiKey) {
    throw new Error('Missing credentials. Provide X-Coda-API-Key header.');
  }
}

// =============================================================================
// Environment Configuration (from wrangler.jsonc vars and bindings)
// =============================================================================

export interface Env {
  // ===========================================================================
  // Environment Variables (from wrangler.jsonc vars)
  // ===========================================================================

  /** Maximum character limit for responses */
  CHARACTER_LIMIT: string;

  /** Default page size for list operations */
  DEFAULT_PAGE_SIZE: string;

  /** Maximum page size allowed */
  MAX_PAGE_SIZE: string;

  // ===========================================================================
  // Bindings
  // ===========================================================================

  /** KV namespace for caching (optional) */
  CACHE_KV?: KVNamespace;

  /** Durable Object namespace for MCP sessions */
  MCP_SESSIONS?: DurableObjectNamespace;

  /** Cloudflare AI binding (optional) */
  AI?: Ai;
}

// ===========================================================================
// Helper Functions
// ===========================================================================

/**
 * Get a numeric environment value with a default
 */
export function getEnvNumber(env: Env, key: keyof Env, defaultValue: number): number {
  const value = env[key];
  if (typeof value === 'string') {
    const parsed = parseInt(value, 10);
    return Number.isNaN(parsed) ? defaultValue : parsed;
  }
  return defaultValue;
}

/**
 * Get the character limit from environment
 */
export function getCharacterLimit(env: Env): number {
  return getEnvNumber(env, 'CHARACTER_LIMIT', 50000);
}

/**
 * Get the default page size from environment
 */
export function getDefaultPageSize(env: Env): number {
  return getEnvNumber(env, 'DEFAULT_PAGE_SIZE', 20);
}

/**
 * Get the maximum page size from environment
 */
export function getMaxPageSize(env: Env): number {
  return getEnvNumber(env, 'MAX_PAGE_SIZE', 100);
}
