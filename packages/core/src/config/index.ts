import { cosmiconfig } from "cosmiconfig";
import { WorkflowConfig, WorkflowConfigSchema } from "./schema.js";
import { join } from "path";
import { existsSync } from "fs";

const explorer = cosmiconfig("workflow", {
  searchPlaces: [
    "workflow.config.ts",
    "workflow.config.js",
    "workflow.config.json",
    ".workflowrc",
    ".workflowrc.json",
    "package.json",
  ],
});

export async function loadConfig(
  cwd: string = process.cwd(),
): Promise<WorkflowConfig | null> {
  try {
    const result = await explorer.search(cwd);

    if (!result || !result.config) {
      return null;
    }

    // Validate config against schema
    const validated = WorkflowConfigSchema.parse(result.config);
    return validated;
  } catch (error) {
    if (error instanceof Error) {
      throw new Error(`Failed to load workflow config: ${error.message}`);
    }
    throw error;
  }
}

/**
 * Result from safe config loading - never throws
 */
export interface SafeConfigResult {
  config: WorkflowConfig | null;
  rawConfig: unknown;
  configPath: string | null;
  issues: Array<{
    path: string;
    code: string;
    message: string;
    currentValue?: unknown;
    suggestedFix?: {
      description: string;
      newValue: unknown;
    };
  }>;
  valid: boolean;
}

/**
 * Load configuration without throwing on validation errors.
 * Returns detailed information about issues for graceful handling.
 */
export async function loadConfigSafe(
  cwd: string = process.cwd(),
): Promise<SafeConfigResult> {
  try {
    const result = await explorer.search(cwd);

    if (!result || !result.config) {
      return {
        config: null,
        rawConfig: null,
        configPath: null,
        issues: [],
        valid: true, // No config is valid (just missing)
      };
    }

    // Use safeParse for graceful validation
    const validated = WorkflowConfigSchema.safeParse(result.config);

    if (validated.success) {
      return {
        config: validated.data,
        rawConfig: result.config,
        configPath: result.filepath,
        issues: [],
        valid: true,
      };
    }

    // Import auto-fix utilities for analyzing errors
    const { analyzeValidationError } = await import("./auto-fix.js");
    const issues = analyzeValidationError(validated.error, result.config);

    return {
      config: null,
      rawConfig: result.config,
      configPath: result.filepath,
      issues,
      valid: false,
    };
  } catch (error) {
    return {
      config: null,
      rawConfig: null,
      configPath: null,
      issues: [
        {
          path: "",
          code: "parse_error",
          message: error instanceof Error ? error.message : "Unknown error",
        },
      ],
      valid: false,
    };
  }
}

export function hasConfig(cwd: string = process.cwd()): boolean {
  const configPaths = [
    "workflow.config.ts",
    "workflow.config.js",
    "workflow.config.json",
    ".workflowrc",
    ".workflowrc.json",
  ];

  return configPaths.some((path) => existsSync(join(cwd, path)));
}

export {
  WorkflowConfig,
  WorkflowConfigSchema,
  Scope,
  BranchType,
  ConventionalType,
} from "./schema.js";

export {
  analyzeValidationError,
  applyAutoFixes,
  autoFixConfigFile,
  writeFixedConfig,
  type ConfigValidationIssue,
  type AutoFixResult,
} from "./auto-fix.js";
