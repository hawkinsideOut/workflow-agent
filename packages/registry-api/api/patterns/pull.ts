/**
 * Pull Patterns Endpoint
 * GET /api/patterns/pull
 *
 * Returns patterns from the registry with pagination and optional filtering.
 */

import type { VercelRequest, VercelResponse } from "@vercel/node";
import { createRedisClient, PatternStore } from "../../src/redis";
import { validatePullQuery } from "../../src/validation";
import type { PullResponse } from "../../src/types";

export default async function handler(
  req: VercelRequest,
  res: VercelResponse
): Promise<void> {
  // Only allow GET
  if (req.method !== "GET") {
    res.status(405).json({ error: "Method not allowed" });
    return;
  }

  try {
    // Validate query parameters
    const validation = validatePullQuery(req.query);
    if (!validation.success) {
      res.status(400).json({
        error: "Invalid query parameters",
        details: validation.errors,
      });
      return;
    }

    const { type, limit = 50, offset = 0, since } = validation.data!;

    // Initialize Redis client
    const redis = createRedisClient();
    const store = new PatternStore(redis);

    // Fetch patterns
    const { patterns, total } = await store.getPatterns({
      type,
      limit,
      offset,
      since,
    });

    // Format response
    const response: PullResponse = {
      patterns: patterns.map((p) => ({
        id: p.id,
        type: p.type,
        data: p.data,
        hash: p.hash,
        createdAt: p.createdAt,
      })),
      pagination: {
        offset,
        limit,
        total,
        hasMore: offset + patterns.length < total,
      },
    };

    // Set cache headers for GET requests
    res.setHeader("Cache-Control", "public, s-maxage=60, stale-while-revalidate=300");

    res.status(200).json(response);
  } catch (error) {
    console.error("Pull failed:", error);
    res.status(500).json({
      error: "Internal server error",
      message: error instanceof Error ? error.message : "Unknown error",
    });
  }
}
