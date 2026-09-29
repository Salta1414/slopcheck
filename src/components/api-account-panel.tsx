"use client";

import { Show, SignInButton } from "@clerk/nextjs";
import { useAction, useMutation, useQuery } from "convex/react";
import { useState, useTransition } from "react";
import { api } from "../../convex/_generated/api";
import type { Id } from "../../convex/_generated/dataModel";

const box =
  "rounded-[1.8rem] border-[3px] border-[var(--ink)] bg-white p-6 shadow-[5px_6px_0_var(--ink)]";
const button =
  "inline-flex min-h-11 items-center rounded-[1.1rem] border-[3px] border-[var(--ink)] px-5 text-sm font-black shadow-[3px_3px_0_var(--ink)] transition hover:translate-y-[1px] hover:shadow-[2px_2px_0_var(--ink)] disabled:opacity-60";

export function ApiAccountPanel() {
  return (
    <>
      <Show when="signed-out">
        <div className={box}>
          <h2 className="font-[family-name:var(--font-display)] text-2xl font-extrabold text-[var(--ink)]">
            Get an API key
          </h2>
          <p className="mt-2 font-semibold text-[var(--ink)]/70">
            Recipes are free without a key. Reviews need an account and credits
            (10 reviews for €29).
          </p>
          <SignInButton mode="modal">
            <button
              type="button"
              className={button + " mt-4 bg-[var(--accent)]"}
            >
              Log in to create a key
            </button>
          </SignInButton>
        </div>
      </Show>
      <Show when="signed-in">
        <SignedInPanel />
      </Show>
    </>
  );
}

function SignedInPanel() {
  const overview = useQuery(api.apiKeys.overview);
  const createKey = useAction(api.apiKeys.create);
  const revokeKey = useMutation(api.apiKeys.revoke);
  const buyCredits = useAction(api.payments.createCreditCheckout);
  const [name, setName] = useState("");
  const [newKey, setNewKey] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function run(task: () => Promise<void>) {
    setError(null);
    startTransition(async () => {
      try {
        await task();
      } catch (e) {
        setError(e instanceof Error ? e.message : "Something went wrong");
      }
    });
  }

  function onCreate(e: React.FormEvent) {
    e.preventDefault();
    run(async () => {
      const { key } = await createKey({ name: name || "Default" });
      setNewKey(key);
      setCopied(false);
      setName("");
    });
  }

  function onRevoke(keyId: Id<"apiKeys">) {
    if (!confirm("Revoke this key? Anything using it stops working.")) return;
    run(() => revokeKey({ keyId }).then(() => undefined));
  }

  function onBuy() {
    run(async () => {
      const { url } = await buyCredits({});
      window.location.href = url;
    });
  }

  async function copyKey() {
    if (!newKey) return;
    await navigator.clipboard.writeText(newKey);
    setCopied(true);
  }

  if (overview === undefined) {
    return <div className={box + " motion-skeleton h-48"} aria-busy />;
  }
  if (overview === null) {
    return (
      <div className={box}>
        <p className="font-semibold text-[var(--ink)]/70">
          Setting up your account…
        </p>
      </div>
    );
  }

  return (
    <div className={box}>
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="text-xs font-black uppercase tracking-wide text-[var(--ink)]/50">
            Review credits
          </p>
          <p className="font-[family-name:var(--font-display)] text-4xl font-black text-[var(--ink)]">
            {overview.credits}
          </p>
        </div>
        <button
          type="button"
          onClick={onBuy}
          disabled={isPending}
          className={button + " bg-[var(--accent)]"}
        >
          Buy credits
        </button>
      </div>

      {newKey ? (
        <div className="motion-pop mt-6 rounded-2xl border-[3px] border-[var(--ink)] bg-[var(--accent-3)] p-4">
          <p className="text-sm font-black text-[var(--ink)]">
            Your new key — copy it now, it won&apos;t be shown again.
          </p>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <code className="min-w-0 flex-1 break-all rounded-xl bg-white px-3 py-2 text-sm font-bold text-[var(--ink)]">
              {newKey}
            </code>
            <button
              type="button"
              onClick={() => void copyKey()}
              className={button + " bg-white"}
            >
              {copied ? "Copied ✓" : "Copy"}
            </button>
          </div>
        </div>
      ) : null}

      <h3 className="mt-8 text-sm font-black uppercase tracking-wide text-[var(--ink)]/50">
        API keys
      </h3>
      {overview.keys.length === 0 ? (
        <p className="mt-2 font-semibold text-[var(--ink)]/70">
          No keys yet. Create one, then add credits to run reviews.
        </p>
      ) : (
        <ul className="mt-2 divide-y-[2px] divide-[var(--ink)]/10">
          {overview.keys.map((k) => (
            <li key={k._id} className="flex flex-wrap items-center gap-3 py-3">
              <div className="min-w-0 flex-1">
                <p className="font-extrabold text-[var(--ink)]">{k.name}</p>
                <p className="text-xs font-semibold text-[var(--ink)]/60">
                  <code>{k.prefix}…</code> · created{" "}
                  {new Date(k.createdAt).toLocaleDateString()}
                  {k.lastUsedAt
                    ? " · last used " +
                      new Date(k.lastUsedAt).toLocaleDateString()
                    : " · never used"}
                </p>
              </div>
              <button
                type="button"
                onClick={() => onRevoke(k._id)}
                disabled={isPending}
                className="rounded-full border-[2px] border-[var(--ink)] bg-white px-3 py-1 text-xs font-black"
              >
                Revoke
              </button>
            </li>
          ))}
        </ul>
      )}

      <form onSubmit={onCreate} className="mt-4 flex flex-wrap gap-2">
        <label className="sr-only" htmlFor="api-key-name">
          Key name
        </label>
        <input
          id="api-key-name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Key name, e.g. Claude Code"
          maxLength={60}
          className="min-h-11 min-w-0 flex-1 rounded-[1.1rem] border-[3px] border-[var(--ink)] bg-white px-4 text-sm font-bold text-[var(--ink)] outline-none focus:bg-[var(--bg)]"
        />
        <button
          type="submit"
          disabled={isPending}
          className={button + " bg-white"}
        >
          Create key
        </button>
      </form>

      {error ? (
        <p role="alert" className="mt-3 text-sm font-bold text-red-700">
          {error}
        </p>
      ) : null}
    </div>
  );
}
