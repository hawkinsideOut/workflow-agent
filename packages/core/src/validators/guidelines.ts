/**
 * Guideline validators for checking mandatory guidelines
 * and GitHub Actions CI setup
 */

import { existsSync } from "fs";
import { readFile, readdir } from "fs/promises";
import { join } from "path";
import type { WorkflowConfig, GuidelinesConfig } from "../config/schema.js";
import {
  getMandatoryTemplateFilenames,
  templateMetadata,
} from "../templates/metadata.js";

export interface GuidelineValidationResult {
  valid: boolean;
  missingMandatory: string[];
  presentMandatory: string[];
  presentOptional: string[];
  errors: string[];
}

export interface CIValidationResult {
  valid: boolean;
  hasWorkflowFile: boolean;
  hasLintCheck: boolean;
  hasTypecheckCheck: boolean;
  hasFormatCheck: boolean;
  hasBuildCheck: boolean;
  hasTestCheck: boolean;
  errors: string[];
  warnings: string[];
}

/**
 * Get the effective list of mandatory templates considering user overrides
 */
export function getEffectiveMandatoryTemplates(
  guidelinesConfig?: GuidelinesConfig,
): string[] {
  const coreMandatory = getMandatoryTemplateFilenames();

  if (!guidelinesConfig) {
    return coreMandatory;
  }

  let mandatory = [...coreMandatory];

  // Add additional mandatory templates from user config
  if (guidelinesConfig.additionalMandatory) {
    for (const template of guidelinesConfig.additionalMandatory) {
      if (!mandatory.includes(template) && templateMetadata[template]) {
        mandatory.push(template);
      }
    }
  }

  // Remove templates that user has overridden as optional
  if (guidelinesConfig.optionalOverrides) {
    mandatory = mandatory.filter(
      (t) => !guidelinesConfig.optionalOverrides!.includes(t),
    );
  }

  return mandatory;
}

/**
 * Validate that all mandatory guidelines exist in the project
 */
export async function validateGuidelinesExist(
  projectPath: string = process.cwd(),
  config?: WorkflowConfig,
): Promise<GuidelineValidationResult> {
  const guidelinesDir = join(projectPath, "guidelines");
  const result: GuidelineValidationResult = {
    valid: true,
    missingMandatory: [],
    presentMandatory: [],
    presentOptional: [],
    errors: [],
  };

  // Check if guidelines directory exists
  if (!existsSync(guidelinesDir)) {
    const mandatory = getEffectiveMandatoryTemplates(config?.guidelines);
    result.valid = false;
    result.missingMandatory = mandatory;
    result.errors.push(
      "Guidelines directory does not exist. Run: workflow init",
    );
    return result;
  }

  // Get list of files in guidelines directory
  let existingFiles: string[] = [];
  try {
    existingFiles = await readdir(guidelinesDir);
  } catch (error) {
    result.valid = false;
    result.errors.push(
      `Cannot read guidelines directory: ${error instanceof Error ? error.message : String(error)}`,
    );
    return result;
  }

  // Get mandatory templates
  const mandatory = getEffectiveMandatoryTemplates(config?.guidelines);

  // Check each mandatory template
  for (const template of mandatory) {
    if (existingFiles.includes(template)) {
      result.presentMandatory.push(template);
    } else {
      result.missingMandatory.push(template);
    }
  }

  // Track optional templates that are present
  const allTemplateNames = Object.keys(templateMetadata);
  for (const file of existingFiles) {
    if (allTemplateNames.includes(file) && !mandatory.includes(file)) {
      result.presentOptional.push(file);
    }
  }

  if (result.missingMandatory.length > 0) {
    result.valid = false;
    result.errors.push(
      `Missing mandatory guidelines: ${result.missingMandatory.join(", ")}. Run: workflow init`,
    );
  }

  return result;
}

/**
 * Validate GitHub Actions CI workflow setup
 */
export async function validateGitHubActionsSetup(
  projectPath: string = process.cwd(),
): Promise<CIValidationResult> {
  const workflowsDir = join(projectPath, ".github", "workflows");
  const result: CIValidationResult = {
    valid: true,
    hasWorkflowFile: false,
    hasLintCheck: false,
    hasTypecheckCheck: false,
    hasFormatCheck: false,
    hasBuildCheck: false,
    hasTestCheck: false,
    errors: [],
    warnings: [],
  };

  // Check if .github/workflows directory exists
  if (!existsSync(workflowsDir)) {
    result.valid = false;
    result.errors.push(
      "GitHub Actions workflows directory does not exist. Run: workflow github:setup",
    );
    return result;
  }

  // Look for CI workflow files
  let workflowFiles: string[] = [];
  try {
    workflowFiles = await readdir(workflowsDir);
  } catch (error) {
    result.valid = false;
    result.errors.push(
      `Cannot read workflows directory: ${error instanceof Error ? error.message : String(error)}`,
    );
    return result;
  }

  // Find CI-related workflow files
  const ciWorkflowNames = [
    "ci.yml",
    "ci.yaml",
    "main.yml",
    "main.yaml",
    "build.yml",
    "build.yaml",
    "test.yml",
    "test.yaml",
  ];
  const ciWorkflows = workflowFiles.filter((f) =>
    ciWorkflowNames.includes(f.toLowerCase()),
  );

  if (ciWorkflows.length === 0) {
    result.valid = false;
    result.errors.push("No CI workflow file found. Run: workflow github:setup");
    return result;
  }

  result.hasWorkflowFile = true;

  // Parse the first CI workflow file and check for required checks
  const workflowPath = join(workflowsDir, ciWorkflows[0]);
  let workflowContent = "";

  try {
    workflowContent = await readFile(workflowPath, "utf-8");
  } catch (error) {
    result.warnings.push(
      `Cannot read workflow file: ${error instanceof Error ? error.message : String(error)}`,
    );
    return result;
  }

  // Check for each required check (simple string matching)
  const contentLower = workflowContent.toLowerCase();

  // Check for lint
  if (contentLower.includes("lint") || contentLower.includes("eslint")) {
    result.hasLintCheck = true;
  } else {
    result.warnings.push("CI workflow may be missing lint check");
  }

  // Check for typecheck
  if (
    contentLower.includes("typecheck") ||
    contentLower.includes("type-check") ||
    contentLower.includes("tsc")
  ) {
    result.hasTypecheckCheck = true;
  } else {
    result.warnings.push("CI workflow may be missing typecheck");
  }

  // Check for format/prettier
  if (contentLower.includes("format") || contentLower.includes("prettier")) {
    result.hasFormatCheck = true;
  } else {
    result.warnings.push("CI workflow may be missing format check");
  }

  // Check for build
  if (contentLower.includes("build")) {
    result.hasBuildCheck = true;
  } else {
    result.warnings.push("CI workflow may be missing build step");
  }

  // Check for test
  if (contentLower.includes("test") && !contentLower.includes("typecheck")) {
    result.hasTestCheck = true;
  } else {
    result.warnings.push("CI workflow may be missing test step");
  }

  // Determine overall validity based on mandatory checks
  const mandatoryChecks = [
    result.hasLintCheck,
    result.hasTypecheckCheck,
    result.hasFormatCheck,
  ];
  if (!mandatoryChecks.every(Boolean)) {
    result.valid = false;
    result.errors.push(
      "CI workflow is missing mandatory checks (lint, typecheck, format)",
    );
  }

  return result;
}

/**
 * Quick check if guidelines are valid (for pre-commit hook)
 */
export async function quickGuidelinesCheck(
  projectPath: string = process.cwd(),
  config?: WorkflowConfig,
): Promise<{ valid: boolean; message: string }> {
  const result = await validateGuidelinesExist(projectPath, config);

  if (result.valid) {
    return { valid: true, message: "All mandatory guidelines present" };
  }

  return {
    valid: false,
    message: `Missing guidelines: ${result.missingMandatory.join(", ")}`,
  };
}
