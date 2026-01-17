/**
 * SQLite database client using sql.js (WASM-based, no native dependencies)
 * Provides async database initialization with synchronous query execution
 */

import initSqlJs, { type Database } from "sql.js";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "fs";
import { dirname } from "path";
import { getEnv } from "../config/env.js";
import { SCHEMA_SQL } from "./schema.js";

let _db: Database | null = null;
let _dbPath: string = "";
let _initialized = false;

/**
 * Initialize the database connection (async, call once at startup)
 * Creates the database file and tables if they don't exist
 */
export async function initDatabase(): Promise<Database> {
  if (_db && _initialized) {
    return _db;
  }

  const env = getEnv();
  _dbPath = env.DATABASE_PATH;

  // Ensure the directory exists
  const dir = dirname(_dbPath);
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true });
  }

  // Initialize sql.js
  const SQL = await initSqlJs();

  // Load existing database or create new one
  if (existsSync(_dbPath)) {
    const buffer = readFileSync(_dbPath);
    _db = new SQL.Database(buffer);
  } else {
    _db = new SQL.Database();
  }

  // Initialize schema
  _db.run(SCHEMA_SQL);

  // Save initial schema
  saveDatabase();

  _initialized = true;
  return _db;
}

/**
 * Get the database connection (throws if not initialized)
 */
export function getDatabase(): Database {
  if (!_db || !_initialized) {
    throw new Error("Database not initialized. Call initDatabase() first.");
  }
  return _db;
}

/**
 * Save the database to disk
 */
export function saveDatabase(): void {
  if (_db && _dbPath) {
    const data = _db.export();
    const buffer = Buffer.from(data);
    writeFileSync(_dbPath, buffer);
  }
}

/**
 * Close the database connection
 */
export function closeDatabase(): void {
  if (_db) {
    saveDatabase();
    _db.close();
    _db = null;
    _initialized = false;
  }
}

/**
 * Execute a transaction with automatic rollback on error
 */
export function transaction<T>(fn: (db: Database) => T): T {
  const db = getDatabase();
  db.run("BEGIN TRANSACTION");
  try {
    const result = fn(db);
    db.run("COMMIT");
    saveDatabase();
    return result;
  } catch (error) {
    db.run("ROLLBACK");
    throw error;
  }
}

/**
 * Reset the database connection (useful for testing)
 */
export function resetDatabase(): void {
  closeDatabase();
}

/**
 * Delete all data from all tables (useful for testing)
 */
export function clearAllData(): void {
  const db = getDatabase();
  db.run("DELETE FROM auto_heal_history");
  db.run("DELETE FROM visual_comparisons");
  db.run("DELETE FROM visual_baselines");
  db.run("DELETE FROM webhook_events");
  db.run("DELETE FROM retry_attempts");
  saveDatabase();
}
