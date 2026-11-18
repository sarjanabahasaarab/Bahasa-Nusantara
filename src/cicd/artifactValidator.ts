/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Validator Integritas Bundel Artefak, Manifest, SHA256SUMS, & Kejujuran Struktural vs Native
 * NUSANTARA Phase 23.16
 */

import * as fs from 'node:fs';
import * as path from 'node:path';
import * as crypto from 'node:crypto';

export interface EntriManifestArtefak {
  nama: string;
  jalurRelatif: string;
  ukuranByte: number;
  sha256: string;
  jenisArtefak: string;
  kategoriBuild: 'runtime-output' | 'archive-bundle' | 'structural' | 'native-binary' | string;
  nativeBinary: boolean;
  statusValidasi: string;
  catatan?: string;
}

export interface ManifestBundelArtefak {
  schemaVersion: number;
  generatedAt: string;
  totalArtefak: number;
  peringatanKeterbatasan?: string;
  artefak: EntriManifestArtefak[];
}

export interface TemuanIntegritasArtefak {
  kode:
    | 'DIREKTORI_HILANG'
    | 'MANIFEST_HILANG'
    | 'MANIFEST_RUSAK'
    | 'SHA256SUMS_HILANG'
    | 'SHA256SUMS_RUSAK'
    | 'PATH_TRAVERSAL'
    | 'SYMLINK_ESCAPE'
    | 'DUPLIKAT_JALUR'
    | 'BERKAS_HILANG'
    | 'UKURAN_TIDAK_COCOK'
    | 'SHA256_TIDAK_COCOK'
    | 'BERKAS_YATIM'
    | 'KLAIM_NATIVE_PALSU'
    | 'JUMLAH_TIDAK_COCOK';
  jalur?: string;
  pesan: string;
}

export interface HasilValidasiBundelArtefak {
  valid: boolean;
  direktori: string;
  manifestAda: boolean;
  sha256SumsAda: boolean;
  totalManifest: number;
  totalDisk: number;
  jumlahStruktural: number;
  jumlahNativeBinary: number;
  sha256Manifest: string;
  sha256SumsFile: string;
  temuan: TemuanIntegritasArtefak[];
}

const SHA256_RE = /^[a-f0-9]{64}$/i;

function computeSha256(buf: Buffer): string {
  return crypto.createHash('sha256').update(buf).digest('hex');
}

function walkFilesRelative(rootAbs: string, currentAbs: string, out: string[]): void {
  const entries = fs.readdirSync(currentAbs, { withFileTypes: true });
  for (const ent of entries) {
    const full = path.join(currentAbs, ent.name);
    const lstat = fs.lstatSync(full);
    if (lstat.isSymbolicLink()) {
      const targetReal = fs.realpathSync(full);
      const rootReal = fs.realpathSync(rootAbs);
      if (targetReal !== rootReal && !targetReal.startsWith(rootReal + path.sep)) {
        throw new Error(`SYMLINK_ESCAPE:${path.relative(rootAbs, full)}`);
      }
      if (fs.statSync(full).isDirectory()) {
        walkFilesRelative(rootAbs, full, out);
      } else {
        out.push(path.relative(rootAbs, full).split(path.sep).join('/'));
      }
      continue;
    }
    if (ent.isDirectory()) {
      walkFilesRelative(rootAbs, full, out);
    } else if (ent.isFile()) {
      out.push(path.relative(rootAbs, full).split(path.sep).join('/'));
    }
  }
}

/**
 * Memastikan jalur relatif tidak mengandung path traversal, null byte, jalur absolut, atau keluar dari direktori root.
 */
export function validasiJalurRelatifAman(
  rootAbs: string,
  rootReal: string,
  rawRel: string
): { aman: boolean; jalurBersih?: string; alasan?: string; kode?: 'PATH_TRAVERSAL' | 'SYMLINK_ESCAPE' } {
  if (typeof rawRel !== 'string' || !rawRel.trim()) {
    return { aman: false, kode: 'PATH_TRAVERSAL', alasan: 'Jalur relatif kosong.' };
  }
  if (rawRel.includes('\0')) {
    return { aman: false, kode: 'PATH_TRAVERSAL', alasan: `Null byte terdeteksi pada jalur '${rawRel}'.` };
  }
  if (rawRel.startsWith('/') || rawRel.startsWith('\\') || /^[A-Za-z]:/.test(rawRel) || path.isAbsolute(rawRel)) {
    return { aman: false, kode: 'PATH_TRAVERSAL', alasan: `Jalur absolut terlarang: '${rawRel}'.` };
  }
  const segments = rawRel.replace(/\\/g, '/').split('/');
  if (segments.some((s) => s === '..' || s === '.' || s === '')) {
    return { aman: false, kode: 'PATH_TRAVERSAL', alasan: `Segmen traversal tidak diizinkan pada '${rawRel}'.` };
  }
  const resolved = path.resolve(rootAbs, ...segments);
  const relBack = path.relative(rootAbs, resolved);
  if (!relBack || relBack.startsWith('..') || path.isAbsolute(relBack)) {
    return { aman: false, kode: 'PATH_TRAVERSAL', alasan: `Jalur keluar dari direktori artefak: '${rawRel}'.` };
  }
  if (fs.existsSync(resolved)) {
    const lstat = fs.lstatSync(resolved);
    if (lstat.isSymbolicLink()) {
      const targetReal = fs.realpathSync(resolved);
      if (!targetReal.startsWith(rootReal + path.sep)) {
        return { aman: false, kode: 'SYMLINK_ESCAPE', alasan: `Symlink keluar dari direktori artefak: '${rawRel}'.` };
      }
    }
  }
  return { aman: true, jalurBersih: segments.join('/') };
}

/**
 * Memeriksa apakah arsip ZIP/APK/AAB mengandung entri classes.dex nyata.
 */
export function periksaArsipZipMengandungEntri(zipPath: string, entryName: string): boolean {
  if (!fs.existsSync(zipPath)) return false;
  const buf = fs.readFileSync(zipPath);
  if (buf.byteLength < 4 || buf[0] !== 0x50 || buf[1] !== 0x4b || buf[2] !== 0x03 || buf[3] !== 0x04) {
    return false;
  }
  return buf.includes(Buffer.from(entryName, 'utf-8'));
}

/**
 * Memeriksa header magic Mach-O pada biner macOS/iOS.
 */
export function periksaHeaderMachO(filePath: string): { valid: boolean; arch?: string } {
  if (!fs.existsSync(filePath)) return { valid: false };
  const buf = fs.readFileSync(filePath);
  if (buf.byteLength < 4) return { valid: false };
  const magicBE = buf.readUInt32BE(0);
  const magicLE = buf.readUInt32LE(0);
  if (magicLE === 0xfeedfacf || magicBE === 0xfeedfacf) {
    const cputype = buf.byteLength >= 8 ? buf.readUInt32LE(4) : 0;
    const arch = cputype === 0x0100000c ? 'arm64' : cputype === 0x01000007 ? 'x86_64' : 'macho64';
    return { valid: true, arch };
  }
  if (magicBE === 0xcafebabe || magicBE === 0xcafed00d) {
    return { valid: true, arch: 'universal' };
  }
  return { valid: false };
}

/**
 * Memvalidasi keutuhan lengkap direktori bundel artefak (manifest.json, SHA256SUMS, ukuran, hash, anti-traversal, anti-yatim, kejujuran struktural vs native).
 */
export function validasiIntegritasBundelArtefak(
  artifactDir: string,
  options: { strictStructuralSeparation?: boolean; minimumArtifacts?: number } = {}
): HasilValidasiBundelArtefak {
  const temuan: TemuanIntegritasArtefak[] = [];
  const rootAbs = path.resolve(artifactDir);

  if (!fs.existsSync(rootAbs) || !fs.statSync(rootAbs).isDirectory()) {
    return {
      valid: false,
      direktori: rootAbs,
      manifestAda: false,
      sha256SumsAda: false,
      totalManifest: 0,
      totalDisk: 0,
      jumlahStruktural: 0,
      jumlahNativeBinary: 0,
      sha256Manifest: '',
      sha256SumsFile: '',
      temuan: [{ kode: 'DIREKTORI_HILANG', jalur: rootAbs, pesan: `Direktori artefak tidak ditemukan: ${rootAbs}` }],
    };
  }

  const rootReal = fs.realpathSync(rootAbs);
  const manifestPath = path.join(rootAbs, 'manifest.json');
  const sumsPath = path.join(rootAbs, 'SHA256SUMS');
  const manifestAda = fs.existsSync(manifestPath);
  const sha256SumsAda = fs.existsSync(sumsPath);

  if (!manifestAda) {
    temuan.push({ kode: 'MANIFEST_HILANG', jalur: 'manifest.json', pesan: 'manifest.json tidak ditemukan.' });
  }
  if (!sha256SumsAda) {
    temuan.push({ kode: 'SHA256SUMS_HILANG', jalur: 'SHA256SUMS', pesan: 'SHA256SUMS tidak ditemukan.' });
  }

  let sha256Manifest = '';
  let sha256SumsFile = '';
  let manifest: ManifestBundelArtefak | null = null;

  if (manifestAda) {
    const mfBuf = fs.readFileSync(manifestPath);
    sha256Manifest = computeSha256(mfBuf);
    try {
      manifest = JSON.parse(mfBuf.toString('utf-8')) as ManifestBundelArtefak;
      if (!manifest || !Array.isArray(manifest.artefak)) {
        temuan.push({ kode: 'MANIFEST_RUSAK', jalur: 'manifest.json', pesan: 'Field artefak pada manifest.json tidak valid.' });
        manifest = null;
      } else if (typeof manifest.totalArtefak === 'number' && manifest.totalArtefak !== manifest.artefak.length) {
        temuan.push({
          kode: 'JUMLAH_TIDAK_COCOK',
          jalur: 'manifest.json',
          pesan: `totalArtefak (${manifest.totalArtefak}) tidak sama dengan panjang array artefak (${manifest.artefak.length}).`,
        });
      }
    } catch (err: any) {
      temuan.push({
        kode: 'MANIFEST_RUSAK',
        jalur: 'manifest.json',
        pesan: `manifest.json gagal diparsing: ${err?.message || err}`,
      });
    }
  }

  const manifestMap = new Map<string, EntriManifestArtefak>();
  let jumlahStruktural = 0;
  let jumlahNativeBinary = 0;

  if (manifest) {
    if (options.minimumArtifacts && manifest.artefak.length < options.minimumArtifacts) {
      temuan.push({
        kode: 'JUMLAH_TIDAK_COCOK',
        jalur: 'manifest.json',
        pesan: `Jumlah artefak (${manifest.artefak.length}) kurang dari batas minimum (${options.minimumArtifacts}).`,
      });
    }

    for (const ent of manifest.artefak) {
      const checkPath = validasiJalurRelatifAman(rootAbs, rootReal, ent.jalurRelatif);
      if (!checkPath.aman || !checkPath.jalurBersih) {
        temuan.push({
          kode: checkPath.kode || 'PATH_TRAVERSAL',
          jalur: String(ent.jalurRelatif),
          pesan: checkPath.alasan || 'Jalur artefak tidak aman.',
        });
        continue;
      }
      if (manifestMap.has(checkPath.jalurBersih)) {
        temuan.push({
          kode: 'DUPLIKAT_JALUR',
          jalur: checkPath.jalurBersih,
          pesan: `Duplikat entri manifest untuk '${checkPath.jalurBersih}'.`,
        });
        continue;
      }
      manifestMap.set(checkPath.jalurBersih, ent);

      if (ent.kategoriBuild === 'structural' || ent.jenisArtefak?.includes('structural')) {
        jumlahStruktural++;
      }
      if (ent.nativeBinary) {
        jumlahNativeBinary++;
      }

      const full = path.join(rootAbs, checkPath.jalurBersih);
      if (!fs.existsSync(full)) {
        temuan.push({
          kode: 'BERKAS_HILANG',
          jalur: checkPath.jalurBersih,
          pesan: `Berkas tercatat di manifest tidak ditemukan di disk: ${checkPath.jalurBersih}`,
        });
        continue;
      }

      const buf = fs.readFileSync(full);
      if (buf.byteLength !== ent.ukuranByte) {
        temuan.push({
          kode: 'UKURAN_TIDAK_COCOK',
          jalur: checkPath.jalurBersih,
          pesan: `Ukuran '${checkPath.jalurBersih}' di disk (${buf.byteLength} B) != manifest (${ent.ukuranByte} B).`,
        });
      }
      const actualSha = computeSha256(buf);
      if (!SHA256_RE.test(ent.sha256 || '') || actualSha !== ent.sha256.toLowerCase()) {
        temuan.push({
          kode: 'SHA256_TIDAK_COCOK',
          jalur: checkPath.jalurBersih,
          pesan: `SHA-256 '${checkPath.jalurBersih}' tidak cocok dengan manifest.`,
        });
      }

      // Enforce honesty between structural artifacts and compiled native binaries
      if (options.strictStructuralSeparation !== false) {
        const lower = checkPath.jalurBersih.toLowerCase();
        if (
          (ent.kategoriBuild === 'structural' || ent.jenisArtefak?.includes('structural')) &&
          ent.nativeBinary === true
        ) {
          temuan.push({
            kode: 'KLAIM_NATIVE_PALSU',
            jalur: checkPath.jalurBersih,
            pesan: `Artefak struktural '${checkPath.jalurBersih}' dilarang mengklaim nativeBinary=true.`,
          });
        }
        if ((lower.endsWith('.apk') || lower.endsWith('.aab')) && ent.nativeBinary === true) {
          const hasDex = periksaArsipZipMengandungEntri(full, 'classes.dex');
          if (!hasDex) {
            temuan.push({
              kode: 'KLAIM_NATIVE_PALSU',
              jalur: checkPath.jalurBersih,
              pesan: `Arsip '${checkPath.jalurBersih}' mengklaim nativeBinary=true padahal tidak mengandung classes.dex.`,
            });
          }
        }
        if (lower.endsWith('info.plist') && ent.nativeBinary === true) {
          temuan.push({
            kode: 'KLAIM_NATIVE_PALSU',
            jalur: checkPath.jalurBersih,
            pesan: `Berkas '${checkPath.jalurBersih}' adalah plist struktural, bukan biner Mach-O native.`,
          });
        }
      }
    }
  }

  const shaMap = new Map<string, string>();
  if (sha256SumsAda) {
    const sumsBuf = fs.readFileSync(sumsPath);
    sha256SumsFile = computeSha256(sumsBuf);
    const lines = sumsBuf
      .toString('utf-8')
      .split(/\r?\n/)
      .map((l) => l.trimEnd())
      .filter((l) => l.length > 0);

    for (const line of lines) {
      const m = line.match(/^([a-f0-9]{64})\s{2}(.+)$/i);
      if (!m) {
        temuan.push({
          kode: 'SHA256SUMS_RUSAK',
          jalur: 'SHA256SUMS',
          pesan: `Baris SHA256SUMS tidak berformat '<64-hex>  <path>': '${line}'`,
        });
        continue;
      }
      const [, expectedSha, rawRel] = m;
      const checkPath = validasiJalurRelatifAman(rootAbs, rootReal, rawRel);
      if (!checkPath.aman || !checkPath.jalurBersih) {
        temuan.push({
          kode: checkPath.kode || 'PATH_TRAVERSAL',
          jalur: rawRel,
          pesan: checkPath.alasan || 'Jalur pada SHA256SUMS tidak aman.',
        });
        continue;
      }
      if (shaMap.has(checkPath.jalurBersih)) {
        temuan.push({
          kode: 'DUPLIKAT_JALUR',
          jalur: checkPath.jalurBersih,
          pesan: `Duplikat entri di SHA256SUMS: '${checkPath.jalurBersih}'.`,
        });
        continue;
      }
      shaMap.set(checkPath.jalurBersih, expectedSha.toLowerCase());

      const full = path.join(rootAbs, checkPath.jalurBersih);
      if (!fs.existsSync(full)) {
        temuan.push({
          kode: 'BERKAS_HILANG',
          jalur: checkPath.jalurBersih,
          pesan: `Berkas di SHA256SUMS tidak ditemukan di disk: ${checkPath.jalurBersih}`,
        });
      } else {
        const actualSha = computeSha256(fs.readFileSync(full));
        if (actualSha !== expectedSha.toLowerCase()) {
          temuan.push({
            kode: 'SHA256_TIDAK_COCOK',
            jalur: checkPath.jalurBersih,
            pesan: `Digest SHA256SUMS tidak cocok untuk '${checkPath.jalurBersih}'.`,
          });
        }
      }
    }

    if (manifest) {
      for (const rel of manifestMap.keys()) {
        if (!shaMap.has(rel)) {
          temuan.push({
            kode: 'JUMLAH_TIDAK_COCOK',
            jalur: rel,
            pesan: `Berkas '${rel}' tercatat di manifest.json tetapi tidak ada di SHA256SUMS.`,
          });
        }
      }
      for (const rel of shaMap.keys()) {
        if (!manifestMap.has(rel)) {
          temuan.push({
            kode: 'JUMLAH_TIDAK_COCOK',
            jalur: rel,
            pesan: `Berkas '${rel}' tercatat di SHA256SUMS tetapi tidak ada di manifest.json.`,
          });
        }
      }
    }
  }

  let diskFiles: string[] = [];
  try {
    walkFilesRelative(rootAbs, rootAbs, diskFiles);
  } catch (err: any) {
    const msg = String(err?.message || err);
    temuan.push({
      kode: msg.startsWith('SYMLINK_ESCAPE:') ? 'SYMLINK_ESCAPE' : 'PATH_TRAVERSAL',
      jalur: msg.replace(/^SYMLINK_ESCAPE:/, ''),
      pesan: `Pelanggaran jalur/symlink saat memindai direktori artefak: ${msg}`,
    });
  }

  const diskArtifacts = diskFiles.filter((f) => f !== 'manifest.json' && f !== 'SHA256SUMS');
  if (manifest) {
    for (const df of diskArtifacts) {
      if (!manifestMap.has(df)) {
        temuan.push({
          kode: 'BERKAS_YATIM',
          jalur: df,
          pesan: `Berkas basi/yatim di disk tidak terdaftar di manifest.json: ${df}`,
        });
      }
    }
  }

  return {
    valid: temuan.length === 0,
    direktori: rootAbs,
    manifestAda,
    sha256SumsAda,
    totalManifest: manifest?.artefak.length ?? 0,
    totalDisk: diskArtifacts.length,
    jumlahStruktural,
    jumlahNativeBinary,
    sha256Manifest,
    sha256SumsFile,
    temuan,
  };
}
