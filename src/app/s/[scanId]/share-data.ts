import { fetchQuery } from "convex/nextjs";
import { api } from "../../../../convex/_generated/api";
import type { Id } from "../../../../convex/_generated/dataModel";

export type PublicShare = {
  normalizedUrl: string;
  score: number;
  verdict?: "fresh" | "mixed" | "likely_slop" | "peak_slop";
  teaserFlags: string[];
  isFullReview: boolean;
  createdAt: number;
};

/** Malformed ids make Convex throw, so treat any failure as "not shared". */
export async function loadPublicShare(
  scanId: string,
): Promise<PublicShare | null> {
  try {
    return await fetchQuery(api.share.getPublic, {
      scanId: scanId as Id<"scans">,
    });
  } catch {
    return null;
  }
}
