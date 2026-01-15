import * as p from '@clack/prompts';
import chalk from 'chalk';
import { existsSync } from 'fs';
import { writeFile, mkdir } from 'fs/promises';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { hasConfig } from '../../config/index.js';
import { buildTemplateContext, renderTemplateDirectory, validateTemplateDirectory, renderTemplateFile } from '../../templates/renderer.js';
import { getMandatoryTemplates, getOptionalTemplates } from '../../templates/metadata.js';
import { installHooks, hasGitRepo } from '../../utils/hooks.js';
import { getRepoInfo, getProjectInfo } from '../../utils/git-repo.js';
import { createCIWorkflow, hasCIWorkflow } from '../../utils/github-actions.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

export async function initCommand(options: { migrate?: boolean; workspace?: boolean; preset?: string; name?: string; yes?: boolean }) {
  console.log(chalk.bold.cyan('\n🚀 Workflow Agent Initialization\n'));

  const cwd = process.cwd();
  const isNonInteractive = !!(options.preset && options.name) || !!options.yes;

  // Check if already initialized
  if (hasConfig(cwd) && !options.yes && !isNonInteractive) {
    const shouldContinue = await p.confirm({
      message: 'Workflow Agent is already configured. Continue and overwrite?',
      initialValue: false,
    });

    if (p.isCancel(shouldContinue) || !shouldContinue) {
      p.cancel('Initialization cancelled');
      process.exit(0);
    }
  }

  // Get project name
  const projectName = isNonInteractive ? options.name : await p.text({
    message: 'What is your project name?',
    placeholder: 'my-awesome-project',
    defaultValue: process.cwd().split('/').pop() || 'my-project',
  });

  if (!isNonInteractive && p.isCancel(projectName)) {
    p.cancel('Initialization cancelled');
    process.exit(0);
  }

  // Select preset
  const preset = isNonInteractive ? options.preset : await p.select({
    message: 'Choose a scope preset for your project:',
    options: [
      { value: 'saas', label: '📦 SaaS Application - 17 scopes (auth, tasks, boards, sprints, etc.)' },
      { value: 'library', label: '📚 Library/Package - 10 scopes (types, build, docs, examples, etc.)' },
      { value: 'api', label: '🔌 API/Backend - 13 scopes (auth, endpoints, models, services, etc.)' },
      { value: 'ecommerce', label: '🛒 E-commerce - 12 scopes (cart, products, payments, orders, etc.)' },
      { value: 'cms', label: '📝 CMS - 13 scopes (content, pages, media, editor, etc.)' },
      { value: 'custom', label: '✨ Custom (define your own scopes manually)' },
    ],
  });

  if (!isNonInteractive && p.isCancel(preset)) {
    p.cancel('Initialization cancelled');
    process.exit(0);
  }

  // Load preset scopes
  let scopes: Array<{ name: string; description: string; emoji?: string }> = [];
  
  if (preset !== 'custom') {
    // Import preset dynamically
    try {
      const presetModule = await import(`@workflow/scopes-${preset}`);
      scopes = presetModule.scopes || presetModule.default.scopes;
      
      const spinner = p.spinner();
      spinner.start(`Loading ${presetModule.default?.name || preset} preset`);
      await new Promise(resolve => setTimeout(resolve, 500));
      spinner.stop(`✓ Loaded ${scopes.length} scopes from preset`);
    } catch (error) {
      console.log(chalk.yellow(`\n⚠️  Could not load preset package. Using basic scopes.`));
      scopes = [
        { name: 'feat', description: 'New features', emoji: '✨' },
        { name: 'fix', description: 'Bug fixes', emoji: '🐛' },
        { name: 'docs', description: 'Documentation', emoji: '📚' },
      ];
    }
  } else {
    scopes = [
      { name: 'feat', description: 'New features', emoji: '✨' },
      { name: 'fix', description: 'Bug fixes', emoji: '🐛' },
      { name: 'docs', description: 'Documentation', emoji: '📚' },
    ];
    console.log(chalk.dim('\n💡 Tip: Edit workflow.config.json to add your custom scopes'));
  }

  // Generate config
  const config = {
    projectName: projectName as string,
    scopes: scopes,
    enforcement: 'strict' as const,
    language: 'en',
  };

  // Write config file
  const configPath = join(cwd, 'workflow.config.json');
  await writeFile(configPath, JSON.stringify(config, null, 2));

  // Create .workflow directory
  const workflowDir = join(cwd, '.workflow');
  if (!existsSync(workflowDir)) {
    await mkdir(workflowDir, { recursive: true });
  }

  // Get repository and project info for CI setup
  const repoInfo = await getRepoInfo(cwd);
  const projectInfo = await getProjectInfo(cwd);

  // Always generate mandatory guidelines (no prompt)
  const mandatoryTemplates = getMandatoryTemplates();
  const optionalTemplates = getOptionalTemplates();
  
  console.log(chalk.dim(`\n📋 Generating ${mandatoryTemplates.length} mandatory guidelines...`));

  const guidelinesDir = join(cwd, 'guidelines');
  const templatesDir = join(__dirname, '../../templates');
  let mandatoryGenerated = 0;
  let optionalGenerated = 0;

  try {
    // Validate templates exist
    await validateTemplateDirectory(templatesDir);

    // Build context for template rendering
    const context = await buildTemplateContext(config, cwd);

    // Create guidelines directory
    await mkdir(guidelinesDir, { recursive: true });

    // Generate mandatory templates first (no prompt)
    for (const template of mandatoryTemplates) {
      try {
        const templatePath = join(templatesDir, template.filename);
        const outputPath = join(guidelinesDir, template.filename);
        await renderTemplateFile(templatePath, outputPath, context);
        mandatoryGenerated++;
      } catch (error) {
        console.log(chalk.yellow(`  ⚠️  Could not generate ${template.filename}`));
      }
    }
    console.log(chalk.green(`✓ Generated ${mandatoryGenerated} mandatory guidelines`));

    // Prompt for optional guidelines (skip in non-interactive mode with defaults)
    let shouldGenerateOptional = isNonInteractive;
    if (!isNonInteractive) {
      const response = await p.confirm({
        message: `Generate ${optionalTemplates.length} optional guidelines (deployment, library inventory, etc.)?`,
        initialValue: true,
      });
      shouldGenerateOptional = !p.isCancel(response) && response;
    }

    if (shouldGenerateOptional) {
      for (const template of optionalTemplates) {
        try {
          const templatePath = join(templatesDir, template.filename);
          const outputPath = join(guidelinesDir, template.filename);
          await renderTemplateFile(templatePath, outputPath, context);
          optionalGenerated++;
        } catch {
          // Silently skip optional templates that fail
        }
      }
      console.log(chalk.green(`✓ Generated ${optionalGenerated} optional guidelines`));
    }
  } catch (error) {
    console.log(chalk.yellow(`\n⚠️  Could not generate guidelines: ${error instanceof Error ? error.message : String(error)}`));
    console.log(chalk.dim('You can manually copy guidelines later if needed.'));
  }

  // Install git hooks (skip prompt in non-interactive mode, default to yes)
  if (hasGitRepo(cwd)) {
    let shouldInstallHooks = isNonInteractive;
    if (!isNonInteractive) {
      const response = await p.confirm({
        message: 'Install git hooks for pre-commit validation?',
        initialValue: true,
      });
      shouldInstallHooks = !p.isCancel(response) && response;
    }

    if (shouldInstallHooks) {
      const hookSpinner = p.spinner();
      hookSpinner.start('Installing git hooks...');
      
      const hookResults = await installHooks(config.hooks, cwd);
      const allSuccess = hookResults.every(r => r.success);
      
      if (allSuccess) {
        hookSpinner.stop('✓ Installed git hooks');
      } else {
        hookSpinner.stop('⚠️  Some hooks could not be installed');
      }
    }
  }

  // Setup GitHub Actions CI (mandatory for GitHub repos)
  if (repoInfo.isGitHub) {
    const existingCI = hasCIWorkflow(cwd);
    
    if (!existingCI) {
      console.log(chalk.dim('\n🔧 Setting up GitHub Actions CI (mandatory for GitHub repos)...'));
      
      const ciResult = await createCIWorkflow({
        projectPath: cwd,
        packageManager: projectInfo.packageManager,
        isMonorepo: projectInfo.isMonorepo,
        ciConfig: config.ci,
        defaultBranch: repoInfo.defaultBranch || 'main',
      });

      if (ciResult.success) {
        console.log(chalk.green('✓ Created GitHub Actions CI workflow'));
        console.log(chalk.dim(`  File: .github/workflows/ci.yml`));
      } else {
        console.log(chalk.yellow(`⚠️  Could not create CI workflow: ${ciResult.error}`));
      }
    } else {
      console.log(chalk.dim('\n✓ GitHub Actions CI workflow already exists'));
    }
  } else if (repoInfo.isGitRepo) {
    // Non-GitHub git repo - offer to create workflow anyway (skip in non-interactive mode)
    let shouldSetupCI = false;
    if (!isNonInteractive) {
      const response = await p.confirm({
        message: 'No GitHub remote detected. Create CI workflow anyway?',
        initialValue: false,
      });
      shouldSetupCI = !p.isCancel(response) && response;
    }

    if (shouldSetupCI) {
      const ciResult = await createCIWorkflow({
        projectPath: cwd,
        packageManager: projectInfo.packageManager,
        isMonorepo: projectInfo.isMonorepo,
        defaultBranch: repoInfo.defaultBranch || 'main',
      });

      if (ciResult.success) {
        console.log(chalk.green('✓ Created CI workflow'));
      }
    }
  }

  p.outro(chalk.green('✓ Workflow Agent initialized successfully!'));
  console.log(chalk.dim('\nNext steps:'));
  console.log(chalk.dim('  1. Review your configuration in workflow.config.json'));
  console.log(chalk.dim('  2. Review generated guidelines in guidelines/ directory'));
  console.log(chalk.dim('  3. Run: workflow validate branch'));
  console.log(chalk.dim('  4. Run: workflow doctor (for health check)\n'));
  
  if (repoInfo.isGitHub) {
    console.log(chalk.cyan('💡 Recommended: Enable branch protection on GitHub'));
    console.log(chalk.dim('   Settings → Branches → Add rule → Require status checks\n'));
  }
}
