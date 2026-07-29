# Screenshots & AI — OpenRouter

Alle AI-Calls laufen über **[OpenRouter](https://openrouter.ai)** (ein Key, Model-Switch per Env).

## Empfehlung (MVP)

| Stufe | Capture | OpenRouter Model | Ziel | ~Kosten/Scan |
|-------|---------|------------------|------|--------------|
| **Preeval** | 1× Desktop above-the-fold | `google/gemini-3.6-flash` | Teaser-Score + Flags | **~0.2–2¢** |
| **Full Review** | Desktop + Mobile (+ optional) | `anthropic/claude-opus-5` | Score + Findings + Fix-Prompts | **~5–25¢** |

**Capture:** [Browserless](https://www.browserless.io/) (primary) · ScreenshotOne optional · Microlink last-resort fallback.

Siehe auch: [master-plan.md](./master-plan.md)

---

## Capture Priority

1. **Browserless** — if `BROWSERLESS_API_TOKEN` is set (real Chromium, waits, scroll, consent modals)
2. **ScreenshotOne** — if `SCREENSHOT_API_KEY` is set
3. **Microlink** — free fallback (weaker on lazy heroes)

### Browserless request (sketch)

```
POST {BROWSERLESS_BASE_URL}/screenshot?token=...&timeout=90000
{
  url,
  gotoOptions: { waitUntil: "networkidle2", timeout: 60000 },
  waitForTimeout: 3500,
  waitForFunction: { /* scroll mid → top to wake lazy loaders */ },
  viewport: { width: 1440, height: 900 },
  options: { fullPage, type: "png" },
  bestAttempt: true,
  blockConsentModals: true
}
```

Env:
```
BROWSERLESS_API_TOKEN=
BROWSERLESS_BASE_URL=https://production-sfo.browserless.io  # optional
SCREENSHOT_API_KEY=  # optional secondary
```

### Need

1. **Desktop** 1440×900 (Preeval: above-the-fold)
2. **Mobile** 390×844 (Full)
3. Optional mid-scroll

### Capture Flow (Convex `"use node"` action)

```
1. Validate URL (https, block private IPs / SSRF)
2. Screenshot API call
3. Store PNG in Convex File Storage
4. Pass storageId / base64 into OpenRouter vision call
5. Patch scan status + teaser fields
```

### Edge Cases

- Cookie-Banner → retry / Browserless dismiss
- SPA lazy load → delay + waitUntil
- Bot block → `failed` + klare Message

---

## 2) OpenRouter als einzige AI-Schicht

```
[Screenshots]
     │
     ▼
┌──────────────────────────────────┐
│  PREEVAL via OpenRouter (cheap)  │
│  JSON rubrik → teaser only       │
└───────────────┬──────────────────┘
                │ €5 Stripe
                ▼
┌──────────────────────────────────┐
│  FULL via OpenRouter (strong)    │
│  same rubrik + prompts           │
└──────────────────────────────────┘
```

### Warum OpenRouter

- Ein Billing / ein Key
- Models austauschbar ohne Provider-SDKs
- Easy A/B (Flash vs Mini, Sonnet vs GPT-4o)

### Env

```
OPENROUTER_API_KEY=
OPENROUTER_PREEVAL_MODEL=google/gemini-3.6-flash
OPENROUTER_FULL_MODEL=anthropic/claude-opus-5
# optional
OPENROUTER_SITE_URL=https://slopcheck.app
OPENROUTER_APP_NAME=Slopcheck
```

### Helper Sketch

```ts
// convex/lib/openrouter.ts
export async function openRouterChat(args: {
  model: string;
  system: string;
  userText: string;
  imagesBase64Png: string[];
}): Promise<string> {
  const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.OPENROUTER_API_KEY}`,
      "Content-Type": "application/json",
      "HTTP-Referer": process.env.OPENROUTER_SITE_URL ?? "http://localhost:3000",
      "X-Title": process.env.OPENROUTER_APP_NAME ?? "Slopcheck",
    },
    body: JSON.stringify({
      model: args.model,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: args.system },
        {
          role: "user",
          content: [
            { type: "text", text: args.userText },
            ...args.imagesBase64Png.map((b64) => ({
              type: "image_url" as const,
              image_url: { url: `data:image/png;base64,${b64}` },
            })),
          ],
        },
      ],
    }),
  });
  // parse choices[0].message.content → JSON
}
```

---

## 3) Output Contracts

### Preeval (teaser)

```json
{
  "estimatedScore": 72,
  "confidence": "medium",
  "teaserFlags": ["...", "..."],
  "verdict": "likely_slop"
}
```

### Full

```json
{
  "score": 78,
  "summary": "...",
  "findings": [{ "area": "hero", "severity": "high", "issue": "...", "whyItFeelsAi": "...", "fixHint": "..." }],
  "prompts": [{ "tool": "cursor", "title": "...", "prompt": "..." }]
}
```

Rubrik: [scoring-rubric.md](./scoring-rubric.md)

---

## 4) Cost Model (grob)

100 Preevals/Tag, 10% pay (10 Full):

| | /Tag | /Monat |
|--|------|--------|
| Capture | ~€2–4 | ~€60–120 |
| OpenRouter preeval | ~€1 | ~€30 |
| OpenRouter full | ~€1.50 | ~€45 |
| **Total COGS** | **~€5** | **~€150** |
| Revenue (10×€5) | €50 | €1500 |

---

## Entscheidung

- **AI:** OpenRouter only  
- **Preeval model:** cheap vision via OR  
- **Full model:** strong vision via OR  
- **Capture:** ScreenshotOne MVP  
- **Orchestration:** Convex actions + File Storage
