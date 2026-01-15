/**
 * CLI command for managing GitHub Actions CI setup
 * Provides setup and check subcommands
 */

import chalk from 'chalk';
import * as p from '@clack/prompts';
import { loadConfig } from '../../config/index.js';
import { getRepoInfo, getProjectInfo } from '../../utils/git-repo.js';
import { createCIWorkflow, hasCIWorkflow } from '../../utils/github-actions.js';
import { validateGitHubActionsSetup } from '../../validators/guidelines.js';

export async function githubCommand(action: string) {
  const cwd = process.cwd();

  switch (action) {
    case 'setup':
      await setupAction(cwd);
      break;
    case 'check':
      await checkAction(cwd);
      break;
    default:
      console.error(chalk.red(`Unknown action: ${action}`));
      console.log(chalk.dim('Available actions: setup, check'));
      process.exit(1);
  }
}

async function setupAction(cwd: string) {
  console.log(chalk.bold.cyan('\n🔧 Setting Up GitHub Actions CI\n'));

  // Check for git repo and GitHub remote
  const repoInfo = await getRepoInfo(cwd);

  if (!repoInfo.isGitRepo) {
    console.error(chalk.red('✗ No git repository found'));
    console.log(chalk.yellow('  Run: git init'));
    process.exit(1);
  }

  if (!repoInfo.isGitHub) {
    console.log(chalk.yellow('⚠️  No GitHub remote detected'));
    const shouldContinue = await p.confirm({
      message: 'Create GitHub Actions workflow anyway?',
      initialValue: true,
    });

    if (p.isCancel(shouldContinue) || !shouldContinue) {
      p.cancel('Setup cancelled');
      process.exit(0);
    }
  } else {
    console.log(chalk.dim(`Repository: ${repoInfo.github?.owner}/${repoInfo.github?.repo}`));
  }

  // Check if CI workflow already exists
  if (hasCIWorkflow(cwd)) {
    const shouldOverwrite = await p.confirm({
      message: 'CI workflow already exists. Overwrite?',
      initialValue: false,
    });

    if (p.isCancel(shouldOverwrite) || !shouldOverwrite) {
      p.cancel('Setup cancelled');
      process.exit(0);
    }
  }

  // Get project info
  const projectInfo = await getProjectInfo(cwd);
  console.log(chalk.dim(`Package manager: ${projectInfo.packageManager}`));
  console.log(chalk.dim(`Monorepo: ${projectInfo.isMonorepo ? 'yes' : 'no'}`));

  // Load config for CI settings
  const config = await loadConfig();
  const ciConfig = config?.ci;

  // Create the workflow
  const spinner = p.spinner();
  spinner.start('Creating CI workflow...');

  const result = await createCIWorkflow({
    projectPath: cwd,
    packageManager: projectInfo.packageManager,
    isMonorepo: projectInfo.isMonorepo,
    ciConfig,
    defaultBranch: repoInfo.defaultBranch || 'main',
  });

  if (result.success) {
    spinner.stop(chalk.green('✓ Created CI workflow'));
    console.log(chalk.dim(`  File: ${result.filePath}`));
    
    console.log(chalk.green('\n✓ GitHub Actions CI setup complete'));
    console.log(chalk.dim('\nThe workflow will run on:'));
    console.log(chalk.dim('  • Push to main/develop branches'));
    console.log(chalk.dim('  • Pull requests to main/develop branches'));
    console.log(chalk.dim('\nChecks included:'));
    
    const checks = ciConfig?.checks || ['lint', 'typecheck', 'format', 'build', 'test'];
    for (const check of checks) {
      const hasScript = check === 'lint' ? projectInfo.hasLintScript :
                       check === 'typecheck' ? projectInfo.hasTypecheckScript :
                       check === 'format' ? projectInfo.hasFormatScript :
                       check === 'test' ? projectInfo.hasTestScript :
                       check === 'build' ? projectInfo.hasBuildScript : false;
      
      const status = hasScript ? chalk.green('✓') : chalk.yellow('⚠');
      const note = hasScript ? '' : ' (add script to package.json)';
      console.log(chalk.dim(`  ${status} ${check}${note}`));
    }

    // Advisory: Branch protection
    console.log(chalk.cyan('\n💡 Recommended: Enable branch protection'));
    console.log(chalk.dim('  Go to GitHub → Settings → Branches → Add rule'));
    console.log(chalk.dim('  Enable "Require status checks to pass before merging"'));
    console.log(chalk.dim('  Select the "ci" status check'));
  } else {
    spinner.stop(chalk.red('✗ Failed to create CI workflow'));
    console.error(chalk.red(`  Error: ${result.error}`));
    process.exit(1);
  }
}

async function checkAction(cwd: string) {
  console.log(chalk.bold.cyan('\n🔍 Checking GitHub Actions CI Setup\n'));

  // Validate CI setup
  const result = await validateGitHubActionsSetup(cwd);

  if (result.hasWorkflowFile) {
    console.log(chalk.green('✓ CI workflow file found'));
  } else {
    console.log(chalk.red('✗ No CI workflow file found'));
    console.log(chalk.yellow('  Run: workflow github:setup'));
    process.exit(1);
  }

  // Report on checks
  const checks = [
    { name: 'Lint', present: result.hasLintCheck },
    { name: 'Type check', present: result.hasTypecheckCheck },
    { name: 'Format', present: result.hasFormatCheck },
    { name: 'Build', present: result.hasBuildCheck },
    { name: 'Test', present: result.hasTestCheck },
  ];

  console.log(chalk.dim('\nCI checks:'));
  for (const check of checks) {
    const icon = check.present ? chalk.green('✓') : chalk.yellow('⚠');
    console.log(`  ${icon} ${check.name}`);
  }

  // Show errors and warnings
  if (result.errors.length > 0) {
    console.log(chalk.red('\nErrors:'));
    for (const error of result.errors) {
      console.log(chalk.red(`  • ${error}`));
    }
  }

  if (result.warnings.length > 0) {
    console.log(chalk.yellow('\nWarnings:'));
    for (const warning of result.warnings) {
      console.log(chalk.yellow(`  • ${warning}`));
    }
  }

  if (result.valid) {
    console.log(chalk.green('\n✓ CI setup is valid'));
  } else {
    console.log(chalk.red('\n✗ CI setup has issues'));
    console.log(chalk.yellow('  Run: workflow github:setup'));
    process.exit(1);
  }
}
