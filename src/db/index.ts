import postgres from "postgres";
import { drizzle } from "drizzle-orm/postgres-js";

type Database = ReturnType<typeof drizzle>;
const globalForDb = globalThis as unknown as {
  postgresClient?: ReturnType<typeof postgres>;
  drizzleDb?: Database;
};

export function getDb(): Database {
  if (globalForDb.drizzleDb) return globalForDb.drizzleDb;

  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error("DATABASE_URL is not set. Copy .env.example to .env.local and configure PostgreSQL.");
  }

  // One pool per server process in every environment. (Previously production built a new pool on every call,
  // which exhausted Postgres connections under concurrent requests.)
  const client = globalForDb.postgresClient ?? postgres(connectionString, {
    max: process.env.NODE_ENV === "production" ? 10 : 1,
    idle_timeout: 20,
    prepare: false
  });

  globalForDb.postgresClient = client;
  globalForDb.drizzleDb = drizzle(client);
  return globalForDb.drizzleDb;
}
