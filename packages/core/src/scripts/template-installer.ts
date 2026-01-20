/**
 * Silent template installer for postinstall and non-interactive contexts
 *
 * This module provides functions to copy mandatory templates without
 * user interaction, suitable for use in postinstall scripts.
 */

import { existsSync, readFileSync, writeFileSync, mkdirSync } from "fs";
import { readdirSync } from "fs";
import { join, basename } from "path";
import { getMandatoryTemplateFilenames } from "../templates/metadata.js";

export interface InstallTemplatesOptions {
  /** Force overwrite existing files */
  force?: boolean;
  /** Skip if guidelines directory already exists */
  skipIfExists?: boolean;
  /** Silent mode - no console output */
  silent?: boolean;
  /** Only install mandatory templates (default: true) */
  mandatoryOnly?: boolean;
}

export interface InstallTemplatesResult {
  success: boolean;
  installed: string[];
  skipped: string[];
  updated: string[];
  errors: string[];
  guidelinesExisted: boolean;
}

/**
 * Get project name from package.json or directory name
 */
function getProjectName(projectRoot: string): string {
  try {
    const pkgPath = join(projectRoot, "package.json");
    if (existsSync(pkgPath)) {
      const pkg = JSON.parse(readFileSync(pkgPath, "utf-8"));
      return pkg.name || basename(projectRoot);
    }
  } catch {
    // Ignore errors, fall back to directory name
  }
  return basename(projectRoot);
}

/**
 * Simple template variable substitution using {{variable}} syntax
 */
function renderTemplate(
  template: string,
  context: Record<string, string>,
): string {
  return template.replace(/\{\{(\w+)\}\}/g, (match, key) => {
    return context[key] ?? match;
  });
}

/**
 * Build default template context from project info
 * Uses generic defaults when no workflow.config.json exists
 */
function buildDefaultContext(projectRoot: string): Record<string, string> {
  const projectName = getProjectName(projectRoot);

  return {
    projectName,
    framework: "unknown",
    scopes: "feat, fix, docs, refactor, test, chore",
    scopeList: `- **feat** - New features
- **fix** - Bug fixes
- **docs** - Documentation
- **refactor** - Code refactoring
- **test** - Testing
- **chore** - Maintenance`,
    pathStructure: "N/A",
    enforcement: "strict",
    year: new Date().getFullYear().toString(),
  };
}

/**
 * Find the templates directory relative to this module
 * Works in both development and installed contexts
 */
export function findTemplatesDirectory(callerDirname: string): string | null {
  // When installed: dist/scripts/template-installer.js -> ../../templates
  // Try multiple possible locations
  const possiblePaths = [
    join(callerDirname, "../../templates"),
    join(callerDirname, "../templates"),
    join(callerDirname, "templates"),
  ];

  for (const templatePath of possiblePaths) {
    if (existsSync(templatePath)) {
      return templatePath;
    }
  }

  return null;
}

/**
 * Install mandatory templates to a project's guidelines directory
 * Designed for non-interactive use (postinstall, CI, etc.)
 */
export function installMandatoryTemplates(
  projectRoot: string,
  templatesDir: string,
  options: InstallTemplatesOptions = {},
): InstallTemplatesResult {
  const {
    force = false,
    skipIfExists = true,
    silent = false,
    mandatoryOnly = true,
  } = options;

  const result: InstallTemplatesResult = {
    success: true,
    installed: [],
    skipped: [],
    updated: [],
    errors: [],
    guidelinesExisted: false,
  };

  const guidelinesDir = join(projectRoot, "guidelines");
  result.guidelinesExisted = existsSync(guidelinesDir);

  // Skip if guidelines exists and skipIfExists is true
  if (result.guidelinesExisted && skipIfExists && !force) {
    if (!silent) {
      console.log("  Guidelines directory already exists, skipping templates");
    }
    return result;
  }

  // Get list of templates to install
  const mandatoryFiles = getMandatoryTemplateFilenames();

  // Check templates directory exists
  if (!existsSync(templatesDir)) {
    result.success = false;
    result.errors.push(`Templates directory not found: ${templatesDir}`);
    return result;
  }

  // Get available template files
  let availableFiles: string[];
  try {
    availableFiles = readdirSync(templatesDir).filter((f) => f.endsWith(".md"));
  } catch (error) {
    result.success = false;
    result.errors.push(`Failed to read templates directory: ${error}`);
    return result;
  }

  // Determine which files to install
  const filesToInstall = mandatoryOnly
    ? availableFiles.filter((f) => mandatoryFiles.includes(f))
    : availableFiles;

  if (filesToInstall.length === 0) {
    result.success = false;
    result.errors.push("No template files found to install");
    return result;
  }

  // Build template context
  const context = buildDefaultContext(projectRoot);

  // Create guidelines directory
  try {
    mkdirSync(guidelinesDir, { recursive: true });
  } catch (error) {
    result.success = false;
    result.errors.push(`Failed to create guidelines directory: ${error}`);
    return result;
  }

  // Copy each template
  for (const filename of filesToInstall) {
    const sourcePath = join(templatesDir, filename);
    const destPath = join(guidelinesDir, filename);

    const fileExists = existsSync(destPath);

    // Skip if file exists and not forcing
    if (fileExists && !force) {
      result.skipped.push(filename);
      continue;
    }

    try {
      const template = readFileSync(sourcePath, "utf-8");
      const rendered = renderTemplate(template, context);
      writeFileSync(destPath, rendered, "utf-8");

      if (fileExists) {
        result.updated.push(filename);
      } else {
        result.installed.push(filename);
      }
    } catch (error) {
      result.errors.push(`Failed to install ${filename}: ${error}`);
    }
  }

  // Log results if not silent
  if (!silent) {
    if (result.installed.length > 0) {
      console.log(
        `\n✓ Installed ${result.installed.length} guideline templates:`,
      );
      for (const file of result.installed) {
        console.log(`    - ${file}`);
      }
    }
    if (result.updated.length > 0) {
      console.log(`\n✓ Updated ${result.updated.length} guideline templates:`);
      for (const file of result.updated) {
        console.log(`    - ${file}`);
      }
    }
  }

  return result;
}

/**
 * Update templates - reinstall templates with option to force or skip existing
 */
export function updateTemplates(
  projectRoot: string,
  templatesDir: string,
  options: { force?: boolean; silent?: boolean } = {},
): InstallTemplatesResult {
  return installMandatoryTemplates(projectRoot, templatesDir, {
    ...options,
    skipIfExists: false, // Don't skip - we want to update
    mandatoryOnly: false, // Install all templates during update
  });
}
