/**
 * Push Patterns Endpoint
 * POST /api/patterns/push
 *
 * Accepts patterns from contributors and stores them in the registry.
 * Rate limited to 100 patterns per hour per contributor.
 */

import type { VercelRequest, VercelResponse } from "@vercel/node";
import { createRedisClient, PatternStore, RateLimiter } from "../../src/redis";
import {
  validatePushRequest,
  validateContributorId,
} from "../../src/validation";
import type { RegistryPattern, PushResponse } from "../../src/types";

export default async function handler(
  req: VercelRequest,
  res: VercelResponse,
): Promise<void> {
  // Only allow POST
  if (req.method !== "POST") {
    res.status(405).json({ error: "Method not allowed" });
    return;
  }

  try {
    // Validate contributor ID
    const contributorIdHeader = req.headers["x-contributor-id"];
    const contributorId = Array.isArray(contributorIdHeader)
      ? contributorIdHeader[0]
      : contributorIdHeader;

    const contributorValidation = validateContributorId(contributorId);
    if (!contributorValidation.success) {
      res.status(400).json({
        error: "Invalid contributor ID",
        details: contributorValidation.errors,
      });
      return;
    }

    // Initialize Redis clients
    const redis = createRedisClient();
    const store = new PatternStore(redis);
    const rateLimiter = new RateLimiter(redis);

    // Check rate limit before processing
    const rateLimitCheck = await rateLimiter.check(contributorValidation.data!);
    if (!rateLimitCheck.allowed) {
      res.status(429).json({
        error: "Rate limit exceeded",
        message: "You can push up to 100 patterns per hour",
        resetAt: rateLimitCheck.resetAt,
        remaining: 0,
      });
      return;
    }

    // Validate request body
    const validation = validatePushRequest(req.body);
    if (!validation.success) {
      res.status(400).json({
        error: "Invalid request body",
        details: validation.errors,
      });
      return;
    }

    const { patterns } = validation.data!;

    // Check if pushing these patterns would exceed rate limit
    if (patterns.length > rateLimitCheck.remaining) {
      res.status(429).json({
        error: "Rate limit exceeded",
        message: `You can only push ${rateLimitCheck.remaining} more patterns in this window`,
        resetAt: rateLimitCheck.resetAt,
        remaining: rateLimitCheck.remaining,
      });
      return;
    }

    // Process patterns
    const now = new Date().toISOString();
    let pushed = 0;
    let skipped = 0;
    const errors: string[] = [];

    for (const pattern of patterns) {
      try {
        const registryPattern: RegistryPattern = {
          id: pattern.id,
          type: pattern.type,
          data: pattern.data,
          hash: pattern.hash,
          createdAt: now,
          contributorId: contributorValidation.data!,
        };

        const result = await store.savePattern(registryPattern);

        if (result.isNew) {
          pushed++;
        } else {
          skipped++;
        }
      } catch (error) {
        console.error(`Failed to save pattern ${pattern.id}:`, error);
        errors.push(`Failed to save pattern ${pattern.id}`);
      }
    }

    // Increment rate limit counter for pushed patterns only
    const rateLimit = await rateLimiter.increment(
      contributorValidation.data!,
      pushed,
    );

    const response: PushResponse = {
      status: errors.length === 0 ? "ok" : "error",
      pushed,
      skipped,
      errors: errors.length > 0 ? errors : undefined,
      rateLimit: {
        remaining: rateLimit.remaining,
        resetAt: rateLimit.resetAt,
      },
    };

    res.status(200).json(response);
  } catch (error) {
    console.error("Push failed:", error);
    res.status(500).json({
      error: "Internal server error",
      message: error instanceof Error ? error.message : "Unknown error",
    });
  }
}
