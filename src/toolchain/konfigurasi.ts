/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { parse as uraiTOML } from 'smol-toml';

/**
 * Konfigurasi Pemformat Kode Resmi NUSANTARA (Phase 19).
 */
export interface KonfigurasiFormat {
  /** Jumlah spasi per tingkat indentasi (default: 4) */
  indentasi: number;
  /** Panjang baris acuan maksimal (default: 100) */
  panjangBaris: number;
  /** Apakah menyisipkan spasi di sekitar operator biner, misal a + b (default: true) */
  spasiOperator: boolean;
  /** Apakah menyisipkan spasi setelah tanda koma, misal [1, 2, 3] (default: true) */
  spasiKoma: boolean;
  /** Apakah menyisipkan spasi sebelum titik dua tipe, misal nama: tipe (default: false) */
  spasiSebelumTitikDua: boolean;
  /** Karakter pemisah baris baru (default: '\n') */
  karakterBarisBaru: '\n' | '\r\n';
}

/**
 * Nilai baku (default) konfigurasi pemformat NUSANTARA.
 */
export const KONFIGURASI_FORMAT_DEFAULT: KonfigurasiFormat = {
  indentasi: 4,
  panjangBaris: 100,
  spasiOperator: true,
  spasiKoma: true,
  spasiSebelumTitikDua: false,
  karakterBarisBaru: '\n',
};

/**
 * Memuat dan menggabungkan konfigurasi format dari teks nusantara.toml.
 * Mengabaikan kesalahan parsing dengan menggunakan nilai default jika TOML rusak.
 */
export function muatKonfigurasiFormatDariTOML(teksTOML?: string): KonfigurasiFormat {
  if (!teksTOML || teksTOML.trim().length === 0) {
    return { ...KONFIGURASI_FORMAT_DEFAULT };
  }

  try {
    const data = uraiTOML(teksTOML) as Record<string, any>;
    const bagianFormat = data?.format || data?.pemformat || {};

    const indentasi =
      typeof bagianFormat.indentasi === 'number' && bagianFormat.indentasi > 0 && bagianFormat.indentasi <= 8
        ? Math.floor(bagianFormat.indentasi)
        : KONFIGURASI_FORMAT_DEFAULT.indentasi;

    const panjangBaris =
      typeof bagianFormat.panjang_baris === 'number' && bagianFormat.panjang_baris >= 40
        ? Math.floor(bagianFormat.panjang_baris)
        : KONFIGURASI_FORMAT_DEFAULT.panjangBaris;

    const spasiOperator =
      typeof bagianFormat.spasi_operator === 'boolean'
        ? bagianFormat.spasi_operator
        : KONFIGURASI_FORMAT_DEFAULT.spasiOperator;

    const spasiKoma =
      typeof bagianFormat.spasi_koma === 'boolean'
        ? bagianFormat.spasi_koma
        : KONFIGURASI_FORMAT_DEFAULT.spasiKoma;

    const spasiSebelumTitikDua =
      typeof bagianFormat.spasi_sebelum_titik_dua === 'boolean'
        ? bagianFormat.spasi_sebelum_titik_dua
        : KONFIGURASI_FORMAT_DEFAULT.spasiSebelumTitikDua;

    return {
      indentasi,
      panjangBaris,
      spasiOperator,
      spasiKoma,
      spasiSebelumTitikDua,
      karakterBarisBaru: '\n',
    };
  } catch {
    return { ...KONFIGURASI_FORMAT_DEFAULT };
  }
}
