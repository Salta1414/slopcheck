import type { Metadata } from "next";
import Link from "next/link";
import { DeveloperAccountCard } from "@/components/developer-account-card";
import { CodeBlock } from "@/components/code-block";

export const metadata: Metadata = {
  title: "API & MCP server — Slopcheck for your AI",
  description:
    "Give Claude Code, Cursor or any MCP client Slopcheck's effect recipes and full anti-slop reviews. Plain REST API included.",
  alternates: { canonical: "/developers" },
};

const ORIGIN = "https://slopcheck.dev";

const CLAUDE_CODE = `claude mcp add --transport http slopcheck ${ORIGIN}/mcp \\
  --header "Authorization: Bearer slop_YOUR_KEY"`;

const MCP_JSON = `{
  "mcpServers": {
    "slopcheck": {
      "url": "${ORIGIN}/mcp",
      "headers": { "Authorization": "Bearer slop_YOUR_KEY" }
    }
  }
}`;

const REST_RECIPES = `curl ${ORIGIN}/api/v1/recipes
curl ${ORIGIN}/api/v1/recipes/liquid-glass`;

const REST_REVIEW = `curl -X POST ${ORIGIN}/api/v1/reviews \\
  -H "Authorization: Bearer slop_YOUR_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{"url": "https://example.com"}'
# → 202 { "id": "…", "status": "queued", "reportUrl": "…" }

curl ${ORIGIN}/api/v1/reviews/REVIEW_ID \\
  -H "Authorization: Bearer slop_YOUR_KEY"
# → { "status": "ready", "score": 72, "tells": […], "kit": {…}, "briefMarkdown": "…" }`;

const TOOLS = [
  [
    "list_recipes",
    "Free",
    "All effect recipes with when-to-use and when-not-to.",
  ],
  [
    "get_recipe",
    "Free",
    "Tested HTML/CSS/JS + React code for one recipe, as markdown.",
  ],
  [
    "review_site",
    "1 credit",
    "Start a full review of a URL. Takes 1–3 minutes.",
  ],
  [
    "get_review",
    "Key",
    "Score, tells, findings and the full redesign brief once ready.",
  ],
];

const card =
  "rounded-[1.8rem] border-[3px] border-[var(--ink)] bg-white p-6 shadow-[5px_6px_0_var(--ink)]";
const h2 =
  "font-[family-name:var(--font-display)] text-2xl font-extrabold text-[var(--ink)]";

export default function DevelopersPage() {
  return (
    <div className="mx-auto w-full max-w-5xl px-4 pb-20 pt-4 sm:px-6">
      <p className="motion-pop inline-block rounded-full border-[3px] border-[var(--ink)] bg-[var(--accent-3)] px-3 py-1 text-xs font-extrabold uppercase tracking-wide shadow-[3px_3px_0_var(--ink)]">
        MCP server · REST API
      </p>
      <h1
        className="motion-rise mt-4 max-w-3xl font-[family-name:var(--font-display)] text-4xl font-black leading-[1.05] tracking-tight text-[var(--ink)] sm:text-6xl"
        style={{ ["--delay" as string]: "100ms" }}
      >
        Plug Slopcheck into your AI
      </h1>
      <p
        className="motion-rise mt-4 max-w-2xl text-base font-medium text-[var(--ink)]/75 sm:text-lg"
        style={{ ["--delay" as string]: "200ms" }}
      >
        Your coding agent can pull the{" "}
        <Link
          href="/recipes"
          className="font-extrabold underline decoration-[var(--accent)] decoration-[3px] underline-offset-4"
        >
          effect recipes
        </Link>{" "}
        instead of guessing at liquid glass, and run a full review of the site
        it just built — then work through the brief on its own.
      </p>

      <div
        className="motion-rise mt-10 grid gap-6 lg:grid-cols-[1fr_1.4fr]"
        style={{ ["--delay" as string]: "300ms" }}
      >
        <section className="min-w-0">
          <DeveloperAccountCard />
        </section>

        <section className={card + " min-w-0"}>
          <h2 className={h2}>1 · Add the MCP server</h2>
          <CodeBlock label="Claude Code" code={CLAUDE_CODE} />
          <CodeBlock
            label="Cursor, Windsurf & other clients (mcp.json)"
            code={MCP_JSON}
          />
          <p className="mt-3 text-sm font-semibold text-[var(--ink)]/65">
            The recipe tools work without a key — drop the header if you only
            want those.
          </p>
        </section>
      </div>

      <section className={card + " mt-6"}>
        <h2 className={h2}>2 · Tools</h2>
        <ul className="mt-4 divide-y-[2px] divide-[var(--ink)]/10">
          {TOOLS.map(([name, cost, what]) => (
            <li
              key={name}
              className="flex flex-wrap items-baseline gap-x-3 gap-y-1 py-3"
            >
              <code className="font-black text-[var(--ink)]">{name}</code>
              <span className="rounded-full border-[2px] border-[var(--ink)] px-2 text-[11px] font-black uppercase">
                {cost}
              </span>
              <span className="basis-full text-sm font-semibold text-[var(--ink)]/70 sm:basis-auto">
                {what}
              </span>
            </li>
          ))}
        </ul>
        <p className="mt-3 text-sm font-semibold text-[var(--ink)]/65">
          Try asking:{" "}
          <em>
            &ldquo;Review my landing page with Slopcheck and apply the
            brief.&rdquo;
          </em>
        </p>
      </section>

      <section className={card + " mt-6"}>
        <h2 className={h2}>3 · Or call the REST API</h2>
        <CodeBlock label="Recipes (public)" code={REST_RECIPES} />
        <CodeBlock label="Reviews (API key)" code={REST_REVIEW} />
        <p className="mt-3 text-sm font-semibold text-[var(--ink)]/65">
          A failed review gives its credit back. Limit: 20 reviews per hour per
          key. Each review also has a private web report at{" "}
          <code>reportUrl</code>.
        </p>
      </section>
    </div>
  );
}
