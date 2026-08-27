import type { SlopVerdict } from "@/lib/guest-storage";

export const siteUrl =
  process.env.NEXT_PUBLIC_SITE_URL ?? "https://slopcheck.dev";

export function verdictLabel(verdict?: SlopVerdict): string {
  switch (verdict) {
    case "fresh":
      return "Pretty fresh";
    case "mixed":
      return "Mixed vibes";
    case "likely_slop":
      return "Likely slop";
    case "peak_slop":
      return "Peak slop";
    default:
      return "Scored";
  }
}

export function verdictEmoji(verdict?: SlopVerdict): string {
  switch (verdict) {
    case "fresh":
      return "✨";
    case "mixed":
      return "🤔";
    case "likely_slop":
      return "🫠";
    case "peak_slop":
      return "💀";
    default:
      return "🔍";
  }
}

/** Verdict band from the score, for shares where the stored verdict is missing. */
export function verdictFromScore(score: number): SlopVerdict {
  if (score <= 20) return "fresh";
  if (score <= 45) return "mixed";
  if (score <= 75) return "likely_slop";
  return "peak_slop";
}

export function prettyHost(rawUrl: string): string {
  try {
    return new URL(rawUrl).host.replace(/^www\./, "");
  } catch {
    return rawUrl.replace(/^https?:\/\//, "").replace(/\/$/, "");
  }
}

export function sharePath(scanId: string): string {
  return `/s/${scanId}`;
}

export function shareUrl(scanId: string, origin?: string): string {
  return `${origin ?? siteUrl}${sharePath(scanId)}`;
}

export function shareText({
  score,
  verdict,
  url,
}: {
  score: number;
  verdict?: SlopVerdict;
  url: string;
}): string {
  const band = verdict ?? verdictFromScore(score);
  return `${prettyHost(url)} scored ${score}/100 on the AI slop check — ${verdictLabel(band)} ${verdictEmoji(band)}`;
}

export function xPostUrl(text: string, url: string): string {
  return `https://x.com/intent/post?text=${encodeURIComponent(text)}&url=${encodeURIComponent(url)}`;
}
