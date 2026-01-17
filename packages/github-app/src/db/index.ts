/**
 * Database module exports
 */

export {
  initDatabase,
  getDatabase,
  closeDatabase,
  transaction,
  resetDatabase,
  clearAllData,
  saveDatabase,
} from "./client.js";
export { SCHEMA_SQL } from "./schema.js";
export type {
  RetryAttempt,
  VisualBaseline,
  VisualComparison,
  WebhookEvent,
  AutoHealHistory,
} from "./schema.js";
export * from "./queries.js";
