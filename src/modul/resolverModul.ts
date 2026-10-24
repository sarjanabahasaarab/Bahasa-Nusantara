/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { PembacaBerkas } from './pembacaBerkas';
import { GalatModul, JenisGalatModul } from './galatModul';
import { PosisiSumber } from '../lexer/posisi';

export interface OpsiResolverModul {
  direktoriAkarProyek?: string;
  direktoriModulTambahan?: string[];
}

/**
 * Resolver Modul Resmi Bahasa NUSANTARA (Phase 15).
 * Menentukan jalur berkas modul secara aman dan mencegah serangan path traversal.
 */
export class ResolverModul {
  private readonly pembaca: PembacaBerkas;
  private readonly direktoriAkarProyek: string;
  private readonly direktoriPencarian: string[];

  constructor(pembaca: PembacaBerkas, opsi?: OpsiResolverModul) {
    this.pembaca = pembaca;
    const akar = opsi?.direktoriAkarProyek || (typeof process !== 'undefined' && process.cwd ? process.cwd() : '/proyek');
    this.direktoriAkarProyek = this.pembaca.jalurAbsolut(akar);

    this.direktoriPencarian = [
      this.direktoriAkarProyek,
      ...(opsi?.direktoriModulTambahan || []).map(d => this.pembaca.jalurAbsolut(d)),
    ];
  }

  /**
   * Mengembalikan direktori akar proyek yang diawasi.
   */
  public dapatkanDirektoriAkar(): string {
    return this.direktoriAkarProyek;
  }

  /**
   * Memvalidasi apakah sebuah jalur aman dan berada di dalam batas akar proyek.
   */
  public periksaKeamananJalur(jalurTujuan: string, namaAsli: string, posisi?: PosisiSumber): void {
    const absolut = this.pembaca.jalurAbsolut(jalurTujuan);
    const akarNorm = this.pembaca.normalisasiJalur(this.direktoriAkarProyek);
    const tujuanNorm = this.pembaca.normalisasiJalur(absolut);

    // Mencegah traversal melampaui direktori akar proyek
    if (!tujuanNorm.startsWith(akarNorm) && !akarNorm.startsWith(tujuanNorm)) {
      throw new GalatModul(
        JenisGalatModul.JALUR_TIDAK_AMAN,
        `Pelanggaran keamanan jalur direktori (path traversal) terdeteksi pada '${namaAsli}'. Akses berkas di luar batas proyek tidak diizinkan demi keamanan eksekusi.`,
        posisi,
        namaAsli
      );
    }
  }

  /**
   * Menyelesaikan nama modul atau jalur relatif menjadi jalur berkas kanonikal yang sah.
   */
  public selesaikan(
    namaAtauJalur: string,
    direktoriPemanggil?: string,
    posisi?: PosisiSumber
  ): string {
    const namaBersih = namaAtauJalur.trim();

    if (!namaBersih) {
      throw new GalatModul(
        JenisGalatModul.NAMA_MODUL_TIDAK_VALID,
        `Nama atau jalur modul tidak boleh kosong.`,
        posisi
      );
    }

    // Deteksi awal path traversal kotor
    if (namaBersih.includes('../') || namaBersih.includes('..\\') || namaBersih === '..') {
      const dirPemberi = direktoriPemanggil ? this.pembaca.jalurAbsolut(direktoriPemanggil) : this.direktoriAkarProyek;
      const jalurUji = this.pembaca.gabungJalur(dirPemberi, namaBersih);
      this.periksaKeamananJalur(jalurUji, namaBersih, posisi);
    }

    const daftarKandidat: string[] = [];

    const apakahJalurEksplisit =
      namaBersih.startsWith('./') ||
      namaBersih.startsWith('.\\') ||
      namaBersih.startsWith('/') ||
      namaBersih.includes('/') ||
      namaBersih.includes('\\');

    if (apakahJalurEksplisit) {
      const basis = direktoriPemanggil ? this.pembaca.jalurAbsolut(direktoriPemanggil) : this.direktoriAkarProyek;
      const basisGabung = this.pembaca.gabungJalur(basis, namaBersih);

      daftarKandidat.push(basisGabung);
      if (!basisGabung.endsWith('.nusantara')) {
        daftarKandidat.push(`${basisGabung}.nusantara`);
      }
      daftarKandidat.push(this.pembaca.gabungJalur(basisGabung, 'modul.nusantara'));
      daftarKandidat.push(this.pembaca.gabungJalur(basisGabung, 'index.nusantara'));
    } else {
      // Pencarian berbasis nama identifier (misal: 'matematika')
      const daftarBasis: string[] = [];
      if (direktoriPemanggil) {
        daftarBasis.push(this.pembaca.jalurAbsolut(direktoriPemanggil));
      }
      for (const dir of this.direktoriPencarian) {
        if (!daftarBasis.includes(dir)) {
          daftarBasis.push(dir);
        }
      }

      for (const basis of daftarBasis) {
        daftarKandidat.push(this.pembaca.gabungJalur(basis, `${namaBersih}.nusantara`));
        daftarKandidat.push(this.pembaca.gabungJalur(basis, namaBersih));
        daftarKandidat.push(this.pembaca.gabungJalur(basis, namaBersih, 'modul.nusantara'));
        daftarKandidat.push(this.pembaca.gabungJalur(basis, namaBersih, 'index.nusantara'));
        daftarKandidat.push(this.pembaca.gabungJalur(basis, namaBersih, 'src', `${namaBersih}.nusantara`));
        daftarKandidat.push(this.pembaca.gabungJalur(basis, namaBersih, 'src', 'utama.nusantara'));

        // Integrasi Paket Terpasang NUSANTARA (Phase 16: .nusantara/paket/ & paket/)
        daftarKandidat.push(
          this.pembaca.gabungJalur(basis, '.nusantara', 'paket', namaBersih, 'src', `${namaBersih}.nusantara`)
        );
        daftarKandidat.push(
          this.pembaca.gabungJalur(basis, '.nusantara', 'paket', namaBersih, `${namaBersih}.nusantara`)
        );
        daftarKandidat.push(
          this.pembaca.gabungJalur(basis, '.nusantara', 'paket', namaBersih, 'modul.nusantara')
        );
        daftarKandidat.push(
          this.pembaca.gabungJalur(basis, '.nusantara', 'paket', namaBersih, 'src', 'utama.nusantara')
        );
        daftarKandidat.push(
          this.pembaca.gabungJalur(basis, 'paket', namaBersih, 'src', `${namaBersih}.nusantara`)
        );
        daftarKandidat.push(
          this.pembaca.gabungJalur(basis, 'paket', namaBersih, `${namaBersih}.nusantara`)
        );
      }
    }

    // Periksa setiap kandidat
    for (const jalurKandidat of daftarKandidat) {
      const jalurAbsolut = this.pembaca.jalurAbsolut(jalurKandidat);
      this.periksaKeamananJalur(jalurAbsolut, namaBersih, posisi);

      if (this.pembaca.apakahAda(jalurAbsolut)) {
        return jalurAbsolut;
      }
    }

    // Jika tidak ditemukan satupun, lemparkan galat Bahasa Indonesia yang terstruktur
    const kandidatUnik = Array.from(new Set(daftarKandidat.map(k => this.pembaca.jalurAbsolut(k))));
    const pesanLokasi = kandidatUnik.map(k => `  - ${k}`).join('\n');

    throw new GalatModul(
      JenisGalatModul.MODUL_TIDAK_DITEMUKAN,
      `modul '${namaBersih}' tidak ditemukan.\nLokasi pencarian yang diperiksa:\n${pesanLokasi}`,
      posisi,
      namaBersih
    );
  }
}
