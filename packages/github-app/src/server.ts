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
import { getRecentWebhookEvents, getActiveAttempts } from "./db/queries.js";

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

// 404 handler
app.notFound((c) => {
  return c.json(
    {
      error: "Not found",
      path: c.req.path,
      availableEndpoints: ["/health", "/status", "/webhook"],
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

      if (env.SMEE_URL) {
        console.log(`\n🔗 Smee.io proxy: ${env.SMEE_URL}`);
        console.log(
          `   Run: npx smee -u ${env.SMEE_URL} -t http://localhost:${env.PORT}/webhook`,
        );
      }

      console.log(`\n✅ Ready to receive GitHub webhooks!\n`);
    },
  );
}

export { app };
