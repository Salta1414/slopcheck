"use node";

import { v } from "convex/values";
import { internalAction } from "./_generated/server";
import { GOLDEN_SITES } from "./lib/goldenSites";
import {
  openRouterVisionJson,
  parseJsonObject,
  preevalModel,
} from "./lib/openrouter";
import { buildPreevalResult } from "./lib/preeval";
import { PREEVAL_SYSTEM_PROMPT } from "./lib/rubric";
import { captureImageLabels, captureReviewFrames } from "./lib/screenshots";

const resultValidator = v.object({
  url: v.string(),
  expected: v.string(),
  scores: v.array(v.number()),
  spread: v.number(),
  tells: v.array(v.array(v.string())),
  pass: v.boolean(),
  error: v.optional(v.string()),
});

/**
 * Score the golden set with the live preeval pipeline, `runs` times per site
 * on the same screenshot, to see both accuracy (inside the expected range?)
 * and stability (spread between runs). Nothing is stored.
 *
 *   npx convex run evalActions:runGolden '{"runs": 3}'
 *   npx convex run evalActions:runGolden '{"urls": ["https://example.com"]}'
 */
export const runGolden = internalAction({
  args: {
    runs: v.optional(v.number()),
    urls: v.optional(v.array(v.string())),
    model: v.optional(v.string()),
  },
  returns: v.object({
    model: v.string(),
    passed: v.number(),
    total: v.number(),
    results: v.array(resultValidator),
  }),
  handler: async (_ctx, args) => {
    const runs = Math.max(1, Math.min(5, Math.floor(args.runs ?? 2)));
    const model = args.model ?? preevalModel();
    const sites = args.urls
      ? args.urls.map(
          (url) =>
            GOLDEN_SITES.find((s) => s.url === url) ?? {
              url,
              min: 0,
              max: 100,
              note: "ad-hoc",
            },
        )
      : GOLDEN_SITES;

    const results = [];
    for (const site of sites) {
      const expected = `${site.min}–${site.max}`;
      try {
        const shot = await captureReviewFrames(site.url);
        const scores: number[] = [];
        const tells: string[][] = [];
        for (let i = 0; i < runs; i++) {
          const content = await openRouterVisionJson({
            model,
            system: PREEVAL_SYSTEM_PROMPT,
            userText: `Evaluate this website UI for AI slop.\nURL: ${site.url}\n${captureImageLabels(shot.labels)}`,
            imagesBase64Png: shot.frames,
          });
          const result = buildPreevalResult(parseJsonObject(content));
          scores.push(result.estimatedScore);
          tells.push(result.scoring.tells.map((t) => t.id));
        }
        const spread = Math.max(...scores) - Math.min(...scores);
        const pass = scores.every((s) => s >= site.min && s <= site.max);
        console.log(
          `${pass ? "PASS" : "FAIL"} ${site.url} expected ${expected} got ${scores.join("/")} (spread ${spread})`,
        );
        results.push({ url: site.url, expected, scores, spread, tells, pass });
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        console.log(`ERROR ${site.url}: ${message}`);
        results.push({
          url: site.url,
          expected,
          scores: [],
          spread: 0,
          tells: [],
          pass: false,
          error: message,
        });
      }
    }

    return {
      model,
      passed: results.filter((r) => r.pass).length,
      total: results.length,
      results,
    };
  },
});
