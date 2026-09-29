"use client";

import { useEffect, useRef } from "react";

/**
 * Comic-print backdrop: an even dot grid, softly tinted with the brand colors
 * toward the corners. With a fine pointer the dots near the cursor lean
 * gently toward it. Static for touch and reduced motion.
 */

const SPACING = 18;
const DOT_RADIUS = 1.25;
const PULL_RADIUS = 200;
/** Max share of the distance a dot moves toward the cursor. */
const PULL = 0.3;

type Rgb = [number, number, number];
const INK: Rgb = [26, 21, 35];
// Corner colors: top-left mint, top-right pink, bottom-right yellow, bottom-left mint.
const CORNERS: { x: number; y: number; color: Rgb }[] = [
  { x: 0, y: 0, color: [46, 230, 166] },
  { x: 1, y: 0, color: [255, 90, 122] },
  { x: 1, y: 1, color: [255, 205, 40] },
  { x: 0, y: 1, color: [46, 230, 166] },
];

function smoothstep(t: number): number {
  const c = Math.min(1, Math.max(0, t));
  return c * c * (3 - 2 * c);
}

export function HalftoneBackground() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;

    const reduceMotion = matchMedia("(prefers-reduced-motion: reduce)");
    const finePointer = matchMedia("(pointer: fine)");

    let width = 0;
    let height = 0;
    let frame = 0;
    // Cursor state: target follows the pointer, current eases toward it.
    const cursor = { x: -9999, y: -9999, tx: -9999, ty: -9999, k: 0, tk: 0 };

    function pullEnabled() {
      return finePointer.matches && !reduceMotion.matches;
    }

    function resize() {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      width = window.innerWidth;
      height = window.innerHeight;
      canvas!.width = Math.round(width * dpr);
      canvas!.height = Math.round(height * dpr);
      ctx!.setTransform(dpr, 0, 0, dpr, 0, 0);
      draw();
    }

    function draw() {
      ctx!.clearRect(0, 0, width, height);
      const diag = Math.hypot(width, height);
      const cols = Math.ceil(width / SPACING) + 1;
      const rows = Math.ceil(height / SPACING) + 1;

      for (let row = 0; row < rows; row++) {
        // Offset every other row like a real print screen.
        const shift = row % 2 ? SPACING / 2 : 0;
        for (let col = 0; col < cols; col++) {
          let x = col * SPACING + shift;
          let y = row * SPACING;

          // Same size everywhere; only the color drifts toward the nearest corner.
          let nearest = CORNERS[0];
          let nearestD = Infinity;
          for (const c of CORNERS) {
            const d = Math.hypot(x - c.x * width, y - c.y * height);
            if (d < nearestD) {
              nearestD = d;
              nearest = c;
            }
          }
          const tint = smoothstep(1 - nearestD / (diag * 0.45)) * 0.85;

          if (cursor.k > 0.001) {
            const dx = cursor.x - x;
            const dy = cursor.y - y;
            const d = Math.hypot(dx, dy);
            if (d < PULL_RADIUS && d > 0.01) {
              // Lean toward the cursor; strongest a little way out, zero at
              // the edge, never overshooting the cursor itself.
              const m = d * PULL * (1 - d / PULL_RADIUS) ** 2 * cursor.k;
              x += (dx / d) * m;
              y += (dy / d) * m;
            }
          }

          const [r, g, b] = [0, 1, 2].map((i) =>
            Math.round(INK[i] + (nearest.color[i] - INK[i]) * tint),
          );
          const alpha = 0.2 + tint * 0.3;
          ctx!.fillStyle = `rgb(${r} ${g} ${b} / ${alpha.toFixed(3)})`;
          ctx!.beginPath();
          ctx!.arc(x, y, DOT_RADIUS, 0, Math.PI * 2);
          ctx!.fill();
        }
      }
    }

    function tick() {
      frame = 0;
      cursor.x += (cursor.tx - cursor.x) * 0.18;
      cursor.y += (cursor.ty - cursor.y) * 0.18;
      cursor.k += (cursor.tk - cursor.k) * 0.12;
      draw();
      const settling =
        Math.abs(cursor.tx - cursor.x) > 0.3 ||
        Math.abs(cursor.ty - cursor.y) > 0.3 ||
        Math.abs(cursor.tk - cursor.k) > 0.005;
      if (settling) frame = requestAnimationFrame(tick);
    }

    function schedule() {
      if (!frame) frame = requestAnimationFrame(tick);
    }

    function onPointerMove(e: PointerEvent) {
      if (e.pointerType !== "mouse" && e.pointerType !== "pen") return;
      if (!pullEnabled()) return;
      if (cursor.tk === 0) {
        // Enter: start at the pointer instead of sliding in from afar.
        cursor.x = e.clientX;
        cursor.y = e.clientY;
      }
      cursor.tx = e.clientX;
      cursor.ty = e.clientY;
      cursor.tk = 1;
      schedule();
    }

    function onPointerLeave() {
      cursor.tk = 0;
      schedule();
    }

    function onPreferenceChange() {
      if (!pullEnabled()) {
        cursor.tk = 0;
        cursor.k = 0;
      }
      draw();
    }

    resize();
    canvas.dataset.ready = "1";
    window.addEventListener("resize", resize);
    window.addEventListener("pointermove", onPointerMove, { passive: true });
    document.documentElement.addEventListener("pointerleave", onPointerLeave);
    reduceMotion.addEventListener("change", onPreferenceChange);
    finePointer.addEventListener("change", onPreferenceChange);

    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("resize", resize);
      window.removeEventListener("pointermove", onPointerMove);
      document.documentElement.removeEventListener(
        "pointerleave",
        onPointerLeave,
      );
      reduceMotion.removeEventListener("change", onPreferenceChange);
      finePointer.removeEventListener("change", onPreferenceChange);
    };
  }, []);

  return <canvas ref={canvasRef} aria-hidden className="halftone-canvas" />;
}
