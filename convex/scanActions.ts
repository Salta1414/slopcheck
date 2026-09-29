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
import { buildPreevalResult } from "./lib/preeval";
import {
  PREEVAL_SYSTEM_PROMPT,
  RUBRIC_VERSION,
  type SlopVerdict,
} from "./lib/rubric";
import { captureImageLabels, captureReviewFrames } from "./lib/screenshots";
import { normalizeAndValidateUrl } from "./lib/url";

/** Blurred placeholder rows for older frontends — the real text stays server-side. */
function legacyLocked(count: number) {
  return {
    lockedFindings: Array.from(
      { length: count },
      () => "Unlock the full review to see this finding.",
    ),
    lockedPrompts: ["Unlock the full review to get your design kit."],
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
    /** Locked findings stay server-side; the client only renders placeholders. */
    lockedCount: v.number(),
    /**
     * Deprecated: placeholders only, for frontends deployed before lockedCount
     * existed. Never contains real findings.
     */
    lockedFindings: v.array(v.string()),
    lockedPrompts: v.array(v.string()),
    createdAt: v.number(),
    scanId: v.id("scans"),
  }),
  handler: async (
    ctx,
    args,
  ): Promise<{
    guestKey: string;
    url: string;
    normalizedUrl: string;
    estimatedScore: number;
    verdict: SlopVerdict;
    teaserFlags: string[];
    lockedCount: number;
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

    const reservation = await ctx.runMutation(
      internal.scanInternal.reservePreeval,
      { normalizedUrl },
    );

    if (reservation.kind === "cached") {
      const scanId: Id<"scans"> = await ctx.runMutation(
        internal.scanInternal.upsertGuestPreeval,
        {
          ...base,
          status: "preeval_ready",
          estimatedScore: reservation.estimatedScore,
          verdict: reservation.verdict,
          teaserFlags: reservation.teaserFlags,
          lockedFindings: reservation.lockedFindings,
          lockedPrompts: reservation.lockedPrompts,
          slopTells: reservation.slopTells,
          criteriaScores: reservation.criteriaScores,
          rubricVersion: RUBRIC_VERSION,
          preevalModel: reservation.preevalModel,
          screenshotProvider: reservation.screenshotProvider,
          screenshotStorageId: reservation.screenshotStorageId,
        },
      );

      return {
        guestKey: args.guestKey,
        url: args.url.trim(),
        normalizedUrl,
        estimatedScore: reservation.estimatedScore,
        verdict: reservation.verdict,
        teaserFlags: reservation.teaserFlags,
        lockedCount: reservation.lockedFindings.length,
        ...legacyLocked(reservation.lockedFindings.length),
        createdAt,
        scanId,
      };
    }

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
        userText: `Evaluate this website UI for AI slop.\nURL: ${normalizedUrl}\nHost: ${host}\n${captureImageLabels(shot.labels)}`,
        imagesBase64Png: shot.frames,
      });

      const parsed = buildPreevalResult(parseJsonObject(content));

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
          slopTells: parsed.scoring.tells,
          criteriaScores: parsed.scoring.criteria,
          rubricVersion: RUBRIC_VERSION,
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
        lockedCount: parsed.lockedFindings.length,
        ...legacyLocked(parsed.lockedFindings.length),
        createdAt,
        scanId,
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : "Preeval failed";

      await ctx.runMutation(internal.scanInternal.upsertGuestPreeval, {
        ...base,
        status: "failed",
        errorMessage: message,
      });

      throw new Error(message);
    }
  },
});
