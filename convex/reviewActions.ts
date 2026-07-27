"use node";

import { v } from "convex/values";
import { internalAction } from "./_generated/server";
import { internal } from "./_generated/api";
import {
  fullReviewModel,
  openRouterVisionJson,
  parseJsonObject,
} from "./lib/openrouter";
import { FULL_REVIEW_SYSTEM_PROMPT, scoreToVerdict } from "./lib/rubric";
import { captureDesktopScreenshotBase64 } from "./lib/screenshots";

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
  let score =
    typeof data.score === "number" && Number.isFinite(data.score)
      ? Math.round(data.score)
      : 60;
  score = Math.max(0, Math.min(100, score));

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

  if (findings.length === 0) {
    findings.push({
      area: "hero",
      severity: "medium",
      issue: "Hero presentation lacks a distinctive brand signal.",
      whyItFeelsAi: "Could belong to another SaaS product with a swap of logo.",
      fixHint: "Lead with a concrete product proof moment and brand-specific language.",
    });
  }

  if (prompts.length === 0) {
    prompts.push({
      tool: "cursor",
      title: "Rewrite hero for brand specificity",
      prompt:
        "Rewrite the landing hero so the brand name and unique offer dominate the first viewport. Remove vague AI claims and chip spam. Keep one CTA.",
    });
  }

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

      let images: string[] = [];
      let screenshotStorageId = scan.screenshotStorageId;

      if (scan.screenshotStorageId) {
        const blob = await ctx.storage.get(scan.screenshotStorageId);
        if (blob) {
          const buf = Buffer.from(await blob.arrayBuffer());
          images = [buf.toString("base64")];
        }
      }

      if (images.length === 0) {
        const shot = await captureDesktopScreenshotBase64(scan.normalizedUrl, {
          fullPage: true,
        });
        images = [shot.base64];
        // Store for later (via mutation with generated upload URL would be better;
        // for now we skip re-store if capture-only)
      }

      const model = fullReviewModel();
      const content = await openRouterVisionJson({
        model,
        system: FULL_REVIEW_SYSTEM_PROMPT,
        userText: `Full UI slop review.\nURL: ${scan.normalizedUrl}\nPreeval estimate: ${scan.estimatedScore ?? "n/a"}\nPreeval verdict: ${scan.verdict ?? "n/a"}`,
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
