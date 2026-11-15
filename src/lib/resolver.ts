export const resolverRules = {
  redirectStatus: 302,
  cacheControl: "no-store, max-age=0",
  allowedProtocols: ["https:", "http:"] as const,
  codePattern: /^[A-Za-z0-9_-]{6,32}$/
};

export function parseResolverDestination(value: string): URL | null {
  try {
    const url = new URL(value);
    if (!resolverRules.allowedProtocols.includes(url.protocol as "http:" | "https:")) return null;
    return url;
  } catch {
    return null;
  }
}
