/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * NUSANTARA BUILD SYSTEM - Pembangun & Ekstraktor Arsip (.zip, .tar.gz) & Verifikasi SHA-256
 * Menggunakan PKZIP CRC-32 + POSIX USTAR + node:zlib + node:crypto (dengan fallback peramban aman).
 */

import { safeFS, safePath } from '../compiler/llvm/node-compat';
import { apakahNodeRuntime, muatModulNode } from '../gui/platform/node_bridge';
import { ZipBuilder } from '../mobile/distribution/core/ZipBuilder';
import { HashValidator } from '../mobile/updates/security/HashValidator';
import { ArchiveEntryInput, ExtractedEntryInfo, Sha256SumEntry, Sha256VerificationResult } from './types';

function readU16LE(buf: Uint8Array, off: number): number {
  return buf[off] | (buf[off + 1] << 8);
}

function readU32LE(buf: Uint8Array, off: number): number {
  return (buf[off] | (buf[off + 1] << 8) | (buf[off + 2] << 16) | (buf[off + 3] << 24)) >>> 0;
}

export class ArchiveBuilder {
  /**
   * Menghitung hash SHA-256 deterministik dari string atau Uint8Array.
   */
  public static computeSha256(data: string | Uint8Array): string {
    const bytes = typeof data === 'string' ? new TextEncoder().encode(data) : data;
    return HashValidator.hitungSHA256(bytes);
  }

  /**
   * Validasi keamanan nama entri arsip agar bebas path traversal & path absolut.
   */
  public static assertSafeArchivePath(entryName: string): string {
    const normalized = entryName.replace(/\\/g, '/');
    if (normalized.startsWith('/') || /^[A-Za-z]:/.test(normalized)) {
      throw new Error(`Jalur arsip tidak aman (absolut): '${entryName}'`);
    }
    const parts = normalized.split('/');
    for (const part of parts) {
      if (part === '..') {
        throw new Error(`Percobaan path traversal terdeteksi pada entri arsip: '${entryName}'`);
      }
    }
    return normalized.replace(/^\/+/, '');
  }

  /**
   * Membangun arsip ZIP standar PKZIP + CRC-32.
   */
  public static createZip(entries: ArchiveEntryInput[]): Uint8Array {
    const sorted = [...entries].sort((a, b) => a.name.localeCompare(b.name));
    const zipEntries = sorted.map((e) => ({
      nama: this.assertSafeArchivePath(e.name),
      konten: e.content,
    }));
    return ZipBuilder.buatArsipZip(zipEntries);
  }

  /**
   * Membangun arsip POSIX USTAR TAR mentah, mendukung jalur hingga 255 byte lewat field prefix (offset 345)
   * dan menyimpan permission bit POSIX (0o755 / 0o644).
   */
  public static createTar(entries: ArchiveEntryInput[], options: { reproducible?: boolean } = {}): Uint8Array {
    const encoder = new TextEncoder();
    const sorted = [...entries].sort((a, b) => a.name.localeCompare(b.name));
    const blocks: Uint8Array[] = [];
    const mtime = options.reproducible ? 0 : Math.floor(Date.now() / 1000);

    for (const entry of sorted) {
      const safeName = this.assertSafeArchivePath(entry.name);
      const dataBytes = typeof entry.content === 'string' ? encoder.encode(entry.content) : entry.content;
      const hdr = new Uint8Array(512);

      // USTAR split prefix (max 155) + name (max 100) jika lebih dari 99 byte
      let nameField = safeName;
      let prefixField = '';
      if (encoder.encode(safeName).length > 99) {
        const slashIdx = safeName.lastIndexOf('/');
        if (slashIdx > 0) {
          prefixField = safeName.slice(0, slashIdx);
          nameField = safeName.slice(slashIdx + 1);
        }
      }

      const nameBytes = encoder.encode(nameField);
      const prefixBytes = encoder.encode(prefixField);
      if (nameBytes.length > 100 || prefixBytes.length > 155) {
        throw new Error(`Nama berkas arsip TAR terlalu panjang (>255 byte): '${safeName}'`);
      }

      hdr.set(nameBytes, 0);
      const modeVal = (entry.mode ?? 0o644).toString(8).padStart(7, '0') + '\0';
      hdr.set(encoder.encode(modeVal), 100);
      hdr.set(encoder.encode('0000000\0'), 108); // uid
      hdr.set(encoder.encode('0000000\0'), 116); // gid
      hdr.set(encoder.encode(dataBytes.byteLength.toString(8).padStart(11, '0') + '\0'), 124);
      hdr.set(encoder.encode(mtime.toString(8).padStart(11, '0') + '\0'), 136);
      for (let i = 148; i < 156; i++) hdr[i] = 0x20;
      hdr[156] = 0x30; // '0' regular file
      hdr.set(encoder.encode('ustar\0'), 257);
      hdr.set(encoder.encode('00'), 263);
      if (prefixBytes.length > 0) {
        hdr.set(prefixBytes, 345);
      }

      let csum = 0;
      for (let i = 0; i < 512; i++) csum += hdr[i];
      hdr.set(encoder.encode(csum.toString(8).padStart(6, '0') + '\0 '), 148);

      blocks.push(hdr);
      if (dataBytes.byteLength > 0) {
        blocks.push(dataBytes);
        const pad = (512 - (dataBytes.byteLength % 512)) % 512;
        if (pad > 0) blocks.push(new Uint8Array(pad));
      }
    }

    // End-of-archive 2x512 zero blocks
    blocks.push(new Uint8Array(1024));

    const totalLen = blocks.reduce((acc, b) => acc + b.byteLength, 0);
    const out = new Uint8Array(totalLen);
    let off = 0;
    for (const b of blocks) {
      out.set(b, off);
      off += b.byteLength;
    }
    return out;
  }

  /**
   * Membangun arsip TAR terkompresi GZIP (.tar.gz) nyata menggunakan node:zlib.
   */
  public static createTarGz(entries: ArchiveEntryInput[], options: { reproducible?: boolean } = {}): Uint8Array {
    const tarBytes = this.createTar(entries, options);
    const zlibMod = apakahNodeRuntime() ? muatModulNode<typeof import('node:zlib')>('zlib') : null;
    if (zlibMod && typeof zlibMod.gzipSync === 'function') {
      return new Uint8Array(zlibMod.gzipSync(tarBytes, { level: 9 }));
    }
    throw new Error('Kompresi .tar.gz membutuhkan modul node:zlib pada runtime Node.js.');
  }

  /**
   * Mengekstrak arsip ZIP ke direktori tujuan dengan proteksi anti-path traversal.
   */
  public static extractZip(zipBytes: Uint8Array, destDir: string): ExtractedEntryInfo[] {
    const extracted: ExtractedEntryInfo[] = [];
    const decoder = new TextDecoder();
    let cursor = 0;

    if (!safeFS.existsSync(destDir)) {
      safeFS.mkdirSync(destDir, { recursive: true });
    }

    while (cursor + 30 <= zipBytes.length) {
      const sig = readU32LE(zipBytes, cursor);
      if (sig !== 0x04034b50) {
        break; // Mencapai Central Directory atau akhir entri
      }
      const method = readU16LE(zipBytes, cursor + 8);
      if (method !== 0) {
        throw new Error(`Metode kompresi ZIP tidak didukung (${method}); ekstraktor ini mendukung STORE (0).`);
      }
      const compSize = readU32LE(zipBytes, cursor + 18);
      const nameLen = readU16LE(zipBytes, cursor + 26);
      const extraLen = readU16LE(zipBytes, cursor + 28);

      const nameStart = cursor + 30;
      const nameEnd = nameStart + nameLen;
      const rawName = decoder.decode(zipBytes.subarray(nameStart, nameEnd));
      const safeRel = this.assertSafeArchivePath(rawName);

      const dataStart = nameEnd + extraLen;
      const dataEnd = dataStart + compSize;
      if (dataEnd > zipBytes.length) {
        throw new Error(`Arsip ZIP terpotong pada entri '${rawName}'.`);
      }

      const content = zipBytes.subarray(dataStart, dataEnd);
      const outPath = safePath.resolve(destDir, safeRel);
      const resolvedBase = safePath.resolve(destDir);
      if (!outPath.startsWith(resolvedBase)) {
        throw new Error(`Pelanggaran batas direktori saat ekstraksi ZIP: '${rawName}'.`);
      }

      if (safeRel.endsWith('/')) {
        safeFS.mkdirSync(outPath, { recursive: true });
      } else {
        safeFS.mkdirSync(safePath.dirname(outPath), { recursive: true });
        safeFS.writeFileSync(outPath, content);
        const mode = safeRel.includes('/bin/') || safeRel.endsWith('.sh') ? 0o755 : 0o644;
        if (typeof process !== 'undefined' && process.platform !== 'win32' && mode === 0o755) {
          safeFS.chmodSync(outPath, mode);
        }
        extracted.push({ name: safeRel, size: content.byteLength, mode });
      }

      cursor = dataEnd;
    }

    return extracted;
  }

  /**
   * Mengekstrak arsip .tar.gz ke direktori tujuan dengan proteksi anti-path traversal dan anti-symlink escape.
   */
  public static extractTarGz(tgzBytes: Uint8Array, destDir: string): ExtractedEntryInfo[] {
    const zlibMod = apakahNodeRuntime() ? muatModulNode<typeof import('node:zlib')>('zlib') : null;
    if (!zlibMod || typeof zlibMod.gunzipSync !== 'function') {
      throw new Error('Ekstraksi .tar.gz membutuhkan modul node:zlib pada runtime Node.js.');
    }

    const tarBytes = new Uint8Array(zlibMod.gunzipSync(tgzBytes));
    const decoder = new TextDecoder();
    const extracted: ExtractedEntryInfo[] = [];

    if (!safeFS.existsSync(destDir)) {
      safeFS.mkdirSync(destDir, { recursive: true });
    }
    const resolvedBase = safePath.resolve(destDir);

    let cursor = 0;
    while (cursor + 512 <= tarBytes.length) {
      const hdr = tarBytes.subarray(cursor, cursor + 512);
      // Cek blok nol akhir
      let allZero = true;
      for (let i = 0; i < 512; i++) {
        if (hdr[i] !== 0) {
          allZero = false;
          break;
        }
      }
      if (allZero) break;

      const nameRaw = decoder.decode(hdr.subarray(0, 100)).replace(/\0.*$/, '');
      const modeStr = decoder.decode(hdr.subarray(100, 108)).replace(/\0.*$/, '').trim();
      const sizeStr = decoder.decode(hdr.subarray(124, 136)).replace(/\0.*$/, '').trim();
      const typeFlag = hdr[156];
      const prefixRaw = decoder.decode(hdr.subarray(345, 500)).replace(/\0.*$/, '');

      const fullName = prefixRaw ? `${prefixRaw}/${nameRaw}` : nameRaw;
      const safeRel = this.assertSafeArchivePath(fullName);

      // Tolak symlink (0x32 '2') & hardlink (0x31 '1') demi keamanan
      if (typeFlag === 0x31 || typeFlag === 0x32) {
        throw new Error(`Entri link tidak diizinkan dalam arsip TAR demi keamanan: '${fullName}'`);
      }

      const fileSize = parseInt(sizeStr || '0', 8) || 0;
      const mode = parseInt(modeStr || '644', 8) || 0o644;
      cursor += 512;

      if (typeFlag === 0x35 || safeRel.endsWith('/')) {
        const dirPath = safePath.resolve(destDir, safeRel);
        if (!dirPath.startsWith(resolvedBase)) {
          throw new Error(`Pelanggaran batas direktori saat ekstraksi TAR: '${fullName}'`);
        }
        safeFS.mkdirSync(dirPath, { recursive: true });
      } else {
        if (cursor + fileSize > tarBytes.length) {
          throw new Error(`Arsip TAR terpotong pada entri '${fullName}'.`);
        }
        const content = tarBytes.subarray(cursor, cursor + fileSize);
        const outPath = safePath.resolve(destDir, safeRel);
        if (!outPath.startsWith(resolvedBase)) {
          throw new Error(`Pelanggaran batas direktori saat ekstraksi TAR: '${fullName}'`);
        }
        safeFS.mkdirSync(safePath.dirname(outPath), { recursive: true });
        safeFS.writeFileSync(outPath, content);
        if (typeof process !== 'undefined' && process.platform !== 'win32') {
          safeFS.chmodSync(outPath, mode);
        }
        extracted.push({ name: safeRel, size: fileSize, mode });
      }

      const padded = Math.ceil(fileSize / 512) * 512;
      cursor += padded;
    }

    return extracted;
  }

  public static formatSha256Sums(entries: Sha256SumEntry[]): string {
    return entries.map((e) => `${e.sha256}  ${e.filename}`).join('\n') + (entries.length > 0 ? '\n' : '');
  }

  public static parseSha256Sums(content: string): Sha256SumEntry[] {
    const entries: Sha256SumEntry[] = [];
    for (const line of content.split(/\r?\n/)) {
      const trimmed = line.trim();
      if (!trimmed) continue;
      const match = trimmed.match(/^([a-fA-F0-9]{64})\s+\*?(.+)$/);
      if (match) {
        entries.push({
          sha256: match[1].toLowerCase(),
          filename: match[2].trim(),
        });
      }
    }
    return entries;
  }

  public static verifySha256SumsFromDirectory(sumsContent: string, baseDir: string): Sha256VerificationResult {
    const parsed = this.parseSha256Sums(sumsContent);
    const mismatches: Sha256VerificationResult['mismatches'] = [];
    const diagnostics: string[] = [];

    if (parsed.length === 0) {
      return {
        valid: false,
        checkedCount: 0,
        mismatches: [],
        diagnostics: ['Berkas SHA256SUMS kosong atau berformat tidak valid.'],
      };
    }

    for (const item of parsed) {
      const targetPath = safePath.resolve(baseDir, this.assertSafeArchivePath(item.filename));
      if (!safeFS.existsSync(targetPath)) {
        mismatches.push({ filename: item.filename, expected: item.sha256, actual: 'MISSING' });
        diagnostics.push(`Berkas hilang saat verifikasi checksum: ${item.filename}`);
        continue;
      }
      const bytes = safeFS.readFileBufferSync(targetPath);
      const actual = this.computeSha256(bytes);
      if (actual !== item.sha256) {
        mismatches.push({ filename: item.filename, expected: item.sha256, actual });
        diagnostics.push(`Ketidakcocokan SHA-256 pada '${item.filename}': diharapkan ${item.sha256}, aktual ${actual}`);
      }
    }

    if (mismatches.length === 0) {
      diagnostics.push(`Seluruh ${parsed.length} checksum SHA-256 terverifikasi cocok.`);
    }

    return {
      valid: mismatches.length === 0,
      checkedCount: parsed.length,
      mismatches,
      diagnostics,
    };
  }
}
