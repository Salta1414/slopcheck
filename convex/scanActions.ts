"use node";

import { v } from "convex/values";
import { action } from "./_generated/server";
import { internal } from "./_generated/api";
import type { Id } from "./_generated/dataModel";
import {
  openRouterVisionJson,
  parseJsonObject,
  preevalModel,
} from "./lib/openrouter";
import {
  PREEVAL_SYSTEM_PROMPT,
  scoreAssessment,
  type SlopVerdict,
} from "./lib/rubric";
import { captureReviewFrames, captureImageLabels } from "./lib/screenshots";

const PRIVATE_HOST_RE =
  /^(localhost|127\.|10\.|192\.168\.|172\.(1[6-9]|2\d|3[0-1])\.|0\.0\.0\.0|::1|\[::1\])/i;

function normalizeAndValidateUrl(raw: string): string {
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

type PreevalJson = {
  assessment?: unknown;
  estimatedScore?: unknown;
  verdict?: unknown;
  teaserFlags?: unknown;
  lockedFindings?: unknown;
  lockedPrompts?: unknown;
};

function asStringArray(value: unknown, min: number, fallback: string[]): string[] {
  if (!Array.isArray(value)) return fallback;
  const cleaned = value
    .filter((item): item is string => typeof item === "string")
    .map((s) => s.trim())
    .filter(Boolean);
  if (cleaned.length < min) return fallback;
  return cleaned;
}

function normalizePreeval(raw: unknown): {
  estimatedScore: number;
  verdict: SlopVerdict;
  teaserFlags: string[];
  lockedFindings: string[];
  lockedPrompts: string[];
} {
  const data = (raw ?? {}) as PreevalJson;
  const assessment = scoreAssessment(data.assessment);

  return {
    estimatedScore: assessment.score,
    verdict: assessment.verdict,
    teaserFlags: [assessment.note, `Strength: ${assessment.strength}`,
      ...asStringArray(data.teaserFlags, 0, []).slice(0, 1),
      `Capture limits: ${assessment.limitation}`],
    lockedFindings: [assessment.evidence, ...asStringArray(data.lockedFindings, 0, []).slice(0, 4)],
    lockedPrompts: asStringArray(data.lockedPrompts, 0, []).slice(0, 3),
  };
}

export const runPreeval = action({
  args: {
    url: v.string(),
    guestKey: v.string(),
  },
  returns: v.object({
    guestKey: v.string(),
    url: v.string(),
    normalizedUrl: v.string(),
    estimatedScore: v.number(),
    verdict: v.union(
      v.literal("fresh"),
      v.literal("mixed"),
      v.literal("likely_slop"),
      v.literal("peak_slop"),
    ),
    teaserFlags: v.array(v.string()),
    lockedFindings: v.array(v.string()),
    lockedPrompts: v.array(v.string()),
    createdAt: v.number(),
    scanId: v.id("scans"),
  }),
  handler: async (ctx, args): Promise<{
    guestKey: string;
    url: string;
    normalizedUrl: string;
    estimatedScore: number;
    verdict: SlopVerdict;
    teaserFlags: string[];
    lockedFindings: string[];
    lockedPrompts: string[];
    createdAt: number;
    scanId: Id<"scans">;
  }> => {
    const createdAt = Date.now();
    const normalizedUrl = normalizeAndValidateUrl(args.url);
    const host = new URL(normalizedUrl).hostname;
    const model = preevalModel();

    if (!args.guestKey || args.guestKey.length < 8) {
      throw new Error("Invalid guest key");
    }

    const identity = await ctx.auth.getUserIdentity();
    const userId: Id<"users"> | undefined = identity
      ? await ctx.runMutation(internal.users.ensureUserInternal, {})
      : undefined;

    const base = {
      guestKey: args.guestKey,
      userId,
      url: args.url.trim(),
      normalizedUrl,
      createdAt,
    };

    await ctx.runMutation(internal.scanInternal.upsertGuestPreeval, {
      ...base,
      status: "capturing",
    });

    try {
      const shot = await captureReviewFrames(normalizedUrl);

      const bytes = Buffer.from(shot.base64, "base64");
      const storageId: Id<"_storage"> = await ctx.storage.store(
        new Blob([new Uint8Array(bytes)], { type: "image/png" }),
      );

      await ctx.runMutation(internal.scanInternal.upsertGuestPreeval, {
        ...base,
        status: "preeval_running",
        screenshotProvider: shot.provider,
        screenshotStorageId: storageId,
      });

      const content = await openRouterVisionJson({
        model,
        system: PREEVAL_SYSTEM_PROMPT,
        userText: `Evaluate this website UI.\nURL: ${normalizedUrl}\nHost: ${host}\n${captureImageLabels(shot.labels)}`,
        imagesBase64Png: shot.frames,
      });

      const parsed = normalizePreeval(parseJsonObject(content));

      const scanId: Id<"scans"> = await ctx.runMutation(
        internal.scanInternal.upsertGuestPreeval,
        {
          ...base,
          status: "preeval_ready",
          estimatedScore: parsed.estimatedScore,
          verdict: parsed.verdict,
          teaserFlags: parsed.teaserFlags,
          lockedFindings: parsed.lockedFindings,
          lockedPrompts: parsed.lockedPrompts,
          preevalModel: model,
          screenshotProvider: shot.provider,
          screenshotStorageId: storageId,
        },
      );

      return {
        guestKey: args.guestKey,
        url: args.url.trim(),
        normalizedUrl,
        estimatedScore: parsed.estimatedScore,
        verdict: parsed.verdict,
        teaserFlags: parsed.teaserFlags,
        lockedFindings: parsed.lockedFindings,
        lockedPrompts: parsed.lockedPrompts,
        createdAt,
        scanId,
      };
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Preeval failed";

      await ctx.runMutation(internal.scanInternal.upsertGuestPreeval, {
        ...base,
        status: "failed",
        errorMessage: message,
      });

      throw new Error(message);
    }
  },
});
