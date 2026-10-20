/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { PosisiSumber, formatPosisi } from '../lexer/posisi';

export enum JenisGalatModul {
  MODUL_TIDAK_DITEMUKAN = 'MODUL_TIDAK_DITEMUKAN',
  KETERGANTUNGAN_MELINGKAR = 'KETERGANTUNGAN_MELINGKAR',
  NAMA_MODUL_TIDAK_VALID = 'NAMA_MODUL_TIDAK_VALID',
  JALUR_TIDAK_AMAN = 'JALUR_TIDAK_AMAN',
  ANGGOTA_TIDAK_DITEMUKAN = 'ANGGOTA_TIDAK_DITEMUKAN',
  ANGGOTA_INTERNAL_TERLINDUNGI = 'ANGGOTA_INTERNAL_TERLINDUNGI',
  MODUL_RUSAK = 'MODUL_RUSAK',
}

/**
 * Representasi kesalahan resmi sistem modul Bahasa NUSANTARA (Phase 15).
 */
export class GalatModul extends Error {
  public readonly jenis: JenisGalatModul;
  public readonly posisi?: PosisiSumber;
  public readonly namaModul?: string;
  public readonly jalurDependensi?: string[];

  constructor(
    jenis: JenisGalatModul,
    pesan: string,
    posisi?: PosisiSumber,
    namaModul?: string,
    jalurDependensi?: string[]
  ) {
    const lokasiStr = posisi ? ` pada ${formatPosisi(posisi)}` : '';
    super(`Kesalahan modul${lokasiStr}:\n${pesan}`);
    this.name = 'GalatModul';
    this.jenis = jenis;
    this.posisi = posisi;
    this.namaModul = namaModul;
    this.jalurDependensi = jalurDependensi;
  }
}
