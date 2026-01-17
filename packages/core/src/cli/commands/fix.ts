/**
 * Fix command - Auto-heal pipeline failures
 *
 * This command is invoked by the GitHub App's auto-heal orchestrator
 * to automatically fix pipeline errors using LLM assistance.
 */

import { existsSync, readFileSync, writeFileSync, mkdirSync } from "fs";
import { dirname, join, relative } from "path";
import { execa } from "execa";
import * as p from "@clack/prompts";
import pc from "picocolors";

interface FixOptions {
  error: string;
  context?: string;
  files?: string[];
  auto?: boolean;
  dryRun?: boolean;
}

/**
 * Parse error message to extract relevant file paths
 */
function extractFilePaths(errorMessage: string, cwd: string): string[] {
  const paths = new Set<string>();

  // Match common error path patterns:
  // - /path/to/file.ts:10:5
  // - /path/to/file.ts(10,5)
  // - at /path/to/file.ts:10:5
  // - Error in ./src/file.ts
  const patterns = [
    /(?:at\s+)?([\/\w\.\-]+\.(?:ts|js|tsx|jsx|mjs|cjs|vue|svelte))(?::\d+(?::\d+)?)?/g,
    /(?:Error in |from )\.?([\/\w\.\-]+\.(?:ts|js|tsx|jsx|mjs|cjs|vue|svelte))/g,
    /['"]([\/\w\.\-]+\.(?:ts|js|tsx|jsx|mjs|cjs|vue|svelte))['"]/g,
  ];

  for (const pattern of patterns) {
    let match;
    while ((match = pattern.exec(errorMessage)) !== null) {
      let filePath = match[1];

      // Resolve relative paths
      if (!filePath.startsWith("/")) {
        filePath = join(cwd, filePath);
      }

      // Only include if file exists
      if (existsSync(filePath)) {
        paths.add(filePath);
      }
    }
  }

  return Array.from(paths);
}

/**
 * Read file contents for context
 */
function readFileContents(paths: string[]): Record<string, string> {
  const contents: Record<string, string> = {};

  for (const filePath of paths) {
    try {
      if (existsSync(filePath)) {
        contents[filePath] = readFileSync(filePath, "utf-8");
      }
    } catch {
      // Skip files we can't read
    }
  }

  return contents;
}

/**
 * Generate a fix using LLM (stub - actual implementation uses github-app)
 */
async function generateFixWithLLM(
  errorMessage: string,
  _fileContents: Record<string, string>,
  _context?: string,
): Promise<{
  analysis: string;
  rootCause: string;
  suggestedFix: {
    description: string;
    files: Array<{
      path: string;
      action: "create" | "modify" | "delete";
      content?: string;
    }>;
  };
  confidence: number;
}> {
  // This is a placeholder - the actual LLM call would be made here
  // In practice, this could:
  // 1. Call the github-app's LLM service
  // 2. Use environment-configured API keys directly
  // 3. Delegate to an external agent service

  console.log(pc.dim("  Analyzing error with LLM..."));

  // For now, return a placeholder response
  // Real implementation would call Anthropic/OpenAI API
  return {
    analysis: `Error analysis for: ${errorMessage.slice(0, 100)}...`,
    rootCause: "Unable to determine root cause without LLM API access",
    suggestedFix: {
      description: "Manual intervention required - LLM API not configured",
      files: [],
    },
    confidence: 0,
  };
}

/**
 * Apply file changes from the fix suggestion
 */
async function applyChanges(
  changes: Array<{
    path: string;
    action: "create" | "modify" | "delete";
    content?: string;
  }>,
  dryRun: boolean,
): Promise<void> {
  for (const change of changes) {
    const actionColor =
      change.action === "create"
        ? pc.green
        : change.action === "delete"
          ? pc.red
          : pc.yellow;

    console.log(`  ${actionColor(change.action.toUpperCase())} ${change.path}`);

    if (dryRun) {
      console.log(pc.dim("    (dry run - no changes made)"));
      continue;
    }

    switch (change.action) {
      case "create":
      case "modify":
        if (change.content) {
          const dir = dirname(change.path);
          if (!existsSync(dir)) {
            mkdirSync(dir, { recursive: true });
          }
          writeFileSync(change.path, change.content);
        }
        break;
      case "delete":
        // For safety, we don't actually delete files
        console.log(pc.dim("    (delete skipped for safety)"));
        break;
    }
  }
}

/**
 * Commit and push changes
 */
async function commitAndPush(
  message: string,
  cwd: string,
): Promise<{ success: boolean; error?: string }> {
  try {
    // Stage all changes
    await execa("git", ["add", "-A"], { cwd });

    // Check if there are changes to commit
    const { stdout: status } = await execa("git", ["status", "--porcelain"], {
      cwd,
    });

    if (!status.trim()) {
      return { success: true }; // No changes to commit
    }

    // Commit
    await execa("git", ["commit", "-m", message], { cwd });

    // Push
    await execa("git", ["push"], { cwd });

    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

/**
 * Main fix command handler
 */
export async function fixCommand(options: FixOptions): Promise<void> {
  const cwd = process.cwd();

  console.log(pc.cyan("\n🔧 Auto-Heal: Fixing Pipeline Error\n"));

  // Validate required options
  if (!options.error) {
    console.error(pc.red("Error: --error flag is required"));
    process.exit(1);
  }

  console.log(pc.bold("Error Message:"));
  console.log(pc.dim(options.error.slice(0, 500)));
  if (options.error.length > 500) {
    console.log(pc.dim(`... (${options.error.length - 500} more characters)`));
  }
  console.log("");

  // Extract relevant file paths from error
  let filePaths = options.files || [];
  if (filePaths.length === 0) {
    console.log(pc.dim("Extracting file paths from error..."));
    filePaths = extractFilePaths(options.error, cwd);
  }

  if (filePaths.length > 0) {
    console.log(pc.bold("\nRelevant Files:"));
    for (const path of filePaths) {
      console.log(`  📄 ${relative(cwd, path)}`);
    }
    console.log("");
  }

  // Read file contents
  const fileContents = readFileContents(filePaths);

  // Parse additional context if provided
  let context: string | undefined;
  if (options.context) {
    try {
      context = JSON.parse(options.context);
    } catch {
      context = options.context;
    }
  }

  // Generate fix using LLM
  console.log(pc.bold("Generating Fix...\n"));

  const fix = await generateFixWithLLM(options.error, fileContents, context);

  console.log(pc.bold("Analysis:"));
  console.log(`  ${fix.analysis}`);
  console.log("");

  console.log(pc.bold("Root Cause:"));
  console.log(`  ${fix.rootCause}`);
  console.log("");

  console.log(pc.bold("Suggested Fix:"));
  console.log(`  ${fix.suggestedFix.description}`);
  console.log(`  Confidence: ${Math.round(fix.confidence * 100)}%`);
  console.log("");

  // If no changes suggested or low confidence, exit
  if (fix.suggestedFix.files.length === 0) {
    console.log(
      pc.yellow(
        "⚠️  No automatic fix available. Manual intervention required.",
      ),
    );
    process.exit(1);
  }

  if (fix.confidence < 0.5) {
    console.log(
      pc.yellow(
        `⚠️  Low confidence (${Math.round(fix.confidence * 100)}%). Skipping automatic fix.`,
      ),
    );
    process.exit(1);
  }

  // In auto mode, apply changes without confirmation
  if (!options.auto) {
    const shouldApply = await p.confirm({
      message: "Apply suggested changes?",
      initialValue: false,
    });

    if (p.isCancel(shouldApply) || !shouldApply) {
      console.log(pc.dim("Fix cancelled."));
      process.exit(0);
    }
  }

  // Apply changes
  console.log(pc.bold("\nApplying Changes...\n"));

  await applyChanges(fix.suggestedFix.files, options.dryRun || false);

  if (options.dryRun) {
    console.log(pc.yellow("\n⚠️  Dry run complete. No changes were made."));
    process.exit(0);
  }

  // Commit and push in auto mode
  if (options.auto) {
    console.log(pc.bold("\nCommitting and Pushing...\n"));

    // Determine scope from error or files
    const scope =
      filePaths.length > 0
        ? dirname(relative(cwd, filePaths[0])).split("/")[0] || "core"
        : "core";

    const commitMessage = `fix(${scope}): auto-heal pipeline failure

${fix.rootCause}

Auto-generated fix with ${Math.round(fix.confidence * 100)}% confidence.
`;

    const result = await commitAndPush(commitMessage, cwd);

    if (result.success) {
      console.log(pc.green("✅ Fix applied, committed, and pushed!"));
    } else {
      console.log(pc.red(`❌ Failed to commit/push: ${result.error}`));
      process.exit(1);
    }
  } else {
    console.log(pc.green("\n✅ Fix applied! Don't forget to commit and push."));
  }
}
