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

  const client = globalForDb.postgresClient ?? postgres(connectionString, {
    max: process.env.NODE_ENV === "production" ? 10 : 1,
    prepare: false
  });

  if (process.env.NODE_ENV !== "production") globalForDb.postgresClient = client;
  const database = drizzle(client);
  if (process.env.NODE_ENV !== "production") globalForDb.drizzleDb = database;
  return database;
}
