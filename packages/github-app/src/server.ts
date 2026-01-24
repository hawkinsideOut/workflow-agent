/**
 * Hono HTTP server for GitHub App webhooks
 */

import { Hono } from "hono";
import { serve } from "@hono/node-server";
import { logger } from "hono/logger";
import { cors } from "hono/cors";
import { getEnv, isDev } from "./config/env.js";
import { handleWebhook } from "./webhooks/index.js";
import { initDatabase, getDatabase } from "./db/client.js";
import {
  getRecentWebhookEvents,
  getActiveAttempts,
  checkRateLimit,
  incrementRateLimit,
  batchCreatePatterns,
  getPatterns,
  getPatternById,
  getPatternsNewerThan,
} from "./db/queries.js";
import { z } from "zod";

const startTime = Date.now();

const app = new Hono();

// Middleware
app.use("*", logger());
app.use("*", cors());

// Health check endpoint
app.get("/health", (c) => {
  try {
    // Test database connection
    getDatabase();
    return c.json({
      status: "healthy",
      timestamp: new Date().toISOString(),
      env: getEnv().NODE_ENV,
      uptime: Math.floor((Date.now() - startTime) / 1000),
    });
  } catch (error) {
    return c.json(
      {
        status: "unhealthy",
        error: error instanceof Error ? error.message : String(error),
      },
      500,
    );
  }
});

// Status/dashboard endpoint
app.get("/status", (c) => {
  try {
    const recentEvents = getRecentWebhookEvents(10);
    const activeAttempts = getActiveAttempts();

    return c.json({
      status: "running",
      timestamp: new Date().toISOString(),
      activeAutoHealAttempts: activeAttempts.length,
      recentWebhookEvents: recentEvents.map((e) => ({
        id: e.id,
        type: e.event_type,
        action: e.action,
        repo:
          e.repo_owner && e.repo_name ? `${e.repo_owner}/${e.repo_name}` : null,
        processed: !!e.processed,
        createdAt: e.created_at,
      })),
    });
  } catch (error) {
    return c.json(
      {
        status: "error",
        error: error instanceof Error ? error.message : String(error),
      },
      500,
    );
  }
});

// GitHub webhook endpoint
app.post("/webhook", async (c) => {
  const eventType = c.req.header("x-github-event");
  const signature = c.req.header("x-hub-signature-256");

  if (!eventType) {
    return c.json({ error: "Missing x-github-event header" }, 400);
  }

  if (!signature) {
    return c.json({ error: "Missing x-hub-signature-256 header" }, 400);
  }

  try {
    const body = await c.req.text();
    await handleWebhook(eventType, signature, body);

    return c.json({ status: "ok", event: eventType });
  } catch (error) {
    console.error("Webhook error:", error);

    if (error instanceof Error && error.message.includes("signature")) {
      return c.json({ error: "Invalid webhook signature" }, 401);
    }

    return c.json(
      {
        error: "Webhook processing failed",
        message: error instanceof Error ? error.message : String(error),
      },
      500,
    );
  }
});

// =============================================================================
// Pattern Registry Routes
// =============================================================================

// Schema for pattern push request
const PatternPushSchema = z.object({
  patterns: z.array(
    z.object({
      id: z.string().uuid(),
      type: z.enum(["fix", "blueprint", "solution"]),
      data: z.record(z.unknown()), // Anonymized pattern data
      hash: z.string().optional(),
    }),
  ),
});

// POST /patterns/push - Submit patterns to the registry
app.post("/patterns/push", async (c) => {
  const contributorId = c.req.header("x-contributor-id");

  if (!contributorId) {
    return c.json({ error: "Missing x-contributor-id header" }, 400);
  }

  // Check rate limit
  const rateLimit = checkRateLimit(contributorId);
  if (!rateLimit.allowed) {
    return c.json(
      {
        error: "Rate limit exceeded",
        message: `You can push up to 100 patterns per hour. Try again after ${rateLimit.resetAt}`,
        resetAt: rateLimit.resetAt,
        remaining: 0,
      },
      429,
    );
  }

  try {
    const body = await c.req.json();
    const parseResult = PatternPushSchema.safeParse(body);

    if (!parseResult.success) {
      return c.json(
        {
          error: "Validation failed",
          details: parseResult.error.issues,
        },
        400,
      );
    }

    const { patterns } = parseResult.data;

    // Check if pushing would exceed rate limit
    if (patterns.length > rateLimit.remaining) {
      return c.json(
        {
          error: "Rate limit would be exceeded",
          message: `You can only push ${rateLimit.remaining} more patterns this hour`,
          remaining: rateLimit.remaining,
          requested: patterns.length,
        },
        429,
      );
    }

    // Batch insert patterns
    const result = batchCreatePatterns(
      patterns.map((p) => ({
        patternId: p.id,
        patternType: p.type,
        patternData: JSON.stringify(p.data),
        contributorId,
        patternHash: p.hash,
      })),
    );

    // Update rate limit counter
    if (result.inserted > 0) {
      incrementRateLimit(contributorId, result.inserted);
    }

    // Get updated rate limit
    const updatedLimit = checkRateLimit(contributorId);

    return c.json(
      {
        status: "ok",
        pushed: result.inserted,
        skipped: result.skipped,
        errors: result.errors.length > 0 ? result.errors : undefined,
        rateLimit: {
          remaining: updatedLimit.remaining,
          resetAt: updatedLimit.resetAt,
        },
      },
      result.inserted > 0 ? 201 : 200,
    );
  } catch (error) {
    console.error("Pattern push error:", error);
    return c.json(
      {
        error: "Failed to push patterns",
        message: error instanceof Error ? error.message : String(error),
      },
      500,
    );
  }
});

// GET /patterns/pull - Fetch patterns from the registry
app.get("/patterns/pull", (c) => {
  try {
    const type = c.req.query("type") as
      | "fix"
      | "blueprint"
      | "solution"
      | undefined;
    const limit = Math.min(parseInt(c.req.query("limit") || "50"), 100);
    const offset = parseInt(c.req.query("offset") || "0");
    const since = c.req.query("since"); // ISO date for incremental pull

    let patterns;
    let total: number;

    if (since) {
      // Incremental pull - get patterns newer than the given date
      const rawPatterns = getPatternsNewerThan(since, limit);
      patterns = rawPatterns.map((p) => ({
        id: p.pattern_id,
        type: p.pattern_type,
        data: JSON.parse(p.pattern_data),
        hash: p.pattern_hash,
        createdAt: p.created_at,
      }));
      total = patterns.length;
    } else {
      // Full pull with pagination
      const result = getPatterns(type, limit, offset);
      patterns = result.patterns.map((p) => ({
        id: p.pattern_id,
        type: p.pattern_type,
        data: JSON.parse(p.pattern_data),
        hash: p.pattern_hash,
        createdAt: p.created_at,
      }));
      total = result.total;
    }

    return c.json({
      patterns,
      pagination: {
        offset,
        limit,
        total,
        hasMore: offset + patterns.length < total,
      },
    });
  } catch (error) {
    console.error("Pattern pull error:", error);
    return c.json(
      {
        error: "Failed to pull patterns",
        message: error instanceof Error ? error.message : String(error),
      },
      500,
    );
  }
});

// GET /patterns/:id - Get a single pattern by ID
app.get("/patterns/:id", (c) => {
  try {
    const patternId = c.req.param("id");
    const pattern = getPatternById(patternId);

    if (!pattern) {
      return c.json({ error: "Pattern not found" }, 404);
    }

    return c.json({
      id: pattern.pattern_id,
      type: pattern.pattern_type,
      data: JSON.parse(pattern.pattern_data),
      hash: pattern.pattern_hash,
      createdAt: pattern.created_at,
      updatedAt: pattern.updated_at,
    });
  } catch (error) {
    console.error("Pattern get error:", error);
    return c.json(
      {
        error: "Failed to get pattern",
        message: error instanceof Error ? error.message : String(error),
      },
      500,
    );
  }
});

// 404 handler
app.notFound((c) => {
  return c.json(
    {
      error: "Not found",
      path: c.req.path,
      availableEndpoints: [
        "/health",
        "/status",
        "/webhook",
        "/patterns/push",
        "/patterns/pull",
        "/patterns/:id",
      ],
    },
    404,
  );
});

// Error handler
app.onError((err, c) => {
  console.error("Unhandled error:", err);
  return c.json(
    {
      error: "Internal server error",
      message: isDev() ? err.message : "An unexpected error occurred",
    },
    500,
  );
});

/**
 * Start the webhook server
 */
export async function startServer(): Promise<void> {
  const env = getEnv();

  console.log(`
╔══════════════════════════════════════════════════════════════╗
║           Workflow Agent GitHub App Server                   ║
╚══════════════════════════════════════════════════════════════╝
  `);

  // Initialize database (async for sql.js WASM loading)
  console.log(`📦 Database: ${env.DATABASE_PATH}`);
  await initDatabase();

  // Start the server
  serve(
    {
      fetch: app.fetch,
      port: env.PORT,
      hostname: env.HOST,
    },
    (info) => {
      console.log(`🚀 Server running at http://${info.address}:${info.port}`);
      console.log(
        `📡 Webhook endpoint: http://${info.address}:${info.port}/webhook`,
      );
      console.log(
        `💊 Health check: http://${info.address}:${info.port}/health`,
      );
      console.log(`📊 Status: http://${info.address}:${info.port}/status`);
      console.log(
        `📦 Pattern Registry: http://${info.address}:${info.port}/patterns`,
      );

      if (env.SMEE_URL) {
        console.log(`\n🔗 Smee.io proxy: ${env.SMEE_URL}`);
        console.log(
          `   Run: npx smee -u ${env.SMEE_URL} -t http://localhost:${env.PORT}/webhook`,
        );
      }

      console.log(`\n✅ Ready to receive GitHub webhooks and pattern syncs!\n`);
    },
  );
}

export { app };
