import * as p from "@clack/prompts";
import chalk from "chalk";
import { readFileSync, writeFileSync, existsSync } from "fs";
import { join } from "path";

const WORKFLOW_SCRIPTS = {
  "workflow:init": "workflow-agent init",
  "workflow:validate": "workflow-agent validate",
  "workflow:suggest": "workflow-agent suggest",
  "workflow:doctor": "workflow-agent doctor",
};

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

  // Check which scripts already exist
  const existingScripts: string[] = [];
  const scriptsToAdd: Record<string, string> = {};

  for (const [scriptName, scriptCommand] of Object.entries(WORKFLOW_SCRIPTS)) {
    if (packageJson.scripts[scriptName]) {
      existingScripts.push(scriptName);
    } else {
      scriptsToAdd[scriptName] = scriptCommand;
    }
  }

  if (Object.keys(scriptsToAdd).length === 0) {
    p.outro(chalk.green("✓ All workflow scripts are already configured!"));
    return;
  }

  // Show what will be added
  console.log(chalk.dim("\nScripts to add:"));
  for (const [scriptName, scriptCommand] of Object.entries(scriptsToAdd)) {
    console.log(chalk.dim(`  ${scriptName}: ${scriptCommand}`));
  }

  if (existingScripts.length > 0) {
    console.log(chalk.yellow("\nExisting scripts (will be skipped):"));
    existingScripts.forEach((name) => {
      console.log(chalk.yellow(`  ${name}`));
    });
  }

  const shouldAdd = await p.confirm({
    message: "Add these scripts to package.json?",
    initialValue: true,
  });

  if (p.isCancel(shouldAdd) || !shouldAdd) {
    p.cancel("Setup cancelled");
    process.exit(0);
  }

  // Add scripts
  for (const [scriptName, scriptCommand] of Object.entries(scriptsToAdd)) {
    packageJson.scripts[scriptName] = scriptCommand;
  }

  // Write back to package.json
  writeFileSync(
    packageJsonPath,
    JSON.stringify(packageJson, null, 2) + "\n",
    "utf-8",
  );

  p.outro(
    chalk.green(
      `✓ Added ${Object.keys(scriptsToAdd).length} workflow scripts to package.json!`,
    ),
  );
  console.log(chalk.dim("\nRun them with:"));
  console.log(chalk.dim("  pnpm run workflow:init"));
  console.log(chalk.dim("  npm run workflow:init\n"));
}
