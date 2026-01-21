/**
 * Health Check Endpoint
 * GET /api/health
 *
 * Returns the health status of the API and Redis connection.
 */

import type { VercelRequest, VercelResponse } from "@vercel/node";
import { createRedisClient } from "../src/redis";

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
    // Test Redis connection
    const redis = createRedisClient();
    await redis.ping();

    res.status(200).json({
      status: "ok",
      timestamp: new Date().toISOString(),
      version: "1.0.0",
    });
  } catch (error) {
    console.error("Health check failed:", error);
    res.status(503).json({
      status: "error",
      message: "Service unavailable",
      timestamp: new Date().toISOString(),
    });
  }
}
