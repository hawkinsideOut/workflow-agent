/**
 * Visual testing CLI commands
 * 
 * These commands provide local control over visual testing,
 * allowing developers to capture baselines and run comparisons
 * without needing the full GitHub App running.
 */

import { existsSync, mkdirSync, readFileSync, writeFileSync } from "fs";
import { dirname, join } from "path";
import * as p from "@clack/prompts";
import pc from "picocolors";

interface CaptureOptions {
  width?: string;
  height?: string;
  fullPage?: boolean;
  output?: string;
  waitFor?: string;
  delay?: string;
}

interface CompareOptions {
  baseline: string;
  output?: string;
  threshold?: string;
}

interface ListOptions {
  json?: boolean;
}

/**
 * Get the visual baselines directory
 */
function getBaselinesDir(): string {
  const cwd = process.cwd();
  return join(cwd, ".visual-baselines");
}

/**
 * Get baseline metadata file path
 */
function getMetadataPath(): string {
  return join(getBaselinesDir(), "baselines.json");
}

/**
 * Load baselines metadata
 */
function loadMetadata(): Record<
  string,
  {
    name: string;
    url: string;
    path: string;
    width: number;
    height: number;
    createdAt: string;
    updatedAt: string;
  }
> {
  const metadataPath = getMetadataPath();
  if (!existsSync(metadataPath)) {
    return {};
  }
  try {
    return JSON.parse(readFileSync(metadataPath, "utf-8"));
  } catch {
    return {};
  }
}

/**
 * Save baselines metadata
 */
function saveMetadata(
  metadata: Record<
    string,
    {
      name: string;
      url: string;
      path: string;
      width: number;
      height: number;
      createdAt: string;
      updatedAt: string;
    }
  >,
): void {
  const dir = getBaselinesDir();
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true });
  }
  writeFileSync(getMetadataPath(), JSON.stringify(metadata, null, 2));
}

/**
 * Check if Playwright is available
 */
async function checkPlaywright(): Promise<boolean> {
  try {
    await import("playwright");
    return true;
  } catch {
    return false;
  }
}

/**
 * Capture a baseline screenshot
 */
export async function visualCaptureCommand(
  name: string,
  url: string,
  options: CaptureOptions,
): Promise<void> {
  console.log(pc.cyan("\n📸 Capturing Visual Baseline\n"));

  // Check for Playwright
  const hasPlaywright = await checkPlaywright();
  if (!hasPlaywright) {
    console.log(pc.yellow("⚠️  Playwright is not installed."));
    console.log(pc.dim("Install it with: npm install playwright"));
    console.log(
      pc.dim("Then install browsers: npx playwright install chromium"),
    );
    process.exit(1);
  }

  const width = parseInt(options.width || "1280");
  const height = parseInt(options.height || "720");
  const delay = parseInt(options.delay || "0");

  console.log(`  Name: ${pc.bold(name)}`);
  console.log(`  URL: ${url}`);
  console.log(`  Viewport: ${width}x${height}`);
  console.log("");

  try {
    const { chromium } = await import("playwright");

    const browser = await chromium.launch({ headless: true });
    const context = await browser.newContext({
      viewport: { width, height },
    });
    const page = await context.newPage();

    console.log(pc.dim("  Loading page..."));
    await page.goto(url, { waitUntil: "networkidle" });

    if (options.waitFor) {
      console.log(pc.dim(`  Waiting for selector: ${options.waitFor}`));
      await page.waitForSelector(options.waitFor, { timeout: 10000 });
    }

    if (delay > 0) {
      console.log(pc.dim(`  Waiting ${delay}ms...`));
      await page.waitForTimeout(delay);
    }

    // Determine output path
    const baselinesDir = getBaselinesDir();
    const outputPath =
      options.output || join(baselinesDir, "screenshots", `${name}.png`);
    const outputDir = dirname(outputPath);

    if (!existsSync(outputDir)) {
      mkdirSync(outputDir, { recursive: true });
    }

    console.log(pc.dim("  Capturing screenshot..."));
    await page.screenshot({
      path: outputPath,
      fullPage: options.fullPage,
    });

    await browser.close();

    // Update metadata
    const metadata = loadMetadata();
    const now = new Date().toISOString();
    metadata[name] = {
      name,
      url,
      path: outputPath,
      width,
      height,
      createdAt: metadata[name]?.createdAt || now,
      updatedAt: now,
    };
    saveMetadata(metadata);

    console.log(pc.green(`\n✅ Baseline "${name}" saved to ${outputPath}`));
  } catch (error) {
    console.error(pc.red("\n❌ Failed to capture screenshot:"), error);
    process.exit(1);
  }
}

/**
 * Compare a URL against a baseline (local version without LLM)
 */
export async function visualCompareCommand(
  url: string,
  options: CompareOptions,
): Promise<void> {
  console.log(pc.cyan("\n🔍 Comparing Against Baseline\n"));

  const metadata = loadMetadata();
  const baseline = metadata[options.baseline];

  if (!baseline) {
    console.log(pc.red(`❌ Baseline "${options.baseline}" not found`));
    console.log(pc.dim("Available baselines:"));
    Object.keys(metadata).forEach((name) => {
      console.log(pc.dim(`  - ${name}`));
    });
    process.exit(1);
  }

  if (!existsSync(baseline.path)) {
    console.log(pc.red(`❌ Baseline screenshot not found: ${baseline.path}`));
    process.exit(1);
  }

  console.log(`  Baseline: ${pc.bold(options.baseline)}`);
  console.log(`  URL: ${url}`);
  console.log(`  Viewport: ${baseline.width}x${baseline.height}`);
  console.log("");

  // Check for Playwright
  const hasPlaywright = await checkPlaywright();
  if (!hasPlaywright) {
    console.log(pc.yellow("⚠️  Playwright is not installed."));
    process.exit(1);
  }

  try {
    const { chromium } = await import("playwright");

    const browser = await chromium.launch({ headless: true });
    const context = await browser.newContext({
      viewport: { width: baseline.width, height: baseline.height },
    });
    const page = await context.newPage();

    console.log(pc.dim("  Loading page..."));
    await page.goto(url, { waitUntil: "networkidle" });

    // Capture current screenshot
    const baselinesDir = getBaselinesDir();
    const comparePath =
      options.output ||
      join(
        baselinesDir,
        "comparisons",
        `${options.baseline}-${Date.now()}.png`,
      );
    const compareDir = dirname(comparePath);

    if (!existsSync(compareDir)) {
      mkdirSync(compareDir, { recursive: true });
    }

    console.log(pc.dim("  Capturing screenshot..."));
    await page.screenshot({ path: comparePath });

    await browser.close();

    // Read both images
    const baselineBuffer = readFileSync(baseline.path);
    const compareBuffer = readFileSync(comparePath);

    // Simple byte comparison (for basic difference detection)
    const areSameSize = baselineBuffer.length === compareBuffer.length;
    const areIdentical =
      areSameSize && baselineBuffer.equals(compareBuffer);

    console.log("");
    if (areIdentical) {
      console.log(pc.green("✅ Screenshots are identical"));
    } else {
      console.log(pc.yellow("⚠️  Screenshots differ"));
      console.log(pc.dim(`  Baseline size: ${baselineBuffer.length} bytes`));
      console.log(pc.dim(`  Current size: ${compareBuffer.length} bytes`));
      console.log("");
      console.log(
        pc.dim(
          "For detailed LLM-based comparison, use the GitHub App's visual testing.",
        ),
      );
      console.log(pc.dim(`Comparison saved to: ${comparePath}`));
      process.exit(1);
    }
  } catch (error) {
    console.error(pc.red("\n❌ Failed to compare:"), error);
    process.exit(1);
  }
}

/**
 * List all baselines
 */
export async function visualListCommand(options: ListOptions): Promise<void> {
  const metadata = loadMetadata();
  const baselines = Object.values(metadata);

  if (options.json) {
    console.log(JSON.stringify(baselines, null, 2));
    return;
  }

  if (baselines.length === 0) {
    console.log(pc.dim("No baselines found."));
    console.log(pc.dim("Create one with: workflow visual capture <name> <url>"));
    return;
  }

  console.log(pc.cyan("\n📸 Visual Baselines\n"));

  for (const baseline of baselines) {
    console.log(`  ${pc.bold(baseline.name)}`);
    console.log(`    URL: ${baseline.url}`);
    console.log(`    Viewport: ${baseline.width}x${baseline.height}`);
    console.log(`    Path: ${baseline.path}`);
    console.log(`    Updated: ${baseline.updatedAt}`);
    console.log("");
  }
}

/**
 * Update an existing baseline
 */
export async function visualUpdateCommand(
  name: string,
  options: CaptureOptions,
): Promise<void> {
  const metadata = loadMetadata();
  const baseline = metadata[name];

  if (!baseline) {
    console.log(pc.red(`❌ Baseline "${name}" not found`));
    process.exit(1);
  }

  console.log(pc.cyan(`\n🔄 Updating baseline "${name}"...\n`));

  // Re-capture with existing settings
  await visualCaptureCommand(name, baseline.url, {
    width: options.width || String(baseline.width),
    height: options.height || String(baseline.height),
    fullPage: options.fullPage,
    output: baseline.path,
  });
}

/**
 * Approve a comparison (copy current to baseline)
 */
export async function visualApproveCommand(name: string): Promise<void> {
  const metadata = loadMetadata();
  const baseline = metadata[name];

  if (!baseline) {
    console.log(pc.red(`❌ Baseline "${name}" not found`));
    process.exit(1);
  }

  const confirm = await p.confirm({
    message: `Update baseline "${name}" with the latest comparison?`,
    initialValue: false,
  });

  if (p.isCancel(confirm) || !confirm) {
    console.log(pc.dim("Cancelled."));
    return;
  }

  // Find the most recent comparison
  const baselinesDir = getBaselinesDir();
  const comparisonsDir = join(baselinesDir, "comparisons");

  if (!existsSync(comparisonsDir)) {
    console.log(pc.yellow("No comparisons found to approve."));
    return;
  }

  // This is a simplified version - real implementation would track comparisons
  console.log(
    pc.yellow(
      "To approve, re-capture the baseline with: workflow visual update " + name,
    ),
  );
}
