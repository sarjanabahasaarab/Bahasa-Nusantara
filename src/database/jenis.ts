/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * NUSANTARA Programming Language - Database API & Data Access (Phase 29)
 * Definisi antarmuka adaptor basis data dan tipe data terkait.
 */

export type TipeParameterSQL = string | number | boolean | null | bigint | Uint8Array;

export type ParameterBindingSQL =
  | TipeParameterSQL[]
  | Record<string, TipeParameterSQL>;

export interface HasilEksekusiBasisdata {
  barisTerpengaruh: number;
  idTerakhir?: number | bigint;
  sukses: boolean;
}

export interface OpsiKoneksiBasisdata {
  jalur: string; // ":memory:" atau jalur berkas
  modeBuka?: 'baca_tulis' | 'baca_saja' | 'buat_baru';
  batasWaktuMilidetik?: number;
  direktoriAman?: string; // Root sandbox untuk pencegahan path traversal
}

export enum JenisGalatBasisdata {
  KONEKSI_GAGAL = 'KONEKSI_GAGAL',
  KONEKSI_TUTUP = 'KONEKSI_TUTUP',
  SINTAKS_SQL = 'SINTAKS_SQL',
  KEKANGAN_TERLANGGAR = 'KEKANGAN_TERLANGGAR',
  PARAMETER_TIDAK_VALID = 'PARAMETER_TIDAK_VALID',
  TRANSAKSI_GAGAL = 'TRANSAKSI_GAGAL',
  AKSES_JALUR_ILEGAL = 'AKSES_JALUR_ILEGAL',
  TIPE_TIDAK_DIDUKUNG = 'TIPE_TIDAK_DIDUKUNG',
  DRIVER_TIDAK_TERSEDIA = 'DRIVER_TIDAK_TERSEDIA',
}

export class GalatBasisdata extends Error {
  constructor(
    public readonly jenis: JenisGalatBasisdata,
    pesan: string,
    public readonly sqlAsli?: string,
    public readonly detailAsli?: unknown
  ) {
    super(`[Basisdata: ${jenis}] ${pesan}`);
    this.name = 'GalatBasisdata';
  }
}

/**
 * Antarmuka standar Adaptor Basis Data NUSANTARA.
 * Memungkinkan implementasi multi-driver (SQLite, PostgreSQL, MySQL, mock in-memory).
 */
export interface AdaptorBasisdata {
  readonly namaDriver: string;
  readonly versiDriver: string;

  apakahTerbuka(): boolean;
  buka(opsi: OpsiKoneksiBasisdata): void;
  tutup(): void;

  eksekusi(sql: string, parameter?: ParameterBindingSQL): HasilEksekusiBasisdata;
  ambilSemua<T = Record<string, unknown>>(sql: string, parameter?: ParameterBindingSQL): T[];
  ambilSatu<T = Record<string, unknown>>(sql: string, parameter?: ParameterBindingSQL): T | null;
  ambilNilai<T = unknown>(sql: string, parameter?: ParameterBindingSQL): T | null;

  mulaiTransaksi(): void;
  commit(): void;
  rollback(): void;
  dalamTransaksi(): boolean;
}
