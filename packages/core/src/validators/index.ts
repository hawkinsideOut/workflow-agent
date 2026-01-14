import didYouMean from 'didyoumean2';
import type { WorkflowConfig, BranchType } from '../config/index.js';

export interface ValidationResult {
  valid: boolean;
  error?: string;
  suggestion?: string;
}

export function validateBranchName(
  branchName: string,
  config: WorkflowConfig
): ValidationResult {
  const branchTypes = config.branchTypes || ['feature', 'bugfix', 'hotfix', 'chore', 'refactor', 'docs', 'test'];
  const scopes = config.scopes.map((s) => s.name);

  // Expected format: <type>/<scope>/<description>
  const branchPattern = /^([a-z]+)\/([a-z0-9-]+)\/([a-z0-9-]+)$/;
  const match = branchName.match(branchPattern);

  if (!match) {
    return {
      valid: false,
      error: `Branch name must follow format: <type>/<scope>/<description> (e.g., feature/auth/add-login)`,
      suggestion: `Current: ${branchName}. All parts must be lowercase alphanumeric with hyphens.`,
    };
  }

  const [, type, scope, description] = match;

  // Validate type
  if (!branchTypes.includes(type as BranchType)) {
    const suggestion = didYouMean(type, branchTypes);
    return {
      valid: false,
      error: `Invalid branch type '${type}'. Must be one of: ${branchTypes.join(', ')}`,
      suggestion: suggestion ? `Did you mean '${suggestion}'?` : undefined,
    };
  }

  // Validate scope
  if (!scopes.includes(scope)) {
    const suggestion = didYouMean(scope, scopes);
    const scopeList = scopes.slice(0, 5).join(', ') + (scopes.length > 5 ? '...' : '');
    return {
      valid: false,
      error: `Invalid scope '${scope}'. Must be one of: ${scopeList}`,
      suggestion: suggestion ? `Did you mean '${suggestion}'?` : undefined,
    };
  }

  // Validate description (not empty, meaningful)
  if (description.length < 3) {
    return {
      valid: false,
      error: `Branch description '${description}' is too short (minimum 3 characters)`,
    };
  }

  return { valid: true };
}

export function validateCommitMessage(
  message: string,
  config: WorkflowConfig
): ValidationResult {
  const conventionalTypes = config.conventionalTypes || [
    'feat',
    'fix',
    'refactor',
    'chore',
    'docs',
    'test',
    'perf',
    'style',
  ];
  const scopes = config.scopes.map((s) => s.name);

  // Expected format: <type>(<scope>): <description>
  const commitPattern = /^([a-z]+)(?:\(([a-z0-9-]+)\))?: (.+)$/;
  const match = message.match(commitPattern);

  if (!match) {
    return {
      valid: false,
      error: `Commit message must follow conventional commits format: <type>(<scope>): <description>`,
      suggestion: `Example: feat(auth): add login validation`,
    };
  }

  const [, type, scope, description] = match;

  // Validate type
  if (!conventionalTypes.includes(type as any)) {
    const suggestion = didYouMean(type, conventionalTypes);
    return {
      valid: false,
      error: `Invalid commit type '${type}'. Must be one of: ${conventionalTypes.join(', ')}`,
      suggestion: suggestion ? `Did you mean '${suggestion}'?` : undefined,
    };
  }

  // Validate scope (optional but recommended)
  if (scope && !scopes.includes(scope)) {
    const suggestion = didYouMean(scope, scopes);
    const scopeList = scopes.slice(0, 5).join(', ') + (scopes.length > 5 ? '...' : '');
    return {
      valid: false,
      error: `Invalid scope '${scope}'. Must be one of: ${scopeList}`,
      suggestion: suggestion ? `Did you mean '${suggestion}'?` : undefined,
    };
  }

  // Validate description
  if (description.length < 10) {
    return {
      valid: false,
      error: `Commit description is too short (minimum 10 characters)`,
      suggestion: `Be more descriptive about what changed`,
    };
  }

  if (description[0] !== description[0].toLowerCase()) {
    return {
      valid: false,
      error: `Commit description must start with lowercase letter`,
      suggestion: `Change '${description}' to '${description[0].toLowerCase()}${description.slice(1)}'`,
    };
  }

  return { valid: true };
}

export function validatePRTitle(
  title: string,
  config: WorkflowConfig
): ValidationResult {
  // PR titles follow same format as commit messages
  return validateCommitMessage(title, config);
}
