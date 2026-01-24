/**
 * Get Single Pattern Endpoint
 * GET /api/patterns/[id]
 *
 * Returns a single pattern by ID.
 */

import type { VercelRequest, VercelResponse } from "@vercel/node";
import { createRedisClient, PatternStore } from "../../src/redis";
import { isValidUUID } from "../../src/validation";

export default async function handler(
  req: VercelRequest,
  res: VercelResponse,
): Promise<void> {
  // Only allow GET
  if (req.method !== "GET") {
    res.status(405).json({ error: "Method not allowed" });
    return;
  }

  try {
    // Get pattern ID from URL
    const { id } = req.query;
    const patternId = Array.isArray(id) ? id[0] : id;

    if (!patternId || !isValidUUID(patternId)) {
      res.status(400).json({
        error: "Invalid pattern ID",
        message: "Pattern ID must be a valid UUID",
      });
      return;
    }

    // Initialize Redis client
    const redis = createRedisClient();
    const store = new PatternStore(redis);

    // Fetch pattern
    const pattern = await store.getPattern(patternId);

    if (!pattern) {
      res.status(404).json({
        error: "Pattern not found",
        message: `No pattern found with ID: ${patternId}`,
      });
      return;
    }

    // Set cache headers
    res.setHeader(
      "Cache-Control",
      "public, s-maxage=300, stale-while-revalidate=600",
    );

    res.status(200).json({
      id: pattern.id,
      type: pattern.type,
      data: pattern.data,
      hash: pattern.hash,
      createdAt: pattern.createdAt,
      updatedAt: pattern.updatedAt,
    });
  } catch (error) {
    console.error("Get pattern failed:", error);
    res.status(500).json({
      error: "Internal server error",
      message: error instanceof Error ? error.message : "Unknown error",
    });
  }
}
