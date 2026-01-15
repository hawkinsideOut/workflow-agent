import chalk from 'chalk';
import { loadConfig } from '../../config/index.js';
import { getAllHooksStatus, hasGitRepo } from '../../utils/hooks.js';
import { getRepoInfo } from '../../utils/git-repo.js';
import { validateGuidelinesExist, validateGitHubActionsSetup } from '../../validators/guidelines.js';
import { hasCIWorkflow } from '../../utils/github-actions.js';

interface DoctorOptions {
  checkGuidelinesOnly?: boolean;
}

export async function doctorCommand(options: DoctorOptions = {}) {
  const cwd = process.cwd();
  
  // Quick guidelines check mode (for pre-commit hook)
  if (options.checkGuidelinesOnly) {
    const result = await validateGuidelinesExist(cwd);
    if (!result.valid) {
      console.error(chalk.red('✗ Missing mandatory guidelines'));
      for (const missing of result.missingMandatory) {
        console.error(chalk.red(`  • ${missing}`));
      }
      process.exit(1);
    }
    process.exit(0);
  }

  console.log(chalk.bold.cyan('\n🏥 Workflow Agent Health Check\n'));

  const config = await loadConfig();
  let hasErrors = false;
  let hasWarnings = false;

  // 1. Configuration check
  console.log(chalk.bold('📋 Configuration'));
  if (!config) {
    console.error(chalk.red('  ✗ No workflow configuration found'));
    console.log(chalk.yellow('    Run: workflow init'));
    process.exit(1);
  }

  console.log(chalk.green('  ✓ Configuration loaded successfully'));
  console.log(chalk.dim(`    Project: ${config.projectName}`));
  console.log(chalk.dim(`    Scopes: ${config.scopes.length} configured`));
  console.log(chalk.dim(`    Enforcement: ${config.enforcement}`));
  console.log(chalk.dim(`    Language: ${config.language}`));

  // 2. Guidelines check
  console.log(chalk.bold('\n📚 Guidelines'));
  const guidelinesResult = await validateGuidelinesExist(cwd, config);
  
  if (guidelinesResult.valid) {
    console.log(chalk.green(`  ✓ All ${guidelinesResult.presentMandatory.length} mandatory guidelines present`));
    if (guidelinesResult.presentOptional.length > 0) {
      console.log(chalk.dim(`    + ${guidelinesResult.presentOptional.length} optional guidelines`));
    }
  } else {
    hasErrors = true;
    console.log(chalk.red(`  ✗ Missing ${guidelinesResult.missingMandatory.length} mandatory guidelines:`));
    for (const missing of guidelinesResult.missingMandatory) {
      console.log(chalk.red(`    • ${missing}`));
    }
    console.log(chalk.yellow('    Run: workflow init'));
  }

  // 3. Git hooks check
  console.log(chalk.bold('\n🔗 Git Hooks'));
  if (!hasGitRepo(cwd)) {
    console.log(chalk.yellow('  ⚠ No git repository found'));
    hasWarnings = true;
  } else {
    const hookStatuses = await getAllHooksStatus(cwd);
    const installedHooks = hookStatuses.filter(h => h.installed);
    
    if (installedHooks.length === hookStatuses.length) {
      console.log(chalk.green(`  ✓ All ${installedHooks.length} hooks installed`));
      for (const hook of hookStatuses) {
        const extra = hook.wrappedOriginal ? ' (wrapping original)' : '';
        console.log(chalk.dim(`    • ${hook.hookType}${extra}`));
      }
    } else if (installedHooks.length > 0) {
      hasWarnings = true;
      console.log(chalk.yellow(`  ⚠ ${installedHooks.length}/${hookStatuses.length} hooks installed`));
      for (const hook of hookStatuses) {
        if (hook.installed) {
          console.log(chalk.green(`    ✓ ${hook.hookType}`));
        } else {
          console.log(chalk.yellow(`    ✗ ${hook.hookType}`));
        }
      }
      console.log(chalk.yellow('    Run: workflow hooks install'));
    } else {
      hasWarnings = true;
      console.log(chalk.yellow('  ⚠ No hooks installed'));
      console.log(chalk.yellow('    Run: workflow hooks install'));
    }
  }

  // 4. GitHub Actions CI check
  console.log(chalk.bold('\n🚀 CI/CD Pipeline'));
  const repoInfo = await getRepoInfo(cwd);
  
  if (!repoInfo.isGitRepo) {
    console.log(chalk.dim('  ○ No git repository (CI check skipped)'));
  } else if (!repoInfo.isGitHub) {
    console.log(chalk.dim('  ○ Not a GitHub repository (CI check skipped)'));
    console.log(chalk.dim(`    Remote: ${repoInfo.remoteUrl || 'none'}`));
  } else {
    console.log(chalk.dim(`    Repository: ${repoInfo.github?.owner}/${repoInfo.github?.repo}`));
    
    const ciResult = await validateGitHubActionsSetup(cwd);
    
    if (ciResult.valid) {
      console.log(chalk.green('  ✓ GitHub Actions CI configured correctly'));
      const checks = [
        ciResult.hasLintCheck && 'lint',
        ciResult.hasTypecheckCheck && 'typecheck',
        ciResult.hasFormatCheck && 'format',
        ciResult.hasBuildCheck && 'build',
        ciResult.hasTestCheck && 'test',
      ].filter(Boolean);
      console.log(chalk.dim(`    Checks: ${checks.join(', ')}`));
    } else if (!ciResult.hasWorkflowFile) {
      hasErrors = true;
      console.log(chalk.red('  ✗ No CI workflow found'));
      console.log(chalk.yellow('    Run: workflow github:setup'));
    } else {
      hasWarnings = true;
      console.log(chalk.yellow('  ⚠ CI workflow may be incomplete'));
      for (const warning of ciResult.warnings) {
        console.log(chalk.yellow(`    • ${warning}`));
      }
      console.log(chalk.yellow('    Run: workflow github:setup to regenerate'));
    }
  }

  // 5. Advisory suggestions
  console.log(chalk.bold('\n💡 Suggestions'));
  
  // Branch protection advisory (for GitHub repos)
  if (repoInfo.isGitHub && hasCIWorkflow(cwd)) {
    console.log(chalk.cyan('  → Enable branch protection on GitHub'));
    console.log(chalk.dim('    Settings → Branches → Add rule'));
    console.log(chalk.dim('    ☑ Require status checks to pass before merging'));
    console.log(chalk.dim('    ☑ Require branches to be up to date before merging'));
  }

  // Enforcement level suggestion
  if (config.enforcement !== 'strict') {
    console.log(chalk.cyan(`  → Consider switching to 'strict' enforcement`));
    console.log(chalk.dim(`    Current: ${config.enforcement}`));
  }

  // Scope count suggestion
  if (config.scopes.length < 5) {
    console.log(chalk.cyan('  → Consider adding more scopes for better organization'));
    console.log(chalk.dim('    Run: workflow config add scope <name>'));
  }

  // Summary
  console.log(chalk.bold('\n📊 Summary'));
  if (hasErrors) {
    console.log(chalk.red('  ✗ Health check failed - issues found'));
    process.exit(1);
  } else if (hasWarnings) {
    console.log(chalk.yellow('  ⚠ Health check passed with warnings'));
  } else {
    console.log(chalk.green('  ✓ All checks passed'));
  }
  console.log('');
}
