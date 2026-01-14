import didYouMean from 'didyoumean2';
import type { WorkflowConfig, BranchType, Scope } from '../config/index.js';
import { readdir } from 'fs/promises';
import { join } from 'path';

export interface ValidationResult {
  valid: boolean;
  error?: string;
  suggestion?: string;
}

// Cache for discovered custom scopes
let customScopesCache: Scope[] | null = null;
let cacheTimestamp: number = 0;
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

/**
 * Discovers custom scope packages in the workspace and node_modules
 * @param workspacePath Path to workspace root
 * @returns Array of discovered scopes
 */
export async function discoverCustomScopes(workspacePath: string = process.cwd()): Promise<Scope[]> {
  // Check cache validity
  const now = Date.now();
  if (customScopesCache && (now - cacheTimestamp) < CACHE_TTL) {
    return customScopesCache;
  }

  const discoveredScopes: Scope[] = [];

  try {
    // Search for custom scope packages in workspace
    const workspaceLocations = [
      join(workspacePath, 'packages'),
      workspacePath,
    ];

    for (const location of workspaceLocations) {
      try {
        const entries = await readdir(location, { withFileTypes: true });
        
        for (const entry of entries) {
          if (entry.isDirectory() && entry.name.startsWith('scopes-')) {
            const indexPath = join(location, entry.name, 'src', 'index.ts');
            try {
              const module = await import(indexPath);
              const scopes = module.scopes || module.default?.scopes;
              
              if (Array.isArray(scopes)) {
                discoveredScopes.push(...scopes);
              }
            } catch {
              // Silently skip packages that can't be loaded
            }
          }
        }
      } catch {
        // Directory doesn't exist or can't be read
      }
    }

    // Update cache
    customScopesCache = discoveredScopes;
    cacheTimestamp = now;

  } catch (error) {
    // Return empty array on error
    console.warn('Warning: Error discovering custom scopes:', error);
  }

  return discoveredScopes;
}

/**
 * Invalidates the custom scopes cache (useful after config changes)
 */
export function invalidateCustomScopesCache(): void {
  customScopesCache = null;
  cacheTimestamp = 0;
}

/**
 * Gets all available scopes including custom discovered ones
 * @param config Workflow configuration
 * @param workspacePath Optional workspace path
 * @returns Combined array of scopes
 */
export async function getAllScopes(config: WorkflowConfig, workspacePath?: string): Promise<Scope[]> {
  const configScopes = config.scopes;
  const customScopes = await discoverCustomScopes(workspacePath);
  
  // Merge and deduplicate by name
  const scopeMap = new Map<string, Scope>();
  
  // Config scopes take precedence
  for (const scope of configScopes) {
    scopeMap.set(scope.name, scope);
  }
  
  // Add custom scopes that don't conflict
  for (const scope of customScopes) {
    if (!scopeMap.has(scope.name)) {
      scopeMap.set(scope.name, scope);
    }
  }
  
  return Array.from(scopeMap.values());
}

export async function validateBranchName(
  branchName: string,
  config: WorkflowConfig,
  workspacePath?: string
): Promise<ValidationResult> {
  const branchTypes = config.branchTypes || ['feature', 'bugfix', 'hotfix', 'chore', 'refactor', 'docs', 'test'];
  const allScopes = await getAllScopes(config, workspacePath);
  const scopes = allScopes.map((s) => s.name);

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

export async function validateCommitMessage(
  message: string,
  config: WorkflowConfig,
  workspacePath?: string
): Promise<ValidationResult> {
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
  const allScopes = await getAllScopes(config, workspacePath);
  const scopes = allScopes.map((s) => s.name);

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

export async function validatePRTitle(
  title: string,
  config: WorkflowConfig,
  workspacePath?: string
): Promise<ValidationResult> {
  // PR titles follow same format as commit messages
  return validateCommitMessage(title, config, workspacePath);
}
