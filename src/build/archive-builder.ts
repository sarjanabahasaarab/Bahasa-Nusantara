/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * NUSANTARA ARCHIVE BUILDER (Phase 23)
 * Pembangun arsip PKZIP (.zip) CRC-32 nyata, POSIX USTAR (.tar.gz), & utilitas SHA-256
 * Kompatibel penuh di Node.js maupun peramban (browser-safe tanpa impor statis modul node:*).
 */

import { ArchiveEntryInput, Sha256SumEntry } from './types';

declare const require: ((id: string) => any) | undefined;

function getNodeBuiltin<T = any>(name: string): T | null {
  if (
    typeof window !== 'undefined' ||
    typeof process === 'undefined' ||
    !process?.versions?.node
  ) {
    return null;
  }
  try {
    const proc = (globalThis as any).process;
    if (proc && typeof proc.getBuiltinModule === 'function') {
      return proc.getBuiltinModule(name);
    }
    if (typeof require === 'function') {
      return require(name);
    }
  } catch {
    return null;
  }
  return null;
}

// Tabel CRC-32 standar IEEE 802.3 (PKZIP & GZIP)
const CRC32_TABLE = (() => {
  const tbl = new Uint32Array(256);
  for (let i = 0; i < 256; i++) {
    let c = i;
    for (let k = 0; k < 8; k++) {
      c = (c & 1) !== 0 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    }
    tbl[i] = c >>> 0;
  }
  return tbl;
})();

export function computeCrc32(data: Uint8Array): number {
  let crc = 0xffffffff;
  for (let i = 0; i < data.length; i++) {
    crc = CRC32_TABLE[(crc ^ data[i]) & 0xff] ^ (crc >>> 8);
  }
  return (crc ^ 0xffffffff) >>> 0;
}

// Implementasi SHA-256 FIPS 180-4 murni JS untuk lingkungan browser fallback
const SHA256_K = new Uint32Array([
  0x428a2f98, 0x71374491, 0xb5c0fbcf, 0xe9b5dba5, 0x3956c25b, 0x59f111f1, 0x923f82a4, 0xab1c5ed5,
  0xd807aa98, 0x12835b01, 0x243185be, 0x550c7dc3, 0x72be5d74, 0x80deb1fe, 0x9bdc06a7, 0xc19bf174,
  0xe49b69c1, 0xefbe4786, 0x0fc19dc6, 0x240ca1cc, 0x2de92c6f, 0x4a7484aa, 0x5cb0a9dc, 0x76f988da,
  0x983e5152, 0xa831c66d, 0xb00327c8, 0xbf597fc7, 0xc6e00bf3, 0xd5a79147, 0x06ca6351, 0x14292967,
  0x27b70a85, 0x2e1b2138, 0x4d2c6dfc, 0x53380d13, 0x650a7354, 0x766a0abb, 0x81c2c92e, 0x92722c85,
  0xa2bfe8a1, 0xa81a664b, 0xc24b8b70, 0xc76c51a3, 0xd192e819, 0xd6990624, 0xf40e3585, 0x106aa070,
  0x19a4c116, 0x1e376c08, 0x2748774c, 0x34b0bcb5, 0x391c0cb3, 0x4ed8aa4a, 0x5b9cca4f, 0x682e6ff3,
  0x748f82ee, 0x78a5636f, 0x84c87814, 0x8cc70208, 0x90befffa, 0xa4506ceb, 0xbef9a3f7, 0xc67178f2,
]);

function sha256PureJs(bytes: Uint8Array): string {
  const len = bytes.length;
  const bitLen = BigInt(len) * 8n;
  const paddedLen = Math.ceil((len + 9) / 64) * 64;
  const padded = new Uint8Array(paddedLen);
  padded.set(bytes);
  padded[len] = 0x80;
  const view = new DataView(padded.buffer);
  view.setUint32(paddedLen - 8, Number((bitLen >> 32n) & 0xffffffffn), false);
  view.setUint32(paddedLen - 4, Number(bitLen & 0xffffffffn), false);

  let h0 = 0x6a09e667;
  let h1 = 0xbb67ae85;
  let h2 = 0x3c6ef372;
  let h3 = 0xa54ff53a;
  let h4 = 0x510e527f;
  let h5 = 0x9b05688c;
  let h6 = 0x1f83d9ab;
  let h7 = 0x5be0cd19;

  const w = new Uint32Array(64);
  const rotr = (x: number, n: number) => (x >>> n) | (x << (32 - n));

  for (let offset = 0; offset < paddedLen; offset += 64) {
    for (let i = 0; i < 16; i++) {
      w[i] = view.getUint32(offset + i * 4, false);
    }
    for (let i = 16; i < 64; i++) {
      const s0 = rotr(w[i - 15], 7) ^ rotr(w[i - 15], 18) ^ (w[i - 15] >>> 3);
      const s1 = rotr(w[i - 2], 17) ^ rotr(w[i - 2], 19) ^ (w[i - 2] >>> 10);
      w[i] = (w[i - 16] + s0 + w[i - 7] + s1) >>> 0;
    }

    let a = h0;
    let b = h1;
    let c = h2;
    let d = h3;
    let e = h4;
    let f = h5;
    let g = h6;
    let h = h7;

    for (let i = 0; i < 64; i++) {
      const S1 = rotr(e, 6) ^ rotr(e, 11) ^ rotr(e, 25);
      const ch = (e & f) ^ (~e & g);
      const temp1 = (h + S1 + ch + SHA256_K[i] + w[i]) >>> 0;
      const S0 = rotr(a, 2) ^ rotr(a, 13) ^ rotr(a, 22);
      const maj = (a & b) ^ (a & c) ^ (b & c);
      const temp2 = (S0 + maj) >>> 0;

      h = g;
      g = f;
      f = e;
      e = (d + temp1) >>> 0;
      d = c;
      c = b;
      b = a;
      a = (temp1 + temp2) >>> 0;
    }

    h0 = (h0 + a) >>> 0;
    h1 = (h1 + b) >>> 0;
    h2 = (h2 + c) >>> 0;
    h3 = (h3 + d) >>> 0;
    h4 = (h4 + e) >>> 0;
    h5 = (h5 + f) >>> 0;
    h6 = (h6 + g) >>> 0;
    h7 = (h7 + h) >>> 0;
  }

  return [h0, h1, h2, h3, h4, h5, h6, h7]
    .map((v) => v.toString(16).padStart(8, '0'))
    .join('');
}

function toBytes(input: string | Uint8Array): Uint8Array {
  return typeof input === 'string' ? new TextEncoder().encode(input) : input;
}

function normalizeEntryName(raw: string): string {
  const cleaned = raw.replace(/\\/g, '/').replace(/^\/+/, '');
  if (!cleaned || cleaned.split('/').some((seg) => seg === '..')) {
    throw new Error(`Nama entri arsip tidak aman (path traversal): '${raw}'`);
  }
  return cleaned;
}

function concatUint8Arrays(chunks: Uint8Array[]): Uint8Array {
  let total = 0;
  for (const c of chunks) total += c.length;
  const out = new Uint8Array(total);
  let pos = 0;
  for (const c of chunks) {
    out.set(c, pos);
    pos += c.length;
  }
  return out;
}

function encodeDosTimeDate(epochSec: number): { dosTime: number; dosDate: number } {
  // Reproducible default: 1980-01-01 00:00:00 (DOS epoch)
  if (epochSec <= 315532800) {
    return { dosTime: 0, dosDate: (1 << 5) | 1 };
  }
  const d = new Date(epochSec * 1000);
  const year = Math.max(1980, Math.min(2107, d.getUTCFullYear()));
  const month = d.getUTCMonth() + 1;
  const day = d.getUTCDate();
  const hours = d.getUTCHours();
  const mins = d.getUTCMinutes();
  const secs = Math.floor(d.getUTCSeconds() / 2);
  const dosTime = (hours << 11) | (mins << 5) | secs;
  const dosDate = ((year - 1980) << 9) | (month << 5) | day;
  return { dosTime, dosDate };
}

function writeOctalField(buf: Uint8Array, offset: number, length: number, value: number): void {
  const oct = Math.max(0, Math.floor(value)).toString(8);
  const padded = oct.padStart(length - 1, '0').slice(-(length - 1));
  for (let i = 0; i < padded.length; i++) {
    buf[offset + i] = padded.charCodeAt(i);
  }
  buf[offset + length - 1] = 0;
}

function writeAsciiField(buf: Uint8Array, offset: number, length: number, value: string): void {
  const bytes = new TextEncoder().encode(value);
  const n = Math.min(bytes.length, length);
  for (let i = 0; i < n; i++) {
    buf[offset + i] = bytes[i];
  }
}

function gzipFallbackStore(data: Uint8Array): Uint8Array {
  // Valid RFC 1952 GZIP stream menggunakan blok DEFLATE stored (BTYPE=00) untuk fallback peramban
  const header = new Uint8Array([0x1f, 0x8b, 0x08, 0x00, 0, 0, 0, 0, 0x00, 0x03]);
  const blocks: Uint8Array[] = [header];
  const maxBlock = 65535;
  let offset = 0;
  do {
    const chunkLen = Math.min(maxBlock, data.length - offset);
    const isFinal = offset + chunkLen >= data.length ? 1 : 0;
    const hdr = new Uint8Array(5);
    hdr[0] = isFinal;
    hdr[1] = chunkLen & 0xff;
    hdr[2] = (chunkLen >>> 8) & 0xff;
    const nlen = (~chunkLen) & 0xffff;
    hdr[3] = nlen & 0xff;
    hdr[4] = (nlen >>> 8) & 0xff;
    blocks.push(hdr);
    if (chunkLen > 0) {
      blocks.push(data.subarray(offset, offset + chunkLen));
    }
    offset += chunkLen;
  } while (offset < data.length);

  const trailer = new Uint8Array(8);
  const tv = new DataView(trailer.buffer);
  tv.setUint32(0, computeCrc32(data), true);
  tv.setUint32(4, data.length >>> 0, true);
  blocks.push(trailer);
  return concatUint8Arrays(blocks);
}

export class ArchiveBuilder {
  /**
   * Menghitung digest SHA-256 hex huruf kecil (menggunakan node:crypto di Node.js atau FIPS 180-4 JS di browser).
   */
  public static computeSha256(data: string | Uint8Array): string {
    const cryptoMod = getNodeBuiltin<any>('crypto');
    if (cryptoMod && typeof cryptoMod.createHash === 'function') {
      return cryptoMod.createHash('sha256').update(data).digest('hex');
    }
    return sha256PureJs(toBytes(data));
  }

  /**
   * Memformat daftar entri checksum menjadi format standar GNU coreutils SHA256SUMS.
   */
  public static formatSha256Sums(entries: Sha256SumEntry[]): string {
    const sorted = [...entries].sort((a, b) => a.filename.localeCompare(b.filename));
    return sorted.map((e) => `${e.sha256}  ${e.filename}`).join('\n') + (sorted.length > 0 ? '\n' : '');
  }

  /**
   * Mem-parsing isi teks SHA256SUMS menjadi daftar entri terstruktur.
   */
  public static parseSha256Sums(content: string): Sha256SumEntry[] {
    const result: Sha256SumEntry[] = [];
    for (const rawLine of content.split(/\r?\n/)) {
      const line = rawLine.trim();
      if (!line) continue;
      const m = line.match(/^([a-fA-F0-9]{64})\s+\*?(.+)$/);
      if (m) {
        result.push({ sha256: m[1].toLowerCase(), filename: m[2].trim() });
      }
    }
    return result;
  }

  /**
   * Membuat arsip PKZIP (.zip) valid dengan CRC-32 nyata, atribut izin UNIX, & urutan deterministik.
   */
  public static createZip(
    entries: ArchiveEntryInput[],
    options: { reproducible?: boolean } = {}
  ): Uint8Array {
    const reproducible = options.reproducible !== false;
    const normalized = entries
      .map((e) => ({
        name: normalizeEntryName(e.name),
        data: toBytes(e.content),
        mode: e.mode ?? 0o644,
        mtime: reproducible ? 315532800 : e.mtime ?? Math.floor(Date.now() / 1000),
      }))
      .sort((a, b) => a.name.localeCompare(b.name));

    const zlibMod = getNodeBuiltin<any>('zlib');
    const localChunks: Uint8Array[] = [];
    const centralChunks: Uint8Array[] = [];
    let offset = 0;

    for (const entry of normalized) {
      const nameBytes = new TextEncoder().encode(entry.name);
      const crc = computeCrc32(entry.data);
      const { dosTime, dosDate } = encodeDosTimeDate(entry.mtime);

      let method = 0; // STORE
      let payload = entry.data;
      if (zlibMod && typeof zlibMod.deflateRawSync === 'function' && entry.data.length > 0) {
        const deflated = new Uint8Array(zlibMod.deflateRawSync(entry.data, { level: 6 }));
        if (deflated.length < entry.data.length) {
          method = 8; // DEFLATE
          payload = deflated;
        }
      }

      // Local File Header (30 bytes + name)
      const localHdr = new Uint8Array(30 + nameBytes.length);
      const lv = new DataView(localHdr.buffer);
      lv.setUint32(0, 0x04034b50, true); // PK\x03\x04
      lv.setUint16(4, 20, true); // version needed 2.0
      lv.setUint16(6, 0x0800, true); // UTF-8 flag
      lv.setUint16(8, method, true);
      lv.setUint16(10, dosTime, true);
      lv.setUint16(12, dosDate, true);
      lv.setUint32(14, crc, true);
      lv.setUint32(18, payload.length, true);
      lv.setUint32(22, entry.data.length, true);
      lv.setUint16(26, nameBytes.length, true);
      lv.setUint16(28, 0, true);
      localHdr.set(nameBytes, 30);

      localChunks.push(localHdr, payload);

      // Central Directory Header (46 bytes + name)
      const cdHdr = new Uint8Array(46 + nameBytes.length);
      const cv = new DataView(cdHdr.buffer);
      cv.setUint32(0, 0x02014b50, true); // PK\x01\x02
      cv.setUint16(4, (3 << 8) | 20, true); // version made by UNIX (3) + 2.0
      cv.setUint16(6, 20, true);
      cv.setUint16(8, 0x0800, true); // UTF-8
      cv.setUint16(10, method, true);
      cv.setUint16(12, dosTime, true);
      cv.setUint16(14, dosDate, true);
      cv.setUint32(16, crc, true);
      cv.setUint32(20, payload.length, true);
      cv.setUint32(24, entry.data.length, true);
      cv.setUint16(28, nameBytes.length, true);
      cv.setUint16(30, 0, true);
      cv.setUint16(32, 0, true);
      cv.setUint16(34, 0, true);
      cv.setUint16(36, 0, true);
      // External file attributes: UNIX regular file (0100000) | mode in upper 16 bits
      cv.setUint32(38, ((0o100000 | (entry.mode & 0o777)) << 16) >>> 0, true);
      cv.setUint32(42, offset, true);
      cdHdr.set(nameBytes, 46);
      centralChunks.push(cdHdr);

      offset += localHdr.length + payload.length;
    }

    const centralBytes = concatUint8Arrays(centralChunks);
    const eocd = new Uint8Array(22);
    const ev = new DataView(eocd.buffer);
    ev.setUint32(0, 0x06054b50, true); // PK\x05\x06
    ev.setUint16(4, 0, true);
    ev.setUint16(6, 0, true);
    ev.setUint16(8, normalized.length, true);
    ev.setUint16(10, normalized.length, true);
    ev.setUint32(12, centralBytes.length, true);
    ev.setUint32(16, offset, true);
    ev.setUint16(20, 0, true);

    return concatUint8Arrays([...localChunks, centralBytes, eocd]);
  }

  /**
   * Membuat arsip POSIX USTAR (.tar.gz) terkompresi GZIP deterministik.
   */
  public static createTarGz(
    entries: ArchiveEntryInput[],
    options: { reproducible?: boolean } = {}
  ): Uint8Array {
    const reproducible = options.reproducible !== false;
    const normalized = entries
      .map((e) => ({
        name: normalizeEntryName(e.name),
        data: toBytes(e.content),
        mode: e.mode ?? 0o644,
        mtime: reproducible ? 0 : e.mtime ?? Math.floor(Date.now() / 1000),
      }))
      .sort((a, b) => a.name.localeCompare(b.name));

    const tarChunks: Uint8Array[] = [];

    for (const entry of normalized) {
      const header = new Uint8Array(512);
      let nameField = entry.name;
      let prefixField = '';
      if (new TextEncoder().encode(entry.name).length > 100) {
        const slashIdx = entry.name.lastIndexOf('/');
        if (slashIdx > 0) {
          prefixField = entry.name.slice(0, slashIdx);
          nameField = entry.name.slice(slashIdx + 1);
        }
      }
      writeAsciiField(header, 0, 100, nameField);
      writeOctalField(header, 100, 8, entry.mode & 0o7777);
      writeOctalField(header, 108, 8, 0); // uid
      writeOctalField(header, 116, 8, 0); // gid
      writeOctalField(header, 124, 12, entry.data.length);
      writeOctalField(header, 136, 12, entry.mtime);
      for (let i = 148; i < 156; i++) header[i] = 0x20; // checksum placeholder
      header[156] = 0x30; // '0' regular file
      writeAsciiField(header, 257, 6, 'ustar\0');
      writeAsciiField(header, 263, 2, '00');
      writeAsciiField(header, 265, 32, 'nusantara');
      writeAsciiField(header, 297, 32, 'nusantara');
      if (prefixField) {
        writeAsciiField(header, 345, 155, prefixField);
      }

      let chksum = 0;
      for (let i = 0; i < 512; i++) chksum += header[i];
      writeOctalField(header, 148, 7, chksum);
      header[155] = 0x20;

      tarChunks.push(header);
      if (entry.data.length > 0) {
        tarChunks.push(entry.data);
        const rem = entry.data.length % 512;
        if (rem !== 0) {
          tarChunks.push(new Uint8Array(512 - rem));
        }
      }
    }

    // End-of-archive marker: two 512-byte zero blocks
    tarChunks.push(new Uint8Array(1024));
    const tarBytes = concatUint8Arrays(tarChunks);

    const zlibMod = getNodeBuiltin<any>('zlib');
    if (zlibMod && typeof zlibMod.gzipSync === 'function') {
      const gz = new Uint8Array(zlibMod.gzipSync(tarBytes, { level: 6 }));
      if (reproducible && gz.length >= 10) {
        // Nolkan MTIME & tetapkan OS=3 (Unix) pada header GZIP agar byte-for-byte deterministik
        gz[4] = 0;
        gz[5] = 0;
        gz[6] = 0;
        gz[7] = 0;
        gz[9] = 3;
      }
      return gz;
    }

    return gzipFallbackStore(tarBytes);
  }

  /**
   * Memverifikasi struktur PKZIP, batas entri, CRC-32, dan proteksi Zip-Slip secara mandiri.
   */
  public static verifyZip(bytes: Uint8Array): {
    valid: boolean;
    entries: string[];
    errors: string[];
  } {
    const entries: string[] = [];
    const errors: string[] = [];
    if (bytes.length < 22) {
      return { valid: false, entries, errors: ['Ukuran berkas ZIP terlalu kecil (< 22 byte).'] };
    }
    if (bytes[0] !== 0x50 || bytes[1] !== 0x4b || bytes[2] !== 0x03 || bytes[3] !== 0x04) {
      return { valid: false, entries, errors: ['Magic header PK\\x03\\x04 tidak ditemukan.'] };
    }

    const zlibMod = getNodeBuiltin<any>('zlib');
    const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
    let pos = 0;

    while (pos + 4 <= bytes.length) {
      const sig = view.getUint32(pos, true);
      if (sig === 0x02014b50 || sig === 0x06054b50) break;
      if (sig !== 0x04034b50) {
        errors.push(`Signature entri lokal ZIP tidak valid pada offset ${pos}.`);
        break;
      }
      if (pos + 30 > bytes.length) {
        errors.push('Local File Header ZIP terpotong.');
        break;
      }
      const method = view.getUint16(pos + 8, true);
      const expectedCrc = view.getUint32(pos + 14, true);
      const compSize = view.getUint32(pos + 18, true);
      const uncompSize = view.getUint32(pos + 22, true);
      const nameLen = view.getUint16(pos + 26, true);
      const extraLen = view.getUint16(pos + 28, true);
      const dataStart = pos + 30 + nameLen + extraLen;
      const dataEnd = dataStart + compSize;

      if (dataEnd > bytes.length) {
        errors.push(`Payload entri ZIP melebihi akhir berkas pada offset ${pos}.`);
        break;
      }

      const name = new TextDecoder().decode(bytes.subarray(pos + 30, pos + 30 + nameLen));
      if (name.startsWith('/') || name.includes('..') || name.includes('\\')) {
        errors.push(`Entri ZIP mengandung jalur tidak aman (Zip-Slip): '${name}'`);
      }
      entries.push(name);

      const compData = bytes.subarray(dataStart, dataEnd);
      if (method === 0) {
        const crc = computeCrc32(compData);
        if (crc !== expectedCrc || compData.length !== uncompSize) {
          errors.push(`CRC-32/ukuran tidak cocok pada entri STORE '${name}'.`);
        }
      } else if (method === 8 && zlibMod && typeof zlibMod.inflateRawSync === 'function') {
        try {
          const raw = new Uint8Array(zlibMod.inflateRawSync(compData));
          const crc = computeCrc32(raw);
          if (crc !== expectedCrc || raw.length !== uncompSize) {
            errors.push(`CRC-32/ukuran tidak cocok pada entri DEFLATE '${name}'.`);
          }
        } catch (err: any) {
          errors.push(`Gagal dekompresi entri DEFLATE '${name}': ${err?.message || err}`);
        }
      }
      pos = dataEnd;
    }

    return { valid: errors.length === 0 && entries.length > 0, entries, errors };
  }
}
