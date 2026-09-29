"use client";

import { useState } from "react";

/** A labeled, copyable snippet for docs pages. */
export function CodeBlock({ label, code }: { label: string; code: string }) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    await navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  return (
    <div className="mt-3">
      <div className="flex items-center gap-2">
        <span className="text-xs font-black uppercase tracking-wide text-[var(--ink)]/50">
          {label}
        </span>
        <button
          type="button"
          onClick={() => void copy()}
          className="ml-auto rounded-full border-[2px] border-[var(--ink)] bg-[var(--accent-3)] px-3 py-1 text-xs font-black"
        >
          {copied ? "Copied ✓" : "Copy"}
        </button>
      </div>
      <pre className="mt-2 overflow-auto rounded-2xl border-[2px] border-[var(--ink)]/20 bg-[var(--bg)] p-3 text-xs font-semibold text-[var(--ink)]/85">
        {code}
      </pre>
    </div>
  );
}
