import "server-only";
import { appendFileSync } from "node:fs";

/**
 * No mail provider is wired. The only transport is a local file sink for development and tests,
 * enabled by RABTO_MAIL_SINK_FILE and refused in production. Without it, nothing is sent and the
 * caller is told so (it must still answer the user uniformly).
 */
/**
 * The file sink writes reset codes in clear text, so it must be impossible on a live service.
 * Outside production it needs only the sink variable. In a production build (the isolated test
 * harness runs one) it ALSO needs the explicit flag, a database on this machine (loopback host)
 * and a sink path under /tmp. A real deployment has a remote database, so it can never qualify.
 */
function sinkPath(): string | null {
  const sink = process.env.RABTO_MAIL_SINK_FILE;
  if (!sink) return null;
  if (process.env.NODE_ENV !== "production") return sink;
  if (process.env.RABTO_E2E_ALLOW_SINK !== "1") return null;
  let host = "";
  try { host = new URL(process.env.DATABASE_URL ?? "").hostname; } catch { return null; }
  if (!["127.0.0.1", "localhost", "::1", "[::1]"].includes(host)) return null;
  if (!sink.startsWith("/tmp/") || sink.includes("..")) return null;
  return sink;
}

export function mailTransportAvailable(): boolean {
  return sinkPath() !== null;
}

export async function sendMail(msg: { to: string; subject: string; text: string }): Promise<{ sent: boolean }> {
  const sink = sinkPath();
  if (sink) {
    appendFileSync(sink, JSON.stringify({ at: new Date().toISOString(), ...msg }) + "\n", { mode: 0o600 });
    return { sent: true };
  }
  return { sent: false };
}
