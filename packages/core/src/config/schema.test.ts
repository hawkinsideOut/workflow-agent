/**
 * Tests for config schema validation
 */

import { describe, it, expect } from "vitest";
import { WorkflowConfigSchema } from "./schema.js";

// Note: validateScopeName was removed as scope name validation is now done via Zod's built-in refinement

describe("WorkflowConfigSchema", () => {
  it("should validate config with valid scope names", () => {
    const config = {
      projectName: "test-project",
      scopes: [
        {
          name: "api",
          description: "API changes and endpoints",
          allowedTypes: ["feat", "fix"],
        },
      ],
    };

    const result = WorkflowConfigSchema.safeParse(config);
    expect(result.success).toBe(true);
  });

  it("should reject config with reserved scope name", () => {
    const config = {
      projectName: "test-project",
      scopes: [
        {
          name: "test",
          description: "Test changes",
          allowedTypes: ["feat", "fix"],
        },
      ],
    };

    const result = WorkflowConfigSchema.safeParse(config);
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.errors[0].message).toContain("reserved");
    }
  });

  it("should use default reserved names if not specified", () => {
    const config = {
      projectName: "test-project",
      scopes: [
        {
          name: "docs",
          description: "Documentation",
          allowedTypes: ["docs"],
        },
      ],
    };

    const result = WorkflowConfigSchema.safeParse(config);
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.errors[0].message).toContain("reserved");
    }
  });

  it("should validate scope with mandatory guidelines", () => {
    const config = {
      projectName: "test-project",
      scopes: [
        {
          name: "api",
          description: "API changes",
          allowedTypes: ["feat", "fix"],
          mandatoryGuidelines: ["TESTING_STRATEGY.md", "COMPONENT_LIBRARY.md"],
        },
      ],
    };

    const result = WorkflowConfigSchema.safeParse(config);
    expect(result.success).toBe(true);
  });

  it("should validate hooks config with validate-scopes check", () => {
    const config = {
      projectName: "test-project",
      scopes: [
        {
          name: "api",
          description: "API changes",
          allowedTypes: ["feat", "fix"],
        },
      ],
      hooks: {
        preCommit: ["validate-branch", "check-guidelines", "validate-scopes"],
      },
    };

    const result = WorkflowConfigSchema.safeParse(config);
    expect(result.success).toBe(true);
  });
});
