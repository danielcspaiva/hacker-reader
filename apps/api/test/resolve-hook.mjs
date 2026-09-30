// Lets `node --test` load the API's extensionless relative TypeScript imports
// (Metro/tsc "bundler" resolution) without adding a dependency.
import { existsSync } from "node:fs";
import { fileURLToPath } from "node:url";

const CANDIDATES = [".ts", "/index.ts"];
const APP_ROOT = new URL("../", import.meta.url);

export async function resolve(specifier, context, nextResolve) {
  // `@/` is the app root, as in tsconfig `paths`.
  if (specifier.startsWith("@/")) {
    const rest = specifier.slice(2);
    for (const suffix of ["", ...CANDIDATES]) {
      const url = new URL(rest + suffix, APP_ROOT);
      if (
        /\.[cm]?[jt]s$/.test(url.pathname) &&
        existsSync(fileURLToPath(url))
      ) {
        return nextResolve(url.href, context);
      }
    }
  }
  const isRelative = specifier.startsWith("./") || specifier.startsWith("../");
  if (isRelative && context.parentURL && !/\.[cm]?[jt]s$/.test(specifier)) {
    for (const suffix of CANDIDATES) {
      const url = new URL(specifier + suffix, context.parentURL);
      if (existsSync(fileURLToPath(url))) {
        return nextResolve(url.href, context);
      }
    }
  }
  return nextResolve(specifier, context);
}
