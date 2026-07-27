"use client";

import { useAction } from "convex/react";
import { useState } from "react";
import { api } from "../../convex/_generated/api";
import type { Id } from "../../convex/_generated/dataModel";

export function UnlockButton({ scanId }: { scanId: Id<"scans"> }) {
  const createCheckout = useAction(api.payments.createCheckoutSession);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onUnlock() {
    setError(null);
    setPending(true);
    try {
      const { url } = await createCheckout({ scanId });
      window.location.href = url;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Checkout failed");
      setPending(false);
    }
  }

  return (
    <div className="flex flex-col items-end gap-2">
      <button
        type="button"
        onClick={() => void onUnlock()}
        disabled={pending}
        className="rounded-full border-[3px] border-[var(--ink)] bg-[var(--accent)] px-5 py-2.5 text-sm font-black text-[var(--ink)] shadow-[3px_3px_0_var(--ink)] transition enabled:hover:translate-y-[1px] enabled:hover:shadow-[2px_2px_0_var(--ink)] disabled:opacity-60"
      >
        {pending ? "Opening Stripe…" : "Unlock full review · €5"}
      </button>
      {error ? (
        <p className="max-w-xs text-right text-xs font-bold text-[var(--accent-2)]">
          {error}
        </p>
      ) : null}
    </div>
  );
}
