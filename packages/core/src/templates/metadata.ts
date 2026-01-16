/**
 * Template metadata defining mandatory vs optional guidelines
 * and their associated validators for enforcement
 *
 * @fileoverview This module defines which guidelines are mandatory for projects
 * using the workflow agent. Mandatory guidelines MUST be present and cannot be
 * skipped during project initialization.
 *
 * TODO: Ensure all new templates have associated unit tests in metadata.test.ts
 */

export type TemplateCategory = "workflow" | "documentation" | "development";

export type ValidatorType =
  | "branch-name"
  | "commit-message"
  | "pr-title"
  | "implementation-plan"
  | "test-coverage"
  | "file-exists";

export interface TemplateMetadata {
  /** Template filename */
  filename: string;
  /** Human-readable name */
  displayName: string;
  /** Whether this template is mandatory (cannot be skipped during init) */
  mandatory: boolean;
  /** Category for grouping */
  category: TemplateCategory;
  /** Associated validators that enforce this template's rules */
  validators: ValidatorType[];
  /** Brief description of what this template covers */
  description: string;
}

/**
 * Metadata for all available templates
 * Templates marked as mandatory will be auto-generated during init
 * and checked by the doctor command
 */
export const templateMetadata: Record<string, TemplateMetadata> = {
  "AGENT_EDITING_INSTRUCTIONS.md": {
    filename: "AGENT_EDITING_INSTRUCTIONS.md",
    displayName: "Agent Editing Instructions",
    mandatory: true,
    category: "workflow",
    validators: ["implementation-plan"],
    description:
      "Core rules for AI agents: implementation plans, coding standards, architecture",
  },
  "BRANCHING_STRATEGY.md": {
    filename: "BRANCHING_STRATEGY.md",
    displayName: "Branching Strategy",
    mandatory: true,
    category: "workflow",
    validators: ["branch-name", "pr-title"],
    description:
      "Git branch naming conventions, PR requirements, merge policies",
  },
  "TESTING_STRATEGY.md": {
    filename: "TESTING_STRATEGY.md",
    displayName: "Testing Strategy",
    mandatory: true,
    category: "development",
    validators: ["test-coverage"],
    description:
      "Testing pyramid, Vitest/Playwright patterns, when tests are required",
  },
  "SELF_IMPROVEMENT_MANDATE.md": {
    filename: "SELF_IMPROVEMENT_MANDATE.md",
    displayName: "Self-Improvement Mandate",
    mandatory: true,
    category: "workflow",
    validators: [],
    description: "Continuous improvement tracking, changelog requirements",
  },
  "SINGLE_SOURCE_OF_TRUTH.md": {
    filename: "SINGLE_SOURCE_OF_TRUTH.md",
    displayName: "Single Source of Truth",
    mandatory: true,
    category: "workflow",
    validators: [],
    description:
      "Canonical code locations, service patterns, avoiding duplication",
  },
  "COMPONENT_LIBRARY.md": {
    filename: "COMPONENT_LIBRARY.md",
    displayName: "Component Library",
    mandatory: false,
    category: "development",
    validators: [],
    description: "UI component patterns, design tokens, decision tree",
  },
  "DEPLOYMENT_STRATEGY.md": {
    filename: "DEPLOYMENT_STRATEGY.md",
    displayName: "Deployment Strategy",
    mandatory: false,
    category: "development",
    validators: [],
    description: "Deployment workflow, environments, migrations, rollback",
  },
  "LIBRARY_INVENTORY.md": {
    filename: "LIBRARY_INVENTORY.md",
    displayName: "Library Inventory",
    mandatory: false,
    category: "development",
    validators: [],
    description: "Dependency catalog, approved libraries, new library process",
  },
  "SCOPE_CREATION_WORKFLOW.md": {
    filename: "SCOPE_CREATION_WORKFLOW.md",
    displayName: "Scope Creation Workflow",
    mandatory: false,
    category: "workflow",
    validators: [],
    description: "Workflow for AI agents creating custom scopes",
  },
  "CUSTOM_SCOPE_TEMPLATE.md": {
    filename: "CUSTOM_SCOPE_TEMPLATE.md",
    displayName: "Custom Scope Template",
    mandatory: false,
    category: "workflow",
    validators: [],
    description: "Template for defining custom scope packages",
  },
  "PROJECT_TEMPLATE_README.md": {
    filename: "PROJECT_TEMPLATE_README.md",
    displayName: "Project Template README",
    mandatory: false,
    category: "documentation",
    validators: [],
    description: "Meta-document describing project structure",
  },
  "Guidelines.md": {
    filename: "Guidelines.md",
    displayName: "Custom Guidelines",
    mandatory: false,
    category: "documentation",
    validators: [],
    description: "Placeholder for custom user guidelines",
  },
};

/**
 * Get all mandatory templates
 */
export function getMandatoryTemplates(): TemplateMetadata[] {
  return Object.values(templateMetadata).filter((t) => t.mandatory);
}

/**
 * Get all optional templates
 */
export function getOptionalTemplates(): TemplateMetadata[] {
  return Object.values(templateMetadata).filter((t) => !t.mandatory);
}

/**
 * Get templates by category
 */
export function getTemplatesByCategory(
  category: TemplateCategory,
): TemplateMetadata[] {
  return Object.values(templateMetadata).filter((t) => t.category === category);
}

/**
 * Get template metadata by filename
 */
export function getTemplateMetadata(
  filename: string,
): TemplateMetadata | undefined {
  return templateMetadata[filename];
}

/**
 * Check if a template is mandatory
 */
export function isTemplateMandatory(filename: string): boolean {
  return templateMetadata[filename]?.mandatory ?? false;
}

/**
 * Get mandatory template filenames
 */
export function getMandatoryTemplateFilenames(): string[] {
  return getMandatoryTemplates().map((t) => t.filename);
}
