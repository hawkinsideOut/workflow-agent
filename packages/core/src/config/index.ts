import { cosmiconfig } from 'cosmiconfig';
import { WorkflowConfig, WorkflowConfigSchema } from './schema.js';
import { join } from 'path';
import { existsSync } from 'fs';

const explorer = cosmiconfig('workflow', {
  searchPlaces: [
    'workflow.config.ts',
    'workflow.config.js',
    'workflow.config.json',
    '.workflowrc',
    '.workflowrc.json',
    'package.json',
  ],
});

export async function loadConfig(cwd: string = process.cwd()): Promise<WorkflowConfig | null> {
  try {
    const result = await explorer.search(cwd);
    
    if (!result || !result.config) {
      return null;
    }

    // Validate config against schema
    const validated = WorkflowConfigSchema.parse(result.config);
    return validated;
  } catch (error) {
    if (error instanceof Error) {
      throw new Error(`Failed to load workflow config: ${error.message}`);
    }
    throw error;
  }
}

export function hasConfig(cwd: string = process.cwd()): boolean {
  const configPaths = [
    'workflow.config.ts',
    'workflow.config.js',
    'workflow.config.json',
    '.workflowrc',
    '.workflowrc.json',
  ];

  return configPaths.some((path) => existsSync(join(cwd, path)));
}

export { WorkflowConfig, WorkflowConfigSchema, Scope, BranchType, ConventionalType } from './schema.js';
