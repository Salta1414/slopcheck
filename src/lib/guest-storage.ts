export type SlopVerdict = "fresh" | "mixed" | "likely_slop" | "peak_slop";

export type GuestScan = {
  guestKey: string;
  url: string;
  normalizedUrl: string;
  estimatedScore: number;
  verdict: SlopVerdict;
  teaserFlags: string[];
  lockedFindings: string[];
  lockedPrompts: string[];
  createdAt: number;
  scanId?: string;
};

const STORAGE_KEY = "slopcheck.guestScans.v1";
const ACTIVE_KEY = "slopcheck.activeGuestKey.v1";

function canUseStorage(): boolean {
  return typeof window !== "undefined" && typeof localStorage !== "undefined";
}

export function createGuestKey(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `guest_${Date.now()}_${Math.random().toString(36).slice(2)}`;
}

export function loadGuestScans(): GuestScan[] {
  if (!canUseStorage()) return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed as GuestScan[];
  } catch {
    return [];
  }
}

export function saveGuestScans(scans: GuestScan[]): void {
  if (!canUseStorage()) return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(scans));
}

export function upsertGuestScan(scan: GuestScan): GuestScan {
  const scans = loadGuestScans().filter((s) => s.guestKey !== scan.guestKey);
  scans.unshift(scan);
  saveGuestScans(scans.slice(0, 20));
  setActiveGuestKey(scan.guestKey);
  return scan;
}

export function getGuestScan(guestKey: string): GuestScan | null {
  return loadGuestScans().find((s) => s.guestKey === guestKey) ?? null;
}

export function getActiveGuestScan(): GuestScan | null {
  if (!canUseStorage()) return null;
  const key = localStorage.getItem(ACTIVE_KEY);
  if (!key) return loadGuestScans()[0] ?? null;
  return getGuestScan(key) ?? loadGuestScans()[0] ?? null;
}

export function setActiveGuestKey(guestKey: string): void {
  if (!canUseStorage()) return;
  localStorage.setItem(ACTIVE_KEY, guestKey);
}

export function clearGuestScans(): void {
  if (!canUseStorage()) return;
  localStorage.removeItem(STORAGE_KEY);
  localStorage.removeItem(ACTIVE_KEY);
}

/** Payload for Convex claimGuestScans */
export function toClaimPayload(scans: GuestScan[]) {
  return scans.map((s) => ({
    guestKey: s.guestKey,
    url: s.url,
    normalizedUrl: s.normalizedUrl,
    estimatedScore: s.estimatedScore,
    verdict: s.verdict,
    teaserFlags: s.teaserFlags,
    lockedFindings: s.lockedFindings,
    lockedPrompts: s.lockedPrompts,
    createdAt: s.createdAt,
  }));
}
