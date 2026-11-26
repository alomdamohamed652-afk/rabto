import "server-only";
import { appendFileSync } from "node:fs";

/**
 * No mail provider is wired. The only transport is a local file sink for development and tests,
 * enabled by RABTO_MAIL_SINK_FILE and refused in production. Without it, nothing is sent and the
 * caller is told so (it must still answer the user uniformly).
 */
/**
 * The file sink writes reset codes in clear text, so it is denied unconditionally when
 * NODE_ENV is "production". There is no override. Tests run the app with NODE_ENV=test.
 */
function sinkPath(): string | null {
  if (process.env.NODE_ENV === "production") return null;
  return process.env.RABTO_MAIL_SINK_FILE || null;
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
