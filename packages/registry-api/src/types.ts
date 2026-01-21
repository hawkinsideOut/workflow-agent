/**
 * Type definitions for the Pattern Registry API
 *
 * These types match the expectations of the RegistryClient in @hawkinside_out/workflow-agent-cli
 */

/**
 * Pattern types supported by the registry
 */
export type PatternType = "fix" | "blueprint" | "solution";

/**
 * A pattern stored in the registry
 */
export interface RegistryPattern {
  id: string;
  type: PatternType;
  data: Record<string, unknown>;
  hash?: string;
  createdAt: string;
  updatedAt?: string;
  contributorId: string;
}

/**
 * Request body for pushing patterns
 */
export interface PushRequest {
  patterns: Array<{
    id: string;
    type: PatternType;
    data: Record<string, unknown>;
    hash?: string;
  }>;
}

/**
 * Response from push endpoint
 */
export interface PushResponse {
  status: "ok" | "error";
  pushed: number;
  skipped: number;
  errors?: string[];
  rateLimit: {
    remaining: number;
    resetAt: string | null;
  };
}

/**
 * Query parameters for pull endpoint
 */
export interface PullQuery {
  type?: PatternType;
  limit?: number;
  offset?: number;
  since?: string;
}

/**
 * Response from pull endpoint
 */
export interface PullResponse {
  patterns: Array<{
    id: string;
    type: PatternType;
    data: Record<string, unknown>;
    hash?: string;
    createdAt?: string;
  }>;
  pagination: {
    offset: number;
    limit: number;
    total: number;
    hasMore: boolean;
  };
}

/**
 * Rate limit info
 */
export interface RateLimitInfo {
  remaining: number;
  resetAt: string | null;
  isLimited: boolean;
}

/**
 * API error response
 */
export interface ErrorResponse {
  error: string;
  message?: string;
  details?: Array<{
    path: (string | number)[];
    message: string;
  }>;
  resetAt?: string;
  remaining?: number;
}
