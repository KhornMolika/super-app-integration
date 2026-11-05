import { posix } from 'path';
import { HomeWidget } from '../home-widget';

/** Upper bound on files fetched from a Git repo for one verification. */
const MAX_GIT_FETCHES = 50;

const EXPORT_RE = /\bexport\s+(['"])([^'"\n]+)\1/g;

/**
 * Collects the Dart sources reachable from `lib/<pkg>.dart` of a Git package:
 * the main library, then every relative `export '...';` target, transitively
 * (each resolved against the exporting file; `package:` / `dart:` URIs skipped).
 * Cycle-safe and capped at MAX_GIT_FETCHES fetch attempts. A failing fetch just
 * skips that file. Keys are package-root-relative (`lib/src/x.dart`), whatever
 * `packagePath` (the package's folder inside the repo) is.
 */
export async function gitDartFiles(
  fetch: (path: string) => Promise<string>,
  packageName: string,
  packagePath?: string,
): Promise<Record<string, string>> {
  const base = (packagePath ?? '').replace(/^\/+|\/+$/g, '');
  const files: Record<string, string> = {};
  const seen = new Set<string>();
  const queue = [`lib/${packageName}.dart`];
  let fetched = 0;

  while (queue.length && fetched < MAX_GIT_FETCHES) {
    const rel = queue.shift()!;
    if (seen.has(rel)) continue;
    seen.add(rel);
    fetched++;

    let text: string;
    try {
      text = await fetch(base ? `${base}/${rel}` : rel);
    } catch {
      continue;
    }
    if (typeof text !== 'string') continue;
    files[rel] = text;

    for (const m of text.matchAll(EXPORT_RE)) {
      const uri = m[2];
      if (/^[a-z][a-z0-9+.-]*:/i.test(uri)) continue; // package:, dart:, ...
      const target = posix.normalize(posix.join(posix.dirname(rel), uri));
      if (target.startsWith('..') || posix.isAbsolute(target)) continue;
      if (!seen.has(target)) queue.push(target);
    }
  }
  return files;
}

/** Copy of `widget` marked verified (`verifiedClass = widgetClass`) or not. */
export function withVerification(
  widget: HomeWidget | null | undefined,
  verified: boolean,
): HomeWidget | null | undefined {
  if (!widget) return widget;
  const { verifiedClass: _old, ...rest } = widget;
  return verified && widget.widgetClass
    ? { ...rest, verifiedClass: widget.widgetClass }
    : rest;
}
