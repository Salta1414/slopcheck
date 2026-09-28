import type { Recipe } from "./types";

const css = `/* Masked word reveal — each word rises out of its own line box.
   Reads as "typeset", unlike the default fade-up-everything. */
.reveal {
  --reveal-duration: 0.9s;
  --reveal-stagger: 70ms;
}

.reveal .reveal-word {
  display: inline-block;
  overflow: hidden;
  /* Room for descenders so g/j/y aren't clipped by the mask. */
  padding-bottom: 0.12em;
  margin-bottom: -0.12em;
  vertical-align: top;
}

.reveal .reveal-inner {
  display: inline-block;
  transform: translateY(110%);
  transition: transform var(--reveal-duration) cubic-bezier(0.2, 0.7, 0.1, 1);
  transition-delay: calc(var(--i, 0) * var(--reveal-stagger));
}

.reveal.is-revealed .reveal-inner {
  transform: translateY(0);
}

/* No JS or reduced motion: just show the text. */
.reveal:not(.reveal--ready) .reveal-inner {
  transform: none;
}

@media (prefers-reduced-motion: reduce) {
  .reveal .reveal-inner {
    transform: none;
    transition: none;
  }
}`;

const js = `/* Splits [data-reveal] headings into masked words and reveals them when
   they enter the viewport. Screen readers get the original text. */
(function () {
  var reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
  var headings = document.querySelectorAll("[data-reveal]");

  headings.forEach(function (el) {
    var text = el.textContent.trim();
    if (reduce || !text) return;
    el.setAttribute("aria-label", text);
    el.textContent = "";
    text.split(/\\s+/).forEach(function (word, i) {
      var outer = document.createElement("span");
      outer.className = "reveal-word";
      outer.setAttribute("aria-hidden", "true");
      var inner = document.createElement("span");
      inner.className = "reveal-inner";
      inner.style.setProperty("--i", String(i));
      inner.textContent = word;
      outer.appendChild(inner);
      el.appendChild(outer);
      el.appendChild(document.createTextNode(" "));
    });
    el.classList.add("reveal", "reveal--ready");
  });

  var observer = new IntersectionObserver(function (entries) {
    entries.forEach(function (entry) {
      if (!entry.isIntersecting) return;
      entry.target.classList.add("is-revealed");
      observer.unobserve(entry.target);
    });
  }, { threshold: 0.3 });

  headings.forEach(function (el) { observer.observe(el); });
})();`;

const html = `<h1 data-reveal>Tools for people who still print their photos</h1>`;

const react = `"use client";

import { useEffect, useRef, useState } from "react";

/** Pair with the .reveal CSS from this recipe. */
export function RevealHeading({
  text,
  as: Tag = "h1",
  className = "",
}: {
  text: string;
  as?: "h1" | "h2" | "h3";
  className?: string;
}) {
  const ref = useRef<HTMLHeadingElement>(null);
  const [revealed, setRevealed] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setRevealed(true);
          observer.disconnect();
        }
      },
      { threshold: 0.3 },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return (
    <Tag
      ref={ref}
      aria-label={text}
      className={"reveal reveal--ready " + (revealed ? "is-revealed " : "") + className}
    >
      {text.split(/\\s+/).map((word, i) => (
        <span key={i} className="reveal-word" aria-hidden>
          <span className="reveal-inner" style={{ ["--i" as string]: i }}>
            {word}
          </span>{" "}
        </span>
      ))}
    </Tag>
  );
}`;

export const textReveal: Recipe = {
  id: "text-reveal",
  name: "Masked word reveal",
  category: "motion",
  summary:
    "Headline words rise out of their own masked line boxes, staggered — typographic motion instead of the default fade-up on everything.",
  useWhen: [
    "The one hero headline, or a single section title per page",
    "Editorial or product-launch pages where the words are the hero",
  ],
  avoidWhen: [
    "Every heading and paragraph on the page — motion everywhere is noise",
    "Body copy or anything longer than ~12 words",
  ],
  support: "All modern browsers (IntersectionObserver + CSS transforms).",
  accessibility: [
    "Screen readers get the full heading via aria-label; the split words are aria-hidden",
    "prefers-reduced-motion shows the text immediately, and text stays visible without JS",
  ],
  performance: [
    "Only transform animates, so it stays on the compositor",
    "The observer disconnects after the first reveal",
  ],
  html,
  css,
  js,
  react,
  aiHint:
    "Use this masked word reveal for the main hero headline only. Keep the aria-label handling and the reduced-motion rule.",
  demo: {
    html: `<div class="stage">
  <p class="stage-kicker">Scroll-free demo — it reveals on load</p>
  <h1 data-reveal>Tools for people who still print their photos</h1>
</div>`,
    css: `body{margin:0;min-height:100vh;background:#f4f1ea;color:#1c1b22;font-family:Georgia,serif}
.stage{padding:60px 40px}.stage-kicker{font:600 13px/1 system-ui,sans-serif;letter-spacing:.08em;text-transform:uppercase;color:#8a8578;margin:0 0 18px}
h1{font-size:60px;line-height:1.05;margin:0;max-width:14ch;font-weight:700}`,
  },
};
