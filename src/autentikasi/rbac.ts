/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * NUSANTARA Programming Language - Authentication & Session Framework (Phase 31)
 * Pengendalian Akses Berbasis Peran & Izin (Role-Based Access Control - RBAC).
 */

export class ManajerRBAC {
  private tabelIzinPeran: Map<string, Set<string>> = new Map();

  constructor() {
    this.inisialisasiPeranBawaan();
  }

  private inisialisasiPeranBawaan(): void {
    // 1. Peran: pengguna biasa
    this.tabelIzinPeran.set(
      'pengguna',
      new Set(['artikel.baca', 'profil.baca', 'profil.ubah'])
    );

    // 2. Peran: editor
    this.tabelIzinPeran.set(
      'editor',
      new Set([
        'artikel.baca',
        'artikel.tulis',
        'artikel.edit',
        'profil.baca',
        'profil.ubah',
      ])
    );

    // 3. Peran: administrator (mencakup seluruh izin atau wildcard)
    this.tabelIzinPeran.set(
      'admin',
      new Set([
        '*', // Wildcard: seluruh izin diizinkan
        'artikel.baca',
        'artikel.tulis',
        'artikel.edit',
        'artikel.hapus',
        'pengguna.baca',
        'pengguna.edit',
        'pengguna.hapus',
        'pengaturan.ubah',
        'profil.baca',
        'profil.ubah',
      ])
    );
  }

  /**
   * Mendaftarkan atau memperluas peran dengan daftar izin tertentu.
   */
  public daftarkanPeran(namaPeran: string, daftarIzin: string[]): this {
    const peranBersih = namaPeran.trim().toLowerCase();
    const setIzin = this.tabelIzinPeran.get(peranBersih) ?? new Set();
    for (const izin of daftarIzin) {
      setIzin.add(izin.trim());
    }
    this.tabelIzinPeran.set(peranBersih, setIzin);
    return this;
  }

  /**
   * Memeriksa apakah suatu peran memiliki izin yang diminta.
   */
  public apakahMemilikiIzin(namaPeran: string, izinYangDiminta: string): boolean {
    const peranBersih = namaPeran.trim().toLowerCase();
    const setIzin = this.tabelIzinPeran.get(peranBersih);
    if (!setIzin) {
      return false;
    }

    if (setIzin.has('*') || setIzin.has(izinYangDiminta.trim())) {
      return true;
    }

    // Dukungan izin hierarki, misal 'artikel.*' mencakup 'artikel.baca'
    const bagian = izinYangDiminta.trim().split('.');
    if (bagian.length > 1) {
      const wildcardGrup = `${bagian[0]}.*`;
      if (setIzin.has(wildcardGrup)) {
        return true;
      }
    }

    return false;
  }

  /**
   * Memeriksa kecocokan peran.
   */
  public apakahCocokPeran(peranPengguna: string, peranDibutuhkan: string): boolean {
    if (peranPengguna === 'admin') return true; // Admin memiliki hierarki tertinggi
    return peranPengguna.trim().toLowerCase() === peranDibutuhkan.trim().toLowerCase();
  }
}
