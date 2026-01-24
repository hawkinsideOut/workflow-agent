import { z } from "zod";

/**
 * Slugify a string for use in filenames
 * @param text - The text to slugify
 * @returns Slugified string (lowercase, alphanumeric and hyphens only, max 50 chars)
 */
function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "") // Remove special characters
    .replace(/\s+/g, "-") // Replace spaces with hyphens
    .replace(/-+/g, "-") // Replace multiple hyphens with single hyphen
    .replace(/^-|-$/g, "") // Remove leading/trailing hyphens
    .slice(0, 50); // Limit to 50 characters
}

// ============================================
// Constants
// ============================================

/** Number of days after which a pattern is considered deprecated */
export const DEPRECATION_THRESHOLD_DAYS = 365;

/** Default path for storing patterns */
export const PATTERNS_DIR = ".workflow/patterns";

/** File name for contributor ID */
export const CONTRIBUTOR_ID_FILE = ".workflow/.contributor-id";

/** Number of telemetry events to batch before sending */
export const TELEMETRY_BATCH_SIZE = 10;

// ============================================
// Dependency Version Schema
// ============================================

/**
 * Tracks exact and compatible versions of a dependency
 */
export const DependencyVersionSchema = z.object({
  /** Package name */
  name: z.string().min(1),
  /** Exact version used: "15.1.0" */
  version: z.string().min(1),
  /** Semver compatible range: "^15.0.0" (optional, defaults to "*") */
  compatibleRange: z.string().min(1).optional().default("*"),
});

// ============================================
// Compatibility Schema
// ============================================

/**
 * Defines framework and runtime compatibility requirements
 */
export const CompatibilitySchema = z.object({
  /** Framework name: "next", "react", "vue", etc. */
  framework: z.string().min(1),
  /** Semver range for framework: "^15.0.0" */
  frameworkVersion: z.string().min(1),
  /** Runtime environment: "node", "bun", "deno" */
  runtime: z.string().optional(),
  /** Semver range for runtime: "^20.0.0" */
  runtimeVersion: z.string().optional(),
  /** All relevant dependencies with version info (optional) */
  dependencies: z.array(DependencyVersionSchema).default([]),
});

// ============================================
// Pattern Tag Schema
// ============================================

/**
 * Categorized tag for pattern classification
 */
export const PatternTagSchema = z.object({
  /** Tag name */
  name: z.string().min(1).max(50),
  /** Tag category for filtering */
  category: z.enum([
    // Original categories
    "framework",
    "tool",
    "error-type",
    "file-type",
    "custom",
    // Extended categories for blueprints and solutions
    "ui",
    "pattern",
    "feature",
    "database",
    "security",
    "architecture",
    "testing",
    "api",
    "auth",
    "state",
    "performance",
    "deployment",
    "integration",
    "library",
    "language",
    "runtime",
  ]),
});

// ============================================
// Fix Pattern Schema
// ============================================

/** Valid categories for fix patterns */
export const FixCategoryEnum = z.enum([
  "lint",
  "type-error",
  "dependency",
  "config",
  "runtime",
  "build",
  "test",
  "security",
  "migration",
  "deprecation",
  "performance",
  "compatibility",
]);

/** Valid solution types */
export const SolutionTypeEnum = z.enum([
  "command",
  "file-change",
  "config-update",
  "dependency-add",
  "dependency-remove",
  "multi-step",
]);

/** Valid actions for solution steps */
export const StepActionEnum = z.enum([
  "run",
  "create",
  "modify",
  "delete",
  "install",
  "uninstall",
]);

/** Valid sources for patterns */
export const PatternSourceEnum = z.enum([
  "manual",
  "auto-heal",
  "verify-fix",
  "imported",
  "community",
]);

/**
 * Solution step for fix patterns
 */
export const SolutionStepSchema = z.object({
  /** Execution order */
  order: z.number().int().min(1),
  /** Action type */
  action: StepActionEnum,
  /** Target file path or command (anonymized) */
  target: z.string().min(1),
  /** File content or diff (anonymized, optional) */
  content: z.string().optional(),
  /** Human-readable description */
  description: z.string().min(1).max(500),
});

/**
 * Metrics tracking pattern success rate and usage
 */
export const PatternMetricsSchema = z.object({
  /** Success rate percentage (0-100) */
  successRate: z.number().min(0).max(100),
  /** Total number of applications */
  applications: z.number().int().min(0),
  /** Number of successful applications */
  successes: z.number().int().min(0),
  /** Number of failed applications */
  failures: z.number().int().min(0),
  /** Last time the pattern was used */
  lastUsed: z.string().datetime().optional(),
  /** Last time the pattern was successfully applied */
  lastSuccessful: z.string().datetime().optional(),
});

/**
 * Trigger conditions for when a pattern should be suggested
 */
export const PatternTriggerSchema = z.object({
  /** Regex pattern to match error messages */
  errorPattern: z.string().min(1),
  /** Example error message (anonymized) */
  errorMessage: z.string().optional(),
  /** Glob pattern for affected files: "*.tsx" */
  filePattern: z.string().optional(),
  /** Additional context keywords */
  context: z.string().optional(),
});

/**
 * Solution definition for fix patterns
 */
export const PatternSolutionSchema = z.object({
  /** Type of solution */
  type: SolutionTypeEnum,
  /** Ordered steps to execute */
  steps: z.array(SolutionStepSchema).min(1),
});

/**
 * Fix-level pattern for single issue resolution
 */
export const FixPatternSchema = z.object({
  /** Unique identifier (UUID) */
  id: z.string().uuid(),
  /** Human-readable name */
  name: z
    .string()
    .min(3)
    .max(100)
    .refine((name) => slugify(name).length > 0, {
      message:
        "Pattern name must contain at least one alphanumeric character (cannot be only special characters)",
    }),
  /** Description of what the pattern fixes */
  description: z.string().max(500),

  /** Category of fix */
  category: FixCategoryEnum,

  /** Tags for classification */
  tags: z.array(PatternTagSchema),

  /** Conditions that trigger this pattern */
  trigger: PatternTriggerSchema,

  /** Solution to apply */
  solution: PatternSolutionSchema,

  /** Framework/runtime compatibility */
  compatibility: CompatibilitySchema,

  /** Usage metrics */
  metrics: PatternMetricsSchema,

  /** Where this pattern originated */
  source: PatternSourceEnum,

  // Privacy and sync
  /** Whether this pattern should be synced to central registry */
  isPrivate: z.boolean().default(false),
  /** When this pattern was last synced */
  syncedAt: z.string().datetime().optional(),
  /** Anonymous contributor identifier */
  contributorId: z.string().optional(),

  // Conflict resolution
  /** Version number for conflict resolution (1, 2, 3...) */
  conflictVersion: z.number().int().min(1).optional(),
  /** Original pattern ID if this is a conflict copy */
  originalId: z.string().uuid().optional(),

  // Deprecation
  /** When this pattern was deprecated */
  deprecatedAt: z.string().datetime().optional(),
  /** Reason for deprecation */
  deprecationReason: z.string().optional(),

  // Metadata
  /** When this pattern was created */
  createdAt: z.string().datetime(),
  /** When this pattern was last updated */
  updatedAt: z.string().datetime(),
});

// ============================================
// Blueprint Schema
// ============================================

/** Language enum for blueprints */
export const LanguageEnum = z.enum([
  "typescript",
  "javascript",
  "python",
  "go",
  "rust",
  "other",
]);

/** Package manager enum */
export const PackageManagerEnum = z.enum(["npm", "pnpm", "yarn", "bun"]);

/**
 * Technology stack definition
 */
export const StackSchema = z.object({
  /** Framework name */
  framework: z.string().min(1),
  /** Primary language */
  language: LanguageEnum,
  /** Runtime environment */
  runtime: z.string().min(1),
  /** Package manager */
  packageManager: PackageManagerEnum,
  /** Production dependencies (optional, defaults to empty array) */
  dependencies: z.array(DependencyVersionSchema).default([]),
  /** Development dependencies (optional, defaults to empty array) */
  devDependencies: z.array(DependencyVersionSchema).default([]),
});

/**
 * Directory structure entry
 */
export const DirectoryEntrySchema = z.object({
  /** Relative path */
  path: z.string().min(1),
  /** Purpose of this directory */
  purpose: z.string().min(1),
});

/**
 * Key file entry in blueprint
 */
export const KeyFileSchema = z.object({
  /** Relative file path */
  path: z.string().min(1),
  /** Purpose of this file */
  purpose: z.string().min(1),
  /** Template content (anonymized) */
  template: z.string().optional(),
});

/**
 * Project structure definition
 */
export const StructureSchema = z.object({
  /** Directories to create */
  directories: z.array(DirectoryEntrySchema).default([]),
  /** Key files with templates */
  keyFiles: z.array(KeyFileSchema).default([]),
});

/**
 * Setup step for blueprint
 */
export const SetupStepSchema = z.object({
  /** Execution order */
  order: z.number().int().min(1),
  /** Command to run */
  command: z.string().min(1),
  /** Description of what this step does */
  description: z.string().min(1),
  /** Whether this step is optional */
  optional: z.boolean().default(false),
});

/**
 * Config file entry
 */
export const ConfigEntrySchema = z.object({
  /** File path */
  file: z.string().min(1),
  /** File content (anonymized) */
  content: z.string().min(1),
  /** Description of this config */
  description: z.string().min(1),
});

/**
 * Setup instructions for blueprint
 */
export const SetupSchema = z.object({
  /** Prerequisites before setup */
  prerequisites: z.array(z.string()).default([]),
  /** Ordered setup steps */
  steps: z.array(SetupStepSchema).default([]),
  /** Config files to create */
  configs: z.array(ConfigEntrySchema).default([]),
  /** Post-setup commands */
  postSetup: z.array(z.string()).optional(),
});

/**
 * Application-level blueprint for complete project setup
 */
export const BlueprintSchema = z.object({
  /** Unique identifier (UUID) */
  id: z.string().uuid(),
  /** Human-readable name */
  name: z
    .string()
    .min(3)
    .max(100)
    .refine((name) => slugify(name).length > 0, {
      message:
        "Blueprint name must contain at least one alphanumeric character (cannot be only special characters)",
    }),
  /** Description of what this blueprint creates */
  description: z.string().max(1000),

  /** Tags for classification */
  tags: z.array(PatternTagSchema).default([]),

  /** Technology stack */
  stack: StackSchema,

  /** Project structure */
  structure: StructureSchema,

  /** Setup instructions (optional, defaults to empty setup) */
  setup: SetupSchema.default({
    prerequisites: [],
    steps: [],
    configs: [],
  }),

  /** Framework/runtime compatibility */
  compatibility: CompatibilitySchema,

  /** Usage metrics (optional, defaults to zero metrics) */
  metrics: PatternMetricsSchema.default({
    applications: 0,
    successes: 0,
    failures: 0,
    successRate: 0,
  }),

  /** Related fix patterns commonly used with this blueprint */
  relatedPatterns: z.array(z.string().uuid()).default([]),

  // Privacy and sync
  /** Whether this blueprint should be synced */
  isPrivate: z.boolean().default(false),
  /** When this blueprint was last synced */
  syncedAt: z.string().datetime().optional(),
  /** Anonymous contributor identifier */
  contributorId: z.string().optional(),

  // Conflict resolution
  /** Version number for conflict resolution */
  conflictVersion: z.number().int().min(1).optional(),
  /** Original blueprint ID if this is a conflict copy */
  originalId: z.string().uuid().optional(),

  // Deprecation
  /** When this blueprint was deprecated */
  deprecatedAt: z.string().datetime().optional(),
  /** Reason for deprecation */
  deprecationReason: z.string().optional(),

  // Metadata
  /** When this blueprint was created */
  createdAt: z.string().datetime(),
  /** When this blueprint was last updated */
  updatedAt: z.string().datetime(),
});

// ============================================
// Solution Pattern Schema
// ============================================

/** Solution categories for classification */
export const SolutionCategoryEnum = z.enum([
  "auth",
  "database",
  "api",
  "state",
  "forms",
  "ui",
  "testing",
  "deployment",
  "error-handling",
  "caching",
  "security",
  "performance",
  "integrations",
  "other",
]);

/** File role in solution */
export const FileRoleEnum = z.enum([
  "entry",
  "config",
  "util",
  "component",
  "hook",
  "middleware",
  "model",
  "service",
  "test",
  "type",
]);

/**
 * A file that's part of a solution
 */
export const SolutionFileSchema = z.object({
  /** Relative path in solution */
  path: z.string().min(1),
  /** Purpose of this file */
  purpose: z.string().min(1).max(200),
  /** Role in the solution */
  role: FileRoleEnum,
  /** Anonymized file content */
  content: z.string(),
  /** Exported symbols (functions, classes, etc.) */
  exports: z.array(z.string()),
  /** Imported dependencies */
  imports: z.array(z.string()),
  /** Line count */
  lineCount: z.number().int().min(1),
});

/**
 * Problem this solution addresses
 */
export const ProblemDefinitionSchema = z.object({
  /** Keywords for search matching */
  keywords: z.array(z.string().min(1)).min(1),
  /** Human-readable problem description */
  description: z.string().min(10).max(500),
  /** Common error messages this solves */
  errorPatterns: z.array(z.string()).optional(),
});

/**
 * Environment variable definition
 */
export const EnvVarSchema = z.object({
  /** Variable name */
  name: z.string().min(1),
  /** Description of what it's for */
  description: z.string(),
  /** Whether this variable is required */
  required: z.boolean(),
  /** Example value (anonymized) */
  example: z.string().optional(),
});

/**
 * Data model definition
 */
export const DataModelSchema = z.object({
  /** Model name */
  name: z.string().min(1),
  /** Description of the model */
  description: z.string(),
  /** Schema snippet (Prisma/SQL, anonymized) */
  schema: z.string().optional(),
});

/**
 * Implementation details
 */
export const ImplementationSchema = z.object({
  /** Files that make up this solution */
  files: z.array(SolutionFileSchema).min(1),
  /** NPM dependencies required */
  dependencies: z.array(DependencyVersionSchema),
  /** Dev dependencies required */
  devDependencies: z.array(DependencyVersionSchema),
  /** Environment variables needed */
  envVars: z.array(EnvVarSchema),
  /** Database models/tables if applicable */
  dataModels: z.array(DataModelSchema).optional(),
});

/**
 * Architecture notes for understanding the solution
 */
export const ArchitectureSchema = z.object({
  /** Files to start reading */
  entryPoints: z.array(z.string()),
  /** How data flows through the system */
  dataFlow: z.string().max(1000),
  /** Key architectural decisions and why */
  keyDecisions: z.array(z.string()),
  /** Diagram in mermaid format (optional) */
  diagram: z.string().optional(),
});

/**
 * Solution-level pattern for complete implementations
 */
export const SolutionPatternSchema = z.object({
  /** Unique identifier (UUID) */
  id: z.string().uuid(),
  /** Human-readable name */
  name: z
    .string()
    .min(3)
    .max(100)
    .refine((name) => slugify(name).length > 0, {
      message:
        "Solution name must contain at least one alphanumeric character (cannot be only special characters)",
    }),
  /** Description of what this solution does */
  description: z.string().min(10).max(1000),

  /** Category of solution */
  category: SolutionCategoryEnum,

  /** Tags for classification */
  tags: z.array(PatternTagSchema),

  /** What problem does this solve? */
  problem: ProblemDefinitionSchema,

  /** How is it implemented? */
  implementation: ImplementationSchema,

  /** Architecture notes */
  architecture: ArchitectureSchema,

  /** Framework/runtime compatibility */
  compatibility: CompatibilitySchema,

  /** Usage metrics */
  metrics: PatternMetricsSchema,

  /** Source project (anonymized) */
  sourceProject: z.string().optional(),

  /** Related fix patterns */
  relatedPatterns: z.array(z.string().uuid()),

  /** Where this pattern originated */
  source: PatternSourceEnum,

  // Privacy and sync
  /** Whether this solution should be synced */
  isPrivate: z.boolean().default(false),
  /** When this solution was last synced */
  syncedAt: z.string().datetime().optional(),
  /** Anonymous contributor identifier */
  contributorId: z.string().optional(),

  // Conflict resolution
  /** Version number for conflict resolution */
  conflictVersion: z.number().int().min(1).optional(),
  /** Original solution ID if this is a conflict copy */
  originalId: z.string().uuid().optional(),

  // Deprecation
  /** When this solution was deprecated */
  deprecatedAt: z.string().datetime().optional(),
  /** Reason for deprecation */
  deprecationReason: z.string().optional(),

  // Metadata
  /** When this solution was created */
  createdAt: z.string().datetime(),
  /** When this solution was last updated */
  updatedAt: z.string().datetime(),
});

// ============================================
// Telemetry Schema (Anonymized)
// ============================================

/** Telemetry event types */
export const TelemetryEventTypeEnum = z.enum([
  "pattern-applied",
  "pattern-success",
  "pattern-failure",
]);

/** Pattern type enum */
export const PatternTypeEnum = z.enum(["fix", "blueprint"]);

/**
 * Anonymized telemetry event for success/failure tracking
 */
export const TelemetryEventSchema = z.object({
  /** Unique event identifier */
  id: z.string().uuid(),
  /** Event type */
  type: TelemetryEventTypeEnum,
  /** Pattern that was applied */
  patternId: z.string().uuid(),
  /** Type of pattern */
  patternType: PatternTypeEnum,
  /** Anonymous contributor/sender ID */
  contributorId: z.string().min(1),

  // Context (no PII)
  /** Framework used */
  framework: z.string().min(1),
  /** Framework version */
  frameworkVersion: z.string().min(1),
  /** Runtime (optional) */
  runtime: z.string().optional(),
  /** Runtime version (optional) */
  runtimeVersion: z.string().optional(),

  // Outcome
  /** Whether the application was successful */
  success: z.boolean().optional(),
  /** Categorized failure reason (not raw error) */
  failureReason: z
    .enum([
      "version-mismatch",
      "missing-dependency",
      "file-conflict",
      "permission-error",
      "syntax-error",
      "unknown",
    ])
    .optional(),

  /** Event timestamp */
  timestamp: z.string().datetime(),
});

// ============================================
// Type Exports
// ============================================

export type DependencyVersion = z.infer<typeof DependencyVersionSchema>;
export type Compatibility = z.infer<typeof CompatibilitySchema>;
export type PatternTag = z.infer<typeof PatternTagSchema>;
export type SolutionStep = z.infer<typeof SolutionStepSchema>;
export type PatternMetrics = z.infer<typeof PatternMetricsSchema>;
export type PatternTrigger = z.infer<typeof PatternTriggerSchema>;
export type PatternSolution = z.infer<typeof PatternSolutionSchema>;
export type FixPattern = z.infer<typeof FixPatternSchema>;
export type Stack = z.infer<typeof StackSchema>;
export type DirectoryEntry = z.infer<typeof DirectoryEntrySchema>;
export type KeyFile = z.infer<typeof KeyFileSchema>;
export type Structure = z.infer<typeof StructureSchema>;
export type SetupStep = z.infer<typeof SetupStepSchema>;
export type ConfigEntry = z.infer<typeof ConfigEntrySchema>;
export type Setup = z.infer<typeof SetupSchema>;
export type Blueprint = z.infer<typeof BlueprintSchema>;
export type TelemetryEvent = z.infer<typeof TelemetryEventSchema>;

// Solution Pattern Types
export type SolutionPattern = z.infer<typeof SolutionPatternSchema>;
export type SolutionFile = z.infer<typeof SolutionFileSchema>;
export type ProblemDefinition = z.infer<typeof ProblemDefinitionSchema>;
export type Implementation = z.infer<typeof ImplementationSchema>;
export type Architecture = z.infer<typeof ArchitectureSchema>;
export type EnvVar = z.infer<typeof EnvVarSchema>;
export type DataModel = z.infer<typeof DataModelSchema>;

export type FixCategory = z.infer<typeof FixCategoryEnum>;
export type SolutionType = z.infer<typeof SolutionTypeEnum>;
export type StepAction = z.infer<typeof StepActionEnum>;
export type PatternSource = z.infer<typeof PatternSourceEnum>;
export type Language = z.infer<typeof LanguageEnum>;
export type PackageManager = z.infer<typeof PackageManagerEnum>;
export type TelemetryEventType = z.infer<typeof TelemetryEventTypeEnum>;
export type PatternType = z.infer<typeof PatternTypeEnum>;
export type SolutionCategory = z.infer<typeof SolutionCategoryEnum>;
export type FileRole = z.infer<typeof FileRoleEnum>;

// ============================================
// Utility Functions
// ============================================

/**
 * Check if a pattern is deprecated based on its updatedAt date
 */
export function isPatternDeprecated(
  pattern: FixPattern | Blueprint,
  thresholdDays: number = DEPRECATION_THRESHOLD_DAYS,
): boolean {
  // If manually deprecated, return true
  if (pattern.deprecatedAt) {
    return true;
  }

  // Check if updatedAt is older than threshold
  const updatedAt = new Date(pattern.updatedAt);
  const now = new Date();
  const daysSinceUpdate = Math.floor(
    (now.getTime() - updatedAt.getTime()) / (1000 * 60 * 60 * 24),
  );

  return daysSinceUpdate > thresholdDays;
}

/**
 * Generate a content hash for conflict detection
 */
export function generatePatternHash(
  pattern: FixPattern | Blueprint | SolutionPattern,
): string {
  // Create a hash from the essential content (excluding metadata)
  let contentToHash: Record<string, unknown>;

  if ("trigger" in pattern) {
    // FixPattern
    contentToHash = {
      name: pattern.name,
      description: pattern.description,
      tags: pattern.tags,
      compatibility: pattern.compatibility,
      trigger: pattern.trigger,
      solution: pattern.solution,
    };
  } else if ("stack" in pattern) {
    // Blueprint
    contentToHash = {
      name: pattern.name,
      description: pattern.description,
      tags: pattern.tags,
      compatibility: pattern.compatibility,
      stack: pattern.stack,
      structure: pattern.structure,
    };
  } else {
    // SolutionPattern
    contentToHash = {
      name: pattern.name,
      description: pattern.description,
      tags: pattern.tags,
      compatibility: pattern.compatibility,
      problem: pattern.problem,
      implementation: pattern.implementation,
      category: pattern.category,
    };
  }

  // Simple hash using JSON string
  const jsonString = JSON.stringify(
    contentToHash,
    Object.keys(contentToHash).sort(),
  );
  let hash = 0;
  for (let i = 0; i < jsonString.length; i++) {
    const char = jsonString.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash = hash & hash; // Convert to 32-bit integer
  }
  return Math.abs(hash).toString(16).padStart(8, "0");
}

/**
 * Create default metrics for a new pattern
 */
export function createDefaultMetrics(): PatternMetrics {
  return {
    successRate: 0,
    applications: 0,
    successes: 0,
    failures: 0,
    lastUsed: undefined,
    lastSuccessful: undefined,
  };
}

/**
 * Update metrics after pattern application
 */
export function updateMetrics(
  metrics: PatternMetrics,
  success: boolean,
): PatternMetrics {
  const now = new Date().toISOString();
  const applications = metrics.applications + 1;
  const successes = success ? metrics.successes + 1 : metrics.successes;
  const failures = success ? metrics.failures : metrics.failures + 1;
  const successRate = applications > 0 ? (successes / applications) * 100 : 0;

  return {
    successRate: Math.round(successRate * 100) / 100,
    applications,
    successes,
    failures,
    lastUsed: now,
    lastSuccessful: success ? now : metrics.lastSuccessful,
  };
}
