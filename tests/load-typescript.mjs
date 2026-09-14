import { readFile } from "node:fs/promises";
import ts from "typescript";

// These leaf modules have no runtime imports. Use the installed compiler so tests
// also run on Node builds without native TypeScript stripping.
export async function loadTypeScript(relativePath) {
  const source = await readFile(new URL(relativePath, import.meta.url), "utf8");
  const { outputText } = ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 },
  });
  return import(`data:text/javascript;base64,${Buffer.from(outputText).toString("base64")}`);
}
