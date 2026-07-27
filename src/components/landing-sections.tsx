"use client";

import { useGSAP } from "@gsap/react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useRef } from "react";
import { siteLegal } from "@/lib/site-legal";

gsap.registerPlugin(useGSAP, ScrollTrigger);

const STEPS = [
  {
    n: "01",
    title: "Paste a URL",
    body: "No account needed. First sniff stays in your browser.",
    rot: "-2deg",
    bg: "var(--accent)",
  },
  {
    n: "02",
    title: "Get the vibe check",
    body: "Score + teaser flags. The juicy findings stay blurred.",
    rot: "1.5deg",
    bg: "var(--accent-3)",
  },
  {
    n: "03",
    title: "Unlock the fix kit",
    body: `Sign up, pay ${siteLegal.priceLabel}, grab Opus-level prompts.`,
    rot: "-1deg",
    bg: "var(--accent-2)",
  },
] as const;

const SNIFFS = [
  { label: "Inter / purple glow", stamp: "YIKES" },
  { label: "Generic hero mush", stamp: "SLOP" },
  { label: "Card grid overload", stamp: "MEH" },
  { label: "Pill salad nav", stamp: "OOF" },
  { label: "Same SaaS template", stamp: "AGAIN?" },
] as const;

const FAQS = [
  {
    q: "Do I need an account for the first check?",
    a: "Nope. Paste a URL, sniff for free. Sign up when you want to save or unlock.",
  },
  {
    q: "What do I get for €5?",
    a: "The strong full review: score, concrete findings, and copy-paste fix prompts for tools like Claude / Cursor.",
  },
  {
    q: "Is this legal advice or a design guarantee?",
    a: "Neither. It’s a spicy automated UI vibe check — useful, opinionated, not gospel.",
  },
  {
    q: "Can I scan any site?",
    a: "Only sites you’re allowed to check (yours or with permission). Don’t be weird.",
  },
] as const;

export function LandingSections() {
  const root = useRef<HTMLDivElement>(null);

  useGSAP(
    () => {
      const bounce = { duration: 0.9, ease: "bounce.out" };

      gsap.from(".land-panel", {
        y: 48,
        opacity: 0,
        scale: 0.92,
        stagger: 0.12,
        ...bounce,
        scrollTrigger: {
          trigger: ".land-how",
          start: "top 80%",
        },
      });

      gsap.from(".land-stamp", {
        y: 36,
        rotation: (i) => (i % 2 === 0 ? -12 : 12),
        opacity: 0,
        scale: 0.7,
        stagger: 0.08,
        duration: 0.85,
        ease: "back.out(2.2)",
        scrollTrigger: {
          trigger: ".land-sniff",
          start: "top 78%",
        },
      });

      gsap.from(".land-price", {
        y: 40,
        scale: 0.85,
        opacity: 0,
        duration: 1,
        ease: "elastic.out(1, 0.55)",
        scrollTrigger: {
          trigger: ".land-price",
          start: "top 82%",
        },
      });

      gsap.from(".land-faq", {
        x: (i) => (i % 2 === 0 ? -28 : 28),
        opacity: 0,
        stagger: 0.1,
        duration: 0.7,
        ease: "back.out(1.6)",
        scrollTrigger: {
          trigger: ".land-faqs",
          start: "top 80%",
        },
      });
    },
    { scope: root },
  );

  return (
    <div ref={root} className="pb-8">
      {/* How it works — comic strip */}
      <section className="land-how mx-auto w-full max-w-6xl px-4 pb-20 sm:px-6">
        <div className="mb-8 flex flex-wrap items-end justify-between gap-3">
          <h2 className="font-[family-name:var(--font-display)] text-3xl font-extrabold text-[var(--ink)] sm:text-4xl">
            How the sniff works
          </h2>
          <span
            aria-hidden
            className="shrink-0 rounded-full border-[3px] border-[var(--ink)] bg-[var(--accent-3)] px-3 py-1 text-xs font-black uppercase tracking-wide shadow-[3px_3px_0_var(--ink)]"
          >
            3 panels · no filler
          </span>
        </div>

        <div className="grid gap-5 md:grid-cols-3">
          {STEPS.map((step) => (
            <div key={step.n} className="land-panel goof-hit">
              <article
                className="goof-face relative rounded-[2rem] border-[3px] border-[var(--ink)] bg-white p-5 shadow-[5px_6px_0_var(--ink)]"
                style={{ ["--tilt" as string]: step.rot }}
              >
                <span
                  className="goof-badge absolute -top-3 -left-2 grid h-12 w-12 place-items-center rounded-full border-[3px] border-[var(--ink)] font-[family-name:var(--font-display)] text-sm font-black shadow-[3px_3px_0_var(--ink)]"
                  style={{ background: step.bg }}
                >
                  {step.n}
                </span>
                <h3 className="mt-4 font-[family-name:var(--font-display)] text-2xl font-extrabold text-[var(--ink)]">
                  {step.title}
                </h3>
                <p className="mt-2 text-sm font-semibold text-[var(--ink)]/70">
                  {step.body}
                </p>
                <div
                  aria-hidden
                  className="mt-5 h-3 w-full rounded-full border-[3px] border-[var(--ink)]"
                  style={{ background: step.bg }}
                />
              </article>
            </div>
          ))}
        </div>
      </section>

      {/* What we sniff */}
      <section className="land-sniff mx-auto w-full max-w-6xl px-4 pb-20 sm:px-6">
        <h2 className="font-[family-name:var(--font-display)] text-3xl font-extrabold text-[var(--ink)] sm:text-4xl">
          Stuff we sniff for
        </h2>
        <p className="mt-2 max-w-xl text-base font-semibold text-[var(--ink)]/65">
          Classic AI-UI tropes. If your site reeks of them, we’ll say so —
          loudly, with a score.
        </p>

        <div className="mt-8 flex flex-wrap justify-center gap-4 sm:justify-start">
          {SNIFFS.map((item) => (
            <div key={item.label} className="land-stamp goof-stamp w-[9.5rem] sm:w-40">
              <div className="goof-face relative rounded-[1.4rem] border-[3px] border-[var(--ink)] bg-white px-3 py-4 text-center shadow-[4px_5px_0_var(--ink)]">
                <span className="goof-stamp-tag absolute -top-2 right-2 rotate-6 rounded-md border-[2px] border-[var(--ink)] bg-[var(--accent-2)] px-1.5 py-0.5 text-[10px] font-black tracking-wide text-white">
                  {item.stamp}
                </span>
                <p className="font-[family-name:var(--font-display)] text-sm font-extrabold leading-snug text-[var(--ink)]">
                  {item.label}
                </p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Price punch */}
      <section className="mx-auto w-full max-w-6xl px-4 pb-20 sm:px-6">
        <div className="land-price goof-price relative overflow-hidden rounded-[2.25rem] border-[3px] border-[var(--ink)] bg-[var(--accent)] px-6 py-10 shadow-[6px_8px_0_var(--ink)] sm:px-10">
          <div
            aria-hidden
            className="animate-float-slow pointer-events-none absolute -right-6 -top-8 h-36 w-36 rounded-[40%] border-[3px] border-[var(--ink)] bg-[var(--accent-3)]/80"
          />
          <div
            aria-hidden
            className="animate-float-delayed pointer-events-none absolute -bottom-10 left-10 h-24 w-28 -rotate-6 rounded-[2rem] border-[3px] border-[var(--ink)] bg-[var(--accent-2)]/70"
          />

          <p className="relative z-10 text-xs font-black uppercase tracking-widest text-[var(--ink)]/60">
            Full review
          </p>
          <p className="relative z-10 mt-2 font-[family-name:var(--font-display)] text-5xl font-black text-[var(--ink)] sm:text-6xl">
            {siteLegal.priceLabel}
            <span className="ml-2 text-2xl font-extrabold sm:text-3xl">
              one-shot
            </span>
          </p>
          <p className="relative z-10 mt-3 max-w-md text-base font-bold text-[var(--ink)]/75">
            Screenshot → deep critique → copy-paste prompts. No subscription.
            Just less slop.
          </p>
          <a
            href="#site-url"
            className="relative z-10 mt-6 inline-flex min-h-12 items-center rounded-[1.2rem] border-[3px] border-[var(--ink)] bg-white px-6 text-base font-black shadow-[4px_4px_0_var(--ink)] transition hover:translate-y-[2px] hover:shadow-[2px_2px_0_var(--ink)]"
          >
            Start with a free sniff ↑
          </a>
        </div>
      </section>

      {/* FAQ */}
      <section className="land-faqs mx-auto w-full max-w-6xl px-4 pb-16 sm:px-6">
        <h2 className="font-[family-name:var(--font-display)] text-3xl font-extrabold text-[var(--ink)] sm:text-4xl">
          FAQ (the short version)
        </h2>
        <div className="mt-8 grid gap-4 sm:grid-cols-2">
          {FAQS.map((item) => (
            <details
              key={item.q}
              className="land-faq goof-faq group rounded-[1.6rem] border-[3px] border-[var(--ink)] bg-white p-5 shadow-[4px_5px_0_var(--ink)] open:bg-[var(--bg)]"
            >
              <summary className="cursor-pointer list-none font-[family-name:var(--font-display)] text-lg font-extrabold text-[var(--ink)] marker:content-none [&::-webkit-details-marker]:hidden">
                <span className="flex items-start justify-between gap-3">
                  {item.q}
                  <span
                    aria-hidden
                    className="goof-plus mt-0.5 grid h-8 w-8 shrink-0 place-items-center rounded-full border-[3px] border-[var(--ink)] bg-[var(--accent-3)] text-lg font-black transition group-open:rotate-45"
                  >
                    +
                  </span>
                </span>
              </summary>
              <p className="mt-3 text-sm font-semibold text-[var(--ink)]/70">
                {item.a}
              </p>
            </details>
          ))}
        </div>
      </section>
    </div>
  );
}
