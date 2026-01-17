/**
 * LLM client abstraction for OpenAI GPT-4V
 */

import OpenAI from "openai";
import { z } from "zod";
import { getEnv } from "../config/env.js";
import type { LLMClient, VisualCompareResult, FixSuggestion } from "./types.js";

let _client: OpenAI | null = null;

/**
 * Get the OpenAI client instance
 */
function getClient(): OpenAI {
  if (_client) {
    return _client;
  }

  const env = getEnv();

  if (!env.OPENAI_API_KEY) {
    throw new Error("OPENAI_API_KEY is not configured");
  }

  _client = new OpenAI({
    apiKey: env.OPENAI_API_KEY,
  });

  return _client;
}

/**
 * Schema for parsing visual comparison response
 */
const VisualCompareResponseSchema = z.object({
  hasDifferences: z.boolean(),
  summary: z.string(),
  differences: z.array(
    z.object({
      area: z.string(),
      description: z.string(),
      severity: z.enum(["minor", "major", "critical"]),
    }),
  ),
  confidence: z.number().min(0).max(1),
});

/**
 * Schema for parsing fix suggestion response
 */
const FixSuggestionResponseSchema = z.object({
  analysis: z.string(),
  rootCause: z.string(),
  suggestedFix: z.object({
    description: z.string(),
    files: z.array(
      z.object({
        path: z.string(),
        action: z.enum(["create", "modify", "delete"]),
        content: z.string().optional(),
        diff: z.string().optional(),
      }),
    ),
  }),
  confidence: z.number().min(0).max(1),
  additionalNotes: z.string().optional(),
});

/**
 * OpenAI GPT-4V LLM client implementation
 */
export const openaiClient: LLMClient = {
  name: "openai",

  async compareImages(
    beforeImage: Buffer | string,
    afterImage: Buffer | string,
    context?: string,
  ): Promise<VisualCompareResult> {
    const client = getClient();

    // Convert buffers to base64 if needed
    const beforeBase64 =
      typeof beforeImage === "string"
        ? beforeImage
        : beforeImage.toString("base64");
    const afterBase64 =
      typeof afterImage === "string"
        ? afterImage
        : afterImage.toString("base64");

    const systemPrompt = `You are a visual UI testing expert. Your job is to compare two screenshots and identify any visual differences.

Analyze the "before" and "after" images and provide a structured response in JSON format with:
- hasDifferences: boolean indicating if there are visual differences
- summary: a brief summary of the overall comparison
- differences: an array of specific differences found, each with:
  - area: the region/component where the difference was found
  - description: what changed
  - severity: "minor" (cosmetic), "major" (noticeable but not breaking), or "critical" (breaks functionality/layout)
- confidence: your confidence level from 0 to 1

Focus on meaningful UI differences, not minor pixel variations from rendering.
Respond with valid JSON only.`;

    const response = await client.chat.completions.create({
      model: "gpt-4o",
      max_tokens: 2000,
      messages: [
        {
          role: "system",
          content: systemPrompt,
        },
        {
          role: "user",
          content: [
            {
              type: "text",
              text: "Compare these two UI screenshots. First is BEFORE, second is AFTER.",
            },
            {
              type: "image_url",
              image_url: {
                url: `data:image/png;base64,${beforeBase64}`,
              },
            },
            {
              type: "image_url",
              image_url: {
                url: `data:image/png;base64,${afterBase64}`,
              },
            },
            {
              type: "text",
              text: context
                ? `Context: ${context}\n\nRespond with JSON only.`
                : "Respond with JSON only.",
            },
          ],
        },
      ],
    });

    const textContent = response.choices[0]?.message?.content;
    if (!textContent) {
      throw new Error("No response from OpenAI");
    }

    // Parse JSON from response
    const jsonMatch = textContent.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error("No JSON found in response");
    }

    const parsed = JSON.parse(jsonMatch[0]);
    const validated = VisualCompareResponseSchema.parse(parsed);

    return validated;
  },

  async generateFix(
    errorMessage: string,
    fileContents: Record<string, string>,
    context?: string,
  ): Promise<FixSuggestion> {
    const client = getClient();

    const systemPrompt = `You are an expert software engineer specializing in debugging and fixing code issues.

Given an error message and relevant file contents, analyze the problem and suggest a fix.

Provide a structured response in JSON format with:
- analysis: your analysis of the error
- rootCause: the identified root cause
- suggestedFix: an object with:
  - description: what the fix does
  - files: an array of file changes, each with:
    - path: the file path
    - action: "create", "modify", or "delete"
    - content: the full new content (for create/modify)
    - diff: a unified diff showing the changes (for modify)
- confidence: your confidence level from 0 to 1
- additionalNotes: any additional context or warnings

Be precise with file paths and ensure the suggested code is correct and follows best practices.
Respond with valid JSON only.`;

    // Build file contents section
    const filesSection = Object.entries(fileContents)
      .map(([path, content]) => `### ${path}\n\`\`\`\n${content}\n\`\`\``)
      .join("\n\n");

    const userPrompt = `## Error Message
\`\`\`
${errorMessage}
\`\`\`

## Relevant Files
${filesSection}

${context ? `## Additional Context\n${context}` : ""}

Analyze the error and provide a fix in JSON format.`;

    const response = await client.chat.completions.create({
      model: "gpt-4o",
      max_tokens: 4000,
      messages: [
        {
          role: "system",
          content: systemPrompt,
        },
        {
          role: "user",
          content: userPrompt,
        },
      ],
    });

    const textContent = response.choices[0]?.message?.content;
    if (!textContent) {
      throw new Error("No response from OpenAI");
    }

    // Parse JSON from response
    const jsonMatch = textContent.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error("No JSON found in response");
    }

    const parsed = JSON.parse(jsonMatch[0]);
    const validated = FixSuggestionResponseSchema.parse(parsed);

    return validated;
  },
};

/**
 * Reset the client (useful for testing)
 */
export function resetOpenAIClient(): void {
  _client = null;
}
