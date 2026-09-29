/** Shared URL rules for everything that screenshots a user-supplied site. */
export const PRIVATE_HOST_RE =
  /^(localhost|127\.|10\.|192\.168\.|172\.(1[6-9]|2\d|3[0-1])\.|0\.0\.0\.0|::1|\[::1\])/i;

export function normalizeAndValidateUrl(raw: string): string {
  const trimmed = raw.trim();
  if (!trimmed) throw new Error("Please enter a website URL");

  const withProtocol = /^https?:\/\//i.test(trimmed)
    ? trimmed
    : `https://${trimmed}`;

  let url: URL;
  try {
    url = new URL(withProtocol);
  } catch {
    throw new Error("Please enter a valid website URL");
  }

  if (url.protocol !== "http:" && url.protocol !== "https:") {
    throw new Error("Only http and https URLs are supported");
  }
  if (!url.hostname.includes(".")) {
    throw new Error("Please enter a valid website URL");
  }
  if (PRIVATE_HOST_RE.test(url.hostname)) {
    throw new Error("That URL cannot be scanned");
  }

  url.hash = "";
  return url.toString().replace(/\/$/, "");
}
