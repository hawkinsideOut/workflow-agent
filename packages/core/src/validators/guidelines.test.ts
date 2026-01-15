import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdtemp, rm, mkdir, writeFile } from 'fs/promises';
import { tmpdir } from 'os';
import { join } from 'path';
import {
  getEffectiveMandatoryTemplates,
  validateGuidelinesExist,
  validateGitHubActionsSetup,
  quickGuidelinesCheck,
} from './guidelines.js';
import { getMandatoryTemplateFilenames } from '../templates/metadata.js';

describe('guidelines validator', () => {
  let tempDir: string;

  beforeEach(async () => {
    tempDir = await mkdtemp(join(tmpdir(), 'workflow-guidelines-test-'));
  });

  afterEach(async () => {
    await rm(tempDir, { recursive: true, force: true });
  });

  describe('getEffectiveMandatoryTemplates', () => {
    it('returns core mandatory templates when no config', () => {
      const templates = getEffectiveMandatoryTemplates();
      expect(templates).toContain('AGENT_EDITING_INSTRUCTIONS.md');
      expect(templates).toContain('BRANCHING_STRATEGY.md');
      expect(templates).toContain('TESTING_STRATEGY.md');
      expect(templates).toContain('SELF_IMPROVEMENT_MANDATE.md');
    });

    it('adds additional mandatory templates from config', () => {
      const templates = getEffectiveMandatoryTemplates({
        additionalMandatory: ['DEPLOYMENT_STRATEGY.md'],
      });
      expect(templates).toContain('DEPLOYMENT_STRATEGY.md');
    });

    it('removes templates from optional overrides', () => {
      const templates = getEffectiveMandatoryTemplates({
        optionalOverrides: ['TESTING_STRATEGY.md'],
      });
      expect(templates).not.toContain('TESTING_STRATEGY.md');
    });
  });

  describe('validateGuidelinesExist', () => {
    it('fails when guidelines directory does not exist', async () => {
      const result = await validateGuidelinesExist(tempDir);

      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Guidelines directory does not exist. Run: workflow init');
    });

    it('fails when mandatory guidelines are missing', async () => {
      await mkdir(join(tempDir, 'guidelines'), { recursive: true });
      await writeFile(join(tempDir, 'guidelines', 'Guidelines.md'), '# Optional');

      const result = await validateGuidelinesExist(tempDir);

      expect(result.valid).toBe(false);
      expect(result.missingMandatory.length).toBeGreaterThan(0);
    });

    it('passes when all mandatory guidelines exist', async () => {
      const guidelinesDir = join(tempDir, 'guidelines');
      await mkdir(guidelinesDir, { recursive: true });

      const mandatory = getMandatoryTemplateFilenames();
      for (const filename of mandatory) {
        await writeFile(join(guidelinesDir, filename), `# ${filename}`);
      }

      const result = await validateGuidelinesExist(tempDir);

      expect(result.valid).toBe(true);
      expect(result.missingMandatory).toHaveLength(0);
    });

    it('tracks optional templates present', async () => {
      const guidelinesDir = join(tempDir, 'guidelines');
      await mkdir(guidelinesDir, { recursive: true });

      const mandatory = getMandatoryTemplateFilenames();
      for (const filename of mandatory) {
        await writeFile(join(guidelinesDir, filename), `# ${filename}`);
      }
      await writeFile(join(guidelinesDir, 'DEPLOYMENT_STRATEGY.md'), '# Deployment');

      const result = await validateGuidelinesExist(tempDir);

      expect(result.valid).toBe(true);
      expect(result.presentOptional).toContain('DEPLOYMENT_STRATEGY.md');
    });
  });

  describe('validateGitHubActionsSetup', () => {
    it('fails when .github/workflows does not exist', async () => {
      const result = await validateGitHubActionsSetup(tempDir);

      expect(result.valid).toBe(false);
      expect(result.hasWorkflowFile).toBe(false);
    });

    it('fails when no CI workflow file exists', async () => {
      await mkdir(join(tempDir, '.github', 'workflows'), { recursive: true });
      await writeFile(join(tempDir, '.github', 'workflows', 'release.yml'), 'name: Release');

      const result = await validateGitHubActionsSetup(tempDir);

      expect(result.valid).toBe(false);
      expect(result.hasWorkflowFile).toBe(false);
    });

    it('detects lint, typecheck, and format checks', async () => {
      await mkdir(join(tempDir, '.github', 'workflows'), { recursive: true });
      await writeFile(
        join(tempDir, '.github', 'workflows', 'ci.yml'),
        `
name: CI
jobs:
  build:
    steps:
      - run: npm run lint
      - run: npm run typecheck
      - run: npx prettier --check "**/*.ts"
      - run: npm run build
      - run: npm test
        `
      );

      const result = await validateGitHubActionsSetup(tempDir);

      expect(result.hasWorkflowFile).toBe(true);
      expect(result.hasLintCheck).toBe(true);
      expect(result.hasTypecheckCheck).toBe(true);
      expect(result.hasFormatCheck).toBe(true);
      expect(result.valid).toBe(true);
    });

    it('warns when mandatory checks are missing', async () => {
      await mkdir(join(tempDir, '.github', 'workflows'), { recursive: true });
      await writeFile(
        join(tempDir, '.github', 'workflows', 'ci.yml'),
        `
name: CI
jobs:
  build:
    steps:
      - run: npm test
        `
      );

      const result = await validateGitHubActionsSetup(tempDir);

      expect(result.hasWorkflowFile).toBe(true);
      expect(result.hasLintCheck).toBe(false);
      expect(result.valid).toBe(false);
    });
  });

  describe('quickGuidelinesCheck', () => {
    it('returns valid when all mandatory guidelines present', async () => {
      const guidelinesDir = join(tempDir, 'guidelines');
      await mkdir(guidelinesDir, { recursive: true });

      const mandatory = getMandatoryTemplateFilenames();
      for (const filename of mandatory) {
        await writeFile(join(guidelinesDir, filename), `# ${filename}`);
      }

      const result = await quickGuidelinesCheck(tempDir);

      expect(result.valid).toBe(true);
    });

    it('returns invalid with missing list when guidelines missing', async () => {
      await mkdir(join(tempDir, 'guidelines'), { recursive: true });

      const result = await quickGuidelinesCheck(tempDir);

      expect(result.valid).toBe(false);
      expect(result.message).toContain('Missing guidelines');
    });
  });
});
