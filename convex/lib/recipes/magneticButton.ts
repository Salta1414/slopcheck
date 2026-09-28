import type { Recipe } from "./types";

const css = `/* Magnetic button — it drifts toward the cursor and its label drifts a
   little further, then springs back. One of these per page, max. */
.magnetic {
  --mx: 0px;
  --my: 0px;
  display: inline-block;
  transform: translate(var(--mx), var(--my));
  transition: transform 0.45s cubic-bezier(0.3, 1.6, 0.5, 1);
}

.magnetic__label {
  display: inline-block;
  transform: translate(calc(var(--mx) * 0.4), calc(var(--my) * 0.4));
  transition: transform 0.45s cubic-bezier(0.3, 1.6, 0.5, 1);
}

.magnetic.is-pulling,
.magnetic.is-pulling .magnetic__label {
  transition-duration: 0.12s;
  transition-timing-function: ease-out;
}

@media (prefers-reduced-motion: reduce), (pointer: coarse) {
  .magnetic,
  .magnetic__label {
    transform: none !important;
  }
}`;

const js = `/* Pulls [data-magnetic] buttons toward the pointer when it is within
   data-radius px (default 90) of the button's center. */
(function () {
  var reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
  var fine = matchMedia("(pointer: fine)").matches;
  if (reduce || !fine) return;

  var buttons = Array.prototype.slice.call(document.querySelectorAll("[data-magnetic]"));
  var frame = 0;
  var pointer = { x: -9999, y: -9999 };

  function update() {
    frame = 0;
    buttons.forEach(function (el) {
      var r = el.getBoundingClientRect();
      var radius = Number(el.dataset.radius || 90);
      var strength = Number(el.dataset.strength || 0.35);
      var dx = pointer.x - (r.left + r.width / 2);
      var dy = pointer.y - (r.top + r.height / 2);
      var within = Math.hypot(dx, dy) < radius + Math.max(r.width, r.height) / 2;
      el.classList.toggle("is-pulling", within);
      el.style.setProperty("--mx", within ? (dx * strength).toFixed(1) + "px" : "0px");
      el.style.setProperty("--my", within ? (dy * strength).toFixed(1) + "px" : "0px");
    });
  }

  window.addEventListener("pointermove", function (e) {
    if (e.pointerType === "touch") return;
    pointer.x = e.clientX;
    pointer.y = e.clientY;
    if (!frame) frame = requestAnimationFrame(update);
  }, { passive: true });

  document.addEventListener("pointerleave", function () {
    pointer.x = -9999;
    pointer.y = -9999;
    if (!frame) frame = requestAnimationFrame(update);
  });
})();`;

const html = `<a class="magnetic" data-magnetic data-radius="90" href="/start">
  <span class="magnetic__label">Start your order</span>
</a>`;

const react = `"use client";

import { useEffect, useRef, type ReactNode } from "react";

/** Pair with the .magnetic CSS from this recipe. Wrap your styled button. */
export function Magnetic({
  children,
  radius = 90,
  strength = 0.35,
}: {
  children: ReactNode;
  radius?: number;
  strength?: number;
}) {
  const ref = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (
      matchMedia("(prefers-reduced-motion: reduce)").matches ||
      !matchMedia("(pointer: fine)").matches
    ) {
      return;
    }
    let frame = 0;
    const onMove = (e: PointerEvent) => {
      if (e.pointerType === "touch") return;
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        const r = el.getBoundingClientRect();
        const dx = e.clientX - (r.left + r.width / 2);
        const dy = e.clientY - (r.top + r.height / 2);
        const within = Math.hypot(dx, dy) < radius + Math.max(r.width, r.height) / 2;
        el.classList.toggle("is-pulling", within);
        el.style.setProperty("--mx", within ? (dx * strength).toFixed(1) + "px" : "0px");
        el.style.setProperty("--my", within ? (dy * strength).toFixed(1) + "px" : "0px");
      });
    };
    window.addEventListener("pointermove", onMove, { passive: true });
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("pointermove", onMove);
    };
  }, [radius, strength]);

  return (
    <span ref={ref} className="magnetic">
      <span className="magnetic__label">{children}</span>
    </span>
  );
}`;

export const magneticButton: Recipe = {
  id: "magnetic-button",
  name: "Magnetic button",
  category: "interaction",
  summary:
    "The primary CTA leans toward the cursor with its label moving a bit further, then springs back — playful, physical, and only where it matters.",
  useWhen: [
    "The single most important CTA on the page",
    "Playful or crafted brands where a bit of physics fits the voice",
  ],
  avoidWhen: [
    "Every button or nav link — then nothing stands out and everything feels jittery",
    "Serious flows (checkout, forms, destructive actions)",
  ],
  support:
    "All modern browsers. Mouse and pen only; touch devices get a normal button.",
  accessibility: [
    "Disabled for prefers-reduced-motion and coarse pointers",
    "The click target never moves away from the pointer — it moves toward it",
  ],
  performance: [
    "One passive pointermove listener, work batched per animation frame, transform only",
  ],
  html,
  css,
  js,
  react,
  aiHint:
    "Wrap only the main CTA with this magnetic recipe. Keep your own button styles; keep the reduced-motion and coarse-pointer guards.",
  demo: {
    html: `<div class="stage">
  <a class="magnetic stage-btn" data-magnetic data-radius="90" href="#">
    <span class="magnetic__label">Start your order</span>
  </a>
  <p class="stage-hint">Bring your cursor close to the button</p>
</div>`,
    css: `body{margin:0;min-height:100vh;display:grid;place-items:center;background:#f4f1ea;font-family:system-ui,sans-serif}
.stage{display:grid;justify-items:center;gap:22px}
.stage-btn{padding:18px 34px;border-radius:999px;background:#1c1b22;color:#f4f1ea;font-weight:700;font-size:18px;text-decoration:none}
.stage-hint{color:#8a8578;font-size:13px;margin:0}`,
  },
};
