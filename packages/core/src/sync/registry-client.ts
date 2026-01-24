/**
 * Registry Client for pattern sync
 *
 * HTTP client for pushing patterns to and pulling patterns from
 * the community pattern registry.
 */

import type {
  FixPattern,
  Blueprint,
  SolutionPattern,
} from "@hawkinside_out/workflow-improvement-tracker";

// Default registry URL
const DEFAULT_REGISTRY_URL = "https://registry-api-rust.vercel.app";

/**
 * Pattern payload for push/pull operations
 */
export interface RegistryPattern {
  id: string;
  type: "fix" | "blueprint" | "solution";
  data: Record<string, unknown>;
  hash?: string;
  createdAt?: string;
}

/**
 * Push response from registry
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
 * Pull response from registry
 */
export interface PullResponse {
  patterns: RegistryPattern[];
  pagination: {
    offset: number;
    limit: number;
    total: number;
    hasMore: boolean;
  };
}

/**
 * Rate limit error details
 */
export interface RateLimitError {
  message: string;
  resetAt: string | null;
  remaining: number;
}

/**
 * Registry client options
 */
export interface RegistryClientOptions {
  /**
   * Base URL of the registry API
   * Defaults to https://patterns.workflow-agent.dev
   * Can be overridden via WORKFLOW_REGISTRY_URL env var
   */
  baseUrl?: string;

  /**
   * Request timeout in milliseconds
   * Defaults to 30000 (30 seconds)
   */
  timeout?: number;

  /**
   * Number of retry attempts for failed requests
   * Defaults to 3
   */
  retries?: number;
}

/**
 * Registry Client
 *
 * Handles HTTP communication with the pattern registry API
 */
export class RegistryClient {
  private readonly baseUrl: string;
  private readonly timeout: number;
  private readonly retries: number;

  constructor(options: RegistryClientOptions = {}) {
    // Priority: options > env var > default
    this.baseUrl =
      options.baseUrl ||
      process.env.WORKFLOW_REGISTRY_URL ||
      DEFAULT_REGISTRY_URL;

    // Ensure no trailing slash
    this.baseUrl = this.baseUrl.replace(/\/$/, "");

    this.timeout = options.timeout ?? 30000;
    this.retries = options.retries ?? 3;
  }

  /**
   * Push patterns to the registry
   *
   * @param patterns - Array of anonymized patterns to push
   * @param contributorId - Anonymous contributor ID
   * @returns Push result with count of pushed/skipped patterns
   * @throws Error if rate limited or push fails
   */
  async push(
    patterns: Array<{
      pattern: FixPattern | Blueprint | SolutionPattern;
      type: "fix" | "blueprint" | "solution";
      hash?: string;
    }>,
    contributorId: string,
  ): Promise<PushResponse> {
    const payload = {
      patterns: patterns.map((p) => ({
        id: p.pattern.id,
        type: p.type,
        data: p.pattern as unknown as Record<string, unknown>,
        hash: p.hash,
      })),
    };

    const response = await this.request<PushResponse>("/api/patterns/push", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-contributor-id": contributorId,
      },
      body: JSON.stringify(payload),
    });

    return response;
  }

  /**
   * Pull patterns from the registry
   *
   * @param options - Pull options
   * @returns Array of patterns from the registry
   */
  async pull(
    options: {
      type?: "fix" | "blueprint" | "solution";
      limit?: number;
      offset?: number;
      since?: string;
    } = {},
  ): Promise<PullResponse> {
    const params = new URLSearchParams();

    if (options.type) {
      params.set("type", options.type);
    }
    if (options.limit) {
      params.set("limit", options.limit.toString());
    }
    if (options.offset) {
      params.set("offset", options.offset.toString());
    }
    if (options.since) {
      params.set("since", options.since);
    }

    const queryString = params.toString();
    const url = `/api/patterns/pull${queryString ? `?${queryString}` : ""}`;

    return this.request<PullResponse>(url, {
      method: "GET",
    });
  }

  /**
   * Get a single pattern by ID
   *
   * @param patternId - UUID of the pattern
   * @returns Pattern data or null if not found
   */
  async getPattern(patternId: string): Promise<RegistryPattern | null> {
    try {
      return await this.request<RegistryPattern>(`/api/patterns/${patternId}`, {
        method: "GET",
      });
    } catch (error) {
      if (error instanceof RegistryError && error.statusCode === 404) {
        return null;
      }
      throw error;
    }
  }

  /**
   * Check if the registry is available
   */
  async healthCheck(): Promise<boolean> {
    try {
      await this.request<{ status: string }>("/api/health", {
        method: "GET",
      });
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Make an HTTP request to the registry
   */
  private async request<T>(path: string, options: RequestInit): Promise<T> {
    const url = `${this.baseUrl}${path}`;
    let lastError: Error | null = null;

    for (let attempt = 1; attempt <= this.retries; attempt++) {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), this.timeout);

        const response = await fetch(url, {
          ...options,
          signal: controller.signal,
        });

        clearTimeout(timeoutId);

        if (response.status === 429) {
          // Rate limited
          const body = (await response.json()) as {
            message?: string;
            resetAt?: string | null;
            remaining?: number;
          };
          throw new RateLimitedException(
            body.message || "Rate limit exceeded",
            body.resetAt ?? null,
            body.remaining ?? 0,
          );
        }

        if (!response.ok) {
          const body = (await response.json().catch(() => ({}))) as {
            error?: string;
          };
          throw new RegistryError(
            body.error || `Request failed with status ${response.status}`,
            response.status,
            body,
          );
        }

        return (await response.json()) as T;
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));

        // Don't retry rate limit errors
        if (error instanceof RateLimitedException) {
          throw error;
        }

        // Don't retry on 4xx errors (except timeout)
        if (
          error instanceof RegistryError &&
          error.statusCode >= 400 &&
          error.statusCode < 500
        ) {
          throw error;
        }

        // Wait before retrying (exponential backoff)
        if (attempt < this.retries) {
          await new Promise((resolve) =>
            setTimeout(resolve, Math.pow(2, attempt) * 1000),
          );
        }
      }
    }

    throw lastError ?? new Error("Request failed after retries");
  }
}

/**
 * Registry API error
 */
export class RegistryError extends Error {
  constructor(
    message: string,
    public readonly statusCode: number,
    public readonly body?: unknown,
  ) {
    super(message);
    this.name = "RegistryError";
  }
}

/**
 * Rate limit exceeded error
 */
export class RateLimitedException extends Error {
  constructor(
    message: string,
    public readonly resetAt: string | null,
    public readonly remaining: number,
  ) {
    super(message);
    this.name = "RateLimitedException";
  }

  /**
   * Get human-readable time until rate limit resets
   */
  getTimeUntilReset(): string {
    if (!this.resetAt) {
      return "unknown";
    }

    const resetTime = new Date(this.resetAt).getTime();
    const now = Date.now();
    const diffMs = resetTime - now;

    if (diffMs <= 0) {
      return "now";
    }

    const minutes = Math.ceil(diffMs / 60000);
    if (minutes < 60) {
      return `${minutes} minute${minutes === 1 ? "" : "s"}`;
    }

    const hours = Math.ceil(minutes / 60);
    return `${hours} hour${hours === 1 ? "" : "s"}`;
  }
}
