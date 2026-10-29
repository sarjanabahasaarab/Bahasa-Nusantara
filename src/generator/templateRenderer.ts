/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * NUSANTARA CLI Application Generator (Phase 33)
 * Renderer Template Tanpa Eksekusi Kode Berbahaya
 */

import { KonteksPlaceholder } from './types';

const PLACEHOLDER_DIIZINKAN = new Set([
  'NAMA_PROYEK',
  'PASCAL_NAME',
  'SNAKE_NAME',
  'DESKRIPSI_PROYEK',
  'VERSI_PROYEK',
  'PENULIS',
  'TAHUN',
  'VERSI_NUSANTARA',
  'LISENSI',
]);

/**
 * Mengubah nama format kebab/snake menjadi PascalCase (misal: "aplikasi-web" -> "AplikasiWeb")
 */
export function kePascalCase(teks: string): string {
  return teks
    .replace(/[^a-zA-Z0-9]+(.)/g, (_, c) => c.toUpperCase())
    .replace(/^([a-z])/, (_, c) => c.toUpperCase())
    .replace(/[^a-zA-Z0-9]/g, '');
}

/**
 * Mengubah nama menjadi snake_case (misal: "aplikasi-web" -> "aplikasi_web")
 */
export function keSnakeCase(teks: string): string {
  return teks
    .replace(/[-\s]+/g, '_')
    .replace(/[^a-zA-Z0-9_]/g, '')
    .toLowerCase();
}

/**
 * Merender konten template menggunakan penggantian placeholder terbatas.
 * TIDAK MENGEVALUASI kode eksternal (anti eval/code execution).
 */
export function renderKontenTemplate(
  kontenTemplate: string,
  konteks: KonteksPlaceholder
): string {
  // Pola regex: {{ NAMA_KUNCI }} dengan toleransi spasi di dalam kurung kurawal
  const regex = /\{\{\s*([A-Z_]+)\s*\}\}/g;

  return kontenTemplate.replace(regex, (cocok, namaKunci) => {
    if (!PLACEHOLDER_DIIZINKAN.has(namaKunci)) {
      throw new Error(
        `Placeholder '{{${namaKunci}}}' tidak diizinkan dalam template generator NUSANTARA.`
      );
    }

    const nilai = (konteks as any)[namaKunci];
    if (nilai === undefined || nilai === null) {
      throw new Error(
        `Nilai placeholder wajib '{{${namaKunci}}}' tidak disediakan dalam konteks generator.`
      );
    }

    return String(nilai);
  });
}
