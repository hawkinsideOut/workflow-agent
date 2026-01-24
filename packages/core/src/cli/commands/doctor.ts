import chalk from "chalk";
import { loadConfigSafe, autoFixConfigFile } from "../../config/index.js";
import { getMandatoryTemplateFilenames } from "../../templates/metadata.js";
import { existsSync } from "fs";
import { join } from "path";
import { hasGitRepo, getAllHooksStatus } from "../../utils/hooks.js";

export async function doctorCommand(options?: {
  checkGuidelinesOnly?: boolean;
  fix?: boolean;
}) {
  console.log(chalk.bold.cyan("\n🏥 Workflow Agent Health Check\n"));

  // Use safe loading to handle validation errors gracefully
  const result = await loadConfigSafe();

  // Handle missing config
  if (!result.configPath && !result.rawConfig) {
    console.error(chalk.red("✗ No workflow configuration found"));
    console.log(chalk.yellow("  Run: workflow init"));
    process.exit(1);
  }

  // Handle validation errors
  if (!result.valid && result.issues.length > 0) {
    console.log(chalk.yellow("⚠ Configuration has validation issues:\n"));

    for (const issue of result.issues) {
      console.log(chalk.red(`  ✗ ${issue.path}: ${issue.message}`));
      if (issue.currentValue !== undefined) {
        console.log(
          chalk.dim(`    Current value: ${JSON.stringify(issue.currentValue)}`),
        );
      }
      if (issue.suggestedFix) {
        console.log(
          chalk.green(`    Suggested fix: ${issue.suggestedFix.description}`),
        );
        console.log(
          chalk.dim(
            `    New value: ${JSON.stringify(issue.suggestedFix.newValue)}`,
          ),
        );
      }
    }

    // Check if auto-fix is available
    const hasAutoFixes = result.issues.some((i) => i.suggestedFix);

    if (hasAutoFixes) {
      if (options?.fix) {
        // Auto-fix was requested
        console.log(chalk.cyan("\n🔧 Attempting to auto-fix issues...\n"));
        const fixResult = await autoFixConfigFile();

        if (fixResult.success) {
          console.log(chalk.green("✓ Configuration fixed successfully!\n"));
          for (const change of fixResult.changes) {
            console.log(chalk.dim(`  • ${change}`));
          }
          console.log(
            chalk.cyan("\n  Run 'workflow doctor' again to verify.\n"),
          );
          process.exit(0);
        } else {
          console.log(chalk.red(`✗ Auto-fix failed: ${fixResult.error}`));
          process.exit(1);
        }
      } else {
        console.log(chalk.cyan("\n💡 Auto-fix available!"));
        console.log(chalk.dim("  Run: workflow doctor --fix\n"));
      }
    }

    process.exit(1);
  }

  const config = result.config!;

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
      chalk.green(
        `\n✓ All ${mandatoryFiles.length} mandatory guidelines present`,
      ),
    );
  } else {
    console.log(
      chalk.red(`\n✗ Missing ${missingFiles.length} mandatory guideline(s)`),
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
    try {
      const hooksStatus = await getAllHooksStatus(cwd);

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
    } catch (error) {
      console.log(chalk.yellow("⚠ Could not check hooks status"));
      console.log(
        chalk.dim(
          `  ${error instanceof Error ? error.message : "Unknown error"}`,
        ),
      );
    }
  }

  // Exit with error if guidelines are missing
  if (missingFiles.length > 0) {
    process.exit(1);
  }
}
