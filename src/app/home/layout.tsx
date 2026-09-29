import type { Metadata } from "next";
import type { ReactNode } from "react";
import { HomeShell } from "@/components/home/home-shell";

export const metadata: Metadata = {
  title: "Home — Slopcheck",
  robots: { index: false },
};

export default function HomeLayout({ children }: { children: ReactNode }) {
  return <HomeShell>{children}</HomeShell>;
}
