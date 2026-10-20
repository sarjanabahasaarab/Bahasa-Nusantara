/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { PosisiSumber, formatPosisi } from '../lexer/posisi';
import { NamaTipe } from './jenisTipe';

export enum JenisGalatTipe {
  KETIDAKCOCOKAN_TIPE = 'KETIDAKCOCOKAN_TIPE',
  TIPE_TIDAK_DIKENAL = 'TIPE_TIDAK_DIKENAL',
  OPERATOR_TIDAK_DIDUKUNG = 'OPERATOR_TIDAK_DIDUKUNG',
  DEKLARASI_GANDA = 'DEKLARASI_GANDA',
  MODIFIKASI_TETAP = 'MODIFIKASI_TETAP',
  ARGUMEN_TIDAK_SESUAI = 'ARGUMEN_TIDAK_SESUAI',
  KEMBALIAN_TIDAK_SESUAI = 'KEMBALIAN_TIDAK_SESUAI',
  VARIABEL_BELUM_DIDEKLARASIKAN = 'VARIABEL_BELUM_DIDEKLARASIKAN',
  KENDALI_DI_LUAR_KONTEKS = 'KENDALI_DI_LUAR_KONTEKS',
  FUNGSI_TIDAK_DITEMUKAN = 'FUNGSI_TIDAK_DITEMUKAN',
  TIPE_BUKAN_KOLEKSI = 'TIPE_BUKAN_KOLEKSI',
  INDEKS_TIDAK_SESUAI = 'INDEKS_TIDAK_SESUAI',
  MODUL_TIDAK_DITEMUKAN = 'MODUL_TIDAK_DITEMUKAN',
  ANGGOTA_MODUL_TIDAK_DITEMUKAN = 'ANGGOTA_MODUL_TIDAK_DITEMUKAN',
  AKSES_ANGGOTA_BUKAN_MODUL = 'AKSES_ANGGOTA_BUKAN_MODUL',
  ANGGOTA_INTERNAL_TERLINDUNGI = 'ANGGOTA_INTERNAL_TERLINDUNGI',
}

export class GalatTipe extends Error {
  public readonly jenis: JenisGalatTipe;
  public readonly posisi?: PosisiSumber;
  public readonly tipeDiharapkan?: string | NamaTipe;
  public readonly tipeAktual?: string | NamaTipe;

  constructor(
    jenis: JenisGalatTipe,
    pesan: string,
    posisi?: PosisiSumber,
    tipeDiharapkan?: string | NamaTipe,
    tipeAktual?: string | NamaTipe
  ) {
    const lokasiStr = posisi ? ` pada ${formatPosisi(posisi)}` : '';
    super(`Kesalahan tipe${lokasiStr}: ${pesan}`);
    this.name = 'GalatTipe';
    this.jenis = jenis;
    this.posisi = posisi;
    this.tipeDiharapkan = tipeDiharapkan;
    this.tipeAktual = tipeAktual;
  }
}

export function buatGalatKetidakcocokanTipe(
  konteks: string,
  diharapkan: string | NamaTipe,
  aktual: string | NamaTipe,
  posisi?: PosisiSumber
): GalatTipe {
  return new GalatTipe(
    JenisGalatTipe.KETIDAKCOCOKAN_TIPE,
    `${konteks} membutuhkan tipe '${diharapkan}', tetapi menerima tipe '${aktual}'.`,
    posisi,
    diharapkan,
    aktual
  );
}
