import type { Recipe } from "./types";

const css = `/* Mesh gradient from YOUR palette — soft overlapping color fields that
   drift very slowly. The slop version is violet→indigo→cyan on black;
   this one is built from brand tokens and meant to be quiet. */
.mesh {
  /* Replace with your brand colors (kit palette). Keep them close in
     lightness so no single blob screams. */
  --mesh-base: #f4f1ea;
  --mesh-1: #f2c6a0;
  --mesh-2: #c8553d;
  --mesh-3: #9fb8ad;
  --mesh-4: #e8d9b5;
  position: relative;
  isolation: isolate;
  overflow: hidden;
  background-color: var(--mesh-base);
}

.mesh::before {
  content: "";
  position: absolute;
  inset: -25%;
  z-index: -1;
  background:
    radial-gradient(40% 50% at 20% 25%, var(--mesh-1), transparent 70%),
    radial-gradient(35% 45% at 80% 20%, var(--mesh-4), transparent 70%),
    radial-gradient(45% 55% at 70% 80%, var(--mesh-3), transparent 70%),
    radial-gradient(30% 40% at 25% 85%, var(--mesh-2), transparent 70%);
  filter: blur(40px) saturate(1.1);
  opacity: 0.75;
}

@keyframes mesh-drift {
  0% { transform: translate(0, 0) rotate(0deg) scale(1); }
  50% { transform: translate(-4%, 3%) rotate(8deg) scale(1.05); }
  100% { transform: translate(3%, -2%) rotate(-6deg) scale(1); }
}

@media (prefers-reduced-motion: no-preference) {
  .mesh--drift::before {
    animation: mesh-drift 40s ease-in-out infinite alternate;
  }
}`;

const html = `<section class="mesh mesh--drift">
  <h1>Small-batch coffee, roasted on Tuesdays</h1>
</section>

<!-- Pairs well with the grain-overlay recipe on top. -->`;

const react = `import type { CSSProperties, ReactNode } from "react";

/** Pair with the .mesh CSS from this recipe. Pass your palette. */
export function Mesh({
  children,
  colors,
  drift = true,
  className = "",
}: {
  children: ReactNode;
  /** [base, c1, c2, c3, c4] from your brand palette. */
  colors?: [string, string, string, string, string];
  drift?: boolean;
  className?: string;
}) {
  const style = colors
    ? ({
        "--mesh-base": colors[0],
        "--mesh-1": colors[1],
        "--mesh-2": colors[2],
        "--mesh-3": colors[3],
        "--mesh-4": colors[4],
      } as CSSProperties)
    : undefined;
  return (
    <section className={"mesh " + (drift ? "mesh--drift " : "") + className} style={style}>
      {children}
    </section>
  );
}`;

export const meshGradient: Recipe = {
  id: "mesh-gradient",
  name: "Brand mesh gradient",
  category: "texture",
  summary:
    "Soft, slowly drifting color fields built from your own palette — atmosphere without the violet-cyan AI glow.",
  useWhen: [
    "A hero or one section that needs warmth behind real content",
    "Brands with a defined palette of 3–5 colors close in lightness",
  ],
  avoidWhen: [
    "Default violet/indigo/cyan on black — that is exactly the look Slopcheck flags",
    "Behind glass cards or small text; combine with grain-overlay instead",
  ],
  support: "All modern browsers (CSS gradients + filter).",
  accessibility: [
    "Drift only runs without prefers-reduced-motion and is slow (40s) to avoid vestibular issues",
    "Check text contrast against the brightest blob, not just the base color",
  ],
  performance: [
    "One blurred pseudo-element, animated by transform only",
    "Avoid stacking several mesh sections in one viewport",
  ],
  html,
  css,
  react,
  aiHint:
    "Use this mesh recipe with the kit palette colors (never violet/indigo/cyan defaults) behind one section, ideally with grain-overlay on top.",
  demo: {
    html: `<section class="mesh mesh--drift stage">
  <h1>Small-batch coffee, roasted on Tuesdays</h1>
</section>`,
    css: `body{margin:0;min-height:100vh;font-family:Georgia,serif}
.stage{min-height:100vh;display:grid;place-items:center;padding:40px;box-sizing:border-box}
.stage h1{margin:0;font-size:54px;line-height:1.05;color:#1c1b22;max-width:13ch;text-align:center}`,
  },
};
