/**
 * Type declarations for sql.js
 * Minimal types for our usage
 */

declare module "sql.js" {
  export interface Database {
    run(sql: string, params?: unknown[]): void;
    exec(sql: string): void;
    prepare(sql: string): Statement;
    export(): Uint8Array;
    close(): void;
    getRowsModified(): number;
  }

  export interface Statement {
    bind(params?: unknown[]): boolean;
    step(): boolean;
    getColumnNames(): string[];
    get(): unknown[];
    free(): boolean;
  }

  export interface SqlJsStatic {
    Database: new (data?: ArrayLike<number>) => Database;
  }

  export default function initSqlJs(
    config?: { locateFile?: (file: string) => string }
  ): Promise<SqlJsStatic>;
}
