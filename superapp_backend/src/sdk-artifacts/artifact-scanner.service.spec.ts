import AdmZip from 'adm-zip';
import { ArtifactScannerService } from './artifact-scanner.service';

const plist = (kv: Record<string, string>) =>
  `<?xml version="1.0"?><plist version="1.0"><dict>${Object.entries(kv)
    .map(([k, v]) => `<key>${k}</key><string>${v}</string>`)
    .join('')}</dict></plist>`;

const zipOf = (files: Record<string, string | Buffer>) => {
  const z = new AdmZip();
  for (const [n, c] of Object.entries(files)) z.addFile(n, Buffer.from(c));
  return z.toBuffer();
};

/** Builds a minimal UTF-16 binary AXML with <manifest package="..."> root. */
function buildAxml(pkg: string): Buffer {
  const strs = ['package', 'manifest', pkg];
  const enc = strs.map((s) => {
    const b = Buffer.alloc(2 + s.length * 2 + 2);
    b.writeUInt16LE(s.length, 0);
    b.write(s, 2, 'utf16le');
    return b;
  });
  const offsets: number[] = [];
  let o = 0;
  for (const e of enc) {
    offsets.push(o);
    o += e.length;
  }
  const strData = Buffer.concat(enc);
  const poolHeader = 28;
  const poolSize = poolHeader + strs.length * 4 + strData.length;
  const pool = Buffer.alloc(poolSize);
  pool.writeUInt16LE(0x0001, 0);
  pool.writeUInt16LE(poolHeader, 2);
  pool.writeUInt32LE(poolSize, 4);
  pool.writeUInt32LE(strs.length, 8);
  pool.writeUInt32LE(0, 12);
  pool.writeUInt32LE(0, 16);
  pool.writeUInt32LE(poolHeader + strs.length * 4, 20);
  pool.writeUInt32LE(0, 24);
  offsets.forEach((v, i) => pool.writeUInt32LE(v, poolHeader + i * 4));
  strData.copy(pool, poolHeader + strs.length * 4);

  const el = Buffer.alloc(36 + 20);
  el.writeUInt16LE(0x0102, 0);
  el.writeUInt16LE(16, 2);
  el.writeUInt32LE(el.length, 4);
  el.writeUInt32LE(0xffffffff, 16); // ns
  el.writeUInt32LE(1, 20); // name = manifest
  el.writeUInt16LE(20, 24); // attrStart
  el.writeUInt16LE(20, 26); // attrSize
  el.writeUInt16LE(1, 28); // attrCount
  const a = 36;
  el.writeUInt32LE(0xffffffff, a); // ns
  el.writeUInt32LE(0, a + 4); // name = package
  el.writeUInt32LE(2, a + 8); // rawValue
  el.writeUInt16LE(8, a + 12);
  el.writeUInt8(3, a + 15); // string type
  el.writeUInt32LE(2, a + 16);

  const header = Buffer.alloc(8);
  header.writeUInt16LE(0x0003, 0);
  header.writeUInt16LE(8, 2);
  header.writeUInt32LE(8 + pool.length + el.length, 4);
  return Buffer.concat([header, pool, el]);
}

/** Builds a bplist00 with a top-level dict of string values (ASCII, one UTF-16). */
function buildBplist(kv: Record<string, string>): Buffer {
  const objs: Buffer[] = [];
  const add = (b: Buffer) => objs.push(b) - 1;
  const strObj = (v: string) => {
    const ascii = /^[\x00-\x7f]*$/.test(v);
    const type = ascii ? 0x50 : 0x60;
    const lenBytes =
      v.length < 15
        ? Buffer.from([type | v.length])
        : Buffer.from([type | 0x0f, 0x10, v.length]); // int8 length
    const body = ascii
      ? Buffer.from(v, 'latin1')
      : Buffer.from(v, 'utf16le').swap16();
    return Buffer.concat([lenBytes, body]);
  };
  add(Buffer.alloc(0)); // placeholder for dict (index 0)
  const keyRefs: number[] = [];
  const valRefs: number[] = [];
  for (const [k, v] of Object.entries(kv)) {
    keyRefs.push(add(strObj(k)));
    valRefs.push(add(strObj(v)));
  }
  objs[0] = Buffer.from([0xd0 | keyRefs.length, ...keyRefs, ...valRefs]);
  const header = Buffer.from('bplist00', 'latin1');
  const offsets: number[] = [];
  let pos = header.length;
  for (const o of objs) {
    offsets.push(pos);
    pos += o.length;
  }
  const trailer = Buffer.alloc(32);
  trailer[6] = 1;
  trailer[7] = 1;
  trailer.writeBigUInt64BE(BigInt(objs.length), 8);
  trailer.writeBigUInt64BE(0n, 16);
  trailer.writeBigUInt64BE(BigInt(pos), 24);
  return Buffer.concat([header, ...objs, Buffer.from(offsets), trailer]);
}

/** UTF-8 string pool variant of buildAxml. */
function buildAxmlUtf8(pkg: string): Buffer {
  const strs = ['package', 'manifest', pkg];
  const enc = strs.map((s) =>
    Buffer.concat([
      Buffer.from([s.length, s.length]),
      Buffer.from(s, 'utf8'),
      Buffer.from([0]),
    ]),
  );
  const offsets: number[] = [];
  let o = 0;
  for (const e of enc) {
    offsets.push(o);
    o += e.length;
  }
  const strData = Buffer.concat(enc);
  const poolSize = 28 + strs.length * 4 + strData.length;
  const pool = Buffer.alloc(poolSize);
  pool.writeUInt16LE(0x0001, 0);
  pool.writeUInt16LE(28, 2);
  pool.writeUInt32LE(poolSize, 4);
  pool.writeUInt32LE(strs.length, 8);
  pool.writeUInt32LE(0x100, 16);
  pool.writeUInt32LE(28 + strs.length * 4, 20);
  offsets.forEach((v, i) => pool.writeUInt32LE(v, 28 + i * 4));
  strData.copy(pool, 28 + strs.length * 4);
  const utf16 = buildAxml(pkg);
  const poolLen16 = utf16.readUInt32LE(8 + 4);
  const el = utf16.subarray(8 + poolLen16);
  const header = Buffer.from(utf16.subarray(0, 8));
  header.writeUInt32LE(8 + pool.length + el.length, 4);
  return Buffer.concat([header, pool, el]);
}

/** Corrupts the local header of a stored entry so getData() throws. */
function corruptEntry(zipBuf: Buffer, name: string): Buffer {
  const b = Buffer.from(zipBuf);
  const idx = b.indexOf(Buffer.from(name));
  // local header signature sits 30 bytes before the file name
  b.writeUInt32LE(0xdeadbeef, idx - 30);
  return b;
}

describe('ArtifactScannerService', () => {
  const svc = new ArtifactScannerService();

  describe('scanXcframework', () => {
    it('prefers framework-slice plist', async () => {
      const buf = zipOf({
        'SpaBookingSDK.xcframework/Info.plist': plist({
          CFBundleName: 'Wrong',
        }),
        'SpaBookingSDK.xcframework/ios-arm64/SpaBookingSDK.framework/Info.plist':
          plist({
            CFBundleName: 'SpaBookingSDK',
            CFBundleExecutable: 'SpaBookingSDKView',
          }),
      });
      await expect(
        svc.scanXcframework(buf, 'S.xcframework.zip'),
      ).resolves.toEqual({
        iosArtifactFilename: 'S.xcframework.zip',
        iosModuleName: 'SpaBookingSDK',
        iosTypeName: 'SpaBookingSDKView',
      });
    });

    it('falls back to top-level plist and Name+View', async () => {
      const buf = zipOf({
        'X.xcframework/Info.plist': plist({ CFBundleName: 'X' }),
      });
      const r = await svc.scanXcframework(buf, 'X.zip');
      expect(r.iosModuleName).toBe('X');
      expect(r.iosTypeName).toBe('XView');
    });

    it('parses binary plist (incl. UTF-16 value)', async () => {
      const buf = zipOf({
        'S.xcframework/ios-arm64/S.framework/Info.plist': buildBplist({
          CFBundleName: 'SpaBookingSDK',
          CFBundleExecutable: 'Spa\u00e9View',
        }),
      });
      const r = await svc.scanXcframework(buf, 'S.zip');
      expect(r.iosModuleName).toBe('SpaBookingSDK');
      expect(r.iosTypeName).toBe('Spa\u00e9View');
    });

    it('decodes XML entities', async () => {
      const buf = zipOf({
        'X.xcframework/Info.plist': plist({ CFBundleName: 'A&amp;B' }),
      });
      expect((await svc.scanXcframework(buf, 'x.zip')).iosModuleName).toBe(
        'A&B',
      );
    });

    it('survives corrupt plist entry', async () => {
      const buf = corruptEntry(
        zipOf({ 'X.xcframework/Info.plist': plist({ CFBundleName: 'X' }) }),
        'X.xcframework/Info.plist',
      );
      await expect(svc.scanXcframework(buf, 'x.zip')).resolves.toEqual({
        iosArtifactFilename: 'x.zip',
      });
    });

    it('skips oversize plist entry', async () => {
      const big = plist({ CFBundleName: 'X' }) + ' '.repeat(3 * 1024 * 1024);
      const buf = zipOf({ 'X.xcframework/Info.plist': big });
      await expect(svc.scanXcframework(buf, 'x.zip')).resolves.toEqual({
        iosArtifactFilename: 'x.zip',
      });
    });

    it('returns only filename when plist missing or zip invalid', async () => {
      await expect(
        svc.scanXcframework(zipOf({ 'a.txt': 'x' }), 'a.zip'),
      ).resolves.toEqual({ iosArtifactFilename: 'a.zip' });
      await expect(
        svc.scanXcframework(Buffer.from('not a zip'), 'b.zip'),
      ).resolves.toEqual({ iosArtifactFilename: 'b.zip' });
    });
  });

  describe('scanAar', () => {
    it('reads plain-text manifest and filename hints', async () => {
      const buf = zipOf({
        'AndroidManifest.xml':
          '<manifest xmlns:android="x" package="com.example.spabooking"></manifest>',
      });
      await expect(
        svc.scanAar(buf, 'spa-booking-sdk-1.0.0.aar'),
      ).resolves.toEqual({
        androidArtifactFilename: 'spa-booking-sdk-1.0.0.aar',
        androidMavenArtifactId: 'spa-booking-sdk',
        androidMavenVersion: '1.0.0',
        androidPackageName: 'com.example.spabooking',
        androidObjectName: 'Spabooking',
      });
    });

    it('parses binary AXML manifest', async () => {
      const buf = zipOf({
        'AndroidManifest.xml': buildAxml('com.fsa.spa_booking'),
      });
      const r = await svc.scanAar(buf, 'lib.aar');
      expect(r.androidPackageName).toBe('com.fsa.spa_booking');
      expect(r.androidObjectName).toBe('SpaBooking');
      expect(r.androidMavenArtifactId).toBeUndefined();
    });

    it('parses UTF-8 string pool AXML', async () => {
      const buf = zipOf({
        'AndroidManifest.xml': buildAxmlUtf8('com.acme.utf'),
      });
      expect((await svc.scanAar(buf, 'l.aar')).androidPackageName).toBe(
        'com.acme.utf',
      );
    });

    it('falls back to MANIFEST.MF when manifest lacks package', async () => {
      const buf = zipOf({
        'AndroidManifest.xml': '<manifest></manifest>',
        'META-INF/MANIFEST.MF': 'Automatic-Module-Name: com.acme.fb\n',
      });
      expect((await svc.scanAar(buf, 'l.aar')).androidPackageName).toBe(
        'com.acme.fb',
      );
    });

    it('survives corrupt manifest entries', async () => {
      const buf = corruptEntry(
        zipOf({ 'AndroidManifest.xml': '<manifest package="a.b"/>' }),
        'AndroidManifest.xml',
      );
      await expect(svc.scanAar(buf, 'q-1.0.aar')).resolves.toEqual({
        androidArtifactFilename: 'q-1.0.aar',
        androidMavenArtifactId: 'q',
        androidMavenVersion: '1.0',
      });
    });

    it('falls back to MANIFEST.MF', async () => {
      const buf = zipOf({
        'META-INF/MANIFEST.MF':
          'Manifest-Version: 1.0\nAutomatic-Module-Name: com.acme.pay\n',
      });
      const r = await svc.scanAar(buf, 'pay-2.1.aar');
      expect(r.androidPackageName).toBe('com.acme.pay');
      expect(r.androidObjectName).toBe('Pay');
      expect(r.androidMavenVersion).toBe('2.1');
    });

    it('degrades gracefully on invalid zip', async () => {
      await expect(svc.scanAar(Buffer.from('nope'), 'z.aar')).resolves.toEqual({
        androidArtifactFilename: 'z.aar',
      });
    });
  });
});
