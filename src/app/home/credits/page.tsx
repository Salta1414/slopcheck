import { Suspense } from "react";
import { CreditsTab } from "@/components/home/credits-tab";

export default function HomeCreditsPage() {
  // useSearchParams (for ?paid=1 after checkout) needs a Suspense boundary.
  return (
    <Suspense>
      <CreditsTab />
    </Suspense>
  );
}
