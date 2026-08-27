"use client";

import { useAction, useMutation } from "convex/react";
import { useId, useState } from "react";
import { api } from "../../convex/_generated/api";
import type { Id } from "../../convex/_generated/dataModel";

type Status =
  | "idle"
  | "preparing"
  | "ready"
  | "uploading"
  | "verifying"
  | "success"
  | "rejected"
  | "expired"
  | "error";

type Challenge = {
  challengeId: Id<"screenshotShareChallenges">;
  postText: string;
  xIntentUrl: string;
  expiresAt: number;
};

const MAX_SCREENSHOT_BYTES = 8 * 1024 * 1024;
const ALLOWED_IMAGE_TYPES = new Set([
  "image/png",
  "image/jpeg",
  "image/webp",
]);

export function ShareForFreeButton({ scanId }: { scanId: Id<"scans"> }) {
  const beginScreenshotShare = useAction(
    api.xShareScreenshot.beginScreenshotShare,
  );
  const generateUploadUrl = useMutation(
    api.xShareScreenshotUpload.generateUploadUrl,
  );
  const verifyScreenshot = useAction(api.xShareScreenshot.verifyScreenshot);
  const inputId = useId();
  const [status, setStatus] = useState<Status>("idle");
  const [challenge, setChallenge] = useState<Challenge | null>(null);

  async function preparePost() {
    setStatus("preparing");
    try {
      const next = await beginScreenshotShare({ scanId });
      setChallenge(next);
      setStatus("ready");
    } catch {
      setStatus("error");
    }
  }

  async function copyPost() {
    if (!challenge) return;
    try {
      await navigator.clipboard.writeText(challenge.postText);
      setStatus("ready");
    } catch {
      setStatus("error");
    }
  }

  async function onScreenshotSelected(
    event: React.ChangeEvent<HTMLInputElement>,
  ) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file || !challenge) return;

    if (!ALLOWED_IMAGE_TYPES.has(file.type) || file.size > MAX_SCREENSHOT_BYTES) {
      setStatus("error");
      return;
    }

    setStatus("uploading");
    try {
      const uploadUrl = await generateUploadUrl({
        challengeId: challenge.challengeId,
      });
      const uploadResponse = await fetch(uploadUrl, {
        method: "POST",
        headers: { "Content-Type": file.type },
        body: file,
      });
      if (!uploadResponse.ok) throw new Error("Screenshot upload failed");

      const uploadResult = (await uploadResponse.json()) as {
        storageId?: Id<"_storage">;
      };
      if (!uploadResult.storageId) throw new Error("Screenshot upload failed");

      setStatus("verifying");
      const result = await verifyScreenshot({
        challengeId: challenge.challengeId,
        storageId: uploadResult.storageId,
      });

      if (result.status === "verified") {
        setChallenge(null);
        setStatus("success");
      } else if (result.status === "expired") {
        setChallenge(null);
        setStatus("expired");
      } else if (result.status === "rejected") {
        setChallenge(null);
        setStatus("rejected");
      } else if (
        result.status === "already_ready" ||
        result.status === "already_running"
      ) {
        setChallenge(null);
        setStatus("success");
      } else {
        setChallenge(null);
        setStatus("error");
      }
    } catch {
      setChallenge(null);
      setStatus("error");
    }
  }

  const showChallenge =
    challenge && (status === "ready" || status === "error");

  return (
    <div className="flex max-w-sm flex-col gap-2 sm:items-end">
      <div className="rounded-[1.5rem] border-[3px] border-[var(--ink)] bg-[var(--accent-3)]/60 p-4 shadow-[3px_4px_0_var(--ink)]">
        <p className="text-xs font-black uppercase tracking-wide text-[var(--ink)]/60">
          Free unlock
        </p>
        <p className="mt-1 text-sm font-extrabold text-[var(--ink)]">
          Post your score yourself. Send us a screenshot of the published post
          and the full analysis is on us.
        </p>

        {!challenge && status !== "success" ? (
          <button
            type="button"
            onClick={() => void preparePost()}
            disabled={status === "preparing"}
            className="mt-3 w-full rounded-full border-[3px] border-[var(--ink)] bg-[var(--ink)] px-4 py-2.5 text-sm font-black text-white shadow-[3px_3px_0_var(--accent)] transition enabled:hover:translate-y-[1px] enabled:hover:shadow-[2px_2px_0_var(--accent)] disabled:opacity-60"
          >
            {status === "preparing"
              ? "Preparing post…"
              : "Prepare X post + unlock free"}
          </button>
        ) : null}

        {showChallenge ? (
          <div className="mt-3 space-y-2">
            <label className="sr-only" htmlFor={`share-post-${inputId}`}>
              Post text
            </label>
            <textarea
              id={`share-post-${inputId}`}
              readOnly
              value={challenge.postText}
              rows={6}
              className="w-full resize-none rounded-2xl border-[3px] border-[var(--ink)] bg-white p-3 text-xs font-bold text-[var(--ink)] outline-none"
            />
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => void copyPost()}
                className="flex-1 rounded-full border-[3px] border-[var(--ink)] bg-white px-3 py-2 text-xs font-black text-[var(--ink)] shadow-[2px_2px_0_var(--ink)] transition hover:translate-y-[1px] hover:shadow-[1px_1px_0_var(--ink)]"
              >
                Copy post
              </button>
              <a
                href={challenge.xIntentUrl}
                target="_blank"
                rel="noreferrer"
                className="flex-1 rounded-full border-[3px] border-[var(--ink)] bg-[var(--ink)] px-3 py-2 text-center text-xs font-black text-white shadow-[2px_2px_0_var(--accent)] transition hover:translate-y-[1px] hover:shadow-[1px_1px_0_var(--accent)]"
              >
                Open X
              </a>
            </div>
            <label
              htmlFor={`share-screenshot-${inputId}`}
              className="block cursor-pointer rounded-2xl border-[3px] border-dashed border-[var(--ink)] bg-white px-3 py-3 text-center text-xs font-black text-[var(--ink)] transition hover:bg-[var(--accent)]/20"
            >
              Upload screenshot of published post
            </label>
            <input
              id={`share-screenshot-${inputId}`}
              type="file"
              accept="image/png,image/jpeg,image/webp"
              onChange={(event) => void onScreenshotSelected(event)}
              className="sr-only"
            />
            <p className="text-[11px] font-bold text-[var(--ink)]/45">
              Post it first — a composer draft will not count. Challenge expires
              in 15 minutes.
            </p>
          </div>
        ) : null}

        {status === "uploading" || status === "verifying" ? (
          <p className="mt-3 text-xs font-black text-[var(--ink)]/65">
            {status === "uploading"
              ? "Uploading screenshot…"
              : "Checking the published post…"}
          </p>
        ) : null}

        {status === "success" ? (
          <p className="mt-3 text-xs font-black text-[var(--ink)]">
            Screenshot verified — your free full analysis is cooking now.
          </p>
        ) : null}
      </div>

      {status === "rejected" ? (
        <p className="text-right text-xs font-bold text-[var(--accent-2)]" role="alert">
          We could not verify that screenshot. Make sure the published post and
          the one-time code are visible, then try again.
        </p>
      ) : null}
      {status === "expired" ? (
        <p className="text-right text-xs font-bold text-[var(--accent-2)]" role="alert">
          That share challenge expired. Prepare a new post and try again.
        </p>
      ) : null}
      {status === "error" ? (
        <p className="text-right text-xs font-bold text-[var(--accent-2)]" role="alert">
          Could not prepare or verify the screenshot. Try again.
        </p>
      ) : null}
    </div>
  );
}
