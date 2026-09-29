import type { ActionCtx } from "../_generated/server";
import {
  ApiInputError,
  authenticate,
  CORS_HEADERS,
  findRecipe,
  getReview,
  INVALID_KEY_MESSAGE,
  listRecipes,
  MISSING_KEY_MESSAGE,
  recipeDetail,
  startReview,
  type ApiAuth,
} from "./apiHttp";

/**
 * Stateless MCP server over Streamable HTTP: every request is one JSON-RPC
 * POST answered with plain JSON (no SSE, no sessions). Recipes are public;
 * reviews need an API key in the Authorization header of the MCP config.
 */

const SUPPORTED_VERSIONS = ["2025-06-18", "2025-03-26", "2024-11-05"];
const LATEST_VERSION = SUPPORTED_VERSIONS[0];

const INSTRUCTIONS =
  "Slopcheck finds what makes a website look AI-generated and returns a design kit to fix it. " +
  "Use list_recipes/get_recipe for hand-made, tested effect code (liquid glass, grain, text reveal…) — " +
  "use that code verbatim instead of improvising the effect. " +
  "review_site starts a full review (costs 1 credit, takes 1–3 minutes); poll get_review until status is ready, " +
  "then follow its brief. Keep the site's real content; change how it looks and moves.";

const TOOLS = [
  {
    name: "list_recipes",
    title: "List effect recipes",
    description:
      "List Slopcheck's hand-made UI effect recipes (id, what it is, when to use it, when not to). Free.",
    inputSchema: {
      type: "object",
      properties: {},
      additionalProperties: false,
    },
    annotations: { readOnlyHint: true, openWorldHint: false },
  },
  {
    name: "get_recipe",
    title: "Get an effect recipe",
    description:
      "Full, render-tested code for one recipe as markdown: HTML, CSS, optional JS and a React version, plus guardrails. Use the code verbatim. Free.",
    inputSchema: {
      type: "object",
      properties: {
        id: {
          type: "string",
          description: "Recipe id from list_recipes, e.g. liquid-glass",
        },
      },
      required: ["id"],
      additionalProperties: false,
    },
    annotations: { readOnlyHint: true, openWorldHint: false },
  },
  {
    name: "review_site",
    title: "Start a slop review",
    description:
      "Start a full Slopcheck review of a public website: slop score, visible AI tells with evidence, findings and a design kit (palette, fonts, motion, per-section plan, recipes). Costs 1 API credit and takes 1–3 minutes — then call get_review with the returned id.",
    inputSchema: {
      type: "object",
      properties: {
        url: {
          type: "string",
          description: "Public website URL, e.g. https://example.com",
        },
      },
      required: ["url"],
      additionalProperties: false,
    },
    annotations: {
      readOnlyHint: false,
      destructiveHint: false,
      openWorldHint: true,
    },
  },
  {
    name: "get_review",
    title: "Get a review",
    description:
      "Status of a review started with review_site. When ready, returns the redesign brief as markdown (direction, tokens, section plan, recipe code) to implement. If still running, wait ~30 seconds and call again.",
    inputSchema: {
      type: "object",
      properties: {
        id: { type: "string", description: "Review id from review_site" },
      },
      required: ["id"],
      additionalProperties: false,
    },
    annotations: { readOnlyHint: true, openWorldHint: false },
  },
];

type JsonRpcRequest = {
  jsonrpc?: string;
  id?: string | number | null;
  method?: string;
  params?: Record<string, unknown>;
};

type ToolResult = {
  content: { type: "text"; text: string }[];
  isError?: boolean;
};

function text(value: string, isError = false): ToolResult {
  return {
    content: [{ type: "text", text: value }],
    ...(isError ? { isError } : {}),
  };
}

function rpcResult(id: JsonRpcRequest["id"], result: unknown) {
  return { jsonrpc: "2.0", id: id ?? null, result };
}

function rpcError(id: JsonRpcRequest["id"], code: number, message: string) {
  return { jsonrpc: "2.0", id: id ?? null, error: { code, message } };
}

async function callTool(
  ctx: ActionCtx,
  auth: ApiAuth | null | "invalid",
  name: string,
  args: Record<string, unknown>,
): Promise<ToolResult> {
  switch (name) {
    case "list_recipes": {
      const lines = listRecipes().map(
        (r) =>
          `- \`${r.id}\` — **${r.name}** (${r.category}): ${r.summary}\n  Use when: ${r.useWhen.join("; ")}\n  Avoid: ${r.avoidWhen.join("; ")}`,
      );
      return text(
        "Slopcheck effect recipes. Fetch one with get_recipe.\n\n" +
          lines.join("\n"),
      );
    }
    case "get_recipe": {
      const recipe =
        typeof args.id === "string" ? findRecipe(args.id) : undefined;
      if (!recipe) {
        return text(
          "Unknown recipe id. Available: " +
            listRecipes()
              .map((r) => r.id)
              .join(", "),
          true,
        );
      }
      return text(recipeDetail(recipe).markdown);
    }
    case "review_site":
    case "get_review": {
      if (auth === null) return text(MISSING_KEY_MESSAGE, true);
      if (auth === "invalid") return text(INVALID_KEY_MESSAGE, true);

      if (name === "review_site") {
        try {
          const started = await startReview(ctx, auth, args.url);
          return text(
            `Review started (id: ${started.id}). It takes 1–3 minutes — call get_review with this id. ` +
              `Human-readable report: ${started.reportUrl}\nCredits left: ${started.creditsLeft}`,
          );
        } catch (error) {
          if (error instanceof ApiInputError) return text(error.message, true);
          throw error;
        }
      }

      const review =
        typeof args.id === "string"
          ? await getReview(ctx, auth, args.id)
          : null;
      if (!review)
        return text("No review with that id on this API key's account.", true);
      if (review.status === "failed") {
        return text(
          `The review failed: ${review.error ?? "unknown error"}. The credit was refunded.`,
          true,
        );
      }
      if (review.status !== "ready" || !review.briefMarkdown) {
        return text(
          `Status: ${review.status}. Not done yet — wait ~30 seconds and call get_review again.`,
        );
      }
      return text(
        `Slop score ${review.score}/100 (${review.verdict}). ${review.summary ?? ""}\n` +
          `Report: ${review.reportUrl}\n\n---\n\n${review.briefMarkdown}`,
      );
    }
    default:
      throw new UnknownToolError(name);
  }
}

class UnknownToolError extends Error {}

async function handleOne(
  ctx: ActionCtx,
  msg: JsonRpcRequest,
  getAuth: () => Promise<ApiAuth | null | "invalid">,
): Promise<object | null> {
  if (!msg || typeof msg !== "object" || typeof msg.method !== "string") {
    return rpcError(msg?.id, -32600, "Invalid request");
  }
  // Notifications (no id) get no response.
  const isNotification = msg.id === undefined;

  switch (msg.method) {
    case "initialize": {
      const requested = msg.params?.protocolVersion;
      const protocolVersion =
        typeof requested === "string" && SUPPORTED_VERSIONS.includes(requested)
          ? requested
          : LATEST_VERSION;
      return rpcResult(msg.id, {
        protocolVersion,
        capabilities: { tools: { listChanged: false } },
        serverInfo: { name: "slopcheck", title: "Slopcheck", version: "1.0.0" },
        instructions: INSTRUCTIONS,
      });
    }
    case "ping":
      return isNotification ? null : rpcResult(msg.id, {});
    case "tools/list":
      return rpcResult(msg.id, { tools: TOOLS });
    case "tools/call": {
      const name = msg.params?.name;
      const args = (msg.params?.arguments ?? {}) as Record<string, unknown>;
      if (typeof name !== "string") {
        return rpcError(msg.id, -32602, "Missing tool name");
      }
      try {
        return rpcResult(
          msg.id,
          await callTool(ctx, await getAuth(), name, args),
        );
      } catch (error) {
        if (error instanceof UnknownToolError) {
          return rpcError(msg.id, -32602, `Unknown tool: ${name}`);
        }
        console.error("MCP tool failed", { name, error: String(error) });
        return rpcResult(
          msg.id,
          text("Slopcheck had an internal error. Try again.", true),
        );
      }
    }
    default:
      if (isNotification || msg.method.startsWith("notifications/"))
        return null;
      return rpcError(msg.id, -32601, `Method not found: ${msg.method}`);
  }
}

export async function handleMcp(
  ctx: ActionCtx,
  request: Request,
): Promise<Response> {
  const headers = { "Content-Type": "application/json", ...CORS_HEADERS };

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return new Response(JSON.stringify(rpcError(null, -32700, "Parse error")), {
      status: 400,
      headers,
    });
  }

  // Only look the key up once per HTTP request, and only if a tool needs it.
  let authPromise: Promise<ApiAuth | null | "invalid"> | null = null;
  const getAuth = () => (authPromise ??= authenticate(ctx, request));

  const messages = Array.isArray(body) ? body : [body];
  const responses: object[] = [];
  for (const msg of messages) {
    const res = await handleOne(ctx, msg as JsonRpcRequest, getAuth);
    if (res) responses.push(res);
  }

  if (responses.length === 0) {
    return new Response(null, { status: 202, headers: CORS_HEADERS });
  }
  return new Response(
    JSON.stringify(Array.isArray(body) ? responses : responses[0]),
    { status: 200, headers },
  );
}
