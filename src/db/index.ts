import postgres from "postgres";
import { drizzle } from "drizzle-orm/postgres-js";

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error("DATABASE_URL is not set. Copy .env.example to .env.local and configure PostgreSQL.");
}

const globalForDb = globalThis as unknown as { postgresClient?: ReturnType<typeof postgres> };

const client = globalForDb.postgresClient ?? postgres(connectionString, {
  max: process.env.NODE_ENV === "production" ? 10 : 1,
  prepare: false
});

if (process.env.NODE_ENV !== "production") globalForDb.postgresClient = client;

export const db = drizzle(client);
