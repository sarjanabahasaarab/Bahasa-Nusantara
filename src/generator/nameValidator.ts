/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * NUSANTARA CLI Application Generator (Phase 33)
 * Validator Nama Proyek
 */

const NAMA_SISTEM_TERESERVE = new Set([
  'con',
  'prn',
  'aux',
  'nul',
  'com1',
  'com2',
  'com3',
  'com4',
  'com5',
  'com6',
  'com7',
  'com8',
  'com9',
  'lpt1',
  'lpt2',
  'lpt3',
  'lpt4',
  'lpt5',
  'lpt6',
  'lpt7',
  'lpt8',
  'lpt9',
  'node_modules',
  'nusantara',
]);

const POLA_NAMA_VALID = /^[a-z0-9][a-z0-9_-]{0,63}$/;

export interface HasilValidasiNama {
  valid: boolean;
  pesan?: string;
  namaBersih?: string;
}

/**
 * Memvalidasi nama proyek secara ketat untuk mencegah path traversal,
 * tabrakan reserved name, dan ketidakcocokan format package.
 */
export function validasiNamaProyek(namaMentah: string): HasilValidasiNama {
  if (typeof namaMentah !== 'string') {
    return {
      valid: false,
      pesan: 'Nama proyek wajib berupa string teks.',
    };
  }

  const nama = namaMentah.trim();

  if (!nama) {
    return {
      valid: false,
      pesan: 'Nama proyek tidak boleh kosong.',
    };
  }

  if (namaMentah.includes(' ') || namaMentah.includes('\t') || namaMentah.includes('\n')) {
    return {
      valid: false,
      pesan: `Nama proyek '${namaMentah}' tidak valid: tidak boleh mengandung spasi atau karakter whitespace.`,
    };
  }

  if (
    nama.includes('/') ||
    nama.includes('\\') ||
    nama.includes('..') ||
    nama.startsWith('.') ||
    nama.endsWith('.')
  ) {
    return {
      valid: false,
      pesan: `Nama proyek '${nama}' tidak valid: terdeteksi karakter pemisah direktori atau percobaan path traversal ('..', '/', '\\').`,
    };
  }

  const namaKecil = nama.toLowerCase();

  if (NAMA_SISTEM_TERESERVE.has(namaKecil)) {
    return {
      valid: false,
      pesan: `Nama proyek '${nama}' merupakan nama tereservasi sistem (OS/reserved name) dan tidak dapat digunakan.`,
    };
  }

  if (!POLA_NAMA_VALID.test(namaKecil)) {
    return {
      valid: false,
      pesan: `Nama proyek '${nama}' tidak memenuhi konvensi pengidentifikasi proyek NUSANTARA. Gunakan huruf kecil, angka, minus '-', atau garis bawah '_', diawali dengan huruf atau angka (maksimal 64 karakter).`,
    };
  }

  return {
    valid: true,
    namaBersih: namaKecil,
  };
}
