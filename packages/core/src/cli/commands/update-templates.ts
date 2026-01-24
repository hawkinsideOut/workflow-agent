import * as p from "@clack/prompts";
import chalk from "chalk";
import { existsSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import {
  updateTemplates,
  findTemplatesDirectory,
  type InstallTemplatesResult,
} from "../../scripts/template-installer.js";
import { generateCopilotInstructions } from "../../scripts/copilot-instructions-generator.js";
import { getMandatoryTemplateFilenames } from "../../templates/metadata.js";
import { templateMetadata } from "../../templates/metadata.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

export async function updateTemplatesCommand(options: {
  force?: boolean;
  skip?: boolean;
}): Promise<void> {
  const { force = false, skip = false } = options;

  p.intro(chalk.bgBlue(" workflow-agent update-templates "));

  const cwd = process.cwd();
  const guidelinesDir = join(cwd, "guidelines");

  // Find templates directory
  const templatesDir = findTemplatesDirectory(__dirname);

  if (!templatesDir) {
    p.cancel("Could not find templates directory");
    process.exit(1);
  }

  // Check if guidelines directory exists
  const guidelinesExist = existsSync(guidelinesDir);

  if (!guidelinesExist) {
    console.log(chalk.yellow("\n⚠️  No guidelines directory found."));
    console.log(chalk.dim("Run 'workflow-agent init' to set up guidelines.\n"));
    p.outro(chalk.yellow("No templates to update"));
    return;
  }

  // Show what will be updated
  const mandatoryFiles = getMandatoryTemplateFilenames();
  const allTemplates = Object.keys(templateMetadata).filter(
    (f) => f !== "_TEMPLATE_EXAMPLE.md",
  );

  console.log(chalk.cyan("\n📋 Available templates:\n"));

  console.log(chalk.bold("  Mandatory templates:"));
  for (const file of mandatoryFiles) {
    const meta = templateMetadata[file];
    console.log(chalk.dim(`    - ${file}`));
    if (meta?.description) {
      console.log(chalk.dim(`      ${meta.description}`));
    }
  }

  const optionalFiles = allTemplates.filter((f) => !mandatoryFiles.includes(f));
  if (optionalFiles.length > 0) {
    console.log(chalk.bold("\n  Optional templates:"));
    for (const file of optionalFiles) {
      const meta = templateMetadata[file];
      console.log(chalk.dim(`    - ${file}`));
      if (meta?.description) {
        console.log(chalk.dim(`      ${meta.description}`));
      }
    }
  }

  console.log("");

  // Handle skip option
  if (skip) {
    p.outro(chalk.yellow("Skipped template update (--skip flag)"));
    return;
  }

  // If not forcing, ask for confirmation
  if (!force) {
    const shouldContinue = await p.confirm({
      message: force
        ? "Force update all templates? (existing files will be overwritten)"
        : "Update templates? (existing files will be skipped unless --force is used)",
      initialValue: true,
    });

    if (p.isCancel(shouldContinue) || !shouldContinue) {
      p.cancel("Template update cancelled");
      process.exit(0);
    }
  }

  // Perform the update
  const spinner = p.spinner();
  spinner.start("Updating templates...");

  let result: InstallTemplatesResult;

  try {
    result = updateTemplates(cwd, templatesDir, {
      force,
      silent: true,
    });
  } catch (error) {
    spinner.stop("❌ Failed to update templates");
    console.log(
      chalk.red(
        `\nError: ${error instanceof Error ? error.message : String(error)}`,
      ),
    );
    process.exit(1);
  }

  // Report results
  const totalChanges = result.installed.length + result.updated.length;

  if (totalChanges === 0 && result.skipped.length > 0) {
    spinner.stop("No changes needed");
    console.log(
      chalk.dim(
        `\n  ${result.skipped.length} files already up to date (use --force to overwrite)`,
      ),
    );
  } else {
    spinner.stop(`✓ Template update complete`);

    if (result.installed.length > 0) {
      console.log(chalk.green(`\n  New templates installed:`));
      for (const file of result.installed) {
        console.log(chalk.dim(`    + ${file}`));
      }
    }

    if (result.updated.length > 0) {
      console.log(chalk.yellow(`\n  Templates updated:`));
      for (const file of result.updated) {
        console.log(chalk.dim(`    ~ ${file}`));
      }
    }

    if (result.skipped.length > 0) {
      console.log(chalk.dim(`\n  Skipped (already exists):`));
      for (const file of result.skipped) {
        console.log(chalk.dim(`    - ${file}`));
      }
    }
  }

  if (result.errors.length > 0) {
    console.log(chalk.red(`\n  Errors:`));
    for (const error of result.errors) {
      console.log(chalk.red(`    ! ${error}`));
    }
  }

  // Regenerate copilot instructions if templates were changed
  if (totalChanges > 0) {
    console.log("");
    const instructionsResult = generateCopilotInstructions(cwd, {
      silent: true,
    });
    if (instructionsResult.success) {
      console.log(
        chalk.green(
          `✓ Regenerated .github/copilot-instructions.md from ${instructionsResult.guidelinesCount} guidelines`,
        ),
      );
    }
  }

  p.outro(chalk.green("Done!"));
}
