import { gunzipSync } from 'zlib';

/**
 * Regular files of a .tar.gz archive, by their path inside it ("./" removed).
 * Supports ustar, GNU long names and PAX paths; links and anything that would
 * leave the archive root (.., absolute paths) are skipped.
 */
export function readTarGz(archive: Buffer, maxBytes = 300 * 1024 * 1024): Map<string, Buffer> {
  const tar = gunzipSync(archive, { maxOutputLength: maxBytes });
  const files = new Map<string, Buffer>();
  const text = (b: Buffer) => b.toString('utf8').replace(/\0[\s\S]*$/, '');
  let off = 0;
  let longName: string | null = null;
  let paxPath: string | null = null;

  while (off + 512 <= tar.length) {
    const header = tar.subarray(off, off + 512);
    if (header.every((b) => b === 0)) break;
    const size = parseInt(text(header.subarray(124, 136)).trim() || '0', 8);
    if (!Number.isFinite(size) || size < 0) throw new Error('corrupt tar header');
    const type = header[156] === 0 ? '0' : String.fromCharCode(header[156]);
    const dataStart = off + 512;
    if (dataStart + size > tar.length) throw new Error('truncated tar archive');
    const data = tar.subarray(dataStart, dataStart + size);
    off = dataStart + Math.ceil(size / 512) * 512;

    if (type === 'L') {
      longName = text(data);
      continue;
    }
    if (type === 'x') {
      const m = data.toString('utf8').match(/(?:^|\n)\d+ path=([^\n]*)\n/);
      paxPath = m ? m[1] : null;
      continue;
    }
    if (type === 'g') continue;

    const prefix = text(header.subarray(345, 500));
    const plain = text(header.subarray(0, 100));
    const name = paxPath ?? longName ?? (prefix ? `${prefix}/${plain}` : plain);
    longName = paxPath = null;
    if (type !== '0' && type !== '7') continue; // regular files only

    const clean = cleanArchivePath(name);
    if (clean) files.set(clean, Buffer.from(data));
  }
  return files;
}

/** "a/b.js" for "./a/b.js"; null for paths outside the archive root. */
export function cleanArchivePath(name: string): string | null {
  if (!name || name.includes('\\') || name.startsWith('/')) return null;
  const parts = name.split('/').filter((p) => p !== '' && p !== '.');
  if (!parts.length || parts.includes('..')) return null;
  return parts.join('/');
}
