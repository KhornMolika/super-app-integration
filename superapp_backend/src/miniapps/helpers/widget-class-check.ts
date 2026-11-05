import AdmZip from 'adm-zip';
import { posix } from 'path';

/** Minimal zip-entry shape so callers can reuse entries they already read. */
export interface DartArchiveEntry {
  entryName: string;
  getData(): Buffer;
}

/** Files larger than this are not analysed (untrusted upload, sync path). */
const MAX_DART_FILE_CHARS = 1_000_000;

const CLASS_MODIFIERS = new Set([
  'abstract',
  'sealed',
  'base',
  'final',
  'interface',
  'mixin',
]);

/**
 * Single linear pass that drops comments (including Dart's nested block
 * comments) and ignores comment markers inside string literals (single,
 * double, triple-quoted and raw r'..'). String literals are kept verbatim when
 * `keepStrings` is set (needed to read export URIs) and emptied otherwise.
 */
function scan(src: string, keepStrings: boolean): string {
  const out: string[] = [];
  const n = src.length;
  let i = 0;
  let runStart = 0;
  const flush = (end: number) => {
    if (end > runStart) out.push(src.slice(runStart, end));
  };
  while (i < n) {
    const c = src[i];
    if (c === '/' && src[i + 1] === '/') {
      flush(i);
      while (i < n && src[i] !== '\n') i++;
      runStart = i; // keep the newline
      continue;
    }
    if (c === '/' && src[i + 1] === '*') {
      flush(i);
      let depth = 1;
      i += 2;
      while (i < n && depth > 0) {
        if (src[i] === '/' && src[i + 1] === '*') {
          depth++;
          i += 2;
        } else if (src[i] === '*' && src[i + 1] === '/') {
          depth--;
          i += 2;
        } else {
          i++;
        }
      }
      out.push(' ');
      runStart = i;
      continue;
    }
    if (c === "'" || c === '"') {
      const raw =
        i > 0 && src[i - 1] === 'r' && !(i > 1 && /\w/.test(src[i - 2]));
      const triple = src[i + 1] === c && src[i + 2] === c;
      flush(i);
      let j = i + (triple ? 3 : 1);
      if (triple) {
        while (
          j < n &&
          !(src[j] === c && src[j + 1] === c && src[j + 2] === c)
        ) {
          if (!raw && src[j] === '\\') j++;
          j++;
        }
        j += 3;
      } else {
        while (j < n && src[j] !== c && src[j] !== '\n') {
          if (!raw && src[j] === '\\') j++;
          j++;
        }
        if (j < n && src[j] === c) j++;
      }
      j = Math.min(n, j);
      out.push(keepStrings ? src.slice(i, j) : `${c}${c}`);
      i = j;
      runStart = j;
      continue;
    }
    i++;
  }
  flush(n);
  return out.join('');
}

/** Index of the first element >= target in a sorted array (length if none). */
function lowerBound(sorted: number[], target: number): number {
  let lo = 0;
  let hi = sorted.length;
  while (lo < hi) {
    const mid = (lo + hi) >> 1;
    if (sorted[mid] < target) lo = mid + 1;
    else hi = mid;
  }
  return lo;
}

/**
 * Public, non-abstract, non-sealed classes in one source file whose own
 * brace-balanced body mentions the identifier `onOpen`. Linear in file size.
 */
function candidatesInSource(raw: string): Set<string> {
  const found = new Set<string>();
  const src = scan(raw, false);
  const n = src.length;

  const onOpenAt: number[] = [];
  for (const m of src.matchAll(/\bonOpen\b/g)) onOpenAt.push(m.index!);
  if (onOpenAt.length === 0) return found;

  // matching close brace for every open brace, one stack pass
  const close = new Int32Array(n).fill(-1);
  const stack: number[] = [];
  for (let i = 0; i < n; i++) {
    const c = src.charCodeAt(i);
    if (c === 123) stack.push(i);
    else if (c === 125 && stack.length) close[stack.pop()!] = i;
  }
  // nextStop[i] = first '{' or ';' at or after i (n if none)
  const nextStop = new Int32Array(n + 1);
  nextStop[n] = n;
  for (let i = n - 1; i >= 0; i--) {
    const c = src.charCodeAt(i);
    nextStop[i] = c === 123 || c === 59 ? i : nextStop[i + 1];
  }

  for (const m of src.matchAll(/\bclass\s+([A-Za-z_]\w*)/g)) {
    const name = m[1];
    if (!/^[A-Z][A-Za-z0-9_]*$/.test(name)) continue;

    // read modifier words backwards: `abstract class`, `final class`, ...
    let skip = false;
    let p = m.index!;
    for (;;) {
      let e = p;
      while (e > 0 && /\s/.test(src[e - 1])) e--;
      let b = e;
      while (b > 0 && /\w/.test(src[b - 1])) b--;
      if (!CLASS_MODIFIERS.has(src.slice(b, e))) break;
      if (src.slice(b, e) === 'abstract' || src.slice(b, e) === 'sealed') {
        skip = true;
      }
      p = b;
    }
    if (skip) continue;

    const open = nextStop[m.index! + m[0].length];
    if (open >= n || src[open] !== '{') continue; // `class A = B with C;`
    const end = close[open] === -1 ? n : close[open];
    const k = lowerBound(onOpenAt, open + 1);
    if (k < onOpenAt.length && onOpenAt[k] < end) found.add(name);
  }
  return found;
}

function isAnalysable(path: string, text: string): boolean {
  return (
    path.startsWith('lib/') &&
    path.endsWith('.dart') &&
    text.length <= MAX_DART_FILE_CHARS
  );
}

/**
 * Public, non-abstract classes declared under lib/**\/*.dart whose own class
 * body mentions `onOpen` (the Home widget constructor contract). Keys are
 * package-root-relative paths. Returns sorted unique names.
 */
export function findWidgetCandidates(files: Record<string, string>): string[] {
  const found = new Set<string>();
  for (const [path, text] of Object.entries(files)) {
    if (!isAnalysable(path, text)) continue;
    for (const name of candidatesInSource(text)) found.add(name);
  }
  return [...found].sort();
}

interface ExportEdge {
  target: string;
  show?: Set<string>;
  hide?: Set<string>;
}

/** Relative `export '<path>' [show|hide ...];` directives of one file. */
function exportEdges(
  path: string,
  text: string,
  files: Record<string, string>,
): ExportEdge[] {
  const edges: ExportEdge[] = [];
  for (const stmt of scan(text, true).split(';')) {
    const m = /^\s*export\s+(['"])([^'"\n]*)\1([\s\S]*)$/.exec(stmt);
    if (!m) continue;
    const uri = m[2];
    if (/^[a-z][a-z0-9+.-]*:/i.test(uri)) continue; // package:, dart:, ...
    const target = posix.normalize(posix.join(posix.dirname(path), uri));
    if (
      target.startsWith('..') ||
      !Object.prototype.hasOwnProperty.call(files, target)
    ) {
      continue;
    }
    const edge: ExportEdge = { target };
    let mode: 'show' | 'hide' | null = null;
    for (const tok of m[3].split(/[\s,]+/)) {
      if (tok === 'show') {
        mode = 'show';
        edge.show ??= new Set();
      } else if (tok === 'hide') {
        mode = 'hide';
        edge.hide ??= new Set();
      } else if (tok && mode) {
        (mode === 'show' ? edge.show! : edge.hide!).add(tok);
      }
    }
    edges.push(edge);
  }
  return edges;
}

/**
 * True only when `widgetClass` is a candidate declared in `lib/<pkg>.dart` or
 * re-exported from it through (transitive) relative `export` directives,
 * honouring `show` / `hide` combinators.
 */
export function hasWidgetClass(
  files: Record<string, string>,
  packageName: string,
  widgetClass: string,
): boolean {
  const main = `lib/${packageName}.dart`;
  if (!Object.prototype.hasOwnProperty.call(files, main)) return false;

  // Visited-set DFS for this one name: O(files + edges), cycle-safe. An edge
  // is followed only if its show/hide combinators let `widgetClass` through.
  const visited = new Set<string>();
  const stack = [main];
  while (stack.length) {
    const path = stack.pop()!;
    if (visited.has(path)) continue;
    visited.add(path);
    const text = files[path];
    if (!isAnalysable(path, text)) continue;
    if (text.includes(widgetClass) && candidatesInSource(text).has(widgetClass)) {
      return true;
    }
    for (const e of exportEdges(path, text, files)) {
      if (e.show && !e.show.has(widgetClass)) continue;
      if (e.hide?.has(widgetClass)) continue;
      stack.push(e.target);
    }
  }
  return false;
}

/**
 * Builds the `lib/**.dart` source map (package-root-relative keys) from zip
 * entries. Strips one wrapper folder when every entry shares a top folder that
 * contains pubspec.yaml; ignores example/.
 */
export function dartFilesFromEntries(
  entries: DartArchiveEntry[],
): Record<string, string> {
  const named = entries
    .map((e) => ({ e, name: e.entryName.replace(/\\/g, '/') }))
    .filter(
      ({ name }) =>
        name && !name.endsWith('/') && !name.startsWith('__MACOSX/'),
    );

  let prefix = '';
  const top = named[0]?.name.split('/')[0];
  if (
    top &&
    named.every(({ name }) => name.startsWith(`${top}/`)) &&
    named.some(({ name }) => name === `${top}/pubspec.yaml`)
  ) {
    prefix = `${top}/`;
  }

  const out: Record<string, string> = {};
  for (const { e, name } of named) {
    const rel = name.slice(prefix.length);
    if (!rel.startsWith('lib/') || !rel.endsWith('.dart')) continue;
    out[rel] = e.getData().toString('utf8');
  }
  return out;
}

export function dartFilesFromZip(buf: Buffer): Record<string, string> {
  try {
    return dartFilesFromEntries(new AdmZip(buf).getEntries());
  } catch {
    return {};
  }
}
