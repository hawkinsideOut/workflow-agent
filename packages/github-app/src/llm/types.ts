/**
 * LLM client type definitions
 */

/**
 * Result of a visual comparison between two images
 */
export interface VisualCompareResult {
  /** Whether differences were detected */
  hasDifferences: boolean;
  /** Brief summary of the comparison */
  summary: string;
  /** List of specific differences found */
  differences: Array<{
    /** The region/component where the difference was found */
    area: string;
    /** Description of what changed */
    description: string;
    /** Severity of the difference */
    severity: "minor" | "major" | "critical";
  }>;
  /** Confidence level from 0 to 1 */
  confidence: number;
}

/**
 * Suggested fix for an error
 */
export interface FixSuggestion {
  /** Analysis of the error */
  analysis: string;
  /** Identified root cause */
  rootCause: string;
  /** The suggested fix */
  suggestedFix: {
    /** Description of what the fix does */
    description: string;
    /** File changes to apply */
    files: Array<{
      /** File path */
      path: string;
      /** Action to take */
      action: "create" | "modify" | "delete";
      /** Full new content (for create/modify) */
      content?: string;
      /** Unified diff (for modify) */
      diff?: string;
    }>;
  };
  /** Confidence level from 0 to 1 */
  confidence: number;
  /** Additional notes or warnings */
  additionalNotes?: string;
}

/**
 * LLM client interface
 * Provides a unified API for different LLM providers
 */
export interface LLMClient {
  /** Provider name */
  name: string;

  /**
   * Compare two images and identify visual differences
   * @param beforeImage - The "before" screenshot (Buffer or base64 string)
   * @param afterImage - The "after" screenshot (Buffer or base64 string)
   * @param context - Optional context about what to look for
   * @returns Visual comparison result
   */
  compareImages(
    beforeImage: Buffer | string,
    afterImage: Buffer | string,
    context?: string,
  ): Promise<VisualCompareResult>;

  /**
   * Generate a fix suggestion for an error
   * @param errorMessage - The error message to fix
   * @param fileContents - Map of file paths to their contents
   * @param context - Optional additional context
   * @returns Suggested fix
   */
  generateFix(
    errorMessage: string,
    fileContents: Record<string, string>,
    context?: string,
  ): Promise<FixSuggestion>;
}
