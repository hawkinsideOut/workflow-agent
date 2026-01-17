/**
 * Visual comparison using LLM vision capabilities
 */

import { join } from "path";
import { compareImages } from "../llm/index.js";
import type { VisualCompareResult } from "../llm/types.js";
import {
  captureScreenshot,
  readScreenshot,
  getBaselineDir,
  type ScreenshotOptions,
} from "./screenshot.js";
import {
  getBaseline,
  upsertBaseline,
  recordComparison,
} from "../db/queries.js";
import type { VisualBaseline } from "../db/schema.js";

/**
 * Compare a URL against its baseline
 */
export interface CompareOptions {
  /** Screenshot capture options */
  screenshot?: ScreenshotOptions;
  /** Context about what to look for in the comparison */
  context?: string;
  /** Save the after screenshot even if comparison fails */
  saveAfter?: boolean;
  /** Repository context */
  repo?: {
    owner: string;
    name: string;
  };
  /** Commit SHA for tracking */
  commitSha?: string;
  /** PR number for tracking */
  prNumber?: number;
}

/**
 * Comparison result with metadata
 */
export interface ComparisonResult extends VisualCompareResult {
  /** The baseline that was compared against */
  baseline: VisualBaseline;
  /** Path to the "before" (baseline) screenshot */
  beforePath: string;
  /** Path to the "after" (current) screenshot */
  afterPath: string;
  /** Comparison record ID */
  comparisonId: number;
}

/**
 * Compare a URL against its stored baseline
 */
export async function compareWithBaseline(
  baselineName: string,
  url: string,
  options: CompareOptions = {},
): Promise<ComparisonResult> {
  const { screenshot = {}, context, repo, commitSha, prNumber } = options;

  // Get the baseline
  const baseline = getBaseline(baselineName, repo?.owner, repo?.name);

  if (!baseline) {
    throw new Error(
      `Baseline "${baselineName}" not found. Create one first with captureBaseline()`,
    );
  }

  // Read the baseline screenshot
  const beforeBuffer = readScreenshot(baseline.screenshot_path);

  // Capture current screenshot
  const baselineDir = getBaselineDir(repo?.owner, repo?.name);
  const afterPath = join(
    baselineDir,
    "comparisons",
    `${baselineName}-${Date.now()}.png`,
  );

  const currentScreenshot = await captureScreenshot(url, afterPath, {
    ...screenshot,
    width: baseline.viewport_width,
    height: baseline.viewport_height,
  });

  // Compare using LLM
  const comparisonContext = [
    context,
    `Comparing URL: ${url}`,
    `Baseline: ${baselineName}`,
    `Viewport: ${baseline.viewport_width}x${baseline.viewport_height}`,
  ]
    .filter(Boolean)
    .join("\n");

  const result = await compareImages(
    beforeBuffer,
    currentScreenshot.buffer,
    comparisonContext,
  );

  // Record the comparison in database
  const comparisonRecord = recordComparison(
    baseline.id,
    baseline.screenshot_path,
    afterPath,
    result.hasDifferences,
    result.summary,
    JSON.stringify(result.differences),
    result.confidence,
    "anthropic", // TODO: Get from config
    commitSha,
    prNumber,
  );

  return {
    ...result,
    baseline,
    beforePath: baseline.screenshot_path,
    afterPath,
    comparisonId: comparisonRecord.id,
  };
}

/**
 * Capture and save a new baseline
 */
export async function captureBaseline(
  name: string,
  url: string,
  options: {
    screenshot?: ScreenshotOptions;
    repo?: { owner: string; name: string };
  } = {},
): Promise<VisualBaseline> {
  const { screenshot = {}, repo } = options;
  const width = screenshot.width || 1280;
  const height = screenshot.height || 720;

  // Determine output path
  const baselineDir = getBaselineDir(repo?.owner, repo?.name);
  const outputPath = join(baselineDir, "baselines", `${name}.png`);

  // Capture the screenshot
  await captureScreenshot(url, outputPath, screenshot);

  // Save to database
  const baseline = upsertBaseline(
    name,
    url,
    outputPath,
    width,
    height,
    repo?.owner,
    repo?.name,
  );

  console.log(`✅ Baseline "${name}" saved to ${outputPath}`);

  return baseline;
}

/**
 * Update an existing baseline with a new screenshot
 */
export async function updateBaseline(
  name: string,
  options: {
    repo?: { owner: string; name: string };
    screenshot?: ScreenshotOptions;
  } = {},
): Promise<VisualBaseline> {
  const { repo, screenshot = {} } = options;

  // Get existing baseline
  const existing = getBaseline(name, repo?.owner, repo?.name);

  if (!existing) {
    throw new Error(`Baseline "${name}" not found`);
  }

  // Re-capture with same or new options
  const result = await captureBaseline(name, existing.url, {
    screenshot: {
      width: existing.viewport_width,
      height: existing.viewport_height,
      ...screenshot,
    },
    repo,
  });

  console.log(`✅ Baseline "${name}" updated`);

  return result;
}

/**
 * Run visual tests for all baselines in a repository
 */
export async function runVisualTests(options: {
  repo?: { owner: string; name: string };
  commitSha?: string;
  prNumber?: number;
  context?: string;
}): Promise<{
  passed: ComparisonResult[];
  failed: ComparisonResult[];
  total: number;
}> {
  const { repo, commitSha, prNumber, context } = options;

  // Get all baselines for this repo
  const baselines = await import("../db/queries.js").then((m) =>
    m.listBaselines(repo?.owner, repo?.name),
  );

  const passed: ComparisonResult[] = [];
  const failed: ComparisonResult[] = [];

  for (const baseline of baselines) {
    try {
      console.log(`🔍 Testing baseline: ${baseline.name}`);

      const result = await compareWithBaseline(baseline.name, baseline.url, {
        repo,
        commitSha,
        prNumber,
        context,
      });

      if (result.hasDifferences) {
        console.log(`❌ ${baseline.name}: ${result.summary}`);
        failed.push(result);
      } else {
        console.log(`✅ ${baseline.name}: No differences`);
        passed.push(result);
      }
    } catch (error) {
      console.error(`💥 ${baseline.name}: ${error}`);
      // Create a failed result for errors
      const errorResult = {
        hasDifferences: true,
        summary: `Error: ${error instanceof Error ? error.message : String(error)}`,
        differences: [
          {
            area: "Error",
            description: String(error),
            severity: "critical" as const,
          },
        ],
        confidence: 0,
        baseline,
        beforePath: baseline.screenshot_path,
        afterPath: "",
        comparisonId: -1,
      };
      failed.push(errorResult);
    }
  }

  return {
    passed,
    failed,
    total: baselines.length,
  };
}
