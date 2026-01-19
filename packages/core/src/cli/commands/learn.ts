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
    let anonymizedFixes = 0;
    let anonymizedBlueprints = 0;

    for (const fix of fixes) {
      const result = anonymizer.anonymizeFixPattern(fix);
      if (result.success) {
        anonymizedFixes++;
        if (!options.dryRun) {
          // TODO: Actually push to registry when implemented
          console.log(chalk.dim(`  ✓ Anonymized: ${fix.name}`));
        }
      }
    }

    for (const bp of blueprints) {
      const result = anonymizer.anonymizeBlueprint(bp);
      if (result.success) {
        anonymizedBlueprints++;
        if (!options.dryRun) {
          // TODO: Actually push to registry when implemented
          console.log(chalk.dim(`  ✓ Anonymized: ${bp.name}`));
        }
      }
    }

    console.log(
      chalk.green(
        `\n✅ Ready to push ${anonymizedFixes} fixes and ${anonymizedBlueprints} blueprints`,
      ),
    );
    console.log(chalk.dim("  (Registry push not yet implemented)"));
  }

  if (options.pull) {
    console.log(chalk.cyan("\n📥 Pulling patterns from registry...\n"));
    console.log(chalk.dim("  (Registry pull not yet implemented)"));
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
