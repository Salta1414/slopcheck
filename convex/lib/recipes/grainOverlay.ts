import type { Recipe } from "./types";

const css = `/* Film grain over the whole page — breaks the too-clean, rendered look
   of flat gradients and default UI. Static by default; optional subtle
   jitter for hero sections only. */
.grain {
  position: fixed;
  inset: -50%;
  z-index: 50;
  pointer-events: none;
  opacity: var(--grain-opacity, 0.14);
  /* overlay: mid-grey is neutral, so the same grain works on light and
     dark pages without a separate variant. */
  mix-blend-mode: overlay;
  /* Contrast is pushed inside the filter (slope 3.2) — raw fractal noise is
     too flat to read as grain at a sane opacity. */
  background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='220' height='220'%3E%3Cfilter id='g'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.8' numOctaves='3' stitchTiles='stitch'/%3E%3CfeColorMatrix type='saturate' values='0'/%3E%3CfeComponentTransfer%3E%3CfeFuncR type='linear' slope='3.2' intercept='-1.1'/%3E%3CfeFuncG type='linear' slope='3.2' intercept='-1.1'/%3E%3CfeFuncB type='linear' slope='3.2' intercept='-1.1'/%3E%3C/feComponentTransfer%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23g)'/%3E%3C/svg%3E");
  background-size: 220px 220px;
}

@keyframes grain-jitter {
  0%   { transform: translate(0, 0); }
  20%  { transform: translate(-3%, 2%); }
  40%  { transform: translate(2%, -3%); }
  60%  { transform: translate(-2%, -1%); }
  80%  { transform: translate(3%, 3%); }
  100% { transform: translate(0, 0); }
}

/* steps() keeps it filmic instead of a smooth, seasick slide. */
@media (prefers-reduced-motion: no-preference) {
  .grain--animated {
    animation: grain-jitter 0.9s steps(5) infinite;
  }
}

@media print {
  .grain {
    display: none;
  }
}`;

const html = `<!-- Once, as the last child of <body>. -->
<div class="grain" aria-hidden="true"></div>

<!-- Hero only, animated: put it inside the hero (position: relative)
     and use class="grain grain--animated" with position: absolute. -->`;

const react = `/** Mount once in your root layout. Pair with the .grain CSS. */
export function Grain({
  animated = false,
  opacity,
}: {
  animated?: boolean;
  opacity?: number;
}) {
  return (
    <div
      aria-hidden
      className={"grain" + (animated ? " grain--animated" : "")}
      style={opacity === undefined ? undefined : { ["--grain-opacity" as string]: opacity }}
    />
  );
}`;

export const grainOverlay: Recipe = {
  id: "grain-overlay",
  name: "Film grain overlay",
  category: "texture",
  summary:
    "A barely-there noise layer that makes flat gradients and big color fields feel printed and human instead of rendered.",
  useWhen: [
    "Pages with large flat color or gradient areas",
    "Brands going for editorial, analog, print or film vibes",
  ],
  avoidWhen: [
    "Opacity above ~0.2 — it starts looking dirty, not intentional",
    "Animated grain across the whole page: keep motion to one hero at most",
  ],
  support: "All browsers (SVG turbulence as a data-URI background).",
  accessibility: [
    "pointer-events: none and aria-hidden — never blocks clicks or screen readers",
    "Jitter only runs without prefers-reduced-motion",
  ],
  performance: [
    "The noise tile renders once and repeats; the fixed layer is composited",
    "The animated variant moves via transform only",
  ],
  html,
  css,
  react,
  aiHint:
    "Add this grain overlay once at the root with the default opacity. It works on light and dark themes as is. Don't animate it page-wide.",
};
