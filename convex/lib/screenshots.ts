/**
 * Screenshot capture priority:
 * 1. Browserless (best — real Chromium, waits, scroll, cookie modals)
 * 2. ScreenshotOne (if SCREENSHOT_API_KEY)
 * 3. Microlink (last-resort free fallback)
 *
 * We wait for lazy content so empty heroes don't falsely score as AI slop.
 */

const DEFAULT_BROWSERLESS_BASE = "https://production-sfo.browserless.io";

export async function captureDesktopScreenshotBase64(
  targetUrl: string,
  opts?: { fullPage?: boolean },
): Promise<{ base64: string; provider: string }> {
  const fullPage = opts?.fullPage ?? false;

  const browserlessToken = process.env.BROWSERLESS_API_TOKEN;
  if (browserlessToken) {
    return await captureWithBrowserless(targetUrl, fullPage, browserlessToken);
  }

  const screenshotOneKey = process.env.SCREENSHOT_API_KEY;
  if (screenshotOneKey) {
    return await captureWithScreenshotOne(
      targetUrl,
      fullPage,
      screenshotOneKey,
    );
  }

  return await captureWithMicrolink(targetUrl, fullPage);
}

async function captureWithBrowserless(
  targetUrl: string,
  fullPage: boolean,
  token: string,
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
        width: 1440,
        height: 900,
        deviceScaleFactor: 1,
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
): Promise<{ base64: string; provider: string }> {
  const params = new URLSearchParams({
    access_key: key,
    url: targetUrl,
    viewport_width: "1440",
    viewport_height: "900",
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
): Promise<{ base64: string; provider: string }> {
  const micro = new URL("https://api.microlink.io");
  micro.searchParams.set("url", targetUrl);
  micro.searchParams.set("screenshot", "true");
  micro.searchParams.set("screenshot.type", "png");
  if (fullPage) {
    micro.searchParams.set("screenshot.fullPage", "true");
  }
  micro.searchParams.set("meta", "false");
  micro.searchParams.set("viewport.width", "1440");
  micro.searchParams.set("viewport.height", "900");
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
