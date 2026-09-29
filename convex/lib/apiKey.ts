/**
 * API keys look like `slop_<40 hex>`. Only the sha256 is stored, so a leaked
 * database can't be used to call the API. Uses Web Crypto, which is available
 * in Convex actions and HTTP actions (not in queries/mutations).
 */
export const API_KEY_PREFIX = "slop_";

function toHex(bytes: Uint8Array): string {
  let out = "";
  for (const b of bytes) out += b.toString(16).padStart(2, "0");
  return out;
}

export function generateApiKey(): string {
  const bytes = new Uint8Array(20);
  crypto.getRandomValues(bytes);
  return API_KEY_PREFIX + toHex(bytes);
}

/** Random secret for the private report link of API-started scans. */
export function generateGuestKey(): string {
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  return "api_" + toHex(bytes);
}

export async function hashApiKey(key: string): Promise<string> {
  const digest = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(key),
  );
  return toHex(new Uint8Array(digest));
}

export function looksLikeApiKey(key: string): boolean {
  return /^slop_[0-9a-f]{40}$/.test(key);
}

/** Shown in the UI so people can tell keys apart: `slop_1a2b3c…`. */
export function displayPrefix(key: string): string {
  return key.slice(0, API_KEY_PREFIX.length + 6);
}
