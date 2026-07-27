"use client";

import { useAuth } from "@clerk/nextjs";
import { useMutation } from "convex/react";
import { useEffect, useRef } from "react";
import { api } from "../../convex/_generated/api";
import {
  clearGuestScans,
  loadGuestScans,
  toClaimPayload,
} from "@/lib/guest-storage";

/**
 * After login/register: push local guest scans into Convex (overwrite/claim).
 */
export function GuestScanSync() {
  const { isSignedIn, isLoaded } = useAuth();
  const ensureUser = useMutation(api.users.ensureUser);
  const claimGuestScans = useMutation(api.scans.claimGuestScans);
  const ran = useRef(false);

  useEffect(() => {
    if (!isLoaded || !isSignedIn || ran.current) return;

    const guests = loadGuestScans();
    if (guests.length === 0) return;

    ran.current = true;

    void (async () => {
      try {
        await ensureUser({});
        await claimGuestScans({ scans: toClaimPayload(guests) });
        clearGuestScans();
      } catch (error) {
        console.error("Failed to claim guest scans", error);
        ran.current = false;
      }
    })();
  }, [isLoaded, isSignedIn, ensureUser, claimGuestScans]);

  return null;
}
