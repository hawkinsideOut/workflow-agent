/**
 * Unified Sync Command
 *
 * Orchestrates syncing of patterns and solutions with the registry.
 * Combines functionality from learn:sync and solution sync.
 *
 * Usage:
 *   workflow sync                      # Interactive sync (prompts for direction)
 *   workflow sync --push               # Push local patterns to registry
 *   workflow sync --pull               # Pull patterns from registry
 *   workflow sync --solutions          # Include solution patterns
 *   workflow sync --learn              # Include learning patterns (default)
 *   workflow sync --scopes             # Sync custom scope packages
 *   workflow sync --all                # Sync everything
 *   workflow sync --dry-run            # Preview without syncing
 */

import * as p from "@clack/prompts";
import chalk from "chalk";
import {
  PatternStore,
  PatternAnonymizer,
  ContributorManager,
  type FixPattern,
  type Blueprint,
  type SolutionPattern,
} from "@hawkinside_out/workflow-improvement-tracker";
import {
  RegistryClient,
  RateLimitedException,
  RegistryError,
} from "../../sync/registry-client.js";

export interface UnifiedSyncOptions {
  push?: boolean;
  pull?: boolean;
  solutions?: boolean;
  learn?: boolean;
  scopes?: boolean;
  all?: boolean;
  dryRun?: boolean;
  enableSync?: boolean;
  disableSync?: boolean;
  includePrivate?: boolean;
}

function getWorkspacePath(): string {
  return process.cwd();
}

/**
 * Unified sync command that orchestrates all sync operations
 */
export async function syncCommand(options: UnifiedSyncOptions): Promise<void> {
  const cwd = getWorkspacePath();
  const contributorManager = new ContributorManager(cwd);

  p.intro(chalk.bgBlue(" workflow sync "));

  // Handle --enable-sync option
  if (options.enableSync) {
    const enableResult = await contributorManager.enableSync();
    if (enableResult.success) {
      console.log(chalk.green("\n✅ Sync enabled!"));
      console.log(chalk.dim("  Your anonymized patterns can now be shared with the community.\n"));
    } else {
      console.log(chalk.red(`\n❌ Failed to enable sync: ${enableResult.error}\n`));
      process.exit(1);
    }
    // If only --enable-sync was passed, exit after enabling
    if (!options.push && !options.pull && !options.all && !options.solutions && !options.scopes) {
      p.outro(chalk.green("Sync enabled"));
      return;
    }
  }

  // Handle --disable-sync option
  if (options.disableSync) {
    const disableResult = await contributorManager.disableSync();
    if (disableResult.success) {
      console.log(chalk.green("\n✅ Sync disabled!"));
      console.log(chalk.dim("  Your patterns will no longer be shared.\n"));
    } else {
      console.log(chalk.red(`\n❌ Failed to disable sync: ${disableResult.error}\n`));
      process.exit(1);
    }
    p.outro(chalk.green("Sync disabled"));
    return;
  }

  // Check if sync is enabled
  const config = await contributorManager.getConfig();
  if (!config.success || !config.data?.syncOptIn) {
    console.log(chalk.yellow("\n⚠️ Sync is not enabled.\n"));
    console.log(chalk.dim("  To enable sync, run:"));
    console.log(chalk.dim("    workflow learn config --enable-sync\n"));
    console.log(
      chalk.dim(
        "  This allows you to share anonymized patterns with the community.",
      ),
    );
    p.outro(chalk.yellow("Sync not enabled"));
    process.exit(0);
  }

  // Determine what to sync
  const syncLearn = options.learn || options.all || (!options.solutions && !options.scopes);
  const syncSolutions = options.solutions || options.all;
  const syncScopes = options.scopes || options.all;

  // Determine direction
  let direction: "push" | "pull" | "both" = "both";
  if (options.push && !options.pull) {
    direction = "push";
  } else if (options.pull && !options.push) {
    direction = "pull";
  } else if (!options.push && !options.pull) {
    // Interactive mode - ask user
    const choice = await p.select({
      message: "Sync direction:",
      options: [
        { value: "push", label: "📤 Push - Upload local patterns to registry" },
        { value: "pull", label: "📥 Pull - Download patterns from registry" },
        { value: "both", label: "🔄 Both - Push then pull" },
      ],
    });

    if (p.isCancel(choice)) {
      p.cancel("Sync cancelled");
      process.exit(0);
    }
    direction = choice as "push" | "pull" | "both";
  }

  if (options.dryRun) {
    console.log(chalk.yellow("\n📋 DRY-RUN MODE: No changes will be synced\n"));
  }

  // Show what will be synced
  console.log(chalk.cyan("\n📦 Syncing:"));
  if (syncLearn) console.log(chalk.dim("  • Learning patterns (fixes, blueprints)"));
  if (syncSolutions) console.log(chalk.dim("  • Solution patterns"));
  if (syncScopes) console.log(chalk.dim("  • Custom scopes"));
  console.log(chalk.dim(`  • Direction: ${direction === "both" ? "push + pull" : direction}`));
  if (options.includePrivate) console.log(chalk.dim("  • Including private patterns"));
  console.log("");

  const store = new PatternStore(cwd);
  const anonymizer = new PatternAnonymizer();

  // Get patterns to sync
  // If --include-private is set, get all patterns; otherwise filter to public only
  const syncData = await store.getPatternsForSync();
  let fixes = syncData.fixes ?? [];
  let blueprints = syncData.blueprints ?? [];
  let solutions = syncData.solutions ?? [];

  // Get stats for all patterns to show why some might be excluded
  const stats = await store.getStats();
  const totalLocalFixes = stats.totalFixes;
  const totalLocalBlueprints = stats.totalBlueprints;
  const totalLocalSolutions = stats.totalSolutions;
  const privateFixes = stats.privateFixes;
  const privateBlueprints = stats.privateBlueprints;
  const privateSolutions = stats.privateSolutions;

  // If --include-private, we need to get all patterns including private ones
  if (options.includePrivate) {
    const allFixes = await store.listFixPatterns({ includeDeprecated: false });
    const allBlueprints = await store.listBlueprints({ includeDeprecated: false });
    const allSolutions = await store.listSolutions({ includeDeprecated: false });
    fixes = allFixes.data ?? [];
    blueprints = allBlueprints.data ?? [];
    solutions = allSolutions.data ?? [];
  }

  // Filter based on options
  const patternsToSync: Array<{
    pattern: FixPattern | Blueprint | SolutionPattern;
    type: "fix" | "blueprint" | "solution";
    originalId: string;
  }> = [];

  if (syncLearn) {
    const publicCount = fixes.length;
    const privateCount = privateFixes;
    
    if (options.includePrivate) {
      console.log(chalk.dim(`  Found ${publicCount} fixes, ${blueprints.length} blueprints to sync (including private)`));
    } else if (publicCount === 0 && privateCount > 0) {
      console.log(chalk.yellow(`  Found 0 fixes ready to sync (${privateCount} are private)`));
      console.log(chalk.dim(`    Use --include-private to include them, or run 'workflow learn migrate --public'`));
    } else {
      console.log(chalk.dim(`  Found ${publicCount} fixes, ${blueprints.length} blueprints ready to sync`));
    }

    for (const fix of fixes) {
      const result = anonymizer.anonymizeFixPattern(fix);
      if (result.success && result.data) {
        patternsToSync.push({
          pattern: result.data,
          type: "fix",
          originalId: fix.id,
        });
      }
    }

    for (const bp of blueprints) {
      const result = anonymizer.anonymizeBlueprint(bp);
      if (result.success && result.data) {
        patternsToSync.push({
          pattern: result.data,
          type: "blueprint",
          originalId: bp.id,
        });
      }
    }
  }

  if (syncSolutions) {
    const publicCount = solutions.length;
    const privateCount = privateSolutions;
    
    if (options.includePrivate) {
      console.log(chalk.dim(`  Found ${publicCount} solutions to sync (including private)`));
    } else if (publicCount === 0 && privateCount > 0 && !options.dryRun) {
      console.log(chalk.yellow(`  Found 0 solutions ready to sync (${privateCount} are private)`));
      
      // Prompt user to migrate solutions to public
      const shouldMigrate = await p.confirm({
        message: `Would you like to make your ${privateCount} solution(s) public for sync?`,
      });
      
      if (p.isCancel(shouldMigrate) || !shouldMigrate) {
        console.log(chalk.dim(`    Skipping private solutions. Use --include-private to force include them.`));
      } else {
        // Migrate all private solutions to public
        const allSolutions = await store.listSolutions({ includeDeprecated: false });
        for (const sol of allSolutions.data ?? []) {
          if (sol.isPrivate) {
            await store.updateSolution(sol.id, { ...sol, isPrivate: false });
            solutions.push({ ...sol, isPrivate: false });
          }
        }
        console.log(chalk.green(`  ✓ Migrated ${privateCount} solutions to public`));
      }
    } else if (publicCount === 0 && privateCount > 0) {
      // Dry run mode - just show the message
      console.log(chalk.yellow(`  Found 0 solutions ready to sync (${privateCount} are private)`));
      console.log(chalk.dim(`    Use --include-private to include them, or run 'workflow solution migrate --public'`));
    } else {
      console.log(chalk.dim(`  Found ${publicCount} solutions ready to sync`));
    }

    for (const solution of solutions) {
      const result = anonymizer.anonymizeSolution(solution);
      if (result.success && result.data) {
        patternsToSync.push({
          pattern: result.data,
          type: "solution",
          originalId: solution.id,
        });
      }
    }
  }

  if (syncScopes) {
    // TODO: Implement scope sync when scope registry is available
    console.log(chalk.dim("  Scope sync: Coming soon"));
  }

  // PUSH operation
  if (direction === "push" || direction === "both") {
    console.log(chalk.cyan("\n📤 Pushing patterns...\n"));

    if (patternsToSync.length === 0) {
      console.log(chalk.yellow("  No patterns to push\n"));
    } else {
      const fixCount = patternsToSync.filter((p) => p.type === "fix").length;
      const bpCount = patternsToSync.filter((p) => p.type === "blueprint").length;
      const solutionCount = patternsToSync.filter((p) => p.type === "solution").length;

      console.log(
        chalk.dim(
          `  Ready to push: ${fixCount} fixes, ${bpCount} blueprints, ${solutionCount} solutions`,
        ),
      );

      if (options.dryRun) {
        console.log(chalk.yellow("\n  [DRY-RUN] Would push patterns to registry"));
      } else {
        // Get contributor ID
        const contributorResult = await contributorManager.getOrCreateId();
        if (!contributorResult.success || !contributorResult.data) {
          console.log(chalk.red("\n  ❌ Failed to get contributor ID"));
          process.exit(1);
        }

        // Push to registry
        const registryClient = new RegistryClient();

        try {
          console.log(chalk.dim("\n  Connecting to registry..."));

          const pushResult = await registryClient.push(
            patternsToSync.map((p) => ({
              pattern: p.pattern,
              type: p.type,
            })),
            contributorResult.data,
          );

          // Mark pushed patterns as synced
          if (pushResult.pushed > 0) {
            const pushedFixIds = patternsToSync
              .filter((p) => p.type === "fix")
              .map((p) => p.originalId);
            const pushedBpIds = patternsToSync
              .filter((p) => p.type === "blueprint")
              .map((p) => p.originalId);
            const pushedSolutionIds = patternsToSync
              .filter((p) => p.type === "solution")
              .map((p) => p.originalId);

            if (pushedFixIds.length > 0) {
              await store.markAsSynced(pushedFixIds, "fix");
            }
            if (pushedBpIds.length > 0) {
              await store.markAsSynced(pushedBpIds, "blueprint");
            }
            if (pushedSolutionIds.length > 0) {
              await store.markAsSynced(pushedSolutionIds, "solution");
            }
          }

          console.log(
            chalk.green(`\n  ✅ Pushed ${pushResult.pushed} patterns to registry`),
          );

          if (pushResult.skipped > 0) {
            console.log(
              chalk.dim(`     (${pushResult.skipped} already existed)`),
            );
          }

          if (pushResult.errors && pushResult.errors.length > 0) {
            console.log(chalk.yellow(`\n  ⚠️ Some patterns had errors:`));
            for (const err of pushResult.errors) {
              console.log(chalk.dim(`     - ${err}`));
            }
          }

          console.log(
            chalk.dim(
              `\n  Rate limit: ${pushResult.rateLimit.remaining} patterns remaining this hour`,
            ),
          );
        } catch (error) {
          if (error instanceof RateLimitedException) {
            console.log(chalk.red("\n  ❌ Rate limit exceeded"));
            console.log(
              chalk.dim(
                `     Try again in ${error.getTimeUntilReset()}`,
              ),
            );
          } else if (error instanceof RegistryError) {
            console.log(chalk.red(`\n  ❌ Registry error: ${error.message}`));
          } else {
            console.log(
              chalk.red(
                `\n  ❌ Failed to push: ${error instanceof Error ? error.message : String(error)}`,
              ),
            );
          }
          process.exit(1);
        }
      }
    }
  }

  // PULL operation
  if (direction === "pull" || direction === "both") {
    console.log(chalk.cyan("\n📥 Pulling patterns from registry...\n"));

    if (options.dryRun) {
      console.log(chalk.yellow("  [DRY-RUN] Would pull patterns from registry"));
    } else {
      const registryClient = new RegistryClient();

      try {
        console.log(chalk.dim("  Connecting to registry..."));

        // Pull patterns based on sync options - need to call separately for each type
        const pullTypes: ("fix" | "blueprint" | "solution")[] = [];
        if (syncLearn) {
          pullTypes.push("fix", "blueprint");
        }
        if (syncSolutions) {
          pullTypes.push("solution");
        }

        let totalPatterns = 0;
        let savedCount = 0;
        const typeCounts: Record<string, number> = {};

        for (const pullType of pullTypes) {
          const pullResult = await registryClient.pull({
            type: pullType,
          });

          typeCounts[pullType] = pullResult.patterns.length;
          totalPatterns += pullResult.patterns.length;

          for (const pulled of pullResult.patterns) {
            try {
              if (pulled.type === "fix" && pulled.data) {
                await store.saveFixPattern(pulled.data as FixPattern);
                savedCount++;
              } else if (pulled.type === "blueprint" && pulled.data) {
                await store.saveBlueprint(pulled.data as Blueprint);
                savedCount++;
              } else if (pulled.type === "solution" && pulled.data) {
                await store.saveSolution(pulled.data as SolutionPattern);
                savedCount++;
              }
            } catch {
              // Pattern might already exist
            }
          }
        }

        // Show registry stats
        if (syncSolutions && typeCounts["solution"] !== undefined) {
          console.log(chalk.dim(`  Registry has ${typeCounts["solution"]} solution(s) available`));
        }
        if (syncLearn) {
          const fixCount = typeCounts["fix"] ?? 0;
          const bpCount = typeCounts["blueprint"] ?? 0;
          console.log(chalk.dim(`  Registry has ${fixCount} fix(es), ${bpCount} blueprint(s) available`));
        }

        if (totalPatterns === 0) {
          console.log(chalk.dim("  No new patterns to pull"));
        } else {
          console.log(
            chalk.green(`\n  ✅ Pulled ${savedCount} new patterns from registry`),
          );
          if (savedCount < totalPatterns) {
            console.log(chalk.dim(`     (${totalPatterns - savedCount} already existed locally)`));
          }
        }
      } catch (error) {
        if (error instanceof RateLimitedException) {
          console.log(chalk.red("\n  ❌ Rate limit exceeded"));
          console.log(
            chalk.dim(
              `     Try again in ${error.getTimeUntilReset()}`,
            ),
          );
        } else if (error instanceof RegistryError) {
          console.log(chalk.red(`\n  ❌ Registry error: ${error.message}`));
        } else {
          console.log(
            chalk.red(
              `\n  ❌ Failed to pull: ${error instanceof Error ? error.message : String(error)}`,
            ),
          );
        }
        process.exit(1);
      }
    }
  }

  p.outro(chalk.green("Sync complete!"));
}
