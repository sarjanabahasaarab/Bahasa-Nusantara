/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * NUSANTARA Programming Language - Phase 40
 * Validator Hasil Build Distribusi Mobile (Build Validator)
 */

import * as crypto from 'crypto';
import * as fs from 'fs';
import * as path from 'path';
import { ArtefakHasilDistribusi } from '../types';
import { ZipBuilder } from '../core/ZipBuilder';

export interface HasilValidasiBuildMobile {
  valid: boolean;
  adaBerkas: boolean;
  ukuranBytes: number;
  sha256Sah: boolean;
  zipSah?: boolean;
  pesan: string;
}

export class BuildValidator {
  public static verifikasiChecksumBerkas(jalurFile: string, expectedSha256: string): { cocok: boolean; aktualSha256: string } {
    const isi = fs.readFileSync(jalurFile);
    const aktualSha256 = crypto.createHash('sha256').update(isi).digest('hex');
    return {
      cocok: aktualSha256.toLowerCase() === expectedSha256.toLowerCase(),
      aktualSha256,
    };
  }

  public static buatSha256Sums(daftarArtefak: ArtefakHasilDistribusi[]): string {
    return daftarArtefak
      .filter((a) => a.sha256 && a.namaBerkas)
      .map((a) => `${a.sha256}  ${path.basename(a.namaBerkas)}`)
      .join('\n') + (daftarArtefak.length > 0 ? '\n' : '');
  }

  public static verifikasiSha256Sums(isiSums: string, direktoriArtefak: string): { valid: boolean; daftarGagal: string[] } {
    const daftarGagal: string[] = [];
    const baris = isiSums.split(/\r?\n/).map((b) => b.trim()).filter(Boolean);
    if (baris.length === 0) {
      return { valid: false, daftarGagal: ['Berkas SHA256SUMS kosong.'] };
    }

    const rootAbs = path.resolve(direktoriArtefak);
    for (const item of baris) {
      const m = item.match(/^([0-9a-fA-F]{64})\s+\*?(.+)$/);
      if (!m) {
        daftarGagal.push(`Baris format SHA256SUMS tidak sah: '${item}'`);
        continue;
      }
      const expected = m[1].toLowerCase();
      const relName = m[2].trim();
      if (relName.includes('..') || relName.startsWith('/') || relName.includes('\\') || relName.includes('\0')) {
        daftarGagal.push(`Jalur tidak aman dalam SHA256SUMS: '${relName}'`);
        continue;
      }
      const target = path.resolve(rootAbs, relName);
      if (!target.startsWith(rootAbs + path.sep) && target !== rootAbs) {
        daftarGagal.push(`Path traversal pada SHA256SUMS: '${relName}'`);
        continue;
      }
      if (!fs.existsSync(target)) {
        daftarGagal.push(`Berkas tidak ditemukan: '${relName}'`);
        continue;
      }
      const stat = fs.statSync(target);
      if (stat.isDirectory()) continue;
      const cek = BuildValidator.verifikasiChecksumBerkas(target, expected);
      if (!cek.cocok) {
        daftarGagal.push(`Checksum tidak cocok untuk '${relName}': diharapkan ${expected.slice(0, 12)}..., aktual ${cek.aktualSha256.slice(0, 12)}...`);
      }
    }

    return { valid: daftarGagal.length === 0, daftarGagal };
  }

  public static validasiArtefak(artefak: ArtefakHasilDistribusi): HasilValidasiBuildMobile {
    if (!artefak || !artefak.jalurLokal) {
      return {
        valid: false,
        adaBerkas: false,
        ukuranBytes: 0,
        sha256Sah: false,
        pesan: 'Informasi artefak build tidak lengkap atau jalur berkas null.',
      };
    }

    if (!fs.existsSync(artefak.jalurLokal)) {
      return {
        valid: false,
        adaBerkas: false,
        ukuranBytes: 0,
        sha256Sah: false,
        pesan: `Berkas artefak '${artefak.namaBerkas}' tidak ditemukan di lokasi: ${artefak.jalurLokal}`,
      };
    }

    try {
      const stat = fs.statSync(artefak.jalurLokal);
      const formatHex = Boolean(artefak.sha256 && /^[0-9a-fA-F]{64}$/.test(artefak.sha256));

      if (stat.isDirectory()) {
        const infoPlist = path.join(artefak.jalurLokal, 'Info.plist');
        const adaInfo = fs.existsSync(infoPlist) && fs.statSync(infoPlist).size > 0;
        const ok = adaInfo && formatHex;
        return {
          valid: ok,
          adaBerkas: adaInfo,
          ukuranBytes: adaInfo ? fs.statSync(infoPlist).size : 0,
          sha256Sah: formatHex,
          pesan: ok
            ? `Direktori arsip '${artefak.namaBerkas}' sah (Info.plist terverifikasi).`
            : `Direktori arsip '${artefak.namaBerkas}' tidak lengkap (Info.plist atau digest tidak sah).`,
        };
      }

      const adaBerkas = stat.size > 0;
      const isiBytes = fs.readFileSync(artefak.jalurLokal);
      const actualHash = crypto.createHash('sha256').update(isiBytes).digest('hex');
      const sha256Sah = formatHex && actualHash.toLowerCase() === artefak.sha256.toLowerCase();

      let zipSah = true;
      let zipGalat = '';
      if (artefak.format === 'apk' || artefak.format === 'aab') {
        const cekZip = ZipBuilder.validasiDanBacaArsipZip(new Uint8Array(isiBytes));
        zipSah = cekZip.valid;
        zipGalat = cekZip.galat || '';
      }

      const valid = adaBerkas && sha256Sah && zipSah;
      return {
        valid,
        adaBerkas,
        ukuranBytes: stat.size,
        sha256Sah,
        zipSah,
        pesan: valid
          ? `Artefak '${artefak.namaBerkas}' sah (${(stat.size / 1024).toFixed(1)} KB, sha256: ${artefak.sha256.substring(0, 12)}...)`
          : !sha256Sah
          ? `Integritas SHA-256 artefak '${artefak.namaBerkas}' tidak cocok (kemungkinan berkas berubah/korup).`
          : `Struktur arsip '${artefak.namaBerkas}' tidak valid: ${zipGalat}`,
      };
    } catch (err: any) {
      return {
        valid: false,
        adaBerkas: false,
        ukuranBytes: 0,
        sha256Sah: false,
        pesan: `Gagal membaca artefak: ${err.message}`,
      };
    }
  }
}
