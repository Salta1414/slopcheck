export type SlopVerdict = "fresh" | "mixed" | "likely_slop" | "peak_slop";

export type GuestScan = {
  guestKey: string;
  url: string;
  normalizedUrl: string;
  estimatedScore: number;
  verdict: SlopVerdict;
  teaserFlags: string[];
  /** Locked findings stay on the server; we only know how many to hint at. */
  lockedCount: number;
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
    return parsed.map(migrateGuestScan);
  } catch {
    return [];
  }
}

/** Older entries stored the locked text itself — keep only the count. */
function migrateGuestScan(entry: unknown): GuestScan {
  const legacy = { ...(entry as Record<string, unknown>) };
  const lockedFindings = legacy.lockedFindings;
  delete legacy.lockedFindings;
  delete legacy.lockedPrompts;

  const scan = legacy as unknown as GuestScan;
  if (typeof scan.lockedCount === "number") return scan;
  return {
    ...scan,
    lockedCount: Array.isArray(lockedFindings) ? lockedFindings.length : 4,
  };
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

export function findGuestKeyForScan(scanId: string): string | null {
  return loadGuestScans().find((s) => s.scanId === scanId)?.guestKey ?? null;
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

/** Payload for Convex claimGuestScans — the server owns the scan data. */
export function toClaimPayload(scans: GuestScan[]) {
  return { guestKeys: scans.map((s) => s.guestKey) };
}
