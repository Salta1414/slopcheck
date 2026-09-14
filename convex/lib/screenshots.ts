/**
 * Screenshot capture priority:
 * 1. Browserless (best — real Chromium, waits, scroll, cookie modals)
 * 2. ScreenshotOne (if SCREENSHOT_API_KEY)
 * 3. Microlink (last-resort free fallback)
 *
 * We wait for lazy content so empty heroes don't falsely score as AI slop.
 */

const DEFAULT_BROWSERLESS_BASE = "https://production-sfo.browserless.io";

export type CaptureViewport = "desktop" | "mobile";

type ViewportConfig = {
  width: number;
  height: number;
  deviceScaleFactor: number;
  isMobile: boolean;
  hasTouch: boolean;
};

const VIEWPORTS: Record<CaptureViewport, ViewportConfig> = {
  desktop: {
    width: 1440,
    height: 900,
    deviceScaleFactor: 1,
    isMobile: false,
    hasTouch: false,
  },
  /** iPhone-ish frame — used for paid full reviews */
  mobile: {
    width: 390,
    height: 844,
    deviceScaleFactor: 2,
    isMobile: true,
    hasTouch: true,
  },
};

export type CaptureOpts = {
  fullPage?: boolean;
  viewport?: CaptureViewport;
};

export type ReviewCapture = {
  base64: string;
  provider: string;
  frames: string[];
  labels: string[];
};

/** Sample time and scroll in ONE browser session, never compare independent reloads as motion. */
export async function captureReviewFrames(targetUrl: string): Promise<ReviewCapture> {
  const token = process.env.BROWSERLESS_API_TOKEN;
  if (token) {
    try {
      const base = (process.env.BROWSERLESS_BASE_URL ?? DEFAULT_BROWSERLESS_BASE).replace(/\/$/, "");
      const endpoint = new URL(`${base}/function`);
      endpoint.searchParams.set("token", token);
      endpoint.searchParams.set("timeout", "60000");
      const res = await fetch(endpoint, {
        method: "POST",
        signal: AbortSignal.timeout(60000),
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          context: { url: targetUrl, viewport: VIEWPORTS.desktop },
          code: `export default async ({ page, context }) => {
            const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));
            await page.setViewport(context.viewport);
            await page.goto(context.url, { waitUntil: "domcontentloaded", timeout: 25000 });
            // Live dashboards and streaming connections may never become idle.
            await page.waitForNetworkIdle({ idleTime: 500, timeout: 5000 }).catch(() => {});
            await page.evaluate(async () => {
              await Promise.race([document.fonts.ready, new Promise(r => setTimeout(r, 2000))]);
              window.scrollTo(0, Math.min(document.body.scrollHeight * 0.35, 1200));
            });
            await sleep(600);
            await page.evaluate(() => window.scrollTo(0, 0));
            await sleep(2500);
            const frames = [];
            const labels = [];
            const capture = async label => {
              frames.push(await page.screenshot({ type: "png", encoding: "base64", fullPage: false }));
              labels.push(label);
            };
            await capture("Desktop 1440x900: settled hero, t=0");
            await sleep(1500);
            await capture("Desktop same session and scroll position, t≈+1.5s (not a video)");
            await page.evaluate(() => {
              window.scrollTo(0, Math.min(window.innerHeight * 0.65, document.documentElement.scrollHeight - window.innerHeight));
            });
            await sleep(1200);
            const y = await page.evaluate(() => window.scrollY);
            await capture("Desktop same session after scroll, actual y=" + y + "; scroll frame, not temporal proof");
            return { data: { frames, labels }, type: "application/json" };
          }`,
        }),
      });
      if (!res.ok) throw new Error(`Capture sequence status ${res.status}`);
      // Browserless versions differ: some unwrap the function's data, others retain the envelope.
      const raw = await res.json() as { data?: unknown; frames?: unknown; labels?: unknown };
      const data = (raw.data && typeof raw.data === "object" ? raw.data : raw) as { frames?: unknown; labels?: unknown };
      if (!Array.isArray(data.frames) || data.frames.length !== 3 ||
          !data.frames.every(frame => typeof frame === "string" && Buffer.from(frame, "base64").subarray(0, 8).equals(Buffer.from([137,80,78,71,13,10,26,10]))) ||
          !Array.isArray(data.labels) || data.labels.length !== 3 || !data.labels.every(label => typeof label === "string")) {
        throw new Error("Invalid capture sequence");
      }
      return { base64: data.frames[0], frames: data.frames, labels: data.labels, provider: "browserless-sequence" };
    } catch (error) {
      // A plan without /function support must still be able to scan. Never log token-bearing URLs.
      const reason = error instanceof Error && /^(Capture sequence status \d+|Invalid capture sequence)$/.test(error.message)
        ? error.message : "request failed or timed out";
      console.warn(`Sequence capture unavailable (${reason}); falling back to a single image.`);
    }
  }
  const shot = await captureScreenshotBase64(targetUrl, { viewport: "desktop", fullPage: false });
  return { ...shot, frames: [shot.base64], labels: ["Desktop single still only: motion and scroll not captured"] };
}

export function captureImageLabels(labels: string[]): string {
  return labels.map((label, index) => `Image ${index + 1}: ${label}`).join("\n");
}

export async function captureScreenshotBase64(
  targetUrl: string,
  opts?: CaptureOpts,
): Promise<{ base64: string; provider: string; viewport: CaptureViewport }> {
  const fullPage = opts?.fullPage ?? false;
  const viewport = opts?.viewport ?? "desktop";
  const vp = VIEWPORTS[viewport];

  const browserlessToken = process.env.BROWSERLESS_API_TOKEN;
  if (browserlessToken) {
    const shot = await captureWithBrowserless(
      targetUrl,
      fullPage,
      browserlessToken,
      vp,
    );
    return { ...shot, viewport };
  }

  const screenshotOneKey = process.env.SCREENSHOT_API_KEY;
  if (screenshotOneKey) {
    const shot = await captureWithScreenshotOne(
      targetUrl,
      fullPage,
      screenshotOneKey,
      vp,
    );
    return { ...shot, viewport };
  }

  const shot = await captureWithMicrolink(targetUrl, fullPage, vp);
  return { ...shot, viewport };
}

/** @deprecated Prefer captureScreenshotBase64 — kept for preeval call sites. */
export async function captureDesktopScreenshotBase64(
  targetUrl: string,
  opts?: { fullPage?: boolean },
): Promise<{ base64: string; provider: string }> {
  const shot = await captureScreenshotBase64(targetUrl, {
    fullPage: opts?.fullPage,
    viewport: "desktop",
  });
  return { base64: shot.base64, provider: shot.provider };
}

async function captureWithBrowserless(
  targetUrl: string,
  fullPage: boolean,
  token: string,
  vp: ViewportConfig,
): Promise<{ base64: string; provider: string }> {
  const base = (
    process.env.BROWSERLESS_BASE_URL ?? DEFAULT_BROWSERLESS_BASE
  ).replace(/\/$/, "");

  const endpoint = new URL(`${base}/screenshot`);
  endpoint.searchParams.set("token", token);
  // Plan max session is 60s — keep request budget under that
  endpoint.searchParams.set("timeout", "60000");

  const res = await fetch(endpoint.toString(), {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Cache-Control": "no-cache",
    },
    body: JSON.stringify({
      url: targetUrl,
      gotoOptions: {
        waitUntil: "networkidle2",
        timeout: 45000,
      },
      // Extra settle time for lazy images / video posters / motion
      waitForTimeout: 2500,
      // Nudge lazy-loaders: scroll mid-page then back to top before capture
      waitForFunction: {
        fn: `async () => {
          const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
          const h = Math.max(document.body.scrollHeight, window.innerHeight * 2);
          window.scrollTo(0, Math.min(h * 0.35, 1200));
          await sleep(600);
          window.scrollTo(0, 0);
          await sleep(400);
          return document.readyState === "complete";
        }`,
        timeout: 10000,
      },
      viewport: {
        width: vp.width,
        height: vp.height,
        deviceScaleFactor: vp.deviceScaleFactor,
        isMobile: vp.isMobile,
        hasTouch: vp.hasTouch,
      },
      options: {
        fullPage,
        type: "png",
      },
      // Keep going if a wait soft-fails
      bestAttempt: true,
      // Hide common consent overlays when supported by Browserless
      blockConsentModals: true,
    }),
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(
      `Browserless screenshot failed (${res.status}): ${body.slice(0, 240)}`,
    );
  }

  const contentType = res.headers.get("content-type") ?? "";
  if (!contentType.includes("image/") && !contentType.includes("octet-stream")) {
    const preview = (await res.text()).slice(0, 200);
    throw new Error(
      `Browserless returned non-image response: ${preview || contentType}`,
    );
  }

  const buf = Buffer.from(await res.arrayBuffer());
  if (buf.byteLength < 500) {
    throw new Error("Browserless screenshot too small — capture likely failed");
  }
  return { base64: buf.toString("base64"), provider: "browserless" };
}

async function captureWithScreenshotOne(
  targetUrl: string,
  fullPage: boolean,
  key: string,
  vp: ViewportConfig,
): Promise<{ base64: string; provider: string }> {
  const params = new URLSearchParams({
    access_key: key,
    url: targetUrl,
    viewport_width: String(vp.width),
    viewport_height: String(vp.height),
    device_scale_factor: String(vp.deviceScaleFactor),
    format: "png",
    block_ads: "true",
    block_cookie_banners: "true",
    delay: "3",
    timeout: "90",
    wait_until: "networkidle0",
    full_page: fullPage ? "true" : "false",
  });
  const res = await fetch(
    `https://api.screenshotone.com/take?${params.toString()}`,
  );
  if (!res.ok) {
    const body = await res.text();
    throw new Error(
      `ScreenshotOne failed (${res.status}): ${body.slice(0, 200)}`,
    );
  }
  const buf = Buffer.from(await res.arrayBuffer());
  return { base64: buf.toString("base64"), provider: "screenshotone" };
}

async function captureWithMicrolink(
  targetUrl: string,
  fullPage: boolean,
  vp: ViewportConfig,
): Promise<{ base64: string; provider: string }> {
  const micro = new URL("https://api.microlink.io");
  micro.searchParams.set("url", targetUrl);
  micro.searchParams.set("screenshot", "true");
  micro.searchParams.set("screenshot.type", "png");
  if (fullPage) {
    micro.searchParams.set("screenshot.fullPage", "true");
  }
  micro.searchParams.set("meta", "false");
  micro.searchParams.set("viewport.width", String(vp.width));
  micro.searchParams.set("viewport.height", String(vp.height));
  micro.searchParams.set(
    "viewport.deviceScaleFactor",
    String(vp.deviceScaleFactor),
  );
  micro.searchParams.set("viewport.isMobile", String(vp.isMobile));
  micro.searchParams.set("waitUntil", "networkidle2");
  micro.searchParams.set("waitForTimeout", "3500");
  micro.searchParams.set("scroll", "body");

  const microRes = await fetch(micro.toString());
  const contentType = microRes.headers.get("content-type") ?? "";

  if (contentType.includes("image/")) {
    const buf = Buffer.from(await microRes.arrayBuffer());
    if (buf.byteLength < 500) {
      throw new Error("Screenshot payload too small — capture likely failed");
    }
    return { base64: buf.toString("base64"), provider: "microlink" };
  }

  const rawText = await microRes.text();
  let microJson: {
    status?: string;
    data?: { screenshot?: { url?: string } | string };
    message?: string;
  };
  try {
    microJson = JSON.parse(rawText) as typeof microJson;
  } catch {
    throw new Error(
      "Screenshot provider returned a non-JSON response. Set BROWSERLESS_API_TOKEN for reliable captures.",
    );
  }

  const shotField = microJson.data?.screenshot;
  const shotUrl =
    typeof shotField === "string"
      ? shotField
      : shotField && typeof shotField === "object"
        ? shotField.url
        : undefined;

  if (!microRes.ok || microJson.status === "error" || !shotUrl) {
    throw new Error(
      microJson.message ??
        "Screenshot capture failed. Set BROWSERLESS_API_TOKEN for reliable captures.",
    );
  }

  const imgRes = await fetch(shotUrl);
  if (!imgRes.ok) {
    throw new Error(`Failed to download screenshot (${imgRes.status})`);
  }
  const buf = Buffer.from(await imgRes.arrayBuffer());
  if (buf.byteLength < 500) {
    throw new Error("Screenshot payload too small — capture likely failed");
  }
  return { base64: buf.toString("base64"), provider: "microlink" };
}
