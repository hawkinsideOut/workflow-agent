/**
 * Validation schemas for incoming API requests
 */

import type { PatternType, PushRequest, PullQuery } from "./types";

/**
 * Validation result
 */
export interface ValidationResult<T> {
  success: boolean;
  data?: T;
  errors?: Array<{ path: string[]; message: string }>;
}

/**
 * Validate pattern type
 */
export function isValidPatternType(type: unknown): type is PatternType {
  return type === "fix" || type === "blueprint" || type === "solution";
}

/**
 * Validate UUID format
 */
export function isValidUUID(id: unknown): boolean {
  if (typeof id !== "string") return false;
  const uuidRegex =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  return uuidRegex.test(id);
}

/**
 * Validate a push request
 */
export function validatePushRequest(
  body: unknown,
): ValidationResult<PushRequest> {
  const errors: Array<{ path: string[]; message: string }> = [];

  if (!body || typeof body !== "object") {
    return {
      success: false,
      errors: [{ path: [], message: "Request body must be an object" }],
    };
  }

  const data = body as Record<string, unknown>;

  if (!Array.isArray(data.patterns)) {
    return {
      success: false,
      errors: [{ path: ["patterns"], message: "patterns must be an array" }],
    };
  }

  if (data.patterns.length === 0) {
    return {
      success: false,
      errors: [
        { path: ["patterns"], message: "patterns array cannot be empty" },
      ],
    };
  }

  if (data.patterns.length > 50) {
    return {
      success: false,
      errors: [
        {
          path: ["patterns"],
          message: "Cannot push more than 50 patterns at once",
        },
      ],
    };
  }

  // Validate each pattern
  for (let i = 0; i < data.patterns.length; i++) {
    const pattern = data.patterns[i] as Record<string, unknown>;

    if (!pattern || typeof pattern !== "object") {
      errors.push({
        path: ["patterns", String(i)],
        message: "must be an object",
      });
      continue;
    }

    if (!isValidUUID(pattern.id)) {
      errors.push({
        path: ["patterns", String(i), "id"],
        message: "must be a valid UUID",
      });
    }

    if (!isValidPatternType(pattern.type)) {
      errors.push({
        path: ["patterns", String(i), "type"],
        message: "must be 'fix', 'blueprint', or 'solution'",
      });
    }

    if (!pattern.data || typeof pattern.data !== "object") {
      errors.push({
        path: ["patterns", String(i), "data"],
        message: "must be an object",
      });
    }

    // Basic content validation - check for required fields based on type
    if (pattern.data && typeof pattern.data === "object") {
      const patternData = pattern.data as Record<string, unknown>;

      if (!patternData.name || typeof patternData.name !== "string") {
        errors.push({
          path: ["patterns", String(i), "data", "name"],
          message: "pattern must have a name",
        });
      }

      if (
        !patternData.description ||
        typeof patternData.description !== "string"
      ) {
        errors.push({
          path: ["patterns", String(i), "data", "description"],
          message: "pattern must have a description",
        });
      }

      // Validate name length
      if (
        typeof patternData.name === "string" &&
        (patternData.name.length < 3 || patternData.name.length > 200)
      ) {
        errors.push({
          path: ["patterns", String(i), "data", "name"],
          message: "name must be between 3 and 200 characters",
        });
      }

      // Validate description length
      if (
        typeof patternData.description === "string" &&
        (patternData.description.length < 10 ||
          patternData.description.length > 2000)
      ) {
        errors.push({
          path: ["patterns", String(i), "data", "description"],
          message: "description must be between 10 and 2000 characters",
        });
      }
    }
  }

  if (errors.length > 0) {
    return { success: false, errors };
  }

  return { success: true, data: data as unknown as PushRequest };
}

/**
 * Validate pull query parameters
 */
export function validatePullQuery(
  query: Record<string, string | string[] | undefined>,
): ValidationResult<PullQuery> {
  const errors: Array<{ path: string[]; message: string }> = [];
  const result: PullQuery = {};

  // Validate type
  if (query.type !== undefined) {
    const type = Array.isArray(query.type) ? query.type[0] : query.type;
    if (!isValidPatternType(type)) {
      errors.push({
        path: ["type"],
        message: "must be 'fix', 'blueprint', or 'solution'",
      });
    } else {
      result.type = type;
    }
  }

  // Validate limit
  if (query.limit !== undefined) {
    const limit = parseInt(
      Array.isArray(query.limit) ? query.limit[0] : query.limit,
      10,
    );
    if (isNaN(limit) || limit < 1 || limit > 100) {
      errors.push({ path: ["limit"], message: "must be between 1 and 100" });
    } else {
      result.limit = limit;
    }
  }

  // Validate offset
  if (query.offset !== undefined) {
    const offset = parseInt(
      Array.isArray(query.offset) ? query.offset[0] : query.offset,
      10,
    );
    if (isNaN(offset) || offset < 0) {
      errors.push({
        path: ["offset"],
        message: "must be a non-negative number",
      });
    } else {
      result.offset = offset;
    }
  }

  // Validate since (ISO timestamp)
  if (query.since !== undefined) {
    const since = Array.isArray(query.since) ? query.since[0] : query.since;
    const date = new Date(since);
    if (isNaN(date.getTime())) {
      errors.push({
        path: ["since"],
        message: "must be a valid ISO timestamp",
      });
    } else {
      result.since = since;
    }
  }

  if (errors.length > 0) {
    return { success: false, errors };
  }

  return { success: true, data: result };
}

/**
 * Validate contributor ID header
 */
export function validateContributorId(
  contributorId: string | null | undefined,
): ValidationResult<string> {
  if (!contributorId || typeof contributorId !== "string") {
    return {
      success: false,
      errors: [{ path: ["x-contributor-id"], message: "header is required" }],
    };
  }

  // Basic format validation: wf-contributor-xxx or similar
  if (contributorId.length < 10 || contributorId.length > 100) {
    return {
      success: false,
      errors: [
        {
          path: ["x-contributor-id"],
          message: "must be between 10 and 100 characters",
        },
      ],
    };
  }

  return { success: true, data: contributorId };
}
