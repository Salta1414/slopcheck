import type { Recipe } from "./types";

// Note: recipe code avoids template literals so it can live in these strings.

const css = `/* Liquid glass — a lens, not a blur.
   The backdrop bends at the rounded rim (SVG displacement, Chromium),
   stays sharp in the middle, and gets a specular edge.
   Everywhere else it falls back to honest frosted glass. */
.liquid-glass {
  --lg-radius: 28px;
  --lg-tint: rgb(255 255 255 / 0.08);
  position: relative;
  isolation: isolate;
  border-radius: var(--lg-radius);
  background: var(--lg-tint);
  /* Rim light: bright top edge, faint bottom edge, soft outer drop. */
  box-shadow:
    inset 0 1px 0 rgb(255 255 255 / 0.55),
    inset 0 -1px 0 rgb(255 255 255 / 0.12),
    inset 0 0 0 1px rgb(255 255 255 / 0.18),
    0 12px 32px -12px rgb(0 0 0 / 0.35);
}

/* Specular sheen across the top third — sells the "curved surface". */
.liquid-glass::before {
  content: "";
  position: absolute;
  inset: 0;
  border-radius: inherit;
  pointer-events: none;
  background: linear-gradient(
    180deg,
    rgb(255 255 255 / 0.22) 0%,
    rgb(255 255 255 / 0.04) 38%,
    transparent 60%
  );
  z-index: -1;
}

/* Browsers without SVG backdrop filters (Safari, Firefox): frosted. */
.liquid-glass.lg--fallback {
  -webkit-backdrop-filter: blur(18px) saturate(1.6);
  backdrop-filter: blur(18px) saturate(1.6);
  background: rgb(255 255 255 / 0.16);
}

@supports not ((backdrop-filter: blur(1px)) or (-webkit-backdrop-filter: blur(1px))) {
  .liquid-glass.lg--fallback {
    background: rgb(30 30 40 / 0.82);
  }
}

@media (prefers-reduced-transparency: reduce) {
  .liquid-glass,
  .liquid-glass.lg--fallback {
    backdrop-filter: none !important;
    -webkit-backdrop-filter: none !important;
    background: rgb(30 30 40 / 0.92);
  }
}`;

const js = `/* Liquid glass — builds one displacement map per element.
   Mark elements with data-liquid-glass. Optional: data-bezel (px of curved
   rim, default 14), data-strength (refraction, default 44), data-blur. */
(function () {
  var SVG_NS = "http://www.w3.org/2000/svg";
  // Chromium only: Safari/Firefox ignore SVG filters in backdrop-filter.
  // userAgentData is missing on insecure origins, so fall back to the UA
  // string (Chrome on iOS reports CriOS and correctly gets the fallback).
  var brands = navigator.userAgentData && navigator.userAgentData.brands;
  var supportsLens = brands
    ? brands.some(function (b) { return b.brand === "Chromium"; })
    : navigator.userAgent.indexOf("Chrome/") !== -1;
  var reduceTransparency = matchMedia("(prefers-reduced-transparency: reduce)").matches;
  var elements = Array.prototype.slice.call(document.querySelectorAll("[data-liquid-glass]"));

  if (!supportsLens || reduceTransparency) {
    elements.forEach(function (el) { el.classList.add("lg--fallback"); });
    return;
  }

  var defs = document.createElementNS(SVG_NS, "svg");
  defs.setAttribute("aria-hidden", "true");
  defs.setAttribute("width", "0");
  defs.setAttribute("height", "0");
  defs.style.position = "absolute";
  document.body.appendChild(defs);

  // Signed distance to a rounded rectangle (negative inside).
  function roundedRectSdf(px, py, halfW, halfH, r) {
    var qx = Math.abs(px) - (halfW - r);
    var qy = Math.abs(py) - (halfH - r);
    var ox = Math.max(qx, 0);
    var oy = Math.max(qy, 0);
    return Math.sqrt(ox * ox + oy * oy) + Math.min(Math.max(qx, qy), 0) - r;
  }

  // Red = x offset, green = y offset, 128 = no movement. Only the rim
  // moves, pulling pixels inward so the edge magnifies like a lens.
  function displacementMap(w, h, radius, bezel) {
    var canvas = document.createElement("canvas");
    canvas.width = w;
    canvas.height = h;
    var ctx = canvas.getContext("2d");
    var img = ctx.createImageData(w, h);
    var halfW = w / 2;
    var halfH = h / 2;
    var r = Math.min(radius, halfW, halfH);
    for (var y = 0; y < h; y++) {
      for (var x = 0; x < w; x++) {
        var px = x + 0.5 - halfW;
        var py = y + 0.5 - halfH;
        var depth = -roundedRectSdf(px, py, halfW, halfH, r);
        var dx = 0;
        var dy = 0;
        if (depth > 0 && depth < bezel) {
          // Outward normal via finite differences of the distance field.
          var nx = roundedRectSdf(px + 1, py, halfW, halfH, r) - roundedRectSdf(px - 1, py, halfW, halfH, r);
          var ny = roundedRectSdf(px, py + 1, halfW, halfH, r) - roundedRectSdf(px, py - 1, halfW, halfH, r);
          var len = Math.sqrt(nx * nx + ny * ny) || 1;
          var t = 1 - depth / bezel;
          var bend = t * t * (3 - 2 * t); // smoothstep: strongest at the very edge
          dx = -(nx / len) * bend;
          dy = -(ny / len) * bend;
        }
        var i = (y * w + x) * 4;
        img.data[i] = Math.round(128 + dx * 127);
        img.data[i + 1] = Math.round(128 + dy * 127);
        img.data[i + 2] = 128;
        img.data[i + 3] = 255;
      }
    }
    ctx.putImageData(img, 0, 0);
    return canvas.toDataURL();
  }

  function apply(el, index) {
    var rect = el.getBoundingClientRect();
    var w = Math.max(1, Math.round(rect.width));
    var h = Math.max(1, Math.round(rect.height));
    var radius = parseFloat(getComputedStyle(el).borderTopLeftRadius) || 0;
    var bezel = Number(el.dataset.bezel || 14);
    var strength = Number(el.dataset.strength || 44);
    var blur = Number(el.dataset.blur || 1.5);
    var id = "liquid-glass-" + index;

    var old = document.getElementById(id);
    if (old) old.remove();

    var filter = document.createElementNS(SVG_NS, "filter");
    filter.setAttribute("id", id);
    filter.setAttribute("x", "0");
    filter.setAttribute("y", "0");
    filter.setAttribute("width", String(w));
    filter.setAttribute("height", String(h));
    filter.setAttribute("filterUnits", "userSpaceOnUse");
    filter.setAttribute("color-interpolation-filters", "sRGB");

    var image = document.createElementNS(SVG_NS, "feImage");
    image.setAttribute("href", displacementMap(w, h, radius, bezel));
    image.setAttribute("x", "0");
    image.setAttribute("y", "0");
    image.setAttribute("width", String(w));
    image.setAttribute("height", String(h));
    image.setAttribute("result", "map");

    var displace = document.createElementNS(SVG_NS, "feDisplacementMap");
    displace.setAttribute("in", "SourceGraphic");
    displace.setAttribute("in2", "map");
    displace.setAttribute("scale", String(strength));
    displace.setAttribute("xChannelSelector", "R");
    displace.setAttribute("yChannelSelector", "G");

    filter.appendChild(image);
    filter.appendChild(displace);
    defs.appendChild(filter);

    el.style.backdropFilter = "url(#" + id + ") blur(" + blur + "px) saturate(1.5)";
  }

  elements.forEach(apply);

  // Maps are sized to the element — rebuild when it changes size.
  var timer;
  var observer = new ResizeObserver(function () {
    clearTimeout(timer);
    timer = setTimeout(function () { elements.forEach(apply); }, 120);
  });
  elements.forEach(function (el) { observer.observe(el); });
})();`;

const html = `<nav class="liquid-glass" data-liquid-glass data-bezel="14" data-strength="44">
  <a href="#">Work</a>
  <a href="#">About</a>
  <a href="#">Contact</a>
</nav>`;

const react = `"use client";

import { useEffect, useId, useRef, type ReactNode } from "react";

type LiquidGlassProps = {
  children: ReactNode;
  className?: string;
  /** Width of the curved rim in px. */
  bezel?: number;
  /** How far the rim bends the backdrop. */
  strength?: number;
  blur?: number;
};

function roundedRectSdf(px: number, py: number, halfW: number, halfH: number, r: number) {
  const qx = Math.abs(px) - (halfW - r);
  const qy = Math.abs(py) - (halfH - r);
  const ox = Math.max(qx, 0);
  const oy = Math.max(qy, 0);
  return Math.hypot(ox, oy) + Math.min(Math.max(qx, qy), 0) - r;
}

function displacementMap(w: number, h: number, radius: number, bezel: number) {
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d");
  if (!ctx) return "";
  const img = ctx.createImageData(w, h);
  const halfW = w / 2;
  const halfH = h / 2;
  const r = Math.min(radius, halfW, halfH);
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const px = x + 0.5 - halfW;
      const py = y + 0.5 - halfH;
      const depth = -roundedRectSdf(px, py, halfW, halfH, r);
      let dx = 0;
      let dy = 0;
      if (depth > 0 && depth < bezel) {
        const nx = roundedRectSdf(px + 1, py, halfW, halfH, r) - roundedRectSdf(px - 1, py, halfW, halfH, r);
        const ny = roundedRectSdf(px, py + 1, halfW, halfH, r) - roundedRectSdf(px, py - 1, halfW, halfH, r);
        const len = Math.hypot(nx, ny) || 1;
        const t = 1 - depth / bezel;
        const bend = t * t * (3 - 2 * t);
        dx = -(nx / len) * bend;
        dy = -(ny / len) * bend;
      }
      const i = (y * w + x) * 4;
      img.data[i] = Math.round(128 + dx * 127);
      img.data[i + 1] = Math.round(128 + dy * 127);
      img.data[i + 2] = 128;
      img.data[i + 3] = 255;
    }
  }
  ctx.putImageData(img, 0, 0);
  return canvas.toDataURL();
}

/** Chromium only: Safari/Firefox ignore SVG filters in backdrop-filter. */
function supportsLens() {
  const brands = (
    navigator as Navigator & { userAgentData?: { brands: { brand: string }[] } }
  ).userAgentData?.brands;
  const chromium = brands
    ? brands.some((b) => b.brand === "Chromium")
    : navigator.userAgent.indexOf("Chrome/") !== -1;
  return chromium && !matchMedia("(prefers-reduced-transparency: reduce)").matches;
}

/** Pair with the .liquid-glass CSS from this recipe. */
export function LiquidGlass({
  children,
  className = "",
  bezel = 14,
  strength = 44,
  blur = 1.5,
}: LiquidGlassProps) {
  const ref = useRef<HTMLDivElement>(null);
  const feImage = useRef<SVGFEImageElement>(null);
  const filter = useRef<SVGFilterElement>(null);
  const id = "lg" + useId().replace(/:/g, "");

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (!supportsLens()) {
      el.classList.add("lg--fallback");
      return;
    }
    const build = () => {
      const w = Math.max(1, Math.round(el.offsetWidth));
      const h = Math.max(1, Math.round(el.offsetHeight));
      const radius = parseFloat(getComputedStyle(el).borderTopLeftRadius) || 0;
      filter.current?.setAttribute("width", String(w));
      filter.current?.setAttribute("height", String(h));
      feImage.current?.setAttribute("width", String(w));
      feImage.current?.setAttribute("height", String(h));
      feImage.current?.setAttribute("href", displacementMap(w, h, radius, bezel));
      el.style.backdropFilter = "url(#" + id + ") blur(" + blur + "px) saturate(1.5)";
    };
    build();
    const observer = new ResizeObserver(build);
    observer.observe(el);
    return () => observer.disconnect();
  }, [id, bezel, blur]);

  return (
    <div ref={ref} className={"liquid-glass " + className}>
      <svg aria-hidden width="0" height="0" style={{ position: "absolute" }}>
        <filter
          ref={filter}
          id={id}
          x="0"
          y="0"
          filterUnits="userSpaceOnUse"
          colorInterpolationFilters="sRGB"
        >
          <feImage ref={feImage} x="0" y="0" result="map" />
          <feDisplacementMap
            in="SourceGraphic"
            in2="map"
            scale={strength}
            xChannelSelector="R"
            yChannelSelector="G"
          />
        </filter>
      </svg>
      {children}
    </div>
  );
}`;

export const liquidGlass: Recipe = {
  id: "liquid-glass",
  name: "Liquid glass",
  category: "surface",
  summary:
    "A real lens: the backdrop refracts at the rounded rim and stays sharp in the middle, with a specular edge — not just a blur.",
  useWhen: [
    "One hero-level floating element: nav bar, a single CTA pill, a media control",
    "Over rich, colorful or photographic content that is worth bending",
  ],
  avoidWhen: [
    "Every card on the page — glass everywhere is exactly the template look",
    "Over flat single-color backgrounds (nothing to refract, it just looks grey)",
    "Long-form text containers — refraction hurts reading",
  ],
  support:
    "Full lens in Chromium browsers (SVG filters in backdrop-filter). Safari and Firefox get the frosted fallback automatically.",
  accessibility: [
    "Honors prefers-reduced-transparency with an opaque surface",
    "Keep text on glass at 4.5:1 contrast against the darkest backdrop it can sit on",
  ],
  performance: [
    "The displacement map is computed once per size change; keep glass elements few and small",
    "Avoid animating width/height of a glass element — each resize rebuilds the map",
  ],
  html,
  css,
  js,
  react,
  aiHint:
    "Use this liquid-glass recipe verbatim for at most one or two floating elements. Keep the fallback class and the reduced-transparency rule.",
  demo: {
    html: `<div class="stage-copy">
  <p>Refraction lives at the rim.</p>
  <p>The middle stays perfectly sharp.</p>
</div>
<nav class="liquid-glass stage-nav" data-liquid-glass data-bezel="14" data-strength="44">
  <a href="#">Work</a><a href="#">About</a><a href="#">Contact</a>
</nav>`,
    css: `body{margin:0;min-height:100vh;font-family:system-ui,sans-serif;background:
radial-gradient(circle at 22% 38%,#ff5a7a 0 13%,transparent 14%),
radial-gradient(circle at 70% 45%,#2ee6a6 0 17%,transparent 18%),
radial-gradient(circle at 48% 85%,#ffe566 0 14%,transparent 15%),
repeating-linear-gradient(90deg,#1a1523 0 38px,#2a2140 38px 76px)}
.stage-copy{padding:48px 40px;color:#fff;font:900 52px/1.1 Georgia,serif}
.stage-copy p{margin:0}
.liquid-glass.stage-nav{position:absolute;top:70px;left:50%;transform:translateX(-50%);display:flex;gap:26px;padding:16px 28px}
.stage-nav a{color:#fff;font-weight:700;text-decoration:none;font-size:18px}`,
  },
};
