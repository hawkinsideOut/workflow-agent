import { Command } from 'commander';
import { loadConfig, validateConfig, validateScopeName, DEFAULT_RESERVED_SCOPE_NAMES, type WorkflowConfig, type Scope } from '../../config/index.js';
import { join } from 'path';
import { existsSync, readFileSync, writeFileSync } from 'fs';
import prompts from 'prompts';
import chalk from 'chalk';

interface ConfigOptions {
  force?: boolean;
  cwd?: string;
}

export function createConfigCommand(): Command {
  const command = new Command('config')
    .description('Manage workflow configuration')
    .option('-f, --force', 'Skip validation checks')
    .option('--cwd <path>', 'Working directory', process.cwd());

  // validate subcommand
  command
    .command('validate')
    .description('Validate workflow configuration')
    .action(async (options) => {
      const opts = command.opts<ConfigOptions>();
      await validateConfigAction(opts);
    });

  // add subcommand
  command
    .command('add')
    .description('Add configuration items')
    .argument('<type>', 'Type to add (scope)')
    .action(async (type: string, options) => {
      const opts = command.opts<ConfigOptions>();
      
      if (type === 'scope') {
        await addScopeAction(opts);
      } else {
        console.error(chalk.red(`Unknown type: ${type}. Currently only "scope" is supported.`));
        process.exit(1);
      }
    });

  // remove subcommand
  command
    .command('remove')
    .description('Remove configuration items')
    .argument('<type>', 'Type to remove (scope)')
    .argument('<name>', 'Name of the item to remove')
    .action(async (type: string, name: string, options) => {
      const opts = command.opts<ConfigOptions>();
      
      if (type === 'scope') {
        await removeScopeAction(name, opts);
      } else {
        console.error(chalk.red(`Unknown type: ${type}. Currently only "scope" is supported.`));
        process.exit(1);
      }
    });

  // list subcommand
  command
    .command('list')
    .description('List configuration items')
    .argument('[type]', 'Type to list (scopes, reserved, all)', 'all')
    .action(async (type: string, options) => {
      const opts = command.opts<ConfigOptions>();
      await listConfigAction(type, opts);
    });

  // get subcommand
  command
    .command('get')
    .description('Get a configuration value')
    .argument('<path>', 'Configuration path (e.g., scopes[0].name)')
    .action(async (path: string, options) => {
      const opts = command.opts<ConfigOptions>();
      await getConfigValue(path, opts);
    });

  // set subcommand
  command
    .command('set')
    .description('Set a configuration value')
    .argument('<path>', 'Configuration path (e.g., reservedScopeNames)')
    .argument('<value>', 'Value to set')
    .action(async (path: string, value: string, options) => {
      const opts = command.opts<ConfigOptions>();
      await setConfigValue(path, value, opts);
    });

  return command;
}

async function validateConfigAction(opts: ConfigOptions): Promise<void> {
  console.log(chalk.blue('🔍 Validating workflow configuration...'));
  
  const result = await validateConfig(opts.cwd || process.cwd());
  
  if (result.valid) {
    console.log(chalk.green('✓ Configuration is valid'));
    process.exit(0);
  } else {
    console.log(chalk.red('✗ Configuration has errors:\n'));
    result.errors.forEach(err => {
      console.log(chalk.red(`  • ${err}`));
    });
    
    if (result.warnings.length > 0) {
      console.log(chalk.yellow('\n⚠ Warnings:\n'));
      result.warnings.forEach(warn => {
        console.log(chalk.yellow(`  • ${warn}`));
      });
    }
    
    console.log(chalk.gray('\n💡 Fix these issues in workflow.config.json'));
    process.exit(1);
  }
}

async function addScopeAction(opts: ConfigOptions): Promise<void> {
  const cwd = opts.cwd || process.cwd();
  const configPath = join(cwd, 'workflow.config.json');
  
  if (!existsSync(configPath)) {
    console.error(chalk.red('No workflow.config.json found. Run: workflow init'));
    process.exit(1);
  }
  
  const config = await loadConfig(cwd);
  if (!config) {
    console.error(chalk.red('Failed to load configuration'));
    process.exit(1);
  }
  
  const reservedNames = config.reservedScopeNames || DEFAULT_RESERVED_SCOPE_NAMES;
  const existingNames = config.scopes.map(s => s.name);
  
  // Interactive prompts
  const response = await prompts([
    {
      type: 'text',
      name: 'name',
      message: 'Scope name:',
      validate: (value: string) => {
        if (!value) return 'Name is required';
        if (existingNames.includes(value)) return `Scope "${value}" already exists`;
        
        // Validate scope name
        const validation = validateScopeName(value, reservedNames);
        if (!validation.valid) {
          return validation.error + (validation.suggestion ? ` Try: ${validation.suggestion}` : '');
        }
        
        return true;
      }
    },
    {
      type: 'text',
      name: 'description',
      message: 'Description:',
      validate: (value: string) => value ? true : 'Description is required'
    },
    {
      type: 'multiselect',
      name: 'allowedTypes',
      message: 'Allowed commit types (space to select, enter to continue):',
      choices: [
        { title: 'feat', value: 'feat', selected: true },
        { title: 'fix', value: 'fix', selected: true },
        { title: 'docs', value: 'docs', selected: false },
        { title: 'style', value: 'style', selected: false },
        { title: 'refactor', value: 'refactor', selected: false },
        { title: 'perf', value: 'perf', selected: false },
        { title: 'test', value: 'test', selected: false },
        { title: 'build', value: 'build', selected: false },
        { title: 'ci', value: 'ci', selected: false },
        { title: 'chore', value: 'chore', selected: false },
        { title: 'revert', value: 'revert', selected: false },
      ],
      min: 1,
    },
    {
      type: 'text',
      name: 'mandatoryGuidelines',
      message: 'Mandatory guidelines (comma-separated, or press enter to skip):',
      initial: '',
    }
  ]);
  
  if (!response.name) {
    console.log(chalk.yellow('Cancelled'));
    process.exit(0);
  }
  
  // Final validation with --force check
  if (!opts.force) {
    const validation = validateScopeName(response.name, reservedNames);
    if (!validation.valid) {
      console.error(chalk.red(`\n✗ ${validation.error}`));
      if (validation.suggestion) {
        console.log(chalk.yellow(`💡 Suggestion: ${validation.suggestion}`));
      }
      console.log(chalk.gray('\nUse --force to override this check'));
      process.exit(1);
    }
  }
  
  // Create new scope
  const newScope: Scope = {
    name: response.name,
    description: response.description,
    allowedTypes: response.allowedTypes as any[],
  };
  
  if (response.mandatoryGuidelines) {
    const guidelines = response.mandatoryGuidelines
      .split(',')
      .map((g: string) => g.trim())
      .filter((g: string) => g.length > 0);
    
    if (guidelines.length > 0) {
      newScope.mandatoryGuidelines = guidelines;
    }
  }
  
  // Update config
  config.scopes.push(newScope);
  
  // Write back to file
  const configContent = JSON.stringify(config, null, 2) + '\n';
  writeFileSync(configPath, configContent, 'utf-8');
  
  console.log(chalk.green(`\n✓ Added scope: ${response.name}`));
  console.log(chalk.gray(`  Description: ${response.description}`));
  console.log(chalk.gray(`  Types: ${response.allowedTypes.join(', ')}`));
  if (newScope.mandatoryGuidelines) {
    console.log(chalk.gray(`  Guidelines: ${newScope.mandatoryGuidelines.join(', ')}`));
  }
}

async function removeScopeAction(name: string, opts: ConfigOptions): Promise<void> {
  const cwd = opts.cwd || process.cwd();
  const configPath = join(cwd, 'workflow.config.json');
  
  if (!existsSync(configPath)) {
    console.error(chalk.red('No workflow.config.json found'));
    process.exit(1);
  }
  
  const config = await loadConfig(cwd);
  if (!config) {
    console.error(chalk.red('Failed to load configuration'));
    process.exit(1);
  }
  
  const scopeIndex = config.scopes.findIndex(s => s.name === name);
  if (scopeIndex === -1) {
    console.error(chalk.red(`Scope "${name}" not found`));
    process.exit(1);
  }
  
  // Confirm removal
  const response = await prompts({
    type: 'confirm',
    name: 'confirmed',
    message: `Remove scope "${name}"?`,
    initial: false,
  });
  
  if (!response.confirmed) {
    console.log(chalk.yellow('Cancelled'));
    process.exit(0);
  }
  
  // Remove scope
  config.scopes.splice(scopeIndex, 1);
  
  // Write back to file
  const configContent = JSON.stringify(config, null, 2) + '\n';
  writeFileSync(configPath, configContent, 'utf-8');
  
  console.log(chalk.green(`✓ Removed scope: ${name}`));
}

async function listConfigAction(type: string, opts: ConfigOptions): Promise<void> {
  const cwd = opts.cwd || process.cwd();
  const config = await loadConfig(cwd);
  
  if (!config) {
    console.error(chalk.red('No configuration found'));
    process.exit(1);
  }
  
  if (type === 'scopes' || type === 'all') {
    console.log(chalk.blue('\n📋 Scopes:'));
    if (config.scopes.length === 0) {
      console.log(chalk.gray('  (none)'));
    } else {
      config.scopes.forEach((scope, index) => {
        console.log(chalk.green(`\n  ${index + 1}. ${scope.name}`));
        console.log(chalk.gray(`     ${scope.description}`));
        console.log(chalk.gray(`     Types: ${scope.allowedTypes.join(', ')}`));
        if (scope.mandatoryGuidelines && scope.mandatoryGuidelines.length > 0) {
          console.log(chalk.gray(`     Guidelines: ${scope.mandatoryGuidelines.join(', ')}`));
        }
      });
    }
  }
  
  if (type === 'reserved' || type === 'all') {
    const reserved = config.reservedScopeNames || DEFAULT_RESERVED_SCOPE_NAMES;
    console.log(chalk.blue('\n🚫 Reserved Scope Names:'));
    console.log(chalk.gray(`  ${reserved.join(', ')}`));
    console.log(chalk.gray('\n  💡 Configure in workflow.config.json: "reservedScopeNames"'));
  }
}

async function getConfigValue(path: string, opts: ConfigOptions): Promise<void> {
  const cwd = opts.cwd || process.cwd();
  const config = await loadConfig(cwd);
  
  if (!config) {
    console.error(chalk.red('No configuration found'));
    process.exit(1);
  }
  
  // Simple path resolution (e.g., "scopes[0].name")
  const value = resolvePath(config, path);
  
  if (value === undefined) {
    console.error(chalk.red(`Path not found: ${path}`));
    process.exit(1);
  }
  
  console.log(JSON.stringify(value, null, 2));
}

async function setConfigValue(path: string, value: string, opts: ConfigOptions): Promise<void> {
  const cwd = opts.cwd || process.cwd();
  const configPath = join(cwd, 'workflow.config.json');
  
  if (!existsSync(configPath)) {
    console.error(chalk.red('No workflow.config.json found'));
    process.exit(1);
  }
  
  const config = await loadConfig(cwd);
  if (!config) {
    console.error(chalk.red('Failed to load configuration'));
    process.exit(1);
  }
  
  // Parse value (try JSON, fall back to string)
  let parsedValue: any;
  try {
    parsedValue = JSON.parse(value);
  } catch {
    parsedValue = value;
  }
  
  // Set value
  setPath(config, path, parsedValue);
  
  // Validate before writing
  if (!opts.force) {
    const validation = await validateConfig(cwd);
    if (!validation.valid) {
      console.error(chalk.red('✗ Invalid configuration after change:'));
      validation.errors.forEach(err => console.error(chalk.red(`  • ${err}`)));
      console.log(chalk.gray('\nUse --force to skip validation'));
      process.exit(1);
    }
  }
  
  // Write back to file
  const configContent = JSON.stringify(config, null, 2) + '\n';
  writeFileSync(configPath, configContent, 'utf-8');
  
  console.log(chalk.green(`✓ Set ${path} = ${JSON.stringify(parsedValue)}`));
}

function resolvePath(obj: any, path: string): any {
  const parts = path.split(/[\.\[\]]+/).filter(Boolean);
  let current = obj;
  
  for (const part of parts) {
    if (current === undefined || current === null) {
      return undefined;
    }
    current = current[part];
  }
  
  return current;
}

function setPath(obj: any, path: string, value: any): void {
  const parts = path.split(/[\.\[\]]+/).filter(Boolean);
  let current = obj;
  
  for (let i = 0; i < parts.length - 1; i++) {
    const part = parts[i];
    if (current[part] === undefined) {
      current[part] = {};
    }
    current = current[part];
  }
  
  current[parts[parts.length - 1]] = value;
}
