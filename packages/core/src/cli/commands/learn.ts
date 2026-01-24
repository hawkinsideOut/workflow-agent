import chalk from "chalk";
import * as p from "@clack/prompts";
import * as fs from "node:fs";
import * as path from "node:path";
import {
  PatternStore,
  ContributorManager,
  PatternAnonymizer,
  TelemetryCollector,
  FixPatternSchema,
  BlueprintSchema,
  SolutionPatternSchema,
  createDefaultMetrics,
  type FixPattern,
  type Blueprint,
  type SolutionPattern,
  type PatternTag,
  type Language,
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

interface LearnValidateOptions {
  type?: "fix" | "blueprint" | "solution" | "all";
  fix?: boolean;
  verbose?: boolean;
  file?: string;
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
  await store.initialize();

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
        { value: "lint", label: "🔧 Lint Error" },
        { value: "type-error", label: "🔷 Type Error" },
        { value: "dependency", label: "📦 Dependency" },
        { value: "config", label: "⚙️ Configuration" },
        { value: "runtime", label: "🏃 Runtime" },
        { value: "build", label: "🏗️ Build" },
        { value: "test", label: "🧪 Test" },
        { value: "security", label: "🔒 Security" },
        { value: "migration", label: "🔄 Migration" },
        { value: "deprecation", label: "⚠️ Deprecation" },
        { value: "performance", label: "⚡ Performance" },
        { value: "compatibility", label: "🔗 Compatibility" },
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
      console.log(
        chalk.dim(`  Path: .workflow/patterns/blueprints/${blueprint.id}.json`),
      );
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
  await store.initialize();
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
  const totalInvalid =
    stats.invalidFixes + stats.invalidBlueprints + stats.invalidSolutions;

  console.log(chalk.dim("━".repeat(40)));
  console.log(chalk.dim(`Total: ${totalPatterns} patterns`));
  console.log(chalk.dim(`  Fix Patterns: ${stats.totalFixes}`));
  console.log(chalk.dim(`  Blueprints: ${stats.totalBlueprints}`));
  console.log(chalk.dim(`  Deprecated: ${totalDeprecated}`));

  // Show validation warnings if any patterns failed to load
  if (totalInvalid > 0) {
    console.log(
      chalk.yellow(
        `\n⚠️  ${totalInvalid} pattern(s) failed schema validation and were skipped:`,
      ),
    );
    console.log(chalk.dim(`     Fix patterns: ${stats.invalidFixes} invalid`));
    console.log(
      chalk.dim(`     Blueprints: ${stats.invalidBlueprints} invalid`),
    );
    console.log(chalk.dim(`     Solutions: ${stats.invalidSolutions} invalid`));

    // Show detailed validation errors
    const validationErrors = store.getValidationErrors();
    if (validationErrors.length > 0) {
      console.log(chalk.yellow("\n   Validation errors:"));
      for (const err of validationErrors.slice(0, 5)) {
        console.log(chalk.dim(`     • ${err.file}: ${err.error}`));
        if (err.details && err.details.length > 0) {
          for (const detail of err.details.slice(0, 3)) {
            console.log(chalk.dim(`       - ${detail}`));
          }
          if (err.details.length > 3) {
            console.log(
              chalk.dim(`       ... and ${err.details.length - 3} more`),
            );
          }
        }
      }
      if (validationErrors.length > 5) {
        console.log(
          chalk.dim(`     ... and ${validationErrors.length - 5} more errors`),
        );
      }
    }

    console.log(
      chalk.dim(
        "\n   Tip: Invalid patterns may be missing required fields. Use the PatternStore API",
      ),
    );
    console.log(
      chalk.dim(
        "        to create patterns instead of writing JSON files directly.",
      ),
    );
  }
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
  await store.initialize();
  const telemetry = new TelemetryCollector(cwd);

  console.log(chalk.cyan("\n🔧 Apply Learning Pattern\n"));

  // Try to find the pattern
  let fixPattern: FixPattern | undefined;
  let blueprintPattern: Blueprint | undefined;
  let patternType: "fix" | "blueprint" = "fix";

  const fixResult = await store.getFixPattern(patternId);
  if (fixResult.success && fixResult.data) {
    fixPattern = fixResult.data;
    patternType = "fix";
  } else {
    // Try as blueprint
    const bpResult = await store.getBlueprint(patternId);
    if (bpResult.success && bpResult.data) {
      blueprintPattern = bpResult.data;
      patternType = "blueprint";
    } else {
      console.log(chalk.red(`\n❌ Pattern not found: ${patternId}`));
      console.log(
        chalk.dim("  Use 'workflow learn:list' to see available patterns"),
      );
      process.exit(1);
    }
  }

  const patternData = (fixPattern ?? blueprintPattern)!;
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
    options.framework ?? patternData.compatibility?.framework ?? "unknown";
  const version =
    options.version ?? patternData.compatibility?.frameworkVersion ?? "0.0.0";

  await telemetry.recordApplication(patternId, patternType, framework, version);

  // For now, just show the pattern details
  // In future, this could apply automated changes
  if (patternType === "fix" && fixPattern) {
    console.log(chalk.cyan("\n📋 Solution Steps:\n"));

    if (fixPattern.solution.steps) {
      for (let i = 0; i < fixPattern.solution.steps.length; i++) {
        const step = fixPattern.solution.steps[i];
        console.log(
          chalk.white(`  ${i + 1}. [${step.action}] ${step.description}`),
        );
        if (step.target) {
          console.log(chalk.dim(`     Target: ${step.target}`));
        }
      }
    }
  } else if (blueprintPattern) {
    console.log(chalk.cyan("\n📋 Setup Steps:\n"));

    if (blueprintPattern.setup.steps) {
      for (let i = 0; i < blueprintPattern.setup.steps.length; i++) {
        const step = blueprintPattern.setup.steps[i];
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
  await store.initialize();
  const anonymizer = new PatternAnonymizer();

  // Get patterns to sync (with defaults in case of undefined)
  const syncData = await store.getPatternsForSync();
  const fixes = syncData.fixes ?? [];
  const blueprints = syncData.blueprints ?? [];
  const solutions = syncData.solutions ?? [];

  console.log(
    chalk.dim(
      `  Patterns ready to sync: ${fixes.length} fixes, ${blueprints.length} blueprints, ${solutions.length} solutions`,
    ),
  );

  if (options.push) {
    console.log(chalk.cyan("\n📤 Pushing patterns...\n"));

    // Anonymize patterns before sync
    const anonymizedPatterns: Array<{
      pattern: FixPattern | Blueprint | SolutionPattern;
      type: "fix" | "blueprint" | "solution";
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

    for (const solution of solutions) {
      const result = anonymizer.anonymizeSolution(solution);
      if (result.success && result.data) {
        anonymizedPatterns.push({
          pattern: result.data,
          type: "solution",
          originalId: solution.id,
        });
        console.log(chalk.dim(`  ✓ Anonymized: ${solution.name}`));
      }
    }

    const fixCount = anonymizedPatterns.filter((p) => p.type === "fix").length;
    const bpCount = anonymizedPatterns.filter(
      (p) => p.type === "blueprint",
    ).length;
    const solutionCount = anonymizedPatterns.filter(
      (p) => p.type === "solution",
    ).length;

    if (anonymizedPatterns.length === 0) {
      console.log(chalk.yellow("\n⚠️ No patterns to push"));
      return;
    }

    console.log(
      chalk.dim(
        `\n  Ready to push ${fixCount} fixes, ${bpCount} blueprints, and ${solutionCount} solutions`,
      ),
    );

    if (options.dryRun) {
      console.log(
        chalk.yellow(
          "\n📋 DRY-RUN: Patterns would be pushed (no actual changes)",
        ),
      );
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
        const pushedSolutionIds = anonymizedPatterns
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
        chalk.green(
          `\n✅ Successfully pushed ${pushResult.pushed} patterns to registry`,
        ),
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
        console.log(chalk.dim(`   Try again in ${error.getTimeUntilReset()}`));
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
      console.log(
        chalk.yellow("📋 DRY-RUN: Would pull patterns (no actual changes)\n"),
      );

      // Show what would be pulled
      const registryClient = new RegistryClient();
      try {
        const result = await registryClient.pull({ limit: 10 });
        console.log(
          chalk.dim(
            `  Registry has ${result.pagination.total} patterns available`,
          ),
        );
        if (result.patterns.length > 0) {
          console.log(chalk.dim("\n  First 10 patterns:"));
          for (const p of result.patterns) {
            console.log(
              chalk.dim(
                `    - [${p.type}] ${(p.data as { name?: string }).name || p.id}`,
              ),
            );
          }
          if (result.pagination.hasMore) {
            console.log(
              chalk.dim(`    ... and ${result.pagination.total - 10} more`),
            );
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
          } else if (pattern.type === "solution") {
            const existingResult = await store.getSolution(pattern.id);
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
              // Note: Blueprint doesn't have 'source' property
              isPrivate: true,
            });
            totalPulled++;
          } else if (pattern.type === "solution") {
            const solutionData = pattern.data as unknown as SolutionPattern;
            await store.saveSolution({
              ...solutionData,
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
        console.log(
          chalk.dim(`   (${totalSkipped} patterns already existed locally)`),
        );
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
  await store.initialize();

  const makePrivate = options.private ?? false;
  const actionWord = makePrivate ? "private" : "public";
  const emoji = makePrivate ? "🔒" : "🌐";

  console.log(chalk.cyan(`\n${emoji} Mark Pattern(s) ${actionWord}\n`));

  // Handle --all flag
  if (options.all) {
    const fixesResult = await store.listFixPatterns({});
    const blueprintsResult = await store.listBlueprints({});

    const allFixes =
      fixesResult.success && fixesResult.data ? fixesResult.data : [];
    const allBlueprints =
      blueprintsResult.success && blueprintsResult.data
        ? blueprintsResult.data
        : [];

    const fixesToUpdate = allFixes.filter((p) => p.isPrivate !== makePrivate);
    const blueprintsToUpdate = allBlueprints.filter(
      (p) => p.isPrivate !== makePrivate,
    );

    const totalToUpdate = fixesToUpdate.length + blueprintsToUpdate.length;

    if (totalToUpdate === 0) {
      console.log(
        chalk.yellow(
          `  All patterns are already ${actionWord}. Nothing to do.`,
        ),
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
    console.log(chalk.dim("         workflow learn:publish --all [--private]"));
    process.exit(1);
  }

  // Try to find the pattern
  let patternType: "fix" | "blueprint" = "fix";
  let fixPatternData: FixPattern | undefined;
  let blueprintData: Blueprint | undefined;

  const fixResult = await store.getFixPattern(patternId);

  if (fixResult.success && fixResult.data) {
    fixPatternData = fixResult.data;
    patternType = "fix";
  } else {
    const bpResult = await store.getBlueprint(patternId);
    if (bpResult.success && bpResult.data) {
      blueprintData = bpResult.data;
      patternType = "blueprint";
    } else {
      console.log(chalk.red(`\n❌ Pattern not found: ${patternId}`));
      console.log(
        chalk.dim("  Use 'workflow learn:list' to see available patterns"),
      );
      process.exit(1);
    }
  }

  const patternInfo = (fixPatternData ?? blueprintData)!;
  const currentStatus = patternInfo.isPrivate ? "private" : "public";

  if (patternInfo.isPrivate === makePrivate) {
    console.log(
      chalk.yellow(`  Pattern is already ${actionWord}. Nothing to do.`),
    );
    console.log(chalk.dim(`  Name: ${patternInfo.name}`));
    return;
  }

  console.log(chalk.white(`  Pattern: ${patternInfo.name}`));
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

  let result;
  if (patternType === "fix" && fixPatternData) {
    const updatedFix: FixPattern = {
      ...fixPatternData,
      isPrivate: makePrivate,
      updatedAt: new Date().toISOString(),
    };
    result = await store.saveFixPattern(updatedFix);
  } else if (blueprintData) {
    const updatedBlueprint: Blueprint = {
      ...blueprintData,
      isPrivate: makePrivate,
      updatedAt: new Date().toISOString(),
    };
    result = await store.saveBlueprint(updatedBlueprint);
  } else {
    console.log(chalk.red("\n❌ Unexpected error: pattern data not found"));
    process.exit(1);
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
  await store.initialize();

  console.log(chalk.cyan("\n⚠️ Deprecate Pattern\n"));

  // Try to find the pattern
  let patternType: "fix" | "blueprint" = "fix";
  let patternName: string;

  const fixResult = await store.getFixPattern(patternId);

  if (fixResult.success && fixResult.data) {
    patternType = "fix";
    patternName = fixResult.data.name;
  } else {
    const bpResult = await store.getBlueprint(patternId);
    if (bpResult.success && bpResult.data) {
      patternType = "blueprint";
      patternName = bpResult.data.name;
    } else {
      console.log(chalk.red(`\n❌ Pattern not found: ${patternId}`));
      process.exit(1);
    }
  }

  console.log(chalk.white(`  Pattern: ${patternName}`));
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
  await store.initialize();
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

// ============================================
// learn:validate Command
// ============================================

interface ValidationResult {
  file: string;
  type: "fix" | "blueprint" | "solution";
  valid: boolean;
  errors: string[];
  fixable: boolean;
  fixedData?: FixPattern | Blueprint | unknown;
}

/**
 * Validate pattern files and optionally fix them
 */
export async function learnValidateCommand(options: LearnValidateOptions) {
  const cwd = getWorkspacePath();
  const patternsPath = path.join(cwd, ".workflow", "patterns");
  const patternType = options.type ?? "all";
  const shouldFix = options.fix ?? false;
  const verbose = options.verbose ?? false;
  const specificFile = options.file;

  console.log(chalk.cyan("\n🔍 Validating Pattern Files\n"));

  const results: ValidationResult[] = [];

  // If a specific file is provided, validate only that file
  if (specificFile) {
    const fileResult = await validateSingleFile(specificFile, verbose);
    if (fileResult) {
      results.push(fileResult);
    }
  } else {
    // Validate fix patterns
    if (patternType === "all" || patternType === "fix") {
      const fixesPath = path.join(patternsPath, "fixes");
      const fixResults = await validatePatternDirectory(
        fixesPath,
        "fix",
        FixPatternSchema,
        verbose,
      );
      results.push(...fixResults);
    }

    // Validate blueprints
    if (patternType === "all" || patternType === "blueprint") {
      const blueprintsPath = path.join(patternsPath, "blueprints");
      const bpResults = await validatePatternDirectory(
        blueprintsPath,
        "blueprint",
        BlueprintSchema,
        verbose,
      );
      results.push(...bpResults);
    }

    // Validate solutions
    if (patternType === "all" || patternType === "solution") {
      const solutionsPath = path.join(patternsPath, "solutions");
      const solResults = await validatePatternDirectory(
        solutionsPath,
        "solution",
        SolutionPatternSchema,
        verbose,
      );
      results.push(...solResults);
    }
  }

  // Summary
  const valid = results.filter((r) => r.valid);
  const invalid = results.filter((r) => !r.valid);
  const fixable = invalid.filter((r) => r.fixable);

  console.log(chalk.dim("━".repeat(50)));
  console.log(chalk.bold(`\n📊 Validation Summary\n`));
  console.log(chalk.green(`  ✓ Valid: ${valid.length}`));
  if (invalid.length > 0) {
    console.log(chalk.red(`  ✗ Invalid: ${invalid.length}`));
    console.log(chalk.yellow(`  🔧 Auto-fixable: ${fixable.length}`));
  }

  // Show invalid patterns
  if (invalid.length > 0) {
    console.log(chalk.red(`\n❌ Invalid Patterns:\n`));
    for (const result of invalid) {
      console.log(chalk.white(`  ${result.file} (${result.type})`));
      for (const err of result.errors.slice(0, 5)) {
        console.log(chalk.dim(`    - ${err}`));
      }
      if (result.errors.length > 5) {
        console.log(chalk.dim(`    ... and ${result.errors.length - 5} more`));
      }
      if (result.fixable) {
        console.log(chalk.yellow(`    → Can be auto-fixed`));
      }
    }
  }

  // Auto-fix if requested
  if (shouldFix && fixable.length > 0) {
    console.log(chalk.cyan(`\n🔧 Auto-fixing ${fixable.length} patterns...\n`));

    let fixed = 0;
    for (const result of fixable) {
      if (result.fixedData) {
        const filePath = path.join(
          patternsPath,
          result.type === "fix"
            ? "fixes"
            : result.type === "blueprint"
              ? "blueprints"
              : "solutions",
          result.file,
        );

        try {
          await fs.promises.writeFile(
            filePath,
            JSON.stringify(result.fixedData, null, 2),
          );
          console.log(chalk.green(`  ✓ Fixed: ${result.file}`));
          fixed++;
        } catch (error) {
          console.log(
            chalk.red(
              `  ✗ Failed to fix: ${result.file} - ${error instanceof Error ? error.message : "Unknown error"}`,
            ),
          );
        }
      }
    }

    console.log(chalk.green(`\n✅ Fixed ${fixed}/${fixable.length} patterns`));
  } else if (fixable.length > 0 && !shouldFix) {
    console.log(
      chalk.yellow(
        `\n💡 Run with --fix to auto-fix ${fixable.length} patterns`,
      ),
    );
  }

  console.log("");

  // Exit with error code if there are unfixable invalid patterns
  const unfixable = invalid.filter((r) => !r.fixable);
  if (unfixable.length > 0 && !shouldFix) {
    process.exit(1);
  }
  if (invalid.length > 0 && !shouldFix) {
    process.exit(1);
  }
}

/**
 * Validate all JSON files in a pattern directory
 */
async function validatePatternDirectory(
  dirPath: string,
  type: "fix" | "blueprint" | "solution",
  schema:
    | typeof FixPatternSchema
    | typeof BlueprintSchema
    | typeof SolutionPatternSchema,
  verbose: boolean,
): Promise<ValidationResult[]> {
  const results: ValidationResult[] = [];

  try {
    const files = await fs.promises.readdir(dirPath);

    for (const file of files) {
      if (!file.endsWith(".json")) continue;

      const filePath = path.join(dirPath, file);
      const result = await validatePatternFile(
        filePath,
        file,
        type,
        schema,
        verbose,
      );
      results.push(result);

      if (verbose) {
        if (result.valid) {
          console.log(chalk.green(`  ✓ ${file}`));
        } else {
          console.log(chalk.red(`  ✗ ${file}`));
        }
      }
    }
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== "ENOENT") {
      console.log(
        chalk.yellow(`  ⚠ Could not read ${type} directory: ${dirPath}`),
      );
    }
  }

  return results;
}

/**
 * Validate a single file by its absolute path, auto-detecting type from path
 */
async function validateSingleFile(
  filePath: string,
  verbose: boolean,
): Promise<ValidationResult | null> {
  const fileName = path.basename(filePath);

  // Detect type from path
  let type: "fix" | "blueprint" | "solution";
  let schema:
    | typeof FixPatternSchema
    | typeof BlueprintSchema
    | typeof SolutionPatternSchema;

  if (filePath.includes("/fixes/") || filePath.includes("\\fixes\\")) {
    type = "fix";
    schema = FixPatternSchema;
  } else if (
    filePath.includes("/blueprints/") ||
    filePath.includes("\\blueprints\\")
  ) {
    type = "blueprint";
    schema = BlueprintSchema;
  } else if (
    filePath.includes("/solutions/") ||
    filePath.includes("\\solutions\\")
  ) {
    type = "solution";
    schema = SolutionPatternSchema;
  } else {
    // Try to detect from content
    try {
      const content = await fs.promises.readFile(filePath, "utf-8");
      const data = JSON.parse(content);

      // Heuristics to detect type
      if (data.trigger && data.solution) {
        type = "fix";
        schema = FixPatternSchema;
      } else if (data.stack && data.structure) {
        type = "blueprint";
        schema = BlueprintSchema;
      } else if (data.context && data.approach) {
        type = "solution";
        schema = SolutionPatternSchema;
      } else {
        // Default to blueprint as it's most common
        type = "blueprint";
        schema = BlueprintSchema;
      }
    } catch {
      // Default to blueprint
      type = "blueprint";
      schema = BlueprintSchema;
    }
  }

  return validatePatternFile(filePath, fileName, type, schema, verbose);
}

/**
 * Validate a single pattern file
 */
async function validatePatternFile(
  filePath: string,
  fileName: string,
  type: "fix" | "blueprint" | "solution",
  schema:
    | typeof FixPatternSchema
    | typeof BlueprintSchema
    | typeof SolutionPatternSchema,
  _verbose: boolean,
): Promise<ValidationResult> {
  try {
    const content = await fs.promises.readFile(filePath, "utf-8");
    const data = JSON.parse(content);

    const validation = schema.safeParse(data);

    if (validation.success) {
      return {
        file: fileName,
        type,
        valid: true,
        errors: [],
        fixable: false,
      };
    }

    // Collect errors
    const errors = validation.error.issues.map(
      (i) => `${i.path.join(".")}: ${i.message}`,
    );

    // Try to auto-fix common issues
    const { fixable, fixedData } = tryAutoFix(
      data,
      type,
      validation.error.issues,
    );

    return {
      file: fileName,
      type,
      valid: false,
      errors,
      fixable,
      fixedData,
    };
  } catch (error) {
    return {
      file: fileName,
      type,
      valid: false,
      errors: [error instanceof Error ? error.message : "Failed to parse JSON"],
      fixable: false,
    };
  }
}

/**
 * Try to auto-fix common validation issues
 */
function tryAutoFix(
  data: Record<string, unknown>,
  type: "fix" | "blueprint" | "solution",
  issues: { path: (string | number)[]; message: string; code: string }[],
): { fixable: boolean; fixedData?: Record<string, unknown> } {
  const fixedData = { ...data };
  let allFixable = true;

  for (const issue of issues) {
    const pathStr = issue.path.join(".");

    // Auto-fix missing metrics
    if (pathStr === "metrics" && issue.code === "invalid_type") {
      fixedData.metrics = createDefaultMetrics();
      continue;
    }

    // Auto-fix missing setup (for blueprints)
    if (
      pathStr === "setup" &&
      issue.code === "invalid_type" &&
      type === "blueprint"
    ) {
      fixedData.setup = {
        commands: [],
        envVars: [],
        dependencies: [],
      };
      continue;
    }

    // Auto-fix missing relatedPatterns
    if (pathStr === "relatedPatterns" && issue.code === "invalid_type") {
      fixedData.relatedPatterns = [];
      continue;
    }

    // Auto-fix missing tags
    if (pathStr === "tags" && issue.code === "invalid_type") {
      fixedData.tags = [];
      continue;
    }

    // Auto-fix missing errorSignatures (for fix patterns)
    if (
      pathStr === "errorSignatures" &&
      issue.code === "invalid_type" &&
      type === "fix"
    ) {
      fixedData.errorSignatures = [];
      continue;
    }

    // Auto-fix missing codeChanges (for fix patterns)
    if (
      pathStr === "codeChanges" &&
      issue.code === "invalid_type" &&
      type === "fix"
    ) {
      fixedData.codeChanges = [];
      continue;
    }

    // Auto-fix missing problemKeywords (for solutions)
    if (
      pathStr === "problemKeywords" &&
      issue.code === "invalid_type" &&
      type === "solution"
    ) {
      fixedData.problemKeywords = [];
      continue;
    }

    // Auto-fix missing implementations (for solutions)
    if (
      pathStr === "implementations" &&
      issue.code === "invalid_type" &&
      type === "solution"
    ) {
      fixedData.implementations = [];
      continue;
    }

    // Can't auto-fix this issue
    allFixable = false;
  }

  // Re-validate the fixed data
  let schema;
  if (type === "fix") {
    schema = FixPatternSchema;
  } else if (type === "blueprint") {
    schema = BlueprintSchema;
  } else {
    schema = SolutionPatternSchema;
  }

  const revalidation = schema.safeParse(fixedData);
  if (revalidation.success) {
    return { fixable: true, fixedData };
  }

  // If still invalid, check if we fixed some but not all
  if (allFixable) {
    return { fixable: true, fixedData };
  }

  return { fixable: false };
}

// ============================================
// learn:capture Command
// ============================================

/**
 * Library to tag mapping for dependency-based tag inference
 */
const LIBRARY_TAG_MAP: Record<
  string,
  { category: PatternTag["category"]; name: string }[]
> = {
  // Frontend Frameworks
  react: [{ category: "framework", name: "react" }],
  "react-dom": [{ category: "framework", name: "react" }],
  next: [{ category: "framework", name: "next" }],
  vue: [{ category: "framework", name: "vue" }],
  nuxt: [{ category: "framework", name: "nuxt" }],
  svelte: [{ category: "framework", name: "svelte" }],
  "@sveltejs/kit": [{ category: "framework", name: "sveltekit" }],
  "solid-js": [{ category: "framework", name: "solid" }],
  "@angular/core": [{ category: "framework", name: "angular" }],
  astro: [{ category: "framework", name: "astro" }],
  remix: [{ category: "framework", name: "remix" }],

  // Backend Frameworks
  express: [{ category: "framework", name: "express" }],
  fastify: [{ category: "framework", name: "fastify" }],
  hono: [{ category: "framework", name: "hono" }],
  koa: [{ category: "framework", name: "koa" }],
  "@nestjs/core": [{ category: "framework", name: "nestjs" }],
  hapi: [{ category: "framework", name: "hapi" }],

  // Testing
  vitest: [
    { category: "tool", name: "vitest" },
    { category: "testing", name: "testing" },
  ],
  jest: [
    { category: "tool", name: "jest" },
    { category: "testing", name: "testing" },
  ],
  "@testing-library/react": [{ category: "tool", name: "testing-library" }],
  playwright: [
    { category: "tool", name: "playwright" },
    { category: "testing", name: "e2e" },
  ],
  cypress: [
    { category: "tool", name: "cypress" },
    { category: "testing", name: "e2e" },
  ],

  // State Management
  zustand: [
    { category: "tool", name: "zustand" },
    { category: "state", name: "state" },
  ],
  redux: [
    { category: "tool", name: "redux" },
    { category: "state", name: "state" },
  ],
  "@reduxjs/toolkit": [
    { category: "tool", name: "redux-toolkit" },
    { category: "state", name: "state" },
  ],
  jotai: [
    { category: "tool", name: "jotai" },
    { category: "state", name: "state" },
  ],
  recoil: [
    { category: "tool", name: "recoil" },
    { category: "state", name: "state" },
  ],
  mobx: [
    { category: "tool", name: "mobx" },
    { category: "state", name: "state" },
  ],
  pinia: [
    { category: "tool", name: "pinia" },
    { category: "state", name: "state" },
  ],
  xstate: [
    { category: "tool", name: "xstate" },
    { category: "state", name: "state-machine" },
  ],

  // Database & ORM
  prisma: [
    { category: "tool", name: "prisma" },
    { category: "database", name: "database" },
  ],
  "@prisma/client": [
    { category: "tool", name: "prisma" },
    { category: "database", name: "database" },
  ],
  "drizzle-orm": [
    { category: "tool", name: "drizzle" },
    { category: "database", name: "database" },
  ],
  typeorm: [
    { category: "tool", name: "typeorm" },
    { category: "database", name: "database" },
  ],
  mongoose: [
    { category: "tool", name: "mongoose" },
    { category: "database", name: "mongodb" },
  ],
  knex: [
    { category: "tool", name: "knex" },
    { category: "database", name: "database" },
  ],
  sequelize: [
    { category: "tool", name: "sequelize" },
    { category: "database", name: "database" },
  ],

  // Authentication
  "next-auth": [
    { category: "tool", name: "next-auth" },
    { category: "auth", name: "auth" },
  ],
  "@auth/core": [
    { category: "tool", name: "authjs" },
    { category: "auth", name: "auth" },
  ],
  passport: [
    { category: "tool", name: "passport" },
    { category: "auth", name: "auth" },
  ],
  lucia: [
    { category: "tool", name: "lucia" },
    { category: "auth", name: "auth" },
  ],
  "@clerk/nextjs": [
    { category: "tool", name: "clerk" },
    { category: "auth", name: "auth" },
  ],

  // UI Libraries
  "@radix-ui/react-dialog": [{ category: "tool", name: "radix-ui" }],
  "@radix-ui/react-dropdown-menu": [{ category: "tool", name: "radix-ui" }],
  "@shadcn/ui": [{ category: "tool", name: "shadcn" }],
  "@chakra-ui/react": [{ category: "tool", name: "chakra-ui" }],
  "@mantine/core": [{ category: "tool", name: "mantine" }],
  "@headlessui/react": [{ category: "tool", name: "headlessui" }],
  antd: [{ category: "tool", name: "antd" }],
  "@mui/material": [{ category: "tool", name: "material-ui" }],

  // Styling
  tailwindcss: [{ category: "tool", name: "tailwind" }],
  "styled-components": [{ category: "tool", name: "styled-components" }],
  "@emotion/react": [{ category: "tool", name: "emotion" }],
  sass: [{ category: "tool", name: "sass" }],

  // API & Data Fetching
  "@tanstack/react-query": [
    { category: "tool", name: "tanstack-query" },
    { category: "api", name: "data-fetching" },
  ],
  swr: [
    { category: "tool", name: "swr" },
    { category: "api", name: "data-fetching" },
  ],
  "@trpc/server": [
    { category: "tool", name: "trpc" },
    { category: "api", name: "api" },
  ],
  "@trpc/client": [
    { category: "tool", name: "trpc" },
    { category: "api", name: "api" },
  ],
  graphql: [
    { category: "tool", name: "graphql" },
    { category: "api", name: "api" },
  ],
  "@apollo/client": [
    { category: "tool", name: "apollo" },
    { category: "api", name: "graphql" },
  ],
  axios: [{ category: "tool", name: "axios" }],

  // Form Libraries
  "react-hook-form": [
    { category: "tool", name: "react-hook-form" },
    { category: "feature", name: "forms" },
  ],
  formik: [
    { category: "tool", name: "formik" },
    { category: "feature", name: "forms" },
  ],
  "@tanstack/react-form": [
    { category: "tool", name: "tanstack-form" },
    { category: "feature", name: "forms" },
  ],

  // Validation
  zod: [
    { category: "tool", name: "zod" },
    { category: "feature", name: "validation" },
  ],
  yup: [
    { category: "tool", name: "yup" },
    { category: "feature", name: "validation" },
  ],
  valibot: [
    { category: "tool", name: "valibot" },
    { category: "feature", name: "validation" },
  ],

  // Build Tools
  vite: [{ category: "tool", name: "vite" }],
  esbuild: [{ category: "tool", name: "esbuild" }],
  tsup: [{ category: "tool", name: "tsup" }],
  webpack: [{ category: "tool", name: "webpack" }],
  turbo: [{ category: "tool", name: "turborepo" }],

  // Utilities
  lodash: [{ category: "tool", name: "lodash" }],
  "date-fns": [{ category: "tool", name: "date-fns" }],
  dayjs: [{ category: "tool", name: "dayjs" }],
  uuid: [{ category: "tool", name: "uuid" }],
  nanoid: [{ category: "tool", name: "nanoid" }],

  // CLI & Developer Tools
  commander: [
    { category: "tool", name: "commander" },
    { category: "feature", name: "cli" },
  ],
  yargs: [
    { category: "tool", name: "yargs" },
    { category: "feature", name: "cli" },
  ],
  "@clack/prompts": [
    { category: "tool", name: "clack" },
    { category: "feature", name: "cli" },
  ],
  inquirer: [
    { category: "tool", name: "inquirer" },
    { category: "feature", name: "cli" },
  ],
  chalk: [{ category: "tool", name: "chalk" }],

  // Runtime & Languages
  typescript: [{ category: "language", name: "typescript" }],
};

interface LearnCaptureOptions {
  name?: string;
  description?: string;
  framework?: string;
  tags?: string;
  dryRun?: boolean;
}

/**
 * Infer a pattern name from file paths
 */
function inferPatternName(filePaths: string[]): string {
  // If single file, use filename without extension
  if (filePaths.length === 1) {
    const fileName = path.basename(filePaths[0]);
    const nameWithoutExt = fileName.replace(/\.[^.]+$/, "");
    // Convert to title case
    return nameWithoutExt
      .replace(/[-_]/g, " ")
      .replace(/([A-Z])/g, " $1")
      .trim()
      .split(/\s+/)
      .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
      .join(" ");
  }

  // Multiple files - find common directory or pattern
  const dirs = filePaths.map((p) => path.dirname(p));
  const uniqueDirs = [...new Set(dirs)];

  if (uniqueDirs.length === 1 && uniqueDirs[0] !== ".") {
    // All in same directory
    const dirName = path.basename(uniqueDirs[0]);
    return (
      dirName
        .replace(/[-_]/g, " ")
        .replace(/([A-Z])/g, " $1")
        .trim()
        .split(/\s+/)
        .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
        .join(" ") + " Pattern"
    );
  }

  // Find common prefix among filenames
  const fileNames = filePaths.map((p) =>
    path.basename(p).replace(/\.[^.]+$/, ""),
  );
  if (fileNames.length > 0) {
    let commonPrefix = fileNames[0];
    for (const name of fileNames.slice(1)) {
      while (!name.startsWith(commonPrefix) && commonPrefix.length > 0) {
        commonPrefix = commonPrefix.slice(0, -1);
      }
    }
    if (commonPrefix.length > 2) {
      return (
        commonPrefix
          .replace(/[-_]/g, " ")
          .replace(/([A-Z])/g, " $1")
          .trim()
          .split(/\s+/)
          .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
          .join(" ") + " Pattern"
      );
    }
  }

  // Default to file count
  return `Multi-file Pattern (${filePaths.length} files)`;
}

/**
 * Infer tags from package.json dependencies
 */
async function inferTagsFromDependencies(cwd: string): Promise<PatternTag[]> {
  const tags: PatternTag[] = [];
  const seenTags = new Set<string>();

  const packageJsonPath = path.join(cwd, "package.json");
  if (!fs.existsSync(packageJsonPath)) {
    return tags;
  }

  try {
    const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, "utf-8"));
    const allDeps = {
      ...packageJson.dependencies,
      ...packageJson.devDependencies,
    };

    for (const dep of Object.keys(allDeps)) {
      const mappedTags = LIBRARY_TAG_MAP[dep];
      if (mappedTags) {
        for (const tag of mappedTags) {
          const key = `${tag.category}:${tag.name}`;
          if (!seenTags.has(key)) {
            seenTags.add(key);
            tags.push(tag);
          }
        }
      }
    }
  } catch {
    // Ignore parse errors
  }

  return tags;
}

/**
 * Infer tags from file content and extensions
 */
function inferTagsFromContent(filePaths: string[]): PatternTag[] {
  const tags: PatternTag[] = [];
  const seenTags = new Set<string>();

  const addTag = (category: PatternTag["category"], name: string) => {
    const key = `${category}:${name}`;
    if (!seenTags.has(key)) {
      seenTags.add(key);
      tags.push({ category, name });
    }
  };

  for (const filePath of filePaths) {
    const ext = path.extname(filePath).toLowerCase();
    const fileName = path.basename(filePath).toLowerCase();

    // Language detection
    if (ext === ".ts" || ext === ".tsx") {
      addTag("language", "typescript");
    } else if (
      ext === ".js" ||
      ext === ".jsx" ||
      ext === ".mjs" ||
      ext === ".cjs"
    ) {
      addTag("language", "javascript");
    } else if (ext === ".py") {
      addTag("language", "python");
    } else if (ext === ".go") {
      addTag("language", "go");
    } else if (ext === ".rs") {
      addTag("language", "rust");
    } else if (ext === ".css" || ext === ".scss" || ext === ".sass") {
      addTag("file-type", "css");
    }

    // React detection
    if (ext === ".tsx" || ext === ".jsx") {
      addTag("framework", "react");
    }

    // Test file detection
    if (
      fileName.includes(".test.") ||
      fileName.includes(".spec.") ||
      fileName.startsWith("test_")
    ) {
      addTag("testing", "testing");
    }

    // Config file detection
    if (fileName.includes("config") || fileName.startsWith(".")) {
      addTag("file-type", "configuration");
    }

    // Component detection
    if (
      filePath.includes("/components/") ||
      filePath.includes("\\components\\")
    ) {
      addTag("ui", "component");
    }

    // Hook detection
    if (
      filePath.includes("/hooks/") ||
      filePath.includes("\\hooks\\") ||
      fileName.startsWith("use")
    ) {
      addTag("pattern", "hooks");
    }

    // API/route detection
    if (
      filePath.includes("/api/") ||
      filePath.includes("\\api\\") ||
      filePath.includes("/routes/")
    ) {
      addTag("api", "api");
    }

    // Utils detection
    if (
      filePath.includes("/utils/") ||
      filePath.includes("\\utils\\") ||
      filePath.includes("/lib/")
    ) {
      addTag("library", "utilities");
    }
  }

  return tags;
}

/**
 * Capture files as a blueprint pattern with auto-inferred metadata
 */
export async function learnCaptureCommand(
  paths: string[],
  options: LearnCaptureOptions,
) {
  const cwd = getWorkspacePath();
  const store = new PatternStore(cwd);
  await store.initialize();

  console.log(chalk.cyan("\n📸 Capture Files as Blueprint\n"));

  // Resolve all paths and validate they exist
  const resolvedPaths: string[] = [];
  const relativePaths: string[] = [];

  for (const inputPath of paths) {
    const absolutePath = path.isAbsolute(inputPath)
      ? inputPath
      : path.resolve(cwd, inputPath);

    if (!fs.existsSync(absolutePath)) {
      console.log(chalk.red(`✗ File not found: ${inputPath}`));
      process.exit(1);
    }

    const stat = fs.statSync(absolutePath);
    if (stat.isDirectory()) {
      // Recursively get all files in directory
      const files = getAllFilesInDir(absolutePath);
      for (const file of files) {
        resolvedPaths.push(file);
        relativePaths.push(path.relative(cwd, file));
      }
    } else {
      resolvedPaths.push(absolutePath);
      relativePaths.push(path.relative(cwd, absolutePath));
    }
  }

  if (resolvedPaths.length === 0) {
    console.log(chalk.red("✗ No files found to capture"));
    process.exit(1);
  }

  console.log(chalk.dim(`Found ${resolvedPaths.length} file(s) to capture:\n`));
  for (const relPath of relativePaths.slice(0, 10)) {
    console.log(chalk.dim(`  • ${relPath}`));
  }
  if (relativePaths.length > 10) {
    console.log(chalk.dim(`  ... and ${relativePaths.length - 10} more`));
  }
  console.log();

  // Infer tags from dependencies and content
  const depTags = await inferTagsFromDependencies(cwd);
  const contentTags = inferTagsFromContent(relativePaths);
  const allInferredTags = [...depTags, ...contentTags];

  // Deduplicate tags
  const seenTagKeys = new Set<string>();
  const uniqueTags: PatternTag[] = [];
  for (const tag of allInferredTags) {
    const key = `${tag.category}:${tag.name}`;
    if (!seenTagKeys.has(key)) {
      seenTagKeys.add(key);
      uniqueTags.push(tag);
    }
  }

  // Parse additional tags from options
  if (options.tags) {
    const tagPairs = options.tags.split(",").map((t) => t.trim());
    for (const pair of tagPairs) {
      const [cat, val] = pair.split(":");
      if (cat && val) {
        const key = `${cat}:${val}`;
        if (!seenTagKeys.has(key)) {
          seenTagKeys.add(key);
          uniqueTags.push({
            category: cat as PatternTag["category"],
            name: val,
          });
        }
      }
    }
  }

  // Infer or get pattern name
  let name = options.name;
  if (!name) {
    const inferredName = inferPatternName(relativePaths);
    console.log(chalk.dim(`Inferred name: "${inferredName}"`));

    const nameInput = await p.text({
      message: "Pattern name:",
      placeholder: inferredName,
      initialValue: inferredName,
      validate: (value) => {
        if (!value || value.length < 3)
          return "Name must be at least 3 characters";
        if (value.length > 100) return "Name must be less than 100 characters";
        return undefined;
      },
    });

    if (p.isCancel(nameInput)) {
      p.cancel("Capture cancelled");
      process.exit(0);
    }
    name = nameInput as string;
  }

  // Get description
  let description = options.description;
  if (!description) {
    const descInput = await p.text({
      message: "Description:",
      placeholder: "What does this pattern provide?",
      validate: (value) => {
        if (!value || value.length < 10)
          return "Description must be at least 10 characters";
        if (value.length > 500)
          return "Description must be less than 500 characters";
        return undefined;
      },
    });

    if (p.isCancel(descInput)) {
      p.cancel("Capture cancelled");
      process.exit(0);
    }
    description = descInput as string;
  }

  // Determine framework
  let framework = options.framework;
  if (!framework) {
    // Try to get from inferred tags
    const frameworkTag = uniqueTags.find((t) => t.category === "framework");
    framework = frameworkTag?.name || "general";
  }

  // Show inferred tags and allow editing
  if (uniqueTags.length > 0) {
    console.log(chalk.dim("\nInferred tags:"));
    console.log(chalk.dim(`  ${formatTags(uniqueTags)}`));
  }

  // Read file contents
  const files: Array<{ path: string; content: string; language: string }> = [];
  for (let i = 0; i < resolvedPaths.length; i++) {
    const absolutePath = resolvedPaths[i];
    const relativePath = relativePaths[i];
    const content = fs.readFileSync(absolutePath, "utf-8");
    const ext = path.extname(relativePath).slice(1);

    // Map extension to language
    const languageMap: Record<string, string> = {
      ts: "typescript",
      tsx: "typescript",
      js: "javascript",
      jsx: "javascript",
      mjs: "javascript",
      cjs: "javascript",
      py: "python",
      go: "go",
      rs: "rust",
      css: "css",
      scss: "scss",
      html: "html",
      json: "json",
      yaml: "yaml",
      yml: "yaml",
      md: "markdown",
      mdx: "mdx",
      sql: "sql",
      sh: "bash",
      bash: "bash",
      zsh: "bash",
    };

    files.push({
      path: relativePath,
      content,
      language: languageMap[ext] || ext || "text",
    });
  }

  // Determine the primary language from files
  const languageCounts: Record<string, number> = {};
  for (const file of files) {
    languageCounts[file.language] = (languageCounts[file.language] || 0) + 1;
  }
  const detectedLanguage =
    Object.entries(languageCounts).sort((a, b) => b[1] - a[1])[0]?.[0] ||
    "typescript";

  // Map detected language to valid Language enum value
  const validLanguages: Language[] = [
    "typescript",
    "javascript",
    "python",
    "go",
    "rust",
    "other",
  ];
  const primaryLanguage: Language = validLanguages.includes(
    detectedLanguage as Language,
  )
    ? (detectedLanguage as Language)
    : "other";

  // Create blueprint with proper schema structure
  const now = new Date().toISOString();
  const contributorManager = new ContributorManager(cwd);
  const contributorResult = await contributorManager.getOrCreateId();
  const contributorId =
    contributorResult.success && contributorResult.data
      ? contributorResult.data
      : undefined;

  // Store file contents in structure.keyFiles
  const keyFiles = files.map((f) => ({
    path: f.path,
    purpose: `${f.language} file`,
    content: f.content,
  }));

  // Create directories with proper structure (path and purpose)
  const uniqueDirs = [
    ...new Set(files.map((f) => path.dirname(f.path)).filter((d) => d !== ".")),
  ];
  const directories = uniqueDirs.map((dir) => ({
    path: dir,
    purpose: `Directory for ${path.basename(dir)} files`,
  }));

  const blueprint: Blueprint = {
    id: crypto.randomUUID(),
    name,
    description,
    tags: uniqueTags,
    stack: {
      framework,
      language: primaryLanguage,
      runtime: "node",
      packageManager: "pnpm",
      dependencies: [],
      devDependencies: [],
    },
    structure: {
      directories,
      keyFiles,
    },
    setup: {
      prerequisites: [],
      steps: [],
      configs: [],
    },
    compatibility: {
      framework,
      frameworkVersion: ">=1.0.0",
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
    contributorId,
    createdAt: now,
    updatedAt: now,
  };

  // Dry run - just show what would be captured
  if (options.dryRun) {
    console.log(chalk.yellow("\n🔍 Dry Run - Would capture:\n"));
    console.log(chalk.bold(`Name: ${name}`));
    console.log(chalk.dim(`Description: ${description}`));
    console.log(chalk.dim(`Framework: ${framework}`));
    console.log(chalk.dim(`Tags: ${formatTags(uniqueTags)}`));
    console.log(chalk.dim(`Files: ${files.length}`));
    console.log(chalk.dim(`ID: ${blueprint.id}`));
    console.log(chalk.yellow("\n⚠️  No changes made (dry run)"));
    return;
  }

  // Save blueprint
  const result = await store.saveBlueprint(blueprint);

  if (!result.success) {
    console.log(chalk.red(`\n✗ Failed to save blueprint: ${result.error}`));
    process.exit(1);
  }

  console.log(chalk.green("\n✓ Blueprint captured successfully!\n"));
  console.log(chalk.bold(`ID: ${blueprint.id}`));
  console.log(chalk.dim(`Name: ${name}`));
  console.log(chalk.dim(`Files: ${files.length}`));
  console.log(chalk.dim(`Tags: ${formatTags(uniqueTags)}`));
  console.log(
    chalk.dim(`Path: .workflow/patterns/blueprints/${blueprint.id}.json`),
  );
  console.log(chalk.dim(`\nTo apply this pattern:`));
  console.log(chalk.cyan(`  pnpm workflow:learn:apply ${blueprint.id}`));
  console.log(chalk.dim(`\nTo publish to registry:`));
  console.log(chalk.cyan(`  pnpm workflow:learn:publish ${blueprint.id}`));
}

/**
 * Recursively get all files in a directory
 */
function getAllFilesInDir(dirPath: string): string[] {
  const files: string[] = [];
  const entries = fs.readdirSync(dirPath, { withFileTypes: true });

  for (const entry of entries) {
    const fullPath = path.join(dirPath, entry.name);

    // Skip hidden files and common ignore patterns
    if (
      entry.name.startsWith(".") ||
      entry.name === "node_modules" ||
      entry.name === "dist" ||
      entry.name === "build" ||
      entry.name === ".git"
    ) {
      continue;
    }

    if (entry.isDirectory()) {
      files.push(...getAllFilesInDir(fullPath));
    } else {
      files.push(fullPath);
    }
  }

  return files;
}

// ============================================
// learn:analyze Command
// ============================================

interface LearnAnalyzeOptions {
  verbose?: boolean;
}

/**
 * Analyze patterns in the codebase and suggest learnings
 */
export async function learnAnalyzeCommand(
  options: LearnAnalyzeOptions,
): Promise<void> {
  const cwd = getWorkspacePath();
  const store = new PatternStore(cwd);
  await store.initialize();
  const verbose = options.verbose ?? false;

  console.log(
    chalk.cyan("\n🔍 Analyzing Codebase for Learning Opportunities\n"),
  );

  // Get existing patterns
  const fixResult = await store.listFixPatterns({});
  const bpResult = await store.listBlueprints({});

  const existingPatterns = [
    ...(fixResult.data || []).map((p) => p.name.toLowerCase()),
    ...(bpResult.data || []).map((p) => p.name.toLowerCase()),
  ];

  // Scan for common patterns
  const opportunities: Array<{
    type: string;
    name: string;
    description: string;
    path?: string;
  }> = [];

  // Check for auth patterns
  const authPaths = ["src/auth", "src/lib/auth", "lib/auth", "app/api/auth"];
  for (const authPath of authPaths) {
    if (fs.existsSync(path.join(cwd, authPath))) {
      if (!existingPatterns.some((p) => p.includes("auth"))) {
        opportunities.push({
          type: "blueprint",
          name: "Authentication Module",
          description:
            "Capture your authentication implementation as a reusable pattern",
          path: authPath,
        });
      }
    }
  }

  // Check for API route patterns
  const apiPaths = ["src/api", "app/api", "pages/api", "src/routes"];
  for (const apiPath of apiPaths) {
    if (fs.existsSync(path.join(cwd, apiPath))) {
      if (!existingPatterns.some((p) => p.includes("api"))) {
        opportunities.push({
          type: "blueprint",
          name: "API Structure",
          description: "Capture your API routing structure as a blueprint",
          path: apiPath,
        });
      }
    }
  }

  // Check for component patterns
  const componentPaths = ["src/components", "components", "src/ui"];
  for (const compPath of componentPaths) {
    if (fs.existsSync(path.join(cwd, compPath))) {
      if (!existingPatterns.some((p) => p.includes("component"))) {
        opportunities.push({
          type: "blueprint",
          name: "Component Library",
          description: "Capture your component structure as a reusable pattern",
          path: compPath,
        });
      }
    }
  }

  // Check for test patterns
  const testPaths = ["__tests__", "test", "tests", "src/__tests__"];
  for (const testPath of testPaths) {
    if (fs.existsSync(path.join(cwd, testPath))) {
      if (!existingPatterns.some((p) => p.includes("test"))) {
        opportunities.push({
          type: "blueprint",
          name: "Testing Structure",
          description: "Capture your testing setup as a blueprint",
          path: testPath,
        });
      }
    }
  }

  // Display results
  if (opportunities.length === 0) {
    console.log(chalk.green("  ✓ No new learning opportunities identified"));
    console.log(chalk.dim("\n  Your patterns seem well-captured!"));
    return;
  }

  console.log(
    chalk.bold(
      `  Found ${opportunities.length} potential learning opportunities:\n`,
    ),
  );

  for (const opp of opportunities) {
    const icon = opp.type === "blueprint" ? "📐" : "🔧";
    console.log(`  ${icon} ${chalk.green(opp.name)}`);
    console.log(chalk.dim(`     ${opp.description}`));
    if (opp.path && verbose) {
      console.log(chalk.dim(`     Path: ${opp.path}`));
    }
    console.log("");
  }

  console.log(chalk.dim("  To capture a pattern:"));
  console.log(chalk.cyan("    workflow learn capture <path> --name <name>"));
}

// ============================================
// learn:export Command
// ============================================

interface LearnExportOptions {
  output?: string;
  format?: "json" | "yaml";
  type?: "fix" | "blueprint" | "all";
}

/**
 * Export learning patterns to a file
 */
export async function learnExportCommand(
  options: LearnExportOptions,
): Promise<void> {
  const cwd = getWorkspacePath();
  const store = new PatternStore(cwd);
  await store.initialize();
  const format = options.format ?? "json";
  const patternType = options.type ?? "all";
  const outputPath = options.output ?? `patterns-export.${format}`;

  console.log(chalk.cyan("\n📤 Exporting Learning Patterns\n"));

  const exportData: { fixes: FixPattern[]; blueprints: Blueprint[] } = {
    fixes: [],
    blueprints: [],
  };

  // Export fix patterns
  if (patternType === "all" || patternType === "fix") {
    const fixResult = await store.listFixPatterns({});
    if (fixResult.success && fixResult.data) {
      exportData.fixes = fixResult.data;
    }
  }

  // Export blueprints
  if (patternType === "all" || patternType === "blueprint") {
    const bpResult = await store.listBlueprints({});
    if (bpResult.success && bpResult.data) {
      exportData.blueprints = bpResult.data;
    }
  }

  const totalCount = exportData.fixes.length + exportData.blueprints.length;

  if (totalCount === 0) {
    console.log(chalk.yellow("  No patterns to export"));
    return;
  }

  // Format output
  let output: string;
  if (format === "yaml") {
    // Simple YAML-like output (for actual YAML, would need a library)
    output = `# Workflow Agent Patterns Export\n# Exported: ${new Date().toISOString()}\n\n`;
    output += `fixes:\n`;
    for (const fix of exportData.fixes) {
      output += `  - id: ${fix.id}\n`;
      output += `    name: "${fix.name}"\n`;
      output += `    category: ${fix.category}\n`;
      output += `    description: "${fix.description}"\n\n`;
    }
    output += `blueprints:\n`;
    for (const bp of exportData.blueprints) {
      output += `  - id: ${bp.id}\n`;
      output += `    name: "${bp.name}"\n`;
      output += `    description: "${bp.description}"\n\n`;
    }
  } else {
    output = JSON.stringify(
      {
        version: "1.0",
        exportedAt: new Date().toISOString(),
        ...exportData,
      },
      null,
      2,
    );
  }

  // Write file
  const fullOutputPath = path.isAbsolute(outputPath)
    ? outputPath
    : path.join(cwd, outputPath);

  await fs.promises.writeFile(fullOutputPath, output, "utf-8");

  console.log(chalk.green(`  ✓ Exported ${totalCount} patterns\n`));
  console.log(chalk.dim(`    Fix patterns: ${exportData.fixes.length}`));
  console.log(chalk.dim(`    Blueprints: ${exportData.blueprints.length}`));
  console.log(chalk.dim(`    Output: ${fullOutputPath}`));
  console.log(chalk.dim(`    Format: ${format.toUpperCase()}`));
}

// ============================================
// learn:import Command
// ============================================

interface LearnImportOptions {
  format?: "json" | "yaml";
  dryRun?: boolean;
  merge?: boolean;
}

/**
 * Import learning patterns from a file
 */
export async function learnImportCommand(
  file: string,
  options: LearnImportOptions,
): Promise<void> {
  const cwd = getWorkspacePath();
  const store = new PatternStore(cwd);
  await store.initialize();
  const dryRun = options.dryRun ?? false;
  const merge = options.merge ?? true;

  console.log(chalk.cyan("\n📥 Importing Learning Patterns\n"));

  const filePath = path.isAbsolute(file) ? file : path.join(cwd, file);

  if (!fs.existsSync(filePath)) {
    console.log(chalk.red(`  ✗ File not found: ${filePath}`));
    process.exit(1);
  }

  const content = await fs.promises.readFile(filePath, "utf-8");

  let importData: { fixes?: FixPattern[]; blueprints?: Blueprint[] };

  try {
    // Detect format
    if (file.endsWith(".yaml") || file.endsWith(".yml")) {
      console.log(
        chalk.yellow("  YAML import not fully supported, treating as JSON"),
      );
    }
    importData = JSON.parse(content);
  } catch {
    console.log(chalk.red("  ✗ Failed to parse import file"));
    process.exit(1);
  }

  const fixes = importData.fixes || [];
  const blueprints = importData.blueprints || [];
  const totalCount = fixes.length + blueprints.length;

  if (totalCount === 0) {
    console.log(chalk.yellow("  No patterns found in import file"));
    return;
  }

  console.log(chalk.dim(`  Found ${fixes.length} fix patterns`));
  console.log(chalk.dim(`  Found ${blueprints.length} blueprints\n`));

  if (dryRun) {
    console.log(chalk.yellow("  🔍 Dry run - no changes will be made\n"));

    for (const fix of fixes) {
      console.log(chalk.dim(`    Would import fix: ${fix.name} (${fix.id})`));
    }
    for (const bp of blueprints) {
      console.log(
        chalk.dim(`    Would import blueprint: ${bp.name} (${bp.id})`),
      );
    }
    return;
  }

  // Import patterns
  let imported = 0;
  let skipped = 0;

  for (const fix of fixes) {
    // Check if exists
    const existing = await store.getFixPattern(fix.id);
    if (existing.success && existing.data && !merge) {
      console.log(chalk.yellow(`    Skipped (exists): ${fix.name}`));
      skipped++;
      continue;
    }

    const result = await store.saveFixPattern(fix);
    if (result.success) {
      console.log(chalk.green(`    ✓ Imported: ${fix.name}`));
      imported++;
    } else {
      console.log(chalk.red(`    ✗ Failed: ${fix.name}`));
    }
  }

  for (const bp of blueprints) {
    // Check if exists
    const existing = await store.getBlueprint(bp.id);
    if (existing.success && existing.data && !merge) {
      console.log(chalk.yellow(`    Skipped (exists): ${bp.name}`));
      skipped++;
      continue;
    }

    const result = await store.saveBlueprint(bp);
    if (result.success) {
      console.log(chalk.green(`    ✓ Imported: ${bp.name}`));
      imported++;
    } else {
      console.log(chalk.red(`    ✗ Failed: ${bp.name}`));
    }
  }

  console.log(chalk.green(`\n  ✓ Import complete`));
  console.log(chalk.dim(`    Imported: ${imported}`));
  console.log(chalk.dim(`    Skipped: ${skipped}`));
}

// ============================================
// learn:clean Command
// ============================================

interface LearnCleanOptions {
  dryRun?: boolean;
  deprecated?: boolean;
  stale?: boolean;
  all?: boolean;
}

/**
 * Clean old or stale learning patterns
 */
export async function learnCleanCommand(
  options: LearnCleanOptions,
): Promise<void> {
  const cwd = getWorkspacePath();
  const store = new PatternStore(cwd);
  await store.initialize();
  const dryRun = options.dryRun ?? false;
  const cleanDeprecated = options.deprecated ?? false;
  const cleanStale = options.stale ?? false;
  const cleanAll = options.all ?? false;

  console.log(chalk.cyan("\n🧹 Cleaning Learning Patterns\n"));

  if (!cleanDeprecated && !cleanStale && !cleanAll) {
    console.log(chalk.yellow("  Specify what to clean:"));
    console.log(chalk.dim("    --deprecated  Remove deprecated patterns"));
    console.log(
      chalk.dim("    --stale       Remove patterns not used in 90+ days"),
    );
    console.log(
      chalk.dim("    --all         Remove all patterns (use with caution!)"),
    );
    return;
  }

  const toRemove: Array<{
    id: string;
    name: string;
    type: "fix" | "blueprint";
    reason: string;
  }> = [];

  // Get all patterns
  const fixResult = await store.listFixPatterns({ includeDeprecated: true });
  const bpResult = await store.listBlueprints({ includeDeprecated: true });

  const fixes = fixResult.data || [];
  const blueprints = bpResult.data || [];

  const now = Date.now();
  const staleDays = 90;
  const staleThreshold = now - staleDays * 24 * 60 * 60 * 1000;

  // Identify patterns to remove
  for (const fix of fixes) {
    if (cleanAll) {
      toRemove.push({ id: fix.id, name: fix.name, type: "fix", reason: "all" });
    } else if (cleanDeprecated && fix.deprecatedAt) {
      toRemove.push({
        id: fix.id,
        name: fix.name,
        type: "fix",
        reason: "deprecated",
      });
    } else if (cleanStale) {
      const lastUsed = new Date(fix.updatedAt).getTime();
      if (lastUsed < staleThreshold) {
        toRemove.push({
          id: fix.id,
          name: fix.name,
          type: "fix",
          reason: "stale",
        });
      }
    }
  }

  for (const bp of blueprints) {
    if (cleanAll) {
      toRemove.push({
        id: bp.id,
        name: bp.name,
        type: "blueprint",
        reason: "all",
      });
    } else if (cleanDeprecated && bp.deprecatedAt) {
      toRemove.push({
        id: bp.id,
        name: bp.name,
        type: "blueprint",
        reason: "deprecated",
      });
    } else if (cleanStale) {
      const lastUsed = new Date(bp.updatedAt).getTime();
      if (lastUsed < staleThreshold) {
        toRemove.push({
          id: bp.id,
          name: bp.name,
          type: "blueprint",
          reason: "stale",
        });
      }
    }
  }

  if (toRemove.length === 0) {
    console.log(chalk.green("  ✓ Nothing to clean"));
    return;
  }

  console.log(chalk.bold(`  Found ${toRemove.length} patterns to remove:\n`));

  for (const item of toRemove) {
    const icon = item.type === "fix" ? "🔧" : "📐";
    console.log(`    ${icon} ${item.name} (${item.reason})`);
  }

  if (dryRun) {
    console.log(chalk.yellow("\n  🔍 Dry run - no changes made"));
    return;
  }

  // Confirm
  const confirmed = await p.confirm({
    message: `Remove ${toRemove.length} patterns? This cannot be undone.`,
    initialValue: false,
  });

  if (p.isCancel(confirmed) || !confirmed) {
    p.cancel("Clean cancelled");
    return;
  }

  // Remove patterns
  let removed = 0;
  const patternsPath = path.join(cwd, ".workflow", "patterns");

  for (const item of toRemove) {
    const dir = item.type === "fix" ? "fixes" : "blueprints";
    const filePath = path.join(patternsPath, dir, `${item.id}.json`);

    try {
      if (fs.existsSync(filePath)) {
        await fs.promises.unlink(filePath);
        removed++;
      }
    } catch {
      console.log(chalk.red(`    ✗ Failed to remove: ${item.name}`));
    }
  }

  console.log(chalk.green(`\n  ✓ Removed ${removed} patterns`));
}
