import type { Recipe } from "./types";

const css = `/* Endless marquee, CSS only. Content is duplicated once (the copy is
   aria-hidden) and the track slides by exactly one copy, so the loop is
   seamless. Edges fade out instead of hard-cutting. */
.marquee {
  --marquee-speed: 40s;
  --marquee-gap: 3rem;
  display: flex;
  overflow: hidden;
  gap: var(--marquee-gap);
  -webkit-mask-image: linear-gradient(90deg, transparent, #000 8%, #000 92%, transparent);
  mask-image: linear-gradient(90deg, transparent, #000 8%, #000 92%, transparent);
}

.marquee__track {
  display: flex;
  flex-shrink: 0;
  align-items: center;
  gap: var(--marquee-gap);
  min-width: 100%;
  animation: marquee-scroll var(--marquee-speed) linear infinite;
}

.marquee--reverse .marquee__track {
  animation-direction: reverse;
}

/* Let people read or click what they're pointing at. */
.marquee:hover .marquee__track,
.marquee:focus-within .marquee__track {
  animation-play-state: paused;
}

@keyframes marquee-scroll {
  to {
    transform: translateX(calc(-100% - var(--marquee-gap)));
  }
}

/* Reduced motion: a static, scrollable row instead of a moving one. */
@media (prefers-reduced-motion: reduce) {
  .marquee {
    overflow-x: auto;
    -webkit-mask-image: none;
    mask-image: none;
  }
  .marquee__track {
    animation: none;
  }
  .marquee__track[aria-hidden="true"] {
    display: none;
  }
}`;

const html = `<div class="marquee">
  <ul class="marquee__track">
    <li>Hand-bound notebooks</li>
    <li>Letterpress cards</li>
    <li>Risograph posters</li>
    <li>Custom stamps</li>
  </ul>
  <!-- Exact copy for the seamless loop; hidden from screen readers. -->
  <ul class="marquee__track" aria-hidden="true">
    <li>Hand-bound notebooks</li>
    <li>Letterpress cards</li>
    <li>Risograph posters</li>
    <li>Custom stamps</li>
  </ul>
</div>`;

const react = `import type { ReactNode } from "react";

/** Pair with the .marquee CSS from this recipe. */
export function Marquee({
  items,
  reverse = false,
  speed,
}: {
  items: ReactNode[];
  reverse?: boolean;
  /** Seconds per loop. */
  speed?: number;
}) {
  const track = (hidden: boolean) => (
    <ul className="marquee__track" aria-hidden={hidden || undefined}>
      {items.map((item, i) => (
        <li key={i}>{item}</li>
      ))}
    </ul>
  );
  return (
    <div
      className={"marquee" + (reverse ? " marquee--reverse" : "")}
      style={speed ? { ["--marquee-speed" as string]: speed + "s" } : undefined}
    >
      {track(false)}
      {track(true)}
    </div>
  );
}`;

export const marquee: Recipe = {
  id: "marquee",
  name: "Seamless marquee",
  category: "motion",
  summary:
    "A CSS-only endless ticker with faded edges that pauses on hover and becomes a static row for reduced motion.",
  useWhen: [
    "Real, specific content: product names, press quotes, customer names you can back up, a menu",
    "A single band that adds rhythm between two calm sections",
  ],
  avoidWhen: [
    "An anonymous 'Trusted by' logo cloud — moving it doesn't make it credible",
    "More than one marquee on a page, or anything people must read to act",
  ],
  support: "All modern browsers (CSS animation + mask-image).",
  accessibility: [
    "Pauses on hover and keyboard focus; the duplicate track is aria-hidden",
    "prefers-reduced-motion turns it into a static scrollable row",
  ],
  performance: [
    "Pure CSS transform animation — no JS, no layout work per frame",
  ],
  html,
  css,
  react,
  aiHint:
    "Use this marquee once, with real specific content. Keep the duplicated aria-hidden track, hover pause and reduced-motion fallback.",
  demo: {
    html: `<div class="stage">
  <div class="marquee">
    <ul class="marquee__track"><li>Hand-bound notebooks</li><li>Letterpress cards</li><li>Risograph posters</li><li>Custom stamps</li></ul>
    <ul class="marquee__track" aria-hidden="true"><li>Hand-bound notebooks</li><li>Letterpress cards</li><li>Risograph posters</li><li>Custom stamps</li></ul>
  </div>
</div>`,
    css: `body{margin:0;min-height:100vh;display:grid;place-items:center;background:#f4f1ea;font-family:Georgia,serif;color:#1c1b22}
.stage{width:100%}.marquee__track{list-style:none;margin:0;padding:0;font-size:40px;font-weight:700}
.marquee__track li::after{content:"✳";margin-left:3rem;color:#c8553d}`,
  },
};
