import { build } from "esbuild";

// Bundle a TypeScript module (and its relative imports) so tests can import
// it on any Node version. esbuild ships with the convex package.
export async function loadTypeScript(relativePath) {
  const result = await build({
    entryPoints: [new URL(relativePath, import.meta.url).pathname],
    bundle: true,
    format: "esm",
    platform: "node",
    write: false,
    logLevel: "silent",
  });
  const code = result.outputFiles[0].text;
  return import(`data:text/javascript;base64,${Buffer.from(code).toString("base64")}`);
}
