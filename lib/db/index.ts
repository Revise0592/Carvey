/**
 * Data access layer. Each module owns one area of the schema; import from `@/lib/db` as before.
 * Server-only: these modules open the SQLite database.
 */
export * from "./types";
export { closeDb, closeDbForTests, dbFileName, getDb } from "./connection";
export * from "./settings";
export * from "./auth";
export * from "./workshops";
export * from "./vehicles";
export * from "./records";
export * from "./reminders";
export * from "./purchases";
export * from "./renewals";
export * from "./media";
export * from "./overview";
export * from "./notifications";
