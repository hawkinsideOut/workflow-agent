import * as p from "@clack/prompts";
import chalk from "chalk";
import { readFileSync, writeFileSync, existsSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import {
  WORKFLOW_SCRIPTS,
  DEPRECATED_SCRIPTS,
  WORKFLOW_SCRIPTS_VERSION,
  SCRIPT_CATEGORIES,
  TOTAL_SCRIPTS,
} from "../../scripts/workflow-scripts.js";
import { generateCopilotInstructions } from "../../scripts/copilot-instructions-generator.js";
import {
  installMandatoryTemplates,
  findTemplatesDirectory,
} from "../../scripts/template-installer.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

export async function setupCommand(): Promise<void> {
  p.intro(chalk.bgBlue(" workflow-agent setup "));

  const cwd = process.cwd();
  const packageJsonPath = join(cwd, "package.json");

  if (!existsSync(packageJsonPath)) {
    p.cancel("No package.json found in current directory");
    process.exit(1);
  }

  // Read package.json
  const packageJsonContent = readFileSync(packageJsonPath, "utf-8");
  const packageJson = JSON.parse(packageJsonContent);

  // Initialize scripts if needed
  if (!packageJson.scripts) {
    packageJson.scripts = {};
  }

  // Track changes
  const addedScripts: string[] = [];
  const updatedScripts: string[] = [];
  const removedScripts: string[] = [];

  // Step 1: Remove deprecated scripts
  for (const deprecatedScript of DEPRECATED_SCRIPTS) {
    if (packageJson.scripts[deprecatedScript] !== undefined) {
      delete packageJson.scripts[deprecatedScript];
      removedScripts.push(deprecatedScript);
    }
  }

  // Step 2: Add/update all workflow scripts (ensures updates get new scripts)
  for (const [scriptName, scriptCommand] of Object.entries(WORKFLOW_SCRIPTS)) {
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

  const totalChanges =
    addedScripts.length + updatedScripts.length + removedScripts.length;

  if (totalChanges === 0) {
    p.outro(
      chalk.green(
        `✓ All ${TOTAL_SCRIPTS} workflow scripts are already configured!`,
      ),
    );
    return;
  }

  // Write back to package.json
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
  if (removedScripts.length > 0) {
    summaryParts.push(`${removedScripts.length} deprecated removed`);
  }

  console.log(
    chalk.green(
      `\n✓ Workflow scripts configured (${summaryParts.join(", ")}):`,
    ),
  );

  // Log removed deprecated scripts
  if (removedScripts.length > 0) {
    console.log(chalk.yellow(`\n  ⚠️  Removed deprecated scripts:`));
    for (const script of removedScripts) {
      console.log(chalk.dim(`    - ${script}`));
    }
    console.log(
      chalk.cyan(
        `\n  💡 Updated to workflow-agent v${WORKFLOW_SCRIPTS_VERSION} with new command syntax.`,
      ),
    );
    console.log(chalk.dim(`     Old: workflow-agent learn:list`));
    console.log(chalk.dim(`     New: workflow-agent learn list`));
  }

  // Display scripts by category
  console.log("");
  for (const [category, scripts] of Object.entries(SCRIPT_CATEGORIES)) {
    console.log(chalk.cyan(`  ${category}:`));
    for (const script of scripts) {
      const isNew = addedScripts.includes(script);
      const isUpdated = updatedScripts.includes(script);
      const marker = isNew
        ? chalk.green(" (new)")
        : isUpdated
          ? chalk.yellow(" (updated)")
          : "";
      console.log(chalk.dim(`    - ${script}`) + marker);
    }
  }

  p.outro(
    chalk.green(
      `✓ ${TOTAL_SCRIPTS} workflow scripts available in package.json!`,
    ),
  );
  console.log(chalk.dim("\nRun them with:"));
  console.log(chalk.dim("  pnpm run workflow:init"));
  console.log(chalk.dim("  npm run workflow:init\n"));

  // Install mandatory templates if guidelines directory doesn't exist
  const guidelinesDir = join(cwd, "guidelines");
  if (!existsSync(guidelinesDir)) {
    const templatesDir = findTemplatesDirectory(__dirname);
    if (templatesDir) {
      const templateResult = installMandatoryTemplates(cwd, templatesDir, {
        silent: false,
        skipIfExists: true,
        mandatoryOnly: true,
      });
      if (templateResult.installed.length > 0) {
        console.log(
          chalk.green(
            `\n✓ Installed ${templateResult.installed.length} mandatory guideline templates`,
          ),
        );
      }
    }
  }

  // Generate .github/copilot-instructions.md if guidelines exist
  if (existsSync(guidelinesDir)) {
    const result = generateCopilotInstructions(cwd, { silent: false });
    if (result.success) {
      const status = result.isNew ? "Generated" : "Updated";
      console.log(
        chalk.green(
          `✓ ${status} .github/copilot-instructions.md from ${result.guidelinesCount} guidelines`,
        ),
      );
      if (result.preservedCustomContent) {
        console.log(chalk.dim("  (Custom content preserved)"));
      }
    }
  }
}
