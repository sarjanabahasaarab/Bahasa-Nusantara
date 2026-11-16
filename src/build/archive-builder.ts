/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * NUSANTARA BUILD SYSTEM - Archive Builder (PKZIP CRC-32 & POSIX USTAR .tar.gz) & SHA-256
 * Target Milestone: Phase 23 (v0.23.0)
 */

import * as crypto from 'crypto';
import * as path from 'path';
import * as zlib from 'zlib';
import { safeFS, safePath } from '../compiler/llvm/node-compat';
import { ArchiveEntryInput, Sha256SumEntry } from './types';

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

const REPRODUCIBLE_DATE = new Date('1970-01-01T00:00:00.000Z');

export interface ArchiveExtractLimits {
  maxEntries?: number;
  maxEntryBytes?: number;
  maxTotalBytes?: number;
  maxCompressionRatio?: number;
}

const DEFAULT_ARCHIVE_LIMITS: Required<ArchiveExtractLimits> = {
  maxEntries: 10_000,
  maxEntryBytes: 256 * 1024 * 1024,
  maxTotalBytes: 512 * 1024 * 1024,
  maxCompressionRatio: 500,
};

export class ArchiveBuilder {
  public static computeSha256(data: string | Uint8Array): string {
    return crypto.createHash('sha256').update(data).digest('hex');
  }

  public static computeCrc32(data: Uint8Array): number {
    let crc = 0xffffffff;
    for (let i = 0; i < data.length; i++) {
      crc = CRC32_TABLE[(crc ^ data[i]) & 0xff] ^ (crc >>> 8);
    }
    return (crc ^ 0xffffffff) >>> 0;
  }

  public static formatSha256Sums(entries: Sha256SumEntry[]): string {
    if (entries.length === 0) return '';
    return entries.map((e) => `${e.sha256}  ${e.filename}`).join('\n') + '\n';
  }

  public static verifySha256SumsFromDirectory(
    directory: string,
    sha256sumsContent: string
  ): {
    valid: boolean;
    checkedCount: number;
    mismatches: string[];
    missingFiles: string[];
  } {
    const mismatches: string[] = [];
    const missingFiles: string[] = [];
    let checkedCount = 0;
    const absRoot = safePath.resolve(directory);

    const lines = sha256sumsContent
      .split(/\r?\n/)
      .map((l) => l.trim())
      .filter((l) => l.length > 0 && !l.startsWith('#'));

    for (const line of lines) {
      const m = line.match(/^([0-9a-fA-F]{64})\s+\*?(.+)$/);
      if (!m) {
        mismatches.push(`Baris SHA256SUMS tidak valid: '${line}'`);
        continue;
      }
      const expectedHash = m[1].toLowerCase();
      const relName = m[2].trim();
      const safeTarget = this.resolveSafeSubpath(absRoot, relName);
      if (!safeFS.existsSync(safeTarget)) {
        missingFiles.push(relName);
        continue;
      }
      const bytes = safeFS.readFileBufferSync(safeTarget);
      const actualHash = this.computeSha256(bytes);
      checkedCount++;
      if (actualHash !== expectedHash) {
        mismatches.push(`${relName} (diharapkan ${expectedHash}, aktual ${actualHash})`);
      }
    }

    return {
      valid: mismatches.length === 0 && missingFiles.length === 0 && checkedCount > 0,
      checkedCount,
      mismatches,
      missingFiles,
    };
  }

  public static createZip(
    entries: ArchiveEntryInput[],
    options: { reproducible?: boolean } = {}
  ): Uint8Array {
    const normalized = this.normalizeEntries(entries, options.reproducible !== false);
    const localChunks: Buffer[] = [];
    const centralChunks: Buffer[] = [];
    let offset = 0;

    for (const item of normalized) {
      const nameBytes = Buffer.from(item.name, 'utf-8');
      const data = Buffer.from(item.bytes);
      const crc = this.computeCrc32(data);
      const deflated = zlib.deflateRawSync(data, { level: 6 });
      const useDeflate = deflated.length < data.length;
      const compData = useDeflate ? deflated : data;
      const method = useDeflate ? 8 : 0;

      const { dosTime, dosDate } = this.toDosTimeDate(item.mtime);

      // Local File Header (30 bytes + filename)
      const localHdr = Buffer.alloc(30);
      localHdr.writeUInt32LE(0x04034b50, 0);
      localHdr.writeUInt16LE(20, 4); // version needed
      localHdr.writeUInt16LE(0x0800, 6); // UTF-8 bit
      localHdr.writeUInt16LE(method, 8);
      localHdr.writeUInt16LE(dosTime, 10);
      localHdr.writeUInt16LE(dosDate, 12);
      localHdr.writeUInt32LE(crc, 14);
      localHdr.writeUInt32LE(compData.length, 18);
      localHdr.writeUInt32LE(data.length, 22);
      localHdr.writeUInt16LE(nameBytes.length, 26);
      localHdr.writeUInt16LE(0, 28);

      localChunks.push(localHdr, nameBytes, compData);

      // Central Directory File Header (46 bytes + filename)
      const cdHdr = Buffer.alloc(46);
      cdHdr.writeUInt32LE(0x02014b50, 0);
      cdHdr.writeUInt16LE((3 << 8) | 20, 4); // Unix creator + PKZIP 2.0
      cdHdr.writeUInt16LE(20, 6);
      cdHdr.writeUInt16LE(0x0800, 8);
      cdHdr.writeUInt16LE(method, 10);
      cdHdr.writeUInt16LE(dosTime, 12);
      cdHdr.writeUInt16LE(dosDate, 14);
      cdHdr.writeUInt32LE(crc, 16);
      cdHdr.writeUInt32LE(compData.length, 20);
      cdHdr.writeUInt32LE(data.length, 24);
      cdHdr.writeUInt16LE(nameBytes.length, 28);
      cdHdr.writeUInt16LE(0, 30);
      cdHdr.writeUInt16LE(0, 32);
      cdHdr.writeUInt16LE(0, 34);
      cdHdr.writeUInt16LE(0, 36);
      cdHdr.writeUInt32LE(((item.mode & 0xffff) << 16) >>> 0, 38);
      cdHdr.writeUInt32LE(offset, 42);

      centralChunks.push(cdHdr, nameBytes);
      offset += 30 + nameBytes.length + compData.length;
    }

    const centralDirBuf = Buffer.concat(centralChunks);
    const eocd = Buffer.alloc(22);
    eocd.writeUInt32LE(0x06054b50, 0);
    eocd.writeUInt16LE(0, 4);
    eocd.writeUInt16LE(0, 6);
    eocd.writeUInt16LE(normalized.length, 8);
    eocd.writeUInt16LE(normalized.length, 10);
    eocd.writeUInt32LE(centralDirBuf.length, 12);
    eocd.writeUInt32LE(offset, 16);
    eocd.writeUInt16LE(0, 20);

    return new Uint8Array(Buffer.concat([...localChunks, centralDirBuf, eocd]));
  }

  public static extractZip(
    zipBytes: Uint8Array,
    destDir: string,
    limits: ArchiveExtractLimits = {}
  ): string[] {
    const cfg = { ...DEFAULT_ARCHIVE_LIMITS, ...limits };
    const buf = Buffer.from(zipBytes);
    const absDest = safePath.resolve(destDir);
    safeFS.mkdirSync(absDest, { recursive: true });

    // Cari End of Central Directory (PK\x05\x06)
    let eocdOff = -1;
    const minSearch = Math.max(0, buf.length - 65558);
    for (let i = buf.length - 22; i >= minSearch; i--) {
      if (buf.readUInt32LE(i) === 0x06054b50) {
        eocdOff = i;
        break;
      }
    }
    if (eocdOff < 0) {
      throw new Error('Arsip ZIP tidak memiliki End of Central Directory yang valid.');
    }

    const totalEntries = buf.readUInt16LE(eocdOff + 10);
    if (totalEntries > cfg.maxEntries) {
      throw new Error(
        `Archive bomb ZIP terdeteksi: jumlah entri (${totalEntries}) melebihi batas aman (${cfg.maxEntries}).`
      );
    }
    const cdOffset = buf.readUInt32LE(eocdOff + 16);
    const extracted: string[] = [];
    let totalUncompressed = 0;

    let cursor = cdOffset;
    for (let i = 0; i < totalEntries; i++) {
      if (cursor + 46 > buf.length || buf.readUInt32LE(cursor) !== 0x02014b50) {
        throw new Error(`Central Directory ZIP korup pada entri ke-${i}.`);
      }
      const method = buf.readUInt16LE(cursor + 10);
      const expectedCrc = buf.readUInt32LE(cursor + 16);
      const compSize = buf.readUInt32LE(cursor + 20);
      const uncompSize = buf.readUInt32LE(cursor + 24);
      const nameLen = buf.readUInt16LE(cursor + 28);
      const extraLen = buf.readUInt16LE(cursor + 30);
      const commentLen = buf.readUInt16LE(cursor + 32);
      const extAttr = buf.readUInt32LE(cursor + 38);
      const localHdrOff = buf.readUInt32LE(cursor + 42);

      const entryName = buf.subarray(cursor + 46, cursor + 46 + nameLen).toString('utf-8');
      cursor += 46 + nameLen + extraLen + commentLen;

      // Tolak symlink atau path traversal pada ZIP
      const unixMode = (extAttr >>> 16) & 0xffff;
      if ((unixMode & 0o170000) === 0o120000) {
        throw new Error(`Entri symlink tidak diizinkan dalam arsip ZIP: '${entryName}'.`);
      }

      if (uncompSize > cfg.maxEntryBytes) {
        throw new Error(
          `Archive bomb ZIP terdeteksi pada '${entryName}': ukuran (${uncompSize} B) melebihi batas entri (${cfg.maxEntryBytes} B).`
        );
      }
      if (totalUncompressed + uncompSize > cfg.maxTotalBytes) {
        throw new Error(
          `Archive bomb ZIP terdeteksi: total dekompresi melebihi batas aman (${cfg.maxTotalBytes} B).`
        );
      }

      if (entryName.endsWith('/')) {
        const dirPath = this.resolveSafeSubpath(absDest, entryName);
        safeFS.mkdirSync(dirPath, { recursive: true });
        continue;
      }

      if (localHdrOff + 30 > buf.length || buf.readUInt32LE(localHdrOff) !== 0x04034b50) {
        throw new Error(`Local File Header ZIP korup untuk '${entryName}'.`);
      }
      const lNameLen = buf.readUInt16LE(localHdrOff + 26);
      const lExtraLen = buf.readUInt16LE(localHdrOff + 28);
      const dataStart = localHdrOff + 30 + lNameLen + lExtraLen;
      if (dataStart + compSize > buf.length) {
        throw new Error(`Data payload ZIP terpotong untuk '${entryName}'.`);
      }
      const compSlice = buf.subarray(dataStart, dataStart + compSize);

      if (
        method === 8 &&
        compSize > 0 &&
        uncompSize > 65536 &&
        uncompSize / compSize > cfg.maxCompressionRatio
      ) {
        throw new Error(
          `Archive bomb ZIP terdeteksi pada '${entryName}': rasio kompresi (${(uncompSize / compSize).toFixed(1)}x) melebihi batas (${cfg.maxCompressionRatio}x).`
        );
      }

      let outBuf: Buffer;
      if (method === 0) {
        outBuf = Buffer.from(compSlice);
      } else if (method === 8) {
        try {
          outBuf = zlib.inflateRawSync(compSlice, {
            maxOutputLength: Math.min(cfg.maxEntryBytes, cfg.maxTotalBytes - totalUncompressed),
          });
        } catch (err: any) {
          throw new Error(
            `Archive bomb / kegagalan dekompresi ZIP untuk '${entryName}': ${err?.message || err}`
          );
        }
      } else {
        throw new Error(`Metode kompresi ZIP tidak didukung (${method}) untuk '${entryName}'.`);
      }

      if (
        outBuf.length > cfg.maxEntryBytes ||
        totalUncompressed + outBuf.length > cfg.maxTotalBytes ||
        (method === 8 &&
          compSize > 0 &&
          outBuf.length > 65536 &&
          outBuf.length / compSize > cfg.maxCompressionRatio)
      ) {
        throw new Error(
          `Archive bomb ZIP terdeteksi pasca-inflasi pada '${entryName}' (${outBuf.length} B).`
        );
      }

      if (outBuf.length !== uncompSize) {
        throw new Error(`Ukuran ZIP tidak cocok untuk '${entryName}'.`);
      }
      const actualCrc = this.computeCrc32(outBuf);
      if (actualCrc !== expectedCrc) {
        throw new Error(`CRC-32 ZIP tidak cocok untuk '${entryName}'.`);
      }

      totalUncompressed += outBuf.length;

      const outPath = this.resolveSafeSubpath(absDest, entryName);
      safeFS.mkdirSync(safePath.dirname(outPath), { recursive: true });
      safeFS.writeFileSync(outPath, outBuf);
      if (typeof process !== 'undefined' && process.platform !== 'win32' && (unixMode & 0o111) !== 0) {
        safeFS.chmodSync(outPath, unixMode & 0o777);
      }
      extracted.push(outPath);
    }

    return extracted;
  }

  public static createTarGz(
    entries: ArchiveEntryInput[],
    options: { reproducible?: boolean } = {}
  ): Uint8Array {
    const normalized = this.normalizeEntries(entries, options.reproducible !== false);
    const blocks: Buffer[] = [];

    for (const item of normalized) {
      const { name, prefix } = this.splitTarName(item.name);
      const data = Buffer.from(item.bytes);
      const hdr = Buffer.alloc(512, 0);

      hdr.write(name, 0, Math.min(100, Buffer.byteLength(name)), 'utf-8');
      this.writeOctal(hdr, 100, 8, item.mode & 0o777);
      this.writeOctal(hdr, 108, 8, 0); // uid
      this.writeOctal(hdr, 116, 8, 0); // gid
      this.writeOctal(hdr, 124, 12, data.length);
      this.writeOctal(hdr, 136, 12, Math.floor(item.mtime.getTime() / 1000));
      hdr.fill(0x20, 148, 156); // checksum placeholder spaces
      hdr.write('0', 156, 1, 'ascii'); // regular file
      hdr.write('ustar\0', 257, 6, 'ascii');
      hdr.write('00', 263, 2, 'ascii');
      hdr.write('nusantara', 265, 9, 'ascii');
      hdr.write('nusantara', 297, 9, 'ascii');
      if (prefix) {
        hdr.write(prefix, 345, Math.min(155, Buffer.byteLength(prefix)), 'utf-8');
      }

      let sum = 0;
      for (let i = 0; i < 512; i++) {
        sum += hdr[i];
      }
      const sumStr = sum.toString(8).padStart(6, '0') + '\0 ';
      hdr.write(sumStr, 148, 8, 'ascii');

      blocks.push(hdr);
      if (data.length > 0) {
        blocks.push(data);
        const rem = data.length % 512;
        if (rem !== 0) {
          blocks.push(Buffer.alloc(512 - rem, 0));
        }
      }
    }

    // Two 512-byte EOF zero blocks
    blocks.push(Buffer.alloc(1024, 0));
    const tarBuf = Buffer.concat(blocks);
    const gz = zlib.gzipSync(tarBuf, { level: 6 });
    return new Uint8Array(gz);
  }

  public static extractTarGz(
    tarGzBytes: Uint8Array,
    destDir: string,
    limits: ArchiveExtractLimits = {}
  ): string[] {
    const cfg = { ...DEFAULT_ARCHIVE_LIMITS, ...limits };
    const maxTarBuf = Math.min(cfg.maxTotalBytes + Math.min(cfg.maxEntries, 4096) * 1024 + 8192, 512 * 1024 * 1024);
    let tarBuf: Buffer;
    try {
      tarBuf = zlib.gunzipSync(Buffer.from(tarGzBytes), { maxOutputLength: maxTarBuf });
    } catch (err: any) {
      throw new Error(`Archive bomb / kegagalan dekompresi TAR.GZ: ${err?.message || err}`);
    }

    if (
      tarGzBytes.length > 0 &&
      tarBuf.length > 65536 &&
      tarBuf.length / tarGzBytes.length > cfg.maxCompressionRatio
    ) {
      throw new Error(
        `Archive bomb TAR.GZ terdeteksi: rasio kompresi (${(tarBuf.length / tarGzBytes.length).toFixed(1)}x) melebihi batas (${cfg.maxCompressionRatio}x).`
      );
    }

    const absDest = safePath.resolve(destDir);
    safeFS.mkdirSync(absDest, { recursive: true });
    const extracted: string[] = [];

    let cursor = 0;
    let entryCount = 0;
    let totalPayloadBytes = 0;
    while (cursor + 512 <= tarBuf.length) {
      const hdr = tarBuf.subarray(cursor, cursor + 512);
      cursor += 512;

      if (hdr.every((b) => b === 0)) {
        break;
      }

      entryCount++;
      if (entryCount > cfg.maxEntries) {
        throw new Error(
          `Archive bomb TAR.GZ terdeteksi: jumlah entri melebihi batas aman (${cfg.maxEntries}).`
        );
      }

      const storedSum = this.readOctal(hdr.subarray(148, 156));
      let calcSum = 0;
      for (let i = 0; i < 512; i++) {
        calcSum += i >= 148 && i < 156 ? 0x20 : hdr[i];
      }
      if (storedSum !== calcSum) {
        throw new Error('Checksum header TAR USTAR tidak valid.');
      }

      const rawName = this.readNullString(hdr.subarray(0, 100));
      const rawPrefix = this.readNullString(hdr.subarray(345, 500));
      const fullName = rawPrefix ? `${rawPrefix}/${rawName}` : rawName;
      const typeFlag = String.fromCharCode(hdr[156]);
      const mode = this.readOctal(hdr.subarray(100, 108));
      const size = this.readOctal(hdr.subarray(124, 136));

      if (typeFlag === '1' || typeFlag === '2') {
        throw new Error(`Hardlink/symlink TAR tidak diizinkan demi keamanan: '${fullName}'.`);
      }

      if (size > cfg.maxEntryBytes) {
        throw new Error(
          `Archive bomb TAR.GZ terdeteksi pada '${fullName}': ukuran (${size} B) melebihi batas entri (${cfg.maxEntryBytes} B).`
        );
      }
      if (totalPayloadBytes + size > cfg.maxTotalBytes) {
        throw new Error(
          `Archive bomb TAR.GZ terdeteksi: total ekstraksi melebihi batas aman (${cfg.maxTotalBytes} B).`
        );
      }

      if (typeFlag === '5' || fullName.endsWith('/')) {
        const dirPath = this.resolveSafeSubpath(absDest, fullName);
        safeFS.mkdirSync(dirPath, { recursive: true });
        continue;
      }

      if (cursor + size > tarBuf.length) {
        throw new Error(`Payload TAR.GZ terpotong untuk '${fullName}'.`);
      }
      const payload = tarBuf.subarray(cursor, cursor + size);
      const padded = size === 0 ? 0 : Math.ceil(size / 512) * 512;
      cursor += padded;
      totalPayloadBytes += size;

      const outPath = this.resolveSafeSubpath(absDest, fullName);
      safeFS.mkdirSync(safePath.dirname(outPath), { recursive: true });
      safeFS.writeFileSync(outPath, payload);
      if (typeof process !== 'undefined' && process.platform !== 'win32' && mode > 0) {
        safeFS.chmodSync(outPath, mode & 0o777);
      }
      extracted.push(outPath);
    }

    return extracted;
  }

  public static resolveSafeSubpath(baseDir: string, entryName: string): string {
    if (!entryName || entryName.includes('\0')) {
      throw new Error(`Nama entri arsip tidak valid: '${entryName}'.`);
    }
    const cleaned = entryName.replace(/\\/g, '/').replace(/^\/+/, '');
    if (entryName.startsWith('/') || entryName.startsWith('\\') || /^[A-Za-z]:/.test(entryName)) {
      throw new Error(`Jalur absolut tidak diizinkan dalam arsip: '${entryName}'.`);
    }
    const parts = cleaned.split('/').filter((p) => p.length > 0);
    if (parts.some((p) => p === '..')) {
      throw new Error(`Path traversal ('..') terdeteksi dan ditolak: '${entryName}'.`);
    }
    const absBase = safePath.resolve(baseDir);
    const resolved = safePath.resolve(absBase, ...parts);
    const basePrefix = absBase.endsWith(path.sep) ? absBase : absBase + path.sep;
    if (resolved !== absBase && !resolved.startsWith(basePrefix)) {
      throw new Error(`Jalur target keluar dari batas direktori aman: '${entryName}'.`);
    }
    return resolved;
  }

  private static normalizeEntries(
    entries: ArchiveEntryInput[],
    reproducible: boolean
  ): Array<{ name: string; bytes: Uint8Array; mode: number; mtime: Date }> {
    const mapped = entries.map((e) => {
      const cleanName = e.name.replace(/\\/g, '/').replace(/^\/+/, '');
      if (!cleanName || cleanName.split('/').includes('..')) {
        throw new Error(`Nama entri arsip tidak aman: '${e.name}'.`);
      }
      const bytes = typeof e.content === 'string' ? Buffer.from(e.content, 'utf-8') : e.content;
      return {
        name: cleanName,
        bytes,
        mode: e.mode ?? 0o644,
        mtime: reproducible ? REPRODUCIBLE_DATE : e.mtime ?? new Date(),
      };
    });
    if (reproducible) {
      mapped.sort((a, b) => (a.name < b.name ? -1 : a.name > b.name ? 1 : 0));
    }
    return mapped;
  }

  private static splitTarName(fullName: string): { name: string; prefix: string } {
    if (Buffer.byteLength(fullName, 'utf-8') <= 100) {
      return { name: fullName, prefix: '' };
    }
    const parts = fullName.split('/');
    for (let idx = 1; idx < parts.length; idx++) {
      const prefix = parts.slice(0, idx).join('/');
      const name = parts.slice(idx).join('/');
      if (
        Buffer.byteLength(name, 'utf-8') <= 100 &&
        Buffer.byteLength(prefix, 'utf-8') <= 155
      ) {
        return { name, prefix };
      }
    }
    throw new Error(`Jalur entri terlalu panjang untuk header TAR USTAR: '${fullName}'.`);
  }

  private static writeOctal(buf: Buffer, offset: number, length: number, value: number): void {
    const oct = Math.max(0, Math.floor(value)).toString(8).padStart(length - 1, '0');
    buf.write(oct.slice(-(length - 1)) + '\0', offset, length, 'ascii');
  }

  private static readOctal(slice: Buffer): number {
    const str = slice.toString('ascii').replace(/\0.*$/, '').trim();
    if (!str) return 0;
    return parseInt(str, 8) || 0;
  }

  private static readNullString(slice: Buffer): string {
    const idx = slice.indexOf(0);
    return (idx >= 0 ? slice.subarray(0, idx) : slice).toString('utf-8');
  }

  private static toDosTimeDate(date: Date): { dosTime: number; dosDate: number } {
    const y = Math.max(1980, date.getUTCFullYear());
    const m = date.getUTCMonth() + 1;
    const d = date.getUTCDate();
    const hh = date.getUTCHours();
    const mm = date.getUTCMinutes();
    const ss = Math.floor(date.getUTCSeconds() / 2);
    const dosDate = ((y - 1980) << 9) | (m << 5) | d;
    const dosTime = (hh << 11) | (mm << 5) | ss;
    return { dosTime, dosDate };
  }
}
