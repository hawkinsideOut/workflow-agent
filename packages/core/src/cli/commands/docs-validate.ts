import * as p from "@clack/prompts";
import chalk from "chalk";
import { relative } from "path";
import {
  validateDocumentReferences,
  applyReferenceFix,
} from "../../validators/document-references.js";

export async function docsValidateCommand(options: {
  fix?: boolean;
  patterns?: string[];
  ignore?: string[];
}): Promise<void> {
  const { fix = false, patterns, ignore } = options;

  p.intro(chalk.bgBlue(" workflow-agent docs:validate "));

  const cwd = process.cwd();

  // Show scanning status
  const spinner = p.spinner();
  spinner.start("Scanning markdown files for broken references...");

  try {
    // Run validation
    const result = await validateDocumentReferences(cwd, {
      patterns,
      ignore,
    });

    spinner.stop("Scan complete");

    // Display results
    console.log("");
    console.log(
      chalk.cyan(
        `📄 Scanned ${result.scannedFiles} file(s), found ${result.totalReferences} reference(s)`,
      ),
    );

    if (result.errors.length > 0) {
      console.log("");
      console.log(chalk.red("❌ Errors during validation:"));
      for (const error of result.errors) {
        console.log(chalk.red(`   ${error}`));
      }
      p.outro(chalk.red("Validation failed"));
      process.exit(1);
    }

    if (result.valid) {
      console.log("");
      console.log(chalk.green("✅ All document references are valid!"));
      p.outro(chalk.green("No broken links found"));
      return;
    }

    // Display broken references
    console.log("");
    console.log(
      chalk.yellow(
        `⚠️  Found ${result.brokenReferences.length} broken reference(s):`,
      ),
    );
    console.log("");

    for (const broken of result.brokenReferences) {
      const relativePath = relative(cwd, broken.file);
      console.log(
        chalk.red(
          `  ${relativePath}:${broken.line}:${broken.column} - ${broken.type}`,
        ),
      );
      console.log(chalk.dim(`    ${broken.rawLink}`));
      console.log(chalk.dim(`    Target: ${broken.targetPath}`));
      if (broken.suggestions.length > 0) {
        console.log(chalk.dim(`    Suggestions: ${broken.suggestions.slice(0, 3).join(", ")}`));
      }
      console.log("");
    }

    // If not in fix mode, exit with error
    if (!fix) {
      console.log(
        chalk.yellow("💡 Run with --fix flag to interactively fix broken references"),
      );
      p.outro(chalk.red("Validation failed"));
      process.exit(1);
    }

    // Interactive fix mode
    console.log(chalk.cyan("🔧 Interactive fix mode\n"));

    let fixedCount = 0;
    let skippedCount = 0;

    for (const broken of result.brokenReferences) {
      const relativePath = relative(cwd, broken.file);
      console.log(chalk.bold(`\n${relativePath}:${broken.line}`));
      console.log(chalk.dim(`  ${broken.rawLink}`));
      console.log(chalk.yellow(`  ❌ Broken: ${broken.targetPath}\n`));

      // Build options for the select prompt
      const options: Array<{ value: string; label: string }> = [];

      // Add suggestions
      if (broken.suggestions.length > 0) {
        options.push(
          ...broken.suggestions.slice(0, 8).map((suggestion) => ({
            value: suggestion,
            label: `📄 ${suggestion}`,
          })),
        );
      }

      // Add custom path option
      options.push({
        value: "__custom__",
        label: "✏️  Enter custom path",
      });

      // Add skip option
      options.push({
        value: "__skip__",
        label: "⏭️  Skip this reference",
      });

      const choice = await p.select({
        message: "Choose correct path:",
        options,
      });

      if (p.isCancel(choice)) {
        console.log("");
        p.cancel("Fix operation cancelled");
        console.log(
          chalk.dim(`\nFixed: ${fixedCount}, Skipped: ${skippedCount}`),
        );
        process.exit(0);
      }

      if (choice === "__skip__") {
        skippedCount++;
        continue;
      }

      let newPath: string;

      if (choice === "__custom__") {
        const customPath = await p.text({
          message: "Enter the correct path:",
          placeholder: broken.targetPath,
          validate: (value) => {
            if (!value || value.trim().length === 0) {
              return "Path cannot be empty";
            }
            return undefined;
          },
        });

        if (p.isCancel(customPath)) {
          console.log("");
          p.cancel("Fix operation cancelled");
          console.log(
            chalk.dim(`\nFixed: ${fixedCount}, Skipped: ${skippedCount}`),
          );
          process.exit(0);
        }

        newPath = customPath as string;
      } else {
        newPath = choice as string;
      }

      // Apply the fix
      try {
        await applyReferenceFix(broken.file, broken.rawLink, newPath);
        console.log(chalk.green(`  ✅ Fixed: ${broken.targetPath} → ${newPath}`));
        fixedCount++;
      } catch (error) {
        console.log(
          chalk.red(
            `  ❌ Failed to fix: ${error instanceof Error ? error.message : "Unknown error"}`,
          ),
        );
        skippedCount++;
      }
    }

    console.log("");
    console.log(chalk.cyan(`📊 Summary:`));
    console.log(chalk.green(`   Fixed: ${fixedCount}`));
    if (skippedCount > 0) {
      console.log(chalk.yellow(`   Skipped: ${skippedCount}`));
    }

    if (fixedCount > 0) {
      p.outro(chalk.green("Document references fixed!"));
    } else {
      p.outro(chalk.yellow("No references were fixed"));
    }
  } catch (error) {
    spinner.stop("Scan failed");
    console.log("");
    p.cancel(
      `Validation error: ${error instanceof Error ? error.message : "Unknown error"}`,
    );
    process.exit(1);
  }
}
