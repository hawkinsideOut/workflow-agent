import chalk from "chalk";
import { loadConfig } from "../../config/index.js";
import { getMandatoryTemplateFilenames } from "../../templates/metadata.js";
import { existsSync } from "fs";
import { join } from "path";
import { hasGitRepo, getAllHooksStatus } from "../../utils/hooks.js";

export async function doctorCommand(options?: {
  checkGuidelinesOnly?: boolean;
}) {
  console.log(chalk.bold.cyan("\n🏥 Workflow Agent Health Check\n"));

  const config = await loadConfig();

  if (!config) {
    console.error(chalk.red("✗ No workflow configuration found"));
    console.log(chalk.yellow("  Run: workflow init"));
    process.exit(1);
  }

  console.log(chalk.green("✓ Configuration loaded successfully"));
  console.log(chalk.dim(`  Project: ${config.projectName}`));
  console.log(chalk.dim(`  Scopes: ${config.scopes.length} configured`));
  console.log(chalk.dim(`  Enforcement: ${config.enforcement}`));
  console.log(chalk.dim(`  Language: ${config.language}`));

  // Check guidelines
  const cwd = process.cwd();
  const guidelinesDir = join(cwd, "guidelines");
  const mandatoryFiles = getMandatoryTemplateFilenames();
  const missingFiles: string[] = [];

  console.log(chalk.cyan("\n📚 Guidelines Check:\n"));

  for (const filename of mandatoryFiles) {
    const filePath = join(guidelinesDir, filename);
    if (existsSync(filePath)) {
      console.log(chalk.green(`✓ ${filename}`));
    } else {
      console.log(chalk.red(`✗ ${filename} (missing)`));
      missingFiles.push(filename);
    }
  }

  if (missingFiles.length === 0) {
    console.log(
      chalk.green(`\n✓ All ${mandatoryFiles.length} mandatory guidelines present`),
    );
  } else {
    console.log(
      chalk.red(
        `\n✗ Missing ${missingFiles.length} mandatory guideline(s)`,
      ),
    );
  }

  // If check-guidelines-only flag is set, exit here
  if (options?.checkGuidelinesOnly) {
    process.exit(missingFiles.length > 0 ? 1 : 0);
  }

  // Check git hooks status
  console.log(chalk.cyan("\n🔗 Git Hooks Check:\n"));

  if (!hasGitRepo(cwd)) {
    console.log(chalk.yellow("⚠ No git repository found"));
    console.log(chalk.dim("  Run: git init"));
  } else {
    const hooksStatus = getAllHooksStatus(cwd);
    
    for (const status of hooksStatus) {
      if (status.installed) {
        console.log(chalk.green(`✓ ${status.hookType}: installed`));
      } else {
        console.log(chalk.yellow(`⚠ ${status.hookType}: not installed`));
      }
    }

    const allInstalled = hooksStatus.every((s) => s.installed);
    if (!allInstalled) {
      console.log(chalk.dim("\n  Run: workflow hooks install"));
    }
  }

  // Exit with error if guidelines are missing
  if (missingFiles.length > 0) {
    process.exit(1);
  }
}
