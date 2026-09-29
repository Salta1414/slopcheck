import { clerkMiddleware } from "@clerk/nextjs/server";

export default clerkMiddleware();

export const config = {
  matcher: [
    // The public API and MCP server are proxied to Convex and use API keys, not Clerk.
    "/((?!_next|api/v1|mcp|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest|mp4|webm|mov)).*)",
    "/(api(?!/v1)|trpc)(.*)",
    "/__clerk/:path*",
  ],
};
