/**
 * Visual testing report generation for GitHub
 */

import type { ComparisonResult } from "./compare.js";
import { createCheckRun, createPRComment } from "../github/client.js";

/**
 * Generate a markdown report for visual test results
 */
export function generateMarkdownReport(results: {
  passed: ComparisonResult[];
  failed: ComparisonResult[];
  total: number;
}): string {
  const { passed, failed, total } = results;

  const lines: string[] = [];

  // Header
  lines.push("## 👁️ Visual Testing Report");
  lines.push("");

  // Summary
  const passCount = passed.length;
  const failCount = failed.length;
  const passRate = total > 0 ? Math.round((passCount / total) * 100) : 0;

  if (failCount === 0) {
    lines.push(`✅ **All ${total} visual tests passed!**`);
  } else {
    lines.push(
      `⚠️ **${failCount} of ${total} visual tests detected differences** (${passRate}% pass rate)`,
    );
  }

  lines.push("");

  // Failed tests details
  if (failed.length > 0) {
    lines.push("### ❌ Failed Tests");
    lines.push("");

    for (const result of failed) {
      lines.push(`#### ${result.baseline.name}`);
      lines.push("");
      lines.push(`**URL:** ${result.baseline.url}`);
      lines.push(`**Summary:** ${result.summary}`);
      lines.push(`**Confidence:** ${Math.round(result.confidence * 100)}%`);
      lines.push("");

      if (result.differences.length > 0) {
        lines.push("| Area | Description | Severity |");
        lines.push("|------|-------------|----------|");
        for (const diff of result.differences) {
          const severityIcon =
            diff.severity === "critical"
              ? "🔴"
              : diff.severity === "major"
                ? "🟠"
                : "🟡";
          lines.push(
            `| ${diff.area} | ${diff.description} | ${severityIcon} ${diff.severity} |`,
          );
        }
        lines.push("");
      }
    }
  }

  // Passed tests summary
  if (passed.length > 0) {
    lines.push("### ✅ Passed Tests");
    lines.push("");
    lines.push("| Baseline | URL | Confidence |");
    lines.push("|----------|-----|------------|");
    for (const result of passed) {
      lines.push(
        `| ${result.baseline.name} | ${result.baseline.url} | ${Math.round(result.confidence * 100)}% |`,
      );
    }
    lines.push("");
  }

  // Footer
  lines.push("---");
  lines.push(
    "_Visual testing powered by [workflow-agent](https://github.com/hawkinsideOut/workflow-agent) + LLM vision_",
  );

  return lines.join("\n");
}

/**
 * Post visual test results as a GitHub check run
 */
export async function postCheckRun(
  installationId: number,
  owner: string,
  repo: string,
  headSha: string,
  results: {
    passed: ComparisonResult[];
    failed: ComparisonResult[];
    total: number;
  },
): Promise<number> {
  const { failed, total } = results;
  const hasFailures = failed.length > 0;

  const summary = hasFailures
    ? `${failed.length} of ${total} visual tests detected differences`
    : `All ${total} visual tests passed`;

  const text = generateMarkdownReport(results);

  // Create annotations for failed tests
  const annotations = failed.slice(0, 50).map((result) => ({
    path: ".github/visual-tests.json", // Placeholder path
    start_line: 1,
    end_line: 1,
    annotation_level: "warning" as const,
    message: `Visual difference detected in ${result.baseline.name}: ${result.summary}`,
  }));

  return createCheckRun(
    installationId,
    owner,
    repo,
    headSha,
    "Visual Testing",
    "completed",
    hasFailures ? "failure" : "success",
    {
      title: summary,
      summary,
      text,
      annotations: annotations.length > 0 ? annotations : undefined,
    },
  );
}

/**
 * Post visual test results as a PR comment
 */
export async function postPRComment(
  installationId: number,
  owner: string,
  repo: string,
  prNumber: number,
  results: {
    passed: ComparisonResult[];
    failed: ComparisonResult[];
    total: number;
  },
): Promise<number> {
  const body = generateMarkdownReport(results);
  return createPRComment(installationId, owner, repo, prNumber, body);
}

/**
 * Generate a summary for terminal output
 */
export function generateTerminalSummary(results: {
  passed: ComparisonResult[];
  failed: ComparisonResult[];
  total: number;
}): string {
  const { passed, failed, total } = results;
  const lines: string[] = [];

  lines.push("");
  lines.push(
    "╔══════════════════════════════════════════════════════════════╗",
  );
  lines.push(
    "║                   VISUAL TEST RESULTS                        ║",
  );
  lines.push(
    "╚══════════════════════════════════════════════════════════════╝",
  );
  lines.push("");

  if (failed.length === 0) {
    lines.push(`  ✅ All ${total} visual tests passed!`);
  } else {
    lines.push(`  ❌ ${failed.length}/${total} tests detected differences`);
    lines.push("");

    for (const result of failed) {
      lines.push(`  📸 ${result.baseline.name}`);
      lines.push(`     URL: ${result.baseline.url}`);
      lines.push(`     ${result.summary}`);

      for (const diff of result.differences) {
        const icon =
          diff.severity === "critical"
            ? "🔴"
            : diff.severity === "major"
              ? "🟠"
              : "🟡";
        lines.push(`     ${icon} [${diff.area}] ${diff.description}`);
      }
      lines.push("");
    }
  }

  if (passed.length > 0) {
    lines.push(`  ✅ Passed: ${passed.map((r) => r.baseline.name).join(", ")}`);
  }

  lines.push("");

  return lines.join("\n");
}
