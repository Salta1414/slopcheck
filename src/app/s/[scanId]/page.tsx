import type { Metadata } from "next";
import Link from "next/link";
import {
  prettyHost,
  sharePath,
  shareText,
  verdictEmoji,
  verdictFromScore,
  verdictLabel,
} from "@/lib/share-score";
import { loadPublicShare } from "./share-data";

type Props = {
  params: Promise<{ scanId: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { scanId } = await params;
  const share = await loadPublicShare(scanId);

  if (!share) {
    return {
      title: "Score not shared",
      robots: { index: false, follow: false },
    };
  }

  const description = shareText({
    score: share.score,
    verdict: share.verdict,
    url: share.normalizedUrl,
  });
  const path = sharePath(scanId);

  return {
    title: `${prettyHost(share.normalizedUrl)} · ${share.score}/100`,
    description,
    alternates: { canonical: path },
    openGraph: {
      title: `${prettyHost(share.normalizedUrl)} scored ${share.score}/100`,
      description,
      url: path,
      type: "website",
    },
    twitter: {
      card: "summary_large_image",
      title: `${prettyHost(share.normalizedUrl)} · ${share.score}/100`,
      description,
    },
  };
}

export default async function PublicSharePage({ params }: Props) {
  const { scanId } = await params;
  const share = await loadPublicShare(scanId);

  if (!share) {
    return (
      <div className="mx-auto w-full max-w-xl px-4 py-16 sm:px-6">
        <div className="rounded-[2rem] border-[3px] border-[var(--ink)] bg-white p-8 shadow-[5px_6px_0_var(--ink)]">
          <h1 className="font-[family-name:var(--font-display)] text-3xl font-extrabold text-[var(--ink)]">
            This score isn’t public
          </h1>
          <p className="mt-3 font-semibold text-[var(--ink)]/70">
            Either the link is wrong, or the owner hasn’t shared this scan yet.
          </p>
          <Link
            href="/"
            className="mt-6 inline-block rounded-full border-[3px] border-[var(--ink)] bg-[var(--accent)] px-5 py-2.5 text-sm font-black shadow-[3px_3px_0_var(--ink)]"
          >
            Check your own UI
          </Link>
        </div>
      </div>
    );
  }

  const band = share.verdict ?? verdictFromScore(share.score);
  const label = verdictLabel(band);
  const emoji = verdictEmoji(band);

  return (
    <div className="mx-auto w-full max-w-2xl px-4 py-10 sm:px-6 sm:py-14">
      <div className="overflow-hidden rounded-[2rem] border-[3px] border-[var(--ink)] bg-white shadow-[6px_8px_0_var(--ink)]">
        <div className="border-b-[3px] border-[var(--ink)] bg-[var(--accent-3)]/50 px-6 py-5 sm:px-8">
          <p className="text-xs font-extrabold uppercase tracking-wide text-[var(--ink)]/55">
            Shared UI Slop Score
            {share.isFullReview ? " · full review" : " · estimate"}
          </p>
          <p className="mt-1 truncate text-sm font-bold text-[var(--ink)]/70">
            {prettyHost(share.normalizedUrl)}
          </p>
        </div>

        <div className="flex flex-col gap-6 p-6 sm:flex-row sm:items-end sm:justify-between sm:p-8">
          <div>
            <div className="flex items-end gap-3">
              <span className="font-[family-name:var(--font-display)] text-7xl font-black leading-none text-[var(--ink)]">
                {share.score}
              </span>
              <span className="mb-2 text-3xl" aria-hidden>
                {emoji}
              </span>
            </div>
            <span className="mt-3 inline-block rounded-full border-[3px] border-[var(--ink)] bg-[var(--accent)] px-3 py-1 text-sm font-extrabold text-[var(--ink)]">
              {label}
            </span>
          </div>
          <p className="max-w-xs text-sm font-semibold text-[var(--ink)]/65">
            {shareText({
              score: share.score,
              verdict: share.verdict,
              url: share.normalizedUrl,
            })}
          </p>
        </div>

        {share.teaserFlags.length > 0 ? (
          <div className="border-t-[3px] border-[var(--ink)] px-6 py-6 sm:px-8">
            <h2 className="font-[family-name:var(--font-display)] text-lg font-extrabold text-[var(--ink)]">
              What stood out
            </h2>
            <ul className="mt-3 space-y-2">
              {share.teaserFlags.map((flag) => (
                <li
                  key={flag}
                  className="rounded-2xl border-[3px] border-[var(--ink)] bg-[var(--bg)] px-4 py-3 text-sm font-semibold text-[var(--ink)]"
                >
                  {flag}
                </li>
              ))}
            </ul>
          </div>
        ) : null}

        <div className="border-t-[3px] border-[var(--ink)] bg-[var(--bg)] px-6 py-6 sm:px-8">
          <p className="font-extrabold text-[var(--ink)]">
            Think your site smells worse?
          </p>
          <p className="mt-1 text-sm font-semibold text-[var(--ink)]/65">
            Paste a URL — get a score, then unlock fix prompts for €5.
          </p>
          <Link
            href="/"
            className="mt-4 inline-block rounded-full border-[3px] border-[var(--ink)] bg-[var(--accent)] px-5 py-2.5 text-sm font-black shadow-[3px_3px_0_var(--ink)] transition hover:translate-y-[1px] hover:shadow-[2px_2px_0_var(--ink)]"
          >
            Run Slopcheck
          </Link>
        </div>
      </div>
    </div>
  );
}
