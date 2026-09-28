"use node";

import { v } from "convex/values";
import { internalAction } from "./_generated/server";
import { internal } from "./_generated/api";
import {
  fullReviewModel,
  openRouterVisionJson,
  parseJsonObject,
} from "./lib/openrouter";
import {
  CaptureNotUsableError,
  FULL_REVIEW_SYSTEM_PROMPT,
  parseScoring,
  scoreToVerdict,
  type Scoring,
} from "./lib/rubric";
import { captureScreenshotBase64 } from "./lib/screenshots";
import type { Id } from "./_generated/dataModel";

const PRIVATE_HOST_RE =
  /^(localhost|127\.|10\.|192\.168\.|172\.(1[6-9]|2\d|3[0-1])\.|0\.0\.0\.0|::1|\[::1\])/i;

type Finding = {
  area: string;
  severity: "low" | "medium" | "high";
  issue: string;
  whyItFeelsAi: string;
  fixHint: string;
};

type PromptItem = {
  tool: string;
  title: string;
  prompt: string;
};

function normalizeFullReview(raw: unknown): {
  score: number;
  scoring: Scoring;
  summary: string;
  findings: Finding[];
  prompts: PromptItem[];
} {
  const data = (raw ?? {}) as Record<string, unknown>;
  const scoring = parseScoring(raw);
  const score = scoring.score;

  const summary =
    typeof data.summary === "string" && data.summary.trim()
      ? data.summary.trim()
      : `UI slop estimate around ${score} (${scoreToVerdict(score)}).`;

  const findingsRaw = Array.isArray(data.findings) ? data.findings : [];
  const findings: Finding[] = findingsRaw
    .map((item) => {
      if (!item || typeof item !== "object") return null;
      const f = item as Record<string, unknown>;
      const severity =
        f.severity === "low" || f.severity === "medium" || f.severity === "high"
          ? f.severity
          : "medium";
      if (
        typeof f.area !== "string" ||
        typeof f.issue !== "string" ||
        typeof f.whyItFeelsAi !== "string" ||
        typeof f.fixHint !== "string"
      ) {
        return null;
      }
      return {
        area: f.area,
        severity,
        issue: f.issue,
        whyItFeelsAi: f.whyItFeelsAi,
        fixHint: f.fixHint,
      };
    })
    .filter((f): f is Finding => f !== null)
    .slice(0, 8);

  const promptsRaw = Array.isArray(data.prompts) ? data.prompts : [];
  const prompts: PromptItem[] = promptsRaw
    .map((item) => {
      if (!item || typeof item !== "object") return null;
      const p = item as Record<string, unknown>;
      if (
        typeof p.tool !== "string" ||
        typeof p.title !== "string" ||
        typeof p.prompt !== "string"
      ) {
        return null;
      }
      return {
        tool: p.tool,
        title: p.title,
        prompt: p.prompt,
      };
    })
    .filter((p): p is PromptItem => p !== null)
    .slice(0, 5);

  // A paid report must be real — never pad it with generic findings.
  if (findings.length === 0 || prompts.length === 0) {
    throw new Error("The AI returned an incomplete review");
  }

  return { score, scoring, summary, findings, prompts };
}

export const runFullReview = internalAction({
  args: {
    scanId: v.id("scans"),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const scan = await ctx.runQuery(internal.scans.getScanInternal, {
      scanId: args.scanId,
    });
    if (!scan) return null;

    await ctx.runMutation(internal.scanInternal.setFullReviewRunning, {
      scanId: args.scanId,
    });

    try {
      if (PRIVATE_HOST_RE.test(new URL(scan.normalizedUrl).hostname)) {
        throw new Error("That URL cannot be reviewed");
      }

      let desktopBase64: string | null = null;
      let screenshotStorageId = scan.screenshotStorageId;
      let mobileScreenshotStorageId: Id<"_storage"> | undefined;

      if (scan.screenshotStorageId) {
        const blob = await ctx.storage.get(scan.screenshotStorageId);
        if (blob) {
          desktopBase64 = Buffer.from(await blob.arrayBuffer()).toString(
            "base64",
          );
        }
      }

      if (!desktopBase64) {
        const desktop = await captureScreenshotBase64(scan.normalizedUrl, {
          fullPage: true,
          viewport: "desktop",
        });
        desktopBase64 = desktop.base64;
        const bytes = Buffer.from(desktop.base64, "base64");
        screenshotStorageId = await ctx.storage.store(
          new Blob([new Uint8Array(bytes)], { type: "image/png" }),
        );
      }

      const images: string[] = [desktopBase64];
      let hasMobile = false;

      try {
        const mobile = await captureScreenshotBase64(scan.normalizedUrl, {
          fullPage: false,
          viewport: "mobile",
        });
        images.push(mobile.base64);
        hasMobile = true;
        const mobileBytes = Buffer.from(mobile.base64, "base64");
        mobileScreenshotStorageId = await ctx.storage.store(
          new Blob([new Uint8Array(mobileBytes)], { type: "image/png" }),
        );
      } catch (mobileError) {
        console.error("Mobile screenshot failed; continuing with desktop only", {
          scanId: args.scanId,
          error:
            mobileError instanceof Error
              ? mobileError.message
              : "unknown mobile capture error",
        });
      }

      const model = fullReviewModel();
      const userText = [
        "Full UI slop review.",
        `URL: ${scan.normalizedUrl}`,
        `Preeval estimate: ${scan.estimatedScore ?? "n/a"}`,
        `Preeval verdict: ${scan.verdict ?? "n/a"}`,
        hasMobile
          ? "Images in order: (1) Desktop 1440×900, (2) Mobile 390×844. Review both."
          : "Only the desktop screenshot is available (mobile capture failed).",
      ].join("\n");

      // The customer already paid, so give a flaky model reply one more shot
      // before failing the scan.
      let parsed: ReturnType<typeof normalizeFullReview> | null = null;
      let lastError: unknown = null;
      for (let attempt = 0; attempt < 2 && !parsed; attempt++) {
        try {
          const content = await openRouterVisionJson({
            model,
            system: FULL_REVIEW_SYSTEM_PROMPT,
            userText,
            imagesBase64Png: images,
          });
          parsed = normalizeFullReview(parseJsonObject(content));
        } catch (error) {
          lastError = error;
          // Asking again won't un-block a cookie wall.
          if (error instanceof CaptureNotUsableError) break;
        }
      }
      if (!parsed) {
        throw lastError instanceof Error
          ? lastError
          : new Error("Full review failed");
      }

      await ctx.runMutation(internal.scanInternal.saveFullReview, {
        scanId: args.scanId,
        userId: scan.userId,
        score: parsed.score,
        summary: parsed.summary,
        findings: parsed.findings,
        prompts: parsed.prompts,
        tells: parsed.scoring.tells,
        criteriaScores: parsed.scoring.criteria,
        model,
        screenshotStorageId,
        mobileScreenshotStorageId,
      });
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Full review failed";
      await ctx.runMutation(internal.scanInternal.markScanFailed, {
        scanId: args.scanId,
        errorMessage: message,
      });
    }

    return null;
  },
});
