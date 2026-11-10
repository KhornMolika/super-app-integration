/**
 * Reads just enough of a compiled JVM .class file to tell which interfaces it
 * implements and whether it has a static INSTANCE field (a Kotlin `object`).
 * No class loading or execution: the bytes are only parsed.
 *
 * Layout (JVM spec 4.1): magic, versions, constant pool, access flags,
 * this_class, super_class, interfaces[], fields[] ...
 */
export interface JavaClassHeader {
  /** Binary name with dots, e.g. com.vendor.spa.SpaBookingSdk */
  className: string;
  /** Binary names with dots */
  interfaces: string[];
  /** Has `public static final <this type> INSTANCE` (Kotlin object). */
  hasStaticInstance: boolean;
}

const ACC_STATIC = 0x0008;

export function readJavaClassHeader(buf: Buffer): JavaClassHeader | null {
  try {
    if (buf.length < 10 || buf.readUInt32BE(0) !== 0xcafebabe) return null;
    let p = 8;
    const count = buf.readUInt16BE(p);
    p += 2;
    // index -> utf8 text, or class -> name index
    const utf8: (string | undefined)[] = [];
    const classNameIdx: (number | undefined)[] = [];
    for (let i = 1; i < count; i++) {
      const tag = buf.readUInt8(p);
      p += 1;
      switch (tag) {
        case 1: {
          // Utf8 (modified UTF-8; fine for identifiers)
          const len = buf.readUInt16BE(p);
          utf8[i] = buf.toString('utf8', p + 2, p + 2 + len);
          p += 2 + len;
          break;
        }
        case 7: // Class
          classNameIdx[i] = buf.readUInt16BE(p);
          p += 2;
          break;
        case 8: // String
        case 16: // MethodType
        case 19: // Module
        case 20: // Package
          p += 2;
          break;
        case 15: // MethodHandle
          p += 3;
          break;
        case 3: // Integer
        case 4: // Float
        case 9: // Fieldref
        case 10: // Methodref
        case 11: // InterfaceMethodref
        case 12: // NameAndType
        case 17: // Dynamic
        case 18: // InvokeDynamic
          p += 4;
          break;
        case 5: // Long
        case 6: // Double (take two slots)
          p += 8;
          i++;
          break;
        default:
          return null;
      }
    }
    const nameOf = (classIdx: number) => {
      const n = classNameIdx[classIdx];
      const s = n !== undefined ? utf8[n] : undefined;
      return s ? s.replace(/\//g, '.') : undefined;
    };

    p += 2; // access flags
    const thisClass = nameOf(buf.readUInt16BE(p));
    p += 4; // this_class + super_class
    const ifaceCount = buf.readUInt16BE(p);
    p += 2;
    const interfaces: string[] = [];
    for (let i = 0; i < ifaceCount; i++) {
      const n = nameOf(buf.readUInt16BE(p));
      if (n) interfaces.push(n);
      p += 2;
    }

    let hasStaticInstance = false;
    const fieldCount = buf.readUInt16BE(p);
    p += 2;
    for (let i = 0; i < fieldCount; i++) {
      const flags = buf.readUInt16BE(p);
      const name = utf8[buf.readUInt16BE(p + 2)];
      const attrCount = buf.readUInt16BE(p + 6);
      p += 8;
      for (let a = 0; a < attrCount; a++) {
        const len = buf.readUInt32BE(p + 2);
        p += 6 + len;
      }
      if (name === 'INSTANCE' && (flags & ACC_STATIC) !== 0) {
        hasStaticInstance = true;
      }
    }

    if (!thisClass) return null;
    return { className: thisClass, interfaces, hasStaticInstance };
  } catch {
    return null;
  }
}

/** The host contract every Android native mini app SDK implements. */
export const ANDROID_ENTRY_INTERFACE =
  'com.fsasuperapp.miniapp.native_sdk.FSAMiniAppNativeEntry';
/** The host contract every iOS native mini app SDK conforms to. */
export const IOS_ENTRY_PROTOCOL = 'FSAMiniAppNativeProtocol';

/** Types in Swift interface text that conform to the iOS contract. */
export function findSwiftEntryTypes(swiftInterface: string): string[] {
  const out = new Set<string>();
  const re = new RegExp(
    // Only classes (and their extensions) can conform to the @objc contract;
    // names may be module-qualified (Spa.SpaBooking)
    String.raw`\b(?:class|extension)\s+([A-Za-z_][A-Za-z0-9_.]*)[^{\n]*?:\s*[^{\n]*\b` +
      IOS_ENTRY_PROTOCOL +
      String.raw`\b`,
    'g',
  );
  let m: RegExpExecArray | null;
  while ((m = re.exec(swiftInterface))) out.add(m[1].split('.').pop()!);
  return [...out];
}
