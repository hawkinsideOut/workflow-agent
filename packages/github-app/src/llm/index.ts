/**
 * LLM client module
 * Provides a unified interface for LLM providers
 */

import { getEnv } from "../config/env.js";
import { anthropicClient, resetAnthropicClient } from "./anthropic.js";
import { openaiClient, resetOpenAIClient } from "./openai.js";
import type { LLMClient, VisualCompareResult, FixSuggestion } from "./types.js";

export type { LLMClient, VisualCompareResult, FixSuggestion } from "./types.js";
export { anthropicClient } from "./anthropic.js";
export { openaiClient } from "./openai.js";

/**
 * Get the configured LLM client based on environment settings
 */
export function getLLMClient(): LLMClient {
  const env = getEnv();

  switch (env.LLM_PROVIDER) {
    case "anthropic":
      if (!env.ANTHROPIC_API_KEY) {
        throw new Error(
          "LLM_PROVIDER is 'anthropic' but ANTHROPIC_API_KEY is not set",
        );
      }
      return anthropicClient;

    case "openai":
      if (!env.OPENAI_API_KEY) {
        throw new Error(
          "LLM_PROVIDER is 'openai' but OPENAI_API_KEY is not set",
        );
      }
      return openaiClient;

    default:
      throw new Error(`Unknown LLM provider: ${env.LLM_PROVIDER}`);
  }
}

/**
 * Compare two images using the configured LLM provider
 */
export async function compareImages(
  beforeImage: Buffer | string,
  afterImage: Buffer | string,
  context?: string,
): Promise<VisualCompareResult> {
  const client = getLLMClient();
  return client.compareImages(beforeImage, afterImage, context);
}

/**
 * Generate a fix suggestion using the configured LLM provider
 */
export async function generateFix(
  errorMessage: string,
  fileContents: Record<string, string>,
  context?: string,
): Promise<FixSuggestion> {
  const client = getLLMClient();
  return client.generateFix(errorMessage, fileContents, context);
}

/**
 * Check if any LLM provider is available
 */
export function isLLMAvailable(): boolean {
  const env = getEnv();
  return !!(env.ANTHROPIC_API_KEY || env.OPENAI_API_KEY);
}

/**
 * Reset all LLM clients (useful for testing)
 */
export function resetLLMClients(): void {
  resetAnthropicClient();
  resetOpenAIClient();
}
