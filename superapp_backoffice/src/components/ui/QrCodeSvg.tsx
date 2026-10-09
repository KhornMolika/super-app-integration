"use client";

import React, { useMemo } from 'react';

// Galois Field GF(256) constants and log/exp tables
const EXP_TABLE = new Uint8Array(512);
const LOG_TABLE = new Uint8Array(256);

(function initGaloisField() {
  let x = 1;
  for (let i = 0; i < 255; i++) {
    EXP_TABLE[i] = x;
    EXP_TABLE[i + 255] = x;
    LOG_TABLE[x] = i;
    x <<= 1;
    if (x & 0x100) {
      x ^= 0x11d; // Generator polynomial x^8 + x^4 + x^3 + x^2 + 1
    }
  }
})();

function gMul(a: number, b: number): number {
  if (a === 0 || b === 0) return 0;
  return EXP_TABLE[LOG_TABLE[a] + LOG_TABLE[b]];
}

function rsGeneratorPoly(numErrors: number): number[] {
  let poly = [1];
  for (let i = 0; i < numErrors; i++) {
    const next = [1, EXP_TABLE[i]];
    const res = new Array(poly.length + 1).fill(0);
    for (let j = 0; j < poly.length; j++) {
      for (let k = 0; k < next.length; k++) {
        res[j + k] ^= gMul(poly[j], next[k]);
      }
    }
    poly = res;
  }
  return poly;
}

function rsCalculateEcc(data: number[], numErrors: number): number[] {
  const genPoly = rsGeneratorPoly(numErrors);
  const buffer = new Array(data.length + numErrors).fill(0);
  for (let i = 0; i < data.length; i++) buffer[i] = data[i];

  for (let i = 0; i < data.length; i++) {
    const coef = buffer[i];
    if (coef !== 0) {
      for (let j = 0; j < genPoly.length; j++) {
        buffer[i + j] ^= gMul(genPoly[j], coef);
      }
    }
  }
  return buffer.slice(data.length);
}

// Capacity Table for QR (Level L and M)
// [totalDataCodewords, ecCodewords, blocks]
interface VersionInfo {
  version: number;
  totalCodewords: number;
  dataCodewords: number;
  ecCodewordsPerBlock: number;
  blocks: number;
  alignmentPatterns: number[];
}

const VERSIONS: VersionInfo[] = [
  { version: 1, totalCodewords: 26, dataCodewords: 19, ecCodewordsPerBlock: 7, blocks: 1, alignmentPatterns: [] },
  { version: 2, totalCodewords: 44, dataCodewords: 34, ecCodewordsPerBlock: 10, blocks: 1, alignmentPatterns: [6, 18] },
  { version: 3, totalCodewords: 70, dataCodewords: 55, ecCodewordsPerBlock: 15, blocks: 1, alignmentPatterns: [6, 22] },
  { version: 4, totalCodewords: 100, dataCodewords: 80, ecCodewordsPerBlock: 20, blocks: 1, alignmentPatterns: [6, 26] },
  { version: 5, totalCodewords: 134, dataCodewords: 108, ecCodewordsPerBlock: 26, blocks: 1, alignmentPatterns: [6, 30] },
  { version: 6, totalCodewords: 172, dataCodewords: 136, ecCodewordsPerBlock: 18, blocks: 2, alignmentPatterns: [6, 34] },
  { version: 7, totalCodewords: 196, dataCodewords: 156, ecCodewordsPerBlock: 20, blocks: 2, alignmentPatterns: [6, 22, 38] },
  { version: 8, totalCodewords: 242, dataCodewords: 194, ecCodewordsPerBlock: 24, blocks: 2, alignmentPatterns: [6, 24, 42] },
  { version: 9, totalCodewords: 292, dataCodewords: 232, ecCodewordsPerBlock: 30, blocks: 2, alignmentPatterns: [6, 26, 46] },
  { version: 10, totalCodewords: 346, dataCodewords: 274, ecCodewordsPerBlock: 18, blocks: 4, alignmentPatterns: [6, 28, 50] },
];

function chooseVersion(dataLen: number): VersionInfo {
  // Byte mode header: 4 bits mode + 8 or 16 bits count
  for (const v of VERSIONS) {
    const headerBits = v.version < 10 ? 4 + 8 : 4 + 16;
    const maxDataBytes = Math.floor((v.dataCodewords * 8 - headerBits) / 8);
    if (dataLen <= maxDataBytes) {
      return v;
    }
  }
  return VERSIONS[VERSIONS.length - 1];
}

class BitBuffer {
  private bits: number[] = [];

  put(num: number, length: number) {
    for (let i = length - 1; i >= 0; i--) {
      this.bits.push((num >> i) & 1);
    }
  }

  get length() {
    return this.bits.length;
  }

  getByte(index: number): number {
    let b = 0;
    const offset = index * 8;
    for (let i = 0; i < 8; i++) {
      b = (b << 1) | (this.bits[offset + i] || 0);
    }
    return b;
  }

  getBytes(): number[] {
    const bytes: number[] = [];
    const len = Math.ceil(this.bits.length / 8);
    for (let i = 0; i < len; i++) {
      bytes.push(this.getByte(i));
    }
    return bytes;
  }
}

function encodeData(text: string, versionInfo: VersionInfo): number[] {
  const utf8Bytes: number[] = [];
  for (let i = 0; i < text.length; i++) {
    const code = text.charCodeAt(i);
    if (code < 0x80) {
      utf8Bytes.push(code);
    } else if (code < 0x800) {
      utf8Bytes.push(0xc0 | (code >> 6), 0x80 | (code & 0x3f));
    } else {
      utf8Bytes.push(
        0xe0 | (code >> 12),
        0x80 | ((code >> 6) & 0x3f),
        0x80 | (code & 0x3f)
      );
    }
  }

  const bb = new BitBuffer();
  // Mode: 0100 for Byte Mode
  bb.put(0b0100, 4);
  // Count indicator
  const countBits = versionInfo.version < 10 ? 8 : 16;
  bb.put(utf8Bytes.length, countBits);

  // Data payload
  for (const b of utf8Bytes) {
    bb.put(b, 8);
  }

  // Terminator (up to 4 zeroes)
  const maxBits = versionInfo.dataCodewords * 8;
  const termLen = Math.min(4, maxBits - bb.length);
  if (termLen > 0) bb.put(0, termLen);

  // Byte align
  while (bb.length % 8 !== 0) {
    bb.put(0, 1);
  }

  // Pad bytes (0xEC, 0x11)
  const pad = [0xec, 0x11];
  let padIdx = 0;
  const currentBytes = bb.getBytes();
  while (currentBytes.length < versionInfo.dataCodewords) {
    currentBytes.push(pad[padIdx % 2]);
    padIdx++;
  }

  return currentBytes;
}

function generateMatrix(text: string): { matrix: boolean[][]; size: number } {
  const v = chooseVersion(new TextEncoder().encode(text).length);
  const size = v.version * 4 + 17;
  const matrix: (boolean | null)[][] = Array.from({ length: size }, () =>
    new Array(size).fill(null)
  );
  const isFunction: boolean[][] = Array.from({ length: size }, () =>
    new Array(size).fill(false)
  );

  function mark(r: number, c: number, val: boolean) {
    if (r >= 0 && r < size && c >= 0 && c < size) {
      matrix[r][c] = val;
      isFunction[r][c] = true;
    }
  }

  // 1. Finder patterns
  function addFinder(row: number, col: number) {
    for (let r = -1; r <= 7; r++) {
      for (let c = -1; c <= 7; c++) {
        const nr = row + r;
        const nc = col + c;
        if (nr < 0 || nr >= size || nc < 0 || nc >= size) continue;
        if (
          (r >= 0 && r <= 6 && (c === 0 || c === 6)) ||
          (c >= 0 && c <= 6 && (r === 0 || r === 6)) ||
          (r >= 2 && r <= 4 && c >= 2 && c <= 4)
        ) {
          mark(nr, nc, true);
        } else {
          mark(nr, nc, false);
        }
      }
    }
  }
  addFinder(0, 0);
  addFinder(0, size - 7);
  addFinder(size - 7, 0);

  // 2. Alignment patterns
  if (v.alignmentPatterns.length > 0) {
    const coords = v.alignmentPatterns;
    for (const r of coords) {
      for (const c of coords) {
        if (isFunction[r][c]) continue;
        for (let dr = -2; dr <= 2; dr++) {
          for (let dc = -2; dc <= 2; dc++) {
            const isBorder = Math.abs(dr) === 2 || Math.abs(dc) === 2;
            const isCenter = dr === 0 && dc === 0;
            mark(r + dr, c + dc, isBorder || isCenter);
          }
        }
      }
    }
  }

  // 3. Timing patterns
  for (let i = 8; i < size - 8; i++) {
    if (!isFunction[6][i]) mark(6, i, i % 2 === 0);
    if (!isFunction[i][6]) mark(i, 6, i % 2 === 0);
  }

  // Dark module
  mark(size - 8, 8, true);

  // 4. Encode data and ECC
  const dataBytes = encodeData(text, v);
  const blocks = v.blocks;
  const dataPerBlock = Math.floor(v.dataCodewords / blocks);
  const ecPerBlock = v.ecCodewordsPerBlock;

  const dataBlocks: number[][] = [];
  const ecBlocks: number[][] = [];
  for (let b = 0; b < blocks; b++) {
    const slice = dataBytes.slice(b * dataPerBlock, (b + 1) * dataPerBlock);
    dataBlocks.push(slice);
    ecBlocks.push(rsCalculateEcc(slice, ecPerBlock));
  }

  // Interleave data and EC
  const finalSequence: number[] = [];
  for (let i = 0; i < dataPerBlock; i++) {
    for (let b = 0; b < blocks; b++) {
      finalSequence.push(dataBlocks[b][i]);
    }
  }
  for (let i = 0; i < ecPerBlock; i++) {
    for (let b = 0; b < blocks; b++) {
      finalSequence.push(ecBlocks[b][i]);
    }
  }

  // Convert to bit stream
  const bits: number[] = [];
  for (const byte of finalSequence) {
    for (let i = 7; i >= 0; i--) {
      bits.push((byte >> i) & 1);
    }
  }

  // 5. Place data in matrix (2 columns at a time, moving right to left)
  let bitIdx = 0;
  let dir = -1; // Moving upwards first
  let r = size - 1;
  let c = size - 1;

  while (c > 0) {
    if (c === 6) c--; // Skip vertical timing line

    for (let i = 0; i < size; i++) {
      const row = dir === -1 ? size - 1 - i : i;
      for (let colOffset = 0; colOffset < 2; colOffset++) {
        const col = c - colOffset;
        if (!isFunction[row][col]) {
          const bit = bitIdx < bits.length ? bits[bitIdx++] : 0;
          // Apply standard Mask 0: (row + col) % 2 === 0
          const mask = (row + col) % 2 === 0;
          matrix[row][col] = (bit === 1) !== mask;
        }
      }
    }
    dir = -dir;
    c -= 2;
  }

  // Format info (Error Correction Level L + Mask 0 = 0b111011111000100)
  const formatBits = [1, 1, 1, 0, 1, 1, 1, 1, 1, 0, 0, 0, 1, 0, 0];
  for (let i = 0; i < 6; i++) {
    mark(8, i, formatBits[i] === 1);
    mark(i, 8, formatBits[formatBits.length - 1 - i] === 1);
  }
  mark(8, 7, formatBits[6] === 1);
  mark(8, 8, formatBits[7] === 1);
  mark(7, 8, formatBits[8] === 1);

  for (let i = 0; i < 7; i++) {
    mark(8, size - 1 - i, formatBits[formatBits.length - 1 - i] === 1);
    mark(size - 7 + i, 8, formatBits[i] === 1);
  }

  const cleanMatrix: boolean[][] = matrix.map((row) =>
    row.map((val) => Boolean(val))
  );

  return { matrix: cleanMatrix, size };
}

interface QrCodeSvgProps {
  value: string;
  size?: number;
  fgColor?: string;
  bgColor?: string;
  className?: string;
}

export function QrCodeSvg({
  value,
  size = 200,
  fgColor = '#0f172a',
  bgColor = '#ffffff',
  className = '',
}: QrCodeSvgProps) {
  const { matrix, size: matrixSize } = useMemo(() => {
    try {
      return generateMatrix(value || 'https://fintechcenterfsa.com');
    } catch {
      return { matrix: [], size: 21 };
    }
  }, [value]);

  if (!matrix || matrix.length === 0) {
    return (
      <div
        style={{ width: size, height: size }}
        className="flex items-center justify-center bg-slate-100 rounded-xl"
      >
        <span className="text-xs text-slate-400">Generating QR...</span>
      </div>
    );
  }

  const margin = 2;
  const viewBoxSize = matrixSize + margin * 2;

  return (
    <svg
      viewBox={`0 0 ${viewBoxSize} ${viewBoxSize}`}
      width={size}
      height={size}
      className={`rounded-xl ${className}`}
      shapeRendering="crispEdges"
    >
      <rect width={viewBoxSize} height={viewBoxSize} fill={bgColor} />
      {matrix.map((row, r) =>
        row.map((cell, c) => {
          if (!cell) return null;
          return (
            <rect
              key={`${r}-${c}`}
              x={c + margin}
              y={r + margin}
              width={1}
              height={1}
              fill={fgColor}
            />
          );
        })
      )}
    </svg>
  );
}
