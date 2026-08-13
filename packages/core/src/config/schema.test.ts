/**
 * Tests for config schema validation
 */

import { describe, it, expect } from "vitest";
import { WorkflowConfigSchema } from "./schema.js";

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
          name: "init",
          description: "Init changes",
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
          name: "config",
          description: "Configuration",
          allowedTypes: ["chore"],
        },
      ],
    };

    const result = WorkflowConfigSchema.safeParse(config);
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.errors[0].message).toContain("reserved");
    }
  });

  it("should allow common conventional-commit scope names by default", () => {
    const config = {
      projectName: "test-project",
      scopes: [
        { name: "test", description: "Test suite changes" },
        { name: "docs", description: "Documentation changes" },
        { name: "deps", description: "Dependency bumps" },
        { name: "build", description: "Build system changes" },
        { name: "ci", description: "CI pipeline changes" },
      ],
    };

    const result = WorkflowConfigSchema.safeParse(config);
    expect(result.success).toBe(true);
  });

  it("should allow reserved scope names when overridden via reservedScopeNames", () => {
    const config = {
      projectName: "test-project",
      reservedScopeNames: [],
      scopes: [
        { name: "init", description: "Init scope changes" },
        { name: "config", description: "Config scope changes" },
      ],
    };

    const result = WorkflowConfigSchema.safeParse(config);
    expect(result.success).toBe(true);
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
