/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { PosisiSumber } from '../lexer/posisi';
import { Diagnostik } from '../diagnostik';

/**
 * Status hasil eksekusi pengujian dalam Bahasa Indonesia.
 * Dapat digunakan baik sebagai objek nilai (StatusUji.LULUS) maupun sebagai tipe ('lulus').
 */
export const StatusUji = {
  LULUS: 'LULUS',
  GAGAL: 'GAGAL',
  DILEWATI: 'DILEWATI',
  GALAT: 'GALAT',
} as const;

export type StatusUji = (typeof StatusUji)[keyof typeof StatusUji] | 'lulus' | 'gagal' | 'dilewati' | 'galat';

/**
 * Representasi detail hasil satu kasus pengujian (Test Case).
 */
export interface HasilUji {
  nama: string;
  berkas: string;
  status: StatusUji;
  durasiMs: number;
  pesan?: string;
  diharapkan?: any;
  ditemukan?: any;
  lokasi?: any;
  diagnostik?: Diagnostik;
  stackTrace?: string[];
  penegasanTotal: number;
  penegasanLulus: number;
  galat?: any;
}

/**
 * Representasi hasil eksekusi satu berkas pengujian (*.uji.nusantara).
 */
export interface HasilBerkasUji {
  jalurBerkas: string;
  jalur?: string;
  namaBerkas: string;
  sukses: boolean;
  durasiTotalMs: number;
  durasiMs?: number;
  daftarHasil: HasilUji[];
  daftarUji?: any[];
  totalPenegasan?: number;
  penegasanLulus?: number;
  penegasanGagal?: number;
  daftarGalat?: any[];
  status?: StatusUji | string;
  galatFatal?: string;
  diagnostikFatal?: Diagnostik;
}

/**
 * Ringkasan statistik pengujian seluruh proyek.
 */
export interface RingkasanUji {
  total: number;
  totalUji?: number;
  lulus: number;
  gagal: number;
  dilewati: number;
  galat: number;
  durasiTotalMs: number;
  durasiMs?: number;
  berkasTotal: number;
  totalBerkas?: number;
  berkasLulus: number;
  berkasGagal: number;
  daftarBerkas: HasilBerkasUji[];
  berkas?: any[];
  status?: StatusUji | string;
}

/**
 * Opsi konfigurasi Test Runner NUSANTARA.
 */
export interface OpsiRunnerUji {
  pembaca?: any;
  direktoriAkar?: string;
  filter?: string;
  verbose?: boolean;
  json?: boolean;
  timeoutMs?: number;
  hentikanSaatGagal?: boolean;
  polaBerkas?: string[];
  ujiKategori?: 'semua' | 'unit' | 'integrasi' | 'regresi' | 'contoh';
}

/**
 * Data fondasi cakupan kode (Code Coverage).
 */
export interface CakupanKomponen {
  nama: string;
  jalur: string;
  totalBaris: number;
  barisTeruji: number;
  persentase: number;
}

export interface DataCakupan {
  tersedia: boolean;
  totalPersentase: number;
  totalSubsistem?: number;
  subsistemTersentuh?: number;
  persentase?: number;
  daftarSubsistem?: string[];
  komponen: CakupanKomponen[];
}

export interface HasilItemGerbang {
  nama: string;
  kategori?: string;
  status?: 'LULUS' | 'GAGAL' | string;
  lulus?: boolean;
  pesan?: string;
  rincian?: string;
  durasiMs: number;
}

export interface LaporanGerbangKualitas {
  lolosSemua: boolean;
  lulusSemua: boolean;
  totalPemeriksaan: number;
  totalLulus: number;
  pemeriksaanLulus: number;
  totalGagal: number;
  durasiTotalMs: number;
  daftarPemeriksaan: HasilItemGerbang[];
  pemeriksaan: HasilItemGerbang[];
  cakupanTotal: number;
  ambangBatasCakupan?: number;
  cakupan?: any;
}

export type HasilGerbangKualitas = LaporanGerbangKualitas;
