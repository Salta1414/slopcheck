import type { NextConfig } from "next";

/**
 * The public API and MCP server are Convex HTTP actions. Proxy them under our
 * own domain so users only ever see slopcheck.dev/api/v1 and slopcheck.dev/mcp.
 */
function convexSiteUrl(): string | null {
  if (process.env.CONVEX_SITE_URL) {
    return process.env.CONVEX_SITE_URL.replace(/\/$/, "");
  }
  const cloud = process.env.NEXT_PUBLIC_CONVEX_URL;
  if (!cloud) return null;
  return cloud.replace(/\/$/, "").replace(/\.convex\.cloud$/, ".convex.site");
}

const nextConfig: NextConfig = {
  async rewrites() {
    const site = convexSiteUrl();
    if (!site) return [];
    return [
      { source: "/api/v1/:path*", destination: `${site}/api/v1/:path*` },
      { source: "/mcp", destination: `${site}/mcp` },
    ];
  },
};

export default nextConfig;
