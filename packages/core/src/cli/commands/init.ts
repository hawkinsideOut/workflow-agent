import * as p from '@clack/prompts';
import chalk from 'chalk';
import { existsSync } from 'fs';
import { writeFile, mkdir } from 'fs/promises';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { hasConfig } from '../../config/index.js';
import { buildTemplateContext, renderTemplateDirectory, validateTemplateDirectory } from '../../templates/renderer.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

export async function initCommand(options: { migrate?: boolean; workspace?: boolean; preset?: string; name?: string; yes?: boolean }) {
  console.log(chalk.bold.cyan('\n🚀 Workflow Agent Initialization\n'));

  const cwd = process.cwd();
  const isNonInteractive = !!(options.preset && options.name);

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
    enforcement: {
      level: 'strict' as const,
      preCommit: true,
      prePush: true,
    },
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

  // Render guidelines from templates
  const shouldGenerateGuidelines = await p.confirm({
    message: 'Generate workflow guidelines from templates?',
    initialValue: true,
  });

  if (p.isCancel(shouldGenerateGuidelines)) {
    p.cancel('Initialization cancelled');
    process.exit(0);
  }

  if (shouldGenerateGuidelines) {
    const spinner = p.spinner();
    spinner.start('Generating guidelines...');

    try {
      // Find templates directory (relative to this file: ../../../../templates)
      const templatesDir = join(__dirname, '../../../../templates');
      
      // Validate templates exist
      await validateTemplateDirectory(templatesDir);

      // Build context for template rendering
      const context = await buildTemplateContext(config, cwd);

      // Create guidelines directory
      const guidelinesDir = join(cwd, 'guidelines');
      await mkdir(guidelinesDir, { recursive: true });

      // Render all templates
      const renderedFiles = await renderTemplateDirectory(templatesDir, guidelinesDir, context);

      spinner.stop(`✓ Generated ${renderedFiles.length} guideline documents`);
    } catch (error) {
      spinner.stop('⚠️  Could not generate guidelines');
      console.log(chalk.yellow(`\nReason: ${error instanceof Error ? error.message : String(error)}`));
      console.log(chalk.dim('You can manually copy guidelines later if needed.'));
    }
  }

  p.outro(chalk.green('✓ Workflow Agent initialized successfully!'));
  console.log(chalk.dim('\nNext steps:'));
  console.log(chalk.dim('  1. Review your configuration in workflow.config.json'));
  if (shouldGenerateGuidelines) {
    console.log(chalk.dim('  2. Review generated guidelines in guidelines/ directory'));
    console.log(chalk.dim('  3. Run: workflow validate branch'));
    console.log(chalk.dim('  4. Run: workflow doctor (for optimization suggestions)\n'));
  } else {
    console.log(chalk.dim('  2. Run: workflow validate branch'));
    console.log(chalk.dim('  3. Run: workflow doctor (for optimization suggestions)\n'));
  }
}
