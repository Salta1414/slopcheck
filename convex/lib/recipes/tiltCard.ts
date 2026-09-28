import type { Recipe } from "./types";

const css = `/* 3D tilt with a moving light — the card leans toward the pointer and a
   soft highlight follows it, like holding a real print under a lamp. */
.tilt {
  --rx: 0deg;
  --ry: 0deg;
  --lx: 50%;
  --ly: 50%;
  --tilt-max: 8deg;
  position: relative;
  border-radius: 20px;
  transform: perspective(900px) rotateX(var(--rx)) rotateY(var(--ry));
  transform-style: preserve-3d;
  transition: transform 0.5s cubic-bezier(0.2, 0.8, 0.2, 1);
  will-change: transform;
}

.tilt.is-tilting {
  /* Follow the pointer tightly while moving; ease back on leave. */
  transition-duration: 0.08s;
}

.tilt::after {
  content: "";
  position: absolute;
  inset: 0;
  border-radius: inherit;
  pointer-events: none;
  background: radial-gradient(
    circle at var(--lx) var(--ly),
    rgb(255 255 255 / 0.35),
    transparent 55%
  );
  opacity: 0;
  transition: opacity 0.3s ease;
  mix-blend-mode: soft-light;
}

.tilt.is-tilting::after {
  opacity: 1;
}

@media (prefers-reduced-motion: reduce), (pointer: coarse) {
  .tilt {
    transform: none !important;
  }
  .tilt::after {
    display: none;
  }
}`;

const js = `/* Tilt for [data-tilt] elements. Mouse/pen only — touch scrolls normally. */
(function () {
  var reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
  var fine = matchMedia("(pointer: fine)").matches;
  if (reduce || !fine) return;

  document.querySelectorAll("[data-tilt]").forEach(function (el) {
    var max = parseFloat(getComputedStyle(el).getPropertyValue("--tilt-max")) || 8;
    var frame = 0;
    var px = 0.5;
    var py = 0.5;

    function render() {
      frame = 0;
      el.style.setProperty("--ry", ((px - 0.5) * 2 * max).toFixed(2) + "deg");
      el.style.setProperty("--rx", ((0.5 - py) * 2 * max).toFixed(2) + "deg");
      el.style.setProperty("--lx", (px * 100).toFixed(1) + "%");
      el.style.setProperty("--ly", (py * 100).toFixed(1) + "%");
    }

    el.addEventListener("pointermove", function (e) {
      if (e.pointerType === "touch") return;
      var r = el.getBoundingClientRect();
      px = (e.clientX - r.left) / r.width;
      py = (e.clientY - r.top) / r.height;
      el.classList.add("is-tilting");
      if (!frame) frame = requestAnimationFrame(render);
    });

    el.addEventListener("pointerleave", function () {
      el.classList.remove("is-tilting");
      px = 0.5;
      py = 0.5;
      if (!frame) frame = requestAnimationFrame(render);
    });
  });
})();`;

const html = `<article class="tilt" data-tilt>
  <img src="/product-shot.jpg" alt="The product on a desk" />
</article>`;

const react = `"use client";

import { useRef, type PointerEvent, type ReactNode } from "react";

/** Pair with the .tilt CSS from this recipe. */
export function TiltCard({
  children,
  className = "",
  max = 8,
}: {
  children: ReactNode;
  className?: string;
  max?: number;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const frame = useRef(0);

  function set(px: number, py: number) {
    cancelAnimationFrame(frame.current);
    frame.current = requestAnimationFrame(() => {
      const el = ref.current;
      if (!el) return;
      el.style.setProperty("--ry", ((px - 0.5) * 2 * max).toFixed(2) + "deg");
      el.style.setProperty("--rx", ((0.5 - py) * 2 * max).toFixed(2) + "deg");
      el.style.setProperty("--lx", (px * 100).toFixed(1) + "%");
      el.style.setProperty("--ly", (py * 100).toFixed(1) + "%");
    });
  }

  function onMove(e: PointerEvent<HTMLDivElement>) {
    if (e.pointerType === "touch") return;
    const r = e.currentTarget.getBoundingClientRect();
    e.currentTarget.classList.add("is-tilting");
    set((e.clientX - r.left) / r.width, (e.clientY - r.top) / r.height);
  }

  function onLeave(e: PointerEvent<HTMLDivElement>) {
    e.currentTarget.classList.remove("is-tilting");
    set(0.5, 0.5);
  }

  return (
    <div
      ref={ref}
      className={"tilt " + className}
      onPointerMove={onMove}
      onPointerLeave={onLeave}
    >
      {children}
    </div>
  );
}`;

export const tiltCard: Recipe = {
  id: "tilt-card-3d",
  name: "3D tilt with light",
  category: "interaction",
  summary:
    "A card that leans toward the pointer with a soft moving highlight — makes a real product shot feel physical.",
  useWhen: [
    "Product shots, app screenshots, book covers, posters — real imagery",
    "A small set (1–4) of hero objects you want people to play with",
  ],
  avoidWhen: [
    "Grids of icon cards — tilting template cards just makes them wobbly template cards",
    "Cards containing forms or dense text",
  ],
  support:
    "All modern browsers. Mouse and pen only; touch devices get a static card.",
  accessibility: [
    "Disabled for prefers-reduced-motion and coarse pointers",
    "Purely decorative — no information depends on the tilt",
  ],
  performance: [
    "Pointer updates are batched per animation frame; only transform and custom properties change",
  ],
  html,
  css,
  js,
  react,
  aiHint:
    "Use this tilt recipe only on real imagery (product shots, screenshots), never on feature cards. Keep the reduced-motion and coarse-pointer guards.",
  demo: {
    html: `<div class="stage">
  <article class="tilt stage-card" data-tilt>
    <div class="stage-shot"><span>Poster</span></div>
  </article>
  <p class="stage-hint">Move your mouse over the card</p>
</div>`,
    css: `body{margin:0;min-height:100vh;display:grid;place-items:center;background:#1c1b22;font-family:system-ui,sans-serif}
.stage{display:grid;justify-items:center;gap:18px;padding:40px}
.stage-card{width:210px;height:270px;overflow:hidden;box-shadow:0 30px 60px -20px rgb(0 0 0/.6)}
.stage-shot{height:100%;box-sizing:border-box;display:grid;place-items:end start;padding:22px;background:
radial-gradient(circle at 70% 30%,#ffe566 0 18%,transparent 19%),linear-gradient(160deg,#c8553d,#6b2a3a);color:#fff;font:800 34px/1 Georgia,serif}
.stage-hint{color:#8a8578;font-size:13px;margin:0}`,
  },
};
