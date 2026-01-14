#!/usr/bin/env node

/**
 * Post-install script that automatically adds workflow scripts to package.json
 * when installed as a local dependency (not global)
 */

import { readFileSync, writeFileSync, existsSync } from 'fs';
import { join } from 'path';

const WORKFLOW_SCRIPTS = {
  'workflow:init': 'workflow-agent init',
  'workflow:validate': 'workflow-agent validate',
  'workflow:suggest': 'workflow-agent suggest',
  'workflow:doctor': 'workflow-agent doctor',
};

function isGlobalInstall(): boolean {
  // Check if we're being installed globally
  const installPath = process.env.npm_config_global;
  return installPath === 'true';
}

function findProjectRoot(): string | null {
  // Walk up from node_modules to find the project root
  let currentDir = process.cwd();
  
  // If we're in node_modules/@hawkinside_out/workflow-agent, go up 3 levels
  if (currentDir.includes('node_modules')) {
    const parts = currentDir.split('node_modules');
    return parts[0];
  }
  
  return currentDir;
}

function addScriptsToPackageJson(): void {
  try {
    // Don't run for global installs
    if (isGlobalInstall()) {
      return;
    }

    const projectRoot = findProjectRoot();
    if (!projectRoot) {
      return;
    }

    const packageJsonPath = join(projectRoot, 'package.json');
    
    if (!existsSync(packageJsonPath)) {
      return;
    }

    // Read existing package.json
    const packageJsonContent = readFileSync(packageJsonPath, 'utf-8');
    const packageJson = JSON.parse(packageJsonContent);

    // Initialize scripts object if it doesn't exist
    if (!packageJson.scripts) {
      packageJson.scripts = {};
    }

    // Check if any workflow scripts already exist
    const hasWorkflowScripts = Object.keys(WORKFLOW_SCRIPTS).some(
      (scriptName) => packageJson.scripts[scriptName]
    );

    if (hasWorkflowScripts) {
      // Scripts already exist, don't overwrite
      return;
    }

    // Add workflow scripts
    let addedCount = 0;
    for (const [scriptName, scriptCommand] of Object.entries(WORKFLOW_SCRIPTS)) {
      if (!packageJson.scripts[scriptName]) {
        packageJson.scripts[scriptName] = scriptCommand;
        addedCount++;
      }
    }

    if (addedCount > 0) {
      // Write back to package.json with proper formatting
      writeFileSync(
        packageJsonPath,
        JSON.stringify(packageJson, null, 2) + '\n',
        'utf-8'
      );

      console.log('\n✓ Added workflow scripts to package.json:');
      Object.keys(WORKFLOW_SCRIPTS).forEach((scriptName) => {
        console.log(`  - ${scriptName}`);
      });
      console.log('\nRun them with: npm run workflow:init (or pnpm run workflow:init)\n');
    }
  } catch (error) {
    // Silently fail - this is a nice-to-have feature
    // We don't want to break the installation if something goes wrong
  }
}

// Run the script
addScriptsToPackageJson();
