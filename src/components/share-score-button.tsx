"use client";

import { useMutation } from "convex/react";
import { useState } from "react";
import { api } from "../../convex/_generated/api";
import type { Id } from "../../convex/_generated/dataModel";
import type { SlopVerdict } from "@/lib/guest-storage";
import { shareText, shareUrl } from "@/lib/share-score";

type Status = "idle" | "working" | "ready" | "copied" | "error";

export function ShareScoreButton({
  scanId,
  guestKey,
  score,
  verdict,
  url,
  label = "Share score",
}: {
  scanId: string;
  guestKey?: string;
  score: number;
  verdict?: SlopVerdict;
  url: string;
  label?: string;
}) {
  const enableShare = useMutation(api.share.enableShare);
  const [status, setStatus] = useState<Status>("idle");
  const [link, setLink] = useState<string | null>(null);

  const text = shareText({ score, verdict, url });

  async function ensureLink(): Promise<string> {
    if (link) return link;
    const result = await enableShare({
      scanId: scanId as Id<"scans">,
      guestKey,
    });
    const origin =
      typeof window === "undefined" ? undefined : window.location.origin;
    const next = shareUrl(result.scanId, origin);
    setLink(next);
    return next;
  }

  async function copyLink(target: string) {
    await navigator.clipboard.writeText(`${text}\n${target}`);
    setStatus("copied");
    setTimeout(() => setStatus("ready"), 1800);
  }

  async function onShare() {
    setStatus("working");
    try {
      const target = await ensureLink();

      if (typeof navigator !== "undefined" && navigator.share) {
        try {
          await navigator.share({ title: "Slopcheck", text, url: target });
          setStatus("ready");
          return;
        } catch (err) {
          // User dismissed the native sheet — nothing to recover from.
          if (err instanceof DOMException && err.name === "AbortError") {
            setStatus("ready");
            return;
          }
        }
      }

      await copyLink(target);
    } catch {
      setStatus("error");
    }
  }

  const buttonLabel =
    status === "working"
      ? "Making link…"
      : status === "copied"
        ? "Link copied!"
        : label;

  return (
    <div className="flex flex-col gap-2 sm:items-end">
      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={() => void onShare()}
          disabled={status === "working"}
          className="inline-flex items-center gap-2 rounded-full border-[3px] border-[var(--ink)] bg-[var(--accent-3)] px-5 py-2.5 text-sm font-black text-[var(--ink)] shadow-[3px_3px_0_var(--ink)] transition enabled:hover:translate-y-[1px] enabled:hover:shadow-[2px_2px_0_var(--ink)] disabled:opacity-60"
        >
          <span aria-hidden>📣</span>
          {buttonLabel}
        </button>

        {link ? (
          <>
            <button
              type="button"
              onClick={() => void copyLink(link)}
              className="rounded-full border-[3px] border-[var(--ink)] bg-white px-4 py-2.5 text-sm font-black text-[var(--ink)] shadow-[3px_3px_0_var(--ink)] transition hover:translate-y-[1px] hover:shadow-[2px_2px_0_var(--ink)]"
            >
              Copy link
            </button>
            <a
              href={`https://x.com/intent/post?text=${encodeURIComponent(text)}&url=${encodeURIComponent(link)}`}
              target="_blank"
              rel="noreferrer"
              className="rounded-full border-[3px] border-[var(--ink)] bg-white px-4 py-2.5 text-sm font-black text-[var(--ink)] shadow-[3px_3px_0_var(--ink)] transition hover:translate-y-[1px] hover:shadow-[2px_2px_0_var(--ink)]"
            >
              Post on X
            </a>
          </>
        ) : null}
      </div>

      {status === "error" ? (
        <p className="text-xs font-bold text-[var(--accent-2)]" role="alert">
          Could not create the share link. Try again.
        </p>
      ) : null}
      {link && status !== "error" ? (
        <p className="max-w-xs truncate text-xs font-bold text-[var(--ink)]/50">
          Public score page · {link.replace(/^https?:\/\//, "")}
        </p>
      ) : null}
    </div>
  );
}
