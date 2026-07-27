import { Suspense } from "react";
import ScanDetailClient from "./scan-detail-client";

export default function ScanDetailPage() {
  return (
    <Suspense
      fallback={
        <div className="mx-auto max-w-4xl px-4 py-8 font-extrabold text-[var(--ink)]/50">
          Loading scan…
        </div>
      }
    >
      <ScanDetailClient />
    </Suspense>
  );
}
