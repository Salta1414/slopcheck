"use client";

import { useEffect, useRef } from "react";

/**
 * Comic-print backdrop: a halftone dot grid that grows and takes on the brand
 * colors toward the corners, calm in the middle so text stays readable.
 * With a fine pointer, a "sniffing" lens follows the cursor — dots under it
 * swell, push outward and saturate. Static for touch and reduced motion.
 */

const SPACING = 18;
const LENS_RADIUS = 170;

type Rgb = [number, number, number];
const INK: Rgb = [26, 21, 35];
const LENS_COLOR: Rgb = [46, 230, 166];
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
    // Lens state: target follows the pointer, current eases toward it.
    const lens = { x: -9999, y: -9999, tx: -9999, ty: -9999, k: 0, tk: 0 };

    function lensEnabled() {
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
      // Phones: smaller, tighter corners so the hero text stays calm.
      const small = width < 640;
      const reach = small ? width * 0.55 : diag * 0.42;
      const maxGrow = small ? 2.2 : 3.4;
      const cols = Math.ceil(width / SPACING) + 1;
      const rows = Math.ceil(height / SPACING) + 1;

      for (let row = 0; row < rows; row++) {
        // Offset every other row like a real print screen.
        const shift = row % 2 ? SPACING / 2 : 0;
        for (let col = 0; col < cols; col++) {
          let x = col * SPACING + shift;
          let y = row * SPACING;

          // Distance to the nearest corner drives size and color.
          let nearest = CORNERS[0];
          let nearestD = Infinity;
          for (const c of CORNERS) {
            const d = Math.hypot(x - c.x * width, y - c.y * height);
            if (d < nearestD) {
              nearestD = d;
              nearest = c;
            }
          }
          const edge = smoothstep(1 - nearestD / reach);
          let radius = 0.55 + edge * maxGrow;
          let tint = edge;
          let alpha = 0.1 + edge * 0.5;

          let color = nearest.color;
          if (lens.k > 0.001) {
            const dx = x - lens.x;
            const dy = y - lens.y;
            const d = Math.hypot(dx, dy);
            if (d < LENS_RADIUS) {
              // Magnifier: dots swell most at the center and take the lens color.
              const f = (1 - d / LENS_RADIUS) ** 1.4 * lens.k;
              // Slight barrel bulge, strongest mid-radius so the center stays full.
              const bulge = Math.sin((d / LENS_RADIUS) * Math.PI) * 5 * lens.k;
              if (d > 0.01) {
                x += (dx / d) * bulge;
                y += (dy / d) * bulge;
              }
              radius = radius * (1 - f) + (radius + 4.6) * f;
              color = LENS_COLOR;
              tint = tint * (1 - f) + f;
              alpha = alpha * (1 - f) + 0.9 * f;
            }
          }

          if (radius < 0.5) continue;
          const [r, g, b] = [0, 1, 2].map((i) =>
            Math.round(INK[i] + (color[i] - INK[i]) * tint),
          );
          ctx!.fillStyle = `rgb(${r} ${g} ${b} / ${alpha.toFixed(3)})`;
          ctx!.beginPath();
          ctx!.arc(x, y, radius, 0, Math.PI * 2);
          ctx!.fill();
        }
      }

      if (lens.k > 0.02) {
        // Comic magnifier rim.
        ctx!.lineWidth = 2.5;
        ctx!.strokeStyle = `rgb(26 21 35 / ${(0.55 * lens.k).toFixed(3)})`;
        ctx!.setLineDash([10, 7]);
        ctx!.beginPath();
        ctx!.arc(lens.x, lens.y, LENS_RADIUS * 0.96, 0, Math.PI * 2);
        ctx!.stroke();
        ctx!.setLineDash([]);
      }
    }

    function tick() {
      frame = 0;
      lens.x += (lens.tx - lens.x) * 0.18;
      lens.y += (lens.ty - lens.y) * 0.18;
      lens.k += (lens.tk - lens.k) * 0.12;
      draw();
      const settling =
        Math.abs(lens.tx - lens.x) > 0.3 ||
        Math.abs(lens.ty - lens.y) > 0.3 ||
        Math.abs(lens.tk - lens.k) > 0.005;
      if (settling) frame = requestAnimationFrame(tick);
    }

    function schedule() {
      if (!frame) frame = requestAnimationFrame(tick);
    }

    function onPointerMove(e: PointerEvent) {
      if (e.pointerType !== "mouse" && e.pointerType !== "pen") return;
      if (!lensEnabled()) return;
      if (lens.tk === 0) {
        // Enter: start the lens at the pointer instead of sliding in from afar.
        lens.x = e.clientX;
        lens.y = e.clientY;
      }
      lens.tx = e.clientX;
      lens.ty = e.clientY;
      lens.tk = 1;
      schedule();
    }

    function onPointerLeave() {
      lens.tk = 0;
      schedule();
    }

    function onPreferenceChange() {
      if (!lensEnabled()) {
        lens.tk = 0;
        lens.k = 0;
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
