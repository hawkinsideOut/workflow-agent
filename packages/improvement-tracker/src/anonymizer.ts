import * as path from "node:path";
import type {
  FixPattern,
  Blueprint,
  SolutionPattern,
  SolutionStep,
  SolutionFile,
  KeyFile,
  ConfigEntry,
} from "./patterns-schema";

// ============================================
// Types
// ============================================

/** Anonymization options */
export interface AnonymizationOptions {
  /** Replace absolute paths with relative placeholders */
  anonymizePaths: boolean;
  /** Remove or hash potential identifiers in content */
  anonymizeContent: boolean;
  /** Remove error messages that might contain paths */
  anonymizeErrorMessages: boolean;
  /** Replace package names with generic placeholders */
  anonymizePackageNames: boolean;
}

/** Default anonymization options */
export const DEFAULT_ANONYMIZATION_OPTIONS: AnonymizationOptions = {
  anonymizePaths: true,
  anonymizeContent: true,
  anonymizeErrorMessages: true,
  anonymizePackageNames: false, // Package names are usually safe
};

/** Result of anonymization */
export interface AnonymizationResult<T> {
  success: boolean;
  data?: T;
  /** Fields that were anonymized */
  anonymizedFields?: string[];
  error?: string;
}

// ============================================
// Regex Patterns
// ============================================

/** Common PII patterns to detect and replace */
const PII_PATTERNS = {
  // Absolute paths (Unix and Windows)
  absoluteUnixPath: /\/(?:home|Users|var|tmp)\/[^\s:]+/g,
  absoluteWindowsPath: /[A-Z]:\\(?:Users|Documents|Projects)[^\s:]+/gi,

  // Usernames in paths
  usernameInPath: /\/(?:home|Users)\/([a-zA-Z0-9_-]+)\//g,

  // Email addresses
  email: /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g,

  // IP addresses
  ipAddress: /\b\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}\b/g,

  // URLs with potential identifying info
  authenticatedUrl: /https?:\/\/[^:]+:[^@]+@[^\s]+/g,

  // API keys and tokens (common patterns)
  apiKey:
    /(?:api[_-]?key|token|secret|password|auth)[=:]\s*["']?[a-zA-Z0-9_-]{20,}["']?/gi,

  // Git remote URLs with usernames
  gitRemoteWithUser: /git@[^:]+:[^\s]+/g,

  // AWS account IDs
  awsAccountId: /\b\d{12}\b/g,

  // Common secret patterns
  secretPattern:
    /(?:sk_|pk_|ghp_|gho_|ghu_|ghs_|ghr_|xox[bpsr])[a-zA-Z0-9_-]+/g,
};

/** Placeholder values for anonymization */
const PLACEHOLDERS = {
  path: "<PATH>",
  username: "<USER>",
  email: "<EMAIL>",
  ip: "<IP>",
  url: "<URL>",
  apiKey: "<API_KEY>",
  secret: "<SECRET>",
  packageName: "<PACKAGE>",
};

// ============================================
// PatternAnonymizer Class
// ============================================

/**
 * Anonymizes patterns by removing or replacing potentially identifying information.
 * Ensures patterns can be safely shared without exposing PII.
 */
export class PatternAnonymizer {
  private readonly options: AnonymizationOptions;

  constructor(options: Partial<AnonymizationOptions> = {}) {
    this.options = { ...DEFAULT_ANONYMIZATION_OPTIONS, ...options };
  }

  // ============================================
  // Fix Pattern Anonymization
  // ============================================

  /**
   * Anonymize a fix pattern for sharing
   */
  anonymizeFixPattern(pattern: FixPattern): AnonymizationResult<FixPattern> {
    try {
      const anonymizedFields: string[] = [];
      let anonymized = { ...pattern };

      // Anonymize trigger
      if (this.options.anonymizeErrorMessages && pattern.trigger.errorMessage) {
        const anonMessage = this.anonymizeString(pattern.trigger.errorMessage);
        if (anonMessage !== pattern.trigger.errorMessage) {
          anonymizedFields.push("trigger.errorMessage");
        }
        anonymized = {
          ...anonymized,
          trigger: {
            ...anonymized.trigger,
            errorMessage: anonMessage,
          },
        };
      }

      if (this.options.anonymizeContent && pattern.trigger.context) {
        const anonContext = this.anonymizeString(pattern.trigger.context);
        if (anonContext !== pattern.trigger.context) {
          anonymizedFields.push("trigger.context");
        }
        anonymized = {
          ...anonymized,
          trigger: {
            ...anonymized.trigger,
            context: anonContext,
          },
        };
      }

      // Anonymize solution steps
      const anonSteps = pattern.solution.steps.map((step, index) => {
        const anonStep = this.anonymizeSolutionStep(step);
        if (JSON.stringify(anonStep) !== JSON.stringify(step)) {
          anonymizedFields.push(`solution.steps[${index}]`);
        }
        return anonStep;
      });

      anonymized = {
        ...anonymized,
        solution: {
          ...anonymized.solution,
          steps: anonSteps,
        },
      };

      // Remove contributor ID if present (will be re-added during sync)
      if (anonymized.contributorId) {
        anonymizedFields.push("contributorId");
        const { contributorId: _, ...rest } = anonymized;
        anonymized = rest as FixPattern;
      }

      return {
        success: true,
        data: anonymized,
        anonymizedFields,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  }

  /**
   * Anonymize a solution step
   */
  private anonymizeSolutionStep(step: SolutionStep): SolutionStep {
    const result = { ...step };

    if (this.options.anonymizePaths) {
      result.target = this.anonymizePath(step.target);
    }

    if (this.options.anonymizeContent && step.content) {
      result.content = this.anonymizeString(step.content);
    }

    if (this.options.anonymizeContent) {
      result.description = this.anonymizeString(step.description);
    }

    return result;
  }

  // ============================================
  // Blueprint Anonymization
  // ============================================

  /**
   * Anonymize a blueprint for sharing
   */
  anonymizeBlueprint(blueprint: Blueprint): AnonymizationResult<Blueprint> {
    try {
      const anonymizedFields: string[] = [];
      let anonymized = { ...blueprint };

      // Anonymize key files
      if (this.options.anonymizeContent) {
        const anonKeyFiles = blueprint.structure.keyFiles.map((file, index) => {
          const anonFile = this.anonymizeKeyFile(file);
          if (JSON.stringify(anonFile) !== JSON.stringify(file)) {
            anonymizedFields.push(`structure.keyFiles[${index}]`);
          }
          return anonFile;
        });

        anonymized = {
          ...anonymized,
          structure: {
            ...anonymized.structure,
            keyFiles: anonKeyFiles,
          },
        };
      }

      // Anonymize config entries
      if (this.options.anonymizeContent) {
        const anonConfigs = blueprint.setup.configs.map((config, index) => {
          const anonConfig = this.anonymizeConfigEntry(config);
          if (JSON.stringify(anonConfig) !== JSON.stringify(config)) {
            anonymizedFields.push(`setup.configs[${index}]`);
          }
          return anonConfig;
        });

        anonymized = {
          ...anonymized,
          setup: {
            ...anonymized.setup,
            configs: anonConfigs,
          },
        };
      }

      // Anonymize setup steps
      if (this.options.anonymizeContent) {
        const anonSteps = blueprint.setup.steps.map((step, index) => {
          const anonCommand = this.anonymizeString(step.command);
          if (anonCommand !== step.command) {
            anonymizedFields.push(`setup.steps[${index}].command`);
          }
          return {
            ...step,
            command: anonCommand,
          };
        });

        anonymized = {
          ...anonymized,
          setup: {
            ...anonymized.setup,
            steps: anonSteps,
          },
        };
      }

      // Remove contributor ID
      if (anonymized.contributorId) {
        anonymizedFields.push("contributorId");
        const { contributorId: _, ...rest } = anonymized;
        anonymized = rest as Blueprint;
      }

      return {
        success: true,
        data: anonymized,
        anonymizedFields,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  }

  /**
   * Anonymize a key file entry
   */
  private anonymizeKeyFile(file: KeyFile): KeyFile {
    const result = { ...file };

    if (this.options.anonymizePaths) {
      result.path = this.anonymizeRelativePath(file.path);
    }

    if (this.options.anonymizeContent && file.template) {
      result.template = this.anonymizeString(file.template);
    }

    return result;
  }

  /**
   * Anonymize a config entry
   */
  private anonymizeConfigEntry(config: ConfigEntry): ConfigEntry {
    const result = { ...config };

    if (this.options.anonymizePaths) {
      result.file = this.anonymizeRelativePath(config.file);
    }

    if (this.options.anonymizeContent) {
      result.content = this.anonymizeString(config.content);
    }

    return result;
  }

  // ============================================
  // String Anonymization
  // ============================================

  /**
   * Anonymize a string by replacing PII patterns
   */
  anonymizeString(input: string): string {
    let result = input;

    // Replace absolute paths
    result = result.replace(PII_PATTERNS.absoluteUnixPath, PLACEHOLDERS.path);
    result = result.replace(
      PII_PATTERNS.absoluteWindowsPath,
      PLACEHOLDERS.path,
    );

    // Replace usernames in paths
    result = result.replace(
      PII_PATTERNS.usernameInPath,
      `/home/${PLACEHOLDERS.username}/`,
    );

    // Replace emails
    result = result.replace(PII_PATTERNS.email, PLACEHOLDERS.email);

    // Replace IP addresses
    result = result.replace(PII_PATTERNS.ipAddress, PLACEHOLDERS.ip);

    // Replace authenticated URLs
    result = result.replace(PII_PATTERNS.authenticatedUrl, PLACEHOLDERS.url);

    // Replace API keys and secrets
    result = result.replace(PII_PATTERNS.apiKey, PLACEHOLDERS.apiKey);
    result = result.replace(PII_PATTERNS.secretPattern, PLACEHOLDERS.secret);

    // Replace git remotes with usernames
    result = result.replace(PII_PATTERNS.gitRemoteWithUser, PLACEHOLDERS.url);

    return result;
  }

  /**
   * Anonymize a path (converts absolute to relative placeholder)
   */
  anonymizePath(inputPath: string): string {
    // Check if it's an absolute path
    if (path.isAbsolute(inputPath)) {
      // Extract just the relevant part (last 2-3 components)
      const parts = inputPath.split(path.sep).filter(Boolean);
      const relevantParts = parts.slice(-3);
      return relevantParts.join("/");
    }

    // For relative paths, just normalize
    return this.anonymizeRelativePath(inputPath);
  }

  /**
   * Anonymize a relative path (minimal changes)
   */
  private anonymizeRelativePath(inputPath: string): string {
    // Just normalize separators and remove any username-like patterns
    return inputPath.replace(/\\/g, "/").replace(/\/users\/[^/]+\//gi, "/");
  }

  // ============================================
  // Validation
  // ============================================
  // Solution Pattern Anonymization
  // ============================================

  /**
   * Anonymize a solution pattern for sharing
   */
  anonymizeSolution(solution: SolutionPattern): AnonymizationResult<SolutionPattern> {
    try {
      const anonymizedFields: string[] = [];
      let anonymized = { ...solution };

      // Anonymize implementation files
      if (this.options.anonymizeContent) {
        const anonFiles = solution.implementation.files.map((file, index) => {
          const anonFile = this.anonymizeSolutionFile(file);
          if (JSON.stringify(anonFile) !== JSON.stringify(file)) {
            anonymizedFields.push(`implementation.files[${index}]`);
          }
          return anonFile;
        });

        anonymized = {
          ...anonymized,
          implementation: {
            ...anonymized.implementation,
            files: anonFiles,
          },
        };
      }

      // Anonymize architecture notes
      if (this.options.anonymizeContent && solution.architecture) {
        const anonDataFlow = this.anonymizeString(solution.architecture.dataFlow);
        const anonDecisions = solution.architecture.keyDecisions.map(d => this.anonymizeString(d));
        const anonDiagram = solution.architecture.diagram 
          ? this.anonymizeString(solution.architecture.diagram)
          : undefined;

        if (anonDataFlow !== solution.architecture.dataFlow) {
          anonymizedFields.push("architecture.dataFlow");
        }

        anonymized = {
          ...anonymized,
          architecture: {
            ...anonymized.architecture,
            dataFlow: anonDataFlow,
            keyDecisions: anonDecisions,
            diagram: anonDiagram,
          },
        };
      }

      // Remove source project reference
      if (anonymized.sourceProject) {
        anonymizedFields.push("sourceProject");
        anonymized = {
          ...anonymized,
          sourceProject: undefined,
        };
      }

      // Remove contributor ID
      if (anonymized.contributorId) {
        anonymizedFields.push("contributorId");
        const { contributorId: _, ...rest } = anonymized;
        anonymized = rest as SolutionPattern;
      }

      return {
        success: true,
        data: anonymized,
        anonymizedFields,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  }

  /**
   * Anonymize a solution file entry
   */
  private anonymizeSolutionFile(file: SolutionFile): SolutionFile {
    const result = { ...file };

    if (this.options.anonymizePaths) {
      result.path = this.anonymizeRelativePath(file.path);
    }

    if (this.options.anonymizeContent && file.content) {
      result.content = this.anonymizeString(file.content);
    }

    return result;
  }

  // ============================================
  // PII Detection
  // ============================================

  /**
   * Check if a string contains potential PII
   */
  containsPII(input: string): boolean {
    return (
      PII_PATTERNS.absoluteUnixPath.test(input) ||
      PII_PATTERNS.absoluteWindowsPath.test(input) ||
      PII_PATTERNS.email.test(input) ||
      PII_PATTERNS.ipAddress.test(input) ||
      PII_PATTERNS.authenticatedUrl.test(input) ||
      PII_PATTERNS.apiKey.test(input) ||
      PII_PATTERNS.secretPattern.test(input)
    );
  }

  /**
   * Validate that a pattern is properly anonymized
   */
  validateAnonymization(pattern: FixPattern | Blueprint): {
    isClean: boolean;
    issues: string[];
  } {
    const issues: string[] = [];

    // Check description
    if (this.containsPII(pattern.description)) {
      issues.push("description contains potential PII");
    }

    // Check name
    if (this.containsPII(pattern.name)) {
      issues.push("name contains potential PII");
    }

    // Type-specific checks
    if ("trigger" in pattern) {
      const fix = pattern as FixPattern;
      if (
        fix.trigger.errorMessage &&
        this.containsPII(fix.trigger.errorMessage)
      ) {
        issues.push("trigger.errorMessage contains potential PII");
      }
      for (const step of fix.solution.steps) {
        if (step.content && this.containsPII(step.content)) {
          issues.push("solution step content contains potential PII");
        }
      }
    } else {
      const bp = pattern as Blueprint;
      for (const file of bp.structure.keyFiles) {
        if (file.template && this.containsPII(file.template)) {
          issues.push("keyFile template contains potential PII");
        }
      }
      for (const config of bp.setup.configs) {
        if (this.containsPII(config.content)) {
          issues.push("config content contains potential PII");
        }
      }
    }

    return {
      isClean: issues.length === 0,
      issues,
    };
  }
}

// ============================================
// Factory Function
// ============================================

/**
 * Create a new pattern anonymizer
 */
export function createAnonymizer(
  options?: Partial<AnonymizationOptions>,
): PatternAnonymizer {
  return new PatternAnonymizer(options);
}

// ============================================
// Convenience Functions
// ============================================

/**
 * Anonymize a fix pattern with default options
 */
export function anonymizeFixPattern(
  pattern: FixPattern,
): AnonymizationResult<FixPattern> {
  const anonymizer = new PatternAnonymizer();
  return anonymizer.anonymizeFixPattern(pattern);
}

/**
 * Anonymize a blueprint with default options
 */
export function anonymizeBlueprint(
  blueprint: Blueprint,
): AnonymizationResult<Blueprint> {
  const anonymizer = new PatternAnonymizer();
  return anonymizer.anonymizeBlueprint(blueprint);
}

/**
 * Anonymize a solution pattern with default options
 */
export function anonymizeSolution(
  solution: SolutionPattern,
): AnonymizationResult<SolutionPattern> {
  const anonymizer = new PatternAnonymizer();
  return anonymizer.anonymizeSolution(solution);
}
