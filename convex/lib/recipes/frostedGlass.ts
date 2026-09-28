import type { Recipe } from "./types";

const css = `/* Frosted glass, done right.
   The template version is "blur(10px) + white/10" — grey mush with
   unreadable text. This one keeps color (saturate), adds a hairline rim
   and fine noise so it reads as a material, and stays legible. */
.frosted {
  --frost-bg: rgb(255 255 255 / 0.62);
  --frost-blur: 20px;
  position: relative;
  isolation: isolate;
  border-radius: 20px;
  background: var(--frost-bg);
  -webkit-backdrop-filter: blur(var(--frost-blur)) saturate(1.8);
  backdrop-filter: blur(var(--frost-blur)) saturate(1.8);
  box-shadow:
    inset 0 0 0 1px rgb(255 255 255 / 0.55),
    inset 0 1px 0 rgb(255 255 255 / 0.9),
    0 1px 2px rgb(0 0 0 / 0.06),
    0 18px 40px -18px rgb(0 0 0 / 0.28);
  color: #16131f;
}

/* Fine grain so the surface doesn't look like a flat overlay. */
.frosted::after {
  content: "";
  position: absolute;
  inset: 0;
  border-radius: inherit;
  pointer-events: none;
  opacity: 0.18;
  mix-blend-mode: overlay;
  background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='140' height='140'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='2' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E");
  z-index: -1;
}

/* Dark variant: tint, not grey. */
.frosted--dark {
  --frost-bg: rgb(20 18 30 / 0.55);
  color: #f5f3ff;
  box-shadow:
    inset 0 0 0 1px rgb(255 255 255 / 0.1),
    inset 0 1px 0 rgb(255 255 255 / 0.18),
    0 18px 40px -18px rgb(0 0 0 / 0.6);
}

/* No backdrop-filter support: go opaque instead of see-through mush. */
@supports not ((backdrop-filter: blur(1px)) or (-webkit-backdrop-filter: blur(1px))) {
  .frosted {
    --frost-bg: rgb(255 255 255 / 0.94);
  }
  .frosted--dark {
    --frost-bg: rgb(20 18 30 / 0.94);
  }
}

@media (prefers-reduced-transparency: reduce) {
  .frosted {
    -webkit-backdrop-filter: none;
    backdrop-filter: none;
    --frost-bg: rgb(255 255 255 / 0.97);
  }
  .frosted--dark {
    --frost-bg: rgb(20 18 30 / 0.97);
  }
}`;

const html = `<div class="frosted">
  <h3>Ships Friday</h3>
  <p>Readable on top of anything — the surface keeps the color underneath.</p>
</div>

<div class="frosted frosted--dark">
  <h3>Dark variant</h3>
  <p>Tinted, not grey.</p>
</div>`;

const react = `import type { ReactNode } from "react";

/** Pair with the .frosted CSS from this recipe. */
export function Frosted({
  children,
  dark = false,
  className = "",
}: {
  children: ReactNode;
  dark?: boolean;
  className?: string;
}) {
  return (
    <div className={"frosted " + (dark ? "frosted--dark " : "") + className}>
      {children}
    </div>
  );
}`;

export const frostedGlass: Recipe = {
  id: "frosted-glass",
  name: "Frosted glass (done right)",
  category: "surface",
  summary:
    "Blur that keeps the color underneath, a hairline rim and fine grain — a material, not grey mush — with opaque fallbacks.",
  useWhen: [
    "Sticky headers, popovers and toolbars that sit over moving or colorful content",
    "One featured panel over a photo or illustration",
  ],
  avoidWhen: [
    "Stacks of glass cards over a dark gradient — that is the glassmorphism template",
    "Over plain white or flat backgrounds: there is nothing to frost, use a solid surface",
  ],
  support:
    "backdrop-filter works in all current browsers (Safari via -webkit-). Older browsers get an opaque surface.",
  accessibility: [
    "Default tint keeps body text above 4.5:1 on busy backdrops; don't lower --frost-bg below ~0.5",
    "Honors prefers-reduced-transparency with an opaque surface",
  ],
  performance: [
    "backdrop-filter repaints while content behind it scrolls; avoid more than a few on screen",
    "Keep --frost-blur ≤ 24px on mobile",
  ],
  html,
  css,
  react,
  aiHint:
    "Use this frosted recipe for sticky/floating surfaces only. Keep saturate(), the rim shadows, the grain and both fallbacks; don't turn every card into glass.",
};
