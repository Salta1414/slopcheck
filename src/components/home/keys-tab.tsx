"use client";

import { useAction, useMutation, useQuery } from "convex/react";
import Link from "next/link";
import { useState, useTransition } from "react";
import { api } from "../../../convex/_generated/api";
import type { Id } from "../../../convex/_generated/dataModel";
import { button, card, formatDate } from "./ui";

export function KeysTab() {
  const overview = useQuery(api.apiKeys.overview);
  const createKey = useAction(api.apiKeys.create);
  const deleteKey = useMutation(api.apiKeys.revoke);
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

  function onDelete(keyId: Id<"apiKeys">, keyName: string) {
    if (
      !confirm(
        `Delete "${keyName}"? Anything using this key stops working immediately.`,
      )
    ) {
      return;
    }
    run(() => deleteKey({ keyId }).then(() => undefined));
  }

  async function copyKey() {
    if (!newKey) return;
    await navigator.clipboard.writeText(newKey);
    setCopied(true);
  }

  if (overview === undefined) {
    return <div className={card + " motion-skeleton h-56"} aria-busy />;
  }
  const keys = overview?.keys ?? [];

  return (
    <div className="space-y-6">
      {newKey ? (
        <div className="motion-pop rounded-[1.8rem] border-[3px] border-[var(--ink)] bg-[var(--accent-3)] p-5 shadow-[4px_5px_0_var(--ink)]">
          <p className="text-sm font-black text-[var(--ink)]">
            Your new key — copy it now, it won&apos;t be shown again.
          </p>
          <div className="mt-3 flex flex-wrap items-center gap-2">
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
          <p className="mt-3 text-sm font-semibold text-[var(--ink)]/70">
            Next:{" "}
            <Link href="/developers" className="font-black underline">
              connect it to Claude Code, Cursor or the REST API
            </Link>
            .
          </p>
        </div>
      ) : null}

      <section className={card}>
        <h2 className="font-[family-name:var(--font-display)] text-xl font-extrabold text-[var(--ink)]">
          Create a key
        </h2>
        <form onSubmit={onCreate} className="mt-3 flex flex-wrap gap-2">
          <label className="sr-only" htmlFor="api-key-name">
            Key name
          </label>
          <input
            id="api-key-name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Name, e.g. Claude Code on my laptop"
            maxLength={60}
            className="min-h-11 min-w-0 flex-1 rounded-[1.1rem] border-[3px] border-[var(--ink)] bg-[var(--bg)] px-4 text-sm font-bold text-[var(--ink)] outline-none focus:ring-4 focus:ring-[var(--accent)]/50"
          />
          <button
            type="submit"
            disabled={isPending}
            className={button + " bg-[var(--accent)]"}
          >
            Create key
          </button>
        </form>
        {error ? (
          <p role="alert" className="mt-3 text-sm font-bold text-red-700">
            {error}
          </p>
        ) : null}
      </section>

      <section className={card}>
        <h2 className="font-[family-name:var(--font-display)] text-xl font-extrabold text-[var(--ink)]">
          Your keys
        </h2>
        {keys.length === 0 ? (
          <p className="mt-2 text-sm font-semibold text-[var(--ink)]/65">
            No keys yet. Recipes work without one; reviews need a key and{" "}
            <Link href="/home/credits" className="font-black underline">
              credits
            </Link>
            .
          </p>
        ) : (
          <ul className="mt-3 divide-y-[2px] divide-[var(--ink)]/10">
            {keys.map((k) => (
              <li
                key={k._id}
                className="flex flex-wrap items-center gap-3 py-3"
              >
                <div className="min-w-0 flex-1">
                  <p className="font-extrabold text-[var(--ink)]">{k.name}</p>
                  <p className="text-xs font-semibold text-[var(--ink)]/60">
                    <code>{k.prefix}…</code> · created {formatDate(k.createdAt)}
                    {k.lastUsedAt
                      ? " · last used " + formatDate(k.lastUsedAt)
                      : " · never used"}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => onDelete(k._id, k.name)}
                  disabled={isPending}
                  className="rounded-full border-[2px] border-[var(--ink)] bg-white px-3 py-1 text-xs font-black text-[var(--ink)] transition hover:bg-[var(--accent-2)] hover:text-white disabled:opacity-60"
                >
                  Delete
                </button>
              </li>
            ))}
          </ul>
        )}
        <p className="mt-4 text-sm font-semibold text-[var(--ink)]/65">
          Up to 5 keys. Keys are stored hashed — if you lose one, delete it and
          create a new one.
        </p>
      </section>
    </div>
  );
}
