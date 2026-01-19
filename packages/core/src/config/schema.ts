import { z } from "zod";

// Reserved scope names that cannot be used
const RESERVED_SCOPE_NAMES = [
  "init",
  "create",
  "build",
  "test",
  "config",
  "docs",
  "ci",
  "deps",
];

export const ScopeSchema = z.object({
  name: z
    .string()
    .min(1)
    .max(32, "Scope name must be 32 characters or less")
    .regex(
      /^[a-z0-9-]+$/,
      "Scope name must be lowercase alphanumeric with hyphens",
    )
    .refine((name) => !RESERVED_SCOPE_NAMES.includes(name), {
      message: `Scope name cannot be a reserved word: ${RESERVED_SCOPE_NAMES.join(", ")}`,
    }),
  description: z
    .string()
    .min(10, "Scope description must be at least 10 characters"),
  emoji: z.string().optional(),
  category: z
    .enum([
      "auth",
      "features",
      "infrastructure",
      "documentation",
      "testing",
      "performance",
      "other",
    ])
    .optional(),
});

export const BranchTypeSchema = z.enum([
  "feature",
  "bugfix",
  "hotfix",
  "chore",
  "refactor",
  "docs",
  "test",
  "release",
]);

export const ConventionalTypeSchema = z.enum([
  "feat",
  "fix",
  "refactor",
  "chore",
  "docs",
  "test",
  "perf",
  "style",
  "ci",
  "build",
  "revert",
]);

export const EnforcementLevelSchema = z.enum([
  "strict",
  "advisory",
  "learning",
]);

export const AnalyticsConfigSchema = z.object({
  enabled: z.boolean().default(false),
  shareAnonymous: z.boolean().default(false),
});

export const CIConfigSchema = z.object({
  provider: z.enum(["github", "gitlab", "azure"]).default("github"),
  nodeVersions: z.array(z.string()).optional(),
  defaultBranch: z.string().default("main"),
  checks: z
    .array(z.enum(["lint", "typecheck", "format", "build", "test"]))
    .optional(),
});

export const HooksConfigSchema = z.object({
  preCommit: z.array(z.string()).optional(),
  commitMsg: z.array(z.string()).optional(),
  prePush: z.array(z.string()).optional(),
});

export const GuidelinesConfigSchema = z.object({
  mandatoryTemplates: z.array(z.string()).optional(),
  optionalTemplates: z.array(z.string()).optional(),
  customTemplatesDir: z.string().optional(),
  additionalMandatory: z.array(z.string()).optional(),
  optionalOverrides: z.array(z.string()).optional(),
});

export const AdvisoryDepthSchema = z.enum([
  "executive",
  "quick",
  "standard",
  "comprehensive",
]);

export const AdvisoryQuestionSchema = z.object({
  category: z.string(),
  question: z.string(),
  context: z.string().optional(),
  priority: z.enum(["high", "medium", "low"]).optional(),
});

export const AdvisoryConfigSchema = z.object({
  enabled: z.boolean().default(true),
  defaultDepth: AdvisoryDepthSchema.default("standard"),
  outputDir: z.string().default("docs/advisory"),
  customQuestions: z.array(AdvisoryQuestionSchema).optional(),
  riskThresholds: z
    .object({
      high: z.number().default(0.7),
      medium: z.number().default(0.4),
      low: z.number().default(0.2),
    })
    .optional(),
  categories: z
    .array(z.string())
    .default([
      "Technology Decisions",
      "Package Utilization",
      "Platform Strategy",
      "Business Alignment",
      "Technical Debt",
      "Growth Opportunities",
    ]),
  excludePatterns: z.array(z.string()).optional(),
  includeHealthMetrics: z.boolean().default(false),
});

export const WorkflowConfigSchema = z.object({
  projectName: z.string().min(1),
  scopes: z.array(ScopeSchema).min(1),
  branchTypes: z.array(BranchTypeSchema).optional(),
  conventionalTypes: z.array(ConventionalTypeSchema).optional(),
  enforcement: EnforcementLevelSchema.default("strict"),
  language: z.string().default("en"),
  analytics: AnalyticsConfigSchema.optional(),
  adapter: z.string().optional(),
  syncRemote: z.string().optional(),
  ci: CIConfigSchema.optional(),
  hooks: HooksConfigSchema.optional(),
  guidelines: GuidelinesConfigSchema.optional(),
  advisory: AdvisoryConfigSchema.optional(),
});

export type Scope = z.infer<typeof ScopeSchema>;
export type BranchType = z.infer<typeof BranchTypeSchema>;
export type ConventionalType = z.infer<typeof ConventionalTypeSchema>;
export type EnforcementLevel = z.infer<typeof EnforcementLevelSchema>;
export type AnalyticsConfig = z.infer<typeof AnalyticsConfigSchema>;
export type CIConfig = z.infer<typeof CIConfigSchema>;
export type HooksConfig = z.infer<typeof HooksConfigSchema>;
export type GuidelinesConfig = z.infer<typeof GuidelinesConfigSchema>;
export type AdvisoryDepth = z.infer<typeof AdvisoryDepthSchema>;
export type AdvisoryQuestion = z.infer<typeof AdvisoryQuestionSchema>;
export type AdvisoryConfig = z.infer<typeof AdvisoryConfigSchema>;
export type WorkflowConfig = z.infer<typeof WorkflowConfigSchema>;

export const defaultBranchTypes: BranchType[] = [
  "feature",
  "bugfix",
  "hotfix",
  "chore",
  "refactor",
  "docs",
  "test",
];

export const defaultConventionalTypes: ConventionalType[] = [
  "feat",
  "fix",
  "refactor",
  "chore",
  "docs",
  "test",
  "perf",
  "style",
];

/**
 * Validates scope definitions for duplicates, description quality, and category values
 * @param scopes Array of scope definitions to validate
 * @returns Object with validation result and error messages
 */
export function validateScopeDefinitions(scopes: Scope[]): {
  valid: boolean;
  errors: string[];
} {
  const errors: string[] = [];
  const seenNames = new Set<string>();

  for (const scope of scopes) {
    // Check for duplicate names
    if (seenNames.has(scope.name)) {
      errors.push(`Duplicate scope name: "${scope.name}"`);
    }
    seenNames.add(scope.name);

    // Validate using schema (this will catch min length, reserved names, etc.)
    const result = ScopeSchema.safeParse(scope);
    if (!result.success) {
      result.error.errors.forEach((err) => {
        errors.push(`Scope "${scope.name}": ${err.message}`);
      });
    }
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}
