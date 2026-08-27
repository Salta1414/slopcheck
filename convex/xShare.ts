import { v } from "convex/values";
import { internal } from "./_generated/api";
import { action } from "./_generated/server";

const X_AUTHORIZE_URL = "https://x.com/i/oauth2/authorize";
const CHALLENGE_TTL_MS = 10 * 60 * 1000;

function appUrl(): string {
  return (process.env.APP_URL ?? "https://slopcheck.dev").replace(/\/$/, "");
}

function clientId(): string {
  const value = process.env.X_CLIENT_ID?.trim();
  if (!value) {
    throw new Error("X_CLIENT_ID is not set on Convex");
  }
  return value;
}

function redirectUri(): string {
  const configured = process.env.X_OAUTH_REDIRECT_URI?.trim();
  if (configured) return configured;

  const siteUrl = process.env.CONVEX_SITE_URL?.trim();
  if (!siteUrl) {
    throw new Error("CONVEX_SITE_URL is not set on Convex");
  }
  return `${siteUrl.replace(/\/$/, "")}/x/share/callback`;
}

function randomToken(): string {
  return `${crypto.randomUUID()}${crypto.randomUUID()}`.replaceAll("-", "");
}

function base64Url(bytes: Uint8Array): string {
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary)
    .replaceAll("+", "-")
    .replaceAll("/", "_")
    .replace(/=+$/, "");
}

async function pkceChallenge(verifier: string): Promise<string> {
  const digest = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(verifier),
  );
  return base64Url(new Uint8Array(digest));
}

function prettyHost(rawUrl: string): string {
  try {
    return new URL(rawUrl).host.replace(/^www\./, "");
  } catch {
    return rawUrl.replace(/^https?:\/\//, "").replace(/\/$/, "");
  }
}

function verdictLabel(verdict: string | undefined): string {
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

function verdictEmoji(verdict: string | undefined): string {
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

function postText({
  host,
  score,
  verdict,
  publicUrl,
  proof,
}: {
  host: string;
  score: number;
  verdict?: string;
  publicUrl: string;
  proof: string;
}): string {
  const displayHost = host.length > 72 ? `${host.slice(0, 69)}...` : host;
  return `${displayHost} scored ${score}/100 on the AI slop check — ${verdictLabel(verdict)} ${verdictEmoji(verdict)}\n\n${publicUrl}\n\n#slopcheck ${proof}`;
}

/** Start a server-created X post for one owned scan. */
export const beginXShare = action({
  args: { scanId: v.id("scans") },
  returns: v.object({ authorizeUrl: v.string() }),
  handler: async (ctx, args): Promise<{ authorizeUrl: string }> => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Sign in to share on X");

    const userId = await ctx.runMutation(internal.users.ensureUserInternal, {});

    const scan = await ctx.runQuery(internal.scans.getScanInternal, {
      scanId: args.scanId,
    });
    if (!scan || scan.userId !== userId) {
      throw new Error("Unauthorized: this scan is not yours");
    }
    if (scan.estimatedScore === undefined) {
      throw new Error("This scan has no score to share yet");
    }
    if (scan.status === "ready") {
      throw new Error("This scan is already unlocked");
    }
    if (
      scan.freeReviewClaimedAt ||
      scan.status === "paid" ||
      scan.status === "full_review_running"
    ) {
      throw new Error("This scan is already processing");
    }
    if (
      scan.status !== "preeval_ready" &&
      scan.status !== "awaiting_payment" &&
      scan.status !== "failed"
    ) {
      throw new Error("This scan is not ready to share yet");
    }

    const state = randomToken();
    const codeVerifier = randomToken();
    const proof = randomToken().slice(0, 16);
    const oauthClientId = clientId();
    const oauthRedirectUri = redirectUri();
    const publicUrl = `${appUrl()}/s/${args.scanId}`;
    const text = postText({
      host: prettyHost(scan.normalizedUrl),
      score: scan.estimatedScore,
      verdict: scan.verdict,
      publicUrl,
      proof,
    });
    const createdAt = Date.now();

    await ctx.runMutation(internal.xShareInternal.createChallenge, {
      state,
      codeVerifier,
      scanId: args.scanId,
      userId,
      postText: text,
      createdAt,
      expiresAt: createdAt + CHALLENGE_TTL_MS,
    });

    const params = new URLSearchParams({
      response_type: "code",
      client_id: oauthClientId,
      redirect_uri: oauthRedirectUri,
      scope: "tweet.read tweet.write users.read",
      state,
      code_challenge: await pkceChallenge(codeVerifier),
      code_challenge_method: "S256",
    });

    return { authorizeUrl: `${X_AUTHORIZE_URL}?${params.toString()}` };
  },
});
