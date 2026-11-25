CREATE TABLE IF NOT EXISTS "login_attempts" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "key_type" varchar(40) NOT NULL,
  "key_hash" varchar(64) NOT NULL,
  "failed_count" integer DEFAULT 0 NOT NULL,
  "window_start" timestamp with time zone DEFAULT now() NOT NULL,
  "locked_until" timestamp with time zone,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT "login_attempts_failed_count_nonnegative" CHECK ("failed_count" >= 0)
);
CREATE UNIQUE INDEX IF NOT EXISTS "login_attempts_key_unique" ON "login_attempts" ("key_type", "key_hash");
CREATE INDEX IF NOT EXISTS "login_attempts_updated_idx" ON "login_attempts" ("updated_at");
CREATE TABLE IF NOT EXISTS "trusted_login_ips" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "account_hash" varchar(64) NOT NULL,
  "ip_hash" varchar(64) NOT NULL,
  "last_success_at" timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT "trusted_login_ips_hash_length" CHECK (length("account_hash") = 64 AND length("ip_hash") = 64)
);
CREATE UNIQUE INDEX IF NOT EXISTS "trusted_login_ips_account_ip_unique" ON "trusted_login_ips" ("account_hash", "ip_hash");
CREATE INDEX IF NOT EXISTS "trusted_login_ips_last_success_idx" ON "trusted_login_ips" ("last_success_at");
