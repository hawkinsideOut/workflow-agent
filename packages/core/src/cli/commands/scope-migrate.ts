import * as p from '@clack/prompts';
import chalk from 'chalk';
import { existsSync } from 'fs';
import { writeFile, mkdir, readFile } from 'fs/promises';
import { join } from 'path';
import { loadConfig, hasConfig } from '../../config/index.js';
import { validateScopeDefinitions, type WorkflowConfig } from '../../config/schema.js';

interface ScopeMigrateOptions {
  name?: string;
  outputDir?: string;
  keepConfig?: boolean;
}

export async function scopeMigrateCommand(options: ScopeMigrateOptions) {
  console.log(chalk.bold.cyan('\n🔄 Migrate Scopes to Custom Package\n'));

  const cwd = process.cwd();

  // Check for existing config
  if (!hasConfig(cwd)) {
    p.cancel('No workflow.config.json found in current directory');
    process.exit(1);
  }

  // Load current config
  let config: WorkflowConfig | null = null;
  try {
    config = await loadConfig(cwd);
  } catch (error) {
    console.error(chalk.red('Failed to load config:'), error);
    process.exit(1);
  }

  if (!config) {
    p.cancel('Failed to load configuration');
    process.exit(1);
  }

  if (!config.scopes || config.scopes.length === 0) {
    p.cancel('No scopes found in workflow.config.json');
    process.exit(1);
  }

  console.log(chalk.dim(`Found ${config.scopes.length} scopes in workflow.config.json\n`));

  // Display current scopes
  console.log(chalk.bold('Current scopes:'));
  config.scopes.forEach((scope, i) => {
    console.log(chalk.dim(`  ${i + 1}. ${scope.emoji || '•'} ${scope.name} - ${scope.description}`));
  });
  console.log();

  const shouldContinue = await p.confirm({
    message: 'Migrate these scopes to a custom package?',
    initialValue: true,
  });

  if (p.isCancel(shouldContinue) || !shouldContinue) {
    p.cancel('Migration cancelled');
    process.exit(0);
  }

  // Check for monorepo
  const isMonorepo = existsSync(join(cwd, 'pnpm-workspace.yaml'));
  if (isMonorepo) {
    console.log(chalk.dim('\n✓ Detected monorepo workspace\n'));
  }

  // Get package name
  const packageNameInput = options.name || await p.text({
    message: 'Package name for the scope preset:',
    placeholder: config.projectName.toLowerCase().replace(/[^a-z0-9-]/g, '-'),
    validate: (value) => {
      if (!value || value.length === 0) return 'Package name is required';
      if (!/^[a-z0-9-]+$/.test(value)) return 'Package name must be lowercase alphanumeric with hyphens';
      if (value.length > 32) return 'Package name must be 32 characters or less';
      return undefined;
    },
  });

  if (p.isCancel(packageNameInput)) {
    p.cancel('Migration cancelled');
    process.exit(0);
  }

  const packageName = packageNameInput as string;

  // Get preset display name
  const presetNameInput = await p.text({
    message: 'Preset display name:',
    placeholder: config.projectName,
    defaultValue: config.projectName,
  });

  if (p.isCancel(presetNameInput)) {
    p.cancel('Migration cancelled');
    process.exit(0);
  }

  const presetName = presetNameInput as string;

  // Validate scopes
  const validation = validateScopeDefinitions(config.scopes);
  if (!validation.valid) {
    console.log(chalk.yellow('\n⚠️  Scope validation warnings:\n'));
    validation.errors.forEach(error => console.log(chalk.yellow(`  • ${error}`)));
    
    const shouldFix = await p.confirm({
      message: 'Some scopes have validation issues. Continue anyway?',
      initialValue: false,
    });

    if (p.isCancel(shouldFix) || !shouldFix) {
      p.cancel('Migration cancelled. Please fix validation errors first.');
      process.exit(1);
    }
  }

  // Determine output directory
  let outputDir: string;
  if (options.outputDir) {
    outputDir = options.outputDir;
  } else if (isMonorepo) {
    outputDir = join(cwd, 'packages', `scopes-${packageName}`);
  } else {
    const customDir = await p.text({
      message: 'Output directory:',
      placeholder: `./scopes-${packageName}`,
      defaultValue: `./scopes-${packageName}`,
    });

    if (p.isCancel(customDir)) {
      p.cancel('Migration cancelled');
      process.exit(0);
    }

    outputDir = join(cwd, customDir as string);
  }

  // Check if directory exists
  if (existsSync(outputDir)) {
    const shouldOverwrite = await p.confirm({
      message: `Directory ${outputDir} already exists. Overwrite?`,
      initialValue: false,
    });

    if (p.isCancel(shouldOverwrite) || !shouldOverwrite) {
      p.cancel('Migration cancelled');
      process.exit(0);
    }
  }

  // Create package files
  const spinner = p.spinner();
  spinner.start('Migrating scopes to package...');

  try {
    // Create directories
    await mkdir(join(outputDir, 'src'), { recursive: true });

    // Create package.json
    const packageJson = {
      name: `@workflow/scopes-${packageName}`,
      version: '1.0.0',
      description: `Migrated scope preset for ${presetName}`,
      keywords: ['workflow', 'scopes', packageName, 'preset', 'migrated'],
      repository: {
        type: 'git',
        url: 'git+https://github.com/your-org/your-repo.git',
        directory: `packages/scopes-${packageName}`,
      },
      license: 'MIT',
      author: 'Your Name',
      type: 'module',
      exports: {
        '.': {
          types: './dist/index.d.ts',
          import: './dist/index.js',
        },
      },
      files: ['dist'],
      scripts: {
        build: 'tsup',
        dev: 'tsup --watch',
        typecheck: 'tsc --noEmit',
        test: 'vitest run',
      },
      peerDependencies: {
        '@hawkinside_out/workflow-agent': '^1.0.0',
      },
      devDependencies: {
        '@hawkinside_out/workflow-agent': '^1.0.0',
        tsup: '^8.0.1',
        typescript: '^5.3.3',
        vitest: '^1.0.0',
      },
      publishConfig: {
        access: 'public',
      },
    };

    await writeFile(
      join(outputDir, 'package.json'),
      JSON.stringify(packageJson, null, 2),
      'utf-8'
    );

    // Create tsconfig.json
    const tsconfig = {
      extends: '../../tsconfig.json',
      compilerOptions: {
        outDir: './dist',
        rootDir: './src',
      },
      include: ['src/**/*'],
    };

    await writeFile(
      join(outputDir, 'tsconfig.json'),
      JSON.stringify(tsconfig, null, 2),
      'utf-8'
    );

    // Create tsup.config.ts
    const tsupConfig = `import { defineConfig } from 'tsup';

export default defineConfig({
  entry: ['src/index.ts'],
  format: ['esm'],
  dts: true,
  clean: true,
  sourcemap: true,
});
`;

    await writeFile(join(outputDir, 'tsup.config.ts'), tsupConfig, 'utf-8');

    // Create src/index.ts with migrated scopes
    const indexTs = `import type { Scope } from '@hawkinside_out/workflow-agent/config';

export const scopes: Scope[] = ${JSON.stringify(config.scopes, null, 2)};

export const preset = {
  name: '${presetName}',
  description: 'Migrated scope configuration for ${presetName}',
  scopes,
  version: '1.0.0',
};

export default preset;
`;

    await writeFile(join(outputDir, 'src', 'index.ts'), indexTs, 'utf-8');

    // Create test file
    const testFile = `import { describe, it, expect } from 'vitest';
import { scopes, preset } from './index.js';
import { ScopeSchema } from '@hawkinside_out/workflow-agent/config';

describe('${presetName} Scope Preset (Migrated)', () => {
  it('should export valid scopes array', () => {
    expect(scopes).toBeDefined();
    expect(Array.isArray(scopes)).toBe(true);
    expect(scopes.length).toBe(${config.scopes.length});
  });

  it('should have valid preset object', () => {
    expect(preset).toBeDefined();
    expect(preset.name).toBe('${presetName}');
    expect(preset.scopes).toBe(scopes);
    expect(preset.version).toBeDefined();
  });

  it('should have no duplicate scope names', () => {
    const names = scopes.map(s => s.name);
    const uniqueNames = new Set(names);
    expect(uniqueNames.size).toBe(names.length);
  });

  it('should have all scopes match schema', () => {
    scopes.forEach(scope => {
      const result = ScopeSchema.safeParse(scope);
      if (!result.success) {
        console.error(\`Scope "\${scope.name}" failed validation:\`, result.error);
      }
      expect(result.success).toBe(true);
    });
  });

  it('should have descriptions for all scopes', () => {
    scopes.forEach(scope => {
      expect(scope.description).toBeDefined();
      expect(scope.description.length).toBeGreaterThan(0);
    });
  });
});
`;

    await writeFile(join(outputDir, 'src', 'index.test.ts'), testFile, 'utf-8');

    spinner.stop('✓ Package created from migrated scopes');

    // Update pnpm-workspace.yaml if monorepo
    if (isMonorepo) {
      const workspaceFile = join(cwd, 'pnpm-workspace.yaml');
      const workspaceContent = await readFile(workspaceFile, 'utf-8');
      
      const packagePath = `packages/scopes-${packageName}`;
      if (!workspaceContent.includes(packagePath) && !workspaceContent.includes('packages/*')) {
        console.log(chalk.yellow('\n⚠️  Add the following to pnpm-workspace.yaml:'));
        console.log(chalk.dim(`  - '${packagePath}'`));
      } else {
        console.log(chalk.green('\n✓ Package will be included in workspace'));
      }
    }

    // Ask about updating config
    const keepConfig = options.keepConfig ?? await p.confirm({
      message: 'Remove migrated scopes from workflow.config.json?',
      initialValue: false,
    });

    if (!p.isCancel(keepConfig) && !keepConfig) {
      const configPath = join(cwd, 'workflow.config.json');
      const updatedConfig = {
        ...config,
        scopes: [], // Clear inline scopes
        preset: `scopes-${packageName}`, // Reference the new package
      };

      await writeFile(configPath, JSON.stringify(updatedConfig, null, 2), 'utf-8');
      console.log(chalk.green('✓ Updated workflow.config.json'));
      console.log(chalk.dim('  • Cleared inline scopes'));
      console.log(chalk.dim(`  • Added preset reference: scopes-${packageName}\n`));
    }

    // Success summary
    console.log(chalk.green.bold('\n✨ Migration completed successfully!\n'));
    console.log(chalk.bold('Package details:'));
    console.log(chalk.dim(`  Location: ${outputDir}`));
    console.log(chalk.dim(`  Package: @workflow/scopes-${packageName}`));
    console.log(chalk.dim(`  Scopes: ${config.scopes.length} migrated\n`));

    console.log(chalk.bold('Next steps:\n'));
    console.log(chalk.dim(`  1. cd ${outputDir}`));
    console.log(chalk.dim(`  2. pnpm install`));
    console.log(chalk.dim(`  3. pnpm build`));
    console.log(chalk.dim(`  4. pnpm test`));
    console.log(chalk.dim(`  5. Update repository URL in package.json\n`));

    if (!keepConfig) {
      console.log(chalk.bold('To use the migrated scopes:\n'));
      console.log(chalk.dim(`  1. Install the package: pnpm add -w @workflow/scopes-${packageName}`));
      console.log(chalk.dim(`  2. The preset is already referenced in workflow.config.json\n`));
    }

    console.log(chalk.dim('💡 Tip: You can now reuse this scope package across multiple projects!\n'));

  } catch (error) {
    spinner.stop('✗ Migration failed');
    console.error(chalk.red('\nError:'), error);
    process.exit(1);
  }
}
