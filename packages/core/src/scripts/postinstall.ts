#!/usr/bin/env node

/**
 * Post-install script that automatically adds workflow scripts to package.json
 * when installed as a local dependency (not global)
 */

import { readFileSync, writeFileSync, existsSync } from "fs";
import { join } from "path";

const WORKFLOW_SCRIPTS = {
  // Core Commands
  "workflow:init": "workflow-agent init",
  "workflow:validate": "workflow-agent validate",
  "workflow:config": "workflow-agent config",
  "workflow:suggest": "workflow-agent suggest",
  "workflow:setup": "workflow-agent setup",
  "workflow:doctor": "workflow-agent doctor",

  // Scope Commands
  "workflow:scope:create": "workflow-agent scope:create",
  "workflow:scope:migrate": "workflow-agent scope:migrate",

  // Verification & Auto-Setup
  "workflow:verify": "workflow-agent verify",
  "workflow:verify:fix": "workflow-agent verify --fix",
  "workflow:auto-setup": "workflow-agent auto-setup",

  // Learning System Commands
  "workflow:learn:record": "workflow-agent learn:record",
  "workflow:learn:list": "workflow-agent learn:list",
  "workflow:learn:apply": "workflow-agent learn:apply",
  "workflow:learn:sync": "workflow-agent learn:sync",
  "workflow:learn:config": "workflow-agent learn:config",
  "workflow:learn:deprecate": "workflow-agent learn:deprecate",
  "workflow:learn:stats": "workflow-agent learn:stats",

  // Solution Pattern Commands
  "workflow:solution:capture": "workflow-agent solution:capture",
  "workflow:solution:search": "workflow-agent solution:search",
  "workflow:solution:list": "workflow-agent solution:list",
  "workflow:solution:apply": "workflow-agent solution:apply",
  "workflow:solution:deprecate": "workflow-agent solution:deprecate",
  "workflow:solution:stats": "workflow-agent solution:stats",
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
      console.log("\n  Core Commands:");
      console.log("    - workflow:init");
      console.log("    - workflow:validate");
      console.log("    - workflow:config");
      console.log("    - workflow:suggest");
      console.log("    - workflow:setup");
      console.log("    - workflow:doctor");
      console.log("\n  Scope Commands:");
      console.log("    - workflow:scope:create");
      console.log("    - workflow:scope:migrate");
      console.log("\n  Verification:");
      console.log("    - workflow:verify");
      console.log("    - workflow:verify:fix");
      console.log("    - workflow:auto-setup");
      console.log("\n  Learning System:");
      console.log("    - workflow:learn:record");
      console.log("    - workflow:learn:list");
      console.log("    - workflow:learn:apply");
      console.log("    - workflow:learn:sync");
      console.log("    - workflow:learn:config");
      console.log("    - workflow:learn:deprecate");
      console.log("    - workflow:learn:stats");
      console.log("\n  Solution Patterns:");
      console.log("    - workflow:solution:capture");
      console.log("    - workflow:solution:search");
      console.log("    - workflow:solution:list");
      console.log("    - workflow:solution:apply");
      console.log("    - workflow:solution:deprecate");
      console.log("    - workflow:solution:stats");
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
