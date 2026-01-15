import { z } from 'zod';

// Default reserved scope names that cannot be used
export const DEFAULT_RESERVED_SCOPE_NAMES = ['init', 'create', 'build', 'test', 'config', 'docs', 'ci', 'deps'];

/**
 * Validates a scope name against reserved words and naming rules
 */
export function validateScopeName(name: string, reservedNames: string[] = DEFAULT_RESERVED_SCOPE_NAMES): {
  valid: boolean;
  error?: string;
  suggestion?: string;
} {
  if (reservedNames.includes(name)) {
    // Provide suggestions for common reserved words
    const suggestions: Record<string, string> = {
      'docs': 'documentation',
      'test': 'testing',
      'config': 'configuration',
      'build': 'builds',
      'ci': 'cicd',
      'deps': 'dependencies',
    };
    
    return {
      valid: false,
      error: `Scope name "${name}" is reserved`,
      suggestion: suggestions[name] || `${name}-scope`,
    };
  }
  
  if (!/^[a-z0-9-]+$/.test(name)) {
    return {
      valid: false,
      error: 'Scope name must be lowercase alphanumeric with hyphens',
    };
  }
  
  if (name.length === 0 || name.length > 32) {
    return {
      valid: false,
      error: 'Scope name must be 1-32 characters',
    };
  }
  
  return { valid: true };
}

export const BranchTypeSchema = z.enum([
  'feature',
  'bugfix',
  'hotfix',
  'chore',
  'refactor',
  'docs',
  'test',
  'release',
]);

export const ConventionalTypeSchema = z.enum([
  'feat',
  'fix',
  'refactor',
  'chore',
  'docs',
  'test',
  'perf',
  'style',
  'ci',
  'build',
  'revert',
]);

export const ScopeSchema = z.object({
  name: z.string()
    .min(1)
    .max(32, 'Scope name must be 32 characters or less')
    .regex(/^[a-z0-9-]+$/, 'Scope name must be lowercase alphanumeric with hyphens'),
  description: z.string().min(10, 'Scope description must be at least 10 characters'),
  allowedTypes: z.array(ConventionalTypeSchema).optional(),
  mandatoryGuidelines: z.array(z.string()).optional(),
  emoji: z.string().optional(),
  category: z.enum(['auth', 'features', 'infrastructure', 'documentation', 'testing', 'performance', 'other']).optional(),
});

export const EnforcementLevelSchema = z.enum(['strict', 'advisory', 'learning']);

export const AnalyticsConfigSchema = z.object({
  enabled: z.boolean().default(false),
  shareAnonymous: z.boolean().default(false),
});

// Pre-commit hook check types
export const HookCheckSchema = z.enum([
  'validate-branch',
  'validate-commit',
  'check-guidelines',
  'validate-scopes',
]);

// Git hooks configuration
export const HooksConfigSchema = z.object({
  /** Whether hooks are enabled */
  enabled: z.boolean().default(true),
  /** Checks to run on pre-commit */
  preCommit: z.array(HookCheckSchema).default(['validate-branch', 'check-guidelines']),
  /** Checks to run on commit-msg */
  commitMsg: z.array(HookCheckSchema).default(['validate-commit']),
});

// Guidelines configuration with mandatory templates and user overrides
export const GuidelinesConfigSchema = z.object({
  /** Additional templates to make mandatory (beyond the core set) */
  additionalMandatory: z.array(z.string()).optional(),
  /** Templates to make optional (override core mandatory templates) */
  optionalOverrides: z.array(z.string()).optional(),
});

// CI provider types
export const CIProviderSchema = z.enum(['github', 'gitlab', 'bitbucket']);

// CI check types
export const CICheckSchema = z.enum(['lint', 'typecheck', 'format', 'test', 'build']);

// CI/CD configuration
export const CIConfigSchema = z.object({
  /** Whether CI setup is enabled */
  enabled: z.boolean().default(true),
  /** CI provider (currently only github supported) */
  provider: CIProviderSchema.default('github'),
  /** Checks to run in CI pipeline */
  checks: z.array(CICheckSchema).default(['lint', 'typecheck', 'format', 'build', 'test']),
});

export const WorkflowConfigSchema = z.object({
  projectName: z.string().min(1),
  scopes: z.array(ScopeSchema).min(1),
  branchTypes: z.array(BranchTypeSchema).optional(),
  conventionalTypes: z.array(ConventionalTypeSchema).optional(),
  enforcement: EnforcementLevelSchema.default('strict'),
  language: z.string().default('en'),
  analytics: AnalyticsConfigSchema.optional(),
  adapter: z.string().optional(),
  syncRemote: z.string().optional(),
  hooks: HooksConfigSchema.optional(),
  guidelines: GuidelinesConfigSchema.optional(),
  reservedScopeNames: z.array(z.string()).optional().default(DEFAULT_RESERVED_SCOPE_NAMES),
  ci: CIConfigSchema.optional(),
}).superRefine((config, ctx) => {
  // Validate scopes against reserved names
  const reservedNames = config.reservedScopeNames || DEFAULT_RESERVED_SCOPE_NAMES;
  
  config.scopes.forEach((scope, index) => {
    const validation = validateScopeName(scope.name, reservedNames);
    if (!validation.valid) {
      let message = validation.error || 'Invalid scope name';
      if (validation.suggestion) {
        message += `. Try renaming to "${validation.suggestion}"`;
      }
      
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['scopes', index, 'name'],
        message,
      });
    }
  });
});

export type Scope = z.infer<typeof ScopeSchema>;
export type BranchType = z.infer<typeof BranchTypeSchema>;
export type ConventionalType = z.infer<typeof ConventionalTypeSchema>;
export type EnforcementLevel = z.infer<typeof EnforcementLevelSchema>;
export type AnalyticsConfig = z.infer<typeof AnalyticsConfigSchema>;
export type HookCheck = z.infer<typeof HookCheckSchema>;
export type HooksConfig = z.infer<typeof HooksConfigSchema>;
export type GuidelinesConfig = z.infer<typeof GuidelinesConfigSchema>;
export type CIProvider = z.infer<typeof CIProviderSchema>;
export type CICheck = z.infer<typeof CICheckSchema>;
export type CIConfig = z.infer<typeof CIConfigSchema>;
export type WorkflowConfig = z.infer<typeof WorkflowConfigSchema>;

export const defaultBranchTypes: BranchType[] = [
  'feature',
  'bugfix',
  'hotfix',
  'chore',
  'refactor',
  'docs',
  'test',
];

export const defaultConventionalTypes: ConventionalType[] = [
  'feat',
  'fix',
  'refactor',
  'chore',
  'docs',
  'test',
  'perf',
  'style',
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
      result.error.errors.forEach(err => {
        errors.push(`Scope "${scope.name}": ${err.message}`);
      });
    }
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}
