import { existsSync, statSync } from "node:fs";
import { resolve as resolvePath } from "node:path";
import { pathToFileURL } from "node:url";

export async function resolve(specifier, context, nextResolve) {
  if (!specifier.startsWith("@/")) return nextResolve(specifier, context);

  const basePath = resolvePath(process.cwd(), "src", specifier.slice(2));
  const filePath = existsSync(basePath) && statSync(basePath).isDirectory()
    ? resolvePath(basePath, "index.ts")
    : existsSync(basePath)
      ? basePath
      : `${basePath}.ts`;
  return { shortCircuit: true, url: pathToFileURL(filePath).href };
}
