import * as p from "@clack/prompts";
import chalk from "chalk";
import { PatternStore } from "@hawkinside_out/workflow-improvement-tracker";

interface MigrateOptions {
  dryRun?: boolean;
  type?: "fix" | "blueprint" | "solution" | "all";
}

export async function migrateCommand(subcommand: string, options: MigrateOptions) {
  if (subcommand === "filenames") {
    await migrateFilenames(options);
  } else {
    console.error(chalk.red(`Unknown migrate subcommand: ${subcommand}`));
    console.log(chalk.dim("\nAvailable subcommands:"));
    console.log(chalk.dim("  filenames  Migrate pattern files to slugified names"));
    process.exit(1);
  }
}

/**
 * Migrate pattern files from UUID-only names to slugified names
 */
async function migrateFilenames(options: MigrateOptions) {
  const isDryRun = options.dryRun || false;
  const targetType = options.type || "all";

  console.log(chalk.bold.cyan("\n📦 Migrate Pattern Filenames\n"));

  if (isDryRun) {
    console.log(chalk.yellow("🔍 DRY RUN MODE - No files will be modified\n"));
  }

  const store = new PatternStore();
  const cwd = process.cwd();

  let totalProcessed = 0;
  let totalMigrated = 0;
  let totalFailed = 0;
  let totalSkipped = 0;

  const results: Array<{
    type: string;
    name: string;
    oldPath: string;
    newPath: string;
    status: "success" | "failed" | "skipped";
    error?: string;
  }> = [];

  // Process fixes
  if (targetType === "fix" || targetType === "all") {
    console.log(chalk.bold("Fixes:"));
    const fixesResult = await store.getAllFixes();
    if (fixesResult.success && fixesResult.data) {
      for (const fix of fixesResult.data) {
        totalProcessed++;
        try {
          const oldPath = store.getFixFilePath(fix.id);
          const newPath = store.getFixFilePath(fix.id, fix.name);

          if (oldPath === newPath) {
            console.log(chalk.dim(`  ⊘ ${fix.name} - already migrated`));
            results.push({
              type: "fix",
              name: fix.name,
              oldPath,
              newPath,
              status: "skipped",
            });
            totalSkipped++;
            continue;
          }

          if (!isDryRun) {
            // Re-save the pattern to trigger migration
            await store.saveFixPattern(fix);
          }

          console.log(chalk.green(`  ✓ ${fix.name}`));
          console.log(chalk.dim(`    ${oldPath} → ${newPath}`));
          results.push({
            type: "fix",
            name: fix.name,
            oldPath,
            newPath,
            status: "success",
          });
          totalMigrated++;
        } catch (error) {
          console.log(chalk.red(`  ✗ ${fix.name} - ${error}`));
          results.push({
            type: "fix",
            name: fix.name,
            oldPath: "",
            newPath: "",
            status: "failed",
            error: String(error),
          });
          totalFailed++;
        }
      }
    }
    console.log();
  }

  // Process blueprints
  if (targetType === "blueprint" || targetType === "all") {
    console.log(chalk.bold("Blueprints:"));
    const blueprintsResult = await store.getAllBlueprints();
    if (blueprintsResult.success && blueprintsResult.data) {
      for (const blueprint of blueprintsResult.data) {
        totalProcessed++;
        try {
          const oldPath = store.getBlueprintFilePath(blueprint.id);
          const newPath = store.getBlueprintFilePath(blueprint.id, blueprint.name);

          if (oldPath === newPath) {
            console.log(chalk.dim(`  ⊘ ${blueprint.name} - already migrated`));
            results.push({
              type: "blueprint",
              name: blueprint.name,
              oldPath,
              newPath,
              status: "skipped",
            });
            totalSkipped++;
            continue;
          }

          if (!isDryRun) {
            // Re-save the pattern to trigger migration
            await store.saveBlueprint(blueprint);
          }

          console.log(chalk.green(`  ✓ ${blueprint.name}`));
          console.log(chalk.dim(`    ${oldPath} → ${newPath}`));
          results.push({
            type: "blueprint",
            name: blueprint.name,
            oldPath,
            newPath,
            status: "success",
          });
          totalMigrated++;
        } catch (error) {
          console.log(chalk.red(`  ✗ ${blueprint.name} - ${error}`));
          results.push({
            type: "blueprint",
            name: blueprint.name,
            oldPath: "",
            newPath: "",
            status: "failed",
            error: String(error),
          });
          totalFailed++;
        }
      }
    }
    console.log();
  }

  // Process solutions
  if (targetType === "solution" || targetType === "all") {
    console.log(chalk.bold("Solutions:"));
    const solutionsResult = await store.getAllSolutions();
    if (solutionsResult.success && solutionsResult.data) {
      for (const solution of solutionsResult.data) {
        totalProcessed++;
        try {
          const oldPath = store.getSolutionFilePath(solution.id);
          const newPath = store.getSolutionFilePath(solution.id, solution.name);

          if (oldPath === newPath) {
            console.log(chalk.dim(`  ⊘ ${solution.name} - already migrated`));
            results.push({
              type: "solution",
              name: solution.name,
              oldPath,
              newPath,
              status: "skipped",
            });
            totalSkipped++;
            continue;
          }

          if (!isDryRun) {
            // Re-save the pattern to trigger migration
            await store.saveSolution(solution);
          }

          console.log(chalk.green(`  ✓ ${solution.name}`));
          console.log(chalk.dim(`    ${oldPath} → ${newPath}`));
          results.push({
            type: "solution",
            name: solution.name,
            oldPath,
            newPath,
            status: "success",
          });
          totalMigrated++;
        } catch (error) {
          console.log(chalk.red(`  ✗ ${solution.name} - ${error}`));
          results.push({
            type: "solution",
            name: solution.name,
            oldPath: "",
            newPath: "",
            status: "failed",
            error: String(error),
          });
          totalFailed++;
        }
      }
    }
    console.log();
  }

  // Summary
  console.log(chalk.bold("Summary:"));
  console.log(chalk.dim(`  Total patterns: ${totalProcessed}`));
  if (totalMigrated > 0) {
    console.log(chalk.green(`  ✓ Migrated: ${totalMigrated}`));
  }
  if (totalSkipped > 0) {
    console.log(chalk.dim(`  ⊘ Already migrated: ${totalSkipped}`));
  }
  if (totalFailed > 0) {
    console.log(chalk.red(`  ✗ Failed: ${totalFailed}`));
  }

  if (isDryRun && totalMigrated > 0) {
    console.log(chalk.yellow("\n⚠️  This was a dry run. Run without --dry-run to apply changes."));
  } else if (!isDryRun && totalMigrated > 0) {
    console.log(chalk.green("\n✓ Migration complete!"));
  } else if (totalSkipped === totalProcessed) {
    console.log(chalk.dim("\n✓ All patterns already use slugified filenames."));
  }

  if (totalFailed > 0) {
    console.log(chalk.red("\n⚠️  Some patterns failed to migrate. Check the errors above."));
    process.exit(1);
  }
}
