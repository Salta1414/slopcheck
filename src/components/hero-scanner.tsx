"use client";

import { SignInButton, Show } from "@clerk/nextjs";
import { useAction } from "convex/react";
import { useEffect, useState, useTransition } from "react";
import { api } from "../../convex/_generated/api";
import type { Id } from "../../convex/_generated/dataModel";
import { LockedFindings } from "@/components/locked-findings";
import { ShareForFreeButton } from "@/components/share-for-free-button";
import { ShareScoreButton } from "@/components/share-score-button";
import { UnlockButton } from "@/components/unlock-button";
import type { GuestScan } from "@/lib/guest-storage";
import {
  createGuestKey,
  getActiveGuestScan,
  upsertGuestScan,
} from "@/lib/guest-storage";

export function HeroScanner() {
  const runPreeval = useAction(api.scanActions.runPreeval);
  const [url, setUrl] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [scan, setScan] = useState<GuestScan | null>(null);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    setScan(getActiveGuestScan());
  }, []);

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    startTransition(async () => {
      try {
        const guestKey = createGuestKey();
        const result = await runPreeval({ url, guestKey });
        const guestScan: GuestScan = {
          guestKey: result.guestKey,
          url: result.url,
          normalizedUrl: result.normalizedUrl,
          estimatedScore: result.estimatedScore,
          verdict: result.verdict,
          teaserFlags: result.teaserFlags,
          lockedCount: result.lockedCount,
          createdAt: result.createdAt,
          scanId: result.scanId,
        };
        upsertGuestScan(guestScan);
        setScan(guestScan);
      } catch (err) {
        const message =
          err instanceof Error ? err.message : "Could not scan URL";
        setError(message.replace(/^\[.*?\]\s*/, ""));
      }
    });
  }

  return (
    <section className="relative mx-auto flex w-full max-w-6xl flex-col gap-10 px-4 pb-16 pt-4 sm:px-6 lg:pt-8">
      <div className="relative z-10 grid items-center gap-6 lg:grid-cols-[minmax(0,1fr)_auto] lg:gap-8">
        <div className="max-w-3xl">
          <p className="mb-3 inline-block animate-wiggle rounded-full border-[3px] border-[var(--ink)] bg-[var(--accent-3)] px-3 py-1 text-xs font-extrabold uppercase tracking-wide text-[var(--ink)] shadow-[3px_3px_0_var(--ink)]">
            UI slop detector · €5 full review
          </p>
          <h1 className="font-[family-name:var(--font-display)] text-4xl font-black leading-[1.05] tracking-tight text-[var(--ink)] sm:text-6xl">
            Is your site{" "}
            <span className="relative inline-block">
              <span className="relative z-10">AI slop?</span>
              <span
                aria-hidden
                className="absolute -bottom-1 left-0 right-0 h-3 rounded-full bg-[var(--accent)]/80"
              />
            </span>
          </h1>
          <p className="mt-4 max-w-xl text-base font-medium text-[var(--ink)]/75 sm:text-lg">
            Paste a URL. We screenshot it, score the UI, then unlock the full
            analysis by sharing your score on X or paying.
          </p>

          <form
            onSubmit={onSubmit}
            className="mt-8 flex w-full flex-col gap-3 sm:flex-row sm:items-stretch"
          >
            <label className="sr-only" htmlFor="site-url">
              Website URL
            </label>
            <input
              id="site-url"
              type="text"
              inputMode="url"
              autoComplete="url"
              placeholder="https://your-site.com"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              disabled={isPending}
              className="min-h-14 flex-1 rounded-[1.4rem] border-[3px] border-[var(--ink)] bg-white px-5 text-base font-semibold text-[var(--ink)] shadow-[4px_5px_0_var(--ink)] outline-none placeholder:text-[var(--ink)]/35 focus:ring-4 focus:ring-[var(--accent)]/50 disabled:opacity-60"
            />
            <button
              type="submit"
              disabled={isPending || url.trim().length < 3}
              className="min-h-14 shrink-0 rounded-[1.4rem] border-[3px] border-[var(--ink)] bg-[var(--accent)] px-7 text-base font-black text-[var(--ink)] shadow-[4px_5px_0_var(--ink)] transition enabled:hover:translate-y-[2px] enabled:hover:shadow-[2px_3px_0_var(--ink)] disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isPending ? "Sniffing…" : "Check UI"}
            </button>
          </form>

          {error ? (
            <p
              className="mt-3 text-sm font-bold text-[var(--accent-2)]"
              role="alert"
            >
              {error}
            </p>
          ) : null}
        </div>

        <HeroBlobVideo />
      </div>

      {isPending ? <ScanningBlob /> : null}
      {scan && !isPending ? <TeaserResult scan={scan} /> : null}
    </section>
  );
}

function HeroBlobVideo() {
  return (
    <div
      aria-hidden
      className="mx-auto w-[220px] justify-self-center sm:w-[240px] lg:w-[260px] lg:justify-self-end"
    >
      <div className="overflow-hidden rounded-[1.8rem] border-[3px] border-[var(--ink)] bg-white shadow-[5px_6px_0_var(--ink)]">
        <video
          className="aspect-square h-auto w-full object-cover object-center"
          autoPlay
          loop
          muted
          playsInline
          preload="metadata"
        >
          <source src="/brand/hero-blob.mp4" type="video/mp4" />
        </video>
      </div>
    </div>
  );
}

function ScanningBlob() {
  return (
    <div className="animate-squish rounded-[2rem] border-[3px] border-[var(--ink)] bg-white p-6 shadow-[5px_6px_0_var(--ink)]">
      <p className="font-[family-name:var(--font-display)] text-xl font-extrabold text-[var(--ink)]">
        Squishing pixels… sniffing for slop…
      </p>
      <p className="mt-1 text-sm font-medium text-[var(--ink)]/60">
        Capturing screenshot and scoring the UI…
      </p>
    </div>
  );
}

function TeaserResult({ scan }: { scan: GuestScan }) {
  const label = verdictLabel(scan.verdict);

  return (
    <div
      id="result"
      className="overflow-hidden rounded-[2rem] border-[3px] border-[var(--ink)] bg-white shadow-[6px_8px_0_var(--ink)]"
    >
      <div className="flex flex-col gap-6 border-b-[3px] border-[var(--ink)] p-6 sm:flex-row sm:items-end sm:justify-between sm:p-8">
        <div>
          <p className="text-xs font-extrabold uppercase tracking-wide text-[var(--ink)]/50">
            UI Slop Score · estimate
          </p>
          <div className="mt-2 flex items-end gap-3">
            <span className="font-[family-name:var(--font-display)] text-6xl font-black leading-none text-[var(--ink)] sm:text-7xl">
              {scan.estimatedScore}
            </span>
            <span className="mb-2 rounded-full border-[3px] border-[var(--ink)] bg-[var(--accent-3)] px-3 py-1 text-sm font-extrabold text-[var(--ink)]">
              {label}
            </span>
          </div>
          <p className="mt-2 max-w-md truncate text-sm font-semibold text-[var(--ink)]/65">
            {scan.normalizedUrl}
          </p>
        </div>

        {scan.scanId ? (
          <div className="flex flex-col gap-3 sm:items-end">
            <UnlockButton
              scanId={scan.scanId as Id<"scans">}
              guestKey={scan.guestKey}
            />
            <p className="text-xs font-bold text-[var(--ink)]/55 sm:text-right">
              No account needed · secure checkout via Stripe
            </p>
            <Show when="signed-in">
              <ShareForFreeButton scanId={scan.scanId as Id<"scans">} />
            </Show>
            <Show when="signed-out">
              <FreeViaXHint />
              <ShareScoreButton
                scanId={scan.scanId}
                guestKey={scan.guestKey}
                score={scan.estimatedScore}
                verdict={scan.verdict}
                url={scan.normalizedUrl}
              />
            </Show>
          </div>
        ) : null}
      </div>

      <div className="grid gap-4 p-6 sm:grid-cols-2 sm:p-8">
        <div>
          <h2 className="font-[family-name:var(--font-display)] text-lg font-extrabold text-[var(--ink)]">
            Visible teaser
          </h2>
          <ul className="mt-3 space-y-2">
            {scan.teaserFlags.map((flag) => (
              <li
                key={flag}
                className="rounded-2xl border-[3px] border-[var(--ink)] bg-[var(--bg)] px-4 py-3 text-sm font-semibold text-[var(--ink)]"
              >
                {flag}
              </li>
            ))}
          </ul>
        </div>

        <div className="relative">
          <h2 className="font-[family-name:var(--font-display)] text-lg font-extrabold text-[var(--ink)]">
            Full findings
          </h2>
          <LockedFindings count={scan.lockedCount} />
          <p className="mt-3 text-xs font-bold text-[var(--ink)]/55">
            {scan.lockedCount} findings plus copy-paste fix prompts for Cursor,
            v0 and Claude — unlocked by the full review.
          </p>
        </div>
      </div>
    </div>
  );
}

function FreeViaXHint() {
  return (
    <p className="text-xs font-bold text-[var(--ink)]/55 sm:text-right">
      Rather share than pay?{" "}
      <SignInButton mode="modal">
        <button
          type="button"
          className="font-black text-[var(--ink)] underline decoration-[var(--accent)] decoration-[3px] underline-offset-2"
        >
          Log in
        </button>
      </SignInButton>{" "}
      and post your score on X for a free review.
    </p>
  );
}

function verdictLabel(verdict: GuestScan["verdict"]): string {
  switch (verdict) {
    case "fresh":
      return "Pretty fresh";
    case "mixed":
      return "Mixed vibes";
    case "likely_slop":
      return "Likely slop";
    case "peak_slop":
      return "Peak slop";
  }
}
