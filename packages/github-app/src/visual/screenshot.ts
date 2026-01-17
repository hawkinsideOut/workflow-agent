/**
 * Playwright screenshot capture for visual testing
 */

import { chromium, type Browser, devices } from "playwright";
import { mkdirSync, existsSync, writeFileSync, readFileSync } from "fs";
import { dirname, join } from "path";
import { getEnv } from "../config/env.js";

let _browser: Browser | null = null;

/**
 * Get or create a browser instance
 */
async function getBrowser(): Promise<Browser> {
  if (_browser && _browser.isConnected()) {
    return _browser;
  }

  _browser = await chromium.launch({
    headless: true,
    args: [
      "--no-sandbox",
      "--disable-setuid-sandbox",
      "--disable-dev-shm-usage",
      "--disable-gpu",
    ],
  });

  return _browser;
}

/**
 * Screenshot options
 */
export interface ScreenshotOptions {
  /** Viewport width in pixels */
  width?: number;
  /** Viewport height in pixels */
  height?: number;
  /** Whether to capture full page or just viewport */
  fullPage?: boolean;
  /** Wait for this selector before capturing */
  waitForSelector?: string;
  /** Wait for network to be idle */
  waitForNetworkIdle?: boolean;
  /** Additional wait time in ms after page load */
  delay?: number;
  /** Device to emulate (e.g., 'iPhone 12') */
  device?: string;
  /** Dark mode preference */
  darkMode?: boolean;
  /** Custom CSS to inject before capture */
  customCSS?: string;
}

/**
 * Screenshot result
 */
export interface ScreenshotResult {
  /** Path where screenshot was saved */
  path: string;
  /** Screenshot as Buffer */
  buffer: Buffer;
  /** Viewport dimensions used */
  viewport: { width: number; height: number };
  /** URL that was captured */
  url: string;
  /** Timestamp of capture */
  timestamp: string;
}

/**
 * Capture a screenshot of a URL
 */
export async function captureScreenshot(
  url: string,
  outputPath: string,
  options: ScreenshotOptions = {},
): Promise<ScreenshotResult> {
  const {
    width = 1280,
    height = 720,
    fullPage = false,
    waitForSelector,
    waitForNetworkIdle = true,
    delay = 0,
    device,
    darkMode = false,
    customCSS,
  } = options;

  const browser = await getBrowser();

  // Create page with options
  const context = await browser.newContext({
    viewport: { width, height },
    colorScheme: darkMode ? "dark" : "light",
    ...(device && devices[device] ? { ...devices[device] } : {}),
  });

  const page = await context.newPage();

  try {
    // Navigate to the URL
    await page.goto(url, {
      waitUntil: waitForNetworkIdle ? "networkidle" : "load",
      timeout: 30000,
    });

    // Wait for specific selector if provided
    if (waitForSelector) {
      await page.waitForSelector(waitForSelector, { timeout: 10000 });
    }

    // Inject custom CSS if provided
    if (customCSS) {
      await page.addStyleTag({ content: customCSS });
    }

    // Additional delay if needed
    if (delay > 0) {
      await page.waitForTimeout(delay);
    }

    // Ensure output directory exists
    const dir = dirname(outputPath);
    if (!existsSync(dir)) {
      mkdirSync(dir, { recursive: true });
    }

    // Capture screenshot
    const buffer = await page.screenshot({
      path: outputPath,
      fullPage,
      type: "png",
    });

    return {
      path: outputPath,
      buffer: Buffer.from(buffer),
      viewport: { width, height },
      url,
      timestamp: new Date().toISOString(),
    };
  } finally {
    await context.close();
  }
}

/**
 * Capture multiple screenshots with different viewport sizes
 */
export async function captureResponsiveScreenshots(
  url: string,
  outputDir: string,
  baseName: string,
  viewports: Array<{ name: string; width: number; height: number }> = [
    { name: "mobile", width: 375, height: 667 },
    { name: "tablet", width: 768, height: 1024 },
    { name: "desktop", width: 1280, height: 720 },
    { name: "wide", width: 1920, height: 1080 },
  ],
): Promise<ScreenshotResult[]> {
  const results: ScreenshotResult[] = [];

  for (const viewport of viewports) {
    const outputPath = join(
      outputDir,
      `${baseName}-${viewport.name}-${viewport.width}x${viewport.height}.png`,
    );

    const result = await captureScreenshot(url, outputPath, {
      width: viewport.width,
      height: viewport.height,
    });

    results.push(result);
  }

  return results;
}

/**
 * Read a screenshot from disk as Buffer
 */
export function readScreenshot(path: string): Buffer {
  if (!existsSync(path)) {
    throw new Error(`Screenshot not found: ${path}`);
  }
  return readFileSync(path);
}

/**
 * Save a screenshot buffer to disk
 */
export function saveScreenshot(buffer: Buffer, path: string): void {
  const dir = dirname(path);
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true });
  }
  writeFileSync(path, buffer);
}

/**
 * Get the baseline directory for a repository
 */
export function getBaselineDir(repoOwner?: string, repoName?: string): string {
  const env = getEnv();
  const baseDir = env.VISUAL_BASELINE_DIR;

  if (repoOwner && repoName) {
    return join(baseDir, repoOwner, repoName);
  }

  return baseDir;
}

/**
 * Close the browser instance
 */
export async function closeBrowser(): Promise<void> {
  if (_browser) {
    await _browser.close();
    _browser = null;
  }
}
