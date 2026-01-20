#!/usr/bin/env node

/**
 * Post-install script that automatically adds workflow scripts to package.json
 * when installed as a local dependency (not global).
 *
 * On package update, this will also add any new scripts that were added in newer versions.
 */

import { readFileSync, writeFileSync, existsSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import {
  WORKFLOW_SCRIPTS,
  SCRIPT_CATEGORIES,
  TOTAL_SCRIPTS,
} from "./workflow-scripts.js";
import { generateCopilotInstructions } from "./copilot-instructions-generator.js";
import {
  installMandatoryTemplates,
  findTemplatesDirectory,
} from "./template-installer.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

function isGlobalInstall(): boolean {
  // Check if we're being installed globally
  const installPath = process.env.npm_config_global;
  return installPath === "true";
}

function findProjectRoot(): string | null {
  // When installed as a dependency, npm/pnpm runs postinstall from the package directory
  // which is inside node_modules/@hawkinside_out/workflow-agent
  // We need to find the project root (the directory containing node_modules)

  const currentDir = process.cwd();

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

    // Track added and updated scripts separately
    const addedScripts: string[] = [];
    const updatedScripts: string[] = [];

    // Always add/update all workflow scripts (ensures updates get new scripts)
    for (const [scriptName, scriptCommand] of Object.entries(
      WORKFLOW_SCRIPTS,
    )) {
      if (!packageJson.scripts[scriptName]) {
        // Script doesn't exist - add it
        packageJson.scripts[scriptName] = scriptCommand;
        addedScripts.push(scriptName);
      } else if (packageJson.scripts[scriptName] !== scriptCommand) {
        // Script exists but has different value - update it
        packageJson.scripts[scriptName] = scriptCommand;
        updatedScripts.push(scriptName);
      }
      // If script exists with same value, do nothing (already up to date)
    }

    const totalChanges = addedScripts.length + updatedScripts.length;

    if (totalChanges > 0) {
      // Write back to package.json with proper formatting
      writeFileSync(
        packageJsonPath,
        JSON.stringify(packageJson, null, 2) + "\n",
        "utf-8",
      );

      // Build summary message
      const summaryParts: string[] = [];
      if (addedScripts.length > 0) {
        summaryParts.push(`${addedScripts.length} new`);
      }
      if (updatedScripts.length > 0) {
        summaryParts.push(`${updatedScripts.length} updated`);
      }

      console.log(
        `\n✓ Workflow scripts configured in package.json (${summaryParts.join(", ")}):`,
      );

      // Display scripts by category
      for (const [category, scripts] of Object.entries(SCRIPT_CATEGORIES)) {
        console.log(`\n  ${category}:`);
        for (const script of scripts) {
          const isNew = addedScripts.includes(script);
          const isUpdated = updatedScripts.includes(script);
          const marker = isNew ? " (new)" : isUpdated ? " (updated)" : "";
          console.log(`    - ${script}${marker}`);
        }
      }

      console.log(`\n  Total: ${TOTAL_SCRIPTS} scripts available`);
      console.log(
        "\nRun them with: npm run workflow:init (or pnpm run workflow:init)\n",
      );
    }

    // Install mandatory templates if guidelines directory doesn't exist
    const guidelinesDir = join(projectRoot, "guidelines");
    if (!existsSync(guidelinesDir)) {
      const templatesDir = findTemplatesDirectory(__dirname);
      if (templatesDir) {
        const templateResult = installMandatoryTemplates(
          projectRoot,
          templatesDir,
          { silent: false, skipIfExists: true, mandatoryOnly: true },
        );
        if (templateResult.installed.length > 0) {
          console.log(
            `✓ Installed ${templateResult.installed.length} mandatory guideline templates`,
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
          `✓ ${status} .github/copilot-instructions.md from ${result.guidelinesCount} guidelines`,
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
