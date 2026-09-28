"use client";

import { useState } from "react";

export function CopyForAiButton({
  text,
  label = "Copy for your AI",
}: {
  text: string;
  label?: string;
}) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 1800);
  }

  return (
    <button
      type="button"
      onClick={() => void copy()}
      className="squish-press rounded-full border-[3px] border-[var(--ink)] bg-[var(--accent)] px-5 py-2.5 text-sm font-black text-[var(--ink)] shadow-[3px_3px_0_var(--ink)] transition"
    >
      {copied ? "Copied ✓" : label}
    </button>
  );
}
