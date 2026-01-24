/**
 * Configuration Auto-Fix Utilities
 *
 * Provides automatic resolution for common configuration validation errors
 * such as reserved scope names and short descriptions.
 */

import { writeFile, readFile } from "fs/promises";
import { existsSync } from "fs";
import { join } from "path";
import { z } from "zod";
import { WorkflowConfigSchema } from "./schema.js";

// Suggested replacements for reserved names
const RESERVED_NAME_REPLACEMENTS: Record<string, string> = {
  init: "setup",
  create: "add",
  build: "compile",
  test: "testing",
  config: "settings",
  docs: "documentation",
  ci: "pipeline",
  deps: "dependencies",
};

export interface ConfigValidationIssue {
  path: string;
  code: string;
  message: string;
  currentValue?: unknown;
  suggestedFix?: {
    description: string;
    newValue: unknown;
  };
}

export interface ConfigLoadResult {
  config: z.infer<typeof WorkflowConfigSchema> | null;
  rawConfig: unknown;
  configPath: string | null;
  issues: ConfigValidationIssue[];
  valid: boolean;
}

export interface AutoFixResult {
  fixed: boolean;
  changes: string[];
  newConfig: unknown;
}

/**
 * Analyze a Zod error and generate fix suggestions
 */
export function analyzeValidationError(
  error: z.ZodError,
  rawConfig: unknown,
): ConfigValidationIssue[] {
  const issues: ConfigValidationIssue[] = [];

  for (const err of error.errors) {
    const pathStr = err.path.join(".");
    const issue: ConfigValidationIssue = {
      path: pathStr,
      code: err.code,
      message: err.message,
      currentValue: getValueAtPath(rawConfig, err.path),
    };

    // Generate fix suggestions based on error type
    if (
      err.path.includes("description") &&
      err.message.includes("at least 10 characters")
    ) {
      const currentValue = issue.currentValue as string;
      issue.suggestedFix = {
        description: "Extend description to meet minimum length",
        newValue: padDescription(currentValue),
      };
    } else if (
      err.path.includes("name") &&
      err.message.includes("reserved word")
    ) {
      const currentValue = issue.currentValue as string;
      const replacement =
        RESERVED_NAME_REPLACEMENTS[currentValue] || `${currentValue}-scope`;
      issue.suggestedFix = {
        description: `Rename from "${currentValue}" to "${replacement}"`,
        newValue: replacement,
      };
    } else if (err.code === "too_small" && err.path.includes("description")) {
      const currentValue = (issue.currentValue as string) || "";
      issue.suggestedFix = {
        description: "Extend description to meet minimum length",
        newValue: padDescription(currentValue),
      };
    }

    issues.push(issue);
  }

  return issues;
}

/**
 * Apply auto-fixes to a raw configuration object
 */
export function applyAutoFixes(
  rawConfig: unknown,
  issues: ConfigValidationIssue[],
): AutoFixResult {
  const changes: string[] = [];
  // Deep clone the config
  const newConfig = JSON.parse(JSON.stringify(rawConfig));

  for (const issue of issues) {
    if (issue.suggestedFix) {
      const path = issue.path.split(".");
      setValueAtPath(newConfig, path, issue.suggestedFix.newValue);
      changes.push(
        `${issue.path}: ${issue.suggestedFix.description} (${JSON.stringify(issue.currentValue)} → ${JSON.stringify(issue.suggestedFix.newValue)})`,
      );
    }
  }

  return {
    fixed: changes.length > 0,
    changes,
    newConfig,
  };
}

/**
 * Write fixed configuration back to file
 */
export async function writeFixedConfig(
  configPath: string,
  config: unknown,
): Promise<void> {
  const content = JSON.stringify(config, null, 2);
  await writeFile(configPath, content, "utf-8");
}

/**
 * Attempt to auto-fix a configuration file
 */
export async function autoFixConfigFile(cwd: string = process.cwd()): Promise<{
  success: boolean;
  configPath: string | null;
  changes: string[];
  error?: string;
}> {
  const configPaths = [
    "workflow.config.json",
    ".workflowrc.json",
    ".workflowrc",
  ];

  let configPath: string | null = null;
  for (const path of configPaths) {
    const fullPath = join(cwd, path);
    if (existsSync(fullPath)) {
      configPath = fullPath;
      break;
    }
  }

  if (!configPath) {
    return {
      success: false,
      configPath: null,
      changes: [],
      error: "No JSON configuration file found to fix",
    };
  }

  try {
    const content = await readFile(configPath, "utf-8");
    const rawConfig = JSON.parse(content);

    // Try to validate
    const result = WorkflowConfigSchema.safeParse(rawConfig);

    if (result.success) {
      return {
        success: true,
        configPath,
        changes: [],
      };
    }

    // Analyze and fix issues
    const issues = analyzeValidationError(result.error, rawConfig);
    const fixResult = applyAutoFixes(rawConfig, issues);

    if (!fixResult.fixed) {
      return {
        success: false,
        configPath,
        changes: [],
        error: "No automatic fixes available for the validation errors",
      };
    }

    // Validate the fixed config
    const fixedResult = WorkflowConfigSchema.safeParse(fixResult.newConfig);
    if (!fixedResult.success) {
      return {
        success: false,
        configPath,
        changes: fixResult.changes,
        error: "Auto-fix applied but configuration still has validation errors",
      };
    }

    // Write the fixed config
    await writeFixedConfig(configPath, fixResult.newConfig);

    return {
      success: true,
      configPath,
      changes: fixResult.changes,
    };
  } catch (error) {
    return {
      success: false,
      configPath,
      changes: [],
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

// Utility functions

function padDescription(description: string): string {
  if (!description) {
    return "Description for this scope";
  }
  if (description.length >= 10) {
    return description;
  }
  // Pad with meaningful suffix based on what exists
  const suffixes = [" changes", " updates", " work", " tasks"];
  for (const suffix of suffixes) {
    if ((description + suffix).length >= 10) {
      return description + suffix;
    }
  }
  // Last resort: pad with generic text
  return description + " related changes";
}

function getValueAtPath(obj: unknown, path: (string | number)[]): unknown {
  let current: unknown = obj;
  for (const key of path) {
    if (current === null || current === undefined) {
      return undefined;
    }
    current = (current as Record<string, unknown>)[key];
  }
  return current;
}

function setValueAtPath(obj: unknown, path: string[], value: unknown): void {
  let current: Record<string, unknown> = obj as Record<string, unknown>;
  for (let i = 0; i < path.length - 1; i++) {
    const key = path[i];
    if (current[key] === undefined) {
      current[key] = {};
    }
    current = current[key] as Record<string, unknown>;
  }
  current[path[path.length - 1]] = value;
}
