import * as p from "@clack/prompts";
import chalk from "chalk";
import { existsSync } from "fs";
import { join } from "path";
import { generateCopilotInstructions } from "../../../scripts/copilot-instructions-generator.js";

export interface DocsGenerateOptions {
  force?: boolean;
}

export async function docsGenerateCommand(
  options: DocsGenerateOptions,
): Promise<void> {
  p.intro(chalk.bgBlue(" workflow docs generate "));

  const cwd = process.cwd();
  const guidelinesDir = join(cwd, "guidelines");
  const outputPath = join(cwd, ".github", "copilot-instructions.md");

  // Check if guidelines directory exists
  if (!existsSync(guidelinesDir)) {
    p.cancel(
      "No guidelines directory found. Run 'workflow init' first to generate guidelines.",
    );
    process.exit(1);
  }

  // Check if file already exists and not forcing
  if (existsSync(outputPath) && !options.force) {
    const shouldRegenerate = await p.confirm({
      message:
        ".github/copilot-instructions.md already exists. Regenerate? (Custom content will be preserved)",
      initialValue: true,
    });

    if (p.isCancel(shouldRegenerate) || !shouldRegenerate) {
      p.cancel("Generation cancelled");
      process.exit(0);
    }
  }

  const spinner = p.spinner();
  spinner.start("Generating AI agent instructions from guidelines...");

  try {
    const result = generateCopilotInstructions(cwd, {
      force: true,
      silent: false,
    });

    if (result.success) {
      const status = result.isNew ? "Generated" : "Regenerated";
      spinner.stop(
        chalk.green(
          `✓ ${status} .github/copilot-instructions.md from ${result.guidelinesCount} guidelines`,
        ),
      );

      if (result.preservedCustomContent) {
        console.log(
          chalk.dim("  Custom content between markers was preserved."),
        );
      }

      console.log(chalk.dim(`\n  Output: ${result.filePath}`));
      console.log(
        chalk.dim(
          "\n  💡 Tip: Add project-specific instructions between the CUSTOM markers.",
        ),
      );
    } else {
      spinner.stop(chalk.red("✗ Failed to generate instructions"));
      console.log(chalk.yellow(`\nReason: ${result.error}`));
    }
  } catch (error) {
    spinner.stop(chalk.red("✗ Error generating instructions"));
    console.log(
      chalk.yellow(
        `\nReason: ${error instanceof Error ? error.message : String(error)}`,
      ),
    );
    process.exit(1);
  }

  p.outro(chalk.green("✓ AI agent instructions ready!"));
  console.log(chalk.dim("\nThe .github/copilot-instructions.md file:"));
  console.log(chalk.dim("  - Is read by GitHub Copilot and other AI agents"));
  console.log(
    chalk.dim("  - Summarizes all guidelines with links to full docs"),
  );
  console.log(chalk.dim("  - Includes your project scopes and conventions"));
  console.log(
    chalk.dim("  - Preserves custom instructions you add between markers\n"),
  );
}
