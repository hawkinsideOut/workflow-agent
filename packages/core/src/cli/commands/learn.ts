import chalk from "chalk";
import * as p from "@clack/prompts";
import * as fs from "node:fs";
import * as path from "node:path";
import {
  PatternStore,
  ContributorManager,
  PatternAnonymizer,
  TelemetryCollector,
  type FixPattern,
  type Blueprint,
  type PatternTag,
} from "@hawkinside_out/workflow-improvement-tracker";
import {
  RegistryClient,
  RateLimitedException,
  RegistryError,
} from "../../sync/index.js";

// ============================================
// Types
// ============================================

interface LearnRecordOptions {
  name?: string;
  description?: string;
  category?: string;
  framework?: string;
  version?: string;
  tags?: string;
  type?: "fix" | "blueprint";
}

interface LearnApplyOptions {
  framework?: string;
  version?: string;
  dryRun?: boolean;
}

interface LearnListOptions {
  type?: "fix" | "blueprint" | "all";
  framework?: string;
  tag?: string;
  deprecated?: boolean;
}

interface LearnSyncOptions {
  push?: boolean;
  pull?: boolean;
  dryRun?: boolean;
}

interface LearnConfigOptions {
  enableSync?: boolean;
  disableSync?: boolean;
  enableTelemetry?: boolean;
  disableTelemetry?: boolean;
  resetId?: boolean;
  show?: boolean;
}

// ============================================
// Helper Functions
// ============================================

function getWorkspacePath(): string {
  return process.cwd();
}

function formatDate(isoString: string): string {
  return new Date(isoString).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function formatTags(tags: PatternTag[]): string {
  return tags.map((t) => `${t.category}:${t.name}`).join(", ");
}

// ============================================
// learn:record Command
// ============================================

/**
 * Record a new pattern from a successful implementation
 */
export async function learnRecordCommand(options: LearnRecordOptions) {
  const cwd = getWorkspacePath();
  const store = new PatternStore(cwd);

  console.log(chalk.cyan("\n📚 Record a Learning Pattern\n"));

  // Get pattern type
  let patternType = options.type;
  if (!patternType) {
    const typeChoice = await p.select({
      message: "What type of pattern are you recording?",
      options: [
        {
          value: "fix",
          label: "🔧 Fix Pattern - A specific solution to a problem",
        },
        {
          value: "blueprint",
          label: "📐 Blueprint - A project structure template",
        },
      ],
    });

    if (p.isCancel(typeChoice)) {
      p.cancel("Recording cancelled");
      process.exit(0);
    }
    patternType = typeChoice as "fix" | "blueprint";
  }

  // Get pattern name
  let name = options.name;
  if (!name) {
    const nameInput = await p.text({
      message: "Pattern name:",
      placeholder: "e.g., Next.js App Router Migration",
      validate: (value) => {
        if (!value || value.length < 3)
          return "Name must be at least 3 characters";
        if (value.length > 100) return "Name must be less than 100 characters";
        return undefined;
      },
    });

    if (p.isCancel(nameInput)) {
      p.cancel("Recording cancelled");
      process.exit(0);
    }
    name = nameInput as string;
  }

  // Get description
  let description = options.description;
  if (!description) {
    const descInput = await p.text({
      message: "Description:",
      placeholder: "What does this pattern solve?",
      validate: (value) => {
        if (!value || value.length < 10)
          return "Description must be at least 10 characters";
        if (value.length > 500)
          return "Description must be less than 500 characters";
        return undefined;
      },
    });

    if (p.isCancel(descInput)) {
      p.cancel("Recording cancelled");
      process.exit(0);
    }
    description = descInput as string;
  }

  // Get framework
  let framework = options.framework;
  if (!framework) {
    const fwInput = await p.text({
      message: "Framework:",
      placeholder: "e.g., next, react, vue, express",
    });

    if (p.isCancel(fwInput)) {
      p.cancel("Recording cancelled");
      process.exit(0);
    }
    framework = fwInput as string;
  }

  // Get version
  let version = options.version;
  if (!version) {
    const versionInput = await p.text({
      message: "Framework version (semver range):",
      placeholder: "e.g., >=14.0.0, ^18.0.0",
      initialValue: ">=1.0.0",
    });

    if (p.isCancel(versionInput)) {
      p.cancel("Recording cancelled");
      process.exit(0);
    }
    version = versionInput as string;
  }

  // Get category for fix patterns
  let category = options.category;
  if (patternType === "fix" && !category) {
    const catChoice = await p.select({
      message: "Category:",
      options: [
        { value: "migration", label: "🔄 Migration" },
        { value: "security", label: "🔒 Security" },
        { value: "performance", label: "⚡ Performance" },
        { value: "compatibility", label: "🔗 Compatibility" },
        { value: "deprecation", label: "⚠️ Deprecation" },
        { value: "configuration", label: "⚙️ Configuration" },
        { value: "best-practice", label: "✨ Best Practice" },
        { value: "error-handling", label: "🚨 Error Handling" },
        { value: "testing", label: "🧪 Testing" },
        { value: "other", label: "📦 Other" },
      ],
    });

    if (p.isCancel(catChoice)) {
      p.cancel("Recording cancelled");
      process.exit(0);
    }
    category = catChoice as string;
  }

  // Parse tags
  const tags: PatternTag[] = [];
  if (options.tags) {
    const tagPairs = options.tags.split(",").map((t) => t.trim());
    for (const pair of tagPairs) {
      const [cat, val] = pair.split(":");
      if (cat && val) {
        tags.push({
          category: cat as PatternTag["category"],
          name: val,
        });
      }
    }
  }

  // Add framework tag
  tags.push({ category: "framework", name: framework });

  if (patternType === "fix") {
    // Create fix pattern
    const now = new Date().toISOString();
    const fixPattern: FixPattern = {
      id: crypto.randomUUID(),
      name,
      description,
      category: category as FixPattern["category"],
      tags,
      trigger: {
        errorPattern: ".*",
        errorMessage: "Generic error pattern",
        filePattern: "**/*",
      },
      solution: {
        type: "command",
        steps: [
          {
            order: 1,
            action: "run",
            target: "npm run fix",
            description: "Follow the pattern instructions",
          },
        ],
      },
      compatibility: {
        framework,
        frameworkVersion: version,
        runtime: "node",
        runtimeVersion: ">=18.0.0",
        dependencies: [],
      },
      metrics: {
        applications: 0,
        successes: 0,
        failures: 0,
        successRate: 0,
      },
      source: "manual",
      isPrivate: true,
      createdAt: now,
      updatedAt: now,
    };

    const result = await store.saveFixPattern(fixPattern);

    if (result.success) {
      console.log(chalk.green("\n✅ Fix pattern recorded successfully!\n"));
      console.log(chalk.dim(`  ID: ${fixPattern.id}`));
      console.log(chalk.dim(`  Name: ${name}`));
      console.log(chalk.dim(`  Category: ${category}`));
      console.log(chalk.dim(`  Framework: ${framework} ${version}`));
    } else {
      console.log(chalk.red("\n❌ Failed to record pattern"));
      console.log(chalk.dim(`  Error: ${result.error}`));
      process.exit(1);
    }
  } else {
    // Create blueprint
    const now = new Date().toISOString();
    const blueprint: Blueprint = {
      id: crypto.randomUUID(),
      name,
      description,
      tags,
      stack: {
        framework,
        language: "typescript",
        runtime: "node",
        packageManager: "pnpm",
        dependencies: [],
        devDependencies: [],
      },
      structure: {
        directories: [],
        keyFiles: [],
      },
      setup: {
        prerequisites: [],
        steps: [],
        configs: [],
      },
      compatibility: {
        framework,
        frameworkVersion: version,
        runtime: "node",
        runtimeVersion: ">=18.0.0",
        dependencies: [],
      },
      metrics: {
        applications: 0,
        successes: 0,
        failures: 0,
        successRate: 0,
      },
      relatedPatterns: [],
      isPrivate: true,
      createdAt: now,
      updatedAt: now,
    };

    const result = await store.saveBlueprint(blueprint);

    if (result.success) {
      console.log(chalk.green("\n✅ Blueprint recorded successfully!\n"));
      console.log(chalk.dim(`  ID: ${blueprint.id}`));
      console.log(chalk.dim(`  Name: ${name}`));
      console.log(chalk.dim(`  Framework: ${framework} ${version}`));
    } else {
      console.log(chalk.red("\n❌ Failed to record blueprint"));
      console.log(chalk.dim(`  Error: ${result.error}`));
      process.exit(1);
    }
  }
}

// ============================================
// learn:list Command
// ============================================

/**
 * List recorded patterns
 */
export async function learnListCommand(options: LearnListOptions) {
  const cwd = getWorkspacePath();
  const store = new PatternStore(cwd);
  const patternType = options.type ?? "all";
  const showDeprecated = options.deprecated ?? false;

  console.log(chalk.cyan("\n📚 Recorded Learning Patterns\n"));

  // List fix patterns
  if (patternType === "all" || patternType === "fix") {
    const fixResult = await store.listFixPatterns({
      tags: options.tag
        ? [{ category: "framework", name: options.tag }]
        : undefined,
      framework: options.framework,
      includeDeprecated: showDeprecated,
    });

    if (fixResult.success && fixResult.data && fixResult.data.length > 0) {
      console.log(chalk.bold.yellow("🔧 Fix Patterns:\n"));

      for (const pattern of fixResult.data) {
        const isDeprecated = pattern.deprecatedAt !== undefined;
        const statusIcon = isDeprecated ? "⚠️" : "✓";
        const nameColor = isDeprecated ? chalk.dim : chalk.white;

        console.log(`  ${statusIcon} ${nameColor(pattern.name)}`);
        console.log(chalk.dim(`     ID: ${pattern.id}`));
        console.log(chalk.dim(`     Category: ${pattern.category}`));
        console.log(
          chalk.dim(`     Created: ${formatDate(pattern.createdAt)}`),
        );
        console.log(
          chalk.dim(
            `     Success Rate: ${(pattern.metrics.successRate * 100).toFixed(0)}% (${pattern.metrics.successes}/${pattern.metrics.applications})`,
          ),
        );
        if (pattern.tags.length > 0) {
          console.log(chalk.dim(`     Tags: ${formatTags(pattern.tags)}`));
        }
        console.log("");
      }
    } else if (patternType === "fix") {
      console.log(chalk.dim("  No fix patterns found.\n"));
    }
  }

  // List blueprints
  if (patternType === "all" || patternType === "blueprint") {
    const bpResult = await store.listBlueprints({
      tags: options.tag
        ? [{ category: "framework", name: options.tag }]
        : undefined,
      framework: options.framework,
      includeDeprecated: showDeprecated,
    });

    if (bpResult.success && bpResult.data && bpResult.data.length > 0) {
      console.log(chalk.bold.blue("📐 Blueprints:\n"));

      for (const blueprint of bpResult.data) {
        const isDeprecated = blueprint.deprecatedAt !== undefined;
        const statusIcon = isDeprecated ? "⚠️" : "✓";
        const nameColor = isDeprecated ? chalk.dim : chalk.white;

        console.log(`  ${statusIcon} ${nameColor(blueprint.name)}`);
        console.log(chalk.dim(`     ID: ${blueprint.id}`));
        console.log(chalk.dim(`     Language: ${blueprint.stack.language}`));
        console.log(
          chalk.dim(`     Created: ${formatDate(blueprint.createdAt)}`),
        );
        console.log(
          chalk.dim(
            `     Success Rate: ${(blueprint.metrics.successRate * 100).toFixed(0)}% (${blueprint.metrics.successes}/${blueprint.metrics.applications})`,
          ),
        );
        if (blueprint.tags.length > 0) {
          console.log(chalk.dim(`     Tags: ${formatTags(blueprint.tags)}`));
        }
        console.log("");
      }
    } else if (patternType === "blueprint") {
      console.log(chalk.dim("  No blueprints found.\n"));
    }
  }

  // Show stats
  const stats = await store.getStats();
  const totalPatterns = stats.totalFixes + stats.totalBlueprints;
  const totalDeprecated = stats.deprecatedFixes + stats.deprecatedBlueprints;

  console.log(chalk.dim("━".repeat(40)));
  console.log(chalk.dim(`Total: ${totalPatterns} patterns`));
  console.log(chalk.dim(`  Fix Patterns: ${stats.totalFixes}`));
  console.log(chalk.dim(`  Blueprints: ${stats.totalBlueprints}`));
  console.log(chalk.dim(`  Deprecated: ${totalDeprecated}`));
  console.log("");
}

// ============================================
// learn:apply Command
// ============================================

/**
 * Apply a pattern to current project
 */
export async function learnApplyCommand(
  patternId: string,
  options: LearnApplyOptions,
) {
  const cwd = getWorkspacePath();
  const store = new PatternStore(cwd);
  const telemetry = new TelemetryCollector(cwd);

  console.log(chalk.cyan("\n🔧 Apply Learning Pattern\n"));

  // Try to find the pattern
  let pattern = await store.getFixPattern(patternId);
  let patternType: "fix" | "blueprint" = "fix";

  if (!pattern.success || !pattern.data) {
    // Try as blueprint
    const bpResult = await store.getBlueprint(patternId);
    if (bpResult.success && bpResult.data) {
      pattern = bpResult as typeof pattern;
      patternType = "blueprint";
    } else {
      console.log(chalk.red(`\n❌ Pattern not found: ${patternId}`));
      console.log(
        chalk.dim("  Use 'workflow learn:list' to see available patterns"),
      );
      process.exit(1);
    }
  }

  const patternData = pattern.data!;
  console.log(chalk.white(`  Pattern: ${patternData.name}`));
  console.log(chalk.dim(`  Type: ${patternType}`));
  console.log(chalk.dim(`  Description: ${patternData.description}`));

  if (options.dryRun) {
    console.log(
      chalk.yellow("\n📋 DRY-RUN MODE: No changes will be applied\n"),
    );
  }

  // Record telemetry for application attempt
  const framework =
    options.framework ??
    patternData.compatibility.frameworks[0]?.name ??
    "unknown";
  const version =
    options.version ??
    patternData.compatibility.frameworks[0]?.version ??
    "0.0.0";

  await telemetry.recordApplication(patternId, patternType, framework, version);

  // For now, just show the pattern details
  // In future, this could apply automated changes
  if (patternType === "fix") {
    const fixPattern = patternData as FixPattern;
    console.log(chalk.cyan("\n📋 Solution Steps:\n"));

    if (fixPattern.solution.steps) {
      for (let i = 0; i < fixPattern.solution.steps.length; i++) {
        const step = fixPattern.solution.steps[i];
        console.log(
          chalk.white(`  ${i + 1}. [${step.action}] ${step.description}`),
        );
        if (step.file) {
          console.log(chalk.dim(`     File: ${step.file}`));
        }
      }
    }
  } else {
    const blueprint = patternData as Blueprint;
    console.log(chalk.cyan("\n📋 Setup Steps:\n"));

    if (blueprint.setup.steps) {
      for (let i = 0; i < blueprint.setup.steps.length; i++) {
        const step = blueprint.setup.steps[i];
        console.log(chalk.white(`  ${i + 1}. ${step.description}`));
        if (step.command) {
          console.log(chalk.dim(`     Command: ${step.command}`));
        }
      }
    }
  }

  // Confirm application
  if (!options.dryRun) {
    const confirmed = await p.confirm({
      message: "Mark this pattern as successfully applied?",
      initialValue: true,
    });

    if (p.isCancel(confirmed)) {
      p.cancel("Application cancelled");
      process.exit(0);
    }

    if (confirmed) {
      // Update metrics
      await store.updatePatternMetrics(patternId, patternType, true);
      await telemetry.recordSuccess(patternId, patternType, framework, version);
      console.log(chalk.green("\n✅ Pattern marked as successfully applied!"));
    } else {
      // Record failure
      await store.updatePatternMetrics(patternId, patternType, false);
      await telemetry.recordFailure(
        patternId,
        patternType,
        framework,
        version,
        "unknown",
      );
      console.log(
        chalk.yellow("\n⚠️ Pattern application marked as unsuccessful."),
      );
    }
  }
}

// ============================================
// learn:sync Command
// ============================================

/**
 * Sync patterns with remote registry
 */
export async function learnSyncCommand(options: LearnSyncOptions) {
  const cwd = getWorkspacePath();
  const contributorManager = new ContributorManager(cwd);

  console.log(chalk.cyan("\n🔄 Sync Learning Patterns\n"));

  // Check if sync is enabled
  const config = await contributorManager.getConfig();
  if (!config.success || !config.data?.syncOptIn) {
    console.log(chalk.yellow("⚠️ Sync is not enabled.\n"));
    console.log(chalk.dim("  To enable sync, run:"));
    console.log(chalk.dim("    workflow learn:config --enable-sync\n"));
    console.log(
      chalk.dim(
        "  This allows you to share anonymized patterns with the community.",
      ),
    );
    process.exit(0);
  }

  if (options.dryRun) {
    console.log(chalk.yellow("📋 DRY-RUN MODE: No changes will be synced\n"));
  }

  const store = new PatternStore(cwd);
  const anonymizer = new PatternAnonymizer();

  // Get patterns to sync
  const { fixes, blueprints } = await store.getPatternsForSync();

  console.log(
    chalk.dim(
      `  Patterns ready to sync: ${fixes.length} fixes, ${blueprints.length} blueprints`,
    ),
  );

  if (options.push) {
    console.log(chalk.cyan("\n📤 Pushing patterns...\n"));

    // Anonymize patterns before sync
    const anonymizedPatterns: Array<{
      pattern: FixPattern | Blueprint;
      type: "fix" | "blueprint";
      originalId: string;
    }> = [];

    for (const fix of fixes) {
      const result = anonymizer.anonymizeFixPattern(fix);
      if (result.success && result.data) {
        anonymizedPatterns.push({
          pattern: result.data,
          type: "fix",
          originalId: fix.id,
        });
        console.log(chalk.dim(`  ✓ Anonymized: ${fix.name}`));
      }
    }

    for (const bp of blueprints) {
      const result = anonymizer.anonymizeBlueprint(bp);
      if (result.success && result.data) {
        anonymizedPatterns.push({
          pattern: result.data,
          type: "blueprint",
          originalId: bp.id,
        });
        console.log(chalk.dim(`  ✓ Anonymized: ${bp.name}`));
      }
    }

    const fixCount = anonymizedPatterns.filter((p) => p.type === "fix").length;
    const bpCount = anonymizedPatterns.filter((p) => p.type === "blueprint").length;

    if (anonymizedPatterns.length === 0) {
      console.log(chalk.yellow("\n⚠️ No patterns to push"));
      return;
    }

    console.log(
      chalk.dim(
        `\n  Ready to push ${fixCount} fixes and ${bpCount} blueprints`,
      ),
    );

    if (options.dryRun) {
      console.log(chalk.yellow("\n📋 DRY-RUN: Patterns would be pushed (no actual changes)"));
      return;
    }

    // Get contributor ID
    const contributorResult = await contributorManager.getOrCreateId();
    if (!contributorResult.success || !contributorResult.data) {
      console.log(chalk.red("\n❌ Failed to get contributor ID"));
      return;
    }

    // Push to registry
    const registryClient = new RegistryClient();

    try {
      console.log(chalk.dim("\n  Connecting to registry..."));

      const pushResult = await registryClient.push(
        anonymizedPatterns.map((p) => ({
          pattern: p.pattern,
          type: p.type,
        })),
        contributorResult.data,
      );

      // Mark pushed patterns as synced
      if (pushResult.pushed > 0) {
        const pushedFixIds = anonymizedPatterns
          .filter((p) => p.type === "fix")
          .map((p) => p.originalId);
        const pushedBpIds = anonymizedPatterns
          .filter((p) => p.type === "blueprint")
          .map((p) => p.originalId);

        if (pushedFixIds.length > 0) {
          await store.markAsSynced(pushedFixIds, "fix");
        }
        if (pushedBpIds.length > 0) {
          await store.markAsSynced(pushedBpIds, "blueprint");
        }
      }

      console.log(
        chalk.green(`\n✅ Successfully pushed ${pushResult.pushed} patterns to registry`),
      );

      if (pushResult.skipped > 0) {
        console.log(
          chalk.dim(`   (${pushResult.skipped} patterns already existed)`),
        );
      }

      if (pushResult.errors && pushResult.errors.length > 0) {
        console.log(chalk.yellow(`\n⚠️ Some patterns had errors:`));
        for (const err of pushResult.errors) {
          console.log(chalk.dim(`   - ${err}`));
        }
      }

      console.log(
        chalk.dim(
          `\n  Rate limit: ${pushResult.rateLimit.remaining} patterns remaining this hour`,
        ),
      );
    } catch (error) {
      if (error instanceof RateLimitedException) {
        console.log(chalk.red("\n❌ Rate limit exceeded"));
        console.log(
          chalk.dim(
            `   Try again in ${error.getTimeUntilReset()}`,
          ),
        );
      } else if (error instanceof RegistryError) {
        console.log(chalk.red(`\n❌ Registry error: ${error.message}`));
      } else {
        console.log(
          chalk.red(
            `\n❌ Failed to push: ${error instanceof Error ? error.message : String(error)}`,
          ),
        );
      }
      process.exit(1);
    }
  }

  if (options.pull) {
    console.log(chalk.cyan("\n📥 Pulling patterns from registry...\n"));

    if (options.dryRun) {
      console.log(chalk.yellow("📋 DRY-RUN: Would pull patterns (no actual changes)\n"));

      // Show what would be pulled
      const registryClient = new RegistryClient();
      try {
        const result = await registryClient.pull({ limit: 10 });
        console.log(chalk.dim(`  Registry has ${result.pagination.total} patterns available`));
        if (result.patterns.length > 0) {
          console.log(chalk.dim("\n  First 10 patterns:"));
          for (const p of result.patterns) {
            console.log(chalk.dim(`    - [${p.type}] ${(p.data as { name?: string }).name || p.id}`));
          }
          if (result.pagination.hasMore) {
            console.log(chalk.dim(`    ... and ${result.pagination.total - 10} more`));
          }
        }
      } catch (error) {
        console.log(
          chalk.red(
            `  Failed to connect: ${error instanceof Error ? error.message : String(error)}`,
          ),
        );
      }
      return;
    }

    // Pull patterns from registry
    const registryClient = new RegistryClient();

    try {
      console.log(chalk.dim("  Connecting to registry..."));

      let totalPulled = 0;
      let totalSkipped = 0;
      let offset = 0;
      const limit = 50;

      // Paginate through all patterns
      while (true) {
        const result = await registryClient.pull({ limit, offset });

        if (result.patterns.length === 0) {
          break;
        }

        for (const pattern of result.patterns) {
          // Check if pattern already exists locally
          let exists = false;
          if (pattern.type === "fix") {
            const existingResult = await store.getFixPattern(pattern.id);
            exists = existingResult.success && !!existingResult.data;
          } else if (pattern.type === "blueprint") {
            const existingResult = await store.getBlueprint(pattern.id);
            exists = existingResult.success && !!existingResult.data;
          }

          if (exists) {
            totalSkipped++;
            continue;
          }

          // Save pattern locally
          if (pattern.type === "fix") {
            const fixData = pattern.data as unknown as FixPattern;
            await store.saveFixPattern({
              ...fixData,
              id: pattern.id,
              source: "community",
              isPrivate: true, // Keep pulled patterns private by default
            });
            totalPulled++;
          } else if (pattern.type === "blueprint") {
            const bpData = pattern.data as unknown as Blueprint;
            await store.saveBlueprint({
              ...bpData,
              id: pattern.id,
              source: "community",
              isPrivate: true,
            });
            totalPulled++;
          }
        }

        if (!result.pagination.hasMore) {
          break;
        }

        offset += limit;
        console.log(chalk.dim(`  ... pulled ${offset} patterns so far`));
      }

      console.log(
        chalk.green(`\n✅ Pulled ${totalPulled} new patterns from registry`),
      );

      if (totalSkipped > 0) {
        console.log(chalk.dim(`   (${totalSkipped} patterns already existed locally)`));
      }
    } catch (error) {
      if (error instanceof RegistryError) {
        console.log(chalk.red(`\n❌ Registry error: ${error.message}`));
      } else {
        console.log(
          chalk.red(
            `\n❌ Failed to pull: ${error instanceof Error ? error.message : String(error)}`,
          ),
        );
      }
      process.exit(1);
    }
  }

  if (!options.push && !options.pull) {
    console.log(
      chalk.dim("  Specify --push to upload or --pull to download patterns.\n"),
    );
  }
}

// ============================================
// learn:config Command
// ============================================

/**
 * Configure learning settings
 */
export async function learnConfigCommand(options: LearnConfigOptions) {
  const cwd = getWorkspacePath();
  const contributorManager = new ContributorManager(cwd);

  console.log(chalk.cyan("\n⚙️ Learning Configuration\n"));

  if (options.enableSync) {
    const result = await contributorManager.enableSync();
    if (result.success) {
      console.log(chalk.green("✅ Sync enabled"));
      console.log(
        chalk.dim("  Your patterns will be anonymized before sharing."),
      );
    } else {
      console.log(chalk.red(`❌ Failed: ${result.error}`));
    }
    return;
  }

  if (options.disableSync) {
    const result = await contributorManager.disableSync();
    if (result.success) {
      console.log(chalk.green("✅ Sync disabled"));
    } else {
      console.log(chalk.red(`❌ Failed: ${result.error}`));
    }
    return;
  }

  if (options.enableTelemetry) {
    const result = await contributorManager.enableTelemetry();
    if (result.success) {
      console.log(chalk.green("✅ Telemetry enabled"));
      console.log(
        chalk.dim(
          "  Anonymous usage data helps improve pattern recommendations.",
        ),
      );
    } else {
      console.log(chalk.red(`❌ Failed: ${result.error}`));
    }
    return;
  }

  if (options.disableTelemetry) {
    const result = await contributorManager.disableTelemetry();
    if (result.success) {
      console.log(chalk.green("✅ Telemetry disabled"));
    } else {
      console.log(chalk.red(`❌ Failed: ${result.error}`));
    }
    return;
  }

  if (options.resetId) {
    const confirmed = await p.confirm({
      message:
        "Are you sure you want to reset your contributor ID? This cannot be undone.",
      initialValue: false,
    });

    if (p.isCancel(confirmed) || !confirmed) {
      p.cancel("Reset cancelled");
      return;
    }

    const result = await contributorManager.resetId();
    if (result.success) {
      console.log(chalk.green("✅ Contributor ID reset"));
      console.log(chalk.dim(`  New ID: ${result.data?.id}`));
    } else {
      console.log(chalk.red(`❌ Failed: ${result.error}`));
    }
    return;
  }

  // Default: show current config
  const config = await contributorManager.getConfig();
  if (config.success && config.data) {
    console.log(chalk.white("  Current Settings:\n"));
    console.log(chalk.dim(`  Contributor ID: ${config.data.id}`));
    console.log(chalk.dim(`  Created: ${formatDate(config.data.createdAt)}`));
    console.log(
      chalk.dim(`  Sync Enabled: ${config.data.syncOptIn ? "Yes" : "No"}`),
    );
    console.log(
      chalk.dim(
        `  Telemetry Enabled: ${config.data.telemetryEnabled ? "Yes" : "No"}`,
      ),
    );
    if (config.data.syncEnabledAt) {
      console.log(
        chalk.dim(
          `  Sync Enabled At: ${formatDate(config.data.syncEnabledAt)}`,
        ),
      );
    }
  } else {
    console.log(
      chalk.dim(
        "  No configuration found. Settings will be created on first use.\n",
      ),
    );
  }
}

// ============================================
// learn:publish Command
// ============================================

interface LearnPublishOptions {
  private?: boolean;
  all?: boolean;
  yes?: boolean;
}

/**
 * Mark patterns as public (syncable) or private
 */
export async function learnPublishCommand(
  patternId: string | undefined,
  options: LearnPublishOptions,
) {
  const cwd = getWorkspacePath();
  const store = new PatternStore(cwd);

  const makePrivate = options.private ?? false;
  const actionWord = makePrivate ? "private" : "public";
  const emoji = makePrivate ? "🔒" : "🌐";

  console.log(chalk.cyan(`\n${emoji} Mark Pattern(s) ${actionWord}\n`));

  // Handle --all flag
  if (options.all) {
    const fixesResult = await store.listFixPatterns({});
    const blueprintsResult = await store.listBlueprints({});

    const allFixes = fixesResult.success && fixesResult.data ? fixesResult.data : [];
    const allBlueprints = blueprintsResult.success && blueprintsResult.data ? blueprintsResult.data : [];

    const fixesToUpdate = allFixes.filter((p) => p.isPrivate !== makePrivate);
    const blueprintsToUpdate = allBlueprints.filter(
      (p) => p.isPrivate !== makePrivate,
    );

    const totalToUpdate = fixesToUpdate.length + blueprintsToUpdate.length;

    if (totalToUpdate === 0) {
      console.log(
        chalk.yellow(`  All patterns are already ${actionWord}. Nothing to do.`),
      );
      return;
    }

    console.log(
      chalk.white(
        `  Found ${totalToUpdate} pattern(s) to mark as ${actionWord}:`,
      ),
    );
    console.log(chalk.dim(`    Fix Patterns: ${fixesToUpdate.length}`));
    console.log(chalk.dim(`    Blueprints: ${blueprintsToUpdate.length}`));

    // Skip confirmation if --yes flag is passed
    if (!options.yes) {
      const confirmed = await p.confirm({
        message: `Mark all ${totalToUpdate} patterns as ${actionWord}?`,
        initialValue: false,
      });

      if (p.isCancel(confirmed) || !confirmed) {
        p.cancel("Cancelled");
        return;
      }
    }

    let successCount = 0;
    let failCount = 0;

    for (const pattern of fixesToUpdate) {
      const result = await store.saveFixPattern({
        ...pattern,
        isPrivate: makePrivate,
        updatedAt: new Date().toISOString(),
      });
      if (result.success) {
        successCount++;
      } else {
        failCount++;
      }
    }

    for (const blueprint of blueprintsToUpdate) {
      const result = await store.saveBlueprint({
        ...blueprint,
        isPrivate: makePrivate,
        updatedAt: new Date().toISOString(),
      });
      if (result.success) {
        successCount++;
      } else {
        failCount++;
      }
    }

    console.log(
      chalk.green(`\n✅ Updated ${successCount} pattern(s) to ${actionWord}`),
    );
    if (failCount > 0) {
      console.log(chalk.red(`❌ Failed to update ${failCount} pattern(s)`));
    }
    return;
  }

  // Single pattern mode - require patternId
  if (!patternId) {
    console.log(chalk.red("❌ Pattern ID is required"));
    console.log(
      chalk.dim("  Usage: workflow learn:publish <patternId> [--private]"),
    );
    console.log(
      chalk.dim("         workflow learn:publish --all [--private]"),
    );
    process.exit(1);
  }

  // Try to find the pattern
  let patternType: "fix" | "blueprint" = "fix";
  let pattern = await store.getFixPattern(patternId);

  if (!pattern.success || !pattern.data) {
    const bpResult = await store.getBlueprint(patternId);
    if (bpResult.success && bpResult.data) {
      pattern = bpResult as typeof pattern;
      patternType = "blueprint";
    } else {
      console.log(chalk.red(`\n❌ Pattern not found: ${patternId}`));
      console.log(
        chalk.dim("  Use 'workflow learn:list' to see available patterns"),
      );
      process.exit(1);
    }
  }

  const currentStatus = pattern.data!.isPrivate ? "private" : "public";

  if (pattern.data!.isPrivate === makePrivate) {
    console.log(
      chalk.yellow(`  Pattern is already ${actionWord}. Nothing to do.`),
    );
    console.log(chalk.dim(`  Name: ${pattern.data!.name}`));
    return;
  }

  console.log(chalk.white(`  Pattern: ${pattern.data!.name}`));
  console.log(chalk.dim(`  Type: ${patternType}`));
  console.log(chalk.dim(`  Current: ${currentStatus} → ${actionWord}`));

  // Skip confirmation if --yes flag is passed
  if (!options.yes) {
    const confirmed = await p.confirm({
      message: `Mark this pattern as ${actionWord}?`,
      initialValue: true,
    });

    if (p.isCancel(confirmed) || !confirmed) {
      p.cancel("Cancelled");
      return;
    }
  }

  const updatedPattern = {
    ...pattern.data!,
    isPrivate: makePrivate,
    updatedAt: new Date().toISOString(),
  };

  let result;
  if (patternType === "fix") {
    result = await store.saveFixPattern(updatedPattern as FixPattern);
  } else {
    result = await store.saveBlueprint(updatedPattern as Blueprint);
  }

  if (result.success) {
    console.log(chalk.green(`\n✅ Pattern marked as ${actionWord}`));
    if (!makePrivate) {
      console.log(
        chalk.dim("  Run 'workflow learn:sync --push' to upload to registry"),
      );
    }
  } else {
    console.log(chalk.red(`\n❌ Failed: ${result.error}`));
    process.exit(1);
  }
}

// ============================================
// learn:deprecate Command
// ============================================

/**
 * Deprecate an old or outdated pattern
 */
export async function learnDeprecateCommand(patternId: string, reason: string) {
  const cwd = getWorkspacePath();
  const store = new PatternStore(cwd);

  console.log(chalk.cyan("\n⚠️ Deprecate Pattern\n"));

  // Try to find the pattern
  let patternType: "fix" | "blueprint" = "fix";
  let pattern = await store.getFixPattern(patternId);

  if (!pattern.success || !pattern.data) {
    const bpResult = await store.getBlueprint(patternId);
    if (bpResult.success && bpResult.data) {
      pattern = bpResult as typeof pattern;
      patternType = "blueprint";
    } else {
      console.log(chalk.red(`\n❌ Pattern not found: ${patternId}`));
      process.exit(1);
    }
  }

  console.log(chalk.white(`  Pattern: ${pattern.data!.name}`));
  console.log(chalk.dim(`  Reason: ${reason}`));

  const confirmed = await p.confirm({
    message: "Are you sure you want to deprecate this pattern?",
    initialValue: false,
  });

  if (p.isCancel(confirmed) || !confirmed) {
    p.cancel("Deprecation cancelled");
    return;
  }

  const result = await store.deprecatePattern(patternId, patternType, reason);

  if (result.success) {
    console.log(chalk.green("\n✅ Pattern deprecated successfully"));
  } else {
    console.log(chalk.red(`\n❌ Failed: ${result.error}`));
    process.exit(1);
  }
}

// ============================================
// learn:stats Command
// ============================================

/**
 * Show learning statistics
 */
export async function learnStatsCommand() {
  const cwd = getWorkspacePath();
  const store = new PatternStore(cwd);
  const telemetry = new TelemetryCollector(cwd);

  console.log(chalk.cyan("\n📊 Learning Statistics\n"));

  // Pattern stats
  const storeStats = await store.getStats();
  const totalPatterns = storeStats.totalFixes + storeStats.totalBlueprints;
  const totalDeprecated =
    storeStats.deprecatedFixes + storeStats.deprecatedBlueprints;

  console.log(chalk.bold.white("  Patterns:\n"));
  console.log(chalk.dim(`    Total: ${totalPatterns}`));
  console.log(chalk.dim(`    Fix Patterns: ${storeStats.totalFixes}`));
  console.log(chalk.dim(`    Blueprints: ${storeStats.totalBlueprints}`));
  console.log(chalk.dim(`    Deprecated: ${totalDeprecated}`));

  // Telemetry stats
  const telemetryStats = await telemetry.getStats();
  console.log(chalk.bold.white("\n  Telemetry:\n"));
  console.log(chalk.dim(`    Pending Events: ${telemetryStats.pendingEvents}`));
  console.log(
    chalk.dim(`    Total Events Sent: ${telemetryStats.totalEventsSent}`),
  );
  if (telemetryStats.lastFlushAt) {
    console.log(
      chalk.dim(`    Last Flush: ${formatDate(telemetryStats.lastFlushAt)}`),
    );
  }

  console.log("");
}
