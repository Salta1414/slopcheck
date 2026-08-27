"use client";

import { useAction } from "convex/react";
import { useState } from "react";
import { api } from "../../convex/_generated/api";
import type { Id } from "../../convex/_generated/dataModel";

type Status = "idle" | "working" | "error";

export function ShareForFreeButton({ scanId }: { scanId: Id<"scans"> }) {
  const beginXShare = useAction(api.xShare.beginXShare);
  const [status, setStatus] = useState<Status>("idle");

  async function onPostToX() {
    setStatus("working");

    try {
      const { authorizeUrl } = await beginXShare({ scanId });
      window.location.assign(authorizeUrl);
    } catch {
      setStatus("error");
    }
  }

  return (
    <div className="flex max-w-sm flex-col gap-2 sm:items-end">
      <div className="rounded-[1.5rem] border-[3px] border-[var(--ink)] bg-[var(--accent-3)]/60 p-4 shadow-[3px_4px_0_var(--ink)]">
        <p className="text-xs font-black uppercase tracking-wide text-[var(--ink)]/60">
          Free unlock
        </p>
        <p className="mt-1 text-sm font-extrabold text-[var(--ink)]">
          Connect X and we&apos;ll post your score. The full analysis is on us.
        </p>
        <button
          type="button"
          onClick={() => void onPostToX()}
          disabled={status === "working"}
          className="mt-3 w-full rounded-full border-[3px] border-[var(--ink)] bg-[var(--ink)] px-4 py-2.5 text-sm font-black text-white shadow-[3px_3px_0_var(--accent)] transition enabled:hover:translate-y-[1px] enabled:hover:shadow-[2px_2px_0_var(--accent)] disabled:opacity-60"
        >
          {status === "working" ? "Connecting X…" : "𝕏 Post score + unlock free"}
        </button>
        <p className="mt-2 text-[11px] font-bold text-[var(--ink)]/45">
          X publishes the post for you; we only use the connection for this
          score share.
        </p>
      </div>

      {status === "error" ? (
        <p
          className="text-right text-xs font-bold text-[var(--accent-2)]"
          role="alert"
        >
          Could not start or verify the X post. Try again.
        </p>
      ) : null}
    </div>
  );
}
