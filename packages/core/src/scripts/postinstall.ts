#!/usr/bin/env node

/**
 * Post-install script that automatically adds the workflow script to package.json
 * when installed as a local dependency (not global).
 *
 * On package update, this will also remove deprecated scripts from older versions.
 */

import { readFileSync, writeFileSync, existsSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import {
  WORKFLOW_SCRIPTS,
  DEPRECATED_SCRIPTS,
  WORKFLOW_SCRIPTS_VERSION,
  validateAllScripts,
} from "./workflow-scripts.js";
import { generateCopilotInstructions } from "./copilot-instructions-generator.js";
import {
  installMandatoryTemplates,
  findTemplatesDirectory,
} from "./template-installer.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

/**
 * Check if we're being installed globally
 */
export function isGlobalInstall(): boolean {
  const installPath = process.env.npm_config_global;
  return installPath === "true";
}

/**
 * Find the project root by navigating out of node_modules
 */
export function findProjectRoot(): string | null {
  const currentDir = process.cwd();

  // Check if we're inside node_modules
  if (currentDir.includes("node_modules")) {
    const parts = currentDir.split("node_modules");
    if (parts.length > 0 && parts[0]) {
      return parts[0].replace(/\/$/, "");
    }
  }

  // If not in node_modules, we're probably in a monorepo workspace during development
  return null;
}

/**
 * Remove deprecated scripts from package.json
 */
export function removeDeprecatedScripts(
  scripts: Record<string, string>
): string[] {
  const removedScripts: string[] = [];

  // Remove explicitly deprecated scripts
  for (const deprecatedScript of DEPRECATED_SCRIPTS) {
    if (scripts[deprecatedScript] !== undefined) {
      delete scripts[deprecatedScript];
      removedScripts.push(deprecatedScript);
    }
  }

  // Also remove any remaining workflow:* or workflow-* scripts (catch-all)
  const oldScripts = validateAllScripts(scripts);
  for (const oldScript of oldScripts) {
    if (scripts[oldScript] !== undefined) {
      delete scripts[oldScript];
      if (!removedScripts.includes(oldScript)) {
        removedScripts.push(oldScript);
      }
    }
  }

  return removedScripts;
}

/**
 * Add the workflow script to package.json
 */
export function addWorkflowScript(
  scripts: Record<string, string>
): { added: boolean; updated: boolean } {
  const scriptName = "workflow";
  const scriptCommand = WORKFLOW_SCRIPTS.workflow;

  if (!scripts[scriptName]) {
    scripts[scriptName] = scriptCommand;
    return { added: true, updated: false };
  } else if (scripts[scriptName] !== scriptCommand) {
    scripts[scriptName] = scriptCommand;
    return { added: false, updated: true };
  }

  return { added: false, updated: false };
}

/**
 * Main function to configure workflow scripts in package.json
 */
export function addScriptsToPackageJson(): void {
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

    // Step 1: Remove deprecated scripts
    const removedScripts = removeDeprecatedScripts(packageJson.scripts);

    // Step 2: Add the workflow script
    const { added, updated } = addWorkflowScript(packageJson.scripts);

    const hasChanges = removedScripts.length > 0 || added || updated;

    if (hasChanges) {
      // Write back to package.json with proper formatting
      writeFileSync(
        packageJsonPath,
        JSON.stringify(packageJson, null, 2) + "\n",
        "utf-8"
      );

      console.log(`\n✓ Workflow Agent v${WORKFLOW_SCRIPTS_VERSION} configured`);

      if (added) {
        console.log(`\n  Added "workflow" script to package.json`);
      } else if (updated) {
        console.log(`\n  Updated "workflow" script in package.json`);
      }

      // Log removed deprecated scripts
      if (removedScripts.length > 0) {
        console.log(
          `\n  ⚠️  Removed ${removedScripts.length} deprecated scripts`
        );
        console.log(
          `     (Old workflow:* scripts replaced by single "workflow" command)`
        );
      }

      console.log(`\n  Usage:`);
      console.log(`    npm run workflow -- init`);
      console.log(`    npm run workflow -- solution list`);
      console.log(`    npm run workflow -- --help`);
      console.log(`\n  Or with pnpm:`);
      console.log(`    pnpm workflow init`);
      console.log(`    pnpm workflow solution list`);
      console.log(`    pnpm workflow --help`);
      console.log(`\n  Or if installed globally:`);
      console.log(`    workflow-agent init`);
      console.log(`    workflow-agent --help\n`);
    }

    // Install mandatory templates if guidelines directory doesn't exist
    const guidelinesDir = join(projectRoot, "guidelines");
    if (!existsSync(guidelinesDir)) {
      const templatesDir = findTemplatesDirectory(__dirname);
      if (templatesDir) {
        const templateResult = installMandatoryTemplates(
          projectRoot,
          templatesDir,
          { silent: false, skipIfExists: true, mandatoryOnly: true }
        );
        if (templateResult.installed.length > 0) {
          console.log(
            `✓ Installed ${templateResult.installed.length} mandatory guideline templates`
          );
        }
      }
    }

    // Generate .github/copilot-instructions.md if guidelines exist
    if (existsSync(guidelinesDir)) {
      const result = generateCopilotInstructions(projectRoot, { silent: true });
      if (result.success) {
        const status = result.isNew ? "Generated" : "Updated";
        console.log(
          `✓ ${status} .github/copilot-instructions.md from ${result.guidelinesCount} guidelines`
        );
        if (result.preservedCustomContent) {
          console.log("  (Custom content preserved)");
        }
      }
    }
  } catch (error) {
    // Silently fail - this is a nice-to-have feature
    // We don't want to break the installation if something goes wrong
  }
}

// Run the script
addScriptsToPackageJson();
