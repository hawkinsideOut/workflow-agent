/**
 * Git hooks utility for installing, managing, and removing workflow hooks
 * Supports wrapping existing hooks and CI environment detection
 */

import { existsSync } from 'fs';
import { readFile, writeFile, unlink, chmod, rename, mkdir } from 'fs/promises';
import { join } from 'path';
import type { HooksConfig } from '../config/schema.js';

export interface HookStatus {
  installed: boolean;
  hookType: 'pre-commit' | 'commit-msg';
  hasExistingHook: boolean;
  wrappedOriginal: boolean;
}

export interface InstallResult {
  success: boolean;
  hookType: 'pre-commit' | 'commit-msg';
  wrappedExisting: boolean;
  error?: string;
}

/**
 * Check if running in a CI environment
 */
export function isCI(): boolean {
  return !!(
    process.env.CI ||
    process.env.GITHUB_ACTIONS ||
    process.env.GITLAB_CI ||
    process.env.CIRCLECI ||
    process.env.TRAVIS ||
    process.env.JENKINS_URL ||
    process.env.BUILDKITE ||
    process.env.TF_BUILD // Azure DevOps
  );
}

/**
 * Get the path to the .git/hooks directory
 */
export function getGitHooksDir(projectPath: string = process.cwd()): string {
  return join(projectPath, '.git', 'hooks');
}

/**
 * Check if a git repository exists
 */
export function hasGitRepo(projectPath: string = process.cwd()): boolean {
  return existsSync(join(projectPath, '.git'));
}

/**
 * Generate the pre-commit hook script content
 */
function generatePreCommitHook(config?: HooksConfig): string {
  const checks = config?.preCommit || ['validate-branch', 'check-guidelines'];
  
  const checkCommands = checks.map(check => {
    switch (check) {
      case 'validate-branch':
        return '  workflow validate branch';
      case 'validate-commit':
        return '  workflow validate commit';
      case 'check-guidelines':
        return '  workflow doctor --check-guidelines-only 2>/dev/null || true';
      case 'validate-scopes':
        return '  workflow config validate';
      default:
        return '';
    }
  }).filter(Boolean).join('\n');

  return `#!/bin/sh
# Workflow Agent pre-commit hook
# Auto-generated - do not edit manually
# To reinstall: workflow hooks install
# To uninstall: workflow hooks uninstall

# Skip in CI environment
if [ -n "\${CI:-}" ] || [ -n "\${GITHUB_ACTIONS:-}" ] || [ -n "\${GITLAB_CI:-}" ]; then
  exit 0
fi

# Run workflow checks
${checkCommands}

# Run original hook if it exists
if [ -f ".git/hooks/pre-commit.original" ]; then
  .git/hooks/pre-commit.original "\$@"
fi
`;
}

/**
 * Generate the commit-msg hook script content
 */
function generateCommitMsgHook(config?: HooksConfig): string {
  const checks = config?.commitMsg || ['validate-commit'];
  
  const checkCommands = checks.map(check => {
    switch (check) {
      case 'validate-commit':
        return '  workflow validate commit "$(cat "$1")"';
      default:
        return '';
    }
  }).filter(Boolean).join('\n');

  return `#!/bin/sh
# Workflow Agent commit-msg hook
# Auto-generated - do not edit manually
# To reinstall: workflow hooks install
# To uninstall: workflow hooks uninstall

# Skip in CI environment
if [ -n "\${CI:-}" ] || [ -n "\${GITHUB_ACTIONS:-}" ] || [ -n "\${GITLAB_CI:-}" ]; then
  exit 0
fi

# Run workflow checks
${checkCommands}

# Run original hook if it exists
if [ -f ".git/hooks/commit-msg.original" ]; then
  .git/hooks/commit-msg.original "\$@"
fi
`;
}

/**
 * Check if a hook file is a workflow-managed hook
 */
async function isWorkflowHook(hookPath: string): Promise<boolean> {
  try {
    const content = await readFile(hookPath, 'utf-8');
    return content.includes('Workflow Agent') && content.includes('Auto-generated');
  } catch {
    return false;
  }
}

/**
 * Get the status of a specific hook
 */
export async function getHookStatus(
  hookType: 'pre-commit' | 'commit-msg',
  projectPath: string = process.cwd()
): Promise<HookStatus> {
  const hooksDir = getGitHooksDir(projectPath);
  const hookPath = join(hooksDir, hookType);
  const originalPath = join(hooksDir, `${hookType}.original`);

  const status: HookStatus = {
    installed: false,
    hookType,
    hasExistingHook: false,
    wrappedOriginal: false,
  };

  if (!existsSync(hookPath)) {
    return status;
  }

  status.hasExistingHook = true;

  if (await isWorkflowHook(hookPath)) {
    status.installed = true;
    status.wrappedOriginal = existsSync(originalPath);
  }

  return status;
}

/**
 * Get status of all hooks
 */
export async function getAllHooksStatus(
  projectPath: string = process.cwd()
): Promise<HookStatus[]> {
  return Promise.all([
    getHookStatus('pre-commit', projectPath),
    getHookStatus('commit-msg', projectPath),
  ]);
}

/**
 * Install a single hook, wrapping existing if present
 */
async function installSingleHook(
  hookType: 'pre-commit' | 'commit-msg',
  config?: HooksConfig,
  projectPath: string = process.cwd()
): Promise<InstallResult> {
  const hooksDir = getGitHooksDir(projectPath);
  const hookPath = join(hooksDir, hookType);
  const originalPath = join(hooksDir, `${hookType}.original`);

  const result: InstallResult = {
    success: false,
    hookType,
    wrappedExisting: false,
  };

  try {
    // Ensure hooks directory exists
    if (!existsSync(hooksDir)) {
      await mkdir(hooksDir, { recursive: true });
    }

    // Check for existing hook
    if (existsSync(hookPath)) {
      const isOurs = await isWorkflowHook(hookPath);
      
      if (!isOurs) {
        // Backup existing hook
        await rename(hookPath, originalPath);
        result.wrappedExisting = true;
      }
    }

    // Generate and write the hook
    const hookContent = hookType === 'pre-commit' 
      ? generatePreCommitHook(config)
      : generateCommitMsgHook(config);

    await writeFile(hookPath, hookContent, 'utf-8');
    await chmod(hookPath, 0o755);

    result.success = true;
  } catch (error) {
    result.error = error instanceof Error ? error.message : String(error);
  }

  return result;
}

/**
 * Install all workflow hooks
 */
export async function installHooks(
  config?: HooksConfig,
  projectPath: string = process.cwd()
): Promise<InstallResult[]> {
  if (!hasGitRepo(projectPath)) {
    return [{
      success: false,
      hookType: 'pre-commit',
      wrappedExisting: false,
      error: 'No git repository found. Run git init first.',
    }];
  }

  const results = await Promise.all([
    installSingleHook('pre-commit', config, projectPath),
    installSingleHook('commit-msg', config, projectPath),
  ]);

  return results;
}

/**
 * Uninstall a single hook, restoring original if it was wrapped
 */
async function uninstallSingleHook(
  hookType: 'pre-commit' | 'commit-msg',
  projectPath: string = process.cwd()
): Promise<InstallResult> {
  const hooksDir = getGitHooksDir(projectPath);
  const hookPath = join(hooksDir, hookType);
  const originalPath = join(hooksDir, `${hookType}.original`);

  const result: InstallResult = {
    success: false,
    hookType,
    wrappedExisting: false,
  };

  try {
    if (!existsSync(hookPath)) {
      result.success = true;
      return result;
    }

    const isOurs = await isWorkflowHook(hookPath);
    
    if (!isOurs) {
      result.error = 'Hook is not managed by Workflow Agent';
      return result;
    }

    // Remove our hook
    await unlink(hookPath);

    // Restore original if it exists
    if (existsSync(originalPath)) {
      await rename(originalPath, hookPath);
      result.wrappedExisting = true;
    }

    result.success = true;
  } catch (error) {
    result.error = error instanceof Error ? error.message : String(error);
  }

  return result;
}

/**
 * Uninstall all workflow hooks
 */
export async function uninstallHooks(
  projectPath: string = process.cwd()
): Promise<InstallResult[]> {
  return Promise.all([
    uninstallSingleHook('pre-commit', projectPath),
    uninstallSingleHook('commit-msg', projectPath),
  ]);
}
