#!/usr/bin/env node

/**
 * Post-install script that automatically adds workflow scripts to package.json
 * when installed as a local dependency (not global)
 */

import { readFileSync, writeFileSync, existsSync } from "fs";
import { join } from "path";

const WORKFLOW_SCRIPTS = {
  "workflow:init": "workflow-agent init",
  "workflow:validate": "workflow-agent validate",
  "workflow:suggest": "workflow-agent suggest",
  "workflow:doctor": "workflow-agent doctor",
};

function isGlobalInstall(): boolean {
  // Check if we're being installed globally
  const installPath = process.env.npm_config_global;
  return installPath === "true";
}

function findProjectRoot(): string | null {
  // When installed as a dependency, npm/pnpm runs postinstall from the package directory
  // which is inside node_modules/@hawkinside_out/workflow-agent
  // We need to find the project root (the directory containing node_modules)

  let currentDir = process.cwd();

  // Check if we're inside node_modules
  if (currentDir.includes("node_modules")) {
    // Split on 'node_modules' and take everything before it
    // This handles both node_modules/@scope/package and node_modules/package
    const parts = currentDir.split("node_modules");
    if (parts.length > 0 && parts[0]) {
      // Remove trailing slash
      return parts[0].replace(/\/$/, "");
    }
  }

  // If not in node_modules, we're probably in a monorepo workspace during development
  // Don't modify package.json in this case
  return null;
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

    const packageJsonPath = join(projectRoot, "package.json");

    if (!existsSync(packageJsonPath)) {
      return;
    }

    // Read existing package.json
    const packageJsonContent = readFileSync(packageJsonPath, "utf-8");
    const packageJson = JSON.parse(packageJsonContent);

    // Initialize scripts object if it doesn't exist
    if (!packageJson.scripts) {
      packageJson.scripts = {};
    }

    // Check if any workflow scripts already exist
    const hasWorkflowScripts = Object.keys(WORKFLOW_SCRIPTS).some(
      (scriptName) => packageJson.scripts[scriptName],
    );

    if (hasWorkflowScripts) {
      // Scripts already exist, don't overwrite
      return;
    }

    // Add workflow scripts
    let addedCount = 0;
    for (const [scriptName, scriptCommand] of Object.entries(
      WORKFLOW_SCRIPTS,
    )) {
      if (!packageJson.scripts[scriptName]) {
        packageJson.scripts[scriptName] = scriptCommand;
        addedCount++;
      }
    }

    if (addedCount > 0) {
      // Write back to package.json with proper formatting
      writeFileSync(
        packageJsonPath,
        JSON.stringify(packageJson, null, 2) + "\n",
        "utf-8",
      );

      console.log("\n✓ Added workflow scripts to package.json:");
      Object.keys(WORKFLOW_SCRIPTS).forEach((scriptName) => {
        console.log(`  - ${scriptName}`);
      });
      console.log(
        "\nRun them with: npm run workflow:init (or pnpm run workflow:init)\n",
      );
    }
  } catch (error) {
    // Silently fail - this is a nice-to-have feature
    // We don't want to break the installation if something goes wrong
  }
}

// Run the script
addScriptsToPackageJson();
