/**
 * Unit tests for validation functions
 */

import { describe, it, expect } from "vitest";
import {
  isValidPatternType,
  isValidUUID,
  validatePushRequest,
  validatePullQuery,
  validateContributorId,
} from "../src/validation";

describe("isValidPatternType", () => {
  it("accepts valid pattern types", () => {
    expect(isValidPatternType("fix")).toBe(true);
    expect(isValidPatternType("blueprint")).toBe(true);
    expect(isValidPatternType("solution")).toBe(true);
  });

  it("rejects invalid pattern types", () => {
    expect(isValidPatternType("invalid")).toBe(false);
    expect(isValidPatternType("")).toBe(false);
    expect(isValidPatternType(null)).toBe(false);
    expect(isValidPatternType(undefined)).toBe(false);
    expect(isValidPatternType(123)).toBe(false);
  });
});

describe("isValidUUID", () => {
  it("accepts valid UUIDs", () => {
    expect(isValidUUID("550e8400-e29b-41d4-a716-446655440000")).toBe(true);
    expect(isValidUUID("6ba7b810-9dad-11d1-80b4-00c04fd430c8")).toBe(true);
    expect(isValidUUID("f47ac10b-58cc-4372-a567-0e02b2c3d479")).toBe(true);
  });

  it("rejects invalid UUIDs", () => {
    expect(isValidUUID("not-a-uuid")).toBe(false);
    expect(isValidUUID("550e8400-e29b-41d4-a716")).toBe(false);
    expect(isValidUUID("")).toBe(false);
    expect(isValidUUID(null)).toBe(false);
    expect(isValidUUID(123)).toBe(false);
  });
});

describe("validatePushRequest", () => {
  const validPattern = {
    id: "550e8400-e29b-41d4-a716-446655440000",
    type: "fix",
    data: {
      name: "Test Pattern",
      description: "A test pattern for validation",
    },
  };

  it("accepts valid push requests", () => {
    const result = validatePushRequest({ patterns: [validPattern] });
    expect(result.success).toBe(true);
    expect(result.data?.patterns).toHaveLength(1);
  });

  it("accepts multiple patterns", () => {
    const result = validatePushRequest({
      patterns: [
        validPattern,
        { ...validPattern, id: "660e8400-e29b-41d4-a716-446655440001" },
      ],
    });
    expect(result.success).toBe(true);
    expect(result.data?.patterns).toHaveLength(2);
  });

  it("rejects non-object body", () => {
    expect(validatePushRequest(null).success).toBe(false);
    expect(validatePushRequest("string").success).toBe(false);
    expect(validatePushRequest(123).success).toBe(false);
  });

  it("rejects missing patterns array", () => {
    const result = validatePushRequest({});
    expect(result.success).toBe(false);
    expect(result.errors?.[0]?.path).toEqual(["patterns"]);
  });

  it("rejects empty patterns array", () => {
    const result = validatePushRequest({ patterns: [] });
    expect(result.success).toBe(false);
    expect(result.errors?.[0]?.message).toContain("empty");
  });

  it("rejects too many patterns", () => {
    const patterns = Array(51).fill(validPattern);
    const result = validatePushRequest({ patterns });
    expect(result.success).toBe(false);
    expect(result.errors?.[0]?.message).toContain("50");
  });

  it("rejects invalid pattern ID", () => {
    const result = validatePushRequest({
      patterns: [{ ...validPattern, id: "invalid" }],
    });
    expect(result.success).toBe(false);
    expect(result.errors?.some((e) => e.path.includes("id"))).toBe(true);
  });

  it("rejects invalid pattern type", () => {
    const result = validatePushRequest({
      patterns: [{ ...validPattern, type: "invalid" }],
    });
    expect(result.success).toBe(false);
    expect(result.errors?.some((e) => e.path.includes("type"))).toBe(true);
  });

  it("rejects missing pattern data", () => {
    const result = validatePushRequest({
      patterns: [{ id: validPattern.id, type: "fix" }],
    });
    expect(result.success).toBe(false);
    expect(result.errors?.some((e) => e.path.includes("data"))).toBe(true);
  });

  it("rejects pattern without name", () => {
    const result = validatePushRequest({
      patterns: [
        {
          ...validPattern,
          data: { description: "A pattern without a name" },
        },
      ],
    });
    expect(result.success).toBe(false);
    expect(result.errors?.some((e) => e.path.includes("name"))).toBe(true);
  });

  it("rejects pattern with short name", () => {
    const result = validatePushRequest({
      patterns: [
        {
          ...validPattern,
          data: { name: "AB", description: "A pattern with short name" },
        },
      ],
    });
    expect(result.success).toBe(false);
  });

  it("rejects pattern without description", () => {
    const result = validatePushRequest({
      patterns: [
        {
          ...validPattern,
          data: { name: "Test Pattern" },
        },
      ],
    });
    expect(result.success).toBe(false);
    expect(result.errors?.some((e) => e.path.includes("description"))).toBe(
      true,
    );
  });
});

describe("validatePullQuery", () => {
  it("accepts empty query (defaults)", () => {
    const result = validatePullQuery({});
    expect(result.success).toBe(true);
    expect(result.data).toEqual({});
  });

  it("accepts valid type parameter", () => {
    const result = validatePullQuery({ type: "blueprint" });
    expect(result.success).toBe(true);
    expect(result.data?.type).toBe("blueprint");
  });

  it("rejects invalid type parameter", () => {
    const result = validatePullQuery({ type: "invalid" });
    expect(result.success).toBe(false);
  });

  it("accepts valid limit parameter", () => {
    const result = validatePullQuery({ limit: "25" });
    expect(result.success).toBe(true);
    expect(result.data?.limit).toBe(25);
  });

  it("rejects limit over 100", () => {
    const result = validatePullQuery({ limit: "150" });
    expect(result.success).toBe(false);
  });

  it("rejects limit under 1", () => {
    const result = validatePullQuery({ limit: "0" });
    expect(result.success).toBe(false);
  });

  it("accepts valid offset parameter", () => {
    const result = validatePullQuery({ offset: "10" });
    expect(result.success).toBe(true);
    expect(result.data?.offset).toBe(10);
  });

  it("rejects negative offset", () => {
    const result = validatePullQuery({ offset: "-5" });
    expect(result.success).toBe(false);
  });

  it("accepts valid since parameter", () => {
    const result = validatePullQuery({ since: "2024-01-01T00:00:00Z" });
    expect(result.success).toBe(true);
    expect(result.data?.since).toBe("2024-01-01T00:00:00Z");
  });

  it("rejects invalid since parameter", () => {
    const result = validatePullQuery({ since: "not-a-date" });
    expect(result.success).toBe(false);
  });

  it("accepts multiple valid parameters", () => {
    const result = validatePullQuery({
      type: "fix",
      limit: "20",
      offset: "5",
      since: "2024-01-01T00:00:00Z",
    });
    expect(result.success).toBe(true);
    expect(result.data).toEqual({
      type: "fix",
      limit: 20,
      offset: 5,
      since: "2024-01-01T00:00:00Z",
    });
  });
});

describe("validateContributorId", () => {
  it("accepts valid contributor IDs", () => {
    const result = validateContributorId("wf-contributor-abc123def456");
    expect(result.success).toBe(true);
    expect(result.data).toBe("wf-contributor-abc123def456");
  });

  it("rejects missing contributor ID", () => {
    expect(validateContributorId(null).success).toBe(false);
    expect(validateContributorId(undefined).success).toBe(false);
    expect(validateContributorId("").success).toBe(false);
  });

  it("rejects too short contributor ID", () => {
    const result = validateContributorId("short");
    expect(result.success).toBe(false);
  });

  it("rejects too long contributor ID", () => {
    const longId = "a".repeat(101);
    const result = validateContributorId(longId);
    expect(result.success).toBe(false);
  });
});
