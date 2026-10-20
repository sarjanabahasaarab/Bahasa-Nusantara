/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { PosisiSumber } from '../lexer/posisi';
import { NilaiRuntime } from './nilai';
import { GalatRuntime, JenisGalatRuntime } from './galat';
import { apakahKompatibel } from '../tipe/kompatibilitas';

export interface EntriSimbol {
  nilai: NilaiRuntime;
  tetap: boolean; // True jika dideklarasikan menggunakan kata kunci 'tetap'
  tipeData?: string;
}

/**
 * Lingkungan Ruang Nama dan Lingkup Variabel (Environment / Lexical Scope).
 */
export class Lingkungan {
  private simbol = new Map<string, EntriSimbol>();
  public readonly induk?: Lingkungan;

  constructor(induk?: Lingkungan) {
    this.induk = induk;
  }

  /**
   * Mendefinisikan variabel baru dalam lingkup saat ini.
   */
  public definisikan(
    nama: string,
    nilai: NilaiRuntime,
    tetap: boolean = false,
    tipeData?: string,
    posisi?: PosisiSumber
  ): void {
    // Validasi kompatibilitas tipe saat inisialisasi awal
    if (tipeData && !apakahKompatibel(tipeData, nilai.jenis)) {
      throw new GalatRuntime(
        JenisGalatRuntime.OPERASI_TIPE_TIDAK_VALID,
        `Variabel '${nama}' dideklarasikan bertipe '${tipeData}', tetapi diinisialisasi dengan nilai bertipe '${nilai.jenis}'.`,
        posisi
      );
    }

    this.simbol.set(nama, { nilai, tetap, tipeData: tipeData || nilai.jenis });
  }

  /**
   * Mengambil nilai variabel dari lingkup saat ini atau mencari ke lingkup induk.
   */
  public ambil(nama: string, posisi?: PosisiSumber): NilaiRuntime {
    if (this.simbol.has(nama)) {
      return this.simbol.get(nama)!.nilai;
    }

    if (this.induk) {
      return this.induk.ambil(nama, posisi);
    }

    throw new GalatRuntime(
      JenisGalatRuntime.VARIABEL_TIDAK_DITEMUKAN,
      `Variabel atau simbol '${nama}' belum didefinisikan.`,
      posisi
    );
  }

  /**
   * Mengambil tipe data variabel yang terdaftar.
   */
  public ambilTipe(nama: string): string | undefined {
    if (this.simbol.has(nama)) {
      return this.simbol.get(nama)!.tipeData;
    }
    if (this.induk) {
      return this.induk.ambilTipe(nama);
    }
    return undefined;
  }

  /**
   * Memeriksa apakah suatu variabel ditandai sebagai 'tetap' (konstan).
   */
  public apakahTetap(nama: string): boolean {
    if (this.simbol.has(nama)) {
      return this.simbol.get(nama)!.tetap;
    }
    if (this.induk) {
      return this.induk.apakahTetap(nama);
    }
    return false;
  }

  /**
   * Memperbarui nilai variabel yang sudah ada. Mencegah modifikasi pada konstanta 'tetap'.
   */
  public tetapkan(nama: string, nilaiBaru: NilaiRuntime, posisi?: PosisiSumber): void {
    if (this.simbol.has(nama)) {
      const entri = this.simbol.get(nama)!;
      if (entri.tetap) {
        throw new GalatRuntime(
          JenisGalatRuntime.KONSTANTA_DIUBAH,
          `Konstanta '${nama}' bersifat kekal (tetap) dan tidak dapat diubah nilainya.`,
          posisi
        );
      }

      // Validasi kompatibilitas tipe saat penugasan (assignment)
      if (entri.tipeData && !apakahKompatibel(entri.tipeData, nilaiBaru.jenis)) {
        throw new GalatRuntime(
          JenisGalatRuntime.OPERASI_TIPE_TIDAK_VALID,
          `Variabel '${nama}' bertipe ${entri.tipeData} tidak dapat menerima nilai bertipe ${nilaiBaru.jenis}.`,
          posisi
        );
      }

      entri.nilai = nilaiBaru;
      return;
    }

    if (this.induk) {
      this.induk.tetapkan(nama, nilaiBaru, posisi);
      return;
    }

    throw new GalatRuntime(
      JenisGalatRuntime.VARIABEL_TIDAK_DITEMUKAN,
      `Tidak dapat menetapkan nilai: Variabel '${nama}' belum dideklarasikan.`,
      posisi
    );
  }

  /**
   * Memeriksa apakah suatu simbol sudah ada di rantai lingkup.
   */
  public memiliki(nama: string): boolean {
    if (this.simbol.has(nama)) return true;
    if (this.induk) return this.induk.memiliki(nama);
    return false;
  }

  /**
   * Mengembalikan seluruh simbol langsung yang didefinisikan pada lingkup ini.
   */
  public dapatkanSemuaSimbol(): ReadonlyMap<string, EntriSimbol> {
    return this.simbol;
  }
}
