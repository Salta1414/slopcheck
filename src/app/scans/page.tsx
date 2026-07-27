"use client";

import { Show } from "@clerk/nextjs";
import { useAction, useQuery } from "convex/react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useId, useRef, useState, useTransition } from "react";
import { api } from "../../../convex/_generated/api";
import { createGuestKey } from "@/lib/guest-storage";

export default function ScansPage() {
  const [composerOpen, setComposerOpen] = useState(false);

  return (
    <div className="mx-auto w-full max-w-4xl px-4 py-8 sm:px-6">
      <div className="flex items-center justify-between gap-4">
        <h1 className="font-[family-name:var(--font-display)] text-4xl font-extrabold text-[var(--ink)]">
          Your scans
        </h1>
        <Show when="signed-in">
          <button
            type="button"
            aria-label={composerOpen ? "Close new scan" : "New scan"}
            aria-expanded={composerOpen}
            onClick={() => setComposerOpen((open) => !open)}
            className="grid h-12 w-12 shrink-0 place-items-center rounded-full border-[3px] border-[var(--ink)] bg-[var(--accent)] shadow-[3px_4px_0_var(--ink)] transition hover:translate-y-[1px] hover:shadow-[2px_2px_0_var(--ink)] active:translate-y-[2px] active:shadow-[1px_1px_0_var(--ink)]"
          >
            <span
              aria-hidden
              className="font-[family-name:var(--font-display)] text-3xl font-black leading-none text-[var(--ink)] transition-transform duration-200"
              style={{
                transform: composerOpen ? "rotate(45deg)" : "rotate(0deg)",
              }}
            >
              +
            </span>
          </button>
        </Show>
      </div>

      <Show when="signed-out">
        <p className="mt-4 font-semibold text-[var(--ink)]/70">
          Sign in to see saved scans.
        </p>
      </Show>

      <Show when="signed-in">
        {composerOpen ? (
          <NewScanComposer onCancel={() => setComposerOpen(false)} />
        ) : null}
        <ScanList onStartNew={() => setComposerOpen(true)} />
      </Show>
    </div>
  );
}

function NewScanComposer({ onCancel }: { onCancel: () => void }) {
  const runPreeval = useAction(api.scanActions.runPreeval);
  const router = useRouter();
  const inputId = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const [url, setUrl] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    startTransition(async () => {
      try {
        const result = await runPreeval({
          url,
          guestKey: createGuestKey(),
        });
        router.push(`/scans/${result.scanId}`);
      } catch (err) {
        const message =
          err instanceof Error ? err.message : "Could not scan URL";
        setError(message.replace(/^\[.*?\]\s*/, ""));
      }
    });
  }

  return (
    <div className="mt-6 overflow-hidden rounded-[1.75rem] border-[3px] border-[var(--ink)] bg-white shadow-[4px_5px_0_var(--ink)]">
      <form
        onSubmit={onSubmit}
        className="flex flex-col gap-3 p-4 sm:flex-row sm:items-stretch sm:p-5"
      >
        <label className="sr-only" htmlFor={inputId}>
          Website URL
        </label>
        <input
          ref={inputRef}
          id={inputId}
          type="text"
          inputMode="url"
          autoComplete="url"
          placeholder="https://your-site.com"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          disabled={isPending}
          className="min-h-12 flex-1 rounded-[1.2rem] border-[3px] border-[var(--ink)] bg-[var(--bg)] px-4 text-base font-semibold text-[var(--ink)] outline-none placeholder:text-[var(--ink)]/35 focus:ring-4 focus:ring-[var(--accent)]/50 disabled:opacity-60"
        />
        <div className="flex gap-2">
          <button
            type="button"
            onClick={onCancel}
            disabled={isPending}
            className="min-h-12 flex-1 rounded-[1.2rem] border-[3px] border-[var(--ink)] bg-white px-4 text-sm font-extrabold text-[var(--ink)] shadow-[3px_3px_0_var(--ink)] transition enabled:hover:translate-y-[1px] enabled:hover:shadow-[2px_2px_0_var(--ink)] disabled:opacity-50 sm:flex-none"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={isPending || url.trim().length < 3}
            className="min-h-12 flex-[1.4] rounded-[1.2rem] border-[3px] border-[var(--ink)] bg-[var(--accent)] px-5 text-sm font-black text-[var(--ink)] shadow-[3px_3px_0_var(--ink)] transition enabled:hover:translate-y-[1px] enabled:hover:shadow-[2px_2px_0_var(--ink)] disabled:cursor-not-allowed disabled:opacity-50 sm:flex-none"
          >
            {isPending ? "Sniffing…" : "Check UI"}
          </button>
        </div>
      </form>

      {isPending ? (
        <div className="animate-squish border-t-[3px] border-[var(--ink)] bg-[var(--accent)]/15 px-5 py-4">
          <p className="font-[family-name:var(--font-display)] text-lg font-extrabold text-[var(--ink)]">
            Squishing pixels…
          </p>
          <p className="text-sm font-medium text-[var(--ink)]/60">
            Capturing screenshot and scoring — this stays on your scans.
          </p>
        </div>
      ) : null}

      {error ? (
        <p
          className="border-t-[3px] border-[var(--ink)] px-5 py-3 text-sm font-bold text-[var(--accent-2)]"
          role="alert"
        >
          {error}
        </p>
      ) : null}
    </div>
  );
}

function ScanList({ onStartNew }: { onStartNew: () => void }) {
  const scans = useQuery(api.scans.listMine);

  if (scans === undefined) {
    return <p className="mt-6 font-bold text-[var(--ink)]/50">Loading…</p>;
  }

  if (scans.length === 0) {
    return (
      <div className="mt-6 rounded-[2rem] border-[3px] border-[var(--ink)] bg-white p-6 shadow-[4px_5px_0_var(--ink)]">
        <p className="font-extrabold">No scans yet.</p>
        <button
          type="button"
          onClick={onStartNew}
          className="mt-4 inline-flex items-center gap-2 rounded-full border-[3px] border-[var(--ink)] bg-[var(--accent)] px-4 py-2 font-extrabold shadow-[3px_3px_0_var(--ink)] transition hover:translate-y-[1px] hover:shadow-[2px_2px_0_var(--ink)]"
        >
          <span aria-hidden className="text-xl leading-none">
            +
          </span>
          Run your first check
        </button>
      </div>
    );
  }

  return (
    <div className="mt-6 flex flex-col items-stretch gap-3">
      <ul className="space-y-3">
        {scans.map((scan) => {
          const inProgress =
            scan.status === "capturing" || scan.status === "preeval_running";

          return (
            <li key={scan._id}>
              <Link
                href={`/scans/${scan._id}`}
                className="goof-card flex flex-wrap items-center justify-between gap-3 rounded-[1.5rem] border-[3px] border-[var(--ink)] bg-white px-4 py-4 shadow-[3px_4px_0_var(--ink)]"
              >
                <div className="min-w-0">
                  <p className="truncate font-extrabold text-[var(--ink)]">
                    {scan.url}
                  </p>
                  <p className="text-xs font-bold uppercase tracking-wide text-[var(--ink)]/45">
                    {inProgress ? "scanning…" : scan.status}
                  </p>
                </div>
                <span
                  className={`font-[family-name:var(--font-display)] text-3xl font-black text-[var(--ink)] ${
                    inProgress ? "animate-squish opacity-50" : ""
                  }`}
                >
                  {scan.score ?? scan.estimatedScore ?? "—"}
                </span>
              </Link>
            </li>
          );
        })}
      </ul>

      <div className="flex justify-center pt-2">
        <button
          type="button"
          onClick={onStartNew}
          aria-label="New scan"
          className="group flex items-center gap-2 rounded-full border-[3px] border-dashed border-[var(--ink)]/35 bg-white/70 px-5 py-3 font-extrabold text-[var(--ink)] shadow-[3px_4px_0_var(--ink)] transition hover:border-solid hover:border-[var(--ink)] hover:bg-[var(--accent)] hover:translate-y-[1px] hover:shadow-[2px_2px_0_var(--ink)]"
        >
          <span
            aria-hidden
            className="grid h-8 w-8 place-items-center rounded-full border-[3px] border-[var(--ink)] bg-[var(--accent)] font-[family-name:var(--font-display)] text-xl font-black leading-none transition group-hover:bg-white"
          >
            +
          </span>
          New scan
        </button>
      </div>
    </div>
  );
}
