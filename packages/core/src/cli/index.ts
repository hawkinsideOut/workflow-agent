#!/usr/bin/env node

import { Command } from 'commander';
import { initCommand } from './commands/init.js';
import { validateCommand } from './commands/validate.js';
import { configCommand } from './commands/config.js';
import { suggestCommand } from './commands/suggest.js';
import { doctorCommand } from './commands/doctor.js';

const program = new Command();

program
  .name('workflow')
  .description('A self-evolving workflow management system for AI agent development')
  .version('1.0.0');

program
  .command('init')
  .description('Initialize workflow in current project')
  .option('--migrate', 'Auto-detect existing patterns and migrate')
  .option('--workspace', 'Initialize for multiple repositories')
  .option('--preset <preset>', 'Preset to use (saas, library, api, ecommerce, cms, custom)')
  .option('--name <name>', 'Project name')
  .option('-y, --yes', 'Skip confirmation prompts')
  .action(initCommand);

program
  .command('validate <type>')
  .description('Validate branch name, commit message, or PR title')
  .argument('<type>', 'What to validate: branch, commit, or pr')
  .argument('[value]', 'Value to validate (defaults to current branch/HEAD commit)')
  .option('--suggest-on-error', 'Offer improvement suggestions on validation errors')
  .action(validateCommand);

program
  .command('config <action>')
  .description('Manage workflow configuration')
  .argument('<action>', 'Action: get, set, add, remove')
  .argument('[key]', 'Config key')
  .argument('[value]', 'Config value')
  .action(configCommand);

program
  .command('suggest')
  .description('Submit an improvement suggestion')
  .argument('<feedback>', 'Your improvement suggestion')
  .option('--author <author>', 'Your name or username')
  .option('--category <category>', 'Category: feature, bug, documentation, performance, other')
  .action(suggestCommand);

program
  .command('doctor')
  .description('Run health check and get optimization suggestions')
  .action(doctorCommand);

program.parse();
