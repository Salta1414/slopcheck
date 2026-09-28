/**
 * A hand-made, tested UI effect a user can hand to their own AI.
 * The review model only ever picks recipe ids — it never writes this code.
 */
export type Recipe = {
  id: string;
  name: string;
  category: "surface" | "texture" | "motion" | "interaction";
  /** One line: what it is and why it beats the default. */
  summary: string;
  useWhen: string[];
  /** Anti-slop guardrails — how this effect turns into template mush. */
  avoidWhen: string[];
  support: string;
  accessibility: string[];
  performance: string[];
  /** Plain HTML/CSS/JS, copy-paste ready. */
  html: string;
  css: string;
  js?: string;
  /** React + TypeScript version. */
  react: string;
  /** Short instruction to paste to an AI next to the code. */
  aiHint: string;
};
