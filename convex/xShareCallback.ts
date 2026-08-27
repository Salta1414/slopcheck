import { v } from "convex/values";
import { internal } from "./_generated/api";
import type { Id } from "./_generated/dataModel";
import { internalAction } from "./_generated/server";

const X_TOKEN_URL = "https://api.x.com/2/oauth2/token";
const X_API_URL = "https://api.x.com/2";

function clientId(): string {
  const value = process.env.X_CLIENT_ID?.trim();
  if (!value) {
    throw new Error("X_CLIENT_ID is not set on Convex");
  }
  return value;
}

function clientSecret(): string {
  const value = process.env.X_CLIENT_SECRET?.trim();
  if (!value) {
    throw new Error("X_CLIENT_SECRET is not set on Convex");
  }
  return value;
}

function basicAuthHeader(): string {
  return `Basic ${btoa(`${clientId()}:${clientSecret()}`)}`;
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

type XTokenResponse = { access_token?: unknown };
type XUserResponse = { data?: { id?: unknown } };
type XPostResponse = {
  data?: { id?: unknown; text?: unknown; author_id?: unknown };
};

type CompleteXShareResult = {
  scanId: Id<"scans">;
  status:
    | "verified"
    | "already_running"
    | "already_ready"
    | "canceled"
    | "failed";
};

async function readJson(response: Response): Promise<unknown> {
  try {
    return await response.json();
  } catch {
    return null;
  }
}

/** Exchange the callback code, create the post, verify it, then queue review. */
export const completeXShare = internalAction({
  args: {
    state: v.string(),
    code: v.optional(v.string()),
    error: v.optional(v.string()),
  },
  returns: v.object({
    scanId: v.id("scans"),
    status: v.union(
      v.literal("verified"),
      v.literal("already_running"),
      v.literal("already_ready"),
      v.literal("canceled"),
      v.literal("failed"),
    ),
  }),
  handler: async (ctx, args): Promise<CompleteXShareResult> => {
    const challenge = await ctx.runQuery(internal.xShareInternal.getChallenge, {
      state: args.state,
    });
    if (!challenge) throw new Error("X share challenge not found");

    if (args.error || !args.code) {
      await ctx.runMutation(internal.xShareInternal.consumeChallenge, {
        challengeId: challenge._id,
      });
      return { scanId: challenge.scanId, status: "canceled" as const };
    }

    try {
      const tokenResponse = await fetch(X_TOKEN_URL, {
        method: "POST",
        headers: {
          Authorization: basicAuthHeader(),
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: new URLSearchParams({
          code: args.code,
          grant_type: "authorization_code",
          redirect_uri: redirectUri(),
          code_verifier: challenge.codeVerifier,
        }),
      });
      const tokenJson = (await readJson(tokenResponse)) as XTokenResponse;
      const accessToken =
        typeof tokenJson.access_token === "string"
          ? tokenJson.access_token
          : null;
      if (!tokenResponse.ok || !accessToken) {
        throw new Error("X token exchange failed");
      }

      const authHeaders = { Authorization: `Bearer ${accessToken}` };
      const userResponse = await fetch(`${X_API_URL}/users/me`, {
        headers: authHeaders,
      });
      const userJson = (await readJson(userResponse)) as XUserResponse;
      const xAuthorId =
        typeof userJson.data?.id === "string" ? userJson.data.id : null;
      if (!userResponse.ok || !xAuthorId) {
        throw new Error("X user verification failed");
      }

      const postResponse = await fetch(`${X_API_URL}/tweets`, {
        method: "POST",
        headers: { ...authHeaders, "Content-Type": "application/json" },
        body: JSON.stringify({ text: challenge.postText }),
      });
      const postJson = (await readJson(postResponse)) as XPostResponse;
      const xPostId =
        typeof postJson.data?.id === "string" ? postJson.data.id : null;
      if (!postResponse.ok || !xPostId) {
        throw new Error("X post creation failed");
      }

      const verifyResponse = await fetch(
        `${X_API_URL}/tweets/${encodeURIComponent(xPostId)}?tweet.fields=author_id,text`,
        { headers: authHeaders },
      );
      const verifyJson = (await readJson(verifyResponse)) as XPostResponse;
      if (
        !verifyResponse.ok ||
        verifyJson.data?.id !== xPostId ||
        verifyJson.data?.author_id !== xAuthorId ||
        verifyJson.data?.text !== challenge.postText
      ) {
        throw new Error("X post verification failed");
      }

      const result = await ctx.runMutation(
        internal.xShareInternal.finishChallenge,
        {
          challengeId: challenge._id,
          xPostId,
          xAuthorId,
        },
      );
      return {
        scanId: challenge.scanId,
        status:
          result.status === "started" ? ("verified" as const) : result.status,
      };
    } catch (error) {
      await ctx.runMutation(internal.xShareInternal.consumeChallenge, {
        challengeId: challenge._id,
      });
      console.error("X share verification failed", {
        scanId: challenge.scanId,
        error: error instanceof Error ? error.message : "unknown error",
      });
      return { scanId: challenge.scanId, status: "failed" as const };
    }
  },
});
