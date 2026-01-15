import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdtemp, rm, mkdir, writeFile } from 'fs/promises';
import { tmpdir } from 'os';
import { join } from 'path';
import {
  isGitHubRemote,
  parseGitHubUrl,
  detectPackageManager,
  isMonorepo,
  getProjectInfo,
  getInstallCommand,
  getRunCommand,
} from './git-repo.js';

describe('git-repo utility', () => {
  let tempDir: string;

  beforeEach(async () => {
    tempDir = await mkdtemp(join(tmpdir(), 'workflow-git-test-'));
  });

  afterEach(async () => {
    await rm(tempDir, { recursive: true, force: true });
  });

  describe('isGitHubRemote', () => {
    it('returns true for GitHub SSH URL', () => {
      expect(isGitHubRemote('git@github.com:owner/repo.git')).toBe(true);
    });

    it('returns true for GitHub HTTPS URL', () => {
      expect(isGitHubRemote('https://github.com/owner/repo.git')).toBe(true);
    });

    it('returns false for GitLab URL', () => {
      expect(isGitHubRemote('git@gitlab.com:owner/repo.git')).toBe(false);
    });

    it('returns false for null', () => {
      expect(isGitHubRemote(null)).toBe(false);
    });
  });

  describe('parseGitHubUrl', () => {
    it('parses SSH URL correctly', () => {
      const result = parseGitHubUrl('git@github.com:myorg/myrepo.git');
      expect(result).toEqual({ owner: 'myorg', repo: 'myrepo' });
    });

    it('parses HTTPS URL correctly', () => {
      const result = parseGitHubUrl('https://github.com/myorg/myrepo.git');
      expect(result).toEqual({ owner: 'myorg', repo: 'myrepo' });
    });

    it('handles URL without .git suffix', () => {
      const result = parseGitHubUrl('https://github.com/myorg/myrepo');
      expect(result).toEqual({ owner: 'myorg', repo: 'myrepo' });
    });

    it('returns null for non-GitHub URL', () => {
      expect(parseGitHubUrl('git@gitlab.com:owner/repo.git')).toBeNull();
    });

    it('returns null for null input', () => {
      expect(parseGitHubUrl(null)).toBeNull();
    });
  });

  describe('detectPackageManager', () => {
    it('detects pnpm from lockfile', async () => {
      await writeFile(join(tempDir, 'pnpm-lock.yaml'), '');
      const pm = await detectPackageManager(tempDir);
      expect(pm).toBe('pnpm');
    });

    it('detects yarn from lockfile', async () => {
      await writeFile(join(tempDir, 'yarn.lock'), '');
      const pm = await detectPackageManager(tempDir);
      expect(pm).toBe('yarn');
    });

    it('detects npm from lockfile', async () => {
      await writeFile(join(tempDir, 'package-lock.json'), '');
      const pm = await detectPackageManager(tempDir);
      expect(pm).toBe('npm');
    });

    it('defaults to npm when no lockfile exists', async () => {
      const pm = await detectPackageManager(tempDir);
      expect(pm).toBe('npm');
    });
  });

  describe('isMonorepo', () => {
    it('detects pnpm workspace', async () => {
      await writeFile(join(tempDir, 'pnpm-workspace.yaml'), 'packages:\n  - packages/*');
      const result = await isMonorepo(tempDir);
      expect(result).toBe(true);
    });

    it('detects npm/yarn workspaces in package.json', async () => {
      await writeFile(
        join(tempDir, 'package.json'),
        JSON.stringify({ workspaces: ['packages/*'] })
      );
      const result = await isMonorepo(tempDir);
      expect(result).toBe(true);
    });

    it('detects lerna.json', async () => {
      await writeFile(join(tempDir, 'lerna.json'), '{}');
      const result = await isMonorepo(tempDir);
      expect(result).toBe(true);
    });

    it('detects nx.json', async () => {
      await writeFile(join(tempDir, 'nx.json'), '{}');
      const result = await isMonorepo(tempDir);
      expect(result).toBe(true);
    });

    it('returns false for non-monorepo', async () => {
      await writeFile(join(tempDir, 'package.json'), JSON.stringify({ name: 'single-pkg' }));
      const result = await isMonorepo(tempDir);
      expect(result).toBe(false);
    });
  });

  describe('getInstallCommand', () => {
    it('returns correct command for each package manager', () => {
      expect(getInstallCommand('npm')).toBe('npm ci');
      expect(getInstallCommand('pnpm')).toBe('pnpm install --frozen-lockfile');
      expect(getInstallCommand('yarn')).toBe('yarn install --frozen-lockfile');
      expect(getInstallCommand('bun')).toBe('bun install --frozen-lockfile');
    });
  });

  describe('getRunCommand', () => {
    it('returns correct command for single repo', () => {
      expect(getRunCommand('npm', 'test', false)).toBe('npm run test');
      expect(getRunCommand('pnpm', 'test', false)).toBe('pnpm run test');
      expect(getRunCommand('yarn', 'test', false)).toBe('yarn run test');
    });

    it('returns correct command for monorepo', () => {
      expect(getRunCommand('npm', 'test', true)).toBe('npm run test --workspaces --if-present');
      expect(getRunCommand('pnpm', 'test', true)).toBe('pnpm -r run test');
      expect(getRunCommand('yarn', 'test', true)).toBe('yarn workspaces run test');
    });
  });

  describe('getProjectInfo', () => {
    it('returns complete project info', async () => {
      await writeFile(join(tempDir, 'pnpm-lock.yaml'), '');
      await writeFile(join(tempDir, 'pnpm-workspace.yaml'), 'packages:\n  - packages/*');
      await writeFile(
        join(tempDir, 'package.json'),
        JSON.stringify({
          scripts: {
            lint: 'eslint .',
            typecheck: 'tsc --noEmit',
            test: 'vitest',
            build: 'tsup',
          },
        })
      );

      const info = await getProjectInfo(tempDir);

      expect(info.packageManager).toBe('pnpm');
      expect(info.isMonorepo).toBe(true);
      expect(info.hasLintScript).toBe(true);
      expect(info.hasTypecheckScript).toBe(true);
      expect(info.hasTestScript).toBe(true);
      expect(info.hasBuildScript).toBe(true);
    });
  });
});
