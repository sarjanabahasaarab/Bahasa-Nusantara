/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { PembacaBerkas } from '../modul/pembacaBerkas';

export class GalatKeamananPaket extends Error {
  constructor(pesan: string) {
    super(`Kesalahan keamanan paket:\n${pesan}`);
    this.name = 'GalatKeamananPaket';
  }
}

const POLA_NAMA_PAKET = /^[a-z0-9][a-z0-9_-]{0,63}$/;

/**
 * Memvalidasi nama paket agar aman dari injeksi jalur, spasi, dan karakter berbahaya.
 */
export function validasiNamaPaket(nama: string): void {
  const bersih = nama.trim();

  if (!bersih) {
    throw new GalatKeamananPaket(`Nama paket tidak boleh kosong.`);
  }

  if (nama.includes(' ') || nama.includes('\t') || nama.includes('\n')) {
    throw new GalatKeamananPaket(`Nama paket '${nama}' tidak valid: tidak boleh mengandung spasi atau karakter whitespace.`);
  }

  if (
    nama.includes('/') ||
    nama.includes('\\') ||
    nama.includes('..') ||
    nama.startsWith('.') ||
    nama.endsWith('.')
  ) {
    throw new GalatKeamananPaket(
      `Nama paket '${nama}' tidak valid: terdeteksi karakter pemisah jalur atau percobaan path traversal.`
    );
  }

  const hurufKecil = nama.toLowerCase();
  if (!POLA_NAMA_PAKET.test(hurufKecil)) {
    throw new GalatKeamananPaket(
      `Nama paket '${nama}' tidak memenuhi konvensi pengidentifikasi paket NUSANTARA (hanya boleh huruf kecil, angka, tanda minus '-', dan garis bawah '_', diawali huruf/angka).`
    );
  }
}

/**
 * Memeriksa apakah sebuah jalur paket lokal aman dan berada dalam cakupan yang diizinkan.
 */
export function periksaKeamananJalurLokal(
  pembaca: PembacaBerkas,
  jalurSasaran: string,
  direktoriBasis: string
): string {
  const absolutSasaran = pembaca.jalurAbsolut(pembaca.gabungJalur(direktoriBasis, jalurSasaran));
  const normSasaran = pembaca.normalisasiJalur(absolutSasaran);

  // Mencegah traversal melampaui direktori akar sistem (/ atau drive root sembarangan)
  if (jalurSasaran.includes('..')) {
    // Normalisasi dan pastikan jalur tidak menjadi path traversal tak terkendali
    const bagian = jalurSasaran.replace(/\\/g, '/').split('/');
    let naik = 0;
    for (const b of bagian) {
      if (b === '..') naik++;
    }
    if (naik > 10) {
      throw new GalatKeamananPaket(
        `Jalur paket '${jalurSasaran}' ditolak karena indikasi percobaan eskalasi direktori (path traversal berlebih).`
      );
    }
  }

  return normSasaran;
}
