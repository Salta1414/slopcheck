import assert from "node:assert/strict";
import { test } from "node:test";
import { loadTypeScript } from "./load-typescript.mjs";
const { scoreAssessment, scoreToVerdict, FULL_REVIEW_SYSTEM_PROMPT } = await loadTypeScript("../convex/lib/rubric.ts");
const { captureReviewFrames, captureImageLabels } = await loadTypeScript("../convex/lib/screenshots.ts");

const dimension = score => ({ score, evidence: "Visible product-specific evidence" });
const assessment = () => ({
  genericity: { brand: dimension(20), composition: dimension(60), content: dimension(30), productProof: dimension(10) },
  craft: dimension(90), confidence: "high", captureLimited: false,
  strength: "Readable product dashboard", limitation: "Frames cannot establish smoothness",
});

test("weighted genericity is deterministic and independent of craft", () => {
  const data = assessment();
  assert.equal(scoreAssessment(data).score, 31);
  assert.equal(scoreAssessment(data).verdict, "mixed");
  data.craft.score = 10;
  assert.equal(scoreAssessment(data).score, 31);
  assert.match(scoreAssessment(data).note, /Craft: 10/);
});

test("limited captures force low confidence and cannot receive extreme scores", () => {
  const data = assessment();
  for (const item of Object.values(data.genericity)) item.score = 95;
  assert.equal(scoreAssessment(data).score, 95);
  data.captureLimited = true;
  assert.equal(scoreAssessment(data).score, 55);
  assert.match(scoreAssessment(data).note, /Confidence: low/);
  data.genericity = assessment().genericity;
  assert.equal(scoreAssessment(data).score, 31); // no upward penalty
});

test("invalid or evidence-free output fails rather than inventing a score", () => {
  for (const invalid of [undefined, {}, { ...assessment(), confidence: "certain" }]) {
    assert.throws(() => scoreAssessment(invalid));
  }
  for (const value of [NaN, Infinity, -1, 101, "82"]) {
    const data = assessment(); data.genericity.brand.score = value;
    assert.throws(() => scoreAssessment(data));
  }
  const data = assessment(); data.genericity.brand.evidence = "";
  assert.throws(() => scoreAssessment(data));
});

test("verdict boundaries match calculated score", () => {
  assert.deepEqual([0, 20, 21, 45, 46, 75, 76, 100].map(scoreToVerdict),
    ["fresh", "fresh", "mixed", "mixed", "likely_slop", "likely_slop", "peak_slop", "peak_slop"]);
  assert.doesNotMatch(FULL_REVIEW_SYSTEM_PROMPT, /±15|Preeval estimate/);
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
