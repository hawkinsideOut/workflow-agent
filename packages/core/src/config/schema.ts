import { z } from 'zod';

export const ScopeSchema = z.object({
  name: z.string().min(1).regex(/^[a-z0-9-]+$/, 'Scope name must be lowercase alphanumeric with hyphens'),
  description: z.string().min(1),
  emoji: z.string().optional(),
  category: z.enum(['auth', 'features', 'infrastructure', 'documentation', 'testing', 'performance', 'other']).optional(),
});

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

export const EnforcementLevelSchema = z.enum(['strict', 'advisory', 'learning']);

export const AnalyticsConfigSchema = z.object({
  enabled: z.boolean().default(false),
  shareAnonymous: z.boolean().default(false),
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
});

export type Scope = z.infer<typeof ScopeSchema>;
export type BranchType = z.infer<typeof BranchTypeSchema>;
export type ConventionalType = z.infer<typeof ConventionalTypeSchema>;
export type EnforcementLevel = z.infer<typeof EnforcementLevelSchema>;
export type AnalyticsConfig = z.infer<typeof AnalyticsConfigSchema>;
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
