"use node";

import { v } from "convex/values";
import { internalAction } from "./_generated/server";
import { internal } from "./_generated/api";
import {
  fullReviewModel,
  openRouterVisionJson,
  parseJsonObject,
} from "./lib/openrouter";
import { FULL_REVIEW_SYSTEM_PROMPT, scoreAssessment } from "./lib/rubric";
import { captureScreenshotBase64, captureReviewFrames, captureImageLabels } from "./lib/screenshots";
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
  summary: string;
  findings: Finding[];
  prompts: PromptItem[];
} {
  const data = (raw ?? {}) as Record<string, unknown>;
  const assessment = scoreAssessment(data.assessment);
  const score = assessment.score;

  const modelSummary =
    typeof data.summary === "string" && data.summary.trim()
      ? data.summary.trim()
      : assessment.strength;
  const summary = `${modelSummary}\n\n${assessment.note}\nStrength: ${assessment.strength}\nCapture limits: ${assessment.limitation}\nSlop breakdown: ${assessment.evidence}`;

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

  return { score, summary, findings, prompts };
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
    if (!scan.userId) {
      await ctx.runMutation(internal.scanInternal.markScanFailed, {
        scanId: args.scanId,
        errorMessage: "Scan has no owner for full review",
      });
      return null;
    }

    await ctx.runMutation(internal.scanInternal.setFullReviewRunning, {
      scanId: args.scanId,
    });

    try {
      if (PRIVATE_HOST_RE.test(new URL(scan.normalizedUrl).hostname)) {
        throw new Error("That URL cannot be reviewed");
      }

      const desktop = await captureReviewFrames(scan.normalizedUrl);
      const screenshotStorageId = await ctx.storage.store(
        new Blob([new Uint8Array(Buffer.from(desktop.base64, "base64"))], { type: "image/png" }),
      );
      let mobileScreenshotStorageId: Id<"_storage"> | undefined;
      const images: string[] = [...desktop.frames];
      const labels = [...desktop.labels];
      let hasMobile = false;

      try {
        const mobile = await captureScreenshotBase64(scan.normalizedUrl, {
          fullPage: false,
          viewport: "mobile",
        });
        images.push(mobile.base64);
        labels.push("Mobile 390x844 viewport, separate session, still image");
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
      const content = await openRouterVisionJson({
        model,
        system: FULL_REVIEW_SYSTEM_PROMPT,
        userText: [
          "Full UI slop review.",
          `URL: ${scan.normalizedUrl}`,
          captureImageLabels(labels),
          hasMobile
            ? "Review desktop and mobile independently."
            : "Mobile capture unavailable: explicitly note missing mobile coverage.",
        ].join("\n"),
        imagesBase64Png: images,
      });

      const parsed = normalizeFullReview(parseJsonObject(content));

      await ctx.runMutation(internal.scanInternal.saveFullReview, {
        scanId: args.scanId,
        userId: scan.userId,
        score: parsed.score,
        summary: parsed.summary,
        findings: parsed.findings,
        prompts: parsed.prompts,
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
