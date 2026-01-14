import * as p from '@clack/prompts';
import chalk from 'chalk';
import { existsSync } from 'fs';
import { writeFile, mkdir } from 'fs/promises';
import { join } from 'path';
import { hasConfig } from '../../config/index.js';

export async function initCommand(options: { migrate?: boolean; workspace?: boolean }) {
  console.log(chalk.bold.cyan('\n🚀 Workflow Agent Initialization\n'));

  const cwd = process.cwd();

  // Check if already initialized
  if (hasConfig(cwd)) {
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
  const projectName = await p.text({
    message: 'What is your project name?',
    placeholder: 'my-awesome-project',
    defaultValue: process.cwd().split('/').pop() || 'my-project',
  });

  if (p.isCancel(projectName)) {
    p.cancel('Initialization cancelled');
    process.exit(0);
  }

  // Select preset
  const preset = await p.select({
    message: 'Choose a scope preset for your project:',
    options: [
      { value: '@workflow/scopes-saas', label: '📦 SaaS Application (auth, tasks, boards, etc.)' },
      { value: '@workflow/scopes-library', label: '📚 Library/Package (types, build, docs, etc.)' },
      { value: '@workflow/scopes-api', label: '🔌 API/Backend (endpoints, models, services, etc.)' },
      { value: '@workflow/scopes-ecommerce', label: '🛒 E-commerce (cart, products, payments, etc.)' },
      { value: '@workflow/scopes-cms', label: '📝 CMS (content, pages, media, etc.)' },
      { value: 'custom', label: '✨ Custom (define your own scopes)' },
    ],
  });

  if (p.isCancel(preset)) {
    p.cancel('Initialization cancelled');
    process.exit(0);
  }

  // Generate config
  const config = {
    projectName: projectName as string,
    scopes: [
      { name: 'feat', description: 'New features', emoji: '✨' },
      { name: 'fix', description: 'Bug fixes', emoji: '🐛' },
      { name: 'docs', description: 'Documentation', emoji: '📚' },
    ],
    enforcement: 'strict',
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

  p.outro(chalk.green('✓ Workflow Agent initialized successfully!'));
  console.log(chalk.dim('\nNext steps:'));
  console.log(chalk.dim('  1. Review your configuration in workflow.config.json'));
  console.log(chalk.dim('  2. Run: workflow validate branch'));
  console.log(chalk.dim('  3. Run: workflow doctor (for optimization suggestions)\n'));
}
