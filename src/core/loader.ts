import { readdir } from 'node:fs/promises';
import { basename, extname, join, relative } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { isRoute, type AnyRoute } from './define-route.js';

/** `src/routes` in dev (tsx) and `dist/routes` after build: always relative to this file. */
const DEFAULT_ROUTES_DIR = fileURLToPath(new URL('../routes/', import.meta.url));
const ROUTE_EXTENSIONS = new Set(['.ts', '.mts', '.js', '.mjs']);

function isRouteFile(file: string): boolean {
  const name = basename(file);
  return (
    ROUTE_EXTENSIONS.has(extname(name)) &&
    !name.startsWith('_') &&
    !/\.d\.m?ts$/.test(name) &&
    !/\.(test|spec)\.m?[tj]s$/.test(name)
  );
}

/**
 * Imports every file under `routes/` (recursively) and returns their `default` exports.
 * Files and folders starting with `_` are skipped, which is handy for helpers or disabling a route.
 */
export async function loadRoutes(dir: string = DEFAULT_ROUTES_DIR): Promise<AnyRoute[]> {
  const entries = await readdir(dir, { recursive: true, withFileTypes: true });
  const files = entries
    .filter((e) => e.isFile())
    .map((e) => join(e.parentPath, e.name))
    .filter((file) => isRouteFile(file) && !relative(dir, file).split(/[\\/]/).some((p) => p.startsWith('_')))
    .sort();

  const routes: AnyRoute[] = [];
  const seen = new Map<string, string>();

  for (const file of files) {
    const rel = relative(dir, file);
    const mod: { default?: unknown } = await import(pathToFileURL(file).href);

    if (!isRoute(mod.default)) {
      throw new Error(`routes/${rel}: the "export default" must be the result of defineRoute(...).`);
    }
    const route = mod.default;
    const previous = seen.get(route.name);
    if (previous) {
      throw new Error(`Duplicate route "${route.name}" in routes/${previous} and routes/${rel}.`);
    }
    seen.set(route.name, rel);
    routes.push(route);
  }
  return routes;
}
