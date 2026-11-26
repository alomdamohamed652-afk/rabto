import "server-only";
import { appendFileSync } from "node:fs";

/**
 * No mail provider is wired. The only transport is a local file sink for development and tests,
 * enabled by RABTO_MAIL_SINK_FILE and refused in production. Without it, nothing is sent and the
 * caller is told so (it must still answer the user uniformly).
 */
export async function sendMail(msg: { to: string; subject: string; text: string }): Promise<{ sent: boolean }> {
  const sink = process.env.RABTO_MAIL_SINK_FILE;
  if (sink && (process.env.NODE_ENV !== "production" || process.env.RABTO_E2E_ALLOW_SINK === "1")) {
    appendFileSync(sink, JSON.stringify({ at: new Date().toISOString(), ...msg }) + "\n", { mode: 0o600 });
    return { sent: true };
  }
  return { sent: false };
}
