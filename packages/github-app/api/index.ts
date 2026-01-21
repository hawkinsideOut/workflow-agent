/**
 * Vercel serverless handler for GitHub App
 * Exports the Hono app for Vercel's Node.js runtime
 */

import { Hono } from "hono";
import { handle } from "hono/vercel";
import { logger } from "hono/logger";
import { cors } from "hono/cors";

const app = new Hono().basePath("/api");

// Middleware
app.use("*", logger());
app.use("*", cors());

// Health check endpoint
app.get("/health", (c) => {
  return c.json({
    status: "healthy",
    timestamp: new Date().toISOString(),
    runtime: "vercel-serverless",
  });
});

// Ping endpoint
app.get("/ping", (c) => {
  return c.json({ pong: true, timestamp: new Date().toISOString() });
});

// Webhook endpoint placeholder
// NOTE: Full webhook handling requires database setup
// For production, consider using a persistent database service
app.post("/webhooks/github", async (c) => {
  const payload = await c.req.json();
  
  // Log webhook received (actual processing would need db/config)
  console.log("Webhook received:", {
    event: c.req.header("x-github-event"),
    delivery: c.req.header("x-github-delivery"),
  });

  return c.json({ 
    received: true,
    message: "Webhook received. Note: Full processing requires database configuration." 
  });
});

export default handle(app);
