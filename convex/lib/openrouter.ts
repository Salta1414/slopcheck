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

type OpenRouterMessageContent =
  | string
  | null
  | Array<{ type?: string; text?: string }>;

type OpenRouterChoice = {
  finish_reason?: string | null;
  native_finish_reason?: string | null;
  message?: {
    content?: OpenRouterMessageContent;
    refusal?: string | null;
  };
};

type OpenRouterResponse = {
  choices?: OpenRouterChoice[];
  error?: { message?: string };
};

function extractMessageText(content: OpenRouterMessageContent): string {
  if (typeof content === "string") {
    return content.trim();
  }
  if (!Array.isArray(content)) {
    return "";
  }
  return content
    .map((part) => (typeof part?.text === "string" ? part.text : ""))
    .join("")
    .trim();
}

async function callOpenRouterVision(args: {
  apiKey: string;
  model: string;
  system: string;
  userContent: OpenRouterContentPart[];
  useJsonObjectFormat: boolean;
}): Promise<{ text: string; finishReason: string; refusal: string }> {
  const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${args.apiKey}`,
      "Content-Type": "application/json",
      "HTTP-Referer":
        process.env.OPENROUTER_SITE_URL ?? "https://slopcheck.dev",
      "X-Title": process.env.OPENROUTER_APP_NAME ?? "Slopcheck",
    },
    body: JSON.stringify({
      model: args.model,
      temperature: 0.2,
      ...(args.useJsonObjectFormat
        ? { response_format: { type: "json_object" } }
        : {}),
      messages: [
        { role: "system", content: args.system },
        { role: "user", content: args.userContent },
      ],
    }),
  });

  const raw = (await res.json()) as OpenRouterResponse;
  if (!res.ok) {
    throw new Error(raw.error?.message ?? `OpenRouter error (${res.status})`);
  }

  const choice = raw.choices?.[0];
  const text = extractMessageText(choice?.message?.content ?? null);
  const refusal =
    typeof choice?.message?.refusal === "string" ? choice.message.refusal : "";
  const finishReason =
    choice?.finish_reason ?? choice?.native_finish_reason ?? "unknown";

  return { text, finishReason, refusal };
}

/**
 * Vision → JSON string. Retries once without response_format when providers
 * (esp. some Gemini routes) return HTTP 200 with empty content under json_object.
 */
export async function openRouterVisionJson(args: {
  model: string;
  system: string;
  userText: string;
  imagesBase64Png: string[];
  imageMimeTypes?: string[];
}): Promise<string> {
  const apiKey = requireOpenRouterKey();

  const userContent: OpenRouterContentPart[] = [
    {
      type: "text",
      text: `${args.userText}\n\nRespond with a single JSON object only — no markdown fences.`,
    },
    ...args.imagesBase64Png.map((b64, index) => ({
      type: "image_url" as const,
      image_url: {
        url: `data:${args.imageMimeTypes?.[index] ?? "image/png"};base64,${b64}`,
      },
    })),
  ];

  let last = await callOpenRouterVision({
    apiKey,
    model: args.model,
    system: args.system,
    userContent,
    useJsonObjectFormat: true,
  });

  if (!last.text && !last.refusal) {
    // Some OpenRouter Gemini providers accept the request but return empty
    // content when json_object mode is flaky — retry without it.
    last = await callOpenRouterVision({
      apiKey,
      model: args.model,
      system: args.system,
      userContent,
      useJsonObjectFormat: false,
    });
  }

  if (last.refusal) {
    throw new Error(`Model refused the request: ${last.refusal.slice(0, 180)}`);
  }
  if (!last.text) {
    throw new Error(
      `OpenRouter returned empty content (finish_reason=${last.finishReason}). Try again in a moment.`,
    );
  }
  return last.text;
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
