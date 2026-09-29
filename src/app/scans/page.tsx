import { redirect } from "next/navigation";

/** Scans moved to the Home dashboard; report pages stay at /scans/:id. */
export default function ScansRedirect() {
  redirect("/home");
}
