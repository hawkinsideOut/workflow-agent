/**
 * Git repository utilities for detecting repository info,
 * package manager, monorepo setup, and GitHub remote
 */

import { execa, type ExecaError } from 'execa';
import { existsSync } from 'fs';
import { readFile } from 'fs/promises';
import { join } from 'path';

export type PackageManager = 'npm' | 'pnpm' | 'yarn' | 'bun';

export interface GitHubInfo {
  owner: string;
  repo: string;
}

export interface RepoInfo {
  isGitRepo: boolean;
  remoteUrl: string | null;
  isGitHub: boolean;
  github: GitHubInfo | null;
  defaultBranch: string | null;
}

export interface ProjectInfo {
  packageManager: PackageManager;
  isMonorepo: boolean;
  hasLintScript: boolean;
  hasTypecheckScript: boolean;
  hasFormatScript: boolean;
  hasTestScript: boolean;
  hasBuildScript: boolean;
}

/**
 * Check if the current directory is a git repository
 */
export async function isGitRepo(projectPath: string = process.cwd()): Promise<boolean> {
  try {
    await execa('git', ['rev-parse', '--git-dir'], { cwd: projectPath });
    return true;
  } catch {
    return false;
  }
}

/**
 * Get the git remote URL for origin
 */
export async function getGitRemoteUrl(projectPath: string = process.cwd()): Promise<string | null> {
  try {
    const { stdout } = await execa('git', ['remote', 'get-url', 'origin'], { cwd: projectPath });
    return stdout.trim() || null;
  } catch {
    return null;
  }
}

/**
 * Check if the remote URL is a GitHub repository
 */
export function isGitHubRemote(remoteUrl: string | null): boolean {
  if (!remoteUrl) return false;
  return remoteUrl.includes('github.com');
}

/**
 * Parse GitHub owner and repo from remote URL
 * Supports both SSH (git@github.com:owner/repo.git) and HTTPS (https://github.com/owner/repo.git)
 */
export function parseGitHubUrl(remoteUrl: string | null): GitHubInfo | null {
  if (!remoteUrl || !isGitHubRemote(remoteUrl)) return null;

  // Match: git@github.com:owner/repo.git or https://github.com/owner/repo.git
  const match = remoteUrl.match(/github\.com[:/]([^/]+)\/([^/.]+)/);
  
  if (match) {
    return {
      owner: match[1],
      repo: match[2].replace(/\.git$/, ''),
    };
  }
  
  return null;
}

/**
 * Get the default branch name
 */
export async function getDefaultBranch(projectPath: string = process.cwd()): Promise<string | null> {
  try {
    // Try to get from remote
    const { stdout } = await execa('git', ['symbolic-ref', 'refs/remotes/origin/HEAD'], { 
      cwd: projectPath 
    });
    return stdout.trim().replace('refs/remotes/origin/', '') || 'main';
  } catch {
    // Fallback: try HEAD
    try {
      const { stdout } = await execa('git', ['rev-parse', '--abbrev-ref', 'HEAD'], { 
        cwd: projectPath 
      });
      return stdout.trim() || 'main';
    } catch {
      return 'main';
    }
  }
}

/**
 * Get comprehensive repository information
 */
export async function getRepoInfo(projectPath: string = process.cwd()): Promise<RepoInfo> {
  const isRepo = await isGitRepo(projectPath);
  
  if (!isRepo) {
    return {
      isGitRepo: false,
      remoteUrl: null,
      isGitHub: false,
      github: null,
      defaultBranch: null,
    };
  }

  const remoteUrl = await getGitRemoteUrl(projectPath);
  const isGitHub = isGitHubRemote(remoteUrl);
  const github = parseGitHubUrl(remoteUrl);
  const defaultBranch = await getDefaultBranch(projectPath);

  return {
    isGitRepo: true,
    remoteUrl,
    isGitHub,
    github,
    defaultBranch,
  };
}

/**
 * Detect the package manager used in the project
 */
export async function detectPackageManager(projectPath: string = process.cwd()): Promise<PackageManager> {
  // Check for lockfiles in order of preference
  if (existsSync(join(projectPath, 'pnpm-lock.yaml'))) {
    return 'pnpm';
  }
  if (existsSync(join(projectPath, 'yarn.lock'))) {
    return 'yarn';
  }
  if (existsSync(join(projectPath, 'bun.lockb'))) {
    return 'bun';
  }
  if (existsSync(join(projectPath, 'package-lock.json'))) {
    return 'npm';
  }

  // Check packageManager field in package.json
  try {
    const pkgPath = join(projectPath, 'package.json');
    if (existsSync(pkgPath)) {
      const pkg = JSON.parse(await readFile(pkgPath, 'utf-8'));
      if (pkg.packageManager) {
        if (pkg.packageManager.startsWith('pnpm')) return 'pnpm';
        if (pkg.packageManager.startsWith('yarn')) return 'yarn';
        if (pkg.packageManager.startsWith('bun')) return 'bun';
      }
    }
  } catch {
    // Ignore parse errors
  }

  // Default to npm
  return 'npm';
}

/**
 * Check if the project is a monorepo
 */
export async function isMonorepo(projectPath: string = process.cwd()): Promise<boolean> {
  // Check for pnpm workspace
  if (existsSync(join(projectPath, 'pnpm-workspace.yaml'))) {
    return true;
  }

  // Check for yarn/npm workspaces in package.json
  try {
    const pkgPath = join(projectPath, 'package.json');
    if (existsSync(pkgPath)) {
      const pkg = JSON.parse(await readFile(pkgPath, 'utf-8'));
      if (pkg.workspaces) {
        return true;
      }
    }
  } catch {
    // Ignore parse errors
  }

  // Check for lerna.json
  if (existsSync(join(projectPath, 'lerna.json'))) {
    return true;
  }

  // Check for nx.json
  if (existsSync(join(projectPath, 'nx.json'))) {
    return true;
  }

  // Check for turbo.json
  if (existsSync(join(projectPath, 'turbo.json'))) {
    return true;
  }

  return false;
}

/**
 * Get available scripts from package.json
 */
export async function getPackageScripts(projectPath: string = process.cwd()): Promise<Record<string, string>> {
  try {
    const pkgPath = join(projectPath, 'package.json');
    if (!existsSync(pkgPath)) {
      return {};
    }
    const pkg = JSON.parse(await readFile(pkgPath, 'utf-8'));
    return pkg.scripts || {};
  } catch {
    return {};
  }
}

/**
 * Get comprehensive project information
 */
export async function getProjectInfo(projectPath: string = process.cwd()): Promise<ProjectInfo> {
  const packageManager = await detectPackageManager(projectPath);
  const monorepo = await isMonorepo(projectPath);
  const scripts = await getPackageScripts(projectPath);

  return {
    packageManager,
    isMonorepo: monorepo,
    hasLintScript: 'lint' in scripts,
    hasTypecheckScript: 'typecheck' in scripts || 'type-check' in scripts,
    hasFormatScript: 'format' in scripts || 'format:check' in scripts,
    hasTestScript: 'test' in scripts,
    hasBuildScript: 'build' in scripts,
  };
}

/**
 * Get the install command for a package manager
 */
export function getInstallCommand(packageManager: PackageManager): string {
  switch (packageManager) {
    case 'pnpm':
      return 'pnpm install --frozen-lockfile';
    case 'yarn':
      return 'yarn install --frozen-lockfile';
    case 'bun':
      return 'bun install --frozen-lockfile';
    case 'npm':
    default:
      return 'npm ci';
  }
}

/**
 * Get the run command for a package manager (handles monorepo -r flag for pnpm)
 */
export function getRunCommand(
  packageManager: PackageManager, 
  script: string, 
  isMonorepo: boolean = false
): string {
  switch (packageManager) {
    case 'pnpm':
      return isMonorepo ? `pnpm -r run ${script}` : `pnpm run ${script}`;
    case 'yarn':
      return isMonorepo ? `yarn workspaces run ${script}` : `yarn run ${script}`;
    case 'bun':
      return `bun run ${script}`;
    case 'npm':
    default:
      return isMonorepo ? `npm run ${script} --workspaces --if-present` : `npm run ${script}`;
  }
}
