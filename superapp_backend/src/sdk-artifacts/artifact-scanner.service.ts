import { Injectable, Logger } from '@nestjs/common';
import AdmZip from 'adm-zip';
import { NativeSdkConfigDto } from '../miniapps/dto/create-miniapp.dto';

const MAX_ENTRY_BYTES = 2 * 1024 * 1024;

/**
 * Extracts native SDK metadata (module/package names) from uploaded vendor
 * artifacts (.xcframework.zip / .aar). Results are hints used to pre-fill
 * the integration config; callers must still validate them.
 */
export interface ScannedNativeSdkResult extends Partial<NativeSdkConfigDto> {
  detectedPermissions?: string[];
  minSdkVersion?: number;
  targetSdkVersion?: number;
  minIosVersion?: string;
}

@Injectable()
export class ArtifactScannerService {
  private readonly logger = new Logger(ArtifactScannerService.name);

  async scanXcframework(
    buffer: Buffer,
    filename: string,
  ): Promise<ScannedNativeSdkResult> {
    const result: ScannedNativeSdkResult = {
      iosArtifactFilename: filename,
    };

    let entries: AdmZip.IZipEntry[];
    try {
      entries = new AdmZip(buffer).getEntries();
    } catch (err) {
      this.logger.warn(`Cannot open xcframework zip ${filename}: ${err}`);
      return result;
    }

    const plists = entries.filter(
      (e) =>
        !e.isDirectory &&
        !e.entryName.startsWith('__MACOSX/') &&
        /\.xcframework\/.*Info\.plist$/.test(e.entryName),
    );
    // Prefer Info.plist inside a framework slice, else the top-level one.
    const plist =
      plists.find((e) =>
        /\.framework\/(?:Versions\/[^/]+\/Resources\/)?Info\.plist$/.test(
          e.entryName,
        ),
      ) ?? plists.find((e) => /\.xcframework\/Info\.plist$/.test(e.entryName));
    if (!plist) return result;

    const data = this.readEntry(plist, filename);
    if (!data) return result;
    let values: Record<string, string>;
    try {
      values = this.parsePlist(data);
    } catch (err) {
      this.logger.warn(`Cannot parse Info.plist in ${filename}: ${err}`);
      return result;
    }
    const name = values.CFBundleName;
    if (name) {
      result.iosModuleName = name;
      result.iosTypeName = values.CFBundleExecutable || `${name}View`;
    } else if (values.CFBundleExecutable) {
      result.iosTypeName = values.CFBundleExecutable;
    }

    // Detect iOS privacy permissions
    const detected = new Set<string>();
    if (values.NSCameraUsageDescription) detected.add('camera');
    if (
      values.NSLocationWhenInUseUsageDescription ||
      values.NSLocationAlwaysUsageDescription ||
      values.NSLocationAlwaysAndWhenInUseUsageDescription
    ) {
      detected.add('location');
    }
    if (
      values.NSPhotoLibraryUsageDescription ||
      values.NSPhotoLibraryAddUsageDescription
    ) {
      detected.add('storage');
    }
    if (values.NSMicrophoneUsageDescription) detected.add('microphone');
    if (values.NSFaceIDUsageDescription) detected.add('biometrics');
    if (detected.size > 0) {
      result.detectedPermissions = Array.from(detected);
    }

    if (values.MinimumOSVersion) {
      result.minIosVersion = values.MinimumOSVersion;
    }

    return result;
  }

  async scanAar(
    buffer: Buffer,
    filename: string,
  ): Promise<ScannedNativeSdkResult> {
    const result: ScannedNativeSdkResult = {
      androidArtifactFilename: filename,
    };

    const m = /^(.+?)-(\d[\w.+-]*)\.aar$/i.exec(filename);
    if (m) {
      result.androidMavenArtifactId = m[1];
      result.androidMavenVersion = m[2];
    }

    let zip: AdmZip;
    try {
      zip = new AdmZip(buffer);
    } catch (err) {
      this.logger.warn(`Cannot open aar ${filename}: ${err}`);
      return result;
    }

    let pkg: string | undefined;
    const detected = new Set<string>();
    const manifest = zip.getEntry('AndroidManifest.xml');
    if (manifest) {
      try {
        const data = this.readEntry(manifest, filename);
        if (data) {
          pkg = this.extractPackage(data);
          const manifestStr = data.toString('utf8');
          if (/android\.permission\.CAMERA/i.test(manifestStr)) detected.add('camera');
          if (/android\.permission\.ACCESS_(FINE|COARSE)_LOCATION/i.test(manifestStr)) detected.add('location');
          if (/android\.permission\.(READ|WRITE)_EXTERNAL_STORAGE|READ_MEDIA/i.test(manifestStr)) detected.add('storage');
          if (/android\.permission\.RECORD_AUDIO/i.test(manifestStr)) detected.add('microphone');
          if (/android\.permission\.(USE_BIOMETRIC|USE_FINGERPRINT)/i.test(manifestStr)) detected.add('biometrics');

          const minSdkMatch = manifestStr.match(/minSdkVersion\s*=\s*["']?(\d+)["']?/i);
          if (minSdkMatch) {
            result.minSdkVersion = parseInt(minSdkMatch[1], 10);
          }
        }
      } catch (err) {
        this.logger.warn(
          `Cannot parse AndroidManifest.xml in ${filename}: ${err}`,
        );
      }
    }
    if (detected.size > 0) {
      result.detectedPermissions = Array.from(detected);
    }
    if (!pkg) {
      const mf = zip.getEntry('META-INF/MANIFEST.MF');
      if (mf) {
        const data = this.readEntry(mf, filename);
        if (data) {
          pkg =
            /^(?:Package|Bundle-SymbolicName|Automatic-Module-Name):\s*(\S+)/im.exec(
              data.toString('utf8'),
            )?.[1];
        }
      }
    }

    if (pkg) {
      result.androidPackageName = pkg;
      const last = pkg.split('.').filter(Boolean).pop();
      if (last) {
        result.androidObjectName = last
          .split(/[_\-\s]+/)
          .filter(Boolean)
          .map((s) => s.charAt(0).toUpperCase() + s.slice(1))
          .join('');
      }
    }
    return result;
  }

  /** Reads an entry, refusing oversized (zip bomb) or corrupt entries. */
  private readEntry(entry: AdmZip.IZipEntry, filename: string): Buffer | null {
    try {
      if (entry.header.size > MAX_ENTRY_BYTES) {
        this.logger.warn(
          `Skipping ${entry.entryName} in ${filename}: ${entry.header.size} bytes exceeds limit`,
        );
        return null;
      }
      return entry.getData();
    } catch (err) {
      this.logger.warn(`Cannot read ${entry.entryName} in ${filename}: ${err}`);
      return null;
    }
  }

  private parsePlist(data: Buffer): Record<string, string> {
    if (data.subarray(0, 8).toString('latin1') === 'bplist00') {
      return this.parseBplist(data);
    }
    const xml = data.toString('utf8');
    const decode = (v: string) =>
      v
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/&quot;/g, '"')
        .replace(/&apos;/g, "'")
        .replace(/&amp;/g, '&');
    const out: Record<string, string> = {};
    const re = /<key>([^<]*)<\/key>\s*<string>([^<]*)<\/string>/g;
    let m: RegExpExecArray | null;
    while ((m = re.exec(xml))) {
      const k = decode(m[1]);
      if (!(k in out)) out[k] = decode(m[2]).trim();
    }
    return out;
  }

  /** Minimal bplist00 reader: top-level dict, string/int values only. */
  private parseBplist(buf: Buffer): Record<string, string> {
    const t = buf.length - 32;
    if (t < 8) throw new Error('bplist too short');
    const offSize = buf[t + 6];
    const refSize = buf[t + 7];
    const numObjects = Number(buf.readBigUInt64BE(t + 8));
    const top = Number(buf.readBigUInt64BE(t + 16));
    const tableOff = Number(buf.readBigUInt64BE(t + 24));
    const uint = (pos: number, size: number) => {
      if (pos + size > buf.length) throw new Error('bplist out of range');
      let v = 0;
      for (let i = 0; i < size; i++) v = v * 256 + buf[pos + i];
      return v;
    };
    const objOffset = (i: number) => {
      if (i >= numObjects) throw new Error('bplist bad ref');
      return uint(tableOff + i * offSize, offSize);
    };
    // Returns [length, dataStart] for a marker at pos.
    const lenAt = (pos: number): [number, number] => {
      const n = buf[pos] & 0x0f;
      if (n !== 0x0f) return [n, pos + 1];
      const sz = 1 << (buf[pos + 1] & 0x0f);
      return [uint(pos + 2, sz), pos + 2 + sz];
    };
    const str = (i: number): string | undefined => {
      const pos = objOffset(i);
      const type = buf[pos] >> 4;
      if (type === 0x5) {
        const [n, s] = lenAt(pos);
        return buf.toString('latin1', s, s + n);
      }
      if (type === 0x6) {
        const [n, s] = lenAt(pos);
        return Buffer.from(buf.subarray(s, s + n * 2))
          .swap16()
          .toString('utf16le');
      }
      if (type === 0x1) {
        return String(uint(pos + 1, 1 << (buf[pos] & 0x0f)));
      }
      return undefined;
    };
    const dictPos = objOffset(top);
    if (buf[dictPos] >> 4 !== 0xd) throw new Error('bplist top is not a dict');
    const [count, start] = lenAt(dictPos);
    const out: Record<string, string> = {};
    for (let i = 0; i < count; i++) {
      const k = str(uint(start + i * refSize, refSize));
      const v = str(uint(start + (count + i) * refSize, refSize));
      if (k !== undefined && v !== undefined && !(k in out)) out[k] = v.trim();
    }
    return out;
  }

  private extractPackage(data: Buffer): string | undefined {
    // Plain-text XML
    if (data.length >= 2 && !(data.readUInt16LE(0) === 0x0003)) {
      const text = data.toString('utf8');
      return /<manifest[^>]*?\spackage\s*=\s*["']([^"']+)["']/s.exec(text)?.[1];
    }
    return this.extractPackageFromAxml(data);
  }

  /** Minimal binary AXML reader: finds the `package` attr on <manifest>. */
  private extractPackageFromAxml(buf: Buffer): string | undefined {
    const total = Math.min(buf.readUInt32LE(4), buf.length);
    let strings: string[] = [];
    let off = buf.readUInt16LE(2); // file header size (8)
    while (off + 8 <= total) {
      const type = buf.readUInt16LE(off);
      const headerSize = buf.readUInt16LE(off + 2);
      const size = buf.readUInt32LE(off + 4);
      if (size < 8) break;
      if (type === 0x0001) {
        strings = this.readStringPool(buf, off);
      } else if (type === 0x0102) {
        const nameIdx = buf.readUInt32LE(off + 20);
        if (strings[nameIdx] === 'manifest') {
          const attrStart = buf.readUInt16LE(off + 24);
          const attrSize = buf.readUInt16LE(off + 26) || 20;
          const attrCount = buf.readUInt16LE(off + 28);
          for (let i = 0; i < attrCount; i++) {
            const a = off + 16 + attrStart + i * attrSize;
            if (strings[buf.readUInt32LE(a + 4)] === 'package') {
              const raw = buf.readUInt32LE(a + 8);
              if (raw !== 0xffffffff) return strings[raw];
              return strings[buf.readUInt32LE(a + 16)];
            }
          }
        }
        return undefined; // only the root element matters
      }
      off += size || headerSize;
    }
    return undefined;
  }

  private readStringPool(buf: Buffer, off: number): string[] {
    const count = buf.readUInt32LE(off + 8);
    const flags = buf.readUInt32LE(off + 16);
    const stringsStart = buf.readUInt32LE(off + 20);
    const headerSize = buf.readUInt16LE(off + 2);
    const utf8 = (flags & 0x100) !== 0;
    const out: string[] = [];
    for (let i = 0; i < count; i++) {
      let p = off + stringsStart + buf.readUInt32LE(off + headerSize + i * 4);
      if (utf8) {
        const b = buf[p++];
        if (b & 0x80) p++; // char length (2 bytes)
        let len = buf[p++];
        if (len & 0x80) len = ((len & 0x7f) << 8) | buf[p++];
        out.push(buf.toString('utf8', p, p + len));
      } else {
        let len = buf.readUInt16LE(p);
        p += 2;
        if (len & 0x8000) {
          len = ((len & 0x7fff) << 16) | buf.readUInt16LE(p);
          p += 2;
        }
        out.push(buf.toString('utf16le', p, p + len * 2));
      }
    }
    return out;
  }
}
