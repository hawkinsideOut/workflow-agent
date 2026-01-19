import * as p from "@clack/prompts";
import chalk from "chalk";
import { readFileSync, writeFileSync, existsSync } from "fs";
import { join } from "path";
import {
  WORKFLOW_SCRIPTS,
  SCRIPT_CATEGORIES,
  TOTAL_SCRIPTS,
} from "../../scripts/workflow-scripts.js";

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

  // Track added and updated scripts separately
  const addedScripts: string[] = [];
  const updatedScripts: string[] = [];

  // Always add/update all workflow scripts (ensures updates get new scripts)
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

  const totalChanges = addedScripts.length + updatedScripts.length;

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

  console.log(
    chalk.green(
      `\n✓ Workflow scripts configured (${summaryParts.join(", ")}):\n`,
    ),
  );

  // Display scripts by category
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
}
