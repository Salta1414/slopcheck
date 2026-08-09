"use client";

import { useMutation } from "convex/react";
import { useId, useState } from "react";
import type { Id } from "../../convex/_generated/dataModel";
import { api } from "../../convex/_generated/api";

export function FeedbackButton({ scanId }: { scanId: Id<"scans"> }) {
  const submitFeedback = useMutation(api.feedback.create);
  const titleId = useId();
  const messageId = useId();
  const emailId = useId();
  const twitterId = useId();
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [message, setMessage] = useState("");
  const [email, setEmail] = useState("");
  const [twitter, setTwitter] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  function openForm() {
    setOpen(true);
    setSent(false);
    setError(null);
  }

  function closeForm() {
    if (isSubmitting) return;
    setOpen(false);
    setError(null);
  }

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setIsSubmitting(true);

    try {
      await submitFeedback({
        scanId,
        title,
        message,
        email: email || undefined,
        twitter: twitter || undefined,
      });
      setSent(true);
      setTitle("");
      setMessage("");
      setEmail("");
      setTwitter("");
    } catch (submissionError) {
      setError(
        submissionError instanceof Error
          ? submissionError.message
          : "Could not send feedback",
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="mt-5 border-t-[3px] border-[var(--ink)]/15 pt-4">
      {!open ? (
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm font-bold text-[var(--ink)]/60">
            Paid for this review? Tell us what landed — or what missed.
          </p>
          <button
            type="button"
            onClick={openForm}
            className="shrink-0 rounded-full border-[3px] border-[var(--ink)] bg-[var(--accent-3)] px-4 py-2 text-sm font-black shadow-[3px_3px_0_var(--ink)] transition hover:translate-y-[1px] hover:shadow-[2px_2px_0_var(--ink)]"
          >
            Give feedback
          </button>
        </div>
      ) : (
        <div
          className="rounded-[1.5rem] border-[3px] border-[var(--ink)] bg-[var(--bg)] p-4 sm:p-5"
          role="dialog"
          aria-label="Give feedback"
        >
          {sent ? (
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="font-[family-name:var(--font-display)] text-xl font-black">
                  Thanks — message received!
                </p>
                <p className="mt-1 text-sm font-semibold text-[var(--ink)]/65">
                  Your feedback is now in the owner inbox.
                </p>
              </div>
              <button
                type="button"
                onClick={closeForm}
                className="rounded-full border-[3px] border-[var(--ink)] bg-white px-4 py-2 text-sm font-black shadow-[2px_2px_0_var(--ink)]"
              >
                Close
              </button>
            </div>
          ) : (
            <form onSubmit={(event) => void onSubmit(event)} className="space-y-4">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-xs font-black uppercase tracking-[0.16em] text-[var(--ink)]/50">
                    Help us make the €5 worth it
                  </p>
                  <h3 className="mt-1 font-[family-name:var(--font-display)] text-2xl font-black">
                    What should we improve?
                  </h3>
                </div>
                <button
                  type="button"
                  onClick={closeForm}
                  aria-label="Close feedback form"
                  className="grid h-9 w-9 shrink-0 place-items-center rounded-full border-[3px] border-[var(--ink)] bg-white text-xl font-black leading-none shadow-[2px_2px_0_var(--ink)]"
                >
                  ×
                </button>
              </div>

              <div>
                <label htmlFor={titleId} className="text-sm font-black">
                  Title
                </label>
                <input
                  id={titleId}
                  value={title}
                  onChange={(event) => setTitle(event.target.value)}
                  maxLength={120}
                  required
                  placeholder="The report nailed…"
                  className="mt-1 min-h-11 w-full rounded-xl border-[3px] border-[var(--ink)] bg-white px-3 font-semibold outline-none focus:ring-4 focus:ring-[var(--accent)]/50"
                />
              </div>

              <div>
                <label htmlFor={messageId} className="text-sm font-black">
                  Your feedback
                </label>
                <textarea
                  id={messageId}
                  value={message}
                  onChange={(event) => setMessage(event.target.value)}
                  maxLength={5000}
                  required
                  rows={5}
                  placeholder="What did you expect? What felt useful, confusing, or missing?"
                  className="mt-1 w-full resize-y rounded-xl border-[3px] border-[var(--ink)] bg-white px-3 py-2 font-semibold outline-none focus:ring-4 focus:ring-[var(--accent)]/50"
                />
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <label htmlFor={emailId} className="text-sm font-black">
                    Email <span className="font-semibold text-[var(--ink)]/45">(optional)</span>
                  </label>
                  <input
                    id={emailId}
                    type="email"
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                    placeholder="you@example.com"
                    className="mt-1 min-h-11 w-full rounded-xl border-[3px] border-[var(--ink)] bg-white px-3 font-semibold outline-none focus:ring-4 focus:ring-[var(--accent)]/50"
                  />
                </div>
                <div>
                  <label htmlFor={twitterId} className="text-sm font-black">
                    X / Twitter <span className="font-semibold text-[var(--ink)]/45">(optional)</span>
                  </label>
                  <input
                    id={twitterId}
                    value={twitter}
                    onChange={(event) => setTwitter(event.target.value)}
                    placeholder="@yourhandle"
                    className="mt-1 min-h-11 w-full rounded-xl border-[3px] border-[var(--ink)] bg-white px-3 font-semibold outline-none focus:ring-4 focus:ring-[var(--accent)]/50"
                  />
                </div>
              </div>

              {error ? (
                <p className="text-sm font-black text-[var(--accent-2)]" role="alert">
                  {error}
                </p>
              ) : null}

              <button
                type="submit"
                disabled={isSubmitting}
                className="rounded-full border-[3px] border-[var(--ink)] bg-[var(--accent)] px-5 py-2.5 text-sm font-black shadow-[3px_3px_0_var(--ink)] transition enabled:hover:translate-y-[1px] enabled:hover:shadow-[2px_2px_0_var(--ink)] disabled:cursor-wait disabled:opacity-60"
              >
                {isSubmitting ? "Sending…" : "Send feedback"}
              </button>
            </form>
          )}
        </div>
      )}
    </div>
  );
}
