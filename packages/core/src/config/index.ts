import { cosmiconfig } from 'cosmiconfig';
import { WorkflowConfig, WorkflowConfigSchema, validateScopeDefinitions } from './schema.js';
import { join } from 'path';
import { existsSync } from 'fs';
import { z } from 'zod';

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
    if (error instanceof z.ZodError) {
      // Format Zod errors to be more user-friendly
      const result = await explorer.search(cwd);
      const formattedErrors = error.errors.map(err => {
        const path = err.path.join('.');
        
        // If error is in scopes array, show the scope name
        if (err.path[0] === 'scopes' && typeof err.path[1] === 'number') {
          const scopeIndex = err.path[1];
          const scopeName = result?.config?.scopes?.[scopeIndex]?.name || `scope at index ${scopeIndex}`;
          const field = err.path[2] || 'definition';
          
          // Add helpful suggestions for common errors
          let message = err.message;
          if (message.includes('reserved word')) {
            const reservedMatch = message.match(/Scope name "([^"]+)" is reserved/);
            if (reservedMatch) {
              const suggestions: Record<string, string> = {
                'docs': 'documentation',
                'test': 'testing',
                'config': 'configuration',
                'build': 'builds',
                'ci': 'cicd',
                'deps': 'dependencies',
              };
              const badName = reservedMatch[1];
              const suggestion = suggestions[badName] || `${badName}-scope`;
              message = `${message}. Try renaming to "${suggestion}"`;
            }
          }
          
          return field === 'definition' 
            ? `Scope "${scopeName}": ${message}`
            : `Scope "${scopeName}" ${field}: ${message}`;
        }
        
        return `${path}: ${err.message}`;
      }).join('\n  • ');
      
      throw new Error(`Invalid workflow configuration:\n  • ${formattedErrors}\n\n💡 Fix these issues in workflow.config.json or run: workflow config validate`);
    }
    
    if (error instanceof Error) {
      throw new Error(`Failed to load workflow config: ${error.message}`);
    }
    throw error;
  }
}

export async function validateConfig(cwd: string = process.cwd()): Promise<{
  valid: boolean;
  errors: string[];
  warnings: string[];
}> {
  const errors: string[] = [];
  const warnings: string[] = [];
  
  try {
    const config = await loadConfig(cwd);
    if (!config) {
      errors.push('No configuration file found');
      return { valid: false, errors, warnings };
    }
    
    // Additional validation beyond schema
    const scopeValidation = validateScopeDefinitions(config.scopes);
    errors.push(...scopeValidation.errors);
    
    return {
      valid: errors.length === 0,
      errors,
      warnings,
    };
  } catch (error) {
    errors.push(error instanceof Error ? error.message : String(error));
    return { valid: false, errors, warnings };
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

export { WorkflowConfig, WorkflowConfigSchema, Scope, BranchType, ConventionalType, validateScopeName, DEFAULT_RESERVED_SCOPE_NAMES } from './schema.js';
