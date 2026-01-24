import * as p from "@clack/prompts";
import chalk from "chalk";
import { readFileSync, writeFileSync, existsSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import {
  WORKFLOW_SCRIPTS,
  DEPRECATED_SCRIPTS,
  WORKFLOW_SCRIPTS_VERSION,
  validateAllScripts,
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
  let scriptAdded = false;
  let scriptUpdated = false;
  const removedScripts: string[] = [];

  // Step 1: Remove deprecated scripts
  for (const deprecatedScript of DEPRECATED_SCRIPTS) {
    if (packageJson.scripts[deprecatedScript] !== undefined) {
      delete packageJson.scripts[deprecatedScript];
      removedScripts.push(deprecatedScript);
    }
  }

  // Also remove any remaining workflow:* or workflow-* scripts
  const oldScripts = validateAllScripts(packageJson.scripts);
  for (const oldScript of oldScripts) {
    if (packageJson.scripts[oldScript] !== undefined) {
      delete packageJson.scripts[oldScript];
      if (!removedScripts.includes(oldScript)) {
        removedScripts.push(oldScript);
      }
    }
  }

  // Step 2: Add the workflow script
  const scriptName = "workflow";
  const scriptCommand = WORKFLOW_SCRIPTS.workflow;

  if (!packageJson.scripts[scriptName]) {
    packageJson.scripts[scriptName] = scriptCommand;
    scriptAdded = true;
  } else if (packageJson.scripts[scriptName] !== scriptCommand) {
    packageJson.scripts[scriptName] = scriptCommand;
    scriptUpdated = true;
  }

  const hasChanges = scriptAdded || scriptUpdated || removedScripts.length > 0;

  if (!hasChanges) {
    p.outro(chalk.green(`✓ Workflow script is already configured!`));
    return;
  }

  // Write back to package.json
  writeFileSync(
    packageJsonPath,
    JSON.stringify(packageJson, null, 2) + "\n",
    "utf-8",
  );

  console.log(
    chalk.green(`\n✓ Workflow Agent v${WORKFLOW_SCRIPTS_VERSION} configured`),
  );

  if (scriptAdded) {
    console.log(chalk.green(`\n  Added "workflow" script to package.json`));
  } else if (scriptUpdated) {
    console.log(chalk.green(`\n  Updated "workflow" script in package.json`));
  }

  // Log removed deprecated scripts
  if (removedScripts.length > 0) {
    console.log(
      chalk.yellow(
        `\n  ⚠️  Removed ${removedScripts.length} deprecated scripts`,
      ),
    );
    console.log(
      chalk.dim(
        `     (Old workflow:* scripts replaced by single "workflow" command)`,
      ),
    );
  }

  console.log(chalk.cyan(`\n  Usage:`));
  console.log(chalk.dim(`    npm run workflow -- init`));
  console.log(chalk.dim(`    npm run workflow -- solution list`));
  console.log(chalk.dim(`    npm run workflow -- --help`));
  console.log(chalk.cyan(`\n  Or with pnpm:`));
  console.log(chalk.dim(`    pnpm workflow init`));
  console.log(chalk.dim(`    pnpm workflow solution list`));
  console.log(chalk.dim(`    pnpm workflow --help`));

  p.outro(chalk.green(`✓ Workflow script ready!`));

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
