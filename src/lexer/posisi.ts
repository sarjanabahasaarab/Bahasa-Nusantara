/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * Representasi posisi baris dan kolom dalam teks kode sumber NUSANTARA.
 * Baris dan kolom menggunakan penomoran 1-indeks (1-based index).
 */
export interface PosisiSumber {
  /** Nomor baris dalam kode sumber (dimulai dari 1) */
  baris: number;
  /** Nomor kolom dalam baris (dimulai dari 1) */
  kolom: number;
  /** Indeks karakter global dari awal dokumen (dimulai dari 0) */
  indeks: number;
}

/**
 * Rentang posisi karakter dalam kode sumber (awal hingga akhir).
 */
export interface RentangPosisi {
  awal: PosisiSumber;
  akhir: PosisiSumber;
}

/**
 * Membuat salinan objek posisi sumber.
 */
export function klonaPosisi(pos: PosisiSumber): PosisiSumber {
  return {
    baris: pos.baris,
    kolom: pos.kolom,
    indeks: pos.indeks,
  };
}

/**
 * Memformat posisi sumber menjadi representasi teks ramah diagnostik.
 * Contoh: "baris 4, kolom 12"
 */
export function formatPosisi(pos: PosisiSumber): string {
  return `baris ${pos.baris}, kolom ${pos.kolom}`;
}
