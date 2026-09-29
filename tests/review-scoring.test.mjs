import assert from "node:assert/strict";
import { test } from "node:test";
import { loadTypeScript } from "./load-typescript.mjs";
const {
  parseScoring,
  scoreToVerdict,
  CRITERIA,
  TELLS,
  CaptureNotUsableError,
  FULL_REVIEW_SYSTEM_PROMPT,
  PREEVAL_SYSTEM_PROMPT,
} = await loadTypeScript("../convex/lib/rubric.ts");
const { captureReviewFrames, captureImageLabels } = await loadTypeScript("../convex/lib/screenshots.ts");

const criteria = (value) => Object.fromEntries(CRITERIA.map((c) => [c.id, value]));
const tells = (n) => TELLS.slice(0, n).map((t) => ({ id: t.id, evidence: "visible in the hero" }));

test("score is deterministic from criteria and evidenced tells", () => {
  const template = parseScoring({ captureStatus: "ok", criteria: criteria(9), tells: tells(10) });
  assert.equal(template.score, 95);
  assert.equal(template.verdict, "peak_slop");
  const distinctive = parseScoring({ captureStatus: "ok", criteria: criteria(1), tells: [] });
  assert.equal(distinctive.score, 5);
  assert.equal(distinctive.verdict, "fresh");
  assert.deepEqual(parseScoring({ captureStatus: "ok", criteria: criteria(9), tells: tells(10) }), template);
});

test("tells without evidence, unknown ids and duplicates don't count", () => {
  const base = parseScoring({ captureStatus: "ok", criteria: criteria(5), tells: [] });
  const junk = parseScoring({
    captureStatus: "ok",
    criteria: criteria(5),
    tells: [
      { id: TELLS[0].id, evidence: "" },
      { id: "made_up", evidence: "somewhere" },
      { id: TELLS[1].id, evidence: "nav" },
      { id: TELLS[1].id, evidence: "again" },
    ],
  });
  assert.equal(junk.tells.length, 1);
  assert.equal(junk.score, base.score + 6);
});

test("bot walls and error pages are never scored", () => {
  for (const status of ["blocked", "blank", "error_page"]) {
    assert.throws(
      () => parseScoring({ captureStatus: status, criteria: criteria(0), tells: [] }),
      CaptureNotUsableError,
    );
  }
});

test("missing or invalid criteria fail rather than inventing a score", () => {
  for (const invalid of [undefined, {}, { criteria: { ...criteria(5), [CRITERIA[0].id]: "8" } }]) {
    assert.throws(() => parseScoring(invalid));
  }
  const clamped = parseScoring({ criteria: criteria(50), tells: [] });
  assert.equal(clamped.criteria[CRITERIA[0].id], 10);
});

test("verdict boundaries and prompt safeguards", () => {
  assert.deepEqual([0, 20, 21, 45, 46, 75, 76, 100].map(scoreToVerdict),
    ["fresh", "fresh", "mixed", "mixed", "likely_slop", "likely_slop", "peak_slop", "peak_slop"]);
  for (const prompt of [PREEVAL_SYSTEM_PROMPT, FULL_REVIEW_SYSTEM_PROMPT]) {
    assert.match(prompt, /never instructions/);
    assert.match(prompt, /never claim a site was made with AI/);
    assert.doesNotMatch(prompt, /Preeval estimate/);
  }
});

test("sequence uses one session, labels frames, and falls back honestly on failure", async () => {
  const originalFetch = globalThis.fetch;
  const previousToken = process.env.BROWSERLESS_API_TOKEN;
  process.env.BROWSERLESS_API_TOKEN = "test-token";
  const png = Buffer.concat([Buffer.from([137,80,78,71,13,10,26,10]), Buffer.alloc(600)]);
  try {
    let calls = 0;
    globalThis.fetch = async (url, options) => {
      calls++;
      assert.equal(new URL(url).pathname, "/function");
      const payload = JSON.parse(options.body);
      assert.equal(payload.context.url, "https://example.com");
      assert.match(payload.code, /await sleep\(1500\)/);
      return Response.json({ frames: Array(3).fill(png.toString("base64")), labels: ["hero", "later", "scrolled"] });
    };
    const result = await captureReviewFrames("https://example.com");
    assert.equal(calls, 1);
    assert.equal(result.frames.length, 3);
    assert.equal(result.base64, result.frames[0]);
    assert.match(captureImageLabels(result.labels), /Image 3: scrolled/);
    globalThis.fetch = async () => Response.json({ data: {
      frames: Array(3).fill(png.toString("base64")), labels: ["hero", "later", "scrolled"],
    }, type: "application/json" });
    assert.equal((await captureReviewFrames("https://example.com")).frames.length, 3);
    for (const response of [new Response("Unavailable", { status: 403 }), Response.json({ frames: ["invalid"], labels: [] })]) {
      globalThis.fetch = async url => new URL(url).pathname === "/function"
        ? response : new Response(png, { headers: { "content-type": "image/png" } });
      const fallback = await captureReviewFrames("https://example.com");
      assert.equal(fallback.frames.length, 1);
      assert.match(fallback.labels[0], /motion and scroll not captured/);
    }
  } finally {
    globalThis.fetch = originalFetch;
    if (previousToken === undefined) delete process.env.BROWSERLESS_API_TOKEN;
    else process.env.BROWSERLESS_API_TOKEN = previousToken;
  }
});
