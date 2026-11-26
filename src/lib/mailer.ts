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

/**
 * Optional HTTPS transport (Brevo transactional API shape). Active only when all three variables are set:
 * RABTO_MAIL_API_KEY, RABTO_MAIL_FROM_EMAIL, and RABTO_MAIL_PROVIDER=brevo. RABTO_MAIL_FROM_NAME and
 * RABTO_MAIL_API_URL are optional (the URL override exists for tests and is IGNORED in production). Nothing is configured by default.
 * Deliverability with any particular sender address (for example a free Gmail address) is unproven.
 */
const BREVO_URL = "https://api.brevo.com/v3/smtp/email";
/** In production the destination is fixed to Brevo, so a bad override can never receive the API key. */
function httpConfig() {
  if (process.env.RABTO_MAIL_PROVIDER !== "brevo") return null;
  const key = process.env.RABTO_MAIL_API_KEY;
  const from = process.env.RABTO_MAIL_FROM_EMAIL;
  if (!key || !from) return null;
  return { key, from, name: process.env.RABTO_MAIL_FROM_NAME || "RABTO", url: process.env.NODE_ENV === "production" ? BREVO_URL : process.env.RABTO_MAIL_API_URL || BREVO_URL };
}

export function mailTransportAvailable(): boolean {
  return sinkPath() !== null || httpConfig() !== null;
}

export async function sendMail(msg: { to: string; subject: string; text: string }): Promise<{ sent: boolean }> {
  const sink = sinkPath();
  if (sink) {
    appendFileSync(sink, JSON.stringify({ at: new Date().toISOString(), ...msg }) + "\n", { mode: 0o600 });
    return { sent: true };
  }
  const cfg = httpConfig();
  if (cfg) {
    try {
      const res = await fetch(cfg.url, {
        method: "POST",
        headers: { "api-key": cfg.key, "content-type": "application/json", accept: "application/json" },
        body: JSON.stringify({ sender: { name: cfg.name, email: cfg.from }, to: [{ email: msg.to }], subject: msg.subject, textContent: msg.text }),
        signal: AbortSignal.timeout(10000),
      });
      return { sent: res.ok };
    } catch {
      return { sent: false };
    }
  }
  return { sent: false };
}
