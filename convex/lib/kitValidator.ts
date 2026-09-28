import { v } from "convex/values";

/** Convex validator mirroring DesignKit in ./kit.ts. */
export const designKitValidator = v.object({
  direction: v.string(),
  palette: v.array(
    v.object({ name: v.string(), hex: v.string(), role: v.string() }),
  ),
  fonts: v.object({ display: v.string(), body: v.string(), why: v.string() }),
  motion: v.array(v.string()),
  sections: v.array(
    v.object({
      section: v.string(),
      remove: v.string(),
      replace: v.string(),
      recipes: v.array(v.string()),
    }),
  ),
});
