/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { PembacaBerkas, PembacaBerkasNode } from '../modul/pembacaBerkas';

/**
 * Pola konvensi berkas pengujian resmi Bahasa NUSANTARA (Phase 21).
 */
export const POLA_BERKAS_UJI_RESMI = [
  /\.uji\.nusantara$/,
  /_test\.nusantara$/,
  /\.test\.nusantara$/,
];

/**
 * Komponen Penemu Pengujian (Test Discovery) NUSANTARA.
 * Menemukan seluruh berkas uji yang valid tanpa mengeksekusi sembarang berkas program biasa.
 */
export class PenemuUji {
  private readonly pembaca: PembacaBerkas;

  constructor(pembaca?: PembacaBerkas) {
    this.pembaca = pembaca || new PembacaBerkasNode();
  }

  /**
   * Memeriksa apakah sebuah nama berkas memenuhi pola konvensi uji resmi.
   */
  public static apakahBerkasUji(namaBerkas: string): boolean {
    const namaKecil = namaBerkas.toLowerCase();
    return POLA_BERKAS_UJI_RESMI.some(pola => pola.test(namaKecil));
  }

  /**
   * Menemukan berkas pengujian dari target (alias temukan).
   */
  public temukan(targetPath?: string | string[], opsiFilter?: string): string[] {
    return this.temukanBerkasUji(targetPath, opsiFilter);
  }

  /**
   * Menemukan berkas pengujian dari target (bisa berupa nama berkas tunggal, direktori, atau daftar).
   */
  public temukanBerkasUji(targetPath?: string | string[], opsiFilter?: string): string[] {
    const hasilSet = new Set<string>();

    if (!targetPath || (Array.isArray(targetPath) && targetPath.length === 0)) {
      // Cari di direktori konvensional: 'tests', 'pengujian', dan akar proyek
      const direktoriStandar = ['tests', 'pengujian', 'examples/testing', '.'];
      for (const dir of direktoriStandar) {
        if (this.pembaca.apakahAda(dir)) {
          this.pindaiDirektori(dir, hasilSet);
        }
      }
    } else if (Array.isArray(targetPath)) {
      for (const t of targetPath) {
        this.prosesTargetTunggal(t, hasilSet);
      }
    } else {
      this.prosesTargetTunggal(targetPath, hasilSet);
    }

    const daftar = Array.from(hasilSet).sort();

    // Terapkan filter jika ada (--cari atau --filter)
    if (opsiFilter && opsiFilter.trim()) {
      const polaCari = opsiFilter.toLowerCase();
      return daftar.filter(jalur => jalur.toLowerCase().includes(polaCari));
    }

    return daftar;
  }

  private stripPrefix(jalur: string): string {
    let j = jalur.replace(/\\/g, '/');
    if (j.startsWith('/proyek/')) {
      j = j.slice('/proyek/'.length);
    } else if (j.startsWith('./')) {
      j = j.slice(2);
    }
    if (j.startsWith('/') && j.length > 1) {
      j = j.slice(1);
    }
    return j;
  }

  private prosesTargetTunggal(target: string, hasilSet: Set<string>): void {
    const targetBersih = this.stripPrefix(target);

    // Jika target langsung berupa berkas uji yang spesifik
    if (PenemuUji.apakahBerkasUji(targetBersih) || targetBersih.endsWith('.nusantara')) {
      if (this.pembaca.apakahAda(target)) {
        hasilSet.add(targetBersih);
        return;
      }
    }

    if (this.pembaca.apakahAda(target)) {
      const isDir =
        typeof (this.pembaca as any).apakahDirektori === 'function'
          ? (this.pembaca as any).apakahDirektori(target)
          : !target.endsWith('.nusantara');

      if (isDir) {
        this.pindaiDirektori(target, hasilSet);
        return;
      }
    } else {
      // Masih periksa apakah merupakan direktori virtual di memori
      this.pindaiDirektori(target, hasilSet);
    }
  }

  private pindaiDirektori(direktori: string, hasilSet: Set<string>, kedalaman: number = 0): void {
    if (kedalaman > 10) return; // Lindungi dari infinite loop atau symlink melingkar

    // Ambil daftar entri direktori
    if (typeof (this.pembaca as any).dapatkanSemuaBerkas === 'function') {
      // PembacaBerkasMemori: saring berkas yang berada di bawah direktori
      const semua = (this.pembaca as any).dapatkanSemuaBerkas() as Map<string, string>;
      const targetBersih = this.stripPrefix(direktori);
      for (const jalur of semua.keys()) {
        const jBersih = this.stripPrefix(jalur);
        if (
          jBersih.startsWith('node_modules/') ||
          jBersih.includes('/node_modules/') ||
          jBersih.startsWith('.git/') ||
          jBersih.includes('/.git/') ||
          jBersih.startsWith('dist/') ||
          jBersih.includes('/dist/') ||
          jBersih.startsWith('.aistudio/') ||
          jBersih.includes('/.aistudio/')
        ) {
          continue;
        }

        const cocokDirektori =
          targetBersih === '.' ||
          targetBersih === '' ||
          jBersih.startsWith(targetBersih.endsWith('/') ? targetBersih : targetBersih + '/') ||
          jBersih === targetBersih;

        if (cocokDirektori && PenemuUji.apakahBerkasUji(jBersih)) {
          hasilSet.add(jBersih);
        }
      }
      return;
    }

    let entri: string[] = [];
    if (typeof (this.pembaca as any).daftarDirektori === 'function') {
      try {
        entri = (this.pembaca as any).daftarDirektori(direktori) || [];
      } catch {
        entri = [];
      }
    }

    for (const item of entri) {
      // Abaikan node_modules, .git, dist, dan direktori build
      if (item === 'node_modules' || item === '.git' || item === 'dist' || item === '.aistudio') {
        continue;
      }

      const jalurLengkap = this.pembaca.gabungJalur(direktori, item);
      const isDir =
        typeof (this.pembaca as any).apakahDirektori === 'function'
          ? (this.pembaca as any).apakahDirektori(jalurLengkap)
          : false;

      if (isDir) {
        this.pindaiDirektori(jalurLengkap, hasilSet, kedalaman + 1);
      } else if (PenemuUji.apakahBerkasUji(item)) {
        hasilSet.add(this.stripPrefix(this.pembaca.normalisasiJalur(jalurLengkap)));
      }
    }
  }
}
