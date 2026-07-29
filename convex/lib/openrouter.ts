export function requireOpenRouterKey(): string {
  const key = process.env.OPENROUTER_API_KEY;
  if (!key) {
    throw new Error(
      "OPENROUTER_API_KEY is not set. Add it with: npx convex env set OPENROUTER_API_KEY <key>",
    );
  }
  return key;
}

export function preevalModel(): string {
  // Fast vision default for free teaser scans — override via OPENROUTER_PREEVAL_MODEL
  return process.env.OPENROUTER_PREEVAL_MODEL ?? "google/gemini-3.6-flash";
}

export function fullReviewModel(): string {
  return (
    process.env.OPENROUTER_FULL_MODEL ?? "anthropic/claude-opus-5"
  );
}

type OpenRouterContentPart =
  | { type: "text"; text: string }
  | { type: "image_url"; image_url: { url: string } };

type OpenRouterResponse = {
  choices?: Array<{
    message?: { content?: string | null };
  }>;
  error?: { message?: string };
};

export async function openRouterVisionJson(args: {
  model: string;
  system: string;
  userText: string;
  imagesBase64Png: string[];
}): Promise<string> {
  const apiKey = requireOpenRouterKey();

  const content: OpenRouterContentPart[] = [
    { type: "text", text: args.userText },
    ...args.imagesBase64Png.map((b64) => ({
      type: "image_url" as const,
      image_url: { url: `data:image/png;base64,${b64}` },
    })),
  ];

  const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
      "HTTP-Referer":
        process.env.OPENROUTER_SITE_URL ?? "http://localhost:3000",
      "X-Title": process.env.OPENROUTER_APP_NAME ?? "Slopcheck",
    },
    body: JSON.stringify({
      model: args.model,
      temperature: 0.2,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: args.system },
        { role: "user", content },
      ],
    }),
  });

  const raw = (await res.json()) as OpenRouterResponse;
  if (!res.ok) {
    throw new Error(
      raw.error?.message ?? `OpenRouter error (${res.status})`,
    );
  }

  const text = raw.choices?.[0]?.message?.content;
  if (!text) {
    throw new Error("OpenRouter returned empty content");
  }
  return text;
}

export function parseJsonObject(text: string): unknown {
  const trimmed = text.trim();
  try {
    return JSON.parse(trimmed);
  } catch {
    const start = trimmed.indexOf("{");
    const end = trimmed.lastIndexOf("}");
    if (start >= 0 && end > start) {
      return JSON.parse(trimmed.slice(start, end + 1));
    }
    throw new Error("Model did not return valid JSON");
  }
}
