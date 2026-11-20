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
    if (j === '/proyek') return '.';
    if (j.startsWith('/proyek/')) {
      j = j.slice('/proyek/'.length);
    } else if (j.startsWith('./')) {
      j = j.slice(2);
    }
    // Jangan menghapus slash awal pada path absolut Node; path tersebut
    // harus tetap dapat dibaca oleh PembacaBerkasNode.
    return j;
  }

  private apakahDiBawahSymbolicLink(jalur: string): boolean {
    if (!this.pembaca.apakahSymbolicLink) return false;
    let induk = this.pembaca.direktoriDari(jalur);
    while (induk) {
      if (this.pembaca.apakahSymbolicLink(induk)) return true;
      const berikutnya = this.pembaca.direktoriDari(induk);
      if (!berikutnya || berikutnya === induk) break;
      induk = berikutnya;
    }
    return false;
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

  private pindaiDirektori(direktori: string, hasilSet: Set<string>): void {
    // Pembaca memori tidak memiliki struktur direktori fisik. Daftar berkas
    // diproses langsung, sementara jalur ancestor tetap diperiksa untuk symlink.
    if (typeof (this.pembaca as any).dapatkanSemuaBerkas === 'function') {
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
          jBersih.startsWith('build/') ||
          jBersih.includes('/build/') ||
          jBersih.startsWith('.aistudio/') ||
          jBersih.includes('/.aistudio/')
        ) continue;

        const cocokDirektori =
          targetBersih === '.' ||
          targetBersih === '' ||
          jBersih.startsWith(targetBersih.endsWith('/') ? targetBersih : targetBersih + '/') ||
          jBersih === targetBersih;

        if (
          cocokDirektori &&
          !this.apakahDiBawahSymbolicLink(jalur) &&
          PenemuUji.apakahBerkasUji(jBersih)
        ) {
          hasilSet.add(jBersih);
        }
      }
      return;
    }

    if (typeof (this.pembaca as any).daftarDirektori !== 'function') return;

    const tumpukan = [direktori];
    const direktoriDikunjungi = new Set<string>();
    const abaikan = new Set([
      'node_modules',
      '.git',
      'dist',
      'build',
      '.aistudio',
      'coverage',
      'vendor',
      'target',
    ]);

    while (tumpukan.length > 0) {
      const dir = tumpukan.pop()!;
      if (this.pembaca.apakahSymbolicLink?.(dir)) continue;

      let kunci: string;
      try {
        kunci = this.pembaca.jalurNyata
          ? this.pembaca.jalurNyata(dir)
          : this.pembaca.normalisasiJalur(this.pembaca.jalurAbsolut(dir));
      } catch {
        continue;
      }
      if (direktoriDikunjungi.has(kunci)) continue;
      direktoriDikunjungi.add(kunci);

      let entri: string[] = [];
      try {
        entri = (this.pembaca as any).daftarDirektori(dir) || [];
      } catch {
        continue;
      }

      for (const item of entri) {
        if (abaikan.has(item)) continue;
        const jalurLengkap = this.pembaca.gabungJalur(dir, item);
        if (this.pembaca.apakahSymbolicLink?.(jalurLengkap)) continue;

        const isDir =
          typeof (this.pembaca as any).apakahDirektori === 'function' &&
          (this.pembaca as any).apakahDirektori(jalurLengkap);

        if (isDir) {
          tumpukan.push(jalurLengkap);
        } else if (PenemuUji.apakahBerkasUji(item)) {
          hasilSet.add(this.stripPrefix(this.pembaca.normalisasiJalur(jalurLengkap)));
        }
      }
    }
  }}
