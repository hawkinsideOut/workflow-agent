/**
 * Visual testing module exports
 */

export {
  captureScreenshot,
  captureResponsiveScreenshots,
  readScreenshot,
  saveScreenshot,
  getBaselineDir,
  closeBrowser,
} from "./screenshot.js";

export type { ScreenshotOptions, ScreenshotResult } from "./screenshot.js";

export {
  compareWithBaseline,
  captureBaseline,
  updateBaseline,
  runVisualTests,
} from "./compare.js";

export type { CompareOptions, ComparisonResult } from "./compare.js";

export {
  generateMarkdownReport,
  postCheckRun,
  postPRComment,
  generateTerminalSummary,
} from "./report.js";
