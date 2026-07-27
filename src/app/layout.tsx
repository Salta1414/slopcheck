import { ClerkProvider } from "@clerk/nextjs";
import type { Metadata } from "next";
import { Fredoka, Nunito } from "next/font/google";
import { GuestScanSync } from "@/components/guest-scan-sync";
import { Providers } from "@/components/providers";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import "./globals.css";

const display = Fredoka({
  variable: "--font-display",
  subsets: ["latin"],
  weight: ["500", "600", "700"],
});

const body = Nunito({
  variable: "--font-body",
  subsets: ["latin"],
  weight: ["500", "600", "700", "800"],
});

export const metadata: Metadata = {
  title: "Slopcheck — Is your UI AI slop?",
  description:
    "Paste a URL. We score whether your website UI looks like AI slop — and help you fix it.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${display.variable} ${body.variable} min-h-full`}>
      <body className="min-h-full antialiased">
        <ClerkProvider
          appearance={{
            variables: {
              colorPrimary: "#2EE6A6",
              colorDanger: "#FF5A7A",
              borderRadius: "1.5rem",
              fontFamily: "var(--font-display), system-ui, sans-serif",
            },
          }}
        >
          <Providers>
            <GuestScanSync />
            <div className="relative z-0 flex min-h-full flex-col">
              <SiteHeader />
              <main className="flex-1">{children}</main>
              <SiteFooter />
            </div>
          </Providers>
        </ClerkProvider>
      </body>
    </html>
  );
}
