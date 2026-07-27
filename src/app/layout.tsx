import { ClerkProvider } from "@clerk/nextjs";
import { Fredoka, Nunito } from "next/font/google";
import { GuestScanSync } from "@/components/guest-scan-sync";
import { Providers } from "@/components/providers";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { clerkAppearance } from "@/lib/clerk-appearance";
import { siteMetadata } from "@/lib/site-metadata";
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

export const metadata = siteMetadata;

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${display.variable} ${body.variable} min-h-full`}>
      <body className="min-h-full antialiased">
        <ClerkProvider appearance={clerkAppearance}>
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
