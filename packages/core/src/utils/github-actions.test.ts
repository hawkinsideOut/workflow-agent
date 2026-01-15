import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdtemp, rm, mkdir, writeFile, readFile } from 'fs/promises';
import { existsSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';
import {
  generateCIWorkflowContent,
  createCIWorkflow,
  hasCIWorkflow,
} from './github-actions.js';

describe('github-actions utility', () => {
  let tempDir: string;

  beforeEach(async () => {
    tempDir = await mkdtemp(join(tmpdir(), 'workflow-gh-actions-test-'));
  });

  afterEach(async () => {
    await rm(tempDir, { recursive: true, force: true });
  });

  describe('generateCIWorkflowContent', () => {
    it('generates valid YAML with all checks', () => {
      const content = generateCIWorkflowContent({
        packageManager: 'npm',
        isMonorepo: false,
        checks: ['lint', 'typecheck', 'format', 'build', 'test'],
        nodeVersions: ['20'],
        defaultBranch: 'main',
        hasLintScript: true,
        hasTypecheckScript: true,
        hasFormatScript: true,
        hasTestScript: true,
        hasBuildScript: true,
      });

      expect(content).toContain('name: CI');
      expect(content).toContain('npm run lint');
      expect(content).toContain('npm run typecheck');
      expect(content).toContain('npm run test');
      expect(content).toContain('npm run build');
    });

    it('uses pnpm -r for monorepo', () => {
      const content = generateCIWorkflowContent({
        packageManager: 'pnpm',
        isMonorepo: true,
        checks: ['lint', 'test'],
        nodeVersions: ['20'],
        defaultBranch: 'main',
        hasLintScript: true,
        hasTypecheckScript: false,
        hasFormatScript: false,
        hasTestScript: true,
        hasBuildScript: false,
      });

      expect(content).toContain('pnpm -r run lint');
      expect(content).toContain('pnpm -r run test');
      expect(content).toContain('pnpm/action-setup');
    });

    it('adds matrix strategy for multiple Node versions', () => {
      const content = generateCIWorkflowContent({
        packageManager: 'npm',
        isMonorepo: false,
        checks: ['test'],
        nodeVersions: ['18', '20', '22'],
        defaultBranch: 'main',
        hasLintScript: false,
        hasTypecheckScript: false,
        hasFormatScript: false,
        hasTestScript: true,
        hasBuildScript: false,
      });

      expect(content).toContain('matrix:');
      expect(content).toContain("node-version: ['18', '20', '22']");
    });

    it('falls back to npx prettier when no format script', () => {
      const content = generateCIWorkflowContent({
        packageManager: 'npm',
        isMonorepo: false,
        checks: ['format'],
        nodeVersions: ['20'],
        defaultBranch: 'main',
        hasLintScript: false,
        hasTypecheckScript: false,
        hasFormatScript: false,
        hasTestScript: false,
        hasBuildScript: false,
      });

      expect(content).toContain('npx prettier --check');
    });
  });

  describe('createCIWorkflow', () => {
    it('creates .github/workflows/ci.yml', async () => {
      await writeFile(
        join(tempDir, 'package.json'),
        JSON.stringify({ scripts: { lint: 'eslint .', test: 'vitest' } })
      );

      const result = await createCIWorkflow({ projectPath: tempDir });

      expect(result.success).toBe(true);
      expect(existsSync(join(tempDir, '.github', 'workflows', 'ci.yml'))).toBe(true);
    });

    it('creates intermediate directories', async () => {
      await writeFile(join(tempDir, 'package.json'), JSON.stringify({}));

      await createCIWorkflow({ projectPath: tempDir });

      expect(existsSync(join(tempDir, '.github', 'workflows'))).toBe(true);
    });

    it('respects custom CI config', async () => {
      await writeFile(join(tempDir, 'package.json'), JSON.stringify({ scripts: { lint: 'eslint .' } }));

      const result = await createCIWorkflow({
        projectPath: tempDir,
        ciConfig: { enabled: true, provider: 'github', checks: ['lint'] },
      });

      expect(result.success).toBe(true);
      const content = await readFile(join(tempDir, '.github', 'workflows', 'ci.yml'), 'utf-8');
      expect(content).toContain('Lint');
      expect(content).not.toContain('Test');
    });
  });

  describe('hasCIWorkflow', () => {
    it('returns false when no workflow exists', () => {
      expect(hasCIWorkflow(tempDir)).toBe(false);
    });

    it('returns true when ci.yml exists', async () => {
      await mkdir(join(tempDir, '.github', 'workflows'), { recursive: true });
      await writeFile(join(tempDir, '.github', 'workflows', 'ci.yml'), 'name: CI');

      expect(hasCIWorkflow(tempDir)).toBe(true);
    });

    it('returns true when main.yml exists', async () => {
      await mkdir(join(tempDir, '.github', 'workflows'), { recursive: true });
      await writeFile(join(tempDir, '.github', 'workflows', 'main.yml'), 'name: Main');

      expect(hasCIWorkflow(tempDir)).toBe(true);
    });
  });
});
